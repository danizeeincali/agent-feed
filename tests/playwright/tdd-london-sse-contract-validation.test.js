/**
 * TDD London School - SSE Contract Validation
 * 
 * Focus on testing contracts and interactions between components
 * rather than implementation details. This validates the BEHAVIOR
 * of the SSE system components working together.
 */

const { expect } = require('@playwright/test');
const { test } = require('@playwright/test');

// Mock Contract Definitions - Define expected behavior interfaces
const ClaudeProcessContract = {
  // What we expect from Claude process output behavior
  writeOutput: (content) => ({ 
    fullBuffer: String, 
    timestamp: Number,
    action: 'write'
  }),
  getCurrentBuffer: () => String,
  simulateRapidTyping: (count) => Array
};

const SSEConnectionContract = {
  // What we expect from SSE connection behavior
  write: (message) => ({ success: Boolean, bytesWritten: Number }),
  isWritable: () => Boolean,
  getReceivedMessages: () => Array,
  close: () => void
};

const PositionTrackerContract = {
  // What we expect from position tracking behavior
  getPosition: (instanceId) => Number,
  updatePosition: (instanceId, position) => Number,
  getIncrementalContent: (instanceId, fullBuffer) => String,
  reset: (instanceId) => void
};

const SSEStreamerContract = {
  // What we expect from SSE streaming behavior
  sendIncremental: (instanceId, content, connections) => ({
    sent: Boolean,
    successCount: Number,
    message: Object
  }),
  addConnection: (instanceId, connection) => Number,
  processOutput: (instanceId, output) => ({
    processed: Boolean,
    incrementalContent: String,
    reason: String
  })
};

// Contract-based Mock Implementations
class ContractCompliantClaudeProcess {
  constructor(instanceId) {
    this.instanceId = instanceId;
    this.buffer = '';
    this.writeHistory = [];
  }

  writeOutput(content) {
    if (typeof content !== 'string') {
      throw new Error('Contract violation: writeOutput expects string');
    }
    
    this.buffer += content;
    const result = {
      fullBuffer: this.buffer,
      timestamp: Date.now(),
      action: 'write'
    };
    
    this.writeHistory.push(result);
    return result;
  }

  getCurrentBuffer() {
    return this.buffer;
  }

  simulateRapidTyping(count) {
    if (typeof count !== 'number' || count < 0) {
      throw new Error('Contract violation: simulateRapidTyping expects positive number');
    }
    
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(this.writeOutput('hello'));
    }
    return results;
  }

  // Contract verification helper
  validateContract() {
    return {
      hasWriteOutput: typeof this.writeOutput === 'function',
      hasGetCurrentBuffer: typeof this.getCurrentBuffer === 'function',
      hasSimulateRapidTyping: typeof this.simulateRapidTyping === 'function',
      bufferIsString: typeof this.getCurrentBuffer() === 'string',
      historyIsArray: Array.isArray(this.writeHistory)
    };
  }
}

class ContractCompliantSSEConnection {
  constructor(connectionId) {
    this.connectionId = connectionId;
    this.messages = [];
    this.writable = true;
    this.closed = false;
    this.bytesWritten = 0;
  }

  write(message) {
    if (typeof message !== 'string') {
      throw new Error('Contract violation: write expects string message');
    }
    
    if (!this.isWritable()) {
      throw new Error('Contract violation: cannot write to closed connection');
    }

    this.messages.push({
      timestamp: Date.now(),
      data: message,
      size: Buffer.byteLength(message, 'utf8')
    });
    
    this.bytesWritten += Buffer.byteLength(message, 'utf8');
    
    return {
      success: true,
      bytesWritten: Buffer.byteLength(message, 'utf8')
    };
  }

  isWritable() {
    return this.writable && !this.closed;
  }

  getReceivedMessages() {
    return this.messages.map(msg => {
      try {
        // Parse SSE data format
        const dataLine = msg.data.split('\n').find(line => line.startsWith('data: '));
        if (dataLine) {
          return JSON.parse(dataLine.substring(6));
        }
        return { raw: msg.data };
      } catch (e) {
        return { error: 'parse_failed', raw: msg.data };
      }
    });
  }

  close() {
    this.writable = false;
    this.closed = true;
  }

