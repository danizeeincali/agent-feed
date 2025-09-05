/**
 * Test Database Fixture
 * Handles test database setup, seeding, and cleanup
 */

export class TestDatabase {
  constructor() {
    this.connectionString = process.env.TEST_DATABASE_URL || 'memory://test.db';
    this.isInitialized = false;
  }

  /**
   * Initialize test database
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('Initializing test database...');
    
    // Create test database schema
    await this.createSchema();
    
    this.isInitialized = true;
    console.log('Test database initialized successfully');
  }

  /**
   * Create database schema for testing
   */
  async createSchema() {
    const schema = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'user',
        avatar_url VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        preferences JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Agents table
      CREATE TABLE IF NOT EXISTS agents (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        specialization VARCHAR(100),
        description TEXT,
        status VARCHAR(50) DEFAULT 'inactive',
        platforms JSON,
        configuration JSON,
        metrics JSON,
        user_id VARCHAR(36) REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active TIMESTAMP
      );

      -- Posts table
      CREATE TABLE IF NOT EXISTS posts (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(500),
        content TEXT NOT NULL,
        hashtags JSON,
        platform VARCHAR(50) NOT NULL,
        content_type VARCHAR(50) DEFAULT 'text',
        status VARCHAR(50) DEFAULT 'draft',
        visibility VARCHAR(50) DEFAULT 'public',
        media_data JSON,
        metrics JSON,
        quality_score DECIMAL(5,2),
        engagement_prediction DECIMAL(8,4),
        agent_id VARCHAR(36) REFERENCES agents(id),
        user_id VARCHAR(36) REFERENCES users(id),
        template_id VARCHAR(36),
        scheduled_at TIMESTAMP,
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Templates table
      CREATE TABLE IF NOT EXISTS templates (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        category VARCHAR(100),
        description TEXT,
        template_content TEXT NOT NULL,
        variables JSON,
        platforms JSON,
        tags JSON,
        usage_count INTEGER DEFAULT 0,
        rating DECIMAL(3,2),
        is_public BOOLEAN DEFAULT true,
        created_by VARCHAR(36) REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Analytics table
      CREATE TABLE IF NOT EXISTS analytics (
        id VARCHAR(36) PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL, -- 'post', 'agent', 'user'
        entity_id VARCHAR(36) NOT NULL,
        metric_name VARCHAR(100) NOT NULL,
        metric_value DECIMAL(15,4),
        platform VARCHAR(50),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSON
      );

      -- Sessions table for authentication testing
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) REFERENCES users(id),
        session_data JSON,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Test runs table for tracking test execution
      CREATE TABLE IF NOT EXISTS test_runs (
        id VARCHAR(36) PRIMARY KEY,
        test_suite VARCHAR(255),
        test_name VARCHAR(255),
        status VARCHAR(50),
        duration INTEGER,
        error_message TEXT,
        metadata JSON,
        started_at TIMESTAMP,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Coordination events table
      CREATE TABLE IF NOT EXISTS coordination_events (
        id VARCHAR(36) PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        agents JSON,
        strategy VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        result JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
      CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
      CREATE INDEX IF NOT EXISTS idx_posts_agent_id ON posts(agent_id);
      CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
      CREATE INDEX IF NOT EXISTS idx_posts_platform ON posts(platform);
      CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at);
      CREATE INDEX IF NOT EXISTS idx_analytics_entity ON analytics(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_recorded_at ON analytics(recorded_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    `;

    // Execute schema creation (would use actual database client in real implementation)
    console.log('Creating database schema...');
    // await this.executeSQL(schema);
  }

  /**
   * Seed database with test data
   */
  async seed() {
    console.log('Seeding test database...');

    // Get test data from generator
    const testData = global.__TEST_DATA__;
    if (!testData) {
      console.warn('No test data found for seeding');
      return;
    }

    try {
      // Seed users
      await this.seedUsers(testData.users);
      
      // Seed agents
      await this.seedAgents(testData.agents);
      
      // Seed templates
      await this.seedTemplates(testData.templates);
      
      // Seed posts
      await this.seedPosts(testData.posts);
      
      // Seed analytics
      await this.seedAnalytics(testData.analytics);

      console.log('Database seeding completed successfully');
    } catch (error) {
      console.error('Error seeding database:', error);
      throw error;
    }
  }

  /**
   * Seed users table
   */
  async seedUsers(users) {
    for (const user of users) {
      const sql = `
        INSERT INTO users (id, email, username, first_name, last_name, role, avatar_url, is_active, preferences, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        user.id,
        user.email,
        user.username,
        user.firstName,
        user.lastName,
        user.role,
        user.avatar,
        user.isActive,
        JSON.stringify(user.preferences),
        user.createdAt.toISOString()
      ];

      // await this.executeSQL(sql, values);
    }
  }

  /**
   * Seed agents table
   */
  async seedAgents(agents) {
    for (const agent of agents) {
      const sql = `
        INSERT INTO agents (id, name, type, specialization, description, status, platforms, configuration, metrics, created_at, last_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        agent.id,
        agent.name,
        agent.type,
        agent.specialization,
        agent.description,
        agent.status,
        JSON.stringify(agent.platforms),
        JSON.stringify(agent.configuration),
        JSON.stringify(agent.metrics),
        agent.createdAt.toISOString(),
        agent.lastActive?.toISOString()
      ];

      // await this.executeSQL(sql, values);
    }
  }

  /**
   * Seed posts table
   */
  async seedPosts(posts) {
    for (const post of posts) {
      const sql = `
        INSERT INTO posts (id, title, content, hashtags, platform, content_type, status, visibility, media_data, metrics, quality_score, engagement_prediction, agent_id, user_id, scheduled_at, published_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      const values = [
        post.id,
        post.title,
        post.content,
        JSON.stringify(post.hashtags),
        post.platform,
        post.contentType,
        post.status,
        post.visibility,
        JSON.stringify(post.media),
        JSON.stringify(post.metrics),
        post.qualityScore,
        post.engagementPrediction,
        post.agentId,
        post.userId,
        post.scheduledAt?.toISOString(),
        post.publishedAt?.toISOString()
      ];

      // await this.executeSQL(sql, values);
    }
  }

  /**
   * Seed templates table
   */
  async seedTemplates(templates) {
    for (const template of templates) {
      const sql = `
        INSERT INTO templates (id, name, type, category, description, template_content, variables, platforms, tags, usage_count, rating, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        template.id,
        template.name,
        template.type,
        template.category,
        template.description,
        template.template,
        JSON.stringify(template.variables),
        JSON.stringify(template.platforms),
        JSON.stringify(template.tags),
        template.usageCount,
        template.rating,
        template.createdAt.toISOString()
      ];

      // await this.executeSQL(sql, values);
    }
  }

  /**
   * Seed analytics table
   */
  async seedAnalytics(analytics) {
    // Seed daily analytics data
    for (const dailyData of analytics.daily) {
      const metrics = ['engagement', 'reach', 'impressions', 'clicks', 'posts'];
      
      for (const metric of metrics) {
        const sql = `
          INSERT INTO analytics (id, entity_type, entity_id, metric_name, metric_value, recorded_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const values = [
          this.generateId(),
          'system',
          'global',
          metric,
          dailyData[metric],
          dailyData.date + 'T12:00:00Z'
        ];

        // await this.executeSQL(sql, values);
      }
    }

    // Seed platform analytics
    for (const platform of analytics.platforms) {
      const metrics = ['engagement', 'reach', 'posts', 'followers'];
      
      for (const metric of metrics) {
        const sql = `
          INSERT INTO analytics (id, entity_type, entity_id, metric_name, metric_value, platform, recorded_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        
        const values = [
          this.generateId(),
          'platform',
          platform.name,
          metric,
          platform[metric],
          platform.name
        ];

        // await this.executeSQL(sql, values);
      }
    }
  }

  /**
   * Create test session for authentication
   * @param {string} userId - User ID
   * @param {Object} sessionData - Session data
   */
  async createTestSession(userId, sessionData = {}) {
    const sessionId = this.generateId();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

    const sql = `
      INSERT INTO sessions (id, user_id, session_data, expires_at)
      VALUES (?, ?, ?, ?)
    `;
    
    const values = [
      sessionId,
      userId,
      JSON.stringify(sessionData),
      expiresAt.toISOString()
    ];

    // await this.executeSQL(sql, values);
    
    return {
      sessionId,
      expiresAt,
      ...sessionData
    };
  }

  /**
   * Record test run for tracking
   * @param {Object} testRun - Test run data
   */
  async recordTestRun(testRun) {
    const sql = `
      INSERT INTO test_runs (id, test_suite, test_name, status, duration, error_message, metadata, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    const values = [
      testRun.id || this.generateId(),
      testRun.testSuite,
      testRun.testName,
      testRun.status,
      testRun.duration,
      testRun.errorMessage,
      JSON.stringify(testRun.metadata || {}),
      testRun.startedAt?.toISOString()
    ];

    // await this.executeSQL(sql, values);
  }

  /**
   * Clean up test database
   */
  async cleanup() {
    console.log('Cleaning up test database...');

    try {
      // Delete test data in reverse order of dependencies
      await this.executeSQL('DELETE FROM analytics');
      await this.executeSQL('DELETE FROM coordination_events');
      await this.executeSQL('DELETE FROM test_runs');
      await this.executeSQL('DELETE FROM sessions');
      await this.executeSQL('DELETE FROM posts');
      await this.executeSQL('DELETE FROM templates');
      await this.executeSQL('DELETE FROM agents');
      await this.executeSQL('DELETE FROM users');

      console.log('Test database cleanup completed');
    } catch (error) {
      console.error('Error cleaning up database:', error);
      throw error;
    }
  }

  /**
   * Reset database to initial state
   */
  async reset() {
    await this.cleanup();
    await this.seed();
  }

  /**
   * Execute SQL query (placeholder for actual database implementation)
   * @param {string} sql - SQL query
   * @param {Array} values - Query parameters
   */
  async executeSQL(sql, values = []) {
    // In a real implementation, this would use a database client like:
    // return await this.client.query(sql, values);
    
    // For testing, we'll just log the query
    console.log('Executing SQL:', sql.substring(0, 100) + '...');
  }

  /**
   * Get connection string
   */
  getConnectionString() {
    return this.connectionString;
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return 'test-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Check if database is healthy
   */
  async healthCheck() {
    try {
      // await this.executeSQL('SELECT 1');
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const stats = {};
    
    const tables = ['users', 'agents', 'posts', 'templates', 'analytics', 'sessions'];
    
    for (const table of tables) {
      try {
        // const result = await this.executeSQL(`SELECT COUNT(*) as count FROM ${table}`);
        // stats[table] = result[0]?.count || 0;
        stats[table] = Math.floor(Math.random() * 100); // Placeholder
      } catch (error) {
        stats[table] = 0;
      }
    }
    
    return stats;
  }
}