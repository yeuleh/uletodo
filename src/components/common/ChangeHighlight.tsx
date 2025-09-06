/**
 * Change highlight component for displaying diff-style changes
 */

import React from 'react';
import './ChangeHighlight.css';

interface ChangeHighlightProps {
  oldValue?: string;
  newValue?: string;
  fieldName?: string;
  className?: string;
  showLabels?: boolean;
  inline?: boolean;
}

export const ChangeHighlight: React.FC<ChangeHighlightProps> = ({
  oldValue,
  newValue,
  fieldName,
  className = '',
  showLabels = true,
  inline = false
}) => {
  // Handle cases where values are undefined or null
  const oldVal = oldValue || '';
  const newVal = newValue || '';

  // If values are the same, show no change
  if (oldVal === newVal) {
    return (
      <div className={`change-highlight ${className}`}>
        <div className="change-highlight__no-change">
          <span className="change-highlight__value">{newVal || 'No value'}</span>
        </div>
      </div>
    );
  }

  // For additions (old value is empty)
  if (!oldVal && newVal) {
    return (
      <div className={`change-highlight change-highlight--addition ${className}`}>
        {showLabels && (
          <div className="change-highlight__label">
            {fieldName ? `${fieldName} added:` : 'Added:'}
          </div>
        )}
        <div className="change-highlight__value change-highlight__value--added">
          + {newVal}
        </div>
      </div>
    );
  }

  // For deletions (new value is empty)
  if (oldVal && !newVal) {
    return (
      <div className={`change-highlight change-highlight--deletion ${className}`}>
        {showLabels && (
          <div className="change-highlight__label">
            {fieldName ? `${fieldName} removed:` : 'Removed:'}
          </div>
        )}
        <div className="change-highlight__value change-highlight__value--removed">
          - {oldVal}
        </div>
      </div>
    );
  }

  // For modifications (both values exist and are different)
  if (inline) {
    return (
      <div className={`change-highlight change-highlight--modification change-highlight--inline ${className}`}>
        {showLabels && (
          <div className="change-highlight__label">
            {fieldName ? `${fieldName} changed:` : 'Changed:'}
          </div>
        )}
        <div className="change-highlight__inline-diff">
          <span className="change-highlight__value change-highlight__value--removed">
            - {oldVal}
          </span>
          <span className="change-highlight__separator">→</span>
          <span className="change-highlight__value change-highlight__value--added">
            + {newVal}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`change-highlight change-highlight--modification ${className}`}>
      {showLabels && (
        <div className="change-highlight__label">
          {fieldName ? `${fieldName} changed:` : 'Changed:'}
        </div>
      )}
      <div className="change-highlight__diff">
        <div className="change-highlight__old">
          <div className="change-highlight__diff-label">Before:</div>
          <div className="change-highlight__value change-highlight__value--removed">
            {oldVal}
          </div>
        </div>
        <div className="change-highlight__new">
          <div className="change-highlight__diff-label">After:</div>
          <div className="change-highlight__value change-highlight__value--added">
            {newVal}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangeHighlight;