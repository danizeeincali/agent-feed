/**
 * Token Analytics Database Manager
 * Handles SQLite database operations for token usage tracking
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple logger for JS
const logger = { info: console.log, error: console.error };

class TokenAnalyticsDB {
  constructor(dbPath = null) {
    this.dbPath = dbPath || join(__dirname, '../../data/token-analytics.db');
    this.db = null;
    this.init();
  }

  init() {
    try {
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.createTables();
      logger.info('Token Analytics Database initialized');
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  createTables() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS token_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        session_id TEXT NOT NULL,
        user_id TEXT,
        request_id TEXT NOT NULL,
        message_id TEXT UNIQUE, -- Unique identifier to prevent double-charging
        provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'claude-flow', 'mcp', 'openai')),
        model TEXT NOT NULL,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
        cached_tokens INTEGER DEFAULT 0,
        cost_input INTEGER NOT NULL DEFAULT 0, -- cents
        cost_output INTEGER NOT NULL DEFAULT 0, -- cents
        cost_total INTEGER GENERATED ALWAYS AS (cost_input + cost_output) STORED,
        request_type TEXT NOT NULL,
        component TEXT,
        processing_time_ms INTEGER,
        first_token_latency_ms INTEGER,
        tokens_per_second REAL,
        message_content TEXT,
        response_content TEXT,
        tools_used TEXT, -- JSON string
        metadata TEXT -- JSON string
      )
    `;

    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp ON token_usage(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_token_usage_provider ON token_usage(provider)',
      'CREATE INDEX IF NOT EXISTS idx_token_usage_model ON token_usage(model)',
      'CREATE INDEX IF NOT EXISTS idx_token_usage_session ON token_usage(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_token_usage_request ON token_usage(request_id)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_token_usage_message_id ON token_usage(message_id)'
    ];

    this.db.exec(createTableSQL);
    createIndexes.forEach(sql => this.db.exec(sql));
  }

  insertTokenUsage(data) {
    // Check for deduplication if message_id is provided
    if (data.message_id) {
      const existing = this.db.prepare('SELECT id FROM token_usage WHERE message_id = ?').get(data.message_id);
      if (existing) {
        logger.info('Duplicate message_id detected, skipping insertion', { message_id: data.message_id });
        // Return existing record instead of inserting duplicate
        return this.db.prepare('SELECT * FROM token_usage WHERE message_id = ?').get(data.message_id);
      }
    }

    const stmt = this.db.prepare(`
      INSERT INTO token_usage (
        session_id, user_id, request_id, message_id, provider, model,
        input_tokens, output_tokens, cached_tokens,
        cost_input, cost_output, request_type, component,
        processing_time_ms, first_token_latency_ms, tokens_per_second,
        message_content, response_content, tools_used, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      const result = stmt.run(
        data.session_id,
        data.user_id || null,
        data.request_id,
        data.message_id || null,
        data.provider,
        data.model,
        data.input_tokens,
        data.output_tokens,
        data.cached_tokens || 0,
        data.cost_input,
        data.cost_output,
        data.request_type,
        data.component || null,
        data.processing_time_ms || null,
        data.first_token_latency_ms || null,
        data.tokens_per_second || null,
        data.message_content || null,
        data.response_content || null,
        data.tools_used || null,
        data.metadata || null
      );

      // Return the inserted record with generated values
      return this.db.prepare('SELECT * FROM token_usage WHERE id = ?').get(result.lastInsertRowid);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' && error.message.includes('message_id')) {
        logger.info('Duplicate message_id constraint violation, returning existing record', { message_id: data.message_id });
        return this.db.prepare('SELECT * FROM token_usage WHERE message_id = ?').get(data.message_id);
      }
      throw error;
    }
  }

  getHourlyUsage24h() {
    // First, get actual data from the database
    const actualData = this.db.prepare(`
      SELECT
        strftime('%Y-%m-%d %H:00:00', timestamp) as hour_bucket,
        SUM(total_tokens) as total_tokens,
        SUM(cost_total) as total_cost,
        COUNT(*) as total_requests,
        AVG(processing_time_ms) as avg_processing_time,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens
      FROM token_usage
      WHERE timestamp >= datetime('now', '-24 hours')
      GROUP BY hour_bucket
      ORDER BY hour_bucket ASC
    `).all();

    // Create a map for quick lookup
    const dataMap = new Map();
    actualData.forEach(row => {
      dataMap.set(row.hour_bucket, row);
    });

    // Generate complete 24-hour time series
    const result = [];
    const now = new Date();

    for (let i = 23; i >= 0; i--) {
      const hourTime = new Date(now.getTime() - (i * 60 * 60 * 1000));
      // Format as SQLite strftime format: YYYY-MM-DD HH:00:00
      const hourBucket = hourTime.getFullYear() + '-' +
        String(hourTime.getMonth() + 1).padStart(2, '0') + '-' +
        String(hourTime.getDate()).padStart(2, '0') + ' ' +
        String(hourTime.getHours()).padStart(2, '0') + ':00:00';

      const existingData = dataMap.get(hourBucket);

      result.push({
        hour_bucket: hourBucket,
        total_tokens: existingData?.total_tokens || 0,
        total_cost: existingData?.total_cost || 0,
        total_requests: existingData?.total_requests || 0,
        avg_processing_time: existingData?.avg_processing_time || null,
        total_input_tokens: existingData?.total_input_tokens || 0,
        total_output_tokens: existingData?.total_output_tokens || 0
      });
    }

    return result;
  }

  getDailyUsage30d() {
    // First, get actual data from the database
    const actualData = this.db.prepare(`
      SELECT
        DATE(timestamp) as date_bucket,
        SUM(total_tokens) as total_tokens,
        SUM(cost_total) as total_cost,
        COUNT(*) as total_requests,
        AVG(processing_time_ms) as avg_processing_time,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens
      FROM token_usage
      WHERE timestamp >= datetime('now', '-30 days')
      GROUP BY date_bucket
      ORDER BY date_bucket ASC
    `).all();

    // Create a map for quick lookup
    const dataMap = new Map();
    actualData.forEach(row => {
      dataMap.set(row.date_bucket, row);
    });

    // Generate complete 30-day time series
    const result = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const dayTime = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      // Format as SQLite DATE format: YYYY-MM-DD
      const dateBucket = dayTime.getFullYear() + '-' +
        String(dayTime.getMonth() + 1).padStart(2, '0') + '-' +
        String(dayTime.getDate()).padStart(2, '0');

      const existingData = dataMap.get(dateBucket);

      result.push({
        date_bucket: dateBucket,
        total_tokens: existingData?.total_tokens || 0,
        total_cost: existingData?.total_cost || 0,
        total_requests: existingData?.total_requests || 0,
        avg_processing_time: existingData?.avg_processing_time || null,
        total_input_tokens: existingData?.total_input_tokens || 0,
        total_output_tokens: existingData?.total_output_tokens || 0
      });
    }

    return result;
  }

  getRecentMessages(limit = 50) {
    return this.db.prepare(`
      SELECT
        id, timestamp, session_id, request_id, message_id, provider, model,
        input_tokens, output_tokens, total_tokens, cost_total,
        request_type, component, processing_time_ms,
        CASE
          WHEN length(message_content) <= 150 THEN message_content
          ELSE substr(message_content, 1, 147) || '...'
        END as message_preview,
        CASE
          WHEN length(response_content) <= 150 THEN response_content
          ELSE substr(response_content, 1, 147) || '...'
        END as response_preview
      FROM token_usage
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit);
  }

  searchMessages(searchTerm, limit = 50) {
    return this.db.prepare(`
      SELECT
        id, timestamp, session_id, request_id, message_id, provider, model,
        input_tokens, output_tokens, total_tokens, cost_total,
        request_type, component, processing_time_ms,
        CASE
          WHEN length(message_content) <= 150 THEN message_content
          ELSE substr(message_content, 1, 147) || '...'
        END as message_preview,
        CASE
          WHEN length(response_content) <= 150 THEN response_content
          ELSE substr(response_content, 1, 147) || '...'
        END as response_preview
      FROM token_usage
      WHERE message_content LIKE ? OR response_content LIKE ? OR model LIKE ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, limit);
  }

  getUsageSummary() {
    const baseStats = this.db.prepare(`
      SELECT
        COUNT(*) as total_requests,
        SUM(total_tokens) as total_tokens,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(cost_total) as total_cost,
        AVG(processing_time_ms) as avg_processing_time,
        MIN(timestamp) as earliest_record,
        MAX(timestamp) as latest_record
      FROM token_usage
    `).get();

    const uniqueSessions = this.db.prepare(`
      SELECT COUNT(DISTINCT session_id) as unique_sessions
      FROM token_usage
    `).get();

    const providersUsed = this.db.prepare(`
      SELECT COUNT(DISTINCT provider) as providers_used
      FROM token_usage
    `).get();

    const modelsUsed = this.db.prepare(`
      SELECT COUNT(DISTINCT model) as models_used
      FROM token_usage
    `).get();

    return {
      ...baseStats,
      unique_sessions: uniqueSessions.unique_sessions || 0,
      providers_used: providersUsed.providers_used || 0,
      models_used: modelsUsed.models_used || 0
    };
  }

  getUsageByProvider() {
    return this.db.prepare(`
      SELECT
        provider,
        COUNT(*) as requests,
        SUM(total_tokens) as total_tokens,
        SUM(cost_total) as total_cost,
        AVG(processing_time_ms) as avg_processing_time
      FROM token_usage
      GROUP BY provider
      ORDER BY total_tokens DESC
    `).all();
  }

  getUsageByModel() {
    return this.db.prepare(`
      SELECT
        provider,
        model,
        COUNT(*) as requests,
        SUM(total_tokens) as total_tokens,
        SUM(cost_total) as total_cost,
        AVG(processing_time_ms) as avg_processing_time
      FROM token_usage
      GROUP BY provider, model
      ORDER BY total_tokens DESC
    `).all();
  }

  getCostBreakdown(days = 30) {
    return this.db.prepare(`
      SELECT
        DATE(timestamp) as date,
        SUM(cost_total) as daily_cost,
        COUNT(*) as daily_requests,
        SUM(total_tokens) as daily_tokens
      FROM token_usage
      WHERE timestamp >= datetime('now', '-' || ? || ' days')
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `).all(days);
  }

  cleanup(retentionDays = 90) {
    const result = this.db.prepare(`
      DELETE FROM token_usage
      WHERE timestamp < datetime('now', '-' || ? || ' days')
    `).run(retentionDays);

    return result.changes;
  }

  getInfo() {
    const stats = this.db.prepare(`
      SELECT
        COUNT(*) as total_records,
        MIN(timestamp) as oldest_record,
        MAX(timestamp) as newest_record
      FROM token_usage
    `).get();

    return {
      database_path: this.dbPath,
      connected: true,
      ...stats
    };
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// Create singleton instance
export const tokenAnalyticsDB = new TokenAnalyticsDB();

// For testing
export { TokenAnalyticsDB };