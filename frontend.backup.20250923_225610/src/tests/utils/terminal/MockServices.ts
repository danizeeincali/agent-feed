/**
 * Mock Services for Terminal Testing
 * 
 * Specialized mock services that simulate various terminal-related
 * services and external dependencies for comprehensive testing.
 */

import { EventEmitter } from 'events';

// Mock Terminal Services
export class MockProcessIOStreaming extends EventEmitter {
  private activeExecutions = new Map<string, any>();
  private outputBuffer = new Map<string, string>();

  executeCommand(command: string, options: any = {}): any {
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const execution = {
      executionId,
      command,
      status: 'running',
      startTime: Date.now(),
      options,
      
      sendInput: (data: string | Uint8Array) => {
        this.emit('mock_input', { executionId, data });
      },
      
      getOutputBuffer: () => ({
        stdout: this.outputBuffer.get(`${executionId}_stdout`) || '',
        stderr: this.outputBuffer.get(`${executionId}_stderr`) || ''
      }),
      
      getBufferStats: () => ({
        stdoutBytes: (this.outputBuffer.get(`${executionId}_stdout`) || '').length,
        stderrBytes: (this.outputBuffer.get(`${executionId}_stderr`) || '').length,
        totalLines: (this.outputBuffer.get(`${executionId}_stdout`) || '').split('\n').length
      }),
      
      clearBuffer: () => {
        this.outputBuffer.delete(`${executionId}_stdout`);
        this.outputBuffer.delete(`${executionId}_stderr`);
      }
    };

    Object.setPrototypeOf(execution, EventEmitter.prototype);
    EventEmitter.call(execution);

    this.activeExecutions.set(executionId, execution);
    
    // Simulate command completion after delay
    setTimeout(() => {
      this.completeExecution(executionId, 0);
    }, options.simulateDelay || 100);

    return execution;
  }

  simulateOutput(executionId: string, stream: 'stdout' | 'stderr', data: string): void {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return;

    const key = `${executionId}_${stream}`;
    const currentBuffer = this.outputBuffer.get(key) || '';
    this.outputBuffer.set(key, currentBuffer + data);

    execution.emit(stream === 'stdout' ? 'output' : 'error', {
      stream,
      data,
      timestamp: Date.now()
    });
  }

  completeExecution(executionId: string, exitCode: number): void {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return;

    execution.status = exitCode === 0 ? 'completed' : 'failed';
    execution.exitCode = exitCode;
    execution.duration = Date.now() - execution.startTime;

    execution.emit('complete', {
      exitCode,
      duration: execution.duration,
      success: exitCode === 0
    });

    this.activeExecutions.delete(executionId);
  }

  getActiveExecutions(): any[] {
    return Array.from(this.activeExecutions.values());
  }

  async shutdown(): Promise<void> {
    for (const [executionId] of this.activeExecutions) {
      this.completeExecution(executionId, -1);
    }
    this.activeExecutions.clear();
    this.outputBuffer.clear();
  }

  getStatistics() {
    return {
      totalExecutions: this.activeExecutions.size + 10, // Simulate completed ones
      activeExecutions: this.activeExecutions.size,
      completedExecutions: 10,
      averageDuration: 250
    };
  }

  flushInputQueue(): void {
    // Simulate flushing queued input
    this.emit('input_flushed');
  }
}

export class MockClaudeProcessManager extends EventEmitter {
  private isRunning = false;
  private processId: number | null = null;
  private instanceId: string;
  private capabilities: string[];
  private workingDirectory: string;
  private status: string = 'idle';
  private context: any = {};
  private performanceMetrics: any = {
    totalCommands: 0,
    averageExecutionTime: 0,
    memoryUsage: { current: 0 }
  };

  constructor(config: any) {
    super();
    this.instanceId = config.instanceId;
    this.capabilities = config.capabilities || [];
    this.workingDirectory = config.workingDirectory || '/workspace';
  }

