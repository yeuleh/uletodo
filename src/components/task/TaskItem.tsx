import { Task } from '../../types/task';

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onToggleStatus: (id: number) => void;
}

export default function TaskItem({ task, onEdit, onDelete, onToggleStatus }: TaskItemProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatDueDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const isOverdue = date < now && !task.completed;
    
    return (
      <span className={`text-sm ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
        截止: {date.toLocaleDateString('zh-CN')}
        {isOverdue && ' (已逾期)'}
      </span>
    );
  };

  return (
    <div className="p-4 border-b border-gray-200 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {/* Checkbox for task completion */}
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggleStatus(task.id)}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          
          <div className="flex-1">
            <h3 
              className={`font-medium ${
                task.completed 
                  ? 'text-gray-500 line-through' 
                  : 'text-gray-900'
              }`}
            >
              {task.title}
            </h3>
            
            {task.description && (
              <p className={`mt-1 text-sm ${
                task.completed ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {task.description}
              </p>
            )}
            
            <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
              <span>创建: {formatDate(task.created_at)}</span>
              {task.due_date && formatDueDate(task.due_date)}
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => onEdit(task)}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
          >
            编辑
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}