  // Contract verification helper
  validateContract() {
    return {
      hasWrite: typeof this.write === 'function',
      hasIsWritable: typeof this.isWritable === 'function',
      hasGetReceivedMessages: typeof this.getReceivedMessages === 'function',
      hasClose: typeof this.close === 'function',
      messagesIsArray: Array.isArray(this.messages),
      connectionIdIsString: typeof this.connectionId === 'string'
    };
  }
}

class ContractCompliantPositionTracker {
  constructor() {
    this.positions = new Map();
    this.operations = [];
  }

  getPosition(instanceId) {
    if (typeof instanceId !== 'string') {
      throw new Error('Contract violation: getPosition expects string instanceId');
    }
    
    const position = this.positions.get(instanceId) || 0;
    this.operations.push({ op: 'getPosition', instanceId, result: position });
    return position;
  }

  updatePosition(instanceId, position) {
    if (typeof instanceId !== 'string') {
      throw new Error('Contract violation: updatePosition expects string instanceId');
    }
    if (typeof position !== 'number' || position < 0) {
      throw new Error('Contract violation: updatePosition expects non-negative number');
    }
    
    this.positions.set(instanceId, position);
    this.operations.push({ op: 'updatePosition', instanceId, position });
    return position;
  }

  getIncrementalContent(instanceId, fullBuffer) {
    if (typeof instanceId !== 'string') {
      throw new Error('Contract violation: getIncrementalContent expects string instanceId');
    }
    if (typeof fullBuffer !== 'string') {
      throw new Error('Contract violation: getIncrementalContent expects string fullBuffer');
    }
    
    const lastPos = this.getPosition(instanceId);
    const incrementalContent = fullBuffer.substring(lastPos);
    this.updatePosition(instanceId, fullBuffer.length);
    
    this.operations.push({ 
      op: 'getIncrementalContent', 
      instanceId, 
      lastPos, 
      newPos: fullBuffer.length,
      incrementalContent 
    });
    
    return incrementalContent;
  }

  reset(instanceId) {
    if (typeof instanceId !== 'string') {
      throw new Error('Contract violation: reset expects string instanceId');
    }
    
    this.positions.delete(instanceId);
    this.operations.push({ op: 'reset', instanceId });
  }

  // Contract verification and debugging helpers
  validateContract() {
    return {
      hasGetPosition: typeof this.getPosition === 'function',
      hasUpdatePosition: typeof this.updatePosition === 'function',
      hasGetIncrementalContent: typeof this.getIncrementalContent === 'function',
      hasReset: typeof this.reset === 'function',
      positionsIsMap: this.positions instanceof Map,
      operationsIsArray: Array.isArray(this.operations)
    };
  }

  getOperationHistory() {
    return [...this.operations];
  }
}

class ContractCompliantSSEStreamer {
  constructor() {
    this.connections = new Map();
    this.positionTracker = new ContractCompliantPositionTracker();
    this.messagesSent = [];
    this.operations = [];
  }

  addConnection(instanceId, connection) {
    if (typeof instanceId !== 'string') {
      throw new Error('Contract violation: addConnection expects string instanceId');
    }
    if (!connection || typeof connection.write !== 'function') {
      throw new Error('Contract violation: addConnection expects writable connection');
    }

    if (!this.connections.has(instanceId)) {
      this.connections.set(instanceId, []);
    }
    
    this.connections.get(instanceId).push(connection);
    const count = this.connections.get(instanceId).length;
    
    this.operations.push({ op: 'addConnection', instanceId, connectionCount: count });
    return count;
  }

  sendIncremental(instanceId, content, connections) {
    if (typeof instanceId !== 'string') {
      throw new Error('Contract violation: sendIncremental expects string instanceId');
    }
    if (typeof content !== 'string') {
      throw new Error('Contract violation: sendIncremental expects string content');
    }
    if (!Array.isArray(connections)) {
      throw new Error('Contract violation: sendIncremental expects array of connections');
    }

    if (content.length === 0) {
      return { sent: false, successCount: 0, message: null, reason: 'no_content' };
    }

    const message = {
      type: 'output',
      instanceId,
      data: content,
      timestamp: new Date().toISOString(),
      isIncremental: true
    };

    const serialized = `data: ${JSON.stringify(message)}\n\n`;
    let successCount = 0;

    for (const connection of connections) {
      try {
        if (connection.isWritable()) {
          connection.write(serialized);
          successCount++;
        }
      } catch (error) {
        // Connection failed, continue with others
      }
    }

    const result = { sent: true, successCount, message };
    this.messagesSent.push({ instanceId, content, result });
    this.operations.push({ op: 'sendIncremental', instanceId, content, successCount });
    
    return result;
  }

