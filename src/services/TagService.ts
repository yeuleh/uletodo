/**
 * Frontend service for tag management operations
 */

import { invoke } from '@tauri-apps/api/core';
import type { Tag, CreateTagInput } from '@/types/Tag.types';
import type { Task } from '@/types/Task.types';

export class TagService {
  /**
   * Create a new tag
   */
  static async createTag(input: CreateTagInput): Promise<Tag> {
    return await invoke('create_tag', { input });
  }

  /**
   * List all available tags
   */
  static async listTags(): Promise<Tag[]> {
    return await invoke('list_tags');
  }

  /**
   * Delete unused tags
   */
  static async deleteUnusedTags(): Promise<string[]> {
    return await invoke('delete_unused_tags');
  }

  /**
   * Get tasks by tag name
   */
  static async getTasksByTag(tagName: string): Promise<Task[]> {
    return await invoke('get_tasks_by_tag', { tagName });
  }

  /**
   * Get tag suggestions for autocomplete
   */
  static async getTagSuggestions(query: string): Promise<Tag[]> {
    return await invoke('get_tag_suggestions', { query });
  }
}