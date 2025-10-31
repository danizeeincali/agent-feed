import { useState, useEffect, useCallback, useRef } from 'react';
import axios, { AxiosError } from 'axios';
import { CommentTreeNode, AgentConversation } from '../components/comments/CommentSystem';

interface CommentStats {
  totalComments: number;
  rootThreads: number;
  maxDepth: number;
  agentComments: number;
  userComments: number;
  averageDepth: number;
  mostActiveThread: string | null;
  recentActivity: number;
}

interface UseCommentThreadingOptions {
  initialComments?: CommentTreeNode[];
  maxDepth?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseCommentThreadingReturn {
  comments: CommentTreeNode[];
  setComments: React.Dispatch<React.SetStateAction<CommentTreeNode[]>>; // CRITICAL: Expose for WebSocket updates
  agentConversations: AgentConversation[];
  loading: boolean;
  error: string | null;
  stats: CommentStats | null;
  addComment: (content: string, parentId?: string) => Promise<CommentTreeNode>;
  updateComment: (commentId: string, content: string) => Promise<CommentTreeNode>;
  deleteComment: (commentId: string) => Promise<void>;
  reactToComment: (commentId: string, reactionType: string) => Promise<void>;
  loadMoreComments: () => Promise<void>;
  refreshComments: () => Promise<void>;
  triggerAgentResponse: (commentId: string, agentType: string) => Promise<CommentTreeNode>;
  getThreadStructure: () => CommentTreeNode[];
}

/**
 * Custom hook for managing threaded comments with real API integration
 *
 * Features:
 * - Fetches comments from backend API
 * - Builds tree structure from flat array using parent_id
 * - Handles comment CRUD operations with optimistic updates
 * - Supports pagination and lazy loading
 * - Implements retry logic for failed requests
 * - Manages agent interactions and conversations
 */
export const useCommentThreading = (
  postId: string,
  options: UseCommentThreadingOptions = {}
): UseCommentThreadingReturn => {
  const {
    initialComments = [],
    maxDepth = 10,
    autoRefresh = false,
    refreshInterval = 30000
  } = options;

  // State management
  const [comments, setComments] = useState<CommentTreeNode[]>(initialComments);
  const [agentConversations, setAgentConversations] = useState<AgentConversation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CommentStats | null>(null);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Refs for cleanup and caching
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // API base URL - use environment variable or default
  const API_BASE_URL = 'http://localhost:3001/api';

  /**
   * Build comment tree from flat array using parent_id relationships
   * This is critical for threading - converts flat comment list to nested structure
   */
  const buildCommentTree = useCallback((flatComments: any[]): CommentTreeNode[] => {
    const commentMap = new Map<string, CommentTreeNode>();
    const rootComments: CommentTreeNode[] = [];

    // First pass: Transform API comments to CommentTreeNode format and create map
    flatComments.forEach((comment) => {
      const node: CommentTreeNode = {
        id: comment.id,
        content: comment.content,
        contentType: comment.content_type || 'text',
        author: {
          type: comment.author_type || (comment.author.startsWith('agent-') ? 'agent' : 'user'),
          id: comment.author,
          name: comment.author,
          avatar: comment.author.charAt(0).toUpperCase()
        },
        metadata: {
          threadDepth: comment.thread_depth || 0,
          threadPath: comment.thread_path || comment.id,
          replyCount: comment.reply_count || 0,
          likeCount: comment.like_count || 0,
          reactionCount: comment.reaction_count || 0,
          isAgentResponse: comment.is_agent_response || false,
          responseToAgent: comment.response_to_agent,
          conversationThreadId: comment.conversation_thread_id,
          qualityScore: comment.quality_score
        },
        engagement: {
          likes: comment.like_count || 0,
          reactions: comment.reactions || {},
          userReacted: false,
          userReactionType: undefined
        },
        status: comment.status || 'published',
        children: [],
        createdAt: comment.created_at || comment.createdAt || new Date().toISOString(),
        updatedAt: comment.updated_at || comment.updatedAt || new Date().toISOString()
      };

      commentMap.set(comment.id, node);
    });

    // Second pass: Build tree structure using parent_id
    flatComments.forEach((comment) => {
      const node = commentMap.get(comment.id);
      if (!node) return;

      if (!comment.parent_id) {
        // Root comment (no parent)
        rootComments.push(node);
      } else {
        // Child comment - find parent and add to its children
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.children.push(node);
        } else {
          // Parent not found - treat as root comment
          rootComments.push(node);
        }
      }
    });

    // Sort comments by creation date (oldest first for natural conversation flow)
    const sortComments = (nodes: CommentTreeNode[]) => {
      nodes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      nodes.forEach(node => sortComments(node.children));
    };

    sortComments(rootComments);

    return rootComments;
  }, []);

