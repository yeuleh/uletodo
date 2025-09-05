/**
 * UI state store using Zustand for state management
 * Manages modal states, filter UI, selections, and other UI-related state
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Task } from '@/types/Task.types';

export interface ModalState {
  createTask: boolean;
  editTask: boolean;
  deleteTask: boolean;
  taskDetail: boolean;
  tagManager: boolean;
  settings: boolean;
}

export interface FilterUIState {
  showFilterPanel: boolean;
  activeFilterCount: number;
  quickFilters: {
    today: boolean;
    thisWeek: boolean;
    overdue: boolean;
    completed: boolean;
  };
}

export interface SelectionState {
  selectedTaskIds: Set<string>;
  lastSelectedTaskId: string | null;
  selectionMode: boolean;
}

export interface ViewState {
  currentView: 'list' | 'table' | 'gantt' | 'dashboard';
  sidebarCollapsed: boolean;
  taskDetailPanelOpen: boolean;
  taskDetailPanelWidth: number;
}

export interface UIState {
  // Modal states
  modals: ModalState;
  
  // Filter UI state
  filterUI: FilterUIState;
  
  // Selection state
  selection: SelectionState;
  
  // View state
  view: ViewState;
  
  // Loading and notification states
  globalLoading: boolean;
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
    autoClose?: boolean;
  }>;
  
  // Task being edited/viewed
  editingTask: Task | null;
  viewingTask: Task | null;
  
  // Actions for modals
  openModal: (modal: keyof ModalState) => void;
  closeModal: (modal: keyof ModalState) => void;
  closeAllModals: () => void;
  
  // Actions for filter UI
  toggleFilterPanel: () => void;
  setQuickFilter: (filter: keyof FilterUIState['quickFilters'], active: boolean) => void;
  updateActiveFilterCount: (count: number) => void;
  
  // Actions for selection
  selectTask: (taskId: string, multiSelect?: boolean) => void;
  deselectTask: (taskId: string) => void;
  selectAllTasks: (taskIds: string[]) => void;
  clearSelection: () => void;
  toggleSelectionMode: () => void;
  
  // Actions for view
  setCurrentView: (view: ViewState['currentView']) => void;
  toggleSidebar: () => void;
  toggleTaskDetailPanel: () => void;
  setTaskDetailPanelWidth: (width: number) => void;
  
  // Actions for tasks being edited/viewed
  setEditingTask: (task: Task | null) => void;
  setViewingTask: (task: Task | null) => void;
  
  // Actions for notifications
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Global loading
  setGlobalLoading: (loading: boolean) => void;
  
  // Computed getters
  isAnyModalOpen: () => boolean;
  getSelectedTaskCount: () => number;
  hasActiveFilters: () => boolean;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set, get) => ({
      // Initial state
      modals: {
        createTask: false,
        editTask: false,
        deleteTask: false,
        taskDetail: false,
        tagManager: false,
        settings: false
      },
      
      filterUI: {
        showFilterPanel: false,
        activeFilterCount: 0,
        quickFilters: {
          today: false,
          thisWeek: false,
          overdue: false,
          completed: false
        }
      },
      
      selection: {
        selectedTaskIds: new Set(),
        lastSelectedTaskId: null,
        selectionMode: false
      },
      
      view: {
        currentView: 'list',
        sidebarCollapsed: false,
        taskDetailPanelOpen: false,
        taskDetailPanelWidth: 400
      },
      
      globalLoading: false,
      notifications: [],
      editingTask: null,
      viewingTask: null,

      // Modal actions
      openModal: (modal) => set((state) => ({
        modals: { ...state.modals, [modal]: true }
      })),
      
      closeModal: (modal) => set((state) => ({
        modals: { ...state.modals, [modal]: false }
      })),
      
      closeAllModals: () => set((state) => ({
        modals: Object.keys(state.modals).reduce((acc, key) => ({
          ...acc,
          [key]: false
        }), {} as ModalState)
      })),

      // Filter UI actions
      toggleFilterPanel: () => set((state) => ({
        filterUI: {
          ...state.filterUI,
          showFilterPanel: !state.filterUI.showFilterPanel
        }
      })),
      
      setQuickFilter: (filter, active) => set((state) => ({
        filterUI: {
          ...state.filterUI,
          quickFilters: {
            ...state.filterUI.quickFilters,
            [filter]: active
          }
        }
      })),
      
      updateActiveFilterCount: (count) => set((state) => ({
        filterUI: {
          ...state.filterUI,
          activeFilterCount: count
        }
      })),

      // Selection actions
      selectTask: (taskId, multiSelect = false) => set((state) => {
        const newSelectedIds = new Set(state.selection.selectedTaskIds);
        
        if (multiSelect) {
          if (newSelectedIds.has(taskId)) {
            newSelectedIds.delete(taskId);
          } else {
            newSelectedIds.add(taskId);
          }
        } else {
          newSelectedIds.clear();
          newSelectedIds.add(taskId);
        }
        
        return {
          selection: {
            ...state.selection,
            selectedTaskIds: newSelectedIds,
            lastSelectedTaskId: taskId,
            selectionMode: newSelectedIds.size > 1
          }
        };
      }),
      
      deselectTask: (taskId) => set((state) => {
        const newSelectedIds = new Set(state.selection.selectedTaskIds);
        newSelectedIds.delete(taskId);
        
        return {
          selection: {
            ...state.selection,
            selectedTaskIds: newSelectedIds,
            selectionMode: newSelectedIds.size > 1
          }
        };
      }),
      
      selectAllTasks: (taskIds) => set((state) => ({
        selection: {
          ...state.selection,
          selectedTaskIds: new Set(taskIds),
          selectionMode: taskIds.length > 1
        }
      })),
      
      clearSelection: () => set((state) => ({
        selection: {
          ...state.selection,
          selectedTaskIds: new Set(),
          lastSelectedTaskId: null,
          selectionMode: false
        }
      })),
      
      toggleSelectionMode: () => set((state) => ({
        selection: {
          ...state.selection,
          selectionMode: !state.selection.selectionMode
        }
      })),

      // View actions
      setCurrentView: (currentView) => set((state) => ({
        view: { ...state.view, currentView }
      })),
      
      toggleSidebar: () => set((state) => ({
        view: {
          ...state.view,
          sidebarCollapsed: !state.view.sidebarCollapsed
        }
      })),
      
      toggleTaskDetailPanel: () => set((state) => ({
        view: {
          ...state.view,
          taskDetailPanelOpen: !state.view.taskDetailPanelOpen
        }
      })),
      
      setTaskDetailPanelWidth: (width) => set((state) => ({
        view: { ...state.view, taskDetailPanelWidth: width }
      })),

      // Task editing/viewing actions
      setEditingTask: (editingTask) => set({ editingTask }),
      setViewingTask: (viewingTask) => set({ viewingTask }),

      // Notification actions
      addNotification: (notification) => set((state) => ({
        notifications: [
          ...state.notifications,
          {
            ...notification,
            id: `notification-${Date.now()}-${Math.random()}`,
            timestamp: Date.now()
          }
        ]
      })),
      
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),
      
      clearNotifications: () => set({ notifications: [] }),

      // Global loading
      setGlobalLoading: (globalLoading) => set({ globalLoading }),

      // Computed getters
      isAnyModalOpen: () => {
        const { modals } = get();
        return Object.values(modals).some(isOpen => isOpen);
      },
      
      getSelectedTaskCount: () => {
        return get().selection.selectedTaskIds.size;
      },
      
      hasActiveFilters: () => {
        const { filterUI } = get();
        return filterUI.activeFilterCount > 0 || 
               Object.values(filterUI.quickFilters).some(active => active);
      }
    }),
    {
      name: 'ui-store'
    }
  )
);