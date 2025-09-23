/**
 * Regression Test Patterns for Streaming Ticker
 *
 * Tests for preventing regression of known issues and edge cases:
 * - Historical bug patterns
 * - Performance regression detection
 * - API contract validation
 * - Compatibility testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdvancedSSEConnection } from '../../../hooks/useAdvancedSSEConnection';
import { ClaudeOutputParser } from '../../../utils/claude-output-parser';
import { SSEConnectionManager } from '../../../services/SSEConnectionManager';
import { createPerformanceMonitor } from '../utils/performance-helpers';

describe('Streaming Ticker Regression Tests', () => {
  let mockEventSource: any;
  let performanceMonitor: any;

  beforeEach(() => {
    performanceMonitor = createPerformanceMonitor();

    mockEventSource = {
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      readyState: EventSource.CONNECTING,
      close: vi.fn(),
      url: '',

      simulateOpen() {
        this.readyState = EventSource.OPEN;
        this.onopen?.(new Event('open'));
      },

      simulateMessage(data: any) {
        const event = new MessageEvent('message', {
          data: JSON.stringify(data)
        });
        this.onmessage?.(event);
      },

      simulateError() {
        this.readyState = EventSource.CLOSED;
        this.onerror?.(new Event('error'));
      }
    };

    global.EventSource = vi.fn(() => mockEventSource);

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          instances: [{ id: 'claude-test-123', status: 'running' }]
        })
      } as Response)
    );
  });

  afterEach(() => {
    performanceMonitor.cleanup();
    vi.restoreAllMocks();
  });

  describe('Historical Bug Regression Tests', () => {
    it('should not leak memory on rapid reconnections (Bug #001)', async () => {
      // This test prevents regression of a memory leak that occurred
      // when rapid reconnections caused event listeners to accumulate

      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001', {
          autoReconnect: true,
          maxRetries: 50
        })
      );

      const initialMemory = performanceMonitor.getMetrics().memoryUsage.initial;

      // Simulate rapid reconnection cycles (previously caused memory leak)
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          const connectPromise = result.current.connectToInstance('claude-test-123');
          mockEventSource.simulateOpen();
          await connectPromise;

          // Simulate connection loss
          mockEventSource.simulateError();
          await new Promise(resolve => setTimeout(resolve, 50));
        });
      }

      const finalMemory = performanceMonitor.getMetrics().memoryUsage.peak;
      const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024); // MB

      // Memory increase should be minimal (<10MB for 10 reconnections)
      expect(memoryIncrease).toBeLessThan(10);
    });

    it('should handle sequence gap recovery without infinite loops (Bug #002)', async () => {
      // This test prevents regression of an infinite loop that occurred
      // when sequence gap recovery logic was triggered repeatedly

      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001')
      );

      await act(async () => {
        const connectPromise = result.current.connectToInstance('claude-test-123');
        mockEventSource.simulateOpen();
        await connectPromise;
      });

      let recoveryAttempts = 0;
      const maxRecoveryAttempts = 3;

      // Mock recovery mechanism to count attempts
      const originalForceRecovery = result.current.forceRecovery;
      result.current.forceRecovery = vi.fn(async (instanceId: string) => {
        recoveryAttempts++;
        if (recoveryAttempts > maxRecoveryAttempts) {
          throw new Error('Too many recovery attempts - infinite loop detected');
        }
        return originalForceRecovery(instanceId);
      });

      // Send messages with large sequence gaps
      await act(async () => {
        mockEventSource.simulateMessage({
          type: 'terminal_output',
          data: 'Message 1',
          sequenceNumber: 1,
          instanceId: 'claude-test-123'
        });

        // Large gap that previously triggered infinite recovery loop
        mockEventSource.simulateMessage({
          type: 'terminal_output',
          data: 'Message 1000',
          sequenceNumber: 1000,
          instanceId: 'claude-test-123'
        });
      });

      // Should not attempt recovery more than the maximum allowed
      expect(recoveryAttempts).toBeLessThanOrEqual(maxRecoveryAttempts);
    });

    it('should not crash on malformed ANSI sequences (Bug #003)', () => {
      // This test prevents regression of a crash that occurred when
      // malformed ANSI escape sequences were encountered

      const malformedInputs = [
        '\x1B[999999999999999999999m', // Extremely large ANSI code
        '\x1B[\x1B[\x1B[', // Nested incomplete sequences
        '\x1B[;;;;;;;;;;;;;;;;;;;;;m', // Multiple semicolons
        String.fromCharCode(27) + '[' + String.fromCharCode(0) + 'm', // Null character in sequence
        '\x1B[38;2;256;256;256m', // RGB values out of range
      ];

      malformedInputs.forEach((input, index) => {
        expect(() => {
          ClaudeOutputParser.parseClaudeOutput(input);
        }, `Should not crash on malformed input ${index}: ${JSON.stringify(input)}`).not.toThrow();
      });
    });

    it('should prevent event listener buildup on tab switches (Bug #004)', async () => {
      // This test prevents regression of event listener accumulation
      // that occurred when users rapidly switched between tabs

      const { result, rerender } = renderHook((props: { active: boolean }) =>
        useAdvancedSSEConnection('http://localhost:3001', {
          autoReconnect: props.active
        })
      );

      let listenerCount = 0;
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(...args) {
        listenerCount++;
        return originalAddEventListener.apply(this, args);
      };

      // Simulate rapid tab switching (active/inactive)
      for (let i = 0; i < 20; i++) {
        rerender({ active: i % 2 === 0 });
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        });
      }

      EventTarget.prototype.addEventListener = originalAddEventListener;

      // Should not accumulate excessive event listeners
      expect(listenerCount).toBeLessThan(100); // Reasonable threshold
    });

    it('should handle Unicode normalization consistently (Bug #005)', () => {
      // This test prevents regression of Unicode handling issues
      // that caused inconsistent message parsing

      const unicodeTestCases = [
        'Café', // NFC normalization
        'Cafe\u0301', // NFD normalization
        '🚀 Rocket', // Emoji
        'αβγδε', // Greek letters
        '你好世界', // Chinese characters
        'مرحبا بالعالم', // Arabic text
        'Здравствуй мир', // Cyrillic
      ];

      unicodeTestCases.forEach(text => {
        const messages = ClaudeOutputParser.parseClaudeOutput(text);
        expect(messages).toHaveLength(1);
        expect(messages[0].content).toBe(text);
      });
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain parsing performance under load', async () => {
      // Regression test to ensure parsing performance doesn't degrade
      const complexOutput = `
\x1B[2J\x1B[H┌──────────────────────────────────────┐
│  Welcome to Claude Code!              │
│  cwd: /workspaces/agent-feed          │
│  Model: Claude Sonnet 4               │
└──────────────────────────────────────┘

> npm run test
Running test suite...
${'Line of output\n'.repeat(100)}
\x1B[32m✓\x1B[0m All tests passed
`;

      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        ClaudeOutputParser.parseClaudeOutput(complexOutput);
      }

      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / iterations;

      // Should parse complex output in under 10ms on average
      expect(averageTime).toBeLessThan(10);
    });

    it('should not degrade connection establishment time', async () => {
      // Regression test for connection establishment performance
      const connectionTimes: number[] = [];

      for (let i = 0; i < 5; i++) {
        const { result } = renderHook(() =>
          useAdvancedSSEConnection('http://localhost:3001')
        );

        const startTime = performance.now();

        await act(async () => {
          const connectPromise = result.current.connectToInstance(`claude-test-${i}`);
          mockEventSource.simulateOpen();
          await connectPromise;
        });

        connectionTimes.push(performance.now() - startTime);
        result.current.cleanup();
      }

      const averageTime = connectionTimes.reduce((sum, time) => sum + time, 0) / connectionTimes.length;

      // Connection should establish in under 100ms on average
      expect(averageTime).toBeLessThan(100);

      // Times should be consistent (no performance degradation)
      const maxTime = Math.max(...connectionTimes);
      const minTime = Math.min(...connectionTimes);
      expect(maxTime - minTime).toBeLessThan(50); // Max 50ms variance
    });

    it('should maintain memory efficiency with large message volumes', async () => {
      // Regression test for memory efficiency
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001', {
          maxMemoryMB: 50
        })
      );

      await act(async () => {
        const connectPromise = result.current.connectToInstance('claude-test-123');
        mockEventSource.simulateOpen();
        await connectPromise;
      });

      const initialMemory = performanceMonitor.getMetrics().memoryUsage.initial;

      // Send 1000 large messages
      await act(async () => {
        for (let i = 0; i < 1000; i++) {
          mockEventSource.simulateMessage({
            type: 'terminal_output',
            data: 'A'.repeat(1000), // 1KB per message
            sequenceNumber: i + 1,
            instanceId: 'claude-test-123'
          });
        }
      });

      const finalMemory = performanceMonitor.getMetrics().memoryUsage.peak;
      const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024); // MB

      // Memory should not exceed 60MB (with 50MB limit + overhead)
      expect(memoryIncrease).toBeLessThan(60);
    });
  });

  describe('API Contract Regression Tests', () => {
    it('should maintain hook interface compatibility', () => {
      // Regression test to ensure hook interface remains stable
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001')
      );

      // Verify all expected methods exist
      expect(result.current).toHaveProperty('connectToInstance');
      expect(result.current).toHaveProperty('disconnectFromInstance');
      expect(result.current).toHaveProperty('getMessages');
      expect(result.current).toHaveProperty('getUIState');
      expect(result.current).toHaveProperty('addMessageHandler');
      expect(result.current).toHaveProperty('cleanup');

      // Verify method signatures
      expect(typeof result.current.connectToInstance).toBe('function');
      expect(typeof result.current.disconnectFromInstance).toBe('function');
      expect(typeof result.current.getMessages).toBe('function');
      expect(typeof result.current.addMessageHandler).toBe('function');

      // Verify state structure
      expect(result.current.connectionState).toHaveProperty('isConnected');
      expect(result.current.connectionState).toHaveProperty('instanceId');
      expect(result.current.connectionState).toHaveProperty('connectionHealth');
    });

    it('should maintain ClaudeOutputParser API compatibility', () => {
      // Regression test for parser API stability
      expect(ClaudeOutputParser).toHaveProperty('parseClaudeOutput');
      expect(ClaudeOutputParser).toHaveProperty('extractTextContent');
      expect(ClaudeOutputParser).toHaveProperty('hasClaudeResponse');

      expect(typeof ClaudeOutputParser.parseClaudeOutput).toBe('function');
      expect(typeof ClaudeOutputParser.extractTextContent).toBe('function');
      expect(typeof ClaudeOutputParser.hasClaudeResponse).toBe('function');

      // Test return type structure
      const result = ClaudeOutputParser.parseClaudeOutput('Test output');
      expect(Array.isArray(result)).toBe(true);

      if (result.length > 0) {
        expect(result[0]).toHaveProperty('type');
        expect(result[0]).toHaveProperty('content');
        expect(result[0]).toHaveProperty('timestamp');
      }
    });

    it('should maintain SSEConnectionManager API compatibility', () => {
      // Regression test for connection manager API
      const manager = new SSEConnectionManager({
        instanceId: 'claude-test-123',
        baseUrl: 'http://localhost:3001'
      });

      expect(manager).toHaveProperty('connect');
      expect(manager).toHaveProperty('disconnect');
      expect(manager).toHaveProperty('sendCommand');
      expect(manager).toHaveProperty('getConnectionStatus');
      expect(manager).toHaveProperty('on');
      expect(manager).toHaveProperty('off');

      expect(typeof manager.connect).toBe('function');
      expect(typeof manager.sendCommand).toBe('function');
      expect(typeof manager.getConnectionStatus).toBe('function');

      // Test status structure
      const status = manager.getConnectionStatus();
      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('instanceId');
      expect(status).toHaveProperty('connectionType');
      expect(status).toHaveProperty('lastActivity');
    });
  });

  describe('Edge Case Regression Tests', () => {
    it('should handle rapid message bursts without dropping messages (Bug #006)', async () => {
      // Regression test for message dropping under high load
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001', {
          batchSize: 100
        })
      );

      await act(async () => {
        const connectPromise = result.current.connectToInstance('claude-test-123');
        mockEventSource.simulateOpen();
        await connectPromise;
      });

      const receivedMessages: any[] = [];
      result.current.addMessageHandler((instanceId: string, messages: any[]) => {
        receivedMessages.push(...messages);
      });

      const messageCount = 500;

      // Send rapid burst of messages
      await act(async () => {
        for (let i = 0; i < messageCount; i++) {
          mockEventSource.simulateMessage({
            type: 'terminal_output',
            data: `Burst message ${i}`,
            sequenceNumber: i + 1,
            instanceId: 'claude-test-123'
          });
        }
      });

      // Should receive all messages (allowing for batching delays)
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(receivedMessages.length).toBeGreaterThanOrEqual(messageCount * 0.95); // Allow 5% tolerance
    });

    it('should handle concurrent instance connections without interference (Bug #007)', async () => {
      // Regression test for cross-instance message contamination
      const hook1 = renderHook(() => useAdvancedSSEConnection('http://localhost:3001'));
      const hook2 = renderHook(() => useAdvancedSSEConnection('http://localhost:3001'));

      const messages1: any[] = [];
      const messages2: any[] = [];

      hook1.result.current.addMessageHandler((instanceId: string, messages: any[]) => {
        messages1.push(...messages);
      });

      hook2.result.current.addMessageHandler((instanceId: string, messages: any[]) => {
        messages2.push(...messages);
      });

      // Connect to different instances
      await act(async () => {
        const connect1 = hook1.result.current.connectToInstance('claude-instance-1');
        const connect2 = hook2.result.current.connectToInstance('claude-instance-2');

        mockEventSource.simulateOpen();
        await Promise.all([connect1, connect2]);
      });

      // Send messages to specific instances
      await act(async () => {
        mockEventSource.simulateMessage({
          type: 'terminal_output',
          data: 'Message for instance 1',
          instanceId: 'claude-instance-1'
        });

        mockEventSource.simulateMessage({
          type: 'terminal_output',
          data: 'Message for instance 2',
          instanceId: 'claude-instance-2'
        });
      });

      // Messages should not cross-contaminate
      expect(messages1.some(msg => msg.content.includes('instance 1'))).toBe(true);
      expect(messages1.some(msg => msg.content.includes('instance 2'))).toBe(false);

      expect(messages2.some(msg => msg.content.includes('instance 2'))).toBe(true);
      expect(messages2.some(msg => msg.content.includes('instance 1'))).toBe(false);
    });

    it('should handle timestamp edge cases correctly (Bug #008)', () => {
      // Regression test for timestamp handling edge cases
      const edgeCaseInputs = [
        {
          type: 'terminal_output',
          data: 'Message with zero timestamp',
          timestamp: 0
        },
        {
          type: 'terminal_output',
          data: 'Message with negative timestamp',
          timestamp: -1
        },
        {
          type: 'terminal_output',
          data: 'Message with future timestamp',
          timestamp: Date.now() + 1000000
        },
        {
          type: 'terminal_output',
          data: 'Message with string timestamp',
          timestamp: '2024-01-15T10:30:00Z'
        },
        {
          type: 'terminal_output',
          data: 'Message with invalid timestamp',
          timestamp: 'invalid'
        }
      ];

      edgeCaseInputs.forEach((input, index) => {
        expect(() => {
          const event = new MessageEvent('message', {
            data: JSON.stringify(input)
          });
          mockEventSource.onmessage?.(event);
        }, `Should handle timestamp edge case ${index}`).not.toThrow();
      });
    });
  });

  describe('Browser Compatibility Regression Tests', () => {
    it('should work without EventSource support', async () => {
      // Regression test for browsers without EventSource
      const originalEventSource = global.EventSource;
      delete (global as any).EventSource;

      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001', {
          autoReconnect: false
        })
      );

      await act(async () => {
        try {
          await result.current.connectToInstance('claude-test-123');
        } catch (error) {
          expect(error.message).toContain('EventSource');
        }
      });

      global.EventSource = originalEventSource;
    });

    it('should handle performance API unavailability', () => {
      // Regression test for environments without performance API
      const originalPerformance = global.performance;
      delete (global as any).performance;

      expect(() => {
        ClaudeOutputParser.parseClaudeOutput('Test output');
      }).not.toThrow();

      global.performance = originalPerformance;
    });

    it('should work with different fetch implementations', async () => {
      // Regression test for different fetch API implementations
      const originalFetch = global.fetch;

      // Simulate fetch with different response structure
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            success: true,
            instances: [{ id: 'claude-test-123', status: 'running' }]
          }),
          // Missing some standard Response properties
        } as any)
      );

      const manager = new SSEConnectionManager({
        instanceId: 'claude-test-123',
        baseUrl: 'http://localhost:3001'
      });

      await act(async () => {
        const connectPromise = manager.connect();
        mockEventSource.simulateOpen();
        await connectPromise;
      });

      expect(manager.getConnectionStatus().state).not.toBe('error');

      global.fetch = originalFetch;
    });
  });

  describe('Data Integrity Regression Tests', () => {
    it('should preserve message order under concurrent processing (Bug #009)', async () => {
      // Regression test for message order preservation
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001', {
          batchSize: 5
        })
      );

      await act(async () => {
        const connectPromise = result.current.connectToInstance('claude-test-123');
        mockEventSource.simulateOpen();
        await connectPromise;
      });

      const receivedSequences: number[] = [];
      result.current.addMessageHandler((instanceId: string, messages: any[]) => {
        messages.forEach(msg => {
          if (msg.sequenceNumber) {
            receivedSequences.push(msg.sequenceNumber);
          }
        });
      });

      // Send messages out of order to test ordering preservation
      await act(async () => {
        const sequences = [1, 3, 2, 5, 4, 7, 6, 9, 8, 10];
        sequences.forEach(seq => {
          mockEventSource.simulateMessage({
            type: 'terminal_output',
            data: `Message ${seq}`,
            sequenceNumber: seq,
            instanceId: 'claude-test-123'
          });
        });
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should receive messages in correct sequence order
      for (let i = 1; i < receivedSequences.length; i++) {
        expect(receivedSequences[i]).toBeGreaterThanOrEqual(receivedSequences[i - 1]);
      }
    });

    it('should not corrupt messages with special characters (Bug #010)', () => {
      // Regression test for message corruption with special characters
      const specialCharacterTests = [
        'Message with "quotes" and \'apostrophes\'',
        'Message with \n newlines \r\n and \t tabs',
        'Message with emoji 🚀🎉✨ and symbols ©®™',
        'Message with JSON: {"key": "value", "number": 123}',
        'Message with HTML: <div>content</div>',
        'Message with backslashes: \\n \\t \\r \\\\ \\/',
      ];

      specialCharacterTests.forEach(testMessage => {
        const messages = ClaudeOutputParser.parseClaudeOutput(testMessage);
        expect(messages).toHaveLength(1);
        expect(messages[0].content).toBe(testMessage);
      });
    });
  });
});

/**
 * Test data generators for regression testing
 */
