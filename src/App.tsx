import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

interface Task {
  id: number;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load tasks on component mount
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<Task[]>('get_tasks');
      setTasks(result);
    } catch (err) {
      setError(`Failed to load tasks: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async () => {
    if (!newTaskTitle.trim()) {
      setError('Task title cannot be empty');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await invoke('create_task', {
        request: {
          title: newTaskTitle,
          description: null,
        },
      });
      setNewTaskTitle('');
      await loadTasks();
    } catch (err) {
      setError(`Failed to create task: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      await invoke('delete_task', { id });
      await loadTasks();
    } catch (err) {
      setError(`Failed to delete task: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">uletodo</h1>
        
        {/* Task Creation */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">创建新任务</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="输入任务标题..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={createTask}
              disabled={loading || !newTaskTitle.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '创建中...' : '创建任务'}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Tasks List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">任务列表</h2>
          </div>
          
          {loading && tasks.length === 0 ? (
            <div className="p-6 text-center text-gray-500">加载中...</div>
          ) : tasks.length === 0 ? (
            <div className="p-6 text-center text-gray-500">暂无任务</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {tasks.map((task) => (
                <div key={task.id} className="p-6 flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{task.title}</h3>
                    {task.description && (
                      <p className="text-gray-600 mt-1">{task.description}</p>
                    )}
                    <p className="text-sm text-gray-400 mt-2">
                      创建时间: {new Date(task.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteTask(task.id)}
                    disabled={loading}
                    className="ml-4 px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <div className="mt-6 text-center">
          <button
            onClick={loadTasks}
            disabled={loading}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50"
          >
            {loading ? '刷新中...' : '刷新任务列表'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
