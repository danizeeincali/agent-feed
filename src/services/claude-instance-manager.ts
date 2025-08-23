/**
 * Claude Instance Manager Service
 * 
 * Comprehensive service for managing Claude instances with process lifecycle,
 * terminal sessions, auto-restart capabilities, and WebSocket integration.
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as pty from 'node-pty';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '@/utils/logger';
import { db } from '@/database/connection';

export interface LaunchOptions {
  type: 'production' | 'development';
  workingDirectory?: string;
  environment?: Record<string, string>;
  arguments?: string[];
  resourceLimits?: ResourceLimits;
  autoRestart?: AutoRestartConfig;
  name?: string;
  autoConnect?: boolean;
}

export interface ResourceLimits {
  maxMemory?: number; // bytes
  maxCpu?: number;    // percentage
  maxFiles?: number;  // file descriptors
  maxProcesses?: number;
  allowedDirectories?: string[];
}

export interface AutoRestartConfig {
  enabled: boolean;
  intervalHours: number;
  maxRestarts: number;
  healthCheckEnabled: boolean;
  gracefulShutdownTimeout: number;
}

export interface Instance {
  id: string;
  name: string;
  type: string;
  pid?: number;
  status: InstanceStatus;
  createdAt: Date;
  lastSeen: Date;
  config: LaunchOptions;
  metrics?: ResourceMetrics;
  terminalSessionId?: string;
}

export interface ResourceMetrics {
  cpu: number;
  memory: number;
  uptime: number;
  terminalConnections: number;
  commandsExecuted: number;
  errorRate: number;
  responseTime: number;
}

export type InstanceStatus = 'creating' | 'starting' | 'running' | 'stopping' | 'stopped' | 'error';

export interface TerminalSession {
  id: string;
  instanceId: string;
  pty: pty.IPty;
  clients: Set<string>;
  history: string[];
  size: { cols: number; rows: number };
  lastActivity: Date;
  settings: TerminalSettings;
}

export interface TerminalSettings {
  fontSize: number;
  fontFamily: string;
  theme: TerminalTheme;
  scrollback: number;
  cursorBlink: boolean;
}

export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  selection: string;
}

const MAX_HISTORY_LINES = 10000;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const PROCESS_TIMEOUT = 30000; // 30 seconds for process operations

export class ClaudeInstanceManager extends EventEmitter {
  private instances = new Map<string, Instance>();
  private terminalSessions = new Map<string, TerminalSession>();
  private processes = new Map<string, ChildProcess>();
  private restartTimers = new Map<string, NodeJS.Timeout>();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.startHealthChecks();
    this.loadExistingInstances();
  }

  /**
   * Launch a new Claude instance
   */
  async launchInstance(options: LaunchOptions): Promise<string> {
    try {
      logger.info('Launching Claude instance', { options });

      // Kill existing instance if same type
      await this.killExistingInstanceOfType(options.type);

      // Generate instance details
      const instanceId = this.generateInstanceId();
      const instanceName = options.name || this.generateInstanceName(options);
      const workDir = options.workingDirectory || '/workspaces/agent-feed/prod';

      // Ensure working directory exists
      await this.ensureWorkingDirectory(workDir);

      // Create instance record
      const instance: Instance = {
        id: instanceId,
        name: instanceName,
        type: options.type,
        status: 'creating',
        createdAt: new Date(),
        lastSeen: new Date(),
        config: options
      };

      // Register instance
      this.instances.set(instanceId, instance);
      await this.persistInstance(instance);

      // Update status to starting
      await this.updateInstanceStatus(instanceId, 'starting');

      // Spawn Claude process
      await this.spawnClaudeProcess(instanceId, options, workDir);

      // Create terminal session
      await this.createTerminalSession(instanceId);

      // Set up auto-restart if enabled
      if (options.autoRestart?.enabled) {
        this.scheduleAutoRestart(instanceId, options.autoRestart);
      }

      // Update status to running
      await this.updateInstanceStatus(instanceId, 'running');

      // Emit event
      this.emit('instanceCreated', instance);

      logger.info('Claude instance launched successfully', { instanceId, instanceName });
      return instanceId;

    } catch (error) {
      logger.error('Failed to launch Claude instance', { error: error.message, options });
      throw error;
    }
  }

  /**
   * Kill a Claude instance
   */
  async killInstance(instanceId: string, graceful = true): Promise<void> {
    try {
      const instance = this.instances.get(instanceId);
      if (!instance) {
        throw new Error(`Instance ${instanceId} not found`);
      }

      logger.info('Killing Claude instance', { instanceId, graceful });

      // Update status
      await this.updateInstanceStatus(instanceId, 'stopping');

      // Cancel auto-restart if active
      this.cancelAutoRestart(instanceId);

      // Get process
      const process = this.processes.get(instanceId);
      if (process && !process.killed) {
        if (graceful) {
          await this.gracefulShutdown(process);
        } else {
          process.kill('SIGKILL');
        }
      }

      // Clean up terminal session
      await this.destroyTerminalSession(instanceId);

      // Update status
      await this.updateInstanceStatus(instanceId, 'stopped');

      // Remove from memory
      this.instances.delete(instanceId);
      this.processes.delete(instanceId);

      // Emit event
      this.emit('instanceDestroyed', instanceId);

      logger.info('Claude instance killed successfully', { instanceId });

    } catch (error) {
      logger.error('Failed to kill Claude instance', { error: error.message, instanceId });
      throw error;
    }
  }

  /**
   * Restart a Claude instance
   */
  async restartInstance(instanceId: string): Promise<string> {
    try {
      const instance = this.instances.get(instanceId);
      if (!instance) {
        throw new Error(`Instance ${instanceId} not found`);
      }

      logger.info('Restarting Claude instance', { instanceId });

      // Kill current instance
      await this.killInstance(instanceId, true);

      // Launch new instance with same config
      const newInstanceId = await this.launchInstance(instance.config);

      logger.info('Claude instance restarted successfully', { 
        oldInstanceId: instanceId, 
        newInstanceId 
      });

      return newInstanceId;

    } catch (error) {
      logger.error('Failed to restart Claude instance', { error: error.message, instanceId });
      throw error;
    }
  }

  /**
   * Get instance status
   */
  getInstanceStatus(instanceId: string): Instance | null {
    return this.instances.get(instanceId) || null;
  }

  /**
   * List all instances
   */
  listInstances(): Instance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Get terminal session
   */
  getTerminalSession(instanceId: string): TerminalSession | null {
    const instance = this.instances.get(instanceId);
    if (!instance?.terminalSessionId) {
      return null;
    }
    return this.terminalSessions.get(instance.terminalSessionId) || null;
  }

  /**
   * Add client to terminal session
   */
  addTerminalClient(instanceId: string, clientId: string): void {
    const session = this.getTerminalSession(instanceId);
    if (session) {
      session.clients.add(clientId);
      session.lastActivity = new Date();
      logger.debug('Added client to terminal session', { instanceId, clientId });
    }
  }

  /**
   * Remove client from terminal session
   */
  removeTerminalClient(instanceId: string, clientId: string): void {
    const session = this.getTerminalSession(instanceId);
    if (session) {
      session.clients.delete(clientId);
      logger.debug('Removed client from terminal session', { instanceId, clientId });
    }
  }

  /**
   * Write to terminal
   */
  writeToTerminal(instanceId: string, data: string): void {
    const session = this.getTerminalSession(instanceId);
    if (session) {
      session.pty.write(data);
      session.lastActivity = new Date();
    }
  }

  /**
   * Resize terminal
   */
  resizeTerminal(instanceId: string, cols: number, rows: number): void {
    const session = this.getTerminalSession(instanceId);
    if (session) {
      session.pty.resize(cols, rows);
      session.size = { cols, rows };
      logger.debug('Terminal resized', { instanceId, cols, rows });
    }
  }

  /**
   * Get terminal history
   */
  getTerminalHistory(instanceId: string, lines?: number): string[] {
    const session = this.getTerminalSession(instanceId);
    if (!session) {
      return [];
    }

    const history = session.history;
    if (lines && lines < history.length) {
      return history.slice(-lines);
    }
    return history;
  }

  /**
   * Private methods
   */

  private async killExistingInstanceOfType(type: string): Promise<void> {
    const existingInstances = Array.from(this.instances.values())
      .filter(instance => instance.type === type && instance.status !== 'stopped');

    for (const instance of existingInstances) {
      await this.killInstance(instance.id, true);
    }
  }

  private generateInstanceId(): string {
    return `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateInstanceName(options: LaunchOptions): string {
    try {
      // Try to read from CLAUDE.md
      const claudeConfigPath = path.join(options.workingDirectory || '/workspaces/agent-feed/prod', 'CLAUDE.md');
      // This would need to be implemented to read the actual file
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      return `Claude-${options.type}-${timestamp}`;
    } catch {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      return `Claude-${options.type}-${timestamp}`;
    }
  }

  private async ensureWorkingDirectory(workDir: string): Promise<void> {
    try {
      await fs.access(workDir);
    } catch {
      await fs.mkdir(workDir, { recursive: true });
    }
  }

  private async spawnClaudeProcess(instanceId: string, options: LaunchOptions, workDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Process spawn timeout'));
      }, PROCESS_TIMEOUT);

      try {
        // Prepare environment
        const env = {
          ...process.env,
          ...options.environment,
          NODE_ENV: 'production',
          CLAUDE_INSTANCE_ID: instanceId,
          CLAUDE_WORKSPACE: workDir
        };

        // Spawn Claude process (this would need to be the actual Claude command)
        const childProcess = spawn('node', ['-e', 'console.log("Claude instance started"); setInterval(() => {}, 1000)'], {
          cwd: workDir,
          env,
          stdio: 'pipe',
          detached: false
        });

        // Store process reference
        this.processes.set(instanceId, childProcess);

        // Set up process event handlers
        childProcess.on('spawn', () => {
          clearTimeout(timeout);
          logger.info('Claude process spawned', { instanceId, pid: childProcess.pid });
          
          // Update instance with PID
          const instance = this.instances.get(instanceId);
          if (instance) {
            instance.pid = childProcess.pid;
            this.instances.set(instanceId, instance);
          }
          
          resolve();
        });

        childProcess.on('error', (error) => {
          clearTimeout(timeout);
          logger.error('Claude process error', { instanceId, error: error.message });
          this.updateInstanceStatus(instanceId, 'error');
          reject(error);
        });

        childProcess.on('exit', (code, signal) => {
          logger.info('Claude process exited', { instanceId, code, signal });
          this.handleProcessExit(instanceId, code, signal);
        });

      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private async createTerminalSession(instanceId: string): Promise<void> {
    const sessionId = `terminal-${instanceId}`;
    
    // Create PTY session
    const ptyProcess = pty.spawn('bash', [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: this.instances.get(instanceId)?.config.workingDirectory || '/workspaces/agent-feed/prod',
      env: process.env
    });

    const session: TerminalSession = {
      id: sessionId,
      instanceId,
      pty: ptyProcess,
      clients: new Set(),
      history: [],
      size: { cols: 80, rows: 24 },
      lastActivity: new Date(),
      settings: {
        fontSize: 14,
        fontFamily: 'Monaco, Menlo, monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#ffffff',
          selection: '#264f78'
        },
        scrollback: 1000,
        cursorBlink: true
      }
    };

    // Set up PTY event handlers
    ptyProcess.onData((data) => {
      // Add to history
      session.history.push(data);
      if (session.history.length > MAX_HISTORY_LINES) {
        session.history.shift();
      }

      // Broadcast to connected clients
      this.emit('terminalData', instanceId, data);
    });

    ptyProcess.onExit(() => {
      logger.info('PTY session exited', { instanceId, sessionId });
      this.terminalSessions.delete(sessionId);
    });

    // Store session
    this.terminalSessions.set(sessionId, session);

    // Update instance with session ID
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.terminalSessionId = sessionId;
      this.instances.set(instanceId, instance);
    }

    logger.info('Terminal session created', { instanceId, sessionId });
  }

  private async destroyTerminalSession(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance?.terminalSessionId) {
      return;
    }

    const session = this.terminalSessions.get(instance.terminalSessionId);
    if (session) {
      session.pty.kill();
      this.terminalSessions.delete(instance.terminalSessionId);
      logger.info('Terminal session destroyed', { instanceId, sessionId: instance.terminalSessionId });
    }
  }

  private async gracefulShutdown(process: ChildProcess): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        process.kill('SIGKILL');
        resolve();
      }, 15000); // 15 second grace period

      process.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      process.kill('SIGTERM');
    });
  }

  private async updateInstanceStatus(instanceId: string, status: InstanceStatus): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.status = status;
      instance.lastSeen = new Date();
      this.instances.set(instanceId, instance);
      
      // Persist to database
      await this.persistInstance(instance);
      
      // Emit event
      this.emit('instanceStatusChanged', instanceId, status);
    }
  }

  private async persistInstance(instance: Instance): Promise<void> {
    try {
      await db.query(`
        INSERT INTO instances (id, name, type, pid, status, created_at, last_seen, config)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          pid = EXCLUDED.pid,
          status = EXCLUDED.status,
          last_seen = EXCLUDED.last_seen,
          config = EXCLUDED.config
      `, [
        instance.id,
        instance.name,
        instance.type,
        instance.pid,
        instance.status,
        instance.createdAt,
        instance.lastSeen,
        JSON.stringify(instance.config)
      ]);
    } catch (error) {
      logger.error('Failed to persist instance', { error: error.message, instanceId: instance.id });
    }
  }

  private async loadExistingInstances(): Promise<void> {
    try {
      const result = await db.query(`
        SELECT id, name, type, pid, status, created_at, last_seen, config
        FROM instances
        WHERE status IN ('running', 'starting')
      `);

      for (const row of result.rows) {
        const instance: Instance = {
          id: row.id,
          name: row.name,
          type: row.type,
          pid: row.pid,
          status: row.status,
          createdAt: new Date(row.created_at),
          lastSeen: new Date(row.last_seen),
          config: JSON.parse(row.config)
        };

        this.instances.set(instance.id, instance);
        
        // Check if process is still running
        if (instance.pid && !this.isProcessRunning(instance.pid)) {
          await this.updateInstanceStatus(instance.id, 'stopped');
        }
      }

      logger.info('Loaded existing instances', { count: result.rows.length });
    } catch (error) {
      logger.error('Failed to load existing instances', { error: error.message });
    }
  }

  private isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  private handleProcessExit(instanceId: string, code: number | null, signal: string | null): void {
    logger.info('Handling process exit', { instanceId, code, signal });
    
    this.updateInstanceStatus(instanceId, 'stopped');
    this.processes.delete(instanceId);

    // Check if auto-restart is enabled
    const instance = this.instances.get(instanceId);
    if (instance?.config.autoRestart?.enabled && code !== 0) {
      logger.info('Scheduling auto-restart for crashed instance', { instanceId });
      setTimeout(() => {
        this.restartInstance(instanceId).catch(error => {
          logger.error('Auto-restart failed', { instanceId, error: error.message });
        });
      }, 5000); // Wait 5 seconds before restart
    }

    this.emit('instanceExited', instanceId, code, signal);
  }

  private scheduleAutoRestart(instanceId: string, config: AutoRestartConfig): void {
    const intervalMs = config.intervalHours * 60 * 60 * 1000;
    
    const timer = setTimeout(() => {
      logger.info('Performing scheduled restart', { instanceId });
      this.restartInstance(instanceId).catch(error => {
        logger.error('Scheduled restart failed', { instanceId, error: error.message });
      });
    }, intervalMs);

    this.restartTimers.set(instanceId, timer);
    logger.info('Auto-restart scheduled', { instanceId, intervalHours: config.intervalHours });
  }

  private cancelAutoRestart(instanceId: string): void {
    const timer = this.restartTimers.get(instanceId);
    if (timer) {
      clearTimeout(timer);
      this.restartTimers.delete(instanceId);
      logger.info('Auto-restart cancelled', { instanceId });
    }
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, HEALTH_CHECK_INTERVAL);
  }

  private async performHealthChecks(): Promise<void> {
    for (const [instanceId, instance] of this.instances) {
      if (instance.status === 'running' && instance.pid) {
        if (!this.isProcessRunning(instance.pid)) {
          logger.warn('Instance process not running during health check', { instanceId });
          await this.updateInstanceStatus(instanceId, 'stopped');
        } else {
          // Update last seen
          await this.updateInstanceStatus(instanceId, 'running');
        }
      }
    }
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Claude Instance Manager');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Cancel all restart timers
    for (const timer of this.restartTimers.values()) {
      clearTimeout(timer);
    }

    // Kill all running instances
    const runningInstances = Array.from(this.instances.values())
      .filter(instance => instance.status === 'running');

    for (const instance of runningInstances) {
      await this.killInstance(instance.id, true);
    }

    logger.info('Claude Instance Manager shutdown complete');
  }
}

// Export singleton instance
export const claudeInstanceManager = new ClaudeInstanceManager();