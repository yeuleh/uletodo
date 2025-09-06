/**
 * Frontend error handling service with retry mechanisms
 */

import { invoke } from '@tauri-apps/api/core';
import { ErrorHandler, AppError, ErrorCode, DEFAULT_RETRY_OPTIONS, RetryOptions } from '@/utils/errorHandling';

export interface OperationContext {
  operation: string;
  entityId?: string;
  entityType?: 'task' | 'tag' | 'audit';
  userId?: string;
}

export class ErrorService {
  private static instance: ErrorService;
  private errorQueue: AppError[] = [];
  private isOnline = navigator.onLine;
  private retryQueue: Array<{
    operation: () => Promise<any>;
    context: OperationContext;
    options: RetryOptions;
    resolve: (value: any) => void;
    reject: (error: AppError) => void;
  }> = [];

  private constructor() {
    this.setupEventListeners();
  }

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  /**
   * Execute a Tauri command with comprehensive error handling
   */
  async executeCommand<T>(
    command: string,
    args?: Record<string, any>,
    context?: OperationContext,
    retryOptions?: Partial<RetryOptions>
  ): Promise<T> {
    const fullContext: OperationContext = {
      operation: command,
      ...context
    };

    const options: RetryOptions = {
      ...DEFAULT_RETRY_OPTIONS,
      ...retryOptions
    };

    return ErrorHandler.retryOperation(
      async () => {
        try {
          const result = await invoke<T>(command, args);
          
          // Clear any previous errors for this operation
          this.clearOperationErrors(command);
          
          return result;
        } catch (error) {
          throw this.handleTauriError(command, error, fullContext);
        }
      },
      options,
      fullContext
    );
  }

  /**
   * Execute operation with offline support
   */
  async executeWithOfflineSupport<T>(
    operation: () => Promise<T>,
    context: OperationContext,
    retryOptions?: Partial<RetryOptions>
  ): Promise<T> {
    if (!this.isOnline) {
      return this.queueForRetry(operation, context, retryOptions);
    }

    try {
      return await operation();
    } catch (error) {
      const appError = ErrorHandler.normalizeError(error, context);
      
      // If it's a network error and we're offline, queue for retry
      if (appError.code === ErrorCode.NETWORK_ERROR && !this.isOnline) {
        return this.queueForRetry(operation, context, retryOptions);
      }
      
      throw appError;
    }
  }

  /**
   * Handle validation errors from backend
   */
  handleValidationError(error: any, context?: OperationContext): AppError {
    if (error && typeof error === 'object') {
      // Check if it's a Rust validation error
      if (error.message && error.message.includes('Validation error:')) {
        const message = error.message.replace('Validation error: ', '');
        return ErrorHandler.createValidationError('', message);
      }

      // Check for specific validation error types
      if (error.message) {
        const message = error.message;
        
        if (message.includes('title cannot be empty')) {
          return ErrorHandler.createValidationError('title', 'Title is required');
        }
        
        if (message.includes('title is too long')) {
          return ErrorHandler.createValidationError('title', 'Title must be less than 200 characters');
        }
        
        if (message.includes('description is too long')) {
          return ErrorHandler.createValidationError('description', 'Description must be less than 1000 characters');
        }
        
        if (message.includes('Invalid duration')) {
          return ErrorHandler.createValidationError('estimatedDuration', 'Duration must be between 15 minutes and 24 hours');
        }
        
        if (message.includes('Start time cannot be after due date')) {
          return ErrorHandler.createValidationError('startTime', 'Start time must be before due date');
        }
        
        if (message.includes('Circular dependency')) {
          return ErrorHandler.createBusinessRuleError('circular_dependency', 'Cannot create circular task relationships');
        }
        
        if (message.includes('Maximum subtask depth')) {
          return ErrorHandler.createBusinessRuleError('max_depth', 'Maximum subtask depth exceeded');
        }
        
        if (message.includes('Too many tags')) {
          return ErrorHandler.createValidationError('tags', 'Maximum 10 tags allowed');
        }
        
        if (message.includes('Duplicate tags')) {
          return ErrorHandler.createValidationError('tags', 'Duplicate tags are not allowed');
        }
      }
    }

    return ErrorHandler.normalizeError(error, context);
  }

