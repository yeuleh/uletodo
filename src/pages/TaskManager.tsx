import React, { useState, useEffect } from 'react';
import { 
  TaskList, 
  TaskForm,
  TaskHierarchy 
} from '@/components/task';
import { Button, Modal, ConfirmDialog } from '@/components/common';
import { useTaskManagement, useAppUI } from '@/stores/hooks';
import { Task, CreateTaskInput, UpdateTaskInput } from '@/types';
import './TaskManager.css';

export const TaskManager: React.FC = () => {
  // State management
  const {
    tasks,
    loading,
    creating,
    updating,
    deleting,
    error,
    filter,
    sortBy,
    showCompleted,
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    addSubtask,
    getTaskById
  } = useTaskManagement();

  const {
    openModal,
    closeModal,
    modals,
    selectTask,
    selectedTaskIds,
    clearSelection,
    addNotification
  } = useAppUI();

  // Local state
  const [currentView, setCurrentView] = useState<'list' | 'hierarchy'>('list');
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load tasks on component mount
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Handle task creation
  const handleCreateTask = async (taskData: CreateTaskInput | UpdateTaskInput) => {
    const createData = taskData as CreateTaskInput;
    try {
      await createTask(createData);
      closeModal('createTask');
      addNotification({
        type: 'success',
        message: `Task "${createData.title}" has been created successfully.`
      });
    } catch (error) {
      console.error('Failed to create task:', error);
      addNotification({
        type: 'error',
        message: 'Failed to create task. Please try again.'
      });
    }
  };

  // Handle task update
  const handleUpdateTask = async (taskData: CreateTaskInput | UpdateTaskInput) => {
    const updateData = taskData as UpdateTaskInput;
    if (!taskToEdit) return;
    
    try {
      await updateTask(taskToEdit.id, updateData);
      setTaskToEdit(null);
      closeModal('editTask');
      addNotification({
        type: 'success',
        message: `Task "${taskToEdit.title}" has been updated successfully.`
      });
    } catch (error) {
      console.error('Failed to update task:', error);
      addNotification({
        type: 'error',
        message: 'Failed to update task. Please try again.'
      });
    }
  };

  // Handle subtask creation
  const handleCreateSubtask = async (taskData: CreateTaskInput | UpdateTaskInput) => {
    const createData = taskData as CreateTaskInput;
    if (!parentTaskForSubtask) return;
    
    try {
      await addSubtask(parentTaskForSubtask, createData);
      setParentTaskForSubtask(null);
      closeModal('createSubtask');
      addNotification({
        type: 'success',
        message: `Subtask "${createData.title}" has been created successfully.`
      });
    } catch (error) {
      console.error('Failed to create subtask:', error);
      addNotification({
        type: 'error',
        message: 'Failed to create subtask. Please try again.'
      });
    }
  };

  // Handle task deletion
  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    
    try {
      const task = getTaskById(taskToDelete);
      await deleteTask(taskToDelete);
      setTaskToDelete(null);
      addNotification({
        type: 'success',
        message: `Task "${task?.title || 'Unknown'}" has been deleted successfully.`
      });
    } catch (error) {
      console.error('Failed to delete task:', error);
      addNotification({
        type: 'error',
        message: 'Failed to delete task. Please try again.'
      });
    }
  };

  // Handle task selection
  const handleTaskSelect = (task: Task) => {
    selectTask(task.id);
  };

  // Handle task toggle
  const handleTaskToggle = async (taskId: string) => {
    try {
      await toggleTaskStatus(taskId);
      const task = getTaskById(taskId);
      addNotification({
        type: 'success',
        message: `Task "${task?.title || 'Unknown'}" status has been updated.`
      });
    } catch (error) {
      console.error('Failed to toggle task:', error);
      addNotification({
        type: 'error',
        message: 'Failed to update task status. Please try again.'
      });
    }
  };

  // Handle task edit
  const handleTaskEdit = (task: Task) => {
    setTaskToEdit(task);
    openModal('editTask');
  };

  // Handle add subtask
  const handleAddSubtask = (parentId: string) => {
    setParentTaskForSubtask(parentId);
    openModal('createSubtask');
  };

  // Handle delete confirmation
  const handleDeleteConfirm = (taskId: string) => {
    setTaskToDelete(taskId);
  };

  // Get filtered and sorted tasks
  const displayTasks = tasks;
  const selectedTaskId = selectedTaskIds.size > 0 ? Array.from(selectedTaskIds)[0] : undefined;
  const selectedTaskData = selectedTaskId ? getTaskById(selectedTaskId) : null;

  return (
    <div className="task-manager">
      {/* Header */}
      <header className="task-manager__header">
        <div className="task-manager__header-left">
          <h1 className="task-manager__title">uletodo</h1>
          <div className="task-manager__stats">
            <span className="task-manager__stat">
              {tasks.length} tasks
            </span>
            <span className="task-manager__stat">
              {tasks.filter(t => t.status === 'completed').length} completed
            </span>
          </div>
        </div>
        <div className="task-manager__header-right">
          <div className="task-manager__view-toggle">
            <Button
              variant={currentView === 'list' ? 'primary' : 'ghost'}
              size="small"
              onClick={() => setCurrentView('list')}
            >
              List View
            </Button>
            <Button
              variant={currentView === 'hierarchy' ? 'primary' : 'ghost'}
              size="small"
              onClick={() => setCurrentView('hierarchy')}
            >
              Hierarchy View
            </Button>
          </div>
          <Button
            variant="primary"
            onClick={() => openModal('createTask')}
          >
            + New Task
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="task-manager__content">
        {/* Sidebar */}
        <aside className={`task-manager__sidebar ${sidebarCollapsed ? 'task-manager__sidebar--collapsed' : ''}`}>
          <div className="task-manager__sidebar-header">
            <h2>Filters</h2>
            <Button
              variant="ghost"
              size="small"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? '→' : '←'}
            </Button>
          </div>
          
          {!sidebarCollapsed && (
            <div className="task-manager__sidebar-content">
              <div className="task-manager__filters">
                <h3>Quick Filters</h3>
                <p>Filter functionality will be added here.</p>
              </div>
            </div>
          )}
        </aside>

        {/* Task List Area */}
        <main className="task-manager__main">
          {error && (
            <div className="task-manager__error">
              <p>Error: {error.message}</p>
              <Button variant="secondary" onClick={loadTasks}>
                Retry
              </Button>
            </div>
          )}

          {currentView === 'list' ? (
            <TaskList
              tasks={displayTasks}
              onTaskSelect={handleTaskSelect}
              onTaskToggle={handleTaskToggle}
              onTaskEdit={handleTaskEdit}
              onTaskDelete={handleDeleteConfirm}
              onAddSubtask={handleAddSubtask}
              onCreateTask={() => openModal('createTask')}
              filter={filter}
              sortBy={sortBy}
              loading={loading}
              selectedTaskId={selectedTaskId}
              showCompleted={showCompleted}
            />
          ) : (
            <TaskHierarchy
              tasks={displayTasks}
              onTaskSelect={handleTaskSelect}
              onTaskToggle={handleTaskToggle}
              onTaskEdit={handleTaskEdit}
              onTaskDelete={handleDeleteConfirm}
              onAddSubtask={handleAddSubtask}
              filter={filter}
              sortBy={sortBy}
              selectedTaskId={selectedTaskId}
              showCompleted={showCompleted}
            />
          )}
        </main>

        {/* Task Detail Panel */}
        {selectedTaskData && (
          <aside className="task-manager__detail-panel">
            <div className="task-detail-placeholder">
              <h3>{selectedTaskData.title}</h3>
              <p>Status: {selectedTaskData.status}</p>
              <p>Priority: {selectedTaskData.priority}</p>
              <Button onClick={() => clearSelection()}>Close</Button>
            </div>
          </aside>
        )}
      </div>

      {/* Modals */}
      <Modal
        isOpen={modals.has('createTask')}
        onClose={() => closeModal('createTask')}
        title="Create New Task"
        size="large"
      >
        <TaskForm
          onSave={handleCreateTask}
          onCancel={() => closeModal('createTask')}
          loading={creating}
        />
      </Modal>

      <Modal
        isOpen={modals.has('editTask')}
        onClose={() => {
          closeModal('editTask');
          setTaskToEdit(null);
        }}
        title="Edit Task"
        size="large"
      >
        {taskToEdit && (
          <TaskForm
            task={taskToEdit}
            onSave={handleUpdateTask}
            onCancel={() => {
              closeModal('editTask');
              setTaskToEdit(null);
            }}
            loading={updating}
          />
        )}
      </Modal>

      <Modal
        isOpen={modals.has('createSubtask')}
        onClose={() => {
          closeModal('createSubtask');
          setParentTaskForSubtask(null);
        }}
        title="Create Subtask"
        size="large"
      >
        <TaskForm
          onSave={handleCreateSubtask}
          onCancel={() => {
            closeModal('createSubtask');
            setParentTaskForSubtask(null);
          }}
          parentTaskId={parentTaskForSubtask || undefined}
          loading={creating}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message={`Are you sure you want to delete "${getTaskById(taskToDelete || '')?.title || 'this task'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};