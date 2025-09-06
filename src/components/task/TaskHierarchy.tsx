import React, { useState, useMemo } from 'react';
import { Task, TaskFilter, TaskSortOption } from '@/types';
import { TaskItem } from './TaskItem';
import { Button } from '@/components/common';
import './TaskHierarchy.css';

export interface TaskHierarchyProps {
  tasks: Task[];
  onTaskSelect?: (task: Task) => void;
  onTaskToggle: (taskId: string) => void;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onAddSubtask: (parentId: string) => void;
  filter?: TaskFilter;
  sortBy?: TaskSortOption;
  selectedTaskId?: string;
  showCompleted?: boolean;
  maxDepth?: number;
}

interface HierarchyNode {
  task: Task;
  level: number;
  subtasks: Task[];
  isExpanded: boolean;
  hasChildren: boolean;
  isLastChild: boolean;
  parentPath: boolean[];
}

export const TaskHierarchy: React.FC<TaskHierarchyProps> = ({
  tasks,
  onTaskSelect,
  onTaskToggle,
  onTaskEdit,
  onTaskDelete,
  onAddSubtask,
  filter = {},
  sortBy = TaskSortOption.CREATED_AT_DESC,
  selectedTaskId,
  showCompleted = true,
  maxDepth = 10,
}) => {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // Build task hierarchy with proper nesting information
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

    // Sort function
    const sortTasks = (taskList: Task[]): Task[] => {
      return [...taskList].sort((a, b) => {
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
    };

    // Recursive function to build hierarchy with visual nesting information
    const buildHierarchy = (
      task: Task, 
      level: number = 0, 
      parentPath: boolean[] = [],
      isLastChild: boolean = false
    ): HierarchyNode[] => {
      if (level >= maxDepth) {
        return [];
      }

      const children = childTasks.get(task.id) || [];
      const sortedChildren = sortTasks(children);
      const isExpanded = expandedTasks.has(task.id);
      const hasChildren = sortedChildren.length > 0;

      const currentNode: HierarchyNode = {
        task,
        level,
        subtasks: sortedChildren,
        isExpanded,
        hasChildren,
        isLastChild,
        parentPath: [...parentPath],
      };

      const result = [currentNode];

      // Only include children if parent is expanded
      if (isExpanded && hasChildren) {
        sortedChildren.forEach((child, index) => {
          const isLast = index === sortedChildren.length - 1;
          const newParentPath = [...parentPath, !isLastChild];
          result.push(...buildHierarchy(child, level + 1, newParentPath, isLast));
        });
      }

      return result;
    };

    // Build complete hierarchy
    const hierarchy: HierarchyNode[] = [];
    const sortedRootTasks = sortTasks(rootTasks);
    
    sortedRootTasks.forEach((task, index) => {
      const isLast = index === sortedRootTasks.length - 1;
      hierarchy.push(...buildHierarchy(task, 0, [], isLast));
    });

    return hierarchy;
  }, [tasks, sortBy, expandedTasks, maxDepth]);

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

  const renderHierarchyLines = (parentPath: boolean[], level: number) => {
    if (level === 0) return null;

    return (
      <div className="task-hierarchy__lines">
        {parentPath.map((hasLine, index) => (
          <div
            key={index}
            className={`task-hierarchy__line ${hasLine ? 'task-hierarchy__line--visible' : ''}`}
          />
        ))}
      </div>
    );
  };

  if (filteredHierarchy.length === 0) {
    return (
      <div className="task-hierarchy task-hierarchy--empty">
        <div className="task-hierarchy__empty-state">
          <div className="task-hierarchy__empty-icon">🌳</div>
          <h3 className="task-hierarchy__empty-title">No tasks in hierarchy</h3>
          <p className="task-hierarchy__empty-description">
            Tasks with subtasks will appear here with proper nesting visualization.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="task-hierarchy">
      {/* Hierarchy controls */}
      <div className="task-hierarchy__controls">
        <div className="task-hierarchy__stats">
          <span className="task-hierarchy__count">
            {filteredHierarchy.length} task{filteredHierarchy.length !== 1 ? 's' : ''} in hierarchy
          </span>
        </div>
        <div className="task-hierarchy__actions">
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
        </div>
      </div>

      {/* Hierarchy items */}
      <div className="task-hierarchy__items">
        {filteredHierarchy.map(({ task, level, subtasks, isExpanded, isLastChild, parentPath }) => (
          <div key={task.id} className="task-hierarchy__item">
            {renderHierarchyLines(parentPath, level)}
            <div 
              className="task-hierarchy__item-content"
              style={{ 
                paddingLeft: `${level * 1.5}rem`,
                position: 'relative'
              }}
            >
              {/* Connection lines for hierarchy visualization */}
              {level > 0 && (
                <>
                  <div className="task-hierarchy__connector task-hierarchy__connector--horizontal" />
                  {!isLastChild && (
                    <div className="task-hierarchy__connector task-hierarchy__connector--vertical" />
                  )}
                </>
              )}
              
              <TaskItem
                task={task}
                level={0} // We handle indentation in the wrapper
                onToggle={onTaskToggle}
                onEdit={onTaskEdit}
                onDelete={onTaskDelete}
                onAddSubtask={onAddSubtask}
                onSelect={onTaskSelect}
                isSelected={task.id === selectedTaskId}
                subtasks={subtasks}
                onExpandToggle={handleExpandToggle}
                isExpanded={isExpanded}
                showProgress={true}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};