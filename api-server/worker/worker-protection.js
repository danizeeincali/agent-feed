/**
 * Worker Protection Wrapper
 *
 * Wraps Claude SDK queries with protection mechanisms:
 * - Query complexity classification
 * - Timeout enforcement
 * - Chunk limit enforcement
 * - Size limit enforcement
 * - Loop detection
 * - Health monitoring
 * - Grace period handling (triggers at 80% of timeout)
 *
 * Based on SPARC specification pseudocode
 */

import Database from 'better-sqlite3';
import { StreamingLoopDetector } from './loop-detector.js';
import { WorkerHealthMonitor } from '../services/worker-health-monitor.js';
import { classifyQueryComplexity as classify, getSafetyLimits as getLimits } from '../config/streaming-protection.js';
import { GracePeriodHandler } from './grace-period-handler.js';
import dbManager from '../database.js';
import dbSelector from '../config/database-selector.js';
import websocketService from '../services/websocket-service.js';

// Re-export for convenience
export { classify as classifyQueryComplexity, getLimits as getSafetyLimits };

/**
 * Execute protected query with all safety mechanisms
 *
 * @param {string} query - Query text
 * @param {Object} options - Options
 * @param {string} options.workerId - Worker ID
 * @param {string} options.ticketId - Ticket ID
 * @param {Object} options.sdkManager - Claude SDK manager
 * @param {boolean} options.streamingResponse - Whether SDK returns streaming response
 * @param {number} options.timeoutOverride - Override timeout (for testing)
 * @param {string} options.postId - Post ID for grace period notifications
 * @returns {Promise<Object>} Result with success, messages, terminated, reason, etc.
 */
