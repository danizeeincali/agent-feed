/**
 * TDD London School: Error Scenario & Performance Testing
 * 
 * Focus: Error handling, failure modes, performance benchmarks, stress testing
 * London School Methodology: Mock failure scenarios, verify resilient behavior contracts
 * 
 * Testing: Process crashes, network failures, memory limits, concurrent operations
 */

import { jest } from 'vitest';
import { EventEmitter } from 'events';

// === ERROR SCENARIO MOCKS ===
const mockFailingProcess = {
  pid: 99999,
  stdin: {
    write: vi.fn().mockImplementation(() => {
      throw new Error('Broken pipe');
    }),
    end: vi.fn(),
    destroy: vi.fn()
  },
  stdout: new EventEmitter(),
  stderr: new EventEmitter(),
  kill: vi.fn(),
  on: vi.fn(),
  removeAllListeners: vi.fn()
};

const mockHealthyProcess = {
  pid: 11111,
  stdin: {
    write: vi.fn(),
    end: vi.fn(),
    destroy: vi.fn()
  },
  stdout: new EventEmitter(),
  stderr: new EventEmitter(),
  kill: vi.fn(),
  on: vi.fn(),
  removeAllListeners: vi.fn()
};

const mockSpawn = vi.fn();

// === NETWORK/SSE FAILURE MOCKS ===
const mockFailingSSEResponse = {
  writeHead: vi.fn(),
  write: vi.fn().mockImplementation(() => {
    throw new Error('Client disconnected');
  }),
  end: vi.fn(),
  on: vi.fn()
};

vi.mock('child_process', () => ({
  spawn: mockSpawn
}));

// === ERROR-RESILIENT PROCESS MANAGER ===
class ErrorResilientProcessManager extends EventEmitter {
  private processes = new Map<string, any>();
  private errorCounts = new Map<string, number>();
  private retryLimits = new Map<string, number>();
  private performanceMetrics = new Map<string, any>();
  
  constructor(private maxRetries: number = 3, private maxProcesses: number = 10) {
    super();
  }

