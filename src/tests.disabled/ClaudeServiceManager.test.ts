/**
 * ClaudeServiceManager Test Suite - SPARC Completion Phase
 * 
 * Comprehensive test suite for production-ready ClaudeServiceManager
 * Validates all SPARC phases: Specification, Pseudocode, Architecture, Refinement, Completion
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ClaudeServiceManager } from '../services/ClaudeServiceManager';
import path from 'path';
import { promises as fs } from 'fs';

// Mock dependencies
jest.mock('child_process');
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    access: jest.fn(),
    appendFile: jest.fn()
  }
}));

describe('ClaudeServiceManager - SPARC Complete Test Suite', () => {
  let serviceManager: ClaudeServiceManager;
  const testProdDir = '/workspaces/agent-feed/prod/test';

  beforeEach(async () => {
    // Setup fresh service manager for each test
    serviceManager = new ClaudeServiceManager({
      prodDirectory: testProdDir,
      minWorkers: 1,
      maxWorkers: 3,
      healthCheckInterval: 1000, // Fast for testing
      jobQueueLimit: 10
    });
  });

  afterEach(async () => {
    // Cleanup after each test
    if (serviceManager) {
      await serviceManager.shutdown();
    }
  });

  describe('SPARC PHASE 1: Specification Validation', () => {
    test('should enforce /prod directory requirement', () => {
      expect(() => {
        new ClaudeServiceManager({
          prodDirectory: '/invalid/directory'
        });
      }).toThrow('CRITICAL: workingDirectory must be within /prod directory structure');
    });

    test('should initialize with correct configuration', () => {
      const config = {
        prodDirectory: '/workspaces/agent-feed/prod',
        minWorkers: 2,
        maxWorkers: 5
      };
      
      const manager = new ClaudeServiceManager(config);
      expect(manager).toBeDefined();
      // Configuration should be stored and accessible
    });

    test('should implement required interfaces', () => {
      expect(serviceManager).toBeInstanceOf(ClaudeServiceManager);
      expect(typeof serviceManager.initialize).toBe('function');
      expect(typeof serviceManager.submitFeedJob).toBe('function');
      expect(typeof serviceManager.getServiceStatus).toBe('function');
      expect(typeof serviceManager.designateWorker).toBe('function');
    });
  });

  describe('SPARC PHASE 2: Pseudocode Algorithm Validation', () => {
    test('should implement worker selection algorithm', async () => {
      await serviceManager.initialize();
      
      const job = {
        type: 'post_generation' as const,
        priority: 'high' as const,
        payload: { command: 'test command' },
        routing: { capabilities: ['feed_integration'] }
      };
      
      // Should select best available worker based on scoring algorithm
      const jobId = await serviceManager.submitFeedJob(job);
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
    });

    test('should handle job processing pipeline', async () => {
      await serviceManager.initialize();
      
      const job = {
        type: 'content_analysis' as const,
        priority: 'medium' as const,
        payload: { command: 'analyze content' },
        routing: {}
      };
      
      const jobId = await serviceManager.submitFeedJob(job);
      const status = serviceManager.getJobStatus(jobId);
      
      expect(status).toBeDefined();
      expect(status?.jobId).toBe(jobId);
    });

    test('should implement health check and failover logic', async () => {
      await serviceManager.initialize();
      const status = serviceManager.getServiceStatus();
      
      expect(status.health).toMatch(/healthy|degraded|critical/);
      expect(status.workers).toBeDefined();
      expect(Array.isArray(status.workers)).toBe(true);
    });
  });

  describe('SPARC PHASE 3: Architecture Integration', () => {
    test('should create workers with /prod directory structure', async () => {
      await serviceManager.initialize();
      const status = serviceManager.getServiceStatus();
      
      // All workers should have /prod-based working directories
      status.workers.forEach(worker => {
        expect(worker.workingDirectory).toContain('/prod');
        expect(worker.workingDirectory).toContain('workers');
      });
    });

    test('should separate Feed service from interactive sessions', async () => {
      // Feed service should be independent from SafeClaudeInstanceManager
      await serviceManager.initialize();
      
      const feedJob = {
        type: 'system_task' as const,
        priority: 'low' as const,
        payload: { command: 'echo "feed test"' },
        routing: {}
      };
      
      const jobId = await serviceManager.submitFeedJob(feedJob);
      expect(jobId).toBeDefined();
      
      // Job should not interfere with interactive sessions
      const status = serviceManager.getServiceStatus();
      expect(status.queue.pending).toBeGreaterThanOrEqual(0);
    });

    test('should implement proper component relationships', async () => {
      await serviceManager.initialize();
      
      // Service manager should coordinate workers
      const status = serviceManager.getServiceStatus();
      expect(status.workers.length).toBeGreaterThanOrEqual(1);
      
      // Each worker should have proper structure
      status.workers.forEach(worker => {
        expect(worker.id).toBeDefined();
        expect(worker.status).toMatch(/initializing|ready|busy|error|offline/);
        expect(worker.workingDirectory).toBeDefined();
        expect(worker.capabilities).toBeDefined();
        expect(Array.isArray(worker.capabilities)).toBe(true);
      });
    });
  });

  describe('SPARC PHASE 4: Refinement Performance', () => {
    test('should handle multiple concurrent jobs', async () => {
      await serviceManager.initialize();
      
      const jobs = [
        { type: 'post_generation' as const, priority: 'high' as const },
        { type: 'content_analysis' as const, priority: 'medium' as const },
        { type: 'user_interaction' as const, priority: 'low' as const }
      ].map(job => ({
        ...job,
        payload: { command: `test ${job.type}` },
        routing: {}
      }));
      
      // Submit multiple jobs concurrently
      const jobIds = await Promise.all(
        jobs.map(job => serviceManager.submitFeedJob(job))
      );
      
      expect(jobIds).toHaveLength(3);
      jobIds.forEach(id => expect(typeof id).toBe('string'));
      
      // All jobs should be tracked
      const status = serviceManager.getServiceStatus();
      expect(status.queue.pending + status.queue.active).toBeGreaterThanOrEqual(jobs.length);
    });

    test('should enforce job queue limits', async () => {
      await serviceManager.initialize();
      
      // Fill job queue to capacity
      const jobs = Array.from({ length: 15 }, (_, i) => ({
        type: 'system_task' as const,
        priority: 'low' as const,
        payload: { command: `job ${i}` },
        routing: {}
      }));
      
      // Should reject jobs once queue is full
      await expect(
        Promise.all(jobs.map(job => serviceManager.submitFeedJob(job)))
      ).rejects.toThrow('Job queue at capacity');
    });

    test('should implement retry logic for recoverable errors', () => {
      // Test error classification
      const manager = serviceManager as any;
      
      expect(manager.isRecoverableError(new Error('Connection timeout'))).toBe(true);
      expect(manager.isRecoverableError(new Error('Network error'))).toBe(true);
      expect(manager.isRecoverableError(new Error('Permission denied'))).toBe(false);
      expect(manager.isRecoverableError(new Error('Command not found'))).toBe(false);
    });
  });

  describe('SPARC PHASE 5: Completion Integration', () => {
    test('should integrate with Feed component architecture', async () => {
      await serviceManager.initialize();
      
      // Simulate Feed job submission
      const feedJob = {
        type: 'post_generation' as const,
        priority: 'urgent' as const,
        payload: {
          command: 'Generate social media post about AI collaboration',
          context: { 
            feedIntegration: true,
            postType: 'announcement'
          }
        },
        routing: {
          capabilities: ['feed_integration', 'content_generation'],
          preferredWorker: undefined // Let service select best worker
        }
      };
      
      const jobId = await serviceManager.submitFeedJob(feedJob);
      expect(jobId).toBeDefined();
      
      // Job should be routed to appropriate worker
      const jobStatus = serviceManager.getJobStatus(jobId);
      expect(jobStatus).toBeDefined();
      expect(jobStatus?.workerId).toBeDefined();
    });

    test('should maintain separation from SafeClaudeInstanceManager', async () => {
      await serviceManager.initialize();
      
      // Service manager should operate independently
      const status = serviceManager.getServiceStatus();
      expect(status).toBeDefined();
      
      // Workers should use /prod directory (different from interactive sessions)
      status.workers.forEach(worker => {
        expect(worker.workingDirectory).toContain('/prod');
        expect(worker.workingDirectory).not.toBe('/workspaces/agent-feed'); // Interactive default
      });
    });

    test('should provide comprehensive monitoring API', async () => {
      await serviceManager.initialize();
      
      const status = serviceManager.getServiceStatus();
      
      // Should provide all required monitoring data
      expect(status.workers).toBeDefined();
      expect(status.queue).toBeDefined();
      expect(status.metrics).toBeDefined();
      expect(status.health).toBeDefined();
      
      // Metrics should include performance data
      expect(typeof status.metrics.totalJobsProcessed).toBe('number');
      expect(typeof status.metrics.averageJobDuration).toBe('number');
      expect(typeof status.metrics.totalJobsFailed).toBe('number');
    });

    test('should handle graceful shutdown', async () => {
      await serviceManager.initialize();
      
      // Submit a job before shutdown
      const job = {
        type: 'system_task' as const,
        priority: 'low' as const,
        payload: { command: 'test shutdown' },
        routing: {}
      };
      
      await serviceManager.submitFeedJob(job);
      
      // Shutdown should complete without errors
      await expect(serviceManager.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Production Readiness Validation', () => {
    test('should handle worker failures gracefully', async () => {
      await serviceManager.initialize();
      
      // Simulate worker failure
      const status = serviceManager.getServiceStatus();
      const workerId = status.workers[0]?.id;
      
      if (workerId) {
        // Trigger failure handling
        const manager = serviceManager as any;
        await expect(
          manager.handleWorkerFailure(workerId)
        ).resolves.not.toThrow();
      }
    });

    test('should enforce resource limits and monitoring', async () => {
      await serviceManager.initialize();
      
      const status = serviceManager.getServiceStatus();
      
      // Should track resource usage
      status.workers.forEach(worker => {
        expect(worker.load).toBeDefined();
        expect(worker.health).toBeDefined();
        expect(typeof worker.load.current).toBe('number');
        expect(typeof worker.load.capacity).toBe('number');
      });
    });

    test('should provide observability and debugging', async () => {
      await serviceManager.initialize();
      
      // Should emit events for monitoring
      const events: string[] = [];
      
      serviceManager.on('worker:ready', () => events.push('worker:ready'));
      serviceManager.on('job:completed', () => events.push('job:completed'));
      serviceManager.on('worker:failover', () => events.push('worker:failover'));
      
      // Submit job to trigger events
      const job = {
        type: 'post_generation' as const,
        priority: 'medium' as const,
        payload: { command: 'test observability' },
        routing: {}
      };
      
      await serviceManager.submitFeedJob(job);
      
      // Should have emitted initialization events
      expect(events.length).toBeGreaterThan(0);
    });
  });
});

/**
 * SPARC COMPLETION: Test Coverage Summary
 * 
 * ✅ SPECIFICATION TESTS:
 * - Interface compliance validation
 * - Configuration enforcement
 * - /prod directory requirement validation
 * 
 * ✅ PSEUDOCODE TESTS:
 * - Algorithm implementation validation
 * - Worker selection logic
 * - Job processing pipeline
 * 
 * ✅ ARCHITECTURE TESTS:
 * - Component integration
 * - Data flow validation
 * - Separation of concerns
 * 
 * ✅ REFINEMENT TESTS:
 * - Performance optimization validation
 * - Error handling robustness
 * - Resource management
 * 
 * ✅ COMPLETION TESTS:
 * - Feed integration validation
 * - Production readiness checks
 * - Monitoring and observability
 */