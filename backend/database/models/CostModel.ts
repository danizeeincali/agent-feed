/**
 * Database Models for Cost Tracking
 *
 * SQLite-based models for storing cost tracking data with Better-SQLite3
 */

import Database from 'better-sqlite3';
import { TokenUsage } from '../../services/CostTracker';

export interface CostSessionModel {
  session_id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  total_cost: number;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  step_count: number;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  metadata?: string;
  created_at: string;
  updated_at: string;
}

export interface StepUsageModel {
  id: string;
  step_id: string;
  message_id: string;
  session_id: string;
  user_id: string;
  tool?: string;
  step_type: 'request' | 'response' | 'tool_use' | 'tool_result';
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  cost: number;
  timestamp: string;
  model: string;
  retry_attempt: number;
  duration: number;
  created_at: string;
}

export interface ProcessedMessageModel {
  message_id: string;
  session_id: string;
  processed_at: string;
  cost: number;
}

export interface AlertModel {
  id: string;
  type: 'cost' | 'token' | 'rate' | 'session' | 'system';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  description: string;
  session_id?: string;
  user_id?: string;
  threshold: number;
  current_value: number;
  metadata?: string;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

export interface BillingPeriodModel {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_creation_tokens: number;
  total_cache_read_tokens: number;
  session_count: number;
  step_count: number;
  status: 'active' | 'billed' | 'disputed';
  invoice_id?: string;
  created_at: string;
  updated_at: string;
}

export class CostDatabaseManager {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initializeDatabase();
    this.createIndexes();
  }

  private initializeDatabase(): void {
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Create cost_sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cost_sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        total_cost REAL NOT NULL DEFAULT 0,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
        cache_read_tokens INTEGER NOT NULL DEFAULT 0,
        step_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create step_usage table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS step_usage (
        id TEXT PRIMARY KEY,
        step_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        tool TEXT,
        step_type TEXT NOT NULL CHECK (step_type IN ('request', 'response', 'tool_use', 'tool_result')),
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
        cache_read_tokens INTEGER NOT NULL DEFAULT 0,
        cost REAL NOT NULL,
        timestamp DATETIME NOT NULL,
        model TEXT NOT NULL,
        retry_attempt INTEGER NOT NULL DEFAULT 0,
        duration INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES cost_sessions (session_id) ON DELETE CASCADE
      )
    `);

    // Create processed_messages table for deduplication
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS processed_messages (
        message_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        cost REAL NOT NULL,
        FOREIGN KEY (session_id) REFERENCES cost_sessions (session_id) ON DELETE CASCADE
      )
    `);

