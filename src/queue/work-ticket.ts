/**
 * WorkTicketQueue Implementation
 * Manages work ticket lifecycle with priority-based processing
 *
 * Phase 3A: Database-backed implementation
 * - Persists tickets to PostgreSQL work_queue table
 * - Supports feed monitoring integration
 */

import type { DatabaseManager } from '../types/database-manager';
import {
  WorkTicket,
  WorkTicketInput,
  WorkTicketStatus,
  QueueStats
} from '../types/work-ticket';
import { PriorityQueue } from './priority-queue';

export class WorkTicketQueue {
  private db?: DatabaseManager;
  private tickets: Map<string, WorkTicket>;
  private workerAssignments: Map<string, string>;
  private ticketCounter: number = 0;
  private priorityQueue: PriorityQueue<WorkTicket>;

  constructor(db?: DatabaseManager) {
    this.db = db;
    this.tickets = new Map<string, WorkTicket>();
    this.workerAssignments = new Map<string, string>();
    this.priorityQueue = new PriorityQueue<WorkTicket>();
  }

  /**
   * Create a new work ticket
   * Persists to database if available, otherwise in-memory only
   *
   * @param input - Ticket input data
   * @returns Created ticket
   */
  async createTicket(input: WorkTicketInput): Promise<WorkTicket> {
    if (this.db) {
      // Database-backed ticket creation
      const result = await this.db.query(`
        INSERT INTO work_queue (
          user_id, post_id, post_content, assigned_agent,
          status, priority, post_metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        input.userId,
        input.payload.feedItemId || 'unknown',
        input.payload.content || '',
        input.agentName,
        'pending',
        input.priority,
        JSON.stringify(input.payload)
      ]);

      const row = result.rows[0];
      const ticket: WorkTicket = {
        id: row.id.toString(),
        type: input.type,
        priority: row.priority,
        agentName: row.assigned_agent,
        userId: row.user_id,
        payload: row.post_metadata,
        createdAt: row.created_at,
        status: row.status as WorkTicketStatus
      };

      // Store in memory map
      this.tickets.set(ticket.id, ticket);
      // Add to priority queue
      this.priorityQueue.enqueue(ticket, ticket.priority);

      return ticket;
    }

    // Fallback to in-memory (for unit tests)
    const ticketId = this.generateTicketId();
    const ticket: WorkTicket = {
      id: ticketId,
      type: input.type,
      priority: input.priority,
      agentName: input.agentName,
      userId: input.userId,
      payload: input.payload,
      createdAt: new Date(),
      status: 'pending'
    };

    // Store in memory map
    this.tickets.set(ticketId, ticket);
    // Add to priority queue
    this.priorityQueue.enqueue(ticket, ticket.priority);

    return ticket;
  }

  /**
   * Assign ticket to worker
   * Updates status to processing and tracks worker assignment
   *
   * @param ticketId - Ticket ID to assign
   * @param workerId - Worker ID handling the ticket
   * @throws Error if ticket not found or invalid state
   */
  async assignToWorker(ticketId: string, workerId: string): Promise<void> {
    const ticket = this.tickets.get(ticketId);

    if (!ticket) {
      throw new Error(`Ticket not found: ${ticketId}`);
    }

    if (ticket.status === 'processing') {
      throw new Error('Ticket already being processed');
    }

    if (ticket.status === 'completed' || ticket.status === 'failed') {
      throw new Error('Ticket already completed or failed');
    }

    // Update ticket status
    ticket.status = 'processing';
    ticket.processingStartedAt = new Date();
    ticket.workerId = workerId;

    // Track worker assignment
    this.workerAssignments.set(workerId, ticketId);
  }

  /**
   * Mark ticket as completed
   * Updates status and stores result
   *
   * @param ticketId - Ticket ID to complete
   * @param result - Result data to store
   * @throws Error if ticket not found or not processing
   */
  async completeTicket(ticketId: string, result: any): Promise<void> {
    const ticket = this.tickets.get(ticketId);

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (ticket.status !== 'processing') {
      throw new Error('Ticket is not being processed');
    }

    // Update ticket status
    ticket.status = 'completed';
    ticket.completedAt = new Date();
    ticket.payload.result = result;

    // Remove worker assignment
    this.removeWorkerAssignment(ticketId);
  }

  /**
   * Mark ticket as failed
   * Updates status and stores error
   *
   * @param ticketId - Ticket ID to fail
   * @param error - Error that caused failure
   * @throws Error if ticket not found
   */
  async failTicket(ticketId: string, error: Error): Promise<void> {
    const ticket = this.tickets.get(ticketId);

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Update ticket status
    ticket.status = 'failed';
    ticket.completedAt = new Date();
    ticket.error = error.message;

    // Remove worker assignment
    this.removeWorkerAssignment(ticketId);
  }

  /**
   * Get metrics for queue statistics
   *
   * @returns Queue statistics by status
   */
  async getMetrics(): Promise<QueueStats> {
    const stats: QueueStats = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };

    for (const ticket of this.tickets.values()) {
      stats.total++;

      switch (ticket.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'processing':
          stats.processing++;
          break;
        case 'completed':
          stats.completed++;
          break;
        case 'failed':
          stats.failed++;
          break;
      }
    }

    return stats;
  }

  /**
   * Get ticket by ID
   *
   * @param ticketId - Ticket ID to retrieve
   * @returns Ticket or null if not found
   */
  async getTicket(ticketId: string): Promise<WorkTicket | null> {
    return this.tickets.get(ticketId) || null;
  }

  /**
   * Get list of active worker IDs
   *
   * @returns Array of worker IDs currently processing tickets
   */
  async getActiveWorkers(): Promise<string[]> {
    return Array.from(this.workerAssignments.keys());
  }

  /**
   * Get current queue size
   * Delegates to PriorityQueue
   *
   * @returns Number of items in queue
   */
  getQueueSize(): number {
    return this.priorityQueue.size();
  }

  /**
   * Generate unique ticket ID
   *
   * @private
   * @returns Unique ticket ID
   */
  private generateTicketId(): string {
    const timestamp = Date.now();
    const counter = this.ticketCounter++;
    return `ticket-${timestamp}-${counter}`;
  }

  /**
   * Remove worker assignment for ticket
   *
   * @private
   * @param ticketId - Ticket ID to remove assignment for
   */
  private removeWorkerAssignment(ticketId: string): void {
    // Find and remove worker assignment
    for (const [workerId, assignedTicketId] of this.workerAssignments.entries()) {
      if (assignedTicketId === ticketId) {
        this.workerAssignments.delete(workerId);
        break;
      }
    }
  }
}
