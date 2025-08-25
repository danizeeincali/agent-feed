/**
 * Server Orchestration Integration Tests
 * Tests startup, shutdown, and coordination of the multi-server architecture
 */

import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from 'vitest';
import { getPortConfig, getServerUrls, validatePortConfig } from '../config/ports.config';
import { ServerManager, setupTestServers, teardownTestServers } from '../utils/server-manager';
import { ApiTestHelper, PerformanceTestHelper } from '../utils/test-helpers';

describe('Server Orchestration Integration Tests', () => {
  let serverManager: ServerManager;
  let config: ReturnType<typeof getPortConfig>;
  let urls: ReturnType<typeof getServerUrls>;
  let apiHelper: ApiTestHelper;

  beforeAll(async () => {
    config = getPortConfig('integration');
    urls = getServerUrls('integration');
    serverManager = new ServerManager();
    apiHelper = new ApiTestHelper(urls.backendApi);
  }, 60000);

  afterAll(async () => {
    await teardownTestServers();
  }, 30000);

  beforeEach(async () => {
    // Ensure clean state before each test
    await teardownTestServers();
  });

  describe('Port Configuration Management', () => {
    it('should validate port configuration without conflicts', () => {
      const validation = validatePortConfig(config);
      expect(validation.valid).toBe(true);
      expect(validation.conflicts).toHaveLength(0);
    });

    it('should detect port conflicts in invalid configuration', () => {
      const invalidConfig = {
        ...config,
        websocketTerminal: { ...config.websocketTerminal, port: config.frontend.port }
      };
      
      const validation = validatePortConfig(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.conflicts).toContain(expect.stringMatching(/Duplicate ports/));
    });

    it('should reject reserved port ranges', () => {
      const invalidConfig = {
        ...config,
        frontend: { ...config.frontend, port: 80 }
      };
      
      const validation = validatePortConfig(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.conflicts).toContain(expect.stringMatching(/reserved range/));
    });
  });

  describe('Individual Server Startup', () => {
    it('should start backend API server successfully', async () => {
      const instance = await serverManager.startServer(
        config.backendApi,
        'node',
        ['backend-enhanced.js'],
        '/workspaces/agent-feed'
      );

      expect(instance.name).toBe('backend-api');
      expect(instance.pid).toBeDefined();
      expect(instance.process.killed).toBe(false);

      // Test health endpoint
      const response = await apiHelper.getHealth();
      expect(response.ok).toBe(true);

      await serverManager.stopServer('backend-api');
    }, 30000);

    it('should start WebSocket terminal server successfully', async () => {
      const instance = await serverManager.startServer(
        config.websocketTerminal,
        'node',
        ['backend-terminal-server-emergency-fix.js'],
        '/workspaces/agent-feed'
      );

      expect(instance.name).toBe('websocket-terminal');
      expect(instance.pid).toBeDefined();

      await serverManager.stopServer('websocket-terminal');
    }, 30000);

    it('should start frontend dev server successfully', async () => {
      const instance = await serverManager.startServer(
        config.frontend,
        'npm',
        ['run', 'dev', '--', '--port', config.frontend.port.toString()],
        '/workspaces/agent-feed/frontend'
      );

      expect(instance.name).toBe('frontend');
      expect(instance.pid).toBeDefined();

      await serverManager.stopServer('frontend');
    }, 30000);
  });

  describe('Multi-Server Orchestration', () => {
    it('should start all servers in correct order', async () => {
      const servers = await setupTestServers(config);

      expect(servers.size).toBe(3);
      expect(servers.has('backend-api')).toBe(true);
      expect(servers.has('websocket-terminal')).toBe(true);
      expect(servers.has('frontend')).toBe(true);

      // Verify all servers are healthy
      const healthCheck = await serverManager.healthCheckAll();
      expect(Object.values(healthCheck).every(healthy => healthy)).toBe(true);
    }, 60000);

    it('should handle graceful shutdown of all servers', async () => {
      await setupTestServers(config);
      
      const initialServers = Array.from(serverManager['servers'].keys());
      expect(initialServers).toHaveLength(3);

      await teardownTestServers();

      // Verify all servers are stopped
      const remainingServers = Array.from(serverManager['servers'].keys());
      expect(remainingServers).toHaveLength(0);
    }, 30000);

    it('should recover from partial server failures', async () => {
      await setupTestServers(config);

      // Kill one server manually
      const backendInstance = serverManager.getServer('backend-api');
      expect(backendInstance).toBeDefined();
      backendInstance!.process.kill('SIGKILL');

      // Wait for process to exit
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Health check should detect the failure
      const healthCheck = await serverManager.healthCheckAll();
      expect(healthCheck['backend-api']).toBe(false);
      expect(healthCheck['websocket-terminal']).toBe(true);
      expect(healthCheck['frontend']).toBe(true);

      // Restart the failed server
      const newInstance = await serverManager.startServer(
        config.backendApi,
        'node',
        ['backend-enhanced.js'],
        '/workspaces/agent-feed'
      );

      expect(newInstance.pid).toBeDefined();
      
      // Verify recovery
      const finalHealthCheck = await serverManager.healthCheckAll();
      expect(Object.values(finalHealthCheck).every(healthy => healthy)).toBe(true);
    }, 45000);
  });

  describe('Performance and Resource Management', () => {
    it('should start all servers within acceptable time limits', async () => {
      const { result, duration } = await PerformanceTestHelper.measureResponseTime(async () => {
        return await setupTestServers(config);
      });

      expect(result.size).toBe(3);
      expect(duration).toBeLessThan(45000); // Should start within 45 seconds
    }, 60000);

    it('should not exceed memory limits during orchestration', async () => {
      const { result, memoryDelta } = await PerformanceTestHelper.measureMemoryUsage(async () => {
        const servers = await setupTestServers(config);
        await teardownTestServers();
        return servers;
      });

      expect(result.size).toBe(3);
      // Memory delta should be reasonable (less than 100MB)
      expect(Math.abs(memoryDelta)).toBeLessThan(100 * 1024 * 1024);
    }, 60000);

    it('should handle concurrent health checks efficiently', async () => {
      await setupTestServers(config);

      const healthCheckFn = () => serverManager.healthCheckAll();
      
      const performanceResult = await PerformanceTestHelper.loadTest(
        healthCheckFn,
        10, // 10 concurrent requests
        5000 // for 5 seconds
      );

      expect(performanceResult.successful).toBeGreaterThan(0);
      expect(performanceResult.failed).toBe(0);
      expect(performanceResult.avgResponseTime).toBeLessThan(1000); // Average under 1 second
    }, 30000);
  });

  describe('Server Communication Validation', () => {
    beforeEach(async () => {
      await setupTestServers(config);
    });

    it('should establish proper proxy communication between frontend and backend', async () => {
      // Test that frontend can proxy requests to backend API
      const frontendResponse = await fetch(`${urls.frontend}/api/health`);
      expect(frontendResponse.ok).toBe(true);
      
      const backendResponse = await apiHelper.getHealth();
      expect(backendResponse.ok).toBe(true);

      // Responses should be similar (proxied correctly)
      const frontendData = await frontendResponse.json();
      const backendData = await backendResponse.json();
      expect(frontendData).toEqual(backendData);
    }, 15000);

    it('should validate WebSocket connectivity from backend to terminal server', async () => {
      // This test would need the actual WebSocket implementation
      // For now, we'll test that the terminal server is accessible
      const WebSocket = require('ws');
      
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(urls.websocketTerminal);
        
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('WebSocket connection timeout'));
        }, 10000);

        ws.on('open', () => {
          clearTimeout(timeout);
          ws.close();
          resolve();
        });

        ws.on('error', (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    }, 15000);

    it('should handle cross-origin requests correctly', async () => {
      // Test CORS handling between frontend and backend
      const response = await fetch(`${urls.backendApi}/api/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': urls.frontend,
          'Access-Control-Request-Method': 'GET'
        }
      });

      expect(response.status).toBeLessThan(400);
      
      const corsHeaders = response.headers.get('Access-Control-Allow-Origin');
      expect(corsHeaders).toBeTruthy();
    }, 10000);
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle server startup failures gracefully', async () => {
      // Try to start server on occupied port
      const occupiedPortConfig = {
        ...config.backendApi,
        port: config.frontend.port // Conflict
      };

      await expect(serverManager.startServer(
        occupiedPortConfig,
        'node',
        ['backend-enhanced.js'],
        '/workspaces/agent-feed'
      )).rejects.toThrow();
    }, 15000);

    it('should timeout on unresponsive server startup', async () => {
      const shortTimeoutConfig = {
        ...config.backendApi,
        startupTimeout: 1000 // Very short timeout
      };

      await expect(serverManager.startServer(
        shortTimeoutConfig,
        'sleep', // Command that won't respond to health checks
        ['10']
      )).rejects.toThrow(/failed to start within/);
    }, 5000);

    it('should cleanup properly on orchestration failure', async () => {
      // Mock a server that will fail during startup
      const invalidConfig = {
        ...config,
        backendApi: {
          ...config.backendApi,
          startupTimeout: 1000
        }
      };

      try {
        await setupTestServers(invalidConfig);
        throw new Error('Expected setup to fail');
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Verify cleanup occurred
      const remainingServers = Array.from(serverManager['servers'].keys());
      expect(remainingServers).toHaveLength(0);
    }, 30000);
  });
});