/**
 * WorkerSpawnerAdapter - Implements IWorkerSpawner interface
 * Spawns and manages AgentWorker instances
 *
 * Phase 2: AVI Orchestrator Integration
 * Phase 4: Validation & Error Handling Integration
 */

import type { IWorkerSpawner, PendingTicket, WorkerInfo } from '../types/avi';
import type { DatabaseManager } from '../types/database-manager';
import type { WorkTicket } from '../types/work-ticket';
import { AgentWorker } from '../worker/agent-worker';
import { validateTicketId } from '../utils/validation';
import logger from '../utils/logger';

/**
 * WorkerSpawnerAdapter implementation
 * Spawns AgentWorker instances and tracks their lifecycle
 */
export class WorkerSpawnerAdapter implements IWorkerSpawner {
  private db: DatabaseManager;
  private activeWorkers: Map<string, WorkerInfo>;
  private workerPromises: Map<string, Promise<void>>;
  private workerCounter: number = 0;
  private workQueueRepository: any;
  private repositoryPromise?: Promise<void>;
  private validationEnabled: boolean;

  constructor(db: DatabaseManager) {
    this.db = db;
    this.activeWorkers = new Map();
    this.workerPromises = new Map();

    // Phase 4 validation flag
    this.validationEnabled = process.env.AVI_ENABLE_VALIDATION === 'true';

    if (this.validationEnabled) {
      logger.info('Phase 4 validation enabled (integration pending)');
    }
  }

  /**
   * Initialize work queue repository for ticket operations
   * Uses promise caching to prevent race conditions
   */
  private async initRepository(): Promise<void> {
    if (!this.repositoryPromise) {
      this.repositoryPromise = (async () => {
        if (!this.workQueueRepository) {
          const module = await import('../../api-server/repositories/postgres/work-queue.repository.js');
          this.workQueueRepository = module.default;
        }
      })();
    }
    await this.repositoryPromise;
  }

  /**
   * Spawn a new worker for a ticket
   * @param ticket - Pending ticket to process
   * @returns Promise resolving to worker information
   */
  async spawnWorker(ticket: PendingTicket): Promise<WorkerInfo> {
    await this.initRepository();

    const workerId = this.generateWorkerId();

    const workerInfo: WorkerInfo = {
      id: workerId,
      ticketId: ticket.id,
      status: 'spawning',
      startTime: new Date(),
    };

    this.activeWorkers.set(workerId, workerInfo);

    // Create worker promise (async execution)
    const promise = this.executeWorker(ticket, workerInfo);
    this.workerPromises.set(workerId, promise);

    // Update status to running
    workerInfo.status = 'running';

    return workerInfo;
  }

  /**
   * Get active workers
   * @returns Promise resolving to array of active worker information
   */
  async getActiveWorkers(): Promise<WorkerInfo[]> {
    return Array.from(this.activeWorkers.values());
  }

  /**
   * Terminate a specific worker
   * @param workerId - Worker ID to terminate
   */
  async terminateWorker(workerId: string): Promise<void> {
    const worker = this.activeWorkers.get(workerId);
    if (!worker) {
      return;
    }

    // Mark as terminated
    worker.status = 'failed';
    worker.endTime = new Date();
    worker.error = 'Terminated by orchestrator';

    // Remove from active workers
    this.activeWorkers.delete(workerId);
    this.workerPromises.delete(workerId);
  }

  /**
   * Wait for all workers to complete
   * @param timeout - Timeout in milliseconds
   */
  async waitForAllWorkers(timeout: number): Promise<void> {
    const promises = Array.from(this.workerPromises.values());

    if (promises.length === 0) {
      return;
    }

    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(resolve, timeout);
    });

    await Promise.race([
      Promise.allSettled(promises),
      timeoutPromise,
    ]);
  }

  /**
   * Execute worker for ticket
   * @param ticket - Pending ticket
   * @param workerInfo - Worker information object
   */
  private async executeWorker(ticket: PendingTicket, workerInfo: WorkerInfo): Promise<void> {
    try {
      await this.initRepository();

      // Validate and parse ticket ID
      const ticketIdNum = validateTicketId(ticket.id);

      // Mark ticket as processing
      await this.workQueueRepository.startProcessing(ticketIdNum);

      // Create work ticket object for AgentWorker
      const workTicket = await this.loadWorkTicket(ticket.id);

      // Execute worker
      const worker = new AgentWorker(this.db);
      const result = await worker.executeTicket(workTicket);

      // Phase 4: Validation integration (TODO: resolve type constraints)
      // Validation will be fully integrated after resolving DatabaseManager vs AviDatabaseAdapter
      if (this.validationEnabled && result.success && result.output) {
        logger.info(`Phase 4 validation ready for ticket ${ticket.id} (integration pending)`);
        // TODO: Create PostValidator with proper adapters
        // TODO: Call validateAndPost() with retry/escalation
      }

      // Update worker info
      workerInfo.status = result.success ? 'completed' : 'failed';
      workerInfo.endTime = new Date();
      if (!result.success && result.error) {
        workerInfo.error = result.error instanceof Error ? result.error.message : String(result.error);
      }

      // Update ticket status
      if (result.success) {
        await this.workQueueRepository.completeTicket(
          ticketIdNum,
          { output: result.output }
        );
      } else {
        const errorMessage = result.error instanceof Error ? result.error.message : String(result.error || 'Unknown error');
        await this.workQueueRepository.failTicket(
          ticketIdNum,
          errorMessage
        );
      }

    } catch (error) {
      workerInfo.status = 'failed';
      workerInfo.endTime = new Date();
      workerInfo.error = error instanceof Error ? error.message : 'Unknown error';

      // Re-validate ticket ID for error path
      const ticketIdNum = validateTicketId(ticket.id);
      await this.workQueueRepository.failTicket(
        ticketIdNum,
        workerInfo.error
      );
    } finally {
      // Remove from active workers
      this.activeWorkers.delete(workerInfo.id);
      this.workerPromises.delete(workerInfo.id);
    }
  }

  /**
   * Load full work ticket from database
   * @param ticketId - Ticket ID
   * @returns Promise resolving to work ticket
   */
  private async loadWorkTicket(ticketId: string): Promise<WorkTicket> {
    const ticketIdNum = validateTicketId(ticketId);
    const ticket = await this.workQueueRepository.getTicketById(ticketIdNum);

    if (!ticket) {
      throw new Error(`Work ticket not found: ${ticketId}`);
    }

    return {
      id: ticket.id.toString(),
      type: 'post_response',
      priority: ticket.priority || 0,
      agentName: ticket.assigned_agent || 'default',
      userId: ticket.user_id,
      payload: {
        feedItemId: ticket.post_id,
        content: ticket.post_content,
        metadata: ticket.post_metadata || {},
      },
      createdAt: new Date(ticket.created_at),
      status: ticket.status,
    };
  }

  /**
   * Generate unique worker ID
   * @returns Unique worker identifier
   */
  private generateWorkerId(): string {
    return `worker-${Date.now()}-${this.workerCounter++}`;
  }
}
