/**
 * Error Handling and Edge Cases Tests
 * 
 * Comprehensive tests for error scenarios, edge cases, boundary conditions,
 * and resilience testing for terminal functionality.
 */

import { TerminalErrorHandler, TerminalError, ErrorRecoveryStrategy } from '@/services/TerminalErrorHandler';
import { TerminalConnectionManager } from '@/services/TerminalConnectionManager';
import { ILogger, IEventEmitter } from '@/types/terminal';
import { EventEmitter } from 'events';

// Test data generators for edge cases
class EdgeCaseDataGenerator {
  static generateLargeString(size: number): string {
    return 'A'.repeat(size);
  }

  static generateUnicodeString(): string {
    return '🚀 Unicode: 中文 العربية русский язык 🎉';
  }

  static generateBinaryData(size: number): Uint8Array {
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      data[i] = i % 256;
    }
    return data;
  }

  static generateMalformedJSON(): string[] {
    return [
      '{"incomplete": true',
      '{"invalid": "json"',
      'not json at all',
      '{"nested": {"deeply": {"very": {"deep": true}}}',
      '{"circular": "[Circular]"}',
      '{"undefined": undefined}',
      '{"function": function() {}}'
    ];
  }

  static generateExtremeNumbers(): number[] {
    return [
      Number.MAX_SAFE_INTEGER,
      Number.MIN_SAFE_INTEGER,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NaN,
      0,
      -0,
      1e-308,
      1e308
    ];
  }
}

