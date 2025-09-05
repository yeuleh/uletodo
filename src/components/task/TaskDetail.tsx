import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, AuditLog, AuditAction } from '@/types';
import { TaskForm } from './TaskForm';
import { TaskItem } from './TaskItem';
import { Button, Modal } from '@/components/common';
import { AuditService } from '@/services/AuditService';
import { useTaskStore } from '@/stores/taskStore';
import './TaskDetail.css';

export interface TaskDetailProps {
  task: Task;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onAddSubtask: (parentId: string) => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({
  task,
  onClose,
  onSave,
  onDelete,
  onAddSubtask,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { getSubtasks, toggleTaskStatus, deleteTask } = useTaskStore();
  const subtasks = getSubtasks(task.id);

  // Load audit history when component mounts or task changes
  useEffect(() => {
    if (showHistory) {
      loadAuditHistory();
    }
  }, [task.id, showHistory]);

  const loadAuditHistory = async () => {
    setLoadingHistory(true);
    try {
      const logs = await AuditService.getTaskHistory(task.id);
      setAuditLogs(logs);
    } catch (error) {
      console.error('Failed to load audit history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = (updatedTask: Task) => {
    onSave(updatedTask);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete(task.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleToggleStatus = () => {
    toggleTaskStatus(task.id);
  };

  const handleAddSubtask = () => {
    onAddSubtask(task.id);
  };

  const handleSubtaskToggle = (subtaskId: string) => {
    toggleTaskStatus(subtaskId);
  };

  const handleSubtaskEdit = (subtask: Task) => {
    onSave(subtask);
  };

  const handleSubtaskDelete = (subtaskId: string) => {
    deleteTask(subtaskId);
  };

  const formatTimestamp = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins} minutes`;
    } else if (mins === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minutes`;
    }
  };

  const getActionDescription = (log: AuditLog): string => {
    switch (log.action) {
      case AuditAction.CREATED:
        return 'Task created';
      case AuditAction.STATUS_CHANGED:
        return `Status changed from "${log.oldValue}" to "${log.newValue}"`;
      case AuditAction.UPDATED:
        if (log.fieldName) {
          return `Updated ${log.fieldName}`;
        }
        return 'Task updated';
      case AuditAction.DELETED:
        return 'Task deleted';
      default:
        return 'Unknown action';
    }
  };

  const getActionIcon = (action: AuditAction): string => {
    switch (action) {
      case AuditAction.CREATED:
        return '➕';
      case AuditAction.STATUS_CHANGED:
        return '✅';
      case AuditAction.UPDATED:
        return '✏️';
      case AuditAction.DELETED:
        return '🗑️';
      default:
        return '📝';
    }
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
        return '#6b7280';
    }
  };

  const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return '#10b981';
      case TaskStatus.IN_PROGRESS:
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  if (isEditing) {
    return (
      <div className="task-detail">
        <div className="task-detail__header">
          <h2 className="task-detail__title">Edit Task</h2>
          <Button variant="ghost" size="small" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="task-detail__content">
          <TaskForm
            task={task}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="task-detail">
      {/* Header */}
      <div className="task-detail__header">
        <div className="task-detail__header-content">
          <div className="task-detail__status-indicator">
            <div 
              className="task-detail__priority-dot"
              style={{ backgroundColor: getPriorityColor(task.priority) }}
            />
            <div 
              className="task-detail__status-dot"
              style={{ backgroundColor: getStatusColor(task.status) }}
            />
          </div>
          <h2 className="task-detail__title">{task.title}</h2>
        </div>
        <div className="task-detail__header-actions">
          <Button variant="ghost" size="small" onClick={handleEdit}>
            ✏️
          </Button>
          <Button variant="ghost" size="small" onClick={onClose}>
            ✕
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="task-detail__content">
        {/* Basic Information */}
        <div className="task-detail__section">
          <h3 className="task-detail__section-title">Details</h3>
          <div className="task-detail__info-grid">
            <div className="task-detail__info-item">
              <label>Status</label>
              <div className="task-detail__status">
                <span 
                  className="task-detail__status-badge"
                  style={{ backgroundColor: getStatusColor(task.status) }}
                >
                  {task.status.replace('_', ' ').toUpperCase()}
                </span>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={handleToggleStatus}
                >
                  {task.status === TaskStatus.COMPLETED ? 'Mark Incomplete' : 'Mark Complete'}
                </Button>
              </div>
            </div>

            <div className="task-detail__info-item">
              <label>Priority</label>
              <div className="task-detail__priority">
                <span 
                  className="task-detail__priority-badge"
                  style={{ backgroundColor: getPriorityColor(task.priority) }}
                >
                  {task.priority.toUpperCase()}
                </span>
              </div>
            </div>

            {task.dueDate && (
              <div className="task-detail__info-item">
                <label>Due Date</label>
                <span>{formatTimestamp(task.dueDate)}</span>
              </div>
            )}

            {task.estimatedDuration && (
              <div className="task-detail__info-item">
                <label>Estimated Duration</label>
                <span>{formatDuration(task.estimatedDuration)}</span>
              </div>
            )}

            {task.startTime && (
              <div className="task-detail__info-item">
                <label>Start Time</label>
                <span>{formatTimestamp(task.startTime)}</span>
              </div>
            )}

            {task.completedAt && (
              <div className="task-detail__info-item">
                <label>Completed At</label>
                <span>{formatTimestamp(task.completedAt)}</span>
              </div>
            )}
          </div>

          {task.description && (
            <div className="task-detail__description">
              <label>Description</label>
              <p>{task.description}</p>
            </div>
          )}

          {task.tags.length > 0 && (
            <div className="task-detail__tags">
              <label>Tags</label>
              <div className="task-detail__tag-list">
                {task.tags.map((tag, index) => (
                  <span key={index} className="task-detail__tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Subtasks */}
        {subtasks.length > 0 && (
          <div className="task-detail__section">
            <div className="task-detail__section-header">
              <h3 className="task-detail__section-title">
                Subtasks ({subtasks.length})
              </h3>
              <Button
                variant="ghost"
                size="small"
                onClick={handleAddSubtask}
              >
                Add Subtask
              </Button>
            </div>
            <div className="task-detail__subtasks">
              {subtasks.map(subtask => (
                <TaskItem
                  key={subtask.id}
                  task={subtask}
                  level={0}
                  onToggle={handleSubtaskToggle}
                  onEdit={handleSubtaskEdit}
                  onDelete={handleSubtaskDelete}
                  onAddSubtask={onAddSubtask}
                />
              ))}
            </div>
          </div>
        )}

        {/* Progress */}
        {task.progress !== undefined && (
          <div className="task-detail__section">
            <h3 className="task-detail__section-title">Progress</h3>
            <div className="task-detail__progress">
              <div className="task-detail__progress-bar">
                <div 
                  className="task-detail__progress-fill"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              <span className="task-detail__progress-text">{task.progress}%</span>
            </div>
          </div>
        )}

        {/* History */}
        <div className="task-detail__section">
          <div className="task-detail__section-header">
            <h3 className="task-detail__section-title">History</h3>
            <Button
              variant="ghost"
              size="small"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? 'Hide History' : 'Show History'}
            </Button>
          </div>
          
          {showHistory && (
            <div className="task-detail__history">
              {loadingHistory ? (
                <div className="task-detail__history-loading">
                  <div className="spinner" />
                  <span>Loading history...</span>
                </div>
              ) : auditLogs.length > 0 ? (
                <div className="task-detail__timeline">
                  {auditLogs.map(log => (
                    <div key={log.id} className="task-detail__timeline-item">
                      <div className="task-detail__timeline-icon">
                        {getActionIcon(log.action)}
                      </div>
                      <div className="task-detail__timeline-content">
                        <div className="task-detail__timeline-description">
                          {getActionDescription(log)}
                        </div>
                        <div className="task-detail__timeline-timestamp">
                          {formatTimestamp(log.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="task-detail__no-history">No history available</p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="task-detail__actions">
          <Button variant="primary" onClick={handleEdit}>
            Edit Task
          </Button>
          <Button variant="secondary" onClick={handleAddSubtask}>
            Add Subtask
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete Task
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title="Delete Task"
        >
          <div className="task-detail__delete-confirm">
            <p>Are you sure you want to delete this task?</p>
            <p><strong>{task.title}</strong></p>
            {subtasks.length > 0 && (
              <p className="task-detail__delete-warning">
                This will also delete {subtasks.length} subtask{subtasks.length !== 1 ? 's' : ''}.
              </p>
            )}
            <div className="task-detail__delete-actions">
              <Button variant="danger" onClick={confirmDelete}>
                Delete
              </Button>
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};