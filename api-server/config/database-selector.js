/**
 * Database Selector
 * Provides unified interface to either SQLite or PostgreSQL
 * Controlled by USE_POSTGRES environment variable
 *
 * Phase 2A: Dual Database Support
 */

import Database from 'better-sqlite3';
import postgresManager from './postgres.js';
import agentRepo from '../repositories/postgres/agent.repository.js';
import memoryRepo from '../repositories/postgres/memory.repository.js';
import workspaceRepo from '../repositories/postgres/workspace.repository.js';
import fsAgentRepo from '../repositories/agent.repository.js';

class DatabaseSelector {
  constructor() {
    this.usePostgres = process.env.USE_POSTGRES === 'true';
    this.usePostgresAgents = process.env.USE_POSTGRES_AGENTS === 'true';
    this.sqliteDb = null;
    this.sqlitePagesDb = null;

    console.log(`📊 Database Mode: ${this.usePostgres ? 'PostgreSQL' : 'SQLite'}`);
    console.log(`📂 Agent Source: ${this.usePostgresAgents ? 'PostgreSQL' : 'Filesystem'}`);
  }

  /**
   * Initialize database connections
   */
  async initialize() {
    if (this.usePostgres) {
      try {
        // Connect to PostgreSQL
        await postgresManager.connect();
        const isHealthy = await postgresManager.healthCheck();

        if (!isHealthy) {
          console.error('❌ PostgreSQL health check failed');
          console.log('⚠️  Falling back to SQLite mode');
          this.usePostgres = false;
        } else {
          console.log('✅ PostgreSQL connection established');
        }
      } catch (error) {
        console.error('❌ PostgreSQL connection error:', error.message);
        console.log('⚠️  Falling back to SQLite mode');
        this.usePostgres = false;
      }
    }

    if (!this.usePostgres) {
      // Connect to SQLite databases
      this.sqliteDb = new Database('/workspaces/agent-feed/database.db');
      this.sqlitePagesDb = new Database('/workspaces/agent-feed/data/agent-pages.db');

      console.log('✅ SQLite connections established');
    }
  }

  /**
   * Get all agents for a user
   * @param {string} userId - User ID (default: 'anonymous')
   * @param {Object} options - Filtering options
   * @param {number|'all'} options.tier - Tier filter (1, 2, or 'all')
   * @param {boolean} options.include_system - Legacy parameter for backward compatibility
   * @returns {Promise<Array>} List of agents
   */
  async getAllAgents(userId = 'anonymous', options = {}) {
    if (this.usePostgresAgents) {
      return await agentRepo.getAllAgents(userId, options);
    } else {
      // Use filesystem repository
      return await fsAgentRepo.getAllAgents(userId, options);
    }
  }

  /**
   * Get agent by name
   * @param {string} agentName - Agent name
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} Agent or null
   */
  async getAgentByName(agentName, userId = 'anonymous') {
    if (this.usePostgresAgents) {
      return await agentRepo.getAgentByName(agentName, userId);
    } else {
      return await fsAgentRepo.getAgentByName(agentName, userId);
    }
  }

  /**
   * Get agent by slug
   * @param {string} slug - Agent slug
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} Agent or null
   */
  async getAgentBySlug(slug, userId = 'anonymous') {
    if (this.usePostgresAgents) {
      return await agentRepo.getAgentBySlug(slug, userId);
    } else {
      return await fsAgentRepo.getAgentBySlug(slug, userId);
    }
  }

