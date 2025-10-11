/**
 * AviStateRepository
 *
 * Manages the persistent state of the Avi DM orchestrator.
 * This is a singleton table (only one row) that tracks orchestrator status,
 * feed position, context size, and health metrics.
 */

import { query } from '../database/pg-pool';
import type { QueryResult } from 'pg';

export interface AviState {
  id: number;
  last_feed_position: string | null;
  pending_tickets: Record<string, any> | null;
  context_size: number;
  last_restart: Date | null;
  uptime_seconds: number;
  status: string | null;
  start_time: Date | null;
  tickets_processed: number;
  workers_spawned: number;
  active_workers: number;
  last_health_check: Date | null;
  last_error: string | null;
  updated_at: Date | null;
}

export interface UpdateAviStateInput {
  last_feed_position?: string | null;
  pending_tickets?: Record<string, any> | null;
  context_size?: number;
  last_restart?: Date | null;
  uptime_seconds?: number;
  status?: string | null;
  start_time?: Date | null;
  tickets_processed?: number;
  workers_spawned?: number;
  active_workers?: number;
  last_health_check?: Date | null;
  last_error?: string | null;
}

export class AviStateRepository {
  private readonly STATE_ID = 1; // Single row constraint

  /**
   * Get current orchestrator state
   * Initializes state if it doesn't exist
   */
  async get(): Promise<AviState> {
    const result: QueryResult<AviState> = await query(
      `SELECT * FROM avi_state WHERE id = $1`,
      [this.STATE_ID]
    );

    if (result.rows.length === 0) {
      // Initialize state if it doesn't exist
      return await this.initialize();
    }

    return result.rows[0];
  }

  /**
   * Initialize orchestrator state (called on first run)
   */
  async initialize(): Promise<AviState> {
    const result: QueryResult<AviState> = await query(
      `INSERT INTO avi_state (id, context_size, uptime_seconds, tickets_processed, workers_spawned, active_workers)
       VALUES ($1, 0, 0, 0, 0, 0)
       ON CONFLICT (id) DO NOTHING
       RETURNING *`,
      [this.STATE_ID]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // If insert was skipped due to conflict, fetch existing row
    return await this.get();
  }

  /**
   * Update orchestrator state
   * Supports partial updates
   */
  async update(updates: UpdateAviStateInput): Promise<AviState> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.last_feed_position !== undefined) {
      updateFields.push(`last_feed_position = $${paramCount++}`);
      values.push(updates.last_feed_position);
    }

    if (updates.pending_tickets !== undefined) {
      updateFields.push(`pending_tickets = $${paramCount++}`);
      values.push(updates.pending_tickets ? JSON.stringify(updates.pending_tickets) : null);
    }

    if (updates.context_size !== undefined) {
      updateFields.push(`context_size = $${paramCount++}`);
      values.push(updates.context_size);
    }

    if (updates.last_restart !== undefined) {
      updateFields.push(`last_restart = $${paramCount++}`);
      values.push(updates.last_restart);
    }

