/**
 * usePosts Hook - Post state management with optimistic updates
 *
 * Provides centralized post state management with support for:
 * - Optimistic UI updates
 * - Single post refetching
 * - Immutable state updates
 * - Comment counter updates
 *
 * @module hooks/usePosts
 */

import { useState, useCallback } from 'react';
import { AgentPost } from '../types/api';
import { apiService } from '../services/api';

export interface UsePostsResult {
  /**
   * Current array of posts
   */
  posts: AgentPost[];

  /**
   * Set posts array (replaces entire array)
   */
  setPosts: React.Dispatch<React.SetStateAction<AgentPost[]>>;

  /**
   * Update a single post in the list (immutable)
   * @param postId - ID of post to update
   * @param updates - Partial post data to merge
   */
  updatePostInList: (postId: string, updates: Partial<AgentPost>) => void;

  /**
   * Refetch a single post from server and update in list
   * Used to confirm optimistic updates
   * @param postId - ID of post to refetch
   * @returns Fresh post data from server
   */
  refetchPost: (postId: string) => Promise<AgentPost | null>;
}

/**
 * Custom hook for managing post state with optimistic updates
 *
 * Example usage:
 * ```typescript
 * const { posts, setPosts, updatePostInList, refetchPost } = usePosts();
 *
 * // Optimistic update
 * updatePostInList(postId, { comments: currentComments + 1 });
 *
 * // Confirm with server
 * const updated = await refetchPost(postId);
 * ```
 */
export function usePosts(initialPosts: AgentPost[] = []): UsePostsResult {
  const [posts, setPosts] = useState<AgentPost[]>(initialPosts);

  /**
   * Update a single post in the list immutably
   * Uses Array.map() for O(n) performance - acceptable for typical feed sizes
   */
  const updatePostInList = useCallback((postId: string, updates: Partial<AgentPost>) => {
    setPosts(prev => prev.map(post =>
      post.id === postId
        ? { ...post, ...updates } // Immutable merge
        : post // Return unchanged
    ));
  }, []);

  /**
   * Refetch a single post from server and update in list
   * Bypasses cache to get fresh data (for confirming optimistic updates)
   */
  const refetchPost = useCallback(async (postId: string): Promise<AgentPost | null> => {
    try {
      const response = await apiService.refetchPost(postId);

      if (response.success && response.data) {
        // Update post in list with fresh server data
        updatePostInList(postId, response.data);
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Failed to refetch post:', error);
      return null;
    }
  }, [updatePostInList]);

  return {
    posts,
    setPosts,
    updatePostInList,
    refetchPost,
  };
}
