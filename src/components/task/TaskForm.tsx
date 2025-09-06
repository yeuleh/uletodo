import React, { useState } from 'react';
import { Button, Input } from '@/components/common';
import { CreateTaskInput, TaskPriority } from '@/types';
import './TaskForm.css';

export interface TaskFormProps {
  onSave: (taskData: CreateTaskInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  onSave,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: TaskPriority.NONE,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSave({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
      });
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="task-form__header">
        <h2>Create New Task</h2>
      </div>

      <div className="task-form__fields">
        <Input
          label="Title *"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          error={errors.title}
          placeholder="Enter task title..."
          disabled={loading}
          autoFocus
        />

        <div className="task-form__field">
          <label className="task-form__label">Description</label>
          <textarea
            className="task-form__textarea"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Enter task description..."
            rows={4}
            disabled={loading}
          />
        </div>

        <div className="task-form__field">
          <label className="task-form__label">Priority</label>
          <select
            className="task-form__select"
            value={formData.priority}
            onChange={(e) => handleChange('priority', e.target.value as TaskPriority)}
            disabled={loading}
          >
            <option value={TaskPriority.NONE}>None</option>
            <option value={TaskPriority.LOW}>Low</option>
            <option value={TaskPriority.MEDIUM}>Medium</option>
            <option value={TaskPriority.HIGH}>High</option>
          </select>
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
        >
          Create Task
        </Button>
      </div>
    </form>
  );
};