  /**
   * Get all posts
   * @param {string} userId - User ID
   * @param {object} options - Query options (limit, offset)
   * @returns {Promise<Array>} List of posts
   */
  async getAllPosts(userId = 'anonymous', options = {}) {
    if (this.usePostgres) {
      return await memoryRepo.getAllPosts(userId, options);
    } else {
      // SQLite implementation
      const limit = options.limit || 100;
      const offset = options.offset || 0;

      // Use publishedAt for correct chronological order (newest first)
      // publishedAt has millisecond precision and proper staggering for onboarding posts
      // created_at only has second precision which causes identical timestamps
      const posts = this.sqliteDb.prepare(`
        SELECT * FROM agent_posts
        ORDER BY published_at DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset);

      return posts;
    }
  }

  /**
   * Search posts by title, content, or authorAgent
   * @param {string} query - Search query
   * @param {number} limit - Results per page (default: 20, max: 100)
   * @param {number} offset - Pagination offset (default: 0)
   * @returns {Promise<Object>} Object containing posts array and total count
   */
  async searchPosts(query, limit = 20, offset = 0) {
    // Validate and sanitize inputs
    const sanitizedQuery = (query || '').trim();
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);

    if (this.usePostgres) {
      // PostgreSQL implementation
      return await memoryRepo.searchPosts(sanitizedQuery, parsedLimit, parsedOffset);
    } else {
      // SQLite implementation
      const searchPattern = `%${sanitizedQuery}%`;

      // Get matching posts
      const posts = this.sqliteDb.prepare(`
        SELECT
          id, title, content, author_agent, published_at,
          metadata, engagement, created_at, last_activity_at
        FROM agent_posts
        WHERE (
          LOWER(title) LIKE LOWER(?)
          OR LOWER(content) LIKE LOWER(?)
          OR LOWER(author_agent) LIKE LOWER(?)
        )
        ORDER BY published_at DESC
        LIMIT ? OFFSET ?
      `).all(searchPattern, searchPattern, searchPattern, parsedLimit, parsedOffset);

      // Get total count of matching posts
      const countResult = this.sqliteDb.prepare(`
        SELECT COUNT(*) as count
        FROM agent_posts
        WHERE (
          LOWER(title) LIKE LOWER(?)
          OR LOWER(content) LIKE LOWER(?)
          OR LOWER(authorAgent) LIKE LOWER(?)
        )
      `).get(searchPattern, searchPattern, searchPattern);

      return {
        posts: posts,
        total: countResult.count
      };
    }
  }

  /**
   * Get post by ID
   * @param {string} postId - Post ID
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} Post or null
   */
  async getPostById(postId, userId = 'anonymous') {
    if (this.usePostgres) {
      return await memoryRepo.getPostById(postId, userId);
    } else {
      // SQLite implementation
      const post = this.sqliteDb.prepare(`
        SELECT * FROM agent_posts WHERE id = ?
      `).get(postId);

      return post || null;
    }
  }

  /**
   * Create a new post
   * @param {string} userId - User ID
   * @param {object} postData - Post data
   * @returns {Promise<object>} Created post
   */
  async createPost(userId = 'anonymous', postData) {
    if (this.usePostgres) {
      return await memoryRepo.createPost(userId, postData);
    } else {
      // SQLite implementation - Fixed to use correct snake_case column names
      const insert = this.sqliteDb.prepare(`
        INSERT INTO agent_posts (
          id, user_id, author, author_agent, content, title,
          published_at, created_at, metadata, engagement_score
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const postId = postData.id || `post-${Date.now()}`;

      // Merge metadata with tags
      const metadata = {
        ...(postData.metadata || {}),
        tags: postData.tags || []
      };

      const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds

      insert.run(
        postId,
        userId,                                    // user_id
        postData.author || userId,                 // author (display name)
        postData.author_agent || postData.authorAgent || userId, // author_agent
        postData.content,
        postData.title || '',
        now,                                       // published_at (Unix seconds)
        now,                                       // created_at (Unix seconds)
        JSON.stringify(metadata),                  // metadata with tags merged in
        0                                          // engagement_score starts at 0
      );

      return this.getPostById(postId, userId);
    }
  }

  /**
   * Get comments for a post
   * @param {string} postId - Post ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of comments
   */
  async getCommentsByPostId(postId, userId = 'anonymous') {
    if (this.usePostgres) {
      return await memoryRepo.getCommentsByPostId(postId, userId);
    } else {
      // SQLite implementation - Join with user_settings for display names
      const comments = this.sqliteDb.prepare(`
        SELECT
          c.*,
          COALESCE(u.display_name, c.author, c.author_agent, 'Unknown') as display_name,
          u.display_name_style
        FROM comments c
        LEFT JOIN user_settings u ON c.author_user_id = u.user_id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
      `).all(postId);

      return comments;
    }
  }

  /**
   * Get a single comment by ID
   * @param {string} commentId - Comment ID
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} Comment or null
   */
  async getCommentById(commentId, userId = 'anonymous') {
    // Handle invalid input
    if (!commentId || typeof commentId !== 'string') {
      return null;
    }

    if (this.usePostgres) {
      return await memoryRepo.getCommentById(commentId, userId);
    } else {
      // SQLite implementation
      const comment = this.sqliteDb.prepare(`
        SELECT * FROM comments WHERE id = ?
      `).get(commentId);

      return comment || null;
    }
  }

  /**
   * Create a comment
   * @param {string} userId - User ID
   * @param {object} commentData - Comment data
   * @returns {Promise<object>} Created comment
   */
  async createComment(userId = 'anonymous', commentData) {
    if (this.usePostgres) {
      return await memoryRepo.createComment(userId, commentData);
    } else {
      // SQLite implementation
      const insert = this.sqliteDb.prepare(`
        INSERT INTO comments (
          id,
          post_id,
          parent_id,
          author,
          author_agent,
          author_user_id,
          content,
          content_type,
          mentioned_users,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      const commentId = commentData.id || `comment-${Date.now()}`;
      const mentionedUsers = Array.isArray(commentData.mentioned_users)
        ? JSON.stringify(commentData.mentioned_users)
        : '[]';

      // Accept both author and author_agent for backward compatibility
      const author = commentData.author || userId;
      const authorAgent = commentData.author_agent || commentData.author || userId;

      // NEW: Store the user_id for proper display name lookup
      const authorUserId = commentData.user_id || commentData.author_user_id || userId;

      // Default content_type to 'text' if not provided
      const contentType = commentData.content_type || 'text';

      insert.run(
        commentId,
        commentData.post_id,
        commentData.parent_id || null,
        author,           // Keep for backward compatibility
        authorAgent,      // Primary field going forward
        authorUserId,     // NEW: Store user_id for display name lookup
        commentData.content,
        contentType,      // NEW: content_type support
        mentionedUsers
      );

      // Get the created comment with joined user display name
      const comment = this.sqliteDb.prepare(`
        SELECT
          c.*,
          COALESCE(u.display_name, c.author, c.author_agent, 'Unknown') as display_name,
          u.display_name_style
        FROM comments c
        LEFT JOIN user_settings u ON c.author_user_id = u.user_id
        WHERE c.id = ?
      `).get(commentId);

      return comment;
    }
  }

  /**
   * Get posts by agent
   * @param {string} agentName - Agent name
   * @param {string} userId - User ID
   * @param {number} limit - Result limit
   * @returns {Promise<Array>} List of posts
   */
  async getPostsByAgent(agentName, userId = 'anonymous', limit = 50) {
    if (this.usePostgres) {
      return await memoryRepo.getPostsByAgent(agentName, userId, limit);
    } else {
      // SQLite implementation
      const posts = this.sqliteDb.prepare(`
        SELECT * FROM agent_posts
        WHERE author_agent = ?
        ORDER BY published_at DESC
        LIMIT ?
      `).all(agentName, limit);

      return posts;
    }
  }

  /**
   * Get all pages
   * @param {string} userId - User ID
   * @param {object} options - Query options
   * @returns {Promise<Array>} List of pages
   */
  async getAllPages(userId = 'anonymous', options = {}) {
    if (this.usePostgres) {
      return await workspaceRepo.getAllPages(userId, options);
    } else {
      // SQLite implementation
      const limit = options.limit || 100;
      const offset = options.offset || 0;

      const pages = this.sqlitePagesDb.prepare(`
        SELECT * FROM agent_pages
        WHERE status = 'published'
        ORDER BY updated_at DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset);

      return pages;
    }
  }

  /**
   * Get pages by agent
   * @param {string} agentName - Agent name
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of pages
   */
  async getPagesByAgent(agentName, userId = 'anonymous') {
    if (this.usePostgres) {
      return await workspaceRepo.getPagesByAgent(agentName, userId);
    } else {
      // SQLite implementation
      const pages = this.sqlitePagesDb.prepare(`
        SELECT * FROM agent_pages
        WHERE agent_id = ? AND status = 'published'
        ORDER BY updated_at DESC
      `).all(agentName);

      return pages;
    }
  }

  /**
   * Get page by ID
   * @param {string} pageId - Page ID
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} Page or null
   */
  async getPageById(pageId, userId = 'anonymous') {
    if (this.usePostgres) {
      return await workspaceRepo.getPageById(pageId, userId);
    } else {
      // SQLite implementation
      const page = this.sqlitePagesDb.prepare(`
        SELECT * FROM agent_pages WHERE id = ?
      `).get(pageId);

      return page || null;
    }
  }

  /**
   * Upsert a page
   * @param {string} userId - User ID
   * @param {object} pageData - Page data
   * @returns {Promise<object>} Created/updated page
   */
  async upsertPage(userId = 'anonymous', pageData) {
    if (this.usePostgres) {
      return await workspaceRepo.upsertPage(userId, pageData);
    } else {
      // SQLite implementation
      const upsert = this.sqlitePagesDb.prepare(`
        INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          content_value = excluded.content_value,
          title = excluded.title,
          updated_at = datetime('now')
      `);

      const pageId = pageData.id || `page-${Date.now()}`;
      upsert.run(
        pageId,
        pageData.agent_id,
        pageData.title,
        pageData.content_type || 'text',
        pageData.content_value,
        pageData.status || 'published'
      );

      return this.getPageById(pageId, userId);
    }
  }

  /**
   * Search pages
   * @param {string} searchTerm - Search term
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of matching pages
   */
  async searchPages(searchTerm, userId = 'anonymous') {
    if (this.usePostgres) {
      return await workspaceRepo.searchPages(searchTerm, userId);
    } else {
      // SQLite implementation
      const pages = this.sqlitePagesDb.prepare(`
        SELECT * FROM agent_pages
        WHERE (title LIKE ? OR content_value LIKE ?) AND status = 'published'
        ORDER BY updated_at DESC
        LIMIT 50
      `).all(`%${searchTerm}%`, `%${searchTerm}%`);

      return pages;
    }
  }

  /**
   * Delete a page
   * @param {string} pageId - Page ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deletePage(pageId, userId = 'anonymous') {
    if (this.usePostgres) {
      return await workspaceRepo.deletePage(pageId, userId);
    } else {
      // SQLite implementation
      const result = this.sqlitePagesDb.prepare(`
        DELETE FROM agent_pages WHERE id = ?
      `).run(pageId);

      return result.changes > 0;
    }
  }

  /**
   * Get system templates
   * @returns {Promise<Array>} List of system templates
   */
  async getSystemTemplates() {
    if (this.usePostgres) {
      return await agentRepo.getSystemTemplates();
    } else {
      // SQLite doesn't have system templates table
      // Return empty array or read from JSON files
      return [];
    }
  }

  /**
   * Close database connections
   */
  async close() {
    if (this.usePostgres) {
      await postgresManager.close();
    } else {
      if (this.sqliteDb) this.sqliteDb.close();
      if (this.sqlitePagesDb) this.sqlitePagesDb.close();
    }
  }

  /**
   * Get raw database connections (for backward compatibility)
   */
  getRawConnections() {
    if (this.usePostgres) {
      return {
        db: null, // Legacy SQLite connection not available
        agentPagesDb: null,
        postgresPool: postgresManager.getPool()
      };
    } else {
      return {
        db: this.sqliteDb,
        agentPagesDb: this.sqlitePagesDb,
        postgresPool: null
      };
    }
  }
}

// Export singleton instance
export default new DatabaseSelector();
