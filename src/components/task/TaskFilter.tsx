/**
 * TaskFilter component for comprehensive task filtering
 * Provides UI for status, priority, due date, tag, and search filtering
 */

import React, { useState, useEffect } from 'react';
import { TaskStatus, TaskPriority, FilterLogicOperator } from '@/types/Task.types';
import type { TaskFilter as TaskFilterType } from '@/types/Task.types';
import { useAdvancedFiltering, useTaskSearch, useTagManagement, useTaskManagement } from '@/stores/hooks';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { DatePicker } from '@/components/common/DatePicker';
import { TagSelector } from '@/components/common/TagSelector';
import { SavedFilters } from '@/components/common/SavedFilters';
import { FilterStatistics } from '@/components/common/FilterStatistics';
import './TaskFilter.css';

export interface TaskFilterProps {
  className?: string;
  compact?: boolean;
  showStatistics?: boolean;
  showSavedFilters?: boolean;
  onFilterChange?: (filter: TaskFilterType) => void;
}

export const TaskFilter: React.FC<TaskFilterProps> = ({
  className = '',
  compact = false,
  showStatistics = true,
  showSavedFilters = true,
  onFilterChange
}) => {
  const {
    filter,
    filterStatistics,
    applyFilter,
    resetFilter
  } = useAdvancedFiltering();
  
  const { parseAndApplySearchQuery } = useTaskManagement();

  const { searchQuery, search, clearSearch } = useTaskSearch();
  const { tags } = useTagManagement();

  // Local state for form inputs
  const [localFilter, setLocalFilter] = useState<TaskFilterType>(filter);
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update local state when store filter changes
  useEffect(() => {
    setLocalFilter(filter);
  }, [filter]);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // Apply filter with debouncing for search (removed unused function)

  // Handle search input changes with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput !== searchQuery) {
        // Check if it's a smart search query
        if (searchInput.includes(':')) {
          parseAndApplySearchQuery(searchInput);
        } else {
          search(searchInput);
        }
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput, searchQuery, search, parseAndApplySearchQuery]);

  // Handle filter field changes
  const handleFilterChange = (field: keyof TaskFilterType, value: any) => {
    const newFilter = { ...localFilter, [field]: value };
    setLocalFilter(newFilter);
    
    // Apply immediately for non-search fields
    if (field !== 'searchQuery') {
      applyFilter(newFilter);
      onFilterChange?.(newFilter);
    }
  };

  // Handle status filter toggle
  const toggleStatus = (status: TaskStatus) => {
    const currentStatuses = localFilter.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    
    handleFilterChange('status', newStatuses.length > 0 ? newStatuses : undefined);
  };

  // Handle priority filter toggle
  const togglePriority = (priority: TaskPriority) => {
    const currentPriorities = localFilter.priority || [];
    const newPriorities = currentPriorities.includes(priority)
      ? currentPriorities.filter(p => p !== priority)
      : [...currentPriorities, priority];
    
    handleFilterChange('priority', newPriorities.length > 0 ? newPriorities : undefined);
  };

  // Handle tag filter changes
  const handleTagsChange = (selectedTags: string[]) => {
    handleFilterChange('tags', selectedTags.length > 0 ? selectedTags : undefined);
  };

  // Handle quick filter presets
  const applyQuickFilter = (type: 'today' | 'thisWeek' | 'overdue' | 'highPriority' | 'completed') => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let quickFilter: Partial<TaskFilterType> = {};
    
    switch (type) {
      case 'today':
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        quickFilter = {
          dueDateFrom: today,
          dueDateTo: tomorrow,
          status: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
        };
        break;
        
      case 'thisWeek':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        quickFilter = {
          dueDateFrom: startOfWeek,
          dueDateTo: endOfWeek,
          status: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
        };
        break;
        
      case 'overdue':
        quickFilter = {
          dueDateTo: today,
          status: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
        };
        break;
        
      case 'highPriority':
        quickFilter = {
          priority: [TaskPriority.HIGH],
          status: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
        };
        break;
        
      case 'completed':
        quickFilter = {
          status: [TaskStatus.COMPLETED]
        };
        break;
    }
    
    setLocalFilter(quickFilter);
    applyFilter(quickFilter);
    onFilterChange?.(quickFilter);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setLocalFilter({});
    setSearchInput('');
    resetFilter();
    clearSearch();
    onFilterChange?.({});
  };

  // Check if any filters are active
  const hasActiveFilters = Object.keys(localFilter).length > 0 || searchInput.trim().length > 0;

  if (compact) {
    return (
      <div className={`task-filter task-filter--compact ${className}`}>
        <div className="task-filter__search">
          <Input
            type="text"
            placeholder="Search tasks or use smart filters (e.g., priority:high, tag:work)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="task-filter__search-input"
          />
        </div>
        
        <div className="task-filter__quick-filters">
          <Button
            variant="secondary"
            size="small"
            onClick={() => applyQuickFilter('today')}
            className={localFilter.dueDateFrom && 
              localFilter.dueDateFrom.toDateString() === new Date().toDateString() 
              ? 'task-filter__quick-button--active' : ''}
          >
            Today
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => applyQuickFilter('thisWeek')}
          >
            This Week
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => applyQuickFilter('overdue')}
          >
            Overdue
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="small"
              onClick={handleClearFilters}
              className="task-filter__clear-button"
            >
              Clear
            </Button>
          )}
        </div>

        {showStatistics && (
          <FilterStatistics 
            statistics={filterStatistics} 
            compact={true}
            className="task-filter__statistics"
          />
        )}
      </div>
    );
  }

  return (
    <div className={`task-filter ${className}`}>
      <div className="task-filter__header">
        <h3 className="task-filter__title">Filter Tasks</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="small"
            onClick={handleClearFilters}
            className="task-filter__clear-all"
          >
            Clear All Filters
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="task-filter__section">
        <label className="task-filter__label">Search</label>
        <Input
          type="text"
          placeholder="Search tasks or use smart filters (e.g., priority:high, tag:work, due:today)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="task-filter__search-input"
        />
        <div className="task-filter__search-help">
          <small>
            Smart search: Use <code>priority:high</code>, <code>status:todo</code>, 
            <code>tag:work</code>, <code>due:today</code>
          </small>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="task-filter__section">
        <label className="task-filter__label">Quick Filters</label>
        <div className="task-filter__quick-filters">
          <Button
            variant={localFilter.dueDateFrom && 
              localFilter.dueDateFrom.toDateString() === new Date().toDateString() 
              ? 'primary' : 'secondary'}
            size="small"
            onClick={() => applyQuickFilter('today')}
          >
            Today
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => applyQuickFilter('thisWeek')}
          >
            This Week
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => applyQuickFilter('overdue')}
          >
            Overdue
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => applyQuickFilter('highPriority')}
          >
            High Priority
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => applyQuickFilter('completed')}
          >
            Completed
          </Button>
        </div>
      </div>

      {/* Status Filter */}
      <div className="task-filter__section">
        <label className="task-filter__label">Status</label>
        <div className="task-filter__checkbox-group">
          {Object.values(TaskStatus).map((status) => (
            <label key={status} className="task-filter__checkbox">
              <input
                type="checkbox"
                checked={localFilter.status?.includes(status) || false}
                onChange={() => toggleStatus(status)}
              />
              <span className={`task-filter__status-label task-filter__status-label--${status}`}>
                {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Priority Filter */}
      <div className="task-filter__section">
        <label className="task-filter__label">Priority</label>
        <div className="task-filter__checkbox-group">
          {Object.values(TaskPriority).map((priority) => (
            <label key={priority} className="task-filter__checkbox">
              <input
                type="checkbox"
                checked={localFilter.priority?.includes(priority) || false}
                onChange={() => togglePriority(priority)}
              />
              <span className={`task-filter__priority-label task-filter__priority-label--${priority}`}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Tags Filter */}
      <div className="task-filter__section">
        <label className="task-filter__label">Tags</label>
        <TagSelector
          selectedTags={localFilter.tags || []}
          availableTags={tags}
          onTagsChange={handleTagsChange}
          placeholder="Filter by tags..."
        />
        
        {localFilter.tags && localFilter.tags.length > 1 && (
          <div className="task-filter__tag-logic">
            <label className="task-filter__checkbox">
              <input
                type="radio"
                name="tagLogic"
                checked={localFilter.tagLogicOperator !== FilterLogicOperator.AND}
                onChange={() => handleFilterChange('tagLogicOperator', FilterLogicOperator.OR)}
              />
              <span>Match ANY tag</span>
            </label>
            <label className="task-filter__checkbox">
              <input
                type="radio"
                name="tagLogic"
                checked={localFilter.tagLogicOperator === FilterLogicOperator.AND}
                onChange={() => handleFilterChange('tagLogicOperator', FilterLogicOperator.AND)}
              />
              <span>Match ALL tags</span>
            </label>
          </div>
        )}
      </div>

      {/* Advanced Filters Toggle */}
      <div className="task-filter__section">
        <Button
          variant="ghost"
          size="small"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="task-filter__advanced-toggle"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
        </Button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <>
          {/* Due Date Range */}
          <div className="task-filter__section">
            <label className="task-filter__label">Due Date Range</label>
            <div className="task-filter__date-range">
              <DatePicker
                label="From"
                value={localFilter.dueDateFrom}
                onChange={(date) => handleFilterChange('dueDateFrom', date)}
                placeholder="Start date"
                className="task-filter__date-input"
              />
              <DatePicker
                label="To"
                value={localFilter.dueDateTo}
                onChange={(date) => handleFilterChange('dueDateTo', date)}
                placeholder="End date"
                className="task-filter__date-input"
              />
            </div>
          </div>

          {/* Filter Logic */}
          <div className="task-filter__section">
            <label className="task-filter__label">Filter Logic</label>
            <div className="task-filter__logic-group">
              <label className="task-filter__checkbox">
                <input
                  type="radio"
                  name="filterLogic"
                  checked={localFilter.logicOperator !== FilterLogicOperator.OR}
                  onChange={() => handleFilterChange('logicOperator', FilterLogicOperator.AND)}
                />
                <span>Match ALL conditions (AND)</span>
              </label>
              <label className="task-filter__checkbox">
                <input
                  type="radio"
                  name="filterLogic"
                  checked={localFilter.logicOperator === FilterLogicOperator.OR}
                  onChange={() => handleFilterChange('logicOperator', FilterLogicOperator.OR)}
                />
                <span>Match ANY condition (OR)</span>
              </label>
            </div>
          </div>
        </>
      )}

      {/* Saved Filters */}
      {showSavedFilters && (
        <div className="task-filter__section">
          <SavedFilters
            onFilterApplied={(savedFilter) => {
              setLocalFilter(savedFilter.filter);
              onFilterChange?.(savedFilter.filter);
            }}
            className="task-filter__saved-filters"
          />
        </div>
      )}

      {/* Filter Statistics */}
      {showStatistics && (
        <div className="task-filter__section">
          <FilterStatistics 
            statistics={filterStatistics}
            className="task-filter__statistics"
          />
        </div>
      )}
    </div>
  );
};

export default TaskFilter;