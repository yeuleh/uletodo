/**
 * Task-related type definitions
 */

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

export enum TaskPriority {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  estimatedDuration?: number; // in minutes
  startTime?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  parentId?: string;
  tags: string[];
  progress?: number; // 0-100, calculated from subtasks
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: Date;
  estimatedDuration?: number;
  startTime?: Date;
  parentId?: string;
  tags?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  estimatedDuration?: number;
  startTime?: Date;
  tags?: string[];
}

export interface TaskFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  tags?: string[];
  dueDateFrom?: Date;
  dueDateTo?: Date;
  parentId?: string;
  searchQuery?: string;
  // Advanced filtering
  logicOperator?: FilterLogicOperator;
  tagLogicOperator?: FilterLogicOperator;
  customFilters?: CustomFilter[];
}

export enum FilterLogicOperator {
  AND = 'and',
  OR = 'or'
}

export interface CustomFilter {
  id: string;
  name: string;
  filter: TaskFilter;
  isBuiltIn?: boolean;
}

export interface FilterStatistics {
  totalTasks: number;
  filteredTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  todayTasks: number;
  thisWeekTasks: number;
  byPriority: Record<TaskPriority, number>;
  byStatus: Record<TaskStatus, number>;
  byTags: Record<string, number>;
}

export interface SavedFilter {
  id: string;
  name: string;
  filter: TaskFilter;
  isBuiltIn: boolean;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
}

export enum TaskSortOption {
  CREATED_AT_DESC = 'created_at_desc',
  CREATED_AT_ASC = 'created_at_asc',
  DUE_DATE_ASC = 'due_date_asc',
  DUE_DATE_DESC = 'due_date_desc',
  PRIORITY_DESC = 'priority_desc',
  TITLE_ASC = 'title_asc'
}