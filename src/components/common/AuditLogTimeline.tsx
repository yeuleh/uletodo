/**
 * Audit log timeline component for displaying task change history
 */

import React, { useState, useEffect } from 'react';
import { AuditService } from '@/services/AuditService';
import type { AuditLog, DetailedChangeInfo } from '@/types/AuditLog.types';
import './AuditLogTimeline.css';

interface AuditLogTimelineProps {
  taskId: string;
  className?: string;
  showFilters?: boolean;
  maxItems?: number;
}

interface AuditLogTimelineState {
  logs: AuditLog[];
  loading: boolean;
  error: string | null;
  selectedLog: DetailedChangeInfo | null;
  showDetails: boolean;
}

export const AuditLogTimeline: React.FC<AuditLogTimelineProps> = ({
  taskId,
  className = '',
  showFilters = true,
  maxItems = 50
}) => {
  const [state, setState] = useState<AuditLogTimelineState>({
    logs: [],
    loading: true,
    error: null,
    selectedLog: null,
    showDetails: false
  });

  const [filter, setFilter] = useState({
    action: '',
    dateRange: 'all' // all, today, week, month
  });

  useEffect(() => {
    loadAuditHistory();
  }, [taskId, filter]);

  const loadAuditHistory = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Build filter based on current filter state
      const auditFilter: any = {};
      if (filter.action) {
        auditFilter.action = [filter.action];
      }
      
      if (filter.dateRange !== 'all') {
        const now = new Date();
        let fromDate: Date;
        
        switch (filter.dateRange) {
          case 'today':
            fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            fromDate = new Date(0);
        }
        
        auditFilter.fromDate = fromDate;
      }

      const logs = await AuditService.getTaskHistory(taskId, auditFilter);
      
      // Limit results if maxItems is specified
      const limitedLogs = maxItems ? logs.slice(0, maxItems) : logs;
      
      setState(prev => ({
        ...prev,
        logs: limitedLogs,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load audit history',
        loading: false
      }));
    }
  };

  const handleLogClick = async (log: AuditLog) => {
    try {
      const detailedInfo = await AuditService.getDetailedChangeInfo(log.id);
      if (detailedInfo) {
        setState(prev => ({
          ...prev,
          selectedLog: detailedInfo,
          showDetails: true
        }));
      }
    } catch (error) {
      console.error('Failed to load detailed change info:', error);
    }
  };

  const closeDetails = () => {
    setState(prev => ({
      ...prev,
      selectedLog: null,
      showDetails: false
    }));
  };

  const exportHistory = async () => {
    try {
      const allLogs = await AuditService.getTaskHistory(taskId);
      const exportData = {
        taskId,
        exportDate: new Date().toISOString(),
        logs: allLogs.map(log => ({
          ...log,
          formattedTimestamp: AuditService.formatTimestamp(log.timestamp as any),
          actionDisplay: AuditService.getActionDisplayName(log.action)
        }))
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `task-${taskId}-history.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export history:', error);
    }
  };

  if (state.loading) {
    return (
      <div className={`audit-timeline ${className}`}>
        <div className="audit-timeline__loading">
          <div className="loading-spinner"></div>
          <span>Loading history...</span>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={`audit-timeline ${className}`}>
        <div className="audit-timeline__error">
          <span className="error-icon">⚠️</span>
          <span>{state.error}</span>
          <button onClick={loadAuditHistory} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`audit-timeline ${className}`}>
      {showFilters && (
        <div className="audit-timeline__filters">
          <div className="filter-group">
            <label htmlFor="action-filter">Action:</label>
            <select
              id="action-filter"
              value={filter.action}
              onChange={(e) => setFilter(prev => ({ ...prev, action: e.target.value }))}
            >
              <option value="">All Actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="status_changed">Status Changed</option>
              <option value="deleted">Deleted</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="date-filter">Time Range:</label>
            <select
              id="date-filter"
              value={filter.dateRange}
              onChange={(e) => setFilter(prev => ({ ...prev, dateRange: e.target.value }))}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
            </select>
          </div>
          
          <button onClick={exportHistory} className="export-button">
            Export History
          </button>
        </div>
      )}

      <div className="audit-timeline__content">
        {state.logs.length === 0 ? (
          <div className="audit-timeline__empty">
            <span className="empty-icon">📝</span>
            <p>No history found for this task.</p>
          </div>
        ) : (
          <div className="audit-timeline__list">
            {state.logs.map((log) => (
              <div
                key={log.id}
                className={`audit-timeline__item audit-timeline__item--${log.action}`}
                onClick={() => handleLogClick(log)}
              >
                <div className="audit-timeline__marker">
                  <span className="audit-timeline__icon">
                    {AuditService.getActionIcon(log.action)}
                  </span>
                </div>
                
                <div className="audit-timeline__content-item">
                  <div className="audit-timeline__header">
                    <span className="audit-timeline__action">
                      {AuditService.getActionDisplayName(log.action)}
                    </span>
                    <span className="audit-timeline__time">
                      {AuditService.formatRelativeTime(log.timestamp as any)}
                    </span>
                  </div>
                  
                  <div className="audit-timeline__description">
                    {log.fieldName ? (
                      <span>
                        <strong>{log.fieldName}</strong> was changed
                        {log.oldValue && log.newValue && (
                          <span className="change-preview">
                            {' '}from "{String(log.oldValue).substring(0, 30)}..." 
                            to "{String(log.newValue).substring(0, 30)}..."
                          </span>
                        )}
                      </span>
                    ) : (
                      <span>Task {log.action}</span>
                    )}
                  </div>
                  
                  <div className="audit-timeline__timestamp">
                    {AuditService.formatTimestamp(log.timestamp as any)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {state.showDetails && state.selectedLog && (
        <div className="audit-timeline__modal-overlay" onClick={closeDetails}>
          <div className="audit-timeline__modal" onClick={(e) => e.stopPropagation()}>
            <div className="audit-timeline__modal-header">
              <h3>Change Details</h3>
              <button onClick={closeDetails} className="close-button">×</button>
            </div>
            
            <div className="audit-timeline__modal-content">
              <div className="detail-row">
                <label>Action:</label>
                <span className={`action-badge action-badge--${state.selectedLog.action}`}>
                  {AuditService.getActionDisplayName(state.selectedLog.action)}
                </span>
              </div>
              
              <div className="detail-row">
                <label>Time:</label>
                <span>{AuditService.formatTimestamp(state.selectedLog.timestamp)}</span>
              </div>
              
              {state.selectedLog.fieldName && (
                <div className="detail-row">
                  <label>Field:</label>
                  <span>{state.selectedLog.fieldName}</span>
                </div>
              )}
              
              <div className="detail-row">
                <label>Description:</label>
                <span>{state.selectedLog.description}</span>
              </div>
              
              {state.selectedLog.formattedOldValue && (
                <div className="detail-row">
                  <label>Previous Value:</label>
                  <div className="value-display old-value">
                    {state.selectedLog.formattedOldValue}
                  </div>
                </div>
              )}
              
              {state.selectedLog.formattedNewValue && (
                <div className="detail-row">
                  <label>New Value:</label>
                  <div className="value-display new-value">
                    {state.selectedLog.formattedNewValue}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogTimeline;