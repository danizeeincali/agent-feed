/**
 * UnifiedAgentWorker - Dual-mode worker supporting RSS feeds and file operations
 * Phase 2: File Operation Support
 *
 * Replaces AgentWorker with support for:
 * - RSS feed processing (backward compatible)
 * - File operations (create, read, write, delete)
 * - Command execution (future)
 * - API calls (future)
 */

import type { DatabaseManager } from '../types/database-manager';
import type { WorkTicket } from '../types/work-ticket';
import type { WorkerResult } from '../types/worker';
import { TaskTypeDetector, type TaskDetectionResult } from './task-type-detector';
import { FileOperationExecutor, type FileOperationParams } from './file-operation-executor';
import { AgentWorker } from './agent-worker';
import logger from '../utils/logger';

/**
 * Unified worker that routes to appropriate executor based on task type
 */
export class UnifiedAgentWorker {
  private db: DatabaseManager;
  private taskDetector: TaskTypeDetector;
  private fileExecutor: FileOperationExecutor;
  private rssWorker: AgentWorker;

  constructor(db: DatabaseManager) {
    this.db = db;
    this.taskDetector = new TaskTypeDetector();
    this.fileExecutor = new FileOperationExecutor({
      allowedWorkspace: '/workspaces/agent-feed/prod/agent_workspace',
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });
    this.rssWorker = new AgentWorker(db);
  }

  /**
   * Execute work ticket - main entry point
   */
  async executeTicket(ticket: WorkTicket): Promise<WorkerResult> {
    const startTime = Date.now();

    try {
      logger.info('UnifiedAgentWorker executing ticket', {
        ticketId: ticket.id,
        userId: ticket.userId,
      });

      // Detect task type from post content
      const detection = this.detectTaskType(ticket);

      logger.info('Task type detected', {
        ticketId: ticket.id,
        taskType: detection.type,
        confidence: detection.confidence,
      });

      // Route to appropriate executor
      let result: WorkerResult;
      switch (detection.type) {
        case 'file_operation':
          result = await this.executeFileOperation(ticket, detection);
          break;

        case 'rss_feed':
          result = await this.executeRSSFeed(ticket);
          break;

        case 'command':
        case 'api_call':
          throw new Error(`Task type ${detection.type} not yet implemented`);

        default:
          throw new Error(`Unknown task type: ${detection.type}`);
      }

      const duration = Date.now() - startTime;
      logger.info('Ticket execution completed', {
        ticketId: ticket.id,
        success: result.success,
        duration,
      });

      return {
        ...result,
        duration: result.duration || duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Ticket execution failed', {
        ticketId: ticket.id,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      return {
        success: false,
        error: error as Error,
        tokensUsed: 0,
        duration,
      };
    }
  }

  /**
   * Detect task type from ticket content
   */
  private detectTaskType(ticket: WorkTicket): TaskDetectionResult {
    const content = ticket.payload.content || '';
    const metadata = ticket.payload.metadata || {};

    return this.taskDetector.detect(content, metadata);
  }

  /**
   * Execute file operation task
   */
  private async executeFileOperation(
    ticket: WorkTicket,
    detection: TaskDetectionResult
  ): Promise<WorkerResult> {
    logger.info('Executing file operation', {
      ticketId: ticket.id,
      params: detection.params,
    });

    // Extract file operation parameters
    const params = this.extractFileOperationParams(ticket, detection);

    // Execute file operation
    const result = await this.fileExecutor.execute(params);

    if (result.success) {
      logger.info('File operation completed successfully', {
        ticketId: ticket.id,
        operation: params.operation,
        path: (result.output as any)?.path,
      });
    } else {
      logger.error('File operation failed', {
        ticketId: ticket.id,
        operation: params.operation,
        error: result.error,
      });
    }

    return result;
  }

  /**
   * Extract file operation parameters from ticket
   */
  private extractFileOperationParams(
    ticket: WorkTicket,
    detection: TaskDetectionResult
  ): FileOperationParams {
    const params = detection.params || {};

    // If params already have operation/path/content, use them
    if (params.operation && params.path) {
      return {
        operation: params.operation,
        path: params.path,
        content: params.content,
      };
    }

    // Otherwise, parse from content
    const content = ticket.payload.content || '';

    // Default operation
    const operation = params.operation || 'create';

    // Extract path from detection or content
    let filePath = params.path;
    if (!filePath) {
      // Try to extract from natural language
      const pathMatch = content.match(/file\s+(?:called\s+)?["']?([^"'\s]+)["']?/i);
      if (pathMatch) {
        filePath = pathMatch[1];
      }
    }

    if (!filePath) {
      throw new Error('Could not determine file path from content');
    }

    // Extract file content
    let fileContent = params.content || '';
    if (!fileContent && (operation === 'create' || operation === 'write')) {
      // Try to extract from natural language
      const contentMatch =
        content.match(/with\s+(?:the\s+)?text:\s*["']?([^"']+)["']?/i) ||
        content.match(/with\s+(?:the\s+)?content:\s*["']?([^"']+)["']?/i) ||
        content.match(/containing:\s*["']?([^"']+)["']?/i);

      if (contentMatch) {
        fileContent = contentMatch[1].trim();
      }
    }

    return {
      operation: operation as 'create' | 'read' | 'write' | 'delete',
      path: filePath,
      content: fileContent,
    };
  }

  /**
   * Execute RSS feed processing (backward compatible)
   */
  private async executeRSSFeed(ticket: WorkTicket): Promise<WorkerResult> {
    logger.info('Executing RSS feed processing', {
      ticketId: ticket.id,
    });

    // Delegate to original AgentWorker for RSS feed processing
    return await this.rssWorker.executeTicket(ticket);
  }
}