export async function executeProtectedQuery(query, options = {}) {
  const {
    workerId,
    ticketId,
    sdkManager,
    streamingResponse = false,
    timeoutOverride = null,
    postId = null,
    userId = 'system' // Extract userId for authentication
  } = options;

  // Classify query complexity and get safety limits
  const complexity = classify(query);
  const limits = getLimits(complexity);

  // Use timeout override for testing
  const timeoutMs = timeoutOverride || limits.timeoutMs;

  console.log(`🛡️ Protected query execution:`, {
    workerId,
    ticketId,
    userId,
    complexity,
    limits: {
      maxChunks: limits.maxChunks,
      maxSize: limits.maxSize,
      timeoutMs
    }
  });

  // Initialize protection components
  const loopDetector = new StreamingLoopDetector(workerId);
  const healthMonitor = new WorkerHealthMonitor();

  // Initialize grace period handler with main database instance (not agent-pages)
  const connections = dbSelector.getRawConnections();
  const gracePeriodHandler = new GracePeriodHandler(connections.db);

  // Register worker with health monitor
  healthMonitor.registerWorker(workerId, ticketId);

  // Start grace period monitoring
  const gracePeriodContext = gracePeriodHandler.startMonitoring(
    query,
    workerId,
    ticketId,
    timeoutMs
  );

  // Set timeout
  let timeoutId;
  let timedOut = false;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      reject(new Error('QUERY_TIMEOUT'));
    }, timeoutMs);
  });

  // Tracking variables
  let chunkCount = 0;
  let responseSize = 0;
  const messages = [];
  let terminated = false;
  let terminationReason = null;
  let gracePeriodPromptShown = false;

  try {
    // Execute query with timeout race
    const executePromise = (async () => {
      if (streamingResponse && sdkManager.executeHeadlessTask[Symbol.asyncIterator]) {
        // Streaming response (async generator)
        for await (const message of sdkManager.executeHeadlessTask(query, { userId })) {
          // Update heartbeat and chunk count
          chunkCount++;
          healthMonitor.updateHeartbeat(workerId, chunkCount);

          if (chunkCount > limits.maxChunks) {
            terminated = true;
            terminationReason = 'MAX_CHUNKS_EXCEEDED';
            throw new Error(terminationReason);
          }

          // Check size limit
          if (message.type === 'assistant' && message.content) {
            const contentSize = message.content.length;
            responseSize += contentSize;

            if (responseSize > limits.maxSize) {
              terminated = true;
              terminationReason = 'MAX_SIZE_EXCEEDED';
              throw new Error(terminationReason);
            }
          }

          // Check for loops
          const loopStatus = loopDetector.check(message);
          if (loopStatus.detected) {
            terminated = true;
            terminationReason = 'LOOP_DETECTED';
            throw new Error(`${terminationReason}: ${loopStatus.reason} - ${loopStatus.details}`);
          }

          messages.push(message);

          // Check if grace period should trigger
          if (!gracePeriodPromptShown && gracePeriodHandler.shouldTrigger(gracePeriodContext)) {
            gracePeriodPromptShown = true;
            gracePeriodContext.gracePeriodTriggered = true;

            // Capture execution state
            const executionState = gracePeriodHandler.captureExecutionState(
              gracePeriodContext,
              messages,
              chunkCount
            );

            // Generate TodoWrite plan
            const plan = gracePeriodHandler.generateTodoWritePlan(
              executionState,
              gracePeriodContext
            );

            // Present user choices
            const prompt = gracePeriodHandler.presentUserChoices(
              postId || ticketId,
              plan,
              gracePeriodContext
            );

            // Persist state to database
            gracePeriodHandler.persistState(executionState, plan, gracePeriodContext);

            // Create grace period post in agent feed
            try {
              const gracePeriodPost = await createGracePeriodPost({
                plan,
                prompt,
                gracePeriodContext,
                postId,
                ticketId,
                workerId
              });

              console.log(`✅ Grace period post created: ${gracePeriodPost.id}`);

              // Broadcast to websocket for real-time notification
              websocketService.broadcastPostAdded(gracePeriodPost);

            } catch (postError) {
              console.error('❌ Failed to create grace period post:', postError);
              // Continue execution even if post creation fails
              // Fallback to console logging
              console.log('\n' + '='.repeat(80));
              console.log('⏳ GRACE PERIOD TRIGGERED');
              console.log('='.repeat(80));
              console.log(`\nMessage: ${prompt.message}\n`);
              console.log('Progress:');
              console.log(`  - Elapsed: ${prompt.progress.elapsed}`);
              console.log(`  - Remaining: ${prompt.progress.remaining}`);
              console.log(`  - Progress: ${prompt.progress.percentComplete}%\n`);
              console.log('Plan:');
              plan.forEach((step, idx) => {
                const status = step.status === 'completed' ? '✅' : '⏳';
                console.log(`  ${idx + 1}. ${status} ${step.content}`);
              });
              console.log('\nChoices:');
              prompt.choices.forEach(choice => {
                console.log(`  [${choice.id}] ${choice.label} - ${choice.description}`);
              });
              console.log('\nState ID:', prompt.stateId);
              console.log('='.repeat(80) + '\n');
            }

            // For now, auto-continue execution
            // User can respond via comment on the grace period post
            console.log('⏳ Waiting for user choice via comment (or auto-continuing in 10s)...\n');
          }

          // Normal termination
          if (message.type === 'result') {
            break;
          }
        }
      } else {
        // Non-streaming response
        const result = await sdkManager.executeHeadlessTask(query, { userId });

        if (result.success && result.messages) {
          for (const message of result.messages) {
            chunkCount++;

            if (message.type === 'assistant' && message.content) {
              const contentSize = typeof message.content === 'string'
                ? message.content.length
                : JSON.stringify(message.content).length;

              responseSize += contentSize;

              if (responseSize > limits.maxSize) {
                terminated = true;
                terminationReason = 'MAX_SIZE_EXCEEDED';
                throw new Error(terminationReason);
              }
            }

            messages.push(message);
          }
        }

        return result;
      }
    })();

    // Race timeout vs execution
    await Promise.race([executePromise, timeoutPromise]);

    // Success - clear timeout
    clearTimeout(timeoutId);

    return {
      success: true,
      messages,
      terminated: false,
      chunkCount,
      responseSize,
      complexity,
      gracePeriodTriggered: gracePeriodPromptShown,
      gracePeriodStateId: gracePeriodPromptShown ? gracePeriodContext.stateId : null
    };

  } catch (error) {
    clearTimeout(timeoutId);

    // Determine termination reason
    if (timedOut) {
      terminated = true;
      terminationReason = 'QUERY_TIMEOUT';
    } else if (!terminationReason) {
      // Unexpected error
      terminated = true;
      terminationReason = error.message;
    }

    console.error(`❌ Protected query terminated:`, {
      workerId,
      ticketId,
      reason: terminationReason,
      chunkCount,
      responseSize,
      messagesCollected: messages.length
    });

    // Build partial response from collected messages
    const partialResponse = messages
      .filter(m => m.type === 'assistant' && m.content)
      .map(m => m.content)
      .join('\n\n');

    return {
      success: false,
      terminated: true,
      reason: terminationReason,
      chunkCount,
      responseSize,
      messages,
      partialResponse,
      complexity,
      error: error.message,
      gracePeriodTriggered: gracePeriodPromptShown,
      gracePeriodStateId: gracePeriodPromptShown ? gracePeriodContext.stateId : null
    };

  } finally {
    // Always unregister worker
    healthMonitor.unregisterWorker(workerId);
  }
}

