import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Input, 
  DatePicker, 
  TimePicker, 
  PrioritySelector, 
  TagSelector 
} from '@/components/common';
import { Task, CreateTaskInput, UpdateTaskInput, TaskPriority, Tag } from '@/types';
import './TaskForm.css';

export interface TaskFormProps {
  task?: Task; // undefined for new task
  onSave: (taskData: CreateTaskInput | UpdateTaskInput) => Promise<void>;
  onCancel: () => void;
  parentTaskId?: string; // For subtasks
  availableTags?: Tag[];
  onCreateTag?: (tagName: string) => Promise<Tag>;
  loading?: boolean;
}

interface FormData {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: Date | null;
  estimatedDuration: number | null; // in minutes
  startTime: Date | null;
  tags: string[];
}

interface FormErrors {
  title?: string;
  description?: string;
  dueDate?: string;
  estimatedDuration?: string;
  startTime?: string;
  tags?: string;
  general?: string;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  task,
  onSave,
  onCancel,
  parentTaskId,
  availableTags = [],
  onCreateTag,
  loading = false,
}) => {
  const isEditing = !!task;
  
  const [formData, setFormData] = useState<FormData>({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || TaskPriority.NONE,
    dueDate: task?.dueDate || null,
    estimatedDuration: task?.estimatedDuration || null,
    startTime: task?.startTime || null,
    tags: task?.tags || [],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isDirty, setIsDirty] = useState(false);

  // Mark form as dirty when any field changes
  useEffect(() => {
    if (task) {
      const hasChanges = 
        formData.title !== task.title ||
        formData.description !== (task.description || '') ||
        formData.priority !== task.priority ||
        formData.dueDate?.getTime() !== task.dueDate?.getTime() ||
        formData.estimatedDuration !== task.estimatedDuration ||
        formData.startTime?.getTime() !== task.startTime?.getTime() ||
        JSON.stringify(formData.tags) !== JSON.stringify(task.tags);
      
      setIsDirty(hasChanges);
    } else {
      const hasData = 
        formData.title.trim() ||
        formData.description.trim() ||
        formData.priority !== TaskPriority.NONE ||
        formData.dueDate ||
        formData.estimatedDuration ||
        formData.startTime ||
        formData.tags.length > 0;
      
      setIsDirty(!!hasData);
    }
  }, [formData, task]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Title is required
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    // Description validation
    if (formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    // Duration validation
    if (formData.estimatedDuration !== null) {
      if (formData.estimatedDuration < 15) {
        newErrors.estimatedDuration = 'Duration must be at least 15 minutes';
      } else if (formData.estimatedDuration > 1440) { // 24 hours
        newErrors.estimatedDuration = 'Duration cannot exceed 24 hours';
      }
    }

    // Date validation
    if (formData.dueDate && formData.dueDate < new Date()) {
      // Allow past dates for editing existing tasks
      if (!isEditing) {
        newErrors.dueDate = 'Due date cannot be in the past';
      }
    }

    // Start time validation
    if (formData.startTime && formData.dueDate) {
      if (formData.startTime > formData.dueDate) {
        newErrors.startTime = 'Start time cannot be after due date';
      }
    }

    // Tags validation
    if (formData.tags.length > 10) {
      newErrors.tags = 'Maximum 10 tags allowed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        dueDate: formData.dueDate || undefined,
        estimatedDuration: formData.estimatedDuration || undefined,
        startTime: formData.startTime || undefined,
        tags: formData.tags,
        ...(parentTaskId && { parentId: parentTaskId }),
      };

      await onSave(taskData);
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to save task'
      });
    }
  };

  const handleFieldChange = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (field in errors) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const formatDurationDisplay = (minutes: number | null): string => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const parseDurationInput = (value: string): number | null => {
    if (!value.trim()) return null;
    
    // Parse formats like "2h 30m", "2h", "30m", "150" (minutes)
    const hourMatch = value.match(/(\d+)h/);
    const minuteMatch = value.match(/(\d+)m/);
    const numberMatch = value.match(/^(\d+)$/);
    
    let totalMinutes = 0;
    
    if (hourMatch) {
      totalMinutes += parseInt(hourMatch[1]) * 60;
    }
    
    if (minuteMatch) {
      totalMinutes += parseInt(minuteMatch[1]);
    }
    
    if (numberMatch && !hourMatch && !minuteMatch) {
      // Just a number, treat as minutes
      totalMinutes = parseInt(numberMatch[1]);
    }
    
    return totalMinutes > 0 ? totalMinutes : null;
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="task-form__header">
        <h2 className="task-form__title">
          {isEditing ? 'Edit Task' : 'Create New Task'}
          {parentTaskId && ' (Subtask)'}
        </h2>
      </div>

      {errors.general && (
        <div className="task-form__error task-form__error--general">
          {errors.general}
        </div>
      )}

      <div className="task-form__fields">
        <Input
          label="Title *"
          value={formData.title}
          onChange={(e) => handleFieldChange('title', e.target.value)}
          error={errors.title}
          placeholder="Enter task title..."
          fullWidth
          disabled={loading}
          autoFocus={!isEditing}
        />

        <div className="task-form__field">
          <label className="task-form__label">Description</label>
          <textarea
            className={`task-form__textarea ${errors.description ? 'task-form__textarea--error' : ''}`}
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Enter task description..."
            rows={4}
            disabled={loading}
          />
          {errors.description && (
            <div className="task-form__field-error">{errors.description}</div>
          )}
          <div className="task-form__field-helper">
            {formData.description.length}/1000 characters
          </div>
        </div>

        <div className="task-form__row">
          <PrioritySelector
            label="Priority"
            value={formData.priority}
            onChange={(priority) => handleFieldChange('priority', priority)}
            error={undefined}
            disabled={loading}
          />

          <TagSelector
            label="Tags"
            selectedTags={formData.tags}
            availableTags={availableTags}
            onTagsChange={(tags) => handleFieldChange('tags', tags)}
            onCreateTag={onCreateTag}
            error={errors.tags}
            disabled={loading}
            maxTags={10}
          />
        </div>

        <div className="task-form__row">
          <DatePicker
            label="Due Date"
            value={formData.dueDate}
            onChange={(date) => handleFieldChange('dueDate', date)}
            error={errors.dueDate}
            disabled={loading}
          />

          <DatePicker
            label="Start Time"
            value={formData.startTime}
            onChange={(date) => handleFieldChange('startTime', date)}
            error={errors.startTime}
            disabled={loading}
            showTime
          />
        </div>

        <div className="task-form__field">
          <label className="task-form__label">Estimated Duration</label>
          <div className="task-form__duration">
            <Input
              value={formData.estimatedDuration ? formatDurationDisplay(formData.estimatedDuration) : ''}
              onChange={(e) => {
                const duration = parseDurationInput(e.target.value);
                handleFieldChange('estimatedDuration', duration);
              }}
              placeholder="e.g., 2h 30m, 90m, or 90"
              error={errors.estimatedDuration}
              disabled={loading}
            />
            <TimePicker
              value={formData.estimatedDuration}
              onChange={(minutes) => handleFieldChange('estimatedDuration', minutes)}
              disabled={loading}
            />
          </div>
          <div className="task-form__field-helper">
            Enter duration as text (e.g., "2h 30m") or use the time picker
          </div>
        </div>
      </div>

      <div className="task-form__actions">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={!isDirty}
        >
          {isEditing ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
};