  processOutput(instanceId, output) {
    if (typeof instanceId !== 'string') {
      throw new Error('Contract violation: processOutput expects string instanceId');
    }
    if (typeof output !== 'string') {
      throw new Error('Contract violation: processOutput expects string output');
    }

    const connections = this.connections.get(instanceId) || [];
    if (connections.length === 0) {
      return { processed: false, reason: 'no_connections' };
    }

    const incrementalContent = this.positionTracker.getIncrementalContent(instanceId, output);
    
    if (incrementalContent.length === 0) {
      return { processed: false, incrementalContent: '', reason: 'no_new_content' };
    }

    const sendResult = this.sendIncremental(instanceId, incrementalContent, connections);
    
    const result = {
      processed: true,
      incrementalContent,
      bytesSent: incrementalContent.length,
      connectionsSent: sendResult.successCount
    };

    this.operations.push({ op: 'processOutput', instanceId, result });
    return result;
  }

  // Contract verification and debugging helpers
  validateContract() {
    return {
      hasAddConnection: typeof this.addConnection === 'function',
      hasSendIncremental: typeof this.sendIncremental === 'function',
      hasProcessOutput: typeof this.processOutput === 'function',
      connectionsIsMap: this.connections instanceof Map,
      positionTrackerValid: this.positionTracker.validateContract(),
      messagesIsArray: Array.isArray(this.messagesSent)
    };
  }

  getOperationHistory() {
    return [...this.operations];
  }

  getMessageHistory() {
    return [...this.messagesSent];
  }
}

