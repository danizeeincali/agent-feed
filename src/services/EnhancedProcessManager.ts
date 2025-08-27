/**
 * Enhanced ProcessManager with NLD Integration
 * Real process spawning with comprehensive failure detection and pattern analysis
 */

import { ProcessManager, ProcessConfig, ProcessInfo } from './ProcessManager';
import { nldProcessMonitor, ProcessFailurePattern } from './NLDProcessHealthMonitor';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

export class EnhancedProcessManager extends ProcessManager {
  private instanceId: string;
  private nldIntegrated: boolean = true;
  private currentInstanceId: string | null = null;

  constructor(instanceId?: string) {
    super();
    this.instanceId = instanceId || `claude-${Date.now()}`;
    this.setupNLDIntegration();
  }

  /**
   * Setup NLD integration
   */
  private setupNLDIntegration(): void {
    // Listen to NLD alerts
    nldProcessMonitor.on('nld:alert', (alert) => {
      if (alert.instanceId === this.instanceId) {
        this.handleNLDAlert(alert);
      }
    });

    // Listen to process events
    nldProcessMonitor.on('process:exit', (data) => {
      if (data.instanceId === this.instanceId) {
        this.emit('nld:process:exit', data);
      }
    });

    nldProcessMonitor.on('spawn:success', (data) => {
      if (data.instanceId === this.instanceId) {
        this.emit('nld:spawn:success', data);
      }
    });
  }

  /**
   * Handle NLD alerts with automated responses
   */
  private handleNLDAlert(alert: any): void {
    this.emit('nld:alert', alert);
    
    switch (alert.pattern) {
      case ProcessFailurePattern.PROCESS_SPAWN_FAILURE_V1:
        this.handleSpawnFailure(alert);
        break;
      case ProcessFailurePattern.PROCESS_LIFECYCLE_DESYNC_V1:
        this.handleLifecycleDesync(alert);
        break;
      case ProcessFailurePattern.IO_PIPE_COMMUNICATION_BREAK_V1:
        this.handleIOFailure(alert);
        break;
      case ProcessFailurePattern.PROCESS_RESOURCE_LEAK_V1:
        this.handleResourceLeak(alert);
        break;
    }
  }

