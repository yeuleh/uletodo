/**
 * Frontend service for tag management operations
 * Provides tag autocomplete, color management, and caching
 */

import { invoke } from '@tauri-apps/api/core';
import type { Tag, CreateTagInput } from '@/types/Tag.types';
import type { Task } from '@/types/Task.types';

export interface TagError {
  code: string;
  message: string;
  details?: any;
}

export type TagServiceListener = (tags: Tag[]) => void;

export class TagService {
  private static listeners: Set<TagServiceListener> = new Set();
  private static tagCache: Map<string, Tag> = new Map();
  private static tagsCache: Tag[] = [];
  private static lastCacheUpdate: number = 0;
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Predefined color palette for tags
  private static readonly TAG_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
  ];

  /**
   * Subscribe to tag updates
   */
  static subscribe(listener: TagServiceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of tag changes
   */
  private static notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.tagsCache]));
  }

  /**
   * Handle Tauri command errors with proper error mapping
   */
  private static handleError(error: any): TagError {
    if (typeof error === 'string') {
      try {
        const parsed = JSON.parse(error);
        return {
          code: parsed.code || 'UNKNOWN_ERROR',
          message: parsed.message || error,
          details: parsed.details
        };
      } catch {
        return {
          code: 'UNKNOWN_ERROR',
          message: error
        };
      }
    }
    
    return {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      details: error.details
    };
  }

  /**
   * Execute a Tauri command with error handling
   */
  private static async executeCommand<T>(
    command: string, 
    args?: Record<string, any>
  ): Promise<T> {
    try {
      return await invoke(command, args);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check if cache is valid
   */
  private static isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.CACHE_TTL;
  }

  /**
   * Generate a color for a tag based on its name
   */
  static generateTagColor(tagName: string): string {
    // Use a simple hash function to consistently assign colors
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      const char = tagName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    const index = Math.abs(hash) % this.TAG_COLORS.length;
    return this.TAG_COLORS[index];
  }

  /**
   * Get color for display (with opacity variants)
   */
  static getTagDisplayColor(color: string, opacity: number = 1): string {
    // Convert hex to rgba for opacity support
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  /**
   * Create a new tag with automatic color assignment
   */
  static async createTag(input: CreateTagInput): Promise<Tag> {
    // Assign color if not provided
    const tagInput: CreateTagInput = {
      ...input,
      color: input.color || this.generateTagColor(input.name)
    };

    const tag = await this.executeCommand<Tag>('create_tag', { input: tagInput });
    
    // Update cache
    this.tagCache.set(tag.name.toLowerCase(), tag);
    this.tagsCache.push(tag);
    this.notifyListeners();
    
    return tag;
  }

  /**
   * List all available tags with caching
   */
  static async listTags(forceRefresh: boolean = false): Promise<Tag[]> {
    if (!forceRefresh && this.isCacheValid() && this.tagsCache.length > 0) {
      return [...this.tagsCache];
    }

    const tags = await this.executeCommand<Tag[]>('list_tags');
    
    // Update cache
    this.tagsCache = tags;
    this.tagCache.clear();
    tags.forEach(tag => this.tagCache.set(tag.name.toLowerCase(), tag));
    this.lastCacheUpdate = Date.now();
    
    return tags;
  }

  /**
   * Delete unused tags
   */
  static async deleteUnusedTags(): Promise<string[]> {
    const deletedTagNames = await this.executeCommand<string[]>('delete_unused_tags');
    
    // Update cache by removing deleted tags
    deletedTagNames.forEach(tagName => {
      this.tagCache.delete(tagName.toLowerCase());
      const index = this.tagsCache.findIndex(tag => tag.name === tagName);
      if (index !== -1) {
        this.tagsCache.splice(index, 1);
      }
    });
    
    this.notifyListeners();
    return deletedTagNames;
  }

  /**
   * Get tasks by tag name
   */
  static async getTasksByTag(tagName: string): Promise<Task[]> {
    return await this.executeCommand<Task[]>('get_tasks_by_tag', { tagName });
  }

  /**
   * Get tag suggestions for autocomplete with intelligent filtering
   */
  static async getTagSuggestions(
    query: string, 
    limit: number = 10,
    excludeTags: string[] = []
  ): Promise<Tag[]> {
    // Ensure we have fresh tag data
    await this.listTags();
    
    if (!query.trim()) {
      // Return most used tags when no query
      return this.tagsCache
        .filter(tag => !excludeTags.includes(tag.name))
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, limit);
    }

    const queryLower = query.toLowerCase().trim();
    const suggestions: Array<{ tag: Tag; score: number }> = [];

    this.tagsCache.forEach(tag => {
      if (excludeTags.includes(tag.name)) return;

      const tagNameLower = tag.name.toLowerCase();
      let score = 0;

      // Exact match gets highest score
      if (tagNameLower === queryLower) {
        score = 1000 + tag.usageCount;
      }
      // Starts with query gets high score
      else if (tagNameLower.startsWith(queryLower)) {
        score = 500 + tag.usageCount;
      }
      // Contains query gets medium score
      else if (tagNameLower.includes(queryLower)) {
        score = 100 + tag.usageCount;
      }

      if (score > 0) {
        suggestions.push({ tag, score });
      }
    });

    // Sort by score (descending) and return tags
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.tag);
  }

  /**
   * Check if a tag exists (case-insensitive)
   */
  static async tagExists(tagName: string): Promise<boolean> {
    await this.listTags();
    return this.tagCache.has(tagName.toLowerCase());
  }

  /**
   * Get tag by name (case-insensitive)
   */
  static async getTagByName(tagName: string): Promise<Tag | null> {
    await this.listTags();
    return this.tagCache.get(tagName.toLowerCase()) || null;
  }

  /**
   * Create tag if it doesn't exist, return existing tag otherwise
   */
  static async getOrCreateTag(tagName: string, color?: string): Promise<Tag> {
    const existingTag = await this.getTagByName(tagName);
    if (existingTag) {
      return existingTag;
    }

    return this.createTag({
      name: tagName,
      color: color || this.generateTagColor(tagName)
    });
  }

  /**
   * Parse tag string input (comma-separated) into tag names
   */
  static parseTagInput(input: string): string[] {
    return input
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .filter((tag, index, array) => array.indexOf(tag) === index); // Remove duplicates
  }

  /**
   * Validate tag name
   */
  static validateTagName(name: string): { valid: boolean; error?: string } {
    if (!name || !name.trim()) {
      return { valid: false, error: 'Tag name cannot be empty' };
    }

    const trimmed = name.trim();
    
    if (trimmed.length > 50) {
      return { valid: false, error: 'Tag name cannot exceed 50 characters' };
    }

    if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
      return { valid: false, error: 'Tag name can only contain letters, numbers, spaces, hyphens, and underscores' };
    }

    return { valid: true };
  }

  /**
   * Get popular tags (most used)
   */
  static async getPopularTags(limit: number = 10): Promise<Tag[]> {
    await this.listTags();
    
    return [...this.tagsCache]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * Clear all caches
   */
  static clearCache(): void {
    this.tagCache.clear();
    this.tagsCache = [];
    this.lastCacheUpdate = 0;
  }

  /**
   * Get cached tags (useful for immediate UI updates)
   */
  static getCachedTags(): Tag[] {
    return [...this.tagsCache];
  }
}