import React from 'react';
import './ErrorMessage.css';

export interface ErrorMessageProps {
  message: string;
  title?: string;
  variant?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  title,
  variant = 'error',
  onRetry,
  onDismiss,
  className = '',
}) => {
  const baseClass = 'error-message';
  const variantClass = `error-message--${variant}`;
  
  const classes = [baseClass, variantClass, className]
    .filter(Boolean)
    .join(' ');

  const getIcon = () => {
    switch (variant) {
      case 'error':
        return (
          <svg className="error-message__icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="error-message__icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return (
          <svg className="error-message__icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className={classes} role="alert">
      <div className="error-message__content">
        {getIcon()}
        <div className="error-message__text">
          {title && <h4 className="error-message__title">{title}</h4>}
          <p className="error-message__message">{message}</p>
        </div>
      </div>
      {(onRetry || onDismiss) && (
        <div className="error-message__actions">
          {onRetry && (
            <button
              className="error-message__button error-message__button--retry"
              onClick={onRetry}
            >
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              className="error-message__button error-message__button--dismiss"
              onClick={onDismiss}
              aria-label="Dismiss"
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  );
};