test.describe('TDD London School: SSE Contract Validation', () => {

  test('should validate all component contracts are properly defined', async () => {
    // Arrange: Create contract-compliant components
    const claudeProcess = new ContractCompliantClaudeProcess('test-001');
    const sseConnection = new ContractCompliantSSEConnection('conn-001');
    const positionTracker = new ContractCompliantPositionTracker();
    const sseStreamer = new ContractCompliantSSEStreamer();

    // Act & Assert: Validate each contract compliance
    const claudeContract = claudeProcess.validateContract();
    expect(claudeContract.hasWriteOutput).toBe(true);
    expect(claudeContract.hasGetCurrentBuffer).toBe(true);
    expect(claudeContract.bufferIsString).toBe(true);

    const connectionContract = sseConnection.validateContract();
    expect(connectionContract.hasWrite).toBe(true);
    expect(connectionContract.hasIsWritable).toBe(true);
    expect(connectionContract.hasGetReceivedMessages).toBe(true);

    const trackerContract = positionTracker.validateContract();
    expect(trackerContract.hasGetPosition).toBe(true);
    expect(trackerContract.hasUpdatePosition).toBe(true);
    expect(trackerContract.hasGetIncrementalContent).toBe(true);

    const streamerContract = sseStreamer.validateContract();
    expect(streamerContract.hasAddConnection).toBe(true);
    expect(streamerContract.hasSendIncremental).toBe(true);
    expect(streamerContract.hasProcessOutput).toBe(true);
  });

  test('should enforce contract violations with proper errors', async () => {
    // Arrange: Contract-compliant components
    const claudeProcess = new ContractCompliantClaudeProcess('test-002');
    const sseConnection = new ContractCompliantSSEConnection('conn-002');
    const positionTracker = new ContractCompliantPositionTracker();
    const sseStreamer = new ContractCompliantSSEStreamer();

    // Assert: Contract violations should throw specific errors
    expect(() => claudeProcess.writeOutput(123)).toThrow('Contract violation: writeOutput expects string');
    expect(() => sseConnection.write(null)).toThrow('Contract violation: write expects string message');
    expect(() => positionTracker.getPosition(null)).toThrow('Contract violation: getPosition expects string instanceId');
    expect(() => sseStreamer.addConnection('test', null)).toThrow('Contract violation: addConnection expects writable connection');
  });

  test('should validate incremental content interaction contract', async () => {
    // Arrange: Set up component collaboration
    const instanceId = 'contract-test-003';
    const claudeProcess = new ContractCompliantClaudeProcess(instanceId);
    const sseConnection = new ContractCompliantSSEConnection('conn-003');
    const sseStreamer = new ContractCompliantSSEStreamer();

    // Establish the contract relationship
    const connectionCount = sseStreamer.addConnection(instanceId, sseConnection);
    expect(connectionCount).toBe(1);

    // Act: Execute the contracted interaction
    const writeResult = claudeProcess.writeOutput('hello world');
    const processResult = sseStreamer.processOutput(instanceId, writeResult.fullBuffer);

    // Assert: Contract behavior validation
    expect(processResult.processed).toBe(true);
    expect(processResult.incrementalContent).toBe('hello world');
    expect(processResult.bytesSent).toBe(11);
    expect(processResult.connectionsSent).toBe(1);

    // Verify the interaction was recorded correctly
    const streamerOps = sseStreamer.getOperationHistory();
    const addConnOp = streamerOps.find(op => op.op === 'addConnection');
    const processOp = streamerOps.find(op => op.op === 'processOutput');

    expect(addConnOp).toBeDefined();
    expect(addConnOp.connectionCount).toBe(1);
    expect(processOp).toBeDefined();
    expect(processOp.result.processed).toBe(true);

    // Verify the message was delivered according to contract
    const receivedMessages = sseConnection.getReceivedMessages();
    expect(receivedMessages).toHaveLength(1);
    expect(receivedMessages[0].type).toBe('output');
    expect(receivedMessages[0].data).toBe('hello world');
    expect(receivedMessages[0].isIncremental).toBe(true);
  });

  test('should validate position tracking contract across multiple interactions', async () => {
    // Arrange: Multi-step interaction scenario
    const instanceId = 'contract-test-004';
    const claudeProcess = new ContractCompliantClaudeProcess(instanceId);
    const sseConnection = new ContractCompliantSSEConnection('conn-004');
    const sseStreamer = new ContractCompliantSSEStreamer();

    sseStreamer.addConnection(instanceId, sseConnection);

    // Act: Multiple contracted interactions
    const firstWrite = claudeProcess.writeOutput('first');
    const firstProcess = sseStreamer.processOutput(instanceId, firstWrite.fullBuffer);

    const secondWrite = claudeProcess.writeOutput(' second');
    const secondProcess = sseStreamer.processOutput(instanceId, secondWrite.fullBuffer);

    const thirdWrite = claudeProcess.writeOutput(' third');
    const thirdProcess = sseStreamer.processOutput(instanceId, thirdWrite.fullBuffer);

    // Assert: Position tracking contract compliance
    expect(firstProcess.incrementalContent).toBe('first');
    expect(secondProcess.incrementalContent).toBe(' second');
    expect(thirdProcess.incrementalContent).toBe(' third');

    // Verify position tracking operations
    const trackerOps = sseStreamer.positionTracker.getOperationHistory();
    const positionUpdates = trackerOps.filter(op => op.op === 'updatePosition');
    
    expect(positionUpdates).toHaveLength(3);
    expect(positionUpdates[0].position).toBe(5);  // "first".length
    expect(positionUpdates[1].position).toBe(12); // "first second".length  
    expect(positionUpdates[2].position).toBe(18); // "first second third".length

    // Verify message delivery contract compliance
    const receivedMessages = sseConnection.getReceivedMessages();
    expect(receivedMessages).toHaveLength(3);
    
    const outputData = receivedMessages.map(msg => msg.data);
    expect(outputData).toEqual(['first', ' second', ' third']);
  });

  test('should validate connection lifecycle contract', async () => {
    // Arrange: Connection lifecycle scenario
    const instanceId = 'contract-test-005';
    const claudeProcess = new ContractCompliantClaudeProcess(instanceId);
    const sseConnection = new ContractCompliantSSEConnection('conn-005');
    const sseStreamer = new ContractCompliantSSEStreamer();

    // Act: Connection lifecycle according to contract
    const addResult = sseStreamer.addConnection(instanceId, sseConnection);
    expect(addResult).toBe(1);

    // Verify connection is writable
    expect(sseConnection.isWritable()).toBe(true);

    // Send message while connection is active
    const writeResult = claudeProcess.writeOutput('connection active');
    const processResult = sseStreamer.processOutput(instanceId, writeResult.fullBuffer);
    expect(processResult.processed).toBe(true);

    // Close connection according to contract
    sseConnection.close();
    expect(sseConnection.isWritable()).toBe(false);

    // Attempt to send after close - should handle gracefully
    const postCloseWrite = claudeProcess.writeOutput(' after close');
    const postCloseProcess = sseStreamer.processOutput(instanceId, postCloseWrite.fullBuffer);
    
    // Connection failure should not break the contract
    expect(postCloseProcess.processed).toBe(true);
    expect(postCloseProcess.connectionsSent).toBe(0); // No successful sends

    // Verify message history maintained contract compliance
    const messageHistory = sseStreamer.getMessageHistory();
    expect(messageHistory).toHaveLength(2);
    expect(messageHistory[0].content).toBe('connection active');
    expect(messageHistory[1].content).toBe(' after close');
  });

  test('should validate multi-instance isolation contract', async () => {
    // Arrange: Multiple isolated instances
    const sseStreamer = new ContractCompliantSSEStreamer();
    
    const instance1 = 'contract-iso-001';
    const instance2 = 'contract-iso-002';
    
    const process1 = new ContractCompliantClaudeProcess(instance1);
    const process2 = new ContractCompliantClaudeProcess(instance2);
    
    const connection1 = new ContractCompliantSSEConnection('conn-iso-001');
    const connection2 = new ContractCompliantSSEConnection('conn-iso-002');

    // Establish isolated contracts
    sseStreamer.addConnection(instance1, connection1);
    sseStreamer.addConnection(instance2, connection2);

    // Act: Simultaneous contracted operations
    const write1 = process1.writeOutput('instance one data');
    const write2 = process2.writeOutput('instance two data');

    const result1 = sseStreamer.processOutput(instance1, write1.fullBuffer);
    const result2 = sseStreamer.processOutput(instance2, write2.fullBuffer);

    // Assert: Isolation contract compliance
    expect(result1.incrementalContent).toBe('instance one data');
    expect(result2.incrementalContent).toBe('instance two data');

    // Verify no cross-contamination in message delivery
    const messages1 = connection1.getReceivedMessages();
    const messages2 = connection2.getReceivedMessages();

    expect(messages1).toHaveLength(1);
    expect(messages1[0].data).toBe('instance one data');
    expect(messages1[0].instanceId).toBe(instance1);

    expect(messages2).toHaveLength(1);
    expect(messages2[0].data).toBe('instance two data');
    expect(messages2[0].instanceId).toBe(instance2);

    // Verify position tracking isolation
    const trackerOps = sseStreamer.positionTracker.getOperationHistory();
    const instance1Ops = trackerOps.filter(op => op.instanceId === instance1);
    const instance2Ops = trackerOps.filter(op => op.instanceId === instance2);

    expect(instance1Ops.length).toBeGreaterThan(0);
    expect(instance2Ops.length).toBeGreaterThan(0);
    
    // Each instance should have independent position tracking
    const instance1Updates = instance1Ops.filter(op => op.op === 'updatePosition');
    const instance2Updates = instance2Ops.filter(op => op.op === 'updatePosition');
    
    expect(instance1Updates[0].position).toBe(17); // "instance one data".length
    expect(instance2Updates[0].position).toBe(17); // "instance two data".length
  });

  test('should validate error handling contract compliance', async () => {
    // Arrange: Error-prone scenarios
    const instanceId = 'contract-error-test';
    const claudeProcess = new ContractCompliantClaudeProcess(instanceId);
    const sseStreamer = new ContractCompliantSSEStreamer();

    // Act: Test contract compliance under error conditions
    
    // No connections - should handle gracefully
    const writeResult = claudeProcess.writeOutput('no connections');
    const noConnResult = sseStreamer.processOutput(instanceId, writeResult.fullBuffer);
    
    expect(noConnResult.processed).toBe(false);
    expect(noConnResult.reason).toBe('no_connections');

    // Empty content - should handle gracefully  
    const emptyResult = sseStreamer.processOutput(instanceId, '');
    expect(emptyResult.processed).toBe(false);
    expect(emptyResult.reason).toBe('no_new_content');

    // Invalid parameters should throw contract violations
    expect(() => sseStreamer.processOutput(null, 'test')).toThrow('Contract violation');
    expect(() => sseStreamer.processOutput('test', null)).toThrow('Contract violation');
    expect(() => sseStreamer.addConnection(instanceId, {})).toThrow('Contract violation');

    // Operations should still be tracked even during errors
    const operations = sseStreamer.getOperationHistory();
    const processOps = operations.filter(op => op.op === 'processOutput');
    expect(processOps.length).toBeGreaterThanOrEqual(2); // At least the valid attempts
  });
});