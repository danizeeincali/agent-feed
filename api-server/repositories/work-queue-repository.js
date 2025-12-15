import { v4 as uuidv4 } from 'uuid';

/**
 * Work Queue Repository
 * Manages work queue tickets for proactive agent execution
 *
 * Features:
 * - Create tickets with priority ordering
 * - Query pending tickets for orchestrator
 * - Update ticket status (pending, in_progress, completed, failed)
 * - Retry logic with max 3 attempts
 * - JSON serialization for metadata and results
 */
export class WorkQueueRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new work queue ticket
   * @param {Object} data - Ticket data
   * @param {string} data.agent_id - Agent to execute the ticket
   * @param {string} data.content - Content/instruction for the agent
   * @param {string} [data.user_id] - Optional user ID
   * @param {string} [data.url] - Optional URL to process
   * @param {string} data.priority - Priority (P0, P1, P2, P3)
   * @param {string} [data.post_id] - Optional post ID that triggered this ticket
   * @param {Object} [data.metadata] - Optional metadata (will be JSON stringified)
   * @returns {Object} Created ticket
   */
  createTicket(data) {
    const id = uuidv4();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO work_queue_tickets (
        id, user_id, agent_id, content, url, priority, status,
        retry_count, metadata, post_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.user_id || null,
      data.agent_id,
      data.content,
      data.url || null,
      data.priority,
      'pending',
      0,
      data.metadata ? JSON.stringify(data.metadata) : null,
      data.post_id || null,
      now
    );

    return this.getTicket(id);
  }

  /**
   * Get a single ticket by ID
   * @param {string} id - Ticket ID
   * @returns {Object|null} Ticket or null if not found
   */
  getTicket(id) {
    const stmt = this.db.prepare('SELECT * FROM work_queue_tickets WHERE id = ?');
    const ticket = stmt.get(id);

    if (!ticket) return null;

    return this._deserializeTicket(ticket);
  }

  /**
   * Get pending tickets ordered by priority and creation time
   * @param {Object} options - Query options
   * @param {number} [options.limit=5] - Maximum number of tickets to return
   * @param {string} [options.agent_id] - Optional filter by agent_id
   * @returns {Array} Array of pending tickets
   */
  getPendingTickets({ limit = 5, agent_id = null } = {}) {
    let sql = `
      SELECT * FROM work_queue_tickets
      WHERE status = 'pending'
    `;

    const params = [];
    if (agent_id) {
      sql += ' AND agent_id = ?';
      params.push(agent_id);
    }

    sql += ' ORDER BY priority ASC, created_at ASC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(sql);
    const tickets = stmt.all(...params);

    return tickets.map(ticket => this._deserializeTicket(ticket));
  }

  /**
   * Atomically claim pending tickets by marking them as 'in_progress'
   * This prevents race conditions where multiple polls claim the same ticket
   *
   * @param {Object} options
   * @param {number} options.limit - Maximum tickets to claim
   * @param {string} options.workerId - ID of worker claiming tickets
   * @returns {Array} Claimed tickets with status='in_progress'
   */
  claimPendingTickets({ limit = 5, workerId = null } = {}) {
    const now = Date.now();

    // Use SQLite transaction for atomic SELECT + UPDATE
    const transaction = this.db.transaction(() => {
      // Step 1: Find pending tickets (SELECT)
      const findStmt = this.db.prepare(`
        SELECT id FROM work_queue_tickets
        WHERE status = 'pending'
        ORDER BY priority ASC, created_at ASC
        LIMIT ?
      `);
      const ticketIds = findStmt.all(limit);

      if (ticketIds.length === 0) {
        return [];
      }

      // Step 2: Atomically mark as 'in_progress' (UPDATE)
      const updateStmt = this.db.prepare(`
        UPDATE work_queue_tickets
        SET
          status = 'in_progress',
          assigned_at = ?
        WHERE id = ?
      `);

      ticketIds.forEach(({ id }) => {
        updateStmt.run(now, id);
      });

      // Step 3: Fetch full ticket data (SELECT)
      const getStmt = this.db.prepare(`
        SELECT * FROM work_queue_tickets
        WHERE id = ?
      `);

      return ticketIds.map(({ id }) => {
        const ticket = getStmt.get(id);
        return this._deserializeTicket(ticket);
      });
    });

    // Execute transaction (all-or-nothing)
    const claimedTickets = transaction();

    if (claimedTickets.length > 0) {
      console.log(`🔒 Atomically claimed ${claimedTickets.length} tickets (worker: ${workerId || 'orchestrator'})`);
    }

    return claimedTickets;
  }

  /**
   * Update ticket status
   * @param {string} id - Ticket ID
   * @param {string} status - New status (pending, in_progress, completed, failed)
   * @returns {Object} Updated ticket
   */
  updateTicketStatus(id, status) {
    const updates = { status };

    if (status === 'in_progress') {
      updates.assigned_at = Date.now();
    } else if (status === 'completed' || status === 'failed') {
      updates.completed_at = Date.now();
    }

    const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    const stmt = this.db.prepare(`
      UPDATE work_queue_tickets
      SET ${setClauses}
      WHERE id = ?
    `);

    stmt.run(...values, id);
    return this.getTicket(id);
  }

  /**
   * Mark ticket as completed with result
   * @param {string} id - Ticket ID
   * @param {Object} result - Result data (will be JSON stringified)
   * @returns {Object} Updated ticket
   */
  completeTicket(id, result) {
    const stmt = this.db.prepare(`
      UPDATE work_queue_tickets
      SET status = 'completed', completed_at = ?, result = ?
      WHERE id = ?
    `);

    stmt.run(Date.now(), JSON.stringify(result), id);
    return this.getTicket(id);
  }

  /**
   * Mark ticket as failed with retry logic
   * Retries up to 3 times, then marks as permanently failed
   * @param {string} id - Ticket ID
   * @param {string} error - Error message
   * @returns {Object} Updated ticket
   */
  failTicket(id, error) {
    const ticket = this.getTicket(id);
    if (!ticket) return null;

    const retryCount = (ticket.retry_count || 0) + 1;
    const maxRetries = 3;

    if (retryCount < maxRetries) {
      // Retry: set back to pending
      const stmt = this.db.prepare(`
        UPDATE work_queue_tickets
        SET status = 'pending', retry_count = ?, last_error = ?
        WHERE id = ?
      `);
      stmt.run(retryCount, error, id);
    } else {
      // Max retries: mark as failed
      const stmt = this.db.prepare(`
        UPDATE work_queue_tickets
        SET status = 'failed', retry_count = ?, last_error = ?, completed_at = ?
        WHERE id = ?
      `);
      stmt.run(retryCount, error, Date.now(), id);
    }

    return this.getTicket(id);
  }

  /**
   * Get all tickets for a specific agent
   * @param {string} agent_id - Agent ID
   * @returns {Array} Array of tickets ordered by creation time (newest first)
   */
  getTicketsByAgent(agent_id) {
    const stmt = this.db.prepare(`
      SELECT * FROM work_queue_tickets
      WHERE agent_id = ?
      ORDER BY created_at DESC
    `);

    const tickets = stmt.all(agent_id);
    return tickets.map(ticket => this._deserializeTicket(ticket));
  }

  /**
   * Get all tickets for a specific post
   * @param {string} post_id - Post ID
   * @returns {Array} Array of tickets ordered by creation time (newest first)
   */
  getTicketsByPost(post_id) {
    const stmt = this.db.prepare(`
      SELECT * FROM work_queue_tickets
      WHERE post_id = ?
      ORDER BY created_at DESC
    `);

    const tickets = stmt.all(post_id);
    return tickets.map(ticket => this._deserializeTicket(ticket));
  }

  /**
   * Get all pending tickets (orchestrator compatibility method)
   * This method provides PostgreSQL-compatible interface for the AVI orchestrator
   * @param {Object} options - Query options
   * @param {string} [options.status='pending'] - Ticket status filter
   * @param {number} [options.limit=100] - Maximum number of tickets to return
   * @param {number} [options.offset=0] - Pagination offset
   * @returns {Promise<Array>} Array of pending tickets ordered by priority and creation time
   */
  async getAllPendingTickets(options = {}) {
    const { status = 'pending', limit = 100, offset = 0 } = options;

    const stmt = this.db.prepare(`
      SELECT * FROM work_queue_tickets
      WHERE status = ?
      ORDER BY priority ASC, created_at ASC
      LIMIT ? OFFSET ?
    `);

    console.log(`🔍 [SQLiteWorkQueueRepository] getAllPendingTickets query:`, { status, limit, offset });
    const tickets = stmt.all(status, limit, offset);
    console.log(`📊 [SQLiteWorkQueueRepository] Query result: ${tickets.length} tickets found`);

    if (tickets.length > 0) {
      console.log(`   First ticket: ID=${tickets[0].id}, status=${tickets[0].status}, priority=${tickets[0].priority}`);
    }

    return tickets.map(ticket => this._deserializeTicket(ticket));
  }

  /**
   * Deserialize a ticket from the database
   * Parses JSON fields (metadata, result)
   * @private
   */
  _deserializeTicket(ticket) {
    return {
      ...ticket,
      metadata: ticket.metadata ? JSON.parse(ticket.metadata) : null,
      result: ticket.result ? JSON.parse(ticket.result) : null
    };
  }

  /**
   * Get all failed tickets matching a specific error pattern
   * @param {string} errorPattern - Error pattern to search for
   * @returns {Array} List of failed tickets with matching errors
   */
  getTicketsByError(errorPattern) {
    const stmt = this.db.prepare(`
      SELECT * FROM work_queue_tickets
      WHERE status = 'failed'
        AND last_error LIKE ?
      ORDER BY created_at DESC
    `);

    const tickets = stmt.all(`%${errorPattern}%`);
    return tickets.map(ticket => this._deserializeTicket(ticket));
  }

  /**
   * Reset a ticket to pending state with retry_count = 0
   * Useful for manually retrying failed tickets after bug fixes
   * @param {string} id - Ticket ID
   * @returns {Object} Updated ticket
   */
  resetTicketForRetry(id) {
    const stmt = this.db.prepare(`
      UPDATE work_queue_tickets
      SET status = 'pending',
          retry_count = 0,
          last_error = NULL,
          assigned_at = NULL,
          completed_at = NULL
      WHERE id = ?
    `);

    stmt.run(id);
    return this.getTicket(id);
  }

  /**
   * Reset multiple tickets at once for efficiency
   * @param {Array<string>} ticketIds - Array of ticket IDs
   * @returns {number} Number of tickets reset
   */
  batchResetTickets(ticketIds) {
    if (!ticketIds || ticketIds.length === 0) {
      return 0;
    }

    const placeholders = ticketIds.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      UPDATE work_queue_tickets
      SET status = 'pending',
          retry_count = 0,
          last_error = NULL,
          assigned_at = NULL,
          completed_at = NULL
      WHERE id IN (${placeholders})
    `);

    const result = stmt.run(...ticketIds);
    return result.changes;
  }
}
