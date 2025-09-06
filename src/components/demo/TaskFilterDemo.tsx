/**
 * TaskFilter demo component for testing and showcasing filtering functionality
 */

import React, { useState } from 'react';
import { TaskFilter } from '@/components/task/TaskFilter';
import { TaskList } from '@/components/task/TaskList';
import { Button } from '@/components/common/Button';
import { useTaskManagement } from '@/stores/hooks';
import type { TaskFilter as TaskFilterType } from '@/types/Task.types';

export const TaskFilterDemo: React.FC = () => {
  const {
    tasks,
    loading,
    error,
    loadTasks,
    toggleTaskStatus,
    deleteTask
  } = useTaskManagement();

  const [showCompactFilter, setShowCompactFilter] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<TaskFilterType>({});

  // Load tasks on component mount
  React.useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleFilterChange = (filter: TaskFilterType) => {
    setCurrentFilter(filter);
    console.log('Filter changed:', filter);
  };

  const handleTaskToggle = async (taskId: string) => {
    await toggleTaskStatus(taskId);
  };

  const handleTaskDelete = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteTask(taskId);
    }
  };

  const handleTaskEdit = (task: any) => {
    console.log('Edit task:', task);
    // In a real app, this would open the edit modal
  };

  const handleAddSubtask = (parentId: string) => {
    console.log('Add subtask to:', parentId);
    // In a real app, this would open the create subtask modal
  };

  if (error) {
    return (
      <div className="task-filter-demo">
        <div className="error-message">
          Error loading tasks: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="task-filter-demo" style={{ 
      display: 'flex', 
      gap: '1rem', 
      padding: '1rem',
      minHeight: '100vh',
      background: 'var(--color-background, #f5f5f5)'
    }}>
      {/* Filter Panel */}
      <div style={{ 
        width: showCompactFilter ? '100%' : '400px',
        flexShrink: 0
      }}>
        <div style={{ 
          marginBottom: '1rem',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Task Filter Demo</h2>
          <Button
            variant="secondary"
            size="small"
            onClick={() => setShowCompactFilter(!showCompactFilter)}
          >
            {showCompactFilter ? 'Full View' : 'Compact View'}
          </Button>
        </div>

        <TaskFilter
          compact={showCompactFilter}
          showStatistics={true}
          showSavedFilters={true}
          onFilterChange={handleFilterChange}
          className="demo-filter"
        />

        {/* Current Filter Display */}
        {Object.keys(currentFilter).length > 0 && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: 'var(--color-surface, white)',
            border: '1px solid var(--color-border, #ddd)',
            borderRadius: '6px'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>
              Current Filter:
            </h4>
            <pre style={{
              fontSize: '0.75rem',
              margin: 0,
              padding: '0.5rem',
              background: 'var(--color-surface-secondary, #f8f9fa)',
              borderRadius: '4px',
              overflow: 'auto'
            }}>
              {JSON.stringify(currentFilter, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Task List */}
      <div style={{ 
        flex: 1,
        minWidth: 0
      }}>
        <div style={{
          background: 'var(--color-surface, white)',
          border: '1px solid var(--color-border, #ddd)',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <h3 style={{ 
            margin: '0 0 1rem 0',
            fontSize: '1.125rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            Tasks ({tasks.length})
            {loading && (
              <span style={{ 
                fontSize: '0.875rem', 
                color: 'var(--color-text-secondary, #666)' 
              }}>
                Loading...
              </span>
            )}
          </h3>

          <TaskList
            tasks={tasks}
            onTaskToggle={handleTaskToggle}
            onTaskEdit={handleTaskEdit}
            onTaskDelete={handleTaskDelete}
            onAddSubtask={handleAddSubtask}
            loading={loading}
          />

          {tasks.length === 0 && !loading && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: 'var(--color-text-secondary, #666)'
            }}>
              <p>No tasks found. Try adjusting your filters or create some tasks first.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskFilterDemo;