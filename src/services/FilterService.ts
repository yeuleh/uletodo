/**
 * Advanced filtering service for task management
 * Handles complex filter combinations, persistence, and statistics
 */

import { 
  TaskStatus,
  TaskPriority,
  FilterLogicOperator
} from '@/types/Task.types';
import type { 
  Task, 
  TaskFilter, 
  FilterStatistics, 
  SavedFilter
} from '@/types/Task.types';

export class FilterService {
  private static readonly STORAGE_KEY = 'uletodo_saved_filters';
  private static readonly PREFERENCES_KEY = 'uletodo_filter_preferences';

  /**
   * Apply advanced filtering logic with AND/OR combinations
   */
  static applyAdvancedFilter(tasks: Task[], filter: TaskFilter): Task[] {
    if (!filter || Object.keys(filter).length === 0) {
      return tasks;
    }

    return tasks.filter(task => {
      const conditions: boolean[] = [];

      // Status filter
      if (filter.status && filter.status.length > 0) {
        conditions.push(filter.status.includes(task.status));
      }

      // Priority filter
      if (filter.priority && filter.priority.length > 0) {
        conditions.push(filter.priority.includes(task.priority));
      }

      // Tags filter with configurable logic
      if (filter.tags && filter.tags.length > 0) {
        const tagLogic = filter.tagLogicOperator || FilterLogicOperator.OR;
        
        if (tagLogic === FilterLogicOperator.AND) {
          // All specified tags must be present
          conditions.push(filter.tags.every(tag => task.tags.includes(tag)));
        } else {
          // At least one specified tag must be present
          conditions.push(filter.tags.some(tag => task.tags.includes(tag)));
        }
      }

      // Due date range filter
      if (filter.dueDateFrom && task.dueDate) {
        conditions.push(new Date(task.dueDate) >= new Date(filter.dueDateFrom));
      }
      if (filter.dueDateTo && task.dueDate) {
        conditions.push(new Date(task.dueDate) <= new Date(filter.dueDateTo));
      }

      // Parent ID filter
      if (filter.parentId !== undefined) {
        conditions.push(task.parentId === filter.parentId);
      }

      // Search query filter
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDescription = task.description?.toLowerCase().includes(query);
        const matchesTags = task.tags.some(tag => tag.toLowerCase().includes(query));
        conditions.push(matchesTitle || matchesDescription || matchesTags);
      }

      // Apply main logic operator
      const mainLogic = filter.logicOperator || FilterLogicOperator.AND;
      
      if (conditions.length === 0) {
        return true;
      }

      return mainLogic === FilterLogicOperator.AND 
        ? conditions.every(condition => condition)
        : conditions.some(condition => condition);
    });
  }

  /**
   * Calculate comprehensive filter statistics
   */
  static calculateStatistics(allTasks: Task[], filteredTasks: Task[]): FilterStatistics {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    // Count tasks by various criteria
    const completedTasks = filteredTasks.filter(task => task.status === TaskStatus.COMPLETED).length;
    const pendingTasks = filteredTasks.filter(task => task.status !== TaskStatus.COMPLETED).length;
    
    const overdueTasks = filteredTasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) < today && 
      task.status !== TaskStatus.COMPLETED
    ).length;

    const todayTasks = filteredTasks.filter(task =>
      task.dueDate &&
      new Date(task.dueDate) >= today &&
      new Date(task.dueDate) < tomorrow
    ).length;

    const thisWeekTasks = filteredTasks.filter(task =>
      task.dueDate &&
      new Date(task.dueDate) >= startOfWeek &&
      new Date(task.dueDate) < endOfWeek
    ).length;

    // Count by priority
    const byPriority: Record<TaskPriority, number> = {
      [TaskPriority.NONE]: 0,
      [TaskPriority.LOW]: 0,
      [TaskPriority.MEDIUM]: 0,
      [TaskPriority.HIGH]: 0
    };

    filteredTasks.forEach(task => {
      byPriority[task.priority]++;
    });

    // Count by status
    const byStatus: Record<TaskStatus, number> = {
      [TaskStatus.TODO]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.COMPLETED]: 0
    };

    filteredTasks.forEach(task => {
      byStatus[task.status]++;
    });

    // Count by tags
    const byTags: Record<string, number> = {};
    filteredTasks.forEach(task => {
      task.tags.forEach(tag => {
        byTags[tag] = (byTags[tag] || 0) + 1;
      });
    });

    return {
      totalTasks: allTasks.length,
      filteredTasks: filteredTasks.length,
      completedTasks,
      pendingTasks,
      overdueTasks,
      todayTasks,
      thisWeekTasks,
      byPriority,
      byStatus,
      byTags
    };
  }

  /**
   * Get built-in filter presets
   */
  static getBuiltInFilters(): SavedFilter[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return [
      {
        id: 'all-tasks',
        name: 'All Tasks',
        filter: {},
        isBuiltIn: true,
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'today',
        name: 'Today',
        filter: {
          dueDateFrom: today,
          dueDateTo: tomorrow,
          status: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
        },
        isBuiltIn: true,
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'this-week',
        name: 'This Week',
        filter: {
          dueDateFrom: startOfWeek,
          dueDateTo: endOfWeek,
          status: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
        },
        isBuiltIn: true,
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'overdue',
        name: 'Overdue',
        filter: {
          dueDateTo: today,
          status: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
        },
        isBuiltIn: true,
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'high-priority',
        name: 'High Priority',
        filter: {
          priority: [TaskPriority.HIGH],
          status: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
        },
        isBuiltIn: true,
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'completed',
        name: 'Completed',
        filter: {
          status: [TaskStatus.COMPLETED]
        },
        isBuiltIn: true,
        createdAt: new Date(),
        usageCount: 0
      }
    ];
  }

  /**
   * Save a custom filter
   */
  static saveFilter(name: string, filter: TaskFilter): SavedFilter {
    const savedFilters = this.getSavedFilters();
    
    const newFilter: SavedFilter = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      filter,
      isBuiltIn: false,
      createdAt: new Date(),
      usageCount: 0
    };

    savedFilters.push(newFilter);
    this.setSavedFilters(savedFilters);
    
    return newFilter;
  }

  /**
   * Update an existing saved filter
   */
  static updateSavedFilter(id: string, updates: Partial<SavedFilter>): SavedFilter | null {
    const savedFilters = this.getSavedFilters();
    const filterIndex = savedFilters.findIndex(f => f.id === id);
    
    if (filterIndex === -1) {
      return null;
    }

    savedFilters[filterIndex] = { ...savedFilters[filterIndex], ...updates };
    this.setSavedFilters(savedFilters);
    
    return savedFilters[filterIndex];
  }

  /**
   * Delete a saved filter
   */
  static deleteSavedFilter(id: string): boolean {
    const savedFilters = this.getSavedFilters();
    const filteredFilters = savedFilters.filter(f => f.id !== id && !f.isBuiltIn);
    
    if (filteredFilters.length === savedFilters.length) {
      return false; // Filter not found or is built-in
    }

    this.setSavedFilters(filteredFilters);
    return true;
  }

  /**
   * Get all saved filters (built-in + custom)
   */
  static getAllFilters(): SavedFilter[] {
    const builtInFilters = this.getBuiltInFilters();
    const customFilters = this.getSavedFilters();
    
    return [...builtInFilters, ...customFilters];
  }

  /**
   * Record filter usage for analytics
   */
  static recordFilterUsage(filterId: string): void {
    const allFilters = this.getAllFilters();
    const filter = allFilters.find(f => f.id === filterId);
    
    if (filter && !filter.isBuiltIn) {
      this.updateSavedFilter(filterId, {
        lastUsed: new Date(),
        usageCount: filter.usageCount + 1
      });
    }
  }

  /**
   * Get filter preferences
   */
  static getFilterPreferences(): {
    defaultLogicOperator: FilterLogicOperator;
    defaultTagLogicOperator: FilterLogicOperator;
    showStatistics: boolean;
    autoSaveFilters: boolean;
  } {
    const stored = localStorage.getItem(this.PREFERENCES_KEY);
    
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.warn('Failed to parse filter preferences:', error);
      }
    }

    return {
      defaultLogicOperator: FilterLogicOperator.AND,
      defaultTagLogicOperator: FilterLogicOperator.OR,
      showStatistics: true,
      autoSaveFilters: false
    };
  }

  /**
   * Save filter preferences
   */
  static saveFilterPreferences(preferences: {
    defaultLogicOperator?: FilterLogicOperator;
    defaultTagLogicOperator?: FilterLogicOperator;
    showStatistics?: boolean;
    autoSaveFilters?: boolean;
  }): void {
    const current = this.getFilterPreferences();
    const updated = { ...current, ...preferences };
    
    localStorage.setItem(this.PREFERENCES_KEY, JSON.stringify(updated));
  }

  /**
   * Create a filter from search query with intelligent parsing
   */
  static parseSearchQuery(query: string): TaskFilter {
    const filter: TaskFilter = {};
    
    // Parse priority keywords
    const priorityMatch = query.match(/priority:(high|medium|low|none)/i);
    if (priorityMatch) {
      filter.priority = [priorityMatch[1].toLowerCase() as TaskPriority];
      query = query.replace(priorityMatch[0], '').trim();
    }

    // Parse status keywords
    const statusMatch = query.match(/status:(todo|in_progress|completed)/i);
    if (statusMatch) {
      filter.status = [statusMatch[1].toLowerCase() as TaskStatus];
      query = query.replace(statusMatch[0], '').trim();
    }

    // Parse tag keywords
    const tagMatches = query.match(/tag:(\w+)/gi);
    if (tagMatches) {
      filter.tags = tagMatches.map(match => match.replace('tag:', ''));
      tagMatches.forEach(match => {
        query = query.replace(match, '').trim();
      });
    }

    // Parse date keywords
    const dueDateMatch = query.match(/due:(today|tomorrow|this_week|overdue)/i);
    if (dueDateMatch) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (dueDateMatch[1].toLowerCase()) {
        case 'today':
          filter.dueDateFrom = today;
          filter.dueDateTo = new Date(today.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'tomorrow':
          const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
          filter.dueDateFrom = tomorrow;
          filter.dueDateTo = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'this_week':
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 7);
          filter.dueDateFrom = startOfWeek;
          filter.dueDateTo = endOfWeek;
          break;
        case 'overdue':
          filter.dueDateTo = today;
          break;
      }
      query = query.replace(dueDateMatch[0], '').trim();
    }

    // Remaining text becomes search query
    if (query.length > 0) {
      filter.searchQuery = query;
    }

    return filter;
  }

  /**
   * Private helper methods
   */
  private static getSavedFilters(): SavedFilter[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    
    if (stored) {
      try {
        return JSON.parse(stored).map((filter: any) => ({
          ...filter,
          createdAt: new Date(filter.createdAt),
          lastUsed: filter.lastUsed ? new Date(filter.lastUsed) : undefined
        }));
      } catch (error) {
        console.warn('Failed to parse saved filters:', error);
      }
    }

    return [];
  }

  private static setSavedFilters(filters: SavedFilter[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filters));
  }
}