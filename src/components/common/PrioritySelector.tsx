import React from 'react';
import { TaskPriority } from '@/types';
import './PrioritySelector.css';

export interface PrioritySelectorProps {
  value: TaskPriority;
  onChange: (priority: TaskPriority) => void;
  label?: string;
  error?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

const priorityOptions = [
  { value: TaskPriority.NONE, label: 'None', color: '#6b7280' },
  { value: TaskPriority.LOW, label: 'Low', color: '#3b82f6' },
  { value: TaskPriority.MEDIUM, label: 'Medium', color: '#f59e0b' },
  { value: TaskPriority.HIGH, label: 'High', color: '#ef4444' },
];

export const PrioritySelector: React.FC<PrioritySelectorProps> = ({
  value,
  onChange,
  label,
  error,
  fullWidth = false,
  disabled = false,
}) => {
  const selectedOption = priorityOptions.find(option => option.value === value) || priorityOptions[0];

  const baseClass = 'priority-selector';
  const errorClass = error ? 'priority-selector--error' : '';
  const fullWidthClass = fullWidth ? 'priority-selector--full-width' : '';
  const disabledClass = disabled ? 'priority-selector--disabled' : '';
  
  const wrapperClasses = [baseClass, errorClass, fullWidthClass, disabledClass]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClasses}>
      {label && (
        <label className="priority-selector__label">
          {label}
        </label>
      )}
      <div className="priority-selector__field">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as TaskPriority)}
          disabled={disabled}
          className="priority-selector__select"
        >
          {priorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div 
          className="priority-selector__indicator"
          style={{ backgroundColor: selectedOption.color }}
        />
      </div>
      {error && (
        <div className="priority-selector__helper priority-selector__helper--error">
          {error}
        </div>
      )}
    </div>
  );
};