/**
 * Claude Process Manager - Manages dedicated Claude instances
 * Provides process lifecycle management, communication via stdio/pipes,
 * resource monitoring, and cleanup
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import winston from 'winston';

// Types and interfaces
export interface ClaudeInstanceConfig {
  command?: string[];
  workingDirectory?: string;
  environment?: Record<string, string>;
  timeout?: number;
  maxMemory?: number;
  maxCpu?: number;
  restartOnCrash?: boolean;
}

export interface ClaudeInstanceStatus {
  id: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'crashed' | 'error';
  pid?: number;
  startTime: Date;
  lastActivity: Date;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  config: ClaudeInstanceConfig;
  metrics: {
    messagesProcessed: number;
    averageResponseTime: number;
    errorCount: number;
    restartCount: number;
  };
}

export interface ClaudeMessage {
  id: string;
  instanceId: string;
  type: 'input' | 'output' | 'error' | 'control';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class ClaudeProcessManager extends EventEmitter {
  private instances: Map<string, ClaudeInstance> = new Map();
  private logger: winston.Logger;
  private monitoring: NodeJS.Timeout | null = null;
  private sessionStorage: string;

  constructor(sessionStoragePath = './sessions') {
    super();
    this.sessionStorage = sessionStoragePath;
    this.setupLogger();
    this.ensureSessionStorage();
    this.startMonitoring();
  }

  private setupLogger(): void {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ 
          filename: 'logs/claude-process-manager.log',
          level: 'info'
        }),
        new winston.transports.File({ 
          filename: 'logs/claude-process-manager-error.log',
          level: 'error'
        }),
        new winston.transports.Console({
          format: winston.format.simple(),
          level: 'debug'
        })
      ]
    });
  }

  private async ensureSessionStorage(): Promise<void> {
    try {
      await fs.mkdir(this.sessionStorage, { recursive: true });
      await fs.mkdir(path.join(this.sessionStorage, 'logs'), { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create session storage directories:', error);
    }
  }

  /**
   * Create new Claude instance with configuration
   */
  async createInstance(config: ClaudeInstanceConfig = {}): Promise<string> {
    const instanceId = uuidv4();
    
    try {
      const instance = new ClaudeInstance(instanceId, config, this.logger, this.sessionStorage);
      
      // Set up event handlers
      instance.on('message', (message: ClaudeMessage) => {
        this.emit('message', message);
      });

      instance.on('statusChange', (status: ClaudeInstanceStatus) => {
        this.emit('statusChange', status);
      });

      instance.on('error', (error: Error) => {
        this.logger.error(`Instance ${instanceId} error:`, error);
        this.emit('error', { instanceId, error });
      });

      this.instances.set(instanceId, instance);
      await instance.start();

      this.logger.info(`Created Claude instance ${instanceId}`);
      return instanceId;
    } catch (error) {
      this.logger.error(`Failed to create Claude instance ${instanceId}:`, error);
      throw error;
    }
  }

  /**
   * Get list of all instances
   */
  getInstances(): ClaudeInstanceStatus[] {
    return Array.from(this.instances.values()).map(instance => instance.getStatus());
  }

  /**
   * Get specific instance details
   */
  getInstance(instanceId: string): ClaudeInstanceStatus | null {
    const instance = this.instances.get(instanceId);
    return instance ? instance.getStatus() : null;
  }

  /**
   * Send message to Claude instance
   */
  async sendMessage(instanceId: string, content: string, metadata?: Record<string, any>): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    await instance.sendMessage(content, metadata);
  }

  /**
   * Terminate Claude instance
   */
  async terminateInstance(instanceId: string, force = false): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    try {
      await instance.stop(force);
      this.instances.delete(instanceId);
      this.logger.info(`Terminated Claude instance ${instanceId}`);
    } catch (error) {
      this.logger.error(`Failed to terminate instance ${instanceId}:`, error);
      throw error;
    }
  }

  /**
   * Health check for instance
   */
  async healthCheck(instanceId: string): Promise<boolean> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return false;
    }

    return await instance.healthCheck();
  }

  /**
   * Restart instance
   */
  async restartInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    await instance.restart();
    this.logger.info(`Restarted Claude instance ${instanceId}`);
  }

  /**
   * Clean shutdown of all instances
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Claude Process Manager...');
    
    if (this.monitoring) {
      clearInterval(this.monitoring);
      this.monitoring = null;
    }

    const shutdownPromises = Array.from(this.instances.entries()).map(async ([id, instance]) => {
      try {
        await instance.stop();
        this.logger.info(`Shut down instance ${id}`);
      } catch (error) {
        this.logger.error(`Error shutting down instance ${id}:`, error);
      }
    });

    await Promise.all(shutdownPromises);
    this.instances.clear();
    this.logger.info('Claude Process Manager shutdown complete');
  }

  private startMonitoring(): void {
    this.monitoring = setInterval(() => {
      this.monitorInstances();
    }, 30000); // Monitor every 30 seconds
  }

  private monitorInstances(): void {
    for (const [id, instance] of this.instances) {
      try {
        instance.updateMetrics();
      } catch (error) {
        this.logger.error(`Error monitoring instance ${id}:`, error);
      }
    }
  }
}

/**
 * Individual Claude Instance class
 */
