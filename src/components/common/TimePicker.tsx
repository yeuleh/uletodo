import React, { forwardRef } from 'react';
import './TimePicker.css';

export interface TimePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  value?: number | null; // Duration in minutes
  onChange?: (minutes: number | null) => void;
  fullWidth?: boolean;
  showSeconds?: boolean;
}

export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(({
  label,
  error,
  helperText,
  value,
  onChange,
  fullWidth = false,
  showSeconds = false,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `timepicker-${Math.random().toString(36).substr(2, 9)}`;
  
  const formatTimeForInput = (minutes: number | null): string => {
    if (minutes === null || minutes === undefined) return '';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const secs = 0; // We don't store seconds in our duration model
    
    if (showSeconds) {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }
  };

  const parseTimeFromInput = (timeString: string): number | null => {
    if (!timeString) return null;
    
    const parts = timeString.split(':');
    if (parts.length < 2) return null;
    
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    
    if (isNaN(hours) || isNaN(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    
    return hours * 60 + minutes;
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    const minutes = parseTimeFromInput(inputValue);
    onChange?.(minutes);
  };

  const baseClass = 'timepicker';
  const errorClass = error ? 'timepicker--error' : '';
  const fullWidthClass = fullWidth ? 'timepicker--full-width' : '';
  
  const wrapperClasses = [baseClass, errorClass, fullWidthClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClasses}>
      {label && (
        <label htmlFor={inputId} className="timepicker__label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type="time"
        step={showSeconds ? 1 : 60}
        className="timepicker__field"
        value={formatTimeForInput(value ?? null)}
        onChange={handleChange}
        {...props}
      />
      {(error || helperText) && (
        <div className={`timepicker__helper ${error ? 'timepicker__helper--error' : ''}`}>
          {error || helperText}
        </div>
      )}
    </div>
  );
});