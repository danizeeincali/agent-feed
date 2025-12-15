/**
 * Work Queue Selector
 * Provides unified interface to either SQLite or PostgreSQL work queue repository
 * Controlled by USE_POSTGRES environment variable
 *
 * Pattern follows database-selector.js for consistency
 */

import Database from 'better-sqlite3';
import PostgresWorkQueueRepository from '../repositories/postgres/work-queue.repository.js';
import { WorkQueueRepository as SQLiteWorkQueueRepository } from '../repositories/work-queue-repository.js';

class WorkQueueSelector {
  constructor() {
    this.usePostgres = process.env.USE_POSTGRES === 'true';
    this.sqliteDb = null;
    this.sqliteRepository = null;
    this.postgresRepository = PostgresWorkQueueRepository;

    console.log(`📋 Work Queue Mode: ${this.usePostgres ? 'PostgreSQL' : 'SQLite'}`);
  }

  /**
   * Initialize the work queue selector
   * Must be called after database connections are established
   */
  initialize(sqliteDb) {
    if (!this.usePostgres) {
      if (!sqliteDb) {
        throw new Error('SQLite database instance required for SQLite work queue mode');
      }
      this.sqliteDb = sqliteDb;
      this.sqliteRepository = new SQLiteWorkQueueRepository(sqliteDb);
      console.log('✅ SQLite work queue repository initialized');
    } else {
      console.log('✅ PostgreSQL work queue repository ready');
    }
  }

  /**
   * Get the appropriate repository based on database mode
   * @returns {Object} Work queue repository instance (with field mapping adapter for SQLite)
   */
  get repository() {
    if (this.usePostgres) {
      return this.postgresRepository;
    }

    if (!this.sqliteRepository) {
      throw new Error('Work queue selector not initialized. Call initialize() first.');
    }

    // Return adapter that translates PostgreSQL field names to SQLite field names
    return this._createSQLiteAdapter(this.sqliteRepository);
  }

  /**
   * Create an adapter that translates PostgreSQL-style calls to SQLite format
   * Maps: assigned_agent → agent_id, post_content → content, post_author → (ignored), post_metadata → metadata
   * @private
   */
  _createSQLiteAdapter(sqliteRepo) {
    return {
      // Translate createTicket from PostgreSQL format to SQLite format
      createTicket: (ticket) => {
        const sqliteTicket = {
          agent_id: ticket.assigned_agent || 'avi', // Default to 'avi' if not specified
          content: ticket.post_content || ticket.content,
          user_id: ticket.user_id,
          url: ticket.url,
          priority: this._translatePriority(ticket.priority),
          metadata: ticket.post_metadata || ticket.metadata,
          post_id: ticket.post_id
        };
        return sqliteRepo.createTicket(sqliteTicket);
      },

      // Pass through methods that have compatible interfaces
      getAllPendingTickets: (options) => sqliteRepo.getAllPendingTickets(options),
      getPendingTickets: (options) => sqliteRepo.getPendingTickets(options),
      claimPendingTickets: (options) => sqliteRepo.claimPendingTickets(options),
      getTicket: (id) => sqliteRepo.getTicket(id),
      updateTicketStatus: (id, status) => sqliteRepo.updateTicketStatus(id, status),
      completeTicket: (id, result) => sqliteRepo.completeTicket(id, result),
      failTicket: (id, error) => sqliteRepo.failTicket(id, error),
      getTicketsByAgent: (agentId) => sqliteRepo.getTicketsByAgent(agentId),
      getTicketsByPost: (postId) => sqliteRepo.getTicketsByPost(postId),
      getTicketsByError: (errorPattern) => sqliteRepo.getTicketsByError(errorPattern),
      resetTicketForRetry: (id) => sqliteRepo.resetTicketForRetry(id),
      batchResetTickets: (ticketIds) => sqliteRepo.batchResetTickets(ticketIds)
    };
  }

  /**
   * Translate priority from integer (PostgreSQL) to string enum (SQLite)
   * PostgreSQL: 0-10 (higher = more urgent)
   * SQLite: P0, P1, P2, P3 (P0 = highest)
   * @private
   */
  _translatePriority(priority) {
    if (typeof priority === 'string') return priority; // Already in SQLite format

    // Convert numeric priority to P0-P3
    if (priority >= 8) return 'P0'; // Urgent
    if (priority >= 5) return 'P1'; // High
    if (priority >= 2) return 'P2'; // Medium
    return 'P3'; // Low
  }
}

// Export singleton instance
export default new WorkQueueSelector();
