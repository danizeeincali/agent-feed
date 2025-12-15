/**
 * Grace Period Handler for Worker Protection
 *
 * Triggers at 80% of timeout threshold to provide users with options:
 * - Continue: Extend timeout by additional 120 seconds
 * - Pause: Save state and allow resumption later
 * - Simplify: Reduce scope and complete partial work
 * - Cancel: Terminate gracefully
 *
 * Integrates with TodoWrite to show progress and remaining work.
 */

import Database from 'better-sqlite3';
import { randomBytes } from 'crypto';

export class GracePeriodHandler {
  constructor(database, config = {}) {
    this.db = database;
    this.config = {
      triggerAtPercentage: config.triggerAtPercentage || 0.8,
      enablePlanningMode: config.enablePlanningMode !== false,
      minStepsInPlan: config.minStepsInPlan || 5,
      maxStepsInPlan: config.maxStepsInPlan || 10,
      messageTemplate: config.messageTemplate || '⏳ This is taking longer than expected. Let me create a plan to break this into manageable steps...',
      stateTtlHours: config.stateTtlHours || 24
    };

    this._initializeStatements();
  }

  _initializeStatements() {
    this.insertStateStmt = this.db.prepare(`
      INSERT INTO grace_period_states (
        id, worker_id, ticket_id, query, partial_results,
        execution_state, plan, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.getStateStmt = this.db.prepare(`
      SELECT * FROM grace_period_states WHERE id = ?
    `);

    this.updateChoiceStmt = this.db.prepare(`
      UPDATE grace_period_states
      SET user_choice = ?, user_choice_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    this.markResumedStmt = this.db.prepare(`
      UPDATE grace_period_states
      SET resumed = 1, resumed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    this.cleanupExpiredStmt = this.db.prepare(`
      DELETE FROM grace_period_states WHERE datetime(expires_at) < datetime('now')
    `);
  }

  /**
   * Start monitoring a query for grace period trigger
   * @param {string} query - The query being executed
   * @param {string} workerId - Worker ID
   * @param {string} ticketId - Ticket ID
   * @param {number} timeoutMs - Total timeout in milliseconds
   * @returns {Object} Monitoring context
   */
  startMonitoring(query, workerId, ticketId, timeoutMs) {
    const gracePeriodMs = Math.floor(timeoutMs * this.config.triggerAtPercentage);
    const stateId = `gps-${Date.now()}-${randomBytes(4).toString('hex')}`;

    const context = {
      stateId,
      workerId,
      ticketId,
      query,
      timeoutMs,
      gracePeriodMs,
      startTime: Date.now(),
      gracePeriodTriggered: false,
      messages: [],
      chunkCount: 0
    };

    console.log(`🕐 Grace period monitoring started:`, {
      stateId,
      worker: workerId,
      ticket: ticketId,
      timeout: `${timeoutMs}ms`,
      gracePeriod: `${gracePeriodMs}ms (${this.config.triggerAtPercentage * 100}%)`
    });

    return context;
  }

  /**
   * Check if grace period should trigger
   * @param {Object} context - Monitoring context from startMonitoring()
   * @returns {boolean} True if grace period should trigger now
   */
  shouldTrigger(context) {
    if (context.gracePeriodTriggered) {
      return false; // Already triggered
    }

    const elapsed = Date.now() - context.startTime;
    return elapsed >= context.gracePeriodMs;
  }

  /**
   * Capture current execution state for potential resumption
   * @param {Object} context - Monitoring context
   * @param {Array} messages - Messages collected so far
   * @param {number} chunkCount - Chunks processed
   * @returns {Object} Captured state
   */
  captureExecutionState(context, messages, chunkCount) {
    const elapsed = Date.now() - context.startTime;

    const state = {
      workerId: context.workerId,
      ticketId: context.ticketId,
      query: context.query,
      messagesCollected: messages.length,
      chunksProcessed: chunkCount,
      timeElapsed: elapsed,
      timestamp: new Date().toISOString(),
      partialMessages: messages.slice(0, 10) // Keep first 10 for context
    };

    console.log(`📸 Execution state captured:`, {
      stateId: context.stateId,
      messages: state.messagesCollected,
      chunks: state.chunksProcessed,
      elapsed: `${Math.floor(elapsed / 1000)}s`
    });

    return state;
  }

  /**
   * Generate TodoWrite plan from partial results
   * @param {Object} partialResults - Partial execution results
   * @param {Object} context - Monitoring context
   * @returns {Array} TodoWrite plan with completed/pending steps
   */
  generateTodoWritePlan(partialResults, context) {
    const completed = [];
    const pending = [];

    // Analyze partial messages to determine completed work
    const messages = partialResults.partialMessages || [];

    // Count tool uses to infer completed steps
    const toolUses = messages.filter(m => m.type === 'tool_use');
    const toolResults = messages.filter(m => m.type === 'tool_result');

    if (toolUses.length > 0) {
      completed.push({
        content: `Completed ${toolUses.length} tool operations`,
        status: 'completed',
        activeForm: `Completed ${toolUses.length} tool operations`
      });
    }

    // Estimate remaining work
    const totalChunks = partialResults.chunksProcessed || 0;
    const progressPercent = (totalChunks / 100) * 100; // Rough estimate

    if (progressPercent < 50) {
      pending.push({
        content: 'Complete primary task objective',
        status: 'pending',
        activeForm: 'Completing primary task objective'
      });
      pending.push({
        content: 'Validate and test results',
        status: 'pending',
        activeForm: 'Validating and testing results'
      });
    } else if (progressPercent < 80) {
      pending.push({
        content: 'Finalize remaining implementation',
        status: 'pending',
        activeForm: 'Finalizing remaining implementation'
      });
    } else {
      pending.push({
        content: 'Complete final validation',
        status: 'pending',
        activeForm: 'Completing final validation'
      });
    }

    const plan = [...completed, ...pending];

    // Ensure plan meets min/max constraints
    while (plan.length < this.config.minStepsInPlan) {
      plan.push({
        content: `Additional step ${plan.length + 1}`,
        status: 'pending',
        activeForm: `Completing additional step ${plan.length + 1}`
      });
    }

    if (plan.length > this.config.maxStepsInPlan) {
      plan.splice(this.config.maxStepsInPlan);
    }

    console.log(`📋 TodoWrite plan generated:`, {
      stateId: context.stateId,
      totalSteps: plan.length,
      completed: completed.length,
      pending: pending.length
    });

    return plan;
  }

  /**
   * Present user with grace period choices
   * @param {string} postId - Post ID to respond to
   * @param {Array} plan - TodoWrite plan
   * @param {Object} context - Monitoring context
   * @returns {Object} User choice prompt data
   */
  presentUserChoices(postId, plan, context) {
    const elapsed = Math.floor((Date.now() - context.startTime) / 1000);
    const remaining = Math.floor((context.timeoutMs - (Date.now() - context.startTime)) / 1000);

    const prompt = {
      stateId: context.stateId,
      postId,
      message: this.config.messageTemplate,
      progress: {
        elapsed: `${elapsed}s`,
        remaining: `${remaining}s`,
        percentComplete: Math.floor((elapsed / (context.timeoutMs / 1000)) * 100)
      },
      plan,
      choices: [
        {
          id: 'continue',
          label: 'Continue',
          description: `Keep working (+120s extension)`,
          action: 'extend_timeout'
        },
        {
          id: 'pause',
          label: 'Pause & Resume Later',
          description: 'Save progress and let me review what\'s built so far',
          action: 'save_state'
        },
        {
          id: 'simplify',
          label: 'Simplify Scope',
          description: 'Complete essential parts only, skip optional features',
          action: 'reduce_scope'
        },
        {
          id: 'cancel',
          label: 'Cancel',
          description: 'Stop now and show what\'s been completed',
          action: 'terminate'
        }
      ]
    };

    console.log(`❓ User choices presented:`, {
      stateId: context.stateId,
      elapsed: prompt.progress.elapsed,
      remaining: prompt.progress.remaining,
      choices: prompt.choices.length
    });

    return prompt;
  }

  /**
   * Persist state for potential resumption
   * @param {Object} state - Execution state from captureExecutionState()
   * @param {Array} plan - TodoWrite plan
   * @param {Object} context - Monitoring context
   * @returns {string} State ID for resumption
   */
  persistState(state, plan, context) {
    const expiresAt = new Date(Date.now() + (this.config.stateTtlHours * 60 * 60 * 1000));

    try {
      this.insertStateStmt.run(
        context.stateId,
        context.workerId,
        context.ticketId,
        context.query,
        JSON.stringify(state.partialMessages || []),
        JSON.stringify(state),
        JSON.stringify(plan),
        expiresAt.toISOString()
      );

      console.log(`💾 State persisted:`, {
        stateId: context.stateId,
        expiresAt: expiresAt.toISOString(),
        ttl: `${this.config.stateTtlHours}h`
      });

      return context.stateId;
    } catch (error) {
      console.error(`❌ Failed to persist state:`, error);
      throw error;
    }
  }

  /**
   * Record user's choice
   * @param {string} stateId - State ID
   * @param {string} choice - User choice ('continue', 'pause', 'simplify', 'cancel')
   */
  recordUserChoice(stateId, choice) {
    try {
      this.updateChoiceStmt.run(choice, stateId);
      console.log(`✅ User choice recorded:`, { stateId, choice });
    } catch (error) {
      console.error(`❌ Failed to record user choice:`, error);
      throw error;
    }
  }

  /**
   * Resume from saved state
   * @param {string} stateId - State ID to resume
   * @returns {Object|null} Saved state or null if not found/expired
   */
  resumeFromState(stateId) {
    try {
      const row = this.getStateStmt.get(stateId);

      if (!row) {
        console.log(`⚠️ State not found:`, { stateId });
        return null;
      }

      // Check if expired
      if (new Date(row.expires_at) < new Date()) {
        console.log(`⏰ State expired:`, {
          stateId,
          expiredAt: row.expires_at
        });
        return null;
      }

      // Mark as resumed
      this.markResumedStmt.run(stateId);

      const state = {
        id: row.id,
        workerId: row.worker_id,
        ticketId: row.ticket_id,
        query: row.query,
        partialResults: JSON.parse(row.partial_results || '[]'),
        executionState: JSON.parse(row.execution_state),
        plan: JSON.parse(row.plan || '[]'),
        userChoice: row.user_choice,
        createdAt: row.created_at
      };

      console.log(`🔄 Resuming from state:`, {
        stateId,
        ticketId: state.ticketId,
        userChoice: state.userChoice,
        age: `${Math.floor((Date.now() - new Date(state.createdAt)) / 1000)}s`
      });

      return state;
    } catch (error) {
      console.error(`❌ Failed to resume from state:`, error);
      return null;
    }
  }

  /**
   * Clean up expired states (run periodically)
   */
  cleanupExpiredStates() {
    try {
      const result = this.cleanupExpiredStmt.run();
      if (result.changes > 0) {
        console.log(`🧹 Cleaned up ${result.changes} expired grace period states`);
      }
    } catch (error) {
      console.error(`❌ Failed to cleanup expired states:`, error);
    }
  }

  /**
   * Get grace period statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    try {
      const stats = this.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN user_choice = 'continue' THEN 1 ELSE 0 END) as continued,
          SUM(CASE WHEN user_choice = 'pause' THEN 1 ELSE 0 END) as paused,
          SUM(CASE WHEN user_choice = 'simplify' THEN 1 ELSE 0 END) as simplified,
          SUM(CASE WHEN user_choice = 'cancel' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN resumed = 1 THEN 1 ELSE 0 END) as resumed
        FROM grace_period_states
        WHERE created_at > datetime('now', '-7 days')
      `).get();

      return {
        total: stats.total || 0,
        choices: {
          continue: stats.continued || 0,
          pause: stats.paused || 0,
          simplify: stats.simplified || 0,
          cancel: stats.cancelled || 0
        },
        resumed: stats.resumed || 0,
        period: '7 days'
      };
    } catch (error) {
      console.error(`❌ Failed to get statistics:`, error);
      return null;
    }
  }
}

export default GracePeriodHandler;
