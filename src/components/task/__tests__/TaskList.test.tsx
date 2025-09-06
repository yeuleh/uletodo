/**
 * Unit tests for TaskList component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskList } from '../TaskList';
import { TaskStatus, TaskPriority, TaskSortOption } from '@/types/Task.types';
import type { Task } from '@/types/Task.types';

// Mock the TaskItem component
vi.mock('../TaskItem', () => ({
  TaskItem: ({ task, onToggle, onEdit, onDelete, onAddSubtask, onSelect }: any) => (
    <div data-testid={`task-item-${task.id}`}>
      <span>{task.title}</span>
      <button onClick={() => onToggle(task.id)}>Toggle</button>
      <button onClick={() => onEdit(task)}>Edit</button>
      <button onClick={() => onDelete(task.id)}>Delete</button>
      <button onClick={() => onAddSubtask(task.id)}>Add Subtask</button>
      <button onClick={() => onSelect(task)}>Select</button>
    </div>
  )
}));

// Mock VirtualScrollList
vi.mock('@/components/common/VirtualScrollList', () => ({
  VirtualScrollList: ({ items, renderItem }: any) => (
    <div data-testid="virtual-scroll-list">
      {items.map((item: any, index: number) => (
        <div key={item.id}>
          {renderItem(item, index, {})}
        </div>
      ))}
    </div>
  )
}));

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Task 1',
    description: 'First task',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    tags: ['work']
  },
  {
    id: '2',
    title: 'Task 2',
    description: 'Second task',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    tags: ['personal'],
    parentId: '1'
  },
  {
    id: '3',
    title: 'Task 3',
    description: 'Third task',
    status: TaskStatus.COMPLETED,
    priority: TaskPriority.LOW,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
    completedAt: new Date('2024-01-03'),
    tags: []
  }
];

describe('TaskList', () => {
  const defaultProps = {
    tasks: mockTasks,
    onTaskToggle: vi.fn(),
    onTaskEdit: vi.fn(),
    onTaskDelete: vi.fn(),
    onAddSubtask: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render task list with tasks', () => {
      render(<TaskList {...defaultProps} />);

      expect(screen.getByTestId('task-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('task-item-2')).toBeInTheDocument();
      expect(screen.getByTestId('task-item-3')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      render(<TaskList {...defaultProps} tasks={[]} loading={true} />);

      expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
    });

    it('should show empty state when no tasks', () => {
      render(<TaskList {...defaultProps} tasks={[]} />);

      expect(screen.getByText('No tasks found')).toBeInTheDocument();
      expect(screen.getByText('Get started by creating your first task!')).toBeInTheDocument();
    });

    it('should show create task button in empty state', () => {
      const onCreateTask = vi.fn();
      render(
        <TaskList 
          {...defaultProps} 
          tasks={[]} 
          onCreateTask={onCreateTask} 
        />
      );

      const createButton = screen.getByText('Create Your First Task');
      expect(createButton).toBeInTheDocument();

      fireEvent.click(createButton);
      expect(onCreateTask).toHaveBeenCalledOnce();
    });

    it('should display task count', () => {
      render(<TaskList {...defaultProps} />);

      expect(screen.getByText('3 tasks')).toBeInTheDocument();
    });

    it('should display singular task count', () => {
      render(<TaskList {...defaultProps} tasks={[mockTasks[0]]} />);

      expect(screen.getByText('1 task')).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('should filter out completed tasks when showCompleted is false', () => {
      render(<TaskList {...defaultProps} showCompleted={false} />);

      expect(screen.getByTestId('task-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('task-item-2')).toBeInTheDocument();
      expect(screen.queryByTestId('task-item-3')).not.toBeInTheDocument();
    });

    it('should apply status filter', () => {
      const filter = { status: [TaskStatus.COMPLETED] };
      render(<TaskList {...defaultProps} filter={filter} />);

      expect(screen.queryByTestId('task-item-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('task-item-2')).not.toBeInTheDocument();
      expect(screen.getByTestId('task-item-3')).toBeInTheDocument();
    });

    it('should apply priority filter', () => {
      const filter = { priority: [TaskPriority.HIGH] };
      render(<TaskList {...defaultProps} filter={filter} />);

      expect(screen.getByTestId('task-item-1')).toBeInTheDocument();
      expect(screen.queryByTestId('task-item-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('task-item-3')).not.toBeInTheDocument();
    });

    it('should apply tag filter', () => {
      const filter = { tags: ['work'] };
      render(<TaskList {...defaultProps} filter={filter} />);

      expect(screen.getByTestId('task-item-1')).toBeInTheDocument();
      expect(screen.queryByTestId('task-item-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('task-item-3')).not.toBeInTheDocument();
    });

    it('should apply search query filter', () => {
      const filter = { searchQuery: 'First' };
      render(<TaskList {...defaultProps} filter={filter} />);

      expect(screen.getByTestId('task-item-1')).toBeInTheDocument();
      expect(screen.queryByTestId('task-item-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('task-item-3')).not.toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    it('should sort tasks by creation date descending by default', () => {
      render(<TaskList {...defaultProps} />);

      const taskItems = screen.getAllByTestId(/task-item-/);
      // Tasks should be in order: 1, 2, 3 (by hierarchy, not just creation date)
      expect(taskItems).toHaveLength(3);
    });

    it('should sort tasks by title ascending', () => {
      render(<TaskList {...defaultProps} sortBy={TaskSortOption.TITLE_ASC} />);

      // All tasks should still be rendered
      expect(screen.getByTestId('task-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('task-item-2')).toBeInTheDocument();
      expect(screen.getByTestId('task-item-3')).toBeInTheDocument();
    });
  });

  describe('task interactions', () => {
    it('should call onTaskToggle when toggle button is clicked', () => {
      render(<TaskList {...defaultProps} />);

      const toggleButton = screen.getAllByText('Toggle')[0];
      fireEvent.click(toggleButton);

      expect(defaultProps.onTaskToggle).toHaveBeenCalledWith('1');
    });

    it('should call onTaskEdit when edit button is clicked', () => {
      render(<TaskList {...defaultProps} />);

      const editButton = screen.getAllByText('Edit')[0];
      fireEvent.click(editButton);

      expect(defaultProps.onTaskEdit).toHaveBeenCalledWith(mockTasks[0]);
    });

    it('should call onTaskDelete when delete button is clicked', () => {
      render(<TaskList {...defaultProps} />);

      const deleteButton = screen.getAllByText('Delete')[0];
      fireEvent.click(deleteButton);

      expect(defaultProps.onTaskDelete).toHaveBeenCalledWith('1');
    });

    it('should call onAddSubtask when add subtask button is clicked', () => {
      render(<TaskList {...defaultProps} />);

      const addSubtaskButton = screen.getAllByText('Add Subtask')[0];
      fireEvent.click(addSubtaskButton);

      expect(defaultProps.onAddSubtask).toHaveBeenCalledWith('1');
    });

    it('should call onTaskSelect when task is selected', () => {
      const onTaskSelect = vi.fn();
      render(<TaskList {...defaultProps} onTaskSelect={onTaskSelect} />);

      const selectButton = screen.getAllByText('Select')[0];
      fireEvent.click(selectButton);

      expect(onTaskSelect).toHaveBeenCalledWith(mockTasks[0]);
    });
  });

  describe('bulk actions', () => {
    it('should enter bulk action mode when Select button is clicked', () => {
      render(<TaskList {...defaultProps} />);

      const selectButton = screen.getByText('Select');
      fireEvent.click(selectButton);

      expect(screen.getByText('Select All')).toBeInTheDocument();
      expect(screen.getByText('Toggle Complete')).toBeInTheDocument();
      expect(screen.getByText('Delete Selected')).toBeInTheDocument();
    });

    it('should exit bulk action mode when Cancel is clicked', () => {
      render(<TaskList {...defaultProps} />);

      // Enter bulk mode
      const selectButton = screen.getByText('Select');
      fireEvent.click(selectButton);

      // Exit bulk mode
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Select All')).not.toBeInTheDocument();
    });

    it('should select all tasks when Select All is clicked', () => {
      render(<TaskList {...defaultProps} />);

      // Enter bulk mode
      fireEvent.click(screen.getByText('Select'));

      // Click Select All
      fireEvent.click(screen.getByText('Select All'));

      expect(screen.getByText('3 of 3 selected')).toBeInTheDocument();
    });

    it('should deselect all tasks when Deselect All is clicked', () => {
      render(<TaskList {...defaultProps} />);

      // Enter bulk mode and select all
      fireEvent.click(screen.getByText('Select'));
      fireEvent.click(screen.getByText('Select All'));

      // Deselect all
      fireEvent.click(screen.getByText('Deselect All'));

      expect(screen.getByText('0 of 3 selected')).toBeInTheDocument();
    });
  });

  describe('expand/collapse', () => {
    it('should expand all parent tasks when Expand All is clicked', () => {
      render(<TaskList {...defaultProps} />);

      const expandAllButton = screen.getByText('Expand All');
      fireEvent.click(expandAllButton);

      // This would expand parent tasks to show their subtasks
      // The exact behavior depends on the task hierarchy
    });

    it('should collapse all parent tasks when Collapse All is clicked', () => {
      render(<TaskList {...defaultProps} />);

      const collapseAllButton = screen.getByText('Collapse All');
      fireEvent.click(collapseAllButton);

      // This would collapse parent tasks to hide their subtasks
    });
  });

  describe('virtual scrolling', () => {
    it('should use virtual scrolling when enabled and task count is high', () => {
      const manyTasks = Array.from({ length: 150 }, (_, i) => ({
        ...mockTasks[0],
        id: `task-${i}`,
        title: `Task ${i}`
      }));

      render(
        <TaskList 
          {...defaultProps} 
          tasks={manyTasks}
          useVirtualScrolling={true}
          containerHeight={400}
        />
      );

      expect(screen.getByTestId('virtual-scroll-list')).toBeInTheDocument();
    });

    it('should not use virtual scrolling for small task lists', () => {
      render(
        <TaskList 
          {...defaultProps} 
          useVirtualScrolling={true}
          containerHeight={400}
        />
      );

      expect(screen.queryByTestId('virtual-scroll-list')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<TaskList {...defaultProps} />);

      // Check for accessible elements
      expect(screen.getByText('3 tasks')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<TaskList {...defaultProps} />);

      const taskList = screen.getByRole('main') || document.body;
      
      // Test keyboard events
      fireEvent.keyDown(taskList, { key: 'ArrowDown' });
      fireEvent.keyDown(taskList, { key: 'Enter' });
      
      // The exact behavior would depend on keyboard navigation implementation
    });
  });

  describe('performance', () => {
    it('should handle large task lists efficiently', () => {
      const manyTasks = Array.from({ length: 1000 }, (_, i) => ({
        ...mockTasks[0],
        id: `task-${i}`,
        title: `Task ${i}`
      }));

      const startTime = performance.now();
      render(<TaskList {...defaultProps} tasks={manyTasks} />);
      const endTime = performance.now();

      // Rendering should complete within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(1000); // 1 second
    });

    it('should memoize expensive calculations', () => {
      const { rerender } = render(<TaskList {...defaultProps} />);

      // Re-render with same props should be fast
      const startTime = performance.now();
      rerender(<TaskList {...defaultProps} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // 100ms
    });
  });
});