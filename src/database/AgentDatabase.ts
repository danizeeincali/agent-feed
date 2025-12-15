/**
 * Agent Database Layer - TDD Implementation
 * Handles database operations for agent management system
 */

import { Database } from 'better-sqlite3';
import { AgentDefinition, AgentMetrics, DatabaseSchema } from '../types/AgentTypes';
import * as path from 'path';

export interface DatabaseConfig {
  path?: string;
  memory?: boolean;
  timeout?: number;
  verbose?: boolean;
}

export class AgentDatabase {
  private db: Database;
  private readonly config: DatabaseConfig;

  constructor(config: DatabaseConfig = {}) {
    this.config = {
      path: config.path || path.join(process.env.WORKSPACE_ROOT || process.cwd(), 'agents.db'),
      memory: config.memory || false,
      timeout: config.timeout || 5000,
      verbose: config.verbose || false,
      ...config
    };

    this.db = new Database(this.config.memory ? ':memory:' : this.config.path!, {
      verbose: this.config.verbose ? console.log : undefined,
      timeout: this.config.timeout
    });

    this.initializeTables();
  }

  /**
   * Save agent definition to database
   * @param agent AgentDefinition to save
   * @returns Promise<void>
   */
  async saveAgent(agent: AgentDefinition): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO agents (
        name, slug, description, tools, model, color, proactive,
        priority, usage, body, file_path, workspace_directory,
        created_at, updated_at, last_modified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
        COALESCE((SELECT created_at FROM agents WHERE name = ?), datetime('now')),
        datetime('now'), ?)
    `);

    const slug = this.generateSlug(agent.name);
    const toolsJson = JSON.stringify(agent.tools);

    stmt.run(
      agent.name,
      slug,
      agent.description,
      toolsJson,
      agent.model,
      agent.color,
      agent.proactive ? 1 : 0,
      agent.priority,
      agent.usage,
      agent.body,
      agent.filePath,
      agent.workspaceDirectory,
      agent.name, // for COALESCE check
      agent.lastModified.toISOString()
    );
  }

  /**
   * Get agent by name
   * @param name Agent name
   * @returns Promise<AgentDefinition | null>
   */
  async getAgent(name: string): Promise<AgentDefinition | null> {
    const stmt = this.db.prepare('SELECT * FROM agents WHERE name = ?');
    const row = stmt.get(name) as DatabaseSchema['agents'] | undefined;

    if (!row) return null;

    return this.mapRowToAgent(row);
  }

  /**
   * Get agent by slug (for URL routing)
   * @param slug Agent slug
   * @returns Promise<AgentDefinition | null>
   */
  async getAgentBySlug(slug: string): Promise<AgentDefinition | null> {
    const stmt = this.db.prepare('SELECT * FROM agents WHERE slug = ?');
    const row = stmt.get(slug) as DatabaseSchema['agents'] | undefined;

    if (!row) return null;

    return this.mapRowToAgent(row);
  }

  /**
   * List all agents with optional filtering
   * @param options Filtering and pagination options
   * @returns Promise<AgentDefinition[]>
   */
  async listAgents(options: {
    limit?: number;
    offset?: number;
    model?: string;
    proactive?: boolean;
    priority?: string;
    search?: string;
  } = {}): Promise<AgentDefinition[]> {
    let query = 'SELECT * FROM agents';
    const conditions: string[] = [];
    const params: any[] = [];

    // Build WHERE clause
    if (options.model) {
      conditions.push('model = ?');
      params.push(options.model);
    }

    if (options.proactive !== undefined) {
      conditions.push('proactive = ?');
      params.push(options.proactive ? 1 : 0);
    }

    if (options.priority) {
      conditions.push('priority = ?');
      params.push(options.priority);
    }

    if (options.search) {
      conditions.push('(name LIKE ? OR description LIKE ? OR body LIKE ?)');
      const searchTerm = `%${options.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Add ordering
    query += ' ORDER BY priority, name';

    // Add pagination
    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);

      if (options.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as DatabaseSchema['agents'][];

    return rows.map(row => this.mapRowToAgent(row));
  }

