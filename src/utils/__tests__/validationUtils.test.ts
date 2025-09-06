/**
 * Tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import { ValidationUtils } from '../validationUtils';
import { TaskPriority } from '@/types/Task.types';

describe('ValidationUtils', () => {
  describe('validateTitle', () => {
    it('should return null for valid titles', () => {
      expect(ValidationUtils.validateTitle('Valid Task Title')).toBeNull();
      expect(ValidationUtils.validateTitle('A')).toBeNull();
      expect(ValidationUtils.validateTitle('A'.repeat(200))).toBeNull();
    });

    it('should return error for empty titles', () => {
      expect(ValidationUtils.validateTitle('')).toBe('Title is required');
      expect(ValidationUtils.validateTitle('   ')).toBe('Title is required');
    });

    it('should return error for titles that are too long', () => {
      const longTitle = 'A'.repeat(201);
      expect(ValidationUtils.validateTitle(longTitle)).toBe('Title must be less than 200 characters');
    });

    it('should return error for titles with line breaks', () => {
      expect(ValidationUtils.validateTitle('Title\nwith\nbreaks')).toBe('Title cannot contain line breaks');
      expect(ValidationUtils.validateTitle('Title\rwith\rbreaks')).toBe('Title cannot contain line breaks');
    });
  });

  describe('validateDescription', () => {
    it('should return null for valid descriptions', () => {
      expect(ValidationUtils.validateDescription('')).toBeNull();
      expect(ValidationUtils.validateDescription('Valid description')).toBeNull();
      expect(ValidationUtils.validateDescription('A'.repeat(1000))).toBeNull();
    });

    it('should return error for descriptions that are too long', () => {
      const longDescription = 'A'.repeat(1001);
      expect(ValidationUtils.validateDescription(longDescription)).toBe('Description must be less than 1000 characters');
    });
  });

  describe('validateDuration', () => {
    it('should return null for valid durations', () => {
      expect(ValidationUtils.validateDuration(15)).toBeNull();
      expect(ValidationUtils.validateDuration(60)).toBeNull();
      expect(ValidationUtils.validateDuration(1440)).toBeNull();
    });

    it('should return error for invalid durations', () => {
      expect(ValidationUtils.validateDuration(-1)).toBe('Duration must be a positive number');
      expect(ValidationUtils.validateDuration(0)).toBe('Duration must be a positive number');
      expect(ValidationUtils.validateDuration(14)).toBe('Duration must be at least 15 minutes');
      expect(ValidationUtils.validateDuration(1441)).toBe('Duration cannot exceed 1440 minutes (24 hours)');
      expect(ValidationUtils.validateDuration(15.5)).toBe('Duration must be a positive number');
    });
  });

  describe('validateDueDate', () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const farFutureDate = new Date(now.getTime() + 11 * 365 * 24 * 60 * 60 * 1000);

    it('should return null for valid future dates', () => {
      expect(ValidationUtils.validateDueDate(futureDate)).toBeNull();
    });

    it('should return error for past dates when not allowed', () => {
      expect(ValidationUtils.validateDueDate(pastDate)).toBe('Due date cannot be in the past');
    });

    it('should return null for past dates when allowed', () => {
      expect(ValidationUtils.validateDueDate(pastDate, true)).toBeNull();
    });

    it('should return error for invalid date objects', () => {
      expect(ValidationUtils.validateDueDate(new Date('invalid'))).toBe('Invalid date format');
    });

    it('should return error for dates too far in the future', () => {
      expect(ValidationUtils.validateDueDate(farFutureDate)).toBe('Due date is too far in the future');
    });
  });

  describe('validateTags', () => {
    it('should return null for valid tag arrays', () => {
      expect(ValidationUtils.validateTags([])).toBeNull();
      expect(ValidationUtils.validateTags(['work', 'important'])).toBeNull();
      expect(ValidationUtils.validateTags(['a'.repeat(50)])).toBeNull();
    });

    it('should return error for too many tags', () => {
      const manyTags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
      expect(ValidationUtils.validateTags(manyTags)).toBe('Maximum 10 tags allowed');
    });

    it('should return error for invalid tag names', () => {
      expect(ValidationUtils.validateTags([''])).toBe('Invalid tag "": Tag name cannot be empty');
      expect(ValidationUtils.validateTags(['a'.repeat(51)])).toContain('Tag name must be less than 50 characters');
      expect(ValidationUtils.validateTags(['tag@invalid'])).toContain('Tag name can only contain letters, numbers, spaces, hyphens, and underscores');
    });

    it('should return error for duplicate tags', () => {
      expect(ValidationUtils.validateTags(['work', 'Work'])).toBe('Duplicate tags are not allowed');
      expect(ValidationUtils.validateTags(['tag', 'tag'])).toBe('Duplicate tags are not allowed');
    });

    it('should return error for non-array input', () => {
      expect(ValidationUtils.validateTags('not-array' as any)).toBe('Tags must be an array');
    });
  });

  describe('validateCreateTaskInput', () => {
    const validInput = {
      title: 'Valid Task',
      description: 'Valid description',
      priority: TaskPriority.MEDIUM,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      estimatedDuration: 60,
      tags: ['work']
    };

    it('should return valid result for valid input', () => {
      const result = ValidationUtils.validateCreateTaskInput(validInput);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should return invalid result for invalid input', () => {
      const invalidInput = {
        ...validInput,
        title: '',
        estimatedDuration: 5,
        tags: Array.from({ length: 11 }, (_, i) => `tag${i}`)
      };

      const result = ValidationUtils.validateCreateTaskInput(invalidInput);
      expect(result.isValid).toBe(false);
      expect(result.errors.title).toBe('Title is required');
      expect(result.errors.estimatedDuration).toBe('Duration must be at least 15 minutes');
      expect(result.errors.tags).toBe('Maximum 10 tags allowed');
    });
  });

  describe('validateSubtaskRelationship', () => {
    const existingTasks = [
      { id: 'task1', parentId: undefined },
      { id: 'task2', parentId: 'task1' },
      { id: 'task3', parentId: 'task2' },
      { id: 'task4', parentId: 'task3' }
    ];

    it('should return valid for non-circular relationships', () => {
      const result = ValidationUtils.validateSubtaskRelationship('task5', 'task1', existingTasks);
      expect(result.isValid).toBe(true);
    });

    it('should return invalid for circular relationships', () => {
      const result = ValidationUtils.validateSubtaskRelationship('task1', 'task3', existingTasks);
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('CIRCULAR_DEPENDENCY');
    });

    it('should return invalid for self-reference', () => {
      const result = ValidationUtils.validateSubtaskRelationship('task1', 'task1', existingTasks);
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('CIRCULAR_DEPENDENCY');
    });

    it('should return invalid for max depth exceeded', () => {
      const deepTasks = [
        { id: 'task1', parentId: undefined },
        { id: 'task2', parentId: 'task1' },
        { id: 'task3', parentId: 'task2' },
        { id: 'task4', parentId: 'task3' }
      ];

      const result = ValidationUtils.validateSubtaskRelationship('task5', 'task4', deepTasks);
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('MAX_DEPTH_EXCEEDED');
    });
  });

  describe('validateTaskConsistency', () => {
    it('should return valid for consistent task data', () => {
      const startTime = new Date();
      const dueDate = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
      
      const input = {
        title: 'Task',
        startTime,
        dueDate,
        estimatedDuration: 60 // 1 hour
      };

      const result = ValidationUtils.validateTaskConsistency(input);
      expect(result.isValid).toBe(true);
    });

    it('should return invalid when start time is after due date', () => {
      const dueDate = new Date();
      const startTime = new Date(dueDate.getTime() + 60 * 60 * 1000); // 1 hour later
      
      const input = {
        title: 'Task',
        startTime,
        dueDate
      };

      const result = ValidationUtils.validateTaskConsistency(input);
      expect(result.isValid).toBe(false);
      expect(result.errors.startTime).toBe('Start time must be before due date');
    });

    it('should return invalid when duration extends beyond due date', () => {
      const startTime = new Date();
      const dueDate = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later
      
      const input = {
        title: 'Task',
        startTime,
        dueDate,
        estimatedDuration: 120 // 2 hours
      };

      const result = ValidationUtils.validateTaskConsistency(input);
      expect(result.isValid).toBe(false);
      expect(result.errors.estimatedDuration).toBe('Task duration extends beyond due date');
    });
  });

  describe('sanitizeTaskInput', () => {
    it('should trim string fields', () => {
      const input = {
        title: '  Task Title  ',
        description: '  Task Description  ',
        tags: ['  tag1  ', '  tag2  ']
      };

      const sanitized = ValidationUtils.sanitizeTaskInput(input);
      expect(sanitized.title).toBe('Task Title');
      expect(sanitized.description).toBe('Task Description');
      expect(sanitized.tags).toEqual(['tag1', 'tag2']);
    });

    it('should filter empty tags', () => {
      const input = {
        title: 'Task',
        tags: ['tag1', '', '  ', 'tag2']
      };

      const sanitized = ValidationUtils.sanitizeTaskInput(input);
      expect(sanitized.tags).toEqual(['tag1', 'tag2']);
    });

    it('should normalize tag case', () => {
      const input = {
        title: 'Task',
        tags: ['Work', 'IMPORTANT', 'personal']
      };

      const sanitized = ValidationUtils.sanitizeTaskInput(input);
      expect(sanitized.tags).toEqual(['work', 'important', 'personal']);
    });
  });
});