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
import { UnifiedAgentWorker } from '../worker/unified-agent-worker';
import { ClaudeCodeWorker } from '../worker/claude-code-worker';
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
  private claudeCodeEnabled: boolean;

  constructor(db: DatabaseManager) {
    this.db = db;
    this.activeWorkers = new Map();
    this.workerPromises = new Map();

    // Phase 4 validation flag
    this.validationEnabled = process.env.AVI_ENABLE_VALIDATION === 'true';

    // Phase 3: Claude Code SDK integration (feature flag)
    this.claudeCodeEnabled = process.env.ENABLE_CLAUDE_CODE_WORKER === 'true';

    if (this.validationEnabled) {
      logger.info('Phase 4 validation enabled (integration pending)');
    }

    if (this.claudeCodeEnabled) {
      logger.info('Claude Code SDK worker enabled - replacing regex-based TaskTypeDetector');
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
   * @param workerId - Optional pre-assigned worker ID (to prevent race condition)
   * @returns Promise resolving to worker information
   */
  async spawnWorker(ticket: PendingTicket, workerId?: string): Promise<WorkerInfo> {
    try {
      console.log(`🚀 [WorkerSpawner] Starting worker spawn for ticket ${ticket.id}`);

      if (!ticket) {
        throw new Error('Ticket is undefined or null');
      }
      if (!ticket.id) {
        throw new Error('Ticket ID is undefined or null');
      }

      console.log(`📦 [WorkerSpawner] Initializing repository for ticket ${ticket.id}`);
      await this.initRepository();
      console.log(`✅ [WorkerSpawner] Repository initialized successfully`);

      // Use provided worker ID or generate new one
      const finalWorkerId = workerId || this.generateWorkerId();
      console.log(`🆔 [WorkerSpawner] Generated worker ID: ${finalWorkerId} for ticket ${ticket.id}`);

      const workerInfo: WorkerInfo = {
        id: finalWorkerId,
        ticketId: ticket.id,
        status: 'spawning',
        startTime: new Date(),
      };

      this.activeWorkers.set(finalWorkerId, workerInfo);
      console.log(`📝 [WorkerSpawner] Worker info created and registered: ${finalWorkerId}`);

      // Create worker promise (async execution)
      console.log(`⚙️ [WorkerSpawner] Creating worker promise for ticket ${ticket.id}`);
      const promise = this.executeWorker(ticket, workerInfo);
      this.workerPromises.set(finalWorkerId, promise);

      // Update status to running
      workerInfo.status = 'running';
      console.log(`✅ [WorkerSpawner] Worker ${finalWorkerId} spawned successfully, status: running`);

      return workerInfo;
    } catch (error) {
      console.error(`❌ [WorkerSpawner] FATAL ERROR in spawnWorker for ticket ${ticket?.id}:`, error);
      console.error(`❌ [WorkerSpawner] Error type:`, error?.constructor?.name);
      console.error(`❌ [WorkerSpawner] Error message:`, error instanceof Error ? error.message : String(error));
      console.error(`❌ [WorkerSpawner] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
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
      console.log(`🔧 [executeWorker] Starting execution for ticket ${ticket.id}`);

      console.log(`🔧 [executeWorker] Initializing repository...`);
      await this.initRepository();
      console.log(`✅ [executeWorker] Repository initialized`);

      // Validate and parse ticket ID
      console.log(`🔧 [executeWorker] Validating ticket ID: ${ticket.id}`);
      const ticketIdNum = validateTicketId(ticket.id);
      console.log(`✅ [executeWorker] Ticket ID validated: ${ticketIdNum}`);

      // Mark ticket as processing
      console.log(`🔧 [executeWorker] Marking ticket ${ticketIdNum} as processing...`);
      await this.workQueueRepository.startProcessing(ticketIdNum);
      console.log(`✅ [executeWorker] Ticket marked as processing`);

      // Create work ticket object for worker
      console.log(`🔧 [executeWorker] Loading work ticket data for ${ticket.id}...`);
      const workTicket = await this.loadWorkTicket(ticket.id);
      console.log(`✅ [executeWorker] Work ticket loaded:`, {
        id: workTicket.id,
        userId: workTicket.userId,
        contentLength: workTicket.payload?.content?.length || 0
      });

      // Execute worker - use ClaudeCodeWorker if enabled, otherwise fall back to UnifiedAgentWorker
      console.log(`🔧 [executeWorker] Creating worker instance (ClaudeCode: ${this.claudeCodeEnabled})...`);
      const worker = this.claudeCodeEnabled
        ? new ClaudeCodeWorker(this.db)
        : new UnifiedAgentWorker(this.db);
      console.log(`✅ [executeWorker] Worker instance created`);

      logger.info(`Using ${this.claudeCodeEnabled ? 'ClaudeCodeWorker' : 'UnifiedAgentWorker'} for ticket ${ticket.id}`);

      console.log(`🚀 [executeWorker] Executing ticket ${ticket.id}...`);
      const result = await worker.executeTicket(workTicket);
      console.log(`✅ [executeWorker] Ticket execution completed`, {
        ticketId: ticket.id,
        success: result.success,
        duration: result.duration,
        tokensUsed: result.tokensUsed
      });

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
      console.error(`❌ [executeWorker] EXECUTION FAILED for ticket ${ticket.id}:`, error);
      console.error(`❌ [executeWorker] Error type:`, error?.constructor?.name);
      console.error(`❌ [executeWorker] Error message:`, error instanceof Error ? error.message : String(error));
      console.error(`❌ [executeWorker] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace');

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
      console.log(`🧹 [executeWorker] Cleanup for ticket ${ticket.id}, removing worker ${workerInfo.id}`);
      // Remove from active workers
      this.activeWorkers.delete(workerInfo.id);
      this.workerPromises.delete(workerInfo.id);
      console.log(`✅ [executeWorker] Cleanup complete for ticket ${ticket.id}`);
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
