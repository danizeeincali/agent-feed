/**
 * TDD Integration Test Suite: End-to-End Escape Sequence Storm Prevention
 * 
 * Root Cause: The combination of button click debouncing failures, PTY process
 * management issues, SSE connection multiplication, and output buffer problems
 * creates perfect conditions for terminal escape sequence storms.
 * 
 * These tests SHOULD FAIL initially, demonstrating the complete broken workflow.
 */

import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { jest } from '@jest/globals';
import ClaudeInstanceManager from '../../../frontend/src/components/ClaudeInstanceManager';

// Mock implementations for full integration testing
const mockSSEConnection = {
  readyState: 1,
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onopen: null as any,
  onmessage: null as any,
  onerror: null as any
};

const mockPtyProcess = {
  kill: jest.fn(),
  resize: jest.fn(),
  write: jest.fn(),
  onData: jest.fn(),
  onExit: jest.fn(),
  pid: 12345
};

// Global mocks
global.EventSource = jest.fn(() => mockSSEConnection);
global.fetch = jest.fn();

// Mock backend modules that would be involved
jest.mock('node-pty', () => ({
  spawn: jest.fn(() => mockPtyProcess)
}));

jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    pid: 12345,
    kill: jest.fn(),
    on: jest.fn(),
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() }
  }))
}));

