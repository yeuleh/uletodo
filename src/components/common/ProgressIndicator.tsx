import React from 'react';
import './ProgressIndicator.css';

export interface ProgressIndicatorProps {
  progress: number; // 0-100
  total?: number;
  completed?: number;
  size?: 'small' | 'medium' | 'large';
  variant?: 'bar' | 'circle' | 'ring';
  showText?: boolean;
  showCount?: boolean;
  animated?: boolean;
  color?: string;
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  total,
  completed,
  size = 'medium',
  variant = 'bar',
  showText = true,
  showCount = false,
  animated = true,
  color,
  className = '',
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const progressColor = color || getProgressColor(clampedProgress);
  
  const baseClass = 'progress-indicator';
  const sizeClass = `progress-indicator--${size}`;
  const variantClass = `progress-indicator--${variant}`;
  const animatedClass = animated ? 'progress-indicator--animated' : '';
  
  const classes = [baseClass, sizeClass, variantClass, animatedClass, className]
    .filter(Boolean)
    .join(' ');

  const renderBar = () => (
    <div className={classes}>
      <div className="progress-indicator__track">
        <div 
          className="progress-indicator__fill"
          style={{ 
            width: `${clampedProgress}%`,
            backgroundColor: progressColor
          }}
        />
      </div>
      {(showText || showCount) && (
        <div className="progress-indicator__text">
          {showCount && total !== undefined && completed !== undefined ? (
            <span className="progress-indicator__count">
              {completed}/{total}
            </span>
          ) : null}
          {showText && (
            <span className="progress-indicator__percentage">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
    </div>
  );

  const renderCircle = () => {
    const radius = size === 'small' ? 16 : size === 'large' ? 24 : 20;
    const strokeWidth = size === 'small' ? 2 : size === 'large' ? 3 : 2.5;
    const normalizedRadius = radius - strokeWidth * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDasharray = `${circumference} ${circumference}`;
    const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

    return (
      <div className={classes}>
        <svg
          className="progress-indicator__circle"
          height={radius * 2}
          width={radius * 2}
        >
          <circle
            className="progress-indicator__circle-track"
            stroke="#e5e7eb"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            className="progress-indicator__circle-fill"
            stroke={progressColor}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            style={{ strokeDashoffset }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        {(showText || showCount) && (
          <div className="progress-indicator__circle-text">
            {showCount && total !== undefined && completed !== undefined ? (
              <span className="progress-indicator__count">
                {completed}/{total}
              </span>
            ) : showText ? (
              <span className="progress-indicator__percentage">
                {Math.round(clampedProgress)}%
              </span>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  const renderRing = () => {
    const size_px = size === 'small' ? 32 : size === 'large' ? 48 : 40;
    const strokeWidth = size === 'small' ? 3 : size === 'large' ? 4 : 3;
    
    return (
      <div className={classes} style={{ width: size_px, height: size_px }}>
        <div 
          className="progress-indicator__ring"
          style={{
            background: `conic-gradient(${progressColor} ${clampedProgress * 3.6}deg, #e5e7eb 0deg)`,
            width: size_px,
            height: size_px,
          }}
        >
          <div 
            className="progress-indicator__ring-inner"
            style={{
              width: size_px - strokeWidth * 2,
              height: size_px - strokeWidth * 2,
            }}
          >
            {(showText || showCount) && (
              <div className="progress-indicator__ring-text">
                {showCount && total !== undefined && completed !== undefined ? (
                  <span className="progress-indicator__count">
                    {completed}/{total}
                  </span>
                ) : showText ? (
                  <span className="progress-indicator__percentage">
                    {Math.round(clampedProgress)}%
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  switch (variant) {
    case 'circle':
      return renderCircle();
    case 'ring':
      return renderRing();
    case 'bar':
    default:
      return renderBar();
  }
};

function getProgressColor(progress: number): string {
  if (progress === 0) return '#e5e7eb';
  if (progress < 25) return '#ef4444';
  if (progress < 50) return '#f59e0b';
  if (progress < 75) return '#3b82f6';
  if (progress < 100) return '#10b981';
  return '#059669';
}