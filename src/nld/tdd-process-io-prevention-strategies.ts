/**
 * TDD Prevention Strategies for Process I/O Capture Failures
 * Comprehensive testing patterns to prevent stdout/stderr capture failures
 * Generated: 2025-08-27
 */

export interface TDDTestPattern {
  testId: string;
  testName: string;
  description: string;
  preventedFailures: string[];
  testImplementation: string;
  assertions: string[];
  mockingStrategy: string;
  expectedBehavior: string;
  timeoutThreshold: number;
  testCategory: 'unit' | 'integration' | 'end-to-end';
}

export class TDDProcessIOPreventionStrategies {
  private testPatterns: Map<string, TDDTestPattern> = new Map();

  constructor() {
    this.initializeTestPatterns();
  }

  private initializeTestPatterns(): void {
    // Test Pattern 1: Process Stdout Readiness Verification
    this.testPatterns.set('STDOUT_READINESS_TEST', {
      testId: 'STDOUT_READINESS_TEST',
      testName: 'Process Stdout Output Readiness Test',
      description: 'Verify stdout data flows immediately after process spawn with timeout assertion',
      preventedFailures: ['STDOUT_HANDLER_SILENT', 'PROCESS_INIT_RACE'],
      testImplementation: `
describe('Process Stdout Capture', () => {
  test('should receive stdout data within timeout after spawn', async () => {
    // Arrange
    const instanceId = 'test-claude-001';
    const mockProcess = createMockClaudeProcess();
    let stdoutReceived = false;
    let receivedData = '';

    // Act
    const processInfo = await createRealClaudeInstance('prod', instanceId);
    
    // Setup stdout handler with timeout
    const stdoutPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Stdout timeout - no data received within 5000ms'));
      }, 5000);

      processInfo.process.stdout.on('data', (data) => {
        clearTimeout(timeout);
        stdoutReceived = true;
        receivedData = data.toString();
        resolve(data);
      });
    });

    // Simulate Claude process startup
    mockProcess.stdout.emit('data', Buffer.from('Claude> Ready\\n'));

    // Assert
    await expect(stdoutPromise).resolves.toBeDefined();
    expect(stdoutReceived).toBe(true);
    expect(receivedData).toContain('Claude>');
    expect(processInfo.process.pid).toBeGreaterThan(0);
  }, 10000);
});`,
      assertions: [
        'stdout data received within 5 second timeout',
        'process PID exists and is valid',
        'stdout handler callback executed',
        'received data contains expected Claude prompt'
      ],
      mockingStrategy: 'Mock Claude process with controllable stdout emission timing',
      expectedBehavior: 'Stdout data flows immediately after process spawn completion',
      timeoutThreshold: 5000,
      testCategory: 'integration'
    });

    // Test Pattern 2: SSE Message Delivery Verification
    this.testPatterns.set('SSE_DELIVERY_TEST', {
      testId: 'SSE_DELIVERY_TEST',
      testName: 'SSE Output Message Delivery Test',
      description: 'Verify process stdout data reaches frontend via SSE connections with delivery confirmation',
      preventedFailures: ['SSE_OUTPUT_GAP', 'SSE_CONNECTION_LIFECYCLE'],
      testImplementation: `
describe('SSE Output Broadcasting', () => {
  test('should deliver stdout data to all active SSE connections', async () => {
    // Arrange
    const instanceId = 'test-sse-001';
    const mockConnections = createMockSSEConnections(3); // 3 connections
    const deliveredMessages = [];
    
    mockConnections.forEach((conn, index) => {
      conn.write = jest.fn((data) => {
        deliveredMessages.push({ connectionId: index, data });
      });
    });

    // Mock active connections
    activeSSEConnections.set(instanceId, mockConnections);

    // Act
    const testOutput = 'Claude test output\\n';
    broadcastToAllConnections(instanceId, {
      type: 'output',
      data: testOutput,
      instanceId,
      timestamp: new Date().toISOString()
    });

    // Assert
    expect(deliveredMessages).toHaveLength(3);
    deliveredMessages.forEach((message) => {
      const parsedData = JSON.parse(message.data.replace('data: ', '').replace('\\n\\n', ''));
      expect(parsedData.type).toBe('output');
      expect(parsedData.data).toBe(testOutput);
      expect(parsedData.instanceId).toBe(instanceId);
    });

    // Verify all connections received the message
    mockConnections.forEach((conn) => {
      expect(conn.write).toHaveBeenCalledTimes(1);
    });
  });
});`,
      assertions: [
        'all active SSE connections receive the message',
        'message data integrity preserved',
        'JSON serialization successful',
        'connection.write() called exactly once per connection'
      ],
      mockingStrategy: 'Mock SSE response objects with write function tracking',
      expectedBehavior: 'Every active connection receives identical output messages',
      timeoutThreshold: 1000,
      testCategory: 'unit'
    });

    // Test Pattern 3: End-to-End Process Output Flow
    this.testPatterns.set('E2E_OUTPUT_FLOW_TEST', {
      testId: 'E2E_OUTPUT_FLOW_TEST',
      testName: 'End-to-End Process Output Flow Test',
      description: 'Complete integration test from process spawn to frontend output reception',
      preventedFailures: ['STDOUT_HANDLER_SILENT', 'SSE_OUTPUT_GAP', 'PROCESS_INIT_RACE'],
      testImplementation: `
describe('End-to-End Process Output Flow', () => {
  test('should complete full output flow from process to frontend', async () => {
    // Arrange
    const instanceId = 'test-e2e-001';
    const receivedMessages = [];
    let sseConnection;

    // Setup SSE connection listener
    const ssePromise = new Promise((resolve) => {
      // Simulate frontend SSE connection
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();
      
      mockResponse.write = jest.fn((data) => {
        const message = JSON.parse(data.replace('data: ', '').replace('\\n\\n', ''));
        receivedMessages.push(message);
        
        if (message.type === 'output' && message.data.includes('Ready')) {
          resolve(message);
        }
      });

      sseConnection = { req: mockRequest, res: mockResponse };
    });

    // Act - Create process and establish SSE connection
    const processInfo = await createRealClaudeInstance('prod', instanceId);
    createTerminalSSEStream(sseConnection.req, sseConnection.res, instanceId);

    // Simulate Claude process output
    processInfo.process.stdout.emit('data', Buffer.from('Claude> Ready for commands\\n'));

    // Wait for complete flow
    const finalMessage = await ssePromise;

    // Assert
    expect(finalMessage.type).toBe('output');
    expect(finalMessage.data).toContain('Ready for commands');
    expect(finalMessage.instanceId).toBe(instanceId);
    expect(finalMessage.isReal).toBe(true);

    // Verify flow sequence
    const messageTypes = receivedMessages.map(m => m.type);
    expect(messageTypes).toContain('connected');
    expect(messageTypes).toContain('output');

    // Timing assertion - output should arrive quickly
    const connectionTime = new Date(receivedMessages[0].timestamp).getTime();
    const outputTime = new Date(finalMessage.timestamp).getTime();
    expect(outputTime - connectionTime).toBeLessThan(5000); // Within 5 seconds
  }, 15000);
});`,
      assertions: [
        'complete message flow from process to frontend',
        'message types in correct sequence',
        'output timing within acceptable bounds',
        'message data integrity maintained',
        'isReal flag indicates authentic Claude output'
      ],
      mockingStrategy: 'Mock HTTP request/response objects with full SSE simulation',
      expectedBehavior: 'Seamless output flow with proper timing and message integrity',
      timeoutThreshold: 15000,
      testCategory: 'end-to-end'
    });

    // Test Pattern 4: Process Initialization Race Condition Prevention
    this.testPatterns.set('RACE_CONDITION_TEST', {
      testId: 'RACE_CONDITION_TEST',
      testName: 'Process Initialization Race Condition Test',
      description: 'Verify SSE connections wait for process readiness before expecting output',
      preventedFailures: ['PROCESS_INIT_RACE'],
      testImplementation: `
describe('Process Initialization Race Conditions', () => {
  test('should handle SSE connection before process readiness gracefully', async () => {
    // Arrange
    const instanceId = 'test-race-001';
    const connectionEvents = [];
    let processReady = false;

    // Act - Connect SSE before process is fully ready
    const processPromise = new Promise((resolve) => {
      setTimeout(async () => {
        const processInfo = await createRealClaudeInstance('prod', instanceId);
        processReady = true;
        processInfo.process.stdout.emit('data', Buffer.from('Claude> Started\\n'));
        resolve(processInfo);
      }, 2000); // 2 second delay
    });

    // Immediate SSE connection (before process ready)
    const ssePromise = new Promise((resolve) => {
      const mockResponse = createMockResponse();
      mockResponse.write = jest.fn((data) => {
        const message = JSON.parse(data.replace('data: ', '').replace('\\n\\n', ''));
        connectionEvents.push({
          ...message,
          processReady: processReady
        });

        if (message.type === 'output') {
          resolve(message);
        }
      });

      createTerminalSSEStream(createMockRequest(), mockResponse, instanceId);
    });

    // Wait for both process and SSE
    await Promise.all([processPromise, ssePromise]);

    // Assert
    const connectionMessage = connectionEvents.find(e => e.type === 'connected');
    const outputMessage = connectionEvents.find(e => e.type === 'output');

    expect(connectionMessage).toBeDefined();
    expect(outputMessage).toBeDefined();

    // Race condition handling - connection established before process ready
    expect(connectionMessage.processReady).toBe(false);
    expect(outputMessage.processReady).toBe(true);

    // Verify proper sequencing despite race condition
    expect(connectionEvents[0].type).toBe('connected');
    expect(connectionEvents[connectionEvents.length - 1].type).toBe('output');
  }, 10000);
});`,
      assertions: [
        'SSE connection established before process ready',
        'output received after process becomes ready',
        'proper message sequencing maintained',
        'no missed output due to race condition'
      ],
      mockingStrategy: 'Controlled timing with delayed process creation and immediate SSE connection',
      expectedBehavior: 'Graceful handling of connection timing mismatches',
      timeoutThreshold: 10000,
      testCategory: 'integration'
    });

    // Test Pattern 5: Connection Failure Recovery
    this.testPatterns.set('CONNECTION_RECOVERY_TEST', {
      testId: 'CONNECTION_RECOVERY_TEST',
      testName: 'SSE Connection Failure Recovery Test',
      description: 'Verify system handles SSE connection failures and dead connections gracefully',
      preventedFailures: ['SSE_OUTPUT_GAP', 'CONNECTION_CLEANUP_FAILURE'],
      testImplementation: `
describe('SSE Connection Failure Recovery', () => {
  test('should handle dead connections and cleanup properly', async () => {
    // Arrange
    const instanceId = 'test-cleanup-001';
    const activeConnections = [];
    const deadConnections = [];

    // Create mix of active and dead connections
    for (let i = 0; i < 5; i++) {
      const conn = createMockSSEConnection();
      
      if (i < 3) {
        // Active connections
        conn.destroyed = false;
        conn.writableEnded = false;
        conn.write = jest.fn();
        activeConnections.push(conn);
      } else {
        // Dead connections
        conn.destroyed = true;
        conn.writableEnded = true;
        conn.write = jest.fn(() => {
          throw new Error('ECONNRESET');
        });
        deadConnections.push(conn);
      }
    }

    const allConnections = [...activeConnections, ...deadConnections];
    activeSSEConnections.set(instanceId, allConnections);

    // Act
    broadcastToAllConnections(instanceId, {
      type: 'output',
      data: 'test output',
      instanceId
    });

    // Assert
    // Verify active connections received the message
    activeConnections.forEach((conn) => {
      expect(conn.write).toHaveBeenCalledTimes(1);
    });

    // Verify dead connections were cleaned up
    const remainingConnections = activeSSEConnections.get(instanceId) || [];
    expect(remainingConnections).toHaveLength(3); // Only active connections remain
    
    // Ensure no dead connections in the remaining list
    remainingConnections.forEach((conn) => {
      expect(conn.destroyed).toBe(false);
      expect(conn.writableEnded).toBe(false);
    });
  });
});`,
      assertions: [
        'active connections receive messages successfully',
        'dead connections removed from tracking',
        'no errors thrown from dead connection cleanup',
        'connection count accurate after cleanup'
      ],
      mockingStrategy: 'Mix of mock active/dead connections with controlled failure conditions',
      expectedBehavior: 'Automatic dead connection cleanup with successful message delivery to active connections',
      timeoutThreshold: 2000,
      testCategory: 'unit'
    });
  }

