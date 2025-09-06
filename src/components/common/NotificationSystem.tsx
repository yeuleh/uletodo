import React, { useState, useEffect, useCallback } from 'react';
import { ErrorHandler, AppError } from '@/utils/errorHandling';
import { errorService } from '@/services/ErrorService';
import './NotificationSystem.css';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  onDismiss?: () => void;
}

interface NotificationSystemProps {
  maxNotifications?: number;
  defaultDuration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({
  maxNotifications = 5,
  defaultDuration = 5000,
  position = 'top-right'
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      id,
      duration: defaultDuration,
      ...notification
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Limit the number of notifications
      return updated.slice(0, maxNotifications);
    });

    // Auto-dismiss if not persistent
    if (!newNotification.persistent && newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        dismissNotification(id);
      }, newNotification.duration);
    }
  }, [defaultDuration, maxNotifications]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (notification?.onDismiss) {
        notification.onDismiss();
      }
      return prev.filter(n => n.id !== id);
    });
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Handle errors from the error handler
  useEffect(() => {
    const unsubscribe = ErrorHandler.addErrorListener((error: AppError) => {
      const errorNotification = errorService.createErrorNotification(error);
      
      addNotification({
        title: errorNotification.title,
        message: errorNotification.message,
        type: errorNotification.type,
        persistent: !ErrorHandler.isRecoverable(error),
        actions: errorNotification.actions?.map(action => ({
          label: action.label,
          action: action.action,
          variant: 'secondary' as const
        }))
      });
    });

    return unsubscribe;
  }, [addNotification]);

  // Expose notification methods globally
  useEffect(() => {
    (window as any).showNotification = addNotification;
    (window as any).dismissNotification = dismissNotification;
    (window as any).clearNotifications = clearAllNotifications;

    return () => {
      delete (window as any).showNotification;
      delete (window as any).dismissNotification;
      delete (window as any).clearNotifications;
    };
  }, [addNotification, dismissNotification, clearAllNotifications]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={`notification-system notification-system--${position}`}>
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={() => dismissNotification(notification.id)}
        />
      ))}
    </div>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onDismiss: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 300); // Match CSS transition duration
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return (
          <svg className="notification-item__icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="notification-item__icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="notification-item__icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="notification-item__icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`
        notification-item 
        notification-item--${notification.type}
        ${isVisible ? 'notification-item--visible' : ''}
        ${isExiting ? 'notification-item--exiting' : ''}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="notification-item__content">
        <div className="notification-item__header">
          {getIcon()}
          <div className="notification-item__text">
            <h4 className="notification-item__title">{notification.title}</h4>
            <p className="notification-item__message">{notification.message}</p>
          </div>
          {!notification.persistent && (
            <button
              className="notification-item__close"
              onClick={handleDismiss}
              aria-label="Dismiss notification"
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {notification.actions && notification.actions.length > 0 && (
          <div className="notification-item__actions">
            {notification.actions.map((action, index) => (
              <button
                key={index}
                className={`notification-item__action notification-item__action--${action.variant || 'secondary'}`}
                onClick={() => {
                  action.action();
                  if (!notification.persistent) {
                    handleDismiss();
                  }
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Utility functions for showing notifications
export const showSuccessNotification = (message: string, title = 'Success') => {
  if ((window as any).showNotification) {
    (window as any).showNotification({
      title,
      message,
      type: 'success'
    });
  }
};

export const showErrorNotification = (message: string, title = 'Error', actions?: Notification['actions']) => {
  if ((window as any).showNotification) {
    (window as any).showNotification({
      title,
      message,
      type: 'error',
      persistent: true,
      actions
    });
  }
};

export const showWarningNotification = (message: string, title = 'Warning') => {
  if ((window as any).showNotification) {
    (window as any).showNotification({
      title,
      message,
      type: 'warning'
    });
  }
};

export const showInfoNotification = (message: string, title = 'Info') => {
  if ((window as any).showNotification) {
    (window as any).showNotification({
      title,
      message,
      type: 'info'
    });
  }
};