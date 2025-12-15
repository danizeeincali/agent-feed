/**
 * Token Analytics Database Manager
 * Handles SQLite database operations for token usage tracking
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '@/utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface TokenUsageRecord {
  id?: number;
  timestamp?: string;
  session_id: string;
  user_id?: string;
  request_id: string;
  provider: 'anthropic' | 'claude-flow' | 'mcp' | 'openai';
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens?: number;
  cached_tokens?: number;
  cost_input: number; // cents
  cost_output: number; // cents
  cost_total?: number; // cents
  request_type: string;
  component?: string;
  processing_time_ms?: number;
  first_token_latency_ms?: number;
  tokens_per_second?: number;
  message_content?: string;
  response_content?: string;
  tools_used?: string; // JSON string
  metadata?: string; // JSON string
  created_at?: string;
}

export interface HourlyUsageRecord {
  hour_bucket: string;
  provider: string;
  model: string;
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_cost: number; // cents
  avg_processing_time_ms: number;
  peak_tokens_per_second: number;
}

export interface DailyUsageRecord {
  date_bucket: string;
  provider: string;
  model: string;
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_cost: number; // cents
  avg_processing_time_ms: number;
  peak_hour_usage: number;
  unique_sessions: number;
}

export interface RecentMessage {
  id: number;
  timestamp: string;
  provider: string;
  model: string;
  request_type: string;
  total_tokens: number;
  cost_total: number; // cents
  processing_time_ms: number;
  message_preview: string;
  response_preview: string;
}

class TokenAnalyticsDB {
  private db: Database.Database;
  private initialized = false;

  /**
   * Initialize database with dynamic path resolution
   * Priority: TOKEN_ANALYTICS_DB_PATH > WORKSPACE_ROOT/database.db > cwd/database.db
   */
  constructor() {
    const dbPath = process.env.TOKEN_ANALYTICS_DB_PATH ||
      (process.env.WORKSPACE_ROOT
        ? join(process.env.WORKSPACE_ROOT, 'database.db')
        : join(process.cwd(), 'database.db'));
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 1000');
    this.db.pragma('foreign_keys = ON');
  }

  /**
   * Initialize the database with the token analytics schema
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const schemaPath = join(__dirname, 'sqlite-token-schema.sql');
      const schema = readFileSync(schemaPath, 'utf8');

      // Execute schema in transaction
      const transaction = this.db.transaction(() => {
        this.db.exec(schema);
      });

      transaction();
      this.initialized = true;
      logger.info('Token analytics database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize token analytics database', { error });
      throw error;
    }
  }

  /**
   * Insert a new token usage record
   */
  insertTokenUsage(record: TokenUsageRecord): TokenUsageRecord {
    const stmt = this.db.prepare(`
      INSERT INTO token_usage (
        session_id, user_id, request_id, provider, model,
        input_tokens, output_tokens, cached_tokens,
        cost_input, cost_output, request_type, component,
        processing_time_ms, first_token_latency_ms, tokens_per_second,
        message_content, response_content, tools_used, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      record.session_id,
      record.user_id || 'default',
      record.request_id,
      record.provider,
      record.model,
      record.input_tokens,
      record.output_tokens,
      record.cached_tokens || 0,
      record.cost_input,
      record.cost_output,
      record.request_type,
      record.component,
      record.processing_time_ms || 0,
      record.first_token_latency_ms || 0,
      record.tokens_per_second || 0,
      record.message_content,
      record.response_content,
      record.tools_used,
      record.metadata
    );

    return { ...record, id: info.lastInsertRowid as number };
  }

  /**
   * Get hourly token usage for the last 24 hours
   */
  getHourlyUsage24h(): HourlyUsageRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM hourly_token_usage_24h
      ORDER BY hour_bucket DESC
    `);

    return stmt.all() as HourlyUsageRecord[];
  }

  /**
   * Get daily token usage for the last 30 days
   */
  getDailyUsage30d(): DailyUsageRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM daily_token_usage_30d
      ORDER BY date_bucket DESC
    `);

    return stmt.all() as DailyUsageRecord[];
  }

  /**
   * Get the last 50 messages
   */
  getRecentMessages(limit: number = 50): RecentMessage[] {
    const stmt = this.db.prepare(`
      SELECT * FROM recent_messages
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    return stmt.all(limit) as RecentMessage[];
  }

  /**
   * Get usage statistics summary
   */
  getUsageSummary() {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total_requests,
        SUM(total_tokens) as total_tokens,
        SUM(cost_total) as total_cost,
        AVG(processing_time_ms) as avg_processing_time,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(DISTINCT provider) as providers_used,
        COUNT(DISTINCT model) as models_used
      FROM token_usage
      WHERE timestamp >= datetime('now', '-30 days')
    `);

    return stmt.get();
  }

  /**
   * Get usage by provider for the last 30 days
   */
  getUsageByProvider() {
    const stmt = this.db.prepare(`
      SELECT
        provider,
        COUNT(*) as requests,
        SUM(total_tokens) as tokens,
        SUM(cost_total) as cost,
        AVG(processing_time_ms) as avg_time
      FROM token_usage
      WHERE timestamp >= datetime('now', '-30 days')
      GROUP BY provider
      ORDER BY cost DESC
    `);

    return stmt.all();
  }

  /**
   * Get usage by model for the last 30 days
   */
  getUsageByModel() {
    const stmt = this.db.prepare(`
      SELECT
        model,
        provider,
        COUNT(*) as requests,
        SUM(total_tokens) as tokens,
        SUM(cost_total) as cost,
        AVG(processing_time_ms) as avg_time
      FROM token_usage
      WHERE timestamp >= datetime('now', '-30 days')
      GROUP BY model, provider
      ORDER BY cost DESC
    `);

    return stmt.all();
  }

  /**
   * Search messages by content
   */
  searchMessages(query: string, limit: number = 20): RecentMessage[] {
    const stmt = this.db.prepare(`
      SELECT
        id, timestamp, provider, model, request_type,
        total_tokens, cost_total, processing_time_ms,
        CASE
          WHEN length(message_content) > 100
          THEN substr(message_content, 1, 100) || '...'
          ELSE message_content
        END as message_preview,
        CASE
          WHEN length(response_content) > 100
          THEN substr(response_content, 1, 100) || '...'
          ELSE response_content
        END as response_preview
      FROM token_usage
      WHERE (message_content LIKE ? OR response_content LIKE ?)
        AND timestamp >= datetime('now', '-30 days')
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const searchTerm = `%${query}%`;
    return stmt.all(searchTerm, searchTerm, limit) as RecentMessage[];
  }

  /**
   * Get cost breakdown by time period
   */
  getCostBreakdown(days: number = 30) {
    const stmt = this.db.prepare(`
      SELECT
        date(timestamp) as date,
        SUM(cost_total) as daily_cost,
        COUNT(*) as daily_requests,
        SUM(total_tokens) as daily_tokens
      FROM token_usage
      WHERE timestamp >= datetime('now', '-${days} days')
      GROUP BY date(timestamp)
      ORDER BY date DESC
    `);

    return stmt.all();
  }

  /**
   * Clean up old records (keep last 90 days)
   */
  cleanup(retentionDays: number = 90): number {
    const stmt = this.db.prepare(`
      DELETE FROM token_usage
      WHERE timestamp < datetime('now', '-${retentionDays} days')
    `);

    const info = stmt.run();
    logger.info(`Cleaned up ${info.changes} old token usage records`);
    return info.changes as number;
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Get database info
   */
  getInfo() {
    const stmt = this.db.prepare(`
      SELECT
        name,
        (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?) as table_exists
      FROM sqlite_master
      WHERE type='table' AND name IN ('token_usage', 'token_usage_hourly', 'token_usage_daily')
    `);

    const tables = ['token_usage', 'token_usage_hourly', 'token_usage_daily'];
    const info = tables.map(table => ({
      table,
      exists: stmt.get(table)?.table_exists === 1
    }));

    return {
      initialized: this.initialized,
      tables: info,
      dbPath: this.db.name
    };
  }
}

// Singleton instance
export const tokenAnalyticsDB = new TokenAnalyticsDB();

// Initialize on module load
tokenAnalyticsDB.initialize().catch(error => {
  logger.error('Failed to initialize token analytics database on startup', { error });
});

export default tokenAnalyticsDB;