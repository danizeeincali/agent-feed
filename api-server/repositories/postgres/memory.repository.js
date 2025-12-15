/**
 * PostgreSQL Memory Repository
 * Handles posts and comments stored in agent_memories table
 * Maps to Phase 2 PostgreSQL schema
 */

import postgresManager from '../../config/postgres.js';
import { v4 as uuidv4 } from 'uuid';

class MemoryRepository {
  /**
   * Get all posts (memories with type='post')
   * @param {string} userId - User ID (default: 'anonymous')
   * @param {object} options - Query options (limit, offset, orderBy)
   * @returns {Promise<Array>} List of posts
   */
  async getAllPosts(userId = 'anonymous', options = {}) {
    const {
      limit = 100,
      offset = 0,
      orderBy = 'created_at DESC'
    } = options;

    // Normalize orderBy to only use 'created_at' (agent_memories has no 'published_at')
    const normalizedOrderBy = orderBy.replace(/published_at/gi, 'created_at');

    const query = `
      SELECT
        id,
        post_id,
        agent_name as author_agent,
        content,
        metadata,
        created_at
      FROM agent_memories
      WHERE user_id = $1 AND metadata->>'type' = 'post'
      ORDER BY ${normalizedOrderBy}
      LIMIT $2 OFFSET $3
    `;

    const result = await postgresManager.query(query, [userId, limit, offset]);

    // Transform to match SQLite structure
    return result.rows.map(row => ({
      id: row.post_id,
      author_agent: row.author_agent,
      content: row.content,
      title: row.metadata.title || '',
      tags: row.metadata.tags || [],
      comments: row.metadata.comment_count || 0,
      published_at: row.created_at,
      metadata: row.metadata.original_metadata || {},
      created_at: row.created_at
    }));
  }

