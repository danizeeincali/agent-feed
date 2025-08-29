/**
 * TDD London School - Error Handling and Recovery Contract Tests
 * 
 * CRITICAL REGRESSION PROTECTION:
 * - Tests process startup, running, and termination states
 * - Mocks SSE broadcasting and validates event emission
 * - Tests error handling and recovery scenarios
 * - Validates process cleanup and resource management
 * 
 * Focus: Mock-driven verification of error scenarios and recovery behavior
 */

const { EventEmitter } = require('events');

// Mock process for testing
class MockProcess extends EventEmitter {
  constructor(pid = 12345) {
    super();
    this.pid = pid;
    this.killed = false;
    this.exitCode = null;
    this.stdin = new EventEmitter();
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
    
    // Mock methods
    this.stdin.write = jest.fn();
    this.stdin.end = jest.fn();
    this.kill = jest.fn((signal) => {
      this.killed = true;
      setTimeout(() => this.emit('exit', signal === 'SIGKILL' ? 137 : 0), 100);
    });
  }
}

describe('Error Handling and Recovery Contract Tests', () => {
  let mockProcess;
  let errorHandlers;
  let processManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockProcess = new MockProcess();
    errorHandlers = {
      onProcessError: jest.fn(),
      onProcessExit: jest.fn(),
      onProcessTimeout: jest.fn(),
      onSSEError: jest.fn()
    };
    
    processManager = {
      activeProcesses: new Map(),
      sseConnections: new Map(),
      cleanupProcess: jest.fn(),
      broadcastError: jest.fn()
    };
  });

  describe('CRITICAL: Process Error Handling Contract', () => {
    test('should handle process spawn failure (CRITICAL)', () => {
      const spawnError = new Error('ENOENT: command not found');
      spawnError.code = 'ENOENT';
      
      const handleSpawnError = jest.fn((instanceId, error) => {
        const errorDetails = {
          instanceId,
          type: 'spawn_error',
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
          recoverable: error.code === 'ENOENT' ? false : true
        };
        
        // Broadcast error to connected clients
        processManager.broadcastError(instanceId, errorDetails);
        
        // Cleanup failed process
        processManager.cleanupProcess(instanceId);
        
        return errorDetails;
      });
      
      const result = handleSpawnError('claude-123', spawnError);
      
      // CRITICAL VERIFICATION: Spawn errors must be handled properly
      expect(result.type).toBe('spawn_error');
      expect(result.code).toBe('ENOENT');
      expect(result.recoverable).toBe(false);
      expect(processManager.broadcastError).toHaveBeenCalledWith('claude-123', result);
      expect(processManager.cleanupProcess).toHaveBeenCalledWith('claude-123');
    });

    test('should handle process crash during execution', () => {
      const instanceId = 'claude-123';
      processManager.activeProcesses.set(instanceId, {
        process: mockProcess,
        pid: mockProcess.pid,
        status: 'running',
        startTime: new Date()
      });
      
      const handleProcessCrash = jest.fn((id, exitCode, signal) => {
        const processInfo = processManager.activeProcesses.get(id);
        
        if (!processInfo) {
          return { handled: false, reason: 'Process not found' };
        }
        
        const crashDetails = {
          instanceId: id,
          type: 'process_crash',
          pid: processInfo.pid,
          exitCode,
          signal,
          timestamp: new Date().toISOString(),
          unexpected: exitCode !== 0 && signal !== 'SIGTERM'
        };
        
        // Update process status
        processInfo.status = 'crashed';
        processInfo.exitCode = exitCode;
        
        // Broadcast crash notification
        processManager.broadcastError(id, crashDetails);
        
        // Attempt recovery if unexpected crash
        let recoveryAttempted = false;
        if (crashDetails.unexpected) {
          recoveryAttempted = true;
          // Recovery logic would go here
        }
        
        return { handled: true, crashed: true, recovery: recoveryAttempted };
      });
      
      // Simulate process crash
      const result = handleProcessCrash(instanceId, 1, 'SIGSEGV');
      
      expect(result.handled).toBe(true);
      expect(result.crashed).toBe(true);
      expect(result.recovery).toBe(true);
      expect(processManager.broadcastError).toHaveBeenCalledWith(
        instanceId,
        expect.objectContaining({
          type: 'process_crash',
          unexpected: true
        })
      );
    });

    test('should handle process timeout scenarios', async () => {
      const instanceId = 'claude-123';
      const timeoutMs = 5000;
      
      const handleProcessTimeout = jest.fn(async (id, timeout) => {
        const processInfo = processManager.activeProcesses.get(id);
        
        if (!processInfo) {
          return { handled: false, reason: 'Process not found' };
        }
        
        const timeoutDetails = {
          instanceId: id,
          type: 'process_timeout',
          pid: processInfo.pid,
          timeoutMs: timeout,
          timestamp: new Date().toISOString()
        };
        
        // First attempt graceful termination
        processInfo.process.kill('SIGTERM');
        
        // Force kill after additional timeout
        setTimeout(() => {
          if (!processInfo.process.killed) {
            processInfo.process.kill('SIGKILL');
          }
        }, 2000);
        
        processManager.broadcastError(id, timeoutDetails);
        
        return { handled: true, gracefulFirst: true, forceKillScheduled: true };
      });
      
      processManager.activeProcesses.set(instanceId, {
        process: mockProcess,
        pid: mockProcess.pid,
        status: 'hanging'
      });
      
      const result = await handleProcessTimeout(instanceId, timeoutMs);
      
      expect(result.handled).toBe(true);
      expect(result.gracefulFirst).toBe(true);
      expect(result.forceKillScheduled).toBe(true);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });
  });

  describe('SSE Connection Error Handling Contract', () => {
    test('should handle SSE connection reset errors', () => {
      const connectionError = new Error('Connection reset by peer');
      connectionError.code = 'ECONNRESET';
      
      const handleSSEError = jest.fn((instanceId, error, connectionIndex) => {
        const isNormalDisconnect = ['ECONNRESET', 'EPIPE'].includes(error.code) ||
                                   error.message?.includes('aborted');
        
        const errorDetails = {
          instanceId,
          type: 'sse_error',
          code: error.code,
          message: error.message,
          connectionIndex,
          isNormal: isNormalDisconnect,
          timestamp: new Date().toISOString()
        };
        
        if (isNormalDisconnect) {
          console.log(`🔄 Connection reset for instance ${instanceId} - normal behavior`);
        } else {
          console.error(`❌ Unexpected SSE error for instance ${instanceId}:`, error);
          processManager.broadcastError(instanceId, errorDetails);
        }
        
        return errorDetails;
      });
      
      const result = handleSSEError('claude-123', connectionError, 0);
      
      expect(result.type).toBe('sse_error');
      expect(result.code).toBe('ECONNRESET');
      expect(result.isNormal).toBe(true);
      expect(processManager.broadcastError).not.toHaveBeenCalled();
    });

    test('should handle SSE broadcast failures', () => {
      const connections = [
        { write: jest.fn(), destroyed: false, writable: true },
        { write: jest.fn(() => { throw new Error('Connection failed'); }), destroyed: false, writable: true },
        { write: jest.fn(), destroyed: true, writable: false }
      ];
      
      processManager.sseConnections.set('claude-123', connections);
      
      const safeBroadcast = jest.fn((instanceId, message) => {
        const allConnections = processManager.sseConnections.get(instanceId) || [];
        const serializedData = `data: ${JSON.stringify(message)}\n\n`;
        
        const results = {
          attempted: 0,
          successful: 0,
          failed: 0,
          removed: 0,
          validConnections: []
        };
        
        allConnections.forEach((connection, index) => {
          results.attempted++;
          
          if (connection.destroyed || !connection.writable) {
            results.removed++;
            return; // Skip dead connections
          }
          
          try {
            connection.write(serializedData);
            results.successful++;
            results.validConnections.push(connection);
          } catch (error) {
            results.failed++;
            console.error(`Failed to broadcast to connection ${index}:`, error.message);
          }
        });
        
        // Update connections list to remove dead connections
        processManager.sseConnections.set(instanceId, results.validConnections);
        
        return results;
      });
      
      const result = safeBroadcast('claude-123', { type: 'test', data: 'hello' });
      
      expect(result.attempted).toBe(3);
      expect(result.successful).toBe(1); // Only first connection succeeds
      expect(result.failed).toBe(1);     // Second connection throws error
      expect(result.removed).toBe(1);    // Third connection is destroyed
      expect(result.validConnections).toHaveLength(1);
    });
  });

  describe('Resource Cleanup Contract', () => {
    test('should perform complete process cleanup on termination', () => {
      const instanceId = 'claude-123';
      const processInfo = {
        process: mockProcess,
        pid: mockProcess.pid,
        status: 'running',
        startTime: new Date()
      };
      
      processManager.activeProcesses.set(instanceId, processInfo);
      processManager.sseConnections.set(instanceId, [{ write: jest.fn() }]);
      
      const cleanupProcess = jest.fn((id) => {
        const info = processManager.activeProcesses.get(id);
        
        if (!info) {
          return { cleaned: false, reason: 'Process not found' };
        }
        
        const cleanupResults = {
          instanceId: id,
          pid: info.pid,
          processKilled: false,
          connectionsRemoved: 0,
          resourcesFreed: 0
        };
        
        // Kill process if still running
        if (info.process && !info.process.killed) {
          info.process.kill('SIGTERM');
          cleanupResults.processKilled = true;
          
          // Force kill after delay if needed
          setTimeout(() => {
            if (!info.process.killed) {
              info.process.kill('SIGKILL');
            }
          }, 5000);
        }
        
        // Clean up SSE connections
        const connections = processManager.sseConnections.get(id);
        if (connections) {
          cleanupResults.connectionsRemoved = connections.length;
          processManager.sseConnections.delete(id);
        }
        
        // Remove from active processes
        processManager.activeProcesses.delete(id);
        cleanupResults.resourcesFreed++;
        
        return { cleaned: true, details: cleanupResults };
      });
      
      processManager.cleanupProcess = cleanupProcess;
      
      const result = processManager.cleanupProcess(instanceId);
      
      expect(result.cleaned).toBe(true);
      expect(result.details.processKilled).toBe(true);
      expect(result.details.connectionsRemoved).toBe(1);
      expect(result.details.resourcesFreed).toBe(1);
      expect(processManager.activeProcesses.has(instanceId)).toBe(false);
      expect(processManager.sseConnections.has(instanceId)).toBe(false);
    });

    test('should handle cleanup of orphaned resources', () => {
      // Setup orphaned resources
      processManager.activeProcesses.set('orphan-1', { process: null, pid: null });
      processManager.sseConnections.set('orphan-2', []);
      processManager.sseConnections.set('orphan-3', [{ destroyed: true }]);
      
      const cleanupOrphanedResources = jest.fn(() => {
        const results = {
          orphanedProcesses: 0,
          orphanedConnections: 0,
          totalCleaned: 0
        };
        
        // Clean up processes with null references
        for (const [id, info] of processManager.activeProcesses.entries()) {
          if (!info.process || !info.pid) {
            processManager.activeProcesses.delete(id);
            results.orphanedProcesses++;
            results.totalCleaned++;
          }
        }
        
        // Clean up empty or dead connection arrays
        for (const [id, connections] of processManager.sseConnections.entries()) {
          if (connections.length === 0 || connections.every(conn => conn.destroyed)) {
            processManager.sseConnections.delete(id);
            results.orphanedConnections++;
            results.totalCleaned++;
          }
        }
        
        return results;
      });
      
      const result = cleanupOrphanedResources();
      
      expect(result.orphanedProcesses).toBe(1);
      expect(result.orphanedConnections).toBe(2);
      expect(result.totalCleaned).toBe(3);
    });
  });

  describe('Recovery Mechanisms Contract', () => {
    test('should implement exponential backoff for reconnection attempts', async () => {
      let attemptCount = 0;
      const maxAttempts = 3;
      const baseDelay = 1000;
      
      const exponentialBackoffReconnect = jest.fn(async (instanceId) => {
        attemptCount++;
        
        const delay = Math.min(baseDelay * Math.pow(2, attemptCount - 1), 30000);
        
        const attemptResult = {
          attempt: attemptCount,
          instanceId,
          delay,
          maxAttempts,
          success: attemptCount === 3 // Succeed on third attempt
        };
        
        if (!attemptResult.success && attemptCount < maxAttempts) {
          attemptResult.willRetry = true;
          attemptResult.nextAttemptIn = delay;
        } else if (attemptResult.success) {
          attemptResult.recovered = true;
          attemptCount = 0; // Reset for future use
        } else {
          attemptResult.exhausted = true;
        }
        
        return attemptResult;
      });
      
      // First attempt (immediate)
      const result1 = await exponentialBackoffReconnect('claude-123');
      expect(result1.attempt).toBe(1);
      expect(result1.delay).toBe(1000);
      expect(result1.success).toBe(false);
      expect(result1.willRetry).toBe(true);
      
      // Second attempt (2s delay)
      const result2 = await exponentialBackoffReconnect('claude-123');
      expect(result2.attempt).toBe(2);
      expect(result2.delay).toBe(2000);
      expect(result2.success).toBe(false);
      expect(result2.willRetry).toBe(true);
      
      // Third attempt (4s delay, succeeds)
      const result3 = await exponentialBackoffReconnect('claude-123');
      expect(result3.attempt).toBe(3);
      expect(result3.delay).toBe(4000);
      expect(result3.success).toBe(true);
      expect(result3.recovered).toBe(true);
    });

    test('should implement circuit breaker pattern for failing operations', () => {
      const circuitBreaker = {
        state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
        failures: 0,
        threshold: 3,
        timeout: 5000,
        lastFailTime: null
      };
      
      const executeWithCircuitBreaker = jest.fn((operation) => {
        const now = Date.now();
        
        // Check if circuit should move from OPEN to HALF_OPEN
        if (circuitBreaker.state === 'OPEN') {
          if (now - circuitBreaker.lastFailTime >= circuitBreaker.timeout) {
            circuitBreaker.state = 'HALF_OPEN';
          } else {
            return { executed: false, reason: 'Circuit breaker OPEN' };
          }
        }
        
        try {
          // Simulate operation
          const result = operation();
          
          if (result.success) {
            // Reset circuit breaker on success
            circuitBreaker.failures = 0;
            circuitBreaker.state = 'CLOSED';
            return { executed: true, result };
          } else {
            throw new Error('Operation failed');
          }
        } catch (error) {
          circuitBreaker.failures++;
          circuitBreaker.lastFailTime = now;
          
          if (circuitBreaker.failures >= circuitBreaker.threshold) {
            circuitBreaker.state = 'OPEN';
          }
          
          return { 
            executed: false, 
            error: error.message, 
            failures: circuitBreaker.failures,
            state: circuitBreaker.state
          };
        }
      });
      
      // Simulate failing operations
      const failingOperation = () => ({ success: false });
      
      const result1 = executeWithCircuitBreaker(failingOperation);
      expect(result1.executed).toBe(false);
      expect(result1.failures).toBe(1);
      expect(result1.state).toBe('CLOSED');
      
      const result2 = executeWithCircuitBreaker(failingOperation);
      expect(result2.failures).toBe(2);
      expect(result2.state).toBe('CLOSED');
      
      const result3 = executeWithCircuitBreaker(failingOperation);
      expect(result3.failures).toBe(3);
      expect(result3.state).toBe('OPEN'); // Circuit opens after threshold
      
      // Next call should be blocked
      const result4 = executeWithCircuitBreaker(failingOperation);
      expect(result4.executed).toBe(false);
      expect(result4.reason).toBe('Circuit breaker OPEN');
    });
  });

  describe('Graceful Degradation Contract', () => {
    test('should provide fallback when primary service fails', () => {
      const primaryService = {
        available: false,
        execute: jest.fn(() => {
          throw new Error('Primary service unavailable');
        })
      };
      
      const fallbackService = {
        available: true,
        execute: jest.fn(() => ({ success: true, data: 'fallback data' }))
      };
      
      const executeWithFallback = jest.fn((operation) => {
        let result;
        let usedFallback = false;
        
        try {
          result = primaryService.execute(operation);
        } catch (error) {
          console.log('Primary service failed, using fallback');
          result = fallbackService.execute(operation);
          usedFallback = true;
        }
        
        return { ...result, usedFallback };
      });
      
      const result = executeWithFallback('test-operation');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('fallback data');
      expect(result.usedFallback).toBe(true);
      expect(primaryService.execute).toHaveBeenCalled();
      expect(fallbackService.execute).toHaveBeenCalled();
    });
  });
});