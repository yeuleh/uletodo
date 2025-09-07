import { useState, useEffect } from 'react';
import { Task, CreateTaskRequest, UpdateTaskRequest } from './types/task';
import { useTaskStore } from './stores/taskStore';
import TaskList from './components/task/TaskList';
import TaskForm from './components/task/TaskForm';
import Button from './components/ui/Button';
import Modal from './components/ui/Modal';

function App() {
  const { 
    tasks, 
    isLoading, 
    error, 
    loadTasks, 
    createTask, 
    updateTask, 
    deleteTask, 
    toggleTaskStatus,
    clearError 
  } = useTaskStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Load tasks on component mount
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCreateTask = async (data: CreateTaskRequest) => {
    try {
      await createTask(data);
      setShowCreateModal(false);
    } catch (error) {
      // Error is handled by the store
      console.error('Create task error:', error);
    }
  };

  const handleUpdateTask = async (data: UpdateTaskRequest) => {
    if (!editingTask) return;
    
    try {
      await updateTask(editingTask.id, data);
      setEditingTask(null);
    } catch (error) {
      // Error is handled by the store
      console.error('Update task error:', error);
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (window.confirm('确定要删除这个任务吗？')) {
      try {
        await deleteTask(id);
      } catch (error) {
        // Error is handled by the store
        console.error('Delete task error:', error);
      }
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await toggleTaskStatus(id);
    } catch (error) {
      // Error is handled by the store
      console.error('Toggle task status error:', error);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">uletodo</h1>
          <Button onClick={() => setShowCreateModal(true)}>
            添加任务
          </Button>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={clearError}
              className="text-red-700 hover:text-red-900 ml-4"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Tasks List */}
        <TaskList
          tasks={tasks}
          loading={isLoading}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          onToggleStatus={handleToggleStatus}
        />

        {/* Create Task Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="创建新任务"
        >
          <TaskForm
            onSubmit={handleCreateTask}
            onCancel={() => setShowCreateModal(false)}
            loading={isLoading}
          />
        </Modal>

        {/* Edit Task Modal */}
        <Modal
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          title="编辑任务"
        >
          {editingTask && (
            <TaskForm
              task={editingTask}
              onSubmit={handleUpdateTask}
              onCancel={() => setEditingTask(null)}
              loading={isLoading}
            />
          )}
        </Modal>
      </div>
    </div>
  );
}

export default App;