  /**
   * Handle Tauri command errors
   */
  private handleTauriError(command: string, error: any, context: OperationContext): AppError {
    // Check for specific Tauri error patterns
    if (error && typeof error === 'object') {
      // Task not found
      if (error.message && error.message.includes('Task not found')) {
        return ErrorHandler.createError(
          ErrorCode.TASK_NOT_FOUND,
          'Task not found',
          { command, originalError: error },
          undefined,
          false
        );
      }

      // Tag not found
      if (error.message && error.message.includes('Tag not found')) {
        return ErrorHandler.createError(
          ErrorCode.TAG_NOT_FOUND,
          'Tag not found',
          { command, originalError: error },
          undefined,
          false
        );
      }

      // Database errors
      if (error.message && (
        error.message.includes('database') || 
        error.message.includes('sqlite') ||
        error.message.includes('SQL')
      )) {
        return ErrorHandler.createError(
          ErrorCode.DATABASE_ERROR,
          'Database operation failed',
          { command, originalError: error },
          undefined,
          true
        );
      }

      // Validation errors
      if (error.message && error.message.includes('Validation')) {
        return this.handleValidationError(error, context);
      }
    }

    // Generic Tauri command error
    return ErrorHandler.createTauriError(command, error);
  }

  /**
   * Queue operation for retry when back online
   */
  private queueForRetry<T>(
    operation: () => Promise<T>,
    context: OperationContext,
    retryOptions?: Partial<RetryOptions>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.retryQueue.push({
        operation,
        context,
        options: { ...DEFAULT_RETRY_OPTIONS, ...retryOptions },
        resolve,
        reject: (error: AppError) => reject(error)
      });

      // Create offline error
      const offlineError = ErrorHandler.createError(
        ErrorCode.CONNECTION_LOST,
        'Operation queued for retry when connection is restored',
        { context },
        undefined,
        true
      );

      ErrorHandler.handleError(offlineError, context);
    });
  }

  /**
   * Process retry queue when back online
   */
  private async processRetryQueue(): Promise<void> {
    const queue = [...this.retryQueue];
    this.retryQueue = [];

    for (const item of queue) {
      try {
        const result = await ErrorHandler.retryOperation(
          item.operation,
          item.options,
          item.context
        );
        item.resolve(result);
      } catch (error) {
        const appError = ErrorHandler.normalizeError(error, item.context);
        item.reject(appError);
      }
    }
  }

  /**
   * Clear errors for a specific operation
   */
  private clearOperationErrors(operation: string): void {
    this.errorQueue = this.errorQueue.filter(error => 
      !error.details?.command || error.details.command !== operation
    );
  }

  /**
   * Setup event listeners for network status and error handling
   */
  private setupEventListeners(): void {
    // Network status monitoring
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processRetryQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Global error handler for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = ErrorHandler.normalizeError(event.reason, {
        operation: 'unhandled_promise_rejection'
      });
      
      ErrorHandler.handleError(error);
      
      // Prevent default browser error handling
      event.preventDefault();
    });

    // Global error handler for JavaScript errors
    window.addEventListener('error', (event) => {
      const error = ErrorHandler.normalizeError(event.error, {
        operation: 'javascript_error',
        additionalData: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
      
      ErrorHandler.handleError(error);
    });
  }

  /**
   * Get network status
   */
  isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Get pending retry operations count
   */
  getPendingRetryCount(): number {
    return this.retryQueue.length;
  }

  /**
   * Clear retry queue
   */
  clearRetryQueue(): void {
    this.retryQueue.forEach(item => {
      const error = ErrorHandler.createError(
        ErrorCode.OPERATION_NOT_ALLOWED,
        'Operation cancelled',
        { reason: 'retry_queue_cleared' },
        undefined,
        false
      );
      item.reject(error);
    });
    this.retryQueue = [];
  }

  /**
   * Create user-friendly error notification
   */
  createErrorNotification(error: AppError): {
    title: string;
    message: string;
    type: 'error' | 'warning' | 'info';
    actions?: Array<{ label: string; action: () => void }>;
  } {
    const isRecoverable = ErrorHandler.isRecoverable(error);
    const userMessage = ErrorHandler.getUserFriendlyMessage(error);

    let title = 'Error';
    let type: 'error' | 'warning' | 'info' = 'error';

    if (error.code === ErrorCode.VALIDATION_ERROR) {
      title = 'Validation Error';
      type = 'warning';
    } else if (error.code === ErrorCode.NETWORK_ERROR || error.code === ErrorCode.CONNECTION_LOST) {
      title = 'Connection Error';
      type = 'warning';
    } else if (error.code === ErrorCode.BUSINESS_RULE_VIOLATION) {
      title = 'Operation Not Allowed';
      type = 'info';
    }

    const actions: Array<{ label: string; action: () => void }> = [];

    if (isRecoverable) {
      actions.push({
        label: 'Retry',
        action: () => {
          // This would need to be implemented based on the specific context
          console.log('Retry action triggered for error:', error);
        }
      });
    }

    return {
      title,
      message: userMessage,
      type,
      actions: actions.length > 0 ? actions : undefined
    };
  }
}

// Export singleton instance
export const errorService = ErrorService.getInstance();