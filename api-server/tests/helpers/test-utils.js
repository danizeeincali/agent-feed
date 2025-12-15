/**
 * Test Utilities for Streaming Loop Protection System
 * Provides helper functions and mock objects for testing
 */

import { EventEmitter } from 'events';

/**
 * Creates a mock worker that simulates streaming behavior
 * @param {Object} options - Configuration for the mock worker
 * @returns {Object} Mock worker instance
 */
export function createMockWorker(options = {}) {
  const {
    workerId = `worker-${Date.now()}`,
    ticketId = `ticket-${Date.now()}`,
    shouldLoop = false,
    shouldTimeout = false,
    chunkCount = 10,
    chunkDelay = 100,
    messageContent = 'test message',
  } = options;

  const emitter = new EventEmitter();
  let isKilled = false;
  let streamStarted = false;

  return {
    workerId,
    ticketId,
    isKilled: () => isKilled,
    kill: () => {
      isKilled = true;
      emitter.emit('killed', { workerId, ticketId, reason: 'manual_kill' });
    },

    startStream: async () => {
      if (streamStarted) {
        throw new Error('Stream already started');
      }
      streamStarted = true;

      const messages = [];

      if (shouldLoop) {
        // Simulate infinite loop - generate messages rapidly
        for (let i = 0; i < 100; i++) {
          if (isKilled) break;
          const message = {
            type: 'assistant',
            content: messageContent,
            timestamp: Date.now(),
            chunkIndex: i,
          };
          messages.push(message);
          emitter.emit('chunk', message);
          await sleep(10); // Very fast chunks to trigger loop detection
        }
      } else if (shouldTimeout) {
        // Simulate long-running query that times out
        await sleep(10000); // Wait longer than timeout
      } else {
        // Normal streaming behavior
        for (let i = 0; i < chunkCount; i++) {
          if (isKilled) break;
          const message = {
            type: i === chunkCount - 1 ? 'result' : 'assistant',
            content: `${messageContent} ${i}`,
            timestamp: Date.now(),
            chunkIndex: i,
          };
          messages.push(message);
          emitter.emit('chunk', message);
          await sleep(chunkDelay);
        }
      }

      return messages;
    },

    on: (event, handler) => emitter.on(event, handler),
    off: (event, handler) => emitter.off(event, handler),
  };
}

/**
 * Simulates a streaming loop condition
 * @param {Object} loopDetector - Loop detector instance
 * @param {number} count - Number of rapid chunks to send
 * @returns {Promise<Object>} Detection result
 */
export async function simulateStreamingLoop(loopDetector, count = 15) {
  let detectionResult = null;

  for (let i = 0; i < count; i++) {
    const message = {
      type: 'assistant',
      content: `chunk ${i}`,
      timestamp: Date.now(),
    };

    detectionResult = loopDetector.check(message);

    if (detectionResult.detected) {
      break;
    }

    // Very short delay to simulate rapid streaming
    await sleep(50);
  }

  return detectionResult;
}

/**
 * Waits for a worker to be auto-killed
 * @param {Object} worker - Worker instance
 * @param {number} timeout - Maximum wait time in ms
 * @returns {Promise<boolean>} True if killed, false if timeout
 */
export async function waitForAutoKill(worker, timeout = 5000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(false);
    }, timeout);

    worker.on('killed', () => {
      clearTimeout(timer);
      resolve(true);
    });

    // Also check isKilled status periodically
    const checkInterval = setInterval(() => {
      if (worker.isKilled()) {
        clearInterval(checkInterval);
        clearTimeout(timer);
        resolve(true);
      }
    }, 100);
  });
}

/**
 * Asserts that a worker was killed with expected properties
 * @param {Object} worker - Worker instance
 * @param {Object} options - Expected properties
 */
export function assertWorkerKilled(worker, options = {}) {
  const {
    shouldBeKilled = true,
    reason = null,
  } = options;

  const killed = worker.isKilled();

  if (shouldBeKilled && !killed) {
    throw new Error('Expected worker to be killed but it was not');
  }

  if (!shouldBeKilled && killed) {
    throw new Error('Expected worker not to be killed but it was');
  }

  return true;
}

/**
 * Creates a mock streaming message
 * @param {Object} options - Message configuration
 * @returns {Object} Mock message
 */
export function createMockMessage(options = {}) {
  const {
    type = 'assistant',
    content = 'test content',
    timestamp = Date.now(),
    chunkIndex = 0,
  } = options;

  return {
    type,
    content,
    timestamp,
    chunkIndex,
  };
}

/**
 * Creates a sequence of mock messages
 * @param {number} count - Number of messages
 * @param {Object} baseOptions - Base configuration for all messages
 * @returns {Array<Object>} Array of mock messages
 */
export function createMessageSequence(count, baseOptions = {}) {
  const messages = [];
  const startTime = Date.now();

  for (let i = 0; i < count; i++) {
    messages.push(createMockMessage({
      ...baseOptions,
      content: `${baseOptions.content || 'message'} ${i}`,
      timestamp: startTime + (i * 100),
      chunkIndex: i,
      type: i === count - 1 ? 'result' : 'assistant',
    }));
  }

  return messages;
}

