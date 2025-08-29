/**
 * TDD London School - SSE Live Integration Tests
 * 
 * Tests against the actual running backend to validate the exact
 * user-reported bug is fixed. These tests use real SSE connections
 * to reproduce and verify the incremental output behavior.
 */

const { expect } = require('@playwright/test');
const { test } = require('@playwright/test');

// SSE Message Collector for Live Testing
class LiveSSECollector {
  constructor(page, instanceId, baseURL = 'http://localhost:3000') {
    this.page = page;
    this.instanceId = instanceId;
    this.baseURL = baseURL;
    this.messages = [];
    this.outputMessages = [];
    this.connectionEvents = [];
    this.errors = [];
    this.isConnected = false;
  }

  async connect() {
    await this.page.goto(`data:text/html,
      <html>
        <head><title>SSE Live Test</title></head>
        <body>
          <div id="status">Connecting...</div>
          <div id="message-count">0</div>
          <div id="output-log"></div>
          <script>
            const instanceId = '${this.instanceId}';
            const baseURL = '${this.baseURL}';
            const messages = [];
            const outputMessages = [];
            const connectionEvents = [];
            const errors = [];
            
            let eventSource = null;
            let isConnected = false;
            
            function connectSSE() {
              const url = baseURL + '/api/claude/instances/' + instanceId + '/terminal/stream';
              console.log('Connecting to SSE:', url);
              
              eventSource = new EventSource(url);
              
              eventSource.onopen = function(event) {
                console.log('SSE Connected');
                isConnected = true;
                document.getElementById('status').textContent = 'Connected';
                connectionEvents.push({
                  type: 'open',
                  timestamp: Date.now(),
                  event: event
                });
              };
              
              eventSource.onmessage = function(event) {
                console.log('SSE Message received:', event.data);
                const message = JSON.parse(event.data);
                messages.push(message);
                
                if (message.type === 'output') {
                  outputMessages.push(message);
                  const logElement = document.getElementById('output-log');
                  const messageDiv = document.createElement('div');
                  messageDiv.textContent = 'Output: ' + message.data;
                  messageDiv.setAttribute('data-message-index', outputMessages.length - 1);
                  messageDiv.setAttribute('data-content-length', message.data.length);
                  messageDiv.setAttribute('data-timestamp', message.timestamp);
                  logElement.appendChild(messageDiv);
                }
                
                document.getElementById('message-count').textContent = messages.length;
              };
              
              eventSource.onerror = function(event) {
                console.error('SSE Error:', event);
                errors.push({
                  timestamp: Date.now(),
                  event: event,
                  readyState: eventSource.readyState
                });
                
                if (eventSource.readyState === EventSource.CLOSED) {
                  document.getElementById('status').textContent = 'Connection Closed';
                  isConnected = false;
                }
              };
            }
            
            // Expose data for test access
            window.getSSEData = function() {
              return {
                messages: messages,
                outputMessages: outputMessages,
                connectionEvents: connectionEvents,
                errors: errors,
                isConnected: isConnected,
                eventSourceState: eventSource ? eventSource.readyState : null
              };
            };
            
            window.sendInput = function(input) {
              return fetch(baseURL + '/api/claude/instances/' + instanceId + '/terminal/input', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ input: input })
              }).then(response => response.json());
            };
            
            window.closeSSE = function() {
              if (eventSource) {
                eventSource.close();
                isConnected = false;
                document.getElementById('status').textContent = 'Manually Closed';
              }
            };
            
            // Auto-connect
            connectSSE();
          </script>
        </body>
      </html>
    `);

    // Wait for connection
    await this.page.waitForFunction(() => window.getSSEData().isConnected, { timeout: 10000 });
    this.isConnected = true;
  }

  async sendInput(input) {
    const response = await this.page.evaluate(async (input) => {
      return await window.sendInput(input);
    }, input);
    
    return response;
  }

  async getSSEData() {
    return await this.page.evaluate(() => window.getSSEData());
  }

  async waitForOutputMessage(timeout = 5000) {
    await this.page.waitForFunction(
      () => window.getSSEData().outputMessages.length > 0, 
      { timeout }
    );
  }

  async waitForOutputCount(count, timeout = 10000) {
    await this.page.waitForFunction(
      (expectedCount) => window.getSSEData().outputMessages.length >= expectedCount,
      expectedCount,
      { timeout }
    );
  }

  async disconnect() {
    await this.page.evaluate(() => window.closeSSE());
    this.isConnected = false;
  }
}

