import React, { useState, useEffect, forwardRef } from 'react';
import { TimeUtils } from '@/utils/timeUtils';
import './DurationInput.css';

export interface DurationInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  value?: number | null; // Duration in minutes
  onChange?: (minutes: number | null) => void;
  fullWidth?: boolean;
  showPresets?: boolean;
}

const DURATION_PRESETS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '4h', minutes: 240 },
  { label: '8h', minutes: 480 }
];

export const DurationInput = forwardRef<HTMLInputElement, DurationInputProps>(({
  label,
  error,
  helperText,
  value,
  onChange,
  fullWidth = false,
  showPresets = true,
  className = '',
  id,
  ...props
}, ref) => {
  const [inputValue, setInputValue] = useState('');
  const [isValid, setIsValid] = useState(true);

  const inputId = id || `duration-input-${Math.random().toString(36).substr(2, 9)}`;

  // Update input value when prop value changes
  useEffect(() => {
    if (value !== null && value !== undefined) {
      setInputValue(TimeUtils.formatDuration(value));
    } else {
      setInputValue('');
    }
  }, [value]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);

    if (!newValue.trim()) {
      setIsValid(true);
      onChange?.(null);
      return;
    }

    const minutes = TimeUtils.parseDuration(newValue);
    if (minutes !== null && TimeUtils.validateDuration(minutes)) {
      setIsValid(true);
      onChange?.(minutes);
    } else {
      setIsValid(false);
    }
  };

  const handlePresetClick = (minutes: number) => {
    setInputValue(TimeUtils.formatDuration(minutes));
    setIsValid(true);
    onChange?.(minutes);
  };

  const baseClass = 'duration-input';
  const errorClass = error || !isValid ? 'duration-input--error' : '';
  const fullWidthClass = fullWidth ? 'duration-input--full-width' : '';
  
  const wrapperClasses = [baseClass, errorClass, fullWidthClass, className]
    .filter(Boolean)
    .join(' ');

  const displayError = error || (!isValid ? 'Invalid duration format' : '');
  const displayHelperText = helperText || 'Examples: 30m, 1h 30m, 2.5h';

  return (
    <div className={wrapperClasses}>
      {label && (
        <label htmlFor={inputId} className="duration-input__label">
          {label}
        </label>
      )}
      
      <div className="duration-input__field-container">
        <input
          ref={ref}
          id={inputId}
          type="text"
          className="duration-input__field"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="e.g., 1h 30m"
          {...props}
        />
        
        {showPresets && (
          <div className="duration-input__presets">
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset.minutes}
                type="button"
                className={`duration-input__preset ${
                  value === preset.minutes ? 'duration-input__preset--active' : ''
                }`}
                onClick={() => handlePresetClick(preset.minutes)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {(displayError || displayHelperText) && (
        <div className={`duration-input__helper ${displayError ? 'duration-input__helper--error' : ''}`}>
          {displayError || displayHelperText}
        </div>
      )}
    </div>
  );
});

DurationInput.displayName = 'DurationInput';