import React, { useMemo, useState } from 'react';
import { Task, TaskStatus } from '@/types/Task.types';
import { TimeUtils } from '@/utils/timeUtils';
import { TimeStatusIndicator } from '@/components/common';
import './TaskTimeline.css';

export interface TaskTimelineProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskToggle?: (taskId: string) => void;
  selectedDate?: Date;
  showAllDays?: boolean;
  viewMode?: 'day' | 'week';
}

interface TimelineSlot {
  time: string;
  hour: number;
  tasks: Task[];
}

interface TimelineDay {
  date: Date;
  label: string;
  slots: TimelineSlot[];
  isToday: boolean;
  isSelected: boolean;
}

export const TaskTimeline: React.FC<TaskTimelineProps> = ({
  tasks,
  onTaskClick,
  onTaskToggle,
  selectedDate = new Date(),
  showAllDays = false, // TODO: Implement showAllDays functionality
  viewMode = 'day'
}) => {
  // Suppress unused variable warning for showAllDays
  void showAllDays;
  const [currentDate, setCurrentDate] = useState(selectedDate);

  const timelineDays = useMemo(() => {
    const days: TimelineDay[] = [];
    const today = new Date();
    
    if (viewMode === 'day') {
      days.push(createTimelineDay(currentDate, tasks, today));
    } else {
      // Week view - show 7 days starting from Monday
      const startOfWeek = new Date(currentDate);
      const dayOfWeek = startOfWeek.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);

      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        days.push(createTimelineDay(day, tasks, today));
      }
    }

    return days;
  }, [tasks, currentDate, viewMode]);

  const createTimelineDay = (date: Date, allTasks: Task[], today: Date): TimelineDay => {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());


    // Filter tasks for this day
    const dayTasks = allTasks.filter(task => {
      if (!task.startTime || !task.estimatedDuration) return false;
      
      const taskDate = new Date(task.startTime.getFullYear(), task.startTime.getMonth(), task.startTime.getDate());
      return taskDate.getTime() === dayStart.getTime();
    });

    // Create time slots (6 AM to 11 PM)
    const slots: TimelineSlot[] = [];
    for (let hour = 6; hour <= 23; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      const slotTasks = dayTasks.filter(task => {
        if (!task.startTime) return false;
        return task.startTime.getHours() === hour;
      });

      slots.push({
        time: timeString,
        hour,
        tasks: slotTasks
      });
    }

    return {
      date: dayStart,
      label: TimeUtils.formatDate(dayStart),
      slots,
      isToday: dayStart.getTime() === new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime(),
      isSelected: dayStart.getTime() === new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime()
    };
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleTaskClick = (task: Task) => {
    onTaskClick?.(task);
  };

  const handleTaskToggle = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    onTaskToggle?.(taskId);
  };

  const getTaskDuration = (task: Task): number => {
    return task.estimatedDuration || 60; // Default to 1 hour
  };

  const getTaskEndTime = (task: Task): Date | null => {
    if (!task.startTime || !task.estimatedDuration) return null;
    return TimeUtils.calculateEndTime(task.startTime, task.estimatedDuration);
  };

  const formatTimeRange = (task: Task): string => {
    if (!task.startTime) return '';
    const endTime = getTaskEndTime(task);
    if (!endTime) return TimeUtils.formatTime(task.startTime);
    return `${TimeUtils.formatTime(task.startTime)} - ${TimeUtils.formatTime(endTime)}`;
  };

  const getTotalScheduledTasks = (): number => {
    return timelineDays.reduce((total, day) => 
      total + day.slots.reduce((dayTotal, slot) => dayTotal + slot.tasks.length, 0), 0
    );
  };

  return (
    <div className="task-timeline">
      <div className="task-timeline__header">
        <div className="task-timeline__navigation">
          <button
            className="task-timeline__nav-button"
            onClick={() => navigateDate('prev')}
            title={`Previous ${viewMode}`}
          >
            ←
          </button>
          
          <div className="task-timeline__date-info">
            <h2 className="task-timeline__date-title">
              {viewMode === 'day' 
                ? TimeUtils.formatDate(currentDate)
                : `Week of ${TimeUtils.formatDate(timelineDays[0]?.date || currentDate)}`
              }
            </h2>
            <span className="task-timeline__task-count">
              {getTotalScheduledTasks()} scheduled task{getTotalScheduledTasks() !== 1 ? 's' : ''}
            </span>
          </div>

          <button
            className="task-timeline__nav-button"
            onClick={() => navigateDate('next')}
            title={`Next ${viewMode}`}
          >
            →
          </button>
        </div>

        <div className="task-timeline__controls">
          <button
            className="task-timeline__today-button"
            onClick={goToToday}
          >
            Today
          </button>
        </div>
      </div>

      <div className={`task-timeline__content task-timeline__content--${viewMode}`}>
        {timelineDays.map((day, dayIndex) => (
          <div
            key={day.date.toISOString()}
            className={`task-timeline__day ${
              day.isToday ? 'task-timeline__day--today' : ''
            } ${
              day.isSelected ? 'task-timeline__day--selected' : ''
            }`}
          >
            {viewMode === 'week' && (
              <div className="task-timeline__day-header">
                <h3 className="task-timeline__day-title">
                  {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
                </h3>
                <span className="task-timeline__day-date">
                  {day.date.getDate()}
                </span>
              </div>
            )}

            <div className="task-timeline__slots">
              {day.slots.map((slot) => (
                <div
                  key={`${dayIndex}-${slot.hour}`}
                  className={`task-timeline__slot ${
                    slot.tasks.length > 0 ? 'task-timeline__slot--has-tasks' : ''
                  }`}
                >
                  <div className="task-timeline__time-label">
                    {slot.time}
                  </div>
                  
                  <div className="task-timeline__slot-content">
                    {slot.tasks.map((task) => {
                      const isCompleted = task.status === TaskStatus.COMPLETED;
                      const duration = getTaskDuration(task);
                      const height = Math.max(40, (duration / 60) * 60); // Min 40px, 60px per hour

                      return (
                        <div
                          key={task.id}
                          className={`task-timeline__task ${
                            isCompleted ? 'task-timeline__task--completed' : ''
                          }`}
                          style={{ height: `${height}px` }}
                          onClick={() => handleTaskClick(task)}
                          title={`${task.title}\n${formatTimeRange(task)}\n${TimeUtils.formatDuration(duration)}`}
                        >
                          <div className="task-timeline__task-header">
                            <button
                              className="task-timeline__task-checkbox"
                              onClick={(e) => handleTaskToggle(e, task.id)}
                            >
                              <div className={`task-timeline__task-checkbox-inner ${
                                isCompleted ? 'task-timeline__task-checkbox-inner--checked' : ''
                              }`}>
                                {isCompleted && (
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path
                                      d="M10 3L4.5 8.5L2 6"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </div>
                            </button>
                            
                            <TimeStatusIndicator 
                              task={task} 
                              size="small" 
                              showLabel={false}
                            />
                          </div>

                          <div className="task-timeline__task-content">
                            <h4 className="task-timeline__task-title">
                              {task.title}
                            </h4>
                            <div className="task-timeline__task-time">
                              {formatTimeRange(task)}
                            </div>
                            {task.tags.length > 0 && (
                              <div className="task-timeline__task-tags">
                                {task.tags.slice(0, 2).map((tag, index) => (
                                  <span key={index} className="task-timeline__task-tag">
                                    {tag}
                                  </span>
                                ))}
                                {task.tags.length > 2 && (
                                  <span className="task-timeline__task-tag-more">
                                    +{task.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {getTotalScheduledTasks() === 0 && (
        <div className="task-timeline__empty">
          <div className="task-timeline__empty-icon">🕐</div>
          <h3 className="task-timeline__empty-title">No scheduled tasks</h3>
          <p className="task-timeline__empty-description">
            Tasks with start times and durations will appear in the timeline view.
          </p>
        </div>
      )}
    </div>
  );
};