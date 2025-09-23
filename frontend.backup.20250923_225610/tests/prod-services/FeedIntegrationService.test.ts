/**
 * FeedIntegrationService Test Suite - Production Feed System Validation
 * 
 * Comprehensive test suite for FeedIntegrationService using London School TDD
 * methodology with focus on always-on worker management and feed processing.
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { FeedIntegrationService, FeedWorkerConfig, createProductionFeedIntegration } from '../../src/services/FeedIntegrationService';
import { ClaudeServiceManager } from '../../src/services/ClaudeServiceManager';

// Mock ClaudeServiceManager
vi.mock('../../src/services/ClaudeServiceManager');

// Mock fetch
global.fetch = vi.fn();

describe('FeedIntegrationService - Production Feed System', () => {
  let feedService: FeedIntegrationService;
  let mockServiceManager: Mock;
  let mockFetch: Mock;
  
  const testConfig: FeedWorkerConfig = {
    workingDirectory: '/workspaces/agent-feed/prod',
    maxConcurrentFeeds: 3,
    feedProcessingTimeout: 60000,
    healthCheckInterval: 5000,
    autoRestartOnFailure: true,
    restartThreshold: 2
  };

  beforeEach(() => {
    // Reset singleton
    (FeedIntegrationService as any).instance = null;
    
    mockFetch = vi.mocked(fetch);
    mockServiceManager = vi.mocked(ClaudeServiceManager.getInstance());
    
    // Setup service manager mocks
    mockServiceManager.ensureWorkerInstance = vi.fn();
    mockServiceManager.getInstance = vi.fn();
    mockServiceManager.terminateInstance = vi.fn();
    mockServiceManager.createInstance = vi.fn();
    mockServiceManager.on = vi.fn();
    
    feedService = FeedIntegrationService.getInstance(testConfig, 'http://localhost:3333');
  });

  afterEach(() => {
    feedService.cleanup();
    vi.clearAllMocks();
  });

  describe('Initialization and Worker Setup', () => {
    it('should initialize feed integration with worker instance', async () => {
      // Arrange
      const mockWorkerInstance = {
        id: 'claude-worker-123',
        type: 'worker',
        status: 'running',
        workingDirectory: '/workspaces/agent-feed/prod',
        isAlwaysOn: true
      };
      
      mockServiceManager.ensureWorkerInstance.mockResolvedValueOnce(mockWorkerInstance);

      // Act
      await feedService.initialize();

      // Assert
      expect(mockServiceManager.ensureWorkerInstance).toHaveBeenCalled();
      
      const workerStatus = await feedService.getWorkerStatus();
      expect(workerStatus?.instanceId).toBe('claude-worker-123');
      expect(workerStatus?.status).toBe('ready');
    });

    it('should validate worker instance configuration', async () => {
      // Arrange
      const invalidWorkerInstance = {
        id: 'claude-worker-invalid',
        type: 'worker',
        status: 'running',
        workingDirectory: '/wrong/directory',
        isAlwaysOn: true
      };
      
      mockServiceManager.ensureWorkerInstance.mockResolvedValueOnce(invalidWorkerInstance);

      // Act & Assert
      await expect(feedService.initialize()).rejects.toThrow(
        'Worker not in correct directory'
      );
    });

    it('should handle initialization failures gracefully', async () => {
      // Arrange
      mockServiceManager.ensureWorkerInstance.mockRejectedValueOnce(new Error('Service unavailable'));

      // Act & Assert
      await expect(feedService.initialize()).rejects.toThrow(
        'Feed integration initialization failed'
      );
    });
  });

  describe('Feed Processing Operations', () => {
    beforeEach(async () => {
      // Setup initialized feed service
      const mockWorkerInstance = {
        id: 'claude-worker-feed',
        type: 'worker',
        status: 'running',
        workingDirectory: '/workspaces/agent-feed/prod',
        isAlwaysOn: true
      };
      
      mockServiceManager.ensureWorkerInstance.mockResolvedValueOnce(mockWorkerInstance);
      mockServiceManager.getInstance.mockResolvedValue(mockWorkerInstance);
      
      await feedService.initialize();
    });

    it('should process feed successfully', async () => {
      // Arrange
      const feedData = {
        id: 'feed-123',
        content: 'Test feed content',
        priority: 'normal' as const
      };
      
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          data: { result: 'Feed processed successfully' }
        })
      } as Response);

      // Act
      const result = await feedService.processFeed(feedData);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v1/claude/instances/claude-worker-feed/process-feed',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('feed-123')
        })
      );

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ result: 'Feed processed successfully' });
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle feed processing failures', async () => {
      // Arrange
      const feedData = {
        id: 'feed-error',
        content: 'Test feed content',
        priority: 'high' as const
      };
      
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: false,
          error: 'Processing failed'
        })
      } as Response);

      // Act
      const result = await feedService.processFeed(feedData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Processing failed');
      
      // Should update error metrics
      const metrics = feedService.getFeedMetrics();
      expect(metrics.failedFeeds).toBe(1);
      expect(metrics.errorRate).toBeGreaterThan(0);
    });

    it('should reject feed when worker at capacity', async () => {
      // Arrange
      feedService['config'].maxConcurrentFeeds = 0; // Set capacity to 0
      
      const feedData = {
        id: 'feed-capacity',
        content: 'Test feed content',
        priority: 'low' as const
      };

      // Act
      const result = await feedService.processFeed(feedData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Worker instance at capacity');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should update metrics correctly after processing', async () => {
      // Arrange
      const feedData = { id: 'feed-metrics', content: 'Test', priority: 'normal' as const };
      
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: {} })
      } as Response);

      // Act
      await feedService.processFeed(feedData);

      // Assert
      const metrics = feedService.getFeedMetrics();
      expect(metrics.totalFeedsProcessed).toBe(1);
      expect(metrics.successfulFeeds).toBe(1);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics.lastProcessedFeed).toBeInstanceOf(Date);
    });
  });

  describe('Worker Health Management', () => {
    it('should ensure worker health and recreate if needed', async () => {
      // Arrange
      const unhealthyWorker = {
        id: 'claude-worker-unhealthy',
        status: 'error',
        workingDirectory: '/workspaces/agent-feed/prod'
      };
      
      const healthyWorker = {
        id: 'claude-worker-healthy',
        status: 'running',
        workingDirectory: '/workspaces/agent-feed/prod'
      };

      mockServiceManager.ensureWorkerInstance
        .mockResolvedValueOnce(unhealthyWorker)
        .mockResolvedValueOnce(healthyWorker);
      
      mockServiceManager.getInstance
        .mockResolvedValueOnce(unhealthyWorker)
        .mockResolvedValueOnce(healthyWorker);

      await feedService.initialize();

      // Act
      const isHealthy = await feedService.ensureWorkerHealth();

      // Assert
      expect(isHealthy).toBe(true);
      expect(mockServiceManager.ensureWorkerInstance).toHaveBeenCalledTimes(2);
    });

    it('should reset worker instance on critical failure', async () => {
      // Arrange
      const originalWorker = {
        id: 'claude-worker-original',
        status: 'running',
        workingDirectory: '/workspaces/agent-feed/prod'
      };
      
      const newWorker = {
        id: 'claude-worker-reset',
        status: 'running',
        workingDirectory: '/workspaces/agent-feed/prod'
      };

      mockServiceManager.ensureWorkerInstance.mockResolvedValueOnce(originalWorker);
      mockServiceManager.terminateInstance.mockResolvedValueOnce(undefined);
      mockServiceManager.createInstance.mockResolvedValueOnce(newWorker);

      await feedService.initialize();

      // Act
      await feedService.resetWorker();

      // Assert
      expect(mockServiceManager.terminateInstance).toHaveBeenCalledWith('claude-worker-original');
      expect(mockServiceManager.createInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Feed Worker Instance (Reset)',
          type: 'worker',
          isAlwaysOn: true
        })
      );
    });
  });

  describe('Event System and Monitoring', () => {
    it('should emit events for successful feed processing', async () => {
      // Arrange
      const mockWorkerInstance = {
        id: 'claude-worker-events',
        status: 'running',
        workingDirectory: '/workspaces/agent-feed/prod'
      };
      
      mockServiceManager.ensureWorkerInstance.mockResolvedValueOnce(mockWorkerInstance);
      mockServiceManager.getInstance.mockResolvedValue(mockWorkerInstance);
      
      await feedService.initialize();

      const mockListener = vi.fn();
      feedService.on('feed:processed', mockListener);
      
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { result: 'success' } })
      } as Response);

      // Act
      await feedService.processFeed({
        id: 'feed-event-test',
        content: 'Test content',
        priority: 'normal'
      });

      // Assert
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          feedId: 'feed-event-test',
          result: { result: 'success' }
        })
      );
    });

    it('should handle worker instance loss and recovery', async () => {
      // Arrange
      const originalWorker = {
        id: 'claude-worker-original',
        status: 'running',
        workingDirectory: '/workspaces/agent-feed/prod'
      };
      
      const recoveredWorker = {
        id: 'claude-worker-recovered',
        status: 'running',
        workingDirectory: '/workspaces/agent-feed/prod'
      };

      mockServiceManager.ensureWorkerInstance
        .mockResolvedValueOnce(originalWorker)
        .mockResolvedValueOnce(recoveredWorker);

      await feedService.initialize();

      const mockRecoveryListener = vi.fn();
      feedService.on('feed:worker:recovered', mockRecoveryListener);

      // Simulate worker loss through service manager event
      const terminationHandler = mockServiceManager.on.mock.calls
        .find(call => call[0] === 'instance:terminated')?.[1];

      // Act
      if (terminationHandler) {
        terminationHandler({ instanceId: 'claude-worker-original' });
      }

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert
      expect(mockRecoveryListener).toHaveBeenCalledWith({
        newInstanceId: 'claude-worker-recovered'
      });
    });
  });

  describe('Production Factory Function', () => {
    it('should create feed integration with production defaults', () => {
      // Act
      const prodFeedService = createProductionFeedIntegration('http://prod:3333');

      // Assert
      expect(prodFeedService).toBeInstanceOf(FeedIntegrationService);
      expect(prodFeedService['config'].workingDirectory).toBe('/workspaces/agent-feed/prod');
      expect(prodFeedService['config'].maxConcurrentFeeds).toBe(5);
      expect(prodFeedService['config'].autoRestartOnFailure).toBe(true);
    });
  });

  describe('Metrics and Performance Tracking', () => {
    it('should track processing metrics accurately', async () => {
      // Arrange
      const mockWorkerInstance = {
        id: 'claude-worker-metrics',
        status: 'running',
        workingDirectory: '/workspaces/agent-feed/prod'
      };
      
      mockServiceManager.ensureWorkerInstance.mockResolvedValueOnce(mockWorkerInstance);
      mockServiceManager.getInstance.mockResolvedValue(mockWorkerInstance);
      
      await feedService.initialize();

      // Process successful feed
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: {} })
      } as Response);
      
      await feedService.processFeed({
        id: 'feed-success',
        content: 'Test',
        priority: 'normal'
      });

      // Process failed feed
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Test error' })
      } as Response);
      
      await feedService.processFeed({
        id: 'feed-failure',
        content: 'Test',
        priority: 'normal'
      });

      // Assert
      const metrics = feedService.getFeedMetrics();
      expect(metrics.totalFeedsProcessed).toBe(2);
      expect(metrics.successfulFeeds).toBe(1);
      expect(metrics.failedFeeds).toBe(1);
      expect(metrics.errorRate).toBe(0.5);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
    });

    it('should provide worker status with current metrics', async () => {
      // Arrange
      const mockWorkerInstance = {
        id: 'claude-worker-status',
        status: 'running',
        workingDirectory: '/workspaces/agent-feed/prod',
        cpuUsage: 25.5,
        restartCount: 2
      };
      
      mockServiceManager.ensureWorkerInstance.mockResolvedValueOnce(mockWorkerInstance);
      mockServiceManager.getInstance.mockResolvedValue(mockWorkerInstance);
      
      await feedService.initialize();

      // Act
      const status = await feedService.getWorkerStatus();

      // Assert
      expect(status).toEqual(
        expect.objectContaining({
          instanceId: 'claude-worker-status',
          status: 'ready',
          currentFeeds: 0,
          maxFeeds: 3,
          errorCount: 2
        })
      );
      expect(status?.metrics).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors during feed processing', async () => {
      // Arrange
      const mockWorkerInstance = {
        id: 'claude-worker-network-error',
        status: 'running',
        workingDirectory: '/workspaces/agent-feed/prod'
      };
      
      mockServiceManager.ensureWorkerInstance.mockResolvedValueOnce(mockWorkerInstance);
      mockServiceManager.getInstance.mockResolvedValue(mockWorkerInstance);
      
      await feedService.initialize();

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Act
      const result = await feedService.processFeed({
        id: 'feed-network-error',
        content: 'Test',
        priority: 'high'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      
      const metrics = feedService.getFeedMetrics();
      expect(metrics.failedFeeds).toBe(1);
    });

    it('should handle worker instance unavailability', async () => {
      // Arrange - Don't initialize (no worker instance)
      
      // Act
      const result = await feedService.processFeed({
        id: 'feed-no-worker',
        content: 'Test',
        priority: 'normal'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Worker instance not available');
    });
  });

  describe('Always-On Worker Management', () => {
    it('should maintain worker instance across service restarts', async () => {
      // Arrange
      const persistentWorker = {
        id: 'claude-worker-persistent',
        status: 'running',
        workingDirectory: '/workspaces/agent-feed/prod',
        isAlwaysOn: true
      };
      
      mockServiceManager.ensureWorkerInstance.mockResolvedValue(persistentWorker);
      mockServiceManager.getInstance.mockResolvedValue(persistentWorker);

      await feedService.initialize();

      // Act - Simulate health check ensuring worker exists
      const isHealthy = await feedService.ensureWorkerHealth();

      // Assert
      expect(isHealthy).toBe(true);
      expect(mockServiceManager.ensureWorkerInstance).toHaveBeenCalled();
      
      const status = await feedService.getWorkerStatus();
      expect(status?.instanceId).toBe('claude-worker-persistent');
    });

    it('should restart unhealthy worker automatically', async () => {
      // Arrange
      const unhealthyWorker = {
        id: 'claude-worker-unhealthy',
        status: 'error',
        workingDirectory: '/workspaces/agent-feed/prod'
      };
      
      const restartedWorker = {
        id: 'claude-worker-restarted',
        status: 'running',
        workingDirectory: '/workspaces/agent-feed/prod'
      };

      mockServiceManager.ensureWorkerInstance.mockResolvedValueOnce(unhealthyWorker);
      mockServiceManager.getInstance
        .mockResolvedValueOnce(unhealthyWorker)
        .mockResolvedValueOnce(restartedWorker);
      mockServiceManager.ensureWorkerInstance.mockResolvedValueOnce(restartedWorker);

      await feedService.initialize();

      // Act
      const isHealthy = await feedService.ensureWorkerHealth();

      // Assert
      expect(isHealthy).toBe(true);
      expect(mockServiceManager.ensureWorkerInstance).toHaveBeenCalledTimes(2);
    });
  });
});