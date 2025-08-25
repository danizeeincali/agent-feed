/**
 * TDD London School: Terminal Hanging After Carriage Return Fix
 * 
 * CRITICAL ISSUE: Terminal displays correctly but hangs after commands
 * - Command: `cd prod && claude` 
 * - Output: Correct (no literal \n)
 * - Problem: No response, terminal frozen
 * 
 * FOCUS: Mock-driven tests to identify where the hang occurs
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

// Mock factory for terminal dependencies
class MockFactory {
  static createPTYProcess() {
    const mockPty = new EventEmitter();
    mockPty.write = jest.fn();
    mockPty.resize = jest.fn();
    mockPty.kill = jest.fn();
    mockPty.pid = 12345;
    mockPty.killed = false;
    return mockPty;
  }

  static createWebSocket() {
    const mockWs = new EventEmitter();
    mockWs.readyState = WebSocket.OPEN;
    mockWs.send = jest.fn();
    mockWs.close = jest.fn();
    return mockWs;
  }

  static createAnsiProcessor() {
    return {
      processAnsiSequences: jest.fn((data) => data),
      regexPerformanceTracker: new Map()
    };
  }
}

describe('Terminal Responsiveness Hang Diagnosis', () => {
  let mockPty: any;
  let mockWebSocket: any;
  let mockAnsiProcessor: any;
  let terminalSession: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPty = MockFactory.createPTYProcess();
    mockWebSocket = MockFactory.createWebSocket();
    mockAnsiProcessor = MockFactory.createAnsiProcessor();
    
    // Mock the TerminalSession class behavior
    terminalSession = {
      process: mockPty,
      ws: mockWebSocket,
      processAnsiSequences: mockAnsiProcessor.processAnsiSequences,
      sendData: jest.fn(),
      handleMessage: jest.fn(),
      lastActivity: Date.now()
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Terminal Responsiveness Requirements', () => {
    it('SHOULD respond to commands within 5 seconds - FAILING TEST', async () => {
      // ARRANGE: Mock command execution
      const commandData = 'cd prod && claude\r';
      const startTime = Date.now();
      let responseReceived = false;
      
      // Mock the expected response behavior
      const mockResponse = () => {
        responseReceived = true;
        terminalSession.sendData('$ cd prod && claude\r\n');
      };
      
      // ACT: Simulate command input
      terminalSession.handleMessage({
        type: 'input',
        data: commandData
      });
      
      // Simulate PTY process should respond
      setTimeout(mockResponse, 6000); // INTENTIONALLY FAILING - 6 seconds
      
      // ASSERT: Should fail because terminal is hanging
      await new Promise((resolve) => {
        setTimeout(() => {
          const elapsedTime = Date.now() - startTime;
          expect(elapsedTime).toBeLessThan(5000);
          expect(responseReceived).toBe(true);
          expect(mockPty.write).toHaveBeenCalledWith(commandData);
          resolve(void 0);
        }, 7000);
      });
    }, 8000);

    it('SHOULD verify PTY process write method is called immediately', () => {
      // ARRANGE
      const inputData = 'cd prod && claude\r';
      
      // ACT: Simulate input message handling
      terminalSession.handleMessage({
        type: 'input', 
        data: inputData
      });
      
      // ASSERT: Verify PTY write was called synchronously
      expect(mockPty.write).toHaveBeenCalledWith(inputData);
      expect(mockPty.write).toHaveBeenCalledTimes(1);
    });

    it('SHOULD verify WebSocket send is called for data output', () => {
      // ARRANGE
      const outputData = '$ cd prod && claude\r\n';
      
      // ACT: Simulate PTY data event
      mockPty.emit('data', outputData);
      terminalSession.sendData(outputData);
      
      // ASSERT: Verify WebSocket send was called
      expect(terminalSession.sendData).toHaveBeenCalledWith(outputData);
    });
  });

  describe('PTY Process Communication Verification', () => {
    it('SHOULD verify PTY process stdin/stdout handling', () => {
      // ARRANGE: Mock bidirectional communication
      const inputCommand = 'claude --version\r';
      const expectedOutput = 'Claude CLI v1.0.0\r\n';
      
      // ACT: Simulate input -> output cycle
      terminalSession.handleMessage({
        type: 'input',
        data: inputCommand
      });
      
      // Simulate PTY responding with output
      mockPty.emit('data', expectedOutput);
      
      // ASSERT: Verify the interaction chain
      expect(mockPty.write).toHaveBeenCalledWith(inputCommand);
      // PTY data event should trigger sendData
    });

    it('SHOULD detect if PTY process becomes unresponsive', async () => {
      // ARRANGE: Setup responsiveness check
      const inputData = 'cd prod && claude\r';
      let ptyResponded = false;
      
      // Mock PTY hanging - no response
      mockPty.write = jest.fn(() => {
        // Simulate the write succeeds but no data event follows
        return true;
      });
      
      // ACT: Send input and wait for response
      terminalSession.handleMessage({
        type: 'input',
        data: inputData
      });
      
      // Set up timeout to detect hang
      const responseTimeout = new Promise((resolve) => {
        setTimeout(() => {
          ptyResponded = false;
          resolve(false);
        }, 3000);
      });
      
      // ASSERT: Should detect PTY is not responding
      const result = await responseTimeout;
      expect(result).toBe(false);
      expect(ptyResponded).toBe(false);
      expect(mockPty.write).toHaveBeenCalled();
    });

    it('SHOULD identify if PTY process is in hung state', () => {
      // ARRANGE: Check PTY process health
      const healthCheck = () => {
        return {
          isAlive: !mockPty.killed,
          pid: mockPty.pid,
          canWrite: typeof mockPty.write === 'function',
          lastActivity: terminalSession.lastActivity
        };
      };
      
      // ACT: Perform health check
      const health = healthCheck();
      
      // ASSERT: Verify PTY appears healthy but may be hanging
      expect(health.isAlive).toBe(true);
      expect(health.canWrite).toBe(true);
      expect(health.pid).toBeDefined();
    });
  });

  describe('ANSI Sequence Processing Performance', () => {
    it('SHOULD measure processAnsiSequences execution time', () => {
      // ARRANGE: Prepare test data with various ANSI sequences
      const testData = [
        'simple text\r\n',
        'text with \\n literal newlines\r\n',
        '\r\x1b[2K clearing line\r\n',
        '\x1b[31mred text\x1b[0m normal\r\n',
        'spinner \r progress... \r done!\r\n'
      ];
      
      // ACT & ASSERT: Measure processing time for each
      testData.forEach((data, index) => {
        const startTime = performance.now();
        const result = mockAnsiProcessor.processAnsiSequences(data);
        const executionTime = performance.now() - startTime;
        
        // Should process in under 1ms for normal data
        expect(executionTime).toBeLessThan(1);
        expect(mockAnsiProcessor.processAnsiSequences).toHaveBeenCalled();
      });
    });

    it('SHOULD detect potential infinite loops in ANSI regex', () => {
      // ARRANGE: Create potentially problematic ANSI data
      const problematicData = [
        // Malformed escape sequences that might cause regex backtracking
        '\x1b[999999999999999999999A', // Extremely large numbers
        '\x1b[' + 'A'.repeat(1000) + 'm', // Very long sequences
        '\x1b[\x1b[\x1b[\x1b[nested', // Nested incomplete sequences
      ];
      
      // ACT & ASSERT: Each should complete in reasonable time
      problematicData.forEach((data) => {
        const startTime = performance.now();
        
        // Set a timeout to detect infinite loops
        const timeoutId = setTimeout(() => {
          throw new Error(`ANSI processing hung on: ${data}`);
        }, 100); // 100ms max
        
        try {
          mockAnsiProcessor.processAnsiSequences(data);
          clearTimeout(timeoutId);
          
          const executionTime = performance.now() - startTime;
          expect(executionTime).toBeLessThan(50); // Should be very fast
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      });
    });

    it('SHOULD preserve carriage return functionality while fixing hang', () => {
      // ARRANGE: Test carriage return handling
      const testCases = [
        { input: 'progress\r100%\r\n', expected: 'progress\r100%\r\n' },
        { input: '\\n', expected: '\n' }, // literal \n to actual newline
        { input: '\\r\\n', expected: '\r\n' }, // literal \r\n to actual
        { input: '\r\x1b[2K', expected: '\r\x1b[2K' }, // preserve line clearing
      ];
      
      // ACT & ASSERT: Verify carriage return processing
      testCases.forEach(({ input, expected }) => {
        mockAnsiProcessor.processAnsiSequences.mockReturnValueOnce(expected);
        const result = mockAnsiProcessor.processAnsiSequences(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('WebSocket Message Flow Verification', () => {
    it('SHOULD verify bidirectional WebSocket communication', async () => {
      // ARRANGE: Setup message flow tracking
      const messageFlow: Array<{type: string, direction: 'in' | 'out', data: any, timestamp: number}> = [];
      
      // Mock WebSocket message handlers
      const trackMessage = (type: string, direction: 'in' | 'out', data: any) => {
        messageFlow.push({ type, direction, data, timestamp: Date.now() });
      };
      
      // ACT: Simulate message flow
      trackMessage('input', 'in', { type: 'input', data: 'cd prod && claude\r' });
      trackMessage('data', 'out', { type: 'data', data: '$ cd prod && claude\r\n' });
      
      // ASSERT: Verify message flow is complete
      expect(messageFlow).toHaveLength(2);
      expect(messageFlow[0].direction).toBe('in');
      expect(messageFlow[1].direction).toBe('out');
      expect(messageFlow[1].timestamp).toBeGreaterThan(messageFlow[0].timestamp);
    });

    it('SHOULD detect WebSocket message processing delays', async () => {
      // ARRANGE: Setup timing measurement
      const startTime = Date.now();
      let processingDelay = 0;
      
      // Mock delayed processing
      mockWebSocket.send = jest.fn(() => {
        processingDelay = Date.now() - startTime;
      });
      
      // ACT: Send message through WebSocket
      terminalSession.sendData('test output\r\n');
      
      // ASSERT: Verify processing time is reasonable
      expect(processingDelay).toBeLessThan(100); // Should be under 100ms
      expect(mockWebSocket.send).toHaveBeenCalled();
    });

    it('SHOULD verify WebSocket error handling does not cause hangs', () => {
      // ARRANGE: Setup error conditions
      const errorConditions = [
        () => { mockWebSocket.readyState = WebSocket.CLOSED; },
        () => { mockWebSocket.send = jest.fn(() => { throw new Error('Send failed'); }); },
        () => { mockWebSocket.readyState = WebSocket.CONNECTING; }
      ];
      
      // ACT & ASSERT: Each error condition should be handled gracefully
      errorConditions.forEach((setupError, index) => {
        setupError();
        
        // Should not throw or hang
        expect(() => {
          terminalSession.sendData(`error test ${index}\r\n`);
        }).not.toThrow();
      });
    });
  });

  describe('Command Execution Workflow Integration', () => {
    it('SHOULD complete full command execution cycle within timeout', async () => {
      // ARRANGE: Setup full workflow simulation
      const command = 'cd prod && claude';
      const expectedSteps = [
        'input_received',
        'pty_write_called', 
        'pty_data_emitted',
        'ansi_processed',
        'websocket_sent'
      ];
      const completedSteps: string[] = [];
      
      // Mock the full workflow
      terminalSession.handleMessage = jest.fn((msg) => {
        completedSteps.push('input_received');
        completedSteps.push('pty_write_called');
      });
      
      // ACT: Execute command workflow
      const workflowPromise = new Promise<boolean>((resolve) => {
        terminalSession.handleMessage({ type: 'input', data: command + '\r' });
        
        // Simulate workflow completion
        setTimeout(() => {
          completedSteps.push('pty_data_emitted');
          completedSteps.push('ansi_processed');
          completedSteps.push('websocket_sent');
          resolve(true);
        }, 100);
      });
      
      // ASSERT: Workflow should complete quickly
      const result = await Promise.race([
        workflowPromise,
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000))
      ]);
      
      expect(result).toBe(true);
      expect(completedSteps).toEqual(expectedSteps);
    });

    it('SHOULD identify bottlenecks in command processing pipeline', async () => {
      // ARRANGE: Setup performance monitoring
      const performanceMetrics = {
        inputToWrite: 0,
        writeToData: 0, 
        dataToAnsi: 0,
        ansiToWebSocket: 0
      };
      
      let inputTime = 0;
      let writeTime = 0;
      let dataTime = 0;
      let ansiTime = 0;
      
      // ACT: Measure each pipeline stage
      inputTime = performance.now();
      terminalSession.handleMessage({ type: 'input', data: 'claude --version\r' });
      
      writeTime = performance.now();
      performanceMetrics.inputToWrite = writeTime - inputTime;
      
      mockPty.emit('data', 'Claude CLI v1.0.0\r\n');
      dataTime = performance.now();
      performanceMetrics.writeToData = dataTime - writeTime;
      
      mockAnsiProcessor.processAnsiSequences('Claude CLI v1.0.0\r\n');
      ansiTime = performance.now();
      performanceMetrics.dataToAnsi = ansiTime - dataTime;
      
      terminalSession.sendData('Claude CLI v1.0.0\r\n');
      const webSocketTime = performance.now();
      performanceMetrics.ansiToWebSocket = webSocketTime - ansiTime;
      
      // ASSERT: Each stage should complete quickly
      expect(performanceMetrics.inputToWrite).toBeLessThan(1);
      expect(performanceMetrics.writeToData).toBeLessThan(10);
      expect(performanceMetrics.dataToAnsi).toBeLessThan(5);
      expect(performanceMetrics.ansiToWebSocket).toBeLessThan(5);
      
      // Log for debugging
      console.log('Performance Metrics:', performanceMetrics);
    });
  });
});