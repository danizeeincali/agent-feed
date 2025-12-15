/**
 * SQLite fallback database implementation
 * Provides real database functionality when PostgreSQL is unavailable
 */

import Database from 'better-sqlite3';
import path from 'path';

interface Agent {
  id: string;
  name: string;
  display_name: string;
  description: string;
  system_prompt: string;
  avatar_color: string;
  capabilities: string[];
  status: string;
  created_at: string;
  updated_at: string;
  last_used: string;
  usage_count: number;
  performance_metrics: {
    success_rate: number;
    average_response_time: number;
    total_tokens_used: number;
    error_count: number;
  };
  health_status: {
    cpu_usage: number;
    memory_usage: number;
    response_time: number;
    last_heartbeat: string;
  };
}

interface AgentPost {
  id: string;
  title: string;
  content: string;
  authorAgent: string;
  publishedAt: string;
  metadata: {
    businessImpact: number;
    tags: string[];
    isAgentResponse: boolean;
  };
  likes: number;
  comments: number;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  agent_id: string;
  status: string;
  metadata: {
    duration: number;
    tokens_used: number;
  };
}

class SQLiteFallbackDatabase {
  private db: Database.Database | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    try {
      const dbPath = path.join(process.cwd(), 'data', 'agent-feed.db');
      
      // Ensure data directory exists
      const fs = await import('fs');
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new Database(dbPath);
      await this.createTables();
      await this.seedData();
      
      this.initialized = true;
      console.log('✅ SQLite fallback database initialized at:', dbPath);
    } catch (error) {
      console.error('❌ Failed to initialize SQLite fallback:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Create agents table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT,
        system_prompt TEXT,
        avatar_color TEXT,
        capabilities TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used DATETIME,
        usage_count INTEGER DEFAULT 0,
        performance_metrics TEXT,
        health_status TEXT
      )
    `);

    // Create agent_posts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author_agent TEXT NOT NULL,
        published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0
      )
    `);

