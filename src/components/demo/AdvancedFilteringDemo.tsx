/**
 * Demo component showcasing advanced filtering functionality
 */

import React, { useEffect, useState } from 'react';
import { FilterStatistics, SavedFilters } from '@/components/common';
import { useAdvancedFiltering, useFilterStatistics, useTaskData } from '@/stores/hooks';
import { FilterLogicOperator, TaskStatus, TaskPriority } from '@/types/Task.types';
import type { TaskFilter } from '@/types/Task.types';

export const AdvancedFilteringDemo: React.FC = () => {
  const {
    filter,
    applyFilter,
    resetFilter,
    loadSavedFilters
  } = useAdvancedFiltering();

  const { statistics, updateStatistics } = useFilterStatistics();
  const { tasks, allTasks } = useTaskData();

  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    loadSavedFilters();
    updateStatistics();
  }, [loadSavedFilters, updateStatistics]);

  const handleApplyDemoFilter = (demoFilter: TaskFilter) => {
    applyFilter(demoFilter);
  };

  const demoFilters = [
    {
      name: 'High Priority Tasks',
      filter: {
        priority: [TaskPriority.HIGH],
        status: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
      }
    },
    {
      name: 'Work Tasks (OR Logic)',
      filter: {
        tags: ['work', 'office'],
        tagLogicOperator: FilterLogicOperator.OR
      }
    },
    {
      name: 'Urgent Work Tasks (AND Logic)',
      filter: {
        tags: ['work', 'urgent'],
        tagLogicOperator: FilterLogicOperator.AND
      }
    },
    {
      name: 'Complex Filter (OR Logic)',
      filter: {
        status: [TaskStatus.COMPLETED],
        priority: [TaskPriority.HIGH],
        logicOperator: FilterLogicOperator.OR
      }
    }
  ];

  if (!showDemo) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <button
          onClick={() => setShowDemo(true)}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Show Advanced Filtering Demo
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2>Advanced Filtering Demo</h2>
        <p>This demo showcases the advanced filtering functionality including complex filter combinations, saved filters, and statistics.</p>
        
        <button
          onClick={() => setShowDemo(false)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          Hide Demo
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Current Filter Info */}
        <div style={{ 
          padding: '16px', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px',
          backgroundColor: '#f9fafb'
        }}>
          <h3>Current Filter</h3>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(filter, null, 2)}
          </pre>
          <div style={{ marginTop: '12px' }}>
            <button
              onClick={resetFilter}
              style={{
                padding: '6px 12px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Reset Filter
            </button>
          </div>
        </div>

        {/* Filter Statistics */}
        <div>
          <FilterStatistics statistics={statistics} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Demo Filters */}
        <div style={{ 
          padding: '16px', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px'
        }}>
          <h3>Demo Filters</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {demoFilters.map((demoFilter, index) => (
              <button
                key={index}
                onClick={() => handleApplyDemoFilter(demoFilter.filter)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                {demoFilter.name}
              </button>
            ))}
          </div>
        </div>

        {/* Saved Filters */}
        <div>
          <SavedFilters 
            onFilterApplied={(savedFilter) => {
              console.log('Applied saved filter:', savedFilter.name);
            }}
          />
        </div>
      </div>

      {/* Task Results */}
      <div style={{ 
        padding: '16px', 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px',
        backgroundColor: '#f9fafb'
      }}>
        <h3>Filtered Tasks ({tasks.length} of {allTasks.length})</h3>
        {tasks.length === 0 ? (
          <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No tasks match the current filter.</p>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {tasks.slice(0, 10).map((task) => (
              <div
                key={task.id}
                style={{
                  padding: '12px',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: '500' }}>{task.title}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Status: {task.status} | Priority: {task.priority} | Tags: {task.tags.join(', ') || 'None'}
                  </div>
                </div>
                <div style={{
                  padding: '4px 8px',
                  backgroundColor: task.status === 'completed' ? '#10b981' : '#f59e0b',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  {task.status}
                </div>
              </div>
            ))}
            {tasks.length > 10 && (
              <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                ... and {tasks.length - 10} more tasks
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedFilteringDemo;