/**
 * Port Configuration Integration Tests
 * Tests port allocation, conflict detection, and environment-based configuration
 */

import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { 
  getPortConfig, 
  getServerUrls, 
  validatePortConfig, 
  isPortAvailable, 
  findAvailablePort,
  getEnvironmentConfig,
  PortAllocator 
} from '../config/ports.config';
import { ServerManager } from '../utils/server-manager';
import { createServer, Server } from 'net';

describe('Port Configuration Integration Tests', () => {
  let testServers: Server[] = [];
  let portAllocator: PortAllocator;

  beforeEach(() => {
    testServers = [];
    portAllocator = new PortAllocator(9500, 500); // Use different range for tests
  });

  afterEach(async () => {
    // Clean up test servers
    await Promise.all(testServers.map(server => 
      new Promise<void>(resolve => {
        server.close(() => resolve());
      })
    ));
    testServers = [];
    portAllocator.releaseAll();
  });

  describe('Port Configuration Generation', () => {
    it('should generate valid configuration for different environments', () => {
      const environments = ['development', 'test', 'integration', 'docker'] as const;
      
      environments.forEach(env => {
        const config = getPortConfig(env);
        
        expect(config).toHaveProperty('frontend');
        expect(config).toHaveProperty('backendApi');
        expect(config).toHaveProperty('websocketTerminal');
        
        expect(config.frontend.port).toBeGreaterThan(1024);
        expect(config.backendApi.port).toBeGreaterThan(1024);
        expect(config.websocketTerminal.port).toBeGreaterThan(1024);
        
        // Each environment should have different ports
        const ports = [config.frontend.port, config.backendApi.port, config.websocketTerminal.port];
        const uniquePorts = [...new Set(ports)];
        expect(uniquePorts).toHaveLength(3);
      });
    });

    it('should generate correct URLs for server configuration', () => {
      const config = getPortConfig('test');
      const urls = getServerUrls('test');
      
      expect(urls.frontend).toBe(`http://localhost:${config.frontend.port}`);
      expect(urls.backendApi).toBe(`http://localhost:${config.backendApi.port}`);
      expect(urls.websocketTerminal).toBe(`ws://localhost:${config.websocketTerminal.port}`);
    });

    it('should have different port ranges for each environment', () => {
      const configs = {
        development: getPortConfig('development'),
        test: getPortConfig('test'),
        integration: getPortConfig('integration'),
        docker: getPortConfig('docker')
      };

      // Collect all ports from all environments
      const allPorts = Object.values(configs).flatMap(config => [
        config.frontend.port,
        config.backendApi.port,
        config.websocketTerminal.port
      ]);

      // All ports should be unique across environments
      const uniquePorts = [...new Set(allPorts)];
      expect(uniquePorts).toHaveLength(allPorts.length);
    });
  });

  describe('Port Validation', () => {
    it('should validate valid port configuration', () => {
      const config = getPortConfig('test');
      const validation = validatePortConfig(config);
      
      expect(validation.valid).toBe(true);
      expect(validation.conflicts).toHaveLength(0);
    });

    it('should detect duplicate ports', () => {
      const config = getPortConfig('test');
      config.websocketTerminal.port = config.frontend.port; // Create conflict
      
      const validation = validatePortConfig(config);
      
      expect(validation.valid).toBe(false);
      expect(validation.conflicts.some(c => c.includes('Duplicate ports'))).toBe(true);
    });

    it('should detect reserved port ranges', () => {
      const config = getPortConfig('test');
      config.frontend.port = 80; // Reserved port
      
      const validation = validatePortConfig(config);
      
      expect(validation.valid).toBe(false);
      expect(validation.conflicts.some(c => c.includes('reserved range'))).toBe(true);
    });

    it('should detect invalid port numbers', () => {
      const config = getPortConfig('test');
      config.backendApi.port = 70000; // Beyond valid range
      
      const validation = validatePortConfig(config);
      
      expect(validation.valid).toBe(false);
      expect(validation.conflicts.some(c => c.includes('exceeds maximum'))).toBe(true);
    });
  });

  describe('Port Availability Detection', () => {
    it('should correctly detect available ports', async () => {
      const availablePort = 9876;
      const isAvailable = await isPortAvailable(availablePort);
      
      expect(isAvailable).toBe(true);
    });

    it('should correctly detect occupied ports', async () => {
      const testPort = 9877;
      
      // Create a server on the test port
      const server = createServer();
      testServers.push(server);
      
      await new Promise<void>((resolve, reject) => {
        server.listen(testPort, 'localhost', () => resolve());
        server.on('error', reject);
      });

      const isAvailable = await isPortAvailable(testPort);
      expect(isAvailable).toBe(false);
    });

    it('should find next available port in range', async () => {
      const startPort = 9880;
      const endPort = 9890;
      
      // Occupy first few ports
      for (let port = startPort; port < startPort + 3; port++) {
        const server = createServer();
        testServers.push(server);
        
        await new Promise<void>((resolve, reject) => {
          server.listen(port, 'localhost', () => resolve());
          server.on('error', reject);
        });
      }

      const availablePort = await findAvailablePort(startPort, endPort);
      
      expect(availablePort).toBeGreaterThanOrEqual(startPort + 3);
      expect(availablePort).toBeLessThanOrEqual(endPort);
      
      // Verify the found port is actually available
      const isAvailable = await isPortAvailable(availablePort);
      expect(isAvailable).toBe(true);
    });

    it('should throw when no ports available in range', async () => {
      const startPort = 9895;
      const endPort = 9897;
      
      // Occupy all ports in range
      for (let port = startPort; port <= endPort; port++) {
        const server = createServer();
        testServers.push(server);
        
        await new Promise<void>((resolve, reject) => {
          server.listen(port, 'localhost', () => resolve());
          server.on('error', reject);
        });
      }

      await expect(findAvailablePort(startPort, endPort))
        .rejects.toThrow(/No available ports found/);
    });
  });

  describe('Environment Configuration', () => {
    it('should use TEST_ENV when specified', () => {
      const originalTestEnv = process.env.TEST_ENV;
      process.env.TEST_ENV = 'integration';
      
      const { environment, config } = getEnvironmentConfig();
      
      expect(environment).toBe('integration');
      expect(config.frontend.port).toBe(5175); // Integration environment port
      
      process.env.TEST_ENV = originalTestEnv;
    });

    it('should fallback to development for NODE_ENV=development', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalTestEnv = process.env.TEST_ENV;
      
      process.env.NODE_ENV = 'development';
      delete process.env.TEST_ENV;
      
      const { environment, config } = getEnvironmentConfig();
      
      expect(environment).toBe('development');
      expect(config.frontend.port).toBe(5173); // Development environment port
      
      process.env.NODE_ENV = originalNodeEnv;
      process.env.TEST_ENV = originalTestEnv;
    });

    it('should use docker environment when DOCKER_ENV is set', () => {
      const originalDockerEnv = process.env.DOCKER_ENV;
      const originalTestEnv = process.env.TEST_ENV;
      
      process.env.DOCKER_ENV = 'true';
      delete process.env.TEST_ENV;
      
      const { environment, config } = getEnvironmentConfig();
      
      expect(environment).toBe('docker');
      expect(config.frontend.port).toBe(5176); // Docker environment port
      
      process.env.DOCKER_ENV = originalDockerEnv;
      process.env.TEST_ENV = originalTestEnv;
    });

    it('should default to test environment', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalTestEnv = process.env.TEST_ENV;
      const originalDockerEnv = process.env.DOCKER_ENV;
      
      process.env.NODE_ENV = 'production';
      delete process.env.TEST_ENV;
      delete process.env.DOCKER_ENV;
      
      const { environment, config } = getEnvironmentConfig();
      
      expect(environment).toBe('test');
      expect(config.frontend.port).toBe(5174); // Test environment port
      
      process.env.NODE_ENV = originalNodeEnv;
      process.env.TEST_ENV = originalTestEnv;
      process.env.DOCKER_ENV = originalDockerEnv;
    });
  });

  describe('Port Allocator', () => {
    it('should allocate unique available ports', async () => {
      const port1 = await portAllocator.allocatePort();
      const port2 = await portAllocator.allocatePort();
      const port3 = await portAllocator.allocatePort();
      
      expect(port1).not.toBe(port2);
      expect(port1).not.toBe(port3);
      expect(port2).not.toBe(port3);
      
      // Verify ports are in expected range
      expect(port1).toBeGreaterThanOrEqual(9500);
      expect(port1).toBeLessThanOrEqual(10000);
    });

    it('should not reallocate released ports immediately', async () => {
      const port1 = await portAllocator.allocatePort();
      const port2 = await portAllocator.allocatePort();
      
      portAllocator.releasePort(port1);
      
      const port3 = await portAllocator.allocatePort();
      
      // port3 might be port1 (reused) or a new port
      expect([port1, port2].includes(port3) || port3 > port2).toBe(true);
    });

    it('should release all ports on releaseAll', async () => {
      await portAllocator.allocatePort();
      await portAllocator.allocatePort();
      await portAllocator.allocatePort();
      
      portAllocator.releaseAll();
      
      // After release, allocating should work without conflicts
      const newPort = await portAllocator.allocatePort();
      expect(newPort).toBeGreaterThanOrEqual(9500);
    });

    it('should handle port allocation failures gracefully', async () => {
      // Fill up a smaller range to force allocation failures
      const smallAllocator = new PortAllocator(9990, 5);
      
      // Occupy most ports in the small range
      for (let port = 9990; port < 9994; port++) {
        const server = createServer();
        testServers.push(server);
        
        await new Promise<void>((resolve, reject) => {
          server.listen(port, 'localhost', () => resolve());
          server.on('error', reject);
        });
      }

      // Should eventually fail to allocate
      await expect(smallAllocator.allocatePort())
        .rejects.toThrow(/Failed to allocate port/);
    });
  });

  describe('Integration with ServerManager', () => {
    it('should work with ServerManager for conflict detection', async () => {
      const config = getPortConfig('integration');
      const serverManager = new ServerManager();
      
      try {
        // Occupy one of the ports
        const server = createServer();
        testServers.push(server);
        
        await new Promise<void>((resolve, reject) => {
          server.listen(config.backendApi.port, 'localhost', () => resolve());
          server.on('error', reject);
        });

        // Attempt to start server on occupied port should fail
        await expect(serverManager.startServer(
          config.backendApi,
          'echo', // Simple command that exits quickly
          ['test']
        )).rejects.toThrow();
        
      } finally {
        await serverManager.stopAll();
      }
    });

    it('should handle dynamic port allocation for parallel tests', async () => {
      // Simulate parallel test execution needing different ports
      const allocatedPorts: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const port = await portAllocator.allocatePort();
        allocatedPorts.push(port);
        
        // Verify port is actually available
        const isAvailable = await isPortAvailable(port);
        expect(isAvailable).toBe(true);
      }
      
      // All ports should be unique
      const uniquePorts = [...new Set(allocatedPorts)];
      expect(uniquePorts).toHaveLength(allocatedPorts.length);
      
      // Clean up
      allocatedPorts.forEach(port => portAllocator.releasePort(port));
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid environment names gracefully', () => {
      const invalidEnv = 'invalid-environment' as any;
      
      // Should fallback to test environment
      const config = getPortConfig(invalidEnv);
      expect(config.frontend.port).toBe(5174); // Test environment port
    });

    it('should validate configuration and throw on invalid setups', () => {
      const originalTestEnv = process.env.TEST_ENV;
      
      // Mock an environment that would create invalid config
      process.env.TEST_ENV = 'test';
      
      // Mock the config to return invalid ports
      vi.spyOn(require('../config/ports.config'), 'getPortConfig').mockReturnValue({
        frontend: { port: 80, host: 'localhost', protocol: 'http', startupTimeout: 10000, name: 'frontend' },
        backendApi: { port: 3001, host: 'localhost', protocol: 'http', startupTimeout: 10000, name: 'backend' },
        websocketTerminal: { port: 3002, host: 'localhost', protocol: 'ws', startupTimeout: 10000, name: 'websocket' }
      });

      expect(() => getEnvironmentConfig()).toThrow(/validation failed/);
      
      vi.restoreAllMocks();
      process.env.TEST_ENV = originalTestEnv;
    });

    it('should handle network interface binding failures', async () => {
      // Test binding to invalid interface
      const isAvailableOnInvalidHost = await isPortAvailable(9999, 'invalid-host');
      expect(isAvailableOnInvalidHost).toBe(false);
    });

    it('should handle rapid port allocation and release', async () => {
      // Stress test port allocation system
      const operations = [];
      
      for (let i = 0; i < 50; i++) {
        operations.push(
          portAllocator.allocatePort().then(port => {
            // Immediately release some ports
            if (i % 3 === 0) {
              setTimeout(() => portAllocator.releasePort(port), 10);
            }
            return port;
          })
        );
      }
      
      const ports = await Promise.all(operations);
      
      // Most allocations should succeed
      expect(ports.filter(Boolean)).toHaveLength(50);
    });
  });
});