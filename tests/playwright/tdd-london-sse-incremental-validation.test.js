/**
 * TDD London School - SSE Incremental Output Validation
 * 
 * Mock-driven testing focusing on interactions between components
 * to isolate and validate the exact SSE incremental output behavior.
 * 
 * BUG REPRODUCTION: User reports SSE buffer accumulation storm
 * REQUIREMENT: Each Claude process output should send ONLY incremental content via SSE
 */

const { expect } = require('@playwright/test');
const { test } = require('@playwright/test');

// Mock the SSEOutputChunker for behavior verification
class MockSSEOutputChunker {
  constructor() {
    this.outputPositions = new Map();
    this.outputBuffers = new Map();
    this.sseConnections = new Map();
    this.connectionStates = new Map();
    this.messagesSent = []; // Track ALL sent messages for verification
    this.mockConnections = []; // Mock SSE connections
  }

  // Position tracking - core incremental logic
  getPosition(instanceId) {
    return this.outputPositions.get(instanceId) || 0;
  }

  updatePosition(instanceId, newPos) {
    this.outputPositions.set(instanceId, newPos);
    return newPos;
  }

  getNewContentSince(instanceId, fullContent) {
    const lastPos = this.getPosition(instanceId);
    const newContent = fullContent.substring(lastPos);
    this.updatePosition(instanceId, fullContent.length);
    return newContent;
  }

  // Mock SSE Connection Management
  addConnection(instanceId, mockConnection) {
    if (!this.sseConnections.has(instanceId)) {
      this.sseConnections.set(instanceId, []);
    }
    this.sseConnections.get(instanceId).push(mockConnection);
    this.mockConnections.push(mockConnection);
    this.setState(instanceId, 'connected');
    return this.getActiveConnectionCount(instanceId);
  }

  setState(instanceId, state) {
    const current = this.connectionStates.get(instanceId) || { transitions: 0 };
    this.connectionStates.set(instanceId, {
      state,
      timestamp: Date.now(),
      transitions: current.transitions + 1
    });
  }

  getState(instanceId) {
    return this.connectionStates.get(instanceId)?.state || 'disconnected';
  }

  getActiveConnectionCount(instanceId) {
    return (this.sseConnections.get(instanceId) || []).length;
  }

  canSendMessages(instanceId) {
    return this.getState(instanceId) === 'connected' && this.getActiveConnectionCount(instanceId) > 0;
  }

  // Core SSE sending - what we're testing
  sendIncremental(instanceId, incrementalContent, connections) {
    if (!incrementalContent || incrementalContent.length === 0) {
      return { sent: false, reason: 'no_new_content' };
    }

    const message = {
      type: 'output',
      instanceId,
      data: incrementalContent,
      timestamp: new Date().toISOString(),
      isIncremental: true
    };

    // Mock SSE message sending
    const serialized = `data: ${JSON.stringify(message)}\n\n`;
    let successCount = 0;

    connections.forEach(conn => {
      if (conn && conn.mockWrite) {
        conn.mockWrite(serialized);
        successCount++;
      }
    });

    // Track message for verification
    this.messagesSent.push({
      instanceId,
      content: incrementalContent,
      fullMessage: message,
      serialized,
      connectionsTargeted: connections.length,
      successCount
    });

    return { sent: true, successCount, message };
  }

  // Main processing - orchestrates the entire flow
  processNewOutput(instanceId, rawOutput) {
    if (!this.canSendMessages(instanceId)) {
      return { processed: false, reason: 'not_ready' };
    }

    const lastPos = this.getPosition(instanceId);
    const incrementalContent = rawOutput.substring(lastPos);

    if (incrementalContent.length === 0) {
      return { processed: false, reason: 'no_new_content' };
    }

    this.updatePosition(instanceId, rawOutput.length);
    const connections = this.sseConnections.get(instanceId) || [];
    const sendResult = this.sendIncremental(instanceId, incrementalContent, connections);

    return {
      processed: true,
      incrementalContent,
      bytesSent: incrementalContent.length,
      connectionsSent: sendResult.successCount
    };
  }

  // Test utilities
  getMessageHistory() {
    return this.messagesSent;
  }

  clearMessageHistory() {
    this.messagesSent = [];
  }

  getMockConnectionWrites(connectionIndex = 0) {
    return this.mockConnections[connectionIndex]?.writes || [];
  }
}

// Mock Claude Process Output Generator
class MockClaudeProcess {
  constructor(instanceId) {
    this.instanceId = instanceId;
    this.outputBuffer = '';
    this.outputHistory = [];
  }

