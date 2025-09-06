import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Input, 
  DatePicker, 
  DurationInput, 
  PrioritySelector, 
  TagSelector 
} from '@/components/common';
import { Task, CreateTaskInput, UpdateTaskInput, TaskPriority, Tag } from '@/types';
import { useValidation } from '@/hooks/useValidation';
import { ValidationUtils } from '@/utils/validationUtils';
import { ErrorHandler } from '@/utils/errorHandling';
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

// interface FormErrors {
//   title?: string;
//   description?: string;
//   dueDate?: string;
//   estimatedDuration?: string;
//   startTime?: string;
//   tags?: string;
//   general?: string;
// }

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

  const [isDirty, setIsDirty] = useState(false);

  // Use validation hook
  const [validationState, validationActions] = useValidation(
    isEditing ? ValidationUtils.validateUpdateTaskInput : ValidationUtils.validateCreateTaskInput,
    {
      validateOnChange: false,
      validateOnBlur: true,
      debounceMs: 300
    }
  );

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

  const validateForm = async (): Promise<boolean> => {
    try {
      // Sanitize input data
      const sanitizedData = ValidationUtils.sanitizeTaskInput({
        title: formData.title,
        description: formData.description || undefined,
        priority: formData.priority,
        dueDate: formData.dueDate || undefined,
        estimatedDuration: formData.estimatedDuration || undefined,
        startTime: formData.startTime || undefined,
        tags: formData.tags,
        ...(parentTaskId && { parentId: parentTaskId }),
      });

      const result = await validationActions.validateForm(sanitizedData);
      
      // Additional consistency validation
      const consistencyResult = ValidationUtils.validateTaskConsistency(sanitizedData);
      if (!consistencyResult.isValid) {
        validationActions.setFieldError('general', Object.values(consistencyResult.errors)[0]);
        return false;
      }

      return result.isValid;
    } catch (error) {
      const appError = ErrorHandler.normalizeError(error, {
        operation: 'form_validation',
        additionalData: { formData, isEditing }
      });
      
      validationActions.setFieldError('general', ErrorHandler.getUserFriendlyMessage(appError));
      return false;
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    const isValid = await validateForm();
    if (!isValid) {
      return;
    }

    try {
      // Sanitize and prepare task data
      const taskData = ValidationUtils.sanitizeTaskInput({
        title: formData.title,
        description: formData.description || undefined,
        priority: formData.priority,
        dueDate: formData.dueDate || undefined,
        estimatedDuration: formData.estimatedDuration || undefined,
        startTime: formData.startTime || undefined,
        tags: formData.tags,
        ...(parentTaskId && { parentId: parentTaskId }),
      });

      await onSave(taskData);
      
      // Clear validation errors on successful save
      validationActions.clearErrors();
    } catch (error) {
      const appError = ErrorHandler.normalizeError(error, {
        operation: 'task_save',
        taskId: task?.id,
        additionalData: { isEditing, parentTaskId }
      });
      
      ErrorHandler.handleError(appError);
      validationActions.setFieldError('general', ErrorHandler.getUserFriendlyMessage(appError));
    }
  };

  const handleFieldChange = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    validationActions.clearErrors([field as string]);
    
    // Validate field on blur if enabled
    if (field === 'title' || field === 'description') {
      // Debounced validation for text fields
      setTimeout(() => {
        validationActions.validateField(field as string, value, {
          allowPastDates: isEditing,
          dueDate: field === 'startTime' ? formData.dueDate : undefined
        });
      }, 300);
    }
  };



  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="task-form__header">
        <h2 className="task-form__title">
          {isEditing ? 'Edit Task' : 'Create New Task'}
          {parentTaskId && ' (Subtask)'}
        </h2>
      </div>

      {validationState.errors.general && (
        <div className="task-form__error task-form__error--general">
          {validationState.errors.general}
        </div>
      )}

      <div className="task-form__fields">
        <Input
          label="Title *"
          value={formData.title}
          onChange={(e) => handleFieldChange('title', e.target.value)}
          error={validationState.errors.title}
          placeholder="Enter task title..."
          fullWidth
          disabled={loading}
          autoFocus={!isEditing}
        />

        <div className="task-form__field">
          <label className="task-form__label">Description</label>
          <textarea
            className={`task-form__textarea ${validationState.errors.description ? 'task-form__textarea--error' : ''}`}
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Enter task description..."
            rows={4}
            disabled={loading}
          />
          {validationState.errors.description && (
            <div className="task-form__field-error">{validationState.errors.description}</div>
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
            error={validationState.errors.tags}
            disabled={loading}
            maxTags={10}
          />
        </div>

        <div className="task-form__row">
          <DatePicker
            label="Due Date"
            value={formData.dueDate}
            onChange={(date) => handleFieldChange('dueDate', date)}
            error={validationState.errors.dueDate}
            disabled={loading}
          />

          <DatePicker
            label="Start Time"
            value={formData.startTime}
            onChange={(date) => handleFieldChange('startTime', date)}
            error={validationState.errors.startTime}
            disabled={loading}
            showTime
          />
        </div>

        <DurationInput
          label="Estimated Duration"
          value={formData.estimatedDuration}
          onChange={(minutes) => handleFieldChange('estimatedDuration', minutes)}
          error={validationState.errors.estimatedDuration}
          disabled={loading}
          showPresets
          fullWidth
        />
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
          disabled={!isDirty || validationState.isValidating}
        >
          {isEditing ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
};