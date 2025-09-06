import React, { useState, useEffect } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { Button } from '@/components/common';
import { TaskForm } from '@/components/task';
import { Task, CreateTaskInput, TaskStatus, TaskPriority } from '@/types';
import './TaskManager.css';

export const TaskManager: React.FC = () => {
  // Use the task store
  const {
    tasks,
    loading,
    error,
    loadTasks,
    createTask,
    toggleTaskStatus,
    deleteTask
  } = useTaskStore();

  // Local state
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Load tasks on component mount
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Handle task creation
  const handleCreateTask = async (taskData: CreateTaskInput) => {
    try {
      await createTask(taskData);
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  // Handle task toggle
  const handleToggleTask = async (taskId: string) => {
    try {
      await toggleTaskStatus(taskId);
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(taskId);
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="task-manager">
        <div className="task-manager__loading">
          <p>Loading tasks...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="task-manager">
        <div className="task-manager__error">
          <p>Error: {error.message}</p>
          <Button onClick={() => loadTasks()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="task-manager">
      <header className="task-manager__header">
        <h1>Task Manager</h1>
        <Button 
          variant="primary" 
          onClick={() => setShowForm(true)}
        >
          Add Task
        </Button>
      </header>

      <main className="task-manager__content">
        {tasks.length === 0 ? (
          <div className="task-manager__empty">
            <p>No tasks yet. Create your first task!</p>
          </div>
        ) : (
          <div className="task-manager__list">
            {tasks.map((task) => (
              <div key={task.id} className="task-item">
                <div className="task-item__content">
                  <input
                    type="checkbox"
                    checked={task.status === TaskStatus.COMPLETED}
                    onChange={() => handleToggleTask(task.id)}
                    className="task-item__checkbox"
                  />
                  <div className="task-item__details">
                    <h3 className={`task-item__title ${task.status === TaskStatus.COMPLETED ? 'completed' : ''}`}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="task-item__description">{task.description}</p>
                    )}
                    <div className="task-item__meta">
                      <span className={`task-item__priority priority-${task.priority}`}>
                        {task.priority}
                      </span>
                      {task.dueDate && (
                        <span className="task-item__due-date">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="task-item__actions">
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <div className="task-manager__modal">
          <div className="task-manager__modal-content">
            <TaskForm
              onSave={handleCreateTask}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};