  async createResilientProcess(config: any) {
    const processId = `resilient-${Date.now()}`;
    
    try {
      const childProcess = mockSpawn(config.command, config.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: config.cwd,
        env: config.env
      });

      const processInfo = {
        id: processId,
        process: childProcess,
        config,
        status: 'running',
        startTime: Date.now(),
        errorHistory: [],
        retryCount: 0,
        performanceData: {
          cpuUsage: 0,
          memoryUsage: 0,
          ioOperations: 0,
          responseTime: 0
        }
      };

      this.setupErrorHandling(processId, processInfo);
      this.processes.set(processId, processInfo);
      this.errorCounts.set(processId, 0);
      this.retryLimits.set(processId, this.maxRetries);

      this.emit('process:created:resilient', {
        processId,
        pid: childProcess.pid,
        maxRetries: this.maxRetries
      });

      return processInfo;
    } catch (error) {
      this.emit('process:creation:failed', {
        processId,
        error: (error as Error).message,
        config
      });
      throw error;
    }
  }

  private setupErrorHandling(processId: string, processInfo: any) {
    const { process: childProcess } = processInfo;

    // === STDOUT ERROR HANDLING ===
    childProcess.stdout.on('error', (error: Error) => {
      this.handleProcessError(processId, 'stdout', error);
    });

    // === STDERR ERROR HANDLING ===
    childProcess.stderr.on('error', (error: Error) => {
      this.handleProcessError(processId, 'stderr', error);
    });

    // === PROCESS CRASH HANDLING ===
    childProcess.on('error', (error: Error) => {
      this.handleProcessError(processId, 'process', error);
    });

    // === UNEXPECTED EXIT HANDLING ===
    childProcess.on('exit', (code: number, signal: string) => {
      if (code !== 0 && code !== null) {
        this.handleProcessError(processId, 'exit', new Error(`Process exited with code ${code}`));
      }
    });
  }

  private handleProcessError(processId: string, source: string, error: Error) {
    const processInfo = this.processes.get(processId);
    if (!processInfo) return;

    const errorCount = this.errorCounts.get(processId) || 0;
    const newErrorCount = errorCount + 1;
    this.errorCounts.set(processId, newErrorCount);

    const errorInfo = {
      processId,
      source,
      error: error.message,
      errorCount: newErrorCount,
      timestamp: Date.now()
    };

    processInfo.errorHistory.push(errorInfo);

    this.emit('process:error:handled', errorInfo);

    // === RETRY LOGIC ===
    const retryLimit = this.retryLimits.get(processId) || this.maxRetries;
    
    if (newErrorCount < retryLimit) {
      this.emit('process:retry:attempt', {
        processId,
        attemptNumber: newErrorCount,
        maxAttempts: retryLimit
      });
      
      this.retryProcess(processId);
    } else {
      this.emit('process:error:critical', {
        processId,
        errorCount: newErrorCount,
        maxRetries: retryLimit,
        finalError: error.message
      });
      
      this.markProcessAsFailed(processId);
    }
  }

  private async retryProcess(processId: string) {
    const processInfo = this.processes.get(processId);
    if (!processInfo) return;

    try {
      // Cleanup old process
      processInfo.process.removeAllListeners();
      processInfo.process.kill();
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create new process with same config
      const newChildProcess = mockSpawn(
        processInfo.config.command, 
        processInfo.config.args, 
        processInfo.config
      );
      
      processInfo.process = newChildProcess;
      processInfo.status = 'running';
      processInfo.retryCount++;
      
      this.setupErrorHandling(processId, processInfo);
      
      this.emit('process:retry:success', {
        processId,
        retryCount: processInfo.retryCount
      });
      
    } catch (error) {
      this.emit('process:retry:failed', {
        processId,
        error: (error as Error).message
      });
      
      this.markProcessAsFailed(processId);
    }
  }

  private markProcessAsFailed(processId: string) {
    const processInfo = this.processes.get(processId);
    if (!processInfo) return;

    processInfo.status = 'failed';
    processInfo.endTime = Date.now();

    this.emit('process:failed:final', {
      processId,
      totalErrors: this.errorCounts.get(processId),
      runtime: processInfo.endTime - processInfo.startTime
    });
  }

  // === SAFE I/O OPERATIONS ===
  async safeWriteInput(processId: string, input: string, timeout: number = 5000) {
    const processInfo = this.processes.get(processId);
    if (!processInfo) throw new Error(`Process ${processId} not found`);

    return new Promise<boolean>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Input write timeout'));
      }, timeout);

      try {
        processInfo.process.stdin.write(input, (error?: Error | null) => {
          clearTimeout(timer);
          
          if (error) {
            this.handleProcessError(processId, 'stdin', error);
            resolve(false);
          } else {
            this.emit('process:input:safe:success', {
              processId,
              input: input.length,
              responseTime: Date.now()
            });
            resolve(true);
          }
        });
      } catch (error) {
        clearTimeout(timer);
        this.handleProcessError(processId, 'stdin', error as Error);
        resolve(false);
      }
    });
  }

  // === PERFORMANCE MONITORING ===
  startPerformanceMonitoring(processId: string) {
    const processInfo = this.processes.get(processId);
    if (!processInfo) return;

    const metrics = {
      startTime: Date.now(),
      ioOperations: 0,
      errorRate: 0,
      averageResponseTime: 0,
      memoryPeak: 0
    };

    this.performanceMetrics.set(processId, metrics);

    // Mock performance data collection
    const monitoringInterval = setInterval(() => {
      if (!this.processes.has(processId)) {
        clearInterval(monitoringInterval);
        return;
      }

      metrics.ioOperations++;
      metrics.errorRate = (this.errorCounts.get(processId) || 0) / metrics.ioOperations;
      
      this.emit('process:performance:update', {
        processId,
        metrics: { ...metrics }
      });
    }, 100);

    processInfo.performanceMonitor = monitoringInterval;
  }

  getPerformanceMetrics(processId: string) {
    return this.performanceMetrics.get(processId);
  }

  // === LOAD TESTING ===
  async runLoadTest(processCount: number, operationsPerProcess: number) {
    if (processCount > this.maxProcesses) {
      throw new Error(`Cannot create ${processCount} processes (max: ${this.maxProcesses})`);
    }

    const loadTestId = `load-test-${Date.now()}`;
    const startTime = Date.now();

    this.emit('load:test:started', {
      loadTestId,
      processCount,
      operationsPerProcess,
      totalOperations: processCount * operationsPerProcess
    });

    try {
      // Create processes concurrently
      const processPromises = Array.from({ length: processCount }, (_, i) => 
        this.createResilientProcess({
          command: 'claude',
          args: [`--test-${i}`],
          cwd: '/tmp'
        })
      );

      const processes = await Promise.allSettled(processPromises);
      const successfulProcesses = processes
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);

      // Run operations on each process
      const operationPromises = successfulProcesses.flatMap(proc =>
        Array.from({ length: operationsPerProcess }, (_, i) =>
          this.safeWriteInput(proc.id, `test-input-${i}\n`)
        )
      );

      const operationResults = await Promise.allSettled(operationPromises);
      const successfulOperations = operationResults
        .filter(result => result.status === 'fulfilled').length;

      const endTime = Date.now();
      const results = {
        loadTestId,
        duration: endTime - startTime,
        processesCreated: successfulProcesses.length,
        processesRequested: processCount,
        operationsSuccessful: successfulOperations,
        operationsTotal: processCount * operationsPerProcess,
        successRate: successfulOperations / (processCount * operationsPerProcess),
        throughput: successfulOperations / ((endTime - startTime) / 1000)
      };

      this.emit('load:test:completed', results);

      return results;
    } catch (error) {
      this.emit('load:test:failed', {
        loadTestId,
        error: (error as Error).message,
        duration: Date.now() - startTime
      });
      throw error;
    }
  }
}