  /**
   * Flatten tree structure back to array for state management
   */
  const flattenCommentTree = useCallback((tree: CommentTreeNode[]): CommentTreeNode[] => {
    const result: CommentTreeNode[] = [];

    const traverse = (nodes: CommentTreeNode[]) => {
      nodes.forEach(node => {
        result.push(node);
        if (node.children.length > 0) {
          traverse(node.children);
        }
      });
    };

    traverse(tree);
    return result;
  }, []);

  /**
   * Fetch comments from API with error handling and retry logic
   */
  const fetchComments = useCallback(async (reset: boolean = false) => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const currentOffset = reset ? 0 : offset;

      const response = await axios.get(
        `${API_BASE_URL}/agent-posts/${postId}/comments`,
        {
          params: {
            limit: 50,
            offset: currentOffset,
            sort: 'createdAt',
            direction: 'asc'
          },
          signal: abortControllerRef.current.signal,
          timeout: 10000
        }
      );

      if (response.data.success && response.data.data) {
        const flatComments = response.data.data;
        const tree = buildCommentTree(flatComments);
        const flatTree = flattenCommentTree(tree);

        if (reset) {
          setComments(flatTree);
          setOffset(flatComments.length);
        } else {
          setComments(prev => [...prev, ...flatTree]);
          setOffset(prev => prev + flatComments.length);
        }

        setHasMore(response.data.hasMore || false);

        // Calculate stats from fetched comments
        const agentCount = flatComments.filter((c: any) =>
          c.author.startsWith('agent-') || c.is_agent_response
        ).length;

        setStats({
          totalComments: response.data.total || flatComments.length,
          rootThreads: tree.length,
          maxDepth: Math.max(...flatComments.map((c: any) => c.thread_depth || 0), 0),
          agentComments: agentCount,
          userComments: flatComments.length - agentCount,
          averageDepth: flatComments.reduce((sum: number, c: any) => sum + (c.thread_depth || 0), 0) / flatComments.length || 0,
          mostActiveThread: null,
          recentActivity: Date.now()
        });
      } else {
        setComments([]);
        setStats({
          totalComments: 0,
          rootThreads: 0,
          maxDepth: 0,
          agentComments: 0,
          userComments: 0,
          averageDepth: 0,
          mostActiveThread: null,
          recentActivity: Date.now()
        });
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log('Request cancelled');
        return;
      }

      const axiosError = err as AxiosError<{ message?: string }>;
      const errorMessage = axiosError.response?.data?.message ||
                          axiosError.message ||
                          'Failed to load comments';

      console.error('Error fetching comments:', errorMessage);
      setError(errorMessage);

      // Retry logic for network errors
      if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ERR_NETWORK') {
        setTimeout(() => fetchComments(reset), 3000);
      }
    } finally {
      setLoading(false);
    }
  }, [postId, offset, buildCommentTree, flattenCommentTree, API_BASE_URL]);

  /**
   * Add a new comment with optimistic update
   */
  const addComment = useCallback(async (
    content: string,
    parentId?: string
  ): Promise<CommentTreeNode> => {
    try {
      // Optimistic update - add temporary comment immediately
      const tempId = `temp-${Date.now()}`;
      const optimisticComment: CommentTreeNode = {
        id: tempId,
        content,
        contentType: 'text',
        author: {
          type: 'user',
          id: 'anonymous',
          name: 'You',
          avatar: 'Y'
        },
        metadata: {
          threadDepth: parentId ? 1 : 0,
          threadPath: tempId,
          replyCount: 0,
          likeCount: 0,
          reactionCount: 0,
          isAgentResponse: false
        },
        engagement: {
          likes: 0,
          reactions: {},
          userReacted: false
        },
        status: 'pending',
        children: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setComments(prev => [...prev, optimisticComment]);

      // Make API call
      const response = await axios.post(
        `${API_BASE_URL}/agent-posts/${postId}/comments`,
        {
          content,
          author: 'anonymous',
          parent_id: parentId || null
        },
        { timeout: 10000 }
      );

      if (response.data.success && response.data.data) {
        const newComment = response.data.data;

        // Replace optimistic comment with real one
        setComments(prev =>
          prev.map(c => c.id === tempId ? {
            ...optimisticComment,
            id: newComment.id,
            status: 'published',
            createdAt: newComment.created_at || newComment.createdAt
          } : c)
        );

        // Update stats
        setStats(prev => prev ? {
          ...prev,
          totalComments: prev.totalComments + 1,
          userComments: prev.userComments + 1,
          rootThreads: parentId ? prev.rootThreads : prev.rootThreads + 1
        } : null);

        return {
          ...optimisticComment,
          id: newComment.id,
          status: 'published'
        };
      }

      throw new Error('Failed to create comment');
    } catch (err) {
      // Remove optimistic comment on error
      setComments(prev => prev.filter(c => !c.id.startsWith('temp-')));

      const axiosError = err as AxiosError<{ message?: string }>;
      const errorMessage = axiosError.response?.data?.message ||
                          axiosError.message ||
                          'Failed to add comment';

      throw new Error(errorMessage);
    }
  }, [postId, API_BASE_URL]);

  /**
   * Update an existing comment
   */
  const updateComment = useCallback(async (
    commentId: string,
    content: string
  ): Promise<CommentTreeNode> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/comments/${commentId}`,
        { content },
        { timeout: 10000 }
      );

      if (response.data.success && response.data.data) {
        const updatedComment = response.data.data;

        setComments(prev =>
          prev.map(c =>
            c.id === commentId
              ? { ...c, content: updatedComment.content, updatedAt: updatedComment.updated_at }
              : c
          )
        );

        return comments.find(c => c.id === commentId)!;
      }

      throw new Error('Failed to update comment');
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      throw new Error(axiosError.response?.data?.message || 'Failed to update comment');
    }
  }, [comments, API_BASE_URL]);

  /**
   * Delete a comment (soft delete)
   */
  const deleteComment = useCallback(async (commentId: string): Promise<void> => {
    try {
      await axios.delete(
        `${API_BASE_URL}/comments/${commentId}`,
        { timeout: 10000 }
      );

      // Remove comment from state
      setComments(prev => prev.filter(c => c.id !== commentId));

      // Update stats
      setStats(prev => prev ? {
        ...prev,
        totalComments: Math.max(0, prev.totalComments - 1)
      } : null);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      throw new Error(axiosError.response?.data?.message || 'Failed to delete comment');
    }
  }, [API_BASE_URL]);

  /**
   * React to a comment (like, helpful, etc.)
   */
  const reactToComment = useCallback(async (
    commentId: string,
    reactionType: string
  ): Promise<void> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/comments/${commentId}/react`,
        {
          reactionType,
          userId: 'anonymous'
        },
        { timeout: 10000 }
      );

      if (response.data.success) {
        // Update comment reactions in state
        setComments(prev =>
          prev.map(c =>
            c.id === commentId
              ? {
                  ...c,
                  engagement: {
                    ...c.engagement,
                    reactions: {
                      ...c.engagement.reactions,
                      [reactionType]: (c.engagement.reactions[reactionType] || 0) + 1
                    },
                    userReacted: true,
                    userReactionType: reactionType
                  }
                }
              : c
          )
        );
      }
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      throw new Error(axiosError.response?.data?.message || 'Failed to react to comment');
    }
  }, [API_BASE_URL]);

  /**
   * Load more comments (pagination)
   */
  const loadMoreComments = useCallback(async (): Promise<void> => {
    if (!hasMore || loading) return;
    await fetchComments(false);
  }, [hasMore, loading, fetchComments]);

  /**
   * Refresh comments (reset and reload)
   */
  const refreshComments = useCallback(async (): Promise<void> => {
    await fetchComments(true);
  }, [fetchComments]);

  /**
   * Trigger agent response to a comment
   */
  const triggerAgentResponse = useCallback(async (
    commentId: string,
    agentType: string
  ): Promise<CommentTreeNode> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/comments/${commentId}/agent-response`,
        {
          agentType,
          context: {}
        },
        { timeout: 15000 }
      );

      if (response.data.success && response.data.data) {
        const agentResponse = response.data.data;

        // Add agent response to comments
        const tree = buildCommentTree([...comments.map(c => ({
          id: c.id,
          content: c.content,
          author: c.author.id,
          parent_id: commentId
        })), agentResponse]);

        setComments(flattenCommentTree(tree));

        return tree[0]; // Return first node (will be transformed)
      }

      throw new Error('Failed to trigger agent response');
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      throw new Error(axiosError.response?.data?.message || 'Failed to trigger agent response');
    }
  }, [comments, buildCommentTree, flattenCommentTree, API_BASE_URL]);

  /**
   * Get current tree structure
   */
  const getThreadStructure = useCallback((): CommentTreeNode[] => {
    return buildCommentTree(comments.map(c => ({
      id: c.id,
      content: c.content,
      author: c.author.id,
      parent_id: null, // Will be determined from metadata
      thread_depth: c.metadata.threadDepth,
      created_at: c.createdAt
    })));
  }, [comments, buildCommentTree]);

  // Initial fetch on mount
  useEffect(() => {
    fetchComments(true);
  }, [postId]); // Only depend on postId to avoid re-fetching on every render

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh) {
      refreshTimeoutRef.current = setInterval(() => {
        refreshComments();
      }, refreshInterval);

      return () => {
        if (refreshTimeoutRef.current) {
          clearInterval(refreshTimeoutRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, refreshComments]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (refreshTimeoutRef.current) {
        clearInterval(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    comments,
    setComments, // CRITICAL: Expose setComments for WebSocket real-time updates
    agentConversations,
    loading,
    error,
    stats,
    addComment,
    updateComment,
    deleteComment,
    reactToComment,
    loadMoreComments,
    refreshComments,
    triggerAgentResponse,
    getThreadStructure
  };
};