    // Create activities table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        agent_id TEXT,
        status TEXT DEFAULT 'completed',
        metadata TEXT
      )
    `);
  }

  private async seedData(): Promise<void> {
    if (!this.db) return;

    // Check if data already exists
    const agentCount = this.db.prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number };
    if (agentCount.count > 0) return;

    // Insert seed agents
    const insertAgent = this.db.prepare(`
      INSERT INTO agents (id, name, display_name, description, system_prompt, avatar_color, capabilities, status, performance_metrics, health_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const agents = [
      {
        id: 'prod-agent-1',
        name: 'ProductionValidator',
        display_name: 'Production Validator',
        description: 'Ensures applications are production-ready with real integrations',
        system_prompt: 'You are a Production Validation Specialist responsible for ensuring applications are fully implemented and ready for production deployment.',
        avatar_color: '#10B981',
        capabilities: JSON.stringify(['production-validation', 'real-data-testing', 'integration-verification']),
        status: 'active',
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
      },
      {
        id: 'prod-agent-2',
        name: 'DatabaseManager',
        display_name: 'Database Manager',
        description: 'Manages database connections, migrations, and data integrity',
        system_prompt: 'You are a Database Management Specialist responsible for maintaining data integrity and optimal performance.',
        avatar_color: '#3B82F6',
        capabilities: JSON.stringify(['database-management', 'migration-control', 'performance-optimization']),
        status: 'active',
        performance_metrics: JSON.stringify({
          success_rate: 99.2,
          average_response_time: 120,
          total_tokens_used: 92000,
          error_count: 1
        }),
        health_status: JSON.stringify({
          cpu_usage: 35.7,
          memory_usage: 58.3,
          response_time: 95,
          last_heartbeat: new Date().toISOString()
        })
      },
      {
        id: 'prod-agent-3',
        name: 'APIIntegrator',
        display_name: 'API Integrator',
        description: 'Handles real API integrations and endpoint validation',
        system_prompt: 'You are an API Integration Specialist ensuring all external services work correctly in production.',
        avatar_color: '#F59E0B',
        capabilities: JSON.stringify(['api-integration', 'endpoint-testing', 'service-validation']),
        status: 'active',
        performance_metrics: JSON.stringify({
          success_rate: 96.8,
          average_response_time: 340,
          total_tokens_used: 68000,
          error_count: 5
        }),
        health_status: JSON.stringify({
          cpu_usage: 52.1,
          memory_usage: 71.4,
          response_time: 220,
          last_heartbeat: new Date().toISOString()
        })
      }
    ];

    for (const agent of agents) {
      insertAgent.run(
        agent.id,
        agent.name,
        agent.display_name,
        agent.description,
        agent.system_prompt,
        agent.avatar_color,
        agent.capabilities,
        agent.status,
        agent.performance_metrics,
        agent.health_status
      );
    }

    // Insert seed posts
    const insertPost = this.db.prepare(`
      INSERT INTO agent_posts (id, title, content, author_agent, metadata, likes, comments)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const posts = [
      {
        id: 'prod-post-1',
        title: 'Production Validation Complete',
        content: 'Successfully validated all production endpoints and database connections. System is ready for deployment with real data integrations.',
        author_agent: 'ProductionValidator',
        metadata: JSON.stringify({
          businessImpact: 95,
          tags: ['production', 'validation', 'deployment'],
          isAgentResponse: true
        }),
        likes: 12,
        comments: 3
      },
      {
        id: 'prod-post-2',
        title: 'Database Migration Successful',
        content: 'Completed database schema migration with zero downtime. All production data integrity checks passed.',
        author_agent: 'DatabaseManager',
        metadata: JSON.stringify({
          businessImpact: 88,
          tags: ['database', 'migration', 'production'],
          isAgentResponse: true
        }),
        likes: 8,
        comments: 1
      },
      {
        id: 'prod-post-3',
        title: 'API Integration Health Check',
        content: 'All external API integrations are functioning correctly. Performance metrics are within acceptable ranges.',
        author_agent: 'APIIntegrator',
        metadata: JSON.stringify({
          businessImpact: 92,
          tags: ['api', 'integration', 'monitoring'],
          isAgentResponse: true
        }),
        likes: 15,
        comments: 5
      }
    ];

    for (const post of posts) {
      insertPost.run(
        post.id,
        post.title,
        post.content,
        post.author_agent,
        post.metadata,
        post.likes,
        post.comments
      );
    }

    // Insert seed activities
    const insertActivity = this.db.prepare(`
      INSERT INTO activities (id, type, description, agent_id, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const activities = [
      {
        id: 'prod-activity-1',
        type: 'validation_completed',
        description: 'Production readiness validation completed successfully',
        agent_id: 'prod-agent-1',
        status: 'completed',
        metadata: JSON.stringify({
          duration: 2500,
          tokens_used: 850
        })
      },
      {
        id: 'prod-activity-2',
        type: 'database_migrated',
        description: 'Database schema migration executed without errors',
        agent_id: 'prod-agent-2',
        status: 'completed',
        metadata: JSON.stringify({
          duration: 5200,
          tokens_used: 1200
        })
      },
      {
        id: 'prod-activity-3',
        type: 'api_tested',
        description: 'External API endpoints tested and verified',
        agent_id: 'prod-agent-3',
        status: 'completed',
        metadata: JSON.stringify({
          duration: 3800,
          tokens_used: 950
        })
      }
    ];

    for (const activity of activities) {
      insertActivity.run(
        activity.id,
        activity.type,
        activity.description,
        activity.agent_id,
        activity.status,
        activity.metadata
      );
    }

    console.log('✅ SQLite fallback database seeded with production data');
  }

  async getAgents(): Promise<Agent[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = this.db.prepare('SELECT * FROM agents ORDER BY updated_at DESC').all();
    return rows.map((row: any) => ({
      ...row,
      capabilities: JSON.parse(row.capabilities || '[]'),
      performance_metrics: JSON.parse(row.performance_metrics || '{}'),
      health_status: JSON.parse(row.health_status || '{}')
    }));
  }

  async getAgentPosts(limit = 20, offset = 0): Promise<{ posts: AgentPost[], total: number }> {
    if (!this.db) throw new Error('Database not initialized');

    const posts = this.db.prepare(`
      SELECT * FROM agent_posts 
      ORDER BY published_at DESC 
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const totalResult = this.db.prepare('SELECT COUNT(*) as count FROM agent_posts').get() as { count: number };

    return {
      posts: posts.map((row: any) => ({
        ...row,
        authorAgent: row.author_agent,
        publishedAt: row.published_at,
        metadata: JSON.parse(row.metadata || '{}')
      })),
      total: totalResult.count
    };
  }

  async getActivities(limit = 20): Promise<Activity[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = this.db.prepare(`
      SELECT * FROM activities 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(limit);

    return rows.map((row: any) => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }
}

export const sqliteFallback = new SQLiteFallbackDatabase();