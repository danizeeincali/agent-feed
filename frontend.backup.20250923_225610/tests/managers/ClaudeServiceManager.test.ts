/**
 * ClaudeServiceManager Test Suite - London School TDD Implementation
 * 
 * Comprehensive test suite for ClaudeServiceManager using London School TDD methodology.
 * Tests focus on behavior verification through mocking and interaction testing.
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { ClaudeServiceManager, ClaudeServiceConfig, ClaudeServiceInstance, createProductionClaudeServiceManager } from '../../src/services/ClaudeServiceManager';

// Mock fetch globally
global.fetch = vi.fn();

describe('ClaudeServiceManager - London School TDD', () => {
  let serviceManager: ClaudeServiceManager;
  let mockFetch: Mock;
  const testConfig: ClaudeServiceConfig = {
    apiUrl: 'http://localhost:3333',
    productionDirectory: '/workspaces/agent-feed/prod',
    maxInstances: 10,
    healthCheckInterval: 1000 // Short interval for testing
  };

  beforeEach(() => {
    // Reset singleton
    (ClaudeServiceManager as any).instance = null;
    mockFetch = vi.mocked(fetch);
    serviceManager = ClaudeServiceManager.getInstance(testConfig);
  });

  afterEach(() => {
    serviceManager.cleanup();
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = ClaudeServiceManager.getInstance(testConfig);
      const instance2 = ClaudeServiceManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should throw error when no config provided for first call', () => {
      (ClaudeServiceManager as any).instance = null;
      
      expect(() => ClaudeServiceManager.getInstance()).toThrow(
        'ClaudeServiceManager requires initial configuration'
      );
    });
  });

  describe('Instance Creation - Production Directory Integration', () => {
    it('should create worker instance in /prod directory by default', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        instanceId: 'claude-worker-123',
        instance: { id: 'claude-worker-123', type: 'worker' }
      };
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      } as Response);

      // Act
      const instance = await serviceManager.createInstance({
        name: 'Test Worker',
        type: 'worker',
        isAlwaysOn: true
      });

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v1/claude/instances',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('/workspaces/agent-feed/prod')
        })
      );

      expect(instance.workingDirectory).toBe('/workspaces/agent-feed/prod');
      expect(instance.type).toBe('worker');
      expect(instance.isAlwaysOn).toBe(true);
    });

    it('should allow custom working directory override', async () => {
      // Arrange
      const customDirectory = '/custom/path';
      const mockResponse = {
        success: true,
        instanceId: 'claude-custom-123'
      };
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      } as Response);

      // Act
      const instance = await serviceManager.createInstance({
        type: 'interactive',
        workingDirectory: customDirectory
      });

      // Assert
      expect(instance.workingDirectory).toBe(customDirectory);
    });

    it('should build correct Claude command with skip permissions', async () => {
      // Arrange
      const mockResponse = { success: true, instanceId: 'claude-skip-123' };
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      } as Response);

      // Act
      await serviceManager.createInstance({
        type: 'worker',
        skipPermissions: true,
        resumeSession: true
      });

      // Assert
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.command).toEqual(['claude', '--dangerously-skip-permissions', '--resume']);
    });

    it('should handle instance creation failure', async () => {
      // Arrange
      const mockResponse = { success: false, error: 'Server error' };
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      } as Response);

      // Act & Assert
      await expect(serviceManager.createInstance({
        type: 'worker'
      })).rejects.toThrow('Failed to create instance');
    });
  });

  describe('Always-On Worker Instance Management', () => {
    it('should ensure worker instance is available', async () => {
      // Arrange - No existing worker
      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, instances: [] })
        } as Response)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ 
            success: true, 
            instanceId: 'claude-worker-new' 
          })
        } as Response);

      // Act
      const workerInstance = await serviceManager.ensureWorkerInstance();

      // Assert
      expect(workerInstance.type).toBe('worker');
      expect(workerInstance.isAlwaysOn).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2); // GET then POST
    });

    it('should return existing worker instance if available', async () => {
      // Arrange - Existing worker
      const existingWorker = {
        id: 'claude-worker-existing',
        type: 'worker',
        status: 'running',
        isAlwaysOn: true
      };
      
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ 
          success: true, 
          instances: [existingWorker] 
        })
      } as Response);

      // Act
      const workerInstance = await serviceManager.ensureWorkerInstance();

      // Assert
      expect(workerInstance.id).toBe('claude-worker-existing');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only GET, no POST
    });
  });

  describe('Instance Retrieval and Filtering', () => {
    it('should fetch and filter instances by type', async () => {
      // Arrange
      const mockInstances = [
        { id: 'worker-1', type: 'worker', status: 'running' },
        { id: 'interactive-1', type: 'interactive', status: 'running' },
        { id: 'feed-1', type: 'feed', status: 'running' }
      ];
      
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, instances: mockInstances })
      } as Response);

      // Act
      const workerInstances = await serviceManager.getInstances({ type: 'worker' });

      // Assert
      expect(workerInstances).toHaveLength(1);
      expect(workerInstances[0].type).toBe('worker');
    });

    it('should filter instances by always-on status', async () => {
      // Arrange
      const mockInstances = [
        { id: 'worker-1', type: 'worker', isAlwaysOn: true },
        { id: 'interactive-1', type: 'interactive', isAlwaysOn: false }
      ];
      
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, instances: mockInstances })
      } as Response);

      // Act
      const alwaysOnInstances = await serviceManager.getInstances({ isAlwaysOn: true });

      // Assert
      expect(alwaysOnInstances).toHaveLength(1);
      expect(alwaysOnInstances[0].isAlwaysOn).toBe(true);
    });
  });

  describe('Instance Termination', () => {
    it('should terminate instance and update local state', async () => {
      // Arrange
      const instanceId = 'claude-test-123';
      serviceManager['instances'].set(instanceId, {
        id: instanceId,
        type: 'interactive'
      } as ClaudeServiceInstance);

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true })
      } as Response);

      // Act
      await serviceManager.terminateInstance(instanceId);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3333/api/v1/claude/instances/${instanceId}`,
        { method: 'DELETE' }
      );
      expect(serviceManager['instances'].has(instanceId)).toBe(false);
    });

    it('should handle termination failure', async () => {
      // Arrange
      const instanceId = 'claude-test-123';
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Instance not found' })
      } as Response);

      // Act & Assert
      await expect(serviceManager.terminateInstance(instanceId)).rejects.toThrow('Failed to terminate instance');
    });
  });

  describe('Metrics and Health Monitoring', () => {
    it('should calculate metrics correctly', () => {
      // Arrange
      const instances = [
        { id: '1', type: 'worker', status: 'running', memoryUsage: 100, cpuUsage: 20, restartCount: 1 },
        { id: '2', type: 'feed', status: 'running', memoryUsage: 150, cpuUsage: 30, restartCount: 0 },
        { id: '3', type: 'interactive', status: 'stopped', memoryUsage: 0, cpuUsage: 0, restartCount: 2 }
      ] as ClaudeServiceInstance[];

      instances.forEach(instance => {
        serviceManager['instances'].set(instance.id, instance);
      });

      // Act
      const metrics = serviceManager.getMetrics();

      // Assert
      expect(metrics.totalInstances).toBe(3);
      expect(metrics.runningInstances).toBe(2);
      expect(metrics.workerInstances).toBe(1);
      expect(metrics.feedInstances).toBe(1);
      expect(metrics.memoryUsage).toBe(250);
      expect(metrics.systemLoad).toBe(25); // Average CPU usage
      expect(metrics.restartEvents).toBe(3);
    });

    it('should perform health check and update instances', async () => {
      // Arrange
      const healthResponse = {
        success: true,
        instances: [
          { id: 'health-1', status: 'running', type: 'worker' }
        ]
      };
      
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(healthResponse)
      } as Response);

      // Act
      await serviceManager['performHealthCheck']();

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3333/api/v1/claude/health');
      expect(serviceManager['instances'].has('health-1')).toBe(true);
    });
  });

  describe('Event System', () => {
    it('should register and trigger event listeners', () => {
      // Arrange
      const mockListener = vi.fn();
      const testData = { instanceId: 'test-123' };

      // Act
      serviceManager.on('test:event', mockListener);
      serviceManager['emit']('test:event', testData);

      // Assert
      expect(mockListener).toHaveBeenCalledWith(testData);
    });

    it('should remove event listeners', () => {
      // Arrange
      const mockListener = vi.fn();

      // Act
      serviceManager.on('test:event', mockListener);
      serviceManager.off('test:event', mockListener);
      serviceManager['emit']('test:event', {});

      // Assert
      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('Production Factory Function', () => {
    it('should create service manager with production defaults', () => {
      // Act
      const prodManager = createProductionClaudeServiceManager('http://prod:3333');

      // Assert
      expect(prodManager).toBeInstanceOf(ClaudeServiceManager);
      expect(prodManager['config'].apiUrl).toBe('http://prod:3333');
      expect(prodManager['config'].productionDirectory).toBe('/workspaces/agent-feed/prod');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Act & Assert
      await expect(serviceManager.getInstances()).rejects.toThrow('Failed to fetch instances');
    });

    it('should handle API errors with proper error codes', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Invalid request' })
      } as Response);

      // Act & Assert
      await expect(serviceManager.createInstance({
        type: 'worker'
      })).rejects.toThrow('Failed to create instance');
    });
  });
});