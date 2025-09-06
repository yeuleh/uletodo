import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ErrorHandler, AppError, ErrorCode } from '@/utils/errorHandling';

export interface OfflineOperation {
  id: string;
  operation: () => Promise<any>;
  context: {
    type: 'create' | 'update' | 'delete';
    entityType: 'task' | 'tag';
    entityId?: string;
    description: string;
  };
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export interface OfflineState {
  isOnline: boolean;
  pendingOperations: OfflineOperation[];
  isSyncing: boolean;
  lastSyncAttempt?: Date;
  syncErrors: AppError[];
}

export interface OfflineActions {
  queueOperation: (operation: () => Promise<any>, context: OfflineOperation['context']) => Promise<any>;
  retrySync: () => Promise<void>;
  clearPendingOperations: () => void;
  removePendingOperation: (id: string) => void;
}

const STORAGE_KEY = 'uletodo_offline_operations';
const MAX_RETRY_ATTEMPTS = 3;
const SYNC_RETRY_DELAY = 5000; // 5 seconds

export function useOfflineSupport(): [OfflineState, OfflineActions] {
  const [state, setState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    pendingOperations: [],
    isSyncing: false,
    syncErrors: []
  });

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Load pending operations from storage on mount
  useEffect(() => {
    if (!isInitializedRef.current) {
      loadPendingOperations();
      isInitializedRef.current = true;
    }
  }, []);

  // Set up online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      // Automatically attempt to sync when coming back online
      setTimeout(() => {
        retrySync();
      }, 1000);
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when operations are queued and we're online
  useEffect(() => {
    if (state.isOnline && state.pendingOperations.length > 0 && !state.isSyncing) {
      // Debounce sync attempts
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      
      syncTimeoutRef.current = setTimeout(() => {
        retrySync();
      }, 2000);
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [state.isOnline, state.pendingOperations.length, state.isSyncing]);

  const loadPendingOperations = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const operations = JSON.parse(stored).map((op: any) => ({
          ...op,
          timestamp: new Date(op.timestamp)
        }));
        setState(prev => ({ ...prev, pendingOperations: operations }));
      }
    } catch (error) {
      console.error('Failed to load pending operations:', error);
    }
  }, []);

  const savePendingOperations = useCallback((operations: OfflineOperation[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(operations));
    } catch (error) {
      console.error('Failed to save pending operations:', error);
    }
  }, []);

  const queueOperation = useCallback(async (
    operation: () => Promise<any>,
    context: OfflineOperation['context']
  ): Promise<any> => {
    // If online, try to execute immediately
    if (state.isOnline) {
      try {
        return await operation();
      } catch (error) {
        const appError = ErrorHandler.normalizeError(error);
        
        // If it's a network error, queue for offline execution
        if (appError.code === ErrorCode.NETWORK_ERROR || 
            appError.code === ErrorCode.CONNECTION_LOST) {
          // Fall through to queue the operation
        } else {
          throw appError;
        }
      }
    }

    // Queue operation for later execution
    const queuedOperation: OfflineOperation = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operation,
      context,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: MAX_RETRY_ATTEMPTS
    };

    setState(prev => {
      const newOperations = [...prev.pendingOperations, queuedOperation];
      savePendingOperations(newOperations);
      return {
        ...prev,
        pendingOperations: newOperations
      };
    });

    // Return a promise that resolves when the operation is eventually executed
    return new Promise((resolve, reject) => {
      // Store resolve/reject callbacks on the operation for later use
      (queuedOperation as any).resolve = resolve;
      (queuedOperation as any).reject = reject;
    });
  }, [state.isOnline, savePendingOperations]);

  const retrySync = useCallback(async () => {
    if (!state.isOnline || state.isSyncing || state.pendingOperations.length === 0) {
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isSyncing: true, 
      lastSyncAttempt: new Date(),
      syncErrors: []
    }));

    const operationsToProcess = [...state.pendingOperations];
    const successfulOperations: string[] = [];
    const failedOperations: OfflineOperation[] = [];
    const syncErrors: AppError[] = [];

    for (const operation of operationsToProcess) {
      try {
        const result = await operation.operation();
        
        // Call resolve callback if it exists
        if ((operation as any).resolve) {
          (operation as any).resolve(result);
        }
        
        successfulOperations.push(operation.id);
      } catch (error) {
        const appError = ErrorHandler.normalizeError(error, {
          operation: 'offline_sync',
          additionalData: {
            operationId: operation.id,
            operationType: operation.context.type,
            entityType: operation.context.entityType
          }
        });

        operation.retryCount++;
        
        if (operation.retryCount < operation.maxRetries) {
          // Keep for retry
          failedOperations.push(operation);
        } else {
          // Max retries reached, call reject callback
          if ((operation as any).reject) {
            (operation as any).reject(appError);
          }
          syncErrors.push(appError);
        }
      }
    }

    // Update state with remaining operations
    const remainingOperations = failedOperations;
    
    setState(prev => ({
      ...prev,
      pendingOperations: remainingOperations,
      isSyncing: false,
      syncErrors
    }));

    savePendingOperations(remainingOperations);

    // Schedule retry for failed operations if any
    if (failedOperations.length > 0) {
      setTimeout(() => {
        retrySync();
      }, SYNC_RETRY_DELAY);
    }
  }, [state.isOnline, state.isSyncing, state.pendingOperations, savePendingOperations]);

  const clearPendingOperations = useCallback(() => {
    setState(prev => ({ ...prev, pendingOperations: [], syncErrors: [] }));
    savePendingOperations([]);
  }, [savePendingOperations]);

  const removePendingOperation = useCallback((id: string) => {
    setState(prev => {
      const newOperations = prev.pendingOperations.filter(op => op.id !== id);
      savePendingOperations(newOperations);
      return { ...prev, pendingOperations: newOperations };
    });
  }, [savePendingOperations]);

  return [
    state,
    {
      queueOperation,
      retrySync,
      clearPendingOperations,
      removePendingOperation
    }
  ];
}

// Hook for wrapping individual operations with offline support
export function useOfflineOperation<T>(
  operation: () => Promise<T>,
  context: OfflineOperation['context']
) {
  const [offlineState, offlineActions] = useOfflineSupport();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const execute = useCallback(async (): Promise<T> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await offlineActions.queueOperation(operation, context);
      return result;
    } catch (err) {
      const appError = ErrorHandler.normalizeError(err);
      setError(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  }, [operation, context, offlineActions]);

  return {
    execute,
    isLoading,
    error,
    isOnline: offlineState.isOnline,
    pendingOperations: offlineState.pendingOperations.filter(
      op => op.context.entityType === context.entityType
    ),
    isSyncing: offlineState.isSyncing
  };
}

// Component for displaying offline status
export interface OfflineIndicatorProps {
  className?: string;
  showPendingCount?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className = '',
  showPendingCount = true
}) => {
  const [offlineState] = useOfflineSupport();

  if (offlineState.isOnline && offlineState.pendingOperations.length === 0) {
    return null;
  }

  return (
    <div className={`offline-indicator ${className}`}>
      {!offlineState.isOnline && (
        <div className="offline-indicator__status offline-indicator__status--offline">
          <span className="offline-indicator__icon">📡</span>
          <span>Offline</span>
        </div>
      )}
      
      {offlineState.pendingOperations.length > 0 && (
        <div className="offline-indicator__pending">
          {offlineState.isSyncing ? (
            <span>Syncing...</span>
          ) : (
            showPendingCount && (
              <span>{offlineState.pendingOperations.length} pending</span>
            )
          )}
        </div>
      )}
    </div>
  );
};