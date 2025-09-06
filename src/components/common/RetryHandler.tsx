import React, { useState, useCallback } from 'react';
import { ErrorHandler, AppError, RetryOptions, DEFAULT_RETRY_OPTIONS } from '@/utils/errorHandling';
import { Button } from './Button';
import { LoadingSpinner } from './LoadingSpinner';
import './RetryHandler.css';

export interface RetryHandlerProps {
  children: React.ReactNode;
  onRetry?: () => Promise<void> | void;
  retryOptions?: Partial<RetryOptions>;
  fallback?: React.ReactNode;
  showRetryButton?: boolean;
  className?: string;
}

interface RetryState {
  isRetrying: boolean;
  retryCount: number;
  lastError: AppError | null;
  hasError: boolean;
}

export const RetryHandler: React.FC<RetryHandlerProps> = ({
  children,
  onRetry,
  retryOptions = {},
  fallback,
  showRetryButton = true,
  className = ''
}) => {
  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    retryCount: 0,
    lastError: null,
    hasError: false
  });

  const options: RetryOptions = {
    ...DEFAULT_RETRY_OPTIONS,
    ...retryOptions
  };

  const handleRetry = useCallback(async () => {
    if (!onRetry || state.retryCount >= options.maxAttempts) {
      return;
    }

    setState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1
    }));

    try {
      await new Promise(resolve => setTimeout(resolve, options.delay));
      await onRetry();
      
      // Success - reset state
      setState({
        isRetrying: false,
        retryCount: 0,
        lastError: null,
        hasError: false
      });
    } catch (error) {
      const appError = ErrorHandler.normalizeError(error);
      
      setState(prev => ({
        ...prev,
        isRetrying: false,
        lastError: appError,
        hasError: true
      }));

      // Check if we should continue retrying
      if (options.retryCondition && !options.retryCondition(appError)) {
        return;
      }

      // Auto-retry if we haven't reached max attempts
      if (state.retryCount < options.maxAttempts - 1) {
        setTimeout(() => {
          handleRetry();
        }, options.delay * Math.pow(2, state.retryCount)); // Exponential backoff
      }
    }
  }, [onRetry, state.retryCount, options]);

  const handleManualRetry = useCallback(() => {
    setState(prev => ({
      ...prev,
      retryCount: 0 // Reset retry count for manual retry
    }));
    handleRetry();
  }, [handleRetry]);

  const canRetry = Boolean(state.lastError && ErrorHandler.isRecoverable(state.lastError));
  const hasReachedMaxAttempts = state.retryCount >= options.maxAttempts;

  if (state.hasError && state.lastError) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className={`retry-handler ${className}`}>
        <div className="retry-handler__content">
          <div className="retry-handler__error">
            <div className="retry-handler__icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>
            
            <div className="retry-handler__text">
              <h3 className="retry-handler__title">
                {canRetry ? 'Temporary Error' : 'Error'}
              </h3>
              <p className="retry-handler__message">
                {ErrorHandler.getUserFriendlyMessage(state.lastError)}
              </p>
              
              {state.retryCount > 0 && (
                <p className="retry-handler__attempts">
                  Attempt {state.retryCount} of {options.maxAttempts}
                </p>
              )}
            </div>
          </div>

          {showRetryButton && canRetry && !hasReachedMaxAttempts && (
            <div className="retry-handler__actions">
              <Button
                variant="primary"
                onClick={handleManualRetry}
                disabled={state.isRetrying}
                loading={state.isRetrying}
              >
                {state.isRetrying ? 'Retrying...' : 'Try Again'}
              </Button>
            </div>
          )}

          {hasReachedMaxAttempts && (
            <div className="retry-handler__max-attempts">
              <p>Maximum retry attempts reached. Please try again later or contact support.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (state.isRetrying) {
    return (
      <div className={`retry-handler retry-handler--loading ${className}`}>
        <div className="retry-handler__loading">
          <LoadingSpinner size="medium" />
          <p className="retry-handler__loading-text">
            Retrying... (Attempt {state.retryCount} of {options.maxAttempts})
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Hook for using retry functionality
export function useRetryHandler(
  operation: () => Promise<void>,
  options: Partial<RetryOptions> = {}
) {
  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    retryCount: 0,
    lastError: null,
    hasError: false
  });

  const retryOptions: RetryOptions = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options
  };

  const executeWithRetry = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isRetrying: true,
      hasError: false,
      lastError: null
    }));

    try {
      await ErrorHandler.retryOperation(operation, retryOptions);
      
      setState({
        isRetrying: false,
        retryCount: 0,
        lastError: null,
        hasError: false
      });
    } catch (error) {
      const appError = ErrorHandler.normalizeError(error);
      
      setState(prev => ({
        ...prev,
        isRetrying: false,
        lastError: appError,
        hasError: true,
        retryCount: retryOptions.maxAttempts
      }));
      
      throw appError;
    }
  }, [operation, retryOptions]);

  const retry = useCallback(async () => {
    if (state.hasError && state.lastError && ErrorHandler.isRecoverable(state.lastError)) {
      await executeWithRetry();
    }
  }, [executeWithRetry, state.hasError, state.lastError]);

  return {
    ...state,
    executeWithRetry,
    retry,
    canRetry: Boolean(state.lastError && ErrorHandler.isRecoverable(state.lastError))
  };
}

// Component for wrapping operations that might fail
export interface OperationWrapperProps {
  operation: () => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: AppError) => void;
  retryOptions?: Partial<RetryOptions>;
  children: (props: {
    execute: () => Promise<void>;
    isLoading: boolean;
    error: AppError | null;
    canRetry: boolean;
    retry: () => Promise<void>;
  }) => React.ReactNode;
}

export const OperationWrapper: React.FC<OperationWrapperProps> = ({
  operation,
  onSuccess,
  onError,
  retryOptions,
  children
}) => {
  const {
    isRetrying,
    lastError,
    hasError,
    executeWithRetry,
    retry,
    canRetry
  } = useRetryHandler(operation, retryOptions);

  const execute = useCallback(async () => {
    try {
      await executeWithRetry();
      onSuccess?.();
    } catch (error) {
      const appError = ErrorHandler.normalizeError(error);
      onError?.(appError);
    }
  }, [executeWithRetry, onSuccess, onError]);

  return (
    <>
      {children({
        execute,
        isLoading: isRetrying,
        error: hasError ? lastError : null,
        canRetry,
        retry
      })}
    </>
  );
};