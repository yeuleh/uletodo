/**
 * Custom hooks for easier store usage and integration
 * Provides convenient selectors and combined state access
 */

import { useCallback } from 'react';
import { useTaskStore } from './taskStore';
import { useTagStore } from './tagStore';
import { useUIStore } from './uiStore';
import { TaskStatus } from '@/types/Task.types';
import type { TaskFilter } from '@/types/Task.types';

// Task store hooks
export const useTaskActions = () => {
  const {
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    addSubtask,
    setFilter,
    setSortBy,
    setShowCompleted,
    loadSavedFilters,
    applySavedFilter,
    saveCurrentFilter,
    deleteSavedFilter,
    updateFilterStatistics,
    parseAndApplySearchQuery
  } = useTaskStore();

  return {
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    addSubtask,
    setFilter,
    setSortBy,
    setShowCompleted,
    loadSavedFilters,
    applySavedFilter,
    saveCurrentFilter,
    deleteSavedFilter,
    updateFilterStatistics,
    parseAndApplySearchQuery
  };
};

export const useTaskData = () => {
  return useTaskStore((state) => ({
    tasks: state.getFilteredTasks(),
    allTasks: state.tasks,
    selectedTask: state.selectedTask,
    loading: state.loading,
    creating: state.creating,
    updating: state.updating,
    deleting: state.deleting,
    error: state.error,
    filter: state.filter,
    sortBy: state.sortBy,
    showCompleted: state.showCompleted,
    completedCount: state.getCompletedTasksCount(),
    totalCount: state.getTotalTasksCount(),
    savedFilters: state.savedFilters,
    activeFilterId: state.activeFilterId,
    filterStatistics: state.filterStatistics
  }));
};

export const useTaskSelectors = () => {
  const getTaskById = useTaskStore((state) => state.getTaskById);
  const getSubtasks = useTaskStore((state) => state.getSubtasks);
  const getAllSavedFilters = useTaskStore((state) => state.getAllSavedFilters);
  const getActiveFilter = useTaskStore((state) => state.getActiveFilter);
  
  return { getTaskById, getSubtasks, getAllSavedFilters, getActiveFilter };
};

// Tag store hooks
export const useTagActions = () => {
  const {
    loadTags,
    createTag,
    deleteUnusedTags,
    loadSuggestions,
    getOrCreateTag,
    setAutocompleteQuery,
    setShowingSuggestions
  } = useTagStore();

  return {
    loadTags,
    createTag,
    deleteUnusedTags,
    loadSuggestions,
    getOrCreateTag,
    setAutocompleteQuery,
    setShowingSuggestions
  };
};

export const useTagData = () => {
  return useTagStore((state) => ({
    tags: state.tags,
    suggestions: state.suggestions,
    loading: state.loading,
    creating: state.creating,
    deleting: state.deleting,
    error: state.error,
    autocompleteQuery: state.autocompleteQuery,
    showingSuggestions: state.showingSuggestions
  }));
};

export const useTagSelectors = () => {
  const getTagByName = useTagStore((state) => state.getTagByName);
  const getPopularTags = useTagStore((state) => state.getPopularTags);
  const getTagsForAutocomplete = useTagStore((state) => state.getTagsForAutocomplete);
  const validateTagName = useTagStore((state) => state.validateTagName);
  
  return { getTagByName, getPopularTags, getTagsForAutocomplete, validateTagName };
};

// UI store hooks
export const useModalActions = () => {
  const { openModal, closeModal, closeAllModals } = useUIStore();
  
  return { openModal, closeModal, closeAllModals };
};

export const useModalState = () => {
  return useUIStore((state) => ({
    modals: state.modals,
    isAnyModalOpen: state.isAnyModalOpen()
  }));
};

export const useSelectionActions = () => {
  const {
    selectTask,
    deselectTask,
    selectAllTasks,
    clearSelection,
    toggleSelectionMode
  } = useUIStore();
  
  return {
    selectTask,
    deselectTask,
    selectAllTasks,
    clearSelection,
    toggleSelectionMode
  };
};

export const useSelectionState = () => {
  return useUIStore((state) => ({
    selectedTaskIds: state.selection.selectedTaskIds,
    lastSelectedTaskId: state.selection.lastSelectedTaskId,
    selectionMode: state.selection.selectionMode,
    selectedCount: state.getSelectedTaskCount()
  }));
};

export const useViewActions = () => {
  const {
    setCurrentView,
    toggleSidebar,
    toggleTaskDetailPanel,
    setTaskDetailPanelWidth
  } = useUIStore();
  
  return {
    setCurrentView,
    toggleSidebar,
    toggleTaskDetailPanel,
    setTaskDetailPanelWidth
  };
};

export const useViewState = () => {
  return useUIStore((state) => state.view);
};

