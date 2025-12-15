/**
 * Work Queue Implementation
 * Phase 2: Priority-based work ticket queue
 *
 * Features:
 * - Priority-based dequeuing (higher priority first)
 * - FIFO for equal priorities
 * - Status tracking and lifecycle management
 * - Queue statistics and monitoring
 */

import { randomUUID } from 'crypto';
import {
  WorkTicket,
  WorkTicketInput,
  WorkTicketStatus,
  QueueStats
} from '../types/work-ticket';

/**
 * Priority queue for managing work tickets
 * Uses a min-heap with inverted priorities (higher priority = lower heap value)
 */
export class WorkQueue {
  /** Internal storage for all tickets (active and historical) */
  private tickets: Map<string, WorkTicket> = new Map();

  /** Priority queue storing only pending ticket IDs */
  private pendingQueue: string[] = [];

  /**
   * Enqueue a new work ticket
   * @param input Work ticket input without system-generated fields
   * @returns The created work ticket with generated ID and timestamps
   */
  enqueue(input: WorkTicketInput): WorkTicket {
    const ticket: WorkTicket = {
      ...input,
      id: randomUUID(),
      createdAt: new Date(),
      status: 'pending'
    };

    // Store ticket
    this.tickets.set(ticket.id, ticket);

    // Add to pending queue
    this.pendingQueue.push(ticket.id);

    // Maintain priority order (sort by priority descending, then by createdAt ascending)
    this.sortPendingQueue();

    return ticket;
  }

  /**
   * Dequeue the highest priority ticket
   * Updates status to 'processing' and sets processingStartedAt
   * @returns The highest priority ticket, or null if queue is empty
   */
  dequeue(): WorkTicket | null {
    if (this.pendingQueue.length === 0) {
      return null;
    }

    // Remove from pending queue (already sorted, so first element is highest priority)
    const ticketId = this.pendingQueue.shift();

    if (!ticketId) {
      return null;
    }

    const ticket = this.tickets.get(ticketId);

    if (!ticket) {
      return null;
    }

    // Update ticket status
    ticket.status = 'processing';
    ticket.processingStartedAt = new Date();

    return ticket;
  }

  /**
   * Peek at the highest priority ticket without removing it
   * Does not modify ticket status
   * @returns The highest priority ticket, or null if queue is empty
   */
  peek(): WorkTicket | null {
    if (this.pendingQueue.length === 0) {
      return null;
    }

    const ticketId = this.pendingQueue[0];

    if (!ticketId) {
      return null;
    }

    return this.tickets.get(ticketId) || null;
  }

  /**
   * Update ticket status
   * Sets completedAt timestamp for 'completed' and 'failed' statuses
   * @param id Ticket ID
   * @param status New status
   * @param error Optional error message for 'failed' status
   * @throws Error if ticket not found
   */
  updateStatus(id: string, status: WorkTicketStatus, error?: string): void {
    const ticket = this.tickets.get(id);

    if (!ticket) {
      throw new Error(`Ticket not found: ${id}`);
    }

    ticket.status = status;

    // Set completion timestamp for terminal states
    if (status === 'completed' || status === 'failed') {
      ticket.completedAt = new Date();
    }

    // Store error message if provided
    if (error) {
      ticket.error = error;
    }

    // If ticket was in pending queue and status changed, remove it
    if (status !== 'pending') {
      const index = this.pendingQueue.indexOf(id);
      if (index !== -1) {
        this.pendingQueue.splice(index, 1);
      }
    }
  }

  /**
   * Get current queue length (pending tickets only)
   * @returns Number of pending tickets in queue
   */
  length(): number {
    return this.pendingQueue.length;
  }

  /**
   * Clear all tickets from queue and storage
   * Removes both pending and historical tickets
   */
  clear(): void {
    this.tickets.clear();
    this.pendingQueue = [];
  }

  /**
   * Clear only completed tickets from storage
   * Keeps pending, processing, and failed tickets
   */
  clearCompleted(): void {
    const completedIds: string[] = [];

    // Find all completed tickets
    for (const [id, ticket] of this.tickets.entries()) {
      if (ticket.status === 'completed') {
        completedIds.push(id);
      }
    }

    // Remove them from storage
    completedIds.forEach(id => this.tickets.delete(id));
  }

  /**
   * Get ticket by ID
   * @param id Ticket ID
   * @returns The ticket if found, null otherwise
   */
  getById(id: string): WorkTicket | null {
    return this.tickets.get(id) || null;
  }

  /**
   * Get queue statistics
   * @returns Current queue statistics by status
   */
  getStats(): QueueStats {
    const stats: QueueStats = {
      total: this.tickets.size,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };

    for (const ticket of this.tickets.values()) {
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
   * Sort pending queue by priority (descending) and createdAt (ascending)
   * Higher priority values come first
   * For equal priorities, earlier tickets come first (FIFO)
   * @private
   */
  private sortPendingQueue(): void {
    this.pendingQueue.sort((aId, bId) => {
      const a = this.tickets.get(aId);
      const b = this.tickets.get(bId);

      if (!a || !b) {
        return 0;
      }

      // Sort by priority descending (higher priority first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      // For equal priorities, sort by createdAt ascending (FIFO)
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Get all tickets (for debugging/monitoring)
   * @returns Array of all tickets
   */
  getAllTickets(): WorkTicket[] {
    return Array.from(this.tickets.values());
  }

  /**
   * Get tickets by status
   * @param status Status to filter by
   * @returns Array of tickets with the specified status
   */
  getTicketsByStatus(status: WorkTicketStatus): WorkTicket[] {
    return Array.from(this.tickets.values()).filter(
      ticket => ticket.status === status
    );
  }

  /**
   * Get tickets by agent name
   * @param agentName Agent name to filter by
   * @returns Array of tickets assigned to the specified agent
   */
  getTicketsByAgent(agentName: string): WorkTicket[] {
    return Array.from(this.tickets.values()).filter(
      ticket => ticket.agentName === agentName
    );
  }

  /**
   * Get tickets by user ID
   * @param userId User ID to filter by
   * @returns Array of tickets for the specified user
   */
  getTicketsByUser(userId: string): WorkTicket[] {
    return Array.from(this.tickets.values()).filter(
      ticket => ticket.userId === userId
    );
  }
}
