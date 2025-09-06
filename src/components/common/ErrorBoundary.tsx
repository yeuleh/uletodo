import { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorHandler, AppError } from '@/utils/errorHandling';
import { Button } from './Button';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: AppError | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const appError = ErrorHandler.normalizeError(error);
    return {
      hasError: true,
      error: appError,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const appError = ErrorHandler.normalizeError(error, {
      operation: 'component_render',
      additionalData: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    });

    ErrorHandler.handleError(appError);

    this.setState({
      error: appError,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(appError, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error } = this.state;
      const isRecoverable = error ? ErrorHandler.isRecoverable(error) : true;
      const userMessage = error ? ErrorHandler.getUserFriendlyMessage(error) : 'An unexpected error occurred';

      return (
        <div className="error-boundary">
          <div className="error-boundary__content">
            <div className="error-boundary__icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>
            
            <h2 className="error-boundary__title">
              Something went wrong
            </h2>
            
            <p className="error-boundary__message">
              {userMessage}
            </p>

            {process.env.NODE_ENV === 'development' && error && (
              <details className="error-boundary__details">
                <summary>Technical Details (Development)</summary>
                <div className="error-boundary__technical">
                  <p><strong>Error Code:</strong> {error.code}</p>
                  <p><strong>Message:</strong> {error.message}</p>
                  <p><strong>Timestamp:</strong> {error.timestamp.toISOString()}</p>
                  {error.details && (
                    <div>
                      <strong>Details:</strong>
                      <pre>{JSON.stringify(error.details, null, 2)}</pre>
                    </div>
                  )}
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre>{this.state.errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="error-boundary__actions">
              {isRecoverable && (
                <Button
                  variant="primary"
                  onClick={this.handleRetry}
                >
                  Try Again
                </Button>
              )}
              
              <Button
                variant="ghost"
                onClick={this.handleReload}
              >
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}