/**
 * Simulates a stagnant stream (no progress)
 * @param {Object} loopDetector - Loop detector instance
 * @param {number} duration - Duration in ms to wait
 * @returns {Promise<Object>} Detection result
 */
export async function simulateStagnantStream(loopDetector, duration = 35000) {
  // Send initial message
  loopDetector.check(createMockMessage({ content: 'initial' }));

  // Wait for stagnation threshold
  await sleep(duration);

  // Try to send another message - should be detected as stagnant
  return loopDetector.check(createMockMessage({ content: 'after stagnation' }));
}

/**
 * Creates a mock health monitor for testing
 * @returns {Object} Mock health monitor
 */
export function createMockHealthMonitor() {
  const workers = new Map();

  return {
    register: (workerId, ticketId, startTime) => {
      workers.set(workerId, {
        workerId,
        ticketId,
        startTime,
        lastHeartbeat: Date.now(),
        chunkCount: 0,
        status: 'running',
      });
    },

    unregister: (workerId) => {
      workers.delete(workerId);
    },

    updateHeartbeat: (workerId) => {
      const worker = workers.get(workerId);
      if (worker) {
        worker.lastHeartbeat = Date.now();
        worker.chunkCount++;
      }
    },

    getWorker: (workerId) => workers.get(workerId),

    getUnhealthyWorkers: (options = {}) => {
      const {
        maxRuntime = 300000, // 5 minutes
        maxHeartbeatGap = 30000, // 30 seconds
      } = options;

      const now = Date.now();
      const unhealthy = [];

      for (const [workerId, worker] of workers.entries()) {
        const runtime = now - worker.startTime;
        const heartbeatGap = now - worker.lastHeartbeat;

        let reason = null;
        if (runtime > maxRuntime) {
          reason = 'RUNTIME_EXCEEDED';
        } else if (heartbeatGap > maxHeartbeatGap) {
          reason = 'HEARTBEAT_TIMEOUT';
        }

        if (reason) {
          unhealthy.push({ ...worker, reason });
        }
      }

      return unhealthy;
    },

    getAllWorkers: () => Array.from(workers.values()),
  };
}

/**
 * Creates a mock circuit breaker for testing
 * @returns {Object} Mock circuit breaker
 */
export function createMockCircuitBreaker() {
  let state = 'CLOSED';
  const failures = [];

  return {
    check: () => {
      if (state === 'OPEN') {
        throw new Error('CIRCUIT_BREAKER_OPEN');
      }
      return true;
    },

    recordFailure: (workerId, reason) => {
      failures.push({
        workerId,
        reason,
        timestamp: Date.now(),
      });

      // Clean old failures (older than 1 minute)
      const now = Date.now();
      const recentFailures = failures.filter(f => now - f.timestamp < 60000);
      failures.length = 0;
      failures.push(...recentFailures);

      if (failures.length >= 3) {
        state = 'OPEN';
        setTimeout(() => {
          state = 'HALF_OPEN';
        }, 300000); // 5 minutes
      }
    },

    getState: () => state,
    getFailureCount: () => failures.length,
    reset: () => {
      state = 'CLOSED';
      failures.length = 0;
    },
  };
}

/**
 * Waits for a condition to be true
 * @param {Function} condition - Condition function
 * @param {number} timeout - Maximum wait time in ms
 * @param {number} interval - Check interval in ms
 * @returns {Promise<boolean>} True if condition met, false if timeout
 */
export async function waitFor(condition, timeout = 5000, interval = 100) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await sleep(interval);
  }

  return false;
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Measures execution time of a function
 * @param {Function} fn - Function to measure
 * @returns {Promise<Object>} Result with duration
 */
export async function measureExecutionTime(fn) {
  const startTime = Date.now();
  const result = await fn();
  const duration = Date.now() - startTime;

  return { result, duration };
}

/**
 * Creates a mock database for testing
 * @returns {Object} Mock database
 */
export function createMockDatabase() {
  const data = new Map();

  return {
    save: async (key, value) => {
      data.set(key, { ...value, savedAt: Date.now() });
      return true;
    },

    get: async (key) => {
      return data.get(key);
    },

    update: async (key, updates) => {
      const existing = data.get(key);
      if (!existing) return false;
      data.set(key, { ...existing, ...updates, updatedAt: Date.now() });
      return true;
    },

    delete: async (key) => {
      return data.delete(key);
    },

    clear: () => {
      data.clear();
    },
  };
}

export default {
  createMockWorker,
  simulateStreamingLoop,
  waitForAutoKill,
  assertWorkerKilled,
  createMockMessage,
  createMessageSequence,
  simulateStagnantStream,
  createMockHealthMonitor,
  createMockCircuitBreaker,
  waitFor,
  sleep,
  measureExecutionTime,
  createMockDatabase,
};
