import React, { useState, useEffect } from 'react';
import { Task, TaskPriority, TaskStatus } from '@/types';
import { Button, ProgressIndicator, TimeStatusIndicator } from '@/components/common';
import { TaskService } from '@/services';
import { TimeUtils } from '@/utils/timeUtils';
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
  subtasks?: Task[];
  onExpandToggle?: (taskId: string, expanded: boolean) => void;
  isExpanded?: boolean;
  showProgress?: boolean;
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
  subtasks = [],
  onExpandToggle,
  isExpanded = false,
  showProgress = true,
}) => {
  const [progress, setProgress] = useState<number>(task.progress || 0);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const isCompleted = task.status === TaskStatus.COMPLETED;
  const timeStatus = TimeUtils.getTaskTimeStatus(task);
  const isOverdue = timeStatus === 'overdue';
  const isDueSoon = timeStatus === 'due-soon';
  
  const hasSubtasks = subtasks.length > 0;
  const isParentTask = hasSubtasks || task.progress !== undefined;

  // Calculate progress from subtasks if this is a parent task
  useEffect(() => {
    if (isParentTask && showProgress) {
      const calculateProgress = async () => {
        setLoadingProgress(true);
        try {
          const calculatedProgress = await TaskService.calculateTaskProgress(task.id);
          setProgress(calculatedProgress);
        } catch (error) {
          console.error('Failed to calculate progress:', error);
        } finally {
          setLoadingProgress(false);
        }
      };

      calculateProgress();
    }
  }, [task.id, isParentTask, showProgress, subtasks]);

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

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExpandToggle?.(task.id, !isExpanded);
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

      {/* Expand/collapse button for parent tasks */}
      {hasSubtasks && (
        <button
          className="task-item__expand"
          onClick={handleExpandToggle}
          aria-label={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
        >
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 12 12" 
            fill="none"
            className={`task-item__expand-icon ${isExpanded ? 'task-item__expand-icon--expanded' : ''}`}
          >
            <path
              d="M4 6L8 6M6 4L6 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}

      {/* Completion checkbox */}
      <button
        className="task-item__checkbox"
        onClick={handleToggle}
        aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
        style={{ marginLeft: hasSubtasks ? '0' : '1.5rem' }}
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
              <div className="task-item__due-date-container">
                <span className="task-item__due-date">
                  📅 {TimeUtils.formatDate(task.dueDate)}
                </span>
                <TimeStatusIndicator task={task} size="small" />
              </div>
            )}
            {task.estimatedDuration && (
              <span className="task-item__duration">
                ⏱️ {TimeUtils.formatDuration(task.estimatedDuration)}
              </span>
            )}
            {task.startTime && task.estimatedDuration && (
              <span className="task-item__time-range">
                🕐 {TimeUtils.formatTime(task.startTime)} - {TimeUtils.formatTime(TimeUtils.calculateEndTime(task.startTime, task.estimatedDuration))}
              </span>
            )}
          </div>
        </div>

        {/* Progress indicator for parent tasks */}
        {isParentTask && showProgress && (
          <div className="task-item__progress">
            <ProgressIndicator
              progress={progress}
              total={subtasks.length}
              completed={subtasks.filter(s => s.status === TaskStatus.COMPLETED).length}
              size="small"
              variant="bar"
              showText={!loadingProgress}
              showCount={hasSubtasks}
              animated={loadingProgress}
            />
            {loadingProgress && (
              <span className="task-item__progress-loading">Calculating...</span>
            )}
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