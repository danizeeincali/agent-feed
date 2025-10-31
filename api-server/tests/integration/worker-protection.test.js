/**
 * Integration Tests for Worker Protection System
 *
 * Tests the complete protection flow from agent-worker.js through:
 * - worker-protection.js (protection wrapper)
 * - loop-detector.js (streaming loop detection)
 * - worker-health-monitor.js (worker health tracking)
 * - emergency-monitor.js (auto-kill functionality)
 *
 * Following TDD approach: Tests written FIRST before implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AgentWorker from '../../worker/agent-worker.js';
import { executeProtectedQuery, classifyQueryComplexity, getSafetyLimits } from '../../worker/worker-protection.js';
import { StreamingLoopDetector } from '../../worker/loop-detector.js';
import { WorkerHealthMonitor } from '../../services/worker-health-monitor.js';
import { EmergencyMonitor } from '../../services/emergency-monitor.js';

describe('Worker Protection System - Integration Tests', () => {
  let healthMonitor;
  let emergencyMonitor;

  beforeEach(() => {
    // Initialize singletons
    healthMonitor = WorkerHealthMonitor.getInstance();
    emergencyMonitor = EmergencyMonitor.getInstance();

    // Clear any existing state
    healthMonitor.clear();

    // Stop emergency monitor to prevent auto-kills during tests
    emergencyMonitor.stop();
  });

  afterEach(() => {
    // Cleanup
    healthMonitor.clear();
    emergencyMonitor.stop();
  });

  describe('Query Complexity Classification', () => {
    it('should classify simple queries correctly', () => {
      const simpleQueries = [
        'hi what is 650 + 94',
        'hello',
        'what is 2 + 2',
        'ping'
      ];

      for (const query of simpleQueries) {
        const complexity = classifyQueryComplexity(query);
        expect(complexity).toBe('simple');
      }
    });

    it('should classify complex queries correctly', () => {
      const complexQueries = [
        'analyze this 5000 word document and provide comprehensive insights',
        'Create a full-stack application with authentication',
        'Research the market and provide competitive analysis with charts'
      ];

      for (const query of complexQueries) {
        const complexity = classifyQueryComplexity(query);
        expect(complexity).toBe('complex');
      }
    });

    it('should classify default queries correctly', () => {
      const defaultQueries = [
        'What is the weather today?',
        'Explain quantum computing',
        'Write a short poem'
      ];

      for (const query of defaultQueries) {
        const complexity = classifyQueryComplexity(query);
        expect(complexity).toBe('default');
      }
    });
  });

  describe('Safety Limits Configuration', () => {
    it('should return correct limits for simple queries', () => {
      const limits = getSafetyLimits('simple');

      expect(limits).toEqual({
        maxChunks: 20,
        maxSize: 50000,
        timeoutMs: 60000
      });
    });

    it('should return correct limits for complex queries', () => {
      const limits = getSafetyLimits('complex');

      expect(limits).toEqual({
        maxChunks: 200,
        maxSize: 50000,
        timeoutMs: 300000
      });
    });

    it('should return correct limits for default queries', () => {
      const limits = getSafetyLimits('default');

      expect(limits).toEqual({
        maxChunks: 100,
        maxSize: 50000,
        timeoutMs: 120000
      });
    });
  });

  describe('Protected Query Execution', () => {
    it('should execute normal query successfully', async () => {
      // Mock SDK that returns successfully with few chunks
      const mockSDK = {
        executeHeadlessTask: vi.fn().mockResolvedValue({
          success: true,
          messages: [
            { type: 'assistant', content: 'Here is your answer: 744' }
          ]
        })
      };

      const result = await executeProtectedQuery(
        'what is 650 + 94',
        {
          workerId: 'test-worker-1',
          ticketId: 'test-ticket-1',
          sdkManager: mockSDK
        }
      );

      expect(result.success).toBe(true);
      expect(result.terminated).toBe(false);
      expect(result.reason).toBeUndefined();
    });

    it('should timeout on long-running query', async () => {
      // Mock SDK that takes too long
      const mockSDK = {
        executeHeadlessTask: vi.fn().mockImplementation(() =>
          new Promise((resolve) => {
            // Never resolve - will timeout
          })
        )
      };

      const start = Date.now();

      const result = await executeProtectedQuery(
        'simple query',
        {
          workerId: 'test-worker-2',
          ticketId: 'test-ticket-2',
          sdkManager: mockSDK,
          timeoutOverride: 1000 // 1 second for testing
        }
      );

      const elapsed = Date.now() - start;

      expect(result.success).toBe(false);
      expect(result.terminated).toBe(true);
      expect(result.reason).toBe('QUERY_TIMEOUT');
      expect(elapsed).toBeGreaterThanOrEqual(1000);
      expect(elapsed).toBeLessThan(1500);
    }, 5000);

    it('should stop at chunk limit', async () => {
      // Mock SDK that returns too many chunks
      const mockSDK = {
        executeHeadlessTask: vi.fn().mockImplementation(async function* () {
          // Yield 25 chunks (exceeds simple limit of 20)
          for (let i = 0; i < 25; i++) {
            yield { type: 'assistant', content: `chunk ${i}` };
          }
        })
      };

      const result = await executeProtectedQuery(
        'simple query',
        {
          workerId: 'test-worker-3',
          ticketId: 'test-ticket-3',
          sdkManager: mockSDK,
          streamingResponse: true
        }
      );

      expect(result.success).toBe(false);
      expect(result.terminated).toBe(true);
      expect(result.reason).toBe('MAX_CHUNKS_EXCEEDED');
      expect(result.chunkCount).toBeGreaterThan(20);
    });

    it('should stop at size limit', async () => {
      // Mock SDK that returns large response
      const largeContent = 'x'.repeat(60000); // 60KB (exceeds 50KB limit)

      const mockSDK = {
        executeHeadlessTask: vi.fn().mockResolvedValue({
          success: true,
          messages: [
            { type: 'assistant', content: largeContent }
          ]
        })
      };

      const result = await executeProtectedQuery(
        'simple query',
        {
          workerId: 'test-worker-4',
          ticketId: 'test-ticket-4',
          sdkManager: mockSDK
        }
      );

      expect(result.success).toBe(false);
      expect(result.terminated).toBe(true);
      expect(result.reason).toBe('MAX_SIZE_EXCEEDED');
      expect(result.responseSize).toBeGreaterThan(50000);
    });

    it('should detect streaming loops', async () => {
      // Mock SDK that returns repetitive chunks rapidly
      const mockSDK = {
        executeHeadlessTask: vi.fn().mockImplementation(async function* () {
          // Yield 15 chunks in rapid succession (will trigger loop detection)
          for (let i = 0; i < 15; i++) {
            yield { type: 'assistant', content: 'repetitive content' };
            // No delay - rapid fire
          }
        })
      };

      const result = await executeProtectedQuery(
        'simple query',
        {
          workerId: 'test-worker-5',
          ticketId: 'test-ticket-5',
          sdkManager: mockSDK,
          streamingResponse: true
        }
      );

      expect(result.success).toBe(false);
      expect(result.terminated).toBe(true);
      expect(result.reason).toBe('LOOP_DETECTED');
    });

    it('should save partial response on termination', async () => {
      // Mock SDK that exceeds chunk limit
      const mockSDK = {
        executeHeadlessTask: vi.fn().mockImplementation(async function* () {
          for (let i = 0; i < 25; i++) {
            yield { type: 'assistant', content: `Message ${i}` };
          }
        })
      };

      const result = await executeProtectedQuery(
        'simple query',
        {
          workerId: 'test-worker-6',
          ticketId: 'test-ticket-6',
          sdkManager: mockSDK,
          streamingResponse: true
        }
      );

      expect(result.terminated).toBe(true);
      expect(result.partialResponse).toBeDefined();
      expect(result.partialResponse.length).toBeGreaterThan(0);
      expect(result.partialResponse).toContain('Message');
    });
  });

  describe('Worker Health Monitor', () => {
    it('should register worker on query start', () => {
      const workerId = 'test-worker-health-1';
      const ticketId = 'test-ticket-health-1';

      healthMonitor.register(workerId, ticketId);

      const workers = healthMonitor.getAllWorkers();
      expect(workers).toHaveLength(1);
      expect(workers[0].workerId).toBe(workerId);
      expect(workers[0].ticketId).toBe(ticketId);
    });

    it('should update heartbeat during query execution', () => {
      const workerId = 'test-worker-health-2';
      const ticketId = 'test-ticket-health-2';

      healthMonitor.register(workerId, ticketId);

      const worker1 = healthMonitor.getWorker(workerId);
      const firstHeartbeat = worker1.lastHeartbeat;

      // Wait a bit then update
      setTimeout(() => {
        healthMonitor.updateHeartbeat(workerId);
      }, 100);

      setTimeout(() => {
        const worker2 = healthMonitor.getWorker(workerId);
        expect(worker2.lastHeartbeat).toBeGreaterThan(firstHeartbeat);
      }, 200);
    });

    it('should detect unhealthy workers (running > 10 minutes)', () => {
      const workerId = 'test-worker-health-3';
      const ticketId = 'test-ticket-health-3';

      // Register worker with old start time
      const oldStartTime = Date.now() - (11 * 60 * 1000); // 11 minutes ago
      healthMonitor.register(workerId, ticketId, oldStartTime);

      const unhealthy = healthMonitor.getUnhealthyWorkers();
      expect(unhealthy).toHaveLength(1);
      expect(unhealthy[0].workerId).toBe(workerId);
    });

    it('should detect workers with excessive chunks', () => {
      const workerId = 'test-worker-health-4';
      const ticketId = 'test-ticket-health-4';

      healthMonitor.register(workerId, ticketId);

      // Simulate 250 chunks (exceeds limit)
      for (let i = 0; i < 250; i++) {
        healthMonitor.incrementChunkCount(workerId);
      }

      const unhealthy = healthMonitor.getUnhealthyWorkers();
      expect(unhealthy).toHaveLength(1);
      expect(unhealthy[0].chunkCount).toBeGreaterThanOrEqual(250);
    });

    it('should unregister worker on query completion', () => {
      const workerId = 'test-worker-health-5';
      const ticketId = 'test-ticket-health-5';

      healthMonitor.register(workerId, ticketId);
      expect(healthMonitor.getAllWorkers()).toHaveLength(1);

      healthMonitor.unregister(workerId);
      expect(healthMonitor.getAllWorkers()).toHaveLength(0);
    });
  });

  describe('Emergency Monitor', () => {
    it('should start monitoring interval', () => {
      const started = emergencyMonitor.start();
      expect(started).toBe(true);
      expect(emergencyMonitor.isRunning()).toBe(true);
    });

    it('should stop monitoring interval', () => {
      emergencyMonitor.start();
      const stopped = emergencyMonitor.stop();
      expect(stopped).toBe(true);
      expect(emergencyMonitor.isRunning()).toBe(false);
    });

    it('should auto-kill stuck workers', async () => {
      // Register a stuck worker (running > 10 minutes)
      const workerId = 'test-worker-emergency-1';
      const ticketId = 'test-ticket-emergency-1';
      const oldStartTime = Date.now() - (11 * 60 * 1000);

      healthMonitor.register(workerId, ticketId, oldStartTime);

      // Mock kill function
      const killCalls = [];
      emergencyMonitor.onKill((wId, reason) => {
        killCalls.push({ workerId: wId, reason });
      });

      // Start emergency monitor
      emergencyMonitor.start();

      // Wait for one check cycle (15s + buffer)
      await new Promise(resolve => setTimeout(resolve, 16000));

      // Verify worker was killed
      expect(killCalls).toHaveLength(1);
      expect(killCalls[0].workerId).toBe(workerId);
      expect(killCalls[0].reason).toContain('EXCEEDED_RUNTIME');

      emergencyMonitor.stop();
    }, 20000);

    it('should not kill healthy workers', async () => {
      // Register a healthy worker
      const workerId = 'test-worker-emergency-2';
      const ticketId = 'test-ticket-emergency-2';

      healthMonitor.register(workerId, ticketId);

      // Mock kill function
      const killCalls = [];
      emergencyMonitor.onKill((wId, reason) => {
        killCalls.push({ workerId: wId, reason });
      });

      // Start emergency monitor
      emergencyMonitor.start();

      // Wait for one check cycle
      await new Promise(resolve => setTimeout(resolve, 16000));

      // Verify NO workers were killed
      expect(killCalls).toHaveLength(0);

      emergencyMonitor.stop();
    }, 20000);
  });

  describe('Agent Worker Integration', () => {
    it('should use protection wrapper in processURL', async () => {
      // This test verifies that agent-worker.js calls executeProtectedQuery
      // We'll test this by checking the protection is applied

      const worker = new AgentWorker({
        workerId: 'test-worker-integration-1',
        ticketId: 'test-ticket-integration-1',
        agentId: 'test-agent',
        workQueueRepo: {
          getTicket: vi.fn().mockResolvedValue({
            id: 'test-ticket-integration-1',
            agent_id: 'test-agent',
            post_id: 'test-post-1',
            content: 'simple query'
          })
        }
      });

      // The worker should have protection integrated
      // This will be verified after implementation
      expect(worker).toBeDefined();
    });
  });
});
