/**
 * WorkQueueAdapter - Implements IWorkQueue interface
 * Wraps work-queue.repository.js for orchestrator
 *
 * Phase 2: AVI Orchestrator Integration
 */

import type { IWorkQueue, PendingTicket, QueueStats } from '../types/avi';
import { validateTicketId, validateWorkerId } from '../utils/validation';
import { logger } from '../utils/logger';

/**
 * WorkQueueAdapter implementation
 * Translates existing PostgreSQL repository to TypeScript interface
 */
export class WorkQueueAdapter implements IWorkQueue {
  private repository: any;
  private repositoryPromise?: Promise<void>;

  constructor(repository?: any) {
    // Dynamic import for JavaScript repository
    if (repository) {
      this.repository = repository;
    }
  }

  /**
   * Initialize repository with dynamic import
   * Uses promise caching to prevent race conditions
   */
  private async initRepository(): Promise<void> {
    if (!this.repositoryPromise) {
      this.repositoryPromise = (async () => {
        if (!this.repository) {
          const module = await import('../../api-server/repositories/postgres/work-queue.repository.js');
          this.repository = module.default;
        }
      })();
    }
    await this.repositoryPromise;
  }

  /**
   * Get pending tickets from work queue
   * @returns Promise resolving to array of pending tickets
   */
  async getPendingTickets(): Promise<PendingTicket[]> {
    await this.initRepository();

    try {
      // Get all pending tickets for orchestrator (no user filter)
      // NOTE: We check if repository has getAllPendingTickets method first
      const tickets = this.repository.getAllPendingTickets
        ? await this.repository.getAllPendingTickets({ status: 'pending', limit: 100 })
        : await this.repository.getTicketsByUser(null, { status: 'pending', limit: 100 });

      // Validate tickets is an array
      if (!Array.isArray(tickets)) {
        throw new Error('Invalid response from repository: expected array');
      }

      return tickets.map(this.mapTicketToInterface);
    } catch (error) {
      logger.error('Failed to get pending tickets', { error, context: 'WorkQueueAdapter' });
      throw new Error('Failed to retrieve pending tickets from work queue');
    }
  }

  /**
   * Assign ticket to worker
   * @param ticketId - Ticket ID
   * @param workerId - Worker ID
   */
  async assignTicket(ticketId: string, workerId: string): Promise<void> {
    await this.initRepository();

    try {
      // Validate inputs before passing to repository
      const validatedTicketId = validateTicketId(ticketId);
      const validatedWorkerId = validateWorkerId(workerId);

      await this.repository.assignTicket(validatedTicketId, validatedWorkerId);
    } catch (error) {
      logger.error('Failed to assign ticket to worker', {
        error,
        ticketId,
        workerId,
        context: 'WorkQueueAdapter'
      });
      throw new Error(`Failed to assign ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get queue statistics
   * @returns Promise resolving to queue stats
   */
  async getQueueStats(): Promise<QueueStats> {
    await this.initRepository();

    try {
      const stats = await this.repository.getQueueStats();

      return {
        pending: parseInt(stats.pending_count, 10) || 0,
        processing: parseInt(stats.processing_count, 10) || 0,
        completed: parseInt(stats.completed_count, 10) || 0,
        failed: parseInt(stats.failed_count, 10) || 0,
      };
    } catch (error) {
      logger.error('Failed to get queue stats', { error, context: 'WorkQueueAdapter' });
      throw new Error('Failed to retrieve queue statistics');
    }
  }

  /**
   * Map database row to PendingTicket interface
   * @param row - Database row from work_queue table
   * @returns Mapped PendingTicket object
   */
  private mapTicketToInterface(row: any): PendingTicket {
    return {
      id: row.id.toString(),
      userId: row.user_id,
      feedId: row.post_id, // Maps to feed_item_id (post_id in work_queue)
      priority: row.priority || 0,
      createdAt: new Date(row.created_at),
      retryCount: row.retry_count || 0,
    };
  }
}