/**
 * Build user-facing error message for protection errors
 * @param {string} reason - Termination reason
 * @param {Object} details - Additional details
 * @returns {string} User-facing message
 */
export function buildUserFacingMessage(reason, details = {}) {
  const messages = {
    'QUERY_TIMEOUT': `⏱️ This query was automatically stopped because it exceeded the time limit (${Math.round((details.timeoutMs || 240000) / 1000)}s).

💡 **For complex tasks like this, I can help you:**
- Break it into smaller, manageable steps
- Create a TodoWrite plan with 5-10 specific actions
- Execute each step individually for better control

**Try this instead:** Reply with "create a plan" and I'll break this down into steps we can tackle one at a time.`,

    'MAX_CHUNKS_EXCEEDED': `🛑 This query was automatically stopped because it generated too many response chunks (${details.chunkCount}/${details.maxChunks}). This usually indicates an infinite loop or runaway process.`,

    'MAX_SIZE_EXCEEDED': `📦 This query was automatically stopped because the response size exceeded the limit (${Math.round((details.responseSize || 0) / 1024)}KB/50KB). Consider breaking this into smaller queries.`,

    'LOOP_DETECTED': `🔄 This query was automatically stopped because a streaming loop was detected. The system identified repetitive patterns indicating an infinite loop.`,

    'EXCEEDED_RUNTIME': `⏰ This query was automatically stopped by the emergency monitor after running for too long (${Math.round((details.runtime || 600000) / 1000)}s). Maximum runtime is 10 minutes.`,

    'EXCESSIVE_CHUNKS': `🚫 This query was automatically stopped due to excessive streaming chunks (${details.chunkCount} chunks). This indicates a potential infinite loop.`
  };

  return messages[reason] || `⚠️ This query was automatically stopped: ${reason}`;
}

/**
 * Handle user choice from grace period prompt
 * @param {string} stateId - State ID from grace period trigger
 * @param {string} choice - User choice ('continue', 'pause', 'simplify', 'cancel')
 * @returns {Object} Action result
 */
export function handleGracePeriodChoice(stateId, choice) {
  const connections = dbSelector.getRawConnections();
  const gracePeriodHandler = new GracePeriodHandler(connections.db);

  try {
    gracePeriodHandler.recordUserChoice(stateId, choice);

    console.log(`✅ Grace period choice handled:`, {
      stateId,
      choice
    });

    // Return action instructions based on choice
    const actions = {
      'continue': {
        action: 'extend_timeout',
        extensionMs: 120000,
        message: 'Extending timeout by 120 seconds. Execution will continue.'
      },
      'pause': {
        action: 'save_state',
        message: 'State saved. You can resume this task later using the state ID.'
      },
      'simplify': {
        action: 'reduce_scope',
        message: 'Reducing scope to essential tasks only. Skipping optional features.'
      },
      'cancel': {
        action: 'terminate',
        message: 'Terminating execution. Partial results will be returned.'
      }
    };

    return {
      success: true,
      stateId,
      choice,
      ...actions[choice]
    };

  } catch (error) {
    console.error(`❌ Failed to handle grace period choice:`, error);
    return {
      success: false,
      stateId,
      choice,
      error: error.message
    };
  }
}

