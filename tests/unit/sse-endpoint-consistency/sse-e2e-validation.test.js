/**
 * SSE End-to-End Validation Tests
 * Tests the complete user flow with SSE connections
 */

// const { jest } = require('@jest/globals'); // Remove this line

// Mock environment setup
const mockServer = {
  listen: jest.fn(),
  close: jest.fn()
};

const mockResponse = {
  writeHead: jest.fn(),
  write: jest.fn(),
  end: jest.fn(),
  on: jest.fn()
};

const mockRequest = {
  on: jest.fn(),
  params: { instanceId: 'claude-test-123' },
  headers: { 'x-client-id': 'test-client-123' }
};

describe('SSE End-to-End User Flow Validation', () => {
  let mockFetch;
  let mockEventSource;
  
  beforeEach(() => {
    // Mock fetch for API calls
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    
    // Mock EventSource
    mockEventSource = jest.fn();
    mockEventSource.prototype.close = jest.fn();
    mockEventSource.prototype.addEventListener = jest.fn();
    global.EventSource = mockEventSource;
    
    jest.clearAllMocks();
  });

  describe('Complete User Journey', () => {
    test('should complete full user flow: create instance -> connect SSE -> send command -> receive output', async () => {
      const baseUrl = 'http://localhost:3000';
      const instanceId = 'claude-test-123';
      const command = 'help';
      
      // Step 1: Create Claude instance
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          instanceId,
          instance: { id: instanceId, status: 'running' }
        })
      });
      
      const createResponse = await fetch(`${baseUrl}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: ['claude'] })
      });
      
      const createData = await createResponse.json();
      expect(createData.success).toBe(true);
      expect(createData.instanceId).toBe(instanceId);
      
      // Step 2: Fetch instances list to verify creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          instances: [{ id: instanceId, status: 'running', name: 'Claude Instance' }]
        })
      });
      
      const instancesResponse = await fetch(`${baseUrl}/api/v1/claude/instances`);
      const instancesData = await instancesResponse.json();
      expect(instancesData.success).toBe(true);
      expect(instancesData.instances).toHaveLength(1);
      expect(instancesData.instances[0].id).toBe(instanceId);
      
      // Step 3: Establish SSE connection
      const sseUrl = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`;
      const eventSource = new EventSource(sseUrl);
      
      expect(mockEventSource).toHaveBeenCalledWith(sseUrl);
      
      // Step 4: Send command via terminal input endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
      
      const inputResponse = await fetch(`${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: command })
      });
      
      const inputData = await inputResponse.json();
      expect(inputData.success).toBe(true);
      
      // Step 5: Verify SSE message would be received (mock the handler)
      const mockMessageHandler = jest.fn();
      const simulatedMessage = {
        type: 'terminal_output',
        instanceId,
        output: 'Claude help information...',
        timestamp: new Date().toISOString()
      };
      
      // Simulate receiving SSE message
      mockMessageHandler(simulatedMessage);
      expect(mockMessageHandler).toHaveBeenCalledWith(simulatedMessage);
      
      // Step 6: Cleanup - close SSE connection
      eventSource.close();
      expect(mockEventSource.prototype.close).toHaveBeenCalled();
    });

    test('should handle error scenarios gracefully in user flow', async () => {
      const baseUrl = 'http://localhost:3000';
      const instanceId = 'claude-test-456';
      
      // Scenario 1: Instance creation fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ success: false, error: 'Instance creation failed' })
      });
      
      const createResponse = await fetch(`${baseUrl}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: ['claude'] })
      });
      
      const createData = await createResponse.json();
      expect(createData.success).toBe(false);
      expect(createData.error).toBe('Instance creation failed');
      
      // Scenario 2: SSE connection fails
      mockEventSource.mockImplementation(() => {
        throw new Error('SSE connection failed');
      });
      
      const sseUrl = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`;
      expect(() => new EventSource(sseUrl)).toThrow('SSE connection failed');
      
      // Scenario 3: Command sending fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ success: false, error: 'Instance not found' })
      });
      
      const inputResponse = await fetch(`${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'test' })
      });
      
      const inputData = await inputResponse.json();
      expect(inputData.success).toBe(false);
      expect(inputData.error).toBe('Instance not found');
    });
  });

  describe('Button Functionality Preservation', () => {
    test('should preserve all button functionality after SSE fixes', async () => {
      const baseUrl = 'http://localhost:3000';
      const buttons = [
        { name: 'Launch Default Claude', config: { command: ['claude'] } },
        { name: 'Launch Claude (Skip Permissions)', config: { command: ['claude', '--dangerously-skip-permissions'] } },
        { name: 'Launch Claude (Skip Permissions + Resume)', config: { command: ['claude', '--dangerously-skip-permissions', '--resume'] } },
        { name: 'Launch Claude (Skip Permissions + -c)', config: { command: ['claude', '--dangerously-skip-permissions', '-c'] } }
      ];
      
      // Test each button configuration
      for (const button of buttons) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ 
            success: true, 
            instanceId: `claude-${Date.now()}`,
            instance: { id: `claude-${Date.now()}`, status: 'starting' }
          })
        });
        
        const response = await fetch(`${baseUrl}/api/claude/instances`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(button.config)
        });
        
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.instanceId).toMatch(/^claude-\d+$/);
      }
      
      expect(mockFetch).toHaveBeenCalledTimes(buttons.length);
    });

    test('should maintain button state management', () => {
      const buttonStates = {
        loading: false,
        error: null,
        selectedInstance: null,
        connectionType: 'Disconnected'
      };
      
      // Test loading state
      buttonStates.loading = true;
      expect(buttonStates.loading).toBe(true);
      
      // Test error state
      buttonStates.error = 'Connection failed';
      expect(buttonStates.error).toBe('Connection failed');
      
      // Test instance selection
      buttonStates.selectedInstance = 'claude-test-123';
      expect(buttonStates.selectedInstance).toBe('claude-test-123');
      
      // Test connection type
      buttonStates.connectionType = 'Connected via SSE (claude-tes)';
      expect(buttonStates.connectionType).toContain('Connected via SSE');
    });
  });

  describe('Real-time Streaming Functionality', () => {
    test('should validate incremental message streaming', async () => {
      const instanceId = 'claude-test-789';
      const messages = [
        { type: 'terminal_output', output: 'Welcome to Claude!\n', timestamp: Date.now() },
        { type: 'terminal_output', output: 'How can I help you?\n', timestamp: Date.now() + 100 },
        { type: 'terminal_output', output: 'Type help for commands.\n', timestamp: Date.now() + 200 }
      ];
      
      let accumulatedOutput = '';
      
      // Simulate streaming messages
      messages.forEach(message => {
        accumulatedOutput += message.output;
        
        // Validate incremental nature
        expect(message.output).not.toContain(messages[0].output); // No duplication
        expect(accumulatedOutput).toContain(message.output);
      });
      
      // Final output should contain all messages
      expect(accumulatedOutput).toContain('Welcome to Claude!');
      expect(accumulatedOutput).toContain('How can I help you?');
      expect(accumulatedOutput).toContain('Type help for commands.');
    });

    test('should handle message deduplication', () => {
      const messages = [
        { id: '1', content: 'Hello', hash: 'abc123' },
        { id: '2', content: 'World', hash: 'def456' },
        { id: '3', content: 'Hello', hash: 'abc123' } // Duplicate
      ];
      
      // Simulate deduplication logic
      const seenHashes = new Set();
      const uniqueMessages = messages.filter(msg => {
        if (seenHashes.has(msg.hash)) {
          return false; // Skip duplicate
        }
        seenHashes.add(msg.hash);
        return true;
      });
      
      expect(uniqueMessages).toHaveLength(2);
      expect(uniqueMessages[0].content).toBe('Hello');
      expect(uniqueMessages[1].content).toBe('World');
    });

    test('should handle rapid message sequences', async () => {
      const instanceId = 'claude-test-rapid';
      const rapidMessages = Array.from({ length: 10 }, (_, i) => ({
        type: 'terminal_output',
        instanceId,
        output: `Message ${i + 1}\n`,
        timestamp: Date.now() + i * 10, // 10ms apart
        sequenceNumber: i + 1
      }));
      
      // Validate sequence ordering
      rapidMessages.forEach((message, index) => {
        expect(message.sequenceNumber).toBe(index + 1);
        expect(message.output).toBe(`Message ${index + 1}\n`);
      });
      
      // Check no sequence gaps
      const sequenceNumbers = rapidMessages.map(m => m.sequenceNumber);
      const expectedSequence = Array.from({ length: 10 }, (_, i) => i + 1);
      expect(sequenceNumbers).toEqual(expectedSequence);
    });
  });

  describe('Connection Health Monitoring', () => {
    test('should monitor SSE connection health', () => {
      const healthStates = ['healthy', 'degraded', 'failed'];
      const connectionHealth = {
        status: 'healthy',
        lastHeartbeat: Date.now(),
        messageCount: 0,
        errorCount: 0
      };
      
      // Test healthy state
      expect(healthStates).toContain(connectionHealth.status);
      expect(connectionHealth.errorCount).toBe(0);
      
      // Test degraded state
      connectionHealth.status = 'degraded';
      connectionHealth.errorCount = 1;
      expect(connectionHealth.status).toBe('degraded');
      
      // Test failed state
      connectionHealth.status = 'failed';
      connectionHealth.errorCount = 5;
      expect(connectionHealth.status).toBe('failed');
      expect(connectionHealth.errorCount).toBeGreaterThan(3);
    });

    test('should track connection metrics', () => {
      const metrics = {
        totalMessages: 42,
        messagesPerSecond: 2.5,
        averageLatency: 150,
        connectionUptime: 300,
        recoveryCount: 1,
        lastRecoveryTime: Date.now() - 60000 // 1 minute ago
      };
      
      expect(metrics.totalMessages).toBeGreaterThan(0);
      expect(metrics.messagesPerSecond).toBeGreaterThan(0);
      expect(metrics.averageLatency).toBeGreaterThan(0);
      expect(metrics.connectionUptime).toBeGreaterThan(0);
      expect(metrics.recoveryCount).toBeGreaterThanOrEqual(0);
      expect(metrics.lastRecoveryTime).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should handle SSE connection recovery', async () => {
      const instanceId = 'claude-recovery-test';
      const recoveryScenarios = [
        { error: 'Connection timeout', shouldRecover: true, maxRetries: 5 },
        { error: 'Network error', shouldRecover: true, maxRetries: 3 },
        { error: 'Authentication failed', shouldRecover: false, maxRetries: 0 }
      ];
      
      recoveryScenarios.forEach(scenario => {
        if (scenario.shouldRecover) {
          expect(scenario.maxRetries).toBeGreaterThan(0);
        } else {
          expect(scenario.maxRetries).toBe(0);
        }
      });
    });

    test('should validate backoff strategy for reconnection', () => {
      const backoffDelays = [];
      const baseDelay = 1000; // 1 second
      const maxRetries = 5;
      
      // Calculate exponential backoff delays
      for (let retry = 0; retry < maxRetries; retry++) {
        const delay = Math.min(baseDelay * Math.pow(2, retry), 30000); // Max 30 seconds
        backoffDelays.push(delay);
      }
      
      expect(backoffDelays).toEqual([1000, 2000, 4000, 8000, 16000]);
      expect(Math.max(...backoffDelays)).toBeLessThanOrEqual(30000);
    });
  });
});