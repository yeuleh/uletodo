/**
 * Tag-related type definitions
 */

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
  usageCount: number;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface TagFilter {
  searchQuery?: string;
  minUsageCount?: number;
}