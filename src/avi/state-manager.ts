/**
 * Avi State Manager
 * Handles persistence of orchestrator state to database
 * TDD London School Implementation
 */

import { AviState, AviStatus } from '../types/avi';
import { DatabaseManager } from '../types/database-manager';

/**
 * State history entry from database
 */
interface StateHistoryEntry {
  id: number;
  status: AviStatus;
  context_size: number;
  created_at: Date;
  tickets_processed: number;
  workers_spawned: number;
}

/**
 * StateManager
 * Manages persistence and retrieval of Avi orchestrator state
 */
export class StateManager {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  /**
   * Save orchestrator state to database
   * Uses upsert pattern (INSERT ... ON CONFLICT)
   */
  async saveState(state: AviState): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO avi_state (
          id, status, start_time, context_size,
          tickets_processed, workers_spawned, active_workers,
          last_health_check, last_error, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (id)
        DO UPDATE SET
          status = EXCLUDED.status,
          start_time = EXCLUDED.start_time,
          context_size = EXCLUDED.context_size,
          tickets_processed = EXCLUDED.tickets_processed,
          workers_spawned = EXCLUDED.workers_spawned,
          active_workers = EXCLUDED.active_workers,
          last_health_check = EXCLUDED.last_health_check,
          last_error = EXCLUDED.last_error,
          updated_at = NOW()`,
        [
          1, // Always use ID 1 for singleton pattern
          state.status,
          state.startTime,
          state.contextSize,
          state.ticketsProcessed,
          state.workersSpawned,
          state.activeWorkers,
          state.lastHealthCheck || null,
          state.lastError || null,
        ]
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Load orchestrator state from database
   * Returns null if no state exists
   */
  async loadState(): Promise<AviState | null> {
    try {
      const result = await this.db.query<{
        status: AviStatus;
        start_time: Date;
        context_size: number;
        tickets_processed: number;
        workers_spawned: number;
        active_workers: number;
        last_health_check?: Date;
        last_error?: string;
      }>(
        `SELECT
          status, start_time, context_size,
          tickets_processed, workers_spawned, active_workers,
          last_health_check, last_error
         FROM avi_state
         WHERE id = $1`,
        [1]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      return {
        status: row.status,
        startTime: row.start_time,
        contextSize: row.context_size,
        ticketsProcessed: row.tickets_processed,
        workersSpawned: row.workers_spawned,
        activeWorkers: row.active_workers,
        lastHealthCheck: row.last_health_check,
        lastError: row.last_error,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update partial state fields
   * Only updates provided fields, leaves others unchanged
   */
  async updateState(partialState: Partial<AviState>): Promise<void> {
    // If empty update, skip query
    if (Object.keys(partialState).length === 0) {
      return;
    }

    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic UPDATE query based on provided fields
      if (partialState.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(partialState.status);
      }

      if (partialState.contextSize !== undefined) {
        updates.push(`context_size = $${paramIndex++}`);
        values.push(partialState.contextSize);
      }

      if (partialState.activeWorkers !== undefined) {
        updates.push(`active_workers = $${paramIndex++}`);
        values.push(partialState.activeWorkers);
      }

      if (partialState.ticketsProcessed !== undefined) {
        updates.push(`tickets_processed = $${paramIndex++}`);
        values.push(partialState.ticketsProcessed);
      }

      if (partialState.workersSpawned !== undefined) {
        updates.push(`workers_spawned = $${paramIndex++}`);
        values.push(partialState.workersSpawned);
      }

      if (partialState.lastHealthCheck !== undefined) {
        updates.push(`last_health_check = $${paramIndex++}`);
        values.push(partialState.lastHealthCheck);
      }

      if (partialState.lastError !== undefined) {
        updates.push(`last_error = $${paramIndex++}`);
        values.push(partialState.lastError);
      }

      updates.push(`updated_at = NOW()`);

      const query = `UPDATE avi_state SET ${updates.join(', ')} WHERE id = 1`;

      await this.db.query(query, values);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get state history audit trail
   * Returns historical state entries for monitoring
   */
  async getStateHistory(limit: number = 100): Promise<StateHistoryEntry[]> {
    try {
      const result = await this.db.query<StateHistoryEntry>(
        `SELECT
          id, status, context_size, created_at,
          tickets_processed, workers_spawned
         FROM avi_state_history
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      // If table doesn't exist yet, return empty array
      return [];
    }
  }

  /**
   * Record restart event in database
   * Tracks when and why orchestrator restarts occur
   */
  async recordRestart(reason?: string): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO avi_restarts (reason, restarted_at)
         VALUES ($1, $2)`,
        [reason || null, new Date()]
      );
    } catch (error) {
      // Log error but don't throw - restart recording is not critical
      console.error('Failed to record restart:', error);
    }
  }
}
