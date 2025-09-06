/**
 * FilterStatistics component for displaying filter results and statistics
 */

import React from 'react';
import type { FilterStatistics as FilterStatsType } from '@/types/Task.types';
import { TaskPriority, TaskStatus } from '@/types/Task.types';
import './FilterStatistics.css';

interface FilterStatisticsProps {
  statistics: FilterStatsType | null;
  className?: string;
  compact?: boolean;
}

export const FilterStatistics: React.FC<FilterStatisticsProps> = ({
  statistics,
  className = '',
  compact = false
}) => {
  if (!statistics) {
    return null;
  }

  const {
    totalTasks,
    filteredTasks,
    completedTasks,

    overdueTasks,
    todayTasks,
    thisWeekTasks,
    byPriority,
    byStatus,
    byTags
  } = statistics;

  const filterPercentage = totalTasks > 0 ? Math.round((filteredTasks / totalTasks) * 100) : 0;
  const completionRate = filteredTasks > 0 ? Math.round((completedTasks / filteredTasks) * 100) : 0;

  if (compact) {
    return (
      <div className={`filter-statistics filter-statistics--compact ${className}`}>
        <div className="filter-statistics__summary">
          <span className="filter-statistics__count">
            {filteredTasks} of {totalTasks} tasks
          </span>
          {filteredTasks !== totalTasks && (
            <span className="filter-statistics__percentage">
              ({filterPercentage}%)
            </span>
          )}
        </div>
        
        {overdueTasks > 0 && (
          <div className="filter-statistics__alert">
            <span className="filter-statistics__overdue">
              {overdueTasks} overdue
            </span>
          </div>
        )}
      </div>
    );
  }

  const topTags = Object.entries(byTags)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className={`filter-statistics ${className}`}>
      <div className="filter-statistics__header">
        <h3 className="filter-statistics__title">Filter Results</h3>
        <div className="filter-statistics__main-count">
          {filteredTasks} of {totalTasks} tasks
          {filteredTasks !== totalTasks && (
            <span className="filter-statistics__percentage">
              ({filterPercentage}%)
            </span>
          )}
        </div>
      </div>

      <div className="filter-statistics__grid">
        {/* Status breakdown */}
        <div className="filter-statistics__section">
          <h4 className="filter-statistics__section-title">Status</h4>
          <div className="filter-statistics__items">
            <div className="filter-statistics__item">
              <span className="filter-statistics__label">Completed</span>
              <span className="filter-statistics__value">
                {byStatus[TaskStatus.COMPLETED]} ({completionRate}%)
              </span>
            </div>
            <div className="filter-statistics__item">
              <span className="filter-statistics__label">In Progress</span>
              <span className="filter-statistics__value">
                {byStatus[TaskStatus.IN_PROGRESS]}
              </span>
            </div>
            <div className="filter-statistics__item">
              <span className="filter-statistics__label">To Do</span>
              <span className="filter-statistics__value">
                {byStatus[TaskStatus.TODO]}
              </span>
            </div>
          </div>
        </div>

        {/* Priority breakdown */}
        <div className="filter-statistics__section">
          <h4 className="filter-statistics__section-title">Priority</h4>
          <div className="filter-statistics__items">
            <div className="filter-statistics__item">
              <span className="filter-statistics__label filter-statistics__label--high">
                High
              </span>
              <span className="filter-statistics__value">
                {byPriority[TaskPriority.HIGH]}
              </span>
            </div>
            <div className="filter-statistics__item">
              <span className="filter-statistics__label filter-statistics__label--medium">
                Medium
              </span>
              <span className="filter-statistics__value">
                {byPriority[TaskPriority.MEDIUM]}
              </span>
            </div>
            <div className="filter-statistics__item">
              <span className="filter-statistics__label filter-statistics__label--low">
                Low
              </span>
              <span className="filter-statistics__value">
                {byPriority[TaskPriority.LOW]}
              </span>
            </div>
          </div>
        </div>

        {/* Time-based breakdown */}
        <div className="filter-statistics__section">
          <h4 className="filter-statistics__section-title">Timeline</h4>
          <div className="filter-statistics__items">
            {overdueTasks > 0 && (
              <div className="filter-statistics__item filter-statistics__item--alert">
                <span className="filter-statistics__label">Overdue</span>
                <span className="filter-statistics__value">
                  {overdueTasks}
                </span>
              </div>
            )}
            <div className="filter-statistics__item">
              <span className="filter-statistics__label">Today</span>
              <span className="filter-statistics__value">
                {todayTasks}
              </span>
            </div>
            <div className="filter-statistics__item">
              <span className="filter-statistics__label">This Week</span>
              <span className="filter-statistics__value">
                {thisWeekTasks}
              </span>
            </div>
          </div>
        </div>

        {/* Top tags */}
        {topTags.length > 0 && (
          <div className="filter-statistics__section">
            <h4 className="filter-statistics__section-title">Top Tags</h4>
            <div className="filter-statistics__items">
              {topTags.map(([tag, count]) => (
                <div key={tag} className="filter-statistics__item">
                  <span className="filter-statistics__label filter-statistics__tag">
                    {tag}
                  </span>
                  <span className="filter-statistics__value">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterStatistics;