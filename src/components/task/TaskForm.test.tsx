import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TaskForm from './TaskForm';
import { Task } from '../../types/task';

const mockHandlers = {
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
};

const mockTask: Task = {
  id: 1,
  title: 'Test Task',
  description: 'Test Description',
  completed: false,
  due_date: '2024-12-31',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('TaskForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create form correctly', () => {
    render(<TaskForm {...mockHandlers} />);
    
    expect(screen.getByPlaceholderText('输入任务标题...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('输入任务描述...')).toBeInTheDocument();
    expect(screen.getByText('创建任务')).toBeInTheDocument();
  });

  it('renders edit form with task data', () => {
    render(<TaskForm task={mockTask} {...mockHandlers} />);
    
    expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-12-31')).toBeInTheDocument();
    expect(screen.getByText('更新任务')).toBeInTheDocument();
  });

  it('validates required title field', async () => {
    const mockSubmit = vi.fn();
    render(<TaskForm onSubmit={mockSubmit} onCancel={mockHandlers.onCancel} />);
    
    const submitButton = screen.getByText('创建任务');
    fireEvent.click(submitButton);
    
    // Form should not submit with empty title
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    render(<TaskForm {...mockHandlers} />);
    
    const titleInput = screen.getByPlaceholderText('输入任务标题...');
    const descriptionInput = screen.getByPlaceholderText('输入任务描述...');
    const submitButton = screen.getByText('创建任务');
    
    fireEvent.change(titleInput, { target: { value: 'New Task' } });
    fireEvent.change(descriptionInput, { target: { value: 'New Description' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockHandlers.onSubmit).toHaveBeenCalledWith({
        title: 'New Task',
        description: 'New Description',
        due_date: undefined,
        project_id: undefined,
      });
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<TaskForm {...mockHandlers} />);
    
    const cancelButton = screen.getByText('取消');
    fireEvent.click(cancelButton);
    
    expect(mockHandlers.onCancel).toHaveBeenCalled();
  });
});