  /**
   * Enhanced launch instance with NLD monitoring
   */
  async launchInstance(config?: Partial<ProcessConfig>): Promise<ProcessInfo> {
    try {
      // Update configuration
      if (config) {
        this.updateConfig(config);
      }

      // Kill existing instance if running
      if (this.currentProcess) {
        await this.killInstance();
      }

      this.loadInstanceName();
      this.currentInstanceId = this.instanceId;

      // Build command arguments with validation
      const args = this.buildClaudeArguments();
      const workingDir = this.getWorkingDirectory();
      
      console.log(`[EnhancedProcessManager] Launching Claude with NLD monitoring`);
      console.log(`[EnhancedProcessManager] Instance ID: ${this.instanceId}`);
      console.log(`[EnhancedProcessManager] Args: ${JSON.stringify(args)}`);
      console.log(`[EnhancedProcessManager] Working Directory: ${workingDir}`);

      // Use NLD monitored spawning
      const claudeProcess = await nldProcessMonitor.spawnClaudeWithFallback(
        this.instanceId,
        'claude',
        args,
        {
          cwd: workingDir,
          env: {
            ...process.env,
            CLAUDE_INSTANCE_NAME: this.getInstanceName(),
            CLAUDE_MANAGED_INSTANCE: 'true',
            CLAUDE_HUB_URL: 'http://localhost:3002'
          },
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: false
        }
      );

      // Store process reference
      this.currentProcess = claudeProcess;
      this.currentPid = claudeProcess.pid || null;
      this.startTime = new Date();

      // Setup event handlers (delegated to NLD monitor)
      this.setupEventHandlers(claudeProcess);

      // Setup auto-restart if configured
      if (this.config.autoRestartHours > 0) {
        this.setupAutoRestart(this.config.autoRestartHours);
      }

      const info = this.getProcessInfo();
      this.emit('launched', info);
      
      return info;

    } catch (error) {
      const errorMessage = `Failed to launch Claude instance: ${error.message}`;
      console.error(`[EnhancedProcessManager] ${errorMessage}`);
      
      this.emit('error', error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Build Claude command arguments based on configuration
   */
  private buildClaudeArguments(): string[] {
    const args: string[] = [];
    
    // Add environment-specific flags
    if (this.config.environment === 'production') {
      args.push('--dangerously-skip-permissions');
    }
    
    return args;
  }

  /**
   * Get working directory with validation
   */
  private getWorkingDirectory(): string {
    const workingDir = this.config.workingDirectory;
    
    // Validate directory exists
    if (!fs.existsSync(workingDir)) {
      throw new Error(`Working directory does not exist: ${workingDir}`);
    }
    
    return workingDir;
  }

  /**
   * Setup event handlers with NLD integration
   */
  private setupEventHandlers(process: ChildProcess): void {
    // Output handling with NLD monitoring
    process.stdout?.on('data', (data) => {
      const output = data.toString();
      this.emit('output', output);
      this.emit('terminal:output', {
        type: 'stdout',
        data: output,
        timestamp: new Date()
      });
      
      // Record with NLD monitor
      // NLD monitor handles this automatically through attached listeners
    });

    process.stderr?.on('data', (data) => {
      const output = data.toString();
      this.emit('error-output', output);
      this.emit('terminal:output', {
        type: 'stderr',
        data: output,
        timestamp: new Date()
      });
    });

    // Exit handling
    process.on('exit', (code, signal) => {
      console.log(`[EnhancedProcessManager] Claude process exited: code=${code}, signal=${signal}`);
      this.emit('exit', { code, signal });
      this.currentProcess = null;
      this.currentPid = null;
      this.currentInstanceId = null;
      
      // Auto-restart logic
      if (this.autoRestartTimer && code !== 0) {
        console.log('[EnhancedProcessManager] Scheduling auto-restart due to unexpected exit');
        this.emit('auto-restart-scheduled');
      }
    });

    // Error handling
    process.on('error', (error) => {
      console.error('[EnhancedProcessManager] Process error:', error.message);
      this.emit('error', error);
    });
  }

  /**
   * Enhanced input sending with monitoring
   */
  sendInput(input: string): void {
    if (this.currentProcess && this.currentProcess.stdin) {
      this.currentProcess.stdin.write(input);
      this.emit('input', input);
      
      // Record input with NLD monitor
      if (this.currentInstanceId) {
        nldProcessMonitor.recordInput(this.currentInstanceId, input);
      }
    }
  }

  /**
   * Handle spawn failure pattern
   */
  private handleSpawnFailure(alert: any): void {
    console.error(`[NLD] Spawn failure detected:`, alert.context);
    
    // Implement automatic retry logic
    if (alert.context.phase !== 'fallback') {
      setTimeout(() => {
        console.log('[NLD] Attempting spawn retry after failure...');
        this.launchInstance().catch(error => {
          console.error('[NLD] Retry failed:', error.message);
        });
      }, 5000);
    }
  }

  /**
   * Handle lifecycle desynchronization
   */
  private handleLifecycleDesync(alert: any): void {
    console.warn(`[NLD] Lifecycle desync detected:`, alert.context);
    
    // Force refresh process info
    if (this.currentProcess && alert.context.actualStatus === 'stopped') {
      console.log('[NLD] Marking process as stopped due to desync');
      this.currentProcess = null;
      this.currentPid = null;
      this.emit('desync:stopped');
    }
  }

  /**
   * Handle I/O communication failure
   */
  private handleIOFailure(alert: any): void {
    console.warn(`[NLD] I/O communication issue:`, alert.context);
    
    // Attempt to restart I/O streams
    this.emit('io:failure', alert.context);
  }

  /**
   * Handle resource leak detection
   */
  private handleResourceLeak(alert: any): void {
    console.warn(`[NLD] Resource leak detected:`, alert.context);
    
    // Trigger cleanup if severe
    if (alert.severity === 'high' || alert.severity === 'critical') {
      console.log('[NLD] Triggering cleanup due to resource leak');
      this.emit('resource:cleanup-required', alert.context);
    }
  }

  /**
   * Get enhanced process info with NLD metrics
   */
  getEnhancedProcessInfo(): any {
    const basicInfo = this.getProcessInfo();
    
    if (this.currentInstanceId) {
      const nldMetrics = nldProcessMonitor.getProcessMetrics(this.currentInstanceId);
      return {
        ...basicInfo,
        instanceId: this.instanceId,
        nld: {
          monitoring: true,
          metrics: nldMetrics,
          alertCount: nldProcessMonitor.getAlertHistory().filter(
            alert => alert.instanceId === this.instanceId
          ).length
        }
      };
    }
    
    return {
      ...basicInfo,
      instanceId: this.instanceId,
      nld: {
        monitoring: false
      }
    };
  }

  /**
   * Get NLD health report for this instance
   */
  getNLDHealthReport(): any {
    if (this.currentInstanceId) {
      const metrics = nldProcessMonitor.getProcessMetrics(this.currentInstanceId);
      const alerts = nldProcessMonitor.getAlertHistory().filter(
        alert => alert.instanceId === this.instanceId
      );
      
      return {
        instanceId: this.instanceId,
        currentMetrics: metrics,
        alertHistory: alerts,
        healthStatus: this.determineHealthStatus(metrics, alerts)
      };
    }
    
    return { instanceId: this.instanceId, status: 'not-monitored' };
  }

  /**
   * Determine overall health status
   */
  private determineHealthStatus(metrics: any, alerts: any[]): string {
    if (!metrics) return 'unknown';
    
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const highAlerts = alerts.filter(a => a.severity === 'high').length;
    
    if (criticalAlerts > 0) return 'critical';
    if (highAlerts > 2) return 'degraded';
    if (metrics.status === 'running') return 'healthy';
    
    return 'unknown';
  }

  /**
   * Cleanup with NLD integration
   */
  async cleanup(): Promise<void> {
    if (this.currentInstanceId) {
      nldProcessMonitor.unregisterProcess(this.currentInstanceId);
    }
    
    await super.cleanup();
  }
}

// Export enhanced singleton
export const enhancedProcessManager = new EnhancedProcessManager();