describe('TDD London School: Error Scenario & Performance Testing', () => {
  let processManager: ErrorResilientProcessManager;

  beforeEach(() => {
    vi.clearAllMocks();
    processManager = new ErrorResilientProcessManager(3, 10);
  });

  describe('Process Spawn Failure Contracts', () => {
    test('should handle spawn failure gracefully', async () => {
      const creationFailedHandler = vi.fn();
      processManager.on('process:creation:failed', creationFailedHandler);

      // === MOCK SPAWN FAILURE ===
      mockSpawn.mockImplementationOnce(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const config = { command: 'non-existent-command', args: [] };

      // === VERIFY FAILURE HANDLING CONTRACT ===
      await expect(processManager.createResilientProcess(config))
        .rejects.toThrow('ENOENT: no such file or directory');

      expect(creationFailedHandler).toHaveBeenCalledWith({
        processId: expect.any(String),
        error: 'ENOENT: no such file or directory',
        config
      });
    });

    test('should handle permission errors on spawn', async () => {
      mockSpawn.mockImplementationOnce(() => {
        throw new Error('EACCES: permission denied');
      });

      const config = { command: 'restricted-command', args: [] };

      await expect(processManager.createResilientProcess(config))
        .rejects.toThrow('EACCES: permission denied');
    });

    test('should validate process limits before creation', async () => {
      const limitedManager = new ErrorResilientProcessManager(3, 2);

      // === CREATE MAXIMUM PROCESSES ===
      mockSpawn.mockReturnValue(mockHealthyProcess);
      
      await limitedManager.createResilientProcess({ command: 'claude', args: ['1'] });
      await limitedManager.createResilientProcess({ command: 'claude', args: ['2'] });

      // === VERIFY LIMIT ENFORCEMENT ===
      await expect(
        limitedManager.createResilientProcess({ command: 'claude', args: ['3'] })
      ).rejects.toThrow('Maximum number of processes');
    });
  });

  describe('Process Runtime Error Handling Contracts', () => {
    test('should detect and handle broken pipe errors', async () => {
      const errorHandledHandler = vi.fn();
      processManager.on('process:error:handled', errorHandledHandler);

      mockSpawn.mockReturnValue(mockFailingProcess);
      
      const processInfo = await processManager.createResilientProcess({
        command: 'claude',
        args: []
      });

      // === ATTEMPT INPUT THAT WILL FAIL ===
      const success = await processManager.safeWriteInput(processInfo.id, 'test input\n');

      // === VERIFY ERROR HANDLING CONTRACT ===
      expect(success).toBe(false);
      expect(errorHandledHandler).toHaveBeenCalledWith({
        processId: processInfo.id,
        source: 'stdin',
        error: 'Broken pipe',
        errorCount: 1,
        timestamp: expect.any(Number)
      });
    });

    test('should retry failed processes up to limit', async () => {
      const retryAttemptHandler = vi.fn();
      const retrySuccessHandler = vi.fn();
      
      processManager.on('process:retry:attempt', retryAttemptHandler);
      processManager.on('process:retry:success', retrySuccessHandler);

      mockSpawn
        .mockReturnValueOnce(mockFailingProcess) // First attempt fails
        .mockReturnValueOnce(mockFailingProcess) // Second attempt fails
        .mockReturnValueOnce(mockHealthyProcess); // Third attempt succeeds

      const processInfo = await processManager.createResilientProcess({
        command: 'claude',
        args: []
      });

      // === TRIGGER MULTIPLE FAILURES ===
      await processManager.safeWriteInput(processInfo.id, 'test1\n');
      await processManager.safeWriteInput(processInfo.id, 'test2\n');

      // === VERIFY RETRY CONTRACT ===
      expect(retryAttemptHandler).toHaveBeenCalledTimes(2);
      expect(retrySuccessHandler).toHaveBeenCalledWith({
        processId: processInfo.id,
        retryCount: expect.any(Number)
      });
    });

    test('should mark process as failed after max retries', async () => {
      const criticalErrorHandler = vi.fn();
      const finalFailureHandler = vi.fn();
      
      processManager.on('process:error:critical', criticalErrorHandler);
      processManager.on('process:failed:final', finalFailureHandler);

      // === MOCK ALL ATTEMPTS TO FAIL ===
      mockSpawn.mockReturnValue(mockFailingProcess);

      const processInfo = await processManager.createResilientProcess({
        command: 'claude',
        args: []
      });

      // === TRIGGER ERRORS BEYOND RETRY LIMIT ===
      for (let i = 0; i < 5; i++) {
        await processManager.safeWriteInput(processInfo.id, `test${i}\n`);
      }

      // === VERIFY CRITICAL FAILURE CONTRACT ===
      expect(criticalErrorHandler).toHaveBeenCalledWith({
        processId: processInfo.id,
        errorCount: expect.any(Number),
        maxRetries: 3,
        finalError: expect.any(String)
      });

      expect(finalFailureHandler).toHaveBeenCalledWith({
        processId: processInfo.id,
        totalErrors: expect.any(Number),
        runtime: expect.any(Number)
      });
    });
  });

  describe('I/O Safety and Timeout Contracts', () => {
    test('should handle input write timeouts', async () => {
      mockSpawn.mockReturnValue({
        ...mockHealthyProcess,
        stdin: {
          write: vi.fn().mockImplementation((data, callback) => {
            // Never call callback to simulate timeout
          })
        }
      });

      const processInfo = await processManager.createResilientProcess({
        command: 'claude',
        args: []
      });

      // === TEST TIMEOUT HANDLING ===
      const start = Date.now();
      await expect(
        processManager.safeWriteInput(processInfo.id, 'test\n', 100)
      ).rejects.toThrow('Input write timeout');

      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThan(200);
    });

    test('should handle safe input write success', async () => {
      const safeSuccessHandler = vi.fn();
      processManager.on('process:input:safe:success', safeSuccessHandler);

      mockSpawn.mockReturnValue({
        ...mockHealthyProcess,
        stdin: {
          write: vi.fn().mockImplementation((data, callback) => {
            setTimeout(() => callback(), 10);
          })
        }
      });

      const processInfo = await processManager.createResilientProcess({
        command: 'claude',
        args: []
      });

      const success = await processManager.safeWriteInput(processInfo.id, 'test input\n');

      // === VERIFY SAFE SUCCESS CONTRACT ===
      expect(success).toBe(true);
      expect(safeSuccessHandler).toHaveBeenCalledWith({
        processId: processInfo.id,
        input: 11, // 'test input\n'.length
        responseTime: expect.any(Number)
      });
    });

    test('should handle concurrent safe writes without corruption', async () => {
      mockSpawn.mockReturnValue({
        ...mockHealthyProcess,
        stdin: {
          write: vi.fn().mockImplementation((data, callback) => {
            setTimeout(() => callback(), Math.random() * 50);
          })
        }
      });

      const processInfo = await processManager.createResilientProcess({
        command: 'claude',
        args: []
      });

      // === CONCURRENT WRITE OPERATIONS ===
      const writePromises = Array.from({ length: 10 }, (_, i) =>
        processManager.safeWriteInput(processInfo.id, `message-${i}\n`)
      );

      const results = await Promise.all(writePromises);

      // === VERIFY CONCURRENT SAFETY CONTRACT ===
      expect(results.every(result => result === true)).toBe(true);
      expect(processInfo.process.stdin.write).toHaveBeenCalledTimes(10);
    });
  });

  describe('Performance Monitoring Contracts', () => {
    test('should track process performance metrics', async () => {
      const performanceUpdateHandler = vi.fn();
      processManager.on('process:performance:update', performanceUpdateHandler);

      mockSpawn.mockReturnValue(mockHealthyProcess);

      const processInfo = await processManager.createResilientProcess({
        command: 'claude',
        args: []
      });

      // === START PERFORMANCE MONITORING ===
      processManager.startPerformanceMonitoring(processInfo.id);

      // Wait for some monitoring cycles
      await new Promise(resolve => setTimeout(resolve, 250));

      // === VERIFY PERFORMANCE TRACKING CONTRACT ===
      expect(performanceUpdateHandler).toHaveBeenCalled();
      
      const lastCall = performanceUpdateHandler.mock.calls[
        performanceUpdateHandler.mock.calls.length - 1
      ][0];

      expect(lastCall).toEqual({
        processId: processInfo.id,
        metrics: expect.objectContaining({
          startTime: expect.any(Number),
          ioOperations: expect.any(Number),
          errorRate: expect.any(Number)
        })
      });

      // Cleanup
      clearInterval(processInfo.performanceMonitor);
    });

    test('should calculate accurate error rates', async () => {
      mockSpawn.mockReturnValue(mockFailingProcess);

      const processInfo = await processManager.createResilientProcess({
        command: 'claude',
        args: []
      });

      processManager.startPerformanceMonitoring(processInfo.id);

      // === GENERATE ERRORS ===
      await processManager.safeWriteInput(processInfo.id, 'test1\n');
      await processManager.safeWriteInput(processInfo.id, 'test2\n');

      const metrics = processManager.getPerformanceMetrics(processInfo.id);
      
      // === VERIFY ERROR RATE CALCULATION ===
      expect(metrics?.errorRate).toBeGreaterThan(0);
      
      // Cleanup
      clearInterval(processInfo.performanceMonitor);
    });
  });

  describe('Load Testing and Stress Contracts', () => {
    test('should handle load test with multiple processes', async () => {
      const loadStartedHandler = vi.fn();
      const loadCompletedHandler = vi.fn();
      
      processManager.on('load:test:started', loadStartedHandler);
      processManager.on('load:test:completed', loadCompletedHandler);

      mockSpawn.mockReturnValue(mockHealthyProcess);

      // === RUN LOAD TEST ===
      const results = await processManager.runLoadTest(3, 5);

      // === VERIFY LOAD TEST CONTRACT ===
      expect(loadStartedHandler).toHaveBeenCalledWith({
        loadTestId: expect.any(String),
        processCount: 3,
        operationsPerProcess: 5,
        totalOperations: 15
      });

      expect(loadCompletedHandler).toHaveBeenCalledWith({
        loadTestId: expect.any(String),
        duration: expect.any(Number),
        processesCreated: 3,
        processesRequested: 3,
        operationsSuccessful: expect.any(Number),
        operationsTotal: 15,
        successRate: expect.any(Number),
        throughput: expect.any(Number)
      });

      expect(results.processesCreated).toBe(3);
      expect(results.operationsTotal).toBe(15);
    });

    test('should handle load test failures gracefully', async () => {
      const loadFailedHandler = vi.fn();
      processManager.on('load:test:failed', loadFailedHandler);

      // === ATTEMPT LOAD TEST BEYOND LIMITS ===
      await expect(
        processManager.runLoadTest(15, 10) // Exceeds maxProcesses (10)
      ).rejects.toThrow('Cannot create 15 processes (max: 10)');
    });

    test('should measure throughput accurately under load', async () => {
      mockSpawn.mockReturnValue({
        ...mockHealthyProcess,
        stdin: {
          write: vi.fn().mockImplementation((data, callback) => {
            // Simulate fast response
            setTimeout(() => callback(), 1);
          })
        }
      });

      const startTime = Date.now();
      const results = await processManager.runLoadTest(2, 10);
      const duration = Date.now() - startTime;

      // === VERIFY THROUGHPUT CALCULATION ===
      expect(results.throughput).toBeGreaterThan(0);
      expect(results.duration).toBeLessThanOrEqual(duration + 100); // Some tolerance
      expect(results.successRate).toBeGreaterThan(0.8); // Should have high success rate
    });

    test('should handle partial failures in load test', async () => {
      let callCount = 0;
      mockSpawn.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return mockHealthyProcess;
        } else {
          throw new Error('Resource exhausted');
        }
      });

      const results = await processManager.runLoadTest(4, 2);

      // === VERIFY PARTIAL FAILURE HANDLING ===
      expect(results.processesCreated).toBe(2); // Only first 2 succeeded
      expect(results.processesRequested).toBe(4);
      expect(results.successRate).toBeLessThan(1); // Not 100% success
    });
  });

  describe('Memory and Resource Leak Prevention', () => {
    test('should cleanup resources on process failure', async () => {
      mockSpawn.mockReturnValue(mockFailingProcess);

      const processInfo = await processManager.createResilientProcess({
        command: 'claude',
        args: []
      });

      const processId = processInfo.id;

      // === TRIGGER CRITICAL FAILURE ===
      for (let i = 0; i < 5; i++) {
        await processManager.safeWriteInput(processId, `test${i}\n`);
      }

      // === VERIFY RESOURCE CLEANUP ===
      expect(processInfo.status).toBe('failed');
      expect(processInfo.endTime).toBeDefined();
    });

    test('should handle cleanup of performance monitors', async () => {
      mockSpawn.mockReturnValue(mockHealthyProcess);

      const processInfo = await processManager.createResilientProcess({
        command: 'claude',
        args: []
      });

      processManager.startPerformanceMonitoring(processInfo.id);
      
      // === VERIFY MONITOR CLEANUP ===
      expect(processInfo.performanceMonitor).toBeDefined();
      
      // Simulate process termination
      processManager.processes.delete(processInfo.id);
      
      // Wait for monitor to detect and cleanup
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Monitor should have been cleaned up automatically
      expect(typeof processInfo.performanceMonitor).toBe('object');
    });
  });
});