export const useNotificationActions = () => {
  const { addNotification, removeNotification, clearNotifications } = useUIStore();
  
  return { addNotification, removeNotification, clearNotifications };
};

export const useNotificationState = () => {
  return useUIStore((state) => state.notifications);
};

// Combined hooks for common use cases
export const useTaskManagement = () => {
  const taskActions = useTaskActions();
  const taskData = useTaskData();
  const taskSelectors = useTaskSelectors();
  
  return {
    ...taskActions,
    ...taskData,
    ...taskSelectors
  };
};

export const useTagManagement = () => {
  const tagActions = useTagActions();
  const tagData = useTagData();
  const tagSelectors = useTagSelectors();
  
  return {
    ...tagActions,
    ...tagData,
    ...tagSelectors
  };
};

export const useAppUI = () => {
  const modalActions = useModalActions();
  const modalState = useModalState();
  const selectionActions = useSelectionActions();
  const selectionState = useSelectionState();
  const viewActions = useViewActions();
  const viewState = useViewState();
  const notificationActions = useNotificationActions();
  const notificationState = useNotificationState();
  
  return {
    ...modalActions,
    ...modalState,
    ...selectionActions,
    ...selectionState,
    ...viewActions,
    ...viewState,
    ...notificationActions,
    notifications: notificationState
  };
};

// Utility hooks
export const useTaskFiltering = () => {
  const { setFilter, filter } = useTaskStore();
  
  const applyQuickFilter = useCallback((type: 'today' | 'thisWeek' | 'overdue') => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (type) {
      case 'today':
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        setFilter({
          dueDateFrom: today,
          dueDateTo: tomorrow
        });
        break;
        
      case 'thisWeek':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        setFilter({
          dueDateFrom: startOfWeek,
          dueDateTo: endOfWeek
        });
        break;
        
      case 'overdue':
        setFilter({
          dueDateTo: today,
          status: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
        });
        break;
    }
  }, [setFilter]);
  
  const clearFilters = useCallback(() => {
    setFilter({});
  }, [setFilter]);
  
  return {
    filter,
    setFilter,
    applyQuickFilter,
    clearFilters
  };
};

export const useTaskSearch = () => {
  const { setFilter, filter, parseAndApplySearchQuery } = useTaskStore();
  
  const search = useCallback((query: string) => {
    setFilter({ searchQuery: query });
  }, [setFilter]);
  
  const clearSearch = useCallback(() => {
    setFilter({ searchQuery: undefined });
  }, [setFilter]);

  const smartSearch = useCallback((query: string) => {
    parseAndApplySearchQuery(query);
  }, [parseAndApplySearchQuery]);
  
  return {
    searchQuery: filter.searchQuery || '',
    search,
    clearSearch,
    smartSearch
  };
};

// Advanced filtering hooks
export const useAdvancedFiltering = () => {
  const {
    filter,
    savedFilters,
    activeFilterId,
    filterStatistics,
    setFilter,
    loadSavedFilters,
    applySavedFilter,
    saveCurrentFilter,
    deleteSavedFilter,
    updateFilterStatistics
  } = useTaskStore();

  const applyFilter = useCallback((newFilter: Partial<TaskFilter>) => {
    setFilter(newFilter);
    updateFilterStatistics();
  }, [setFilter, updateFilterStatistics]);

  const resetFilter = useCallback(() => {
    setFilter({});
    updateFilterStatistics();
  }, [setFilter, updateFilterStatistics]);

  return {
    filter,
    savedFilters,
    activeFilterId,
    filterStatistics,
    applyFilter,
    resetFilter,
    loadSavedFilters,
    applySavedFilter,
    saveCurrentFilter,
    deleteSavedFilter,
    updateFilterStatistics
  };
};

export const useFilterStatistics = () => {
  const { filterStatistics, updateFilterStatistics } = useTaskStore();
  
  return {
    statistics: filterStatistics,
    updateStatistics: updateFilterStatistics
  };
};

export const useSavedFilters = () => {
  const {
    savedFilters,
    activeFilterId,
    loadSavedFilters,
    applySavedFilter,
    saveCurrentFilter,
    deleteSavedFilter
  } = useTaskStore();

  const getBuiltInFilters = useCallback(() => {
    return savedFilters.filter(f => f.isBuiltIn);
  }, [savedFilters]);

  const getCustomFilters = useCallback(() => {
    return savedFilters.filter(f => !f.isBuiltIn);
  }, [savedFilters]);

  const getMostUsedFilters = useCallback((limit = 5) => {
    return savedFilters
      .filter(f => !f.isBuiltIn && f.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }, [savedFilters]);

  return {
    savedFilters,
    activeFilterId,
    loadSavedFilters,
    applySavedFilter,
    saveCurrentFilter,
    deleteSavedFilter,
    getBuiltInFilters,
    getCustomFilters,
    getMostUsedFilters
  };
};