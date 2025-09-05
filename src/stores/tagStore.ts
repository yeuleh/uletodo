/**
 * Tag store using Zustand for state management
 * Manages tag data, autocomplete suggestions, and tag operations
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Tag, CreateTagInput } from '@/types/Tag.types';
import { TagService, type TagError } from '@/services/TagService';

export interface TagState {
  // Tag data
  tags: Tag[];
  suggestions: Tag[];
  
  // Loading states
  loading: boolean;
  creating: boolean;
  deleting: boolean;
  
  // Error states
  error: TagError | null;
  
  // Autocomplete state
  autocompleteQuery: string;
  showingSuggestions: boolean;
  
  // Actions
  setTags: (tags: Tag[]) => void;
  setSuggestions: (suggestions: Tag[]) => void;
  setAutocompleteQuery: (query: string) => void;
  setShowingSuggestions: (showing: boolean) => void;
  setError: (error: TagError | null) => void;
  
  // Async actions
  loadTags: (forceRefresh?: boolean) => Promise<void>;
  createTag: (input: CreateTagInput) => Promise<Tag | null>;
  deleteUnusedTags: () => Promise<string[]>;
  loadSuggestions: (query: string, excludeTags?: string[]) => Promise<void>;
  getOrCreateTag: (tagName: string, color?: string) => Promise<Tag | null>;
  
  // Computed getters
  getTagByName: (name: string) => Tag | undefined;
  getPopularTags: (limit?: number) => Tag[];
  getTagsForAutocomplete: (query: string, excludeTags?: string[]) => Tag[];
  validateTagName: (name: string) => { valid: boolean; error?: string };
}

export const useTagStore = create<TagState>()(
  devtools(
    (set, get) => ({
      // Initial state
      tags: [],
      suggestions: [],
      loading: false,
      creating: false,
      deleting: false,
      error: null,
      autocompleteQuery: '',
      showingSuggestions: false,

      // Basic setters
      setTags: (tags) => set({ tags }),
      setSuggestions: (suggestions) => set({ suggestions }),
      setAutocompleteQuery: (autocompleteQuery) => set({ autocompleteQuery }),
      setShowingSuggestions: (showingSuggestions) => set({ showingSuggestions }),
      setError: (error) => set({ error }),

      // Async actions
      loadTags: async (forceRefresh = false) => {
        set({ loading: true, error: null });
        try {
          const tags = await TagService.listTags(forceRefresh);
          set({ tags, loading: false });
        } catch (error) {
          set({ 
            error: error as TagError, 
            loading: false 
          });
        }
      },

      createTag: async (input) => {
        set({ creating: true, error: null });
        try {
          const tag = await TagService.createTag(input);
          set((state) => ({
            tags: [...state.tags, tag],
            creating: false
          }));
          return tag;
        } catch (error) {
          set({ 
            error: error as TagError, 
            creating: false 
          });
          return null;
        }
      },

      deleteUnusedTags: async () => {
        set({ deleting: true, error: null });
        try {
          const deletedTagNames = await TagService.deleteUnusedTags();
          set((state) => ({
            tags: state.tags.filter(tag => !deletedTagNames.includes(tag.name)),
            deleting: false
          }));
          return deletedTagNames;
        } catch (error) {
          set({ 
            error: error as TagError, 
            deleting: false 
          });
          return [];
        }
      },

      loadSuggestions: async (query, excludeTags = []) => {
        try {
          const suggestions = await TagService.getTagSuggestions(query, 10, excludeTags);
          set({ 
            suggestions, 
            autocompleteQuery: query,
            showingSuggestions: true 
          });
        } catch (error) {
          set({ 
            error: error as TagError,
            suggestions: [],
            showingSuggestions: false
          });
        }
      },

      getOrCreateTag: async (tagName, color) => {
        set({ creating: true, error: null });
        try {
          const tag = await TagService.getOrCreateTag(tagName, color);
          
          // Update tags if it's a new tag
          const existingTag = get().tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
          if (!existingTag) {
            set((state) => ({
              tags: [...state.tags, tag],
              creating: false
            }));
          } else {
            set({ creating: false });
          }
          
          return tag;
        } catch (error) {
          set({ 
            error: error as TagError, 
            creating: false 
          });
          return null;
        }
      },

      // Computed getters
      getTagByName: (name) => {
        return get().tags.find(tag => 
          tag.name.toLowerCase() === name.toLowerCase()
        );
      },

      getPopularTags: (limit = 10) => {
        return [...get().tags]
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, limit);
      },

      getTagsForAutocomplete: (query, excludeTags = []) => {
        const { tags } = get();
        
        if (!query.trim()) {
          // Return most used tags when no query
          return tags
            .filter(tag => !excludeTags.includes(tag.name))
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, 10);
        }

        const queryLower = query.toLowerCase().trim();
        const suggestions: Array<{ tag: Tag; score: number }> = [];

        tags.forEach(tag => {
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
          .slice(0, 10)
          .map(item => item.tag);
      },

      validateTagName: (name) => {
        return TagService.validateTagName(name);
      }
    }),
    {
      name: 'tag-store'
    }
  )
);

// Subscribe to TagService updates for real-time sync
TagService.subscribe((tags) => {
  useTagStore.getState().setTags(tags);
});