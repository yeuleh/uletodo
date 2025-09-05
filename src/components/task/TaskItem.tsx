import React from 'react';
import { Task, TaskPriority, TaskStatus } from '@/types';
import { Button } from '@/components/common';
import './TaskItem.css';

export interface TaskItemProps {
  task: Task;
  level?: number; // For subtask indentation
  onToggle: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onAddSubtask: (parentId: string) => void;
  onSelect?: (task: Task) => void;
  isSelected?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  level = 0,
  onToggle,
  onEdit,
  onDelete,
  onAddSubtask,
  onSelect,
  isSelected = false,
}) => {
  const isCompleted = task.status === TaskStatus.COMPLETED;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;
  const isDueSoon = task.dueDate && 
    new Date(task.dueDate).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000 && 
    !isCompleted;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(task.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(task);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(task.id);
  };

  const handleAddSubtask = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddSubtask(task.id);
  };

  const handleSelect = () => {
    onSelect?.(task);
  };

  const getPriorityColor = (priority: TaskPriority): string => {
    switch (priority) {
      case TaskPriority.HIGH:
        return '#ef4444';
      case TaskPriority.MEDIUM:
        return '#f59e0b';
      case TaskPriority.LOW:
        return '#3b82f6';
      default:
        return 'transparent';
    }
  };

  const formatDueDate = (date: Date): string => {
    const now = new Date();
    const dueDate = new Date(date);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays === -1) {
      return 'Yesterday';
    } else if (diffDays < 0) {
      return `${Math.abs(diffDays)} days ago`;
    } else if (diffDays <= 7) {
      return `${diffDays} days`;
    } else {
      return dueDate.toLocaleDateString();
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins}m`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}m`;
    }
  };

  const baseClass = 'task-item';
  const completedClass = isCompleted ? 'task-item--completed' : '';
  const overdueClass = isOverdue ? 'task-item--overdue' : '';
  const dueSoonClass = isDueSoon ? 'task-item--due-soon' : '';
  const selectedClass = isSelected ? 'task-item--selected' : '';
  
  const classes = [baseClass, completedClass, overdueClass, dueSoonClass, selectedClass]
    .filter(Boolean)
    .join(' ');

  return (
    <div 
      className={classes}
      style={{ paddingLeft: `${level * 1.5 + 1}rem` }}
      onClick={handleSelect}
    >
      {/* Priority indicator */}
      <div 
        className="task-item__priority"
        style={{ backgroundColor: getPriorityColor(task.priority) }}
      />

      {/* Completion checkbox */}
      <button
        className="task-item__checkbox"
        onClick={handleToggle}
        aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
      >
        <div className={`task-item__checkbox-inner ${isCompleted ? 'task-item__checkbox-inner--checked' : ''}`}>
          {isCompleted && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M10 3L4.5 8.5L2 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </button>

      {/* Task content */}
      <div className="task-item__content">
        <div className="task-item__main">
          <h3 className="task-item__title">{task.title}</h3>
          {task.description && (
            <p className="task-item__description">
              {task.description.length > 100 
                ? `${task.description.substring(0, 100)}...` 
                : task.description
              }
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="task-item__metadata">
          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="task-item__tags">
              {task.tags.map((tag, index) => (
                <span key={index} className="task-item__tag">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Due date and duration */}
          <div className="task-item__info">
            {task.dueDate && (
              <span className={`task-item__due-date ${isOverdue ? 'task-item__due-date--overdue' : isDueSoon ? 'task-item__due-date--due-soon' : ''}`}>
                📅 {formatDueDate(task.dueDate)}
              </span>
            )}
            {task.estimatedDuration && (
              <span className="task-item__duration">
                ⏱️ {formatDuration(task.estimatedDuration)}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar for parent tasks */}
        {task.progress !== undefined && (
          <div className="task-item__progress">
            <div className="task-item__progress-bar">
              <div 
                className="task-item__progress-fill"
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <span className="task-item__progress-text">{task.progress}%</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="task-item__actions">
        <Button
          variant="ghost"
          size="small"
          onClick={handleAddSubtask}
          title="Add subtask"
        >
          ➕
        </Button>
        <Button
          variant="ghost"
          size="small"
          onClick={handleEdit}
          title="Edit task"
        >
          ✏️
        </Button>
        <Button
          variant="ghost"
          size="small"
          onClick={handleDelete}
          title="Delete task"
        >
          🗑️
        </Button>
      </div>
    </div>
  );
};