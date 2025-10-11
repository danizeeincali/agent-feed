/**
 * Database Test Helper
 *
 * Provides utilities for integration tests with REAL PostgreSQL:
 * - Database connection management
 * - Schema setup and teardown
 * - Test data fixtures
 * - Query helpers
 */

import { Pool, PoolConfig } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface TestDatabaseConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
}

export class DatabaseTestHelper {
  private pool: Pool;
  private config: PoolConfig;

  constructor(config?: TestDatabaseConfig) {
    this.config = {
      host: config?.host || process.env.DB_HOST || 'localhost',
      port: config?.port || parseInt(process.env.DB_PORT || '5432'),
      database: config?.database || 'avidm_test',
      user: config?.user || process.env.DB_USER || 'postgres',
      password: config?.password || process.env.DB_PASSWORD || 'postgres',
    };

    this.pool = new Pool(this.config);
  }

  /**
   * Get the connection pool
   */
  getPool(): Pool {
    return this.pool;
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    try {
      await this.pool.query('SELECT 1');
    } catch (error) {
      throw new Error(`Failed to connect to test database: ${error}`);
    }
  }

  /**
   * Clean the database by dropping and recreating the public schema
   */
  async clean(): Promise<void> {
    await this.pool.query('DROP SCHEMA public CASCADE');
    await this.pool.query('CREATE SCHEMA public');
    await this.pool.query('GRANT ALL ON SCHEMA public TO postgres');
    await this.pool.query('GRANT ALL ON SCHEMA public TO public');
  }

  /**
   * Setup the database schema from SQL files
   */
  async setupSchema(): Promise<void> {
    const schemaPath = path.join(__dirname, '../../../src/database/schema/001_initial_schema.sql');
    const schemaSQL = await fs.readFile(schemaPath, 'utf-8');
    await this.pool.query(schemaSQL);
  }

  /**
   * Setup indexes from SQL file
   */
  async setupIndexes(): Promise<void> {
    const indexesPath = path.join(__dirname, '../../../src/database/schema/indexes.sql');
    const indexesSQL = await fs.readFile(indexesPath, 'utf-8');
    await this.pool.query(indexesSQL);
  }

  /**
   * Clean and setup schema in one step
   */
  async reset(): Promise<void> {
    await this.clean();
    await this.setupSchema();
  }

  /**
   * Seed system templates
   */
  async seedTemplates(): Promise<void> {
    await this.pool.query(`
      INSERT INTO system_agent_templates (
        name, version, posting_rules, api_schema, safety_constraints, default_personality
      ) VALUES
        (
          'tech-guru',
          1,
          '{"max_length": 280, "rate_limit_per_hour": 10}'::jsonb,
          '{"endpoint": "/api/post", "auth_type": "bearer"}'::jsonb,
          '{"prohibited_words": ["spam"], "max_mentions_per_post": 3}'::jsonb,
          'You are a tech-savvy AI assistant focused on technology trends.'
        ),
        (
          'creative-writer',
          1,
          '{"max_length": 500, "rate_limit_per_hour": 5}'::jsonb,
          '{"endpoint": "/api/post", "auth_type": "bearer"}'::jsonb,
          '{"prohibited_words": [], "max_mentions_per_post": 5}'::jsonb,
          'You are a creative writer who loves storytelling and wordplay.'
        ),
        (
          'data-analyst',
          1,
          '{"max_length": 280, "rate_limit_per_hour": 15}'::jsonb,
          '{"endpoint": "/api/post", "auth_type": "bearer"}'::jsonb,
          '{"prohibited_words": [], "max_mentions_per_post": 2}'::jsonb,
          'You are a data analyst who communicates insights clearly.'
        )
      ON CONFLICT (name) DO NOTHING
    `);
  }

  /**
   * Insert test user customizations
   */
  async insertCustomizations(userId: string, templateName: string, customName?: string): Promise<number> {
    const result = await this.pool.query(
      `
      INSERT INTO user_agent_customizations (user_id, agent_template, custom_name, enabled)
      VALUES ($1, $2, $3, TRUE)
      RETURNING id
    `,
      [userId, templateName, customName || `${userId}'s ${templateName}`]
    );
    return result.rows[0].id;
  }

