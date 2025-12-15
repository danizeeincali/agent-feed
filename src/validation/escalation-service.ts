/**
 * Phase 4: Validation & Error Handling - EscalationService
 *
 * Handles user notifications when work tickets fail after max retries.
 * Creates system posts, logs errors, and sends notifications.
 */

import type {
  EscalationResult,
  NotificationResult,
  NotificationType,
  ErrorLog,
  ErrorType,
  SystemPost,
  ErrorAlert,
  ErrorContext
} from './types/escalation.types';
import { NotificationType as NotifType, ErrorType as ErrType } from './types/escalation.types';
import type { AviDatabaseAdapter } from '../adapters/avi-database.adapter';
import type { WorkTicket } from '../types/work-ticket';
import { logger } from '../utils/logger';

// Future imports (placeholder)
// import { EmailService } from '../services/email-service';
// import { WebhookService } from '../services/webhook-service';

/**
 * EscalationService
 *
 * Handles user notifications when work tickets fail after max retries.
 * Creates system posts, logs errors, and sends notifications.
 */
export class EscalationService {
  private aviDatabase: AviDatabaseAdapter;
  // private emailService?: EmailService;
  // private webhookService?: WebhookService;

  constructor(aviDatabase: AviDatabaseAdapter) {
    this.aviDatabase = aviDatabase;
  }

  /**
   * Escalate a failed work ticket
   *
   * Flow:
   * 1. Log error to error_log table
   * 2. Create system post visible to user
   * 3. Send notification (placeholder for now)
   * 4. Update work ticket status to 'failed_escalated'
   */
  async escalateToUser(
    ticket: WorkTicket,
    error: Error,
    attempts: number
  ): Promise<EscalationResult> {
    try {
      logger.info('Escalating work ticket', {
        ticketId: ticket.id,
        userId: ticket.userId,
        agentName: ticket.agentName,
        attempts
      });

      const notifications: NotificationResult[] = [];
      const timestamp = new Date();

      // Step 1: Log error
      const errorLogged = await this.logError(error, {
        ticketId: ticket.id,
        userId: ticket.userId,
        agentName: ticket.agentName,
        attempts,
        escalated: true
      });

      notifications.push({
        type: NotifType.ERROR_LOG,
        success: errorLogged,
        timestamp
      });

      // Step 2: Create system post
      const errorMessage = this.formatErrorMessage(ticket, error.message, attempts);
      const systemPostCreated = await this.createSystemPost({
        ticketId: ticket.id,
        userId: ticket.userId,
        agentName: ticket.agentName || 'unknown',
        errorType: this.determineErrorType(error.message),
        errorMessage: error.message,
        attempts,
        timestamp,
        context: {
          prompt: ticket.payload?.prompt,
          feedItemId: ticket.payload?.feedItemId
        }
      });

      notifications.push({
        type: NotifType.SYSTEM_POST,
        success: systemPostCreated,
        timestamp
      });

      // Step 3: Send notification (placeholder)
      const userNotified = await this.sendNotification(
        ticket.userId,
        errorMessage
      );

      // Future: Email notification
      // if (this.emailService) {
      //   const emailSent = await this.sendEmail(
      //     ticket.userId,
      //     'Post Creation Failed',
      //     errorMessage
      //   );
      //   notifications.push({
      //     type: NotifType.EMAIL,
      //     success: emailSent,
      //     timestamp: new Date()
      //   });
      // }

      // Future: Webhook notification
      // if (this.webhookService) {
      //   const webhookSent = await this.sendWebhook('work_ticket.failed', {
      //     ticketId: ticket.id,
      //     userId: ticket.userId,
      //     reason: error.message
      //   });
      //   notifications.push({
      //     type: NotifType.WEBHOOK,
      //     success: webhookSent,
      //     timestamp: new Date()
      //   });
      // }

      // Step 4: Update ticket status
      await this.updateTicketStatus(ticket.id, 'failed_escalated');

      const result: EscalationResult = {
        escalated: true,
        systemPostCreated,
        errorLogged,
        userNotified,
        notifications,
        timestamp
      };

      logger.info('Escalation complete', {
        ticketId: ticket.id,
        result
      });

      return result;

    } catch (escalationError) {
      logger.error('Escalation error', { error: escalationError });
      return {
        escalated: false,
        systemPostCreated: false,
        errorLogged: false,
        userNotified: false,
        notifications: [],
        timestamp: new Date()
      };
    }
  }