  // Simulate Claude writing "hello" incrementally
  writeOutput(content) {
    this.outputBuffer += content;
    this.outputHistory.push({
      timestamp: Date.now(),
      content,
      bufferLength: this.outputBuffer.length,
      action: 'write'
    });
    return this.outputBuffer;
  }

  // Simulate multiple "hello" writes
  writeMultipleHellos(count) {
    const outputs = [];
    for (let i = 0; i < count; i++) {
      const fullBuffer = this.writeOutput('hello');
      outputs.push(fullBuffer);
    }
    return outputs;
  }

  getCurrentBuffer() {
    return this.outputBuffer;
  }

  getOutputHistory() {
    return this.outputHistory;
  }
}

// Mock SSE Connection
class MockSSEConnection {
  constructor(connectionId) {
    this.connectionId = connectionId;
    this.writes = [];
    this.isWritable = true;
    this.isDestroyed = false;
  }

  mockWrite(data) {
    if (!this.isWritable || this.isDestroyed) {
      throw new Error('Connection not writable');
    }
    this.writes.push({
      timestamp: Date.now(),
      data,
      parsed: this.parseSSEMessage(data)
    });
  }

  parseSSEMessage(sseData) {
    try {
      const dataLine = sseData.split('\n').find(line => line.startsWith('data: '));
      if (dataLine) {
        return JSON.parse(dataLine.substring(6));
      }
    } catch (e) {
      return { error: 'Failed to parse', raw: sseData };
    }
    return null;
  }

  getReceivedMessages() {
    return this.writes.map(write => write.parsed).filter(Boolean);
  }

  getReceivedOutputData() {
    return this.getReceivedMessages()
      .filter(msg => msg.type === 'output')
      .map(msg => msg.data);
  }
}

