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
   * Create new Claude instance with configuration (BULLETPROOF VERSION)
   */
  async createInstance(config: ClaudeInstanceConfig = {}): Promise<string> {
    const instanceId = `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Validate configuration
      const validatedConfig = this.validateAndSanitizeConfig(config);

      // Check system limits
      if (this.instances.size >= 50) { // Prevent resource exhaustion
        throw new Error('Maximum number of Claude instances reached (50)');
      }

      const instance = new ClaudeInstance(instanceId, validatedConfig, this.logger, this.sessionStorage);

      // Set up event handlers with error boundaries
      instance.on('message', (message: ClaudeMessage) => {
        try {
          this.emit('message', message);
        } catch (emitError) {
          this.logger.error(`Error emitting message for ${instanceId}:`, emitError);
        }
      });

      instance.on('statusChange', (status: ClaudeInstanceStatus) => {
        try {
          this.emit('statusChange', status);
        } catch (emitError) {
          this.logger.error(`Error emitting status change for ${instanceId}:`, emitError);
        }
      });

      instance.on('error', (error: Error) => {
        try {
          this.logger.error(`Instance ${instanceId} error:`, error);
          this.emit('error', { instanceId, error });
        } catch (emitError) {
          console.error(`Critical error handling failure for ${instanceId}:`, emitError);
        }
      });

      this.instances.set(instanceId, instance);

      // Start with timeout and error recovery
      try {
        await Promise.race([
          instance.start(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Instance start timeout')), 30000)
          )
        ]);
      } catch (startError) {
        // Clean up failed instance
        this.instances.delete(instanceId);
        instance.cleanup();
        throw startError;
      }

      this.logger.info(`Created Claude instance ${instanceId}`);
      return instanceId;
    } catch (error) {
      this.logger.error(`Failed to create Claude instance ${instanceId}:`, error);
      // Ensure cleanup on any failure
      if (this.instances.has(instanceId)) {
        const instance = this.instances.get(instanceId);
        this.instances.delete(instanceId);
        try {
          await instance?.cleanup();
        } catch (cleanupError) {
          this.logger.error(`Cleanup error for ${instanceId}:`, cleanupError);
        }
      }
      throw error;
    }
  }

  /**
   * Validate and sanitize configuration to prevent crashes
   */
  private validateAndSanitizeConfig(config: ClaudeInstanceConfig): ClaudeInstanceConfig {
    const sanitized: ClaudeInstanceConfig = {
      command: Array.isArray(config.command) ? config.command.slice(0, 10) : ['claude'], // Limit command length
      workingDirectory: typeof config.workingDirectory === 'string'
        ? config.workingDirectory.substring(0, 500) // Limit path length
        : process.cwd(),
      environment: config.environment && typeof config.environment === 'object'
        ? config.environment
        : {},
      timeout: typeof config.timeout === 'number' && config.timeout > 0 && config.timeout <= 1800000
        ? config.timeout
        : 300000, // 5 minutes default
      maxMemory: typeof config.maxMemory === 'number' && config.maxMemory > 0
        ? Math.min(config.maxMemory, 4 * 1024 * 1024 * 1024) // Cap at 4GB
        : 1024 * 1024 * 1024, // 1GB default
      maxCpu: typeof config.maxCpu === 'number' && config.maxCpu > 0 && config.maxCpu <= 100
        ? config.maxCpu
        : 80,
      restartOnCrash: typeof config.restartOnCrash === 'boolean'
        ? config.restartOnCrash
        : true
    };

    return sanitized;
  }

  /**
   * Get list of all instances
   */
  getInstances(): ClaudeInstanceStatus[] {
    return Array.from(this.instances.values()).map(instance => instance.getStatus());
  }

  /**
   * Get specific instance details (SAFE VERSION)
   */
  getInstance(instanceId: string): ClaudeInstanceStatus | null {
    try {
      if (!instanceId || typeof instanceId !== 'string') {
        this.logger.warn('Invalid instanceId provided to getInstance');
        return null;
      }

      const instance = this.instances.get(instanceId);
      if (!instance) {
        return null;
      }

      return instance.getStatus();
    } catch (error) {
      this.logger.error(`Error getting instance ${instanceId}:`, error);
      return null;
    }
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
   * Send terminal input to Claude instance (BULLETPROOF VERSION)
   */
  async sendInput(instanceId: string, input: string): Promise<void> {
    try {
      // Validate inputs
      if (!instanceId || typeof instanceId !== 'string') {
        throw new Error('Invalid instanceId: must be a non-empty string');
      }

      if (typeof input !== 'string') {
        throw new Error('Invalid input: must be a string');
      }

      if (input.length > 10000) {
        throw new Error('Input too long: maximum 10000 characters allowed');
      }

      const instance = this.instances.get(instanceId);
      if (!instance) {
        throw new Error(`Instance ${instanceId} not found`);
      }

      const status = instance.getStatus();
      if (status.status !== 'running') {
        throw new Error(`Instance ${instanceId} is not running (status: ${status.status})`);
      }

      await instance.sendInput(input);

    } catch (error) {
      this.logger.error(`Failed to send input to instance ${instanceId}:`, error);
      throw error;
    }
  }

  /**
   * Terminate Claude instance (SAFE VERSION)
   */
  async terminateInstance(instanceId: string, force = false): Promise<void> {
    try {
      if (!instanceId || typeof instanceId !== 'string') {
        throw new Error('Invalid instanceId: must be a non-empty string');
      }

      const instance = this.instances.get(instanceId);
      if (!instance) {
        throw new Error(`Instance ${instanceId} not found`);
      }

      try {
        await Promise.race([
          instance.stop(force),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Termination timeout')), force ? 5000 : 15000)
          )
        ]);
      } catch (stopError) {
        this.logger.error(`Error stopping instance ${instanceId}:`, stopError);
        if (!force) {
          // Retry with force if graceful termination failed
          await instance.stop(true);
        }
      } finally {
        // Always remove from instances map and cleanup
        this.instances.delete(instanceId);
        try {
          await instance.cleanup();
        } catch (cleanupError) {
          this.logger.error(`Cleanup error for ${instanceId}:`, cleanupError);
        }
      }

      this.logger.info(`Terminated Claude instance ${instanceId}`);
    } catch (error) {
      this.logger.error(`Failed to terminate instance ${instanceId}:`, error);
      throw error;
    }
  }

  /**
   * Health check for instance (SAFE VERSION)
   */
  async healthCheck(instanceId: string): Promise<boolean> {
    try {
      if (!instanceId || typeof instanceId !== 'string') {
        return false;
      }

      const instance = this.instances.get(instanceId);
      if (!instance) {
        return false;
      }

      // Add timeout to health check
      return await Promise.race([
        instance.healthCheck(),
        new Promise<boolean>((resolve) =>
          setTimeout(() => resolve(false), 5000)
        )
      ]);
    } catch (error) {
      this.logger.error(`Health check failed for instance ${instanceId}:`, error);
      return false;
    }
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

  /**
   * Send terminal input to Claude instance (CRITICAL FIX)
   */
  async sendInput(input: string): Promise<void> {
    if (!input || typeof input !== 'string') {
      throw new Error('Input must be a non-empty string');
    }

    if (input.length > 10000) {
      throw new Error('Input too long: maximum 10000 characters allowed');
    }

    if (!this.process || this.process.killed) {
      throw new Error('Process not available or has been killed');
    }

    if (!this.process.stdin || this.process.stdin.destroyed) {
      throw new Error('Process stdin not available or has been destroyed');
    }

    const message: ClaudeMessage = {
      id: uuidv4(),
      instanceId: this.id,
      type: 'input',
      content: input,
      timestamp: new Date(),
      metadata: { terminal: true, isInput: true }
    };

    try {
      // For terminal input, write with proper error handling
      const writeSuccess = this.process.stdin.write(input);

      if (!writeSuccess) {
        // Handle backpressure
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Write timeout - stdin buffer full'));
          }, 5000);

          this.process!.stdin!.once('drain', () => {
            clearTimeout(timeout);
            resolve();
          });

          this.process!.stdin!.once('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      }

      this.messageQueue.push(message);
      this.status.lastActivity = new Date();
      this.status.metrics.messagesProcessed++;

      try {
        await this.saveMessageToSession(message);
      } catch (saveError) {
        // Log but don't fail the operation
        this.logger.warn(`Failed to save message to session: ${saveError.message}`);
      }

      this.logger.debug(`Terminal input sent to instance ${this.id}: ${input.slice(0, 50)}`);
    } catch (error) {
      this.logger.error(`Failed to send terminal input to instance ${this.id}:`, error);
      this.status.metrics.errorCount++;
      throw error;
    }
  }

  /**
   * Cleanup resources when instance is destroyed
   */
  async cleanup(): Promise<void> {
    try {
      this.stopHealthCheck();

      if (this.process && !this.process.killed) {
        try {
          this.process.kill('SIGTERM');

          // Wait briefly for graceful exit
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              if (this.process && !this.process.killed) {
                this.process.kill('SIGKILL');
              }
              resolve();
            }, 3000);

            this.process!.once('exit', () => {
              clearTimeout(timeout);
              resolve();
            });
          });
        } catch (killError) {
          this.logger.error(`Error during process cleanup: ${killError.message}`);
        }
      }

      // Clear message queue to free memory
      this.messageQueue = [];

    } catch (error) {
      this.logger.error(`Cleanup error for instance ${this.id}:`, error);
    }
  }

  async stop(force = false): Promise<void> {
    try {
      if (!this.process || this.process.killed) {
        this.updateStatus('stopped');
        return;
      }

      this.updateStatus('stopping');
      this.stopHealthCheck();

      if (force) {
        this.process.kill('SIGKILL');
        this.updateStatus('stopped');
        return;
      }

      // Graceful shutdown with timeout
      try {
        this.process.kill('SIGTERM');

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            if (this.process && !this.process.killed) {
              this.logger.warn(`Force killing unresponsive instance ${this.id}`);
              this.process.kill('SIGKILL');
            }
            resolve(); // Don't reject, just resolve after force kill
          }, 10000);

          this.process!.once('exit', () => {
            clearTimeout(timeout);
            resolve();
          });

          this.process!.once('error', (error) => {
            clearTimeout(timeout);
            this.logger.error(`Process exit error for ${this.id}:`, error);
            resolve(); // Still resolve to continue cleanup
          });
        });

      } catch (shutdownError) {
        this.logger.error(`Graceful shutdown failed for ${this.id}:`, shutdownError);
        // Force kill as fallback
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }

      this.updateStatus('stopped');
    } catch (error) {
      this.logger.error(`Error stopping instance ${this.id}:`, error);
      this.updateStatus('error');
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
    try {
      if (!this.process || this.process.killed) {
        return false;
      }

      // Check if process is still running
      const isRunning = !this.process.killed &&
                       this.process.pid !== undefined &&
                       this.status.status === 'running';

      if (!isRunning) {
        return false;
      }

      // Verify process still exists by checking if we can get its info
      try {
        process.kill(this.process.pid!, 0); // Signal 0 doesn't actually kill, just checks existence
      } catch (processCheckError) {
        this.logger.debug(`Process ${this.process.pid} no longer exists`);
        return false;
      }

      // Update metrics if process is healthy
      try {
        this.updateMetrics();
      } catch (metricsError) {
        this.logger.warn(`Failed to update metrics for ${this.id}:`, metricsError);
        // Don't fail health check just because metrics failed
      }

      return true;
    } catch (error) {
      this.logger.error(`Health check failed for instance ${this.id}:`, error);
      return false;
    }
  }

  updateMetrics(): void {
    if (!this.process || !this.process.pid || this.process.killed) {
      return;
    }

    try {
      // Update memory usage safely
      try {
        this.status.memoryUsage = process.memoryUsage();
      } catch (memError) {
        this.logger.debug(`Could not get memory usage for ${this.id}:`, memError);
      }

      // Update CPU usage safely
      try {
        this.status.cpuUsage = process.cpuUsage();
      } catch (cpuError) {
        this.logger.debug(`Could not get CPU usage for ${this.id}:`, cpuError);
      }

      // Check resource limits with safe fallbacks
      const maxMemory = this.config.maxMemory || (1024 * 1024 * 1024); // 1GB default
      if (this.status.memoryUsage?.heapUsed && this.status.memoryUsage.heapUsed > maxMemory) {
        const memoryMB = Math.round(this.status.memoryUsage.heapUsed / 1024 / 1024);
        const limitMB = Math.round(maxMemory / 1024 / 1024);
        this.logger.warn(`Instance ${this.id} exceeding memory limit: ${memoryMB}MB > ${limitMB}MB`);
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