  async startInstance(): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90% success rate
          this.isRunning = true;
          this.processId = Math.floor(Math.random() * 99999) + 1000;
          this.status = 'ready';
          resolve();
        } else {
          reject(new Error('Failed to initialize Claude'));
        }
      }, 50);
    });
  }

  async stopInstance(): Promise<void> {
    this.isRunning = false;
    this.processId = null;
    this.status = 'stopped';
  }

  async terminateInstance(): Promise<void> {
    this.isRunning = false;
    this.processId = null;
    this.status = 'terminated';
    this.emit('process_terminated', { signal: 'SIGKILL' });
  }

  executeCommand(command: string, options: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isRunning) {
        reject(new Error('Claude instance not running'));
        return;
      }

      const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.performanceMetrics.totalCommands++;

      const executionTime = Math.floor(Math.random() * 2000) + 100;
      
      setTimeout(() => {
        if (options.timeout && executionTime > options.timeout) {
          reject(new Error('Command execution timeout'));
          return;
        }

        const result = {
          success: true,
          result: this.generateCommandResult(command),
          executionTime,
          requestId
        };

        this.performanceMetrics.averageExecutionTime = 
          (this.performanceMetrics.averageExecutionTime + executionTime) / 2;

        resolve(result);
      }, executionTime);
    });
  }

  private generateCommandResult(command: string): any {
    if (command.includes('analyze')) {
      return {
        type: 'analysis',
        analysis: `Analysis result for: ${command}`,
        suggestions: ['Consider using TypeScript', 'Add error handling'],
        confidence: Math.random()
      };
    } else if (command.includes('file')) {
      return {
        type: 'file_operation',
        fileContent: 'Mock file content',
        filePath: '/workspace/mock-file.js',
        fileSize: 1024
      };
    } else {
      return {
        type: 'general',
        output: `Command executed: ${command}`,
        timestamp: Date.now()
      };
    }
  }

  getInstanceId(): string {
    return this.instanceId;
  }

  getCapabilities(): string[] {
    return [...this.capabilities];
  }

  getWorkingDirectory(): string {
    return this.workingDirectory;
  }

  isRunning(): boolean {
    return this.isRunning;
  }

  getProcessId(): number | null {
    return this.processId;
  }

  getCurrentStatus(): string {
    return this.status;
  }

  updateWorkspaceContext(context: any): void {
    this.context = { ...this.context, ...context };
  }

  getWorkspaceContext(): any {
    return { ...this.context };
  }

  clearContext(): void {
    this.context = {};
  }

  getPerformanceMetrics(): any {
    return { ...this.performanceMetrics };
  }

  startHeartbeat(interval: number): void {
    // Mock heartbeat implementation
    this.emit('heartbeat_started', { interval });
  }

  stopHeartbeat(): void {
    this.emit('heartbeat_stopped');
  }

  enableAutoRestart(enable: boolean): void {
    this.emit('auto_restart_configured', { enabled: enable });
  }

  requiresRestart(): boolean {
    return !this.isRunning && this.status === 'crashed';
  }

  configureCircuitBreaker(config: any): void {
    this.emit('circuit_breaker_configured', config);
  }

  getCircuitBreakerState(): any {
    return {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: null
    };
  }

  respondToPrompt(promptId: string, response: any): void {
    this.emit('prompt_response', { promptId, response });
  }

  getTerminalCommands(): string[] {
    return [
      'claude analyze',
      'claude status',
      'claude help',
      'claude context',
      'claude restart'
    ];
  }

  getCommandHelp(command: string): string {
    const helpMap: Record<string, string> = {
      'claude analyze': 'Analyze code files\nUsage: claude analyze <file>\nExamples: claude analyze main.js',
      'claude status': 'Show Claude instance status\nUsage: claude status',
      'claude help': 'Show available commands\nUsage: claude help [command]'
    };

    return helpMap[command] || 'Command help not available';
  }

  // Simulation methods for testing
  simulateCrash(): void {
    this.isRunning = false;
    this.status = 'crashed';
    this.emit('process_crashed', {
      exitCode: -1,
      signal: 'SIGSEGV',
      error: 'Simulated crash'
    });
  }

  simulateStatusUpdate(status: string, details: any = {}): void {
    this.status = status;
    this.emit('status_update', { status, ...details });
  }

  simulateInsight(insight: any): void {
    this.emit('insight', insight);
  }

  simulateError(error: any): void {
    this.emit('error', error);
  }

  simulateResourceUsage(metrics: any): void {
    this.emit('resource_usage', metrics);
  }

  simulatePerformanceWarning(warning: any): void {
    this.emit('performance_warning', warning);
  }
}

