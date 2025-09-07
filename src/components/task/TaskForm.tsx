import { useState, useEffect } from 'react';
import { Task, TaskFormData } from '../../types/task';
import { FormErrors } from '../../types/common';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface TaskFormProps {
  task?: Task; // If provided, form is in edit mode
  onSubmit: (data: any) => Promise<void>; // Accept both create and update requests
  onCancel: () => void;
  loading?: boolean;
}

export default function TaskForm({ task, onSubmit, onCancel, loading = false }: TaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    due_date: '',
    project_id: undefined,
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const isEditMode = !!task;

  // Initialize form data when task prop changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        due_date: task.due_date ? task.due_date.split('T')[0] : '', // Format for date input
        project_id: task.project_id,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        due_date: '',
        project_id: undefined,
      });
    }
    setErrors({});
  }, [task]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = '任务标题不能为空';
    } else if (formData.title.length > 200) {
      newErrors.title = '任务标题不能超过200个字符';
    }

    if (formData.description.length > 1000) {
      newErrors.description = '任务描述不能超过1000个字符';
    }

    if (formData.due_date) {
      const dueDate = new Date(formData.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        newErrors.due_date = '截止日期不能早于今天';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      // Convert date to ISO string if provided
      let due_date_iso: string | undefined = undefined;
      if (formData.due_date) {
        const date = new Date(formData.due_date);
        // Set to end of day to avoid timezone issues
        date.setHours(23, 59, 59, 999);
        due_date_iso = date.toISOString();
      }

      const submitData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        due_date: due_date_iso,
        project_id: formData.project_id,
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleInputChange = (field: keyof TaskFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="任务标题 *"
        type="text"
        value={formData.title}
        onChange={(e) => handleInputChange('title', e.target.value)}
        placeholder="输入任务标题..."
        error={errors.title}
        disabled={loading}
        required
      />

      <div>
        <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 mb-1">
          任务描述
        </label>
        <textarea
          id="task-description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="输入任务描述..."
          rows={3}
          disabled={loading}
          className={`
            block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
            placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500
            ${errors.description ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
          `}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      <Input
        label="截止日期"
        type="date"
        value={formData.due_date}
        onChange={(e) => handleInputChange('due_date', e.target.value)}
        error={errors.due_date}
        disabled={loading}
      />

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          取消
        </Button>
        <Button
          type="submit"
          disabled={loading || !formData.title.trim()}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isEditMode ? '更新中...' : '创建中...'}
            </>
          ) : (
            isEditMode ? '更新任务' : '创建任务'
          )}
        </Button>
      </div>
    </form>
  );
}