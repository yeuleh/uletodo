/**
 * Comprehensive error handling system
 */

export interface AppError {
  code: string;
  message: string;
  details?: any;
  field?: string;
  timestamp: Date;
  recoverable: boolean;
}

export interface RetryOptions {
  maxAttempts: number;
  delay: number;
  backoff?: 'linear' | 'exponential';
  retryCondition?: (error: AppError) => boolean;
}

export interface ErrorContext {
  operation: string;
  userId?: string;
  taskId?: string;
  additionalData?: Record<string, any>;
}

export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  REQUIRED_FIELD = 'REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  VALUE_TOO_LONG = 'VALUE_TOO_LONG',
  VALUE_TOO_SHORT = 'VALUE_TOO_SHORT',
  INVALID_DATE = 'INVALID_DATE',
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
  MAX_DEPTH_EXCEEDED = 'MAX_DEPTH_EXCEEDED',

  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  TAG_NOT_FOUND = 'TAG_NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',

  // Network/Communication errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_LOST = 'CONNECTION_LOST',
  TAURI_COMMAND_ERROR = 'TAURI_COMMAND_ERROR',

  // Business logic errors
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',

  // System errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

export class ErrorHandler {
  private static errorLog: AppError[] = [];
  private static maxLogSize = 100;
  private static errorListeners: Array<(error: AppError) => void> = [];

  /**
   * Create a standardized error object
   */
  static createError(
    code: ErrorCode,
    message: string,
    details?: any,
    field?: string,
    recoverable = true
  ): AppError {
    return {
      code,
      message,
      details,
      field,
      timestamp: new Date(),
      recoverable
    };
  }

