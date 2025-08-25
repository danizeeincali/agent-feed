/**
 * Server Management Utilities for Integration Testing
 * Handles startup, shutdown, and health checks for multi-server architecture
 */

import { spawn, ChildProcess } from 'child_process';
import { ServerConfig, TestEnvironmentPorts } from '../config/ports.config';
import fetch from 'node-fetch';
import WebSocket from 'ws';

export interface ServerInstance {
  name: string;
  process: ChildProcess;
  config: ServerConfig;
  pid?: number;
  startTime: number;
}

export class ServerManager {
  private servers = new Map<string, ServerInstance>();
  private cleanup: (() => Promise<void>)[] = [];

  /**
   * Start a server process
   */
  async startServer(config: ServerConfig, command: string, args: string[] = [], cwd?: string): Promise<ServerInstance> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        cwd: cwd || process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PORT: config.port.toString(),
          HOST: config.host,
          NODE_ENV: 'test'
        }
      });

      const instance: ServerInstance = {
        name: config.name,
        process,
        config,
        pid: process.pid,
        startTime: Date.now()
      };

      // Handle process events
      process.on('error', (error) => {
        console.error(`Server ${config.name} error:`, error);
        reject(error);
      });

      // Capture output for debugging
      let output = '';
      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data) => {
        console.error(`${config.name} stderr:`, data.toString());
      });

      // Wait for server to be ready
      this.waitForServer(config)
        .then(() => {
          this.servers.set(config.name, instance);
          resolve(instance);
        })
        .catch(reject);

      // Timeout handling
      setTimeout(() => {
        if (!this.servers.has(config.name)) {
          process.kill();
          reject(new Error(`Server ${config.name} failed to start within ${config.startupTimeout}ms`));
        }
      }, config.startupTimeout);
    });
  }

  /**
   * Wait for server to become available
   */
  private async waitForServer(config: ServerConfig): Promise<void> {
    const startTime = Date.now();
    const interval = 1000;

    while (Date.now() - startTime < config.startupTimeout) {
      try {
        if (config.protocol === 'ws' || config.protocol === 'wss') {
          await this.checkWebSocketHealth(config);
        } else {
          await this.checkHttpHealth(config);
        }
        return;
      } catch (error) {
        // Server not ready yet, continue waiting
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    throw new Error(`Server ${config.name} health check failed after ${config.startupTimeout}ms`);
  }

  /**
   * Check HTTP server health
   */
  private async checkHttpHealth(config: ServerConfig): Promise<void> {
    const url = `${config.protocol}://${config.host}:${config.port}${config.healthEndpoint || '/'}`;
    
    const response = await fetch(url, {
      method: 'GET',
      timeout: 5000
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Health check failed: ${response.status}`);
    }
  }

  /**
   * Check WebSocket server health
   */
  private async checkWebSocketHealth(config: ServerConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${config.protocol}://${config.host}:${config.port}`;
      const ws = new WebSocket(url);
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeout);
        ws.close();
        resolve();
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Start all servers in configuration
   */
  async startAll(config: TestEnvironmentPorts): Promise<Map<string, ServerInstance>> {
    const startPromises = [
      // Backend API server
      this.startServer(
        config.backendApi,
        'node',
        ['backend-enhanced.js'],
        '/workspaces/agent-feed'
      ),
      
      // WebSocket terminal server
      this.startServer(
        config.websocketTerminal,
        'node',
        ['backend-terminal-server-emergency-fix.js'],
        '/workspaces/agent-feed'
      ),
      
      // Frontend dev server
      this.startServer(
        config.frontend,
        'npm',
        ['run', 'dev', '--', '--port', config.frontend.port.toString()],
        '/workspaces/agent-feed/frontend'
      )
    ];

    try {
      await Promise.all(startPromises);
      return this.servers;
    } catch (error) {
      // Cleanup on failure
      await this.stopAll();
      throw error;
    }
  }

  /**
   * Stop a specific server
   */
  async stopServer(name: string): Promise<void> {
    const instance = this.servers.get(name);
    if (!instance) {
      return;
    }

    return new Promise((resolve) => {
      instance.process.on('exit', () => {
        this.servers.delete(name);
        resolve();
      });

      // Graceful shutdown first
      instance.process.kill('SIGTERM');
      
      // Force kill after timeout
      setTimeout(() => {
        if (!instance.process.killed) {
          instance.process.kill('SIGKILL');
        }
      }, 5000);
    });
  }

  /**
   * Stop all servers
   */
  async stopAll(): Promise<void> {
    const stopPromises = Array.from(this.servers.keys()).map(name => this.stopServer(name));
    await Promise.all(stopPromises);
    
    // Run cleanup functions
    for (const cleanup of this.cleanup) {
      try {
        await cleanup();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
    this.cleanup = [];
  }

  /**
   * Get server instance
   */
  getServer(name: string): ServerInstance | undefined {
    return this.servers.get(name);
  }

  /**
   * Check if all servers are running
   */
  async healthCheckAll(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};
    
    for (const [name, instance] of this.servers) {
      try {
        if (instance.config.protocol === 'ws' || instance.config.protocol === 'wss') {
          await this.checkWebSocketHealth(instance.config);
        } else {
          await this.checkHttpHealth(instance.config);
        }
        results[name] = true;
      } catch (error) {
        results[name] = false;
      }
    }
    
    return results;
  }

  /**
   * Add cleanup function
   */
  addCleanup(fn: () => Promise<void>): void {
    this.cleanup.push(fn);
  }

  /**
   * Get server logs
   */
  getServerLogs(name: string): string {
    const instance = this.servers.get(name);
    if (!instance) {
      return '';
    }
    
    // This would need to be enhanced to capture and return actual logs
    return `Logs for ${name} (PID: ${instance.pid})`;
  }
}

/**
 * Global server manager instance for tests
 */
export const serverManager = new ServerManager();

/**
 * Test utility: Setup servers before tests
 */
export async function setupTestServers(config: TestEnvironmentPorts): Promise<Map<string, ServerInstance>> {
  try {
    const servers = await serverManager.startAll(config);
    
    // Wait a bit more for servers to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify all servers are healthy
    const health = await serverManager.healthCheckAll();
    const unhealthyServers = Object.entries(health)
      .filter(([, healthy]) => !healthy)
      .map(([name]) => name);
    
    if (unhealthyServers.length > 0) {
      throw new Error(`Unhealthy servers detected: ${unhealthyServers.join(', ')}`);
    }
    
    return servers;
  } catch (error) {
    await serverManager.stopAll();
    throw error;
  }
}

/**
 * Test utility: Cleanup servers after tests
 */
export async function teardownTestServers(): Promise<void> {
  await serverManager.stopAll();
}