/**
 * ProcessManager Service
 * 
 * Manages Claude instance lifecycle with terminal control,
 * auto-restart functionality, and WebSocket communication.
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';

export interface ProcessConfig {
  autoRestartHours: number;
  workingDirectory: string;
  resumeOnRestart: boolean;
  agentLinkEnabled: boolean;
  environment?: string;
}

export interface ProcessInfo {
  pid: number | null;
  name: string;
  status: 'running' | 'stopped' | 'restarting' | 'error';
  startTime: Date | null;
  autoRestartEnabled: boolean;
  autoRestartHours: number;
}

export class ProcessManager extends EventEmitter {
  private currentProcess: ChildProcess | null = null;
  private currentPid: number | null = null;
  private autoRestartTimer: NodeJS.Timeout | null = null;
  /**
   * Configuration with environment-aware working directory
   * Resolves from: WORKSPACE_ROOT/prod > cwd/prod
   */
  private config: ProcessConfig = {
    autoRestartHours: 6,
    workingDirectory: process.env.WORKSPACE_ROOT
      ? path.join(process.env.WORKSPACE_ROOT, 'prod')
      : path.join(process.cwd(), 'prod'),
    resumeOnRestart: true,
    agentLinkEnabled: true
  };
  private startTime: Date | null = null;
  private instanceName: string = '';

  constructor() {
    super();
    this.loadInstanceName();
  }

  /**
   * Load instance name from CLAUDE.md + timestamp
   */
  private loadInstanceName(): void {
    try {
      const claudeMdPath = path.join(this.config.workingDirectory, 'CLAUDE.md');
      if (fs.existsSync(claudeMdPath)) {
        const content = fs.readFileSync(claudeMdPath, 'utf-8');
        const match = content.match(/^#\s*(.+)$/m);
        const baseName = match ? match[1].trim() : 'Claude Instance';
        const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
        this.instanceName = `${baseName} - ${timestamp}`;
      } else {
        this.instanceName = `Claude Instance - ${new Date().toISOString()}`;
      }
    } catch (error) {
      this.instanceName = `Claude Instance - ${new Date().toISOString()}`;
    }
  }

  /**
   * Launch a new Claude instance
   */
  async launchInstance(config?: Partial<ProcessConfig>): Promise<ProcessInfo> {
    // Update configuration
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Kill existing instance if running
    if (this.currentProcess) {
      await this.killInstance();
    }

    // Load fresh instance name
    this.loadInstanceName();

    return new Promise((resolve, reject) => {
      try {
        // Build command arguments - Fixed: Use correct Claude flags
        const args: string[] = [];
        
        // Add the --dangerously-skip-permissions flag for production environment
        if (this.config.environment === 'production') {
          args.push('--dangerously-skip-permissions');
        }
        
        console.log('[ProcessManager] Launching Claude with args:', args);
        console.log('[ProcessManager] Working directory:', this.config.workingDirectory);

        // Spawn Claude process with corrected configuration
        this.currentProcess = spawn('claude', args, {
          cwd: this.config.workingDirectory,
          env: {
            ...process.env,
            CLAUDE_INSTANCE_NAME: this.instanceName,
            CLAUDE_MANAGED_INSTANCE: 'true',
            CLAUDE_HUB_URL: 'http://localhost:3002'
          },
          stdio: ['pipe', 'pipe', 'pipe'], // Ensure we can capture output
          shell: false // Use direct spawn for better control
        });

        this.currentPid = this.currentProcess.pid || null;
        this.startTime = new Date();

        // Handle process output
        this.currentProcess.stdout?.on('data', (data) => {
          this.emit('output', data.toString());
          this.emit('terminal:output', {
            type: 'stdout',
            data: data.toString(),
            timestamp: new Date()
          });
        });

        this.currentProcess.stderr?.on('data', (data) => {
          this.emit('error-output', data.toString());
          this.emit('terminal:output', {
            type: 'stderr',
            data: data.toString(),
            timestamp: new Date()
          });
        });

        // Handle process exit with better logging
        this.currentProcess.on('exit', (code, signal) => {
          console.log(`ProcessManager: Claude process exited with code=${code}, signal=${signal}`);
          this.emit('exit', { code, signal });
          this.currentProcess = null;
          this.currentPid = null;
          
          // If auto-restart is enabled and this wasn't a manual kill
          if (this.autoRestartTimer && code !== 0) {
            console.log('ProcessManager: Scheduling auto-restart due to unexpected exit');
            this.emit('auto-restart-scheduled');
          }
        });

        // Handle process errors with better logging
        this.currentProcess.on('error', (error) => {
          console.error('ProcessManager: Claude spawn error:', error.message);
          this.emit('error', error);
          reject(new Error(`Failed to spawn Claude process: ${error.message}`));
        });

        // Wait for process to be ready with improved validation
        setTimeout(() => {
          if (this.currentPid && this.currentProcess) {
            console.log(`ProcessManager: Claude instance launched successfully with PID ${this.currentPid}`);
            
            // Setup auto-restart if configured
            if (this.config.autoRestartHours > 0) {
              this.setupAutoRestart(this.config.autoRestartHours);
            }

            const info = this.getProcessInfo();
            this.emit('launched', info);
            resolve(info);
          } else {
            const error = new Error('Claude instance failed to start - process may have exited immediately');
            console.error('ProcessManager:', error.message);
            reject(error);
          }
        }, 2000); // Increased timeout for better reliability

      } catch (error) {
        this.emit('error', error);
        reject(error);
      }
    });
  }

  /**
   * Kill the current instance
   */
  async killInstance(): Promise<void> {
    return new Promise((resolve) => {
      if (this.autoRestartTimer) {
        clearTimeout(this.autoRestartTimer);
        this.autoRestartTimer = null;
      }

      if (!this.currentProcess) {
        resolve();
        return;
      }

      const pid = this.currentPid;
      
      // Set up exit handler
      const exitHandler = () => {
        this.currentProcess = null;
        this.currentPid = null;
        this.startTime = null;
        this.emit('killed', { pid });
        resolve();
      };

      this.currentProcess.once('exit', exitHandler);

      // Try graceful shutdown first
      this.currentProcess.kill('SIGTERM');

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (this.currentProcess) {
          this.currentProcess.kill('SIGKILL');
        }
      }, 5000);
    });
  }

  /**
   * Restart the instance
   */
  async restartInstance(): Promise<ProcessInfo> {
    this.emit('restarting');
    await this.killInstance();
    return this.launchInstance();
  }

  /**
   * Setup auto-restart timer
   */
  setupAutoRestart(hours: number): void {
    // Clear existing timer
    if (this.autoRestartTimer) {
      clearTimeout(this.autoRestartTimer);
    }

    if (hours <= 0) {
      this.autoRestartTimer = null;
      return;
    }

    const milliseconds = hours * 60 * 60 * 1000;
    
    this.autoRestartTimer = setTimeout(async () => {
      this.emit('auto-restart-triggered');
      await this.restartInstance();
    }, milliseconds);

    this.config.autoRestartHours = hours;
    this.emit('auto-restart-configured', { hours, nextRestart: new Date(Date.now() + milliseconds) });
  }

  /**
   * Send input to the process
   */
  sendInput(input: string): void {
    if (this.currentProcess && this.currentProcess.stdin) {
      this.currentProcess.stdin.write(input);
      this.emit('input', input);
    }
  }

  /**
   * Get current process information
   */
  getProcessInfo(): ProcessInfo {
    return {
      pid: this.currentPid,
      name: this.instanceName,
      status: this.currentProcess ? 'running' : 'stopped',
      startTime: this.startTime,
      autoRestartEnabled: this.autoRestartTimer !== null,
      autoRestartHours: this.config.autoRestartHours
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ProcessConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update auto-restart if hours changed
    if (config.autoRestartHours !== undefined) {
      this.setupAutoRestart(config.autoRestartHours);
    }
  }

  /**
   * Cleanup on shutdown
   */
  async cleanup(): Promise<void> {
    if (this.autoRestartTimer) {
      clearTimeout(this.autoRestartTimer);
    }
    await this.killInstance();
  }
}

// Singleton instance
export const processManager = new ProcessManager();

// Cleanup on process exit
process.on('SIGINT', async () => {
  await processManager.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await processManager.cleanup();
  process.exit(0);
});