  public getAllTestPatterns(): TDDTestPattern[] {
    return Array.from(this.testPatterns.values());
  }

  public getTestPatternById(testId: string): TDDTestPattern | undefined {
    return this.testPatterns.get(testId);
  }

  public getTestPatternsByCategory(category: 'unit' | 'integration' | 'end-to-end'): TDDTestPattern[] {
    return Array.from(this.testPatterns.values())
      .filter(pattern => pattern.testCategory === category);
  }

  public getTestPatternsForFailure(failurePatternId: string): TDDTestPattern[] {
    return Array.from(this.testPatterns.values())
      .filter(pattern => pattern.preventedFailures.includes(failurePatternId));
  }

  public generateTestSuite(): string {
    const patterns = this.getAllTestPatterns();
    
    let testSuite = `/**
 * Generated TDD Test Suite for Process I/O Capture Failure Prevention
 * Auto-generated from NLD Anti-Patterns Database
 * Generated: ${new Date().toISOString()}
 */

import { createRealClaudeInstance, broadcastToAllConnections, activeSSEConnections } from '../simple-backend';
import { createMockClaudeProcess, createMockSSEConnections, createMockRequest, createMockResponse } from './test-helpers';

describe('Process I/O Capture Failure Prevention Suite', () => {
`;

    patterns.forEach((pattern) => {
      testSuite += `\n  // ${pattern.testName}\n`;
      testSuite += `  // Prevents: ${pattern.preventedFailures.join(', ')}\n`;
      testSuite += pattern.testImplementation + '\n\n';
    });

    testSuite += '});\n';

    return testSuite;
  }

