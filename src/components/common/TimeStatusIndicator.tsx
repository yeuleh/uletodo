import React from 'react';
import { Task } from '@/types/Task.types';
import { TimeUtils } from '@/utils/timeUtils';
import './TimeStatusIndicator.css';

export interface TimeStatusIndicatorProps {
  task: Task;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const TimeStatusIndicator: React.FC<TimeStatusIndicatorProps> = ({
  task,
  showLabel = true,
  size = 'medium',
  className = ''
}) => {
  if (!task.dueDate) {
    return null;
  }

  const timeStatus = TimeUtils.getTaskTimeStatus(task);
  
  if (timeStatus === 'normal') {
    return null;
  }

  const timeUntilDue = TimeUtils.getTimeUntilDue(task.dueDate);
  
  const baseClass = 'time-status-indicator';
  const statusClass = `time-status-indicator--${timeStatus}`;
  const sizeClass = `time-status-indicator--${size}`;
  
  const classes = [baseClass, statusClass, sizeClass, className]
    .filter(Boolean)
    .join(' ');

  const getIcon = () => {
    switch (timeStatus) {
      case 'overdue':
        return '⚠️';
      case 'due-soon':
        return '⏰';
      default:
        return '';
    }
  };

  const getLabel = () => {
    switch (timeStatus) {
      case 'overdue':
        return timeUntilDue;
      case 'due-soon':
        return `Due ${task.dueDate ? TimeUtils.formatDate(task.dueDate) : 'Unknown'}`;
      default:
        return '';
    }
  };

  return (
    <div className={classes} title={timeUntilDue}>
      <span className="time-status-indicator__icon">
        {getIcon()}
      </span>
      {showLabel && (
        <span className="time-status-indicator__label">
          {getLabel()}
        </span>
      )}
    </div>
  );
};