  /**
   * Handle and log an error
   */
  static handleError(error: AppError, context?: ErrorContext): void {
    // Add to error log
    this.errorLog.unshift(error);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Application Error:', {
        error,
        context,
        stack: new Error().stack
      });
    }

    // Notify error listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });

    // Send to analytics/monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, context);
    }
  }

  /**
   * Convert various error types to AppError
   */
  static normalizeError(error: any, _context?: ErrorContext): AppError {
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      // Already an AppError
      return error as AppError;
    }

    if (error instanceof Error) {
      // Standard JavaScript Error
      return this.createError(
        ErrorCode.UNKNOWN_ERROR,
        error.message,
        { originalError: error.name, stack: error.stack },
        undefined,
        true
      );
    }

    if (typeof error === 'string') {
      // String error message
      return this.createError(
        ErrorCode.UNKNOWN_ERROR,
        error,
        undefined,
        undefined,
        true
      );
    }

    // Tauri command errors
    if (error && typeof error === 'object' && 'message' in error) {
      return this.createError(
        ErrorCode.TAURI_COMMAND_ERROR,
        error.message,
        error,
        undefined,
        true
      );
    }

    // Unknown error type
    return this.createError(
      ErrorCode.UNKNOWN_ERROR,
      'An unknown error occurred',
      { originalError: error },
      undefined,
      true
    );
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: AppError): string {
    const messages: Record<string, string> = {
      [ErrorCode.VALIDATION_ERROR]: 'Please check your input and try again',
      [ErrorCode.REQUIRED_FIELD]: 'This field is required',
      [ErrorCode.INVALID_FORMAT]: 'Please enter a valid value',
      [ErrorCode.VALUE_TOO_LONG]: 'This value is too long',
      [ErrorCode.VALUE_TOO_SHORT]: 'This value is too short',
      [ErrorCode.INVALID_DATE]: 'Please enter a valid date',
      [ErrorCode.CIRCULAR_DEPENDENCY]: 'Cannot create circular task relationships',
      [ErrorCode.MAX_DEPTH_EXCEEDED]: 'Maximum subtask depth exceeded',
      
      [ErrorCode.DATABASE_ERROR]: 'Database operation failed. Please try again',
      [ErrorCode.TASK_NOT_FOUND]: 'Task not found',
      [ErrorCode.TAG_NOT_FOUND]: 'Tag not found',
      [ErrorCode.DUPLICATE_ENTRY]: 'This item already exists',
      [ErrorCode.CONSTRAINT_VIOLATION]: 'Operation violates data constraints',
      
      [ErrorCode.NETWORK_ERROR]: 'Network connection failed. Please check your connection',
      [ErrorCode.TIMEOUT_ERROR]: 'Operation timed out. Please try again',
      [ErrorCode.CONNECTION_LOST]: 'Connection lost. Please try again',
      [ErrorCode.TAURI_COMMAND_ERROR]: 'Application command failed',
      
      [ErrorCode.BUSINESS_RULE_VIOLATION]: 'Operation not allowed by business rules',
      [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action',
      [ErrorCode.OPERATION_NOT_ALLOWED]: 'This operation is not allowed',
      
      [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred',
      [ErrorCode.INTERNAL_ERROR]: 'Internal application error',
      [ErrorCode.CONFIGURATION_ERROR]: 'Application configuration error'
    };

    return messages[error.code] || error.message || 'An error occurred';
  }

  /**
   * Determine if an error is recoverable
   */
  static isRecoverable(error: AppError): boolean {
    const nonRecoverableErrors = [
      ErrorCode.INTERNAL_ERROR,
      ErrorCode.CONFIGURATION_ERROR,
      ErrorCode.INSUFFICIENT_PERMISSIONS
    ];

    return error.recoverable && !nonRecoverableErrors.includes(error.code as ErrorCode);
  }

  /**
   * Retry an operation with exponential backoff
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
    context?: ErrorContext
  ): Promise<T> {
    let lastError: AppError | null = null;
    let delay = options.delay;

    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = this.normalizeError(error, context);
        
        // Check if we should retry this error
        if (options.retryCondition && !options.retryCondition(lastError)) {
          throw lastError;
        }

        // Don't retry on the last attempt
        if (attempt === options.maxAttempts) {
          break;
        }

        // Don't retry non-recoverable errors
        if (!this.isRecoverable(lastError)) {
          throw lastError;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));

        // Increase delay for next attempt
        if (options.backoff === 'exponential') {
          delay *= 2;
        } else if (options.backoff === 'linear') {
          delay += options.delay;
        }
      }
    }

    // All attempts failed
    if (lastError) {
      this.handleError(lastError, context);
      throw lastError;
    }

    throw this.createError(
      ErrorCode.UNKNOWN_ERROR,
      'Operation failed after all retry attempts',
      { attempts: options.maxAttempts },
      undefined,
      false
    );
  }

  /**
   * Add error listener
   */
  static addErrorListener(listener: (error: AppError) => void): () => void {
    this.errorListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get recent errors
   */
  static getRecentErrors(count = 10): AppError[] {
    return this.errorLog.slice(0, count);
  }

  /**
   * Clear error log
   */
  static clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Report error to monitoring service
   */
  private static reportError(error: AppError, context?: ErrorContext): void {
    // In a real application, this would send to a monitoring service
    // like Sentry, LogRocket, or a custom analytics endpoint
    
    // For now, we'll just store it locally for debugging
    try {
      const errorReport = {
        error,
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // Store in localStorage for debugging (in development)
      if (process.env.NODE_ENV === 'development') {
        const existingReports = JSON.parse(
          localStorage.getItem('uletodo_error_reports') || '[]'
        );
        existingReports.unshift(errorReport);
        
        // Keep only last 50 reports
        if (existingReports.length > 50) {
          existingReports.splice(50);
        }
        
        localStorage.setItem('uletodo_error_reports', JSON.stringify(existingReports));
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  /**
   * Create error from validation result
   */
  static createValidationError(field: string, message: string): AppError {
    return this.createError(
      ErrorCode.VALIDATION_ERROR,
      message,
      undefined,
      field,
      true
    );
  }

  /**
   * Create error from Tauri command failure
   */
  static createTauriError(commandName: string, error: any): AppError {
    return this.createError(
      ErrorCode.TAURI_COMMAND_ERROR,
      `Command '${commandName}' failed: ${error.message || error}`,
      { command: commandName, originalError: error },
      undefined,
      true
    );
  }

  /**
   * Create network error
   */
  static createNetworkError(message: string, details?: any): AppError {
    return this.createError(
      ErrorCode.NETWORK_ERROR,
      message,
      details,
      undefined,
      true
    );
  }

  /**
   * Create business rule violation error
   */
  static createBusinessRuleError(rule: string, message: string): AppError {
    return this.createError(
      ErrorCode.BUSINESS_RULE_VIOLATION,
      message,
      { rule },
      undefined,
      false
    );
  }
}

// Default retry options for common operations
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  delay: 1000,
  backoff: 'exponential',
  retryCondition: (error: AppError) => {
    const retryableErrors = [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT_ERROR,
      ErrorCode.CONNECTION_LOST,
      ErrorCode.DATABASE_ERROR
    ];
    return retryableErrors.includes(error.code as ErrorCode);
  }
};