import { useState, useEffect } from 'react';
import { Task, CreateTaskRequest, UpdateTaskRequest } from './types/task';
import { useTaskStore } from './stores/taskStore';
import MainLayout from './components/layout/MainLayout';
import TaskList from './components/task/TaskList';
import TaskForm from './components/task/TaskForm';
import Button from './components/ui/Button';
import Modal from './components/ui/Modal';
import Container from './components/ui/Container';

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
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

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

  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  return (
    <MainLayout 
      sidebarExpanded={sidebarExpanded} 
      onSidebarToggle={toggleSidebar}
    >
      <Container size="xl">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                收件箱
              </h1>
              <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <svg className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2" />
                  </svg>
                  {tasks.length} 个任务
                </div>
              </div>
            </div>
            <div className="mt-4 flex md:ml-4 md:mt-0">
              <Button onClick={() => setShowCreateModal(true)}>
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                添加任务
              </Button>
            </div>
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 animate-fade-in">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  type="button"
                  onClick={clearError}
                  className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
                >
                  <span className="sr-only">关闭</span>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tasks List */}
        <div className="bg-white shadow-sm rounded-lg">
          <TaskList
            tasks={tasks}
            loading={isLoading}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
            onToggleStatus={handleToggleStatus}
          />
        </div>

        {/* Create Task Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="创建新任务"
          size="lg"
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
          size="lg"
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
      </Container>
    </MainLayout>
  );
}

export default App;
