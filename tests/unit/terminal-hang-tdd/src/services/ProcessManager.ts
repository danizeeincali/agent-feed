/**
 * SPARC REFINEMENT PHASE: Process Manager Implementation
 * Background Claude process management service
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { ProcessConfig, ProcessInfo, ProcessStatus, HealthMetrics } from '../types/process';
import { isProcessAlive, killProcess, getProcessResourceUsage } from '../utils/process-utils';

export interface ProcessManagerConfig {
  maxProcesses: number;
  healthCheckInterval: number;
  processTimeout: number;
  gracefulTerminationTimeout?: number;
  hangDetectionTimeout?: number;
}

export interface ProcessEvents {
  'process:starting': (data: { processId: string }) => void;
  'process:ready': (data: { processId: string; pid: number }) => void;
  'process:output': (data: { processId: string; stream: 'stdout' | 'stderr'; data: string; timestamp: number }) => void;
  'process:error': (data: { processId?: string; error: Error; phase: 'spawn' | 'runtime' }) => void;
  'process:exit': (data: { processId: string; exitCode: number | null; signal: string | null; timestamp: number }) => void;
  'process:hang': (data: { processId: string; lastActivity: number }) => void;
  'process:death': (data: { processId: string; pid: number }) => void;
}

export class ProcessManager extends EventEmitter {
  private processes: Map<string, ProcessInfo> = new Map();
  private childProcesses: Map<string, ChildProcess> = new Map();
  private config: ProcessManagerConfig;
  private healthCheckTimer?: NodeJS.Timeout;
  private processCounter: number = 0;
  
  constructor(config: ProcessManagerConfig) {
    super();
    this.config = {
      gracefulTerminationTimeout: 5000,
      hangDetectionTimeout: 30000,
      ...config
    };
    
    this.startHealthMonitoring();
  }

  /**
   * Spawn a new Claude process
   */
  async spawnProcess(config: ProcessConfig): Promise<string> {
    // Check process limits
    if (this.processes.size >= this.config.maxProcesses) {
      throw new Error(`Maximum process limit (${this.config.maxProcesses}) exceeded`);
    }

    const processId = this.generateProcessId();
    
    try {
      // Create process info
      const processInfo: ProcessInfo = {
        id: processId,
        command: config.command,
        workingDirectory: config.workingDirectory,
        args: config.args || [],
        status: 'starting',
        startTime: new Date(),
        lastActivity: new Date(),
        pid: 0 // Will be set after spawn
      };

      this.processes.set(processId, processInfo);
      this.emit('process:starting', { processId });

      // Spawn child process
      const childProcess = spawn(config.command, config.args || [], {
        cwd: config.workingDirectory,
        env: { ...process.env, ...config.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (!childProcess.pid) {
        throw new Error('Failed to get process PID');
      }

      // Update process info with PID
      processInfo.pid = childProcess.pid;
      this.childProcesses.set(processId, childProcess);

      // Setup process event handlers
      this.setupProcessHandlers(childProcess, processId);

      return processId;

    } catch (error) {
      // Cleanup on failure
      this.processes.delete(processId);
      this.emit('process:error', { 
        processId, 
        error: error as Error, 
        phase: 'spawn' 
      });
      throw new Error(`Process spawn failed: ${(error as Error).message}`);
    }
  }

  /**
   * Terminate a running process
   */
  async terminateProcess(processId: string): Promise<void> {
    const processInfo = this.processes.get(processId);
    if (!processInfo) {
      throw new Error(`Process not found: ${processId}`);
    }

    const childProcess = this.childProcesses.get(processId);
    if (!childProcess) {
      throw new Error(`Child process not found: ${processId}`);
    }

    // Update status
    processInfo.status = 'stopping';
    
    try {
      // Try graceful termination first
      const killed = childProcess.kill('SIGTERM');
      if (!killed) {
        throw new Error('Failed to send SIGTERM');
      }

      // Wait for graceful termination
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          // Force kill if graceful termination fails
          const forceKilled = childProcess.kill('SIGKILL');
          if (!forceKilled) {
            reject(new Error('Failed to force kill process'));
          }
        }, this.config.gracefulTerminationTimeout);

        childProcess.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });

        childProcess.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

    } catch (error) {
      this.emit('process:error', { 
        processId, 
        error: error as Error, 
        phase: 'runtime' 
      });
      throw error;
    }
  }

  /**
   * Send input to a process
   */
  async sendInput(processId: string, data: string): Promise<void> {
    const processInfo = this.processes.get(processId);
    if (!processInfo) {
      throw new Error(`Process not found: ${processId}`);
    }

    if (processInfo.status === 'stopped' || processInfo.status === 'failed') {
      throw new Error('Cannot send input to terminated process');
    }

    const childProcess = this.childProcesses.get(processId);
    if (!childProcess || !childProcess.stdin) {
      throw new Error('Process stdin not available');
    }

    return new Promise((resolve, reject) => {
      childProcess.stdin!.write(data, 'utf8', (error) => {
        if (error) {
          reject(error);
        } else {
          // Update last activity
          processInfo.lastActivity = new Date();
          resolve();
        }
      });
    });
  }

  /**
   * Get process status
   */
  getProcessStatus(processId: string): ProcessInfo | null {
    return this.processes.get(processId) || null;
  }

  /**
   * List all active processes
   */
  listActiveProcesses(): ProcessInfo[] {
    return Array.from(this.processes.values())
      .filter(p => p.status !== 'stopped' && p.status !== 'failed');
  }

  /**
   * Clean up terminated processes
   */
  cleanupTerminatedProcesses(): void {
    const terminatedProcesses = Array.from(this.processes.entries())
      .filter(([_, info]) => info.status === 'stopped' || info.status === 'failed');

    for (const [processId, _] of terminatedProcesses) {
      this.processes.delete(processId);
      this.childProcesses.delete(processId);
    }
  }

  /**
   * Perform health check on all processes
   */
  performHealthCheck(): void {
    for (const [processId, processInfo] of this.processes.entries()) {
      if (processInfo.status !== 'running') continue;

      // Check if process is still alive
      if (!isProcessAlive(processInfo.pid)) {
        this.handleProcessDeath(processId);
        continue;
      }

      // Check for hangs
      const timeSinceActivity = Date.now() - processInfo.lastActivity.getTime();
      if (timeSinceActivity > this.config.hangDetectionTimeout!) {
        this.emit('process:hang', { 
          processId, 
          lastActivity: processInfo.lastActivity.getTime() 
        });
      }
    }
  }

  /**
   * Enable auto-restart for a process
   */
  enableAutoRestart(processId: string, options: { maxAttempts: number; backoffDelay: number }): void {
    const processInfo = this.processes.get(processId);
    if (!processInfo) {
      throw new Error(`Process not found: ${processId}`);
    }

    processInfo.autoRestart = {
      enabled: true,
      maxAttempts: options.maxAttempts,
      backoffDelay: options.backoffDelay,
      attemptCount: 0
    };
  }

  /**
   * Configuration setters
   */
  setMaxProcesses(max: number): void {
    this.config.maxProcesses = max;
  }

  setGracefulTerminationTimeout(timeout: number): void {
    this.config.gracefulTerminationTimeout = timeout;
  }

  setHangDetectionTimeout(timeout: number): void {
    this.config.hangDetectionTimeout = timeout;
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Terminate all running processes
    const activeProcesses = this.listActiveProcesses();
    const terminationPromises = activeProcesses.map(p => 
      this.terminateProcess(p.id).catch(console.error)
    );

    // Wait for all terminations (with timeout)
    Promise.allSettled(terminationPromises);
  }

  /**
   * Private methods
   */
  private generateProcessId(): string {
    const timestamp = Date.now();
    const counter = ++this.processCounter;
    const random = Math.random().toString(36).substring(2, 10);
    return `proc-${timestamp}-${counter}-${random}`;
  }

  private setupProcessHandlers(childProcess: ChildProcess, processId: string): void {
    const processInfo = this.processes.get(processId)!;

    // Handle stdout
    childProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      processInfo.lastActivity = new Date();
      
      this.emit('process:output', {
        processId,
        stream: 'stdout',
        data: output,
        timestamp: Date.now()
      });

      // Detect Claude ready state (looking for prompt)
      if (output.includes('> ') && processInfo.status === 'starting') {
        processInfo.status = 'running';
        this.emit('process:ready', { processId, pid: processInfo.pid });
      }
    });

    // Handle stderr
    childProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      processInfo.lastActivity = new Date();
      
      this.emit('process:output', {
        processId,
        stream: 'stderr',
        data: output,
        timestamp: Date.now()
      });
    });

    // Handle process exit
    childProcess.on('exit', (code: number | null, signal: string | null) => {
      processInfo.status = 'stopped';
      processInfo.exitCode = code;
      processInfo.exitSignal = signal;
      
      this.emit('process:exit', {
        processId,
        exitCode: code,
        signal,
        timestamp: Date.now()
      });

      // Handle auto-restart if enabled
      if (processInfo.autoRestart?.enabled && code !== 0) {
        this.handleAutoRestart(processId);
      }
    });

    // Handle process errors
    childProcess.on('error', (error: Error) => {
      processInfo.status = 'failed';
      processInfo.error = error.message;
      
      this.emit('process:error', {
        processId,
        error,
        phase: 'runtime'
      });
    });
  }

  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private handleProcessDeath(processId: string): void {
    const processInfo = this.processes.get(processId);
    if (processInfo) {
      processInfo.status = 'failed';
      this.emit('process:death', { processId, pid: processInfo.pid });
    }
  }

  private async handleAutoRestart(processId: string): Promise<void> {
    const processInfo = this.processes.get(processId);
    if (!processInfo?.autoRestart) return;

    const { maxAttempts, backoffDelay, attemptCount } = processInfo.autoRestart;
    
    if (attemptCount >= maxAttempts) {
      processInfo.autoRestart.enabled = false;
      return;
    }

    // Increment attempt count
    processInfo.autoRestart.attemptCount++;

    // Calculate backoff delay (exponential backoff)
    const delay = backoffDelay * Math.pow(2, attemptCount);
    
    setTimeout(async () => {
      try {
        // Attempt to restart the process
        const config: ProcessConfig = {
          command: processInfo.command,
          workingDirectory: processInfo.workingDirectory,
          args: processInfo.args
        };
        
        await this.spawnProcess(config);
      } catch (error) {
        console.error(`Auto-restart failed for process ${processId}:`, error);
      }
    }, delay);
  }
}