/**
 * Simple Process Manager for Claude Code Launcher
 * No social features, no users - just process lifecycle management
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface ProcessStatus {
  isRunning: boolean;
  pid?: number;
  status: 'stopped' | 'running' | 'error' | 'starting';
  error?: string;
  startedAt?: Date;
  workingDirectory?: string;
}

export class SimpleProcessManager {
  private process: ChildProcess | null = null;
  private status: ProcessStatus = { isRunning: false, status: 'stopped' };
  private readonly prodPath: string;

  constructor() {
    this.prodPath = path.resolve(process.cwd(), 'prod');
    this.ensureProdDirectory();
  }

  private ensureProdDirectory(): void {
    if (!fs.existsSync(this.prodPath)) {
      fs.mkdirSync(this.prodPath, { recursive: true });
    }
  }

  /**
   * Launch Claude Code instance in /prod directory
   */
  async launchClaude(): Promise<ProcessStatus> {
    try {
      if (this.process && !this.process.killed) {
        return { ...this.status, error: 'Process already running' };
      }

      this.status = { isRunning: false, status: 'starting' };

      // Check if Claude Code is available
      const claudeCommand = 'claude';
      const claudeArgs = ['--version']; // Test command

      // Spawn Claude Code process in /prod directory
      this.process = spawn(claudeCommand, claudeArgs, {
        cwd: this.prodPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
        shell: true
      });

      if (!this.process.pid) {
        throw new Error('Failed to spawn Claude process');
      }

      this.status = {
        isRunning: true,
        status: 'running',
        pid: this.process.pid,
        startedAt: new Date(),
        workingDirectory: this.prodPath
      };

      // Handle process events
      this.process.on('error', (error) => {
        this.status = {
          isRunning: false,
          status: 'error',
          error: error.message
        };
      });

      this.process.on('exit', (code, signal) => {
        this.status = {
          isRunning: false,
          status: code === 0 ? 'stopped' : 'error',
          error: code !== 0 ? `Process exited with code ${code}` : undefined
        };
        this.process = null;
      });

      return this.status;

    } catch (error) {
      this.status = {
        isRunning: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      return this.status;
    }
  }

  /**
   * Stop the Claude process
   */
  async stopClaude(): Promise<ProcessStatus> {
    try {
      if (!this.process || this.process.killed) {
        this.status = { isRunning: false, status: 'stopped' };
        return this.status;
      }

      // Graceful shutdown
      this.process.kill('SIGTERM');
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);

      this.status = { isRunning: false, status: 'stopped' };
      this.process = null;
      
      return this.status;

    } catch (error) {
      this.status = {
        isRunning: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Error stopping process'
      };
      return this.status;
    }
  }

  /**
   * Get current process status
   */
  getStatus(): ProcessStatus {
    // Double-check if process is actually running
    if (this.process && this.process.killed) {
      this.status = { isRunning: false, status: 'stopped' };
      this.process = null;
    }
    
    return this.status;
  }

  /**
   * Check if Claude Code is available on system
   */
  async isClaudeAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const testProcess = spawn('claude', ['--version'], { shell: true });
      
      testProcess.on('error', () => resolve(false));
      testProcess.on('exit', (code) => resolve(code === 0));
      
      // Timeout after 3 seconds
      setTimeout(() => {
        testProcess.kill();
        resolve(false);
      }, 3000);
    });
  }

  /**
   * Get process working directory
   */
  getWorkingDirectory(): string {
    return this.prodPath;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.process && !this.process.killed) {
      this.process.kill('SIGKILL');
    }
    this.process = null;
    this.status = { isRunning: false, status: 'stopped' };
  }
}