describe('Terminal Error Handling and Edge Cases', () => {
  let errorHandler: TerminalErrorHandler;
  let connectionManager: TerminalConnectionManager;
  let mockLogger: jest.Mocked<ILogger>;
  let mockEventEmitter: IEventEmitter;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    mockEventEmitter = new EventEmitter();

    errorHandler = new TerminalErrorHandler({
      logger: mockLogger,
      eventEmitter: mockEventEmitter,
      maxRetries: 3,
      retryDelay: 1000,
      circuitBreakerThreshold: 5,
      errorCategories: {
        network: ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'],
        protocol: ['PROTOCOL_ERROR', 'INVALID_MESSAGE'],
        system: ['ENOMEM', 'ENOSPC', 'EMFILE']
      }
    });

    connectionManager = new TerminalConnectionManager({
      logger: mockLogger,
      errorHandler: errorHandler,
      heartbeatInterval: 30000,
      connectionTimeout: 10000
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockEventEmitter.removeAllListeners();
  });

  describe('Network Error Scenarios', () => {
    it('handles connection refused errors', async () => {
      const error = new TerminalError('ECONNREFUSED', 'Connection refused');
      
      const recoverySpy = jest.fn();
      mockEventEmitter.on('terminal:error_recovery', recoverySpy);

      const strategy = await errorHandler.handleError(error);

      expect(strategy.action).toBe('retry');
      expect(strategy.delay).toBeGreaterThan(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Network connection refused, will retry',
        expect.objectContaining({ errorCode: 'ECONNREFUSED' })
      );
    });

    it('handles DNS resolution failures', async () => {
      const error = new TerminalError('ENOTFOUND', 'DNS lookup failed');
      
      const strategy = await errorHandler.handleError(error);

      expect(strategy.action).toBe('retry');
      expect(strategy.maxRetries).toBe(3);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'DNS resolution failed',
        expect.objectContaining({ errorCode: 'ENOTFOUND' })
      );
    });

    it('handles timeout errors with exponential backoff', async () => {
      // Simulate multiple timeout errors
      for (let i = 0; i < 3; i++) {
        const error = new TerminalError('ETIMEDOUT', `Timeout attempt ${i + 1}`);
        const strategy = await errorHandler.handleError(error);
        
        expect(strategy.delay).toBe(1000 * Math.pow(2, i));
      }

      expect(mockLogger.warn).toHaveBeenCalledTimes(3);
    });

    it('activates circuit breaker after repeated failures', async () => {
      // Simulate failures exceeding threshold
      for (let i = 0; i < 6; i++) {
        const error = new TerminalError('ECONNREFUSED', `Failure ${i + 1}`);
        await errorHandler.handleError(error);
      }

      const circuitState = errorHandler.getCircuitBreakerState();
      expect(circuitState.isOpen).toBe(true);
      expect(circuitState.failureCount).toBe(6);

      // Next error should fail fast
      const error = new TerminalError('ECONNREFUSED', 'Should fail fast');
      const strategy = await errorHandler.handleError(error);
      
      expect(strategy.action).toBe('fail');
      expect(strategy.reason).toBe('circuit_breaker_open');
    });

    it('handles intermittent network connectivity', async () => {
      const connectivitySpy = jest.fn();
      mockEventEmitter.on('terminal:connectivity_change', connectivitySpy);

      // Simulate network going offline
      await connectionManager.handleConnectivityChange(false);
      expect(connectivitySpy).toHaveBeenCalledWith({ online: false });

      // Simulate network coming back online
      await connectionManager.handleConnectivityChange(true);
      expect(connectivitySpy).toHaveBeenCalledWith({ online: true });

      expect(mockLogger.info).toHaveBeenCalledWith('Network connectivity restored');
    });
  });

  describe('Protocol Error Handling', () => {
    it('handles malformed WebSocket messages', () => {
      const malformedMessages = EdgeCaseDataGenerator.generateMalformedJSON();

      malformedMessages.forEach((message, index) => {
        const result = errorHandler.handleMalformedMessage(message);
        
        expect(result.handled).toBe(true);
        expect(result.error).toContain('malformed');
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to parse WebSocket message',
          expect.objectContaining({ 
            message,
            attempt: index + 1
          })
        );
      });
    });

    it('handles unexpected message types', () => {
      const unexpectedMessages = [
        { type: 'unknown_type', data: 'test' },
        { type: null, data: 'test' },
        { type: 123, data: 'test' },
        { type: '', data: 'test' },
        { data: 'no type field' },
        {}
      ];

      unexpectedMessages.forEach(message => {
        const result = errorHandler.handleUnexpectedMessage(message);
        
        expect(result.handled).toBe(true);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Received unexpected message type',
          expect.objectContaining({ messageType: message.type })
        );
      });
    });

    it('handles protocol version mismatches', async () => {
      const versionError = new TerminalError(
        'PROTOCOL_VERSION_MISMATCH',
        'Client version 1.0 incompatible with server version 2.0'
      );

      const strategy = await errorHandler.handleError(versionError);

      expect(strategy.action).toBe('upgrade_required');
      expect(strategy.details.clientVersion).toBeDefined();
      expect(strategy.details.serverVersion).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Protocol version mismatch detected',
        expect.any(Object)
      );
    });

    it('handles message ordering issues', () => {
      const messageSequence = [
        { id: 3, type: 'output', data: 'third' },
        { id: 1, type: 'output', data: 'first' },
        { id: 2, type: 'output', data: 'second' }
      ];

      const reorderer = errorHandler.getMessageReorderer();
      
      messageSequence.forEach(msg => {
        reorderer.addMessage(msg);
      });

      const orderedMessages = reorderer.getOrderedMessages();
      expect(orderedMessages.map(m => m.id)).toEqual([1, 2, 3]);
      expect(orderedMessages.map(m => m.data)).toEqual(['first', 'second', 'third']);
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    it('handles memory exhaustion gracefully', async () => {
      const memoryError = new TerminalError('ENOMEM', 'Out of memory');
      
      const strategy = await errorHandler.handleError(memoryError);

      expect(strategy.action).toBe('cleanup_and_retry');
      expect(strategy.cleanupActions).toContain('clear_output_buffer');
      expect(strategy.cleanupActions).toContain('garbage_collect');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Memory exhaustion detected',
        expect.any(Object)
      );
    });

    it('handles file descriptor exhaustion', async () => {
      const fdError = new TerminalError('EMFILE', 'Too many open files');
      
      const strategy = await errorHandler.handleError(fdError);

      expect(strategy.action).toBe('cleanup_and_retry');
      expect(strategy.cleanupActions).toContain('close_unused_connections');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'File descriptor limit reached',
        expect.any(Object)
      );
    });

    it('handles disk space exhaustion', async () => {
      const diskError = new TerminalError('ENOSPC', 'No space left on device');
      
      const strategy = await errorHandler.handleError(diskError);

      expect(strategy.action).toBe('cleanup_required');
      expect(strategy.cleanupActions).toContain('clear_log_files');
      expect(strategy.cleanupActions).toContain('compress_old_data');
    });

    it('monitors and prevents buffer overflow', () => {
      const bufferManager = errorHandler.getBufferManager();
      const largeData = EdgeCaseDataGenerator.generateLargeString(10 * 1024 * 1024); // 10MB

      const result = bufferManager.addData(largeData);

      expect(result.added).toBe(false);
      expect(result.reason).toBe('buffer_limit_exceeded');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Buffer limit exceeded, data truncated',
        expect.objectContaining({ 
          attemptedSize: largeData.length,
          maxSize: bufferManager.getMaxSize()
        })
      );
    });
  });

  describe('Unicode and Character Encoding', () => {
    it('handles Unicode characters correctly', () => {
      const unicodeString = EdgeCaseDataGenerator.generateUnicodeString();
      
      const processor = errorHandler.getTextProcessor();
      const result = processor.processText(unicodeString);

      expect(result.valid).toBe(true);
      expect(result.text).toBe(unicodeString);
      expect(result.encoding).toBe('utf-8');
    });

    it('handles invalid UTF-8 sequences', () => {
      const invalidBytes = new Uint8Array([0xFF, 0xFE, 0xFD]);
      
      const processor = errorHandler.getTextProcessor();
      const result = processor.processBinaryData(invalidBytes);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid_utf8');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid UTF-8 sequence detected',
        expect.any(Object)
      );
    });

    it('handles mixed encoding scenarios', () => {
      const mixedData = [
        'ASCII text',
        EdgeCaseDataGenerator.generateUnicodeString(),
        '\x00\x01\x02', // Binary data
        'More ASCII'
      ].join('');

      const processor = errorHandler.getTextProcessor();
      const result = processor.processText(mixedData);

      expect(result.valid).toBe(true);
      expect(result.cleanedText).toBeDefined();
      expect(result.warnings).toContain('binary_data_detected');
    });

    it('handles extremely long lines', () => {
      const veryLongLine = EdgeCaseDataGenerator.generateLargeString(1024 * 1024); // 1MB line
      
      const processor = errorHandler.getTextProcessor();
      const result = processor.processText(veryLongLine);

      expect(result.truncated).toBe(true);
      expect(result.text.length).toBeLessThan(veryLongLine.length);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Line truncated due to excessive length',
        expect.objectContaining({ 
          originalLength: veryLongLine.length,
          truncatedLength: result.text.length
        })
      );
    });
  });

  describe('Concurrency and Race Conditions', () => {
    it('handles rapid message bursts', async () => {
      const messageCount = 1000;
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        id: i,
        type: 'output',
        data: `Message ${i}`,
        timestamp: Date.now() + i
      }));

      const processor = errorHandler.getMessageProcessor();
      const startTime = Date.now();

      // Send all messages rapidly
      const promises = messages.map(msg => processor.processMessage(msg));
      const results = await Promise.all(promises);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(results).toHaveLength(messageCount);
      expect(results.every(r => r.processed)).toBe(true);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify messages were processed in order
      const processedOrder = processor.getProcessedMessageOrder();
      expect(processedOrder).toEqual(messages.map(m => m.id));
    });

    it('prevents race conditions in connection state', async () => {
      const connectionStates = [];
      
      // Simulate rapid connection state changes
      const stateChanges = [
        'connecting',
        'connected',
        'disconnecting',
        'disconnected',
        'connecting',
        'connected'
      ];

      const promises = stateChanges.map((state, index) => 
        new Promise(resolve => {
          setTimeout(() => {
            connectionManager.setState(state);
            connectionStates.push({ state, timestamp: Date.now() });
            resolve(state);
          }, index * 10);
        })
      );

      await Promise.all(promises);

      // Final state should be the last valid transition
      expect(connectionManager.getState()).toBe('connected');
      
      // Should not have invalid state transitions
      const invalidTransitions = connectionManager.getInvalidTransitions();
      expect(invalidTransitions).toHaveLength(0);
    });

    it('handles concurrent command execution', async () => {
      const commandCount = 50;
      const commands = Array.from({ length: commandCount }, (_, i) => `command-${i}`);

      const executor = errorHandler.getCommandExecutor();
      const startTime = Date.now();

      // Execute all commands concurrently
      const promises = commands.map(cmd => executor.execute(cmd));
      const results = await Promise.all(promises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(results).toHaveLength(commandCount);
      expect(results.every(r => r.success)).toBe(true);
      
      // Should complete faster than sequential execution
      expect(totalTime).toBeLessThan(commandCount * 100);

      // Verify resource cleanup
      expect(executor.getActiveCommands()).toHaveLength(0);
    });
  });

  describe('Boundary Value Testing', () => {
    it('handles extreme numeric values', () => {
      const extremeNumbers = EdgeCaseDataGenerator.generateExtremeNumbers();

      extremeNumbers.forEach(number => {
        const validator = errorHandler.getNumberValidator();
        const result = validator.validate(number);

        if (Number.isNaN(number)) {
          expect(result.valid).toBe(false);
          expect(result.error).toBe('nan_detected');
        } else if (!Number.isFinite(number)) {
          expect(result.valid).toBe(false);
          expect(result.error).toBe('infinite_value');
        } else {
          expect(result.valid).toBe(true);
        }
      });
    });

    it('handles empty and null values', () => {
      const edgeCases = [
        null,
        undefined,
        '',
        [],
        {},
        new Map(),
        new Set(),
        0,
        false
      ];

      edgeCases.forEach(value => {
        const validator = errorHandler.getValueValidator();
        const result = validator.validate(value);

        expect(result).toHaveProperty('valid');
        expect(result).toHaveProperty('type');
        expect(result.type).toBe(typeof value);
      });
    });

    it('handles maximum array and object sizes', () => {
      const largeArray = new Array(100000).fill('item');
      const largeObject = Object.fromEntries(
        Array.from({ length: 10000 }, (_, i) => [`key${i}`, `value${i}`])
      );

      const sizeValidator = errorHandler.getSizeValidator();
      
      const arrayResult = sizeValidator.validateArray(largeArray);
      expect(arrayResult.oversized).toBe(true);
      expect(arrayResult.actualSize).toBe(100000);

      const objectResult = sizeValidator.validateObject(largeObject);
      expect(objectResult.oversized).toBe(true);
      expect(objectResult.keyCount).toBe(10000);
    });
  });

  describe('Error Recovery Mechanisms', () => {
    it('implements progressive error recovery', async () => {
      const recoverySpy = jest.fn();
      mockEventEmitter.on('terminal:recovery_attempt', recoverySpy);

      // Start with simple errors
      let error = new TerminalError('MINOR_ERROR', 'Minor issue');
      let strategy = await errorHandler.handleError(error);
      expect(strategy.recovery.level).toBe('simple');

      // Escalate to moderate errors
      error = new TerminalError('MODERATE_ERROR', 'Moderate issue');
      strategy = await errorHandler.handleError(error);
      expect(strategy.recovery.level).toBe('moderate');

      // Escalate to severe errors
      error = new TerminalError('SEVERE_ERROR', 'Severe issue');
      strategy = await errorHandler.handleError(error);
      expect(strategy.recovery.level).toBe('full_restart');

      expect(recoverySpy).toHaveBeenCalledTimes(3);
    });

    it('maintains error history for pattern analysis', () => {
      const errors = [
        new TerminalError('ECONNREFUSED', 'Connection refused'),
        new TerminalError('ETIMEDOUT', 'Timeout'),
        new TerminalError('ECONNREFUSED', 'Connection refused'),
        new TerminalError('ECONNREFUSED', 'Connection refused')
      ];

      errors.forEach(error => errorHandler.recordError(error));

      const patterns = errorHandler.analyzeErrorPatterns();
      
      expect(patterns.mostCommon.code).toBe('ECONNREFUSED');
      expect(patterns.mostCommon.frequency).toBe(3);
      expect(patterns.recentTrend).toBe('increasing');
      expect(patterns.suggestions).toContain('check_network_configuration');
    });

    it('implements error correlation and root cause analysis', () => {
      const correlatedErrors = [
        { timestamp: Date.now(), error: new TerminalError('ECONNREFUSED', 'Connection refused') },
        { timestamp: Date.now() + 1000, error: new TerminalError('EHOSTUNREACH', 'Host unreachable') },
        { timestamp: Date.now() + 2000, error: new TerminalError('ENETDOWN', 'Network down') }
      ];

      correlatedErrors.forEach(({ timestamp, error }) => {
        errorHandler.recordError(error, timestamp);
      });

      const correlation = errorHandler.getErrorCorrelation();
      
      expect(correlation.clustered).toBe(true);
      expect(correlation.rootCause).toBe('network_connectivity');
      expect(correlation.confidence).toBeGreaterThan(0.8);
      expect(correlation.recommendedAction).toBe('check_network_infrastructure');
    });

    it('supports custom error recovery strategies', async () => {
      const customStrategy: ErrorRecoveryStrategy = {
        name: 'custom_database_recovery',
        condition: (error: TerminalError) => error.code === 'DATABASE_ERROR',
        actions: [
          'reset_connection_pool',
          'clear_query_cache',
          'restart_database_connection'
        ],
        timeout: 30000,
        fallback: 'system_restart'
      };

      errorHandler.registerRecoveryStrategy(customStrategy);

      const dbError = new TerminalError('DATABASE_ERROR', 'Database connection lost');
      const strategy = await errorHandler.handleError(dbError);

      expect(strategy.strategy).toBe('custom_database_recovery');
      expect(strategy.actions).toContain('reset_connection_pool');
      expect(strategy.timeout).toBe(30000);
    });
  });

  describe('Performance Under Stress', () => {
    it('maintains performance under error conditions', async () => {
      const startTime = Date.now();
      const errorCount = 1000;

      // Generate many errors rapidly
      const errors = Array.from({ length: errorCount }, (_, i) => 
        new TerminalError(`ERROR_${i}`, `Error number ${i}`)
      );

      const promises = errors.map(error => errorHandler.handleError(error));
      await Promise.all(promises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTimePerError = totalTime / errorCount;

      expect(avgTimePerError).toBeLessThan(10); // Less than 10ms per error
      expect(totalTime).toBeLessThan(5000); // Complete within 5 seconds

      // Memory usage should remain reasonable
      const memoryUsage = process.memoryUsage();
      expect(memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });

    it('prevents memory leaks in error scenarios', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Generate and handle many errors
      for (let i = 0; i < 10000; i++) {
        const error = new TerminalError(`TEMP_ERROR_${i}`, 'Temporary error');
        errorHandler.recordError(error);
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB for 10k errors)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);

      // Error handler should have cleanup mechanisms
      const retainedErrors = errorHandler.getRetainedErrorCount();
      expect(retainedErrors).toBeLessThan(1000); // Should not retain all errors
    });
  });

  describe('Edge Case Integration', () => {
    it('handles cascading error scenarios', async () => {
      const cascadeTracker = jest.fn();
      mockEventEmitter.on('terminal:error_cascade', cascadeTracker);

      // Initial error triggers cascade
      const primaryError = new TerminalError('PRIMARY_FAILURE', 'Primary system failure');
      await errorHandler.handleError(primaryError);

      // Simulate cascade of related errors
      const cascadeErrors = [
        new TerminalError('SECONDARY_FAILURE', 'Secondary failure due to primary'),
        new TerminalError('TERTIARY_FAILURE', 'Tertiary failure due to cascade'),
        new TerminalError('SYSTEM_INSTABILITY', 'System instability detected')
      ];

      for (const error of cascadeErrors) {
        await errorHandler.handleError(error);
      }

      expect(cascadeTracker).toHaveBeenCalled();
      
      const cascadeAnalysis = errorHandler.getCascadeAnalysis();
      expect(cascadeAnalysis.detected).toBe(true);
      expect(cascadeAnalysis.primaryError.code).toBe('PRIMARY_FAILURE');
      expect(cascadeAnalysis.cascadeDepth).toBe(3);
    });

    it('handles graceful degradation scenarios', () => {
      const features = ['terminal_output', 'command_execution', 'file_operations'];
      
      features.forEach((feature, index) => {
        const degradationError = new TerminalError(
          'FEATURE_UNAVAILABLE',
          `${feature} temporarily unavailable`
        );
        
        errorHandler.handleFeatureDegradation(feature, degradationError);
      });

      const systemStatus = errorHandler.getSystemStatus();
      
      expect(systemStatus.operationalLevel).toBe('degraded');
      expect(systemStatus.availableFeatures).toHaveLength(0);
      expect(systemStatus.fallbackModes).toContain('basic_terminal');
    });
  });
});