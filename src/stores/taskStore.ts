/**
 * Task store using Zustand for state management
 * Manages task list state, loading states, and task operations
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  Task, 
  CreateTaskInput, 
  UpdateTaskInput, 
  TaskFilter,
  FilterStatistics,
  SavedFilter
} from '@/types/Task.types';
import { TaskSortOption } from '@/types/Task.types';
import { TaskService, type TaskError } from '@/services/TaskService';
import { FilterService } from '@/services/FilterService';

export interface TaskState {
  // Task data
  tasks: Task[];
  selectedTask: Task | null;
  
  // Loading states
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  
  // Error states
  error: TaskError | null;
  
  // Filter and sort state
  filter: TaskFilter;
  sortBy: TaskSortOption;
  
  // UI state
  showCompleted: boolean;
  
  // Advanced filtering state
  savedFilters: SavedFilter[];
  activeFilterId: string | null;
  filterStatistics: FilterStatistics | null;
  
  // Actions
  setTasks: (tasks: Task[]) => void;
  setSelectedTask: (task: Task | null) => void;
  setFilter: (filter: Partial<TaskFilter>) => void;
  setSortBy: (sortBy: TaskSortOption) => void;
  setShowCompleted: (show: boolean) => void;
  setError: (error: TaskError | null) => void;
  
  // Advanced filtering actions
  loadSavedFilters: () => void;
  applySavedFilter: (filterId: string) => void;
  saveCurrentFilter: (name: string) => SavedFilter;
  deleteSavedFilter: (filterId: string) => boolean;
  updateFilterStatistics: () => void;
  parseAndApplySearchQuery: (query: string) => void;
  
  // Async actions
  loadTasks: () => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task | null>;
  updateTask: (id: string, input: UpdateTaskInput) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<boolean>;
  toggleTaskStatus: (id: string) => Promise<Task | null>;
  addSubtask: (parentId: string, input: CreateTaskInput) => Promise<Task | null>;
  
  // Computed getters
  getFilteredTasks: () => Task[];
  getTaskById: (id: string) => Task | undefined;
  getSubtasks: (parentId: string) => Task[];
  getCompletedTasksCount: () => number;
  getTotalTasksCount: () => number;
  getAllSavedFilters: () => SavedFilter[];
  getActiveFilter: () => SavedFilter | null;
}

export const useTaskStore = create<TaskState>()(
  devtools(
    (set, get) => ({
      // Initial state
      tasks: [],
      selectedTask: null,
      loading: false,
      creating: false,
      updating: false,
      deleting: false,
      error: null,
      filter: {},
      sortBy: TaskSortOption.CREATED_AT_DESC,
      showCompleted: true,
      savedFilters: [],
      activeFilterId: null,
      filterStatistics: null,

      // Basic setters
      setTasks: (tasks) => set({ tasks }),
      setSelectedTask: (selectedTask) => set({ selectedTask }),
      setFilter: (newFilter) => set((state) => ({ 
        filter: { ...state.filter, ...newFilter } 
      })),
      setSortBy: (sortBy) => set({ sortBy }),
      setShowCompleted: (showCompleted) => set({ showCompleted }),
      setError: (error) => set({ error }),

      // Async actions
      loadTasks: async () => {
        set({ loading: true, error: null });
        try {
          const { filter, sortBy } = get();
          const tasks = await TaskService.listTasks(filter, sortBy);
          set({ tasks, loading: false });
          
          // Load saved filters if not already loaded
          const { savedFilters } = get();
          if (savedFilters.length === 0) {
            get().loadSavedFilters();
          }
          
          // Update statistics
          get().updateFilterStatistics();
        } catch (error) {
          set({ 
            error: error as TaskError, 
            loading: false 
          });
        }
      },

      createTask: async (input) => {
        set({ creating: true, error: null });
        try {
          const task = await TaskService.createTask(input);
          set((state) => ({
            tasks: [...state.tasks, task],
            creating: false
          }));
          return task;
        } catch (error) {
          set({ 
            error: error as TaskError, 
            creating: false 
          });
          return null;
        }
      },

      updateTask: async (id, input) => {
        set({ updating: true, error: null });
        try {
          const updatedTask = await TaskService.updateTask(id, input);
          set((state) => ({
            tasks: state.tasks.map(task => 
              task.id === id ? updatedTask : task
            ),
            selectedTask: state.selectedTask?.id === id ? updatedTask : state.selectedTask,
            updating: false
          }));
          return updatedTask;
        } catch (error) {
          set({ 
            error: error as TaskError, 
            updating: false 
          });
          return null;
        }
      },

      deleteTask: async (id) => {
        set({ deleting: true, error: null });
        try {
          await TaskService.deleteTask(id);
          set((state) => ({
            tasks: state.tasks.filter(task => task.id !== id),
            selectedTask: state.selectedTask?.id === id ? null : state.selectedTask,
            deleting: false
          }));
          return true;
        } catch (error) {
          set({ 
            error: error as TaskError, 
            deleting: false 
          });
          return false;
        }
      },

      toggleTaskStatus: async (id) => {
        set({ updating: true, error: null });
        try {
          const updatedTask = await TaskService.toggleTaskStatus(id);
          set((state) => ({
            tasks: state.tasks.map(task => 
              task.id === id ? updatedTask : task
            ),
            selectedTask: state.selectedTask?.id === id ? updatedTask : state.selectedTask,
            updating: false
          }));
          return updatedTask;
        } catch (error) {
          set({ 
            error: error as TaskError, 
            updating: false 
          });
          return null;
        }
      },

      addSubtask: async (parentId, input) => {
        set({ creating: true, error: null });
        try {
          const subtask = await TaskService.addSubtask(parentId, input);
          set((state) => ({
            tasks: [...state.tasks, subtask],
            creating: false
          }));
          return subtask;
        } catch (error) {
          set({ 
            error: error as TaskError, 
            creating: false 
          });
          return null;
        }
      },

      // Advanced filtering actions
      loadSavedFilters: () => {
        const savedFilters = FilterService.getAllFilters();
        set({ savedFilters });
      },

      applySavedFilter: (filterId) => {
        const { savedFilters } = get();
        const savedFilter = savedFilters.find(f => f.id === filterId);
        
        if (savedFilter) {
          set({ 
            filter: savedFilter.filter,
            activeFilterId: filterId
          });
          FilterService.recordFilterUsage(filterId);
          get().updateFilterStatistics();
        }
      },

      saveCurrentFilter: (name) => {
        const { filter } = get();
        const savedFilter = FilterService.saveFilter(name, filter);
        
        set((state) => ({
          savedFilters: [...state.savedFilters, savedFilter],
          activeFilterId: savedFilter.id
        }));
        
        return savedFilter;
      },

      deleteSavedFilter: (filterId) => {
        const success = FilterService.deleteSavedFilter(filterId);
        
        if (success) {
          set((state) => ({
            savedFilters: state.savedFilters.filter(f => f.id !== filterId),
            activeFilterId: state.activeFilterId === filterId ? null : state.activeFilterId
          }));
        }
        
        return success;
      },

      updateFilterStatistics: () => {
        const { tasks } = get();
        const filteredTasks = get().getFilteredTasks();
        const statistics = FilterService.calculateStatistics(tasks, filteredTasks);
        set({ filterStatistics: statistics });
      },

      parseAndApplySearchQuery: (query) => {
        const parsedFilter = FilterService.parseSearchQuery(query);
        set({ 
          filter: parsedFilter,
          activeFilterId: null
        });
        get().updateFilterStatistics();
      },

      // Computed getters
      getFilteredTasks: () => {
        const { tasks, filter, showCompleted, sortBy } = get();
        
        // Apply show completed filter first
        let filteredTasks = showCompleted 
          ? tasks 
          : tasks.filter(task => task.status !== 'completed');

        // Apply advanced filtering
        filteredTasks = FilterService.applyAdvancedFilter(filteredTasks, filter);

        // Sort tasks
        filteredTasks.sort((a, b) => {
          switch (sortBy) {
            case TaskSortOption.CREATED_AT_ASC:
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case TaskSortOption.CREATED_AT_DESC:
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case TaskSortOption.DUE_DATE_ASC:
              if (!a.dueDate && !b.dueDate) return 0;
              if (!a.dueDate) return 1;
              if (!b.dueDate) return -1;
              return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            case TaskSortOption.DUE_DATE_DESC:
              if (!a.dueDate && !b.dueDate) return 0;
              if (!a.dueDate) return 1;
              if (!b.dueDate) return -1;
              return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
            case TaskSortOption.PRIORITY_DESC:
              const priorityOrder = { high: 3, medium: 2, low: 1, none: 0 };
              return priorityOrder[b.priority] - priorityOrder[a.priority];
            case TaskSortOption.TITLE_ASC:
              return a.title.localeCompare(b.title);
            default:
              return 0;
          }
        });

        return filteredTasks;
      },

      getTaskById: (id) => {
        return get().tasks.find(task => task.id === id);
      },

      getSubtasks: (parentId) => {
        return get().tasks.filter(task => task.parentId === parentId);
      },

      getCompletedTasksCount: () => {
        return get().tasks.filter(task => task.status === 'completed').length;
      },

      getTotalTasksCount: () => {
        return get().tasks.length;
      },

      getAllSavedFilters: () => {
        return get().savedFilters;
      },

      getActiveFilter: () => {
        const { savedFilters, activeFilterId } = get();
        return activeFilterId ? savedFilters.find(f => f.id === activeFilterId) || null : null;
      }
    }),
    {
      name: 'task-store'
    }
  )
);

// Subscribe to TaskService updates for real-time sync
TaskService.subscribe((tasks) => {
  useTaskStore.getState().setTasks(tasks);
});