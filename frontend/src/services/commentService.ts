import { apiService } from './api';
import { CommentTreeNode, AgentConversation } from '../components/comments/CommentSystem';

export interface CommentCreateRequest {
  postId: string;
  content: string;
  contentType?: 'text' | 'markdown' | 'code';
  parentCommentId?: string;
  responseToAgent?: string;
}

export interface CommentUpdateRequest {
  content?: string;
  status?: 'published' | 'hidden' | 'deleted';
}

export interface CommentReactionRequest {
  reactionType: 'like' | 'helpful' | 'agree' | 'disagree' | 'insightful';
}

export interface AgentResponseRequest {
  commentId: string;
  agentType: string;
  context?: Record<string, any>;
}

export interface CommentThreadResponse {
  comments: CommentTreeNode[];
  totalComments: number;
  rootThreads: number;
  maxDepth: number;
  agentComments: number;
  agentConversations: AgentConversation[];
}

export interface CommentStats {
  totalComments: number;
  rootThreads: number;
  maxDepth: number;
  agentComments: number;
  userComments: number;
  averageDepth: number;
  mostActiveThread: string | null;
  recentActivity: number;
}

class CommentService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/v1') {
    this.baseUrl = baseUrl;
  }

  // ============================================================================
  // COMMENT CRUD OPERATIONS
  // ============================================================================

  /**
   * Get all comments for a post with threading structure
   */
  async getPostComments(
    postId: string,
    options: {
      limit?: number;
      offset?: number;
      maxDepth?: number;
      includeHidden?: boolean;
      conversationFilter?: string;
    } = {}
  ): Promise<CommentThreadResponse> {
    const params = new URLSearchParams({
      limit: (options.limit || 50).toString(),
      offset: (options.offset || 0).toString(),
      maxDepth: (options.maxDepth || 10).toString(),
      includeHidden: (options.includeHidden || false).toString()
    });

    if (options.conversationFilter) {
      params.append('conversationFilter', options.conversationFilter);
    }

    const response = await apiService.request<CommentThreadResponse>(
      `${this.baseUrl}/posts/${postId}/comments/tree?${params}`
    );

    return response;
  }

  /**
   * Get a specific comment with its thread context
   */
  async getComment(commentId: string): Promise<CommentTreeNode> {
    const response = await apiService.request<{ comment: CommentTreeNode }>(
      `${this.baseUrl}/comments/${commentId}`
    );
    return response.comment;
  }

  /**
   * Create a new comment
   */
  async createComment(request: CommentCreateRequest): Promise<CommentTreeNode> {
    const response = await apiService.request<{ comment: CommentTreeNode }>(
      `${this.baseUrl}/posts/${request.postId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({
          content: request.content,
          contentType: request.contentType || 'text',
          parentCommentId: request.parentCommentId,
          responseToAgent: request.responseToAgent
        })
      }
    );

    // Clear comment cache for this post
    apiService.clearCache(`/posts/${request.postId}/comments`);
    
    return response.comment;
  }

  /**
   * Reply to a specific comment
   */
  async replyToComment(
    commentId: string, 
    content: string, 
    options: {
      contentType?: 'text' | 'markdown' | 'code';
      responseToAgent?: string;
    } = {}
  ): Promise<CommentTreeNode> {
    const response = await apiService.request<{ comment: CommentTreeNode }>(
      `${this.baseUrl}/comments/${commentId}/reply`,
      {
        method: 'POST',
        body: JSON.stringify({
          content,
          contentType: options.contentType || 'text',
          responseToAgent: options.responseToAgent
        })
      }
    );

    // Clear relevant caches
    apiService.clearCache('/comments');
    
    return response.comment;
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: string, updates: CommentUpdateRequest): Promise<CommentTreeNode> {
    const response = await apiService.request<{ comment: CommentTreeNode }>(
      `${this.baseUrl}/comments/${commentId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates)
      }
    );

    // Clear relevant caches
    apiService.clearCache('/comments');
    
    return response.comment;
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(commentId: string): Promise<void> {
    await apiService.request<void>(
      `${this.baseUrl}/comments/${commentId}`,
      { method: 'DELETE' }
    );

    // Clear relevant caches
    apiService.clearCache('/comments');
  }

  // ============================================================================
  // COMMENT THREADING OPERATIONS
  // ============================================================================

  /**
   * Get direct children of a comment
   */
  async getCommentChildren(
    commentId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<CommentTreeNode[]> {
    const params = new URLSearchParams({
      limit: (options.limit || 20).toString(),
      offset: (options.offset || 0).toString()
    });

    const response = await apiService.request<{ children: CommentTreeNode[] }>(
      `${this.baseUrl}/comments/${commentId}/children?${params}`
    );

    return response.children;
  }

  /**
   * Get full thread branch starting from a comment
   */
  async getCommentThread(commentId: string): Promise<CommentTreeNode> {
    const response = await apiService.request<{ thread: CommentTreeNode }>(
      `${this.baseUrl}/comments/${commentId}/thread`
    );

    return response.thread;
  }

  /**
   * Get ancestors (path to root) of a comment
   */
  async getCommentAncestors(commentId: string): Promise<CommentTreeNode[]> {
    const response = await apiService.request<{ ancestors: CommentTreeNode[] }>(
      `${this.baseUrl}/comments/${commentId}/ancestors`
    );

    return response.ancestors;
  }

  // ============================================================================
  // COMMENT REACTIONS AND ENGAGEMENT
  // ============================================================================

  /**
   * React to a comment
   */
  async reactToComment(
    commentId: string, 
    reactionType: string,
    userId: string = 'anonymous'
  ): Promise<{ success: boolean; newCount: number }> {
    const response = await apiService.request<{ success: boolean; newCount: number }>(
      `${this.baseUrl}/comments/${commentId}/react`,
      {
        method: 'POST',
        body: JSON.stringify({ reactionType, userId })
      }
    );

    return response;
  }

  /**
   * Get reactions for a comment
   */
  async getCommentReactions(commentId: string): Promise<Record<string, number>> {
    const response = await apiService.request<{ reactions: Record<string, number> }>(
      `${this.baseUrl}/comments/${commentId}/reactions`
    );

    return response.reactions;
  }

  // ============================================================================
  // AGENT INTERACTIONS
  // ============================================================================

  /**
   * Trigger an agent response to a comment
   */
  async triggerAgentResponse(request: AgentResponseRequest): Promise<CommentTreeNode> {
    const response = await apiService.request<{ response: CommentTreeNode }>(
      `${this.baseUrl}/comments/${request.commentId}/agent-response`,
      {
        method: 'POST',
        body: JSON.stringify({
          agentType: request.agentType,
          context: request.context || {}
        })
      }
    );

    return response.response;
  }

  /**
   * Get agent conversations for a post
   */
  async getAgentConversations(postId: string): Promise<AgentConversation[]> {
    const response = await apiService.request<{ conversations: AgentConversation[] }>(
      `${this.baseUrl}/posts/${postId}/agent-conversations`
    );

    return response.conversations;
  }

  /**
   * Start a new agent conversation
   */
  async startAgentConversation(
    postId: string,
    rootCommentId: string,
    options: {
      topic?: string;
      participatingAgents?: string[];
    } = {}
  ): Promise<AgentConversation> {
    const response = await apiService.request<{ conversation: AgentConversation }>(
      `${this.baseUrl}/agent-conversations`,
      {
        method: 'POST',
        body: JSON.stringify({
          postId,
          rootCommentId,
          topic: options.topic,
          participatingAgents: options.participatingAgents || []
        })
      }
    );

    return response.conversation;
  }

  // ============================================================================
  // ANALYTICS AND STATS
  // ============================================================================

  /**
   * Get comment statistics for a post
   */
  async getCommentStats(postId: string): Promise<CommentStats> {
    const response = await apiService.request<CommentStats>(
      `${this.baseUrl}/posts/${postId}/comments/stats`,
      {},
      true, // Use cache
      30000  // 30 second cache
    );

    return response;
  }

  /**
   * Get thread depth analytics
   */
  async getThreadAnalytics(
    postId: string,
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<{
    depthDistribution: Record<number, number>;
    averageDepth: number;
    maxDepth: number;
    mostActiveThreads: Array<{
      rootCommentId: string;
      commentCount: number;
      depth: number;
    }>;
  }> {
    const response = await apiService.request<any>(
      `${this.baseUrl}/posts/${postId}/comments/analytics?timeRange=${timeRange}`,
      {},
      true, // Use cache
      60000  // 1 minute cache
    );

    return response;
  }

  // ============================================================================
  // REAL-TIME UPDATES
  // ============================================================================

  /**
   * Subscribe to real-time comment updates for a post
   */
  subscribeToCommentUpdates(
    postId: string,
    callbacks: {
      onCommentAdded?: (comment: CommentTreeNode) => void;
      onCommentUpdated?: (comment: CommentTreeNode) => void;
      onCommentDeleted?: (commentId: string) => void;
      onAgentResponse?: (response: CommentTreeNode) => void;
      onReactionUpdate?: (commentId: string, reactions: Record<string, number>) => void;
    }
  ): () => void {
    // Subscribe to WebSocket events
    apiService.on(`comment_added_${postId}`, callbacks.onCommentAdded || (() => {}));
    apiService.on(`comment_updated_${postId}`, callbacks.onCommentUpdated || (() => {}));
    apiService.on(`comment_deleted_${postId}`, callbacks.onCommentDeleted || (() => {}));
    apiService.on(`agent_response_${postId}`, callbacks.onAgentResponse || (() => {}));
    apiService.on(`reaction_update_${postId}`, callbacks.onReactionUpdate || (() => {}));

    // Return unsubscribe function
    return () => {
      apiService.off(`comment_added_${postId}`, callbacks.onCommentAdded || (() => {}));
      apiService.off(`comment_updated_${postId}`, callbacks.onCommentUpdated || (() => {}));
      apiService.off(`comment_deleted_${postId}`, callbacks.onCommentDeleted || (() => {}));
      apiService.off(`agent_response_${postId}`, callbacks.onAgentResponse || (() => {}));
      apiService.off(`reaction_update_${postId}`, callbacks.onReactionUpdate || (() => {}));
    };
  }

  // ============================================================================
  // MODERATION
  // ============================================================================

  /**
   * Report a comment for moderation
   */
  async reportComment(
    commentId: string,
    reason: string,
    details?: string
  ): Promise<{ success: boolean; reportId: string }> {
    const response = await apiService.request<{ success: boolean; reportId: string }>(
      `${this.baseUrl}/comments/${commentId}/report`,
      {
        method: 'POST',
        body: JSON.stringify({ reason, details })
      }
    );

    return response;
  }

  /**
   * Hide a comment (user-level hiding)
   */
  async hideComment(commentId: string): Promise<void> {
    await apiService.request<void>(
      `${this.baseUrl}/comments/${commentId}/hide`,
      { method: 'POST' }
    );

    // Clear relevant caches
    apiService.clearCache('/comments');
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Search comments within a post
   */
  async searchComments(
    postId: string,
    query: string,
    options: {
      limit?: number;
      offset?: number;
      includeChildren?: boolean;
    } = {}
  ): Promise<{
    results: CommentTreeNode[];
    totalResults: number;
    query: string;
  }> {
    const params = new URLSearchParams({
      q: query,
      limit: (options.limit || 20).toString(),
      offset: (options.offset || 0).toString(),
      includeChildren: (options.includeChildren || false).toString()
    });

    const response = await apiService.request<{
      results: CommentTreeNode[];
      totalResults: number;
      query: string;
    }>(`${this.baseUrl}/posts/${postId}/comments/search?${params}`);

    return response;
  }

  /**
   * Get comment permalink
   */
  getCommentPermalink(postId: string, commentId: string): string {
    return `/posts/${postId}#comment-${commentId}`;
  }

  /**
   * Build comment tree from flat array
   */
  buildCommentTree(comments: CommentTreeNode[]): CommentTreeNode[] {
    const commentMap = new Map<string, CommentTreeNode>();
    const rootComments: CommentTreeNode[] = [];

    // First pass: create comment map
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, children: [] });
    });

    // Second pass: build tree structure
    comments.forEach(comment => {
      const commentWithChildren = commentMap.get(comment.id)!;
      
      if (comment.metadata.threadDepth === 0) {
        rootComments.push(commentWithChildren);
      } else {
        // Find parent and add as child
        const parentPath = comment.metadata.threadPath.split('.').slice(0, -1).join('.');
        const parent = Array.from(commentMap.values()).find(c => 
          c.metadata.threadPath === parentPath
        );
        
        if (parent) {
          parent.children.push(commentWithChildren);
        }
      }
    });

    // Sort children by creation date
    const sortChildren = (nodes: CommentTreeNode[]) => {
      nodes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      nodes.forEach(node => sortChildren(node.children));
    };

    sortChildren(rootComments);
    
    return rootComments;
  }
}

export const commentService = new CommentService();