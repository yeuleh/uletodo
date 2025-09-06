/**
 * Comprehensive validation utilities for task management
 */

import { CreateTaskInput, UpdateTaskInput, TaskPriority } from '@/types/Task.types';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
}

export interface ValidationErrors {
  [field: string]: string;
}

export interface BusinessRuleValidationResult {
  isValid: boolean;
  error?: string;
  code?: string;
}

export class ValidationUtils {
  // Field validation constants
  static readonly TITLE_MAX_LENGTH = 200;
  static readonly DESCRIPTION_MAX_LENGTH = 1000;
  static readonly TAG_NAME_MAX_LENGTH = 50;
  static readonly MIN_DURATION_MINUTES = 15;
  static readonly MAX_DURATION_MINUTES = 1440; // 24 hours
  static readonly MAX_TAGS_PER_TASK = 10;
  static readonly MAX_SUBTASK_DEPTH = 3;

  /**
   * Validate task creation input
   */
  static validateCreateTaskInput(input: CreateTaskInput): ValidationResult {
    const errors: ValidationErrors = {};

    // Title validation
    const titleError = this.validateTitle(input.title);
    if (titleError) errors.title = titleError;

    // Description validation
    if (input.description) {
      const descError = this.validateDescription(input.description);
      if (descError) errors.description = descError;
    }

    // Duration validation
    if (input.estimatedDuration !== undefined && input.estimatedDuration !== null) {
      const durationError = this.validateDuration(input.estimatedDuration);
      if (durationError) errors.estimatedDuration = durationError;
    }

    // Date validation
    if (input.dueDate) {
      const dateError = this.validateDueDate(input.dueDate);
      if (dateError) errors.dueDate = dateError;
    }

    // Start time validation
    if (input.startTime && input.dueDate) {
      const startTimeError = this.validateStartTime(input.startTime, input.dueDate);
      if (startTimeError) errors.startTime = startTimeError;
    }

    // Tags validation
    if (input.tags) {
      const tagsError = this.validateTags(input.tags);
      if (tagsError) errors.tags = tagsError;
    }

    // Priority validation
    if (input.priority) {
      const priorityError = this.validatePriority(input.priority);
      if (priorityError) errors.priority = priorityError;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Validate task update input
   */
  static validateUpdateTaskInput(input: UpdateTaskInput): ValidationResult {
    const errors: ValidationErrors = {};

    // Title validation (if provided)
    if (input.title !== undefined) {
      const titleError = this.validateTitle(input.title);
      if (titleError) errors.title = titleError;
    }

    // Description validation (if provided)
    if (input.description !== undefined) {
      const descError = this.validateDescription(input.description);
      if (descError) errors.description = descError;
    }

    // Duration validation (if provided)
    if (input.estimatedDuration !== undefined && input.estimatedDuration !== null) {
      const durationError = this.validateDuration(input.estimatedDuration);
      if (durationError) errors.estimatedDuration = durationError;
    }

    // Date validation (if provided)
    if (input.dueDate !== undefined && input.dueDate !== null) {
      const dateError = this.validateDueDate(input.dueDate);
      if (dateError) errors.dueDate = dateError;
    }

    // Start time validation (if provided)
    if (input.startTime !== undefined && input.startTime !== null && input.dueDate) {
      const startTimeError = this.validateStartTime(input.startTime, input.dueDate);
      if (startTimeError) errors.startTime = startTimeError;
    }

    // Tags validation (if provided)
    if (input.tags !== undefined) {
      const tagsError = this.validateTags(input.tags);
      if (tagsError) errors.tags = tagsError;
    }

    // Priority validation (if provided)
    if (input.priority !== undefined) {
      const priorityError = this.validatePriority(input.priority);
      if (priorityError) errors.priority = priorityError;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Validate task title
   */
  static validateTitle(title: string): string | null {
    if (!title || title.trim().length === 0) {
      return 'Title is required';
    }

    if (title.length > this.TITLE_MAX_LENGTH) {
      return `Title must be less than ${this.TITLE_MAX_LENGTH} characters`;
    }

    // Check for invalid characters
    if (title.includes('\n') || title.includes('\r')) {
      return 'Title cannot contain line breaks';
    }

    return null;
  }

  /**
   * Validate task description
   */
  static validateDescription(description: string): string | null {
    if (description.length > this.DESCRIPTION_MAX_LENGTH) {
      return `Description must be less than ${this.DESCRIPTION_MAX_LENGTH} characters`;
    }

    return null;
  }

  /**
   * Validate estimated duration
   */
  static validateDuration(duration: number): string | null {
    if (!Number.isInteger(duration) || duration < 0) {
      return 'Duration must be a positive number';
    }

    if (duration < this.MIN_DURATION_MINUTES) {
      return `Duration must be at least ${this.MIN_DURATION_MINUTES} minutes`;
    }

    if (duration > this.MAX_DURATION_MINUTES) {
      return `Duration cannot exceed ${this.MAX_DURATION_MINUTES} minutes (24 hours)`;
    }

    return null;
  }

  /**
   * Validate due date
   */
  static validateDueDate(dueDate: Date, allowPastDates = false): string | null {
    if (!(dueDate instanceof Date) || isNaN(dueDate.getTime())) {
      return 'Invalid date format';
    }

    if (!allowPastDates && dueDate < new Date()) {
      return 'Due date cannot be in the past';
    }

    // Check for reasonable date range (not more than 10 years in the future)
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 10);
    if (dueDate > maxDate) {
      return 'Due date is too far in the future';
    }

    return null;
  }

  /**
   * Validate start time
   */
  static validateStartTime(startTime: Date, dueDate?: Date): string | null {
    if (!(startTime instanceof Date) || isNaN(startTime.getTime())) {
      return 'Invalid start time format';
    }

    if (dueDate && startTime > dueDate) {
      return 'Start time cannot be after due date';
    }

    return null;
  }

  /**
   * Validate tags array
   */
  static validateTags(tags: string[]): string | null {
    if (!Array.isArray(tags)) {
      return 'Tags must be an array';
    }

    if (tags.length > this.MAX_TAGS_PER_TASK) {
      return `Maximum ${this.MAX_TAGS_PER_TASK} tags allowed`;
    }

    for (const tag of tags) {
      const tagError = this.validateTagName(tag);
      if (tagError) {
        return `Invalid tag "${tag}": ${tagError}`;
      }
    }

    // Check for duplicate tags
    const uniqueTags = new Set(tags.map(tag => tag.toLowerCase()));
    if (uniqueTags.size !== tags.length) {
      return 'Duplicate tags are not allowed';
    }

    return null;
  }

  /**
   * Validate individual tag name
   */
  static validateTagName(tagName: string): string | null {
    if (!tagName || tagName.trim().length === 0) {
      return 'Tag name cannot be empty';
    }

    if (tagName.length > this.TAG_NAME_MAX_LENGTH) {
      return `Tag name must be less than ${this.TAG_NAME_MAX_LENGTH} characters`;
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(tagName)) {
      return 'Tag name can only contain letters, numbers, spaces, hyphens, and underscores';
    }

    return null;
  }

  /**
   * Validate task priority
   */
  static validatePriority(priority: TaskPriority): string | null {
    const validPriorities = Object.values(TaskPriority);
    if (!validPriorities.includes(priority)) {
      return 'Invalid priority value';
    }

    return null;
  }

  /**
   * Validate business rules for subtask relationships
   */
  static validateSubtaskRelationship(
    taskId: string,
    parentId: string,
    existingTasks: Array<{ id: string; parentId?: string }>
  ): BusinessRuleValidationResult {
    // Check for circular dependency
    const visited = new Set<string>();
    let currentId: string | undefined = parentId;
    let depth = 0;

    while (currentId && !visited.has(currentId)) {
      if (currentId === taskId) {
        return {
          isValid: false,
          error: 'Cannot create circular dependency: task cannot be its own ancestor',
          code: 'CIRCULAR_DEPENDENCY'
        };
      }

      visited.add(currentId);
      depth++;

      if (depth > this.MAX_SUBTASK_DEPTH) {
        return {
          isValid: false,
          error: `Maximum subtask depth of ${this.MAX_SUBTASK_DEPTH} levels exceeded`,
          code: 'MAX_DEPTH_EXCEEDED'
        };
      }

      // Find the parent of the current task
      const parentTask = existingTasks.find(task => task.id === currentId);
      currentId = parentTask?.parentId;
    }

    return { isValid: true };
  }

  /**
   * Validate task consistency (cross-field validation)
   */
  static validateTaskConsistency(input: CreateTaskInput | UpdateTaskInput): ValidationResult {
    const errors: ValidationErrors = {};

    // If both start time and due date are provided, validate their relationship
    if ('startTime' in input && 'dueDate' in input && input.startTime && input.dueDate) {
      if (input.startTime > input.dueDate) {
        errors.startTime = 'Start time must be before due date';
      }

      // If estimated duration is also provided, check if it fits
      if ('estimatedDuration' in input && input.estimatedDuration) {
        const expectedEndTime = new Date(input.startTime.getTime() + input.estimatedDuration * 60 * 1000);
        if (expectedEndTime > input.dueDate) {
          errors.estimatedDuration = 'Task duration extends beyond due date';
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Sanitize input data
   */
  static sanitizeTaskInput(input: CreateTaskInput | UpdateTaskInput): CreateTaskInput | UpdateTaskInput {
    const sanitized = { ...input };

    // Trim string fields
    if ('title' in sanitized && sanitized.title) {
      sanitized.title = sanitized.title.trim();
    }

    if ('description' in sanitized && sanitized.description) {
      sanitized.description = sanitized.description.trim();
    }

    // Sanitize tags
    if ('tags' in sanitized && sanitized.tags) {
      sanitized.tags = sanitized.tags
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .map(tag => tag.toLowerCase()); // Normalize case
    }

    return sanitized;
  }

  /**
   * Get user-friendly error message for validation errors
   */
  static getErrorMessage(field: string, error: string): string {
    const fieldNames: Record<string, string> = {
      title: 'Title',
      description: 'Description',
      estimatedDuration: 'Estimated Duration',
      dueDate: 'Due Date',
      startTime: 'Start Time',
      tags: 'Tags',
      priority: 'Priority'
    };

    const fieldName = fieldNames[field] || field;
    return `${fieldName}: ${error}`;
  }

  /**
   * Validate form data in real-time
   */
  static validateField(field: string, value: any, context?: any): string | null {
    switch (field) {
      case 'title':
        return this.validateTitle(value);
      case 'description':
        return this.validateDescription(value);
      case 'estimatedDuration':
        return this.validateDuration(value);
      case 'dueDate':
        return this.validateDueDate(value, context?.allowPastDates);
      case 'startTime':
        return this.validateStartTime(value, context?.dueDate);
      case 'tags':
        return this.validateTags(value);
      case 'priority':
        return this.validatePriority(value);
      default:
        return null;
    }
  }
}