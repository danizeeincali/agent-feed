/**
 * Claude Code SDK Cost Tracking Service
 *
 * Features:
 * - Message ID deduplication to prevent double-charging
 * - Usage aggregation and step tracking
 * - Token consumption calculation
 * - Real-time cost monitoring
 * - Historical data storage
 * - Error handling and retry logic
 * - Accurate billing calculation
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { WebSocketServer } from 'ws';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
}

export interface StepUsage {
  stepId: string;
  messageId: string;
  sessionId: string;
  userId: string;
  tool?: string;
  stepType: 'request' | 'response' | 'tool_use' | 'tool_result';
  tokens: TokenUsage;
  cost: number;
  timestamp: Date;
  model: string;
  retryAttempt: number;
  duration: number;
}

export interface CostSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  totalCost: number;
  totalTokens: TokenUsage;
  stepCount: number;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  metadata?: Record<string, any>;
}

export interface CostConfig {
  // Claude 3.5 Sonnet pricing (per 1M tokens)
  inputTokenPrice: number;  // $3.00
  outputTokenPrice: number; // $15.00
  cacheCreationPrice: number; // $3.75
  cacheReadPrice: number;   // $0.30

  // Billing settings
  enableDeduplication: boolean;
  retentionDays: number;
  maxRetryAttempts: number;
  alertThresholds: {
    costPerSession: number;
    costPerHour: number;
    tokenPerMinute: number;
  };
}

export class CostTracker extends EventEmitter {
  private db: Database.Database;
  private config: CostConfig;
  private messageDeduplicator: Set<string>;
  private sessionCache: Map<string, CostSession>;
  private webSocketServer?: WebSocketServer;
  private retryQueue: Map<string, { attempt: number; data: any; timestamp: Date }>;

  constructor(dbPath: string, config: Partial<CostConfig> = {}) {
    super();

    this.config = {
      inputTokenPrice: 3.00,
      outputTokenPrice: 15.00,
      cacheCreationPrice: 3.75,
      cacheReadPrice: 0.30,
      enableDeduplication: true,
      retentionDays: 90,
      maxRetryAttempts: 3,
      alertThresholds: {
        costPerSession: 10.00,
        costPerHour: 100.00,
        tokenPerMinute: 10000
      },
      ...config
    };

    this.messageDeduplicator = new Set();
    this.sessionCache = new Map();
    this.retryQueue = new Map();

    // Initialize database
    this.db = new Database(dbPath);
    this.initializeDatabase();

    // Start background tasks
    this.startBackgroundTasks();
  }

  private initializeDatabase(): void {
    // Create tables for cost tracking
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
        status TEXT NOT NULL DEFAULT 'active',
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS step_usage (
        id TEXT PRIMARY KEY,
        step_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        tool TEXT,
        step_type TEXT NOT NULL,
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
        FOREIGN KEY (session_id) REFERENCES cost_sessions (session_id)
      );

      CREATE TABLE IF NOT EXISTS processed_messages (
        message_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        cost REAL NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_step_usage_session_id ON step_usage(session_id);
      CREATE INDEX IF NOT EXISTS idx_step_usage_user_id ON step_usage(user_id);
      CREATE INDEX IF NOT EXISTS idx_step_usage_timestamp ON step_usage(timestamp);
      CREATE INDEX IF NOT EXISTS idx_processed_messages_session_id ON processed_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_cost_sessions_user_id ON cost_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_cost_sessions_start_time ON cost_sessions(start_time);
    `);
  }

  /**
   * Start a new cost tracking session
   */
  public startSession(sessionId: string, userId: string, metadata?: Record<string, any>): CostSession {
    const session: CostSession = {
      sessionId,
      userId,
      startTime: new Date(),
      totalCost: 0,
      totalTokens: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0
      },
      stepCount: 0,
      status: 'active',
      metadata
    };

    // Store in database
    const stmt = this.db.prepare(`
      INSERT INTO cost_sessions (
        session_id, user_id, start_time, metadata
      ) VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      sessionId,
      userId,
      session.startTime.toISOString(),
      metadata ? JSON.stringify(metadata) : null
    );

    // Cache in memory
    this.sessionCache.set(sessionId, session);

    this.emit('sessionStarted', session);
    return session;
  }

  /**
   * Track step usage with deduplication
   */
  public async trackStepUsage(stepUsage: Omit<StepUsage, 'cost'>): Promise<boolean> {
    const { messageId, sessionId } = stepUsage;

    try {
      // Check for deduplication
      if (this.config.enableDeduplication && this.isMessageProcessed(messageId)) {
        console.log(`Message ${messageId} already processed, skipping...`);
        return false;
      }

      // Calculate cost
      const cost = this.calculateCost(stepUsage.tokens);
      const fullStepUsage: StepUsage = { ...stepUsage, cost };

      // Start transaction
      const transaction = this.db.transaction(() => {
        // Insert step usage
        const stepStmt = this.db.prepare(`
          INSERT INTO step_usage (
            id, step_id, message_id, session_id, user_id, tool, step_type,
            input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
            cost, timestamp, model, retry_attempt, duration
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stepStmt.run(
          uuidv4(),
          stepUsage.stepId,
          messageId,
          sessionId,
          stepUsage.userId,
          stepUsage.tool || null,
          stepUsage.stepType,
          stepUsage.tokens.inputTokens,
          stepUsage.tokens.outputTokens,
          stepUsage.tokens.cacheCreationTokens || 0,
          stepUsage.tokens.cacheReadTokens || 0,
          cost,
          stepUsage.timestamp.toISOString(),
          stepUsage.model,
          stepUsage.retryAttempt,
          stepUsage.duration
        );

        // Mark message as processed
        const processedStmt = this.db.prepare(`
          INSERT OR IGNORE INTO processed_messages (message_id, session_id, cost)
          VALUES (?, ?, ?)
        `);
        processedStmt.run(messageId, sessionId, cost);

        // Update session totals
        const updateSessionStmt = this.db.prepare(`
          UPDATE cost_sessions SET
            total_cost = total_cost + ?,
            input_tokens = input_tokens + ?,
            output_tokens = output_tokens + ?,
            cache_creation_tokens = cache_creation_tokens + ?,
            cache_read_tokens = cache_read_tokens + ?,
            step_count = step_count + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE session_id = ?
        `);

        updateSessionStmt.run(
          cost,
          stepUsage.tokens.inputTokens,
          stepUsage.tokens.outputTokens,
          stepUsage.tokens.cacheCreationTokens || 0,
          stepUsage.tokens.cacheReadTokens || 0,
          sessionId
        );
      });

      transaction();

      // Update session cache
      const session = this.sessionCache.get(sessionId);
      if (session) {
        session.totalCost += cost;
        session.totalTokens.inputTokens += stepUsage.tokens.inputTokens;
        session.totalTokens.outputTokens += stepUsage.tokens.outputTokens;
        session.totalTokens.cacheCreationTokens = (session.totalTokens.cacheCreationTokens || 0) + (stepUsage.tokens.cacheCreationTokens || 0);
        session.totalTokens.cacheReadTokens = (session.totalTokens.cacheReadTokens || 0) + (stepUsage.tokens.cacheReadTokens || 0);
        session.totalTokens.totalTokens = session.totalTokens.inputTokens + session.totalTokens.outputTokens;
        session.stepCount++;
      }

      // Add to deduplication set
      this.messageDeduplicator.add(messageId);

      // Emit events
      this.emit('stepTracked', fullStepUsage);
      this.emit('costUpdated', { sessionId, cost, totalCost: session?.totalCost || cost });

      // Check thresholds
      this.checkAlertThresholds(sessionId, cost);

      // Broadcast via WebSocket if available
      this.broadcastCostUpdate(sessionId, fullStepUsage);

      return true;

    } catch (error) {
      console.error('Error tracking step usage:', error);

      // Add to retry queue
      if (stepUsage.retryAttempt < this.config.maxRetryAttempts) {
        this.addToRetryQueue(messageId, { ...stepUsage, retryAttempt: stepUsage.retryAttempt + 1 });
      }

      throw error;
    }
  }

  /**
   * Calculate cost based on token usage
   */
  private calculateCost(tokens: TokenUsage): number {
    const inputCost = (tokens.inputTokens / 1_000_000) * this.config.inputTokenPrice;
    const outputCost = (tokens.outputTokens / 1_000_000) * this.config.outputTokenPrice;
    const cacheCreationCost = ((tokens.cacheCreationTokens || 0) / 1_000_000) * this.config.cacheCreationPrice;
    const cacheReadCost = ((tokens.cacheReadTokens || 0) / 1_000_000) * this.config.cacheReadPrice;

    return inputCost + outputCost + cacheCreationCost + cacheReadCost;
  }

  /**
   * Check if a message has already been processed
   */
  private isMessageProcessed(messageId: string): boolean {
    if (this.messageDeduplicator.has(messageId)) {
      return true;
    }

    // Check database
    const stmt = this.db.prepare('SELECT 1 FROM processed_messages WHERE message_id = ?');
    const result = stmt.get(messageId);

    if (result) {
      this.messageDeduplicator.add(messageId);
      return true;
    }

    return false;
  }

  /**
   * End a cost tracking session
   */
  public endSession(sessionId: string, status: CostSession['status'] = 'completed'): CostSession | null {
    const session = this.sessionCache.get(sessionId);
    if (!session) {
      // Try to load from database
      const stmt = this.db.prepare('SELECT * FROM cost_sessions WHERE session_id = ?');
      const dbSession = stmt.get(sessionId) as any;
      if (!dbSession) return null;
    }

    const endTime = new Date();

    // Update database
    const stmt = this.db.prepare(`
      UPDATE cost_sessions SET
        end_time = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `);

    stmt.run(endTime.toISOString(), status, sessionId);

    // Update cache
    if (session) {
      session.endTime = endTime;
      session.status = status;
    }

    this.emit('sessionEnded', { sessionId, status, endTime });

    // Remove from active cache after a delay
    setTimeout(() => {
      this.sessionCache.delete(sessionId);
    }, 300000); // 5 minutes

    return session;
  }

  /**
   * Get session cost data
   */
  public getSessionCost(sessionId: string): CostSession | null {
    // Check cache first
    const cached = this.sessionCache.get(sessionId);
    if (cached) return cached;

    // Query database
    const stmt = this.db.prepare(`
      SELECT
        session_id, user_id, start_time, end_time, total_cost,
        input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
        step_count, status, metadata
      FROM cost_sessions
      WHERE session_id = ?
    `);

    const row = stmt.get(sessionId) as any;
    if (!row) return null;

    return {
      sessionId: row.session_id,
      userId: row.user_id,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : undefined,
      totalCost: row.total_cost,
      totalTokens: {
        inputTokens: row.input_tokens,
        outputTokens: row.output_tokens,
        totalTokens: row.input_tokens + row.output_tokens,
        cacheCreationTokens: row.cache_creation_tokens,
        cacheReadTokens: row.cache_read_tokens
      },
      stepCount: row.step_count,
      status: row.status,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    };
  }

  /**
   * Get usage analytics
   */
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

    // Aggregate by time period
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
        MAX(cost) as max_cost
      FROM step_usage
      WHERE ${whereClause}
      GROUP BY period
      ORDER BY period
    `);

    return stmt.all(queryParams);
  }

  /**
   * Get top cost consumers
   */
  public getTopCostConsumers(params: {
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
        AVG(cost) as avg_cost_per_step
      FROM step_usage
      WHERE ${whereClause} AND ${groupByField} IS NOT NULL
      GROUP BY ${groupByField}
      ORDER BY total_cost DESC
      LIMIT ?
    `);

    queryParams.push(limit);
    return stmt.all(queryParams);
  }

  /**
   * Check alert thresholds
   */
  private checkAlertThresholds(sessionId: string, stepCost: number): void {
    const session = this.sessionCache.get(sessionId);
    if (!session) return;

    // Check session cost threshold
    if (session.totalCost > this.config.alertThresholds.costPerSession) {
      this.emit('alert', {
        type: 'session_cost_threshold',
        sessionId,
        threshold: this.config.alertThresholds.costPerSession,
        currentCost: session.totalCost
      });
    }

    // Check hourly cost threshold
    const hourAgo = new Date(Date.now() - 3600000);
    const hourlyCostStmt = this.db.prepare(`
      SELECT COALESCE(SUM(cost), 0) as hourly_cost
      FROM step_usage
      WHERE user_id = ? AND timestamp >= ?
    `);

    const hourlyCost = hourlyCostStmt.get(session.userId, hourAgo.toISOString()) as any;
    if (hourlyCost?.hourly_cost > this.config.alertThresholds.costPerHour) {
      this.emit('alert', {
        type: 'hourly_cost_threshold',
        userId: session.userId,
        threshold: this.config.alertThresholds.costPerHour,
        currentCost: hourlyCost.hourly_cost
      });
    }
  }

  /**
   * Add failed operation to retry queue
   */
  private addToRetryQueue(messageId: string, data: any): void {
    this.retryQueue.set(messageId, {
      attempt: data.retryAttempt,
      data,
      timestamp: new Date()
    });
  }

  /**
   * Process retry queue
   */
  private async processRetryQueue(): Promise<void> {
    const now = new Date();
    const retryInterval = 5000; // 5 seconds

    for (const [messageId, retryItem] of this.retryQueue.entries()) {
      if (now.getTime() - retryItem.timestamp.getTime() > retryInterval) {
        try {
          await this.trackStepUsage(retryItem.data);
          this.retryQueue.delete(messageId);
        } catch (error) {
          if (retryItem.attempt >= this.config.maxRetryAttempts) {
            console.error(`Max retry attempts reached for message ${messageId}:`, error);
            this.retryQueue.delete(messageId);
            this.emit('retryFailed', { messageId, error, attempts: retryItem.attempt });
          } else {
            retryItem.attempt++;
            retryItem.timestamp = now;
          }
        }
      }
    }
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoffDate = new Date(Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000));

    const transaction = this.db.transaction(() => {
      // Clean up old step usage
      const cleanupStepsStmt = this.db.prepare(`
        DELETE FROM step_usage
        WHERE timestamp < ?
      `);
      cleanupStepsStmt.run(cutoffDate.toISOString());

      // Clean up old processed messages
      const cleanupMessagesStmt = this.db.prepare(`
        DELETE FROM processed_messages
        WHERE processed_at < ?
      `);
      cleanupMessagesStmt.run(cutoffDate.toISOString());

      // Clean up old sessions
      const cleanupSessionsStmt = this.db.prepare(`
        DELETE FROM cost_sessions
        WHERE start_time < ? AND status != 'active'
      `);
      cleanupSessionsStmt.run(cutoffDate.toISOString());
    });

    transaction();

    console.log(`Cleaned up data older than ${this.config.retentionDays} days`);
  }

  /**
   * Setup WebSocket for real-time updates
   */
  public setupWebSocket(port: number): void {
    this.webSocketServer = new WebSocketServer({ port });

    this.webSocketServer.on('connection', (ws) => {
      console.log('Cost tracker WebSocket client connected');

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'subscribe' && message.sessionId) {
            // Store session ID for this connection
            (ws as any).sessionId = message.sessionId;
            ws.send(JSON.stringify({
              type: 'subscribed',
              sessionId: message.sessionId
            }));
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        console.log('Cost tracker WebSocket client disconnected');
      });
    });
  }

  /**
   * Broadcast cost updates via WebSocket
   */
  private broadcastCostUpdate(sessionId: string, stepUsage: StepUsage): void {
    if (!this.webSocketServer) return;

    const message = {
      type: 'costUpdate',
      sessionId,
      stepUsage,
      timestamp: new Date().toISOString()
    };

    this.webSocketServer.clients.forEach((client) => {
      if (client.readyState === 1 && (client as any).sessionId === sessionId) {
        client.send(JSON.stringify(message));
      }
    });
  }

  /**
   * Start background tasks
   */
  private startBackgroundTasks(): void {
    // Process retry queue every 5 seconds
    setInterval(() => {
      this.processRetryQueue().catch(console.error);
    }, 5000);

    // Clean up old data daily
    setInterval(() => {
      this.cleanupOldData();
    }, 24 * 60 * 60 * 1000);

    // Clear deduplication cache every hour (keep only recent messages)
    setInterval(() => {
      if (this.messageDeduplicator.size > 10000) {
        this.messageDeduplicator.clear();
      }
    }, 60 * 60 * 1000);
  }

  /**
   * Get real-time metrics
   */
  public getRealTimeMetrics() {
    const activeSessions = Array.from(this.sessionCache.values()).filter(s => s.status === 'active');

    return {
      activeSessions: activeSessions.length,
      totalActiveCost: activeSessions.reduce((sum, s) => sum + s.totalCost, 0),
      totalActiveTokens: activeSessions.reduce((sum, s) => sum + s.totalTokens.totalTokens, 0),
      retryQueueSize: this.retryQueue.size,
      deduplicationCacheSize: this.messageDeduplicator.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Close the cost tracker and cleanup resources
   */
  public close(): void {
    this.db.close();
    if (this.webSocketServer) {
      this.webSocketServer.close();
    }
    this.removeAllListeners();
  }
}