  /**
   * Insert test memories
   */
  async insertMemory(
    userId: string,
    agentName: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<number> {
    const result = await this.pool.query(
      `
      INSERT INTO agent_memories (user_id, agent_name, content, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
      [userId, agentName, content, metadata ? JSON.stringify(metadata) : null]
    );
    return result.rows[0].id;
  }

  /**
   * Insert test workspace files
   */
  async insertWorkspaceFile(
    userId: string,
    agentName: string,
    filePath: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<number> {
    const result = await this.pool.query(
      `
      INSERT INTO agent_workspaces (user_id, agent_name, file_path, content, metadata)
      VALUES ($1, $2, $3, $4::bytea, $5)
      RETURNING id
    `,
      [userId, agentName, filePath, content, metadata ? JSON.stringify(metadata) : null]
    );
    return result.rows[0].id;
  }

  /**
   * Get table row count
   */
  async getRowCount(tableName: string): Promise<number> {
    const result = await this.pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get distinct user count from a table
   */
  async getDistinctUserCount(tableName: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(DISTINCT user_id) as count FROM ${tableName}`
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Check if table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.pool.query(
      `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = $1
      )
    `,
      [tableName]
    );
    return result.rows[0].exists;
  }

  /**
   * Check if index exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    const result = await this.pool.query(
      `
      SELECT EXISTS (
        SELECT FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = $1
      )
    `,
      [indexName]
    );
    return result.rows[0].exists;
  }

  /**
   * Get column information for a table
   */
  async getColumns(tableName: string): Promise<Array<{
    name: string;
    type: string;
    nullable: boolean;
  }>> {
    const result = await this.pool.query(
      `
      SELECT
        column_name as name,
        data_type as type,
        is_nullable = 'YES' as nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position
    `,
      [tableName]
    );
    return result.rows;
  }

  /**
   * Get constraint information for a table
   */
  async getConstraints(tableName: string): Promise<Array<{
    name: string;
    type: string;
  }>> {
    const result = await this.pool.query(
      `
      SELECT
        constraint_name as name,
        constraint_type as type
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
      [tableName]
    );
    return result.rows;
  }

  /**
   * Execute a raw query
   */
  async query(sql: string, params?: any[]): Promise<any> {
    return this.pool.query(sql, params);
  }

  /**
   * Begin a transaction
   */
  async begin(): Promise<void> {
    await this.pool.query('BEGIN');
  }

  /**
   * Commit a transaction
   */
  async commit(): Promise<void> {
    await this.pool.query('COMMIT');
  }

  /**
   * Rollback a transaction
   */
  async rollback(): Promise<void> {
    await this.pool.query('ROLLBACK');
  }

  /**
   * Close the connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Create a snapshot of current data for comparison
   */
  async createSnapshot(): Promise<{
    templates: number;
    customizations: number;
    memories: number;
    workspaces: number;
    users: number;
  }> {
    const templates = await this.getRowCount('system_agent_templates');
    const customizations = await this.getRowCount('user_agent_customizations');
    const memories = await this.getRowCount('agent_memories');
    const workspaces = await this.getRowCount('agent_workspaces');

    // Get distinct user count across all tables
    const memoryUsers = await this.getDistinctUserCount('agent_memories');
    const customizationUsers = await this.getDistinctUserCount('user_agent_customizations');
    const workspaceUsers = await this.getDistinctUserCount('agent_workspaces');

    const users = Math.max(memoryUsers, customizationUsers, workspaceUsers);

    return {
      templates,
      customizations,
      memories,
      workspaces,
      users,
    };
  }

  /**
   * Verify data integrity by comparing snapshots
   */
  verifyIntegrity(
    before: ReturnType<typeof this.createSnapshot> extends Promise<infer T> ? T : never,
    after: ReturnType<typeof this.createSnapshot> extends Promise<infer T> ? T : never
  ): {
    passed: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    // Check for data loss
    if (after.memories < before.memories) {
      violations.push(`Memory count decreased: ${before.memories} -> ${after.memories}`);
    }

    if (after.customizations < before.customizations) {
      violations.push(
        `Customizations decreased: ${before.customizations} -> ${after.customizations}`
      );
    }

    if (after.workspaces < before.workspaces) {
      violations.push(`Workspaces decreased: ${before.workspaces} -> ${after.workspaces}`);
    }

    if (after.users < before.users) {
      violations.push(`User count decreased: ${before.users} -> ${after.users}`);
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }
}

/**
 * Create a test database helper instance
 */
export function createTestDatabase(config?: TestDatabaseConfig): DatabaseTestHelper {
  return new DatabaseTestHelper(config);
}
