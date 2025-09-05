import React, { forwardRef } from 'react';
import './DatePicker.css';

export interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  fullWidth?: boolean;
  showTime?: boolean;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(({
  label,
  error,
  helperText,
  value,
  onChange,
  fullWidth = false,
  showTime = false,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `datepicker-${Math.random().toString(36).substr(2, 9)}`;
  
  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    
    if (showTime) {
      // Format as datetime-local input format: YYYY-MM-DDTHH:MM
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } else {
      // Format as date input format: YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    
    if (!inputValue) {
      onChange?.(null);
      return;
    }

    const date = new Date(inputValue);
    if (!isNaN(date.getTime())) {
      onChange?.(date);
    }
  };

  const baseClass = 'datepicker';
  const errorClass = error ? 'datepicker--error' : '';
  const fullWidthClass = fullWidth ? 'datepicker--full-width' : '';
  
  const wrapperClasses = [baseClass, errorClass, fullWidthClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClasses}>
      {label && (
        <label htmlFor={inputId} className="datepicker__label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={showTime ? 'datetime-local' : 'date'}
        className="datepicker__field"
        value={formatDateForInput(value ?? null)}
        onChange={handleChange}
        {...props}
      />
      {(error || helperText) && (
        <div className={`datepicker__helper ${error ? 'datepicker__helper--error' : ''}`}>
          {error || helperText}
        </div>
      )}
    </div>
  );
});