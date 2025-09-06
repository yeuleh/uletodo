/**
 * Paginated audit log component for handling large audit datasets efficiently
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuditService } from '@/services/AuditService';
import type { AuditLog, AuditLogFilter } from '@/types/AuditLog.types';
import { Button } from './Button';
import { LoadingSpinner } from './LoadingSpinner';
import './PaginatedAuditLog.css';

interface PaginatedAuditLogProps {
  taskId?: string;
  filter?: AuditLogFilter;
  pageSize?: number;
  className?: string;
  onLogSelect?: (log: AuditLog) => void;
  showExport?: boolean;
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}

interface AuditLogState {
  logs: AuditLog[];
  loading: boolean;
  error: string | null;
  pagination: PaginationState;
}

export const PaginatedAuditLog: React.FC<PaginatedAuditLogProps> = ({
  taskId,
  filter,
  pageSize = 50,
  className = '',
  onLogSelect,
  showExport = true
}) => {
  const [state, setState] = useState<AuditLogState>({
    logs: [],
    loading: true,
    error: null,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      pageSize
    }
  });

  const [loadingMore, setLoadingMore] = useState(false);

  // Load audit logs for current page
  const loadAuditLogs = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (!append) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      } else {
        setLoadingMore(true);
      }

      const offset = (page - 1) * pageSize;
      const logs = await AuditService.getAuditLogs(filter, pageSize + 1, offset); // +1 to check if there are more

      const hasMore = logs.length > pageSize;
      const pageData = hasMore ? logs.slice(0, pageSize) : logs;

      setState(prev => ({
        ...prev,
        logs: append ? [...prev.logs, ...pageData] : pageData,
        loading: false,
        pagination: {
          ...prev.pagination,
          currentPage: page,
          totalPages: hasMore ? page + 1 : page, // Estimate, will be updated as we load more
          totalItems: append ? prev.pagination.totalItems + pageData.length : pageData.length
        }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load audit logs',
        loading: false
      }));
    } finally {
      setLoadingMore(false);
    }
  }, [filter, pageSize]);

  // Load task-specific history
  const loadTaskHistory = useCallback(async () => {
    if (!taskId) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const logs = await AuditService.getTaskHistory(taskId, filter);
      
      setState(prev => ({
        ...prev,
        logs,
        loading: false,
        pagination: {
          ...prev.pagination,
          currentPage: 1,
          totalPages: 1,
          totalItems: logs.length
        }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load task history',
        loading: false
      }));
    }
  }, [taskId, filter]);

  // Initial load
  useEffect(() => {
    if (taskId) {
      loadTaskHistory();
    } else {
      loadAuditLogs(1);
    }
  }, [taskId, filter, loadTaskHistory, loadAuditLogs]);

  // Load more logs (infinite scroll style)
  const loadMore = useCallback(() => {
    if (!loadingMore && state.pagination.currentPage < state.pagination.totalPages) {
      loadAuditLogs(state.pagination.currentPage + 1, true);
    }
  }, [loadingMore, state.pagination.currentPage, state.pagination.totalPages, loadAuditLogs]);

  // Go to specific page
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= state.pagination.totalPages && page !== state.pagination.currentPage) {
      loadAuditLogs(page);
    }
  }, [state.pagination.totalPages, state.pagination.currentPage, loadAuditLogs]);

  // Export all logs
  const exportLogs = useCallback(async () => {
    try {
      const allLogs = taskId 
        ? await AuditService.getTaskHistory(taskId)
        : await AuditService.getAuditLogs(filter, 10000); // Large limit for export

      const exportData = {
        taskId: taskId || 'all',
        exportDate: new Date().toISOString(),
        filter,
        totalLogs: allLogs.length,
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
      a.download = `audit-logs-${taskId || 'all'}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  }, [taskId, filter]);

  // Pagination controls
  const paginationControls = useMemo(() => {
    const { currentPage, totalPages } = state.pagination;
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page, ellipsis, current page area, ellipsis, last page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  }, [state.pagination]);

  if (state.loading && state.logs.length === 0) {
    return (
      <div className={`paginated-audit-log ${className}`}>
        <div className="paginated-audit-log__loading">
          <LoadingSpinner />
          <span>Loading audit logs...</span>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={`paginated-audit-log ${className}`}>
        <div className="paginated-audit-log__error">
          <span className="error-icon">⚠️</span>
          <span>{state.error}</span>
          <Button onClick={() => loadAuditLogs(1)} variant="secondary" size="small">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`paginated-audit-log ${className}`}>
      {/* Header with stats and export */}
      <div className="paginated-audit-log__header">
        <div className="paginated-audit-log__stats">
          <span className="stats-text">
            {state.pagination.totalItems} log{state.pagination.totalItems !== 1 ? 's' : ''}
            {state.pagination.totalPages > 1 && (
              <span> • Page {state.pagination.currentPage} of {state.pagination.totalPages}</span>
            )}
          </span>
        </div>
        
        {showExport && (
          <Button onClick={exportLogs} variant="ghost" size="small">
            Export Logs
          </Button>
        )}
      </div>

      {/* Audit log list */}
      <div className="paginated-audit-log__list">
        {state.logs.length === 0 ? (
          <div className="paginated-audit-log__empty">
            <span className="empty-icon">📝</span>
            <p>No audit logs found.</p>
          </div>
        ) : (
          state.logs.map((log) => (
            <div
              key={log.id}
              className={`audit-log-item audit-log-item--${log.action}`}
              onClick={() => onLogSelect?.(log)}
            >
              <div className="audit-log-item__icon">
                {AuditService.getActionIcon(log.action)}
              </div>
              
              <div className="audit-log-item__content">
                <div className="audit-log-item__header">
                  <span className="audit-log-item__action">
                    {AuditService.getActionDisplayName(log.action)}
                  </span>
                  <span className="audit-log-item__time">
                    {AuditService.formatRelativeTime(log.timestamp as any)}
                  </span>
                </div>
                
                <div className="audit-log-item__description">
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
                
                <div className="audit-log-item__timestamp">
                  {AuditService.formatTimestamp(log.timestamp as any)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination controls */}
      {!taskId && state.pagination.totalPages > 1 && (
        <div className="paginated-audit-log__pagination">
          <Button
            onClick={() => goToPage(state.pagination.currentPage - 1)}
            disabled={state.pagination.currentPage === 1}
            variant="ghost"
            size="small"
          >
            Previous
          </Button>
          
          <div className="pagination-pages">
            {paginationControls.map((page, index) => (
              <React.Fragment key={index}>
                {page === '...' ? (
                  <span className="pagination-ellipsis">...</span>
                ) : (
                  <Button
                    onClick={() => goToPage(page as number)}
                    variant={page === state.pagination.currentPage ? 'primary' : 'ghost'}
                    size="small"
                    className="pagination-page"
                  >
                    {page}
                  </Button>
                )}
              </React.Fragment>
            ))}
          </div>
          
          <Button
            onClick={() => goToPage(state.pagination.currentPage + 1)}
            disabled={state.pagination.currentPage === state.pagination.totalPages}
            variant="ghost"
            size="small"
          >
            Next
          </Button>
        </div>
      )}

      {/* Load more button for infinite scroll style */}
      {!taskId && state.pagination.currentPage < state.pagination.totalPages && (
        <div className="paginated-audit-log__load-more">
          <Button
            onClick={loadMore}
            disabled={loadingMore}
            variant="secondary"
            size="small"
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PaginatedAuditLog;