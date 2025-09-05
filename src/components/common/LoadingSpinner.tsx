import React from 'react';
import './LoadingSpinner.css';

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color,
  className = '',
}) => {
  const baseClass = 'loading-spinner';
  const sizeClass = `loading-spinner--${size}`;
  
  const classes = [baseClass, sizeClass, className]
    .filter(Boolean)
    .join(' ');

  const style = color ? { color } : undefined;

  return (
    <div className={classes} style={style} role="status" aria-label="Loading">
      <svg className="loading-spinner__svg" viewBox="0 0 24 24">
        <circle
          className="loading-spinner__circle"
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};