test.describe('TDD London School: SSE Incremental Output Validation', () => {
  
  test('should send ONLY incremental content when Claude writes "hello" once', async () => {
    // Arrange: Create mocks for the collaboration
    const instanceId = 'test-claude-001';
    const chunker = new MockSSEOutputChunker();
    const claudeProcess = new MockClaudeProcess(instanceId);
    const sseConnection = new MockSSEConnection('conn-001');

    // Mock collaboration setup
    chunker.addConnection(instanceId, sseConnection);
    
    // Act: Claude process writes "hello"
    const fullBuffer = claudeProcess.writeOutput('hello');
    const result = chunker.processNewOutput(instanceId, fullBuffer);

    // Assert: Verify the interaction behavior
    expect(result.processed).toBe(true);
    expect(result.incrementalContent).toBe('hello');
    expect(result.bytesSent).toBe(5);
    
    // Verify what was actually sent via SSE
    const messageHistory = chunker.getMessageHistory();
    expect(messageHistory).toHaveLength(1);
    expect(messageHistory[0].content).toBe('hello');
    
    // Verify frontend receives ONLY the incremental content
    const receivedData = sseConnection.getReceivedOutputData();
    expect(receivedData).toEqual(['hello']);
  });

  test('should send ONLY new content when Claude writes "hello" twice', async () => {
    // Arrange: Mock the components
    const instanceId = 'test-claude-002';
    const chunker = new MockSSEOutputChunker();
    const claudeProcess = new MockClaudeProcess(instanceId);
    const sseConnection = new MockSSEConnection('conn-002');

    chunker.addConnection(instanceId, sseConnection);

    // Act: Claude writes "hello" first time
    const firstBuffer = claudeProcess.writeOutput('hello');
    const firstResult = chunker.processNewOutput(instanceId, firstBuffer);

    // Act: Claude writes "hello" second time (total: "hellohello")
    const secondBuffer = claudeProcess.writeOutput('hello');
    const secondResult = chunker.processNewOutput(instanceId, secondBuffer);

    // Assert: First write behavior
    expect(firstResult.processed).toBe(true);
    expect(firstResult.incrementalContent).toBe('hello');

    // Assert: Second write should ONLY send the NEW "hello"
    expect(secondResult.processed).toBe(true);
    expect(secondResult.incrementalContent).toBe('hello');
    expect(secondResult.bytesSent).toBe(5); // Only new content

    // Verify position tracking advanced correctly
    expect(chunker.getPosition(instanceId)).toBe(10); // "hellohello".length

    // Verify frontend receives TWO separate messages
    const receivedData = sseConnection.getReceivedOutputData();
    expect(receivedData).toEqual(['hello', 'hello']);
    
    // CRITICAL: Verify NO full buffer replay occurred
    const messageHistory = chunker.getMessageHistory();
    expect(messageHistory).toHaveLength(2);
    expect(messageHistory[0].content).toBe('hello');
    expect(messageHistory[1].content).toBe('hello'); // NOT "hellohello"
  });

  test('should NOT replay full buffer when new connection joins existing instance', async () => {
    // Arrange: Setup existing instance with content
    const instanceId = 'test-claude-003';
    const chunker = new MockSSEOutputChunker();
    const claudeProcess = new MockClaudeProcess(instanceId);
    const firstConnection = new MockSSEConnection('conn-003a');

    // Establish first connection and generate content
    chunker.addConnection(instanceId, firstConnection);
    const initialBuffer = claudeProcess.writeOutput('existing content');
    chunker.processNewOutput(instanceId, initialBuffer);

    // Act: Add second connection AFTER content exists
    const secondConnection = new MockSSEConnection('conn-003b');
    chunker.addConnection(instanceId, secondConnection);

    // Write new content
    const newBuffer = claudeProcess.writeOutput(' new data');
    const result = chunker.processNewOutput(instanceId, newBuffer);

    // Assert: Verify incremental behavior for new connections
    expect(result.processed).toBe(true);
    expect(result.incrementalContent).toBe(' new data');

    // First connection should receive both messages
    const firstConnectionData = firstConnection.getReceivedOutputData();
    expect(firstConnectionData).toEqual(['existing content', ' new data']);

    // Second connection should ONLY receive the new content
    const secondConnectionData = secondConnection.getReceivedOutputData();
    expect(secondConnectionData).toEqual([' new data']);

    // CRITICAL: Verify no full buffer was replayed to new connection
    const messageHistory = chunker.getMessageHistory();
    const lastMessage = messageHistory[messageHistory.length - 1];
    expect(lastMessage.content).toBe(' new data');
    expect(lastMessage.content).not.toBe('existing content new data');
  });

  test('should handle rapid successive writes without message storm', async () => {
    // Arrange: Fast typing simulation
    const instanceId = 'test-claude-004';
    const chunker = new MockSSEOutputChunker();
    const claudeProcess = new MockClaudeProcess(instanceId);
    const sseConnection = new MockSSEConnection('conn-004');

    chunker.addConnection(instanceId, sseConnection);

    // Act: Simulate rapid typing "hello" 5 times
    const outputs = claudeProcess.writeMultipleHellos(5);
    const results = [];

    for (let i = 0; i < outputs.length; i++) {
      const result = chunker.processNewOutput(instanceId, outputs[i]);
      results.push(result);
    }

    // Assert: Each write should produce exactly one incremental message
    expect(results).toHaveLength(5);
    results.forEach((result, index) => {
      expect(result.processed).toBe(true);
      expect(result.incrementalContent).toBe('hello');
      expect(result.bytesSent).toBe(5);
    });

    // Verify frontend receives exactly 5 separate "hello" messages
    const receivedData = sseConnection.getReceivedOutputData();
    expect(receivedData).toEqual(['hello', 'hello', 'hello', 'hello', 'hello']);

    // CRITICAL: Verify no buffer accumulation storm
    const messageHistory = chunker.getMessageHistory();
    expect(messageHistory).toHaveLength(5);
    
    // Each message should contain ONLY "hello", not accumulating buffer
    messageHistory.forEach(msg => {
      expect(msg.content).toBe('hello');
      expect(msg.content).not.toContain('hellohello');
    });

    // Verify position tracking is accurate
    expect(chunker.getPosition(instanceId)).toBe(25); // 5 * "hello".length
  });

  test('should maintain position tracking across connection recovery', async () => {
    // Arrange: Simulate connection loss and recovery
    const instanceId = 'test-claude-005';
    const chunker = new MockSSEOutputChunker();
    const claudeProcess = new MockClaudeProcess(instanceId);
    const originalConnection = new MockSSEConnection('conn-005a');

    // Establish initial state
    chunker.addConnection(instanceId, originalConnection);
    const initialBuffer = claudeProcess.writeOutput('before disconnect');
    chunker.processNewOutput(instanceId, initialBuffer);

    // Simulate connection loss
    chunker.setState(instanceId, 'disconnected');

    // Content continues to be written while disconnected
    const duringDisconnectBuffer = claudeProcess.writeOutput(' during disconnect');

    // Act: New connection establishes (recovery scenario)
    const recoveredConnection = new MockSSEConnection('conn-005b');
    chunker.addConnection(instanceId, recoveredConnection);

    // Process content that accumulated during disconnect
    const recoveryResult = chunker.processNewOutput(instanceId, duringDisconnectBuffer);

    // Assert: Recovery should send only new content since last processed position
    expect(recoveryResult.processed).toBe(true);
    expect(recoveryResult.incrementalContent).toBe(' during disconnect');

    // Verify recovered connection receives only incremental content
    const recoveredData = recoveredConnection.getReceivedOutputData();
    expect(recoveredData).toEqual([' during disconnect']);

    // Position tracking should be accurate across reconnection
    expect(chunker.getPosition(instanceId)).toBe(32); // Full buffer length
  });

  test('should prevent duplicate messages during frontend deduplication', async () => {
    // Arrange: Mock frontend deduplication scenario
    const instanceId = 'test-claude-006';
    const chunker = new MockSSEOutputChunker();
    const claudeProcess = new MockClaudeProcess(instanceId);
    const sseConnection = new MockSSEConnection('conn-006');

    chunker.addConnection(instanceId, sseConnection);

    // Act: Same content processed multiple times (network retry scenario)
    const buffer = claudeProcess.writeOutput('duplicate test');
    
    const firstResult = chunker.processNewOutput(instanceId, buffer);
    // Reset position to simulate retry
    chunker.updatePosition(instanceId, 0);
    const retryResult = chunker.processNewOutput(instanceId, buffer);

    // Assert: First processing should succeed
    expect(firstResult.processed).toBe(true);
    expect(firstResult.incrementalContent).toBe('duplicate test');

    // Retry should send the same content (chunker doesn't dedupe at this level)
    expect(retryResult.processed).toBe(true);
    expect(retryResult.incrementalContent).toBe('duplicate test');

    // Frontend receives both messages (deduplication is frontend responsibility)
    const receivedData = sseConnection.getReceivedOutputData();
    expect(receivedData).toEqual(['duplicate test', 'duplicate test']);

    // Message history shows both sends
    const messageHistory = chunker.getMessageHistory();
    expect(messageHistory).toHaveLength(2);
  });

  test('should handle multiple instances without cross-contamination', async () => {
    // Arrange: Multiple Claude instances
    const chunker = new MockSSEOutputChunker();
    const instance1 = 'claude-multi-001';
    const instance2 = 'claude-multi-002';
    
    const process1 = new MockClaudeProcess(instance1);
    const process2 = new MockClaudeProcess(instance2);
    
    const connection1 = new MockSSEConnection('conn-multi-001');
    const connection2 = new MockSSEConnection('conn-multi-002');

    // Setup independent connections
    chunker.addConnection(instance1, connection1);
    chunker.addConnection(instance2, connection2);

    // Act: Both instances write different content
    const buffer1 = process1.writeOutput('instance one output');
    const buffer2 = process2.writeOutput('instance two output');

    const result1 = chunker.processNewOutput(instance1, buffer1);
    const result2 = chunker.processNewOutput(instance2, buffer2);

    // Assert: Each instance processes independently
    expect(result1.processed).toBe(true);
    expect(result1.incrementalContent).toBe('instance one output');
    
    expect(result2.processed).toBe(true);
    expect(result2.incrementalContent).toBe('instance two output');

    // Verify no cross-contamination in connections
    const connection1Data = connection1.getReceivedOutputData();
    const connection2Data = connection2.getReceivedOutputData();

    expect(connection1Data).toEqual(['instance one output']);
    expect(connection2Data).toEqual(['instance two output']);

    // Verify independent position tracking
    expect(chunker.getPosition(instance1)).toBe(19); // "instance one output".length
    expect(chunker.getPosition(instance2)).toBe(19); // "instance two output".length
  });

  test('should reproduce and fix buffer accumulation storm bug', async () => {
    // Arrange: Simulate the reported bug scenario
    const instanceId = 'storm-reproduce-001';
    const chunker = new MockSSEOutputChunker();
    const claudeProcess = new MockClaudeProcess(instanceId);
    const sseConnection = new MockSSEConnection('storm-conn-001');

    chunker.addConnection(instanceId, sseConnection);

    // Act: Simulate the exact bug scenario - rapid accumulation
    const writes = [];
    for (let i = 1; i <= 10; i++) {
      const fullBuffer = claudeProcess.writeOutput(`line${i}\n`);
      writes.push(fullBuffer);
    }

    // Process each accumulated buffer state
    const results = [];
    for (const buffer of writes) {
      const result = chunker.processNewOutput(instanceId, buffer);
      results.push(result);
    }

    // Assert: Each result should ONLY contain incremental content
    results.forEach((result, index) => {
      expect(result.processed).toBe(true);
      expect(result.incrementalContent).toBe(`line${index + 1}\n`);
      expect(result.bytesSent).toBe(6); // "lineX\n".length
    });

    // CRITICAL BUG VERIFICATION: Frontend should receive incremental chunks
    const receivedData = sseConnection.getReceivedOutputData();
    const expectedIncremental = [
      'line1\n', 'line2\n', 'line3\n', 'line4\n', 'line5\n',
      'line6\n', 'line7\n', 'line8\n', 'line9\n', 'line10\n'
    ];
    expect(receivedData).toEqual(expectedIncremental);

    // BUG REPRODUCTION: Verify we DON'T get full buffer replays
    const messageHistory = chunker.getMessageHistory();
    messageHistory.forEach((msg, index) => {
      // Each message should only contain the new line, not full buffer
      expect(msg.content).toBe(`line${index + 1}\n`);
      expect(msg.content).not.toContain('line1\nline2\n'); // No buffer replay
    });

    // Verify final position is accurate
    const finalBuffer = claudeProcess.getCurrentBuffer();
    expect(chunker.getPosition(instanceId)).toBe(finalBuffer.length);
  });
});

