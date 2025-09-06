import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Task, TaskFilter, TaskSortOption } from '@/types';
import { TaskItem } from './TaskItem';
import { Button } from '@/components/common';
import { VirtualScrollList } from '@/components/common/VirtualScrollList';
import './TaskList.css';

export interface TaskListProps {
  tasks: Task[];
  onTaskSelect?: (task: Task) => void;
  onTaskToggle: (taskId: string) => void;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onAddSubtask: (parentId: string) => void;
  onCreateTask?: () => void;
  filter?: TaskFilter;
  sortBy?: TaskSortOption;
  loading?: boolean;
  selectedTaskId?: string;
  showCompleted?: boolean;
  useVirtualScrolling?: boolean;
  containerHeight?: number;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onTaskSelect,
  onTaskToggle,
  onTaskEdit,
  onTaskDelete,
  onAddSubtask,
  onCreateTask,
  filter = {},
  sortBy = TaskSortOption.CREATED_AT_DESC,
  loading = false,
  selectedTaskId,
  showCompleted = true,
  useVirtualScrolling = false,
  containerHeight = 600,
}) => {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const [actualContainerHeight, setActualContainerHeight] = useState(containerHeight);

  // Measure container height for virtual scrolling
  useEffect(() => {
    if (useVirtualScrolling && containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setActualContainerHeight(entry.contentRect.height);
        }
      });
      
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [useVirtualScrolling]);

  // Build task hierarchy with expand/collapse support
  const taskHierarchy = useMemo(() => {
    const taskMap = new Map<string, Task>();
    const rootTasks: Task[] = [];
    const childTasks = new Map<string, Task[]>();

    // First pass: create task map and identify root tasks
    tasks.forEach(task => {
      taskMap.set(task.id, task);
      if (!task.parentId) {
        rootTasks.push(task);
      } else {
        if (!childTasks.has(task.parentId)) {
          childTasks.set(task.parentId, []);
        }
        childTasks.get(task.parentId)!.push(task);
      }
    });

    // Recursive function to build hierarchy with expand/collapse support
    const buildHierarchy = (task: Task, level: number = 0): Array<{ 
      task: Task; 
      level: number; 
      subtasks: Task[];
      isExpanded: boolean;
    }> => {
      const children = childTasks.get(task.id) || [];
      const isExpanded = expandedTasks.has(task.id);
      
      // Sort children by the same criteria as root tasks
      const sortedChildren = [...children].sort((a, b) => {
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

      const result = [{ task, level, subtasks: sortedChildren, isExpanded }];

      // Only include children if parent is expanded
      if (isExpanded) {
        sortedChildren.forEach(child => {
          result.push(...buildHierarchy(child, level + 1));
        });
      }

      return result;
    };

    // Sort root tasks
    const sortedRootTasks = [...rootTasks].sort((a, b) => {
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

    // Build complete hierarchy
    const hierarchy: Array<{ 
      task: Task; 
      level: number; 
      subtasks: Task[];
      isExpanded: boolean;
    }> = [];
    sortedRootTasks.forEach(task => {
      hierarchy.push(...buildHierarchy(task));
    });

    return hierarchy;
  }, [tasks, sortBy, expandedTasks]);

  // Filter tasks based on completion status and other filters
  const filteredHierarchy = useMemo(() => {
    return taskHierarchy.filter(({ task }) => {
      // Filter by completion status
      if (!showCompleted && task.status === 'completed') {
        return false;
      }

      // Apply other filters
      if (filter.status && filter.status.length > 0) {
        if (!filter.status.includes(task.status)) {
          return false;
        }
      }

      if (filter.priority && filter.priority.length > 0) {
        if (!filter.priority.includes(task.priority)) {
          return false;
        }
      }

      if (filter.tags && filter.tags.length > 0) {
        const hasMatchingTag = filter.tags.some(tag => task.tags.includes(tag));
        if (!hasMatchingTag) {
          return false;
        }
      }

      if (filter.dueDateFrom && task.dueDate) {
        if (new Date(task.dueDate) < new Date(filter.dueDateFrom)) {
          return false;
        }
      }

      if (filter.dueDateTo && task.dueDate) {
        if (new Date(task.dueDate) > new Date(filter.dueDateTo)) {
          return false;
        }
      }

      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDescription = task.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription) {
          return false;
        }
      }

      return true;
    });
  }, [taskHierarchy, showCompleted, filter]);

  const handleTaskSelect = (task: Task) => {
    if (bulkActionMode) {
      const newSelected = new Set(selectedTasks);
      if (newSelected.has(task.id)) {
        newSelected.delete(task.id);
      } else {
        newSelected.add(task.id);
      }
      setSelectedTasks(newSelected);
    } else {
      onTaskSelect?.(task);
    }
  };

  const handleBulkToggle = () => {
    setBulkActionMode(!bulkActionMode);
    setSelectedTasks(new Set());
  };

  const handleBulkDelete = () => {
    selectedTasks.forEach(taskId => {
      onTaskDelete(taskId);
    });
    setSelectedTasks(new Set());
    setBulkActionMode(false);
  };

  const handleBulkComplete = () => {
    selectedTasks.forEach(taskId => {
      onTaskToggle(taskId);
    });
    setSelectedTasks(new Set());
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === filteredHierarchy.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredHierarchy.map(({ task }) => task.id)));
    }
  };

  const handleExpandToggle = (taskId: string, expanded: boolean) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (expanded) {
        newSet.add(taskId);
      } else {
        newSet.delete(taskId);
      }
      return newSet;
    });
  };

  const handleExpandAll = () => {
    const allParentTasks = tasks.filter(task => 
      tasks.some(t => t.parentId === task.id)
    );
    setExpandedTasks(new Set(allParentTasks.map(t => t.id)));
  };

  const handleCollapseAll = () => {
    setExpandedTasks(new Set());
  };

  if (loading) {
    return (
      <div className="task-list task-list--loading">
        <div className="task-list__spinner">
          <div className="spinner" />
        </div>
        <p>Loading tasks...</p>
      </div>
    );
  }

  if (filteredHierarchy.length === 0) {
    return (
      <div className="task-list task-list--empty">
        <div className="task-list__empty-state">
          <div className="task-list__empty-icon">📝</div>
          <h3 className="task-list__empty-title">No tasks found</h3>
          <p className="task-list__empty-description">
            {tasks.length === 0 
              ? "Get started by creating your first task!"
              : "Try adjusting your filters to see more tasks."
            }
          </p>
          {onCreateTask && tasks.length === 0 && (
            <Button onClick={onCreateTask} variant="primary">
              Create Your First Task
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="task-list">
      {/* Bulk actions toolbar */}
      {bulkActionMode && (
        <div className="task-list__bulk-toolbar">
          <div className="task-list__bulk-info">
            <Button
              variant="ghost"
              size="small"
              onClick={handleSelectAll}
            >
              {selectedTasks.size === filteredHierarchy.length ? 'Deselect All' : 'Select All'}
            </Button>
            <span className="task-list__bulk-count">
              {selectedTasks.size} of {filteredHierarchy.length} selected
            </span>
          </div>
          <div className="task-list__bulk-actions">
            <Button
              variant="secondary"
              size="small"
              onClick={handleBulkComplete}
              disabled={selectedTasks.size === 0}
            >
              Toggle Complete
            </Button>
            <Button
              variant="danger"
              size="small"
              onClick={handleBulkDelete}
              disabled={selectedTasks.size === 0}
            >
              Delete Selected
            </Button>
            <Button
              variant="ghost"
              size="small"
              onClick={handleBulkToggle}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Task list header */}
      <div className="task-list__header">
        <div className="task-list__stats">
          <span className="task-list__count">
            {filteredHierarchy.length} task{filteredHierarchy.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="task-list__actions">
          <Button
            variant="ghost"
            size="small"
            onClick={handleExpandAll}
            title="Expand all parent tasks"
          >
            Expand All
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={handleCollapseAll}
            title="Collapse all parent tasks"
          >
            Collapse All
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={handleBulkToggle}
          >
            {bulkActionMode ? 'Cancel' : 'Select'}
          </Button>
        </div>
      </div>

      {/* Task items */}
      <div 
        ref={containerRef}
        className={`task-list__items ${useVirtualScrolling ? 'task-list__items--virtual' : ''}`}
        style={useVirtualScrolling ? { height: actualContainerHeight } : undefined}
      >
        {useVirtualScrolling && filteredHierarchy.length > 100 ? (
          <VirtualScrollList
            items={filteredHierarchy.map(({ task, level, subtasks, isExpanded }) => ({
              id: task.id,
              task,
              level,
              subtasks,
              isExpanded,
              height: 80 + (level * 20) // Estimate height based on nesting level
            }))}
            containerHeight={actualContainerHeight}
            itemHeight={80}
            renderItem={(item, _index, style) => (
              <div style={style}>
                <TaskItem
                  key={item.task.id}
                  task={item.task}
                  level={item.level}
                  onToggle={onTaskToggle}
                  onEdit={onTaskEdit}
                  onDelete={onTaskDelete}
                  onAddSubtask={onAddSubtask}
                  onSelect={handleTaskSelect}
                  isSelected={bulkActionMode ? selectedTasks.has(item.task.id) : item.task.id === selectedTaskId}
                  subtasks={item.subtasks}
                  onExpandToggle={handleExpandToggle}
                  isExpanded={item.isExpanded}
                  showProgress={true}
                />
              </div>
            )}
            overscan={5}
            className="task-list__virtual-scroll"
          />
        ) : (
          filteredHierarchy.map(({ task, level, subtasks, isExpanded }) => (
            <TaskItem
              key={task.id}
              task={task}
              level={level}
              onToggle={onTaskToggle}
              onEdit={onTaskEdit}
              onDelete={onTaskDelete}
              onAddSubtask={onAddSubtask}
              onSelect={handleTaskSelect}
              isSelected={bulkActionMode ? selectedTasks.has(task.id) : task.id === selectedTaskId}
              subtasks={subtasks}
              onExpandToggle={handleExpandToggle}
              isExpanded={isExpanded}
              showProgress={true}
            />
          ))
        )}
      </div>
    </div>
  );
};