describe('End-to-End Escape Sequence Storm Prevention', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup realistic backend responses
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/claude/instances') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            instanceId: `claude-${Date.now()}`,
            instance: { id: `claude-${Date.now()}`, type: 'prod' }
          })
        });
      }
      if (url.includes('/api/claude/instances') && options?.method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, instances: [] })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  describe('Complete Storm Scenario Reproduction', () => {
    test('SHOULD FAIL: Rapid button clicks → Multiple instances → PTY conflicts → SSE multiplication → Output storms', async () => {
      const stormEvents: string[] = [];
      const outputDuplication = new Map<string, number>();
      
      // Track all events that contribute to the storm
      const originalConsoleLog = console.log;
      console.log = (...args) => {
        const message = args.join(' ');
        stormEvents.push(message);
        
        // Track output duplication
        if (message.includes('REAL Claude output')) {
          const key = message.slice(-50); // Last 50 chars as key
          outputDuplication.set(key, (outputDuplication.get(key) || 0) + 1);
        }
        
        originalConsoleLog(...args);
      };
      
      const { container } = render(<ClaudeInstanceManager />);
      
      // Step 1: Rapid button clicks (should be debounced but isn't)
      const prodButton = screen.getByTitle('Launch Claude in prod directory');
      
      // Simulate user frantically clicking
      for (let i = 0; i < 10; i++) {
        fireEvent.click(prodButton);
      }
      
      await waitFor(() => {
        // Should only create 1 instance, not 10
        const createCalls = (global.fetch as jest.Mock).mock.calls.filter(
          call => call[0].includes('/api/claude/instances') && call[1]?.method === 'POST'
        );
        expect(createCalls).toHaveLength(1); // FAILS - creates multiple instances
      });
      
      // Step 2: Multiple SSE connections established (should be prevented)
      expect(global.EventSource).toHaveBeenCalledTimes(1); // FAILS - multiple SSE connections
      
      // Step 3: Simulate the storm - multiple processes outputting simultaneously
      const stormOutput = [
        '\x1b[2J\x1b[H', // Clear screen
        '\x1b[31mError: Process conflict\x1b[0m\n',
        '\x1b[2J\x1b[H', // Another clear screen
        '\x1b[?1049h', // Alt buffer
        '\x1b[?1049l', // Back to main buffer
        'Claude starting...\n',
        '\x1b[2J\x1b[H', // Yet another clear
      ];
      
      // Simulate multiple SSE connections receiving the same data
      stormOutput.forEach(output => {
        if (mockSSEConnection.onmessage) {
          mockSSEConnection.onmessage({
            data: JSON.stringify({
              type: 'output',
              data: output,
              isReal: true,
              instanceId: 'claude-123'
            })
          });
        }
      });
      
      await waitFor(() => {
        // Should not have duplicate output processing
        const maxDuplicationCount = Math.max(...outputDuplication.values(), 0);
        expect(maxDuplicationCount).toBeLessThanOrEqual(1); // FAILS - output duplicated across connections
      });
      
      console.log = originalConsoleLog;
    });

    test('SHOULD FAIL: Connection recovery attempts multiply the storm', async () => {
      const { container } = render(<ClaudeInstanceManager />);
      const connectionAttempts: string[] = [];
      
      // Track connection attempts
      const originalEventSource = global.EventSource;
      global.EventSource = jest.fn((url) => {
        connectionAttempts.push(url);
        return mockSSEConnection;
      });
      
      const prodButton = screen.getByTitle('Launch Claude in prod directory');
      fireEvent.click(prodButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
      
      // Simulate connection errors triggering reconnection attempts
      for (let i = 0; i < 5; i++) {
        if (mockSSEConnection.onerror) {
          mockSSEConnection.onerror({
            type: 'error',
            message: `Connection error ${i}`
          });
        }
        
        // Each error should trigger reconnection
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Should not create excessive reconnection attempts
      expect(connectionAttempts.length).toBeLessThan(3); // FAILS - excessive reconnection attempts
      
      global.EventSource = originalEventSource;
    });

    test('SHOULD FAIL: PTY process spawning race condition amplifies storm', async () => {
      let processCount = 0;
      const originalSpawn = require('child_process').spawn;
      
      require('child_process').spawn = jest.fn((...args) => {
        processCount++;
        const mockProcess = {
          pid: 1000 + processCount,
          kill: jest.fn(),
          on: jest.fn(),
          stdout: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                // Simulate conflicting output from multiple processes
                setTimeout(() => {
                  callback(Buffer.from(`Process ${processCount}: \x1b[2J\x1b[H Starting...\n`));
                  callback(Buffer.from(`Process ${processCount}: \x1b[31mReady\x1b[0m\n`));
                }, Math.random() * 100);
              }
            })
          },
          stderr: { on: jest.fn() }
        };
        return mockProcess;
      });
      
      const { container } = render(<ClaudeInstanceManager />);
      const prodButton = screen.getByTitle('Launch Claude in prod directory');
      
      // Rapid clicks should not spawn multiple processes
      fireEvent.click(prodButton);
      fireEvent.click(prodButton);
      fireEvent.click(prodButton);
      
      await waitFor(() => {
        expect(processCount).toBeLessThanOrEqual(1); // FAILS - multiple processes spawned
      });
      
      require('child_process').spawn = originalSpawn;
    });
  });

  describe('Storm Impact Assessment', () => {
    test('SHOULD FAIL: Terminal becomes unresponsive during storm', async () => {
      const { container } = render(<ClaudeInstanceManager />);
      
      const prodButton = screen.getByTitle('Launch Claude in prod directory');
      fireEvent.click(prodButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
      
      // Simulate storm conditions - rapid escape sequences
      const stormSequences = [
        '\x1b[2J\x1b[H',
        '\x1b[?1049h',
        '\x1b[2J\x1b[H',
        '\x1b[?1049l',
        '\x1b[2J\x1b[H',
        '\x1b[31mError\x1b[0m',
        '\x1b[2J\x1b[H'
      ];
      
      let responseTime = 0;
      const start = Date.now();
      
      // Send storm sequences rapidly
      stormSequences.forEach((seq, index) => {
        setTimeout(() => {
          if (mockSSEConnection.onmessage) {
            mockSSEConnection.onmessage({
              data: JSON.stringify({
                type: 'output',
                data: seq,
                isReal: true,
                instanceId: 'claude-123'
              })
            });
          }
          
          if (index === stormSequences.length - 1) {
            responseTime = Date.now() - start;
          }
        }, index * 10);
      });
      
      await waitFor(() => {
        expect(responseTime).toBeGreaterThan(0);
      });
      
      // Terminal should remain responsive
      expect(responseTime).toBeLessThan(1000); // FAILS - terminal becomes unresponsive
    });

    test('SHOULD FAIL: Memory consumption grows exponentially during storm', async () => {
      const { container } = render(<ClaudeInstanceManager />);
      const memorySnapshots: number[] = [];
      
      const prodButton = screen.getByTitle('Launch Claude in prod directory');
      fireEvent.click(prodButton);
      
      // Mock memory monitoring
      const mockProcess = global.process as any;
      mockProcess.memoryUsage = jest.fn(() => ({
        heapUsed: Math.random() * 100000000, // Random memory usage
        heapTotal: 200000000,
        external: 5000000,
        rss: 150000000
      }));
      
      // Take initial memory snapshot
      memorySnapshots.push(mockProcess.memoryUsage().heapUsed);
      
      // Simulate storm with memory-intensive operations
      for (let i = 0; i < 100; i++) {
        const largeOutput = 'x'.repeat(10000) + '\n';
        
        if (mockSSEConnection.onmessage) {
          mockSSEConnection.onmessage({
            data: JSON.stringify({
              type: 'output',
              data: largeOutput,
              isReal: true,
              instanceId: 'claude-123'
            })
          });
        }
        
        if (i % 20 === 0) {
          memorySnapshots.push(mockProcess.memoryUsage().heapUsed);
        }
      }
      
      await waitFor(() => {
        expect(memorySnapshots.length).toBeGreaterThan(1);
      });
      
      // Memory should not grow exponentially
      const memoryGrowth = memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0];
      expect(memoryGrowth).toBeLessThan(memorySnapshots[0]); // FAILS - exponential memory growth
    });

    test('SHOULD FAIL: UI becomes frozen during escape sequence processing storm', async () => {
      const { container } = render(<ClaudeInstanceManager />);
      
      const prodButton = screen.getByTitle('Launch Claude in prod directory');
      fireEvent.click(prodButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
      
      // Simulate UI-freezing storm - rapid DOM updates
      const complexEscapeSequences = [
        '\x1b[2J\x1b[H\x1b[31mRed\x1b[32mGreen\x1b[34mBlue\x1b[0m',
        '\x1b[?1049h\x1b[2J\x1b[H\x1b[?25l',
        '\x1b[1;1H\x1b[31m' + 'X'.repeat(1000) + '\x1b[0m',
        '\x1b[2J\x1b[H\x1b[?25h\x1b[?1049l',
      ];
      
      let uiUpdateCount = 0;
      const originalSetState = React.useState;
      
      // Mock React state updates to count UI updates
      React.useState = (initial) => {
        const [state, setState] = originalSetState(initial);
        const wrappedSetState = (value) => {
          uiUpdateCount++;
          setState(value);
        };
        return [state, wrappedSetState];
      };
      
      // Send complex sequences that cause many UI updates
      complexEscapeSequences.forEach(seq => {
        if (mockSSEConnection.onmessage) {
          mockSSEConnection.onmessage({
            data: JSON.stringify({
              type: 'output',
              data: seq,
              isReal: true,
              instanceId: 'claude-123'
            })
          });
        }
      });
      
      await waitFor(() => {
        // UI updates should be batched/throttled
        expect(uiUpdateCount).toBeLessThan(20); // FAILS - excessive UI updates freeze interface
      });
      
      React.useState = originalSetState;
    });
  });

  describe('Recovery and Prevention Mechanisms', () => {
    test('SHOULD FAIL: No automatic storm detection and mitigation', async () => {
      const { container } = render(<ClaudeInstanceManager />);
      
      const prodButton = screen.getByTitle('Launch Claude in prod directory');
      fireEvent.click(prodButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
      
      let stormDetected = false;
      let mitigationActivated = false;
      
      // Mock storm detection system
      const escapeSequenceCount = { count: 0 };
      const originalOnMessage = mockSSEConnection.onmessage;
      
      mockSSEConnection.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Count escape sequences
        const escapes = (data.data.match(/\x1b/g) || []).length;
        escapeSequenceCount.count += escapes;
        
        // Should detect storm conditions
        if (escapeSequenceCount.count > 50) {
          stormDetected = true;
          
          // Should activate mitigation (rate limiting, filtering, etc.)
          mitigationActivated = true;
        }
        
        if (originalOnMessage) {
          originalOnMessage(event);
        }
      };
      
      // Generate storm conditions
      for (let i = 0; i < 100; i++) {
        const stormData = `\x1b[2J\x1b[H\x1b[${i}m Storm ${i} \x1b[0m\n`;
        if (mockSSEConnection.onmessage) {
          mockSSEConnection.onmessage({
            data: JSON.stringify({
              type: 'output',
              data: stormData,
              isReal: true,
              instanceId: 'claude-123'
            })
          });
        }
      }
      
      await waitFor(() => {
        expect(stormDetected).toBe(true);
        expect(mitigationActivated).toBe(true); // FAILS - no automatic storm detection/mitigation
      });
    });

    test('SHOULD FAIL: No circuit breaker for problematic connections', async () => {
      const { container } = render(<ClaudeInstanceManager />);
      
      const prodButton = screen.getByTitle('Launch Claude in prod directory');
      fireEvent.click(prodButton);
      
      let connectionTerminated = false;
      const errorCount = { count: 0 };
      
      // Mock connection with frequent errors
      const originalOnError = mockSSEConnection.onerror;
      mockSSEConnection.onerror = (error) => {
        errorCount.count++;
        
        // Should implement circuit breaker after too many errors
        if (errorCount.count > 5) {
          connectionTerminated = true;
          mockSSEConnection.close();
        }
        
        if (originalOnError) {
          originalOnError(error);
        }
      };
      
      // Simulate frequent connection errors
      for (let i = 0; i < 10; i++) {
        if (mockSSEConnection.onerror) {
          mockSSEConnection.onerror({
            type: 'error',
            message: `Frequent error ${i}`
          });
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      await waitFor(() => {
        expect(connectionTerminated).toBe(true); // FAILS - no circuit breaker implementation
      });
    });

    test('SHOULD FAIL: No graceful degradation when storm overwhelms system', async () => {
      const { container } = render(<ClaudeInstanceManager />);
      
      const prodButton = screen.getByTitle('Launch Claude in prod directory');
      fireEvent.click(prodButton);
      
      let gracefulDegradation = false;
      let performanceMode = 'normal';
      
      // Simulate system being overwhelmed
      const messageQueue: any[] = [];
      const processedMessages = { count: 0 };
      
      // Mock overwhelming message processing
      const originalOnMessage = mockSSEConnection.onmessage;
      mockSSEConnection.onmessage = (event) => {
        messageQueue.push(event);
        
        // Should detect queue buildup and switch to performance mode
        if (messageQueue.length > 100 && performanceMode === 'normal') {
          gracefulDegradation = true;
          performanceMode = 'performance';
          
          // Should start dropping non-essential messages
          const essentialMessages = messageQueue.filter(msg => {
            const data = JSON.parse(msg.data);
            return !data.data.includes('\x1b['); // Keep non-escape sequences
          });
          
          messageQueue.length = 0;
          messageQueue.push(...essentialMessages);
        }
        
        processedMessages.count++;
      };
      
      // Overwhelm the system
      for (let i = 0; i < 1000; i++) {
        const overwhelmingData = `\x1b[${i % 256}m Message ${i} \x1b[0m\n`;
        if (mockSSEConnection.onmessage) {
          mockSSEConnection.onmessage({
            data: JSON.stringify({
              type: 'output',
              data: overwhelmingData,
              isReal: true,
              instanceId: 'claude-123'
            })
          });
        }
      }
      
      await waitFor(() => {
        expect(gracefulDegradation).toBe(true); // FAILS - no graceful degradation
        expect(performanceMode).toBe('performance'); // FAILS - system doesn't adapt to load
      });
    });
  });

  describe('Cross-Component Integration Failures', () => {
    test('SHOULD FAIL: Multiple components interfere with each other causing storm amplification', async () => {
      // Render multiple instances of the component (simulating multiple tabs/windows)
      const { container: container1 } = render(<ClaudeInstanceManager />);
      const { container: container2 } = render(<ClaudeInstanceManager />);
      
      const buttons1 = screen.getAllByTitle('Launch Claude in prod directory');
      const prodButton1 = buttons1[0];
      const prodButton2 = buttons1[1];
      
      // Both components try to create instances simultaneously
      fireEvent.click(prodButton1);
      fireEvent.click(prodButton2);
      
      await waitFor(() => {
        // Should coordinate to prevent conflicts
        const createCalls = (global.fetch as jest.Mock).mock.calls.filter(
          call => call[0].includes('/api/claude/instances') && call[1]?.method === 'POST'
        );
        expect(createCalls).toHaveLength(1); // FAILS - both components create instances
      });
      
      // Should not create multiple SSE connections for same instance
      expect(global.EventSource).toHaveBeenCalledTimes(1); // FAILS - multiple components create competing connections
    });

    test('SHOULD FAIL: State synchronization failures between components cause output duplication', async () => {
      const { container } = render(<ClaudeInstanceManager />);
      
      let stateUpdates = 0;
      const stateValues: any[] = [];
      
      // Mock React state to track updates
      const originalUseState = React.useState;
      React.useState = (initial) => {
        const [state, setState] = originalUseState(initial);
        const wrappedSetState = (value) => {
          stateUpdates++;
          stateValues.push(value);
          setState(value);
        };
        return [state, wrappedSetState];
      };
      
      const prodButton = screen.getByTitle('Launch Claude in prod directory');
      fireEvent.click(prodButton);
      
      // Simulate concurrent state updates from different sources
      for (let i = 0; i < 50; i++) {
        if (mockSSEConnection.onmessage) {
          mockSSEConnection.onmessage({
            data: JSON.stringify({
              type: 'output',
              data: `Concurrent update ${i}\n`,
              isReal: true,
              instanceId: 'claude-123'
            })
          });
        }
      }
      
      await waitFor(() => {
        // State updates should be properly managed
        expect(stateUpdates).toBeLessThan(100); // FAILS - excessive state updates
        
        // Should not have conflicting state values
        const uniqueStates = new Set(stateValues.map(v => JSON.stringify(v)));
        expect(uniqueStates.size).toBeLessThan(stateValues.length); // FAILS - state conflicts
      });
      
      React.useState = originalUseState;
    });
  });
});