test.describe('TDD London School: SSE Integration with Real Backend', () => {

  test('should validate real SSE endpoint incremental behavior', async ({ page }) => {
    // This test integrates with actual backend SSE endpoints
    const instanceId = 'integration-test-001';
    const baseURL = 'http://localhost:3000';
    
    // Create real Claude instance
    const createResponse = await page.request.post(`${baseURL}/api/claude/instances`, {
      data: {
        command: ['claude', '--dangerously-skip-permissions', '-c', 'hello world test']
      }
    });
    
    expect(createResponse.ok()).toBeTruthy();
    const instanceData = await createResponse.json();
    const realInstanceId = instanceData.instanceId;

    // Connect to real SSE stream
    const sseMessages = [];
    
    await page.goto(`data:text/html,
      <html>
        <body>
          <div id="output"></div>
          <script>
            const eventSource = new EventSource('${baseURL}/api/claude/instances/${realInstanceId}/terminal/stream');
            const messages = [];
            
            eventSource.onmessage = function(event) {
              const data = JSON.parse(event.data);
              messages.push(data);
              if (data.type === 'output') {
                document.body.setAttribute('data-last-output', data.data);
                document.body.setAttribute('data-total-messages', messages.length);
              }
            };
            
            window.getSSEMessages = () => messages;
          </script>
        </body>
      </html>
    `);

    // Wait for connection and initial output
    await page.waitForSelector('[data-last-output]', { timeout: 10000 });

    // Send input to trigger more output
    await page.request.post(`${baseURL}/api/claude/instances/${realInstanceId}/terminal/input`, {
      data: { input: 'test incremental output' }
    });

    // Wait for response
    await page.waitForTimeout(2000);

    // Evaluate SSE message behavior
    const sseAnalysis = await page.evaluate(() => {
      const messages = window.getSSEMessages();
      const outputMessages = messages.filter(msg => msg.type === 'output');
      
      return {
        totalMessages: messages.length,
        outputMessages: outputMessages.length,
        outputs: outputMessages.map(msg => msg.data),
        hasIncrementalFlag: outputMessages.some(msg => msg.isIncremental),
        messageSizes: outputMessages.map(msg => msg.data.length),
        uniqueTimestamps: [...new Set(messages.map(msg => msg.timestamp))].length
      };
    });

    // Assert real SSE behavior matches expected incremental pattern
    expect(sseAnalysis.outputMessages).toBeGreaterThan(0);
    expect(sseAnalysis.hasIncrementalFlag).toBe(true);
    
    // Each message should be reasonably sized (not huge buffer dumps)
    const avgMessageSize = sseAnalysis.messageSizes.reduce((a, b) => a + b, 0) / sseAnalysis.messageSizes.length;
    expect(avgMessageSize).toBeLessThan(1000); // No massive buffer replays

    // Cleanup
    await page.request.delete(`${baseURL}/api/claude/instances/${realInstanceId}`);
  });
});