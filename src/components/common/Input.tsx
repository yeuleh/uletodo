import React, { forwardRef } from 'react';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'outlined' | 'filled';
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  variant = 'outlined',
  fullWidth = false,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const baseClass = 'input';
  const variantClass = `input--${variant}`;
  const errorClass = error ? 'input--error' : '';
  const fullWidthClass = fullWidth ? 'input--full-width' : '';
  
  const wrapperClasses = [baseClass, variantClass, errorClass, fullWidthClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClasses}>
      {label && (
        <label htmlFor={inputId} className="input__label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className="input__field"
        {...props}
      />
      {(error || helperText) && (
        <div className={`input__helper ${error ? 'input__helper--error' : ''}`}>
          {error || helperText}
        </div>
      )}
    </div>
  );
});