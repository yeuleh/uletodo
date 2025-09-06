/**
 * Audit log summary component for displaying a condensed view of task changes
 */

import React, { useState, useEffect } from 'react';
import { AuditService } from '@/services/AuditService';
import './AuditLogSummary.css';

interface AuditLogSummaryProps {
  taskId: string;
  className?: string;
  showViewAll?: boolean;
  onViewAllClick?: () => void;
}

export const AuditLogSummary: React.FC<AuditLogSummaryProps> = ({
  taskId,
  className = '',
  showViewAll = true,
  onViewAllClick
}) => {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSummary();
  }, [taskId]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const summaryText = await AuditService.getChangeSummary(taskId);
      setSummary(summaryText);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load change summary');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`audit-summary ${className}`}>
        <div className="audit-summary__loading">
          <div className="loading-spinner-small"></div>
          <span>Loading changes...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`audit-summary ${className}`}>
        <div className="audit-summary__error">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!summary || summary === 'No changes recorded') {
    return (
      <div className={`audit-summary ${className}`}>
        <div className="audit-summary__empty">
          <span className="empty-icon">📝</span>
          <span>No changes recorded</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`audit-summary ${className}`}>
      <div className="audit-summary__content">
        <div className="audit-summary__icon">📋</div>
        <div className="audit-summary__text">
          <span className="audit-summary__label">Recent changes:</span>
          <span className="audit-summary__description">{summary}</span>
        </div>
        {showViewAll && (
          <button
            onClick={onViewAllClick}
            className="audit-summary__view-all"
            title="View full history"
          >
            View All
          </button>
        )}
      </div>
    </div>
  );
};

export default AuditLogSummary;