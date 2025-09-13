/**
 * Unified Database Service
 * Handles both PostgreSQL (primary) and SQLite (fallback) with real production data
 */

import { sqliteFallback } from './sqlite-fallback.js';
import { agentFileService } from '../services/AgentFileService.js';
import { v4 as uuidv4 } from 'uuid';

class DatabaseService {
  constructor() {
    this.db = null;
    this.initialized = false;
    this.dbType = null;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  async initialize() {
    try {
      console.log('🔄 Initializing Database Service...');
      
      // Try PostgreSQL first, then fallback to SQLite
      try {
        await this.initializePostgreSQL();
      } catch (pgError) {
        console.warn('⚠️ PostgreSQL connection failed, falling back to SQLite:', pgError.message);
        await this.initializeSQLite();
      }

      this.initialized = true;
      console.log(`✅ Database Service initialized using ${this.dbType}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Database Service:', error);
      throw error;
    }
  }

  async initializePostgreSQL() {
    // Skip PostgreSQL for now since TypeScript imports aren't working
    throw new Error('PostgreSQL not configured for this environment');
  }

  async initializeSQLite() {
    try {
      await sqliteFallback.initialize();
      this.db = sqliteFallback;
      this.dbType = 'SQLite';
      console.log('✅ SQLite fallback database initialized');
    } catch (error) {
      throw new Error(`SQLite initialization failed: ${error.message}`);
    }
  }

  async ensurePostgreSQLSchema() {
    // Create tables if they don't exist for PostgreSQL
    const createAgentsTable = `
      CREATE TABLE IF NOT EXISTS agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        description TEXT,
        system_prompt TEXT,
        avatar_color VARCHAR(50),
        capabilities JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used TIMESTAMP,
        usage_count INTEGER DEFAULT 0,
        performance_metrics JSONB DEFAULT '{}'::jsonb,
        health_status JSONB DEFAULT '{}'::jsonb
      )
    `;

    const createPostsTable = `
      CREATE TABLE IF NOT EXISTS agent_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        author_agent VARCHAR(255) NOT NULL,
        published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}'::jsonb,
        comments INTEGER DEFAULT 0
      )
    `;

    const createActivitiesTable = `
      CREATE TABLE IF NOT EXISTS activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        agent_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'completed',
        metadata JSONB DEFAULT '{}'::jsonb
      )
    `;

    // Agent Pages tables for PostgreSQL
    const createAgentPagesTable = `
      CREATE TABLE IF NOT EXISTS agent_pages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id VARCHAR(255) NOT NULL,
        title VARCHAR(500) NOT NULL,
        content_type VARCHAR(50) NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'markdown', 'json', 'component')),
        content_value TEXT NOT NULL,
        content_metadata JSONB DEFAULT '{}'::jsonb,
        status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
        tags JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        version INTEGER DEFAULT 1
      )
    `;

    const createAgentWorkspacesTable = `
      CREATE TABLE IF NOT EXISTS agent_workspaces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id VARCHAR(255) NOT NULL UNIQUE,
        workspace_path VARCHAR(500) NOT NULL,
        structure JSONB DEFAULT '{}'::jsonb,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await this.db.query(createAgentsTable);
    await this.db.query(createPostsTable);
    await this.db.query(createActivitiesTable);

    // Seed with initial data if empty
    const agentCount = await this.db.query('SELECT COUNT(*) as count FROM agents');
    if (agentCount.rows[0].count == 0) {
      await this.seedPostgreSQLData();
    }
  }

  async seedPostgreSQLData() {
    const agents = [
      {
        id: 'prod-agent-1',
        name: 'ProductionValidator',
        display_name: 'Production Validator',
        description: 'Ensures applications are production-ready with real integrations',
        system_prompt: 'You are a Production Validation Specialist responsible for ensuring applications are fully implemented and ready for production deployment.',
        avatar_color: '#10B981',
        capabilities: JSON.stringify(['production-validation', 'real-data-testing', 'integration-verification']),
        performance_metrics: JSON.stringify({
          success_rate: 98.5,
          average_response_time: 250,
          total_tokens_used: 75000,
          error_count: 3
        }),
        health_status: JSON.stringify({
          cpu_usage: 45.2,
          memory_usage: 62.8,
          response_time: 180,
          last_heartbeat: new Date().toISOString()
        })
      }
      // Add more agents as needed
    ];

    for (const agent of agents) {
      await this.db.query(
        `INSERT INTO agents (id, name, display_name, description, system_prompt, avatar_color, capabilities, performance_metrics, health_status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [agent.id, agent.name, agent.display_name, agent.description, agent.system_prompt, 
         agent.avatar_color, agent.capabilities, agent.performance_metrics, agent.health_status]
      );
    }
  }

  // Unified API methods that work with both database types
  
  /**
   * Get all posts (alias for getAgentPosts)
   */
  async getPosts(limit = 20, offset = 0, userId = 'anonymous') {
    return await this.getAgentPosts(limit, offset, userId);
  }

  async getAgents() {
    try {
      // CRITICAL FIX: Use real agent files instead of mock database data
      console.log('📂 Reading agents from real markdown files...');
      const agents = await agentFileService.getAgentsFromFiles();
      
      if (agents && agents.length > 0) {
        console.log(`✅ Successfully loaded ${agents.length} real agents from files`);
        return agents;
      }
      
      // Fallback to database only if no files found
      console.log('⚠️ No agent files found, falling back to database...');
      if (!this.initialized) {
        await this.initialize();
      }

      if (this.dbType === 'SQLite') {
        return await this.db.getAgents();
      } else {
        const result = await this.db.query(`
          SELECT id, name, display_name, description, system_prompt, avatar_color,
                 capabilities, status, created_at, updated_at, last_used, usage_count,
                 performance_metrics, health_status
          FROM agents 
          ORDER BY updated_at DESC
        `);
        
        return result.rows.map(row => ({
          ...row,
          capabilities: typeof row.capabilities === 'string' ? JSON.parse(row.capabilities) : row.capabilities,
          performance_metrics: typeof row.performance_metrics === 'string' ? JSON.parse(row.performance_metrics) : row.performance_metrics,
          health_status: typeof row.health_status === 'string' ? JSON.parse(row.health_status) : row.health_status
        }));
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw error;
    }
  }

  /**
   * Get a single agent by ID or name
   */
  async getAgent(agentId) {
    try {
      const agents = await this.getAgents();
      return agents.find(a => a.id === agentId || a.name === agentId) || null;
    } catch (error) {
      console.error('Error fetching agent:', error);
      return null;
    }
  }

  async getAgentPosts(limit = 20, offset = 0, userId = 'anonymous') {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.dbType === 'SQLite') {
        return await this.db.getAgentPosts(limit, offset, userId);
      } else {
        const postsResult = await this.db.query(`
          SELECT id, title, content, author_agent, published_at, metadata, likes, comments
          FROM agent_posts 
          ORDER BY published_at DESC 
          LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const countResult = await this.db.query('SELECT COUNT(*) as count FROM agent_posts');

        return {
          posts: postsResult.rows.map(row => ({
            ...row,
            authorAgent: row.author_agent,
            publishedAt: row.published_at,
            metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
          })),
          total: parseInt(countResult.rows[0].count)
        };
      }
    } catch (error) {
      console.error('Error fetching agent posts:', error);
      throw error;
    }
  }

  async getActivities(limit = 20) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.dbType === 'SQLite') {
        return await this.db.getActivities(limit);
      } else {
        const result = await this.db.query(`
          SELECT id, type, description, timestamp, agent_id, status, metadata
          FROM activities 
          ORDER BY timestamp DESC 
          LIMIT $1
        `, [limit]);

        return result.rows.map(row => ({
          ...row,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
        }));
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      throw error;
    }
  }

  async createAgent(agentData) {
    if (!this.initialized) {
      await this.initialize();
    }

    const id = agentData.id || uuidv4();
    const timestamp = new Date().toISOString();

    try {
      if (this.dbType === 'SQLite') {
        const insertAgent = this.db.db.prepare(`
          INSERT INTO agents (id, name, display_name, description, system_prompt, avatar_color, capabilities, status, performance_metrics, health_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertAgent.run(
          id,
          agentData.name,
          agentData.display_name || agentData.name,
          agentData.description || '',
          agentData.system_prompt || '',
          agentData.avatar_color || '#6B7280',
          JSON.stringify(agentData.capabilities || []),
          agentData.status || 'active',
          JSON.stringify(agentData.performance_metrics || {}),
          JSON.stringify(agentData.health_status || {})
        );
      } else {
        await this.db.query(`
          INSERT INTO agents (id, name, display_name, description, system_prompt, avatar_color, capabilities, status, performance_metrics, health_status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          id,
          agentData.name,
          agentData.display_name || agentData.name,
          agentData.description || '',
          agentData.system_prompt || '',
          agentData.avatar_color || '#6B7280',
          JSON.stringify(agentData.capabilities || []),
          agentData.status || 'active',
          JSON.stringify(agentData.performance_metrics || {}),
          JSON.stringify(agentData.health_status || {})
        ]);
      }

      // Log activity
      await this.logActivity({
        type: 'agent_created',
        description: `Created new agent: ${agentData.name}`,
        agent_id: id
      });

      return { id, ...agentData, created_at: timestamp };
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }

  async createPost(postData) {
    if (!this.initialized) {
      await this.initialize();
    }

    const id = postData.id || uuidv4();
    const timestamp = new Date().toISOString();

    try {
      if (this.dbType === 'SQLite') {
        const insertPost = this.db.db.prepare(`
          INSERT INTO agent_posts (id, title, content, author_agent, metadata, comments)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        insertPost.run(
          id,
          postData.title,
          postData.content,
          postData.author_agent,
          JSON.stringify(postData.metadata || {}),
          postData.comments || 0
        );
      } else {
        await this.db.query(`
          INSERT INTO agent_posts (id, title, content, author_agent, metadata, comments)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          id,
          postData.title,
          postData.content,
          postData.author_agent,
          JSON.stringify(postData.metadata || {}),
          postData.comments || 0
        ]);
      }

      // Log activity
      await this.logActivity({
        type: 'post_created',
        description: `Created new post: ${postData.title}`,
        agent_id: postData.author_agent
      });

      return { id, ...postData, published_at: timestamp };
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  async logActivity(activityData) {
    if (!this.initialized) {
      await this.initialize();
    }

    const id = activityData.id || uuidv4();
    const timestamp = new Date().toISOString();

    try {
      if (this.dbType === 'SQLite') {
        const insertActivity = this.db.db.prepare(`
          INSERT INTO activities (id, type, description, agent_id, status, metadata)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        insertActivity.run(
          id,
          activityData.type,
          activityData.description,
          activityData.agent_id || null,
          activityData.status || 'completed',
          JSON.stringify(activityData.metadata || {})
        );
      } else {
        await this.db.query(`
          INSERT INTO activities (id, type, description, agent_id, status, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          id,
          activityData.type,
          activityData.description,
          activityData.agent_id || null,
          activityData.status || 'completed',
          JSON.stringify(activityData.metadata || {})
        ]);
      }

      return { id, ...activityData, timestamp };
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't throw on activity logging errors to prevent cascading failures
      return null;
    }
  }

  async updateAgentMetrics(agentId, metrics) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.dbType === 'SQLite') {
        const updateAgent = this.db.db.prepare(`
          UPDATE agents 
          SET performance_metrics = ?, health_status = ?, last_used = CURRENT_TIMESTAMP, usage_count = usage_count + 1
          WHERE id = ?
        `);

        updateAgent.run(
          JSON.stringify(metrics.performance_metrics || {}),
          JSON.stringify(metrics.health_status || {}),
          agentId
        );
      } else {
        await this.db.query(`
          UPDATE agents 
          SET performance_metrics = $1, health_status = $2, last_used = CURRENT_TIMESTAMP, usage_count = usage_count + 1
          WHERE id = $3
        `, [
          JSON.stringify(metrics.performance_metrics || {}),
          JSON.stringify(metrics.health_status || {}),
          agentId
        ]);
      }

      await this.logActivity({
        type: 'agent_metrics_updated',
        description: `Updated metrics for agent: ${agentId}`,
        agent_id: agentId,
        metadata: { metrics }
      });

      return true;
    } catch (error) {
      console.error('Error updating agent metrics:', error);
      throw error;
    }
  }

  // Enhanced Multi-Filter Methods
  async getPostsByMultipleAgents(agents, limit = 20, offset = 0, userId = 'anonymous') {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.dbType === 'SQLite') {
        return await this.db.getPostsByMultipleAgents(agents, limit, offset, userId);
      } else {
        // PostgreSQL implementation would go here
        if (!Array.isArray(agents) || agents.length === 0) {
          return { posts: [], total: 0 };
        }

        const placeholders = agents.map((_, index) => `$${index + 1}`).join(',');
        const postsResult = await this.db.query(`
          SELECT id, title, content, author_agent, published_at, metadata, comments
          FROM agent_posts 
          WHERE author_agent IN (${placeholders})
          ORDER BY published_at DESC 
          LIMIT $${agents.length + 1} OFFSET $${agents.length + 2}
        `, [...agents, limit, offset]);

        const countResult = await this.db.query(`
          SELECT COUNT(*) as count FROM agent_posts 
          WHERE author_agent IN (${placeholders})
        `, agents);

        return {
          posts: postsResult.rows.map(row => ({
            ...row,
            authorAgent: row.author_agent,
            publishedAt: row.published_at,
            metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
          })),
          total: parseInt(countResult.rows[0].count)
        };
      }
    } catch (error) {
      console.error('Error fetching posts by multiple agents:', error);
      throw error;
    }
  }

  async getPostsByMultipleTags(tags, limit = 20, offset = 0, userId = 'anonymous') {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.dbType === 'SQLite') {
        return await this.db.getPostsByMultipleTags(tags, limit, offset, userId);
      } else {
        // PostgreSQL implementation would use JSONB operators
        if (!Array.isArray(tags) || tags.length === 0) {
          return { posts: [], total: 0 };
        }

        // For PostgreSQL, we'd use JSONB operators like @> or ?&
        const tagConditions = tags.map((_, index) => `metadata->>'tags' LIKE $${index + 1}`).join(' AND ');
        const tagParams = tags.map(tag => `%"${tag}"%`);
        
        const postsResult = await this.db.query(`
          SELECT id, title, content, author_agent, published_at, metadata, comments
          FROM agent_posts 
          WHERE ${tagConditions}
          ORDER BY published_at DESC 
          LIMIT $${tags.length + 1} OFFSET $${tags.length + 2}
        `, [...tagParams, limit, offset]);

        const countResult = await this.db.query(`
          SELECT COUNT(*) as count FROM agent_posts 
          WHERE ${tagConditions}
        `, tagParams);

        return {
          posts: postsResult.rows.map(row => ({
            ...row,
            authorAgent: row.author_agent,
            publishedAt: row.published_at,
            metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
          })),
          total: parseInt(countResult.rows[0].count)
        };
      }
    } catch (error) {
      console.error('Error fetching posts by multiple tags:', error);
      throw error;
    }
  }

  async getPostsByAgentsAndTags(agents = [], tags = [], limit = 20, offset = 0, userId = 'anonymous') {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.dbType === 'SQLite') {
        return await this.db.getPostsByAgentsAndTags(agents, tags, limit, offset, userId);
      } else {
        // PostgreSQL implementation
        const hasAgents = Array.isArray(agents) && agents.length > 0;
        const hasTags = Array.isArray(tags) && tags.length > 0;
        
        if (!hasAgents && !hasTags) {
          return this.getAgentPosts(limit, offset, userId);
        }

        let whereClause = '';
        let params = [];
        let paramIndex = 1;
        
        if (hasAgents) {
          const agentPlaceholders = agents.map(() => `$${paramIndex++}`).join(',');
          whereClause += `author_agent IN (${agentPlaceholders})`;
          params.push(...agents);
        }
        
        if (hasTags) {
          if (whereClause) whereClause += ' AND ';
          const tagConditions = tags.map(() => `metadata->>'tags' LIKE $${paramIndex++}`).join(' AND ');
          whereClause += `(${tagConditions})`;
          params.push(...tags.map(tag => `%"${tag}"%`));
        }

        params.push(limit, offset);

        const postsResult = await this.db.query(`
          SELECT id, title, content, author_agent, published_at, metadata, comments
          FROM agent_posts 
          WHERE ${whereClause}
          ORDER BY published_at DESC 
          LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `, params);

        const countResult = await this.db.query(`
          SELECT COUNT(*) as count FROM agent_posts 
          WHERE ${whereClause}
        `, params.slice(0, -2)); // Remove limit and offset for count

        return {
          posts: postsResult.rows.map(row => ({
            ...row,
            authorAgent: row.author_agent,
            publishedAt: row.published_at,
            metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
          })),
          total: parseInt(countResult.rows[0].count)
        };
      }
    } catch (error) {
      console.error('Error fetching posts by agents and tags:', error);
      throw error;
    }
  }

  async getMultiFilteredPosts(agents, hashtags, mode = 'AND', limit = 50, offset = 0) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (this.config.type === 'postgresql') {
      // PostgreSQL implementation would go here
      throw new Error('PostgreSQL multi-filter not yet implemented');
    } else {
      return this.db.getMultiFilteredPosts(agents, hashtags, mode, limit, offset);
    }
  }

  async getFilterSuggestions(type, query = '', limit = 10) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.dbType === 'SQLite') {
        return await this.db.getFilterSuggestions(type, query, limit);
      } else {
        // PostgreSQL implementation
        const searchQuery = `%${query.toLowerCase()}%`;
        
        if (type === 'agent') {
          const result = await this.db.query(`
            SELECT DISTINCT author_agent as value, author_agent as label, COUNT(*) as post_count
            FROM agent_posts 
            WHERE LOWER(author_agent) LIKE $1
            GROUP BY author_agent
            ORDER BY post_count DESC, author_agent
            LIMIT $2
          `, [searchQuery, limit]);
          
          return result.rows.map(agent => ({
            value: agent.value,
            label: agent.label,
            type: 'agent',
            postCount: parseInt(agent.post_count)
          }));
        } else if (type === 'hashtag') {
          // For PostgreSQL, we'd use JSONB operators to extract tags
          const result = await this.db.query(`
            SELECT tag.value as tag_name, COUNT(*) as post_count
            FROM agent_posts, 
                 jsonb_array_elements_text(metadata->'tags') as tag(value)
            WHERE LOWER(tag.value) LIKE $1
            GROUP BY tag.value
            ORDER BY post_count DESC, tag.value
            LIMIT $2
          `, [searchQuery, limit]);
          
          return result.rows.map(tag => ({
            value: tag.tag_name,
            label: `#${tag.tag_name}`,
            type: 'hashtag',
            postCount: parseInt(tag.post_count)
          }));
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching filter suggestions:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const health = {
        database: false,
        type: this.dbType,
        initialized: this.initialized,
        timestamp: new Date().toISOString()
      };

      if (this.dbType === 'SQLite') {
        // Simple SQLite health check
        health.database = this.db.initialized;
      } else if (this.dbType === 'PostgreSQL') {
        // PostgreSQL health check
        const dbHealth = await this.db.healthCheck();
        health.database = dbHealth.database;
        health.redis = dbHealth.redis;
        health.fallback = dbHealth.fallback;
      }

      return health;
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        database: false,
        type: this.dbType,
        initialized: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  isInitialized() {
    return this.initialized;
  }

  getDatabaseType() {
    return this.dbType;
  }

  // Get posts by specific user (My Posts)
  async getMyPosts(userId, limit = 20, offset = 0) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.dbType === 'SQLite') {
        return await this.db.getMyPosts(userId, limit, offset);
      } else {
        // PostgreSQL implementation would go here
        const postsResult = await this.db.query(`
          SELECT id, title, content, author_agent, user_id, published_at, metadata, comments
          FROM agent_posts 
          WHERE user_id = $1
          ORDER BY published_at DESC 
          LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);

        const countResult = await this.db.query(`
          SELECT COUNT(*) as count FROM agent_posts 
          WHERE user_id = $1
        `, [userId]);

        return {
          posts: postsResult.rows.map(row => ({
            ...row,
            authorAgent: row.author_agent,
            publishedAt: row.published_at,
            metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
          })),
          total: parseInt(countResult.rows[0].count)
        };
      }
    } catch (error) {
      console.error('Error fetching my posts:', error);
      throw error;
    }
  }

  // Get filter counts for saved and my posts
  async getFilterCounts(userId = 'anonymous') {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.dbType === 'SQLite') {
        return await this.db.getFilterCounts(userId);
      } else {
        // PostgreSQL implementation would go here
        const savedCountResult = await this.db.query(`
          SELECT COUNT(*) as count FROM saved_posts 
          WHERE user_id = $1
        `, [userId]);

        const myPostsCountResult = await this.db.query(`
          SELECT COUNT(*) as count FROM agent_posts 
          WHERE user_id = $1
        `, [userId]);

        return {
          saved: parseInt(savedCountResult.rows[0].count) || 0,
          myPosts: parseInt(myPostsCountResult.rows[0].count) || 0
        };
      }
    } catch (error) {
      console.error('Error fetching filter counts:', error);
      return {
        saved: 0,
        myPosts: 0
      };
    }
  }

  // ==================== THREADED COMMENT METHODS ====================

  async getThreadedComments(postId) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.dbType === 'SQLite') {
        return await this.db.getThreadedComments(postId);
      } else {
        // PostgreSQL implementation would go here
        throw new Error('PostgreSQL threaded comments not implemented');
      }
    } catch (error) {
      console.error('Error fetching threaded comments:', error);
      throw error;
    }
  }

  async createComment(postId, content, authorAgent, parentId = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.dbType === 'SQLite') {
        return await this.db.createComment(postId, content, authorAgent, parentId);
      } else {
        // PostgreSQL implementation would go here
        throw new Error('PostgreSQL comment creation not implemented');
      }
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }

  async getCommentReplies(commentId, limit = 10, offset = 0) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.dbType === 'SQLite') {
        return await this.db.getCommentReplies(commentId, limit, offset);
      } else {
        // PostgreSQL implementation would go here
        throw new Error('PostgreSQL comment replies not implemented');
      }
    } catch (error) {
      console.error('Error fetching comment replies:', error);
      throw error;
    }
  }

  async getCommentById(commentId) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.dbType === 'SQLite') {
        return await this.db.getCommentById(commentId);
      } else {
        // PostgreSQL implementation would go here
        throw new Error('PostgreSQL comment retrieval not implemented');
      }
    } catch (error) {
      console.error('Error fetching comment by ID:', error);
      throw error;
    }
  }

  async generateAgentResponse(postId, parentCommentId, parentAuthor, parentContent) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.dbType === 'SQLite') {
        return await this.db.generateAgentResponse(postId, parentCommentId, parentAuthor, parentContent);
      } else {
        // PostgreSQL implementation would go here
        throw new Error('PostgreSQL agent response generation not implemented');
      }
    } catch (error) {
      console.error('Error generating agent response:', error);
      throw error;
    }
  }

  // ==================== AGENT WORKSPACE METHODS ====================

  async createAgentWorkspace(workspaceData) {
    if (!this.initialized) {
      await this.initialize();
    }

    const id = workspaceData.id || uuidv4();
    const timestamp = new Date().toISOString();

    try {
      if (this.dbType === 'SQLite') {
        const insertWorkspace = this.db.db.prepare(`
          INSERT INTO agent_workspaces (id, agent_id, workspace_path, structure, metadata)
          VALUES (?, ?, ?, ?, ?)
        `);

        insertWorkspace.run(
          id,
          workspaceData.agent_id,
          workspaceData.workspace_path,
          JSON.stringify(workspaceData.structure || {}),
          JSON.stringify(workspaceData.metadata || {})
        );
      } else {
        await this.db.query(`
          INSERT INTO agent_workspaces (id, agent_id, workspace_path, structure, metadata)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          id,
          workspaceData.agent_id,
          workspaceData.workspace_path,
          JSON.stringify(workspaceData.structure || {}),
          JSON.stringify(workspaceData.metadata || {})
        ]);
      }

      await this.logActivity({
        type: 'workspace_created',
        description: `Created workspace for agent: ${workspaceData.agent_id}`,
        agent_id: workspaceData.agent_id
      });

      return { id, ...workspaceData, created_at: timestamp };
    } catch (error) {
      console.error('Error creating agent workspace:', error);
      throw error;
    }
  }

  async getAgentWorkspace(agentId) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.dbType === 'SQLite') {
        const workspace = this.db.db.prepare(`
          SELECT * FROM agent_workspaces WHERE agent_id = ?
        `).get(agentId);

        if (workspace) {
          return {
            ...workspace,
            structure: JSON.parse(workspace.structure || '{}'),
            metadata: JSON.parse(workspace.metadata || '{}')
          };
        }
        return null;
      } else {
        const result = await this.db.query(`
          SELECT * FROM agent_workspaces WHERE agent_id = $1
        `, [agentId]);

        if (result.rows.length > 0) {
          const workspace = result.rows[0];
          return {
            ...workspace,
            structure: typeof workspace.structure === 'string' ? JSON.parse(workspace.structure) : workspace.structure,
            metadata: typeof workspace.metadata === 'string' ? JSON.parse(workspace.metadata) : workspace.metadata
          };
        }
        return null;
      }
    } catch (error) {
      console.error('Error fetching agent workspace:', error);
      throw error;
    }
  }

  async createAgentPage(pageData) {
    if (!this.initialized) {
      await this.initialize();
    }

    const id = pageData.id || uuidv4();
    const timestamp = new Date().toISOString();

    try {
      if (this.dbType === 'SQLite') {
        const insertPage = this.db.db.prepare(`
          INSERT INTO agent_pages (id, agent_id, title, page_type, content_type, content_value, content_metadata, status, tags, version)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertPage.run(
          id,
          pageData.agent_id,
          pageData.title,
          pageData.page_type || 'dynamic',
          pageData.content_type,
          pageData.content_value,
          JSON.stringify(pageData.content_metadata || {}),
          pageData.status || 'draft',
          JSON.stringify(pageData.tags || []),
          pageData.version || 1
        );
      } else {
        await this.db.query(`
          INSERT INTO agent_pages (id, agent_id, title, page_type, content_type, content_value, content_metadata, status, tags, version)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          id,
          pageData.agent_id,
          pageData.title,
          pageData.page_type || 'dynamic',
          pageData.content_type,
          pageData.content_value,
          JSON.stringify(pageData.content_metadata || {}),
          pageData.status || 'draft',
          JSON.stringify(pageData.tags || []),
          pageData.version || 1
        ]);
      }

      await this.logActivity({
        type: 'page_created',
        description: `Created page: ${pageData.title}`,
        agent_id: pageData.agent_id
      });

      return { id, ...pageData, created_at: timestamp };
    } catch (error) {
      console.error('Error creating agent page:', error);
      throw error;
    }
  }

  async getAgentPages(agentId, filters = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      let whereClause = 'WHERE agent_id = ?';
      let params = [agentId];
      let paramIndex = 2;

      // Build filter conditions
      if (filters.page_type) {
        whereClause += ` AND page_type = ?`;
        params.push(filters.page_type);
        paramIndex++;
      }
      if (filters.status) {
        whereClause += ` AND status = ?`;
        params.push(filters.status);
        paramIndex++;
      }
      if (filters.content_type) {
        whereClause += ` AND content_type = ?`;
        params.push(filters.content_type);
        paramIndex++;
      }
      if (filters.search) {
        whereClause += ` AND (title LIKE ? OR content_value LIKE ?)`;
        params.push(`%${filters.search}%`, `%${filters.search}%`);
        paramIndex += 2;
      }

      const orderBy = 'ORDER BY created_at DESC';
      const limitClause = filters.limit ? `LIMIT ${parseInt(filters.limit)}` : '';
      const offsetClause = filters.offset ? `OFFSET ${parseInt(filters.offset)}` : '';

      if (this.dbType === 'SQLite') {
        const query = `SELECT * FROM agent_pages ${whereClause} ${orderBy} ${limitClause} ${offsetClause}`;
        const pages = this.db.db.prepare(query).all(...params);

        return pages.map(page => ({
          ...page,
          content_metadata: JSON.parse(page.content_metadata || '{}'),
          tags: JSON.parse(page.tags || '[]')
        }));
      } else {
        // Convert ? placeholders to $1, $2, etc. for PostgreSQL
        let pgQuery = `SELECT * FROM agent_pages ${whereClause} ${orderBy} ${limit} ${offset}`;
        for (let i = params.length; i >= 1; i--) {
          pgQuery = pgQuery.replace('?', `$${i}`);
        }

        const result = await this.db.query(pgQuery, params);
        
        return result.rows.map(page => ({
          ...page,
          content_metadata: typeof page.content_metadata === 'string' ? JSON.parse(page.content_metadata) : page.content_metadata,
          tags: typeof page.tags === 'string' ? JSON.parse(page.tags) : page.tags
        }));
      }
    } catch (error) {
      console.error('Error fetching agent pages:', error);
      throw error;
    }
  }

  async getAgentPage(agentId, pageId) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.dbType === 'SQLite') {
        const page = this.db.db.prepare(`
          SELECT * FROM agent_pages WHERE agent_id = ? AND id = ?
        `).get(agentId, pageId);

        if (page) {
          return {
            ...page,
            content_metadata: JSON.parse(page.content_metadata || '{}'),
            tags: JSON.parse(page.tags || '[]')
          };
        }
        return null;
      } else {
        const result = await this.db.query(`
          SELECT * FROM agent_pages WHERE agent_id = $1 AND id = $2
        `, [agentId, pageId]);

        if (result.rows.length > 0) {
          const page = result.rows[0];
          return {
            ...page,
            content_metadata: typeof page.content_metadata === 'string' ? JSON.parse(page.content_metadata) : page.content_metadata,
            tags: typeof page.tags === 'string' ? JSON.parse(page.tags) : page.tags
          };
        }
        return null;
      }
    } catch (error) {
      console.error('Error fetching agent page:', error);
      throw error;
    }
  }

  async updateAgentPage(agentId, pageId, updateData) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const setClause = [];
      const params = [];
      let paramIndex = 1;

      // Build dynamic update fields
      if (updateData.title !== undefined) {
        setClause.push(`title = ?`);
        params.push(updateData.title);
        paramIndex++;
      }
      if (updateData.content_value !== undefined) {
        setClause.push(`content_value = ?`);
        params.push(updateData.content_value);
        paramIndex++;
      }
      if (updateData.content_metadata !== undefined) {
        setClause.push(`content_metadata = ?`);
        params.push(JSON.stringify(updateData.content_metadata));
        paramIndex++;
      }
      if (updateData.status !== undefined) {
        setClause.push(`status = ?`);
        params.push(updateData.status);
        paramIndex++;
      }
      if (updateData.tags !== undefined) {
        setClause.push(`tags = ?`);
        params.push(JSON.stringify(updateData.tags));
        paramIndex++;
      }

      setClause.push(`updated_at = ?`);
      params.push(new Date().toISOString());
      paramIndex++;

      // Add WHERE conditions
      params.push(agentId, pageId);

      if (this.dbType === 'SQLite') {
        const updateQuery = `
          UPDATE agent_pages 
          SET ${setClause.join(', ')}
          WHERE agent_id = ? AND id = ?
        `;
        
        const result = this.db.db.prepare(updateQuery).run(...params);
        
        if (result.changes > 0) {
          return this.getAgentPage(agentId, pageId);
        }
        return null;
      } else {
        // Convert to PostgreSQL format
        let pgQuery = `UPDATE agent_pages SET ${setClause.join(', ')} WHERE agent_id = $${paramIndex} AND id = $${paramIndex + 1}`;
        for (let i = params.length - 2; i >= 1; i--) {
          pgQuery = pgQuery.replace('?', `$${i}`);
        }

        const result = await this.db.query(pgQuery, params);
        
        if (result.rowCount > 0) {
          return this.getAgentPage(agentId, pageId);
        }
        return null;
      }
    } catch (error) {
      console.error('Error updating agent page:', error);
      throw error;
    }
  }

  async deleteAgentPage(agentId, pageId) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.dbType === 'SQLite') {
        const result = this.db.db.prepare(`
          DELETE FROM agent_pages WHERE agent_id = ? AND id = ?
        `).run(agentId, pageId);
        
        return result.changes > 0;
      } else {
        const result = await this.db.query(`
          DELETE FROM agent_pages WHERE agent_id = $1 AND id = $2
        `, [agentId, pageId]);
        
        return result.rowCount > 0;
      }
    } catch (error) {
      console.error('Error deleting agent page:', error);
      throw error;
    }
  }

  // ==================== PAGE BUILDER METHODS ====================
  
  /**
   * Create a new page (used by PageBuilderService)
   */
  async createPage(pageData) {
    if (!this.initialized) {
      await this.initialize();
    }

    const id = pageData.id || uuidv4();
    const timestamp = new Date().toISOString();

    try {
      if (this.dbType === 'SQLite') {
        const insertPage = this.db.db.prepare(`
          INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, content_metadata, status, tags, version, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertPage.run(
          id,
          pageData.agentId,
          pageData.title,
          pageData.content_type || 'json',
          typeof pageData.content === 'string' ? pageData.content : JSON.stringify(pageData.content || {}),
          JSON.stringify(pageData.content_metadata || {}),
          pageData.status || 'draft',
          JSON.stringify(pageData.tags || []),
          pageData.version || 1,
          timestamp,
          timestamp
        );
      } else {
        await this.db.query(`
          INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, content_metadata, status, tags, version, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          id,
          pageData.agentId,
          pageData.title,
          pageData.content_type || 'json',
          typeof pageData.content === 'string' ? pageData.content : JSON.stringify(pageData.content || {}),
          JSON.stringify(pageData.content_metadata || {}),
          pageData.status || 'draft',
          JSON.stringify(pageData.tags || []),
          pageData.version || 1,
          timestamp,
          timestamp
        ]);
      }

      await this.logActivity({
        type: 'page_created',
        description: `Created page: ${pageData.title}`,
        agent_id: pageData.agentId
      });

      return { id, ...pageData, created_at: timestamp, updated_at: timestamp };
    } catch (error) {
      console.error('Error creating page:', error);
      throw error;
    }
  }

  /**
   * Get a page by ID (used by PageBuilderService)
   */
  async getPage(pageId) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.dbType === 'SQLite') {
        const page = this.db.db.prepare(`
          SELECT * FROM agent_pages WHERE id = ?
        `).get(pageId);

        if (page) {
          return {
            ...page,
            content: page.content_value,
            content_metadata: JSON.parse(page.content_metadata || '{}'),
            tags: JSON.parse(page.tags || '[]')
          };
        }
        return null;
      } else {
        const result = await this.db.query(`
          SELECT * FROM agent_pages WHERE id = $1
        `, [pageId]);

        if (result.rows.length > 0) {
          const page = result.rows[0];
          return {
            ...page,
            content: page.content_value,
            content_metadata: typeof page.content_metadata === 'string' ? JSON.parse(page.content_metadata) : page.content_metadata,
            tags: typeof page.tags === 'string' ? JSON.parse(page.tags) : page.tags
          };
        }
        return null;
      }
    } catch (error) {
      console.error('Error fetching page:', error);
      throw error;
    }
  }

  /**
   * Update a page (used by PageBuilderService)
   */
  async updatePage(pageId, updateData) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const setClause = [];
      const params = [];
      let paramIndex = 1;

      // Build dynamic update fields
      if (updateData.title !== undefined) {
        setClause.push(`title = ?`);
        params.push(updateData.title);
      }
      if (updateData.content !== undefined) {
        setClause.push(`content_value = ?`);
        params.push(typeof updateData.content === 'string' ? updateData.content : JSON.stringify(updateData.content));
      }
      if (updateData.content_metadata !== undefined) {
        setClause.push(`content_metadata = ?`);
        params.push(JSON.stringify(updateData.content_metadata));
      }
      if (updateData.status !== undefined) {
        setClause.push(`status = ?`);
        params.push(updateData.status);
      }
      if (updateData.tags !== undefined) {
        setClause.push(`tags = ?`);
        params.push(JSON.stringify(updateData.tags));
      }
      if (updateData.version !== undefined) {
        setClause.push(`version = ?`);
        params.push(updateData.version);
      }

      setClause.push(`updated_at = ?`);
      params.push(new Date().toISOString());

      // Add WHERE condition
      params.push(pageId);

      if (this.dbType === 'SQLite') {
        const updateQuery = `
          UPDATE agent_pages 
          SET ${setClause.join(', ')}
          WHERE id = ?
        `;
        
        const result = this.db.db.prepare(updateQuery).run(...params);
        
        if (result.changes > 0) {
          return this.getPage(pageId);
        }
        return null;
      } else {
        // Convert to PostgreSQL format
        let pgQuery = `UPDATE agent_pages SET ${setClause.join(', ')} WHERE id = $${params.length}`;
        for (let i = params.length - 1; i >= 1; i--) {
          pgQuery = pgQuery.replace('?', `$${i}`);
        }

        const result = await this.db.query(pgQuery, params);
        
        if (result.rowCount > 0) {
          return this.getPage(pageId);
        }
        return null;
      }
    } catch (error) {
      console.error('Error updating page:', error);
      throw error;
    }
  }

  /**
   * Delete a page (used by PageBuilderService)
   */
  async deletePage(pageId) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.dbType === 'SQLite') {
        const result = this.db.db.prepare(`
          DELETE FROM agent_pages WHERE id = ?
        `).run(pageId);
        
        return result.changes > 0;
      } else {
        const result = await this.db.query(`
          DELETE FROM agent_pages WHERE id = $1
        `, [pageId]);
        
        return result.rowCount > 0;
      }
    } catch (error) {
      console.error('Error deleting page:', error);
      throw error;
    }
  }

  /**
   * Get workspace information (used by PageBuilderService)
   */
  async getWorkspace(workspaceId) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.dbType === 'SQLite') {
        const workspace = this.db.db.prepare(`
          SELECT * FROM agent_workspaces WHERE id = ? OR agent_id = ?
        `).get(workspaceId, workspaceId);

        if (workspace) {
          return {
            ...workspace,
            structure: JSON.parse(workspace.structure || '{}'),
            metadata: JSON.parse(workspace.metadata || '{}')
          };
        }
        
        // Return default workspace if none found
        return {
          id: workspaceId,
          agent_id: workspaceId,
          workspace_path: '/default',
          structure: {},
          metadata: {}
        };
      } else {
        const result = await this.db.query(`
          SELECT * FROM agent_workspaces WHERE id = $1 OR agent_id = $1
        `, [workspaceId]);

        if (result.rows.length > 0) {
          const workspace = result.rows[0];
          return {
            ...workspace,
            structure: typeof workspace.structure === 'string' ? JSON.parse(workspace.structure) : workspace.structure,
            metadata: typeof workspace.metadata === 'string' ? JSON.parse(workspace.metadata) : workspace.metadata
          };
        }
        
        // Return default workspace if none found
        return {
          id: workspaceId,
          agent_id: workspaceId,
          workspace_path: '/default',
          structure: {},
          metadata: {}
        };
      }
    } catch (error) {
      console.error('Error fetching workspace:', error);
      // Return default workspace on error
      return {
        id: workspaceId,
        agent_id: workspaceId,
        workspace_path: '/default',
        structure: {},
        metadata: {}
      };
    }
  }

  /**
   * Check workspace access for an agent (used by PageBuilderService)
   */
  async checkWorkspaceAccess(agentId, workspaceId) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // For now, allow access if the agent exists or if it's their own workspace
      if (agentId === workspaceId) {
        return true;
      }

      // Check if agent exists
      const agents = await this.getAgents();
      const agentExists = agents.some(agent => agent.id === agentId || agent.name === agentId);
      
      if (agentExists) {
        // In a real implementation, you'd check permissions here
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking workspace access:', error);
      return false;
    }
  }

  /**
   * List pages with filtering (used by PageBuilderService)
   */
  async listPages(options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      agentId,
      limit = 20,
      offset = 0,
      sortBy = 'updated_at',
      sortOrder = 'DESC'
    } = options;

    try {
      let whereClause = '';
      let params = [];
      
      if (agentId) {
        whereClause = 'WHERE agent_id = ?';
        params.push(agentId);
      }
      
      const orderClause = `ORDER BY ${sortBy} ${sortOrder}`;
      const limitClause = `LIMIT ${limit} OFFSET ${offset}`;

      if (this.dbType === 'SQLite') {
        const query = `SELECT * FROM agent_pages ${whereClause} ${orderClause} ${limitClause}`;
        const pages = this.db.db.prepare(query).all(...params);

        return pages.map(page => ({
          ...page,
          content: page.content_value,
          content_metadata: JSON.parse(page.content_metadata || '{}'),
          tags: JSON.parse(page.tags || '[]')
        }));
      } else {
        let pgQuery = `SELECT * FROM agent_pages ${whereClause} ${orderClause} ${limitClause}`;
        for (let i = params.length; i >= 1; i--) {
          pgQuery = pgQuery.replace('?', `$${i}`);
        }

        const result = await this.db.query(pgQuery, params);
        
        return result.rows.map(page => ({
          ...page,
          content: page.content_value,
          content_metadata: typeof page.content_metadata === 'string' ? JSON.parse(page.content_metadata) : page.content_metadata,
          tags: typeof page.tags === 'string' ? JSON.parse(page.tags) : page.tags
        }));
      }
    } catch (error) {
      console.error('Error listing pages:', error);
      return [];
    }
  }

  /**
   * List workspace pages (used by PageBuilderService)
   */
  async listWorkspacePages(options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      workspaceId,
      agentId,
      limit = 20,
      offset = 0,
      sortBy = 'updated_at',
      sortOrder = 'DESC'
    } = options;

    try {
      let whereClause = '';
      let params = [];
      
      // For workspace pages, we can filter by either workspace ID or agent ID
      if (workspaceId && agentId) {
        whereClause = 'WHERE (agent_id = ? OR agent_id = ?)';
        params.push(workspaceId, agentId);
      } else if (workspaceId) {
        whereClause = 'WHERE agent_id = ?';
        params.push(workspaceId);
      } else if (agentId) {
        whereClause = 'WHERE agent_id = ?';
        params.push(agentId);
      }
      
      const orderClause = `ORDER BY ${sortBy} ${sortOrder}`;
      const limitClause = `LIMIT ${limit} OFFSET ${offset}`;

      if (this.dbType === 'SQLite') {
        const query = `SELECT * FROM agent_pages ${whereClause} ${orderClause} ${limitClause}`;
        const pages = this.db.db.prepare(query).all(...params);

        return pages.map(page => ({
          ...page,
          content: page.content_value,
          content_metadata: JSON.parse(page.content_metadata || '{}'),
          tags: JSON.parse(page.tags || '[]')
        }));
      } else {
        let pgQuery = `SELECT * FROM agent_pages ${whereClause} ${orderClause} ${limitClause}`;
        for (let i = params.length; i >= 1; i--) {
          pgQuery = pgQuery.replace('?', `$${i}`);
        }

        const result = await this.db.query(pgQuery, params);
        
        return result.rows.map(page => ({
          ...page,
          content: page.content_value,
          content_metadata: typeof page.content_metadata === 'string' ? JSON.parse(page.content_metadata) : page.content_metadata,
          tags: typeof page.tags === 'string' ? JSON.parse(page.tags) : page.tags
        }));
      }
    } catch (error) {
      console.error('Error listing workspace pages:', error);
      return [];
    }
  }

  close() {
    if (this.db && this.dbType === 'SQLite') {
      this.db.close();
    } else if (this.db && this.dbType === 'PostgreSQL') {
      this.db.close();
    }
    this.initialized = false;
  }
}

// Singleton instance
export const databaseService = new DatabaseService();
export default databaseService;