export class MockTerminalErrorHandler extends EventEmitter {
  private errorHistory: any[] = [];
  private circuitBreaker = { isOpen: false, failureCount: 0 };
  private recoveryStrategies = new Map<string, any>();

  async handleError(error: any): Promise<any> {
    this.errorHistory.push({ error, timestamp: Date.now() });
    this.emit('error_handled', error);

    // Simulate different recovery strategies based on error type
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      this.circuitBreaker.failureCount++;
      
      if (this.circuitBreaker.failureCount >= 5) {
        this.circuitBreaker.isOpen = true;
        return {
          action: 'fail',
          reason: 'circuit_breaker_open'
        };
      }

      return {
        action: 'retry',
        delay: 1000 * Math.pow(2, this.circuitBreaker.failureCount - 1),
        maxRetries: 3
      };
    }

    if (error.code === 'ENOMEM') {
      return {
        action: 'cleanup_and_retry',
        cleanupActions: ['clear_output_buffer', 'garbage_collect']
      };
    }

    return {
      action: 'log_and_continue',
      severity: 'low'
    };
  }

  recordError(error: any, timestamp?: number): void {
    this.errorHistory.push({
      error,
      timestamp: timestamp || Date.now()
    });
  }

  getCircuitBreakerState(): any {
    return { ...this.circuitBreaker };
  }

  analyzeErrorPatterns(): any {
    const errorCounts = new Map<string, number>();
    
    this.errorHistory.forEach(({ error }) => {
      const count = errorCounts.get(error.code) || 0;
      errorCounts.set(error.code, count + 1);
    });

    const mostCommon = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    return {
      mostCommon: mostCommon ? {
        code: mostCommon[0],
        frequency: mostCommon[1]
      } : null,
      recentTrend: 'increasing',
      suggestions: ['check_network_configuration', 'increase_timeout']
    };
  }

  getErrorCorrelation(): any {
    return {
      clustered: this.errorHistory.length > 2,
      rootCause: 'network_connectivity',
      confidence: 0.85,
      recommendedAction: 'check_network_infrastructure'
    };
  }

  registerRecoveryStrategy(strategy: any): void {
    this.recoveryStrategies.set(strategy.name, strategy);
  }

  handleMalformedMessage(message: string): any {
    this.emit('malformed_message', { message });
    return {
      handled: true,
      error: 'malformed message detected'
    };
  }

  handleUnexpectedMessage(message: any): any {
    this.emit('unexpected_message', { message });
    return {
      handled: true,
      messageType: message.type
    };
  }

  getMessageReorderer(): any {
    const messages: any[] = [];
    
    return {
      addMessage: (msg: any) => {
        messages.push(msg);
      },
      getOrderedMessages: () => {
        return messages.sort((a, b) => a.id - b.id);
      }
    };
  }

  getBufferManager(): any {
    const maxSize = 1024 * 1024; // 1MB
    let currentSize = 0;

    return {
      addData: (data: string) => {
        if (data.length > maxSize) {
          return {
            added: false,
            reason: 'buffer_limit_exceeded'
          };
        }
        currentSize += data.length;
        return { added: true };
      },
      getMaxSize: () => maxSize,
      getCurrentSize: () => currentSize
    };
  }

  getTextProcessor(): any {
    return {
      processText: (text: string) => ({
        valid: true,
        text,
        encoding: 'utf-8',
        warnings: []
      }),
      
      processBinaryData: (data: Uint8Array) => ({
        valid: false,
        error: 'invalid_utf8',
        data
      })
    };
  }

  getMessageProcessor(): any {
    const processedMessages: any[] = [];
    
    return {
      processMessage: async (message: any) => {
        processedMessages.push(message);
        return { processed: true, messageId: message.id };
      },
      getProcessedMessageOrder: () => processedMessages.map(m => m.id)
    };
  }

  getCommandExecutor(): any {
    const activeCommands = new Set<string>();
    
    return {
      execute: async (command: string) => {
        activeCommands.add(command);
        
        // Simulate execution
        await new Promise(resolve => setTimeout(resolve, 10));
        
        activeCommands.delete(command);
        return { success: true, command };
      },
      getActiveCommands: () => Array.from(activeCommands)
    };
  }

  getNumberValidator(): any {
    return {
      validate: (num: number) => {
        if (Number.isNaN(num)) {
          return { valid: false, error: 'nan_detected' };
        }
        if (!Number.isFinite(num)) {
          return { valid: false, error: 'infinite_value' };
        }
        return { valid: true };
      }
    };
  }

  getValueValidator(): any {
    return {
      validate: (value: any) => ({
        valid: value != null,
        type: typeof value,
        isEmpty: value === '' || value === null || value === undefined
      })
    };
  }

  getSizeValidator(): any {
    return {
      validateArray: (arr: any[]) => ({
        oversized: arr.length > 50000,
        actualSize: arr.length
      }),
      validateObject: (obj: any) => ({
        oversized: Object.keys(obj).length > 5000,
        keyCount: Object.keys(obj).length
      })
    };
  }

  getCascadeAnalysis(): any {
    return {
      detected: this.errorHistory.length > 3,
      primaryError: this.errorHistory[0]?.error || null,
      cascadeDepth: Math.max(0, this.errorHistory.length - 1)
    };
  }

  handleFeatureDegradation(feature: string, error: any): void {
    this.emit('feature_degraded', { feature, error });
  }

  getSystemStatus(): any {
    return {
      operationalLevel: 'degraded',
      availableFeatures: [],
      fallbackModes: ['basic_terminal']
    };
  }

  getRetainedErrorCount(): number {
    return Math.min(this.errorHistory.length, 100); // Simulate cleanup
  }

  // Utility methods for testing
  reset(): void {
    this.errorHistory = [];
    this.circuitBreaker = { isOpen: false, failureCount: 0 };
    this.recoveryStrategies.clear();
  }

  simulateCircuitBreakerReset(): void {
    this.circuitBreaker = { isOpen: false, failureCount: 0 };
    this.emit('circuit_breaker_reset');
  }
}