  public generateMockHelpers(): string {
    return `/**
 * Mock Helpers for Process I/O Testing
 * Generated: ${new Date().toISOString()}
 */

export function createMockClaudeProcess() {
  const { EventEmitter } = require('events');
  
  const mockProcess = {
    pid: Math.floor(Math.random() * 9000) + 1000,
    killed: false,
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    stdin: {
      write: jest.fn(),
      end: jest.fn()
    },
    kill: jest.fn(),
    on: jest.fn()
  };

  return mockProcess;
}

export function createMockSSEConnections(count: number) {
  const connections = [];
  
  for (let i = 0; i < count; i++) {
    connections.push({
      destroyed: false,
      writableEnded: false,
      write: jest.fn(),
      on: jest.fn(),
      end: jest.fn()
    });
  }

  return connections;
}

export function createMockSSEConnection() {
  return {
    destroyed: false,
    writableEnded: false,
    write: jest.fn(),
    on: jest.fn(),
    end: jest.fn()
  };
}

export function createMockRequest() {
  const { EventEmitter } = require('events');
  const mockRequest = new EventEmitter();
  
  mockRequest.setTimeout = jest.fn();
  
  return mockRequest;
}

export function createMockResponse() {
  const { EventEmitter } = require('events');
  const mockResponse = new EventEmitter();
  
  mockResponse.writeHead = jest.fn();
  mockResponse.write = jest.fn();
  mockResponse.end = jest.fn();
  mockResponse.setTimeout = jest.fn();
  
  return mockResponse;
}`;
  }

  public generatePreventionReport(): {
    totalTests: number;
    testsByCategory: Record<string, number>;
    coverageByFailure: Record<string, number>;
    recommendations: string[];
  } {
    const patterns = this.getAllTestPatterns();
    
    const testsByCategory = {
      unit: patterns.filter(p => p.testCategory === 'unit').length,
      integration: patterns.filter(p => p.testCategory === 'integration').length,
      'end-to-end': patterns.filter(p => p.testCategory === 'end-to-end').length
    };

    const failureCoverage: Record<string, number> = {};
    patterns.forEach(pattern => {
      pattern.preventedFailures.forEach(failure => {
        failureCoverage[failure] = (failureCoverage[failure] || 0) + 1;
      });
    });

    return {
      totalTests: patterns.length,
      testsByCategory,
      coverageByFailure: failureCoverage,
      recommendations: [
        'Run stdout readiness tests before every process spawn',
        'Implement SSE message delivery verification in CI/CD',
        'Add race condition tests to prevent timing issues',
        'Monitor connection cleanup effectiveness in production',
        'Use end-to-end tests to validate complete output flow'
      ]
    };
  }
}