// Real Backend Instance Manager
class LiveClaudeInstanceManager {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.activeInstances = [];
  }

  async createInstance(command = ['claude', '--dangerously-skip-permissions'], workingDirectory = null, prompt = null) {
    const response = await fetch(`${this.baseURL}/api/claude/instances`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        command,
        workingDirectory,
        prompt
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create instance: ${response.statusText}`);
    }

    const data = await response.json();
    this.activeInstances.push(data.instanceId);
    return data;
  }

  async terminateInstance(instanceId) {
    const response = await fetch(`${this.baseURL}/api/claude/instances/${instanceId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Failed to terminate instance: ${response.statusText}`);
    }

    this.activeInstances = this.activeInstances.filter(id => id !== instanceId);
    const data = await response.json();
    return data;
  }

  async getInstances() {
    const response = await fetch(`${this.baseURL}/api/claude/instances`);
    
    if (!response.ok) {
      throw new Error(`Failed to get instances: ${response.statusText}`);
    }

    return await response.json();
  }

  async cleanup() {
    for (const instanceId of this.activeInstances) {
      try {
        await this.terminateInstance(instanceId);
      } catch (error) {
        console.warn(`Failed to cleanup instance ${instanceId}:`, error);
      }
    }
    this.activeInstances = [];
  }
}

test.describe('TDD London School: Live SSE Integration', () => {

  let instanceManager;

  test.beforeEach(async () => {
    instanceManager = new LiveClaudeInstanceManager();
  });

  test.afterEach(async () => {
    await instanceManager.cleanup();
  });

  test('should reproduce user-reported buffer accumulation storm with real backend', async ({ page }) => {
    // Arrange: Create real Claude instance
    const instanceData = await instanceManager.createInstance(['claude', '--dangerously-skip-permissions', '-c', 'echo hello']);
    const instanceId = instanceData.instanceId;

    expect(instanceData.success).toBe(true);
    expect(instanceId).toBeTruthy();

    // Connect to real SSE stream
    const sseCollector = new LiveSSECollector(page, instanceId);
    await sseCollector.connect();

    // Wait for initial connection and process startup
    await sseCollector.waitForOutputMessage();

    // Act: Send rapid successive inputs (simulate user typing fast)
    const inputs = ['hello', 'hello', 'hello', 'hello', 'hello'];
    const sendPromises = inputs.map(input => sseCollector.sendInput(input));
    
    await Promise.all(sendPromises);

    // Wait for all responses
    await sseCollector.waitForOutputCount(inputs.length * 2, 15000); // Input echo + output

    // Assert: Analyze SSE message pattern
    const sseData = await sseCollector.getSSEData();
    const outputMessages = sseData.outputMessages;

    console.log('SSE Output Messages Analysis:');
    outputMessages.forEach((msg, index) => {
      console.log(`Message ${index}: "${msg.data}" (${msg.data.length} chars) at ${msg.timestamp}`);
    });

    // CRITICAL BUG TEST: Each message should be incremental, not full buffer replay
    const messageData = outputMessages.map(msg => msg.data);
    const messageSizes = outputMessages.map(msg => msg.data.length);
    
    // Check for buffer accumulation storm indicators
    const hasLargeMessages = messageSizes.some(size => size > 100);
    const hasRepeatingContent = messageData.some(data => data.includes('hellohellohello'));
    const avgMessageSize = messageSizes.reduce((a, b) => a + b, 0) / messageSizes.length;

    // Assert: No buffer storm characteristics
    expect(hasLargeMessages).toBe(false);
    expect(hasRepeatingContent).toBe(false);
    expect(avgMessageSize).toBeLessThan(50); // Reasonable incremental size
    
    // Each message should be incremental
    outputMessages.forEach(msg => {
      expect(msg.isIncremental).toBe(true);
      expect(msg.type).toBe('output');
      expect(msg.instanceId).toBe(instanceId);
    });

    await sseCollector.disconnect();
  });

  test('should validate incremental output with sequential commands', async ({ page }) => {
    // Arrange: Create real instance for sequential testing
    const instanceData = await instanceManager.createInstance();
    const instanceId = instanceData.instanceId;
    
    const sseCollector = new LiveSSECollector(page, instanceId);
    await sseCollector.connect();
    
    // Wait for initial connection
    await sseCollector.waitForOutputMessage(10000);

    // Act: Send sequential commands with different outputs
    const commands = [
      'echo "first command"',
      'echo "second command"', 
      'echo "third command"'
    ];

    for (let i = 0; i < commands.length; i++) {
      await sseCollector.sendInput(commands[i]);
      await page.waitForTimeout(2000); // Allow command to complete
    }

    // Assert: Analyze sequential output pattern
    const sseData = await sseCollector.getSSEData();
    const outputMessages = sseData.outputMessages;

    // Filter out initial connection messages and input echoes
    const commandOutputs = outputMessages.filter(msg => 
      msg.data.includes('command') && !msg.data.startsWith('echo')
    );

    expect(commandOutputs.length).toBeGreaterThanOrEqual(3);

    // Each command output should be distinct and incremental
    const outputs = commandOutputs.map(msg => msg.data.trim());
    const uniqueOutputs = [...new Set(outputs)];

    expect(uniqueOutputs.length).toBeGreaterThan(1); // Multiple distinct outputs
    
    // Verify incremental flags
    commandOutputs.forEach(msg => {
      expect(msg.isIncremental).toBe(true);
      expect(msg.data).not.toContain('first commandsecond command'); // No buffer accumulation
    });

    await sseCollector.disconnect();
  });

  test('should handle connection recovery without buffer replay', async ({ page }) => {
    // Arrange: Create instance and establish connection
    const instanceData = await instanceManager.createInstance();
    const instanceId = instanceData.instanceId;
    
    const sseCollector = new LiveSSECollector(page, instanceId);
    await sseCollector.connect();
    
    // Generate some initial content
    await sseCollector.sendInput('echo "before disconnect"');
    await sseCollector.waitForOutputMessage();

    // Act: Simulate connection recovery
    await sseCollector.disconnect();
    await page.waitForTimeout(1000);

    // Send content while disconnected (server should buffer)
    await fetch(`http://localhost:3000/api/claude/instances/${instanceId}/terminal/input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'echo "during disconnect"' })
    });

    await page.waitForTimeout(2000);

    // Reconnect
    const newCollector = new LiveSSECollector(page, instanceId);
    await newCollector.connect();
    
    // Send new content after reconnect
    await newCollector.sendInput('echo "after reconnect"');
    await newCollector.waitForOutputMessage();
    
    // Assert: Recovery should not replay full buffer
    const sseData = await newCollector.getSSEData();
    const outputMessages = sseData.outputMessages;
    
    // Should see content from reconnection point, not full replay
    const outputData = outputMessages.map(msg => msg.data);
    const hasFullReplay = outputData.some(data => 
      data.includes('before disconnect') && data.includes('after reconnect')
    );
    
    expect(hasFullReplay).toBe(false);
    
    // Should have new content only
    const hasNewContent = outputData.some(data => data.includes('after reconnect'));
    expect(hasNewContent).toBe(true);

    await newCollector.disconnect();
  });

  test('should validate position tracking across multiple instances', async ({ page }) => {
    // Arrange: Create multiple real instances
    const instance1Data = await instanceManager.createInstance();
    const instance2Data = await instanceManager.createInstance();
    
    const instanceId1 = instance1Data.instanceId;
    const instanceId2 = instance2Data.instanceId;

    const collector1 = new LiveSSECollector(page, instanceId1);
    
    // Use separate page for second collector to avoid interference
    const page2 = await page.context().newPage();
    const collector2 = new LiveSSECollector(page2, instanceId2);

    await collector1.connect();
    await collector2.connect();

    // Act: Send different content to each instance
    await collector1.sendInput('echo "instance 1 content"');
    await collector2.sendInput('echo "instance 2 content"');

    await collector1.waitForOutputMessage();
    await collector2.waitForOutputMessage();

    // Send more content to verify independent position tracking
    await collector1.sendInput('echo "more from 1"');
    await collector2.sendInput('echo "more from 2"');

    await page.waitForTimeout(3000); // Allow processing

    // Assert: Independent position tracking
    const sseData1 = await collector1.getSSEData();
    const sseData2 = await collector2.getSSEData();

    const outputs1 = sseData1.outputMessages.map(msg => msg.data);
    const outputs2 = sseData2.outputMessages.map(msg => msg.data);

    // No cross-contamination
    const has1In2 = outputs2.some(data => data.includes('instance 1'));
    const has2In1 = outputs1.some(data => data.includes('instance 2'));

    expect(has1In2).toBe(false);
    expect(has2In1).toBe(false);

    // Both should have their own content
    const has1Content = outputs1.some(data => data.includes('instance 1'));
    const has2Content = outputs2.some(data => data.includes('instance 2'));

    expect(has1Content).toBe(true);
    expect(has2Content).toBe(true);

    await collector1.disconnect();
    await collector2.disconnect();
    await page2.close();
  });

  test('should measure SSE performance and detect buffer storms', async ({ page }) => {
    // Arrange: Performance measurement setup
    const instanceData = await instanceManager.createInstance();
    const instanceId = instanceData.instanceId;
    
    const sseCollector = new LiveSSECollector(page, instanceId);
    await sseCollector.connect();
    
    await sseCollector.waitForOutputMessage();

    // Act: Generate high-frequency output
    const startTime = Date.now();
    const commandCount = 10;
    
    for (let i = 0; i < commandCount; i++) {
      await sseCollector.sendInput(`echo "message ${i}"`);
      await page.waitForTimeout(100); // Rapid fire
    }

    await page.waitForTimeout(5000); // Allow all processing
    const endTime = Date.now();

    // Assert: Performance analysis
    const sseData = await sseCollector.getSSEData();
    const outputMessages = sseData.outputMessages;
    const totalDuration = endTime - startTime;

    // Performance metrics
    const messageCount = outputMessages.length;
    const avgResponseTime = totalDuration / commandCount;
    const messageSizes = outputMessages.map(msg => msg.data.length);
    const avgMessageSize = messageSizes.reduce((a, b) => a + b, 0) / messageSizes.length;
    const maxMessageSize = Math.max(...messageSizes);

    console.log('Performance Metrics:', {
      messageCount,
      avgResponseTime,
      avgMessageSize,
      maxMessageSize,
      totalDuration
    });

    // Performance assertions - detect buffer storm symptoms
    expect(avgResponseTime).toBeLessThan(2000); // Should be responsive
    expect(avgMessageSize).toBeLessThan(100);   // No massive buffer dumps
    expect(maxMessageSize).toBeLessThan(500);   // No single huge message
    
    // Message efficiency - should be incremental
    const hasIncrementalFlags = outputMessages.every(msg => msg.isIncremental === true);
    expect(hasIncrementalFlags).toBe(true);

    // No buffer accumulation patterns
    const hasAccumulation = outputMessages.some(msg => 
      msg.data.includes('message 0') && msg.data.includes('message 5')
    );
    expect(hasAccumulation).toBe(false);

    await sseCollector.disconnect();
  });

  test('should validate real-world user interaction patterns', async ({ page }) => {
    // Arrange: Simulate real user interaction
    const instanceData = await instanceManager.createInstance();
    const instanceId = instanceData.instanceId;
    
    const sseCollector = new LiveSSECollector(page, instanceId);
    await sseCollector.connect();
    
    await sseCollector.waitForOutputMessage();

    // Act: Real-world interaction simulation
    const interactions = [
      { input: 'ls', delay: 1000 },
      { input: 'pwd', delay: 800 },
      { input: 'echo "hello world"', delay: 1500 },
      { input: 'date', delay: 600 },
      { input: 'whoami', delay: 1200 }
    ];

    for (const interaction of interactions) {
      await sseCollector.sendInput(interaction.input);
      await page.waitForTimeout(interaction.delay);
    }

    // Allow final processing
    await page.waitForTimeout(3000);

    // Assert: Real-world behavior validation
    const sseData = await sseCollector.getSSEData();
    const outputMessages = sseData.outputMessages;

    // User experience metrics
    const responseMessages = outputMessages.filter(msg => 
      !msg.data.startsWith(interactions.find(i => msg.data.includes(i.input))?.input || 'xxx')
    );

    expect(responseMessages.length).toBeGreaterThan(interactions.length);

    // Each response should be properly formatted
    responseMessages.forEach(msg => {
      expect(msg.type).toBe('output');
      expect(msg.instanceId).toBe(instanceId);
      expect(msg.isIncremental).toBe(true);
      expect(msg.data).toBeTruthy();
    });

    // No excessive message sizes (buffer dumps)
    const oversizedMessages = responseMessages.filter(msg => msg.data.length > 200);
    expect(oversizedMessages.length).toBe(0);

    // Proper chronological ordering
    const timestamps = responseMessages.map(msg => new Date(msg.timestamp).getTime());
    const isSorted = timestamps.every((time, i) => i === 0 || time >= timestamps[i - 1]);
    expect(isSorted).toBe(true);

    await sseCollector.disconnect();
  });
});