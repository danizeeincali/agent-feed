/**
 * PostgreSQL Work Queue Repository
 * Manages work tickets for agent workers
 * Handles ticket creation, assignment, status updates, and priority-based retrieval
 *
 * Phase 1: AVI Architecture
 */

import postgresManager from '../../config/postgres.js';

class WorkQueueRepository {
  /**
   * Create a new work ticket
   * @param {object} ticket - Ticket data
   * @returns {Promise<object>} Created ticket
   */
  async createTicket(ticket) {
    const query = `
      INSERT INTO work_queue (
        user_id,
        post_id,
        post_content,
        post_author,
        post_metadata,
        assigned_agent,
        priority,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, 'pending', NOW(), NOW())
      RETURNING *
    `;

    const values = [
      ticket.user_id || 'anonymous',
      ticket.post_id,
      ticket.post_content,
      ticket.post_author || null,
      JSON.stringify(ticket.post_metadata || {}),
      ticket.assigned_agent || null,
      ticket.priority || 0
    ];

    const result = await postgresManager.query(query, values);
    return result.rows[0];
  }

  /**
   * Get next pending ticket by priority
   * @param {string} userId - Optional user filter
   * @returns {Promise<object|null>} Next ticket or null
   */
  async getNextTicket(userId = null) {
    const query = userId
      ? `
        SELECT * FROM work_queue
        WHERE status = 'pending' AND user_id = $1
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
      `
      : `
        SELECT * FROM work_queue
        WHERE status = 'pending'
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
      `;

    const result = userId
      ? await postgresManager.query(query, [userId])
      : await postgresManager.query(query);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get ticket by ID
   * @param {number} ticketId - Ticket ID
   * @returns {Promise<object|null>} Ticket or null
   */
  async getTicketById(ticketId) {
    const query = `
      SELECT * FROM work_queue
      WHERE id = $1
    `;

    const result = await postgresManager.query(query, [ticketId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Assign ticket to agent worker
   * @param {number} ticketId - Ticket ID
   * @param {string} workerId - Worker ID
   * @returns {Promise<object>} Updated ticket
   */
  async assignTicket(ticketId, workerId) {
    const query = `
      UPDATE work_queue
      SET status = 'assigned',
          worker_id = $1,
          assigned_at = NOW(),
          updated_at = NOW()
      WHERE id = $2 AND status = 'pending'
      RETURNING *
    `;

    const result = await postgresManager.query(query, [workerId, ticketId]);
    if (result.rows.length === 0) {
      throw new Error(`Ticket ${ticketId} not found or already assigned`);
    }
    return result.rows[0];
  }

  /**
   * Mark ticket as processing (worker started)
   * @param {number} ticketId - Ticket ID
   * @returns {Promise<object>} Updated ticket
   */
  async startProcessing(ticketId) {
    const query = `
      UPDATE work_queue
      SET status = 'processing',
          started_at = NOW(),
          updated_at = NOW()
      WHERE id = $1 AND status = 'assigned'
      RETURNING *
    `;

    const result = await postgresManager.query(query, [ticketId]);
    if (result.rows.length === 0) {
      throw new Error(`Ticket ${ticketId} not found or not in assigned state`);
    }
    return result.rows[0];
  }

  /**
   * Mark ticket as completed with result
   * @param {number} ticketId - Ticket ID
   * @param {object} result - Processing result
   * @returns {Promise<object>} Updated ticket
   */
  async completeTicket(ticketId, result) {
    const query = `
      UPDATE work_queue
      SET status = 'completed',
          result = $1::jsonb,
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = $2 AND status = 'processing'
      RETURNING *
    `;

    const values = [JSON.stringify(result), ticketId];
    const queryResult = await postgresManager.query(query, values);

    if (queryResult.rows.length === 0) {
      throw new Error(`Ticket ${ticketId} not found or not in processing state`);
    }
    return queryResult.rows[0];
  }

  /**
   * Mark ticket as failed with error
   * @param {number} ticketId - Ticket ID
   * @param {string} errorMessage - Error description
   * @param {boolean} shouldRetry - Whether to retry
   * @returns {Promise<object>} Updated ticket
   */
  async failTicket(ticketId, errorMessage, shouldRetry = true) {
    const query = `
      UPDATE work_queue
      SET status = 'failed',
          error_message = $1,
          retry_count = retry_count + 1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await postgresManager.query(query, [errorMessage, ticketId]);
    if (result.rows.length === 0) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    const ticket = result.rows[0];

    // If should retry and under max retries, reset to pending
    if (shouldRetry && ticket.retry_count < 3) {
      return await this.retryTicket(ticketId);
    }

    return ticket;
  }

  /**
   * Retry a failed ticket
   * @param {number} ticketId - Ticket ID
   * @returns {Promise<object>} Updated ticket
   */
  async retryTicket(ticketId) {
    const query = `
      UPDATE work_queue
      SET status = 'pending',
          worker_id = NULL,
          assigned_at = NULL,
          started_at = NULL,
          error_message = NULL,
          updated_at = NOW()
      WHERE id = $1 AND status = 'failed'
      RETURNING *
    `;

    const result = await postgresManager.query(query, [ticketId]);
    if (result.rows.length === 0) {
      throw new Error(`Ticket ${ticketId} not found or not in failed state`);
    }
    return result.rows[0];
  }

  /**
   * Get all tickets for a user
   * @param {string} userId - User ID
   * @param {object} options - Query options (status, limit, offset)
   * @returns {Promise<Array>} List of tickets
   */
  async getTicketsByUser(userId, options = {}) {
    const { status, limit = 100, offset = 0 } = options;

    let query = `
      SELECT * FROM work_queue
      WHERE user_id = $1
    `;

    const values = [userId];

    if (status) {
      query += ` AND status = $2`;
      values.push(status);
    }

    query += `
      ORDER BY priority DESC, created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    values.push(limit, offset);

    const result = await postgresManager.query(query, values);
    return result.rows;
  }

  /**
   * Get pending tickets (orchestrator compatibility method)
   * @param {object} options - Query options
   * @param {number} [options.limit=5] - Maximum number of tickets to return
   * @param {string} [options.agent_id] - Optional filter by agent_id
   * @returns {Promise<Array>} List of pending tickets
   */
  async getPendingTickets(options = {}) {
    const { limit = 5, agent_id = null } = options;

    let query = `
      SELECT * FROM work_queue
      WHERE status = 'pending'
    `;

    const values = [];
    if (agent_id) {
      query += ' AND assigned_agent = $1';
      values.push(agent_id);
    }

    query += ` ORDER BY priority DESC, created_at ASC LIMIT $${values.length + 1}`;
    values.push(limit);

    console.log(`🔍 [WorkQueueRepository] getPendingTickets query:`, { limit, agent_id });
    const result = await postgresManager.query(query, values);
    console.log(`📊 [WorkQueueRepository] Query result: ${result.rows.length} tickets found`);
    if (result.rows.length > 0) {
      console.log(`   First ticket: ID=${result.rows[0].id}, status=${result.rows[0].status}, priority=${result.rows[0].priority}`);
    }
    return result.rows;
  }

  /**
   * Get all pending tickets (for orchestrator)
   * @param {object} options - Query options (status, limit, offset)
   * @returns {Promise<Array>} List of pending tickets
   */
  async getAllPendingTickets(options = {}) {
    const { status = 'pending', limit = 100, offset = 0 } = options;

    let query = `
      SELECT * FROM work_queue
      WHERE status = $1
      ORDER BY priority DESC, created_at ASC
      LIMIT $2 OFFSET $3
    `;

    const values = [status, limit, offset];

    console.log(`🔍 [WorkQueueRepository] getAllPendingTickets query:`, { status, limit, offset });
    const result = await postgresManager.query(query, values);
    console.log(`📊 [WorkQueueRepository] Query result: ${result.rows.length} tickets found`);
    if (result.rows.length > 0) {
      console.log(`   First ticket: ID=${result.rows[0].id}, status=${result.rows[0].status}, priority=${result.rows[0].priority}`);
    }
    return result.rows;
  }

  /**
   * Get tickets assigned to a specific agent
   * @param {string} agentName - Agent template name
   * @param {object} options - Query options
   * @returns {Promise<Array>} List of tickets
   */
  async getTicketsByAgent(agentName, options = {}) {
    const { status, limit = 100, offset = 0 } = options;

    let query = `
      SELECT * FROM work_queue
      WHERE assigned_agent = $1
    `;

    const values = [agentName];

    if (status) {
      query += ` AND status = $2`;
      values.push(status);
    }

    query += `
      ORDER BY created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    values.push(limit, offset);

    const result = await postgresManager.query(query, values);
    return result.rows;
  }

  /**
   * Get queue statistics
   * @returns {Promise<object>} Queue stats
   */
  async getQueueStats() {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'assigned') as assigned_count,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(*) as total_count,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at)))::integer as avg_processing_time_seconds,
        MAX(created_at) as latest_ticket_time
      FROM work_queue
    `;

    const result = await postgresManager.query(query);
    return result.rows[0];
  }

  /**
   * Get pending ticket count for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Count of pending tickets
   */
  async getPendingCount(userId = null) {
    const query = userId
      ? `SELECT COUNT(*) as count FROM work_queue WHERE status = 'pending' AND user_id = $1`
      : `SELECT COUNT(*) as count FROM work_queue WHERE status = 'pending'`;

    const result = userId
      ? await postgresManager.query(query, [userId])
      : await postgresManager.query(query);

    return parseInt(result.rows[0].count);
  }

  /**
   * Clean up old completed/failed tickets
   * @param {number} olderThanDays - Delete tickets older than N days
   * @returns {Promise<number>} Number of deleted tickets
   */
  async cleanupOldTickets(olderThanDays = 7) {
    const query = `
      DELETE FROM work_queue
      WHERE status IN ('completed', 'failed')
        AND updated_at < NOW() - INTERVAL '${olderThanDays} days'
      RETURNING id
    `;

    const result = await postgresManager.query(query);
    return result.rows.length;
  }

  /**
   * Get stuck tickets (assigned/processing for too long)
   * @param {number} timeoutMinutes - Consider stuck after N minutes
   * @returns {Promise<Array>} List of stuck tickets
   */
  async getStuckTickets(timeoutMinutes = 30) {
    const query = `
      SELECT * FROM work_queue
      WHERE status IN ('assigned', 'processing')
        AND updated_at < NOW() - INTERVAL '${timeoutMinutes} minutes'
      ORDER BY updated_at ASC
    `;

    const result = await postgresManager.query(query);
    return result.rows;
  }

  /**
   * Reset stuck tickets to pending
   * @param {number} timeoutMinutes - Reset tickets stuck for N minutes
   * @returns {Promise<number>} Number of reset tickets
   */
  async resetStuckTickets(timeoutMinutes = 30) {
    const query = `
      UPDATE work_queue
      SET status = 'pending',
          worker_id = NULL,
          assigned_at = NULL,
          started_at = NULL,
          error_message = 'Reset due to timeout',
          retry_count = retry_count + 1,
          updated_at = NOW()
      WHERE status IN ('assigned', 'processing')
        AND updated_at < NOW() - INTERVAL '${timeoutMinutes} minutes'
      RETURNING id
    `;

    const result = await postgresManager.query(query);
    return result.rows.length;
  }

  /**
   * Bulk create tickets (for batch processing)
   * @param {Array<object>} tickets - Array of ticket data
   * @returns {Promise<Array>} Created tickets
   */
  async createTicketsBulk(tickets) {
    if (!tickets || tickets.length === 0) {
      return [];
    }

    // Build VALUES clause for bulk insert
    const valuesClause = tickets
      .map(
        (_, index) => {
          const base = index * 7;
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}::jsonb, $${base + 6}, $${base + 7}, 'pending', NOW(), NOW())`;
        }
      )
      .join(', ');

    const query = `
      INSERT INTO work_queue (
        user_id,
        post_id,
        post_content,
        post_author,
        post_metadata,
        assigned_agent,
        priority,
        status,
        created_at,
        updated_at
      )
      VALUES ${valuesClause}
      RETURNING *
    `;

    // Flatten values array
    const values = tickets.flatMap(ticket => [
      ticket.user_id || 'anonymous',
      ticket.post_id,
      ticket.post_content,
      ticket.post_author || null,
      JSON.stringify(ticket.post_metadata || {}),
      ticket.assigned_agent || null,
      ticket.priority || 0
    ]);

    const result = await postgresManager.query(query, values);
    return result.rows;
  }
}

export default new WorkQueueRepository();
