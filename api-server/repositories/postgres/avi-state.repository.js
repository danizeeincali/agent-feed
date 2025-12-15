/**
 * PostgreSQL Avi State Repository
 * Manages Avi orchestrator state (single row, id=1)
 * Tracks feed position, context size, worker count, and health status
 *
 * Phase 1: AVI Architecture
 */

import postgresManager from '../../config/postgres.js';

class AviStateRepository {
  /**
   * Get current Avi orchestrator state
   * @returns {Promise<object|null>} Current state or null
   */
  async getState() {
    const query = `
      SELECT
        id,
        last_feed_position,
        pending_tickets,
        context_size,
        last_restart,
        uptime_seconds,
        status,
        start_time,
        tickets_processed,
        workers_spawned,
        active_workers,
        last_health_check,
        last_error,
        updated_at
      FROM avi_state
      WHERE id = 1
    `;

    const result = await postgresManager.query(query);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Update Avi state (multiple fields)
   * @param {object} updates - Fields to update
   * @returns {Promise<object>} Updated state
   */
  async updateState(updates) {
    const allowedFields = [
      'last_feed_position',
      'pending_tickets',
      'context_size',
      'last_restart',
      'uptime_seconds',
      'status',
      'start_time',
      'tickets_processed',
      'workers_spawned',
      'active_workers',
      'last_health_check',
      'last_error'
    ];

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === 'pending_tickets' && value) {
          // JSONB field - stringify if object/array
          setClauses.push(`${key} = $${paramIndex}::jsonb`);
          values.push(JSON.stringify(value));
        } else {
          setClauses.push(`${key} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Always update updated_at
    setClauses.push('updated_at = NOW()');

    const query = `
      UPDATE avi_state
      SET ${setClauses.join(', ')}
      WHERE id = 1
      RETURNING *
    `;

    const result = await postgresManager.query(query, values);
    return result.rows[0];
  }

  /**
   * Update context size (common operation)
   * @param {number} contextSize - Current token count
   * @returns {Promise<object>} Updated state
   */
  async updateContextSize(contextSize) {
    const query = `
      UPDATE avi_state
      SET context_size = $1, updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `;

    const result = await postgresManager.query(query, [contextSize]);
    return result.rows[0];
  }

  /**
   * Update feed position (common operation)
   * @param {string} postId - Last processed post ID
   * @returns {Promise<object>} Updated state
   */
  async updateFeedPosition(postId) {
    const query = `
      UPDATE avi_state
      SET last_feed_position = $1, updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `;

    const result = await postgresManager.query(query, [postId]);
    return result.rows[0];
  }

  /**
   * Update active workers count
   * @param {number} count - Number of active workers
   * @returns {Promise<object>} Updated state
   */
  async updateActiveWorkers(count) {
    const query = `
      UPDATE avi_state
      SET active_workers = $1, updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `;

    const result = await postgresManager.query(query, [count]);
    return result.rows[0];
  }

  /**
   * Increment workers spawned counter
   * @returns {Promise<object>} Updated state
   */
  async incrementWorkersSpawned() {
    const query = `
      UPDATE avi_state
      SET workers_spawned = COALESCE(workers_spawned, 0) + 1,
          updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `;

    const result = await postgresManager.query(query);
    return result.rows[0];
  }

  /**
   * Increment tickets processed counter
   * @returns {Promise<object>} Updated state
   */
  async incrementTicketsProcessed() {
    const query = `
      UPDATE avi_state
      SET tickets_processed = COALESCE(tickets_processed, 0) + 1,
          updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `;

    const result = await postgresManager.query(query);
    return result.rows[0];
  }

  /**
   * Record graceful restart
   * @param {Array<string>} pendingTicketIds - IDs of tickets to preserve
   * @returns {Promise<object>} Updated state
   */
  async recordRestart(pendingTicketIds = []) {
    const query = `
      UPDATE avi_state
      SET last_restart = NOW(),
          pending_tickets = $1::jsonb,
          context_size = 0,
          status = 'restarting',
          updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `;

    const result = await postgresManager.query(query, [
      JSON.stringify(pendingTicketIds)
    ]);
    return result.rows[0];
  }

  /**
   * Mark orchestrator as running (after restart)
   * @returns {Promise<object>} Updated state
   */
  async markRunning() {
    const query = `
      UPDATE avi_state
      SET status = 'running',
          start_time = NOW(),
          updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `;

    const result = await postgresManager.query(query);
    return result.rows[0];
  }

  /**
   * Record health check
   * @param {string|null} error - Error message if unhealthy
   * @returns {Promise<object>} Updated state
   */
  async recordHealthCheck(error = null) {
    const query = `
      UPDATE avi_state
      SET last_health_check = NOW(),
          last_error = $1,
          updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `;

    const result = await postgresManager.query(query, [error]);
    return result.rows[0];
  }

  /**
   * Check if context size exceeds limit
   * @param {number} limit - Token limit (default 50000)
   * @returns {Promise<boolean>} True if exceeds limit
   */
  async isContextOverLimit(limit = 50000) {
    const state = await this.getState();
    return state ? state.context_size > limit : false;
  }

  /**
   * Get orchestrator uptime in seconds
   * @returns {Promise<number>} Uptime in seconds
   */
  async getUptime() {
    const query = `
      SELECT EXTRACT(EPOCH FROM (NOW() - start_time))::integer as uptime
      FROM avi_state
      WHERE id = 1 AND start_time IS NOT NULL
    `;

    const result = await postgresManager.query(query);
    return result.rows.length > 0 ? result.rows[0].uptime : 0;
  }

  /**
   * Get orchestrator metrics summary
   * @returns {Promise<object>} Metrics object
   */
  async getMetrics() {
    const state = await this.getState();
    if (!state) return null;

    return {
      status: state.status,
      context_size: state.context_size,
      active_workers: state.active_workers || 0,
      workers_spawned: state.workers_spawned || 0,
      tickets_processed: state.tickets_processed || 0,
      uptime_seconds: state.uptime_seconds || 0,
      last_health_check: state.last_health_check,
      last_error: state.last_error,
      last_feed_position: state.last_feed_position
    };
  }

  /**
   * Initialize or reset state (use with caution)
   * @returns {Promise<object>} Fresh state
   */
  async initialize() {
    const query = `
      INSERT INTO avi_state (
        id,
        status,
        context_size,
        start_time,
        tickets_processed,
        workers_spawned,
        active_workers,
        updated_at
      )
      VALUES (1, 'initializing', 0, NOW(), 0, 0, 0, NOW())
      ON CONFLICT (id) DO UPDATE SET
        status = 'initializing',
        context_size = 0,
        start_time = NOW(),
        updated_at = NOW()
      RETURNING *
    `;

    const result = await postgresManager.query(query);
    return result.rows[0];
  }
}

export default new AviStateRepository();
