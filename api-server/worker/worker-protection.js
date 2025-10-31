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
 *
 * Based on SPARC specification pseudocode
 */

import { StreamingLoopDetector } from './loop-detector.js';
import { WorkerHealthMonitor } from '../services/worker-health-monitor.js';
import { classifyQueryComplexity as classify, getSafetyLimits as getLimits } from '../config/streaming-protection.js';

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
 * @returns {Promise<Object>} Result with success, messages, terminated, reason, etc.
 */
export async function executeProtectedQuery(query, options = {}) {
  const {
    workerId,
    ticketId,
    sdkManager,
    streamingResponse = false,
    timeoutOverride = null
  } = options;

  // Classify query complexity and get safety limits
  const complexity = classify(query);
  const limits = getLimits(complexity);

  // Use timeout override for testing
  const timeoutMs = timeoutOverride || limits.timeoutMs;

  console.log(`🛡️ Protected query execution:`, {
    workerId,
    ticketId,
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

  // Register worker with health monitor
  healthMonitor.registerWorker(workerId, ticketId);

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

  try {
    // Execute query with timeout race
    const executePromise = (async () => {
      if (streamingResponse && sdkManager.executeHeadlessTask[Symbol.asyncIterator]) {
        // Streaming response (async generator)
        for await (const message of sdkManager.executeHeadlessTask(query)) {
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

          // Normal termination
          if (message.type === 'result') {
            break;
          }
        }
      } else {
        // Non-streaming response
        const result = await sdkManager.executeHeadlessTask(query);

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
      complexity
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
      error: error.message
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
    'QUERY_TIMEOUT': `⏱️ This query was automatically stopped because it exceeded the time limit (${Math.round((details.timeoutMs || 120000) / 1000)}s). This helps prevent runaway queries from consuming excessive resources.`,

    'MAX_CHUNKS_EXCEEDED': `🛑 This query was automatically stopped because it generated too many response chunks (${details.chunkCount}/${details.maxChunks}). This usually indicates an infinite loop or runaway process.`,

    'MAX_SIZE_EXCEEDED': `📦 This query was automatically stopped because the response size exceeded the limit (${Math.round((details.responseSize || 0) / 1024)}KB/50KB). Consider breaking this into smaller queries.`,

    'LOOP_DETECTED': `🔄 This query was automatically stopped because a streaming loop was detected. The system identified repetitive patterns indicating an infinite loop.`,

    'EXCEEDED_RUNTIME': `⏰ This query was automatically stopped by the emergency monitor after running for too long (${Math.round((details.runtime || 600000) / 1000)}s). Maximum runtime is 10 minutes.`,

    'EXCESSIVE_CHUNKS': `🚫 This query was automatically stopped due to excessive streaming chunks (${details.chunkCount} chunks). This indicates a potential infinite loop.`
  };

  return messages[reason] || `⚠️ This query was automatically stopped: ${reason}`;
}

export default {
  executeProtectedQuery,
  classifyQueryComplexity: classify,
  getSafetyLimits: getLimits,
  buildUserFacingMessage
};