/**
 * Resume execution from saved grace period state
 * @param {string} stateId - State ID to resume
 * @returns {Object|null} Saved state or null
 */
export function resumeFromGracePeriodState(stateId) {
  const connections = dbSelector.getRawConnections();
  const gracePeriodHandler = new GracePeriodHandler(connections.db);

  return gracePeriodHandler.resumeFromState(stateId);
}

/**
 * Get grace period statistics
 * @returns {Object} Statistics
 */
export function getGracePeriodStatistics() {
  const connections = dbSelector.getRawConnections();
  const gracePeriodHandler = new GracePeriodHandler(connections.db);

  return gracePeriodHandler.getStatistics();
}

/**
 * Clean up expired grace period states
 */
export function cleanupExpiredGracePeriodStates() {
  const connections = dbSelector.getRawConnections();
  const gracePeriodHandler = new GracePeriodHandler(connections.db);

  gracePeriodHandler.cleanupExpiredStates();
}

/**
 * Create grace period post in agent feed
 * @param {Object} options - Post options
 * @param {Array} options.plan - TodoWrite plan
 * @param {Object} options.prompt - User prompt with choices
 * @param {Object} options.gracePeriodContext - Grace period context
 * @param {string} options.postId - Related post ID (if any)
 * @param {string} options.ticketId - Related ticket ID
 * @param {string} options.workerId - Worker ID
 * @returns {Promise<Object>} Created post
 */
async function createGracePeriodPost(options) {
  const { plan, prompt, gracePeriodContext, postId, ticketId, workerId } = options;

  // Format TodoWrite plan as markdown
  const planMarkdown = plan.map((step, idx) => {
    const status = step.status === 'completed' ? '✅' : '⏳';
    return `${idx + 1}. ${status} ${step.content}`;
  }).join('\n');

  // Create post content in markdown format
  const content = `# ⏳ Grace Period - Task Nearing Timeout

Your current task is approaching the time limit.

## Progress (${prompt.progress.percentComplete}% complete)
⏱️ **Time Elapsed:** ${prompt.progress.elapsed}
⏱️ **Time Remaining:** ${prompt.progress.remaining}

## TodoWrite Plan
${planMarkdown}

## What would you like to do?

Reply with one of these options:
- **continue** - Keep working (+120s extension)
- **pause** - Save and review later (24h window)
- **simplify** - Complete essentials only
- **cancel** - Stop now, show results

---
*State ID: \`${gracePeriodContext.stateId}\`*
*Worker: \`${workerId}\`*
*Ticket: \`${ticketId}\`*`;

  // Create post data
  const postData = {
    userId: 'system',
    agentId: 'grace-period-monitor',
    content,
    title: '⏳ Grace Period - Task Nearing Timeout',
    metadata: {
      isGracePeriodPost: true,
      gracePeriodStateId: gracePeriodContext.stateId,
      workerId,
      ticketId,
      relatedPostId: postId,
      skipTicketCreation: true, // Don't create work queue ticket for this system notification
      gracePeriodType: 'timeout-warning',
      timeElapsed: Date.now() - gracePeriodContext.startTime,
      timeRemaining: gracePeriodContext.timeoutMs - (Date.now() - gracePeriodContext.startTime),
      gracePeriodTriggeredAt: Date.now()
    }
  };

  // Create post using database selector
  const createdPost = await dbSelector.createPost('system', postData);

  return createdPost;
}

export default {
  executeProtectedQuery,
  classifyQueryComplexity: classify,
  getSafetyLimits: getLimits,
  buildUserFacingMessage,
  handleGracePeriodChoice,
  resumeFromGracePeriodState,
  getGracePeriodStatistics,
  cleanupExpiredGracePeriodStates,
  createGracePeriodPost
};
