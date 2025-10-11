/**
 * WorkQueueRepository
 *
 * Manages work tickets for agent workers.
 * Tracks posts that need to be processed, agent assignments, and execution status.
 */

import { query } from '../database/pg-pool';
import type { QueryResult } from 'pg';

export interface WorkTicket {
  id: number;
  user_id: string;
  post_id: string;
  post_content: string;
  post_author: string | null;
  post_metadata: Record<string, any> | null;
  assigned_agent: string | null;
  worker_id: string | null;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  priority: number;
  result: Record<string, any> | null;
  error_message: string | null;
  retry_count: number;
  created_at: Date;
  assigned_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  updated_at: Date;
}

export interface CreateWorkTicketInput {
  user_id: string;
  post_id: string;
  post_content: string;
  post_author?: string | null;
  post_metadata?: Record<string, any> | null;
  assigned_agent?: string | null;
  priority?: number;
}

export class WorkQueueRepository {
  /**
   * Get all tickets, optionally filtered by status
   */
  async getAll(status?: WorkTicket['status']): Promise<WorkTicket[]> {
    if (status) {
      const result: QueryResult<WorkTicket> = await query(
        `SELECT * FROM work_queue WHERE status = $1 ORDER BY priority DESC, created_at`,
        [status]
      );
      return result.rows;
    }

    const result: QueryResult<WorkTicket> = await query(
      `SELECT * FROM work_queue ORDER BY priority DESC, created_at`
    );
    return result.rows;
  }

  /**
   * Get a specific ticket by ID
   */
  async getById(ticketId: number): Promise<WorkTicket | null> {
    const result: QueryResult<WorkTicket> = await query(
      `SELECT * FROM work_queue WHERE id = $1`,
      [ticketId]
    );

    return result.rows[0] || null;
  }

  /**
   * Create a new work ticket
   */
  async create(ticket: CreateWorkTicketInput): Promise<WorkTicket> {
    // Validation
    if (!ticket.user_id || ticket.user_id.length === 0) {
      throw new Error('User ID is required');
    }

    if (!ticket.post_id || ticket.post_id.length === 0) {
      throw new Error('Post ID is required');
    }

    if (!ticket.post_content || ticket.post_content.length === 0) {
      throw new Error('Post content is required');
    }

    const result: QueryResult<WorkTicket> = await query(
      `INSERT INTO work_queue
       (user_id, post_id, post_content, post_author, post_metadata, assigned_agent, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [
        ticket.user_id,
        ticket.post_id,
        ticket.post_content,
        ticket.post_author || null,
        ticket.post_metadata ? JSON.stringify(ticket.post_metadata) : null,
        ticket.assigned_agent || null,
        ticket.priority || 0
      ]
    );

    return result.rows[0];
  }

  /**
   * Assign a ticket to a worker
   */
  async assignWorker(ticketId: number, workerId: string): Promise<WorkTicket | null> {
    const result: QueryResult<WorkTicket> = await query(
      `UPDATE work_queue
       SET worker_id = $1,
           status = 'assigned',
           assigned_at = NOW(),
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [workerId, ticketId]
    );

    return result.rows[0] || null;
  }

  /**
   * Update ticket status
   */
  async updateStatus(
    ticketId: number,
    status: WorkTicket['status']
  ): Promise<WorkTicket | null> {
    const updates: Record<string, any> = {
      status,
      updated_at: 'NOW()'
    };

    // Set appropriate timestamp based on status
    if (status === 'in_progress') {
      updates.started_at = 'NOW()';
    } else if (status === 'completed' || status === 'failed') {
      updates.completed_at = 'NOW()';
    }

    const result: QueryResult<WorkTicket> = await query(
      `UPDATE work_queue
       SET status = $1,
           started_at = CASE WHEN $1 = 'in_progress' THEN NOW() ELSE started_at END,
           completed_at = CASE WHEN $1 IN ('completed', 'failed') THEN NOW() ELSE completed_at END,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, ticketId]
    );

    return result.rows[0] || null;
  }

  /**
   * Mark a ticket as completed with result
   */
  async complete(ticketId: number, result: Record<string, any>): Promise<WorkTicket | null> {
    const queryResult: QueryResult<WorkTicket> = await query(
      `UPDATE work_queue
       SET status = 'completed',
           result = $1,
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(result), ticketId]
    );

    return queryResult.rows[0] || null;
  }

  /**
   * Mark a ticket as failed with error message
   */
  async fail(ticketId: number, error: string): Promise<WorkTicket | null> {
    const result: QueryResult<WorkTicket> = await query(
      `UPDATE work_queue
       SET status = 'failed',
           error_message = $1,
           retry_count = retry_count + 1,
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [error, ticketId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get all pending tickets (not yet assigned)
   */
  async getPending(): Promise<WorkTicket[]> {
    const result: QueryResult<WorkTicket> = await query(
      `SELECT * FROM work_queue
       WHERE status = 'pending'
       ORDER BY priority DESC, created_at`
    );

    return result.rows;
  }

  /**
   * Get tickets by user
   */
  async getByUser(userId: string, status?: WorkTicket['status']): Promise<WorkTicket[]> {
    if (status) {
      const result: QueryResult<WorkTicket> = await query(
        `SELECT * FROM work_queue
         WHERE user_id = $1 AND status = $2
         ORDER BY priority DESC, created_at`,
        [userId, status]
      );
      return result.rows;
    }

    const result: QueryResult<WorkTicket> = await query(
      `SELECT * FROM work_queue
       WHERE user_id = $1
       ORDER BY priority DESC, created_at`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get tickets by assigned agent
   */
  async getByAgent(agentName: string, status?: WorkTicket['status']): Promise<WorkTicket[]> {
    if (status) {
      const result: QueryResult<WorkTicket> = await query(
        `SELECT * FROM work_queue
         WHERE assigned_agent = $1 AND status = $2
         ORDER BY priority DESC, created_at`,
        [agentName, status]
      );
      return result.rows;
    }

    const result: QueryResult<WorkTicket> = await query(
      `SELECT * FROM work_queue
       WHERE assigned_agent = $1
       ORDER BY priority DESC, created_at`,
      [agentName]
    );

    return result.rows;
  }

  /**
   * Delete old completed/failed tickets (cleanup)
   */
  async cleanup(retentionDays: number = 7): Promise<number> {
    const result = await query(
      `DELETE FROM work_queue
       WHERE status IN ('completed', 'failed')
         AND completed_at < NOW() - INTERVAL '${retentionDays} days'`
    );

    return result.rowCount || 0;
  }

  /**
   * Get ticket count by status
   */
  async getCountByStatus(): Promise<Record<string, number>> {
    const result = await query(
      `SELECT status, COUNT(*) as count
       FROM work_queue
       GROUP BY status`
    );

    const counts: Record<string, number> = {
      pending: 0,
      assigned: 0,
      in_progress: 0,
      completed: 0,
      failed: 0
    };

    for (const row of result.rows) {
      counts[row.status] = parseInt(row.count, 10);
    }

    return counts;
  }

  /**
   * Reset stale tickets (in_progress for too long)
   */
  async resetStaleTickets(timeoutMinutes: number = 30): Promise<number> {
    const result = await query(
      `UPDATE work_queue
       SET status = 'pending',
           worker_id = NULL,
           started_at = NULL,
           updated_at = NOW()
       WHERE status = 'in_progress'
         AND started_at < NOW() - INTERVAL '${timeoutMinutes} minutes'`
    );

    return result.rowCount || 0;
  }
}

// Singleton instance
export const workQueueRepository = new WorkQueueRepository();
