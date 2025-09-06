import React, { useState } from 'react';
import { Task, TaskStatus, TaskPriority, CreateTaskInput, UpdateTaskInput } from '@/types';
import { TaskForm } from './TaskForm';
import { TaskItem } from './TaskItem';
import { Button, Modal, AuditLogTimeline, AuditLogSummary } from '@/components/common';
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

  const [showHistory, setShowHistory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { getSubtasks, toggleTaskStatus, deleteTask } = useTaskStore();
  const subtasks = getSubtasks(task.id);



  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async (taskData: CreateTaskInput | UpdateTaskInput) => {
    // Convert the form data back to a Task object for the parent component
    const updatedTask: Task = {
      ...task,
      ...taskData,
      id: task.id, // Preserve the original ID
      status: task.status, // Preserve status (form doesn't change this)
      createdAt: task.createdAt, // Preserve creation date
      updatedAt: new Date(), // Update the modification date
    };
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

        {/* Change Summary */}
        <div className="task-detail__section">
          <h3 className="task-detail__section-title">Change Summary</h3>
          <AuditLogSummary 
            taskId={task.id}
            onViewAllClick={() => setShowHistory(true)}
          />
        </div>

        {/* Full History */}
        {showHistory && (
          <div className="task-detail__section">
            <div className="task-detail__section-header">
              <h3 className="task-detail__section-title">Full History</h3>
              <Button
                variant="ghost"
                size="small"
                onClick={() => setShowHistory(false)}
              >
                Hide History
              </Button>
            </div>
            <AuditLogTimeline 
              taskId={task.id}
              className="task-detail__audit-timeline"
              showFilters={true}
              maxItems={100}
            />
          </div>
        )}

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