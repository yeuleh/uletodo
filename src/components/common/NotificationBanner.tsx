import React, { useState, useEffect } from 'react';
import { Task } from '@/types/Task.types';
import { TimeUtils } from '@/utils/timeUtils';
import { TimeStatusIndicator } from './TimeStatusIndicator';
import './NotificationBanner.css';

export interface NotificationBannerProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onDismiss?: () => void;
  showOverdue?: boolean;
  showDueSoon?: boolean;
  className?: string;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  tasks,
  onTaskClick,
  onDismiss,
  showOverdue = true,
  showDueSoon = true,
  className = ''
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  const overdueTasks = showOverdue ? TimeUtils.getOverdueTasks(tasks) : [];
  const dueSoonTasks = showDueSoon ? tasks.filter(task => TimeUtils.isTaskDueSoon(task)) : [];
  
  const totalNotifications = overdueTasks.length + dueSoonTasks.length;

  useEffect(() => {
    // Reset dismissed state when tasks change
    setIsDismissed(false);
  }, [totalNotifications]);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleTaskClick = (task: Task) => {
    onTaskClick?.(task);
  };

  if (totalNotifications === 0 || isDismissed) {
    return null;
  }

  const baseClass = 'notification-banner';
  const classes = [baseClass, className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div className="notification-banner__content">
        <div className="notification-banner__icon">
          {overdueTasks.length > 0 ? '⚠️' : '⏰'}
        </div>
        
        <div className="notification-banner__message">
          <div className="notification-banner__title">
            {overdueTasks.length > 0 && dueSoonTasks.length > 0 && (
              <>You have {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''} and {dueSoonTasks.length} task{dueSoonTasks.length !== 1 ? 's' : ''} due soon</>
            )}
            {overdueTasks.length > 0 && dueSoonTasks.length === 0 && (
              <>You have {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''}</>
            )}
            {overdueTasks.length === 0 && dueSoonTasks.length > 0 && (
              <>You have {dueSoonTasks.length} task{dueSoonTasks.length !== 1 ? 's' : ''} due soon</>
            )}
          </div>
          
          <div className="notification-banner__tasks">
            {/* Show up to 3 overdue tasks */}
            {overdueTasks.slice(0, 3).map((task) => (
              <button
                key={task.id}
                className="notification-banner__task notification-banner__task--overdue"
                onClick={() => handleTaskClick(task)}
                title={`${task.title} - ${TimeUtils.getTimeUntilDue(task.dueDate!)}`}
              >
                <span className="notification-banner__task-title">
                  {task.title}
                </span>
                <TimeStatusIndicator task={task} size="small" />
              </button>
            ))}
            
            {/* Show up to 3 due soon tasks */}
            {dueSoonTasks.slice(0, 3).map((task) => (
              <button
                key={task.id}
                className="notification-banner__task notification-banner__task--due-soon"
                onClick={() => handleTaskClick(task)}
                title={`${task.title} - Due ${TimeUtils.formatDate(task.dueDate!)}`}
              >
                <span className="notification-banner__task-title">
                  {task.title}
                </span>
                <TimeStatusIndicator task={task} size="small" />
              </button>
            ))}
            
            {/* Show count if there are more tasks */}
            {totalNotifications > 6 && (
              <span className="notification-banner__more">
                +{totalNotifications - 6} more
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        className="notification-banner__dismiss"
        onClick={handleDismiss}
        title="Dismiss notification"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M12 4L4 12M4 4L12 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
};