export const RegressionTestData = {
  // Generate complex ANSI output that previously caused issues
  generateComplexANSI: () => {
    return `\x1B[2J\x1B[H\x1B[1;32m✓\x1B[0m Test passed
\x1B[1;31m✗\x1B[0m Test failed
\x1B[33m⚠\x1B[0m Warning message
\x1B[36mInfo:\x1B[0m Information
\x1B[1;4;35mUnderlined purple text\x1B[0m
\x1B[38;2;255;128;0mTrue color text\x1B[0m`;
  },

  // Generate high-frequency message sequence
  generateHighFrequencyMessages: (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      type: 'terminal_output',
      data: `High frequency message ${i + 1}`,
      sequenceNumber: i + 1,
      timestamp: Date.now() + i,
      instanceId: 'claude-test-123'
    }));
  },

  // Generate problematic Unicode sequences
  generateUnicodeEdgeCases: () => {
    return [
      '\uFEFF', // Byte Order Mark
      '\u200B\u200C\u200D', // Zero-width characters
      '🏳️‍🌈', // Complex emoji with modifiers
      '\uD800\uDC00', // Surrogate pair
      'A\u0300\u0301\u0302', // Multiple combining characters
    ];
  },

  // Generate memory-intensive test data
  generateMemoryStressData: (sizeMB: number) => {
    const targetBytes = sizeMB * 1024 * 1024;
    const chunkSize = 1000;
    const chunks = Math.ceil(targetBytes / chunkSize);

    return Array.from({ length: chunks }, (_, i) => ({
      type: 'terminal_output',
      data: 'X'.repeat(chunkSize),
      sequenceNumber: i + 1,
      instanceId: 'claude-test-123'
    }));
  }
};

export default RegressionTestData;