import React, { useState, useMemo } from 'react';
import { Task, TaskStatus } from '@/types/Task.types';
import { TaskItem } from './TaskItem';
import { TimeUtils } from '@/utils/timeUtils';
import { FilterService } from '@/services/FilterService';
import './TimeBasedView.css';

export interface TimeBasedViewProps {
  tasks: Task[];
  onTaskToggle: (taskId: string) => void;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskSelect?: (task: Task) => void;
  onAddSubtask: (parentId: string) => void;
  selectedTaskId?: string;
  showCompleted?: boolean;
  groupBy?: 'time-period' | 'due-date' | 'start-time';
}

interface TaskGroup {
  title: string;
  tasks: Task[];
  color?: string;
  icon?: string;
  count: number;
  isCollapsed?: boolean;
}

export const TimeBasedView: React.FC<TimeBasedViewProps> = ({
  tasks,
  onTaskToggle,
  onTaskEdit,
  onTaskDelete,
  onTaskSelect,
  onAddSubtask,
  selectedTaskId,
  showCompleted = false,
  groupBy = 'time-period'
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const taskGroups = useMemo(() => {
    const filteredTasks = showCompleted 
      ? tasks 
      : tasks.filter(task => task.status !== TaskStatus.COMPLETED);

    switch (groupBy) {
      case 'time-period':
        return createTimePeriodGroups(filteredTasks);
      case 'due-date':
        return createDueDateGroups(filteredTasks);
      case 'start-time':
        return createStartTimeGroups(filteredTasks);
      default:
        return createTimePeriodGroups(filteredTasks);
    }
  }, [tasks, showCompleted, groupBy]);

  const createTimePeriodGroups = (tasks: Task[]): TaskGroup[] => {
    const grouped = TimeUtils.groupTasksByTimePeriod(tasks);
    
    const groups: TaskGroup[] = [];

    if (grouped.overdue.length > 0) {
      groups.push({
        title: 'Overdue',
        tasks: TimeUtils.sortTasksByDueDate(grouped.overdue),
        color: '#ef4444',
        icon: '⚠️',
        count: grouped.overdue.length
      });
    }

    if (grouped.today.length > 0) {
      groups.push({
        title: 'Due Today',
        tasks: TimeUtils.sortTasksByDueDate(grouped.today),
        color: '#f59e0b',
        icon: '📅',
        count: grouped.today.length
      });
    }

    if (grouped.tomorrow.length > 0) {
      groups.push({
        title: 'Due Tomorrow',
        tasks: TimeUtils.sortTasksByDueDate(grouped.tomorrow),
        color: '#3b82f6',
        icon: '📅',
        count: grouped.tomorrow.length
      });
    }

    if (grouped.thisWeek.length > 0) {
      groups.push({
        title: 'Due This Week',
        tasks: TimeUtils.sortTasksByDueDate(grouped.thisWeek),
        color: '#10b981',
        icon: '📅',
        count: grouped.thisWeek.length
      });
    }

    if (grouped.later.length > 0) {
      groups.push({
        title: 'Due Later',
        tasks: TimeUtils.sortTasksByDueDate(grouped.later),
        color: '#6b7280',
        icon: '📅',
        count: grouped.later.length
      });
    }

    if (grouped.noDate.length > 0) {
      groups.push({
        title: 'No Due Date',
        tasks: grouped.noDate,
        color: '#9ca3af',
        icon: '📝',
        count: grouped.noDate.length
      });
    }

    return groups;
  };

  const createDueDateGroups = (tasks: Task[]): TaskGroup[] => {
    const tasksByDate = new Map<string, Task[]>();
    const noDateTasks: Task[] = [];

    tasks.forEach(task => {
      if (!task.dueDate) {
        noDateTasks.push(task);
        return;
      }

      const dateKey = task.dueDate.toDateString();
      if (!tasksByDate.has(dateKey)) {
        tasksByDate.set(dateKey, []);
      }
      tasksByDate.get(dateKey)!.push(task);
    });

    const groups: TaskGroup[] = [];
    const sortedDates = Array.from(tasksByDate.keys()).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );

    sortedDates.forEach(dateKey => {
      const dateTasks = tasksByDate.get(dateKey)!;
      const date = new Date(dateKey);
      const isOverdue = TimeUtils.getOverdueTasks(dateTasks).length > 0;
      const isDueToday = TimeUtils.getTasksDueToday(dateTasks).length > 0;

      groups.push({
        title: TimeUtils.formatDate(date),
        tasks: TimeUtils.sortTasksByPriority(dateTasks),
        color: isOverdue ? '#ef4444' : isDueToday ? '#f59e0b' : '#6b7280',
        icon: '📅',
        count: dateTasks.length
      });
    });

    if (noDateTasks.length > 0) {
      groups.push({
        title: 'No Due Date',
        tasks: noDateTasks,
        color: '#9ca3af',
        icon: '📝',
        count: noDateTasks.length
      });
    }

    return groups;
  };

  const createStartTimeGroups = (tasks: Task[]): TaskGroup[] => {
    const scheduledTasks = tasks.filter(task => task.startTime && task.estimatedDuration);
    const unscheduledTasks = tasks.filter(task => !task.startTime || !task.estimatedDuration);

    const groups: TaskGroup[] = [];

    if (scheduledTasks.length > 0) {
      const sortedScheduled = FilterService.sortTasksByTime(scheduledTasks, 'start-time-asc');
      
      groups.push({
        title: 'Scheduled Tasks',
        tasks: sortedScheduled,
        color: '#3b82f6',
        icon: '🕐',
        count: scheduledTasks.length
      });
    }

    if (unscheduledTasks.length > 0) {
      groups.push({
        title: 'Unscheduled Tasks',
        tasks: unscheduledTasks,
        color: '#9ca3af',
        icon: '📝',
        count: unscheduledTasks.length
      });
    }

    return groups;
  };

  const toggleGroupCollapse = (groupTitle: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupTitle)) {
      newCollapsed.delete(groupTitle);
    } else {
      newCollapsed.add(groupTitle);
    }
    setCollapsedGroups(newCollapsed);
  };

  const getTotalTaskCount = () => {
    return taskGroups.reduce((total, group) => total + group.count, 0);
  };

  if (taskGroups.length === 0) {
    return (
      <div className="time-based-view time-based-view--empty">
        <div className="time-based-view__empty-state">
          <div className="time-based-view__empty-icon">📅</div>
          <h3 className="time-based-view__empty-title">No tasks found</h3>
          <p className="time-based-view__empty-description">
            {showCompleted 
              ? "No tasks match the current time-based view."
              : "No pending tasks found. Create a new task to get started."
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="time-based-view">
      <div className="time-based-view__header">
        <div className="time-based-view__summary">
          <span className="time-based-view__count">
            {getTotalTaskCount()} task{getTotalTaskCount() !== 1 ? 's' : ''}
          </span>
          <span className="time-based-view__groups">
            in {taskGroups.length} group{taskGroups.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="time-based-view__groups">
        {taskGroups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.title);
          
          return (
            <div key={group.title} className="time-based-view__group">
              <button
                className="time-based-view__group-header"
                onClick={() => toggleGroupCollapse(group.title)}
                style={{ borderLeftColor: group.color }}
              >
                <div className="time-based-view__group-info">
                  <span className="time-based-view__group-icon">
                    {group.icon}
                  </span>
                  <h3 className="time-based-view__group-title">
                    {group.title}
                  </h3>
                  <span className="time-based-view__group-count">
                    ({group.count})
                  </span>
                </div>
                <div className="time-based-view__group-toggle">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className={`time-based-view__group-toggle-icon ${
                      isCollapsed ? 'time-based-view__group-toggle-icon--collapsed' : ''
                    }`}
                  >
                    <path
                      d="M4 6L8 10L12 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </button>

              {!isCollapsed && (
                <div className="time-based-view__group-content">
                  {group.tasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={onTaskToggle}
                      onEdit={onTaskEdit}
                      onDelete={onTaskDelete}
                      onSelect={onTaskSelect}
                      onAddSubtask={onAddSubtask}
                      isSelected={selectedTaskId === task.id}
                      level={0}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};