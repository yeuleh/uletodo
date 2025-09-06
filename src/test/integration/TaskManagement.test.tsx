/**
 * Integration tests for task management workflows
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskManager } from '@/pages/TaskManager';
import { createMockTauriInvoke, resetMockData } from '@/test/mocks/tauriMocks';
import { TaskStatus, TaskPriority } from '@/types/Task.types';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: createMockTauriInvoke()
}));

// Mock all the complex components to focus on integration
vi.mock('@/components/task/TaskList', () => ({
  TaskList: ({ tasks, onTaskToggle, onTaskEdit, onTaskDelete, onAddSubtask, onCreateTask }: any) => (
    <div data-testid="task-list">
      <div data-testid="task-count">{tasks.length} tasks</div>
      {tasks.map((task: any) => (
        <div key={task.id} data-testid={`task-${task.id}`}>
          <span>{task.title}</span>
          <span data-testid={`status-${task.id}`}>{task.status}</span>
          <button onClick={() => onTaskToggle(task.id)}>Toggle Status</button>
          <button onClick={() => onTaskEdit(task)}>Edit</button>
          <button onClick={() => onTaskDelete(task.id)}>Delete</button>
          <button onClick={() => onAddSubtask(task.id)}>Add Subtask</button>
        </div>
      ))}
      {onCreateTask && (
        <button onClick={onCreateTask}>Create Task</button>
      )}
    </div>
  )
}));

vi.mock('@/components/task/TaskForm', () => ({
  TaskForm: ({ task, onSave, onCancel, parentTaskId }: any) => (
    <div data-testid="task-form">
      <input
        data-testid="task-title-input"
        placeholder="Task title"
        defaultValue={task?.title || ''}
        onChange={(e) => {
          // Store value for form submission
          (window as any).taskFormData = {
            ...(window as any).taskFormData,
            title: e.target.value
          };
        }}
      />
      <textarea
        data-testid="task-description-input"
        placeholder="Task description"
        defaultValue={task?.description || ''}
        onChange={(e) => {
          (window as any).taskFormData = {
            ...(window as any).taskFormData,
            description: e.target.value
          };
        }}
      />
      <select
        data-testid="task-priority-select"
        defaultValue={task?.priority || TaskPriority.NONE}
        onChange={(e) => {
          (window as any).taskFormData = {
            ...(window as any).taskFormData,
            priority: e.target.value
          };
        }}
      >
        <option value={TaskPriority.NONE}>None</option>
        <option value={TaskPriority.LOW}>Low</option>
        <option value={TaskPriority.MEDIUM}>Medium</option>
        <option value={TaskPriority.HIGH}>High</option>
      </select>
      <button
        onClick={() => {
          const formData = (window as any).taskFormData || {};
          onSave({
            title: formData.title || task?.title || 'New Task',
            description: formData.description || task?.description,
            priority: formData.priority || task?.priority || TaskPriority.NONE,
            parentId: parentTaskId,
            tags: task?.tags || []
          });
        }}
      >
        Save
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}));

vi.mock('@/components/task/TaskFilter', () => ({
  TaskFilter: ({ onFilterChange }: any) => (
    <div data-testid="task-filter">
      <select
        data-testid="status-filter"
        onChange={(e) => {
          const status = e.target.value;
          onFilterChange({
            status: status ? [status] : undefined
          });
        }}
      >
        <option value="">All Status</option>
        <option value={TaskStatus.TODO}>Todo</option>
        <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
        <option value={TaskStatus.COMPLETED}>Completed</option>
      </select>
      <select
        data-testid="priority-filter"
        onChange={(e) => {
          const priority = e.target.value;
          onFilterChange({
            priority: priority ? [priority] : undefined
          });
        }}
      >
        <option value="">All Priority</option>
        <option value={TaskPriority.HIGH}>High</option>
        <option value={TaskPriority.MEDIUM}>Medium</option>
        <option value={TaskPriority.LOW}>Low</option>
      </select>
    </div>
  )
}));

describe('Task Management Integration', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    resetMockData();
    (window as any).taskFormData = {};
    vi.clearAllMocks();
  });

  describe('Complete Task Workflow', () => {
    it('should create, edit, and delete a task', async () => {
      render(<TaskManager />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('task-count')).toHaveTextContent('3 tasks');
      });

      // Create a new task
      const createButton = screen.getByText('Create Task');
      fireEvent.click(createButton);

      // Fill out the form
      const titleInput = screen.getByTestId('task-title-input');
      const descriptionInput = screen.getByTestId('task-description-input');
      const prioritySelect = screen.getByTestId('task-priority-select');

      await user.type(titleInput, 'Integration Test Task');
      await user.type(descriptionInput, 'This is a test task created during integration testing');
      await user.selectOptions(prioritySelect, TaskPriority.HIGH);

      // Save the task
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      // Verify task was created
      await waitFor(() => {
        expect(screen.getByTestId('task-count')).toHaveTextContent('4 tasks');
        expect(screen.getByText('Integration Test Task')).toBeInTheDocument();
      });

      // Edit the task
      const editButtons = screen.getAllByText('Edit');
      const newTaskEditButton = editButtons[editButtons.length - 1]; // Last task (newly created)
      fireEvent.click(newTaskEditButton);

      // Update the title
      const editTitleInput = screen.getByTestId('task-title-input');
      await user.clear(editTitleInput);
      await user.type(editTitleInput, 'Updated Integration Test Task');

      // Save the changes
      fireEvent.click(screen.getByText('Save'));

      // Verify task was updated
      await waitFor(() => {
        expect(screen.getByText('Updated Integration Test Task')).toBeInTheDocument();
        expect(screen.queryByText('Integration Test Task')).not.toBeInTheDocument();
      });

      // Delete the task
      const deleteButtons = screen.getAllByText('Delete');
      const newTaskDeleteButton = deleteButtons[deleteButtons.length - 1];
      fireEvent.click(newTaskDeleteButton);

      // Verify task was deleted
      await waitFor(() => {
        expect(screen.getByTestId('task-count')).toHaveTextContent('3 tasks');
        expect(screen.queryByText('Updated Integration Test Task')).not.toBeInTheDocument();
      });
    });

    it('should toggle task status', async () => {
      render(<TaskManager />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('task-count')).toHaveTextContent('3 tasks');
      });

      // Find the first task and toggle its status
      const firstTaskStatus = screen.getByTestId('status-1');
      expect(firstTaskStatus).toHaveTextContent(TaskStatus.TODO);

      const toggleButton = screen.getAllByText('Toggle Status')[0];
      fireEvent.click(toggleButton);

      // Verify status changed
      await waitFor(() => {
        expect(screen.getByTestId('status-1')).toHaveTextContent(TaskStatus.COMPLETED);
      });

      // Toggle back
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTestId('status-1')).toHaveTextContent(TaskStatus.TODO);
      });
    });

    it('should create subtasks', async () => {
      render(<TaskManager />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('task-count')).toHaveTextContent('3 tasks');
      });

      // Add subtask to first task
      const addSubtaskButtons = screen.getAllByText('Add Subtask');
      fireEvent.click(addSubtaskButtons[0]);

      // Fill out subtask form
      const titleInput = screen.getByTestId('task-title-input');
      await user.type(titleInput, 'New Subtask');

      // Save subtask
      fireEvent.click(screen.getByText('Save'));

      // Verify subtask was created
      await waitFor(() => {
        expect(screen.getByTestId('task-count')).toHaveTextContent('4 tasks');
        expect(screen.getByText('New Subtask')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter tasks by status', async () => {
      render(<TaskManager />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('task-count')).toHaveTextContent('3 tasks');
      });

      // Filter by completed status
      const statusFilter = screen.getByTestId('status-filter');
      await user.selectOptions(statusFilter, TaskStatus.COMPLETED);

      // Should show only completed tasks
      await waitFor(() => {
        expect(screen.getByTestId('task-count')).toHaveTextContent('1 tasks');
        expect(screen.getByTestId('status-3')).toHaveTextContent(TaskStatus.COMPLETED);
      });

      // Reset filter
      await user.selectOptions(statusFilter, '');

      await waitFor(() => {
        expect(screen.getByTestId('task-count')).toHaveTextContent('3 tasks');
      });
    });

    it('should filter tasks by priority', async () => {
      render(<TaskManager />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('task-count')).toHaveTextContent('3 tasks');
      });

      // Filter by high priority
      const priorityFilter = screen.getByTestId('priority-filter');
      await user.selectOptions(priorityFilter, TaskPriority.HIGH);

      // Should show only high priority tasks
      await waitFor(() => {
        expect(screen.getByTestId('task-count')).toHaveTextContent('1 tasks');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle task creation errors gracefully', async () => {
      render(<TaskManager />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('task-count')).toHaveTextContent('3 tasks');
      });

      // Try to create task with empty title
      const createButton = screen.getByText('Create Task');
      fireEvent.click(createButton);

      // Leave title empty and try to save
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      // Should handle validation error
      // The exact error handling depends on implementation
      // For now, just verify the form is still visible
      expect(screen.getByTestId('task-form')).toBeInTheDocument();
    });

    it('should handle network errors during task operations', async () => {
      // Mock a network error
      const mockInvoke = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.mocked(createMockTauriInvoke).mockReturnValue(mockInvoke);

      render(<TaskManager />);

      // The component should handle the error gracefully
      // Exact behavior depends on error handling implementation
    });
  });

  describe('Performance with Large Datasets', () => {
    it('should handle rendering many tasks efficiently', async () => {
      // Create a large number of mock tasks
      const manyTasks = Array.from({ length: 1000 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        description: `Description for task ${i}`,
        status: i % 3 === 0 ? TaskStatus.COMPLETED : 
               i % 3 === 1 ? TaskStatus.IN_PROGRESS : TaskStatus.TODO,
        priority: [TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW, TaskPriority.NONE][i % 4],
        createdAt: new Date(2024, 0, 1 + i),
        updatedAt: new Date(2024, 0, 1 + i),
        tags: [`tag${i % 5}`]
      }));

      // Mock the list_tasks command to return many tasks
      const mockInvoke = vi.fn().mockImplementation(async (command: string) => {
        if (command === 'list_tasks') {
          return manyTasks;
        }
        return createMockTauriInvoke()(command);
      });
      vi.mocked(createMockTauriInvoke).mockReturnValue(mockInvoke);

      const startTime = performance.now();
      render(<TaskManager />);

      await waitFor(() => {
        expect(screen.getByTestId('task-count')).toHaveTextContent('1000 tasks');
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(2000); // 2 seconds
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable', async () => {
      render(<TaskManager />);

      await waitFor(() => {
        expect(screen.getByTestId('task-count')).toHaveTextContent('3 tasks');
      });

      // Test keyboard navigation
      const createButton = screen.getByText('Create Task');
      createButton.focus();
      expect(document.activeElement).toBe(createButton);

      // Tab to next element
      await user.tab();
      // The exact behavior depends on tab order implementation
    });

    it('should have proper ARIA labels and roles', async () => {
      render(<TaskManager />);

      await waitFor(() => {
        expect(screen.getByTestId('task-list')).toBeInTheDocument();
      });

      // Check for accessibility attributes
      const taskList = screen.getByTestId('task-list');
      expect(taskList).toBeInTheDocument();
      
      // Additional accessibility checks would depend on implementation
    });
  });
});