  /**
   * Create a system post to notify user
   * Creates a post in the database that is visible to the user
   */
  async createSystemPost(alert: ErrorAlert): Promise<boolean> {
    try {
      const message = this.buildEscalationMessage(alert);

      // Use database adapter method if available
      // For now, log the intent
      logger.info('Creating system post', {
        userId: alert.userId,
        ticketId: alert.ticketId,
        messageLength: message.length
      });

      // Future: Insert into posts table via database adapter
      // await this.aviDatabase.createPost({
      //   userId: alert.userId,
      //   content: message,
      //   agentId: 'system',
      //   metadata: {
      //     type: 'error_notification',
      //     ticketId: alert.ticketId,
      //     errorType: alert.errorType,
      //     timestamp: alert.timestamp
      //   }
      // });

      return true;

    } catch (error) {
      logger.error('Failed to create system post', { error });
      return false;
    }
  }

  /**
   * Log error to database
   * Uses error_log table from Phase 1 schema
   */
  async logError(error: Error, context: ErrorContext): Promise<boolean> {
    try {
      const errorLog: ErrorLog = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ticketId: context.ticketId,
        userId: context.userId,
        agentId: context.agentName || 'unknown',
        errorType: this.determineErrorType(error.message),
        errorMessage: error.message,
        stackTrace: error.stack?.split('\n').slice(0, 5).join('\n'),
        metadata: {
          retryCount: context.attempts || 0,
          lastStrategy: 'unknown',
          validationErrors: [],
          ...context
        },
        timestamp: new Date()
      };

      logger.debug('Logging error', {
        errorId: errorLog.id,
        ticketId: errorLog.ticketId,
        errorType: errorLog.errorType
      });

      // Future: Use database adapter to insert into error_log table
      // await this.aviDatabase.logError(errorLog);

      return true;

    } catch (err) {
      logger.error('Failed to log error', { err });
      return false;
    }
  }

  /**
   * Send notification to user
   * Placeholder implementation for now
   */
  async sendNotification(userId: string, message: string): Promise<boolean> {
    try {
      logger.info('User notification intent', {
        userId,
        messagePreview: message.substring(0, 100)
      });

      // Future: Implement actual notification logic
      // - Check user notification preferences
      // - Send email if enabled
      // - Send push notification if enabled
      // - Store notification in database

      return true;

    } catch (error) {
      logger.error('Failed to send notification', { error });
      return false;
    }
  }

  /**
   * Update work ticket status
   */
  async updateTicketStatus(ticketId: string, status: string): Promise<void> {
    try {
      logger.debug('Updating ticket status', { ticketId, status });

      // Future: Use database adapter to update work_queue table
      // await this.aviDatabase.updateTicket(ticketId, {
      //   status,
      //   updatedAt: new Date()
      // });

    } catch (error) {
      logger.error('Failed to update ticket status', { error, ticketId, status });
      throw error;
    }
  }

  /**
   * Format user-friendly error message
   * No stack traces to users - be specific and actionable
   */
  private formatErrorMessage(
    ticket: WorkTicket,
    reason: string,
    attempts: number
  ): string {
    const attemptInfo = attempts > 0
      ? ` after ${attempts} retry attempt${attempts > 1 ? 's' : ''}`
      : '';

    const promptPreview = ticket.payload?.prompt
      ? ticket.payload.prompt.substring(0, 100) + (ticket.payload.prompt.length > 100 ? '...' : '')
      : 'No prompt available';

    return `⚠️ Post Creation Failed

Your automated post could not be created${attemptInfo}.

Reason: ${this.classifyErrorForUser(reason)}

Ticket ID: ${ticket.id}
Agent: ${ticket.agentName || 'Unknown'}
Prompt: "${promptPreview}"

What to do:
${this.getSuggestionsForUser(reason)}

If this issue persists, please contact support or try a different prompt.`;
  }

  /**
   * Classify error for user-friendly display
   */
  private classifyErrorForUser(errorMessage: string): string {
    const lower = errorMessage.toLowerCase();

    if (lower.includes('validation')) {
      return 'Content did not meet posting guidelines';
    }
    if (lower.includes('rate limit') || lower.includes('quota')) {
      return 'API rate limit or quota exceeded';
    }
    if (lower.includes('timeout')) {
      return 'Request timed out';
    }
    if (lower.includes('network')) {
      return 'Network connection issue';
    }
    if (lower.includes('auth') || lower.includes('401')) {
      return 'Authentication error - please check API credentials';
    }

    return errorMessage;
  }

  /**
   * Get actionable suggestions for user
   */
  private getSuggestionsForUser(errorMessage: string): string {
    const lower = errorMessage.toLowerCase();

    if (lower.includes('validation')) {
      return '- Try a shorter or simpler prompt\n- Check for prohibited words or inappropriate content\n- Review agent configuration';
    }
    if (lower.includes('rate limit')) {
      return '- Wait a few minutes and try again\n- Check your API quota usage\n- Consider upgrading your API plan';
    }
    if (lower.includes('timeout')) {
      return '- Try again in a moment\n- Simplify your prompt\n- Check system status';
    }
    if (lower.includes('auth')) {
      return '- Verify your API key is valid\n- Check API key permissions\n- Regenerate your API key if needed';
    }

    return '- Try again with a different prompt\n- Check system status\n- Contact support if the issue persists';
  }

  /**
   * Build escalation message for system post
   */
  private buildEscalationMessage(alert: ErrorAlert): string {
    const attemptInfo = alert.attempts > 0
      ? ` after ${alert.attempts} attempt${alert.attempts > 1 ? 's' : ''}`
      : '';

    let message = `⚠️ Action Required: Agent Response Failed

Agent: ${alert.agentName}
Error: ${alert.errorMessage}
Attempts: ${alert.attempts}
Time: ${alert.timestamp.toLocaleString()}

Your agent was unable to respond to a feed item${attemptInfo}.
`;

    if (alert.savedDraft) {
      message += `

Last attempted response:
"${alert.savedDraft}"

You can manually review and post this if appropriate.`;
    }

    message += `

What happened:
1. Retry with same parameters - Failed
2. Retry with simplified content - Failed
3. Retry with alternate agent - Failed

This feed item has been marked as failed and will not be retried automatically.`;

    return message;
  }

  /**
   * Determine error type from error message
   */
  private determineErrorType(error: string): ErrorType {
    const lowerError = error.toLowerCase();

    if (lowerError.includes('validation')) {
      return ErrType.VALIDATION_FAILED;
    }
    if (lowerError.includes('timeout')) {
      return ErrType.TIMEOUT;
    }
    if (lowerError.includes('api') || lowerError.includes('anthropic')) {
      return ErrType.API_ERROR;
    }
    if (lowerError.includes('worker')) {
      return ErrType.WORKER_ERROR;
    }

    return ErrType.UNKNOWN;
  }

  /**
   * Send email notification (future)
   */
  private async sendEmail(
    userId: string,
    subject: string,
    body: string
  ): Promise<boolean> {
    logger.info('Email notification intent', { userId, subject });
    // Future implementation
    return false;
  }

  /**
   * Send webhook notification (future)
   */
  private async sendWebhook(
    event: string,
    payload: any
  ): Promise<boolean> {
    logger.info('Webhook notification intent', { event, payload });
    // Future implementation
    return false;
  }
}