export class MockTerminalConnectionManager extends EventEmitter {
  private state: string = 'disconnected';
  private invalidTransitions: any[] = [];
  private heartbeatInterval: number = 30000;
  private connectionTimeout: number = 10000;

  constructor(config: any) {
    super();
    this.heartbeatInterval = config.heartbeatInterval || 30000;
    this.connectionTimeout = config.connectionTimeout || 10000;
  }

  setState(newState: string): void {
    const validTransitions = this.getValidTransitions(this.state);
    
    if (!validTransitions.includes(newState)) {
      this.invalidTransitions.push({
        from: this.state,
        to: newState,
        timestamp: Date.now()
      });
      return;
    }

    const oldState = this.state;
    this.state = newState;
    this.emit('state_changed', { from: oldState, to: newState });
  }

  getState(): string {
    return this.state;
  }

  getInvalidTransitions(): any[] {
    return [...this.invalidTransitions];
  }

  private getValidTransitions(currentState: string): string[] {
    const transitionMap: Record<string, string[]> = {
      'disconnected': ['connecting'],
      'connecting': ['connected', 'disconnected'],
      'connected': ['disconnecting'],
      'disconnecting': ['disconnected']
    };

    return transitionMap[currentState] || [];
  }

  async handleConnectivityChange(isOnline: boolean): Promise<void> {
    this.emit('connectivity_change', { online: isOnline });
    
    if (isOnline) {
      // Simulate reconnection logic
      setTimeout(() => {
        this.setState('connecting');
        setTimeout(() => this.setState('connected'), 100);
      }, 50);
    } else {
      this.setState('disconnected');
    }
  }

  // Utility methods for testing
  reset(): void {
    this.state = 'disconnected';
    this.invalidTransitions = [];
  }
}

// Factory function for creating all mock services
export function createMockTerminalServices() {
  return {
    processIOStreaming: () => new MockProcessIOStreaming(),
    claudeProcessManager: (config: any) => new MockClaudeProcessManager(config),
    errorHandler: () => new MockTerminalErrorHandler(),
    connectionManager: (config: any) => new MockTerminalConnectionManager(config)
  };
}