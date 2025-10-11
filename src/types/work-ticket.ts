/**
 * Work Ticket Type Definitions
 * Phase 2: Work Queue System
 */

/**
 * Available work ticket types
 */
export type WorkTicketType = 'post_response' | 'memory_update' | 'health_check';

/**
 * Work ticket status states
 */
export type WorkTicketStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Priority levels for work tickets
 * Higher number = higher priority
 */
export enum Priority {
  LOW = 1,
  MEDIUM = 5,
  HIGH = 8,
  CRITICAL = 10
}

/**
 * Status enum for type-safe status checks
 */
export enum Status {
  PENDING = 'pending',
  IN_PROGRESS = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Work ticket interface
 * Represents a unit of work to be processed by an agent
 */
export interface WorkTicket {
  /** Unique identifier for the ticket */
  id: string;

  /** Type of work to be performed */
  type: WorkTicketType;

  /** Priority level (higher number = higher priority) */
  priority: number;

  /** Name of the agent responsible for processing */
  agentName: string;

  /** User ID associated with this work */
  userId: string;

  /** Arbitrary payload data for the work */
  payload: any;

  /** Timestamp when ticket was created */
  createdAt: Date;

  /** Current status of the ticket */
  status: WorkTicketStatus;

  /** Optional timestamp when processing started */
  processingStartedAt?: Date;

  /** Optional timestamp when ticket completed or failed */
  completedAt?: Date;

  /** Optional worker ID assigned to process this ticket */
  workerId?: string;

  /** Optional error message if status is 'failed' */
  error?: string;
}

/**
 * Input type for creating a new work ticket
 * Omits system-generated fields
 */
export type WorkTicketInput = Omit<WorkTicket, 'id' | 'createdAt' | 'status' | 'processingStartedAt' | 'completedAt' | 'error'>;

/**
 * Queue statistics interface
 */
export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}