class ClaudeInstance extends EventEmitter {
  private id: string;
  private config: ClaudeInstanceConfig;
  private process: ChildProcess | null = null;
  private logger: winston.Logger;
  private status: ClaudeInstanceStatus;
  private sessionPath: string;
  private messageQueue: ClaudeMessage[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    id: string, 
    config: ClaudeInstanceConfig, 
    logger: winston.Logger,
    sessionStorage: string
  ) {
    super();
    this.id = id;
    this.config = {
      command: ['claude', 'chat'],
      workingDirectory: process.cwd(),
      timeout: 300000, // 5 minutes
      maxMemory: 1024 * 1024 * 1024, // 1GB
      maxCpu: 80, // 80%
      restartOnCrash: true,
      ...config
    };
    this.logger = logger;
    this.sessionPath = path.join(sessionStorage, id);

    this.status = {
      id,
      status: 'stopped',
      startTime: new Date(),
      lastActivity: new Date(),
      config: this.config,
      metrics: {
        messagesProcessed: 0,
        averageResponseTime: 0,
        errorCount: 0,
        restartCount: 0
      }
    };

    this.setupSessionStorage();
  }

  private async setupSessionStorage(): Promise<void> {
    try {
      await fs.mkdir(this.sessionPath, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create session storage for ${this.id}:`, error);
    }
  }

  async start(): Promise<void> {
    if (this.process) {
      throw new Error('Instance already running');
    }

    try {
      this.updateStatus('starting');

      // Spawn Claude process
      this.process = spawn(this.config.command![0], this.config.command!.slice(1), {
        cwd: this.config.workingDirectory,
        env: {
          ...process.env,
          ...this.config.environment
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.setupProcessHandlers();
      this.startHealthCheck();
      
      this.status.pid = this.process.pid;
      this.updateStatus('running');
      
      this.logger.info(`Started Claude instance ${this.id} with PID ${this.process.pid}`);
    } catch (error) {
      this.updateStatus('error');
      throw error;
    }
  }

  private setupProcessHandlers(): void {
    if (!this.process) return;

    // Handle stdout (Claude responses)
    this.process.stdout?.on('data', (data: Buffer) => {
      const content = data.toString();
      this.handleOutput(content, 'output');
    });

    // Handle stderr (errors)
    this.process.stderr?.on('data', (data: Buffer) => {
      const content = data.toString();
      this.handleOutput(content, 'error');
    });

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      this.logger.info(`Claude instance ${this.id} exited with code ${code}, signal ${signal}`);
      
      if (code !== 0 && this.config.restartOnCrash) {
        this.handleCrash();
      } else {
        this.updateStatus('stopped');
      }
      
      this.process = null;
      this.stopHealthCheck();
    });

    // Handle process errors
    this.process.on('error', (error) => {
      this.logger.error(`Claude instance ${this.id} error:`, error);
      this.updateStatus('error');
      this.emit('error', error);
      this.status.metrics.errorCount++;
    });
  }

  private handleOutput(content: string, type: 'output' | 'error'): void {
    const message: ClaudeMessage = {
      id: uuidv4(),
      instanceId: this.id,
      type,
      content,
      timestamp: new Date()
    };

    this.messageQueue.push(message);
    this.emit('message', message);
    this.status.lastActivity = new Date();
    this.status.metrics.messagesProcessed++;

    // Save to session log
    this.saveMessageToSession(message);
  }

  private async saveMessageToSession(message: ClaudeMessage): Promise<void> {
    try {
      const logPath = path.join(this.sessionPath, 'messages.jsonl');
      const logLine = JSON.stringify(message) + '\n';
      await fs.appendFile(logPath, logLine);
    } catch (error) {
      this.logger.error(`Failed to save message to session ${this.id}:`, error);
    }
  }

  async sendMessage(content: string, metadata?: Record<string, any>): Promise<void> {
    if (!this.process || !this.process.stdin) {
      throw new Error('Process not available for input');
    }

    const message: ClaudeMessage = {
      id: uuidv4(),
      instanceId: this.id,
      type: 'input',
      content,
      timestamp: new Date(),
      metadata
    };

    try {
      this.process.stdin.write(content + '\n');
      this.messageQueue.push(message);
      this.status.lastActivity = new Date();
      await this.saveMessageToSession(message);
    } catch (error) {
      this.logger.error(`Failed to send message to instance ${this.id}:`, error);
      throw error;
    }
  }

  async stop(force = false): Promise<void> {
    if (!this.process) {
      this.updateStatus('stopped');
      return;
    }

    this.updateStatus('stopping');
    this.stopHealthCheck();

    try {
      if (force) {
        this.process.kill('SIGKILL');
      } else {
        this.process.kill('SIGTERM');
        
        // Wait for graceful shutdown
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            if (this.process) {
              this.process.kill('SIGKILL');
            }
            reject(new Error('Timeout during graceful shutdown'));
          }, 10000);

          this.process!.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }
    } catch (error) {
      this.logger.error(`Error stopping instance ${this.id}:`, error);
      throw error;
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    this.status.metrics.restartCount++;
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
    await this.start();
  }

  private async handleCrash(): Promise<void> {
    this.logger.warn(`Claude instance ${this.id} crashed, attempting restart...`);
    this.updateStatus('crashed');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before restart
      await this.start();
    } catch (error) {
      this.logger.error(`Failed to restart crashed instance ${this.id}:`, error);
      this.updateStatus('error');
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.process) {
      return false;
    }

    try {
      // Check if process is still running
      const isRunning = !this.process.killed && this.process.pid !== undefined;
      
      // Check resource usage
      if (isRunning) {
        this.updateMetrics();
      }

      return isRunning;
    } catch (error) {
      this.logger.error(`Health check failed for instance ${this.id}:`, error);
      return false;
    }
  }

  updateMetrics(): void {
    if (!this.process || !this.process.pid) return;

    try {
      // Update memory usage
      this.status.memoryUsage = process.memoryUsage();
      
      // Update CPU usage (simplified)
      this.status.cpuUsage = process.cpuUsage();
      
      // Check resource limits
      if (this.status.memoryUsage && this.status.memoryUsage.heapUsed > this.config.maxMemory!) {
        this.logger.warn(`Instance ${this.id} exceeding memory limit`);
      }
    } catch (error) {
      this.logger.error(`Error updating metrics for instance ${this.id}:`, error);
    }
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      const isHealthy = await this.healthCheck();
      if (!isHealthy && this.status.status === 'running') {
        this.logger.warn(`Health check failed for instance ${this.id}`);
        this.updateStatus('error');
      }
    }, 60000); // Check every minute
  }

  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private updateStatus(status: ClaudeInstanceStatus['status']): void {
    this.status.status = status;
    this.emit('statusChange', this.getStatus());
  }

  getStatus(): ClaudeInstanceStatus {
    return { ...this.status };
  }

  getMessages(limit = 100): ClaudeMessage[] {
    return this.messageQueue.slice(-limit);
  }
}

export default ClaudeProcessManager;