    // Create alerts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('cost', 'token', 'rate', 'session', 'system')),
        severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'emergency')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        session_id TEXT,
        user_id TEXT,
        threshold REAL NOT NULL,
        current_value REAL NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        resolved_by TEXT,
        FOREIGN KEY (session_id) REFERENCES cost_sessions (session_id) ON DELETE SET NULL
      )
    `);

    // Create billing_periods table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS billing_periods (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        period_start DATETIME NOT NULL,
        period_end DATETIME NOT NULL,
        total_cost REAL NOT NULL DEFAULT 0,
        total_input_tokens INTEGER NOT NULL DEFAULT 0,
        total_output_tokens INTEGER NOT NULL DEFAULT 0,
        total_cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
        total_cache_read_tokens INTEGER NOT NULL DEFAULT 0,
        session_count INTEGER NOT NULL DEFAULT 0,
        step_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'billed', 'disputed')),
        invoice_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create cost_summary_daily table for faster analytics
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cost_summary_daily (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        user_id TEXT,
        tool TEXT,
        total_cost REAL NOT NULL DEFAULT 0,
        total_input_tokens INTEGER NOT NULL DEFAULT 0,
        total_output_tokens INTEGER NOT NULL DEFAULT 0,
        total_cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
        total_cache_read_tokens INTEGER NOT NULL DEFAULT 0,
        step_count INTEGER NOT NULL DEFAULT 0,
        session_count INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create triggers for automatic updates
    this.createTriggers();
  }

  private createIndexes(): void {
    // Primary indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_step_usage_session_id ON step_usage(session_id);
      CREATE INDEX IF NOT EXISTS idx_step_usage_user_id ON step_usage(user_id);
      CREATE INDEX IF NOT EXISTS idx_step_usage_timestamp ON step_usage(timestamp);
      CREATE INDEX IF NOT EXISTS idx_step_usage_message_id ON step_usage(message_id);
      CREATE INDEX IF NOT EXISTS idx_step_usage_tool ON step_usage(tool);
      CREATE INDEX IF NOT EXISTS idx_step_usage_model ON step_usage(model);

      CREATE INDEX IF NOT EXISTS idx_cost_sessions_user_id ON cost_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_cost_sessions_start_time ON cost_sessions(start_time);
      CREATE INDEX IF NOT EXISTS idx_cost_sessions_status ON cost_sessions(status);

      CREATE INDEX IF NOT EXISTS idx_processed_messages_session_id ON processed_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_processed_messages_processed_at ON processed_messages(processed_at);

      CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
      CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
      CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
      CREATE INDEX IF NOT EXISTS idx_alerts_resolved_at ON alerts(resolved_at);

      CREATE INDEX IF NOT EXISTS idx_billing_periods_user_id ON billing_periods(user_id);
      CREATE INDEX IF NOT EXISTS idx_billing_periods_period_start ON billing_periods(period_start);
      CREATE INDEX IF NOT EXISTS idx_billing_periods_status ON billing_periods(status);

      CREATE INDEX IF NOT EXISTS idx_cost_summary_daily_date ON cost_summary_daily(date);
      CREATE INDEX IF NOT EXISTS idx_cost_summary_daily_user_id ON cost_summary_daily(user_id);
      CREATE INDEX IF NOT EXISTS idx_cost_summary_daily_tool ON cost_summary_daily(tool);
    `);

    // Composite indexes for common queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_step_usage_user_timestamp ON step_usage(user_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_step_usage_session_timestamp ON step_usage(session_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_cost_sessions_user_start ON cost_sessions(user_id, start_time);
      CREATE INDEX IF NOT EXISTS idx_alerts_user_created ON alerts(user_id, created_at);
    `);
  }

  private createTriggers(): void {
    // Trigger to update session updated_at on step insertion
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS trigger_update_session_on_step
      AFTER INSERT ON step_usage
      BEGIN
        UPDATE cost_sessions
        SET updated_at = CURRENT_TIMESTAMP
        WHERE session_id = NEW.session_id;
      END
    `);

    // Trigger to update billing periods updated_at
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS trigger_update_billing_period
      AFTER UPDATE ON billing_periods
      BEGIN
        UPDATE billing_periods
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
      END
    `);
  }

  // Cost Session operations
  public insertSession(session: Omit<CostSessionModel, 'created_at' | 'updated_at'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO cost_sessions (
        session_id, user_id, start_time, end_time, total_cost,
        input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
        step_count, status, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      session.session_id,
      session.user_id,
      session.start_time,
      session.end_time || null,
      session.total_cost,
      session.input_tokens,
      session.output_tokens,
      session.cache_creation_tokens,
      session.cache_read_tokens,
      session.step_count,
      session.status,
      session.metadata || null
    );
  }

  public updateSession(sessionId: string, updates: Partial<CostSessionModel>): void {
    const fields = Object.keys(updates).filter(key => key !== 'session_id');
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updates[field as keyof CostSessionModel]);

    const stmt = this.db.prepare(`
      UPDATE cost_sessions
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `);

    stmt.run(...values, sessionId);
  }

  public getSession(sessionId: string): CostSessionModel | null {
    const stmt = this.db.prepare('SELECT * FROM cost_sessions WHERE session_id = ?');
    return stmt.get(sessionId) as CostSessionModel | null;
  }

  public getSessionsByUser(userId: string, limit = 50, offset = 0): CostSessionModel[] {
    const stmt = this.db.prepare(`
      SELECT * FROM cost_sessions
      WHERE user_id = ?
      ORDER BY start_time DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(userId, limit, offset) as CostSessionModel[];
  }

  // Step Usage operations
  public insertStepUsage(step: Omit<StepUsageModel, 'created_at'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO step_usage (
        id, step_id, message_id, session_id, user_id, tool, step_type,
        input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
        cost, timestamp, model, retry_attempt, duration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      step.id,
      step.step_id,
      step.message_id,
      step.session_id,
      step.user_id,
      step.tool || null,
      step.step_type,
      step.input_tokens,
      step.output_tokens,
      step.cache_creation_tokens,
      step.cache_read_tokens,
      step.cost,
      step.timestamp,
      step.model,
      step.retry_attempt,
      step.duration
    );
  }

  public getStepUsage(sessionId: string, limit = 100): StepUsageModel[] {
    const stmt = this.db.prepare(`
      SELECT * FROM step_usage
      WHERE session_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    return stmt.all(sessionId, limit) as StepUsageModel[];
  }

  // Processed Messages operations
  public insertProcessedMessage(message: ProcessedMessageModel): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO processed_messages (message_id, session_id, cost)
      VALUES (?, ?, ?)
    `);
    stmt.run(message.message_id, message.session_id, message.cost);
  }

  public isMessageProcessed(messageId: string): boolean {
    const stmt = this.db.prepare('SELECT 1 FROM processed_messages WHERE message_id = ?');
    return !!stmt.get(messageId);
  }

  // Analytics queries
  public getUsageAnalytics(params: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    granularity?: 'hour' | 'day' | 'week' | 'month';
  }) {
    const { userId, startDate, endDate, granularity = 'day' } = params;

    let whereConditions = ['1=1'];
    let queryParams: any[] = [];

    if (userId) {
      whereConditions.push('user_id = ?');
      queryParams.push(userId);
    }

    if (startDate) {
      whereConditions.push('timestamp >= ?');
      queryParams.push(startDate.toISOString());
    }

    if (endDate) {
      whereConditions.push('timestamp <= ?');
      queryParams.push(endDate.toISOString());
    }

    const whereClause = whereConditions.join(' AND ');

    const timeFormat = {
      hour: '%Y-%m-%d %H:00:00',
      day: '%Y-%m-%d',
      week: '%Y-W%W',
      month: '%Y-%m'
    }[granularity];

    const stmt = this.db.prepare(`
      SELECT
        strftime('${timeFormat}', timestamp) as period,
        COUNT(*) as step_count,
        SUM(cost) as total_cost,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(cache_creation_tokens) as total_cache_creation_tokens,
        SUM(cache_read_tokens) as total_cache_read_tokens,
        AVG(cost) as avg_cost_per_step,
        MIN(cost) as min_cost,
        MAX(cost) as max_cost,
        AVG(duration) as avg_duration
      FROM step_usage
      WHERE ${whereClause}
      GROUP BY period
      ORDER BY period
    `);

    return stmt.all(queryParams);
  }

  public getTopConsumers(params: {
    limit?: number;
    startDate?: Date;
    endDate?: Date;
    groupBy?: 'user' | 'session' | 'tool';
  }) {
    const { limit = 10, startDate, endDate, groupBy = 'user' } = params;

    let whereConditions = ['1=1'];
    let queryParams: any[] = [];

    if (startDate) {
      whereConditions.push('timestamp >= ?');
      queryParams.push(startDate.toISOString());
    }

    if (endDate) {
      whereConditions.push('timestamp <= ?');
      queryParams.push(endDate.toISOString());
    }

    const whereClause = whereConditions.join(' AND ');
    const groupByField = groupBy === 'user' ? 'user_id' : groupBy === 'session' ? 'session_id' : 'tool';

    const stmt = this.db.prepare(`
      SELECT
        ${groupByField} as identifier,
        COUNT(*) as step_count,
        SUM(cost) as total_cost,
        SUM(input_tokens + output_tokens) as total_tokens,
        AVG(cost) as avg_cost_per_step,
        MAX(cost) as max_cost_per_step,
        AVG(duration) as avg_duration
      FROM step_usage
      WHERE ${whereClause} AND ${groupByField} IS NOT NULL
      GROUP BY ${groupByField}
      ORDER BY total_cost DESC
      LIMIT ?
    `);

    queryParams.push(limit);
    return stmt.all(queryParams);
  }

  // Alert operations
  public insertAlert(alert: Omit<AlertModel, 'created_at'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO alerts (
        id, type, severity, title, description, session_id, user_id,
        threshold, current_value, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      alert.id,
      alert.type,
      alert.severity,
      alert.title,
      alert.description,
      alert.session_id || null,
      alert.user_id || null,
      alert.threshold,
      alert.current_value,
      alert.metadata || null
    );
  }

  public resolveAlert(alertId: string, resolvedBy: string): void {
    const stmt = this.db.prepare(`
      UPDATE alerts
      SET resolved_at = CURRENT_TIMESTAMP, resolved_by = ?
      WHERE id = ? AND resolved_at IS NULL
    `);
    stmt.run(resolvedBy, alertId);
  }

  public getActiveAlerts(): AlertModel[] {
    const stmt = this.db.prepare(`
      SELECT * FROM alerts
      WHERE resolved_at IS NULL
      ORDER BY created_at DESC
    `);
    return stmt.all() as AlertModel[];
  }

  // Billing operations
  public insertBillingPeriod(period: Omit<BillingPeriodModel, 'created_at' | 'updated_at'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO billing_periods (
        id, user_id, period_start, period_end, total_cost,
        total_input_tokens, total_output_tokens,
        total_cache_creation_tokens, total_cache_read_tokens,
        session_count, step_count, status, invoice_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      period.id,
      period.user_id,
      period.period_start,
      period.period_end,
      period.total_cost,
      period.total_input_tokens,
      period.total_output_tokens,
      period.total_cache_creation_tokens,
      period.total_cache_read_tokens,
      period.session_count,
      period.step_count,
      period.status,
      period.invoice_id || null
    );
  }

  public getBillingPeriods(userId: string, limit = 12): BillingPeriodModel[] {
    const stmt = this.db.prepare(`
      SELECT * FROM billing_periods
      WHERE user_id = ?
      ORDER BY period_start DESC
      LIMIT ?
    `);
    return stmt.all(userId, limit) as BillingPeriodModel[];
  }

  // Data cleanup operations
  public cleanupOldData(retentionDays: number): void {
    const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));

    const transaction = this.db.transaction(() => {
      // Clean up old step usage
      const cleanupStepsStmt = this.db.prepare(`
        DELETE FROM step_usage
        WHERE timestamp < ?
      `);
      const stepsDeleted = cleanupStepsStmt.run(cutoffDate.toISOString()).changes;

      // Clean up old processed messages
      const cleanupMessagesStmt = this.db.prepare(`
        DELETE FROM processed_messages
        WHERE processed_at < ?
      `);
      const messagesDeleted = cleanupMessagesStmt.run(cutoffDate.toISOString()).changes;

      // Clean up old sessions
      const cleanupSessionsStmt = this.db.prepare(`
        DELETE FROM cost_sessions
        WHERE start_time < ? AND status != 'active'
      `);
      const sessionsDeleted = cleanupSessionsStmt.run(cutoffDate.toISOString()).changes;

      // Clean up old resolved alerts
      const cleanupAlertsStmt = this.db.prepare(`
        DELETE FROM alerts
        WHERE resolved_at < ?
      `);
      const alertsDeleted = cleanupAlertsStmt.run(cutoffDate.toISOString()).changes;

      console.log(`Cleanup completed: ${stepsDeleted} steps, ${messagesDeleted} messages, ${sessionsDeleted} sessions, ${alertsDeleted} alerts`);
    });

    transaction();
  }

  // Database maintenance
  public vacuum(): void {
    this.db.exec('VACUUM');
  }

  public analyze(): void {
    this.db.exec('ANALYZE');
  }

  public getStats(): any {
    const stmt = this.db.prepare(`
      SELECT
        'cost_sessions' as table_name,
        COUNT(*) as row_count
      FROM cost_sessions
      UNION ALL
      SELECT
        'step_usage' as table_name,
        COUNT(*) as row_count
      FROM step_usage
      UNION ALL
      SELECT
        'processed_messages' as table_name,
        COUNT(*) as row_count
      FROM processed_messages
      UNION ALL
      SELECT
        'alerts' as table_name,
        COUNT(*) as row_count
      FROM alerts
      UNION ALL
      SELECT
        'billing_periods' as table_name,
        COUNT(*) as row_count
      FROM billing_periods
    `);

    return stmt.all();
  }

  public close(): void {
    this.db.close();
  }
}