  /**
   * Get a single post by ID
   * @param {string} postId - Post ID
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} Post or null
   */
  async getPostById(postId, userId = 'anonymous') {
    const query = `
      SELECT
        id,
        post_id,
        agent_name as author_agent,
        content,
        metadata,
        created_at
      FROM agent_memories
      WHERE user_id = $1 AND post_id = $2 AND metadata->>'type' = 'post'
    `;

    const result = await postgresManager.query(query, [userId, postId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.post_id,
      author_agent: row.author_agent,
      content: row.content,
      title: row.metadata.title || '',
      tags: row.metadata.tags || [],
      comments: row.metadata.comment_count || 0,
      published_at: row.created_at,
      metadata: row.metadata.original_metadata || {},
      created_at: row.created_at
    };
  }

  /**
   * Create a new post
   * @param {string} userId - User ID
   * @param {object} postData - Post data
   * @returns {Promise<object>} Created post
   */
  async createPost(userId, postData) {
    const postId = postData.id || `prod-post-${uuidv4()}`;

    const query = `
      INSERT INTO agent_memories
        (user_id, agent_name, post_id, content, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;

    const metadata = {
      type: 'post',
      title: postData.title || '',
      tags: postData.tags || [],
      comment_count: 0,
      original_metadata: postData.metadata || {}
    };

    const result = await postgresManager.query(query, [
      userId,
      postData.author_agent,
      postId,
      postData.content,
      JSON.stringify(metadata)
    ]);

    const row = result.rows[0];
    return {
      id: row.post_id,
      author_agent: row.agent_name,
      content: row.content,
      title: metadata.title,
      tags: metadata.tags,
      comments: 0,
      published_at: row.created_at,
      created_at: row.created_at
    };
  }

  /**
   * Get all comments for a post
   * @param {string} postId - Post ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of comments
   */
  async getCommentsByPostId(postId, userId = 'anonymous') {
    const query = `
      SELECT
        id,
        agent_name as author_agent,
        post_id,
        content,
        metadata,
        created_at
      FROM agent_memories
      WHERE user_id = $1 AND post_id = $2 AND metadata->>'type' = 'comment'
      ORDER BY created_at ASC
    `;

    const result = await postgresManager.query(query, [userId, postId]);

    return result.rows.map(row => ({
      id: row.metadata.comment_id,
      post_id: row.post_id,
      parent_id: row.metadata.parent_id || null,
      author_agent: row.author_agent,
      content: row.content,
      content_type: row.metadata.content_type || 'text',  // NEW: include content_type
      depth: row.metadata.depth || 0,
      thread_path: row.metadata.thread_path || '',
      created_at: row.created_at,
      metadata: row.metadata.original_metadata || {}
    }));
  }

  /**
   * Get a single comment by ID
   * @param {string} commentId - Comment ID
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} Comment or null
   */
  async getCommentById(commentId, userId = 'anonymous') {
    const query = `
      SELECT
        id,
        agent_name as author_agent,
        post_id,
        content,
        metadata,
        created_at
      FROM agent_memories
      WHERE user_id = $1 AND metadata->>'comment_id' = $2 AND metadata->>'type' = 'comment'
    `;

    const result = await postgresManager.query(query, [userId, commentId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.metadata.comment_id,
      post_id: row.post_id,
      parent_id: row.metadata.parent_id || null,
      author: row.author_agent, // For backward compatibility
      author_agent: row.author_agent,
      content: row.content,
      content_type: row.metadata.content_type || 'text',  // NEW: include content_type
      depth: row.metadata.depth || 0,
      thread_path: row.metadata.thread_path || '',
      created_at: row.created_at,
      likes: row.metadata.likes || 0,
      mentioned_users: row.metadata.mentioned_users || [],
      metadata: row.metadata.original_metadata || {}
    };
  }

  /**
   * Create a new comment
   * @param {string} userId - User ID
   * @param {object} commentData - Comment data
   * @returns {Promise<object>} Created comment
   */
  async createComment(userId, commentData) {
    const commentId = commentData.id || `comment-${uuidv4()}`;

    const query = `
      INSERT INTO agent_memories
        (user_id, agent_name, post_id, content, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;

    const metadata = {
      type: 'comment',
      comment_id: commentId,
      parent_id: commentData.parent_id || null,
      depth: commentData.depth || 0,
      thread_path: commentData.thread_path || '',
      content_type: commentData.content_type || 'text',  // NEW: content_type support
      original_metadata: commentData.metadata || {}
    };

    const result = await postgresManager.query(query, [
      userId,
      commentData.author_agent,
      commentData.post_id,
      commentData.content,
      JSON.stringify(metadata)
    ]);

    // Update comment count in parent post
    await this.incrementPostCommentCount(userId, commentData.post_id);

    const row = result.rows[0];
    return {
      id: metadata.comment_id,
      post_id: row.post_id,
      parent_id: metadata.parent_id,
      author_agent: row.agent_name,
      content: row.content,
      content_type: metadata.content_type,  // NEW: return content_type
      depth: metadata.depth,
      thread_path: metadata.thread_path,
      created_at: row.created_at
    };
  }

  /**
   * Increment comment count for a post
   * @param {string} userId - User ID
   * @param {string} postId - Post ID
   * @returns {Promise<void>}
   */
  async incrementPostCommentCount(userId, postId) {
    const query = `
      UPDATE agent_memories
      SET
        metadata = jsonb_set(
          metadata,
          '{comment_count}',
          (COALESCE((metadata->>'comment_count')::int, 0) + 1)::text::jsonb
        )
      WHERE user_id = $1 AND post_id = $2 AND metadata->>'type' = 'post'
    `;

    await postgresManager.query(query, [userId, postId]);
  }

  /**
   * Get posts by agent name
   * @param {string} agentName - Agent name
   * @param {string} userId - User ID
   * @param {number} limit - Result limit
   * @returns {Promise<Array>} List of posts
   */
  async getPostsByAgent(agentName, userId = 'anonymous', limit = 50) {
    const query = `
      SELECT
        id,
        post_id,
        agent_name as author_agent,
        content,
        metadata,
        created_at
      FROM agent_memories
      WHERE user_id = $1 AND agent_name = $2 AND metadata->>'type' = 'post'
      ORDER BY created_at DESC
      LIMIT $3
    `;

    const result = await postgresManager.query(query, [userId, agentName, limit]);

    return result.rows.map(row => ({
      id: row.post_id,
      author_agent: row.author_agent,
      content: row.content,
      title: row.metadata.title || '',
      tags: row.metadata.tags || [],
      comments: row.metadata.comment_count || 0,
      published_at: row.created_at,
      created_at: row.created_at
    }));
  }
}

export default new MemoryRepository();