    if (updates.uptime_seconds !== undefined) {
      updateFields.push(`uptime_seconds = $${paramCount++}`);
      values.push(updates.uptime_seconds);
    }

    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }

    if (updates.start_time !== undefined) {
      updateFields.push(`start_time = $${paramCount++}`);
      values.push(updates.start_time);
    }

    if (updates.tickets_processed !== undefined) {
      updateFields.push(`tickets_processed = $${paramCount++}`);
      values.push(updates.tickets_processed);
    }

    if (updates.workers_spawned !== undefined) {
      updateFields.push(`workers_spawned = $${paramCount++}`);
      values.push(updates.workers_spawned);
    }

    if (updates.active_workers !== undefined) {
      updateFields.push(`active_workers = $${paramCount++}`);
      values.push(updates.active_workers);
    }

    if (updates.last_health_check !== undefined) {
      updateFields.push(`last_health_check = $${paramCount++}`);
      values.push(updates.last_health_check);
    }

    if (updates.last_error !== undefined) {
      updateFields.push(`last_error = $${paramCount++}`);
      values.push(updates.last_error);
    }

    // Always update updated_at
    updateFields.push(`updated_at = NOW()`);

    // Add STATE_ID as last parameter
    values.push(this.STATE_ID);

    const result: QueryResult<AviState> = await query(
      `UPDATE avi_state
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Get last feed position
   */
  async getLastFeedPosition(): Promise<string | null> {
    const result = await query(
      `SELECT last_feed_position FROM avi_state WHERE id = $1`,
      [this.STATE_ID]
    );

    return result.rows[0]?.last_feed_position || null;
  }

  /**
   * Set last feed position
   */
  async setLastFeedPosition(position: string): Promise<void> {
    await query(
      `UPDATE avi_state SET last_feed_position = $1, updated_at = NOW() WHERE id = $2`,
      [position, this.STATE_ID]
    );
  }

  /**
   * Get current context size
   */
  async getContextSize(): Promise<number> {
    const result = await query(
      `SELECT context_size FROM avi_state WHERE id = $1`,
      [this.STATE_ID]
    );

    return result.rows[0]?.context_size || 0;
  }

  /**
   * Increment context size (add tokens)
   */
  async incrementContextSize(tokens: number): Promise<number> {
    const result = await query(
      `UPDATE avi_state
       SET context_size = context_size + $1, updated_at = NOW()
       WHERE id = $2
       RETURNING context_size`,
      [tokens, this.STATE_ID]
    );

    return result.rows[0].context_size;
  }

  /**
   * Reset context size (after graceful restart)
   */
  async resetContextSize(): Promise<void> {
    await query(
      `UPDATE avi_state SET context_size = 0, updated_at = NOW() WHERE id = $1`,
      [this.STATE_ID]
    );
  }

  /**
   * Increment tickets processed counter
   */
  async incrementTicketsProcessed(): Promise<number> {
    const result = await query(
      `UPDATE avi_state
       SET tickets_processed = tickets_processed + 1, updated_at = NOW()
       WHERE id = $1
       RETURNING tickets_processed`,
      [this.STATE_ID]
    );

    return result.rows[0].tickets_processed;
  }

  /**
   * Increment workers spawned counter
   */
  async incrementWorkersSpawned(): Promise<number> {
    const result = await query(
      `UPDATE avi_state
       SET workers_spawned = workers_spawned + 1, updated_at = NOW()
       WHERE id = $1
       RETURNING workers_spawned`,
      [this.STATE_ID]
    );

    return result.rows[0].workers_spawned;
  }

  /**
   * Set active workers count
   */
  async setActiveWorkers(count: number): Promise<void> {
    await query(
      `UPDATE avi_state SET active_workers = $1, updated_at = NOW() WHERE id = $2`,
      [count, this.STATE_ID]
    );
  }

  /**
   * Record health check
   */
  async recordHealthCheck(error: string | null = null): Promise<void> {
    await query(
      `UPDATE avi_state
       SET last_health_check = NOW(), last_error = $1, updated_at = NOW()
       WHERE id = $2`,
      [error, this.STATE_ID]
    );
  }

  /**
   * Record orchestrator restart
   */
  async recordRestart(): Promise<void> {
    await query(
      `UPDATE avi_state
       SET last_restart = NOW(),
           context_size = 0,
           status = 'restarting',
           updated_at = NOW()
       WHERE id = $1`,
      [this.STATE_ID]
    );
  }

  /**
   * Check if context limit is approaching (50K tokens)
   */
  async isContextLimitApproaching(threshold: number = 50000): Promise<boolean> {
    const contextSize = await this.getContextSize();
    return contextSize >= threshold;
  }

  /**
   * Get uptime in seconds
   */
  async getUptime(): Promise<number> {
    const result = await query(
      `SELECT uptime_seconds FROM avi_state WHERE id = $1`,
      [this.STATE_ID]
    );

    return result.rows[0]?.uptime_seconds || 0;
  }

  /**
   * Increment uptime (called periodically)
   */
  async incrementUptime(seconds: number): Promise<void> {
    await query(
      `UPDATE avi_state
       SET uptime_seconds = uptime_seconds + $1, updated_at = NOW()
       WHERE id = $2`,
      [seconds, this.STATE_ID]
    );
  }
}

// Singleton instance
export const aviStateRepository = new AviStateRepository();