  /**
   * Delete agent by name
   * @param name Agent name
   * @returns Promise<boolean> True if deleted, false if not found
   */
  async deleteAgent(name: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM agents WHERE name = ?');
    const result = stmt.run(name);
    return result.changes > 0;
  }

  /**
   * Update agent metrics
   * @param agentName Agent name
   * @param metrics Partial metrics to update
   * @returns Promise<void>
   */
  async updateMetrics(agentName: string, metrics: Partial<AgentMetrics>): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO agent_metrics (
        agent_name, total_invocations, success_rate, average_response_time,
        last_used, error_count, created_at, updated_at
      ) VALUES (
        ?, 
        COALESCE(?, (SELECT total_invocations FROM agent_metrics WHERE agent_name = ?), 0),
        COALESCE(?, (SELECT success_rate FROM agent_metrics WHERE agent_name = ?), 0.0),
        COALESCE(?, (SELECT average_response_time FROM agent_metrics WHERE agent_name = ?), 0.0),
        COALESCE(?, (SELECT last_used FROM agent_metrics WHERE agent_name = ?), datetime('now')),
        COALESCE(?, (SELECT error_count FROM agent_metrics WHERE agent_name = ?), 0),
        COALESCE((SELECT created_at FROM agent_metrics WHERE agent_name = ?), datetime('now')),
        datetime('now')
      )
    `);

    stmt.run(
      agentName,
      metrics.totalInvocations,
      agentName,
      metrics.successRate,
      agentName,
      metrics.averageResponseTime,
      agentName,
      metrics.lastUsed?.toISOString(),
      agentName,
      metrics.errorCount,
      agentName,
      agentName
    );
  }

  /**
   * Get agent metrics
   * @param agentName Agent name
   * @returns Promise<AgentMetrics | null>
   */
  async getMetrics(agentName: string): Promise<AgentMetrics | null> {
    const stmt = this.db.prepare('SELECT * FROM agent_metrics WHERE agent_name = ?');
    const row = stmt.get(agentName) as DatabaseSchema['agent_metrics'] | undefined;

    if (!row) return null;

    return {
      name: row.agent_name,
      totalInvocations: row.total_invocations,
      successRate: row.success_rate,
      averageResponseTime: row.average_response_time,
      lastUsed: new Date(row.last_used),
      errorCount: row.error_count
    };
  }

  /**
   * Record agent workspace activity
   * @param agentName Agent name
   * @param directory Workspace directory
   * @param files List of files in workspace
   * @returns Promise<void>
   */
  async recordWorkspaceActivity(agentName: string, directory: string, files: string[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO agent_workspaces (
        agent_name, directory, files, last_activity, created_at, updated_at
      ) VALUES (
        ?, ?, ?,
        datetime('now'),
        COALESCE((SELECT created_at FROM agent_workspaces WHERE agent_name = ?), datetime('now')),
        datetime('now')
      )
    `);

    const filesJson = JSON.stringify(files);
    stmt.run(agentName, directory, filesJson, agentName);
  }

  /**
   * Add log entry
   * @param agentName Agent name
   * @param level Log level
   * @param message Log message
   * @param context Optional context data
   * @returns Promise<void>
   */
  async addLog(
    agentName: string,
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    context?: Record<string, any>
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO agent_logs (agent_name, level, message, context, timestamp)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);

    const contextJson = context ? JSON.stringify(context) : null;
    stmt.run(agentName, level, message, contextJson);
  }

  /**
   * Get recent logs for an agent
   * @param agentName Agent name
   * @param limit Maximum number of logs to return
   * @returns Promise<AgentLog[]>
   */
  async getLogs(agentName: string, limit: number = 50): Promise<Array<{
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    context?: Record<string, any>;
    timestamp: Date;
  }>> {
    const stmt = this.db.prepare(`
      SELECT level, message, context, timestamp
      FROM agent_logs
      WHERE agent_name = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(agentName, limit) as DatabaseSchema['agent_logs'][];

    return rows.map(row => ({
      level: row.level as any,
      message: row.message,
      context: row.context ? JSON.parse(row.context) : undefined,
      timestamp: new Date(row.timestamp)
    }));
  }

  /**
   * Get database statistics
   * @returns Database statistics
   */
  getStats(): {
    totalAgents: number;
    totalLogs: number;
    totalWorkspaces: number;
    databaseSize: string;
  } {
    const agentCount = this.db.prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number };
    const logCount = this.db.prepare('SELECT COUNT(*) as count FROM agent_logs').get() as { count: number };
    const workspaceCount = this.db.prepare('SELECT COUNT(*) as count FROM agent_workspaces').get() as { count: number };

    // Get database size (in pages)
    const pageCount = this.db.prepare('PRAGMA page_count').get() as { page_count: number };
    const pageSize = this.db.prepare('PRAGMA page_size').get() as { page_size: number };
    const sizeBytes = pageCount.page_count * pageSize.page_size;
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);

    return {
      totalAgents: agentCount.count,
      totalLogs: logCount.count,
      totalWorkspaces: workspaceCount.count,
      databaseSize: `${sizeMB} MB`
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Run database backup
   * @param backupPath Path to backup file
   * @returns Promise<void>
   */
  async backup(backupPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.backup(backupPath, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Initialize database tables
   */
  private initializeTables(): void {
    // Create agents table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL,
        tools TEXT NOT NULL,
        model TEXT NOT NULL,
        color TEXT NOT NULL,
        proactive INTEGER NOT NULL DEFAULT 0,
        priority TEXT NOT NULL,
        usage TEXT NOT NULL,
        body TEXT NOT NULL,
        file_path TEXT NOT NULL,
        workspace_directory TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_modified TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create agent_metrics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_name TEXT UNIQUE NOT NULL,
        total_invocations INTEGER NOT NULL DEFAULT 0,
        success_rate REAL NOT NULL DEFAULT 0.0,
        average_response_time REAL NOT NULL DEFAULT 0.0,
        last_used TEXT NOT NULL DEFAULT (datetime('now')),
        error_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (agent_name) REFERENCES agents (name) ON DELETE CASCADE
      )
    `);

    // Create agent_workspaces table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_workspaces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_name TEXT UNIQUE NOT NULL,
        directory TEXT NOT NULL,
        files TEXT NOT NULL,
        last_activity TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (agent_name) REFERENCES agents (name) ON DELETE CASCADE
      )
    `);

    // Create agent_logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_name TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        context TEXT,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (agent_name) REFERENCES agents (name) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_agents_name ON agents (name);
      CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents (slug);
      CREATE INDEX IF NOT EXISTS idx_agents_model ON agents (model);
      CREATE INDEX IF NOT EXISTS idx_agents_proactive ON agents (proactive);
      CREATE INDEX IF NOT EXISTS idx_agents_priority ON agents (priority);
      
      CREATE INDEX IF NOT EXISTS idx_agent_metrics_name ON agent_metrics (agent_name);
      CREATE INDEX IF NOT EXISTS idx_agent_workspaces_name ON agent_workspaces (agent_name);
      CREATE INDEX IF NOT EXISTS idx_agent_logs_name ON agent_logs (agent_name);
      CREATE INDEX IF NOT EXISTS idx_agent_logs_timestamp ON agent_logs (timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_agent_logs_level ON agent_logs (level);
    `);
  }

  /**
   * Map database row to AgentDefinition
   * @param row Database row
   * @returns AgentDefinition
   */
  private mapRowToAgent(row: DatabaseSchema['agents']): AgentDefinition {
    return {
      name: row.name,
      description: row.description,
      tools: JSON.parse(row.tools),
      model: row.model as 'haiku' | 'sonnet' | 'opus',
      color: row.color,
      proactive: Boolean(row.proactive),
      priority: row.priority as 'P0' | 'P1' | 'P2' | 'P3',
      usage: row.usage,
      body: row.body,
      filePath: row.file_path,
      lastModified: new Date(row.last_modified),
      workspaceDirectory: row.workspace_directory
    };
  }

  /**
   * Generate URL-safe slug from agent name
   * @param name Agent name
   * @returns URL-safe slug
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}