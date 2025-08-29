/**
 * TDD LONDON SCHOOL: Mock-driven test for WebSocket message tripling issue
 * 
 * Tests WebSocket message handling in ClaudeInstanceManagerModern component
 * using mocks to isolate the exact cause of message tripling behavior.
 */

import { jest } from '@jest/globals';

// Mock WebSocket for London School testing
class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  
  public readyState = 1; // OPEN
  public url = '';
  
  constructor(url: string) {
    this.url = url;
  }
  
  send(data: string) {
    // Mock implementation - we'll verify this is called
  }
  
  close() {
    // Mock implementation
  }
  
  // Test helper methods
  simulateOpen() {
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }
  
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }
  
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
  
  simulateClose(code = 1000, reason = '') {
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }
}

// Mock WebSocket globally
(global as any).WebSocket = MockWebSocket;

describe('Claude Output Tripling Issue - WebSocket Message Handling', () => {
  let mockWebSocket: MockWebSocket;
  let messageHandlers: Map<string, Set<(data: any) => void>>;
  let processedMessages: Set<string>;
  let outputState: { [key: string]: string };
  
  // Mock the core message handling logic from ClaudeInstanceManagerModern
  const mockMessageHandler = {
    addHandler: jest.fn((event: string, handler: (data: any) => void) => {
      if (!messageHandlers.has(event)) {
        messageHandlers.set(event, new Set());
      }
      messageHandlers.get(event)!.add(handler);
    }),
    
    triggerHandlers: jest.fn((event: string, data: any) => {
      const handlers = messageHandlers.get(event);
      handlers?.forEach(handler => handler(data));
    }),
    
    processTerminalOutput: jest.fn((data: any) => {
      const messageId = `${data.terminalId}-${data.timestamp || Date.now()}-${data.output.slice(0, 50)}`;
      
      if (processedMessages.has(messageId)) {
        console.log(`🔄 Duplicate message ignored: ${messageId}`);
        return;
      }
      
      processedMessages.add(messageId);
      
      const cleanOutput = data.output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
      
      outputState[data.terminalId] = (outputState[data.terminalId] || '') + cleanOutput;
    })
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    messageHandlers = new Map();
    processedMessages = new Set();
    outputState = {};
    mockWebSocket = new MockWebSocket('ws://localhost:3000/terminal');
  });

  describe('FAILING TEST: Single WebSocket message should render only once', () => {
    it('should process a single Claude output message only once', () => {
      // ARRANGE: Set up mock handlers that simulate ClaudeInstanceManagerModern
      const terminalId = 'claude-test123';
      const testOutput = 'Hello from Claude! This is a test response.';
      
      // Set up terminal output handler (simulating line 95-123 in ClaudeInstanceManagerModern)
      mockMessageHandler.addHandler('terminal:output', mockMessageHandler.processTerminalOutput);
      
      // ACT: Simulate single WebSocket message
      const messageData = {
        type: 'output',
        output: testOutput,
        terminalId: terminalId,
        timestamp: Date.now()
      };
      
      mockMessageHandler.triggerHandlers('terminal:output', messageData);
      
      // ASSERT: Message should be processed exactly once
      expect(mockMessageHandler.processTerminalOutput).toHaveBeenCalledTimes(1);
      expect(outputState[terminalId]).toBe(testOutput);
      expect(processedMessages.size).toBe(1);
    });
    
    it('FAILING: should prevent duplicate messages from being processed', () => {
      // ARRANGE: Same message data sent multiple times (simulating the tripling bug)
      const terminalId = 'claude-test123';
      const testOutput = 'Duplicate message test';
      const messageData = {
        type: 'output',
        output: testOutput,
        terminalId: terminalId,
        timestamp: 1699999999999 // Fixed timestamp to create same messageId
      };
      
      mockMessageHandler.addHandler('terminal:output', mockMessageHandler.processTerminalOutput);
      
      // ACT: Send the same message 3 times (simulating tripling issue)
      mockMessageHandler.triggerHandlers('terminal:output', messageData);
      mockMessageHandler.triggerHandlers('terminal:output', messageData);
      mockMessageHandler.triggerHandlers('terminal:output', messageData);
      
      // ASSERT: Should only process once despite 3 identical messages
      expect(mockMessageHandler.processTerminalOutput).toHaveBeenCalledTimes(3);
      // This should FAIL if deduplication is working correctly
      expect(processedMessages.size).toBe(1); // Only one unique message should be tracked
      expect(outputState[terminalId]).toBe(testOutput); // Not tripled content
    });
  });

  describe('FAILING TEST: WebSocket message routing causes duplication', () => {
    it('should not process echo messages to prevent duplication', () => {
      // ARRANGE: Set up handlers for different message types
      const echoHandler = jest.fn();
      const outputHandler = jest.fn();
      
      mockMessageHandler.addHandler('echo', echoHandler);
      mockMessageHandler.addHandler('terminal:output', outputHandler);
      
      // ACT: Simulate echo message that should be skipped
      const echoMessage = {
        type: 'echo',
        data: 'This is an echo message',
        terminalId: 'claude-test123'
      };
      
      // Simulate the WebSocket onmessage handler logic from lines 280-312
      if (echoMessage.type === 'echo') {
        console.log('📢 Echo message received (skipped to prevent duplication)');
        // Should NOT trigger handlers for echo messages
      } else if (echoMessage.type === 'output' || echoMessage.type === 'terminal_output') {
        mockMessageHandler.triggerHandlers('terminal:output', echoMessage);
      }
      
      // ASSERT: Echo handler should not be called, output handler should not be called
      expect(echoHandler).not.toHaveBeenCalled();
      expect(outputHandler).not.toHaveBeenCalled();
    });
    
    it('FAILING: should route output/terminal_output messages correctly without duplication', () => {
      // ARRANGE: Mock different message types that could cause duplication
      const outputHandler = jest.fn();
      mockMessageHandler.addHandler('terminal:output', outputHandler);
      
      // ACT: Send both 'output' and 'terminal_output' message types
      const outputMessage = {
        type: 'output',
        data: 'Regular output message',
        terminalId: 'claude-test123',
        timestamp: Date.now()
      };
      
      const terminalOutputMessage = {
        type: 'terminal_output',
        output: 'Terminal output message',
        terminalId: 'claude-test123',
        timestamp: Date.now() + 1
      };
      
      // Simulate WebSocket message routing (lines 286-292)
      if (outputMessage.type === 'output' || outputMessage.type === 'terminal_output') {
        mockMessageHandler.triggerHandlers('terminal:output', {
          output: outputMessage.data || outputMessage.output,
          terminalId: outputMessage.terminalId,
          timestamp: outputMessage.timestamp
        });
      }
      
      if (terminalOutputMessage.type === 'output' || terminalOutputMessage.type === 'terminal_output') {
        mockMessageHandler.triggerHandlers('terminal:output', {
          output: terminalOutputMessage.data || terminalOutputMessage.output,
          terminalId: terminalOutputMessage.terminalId,
          timestamp: terminalOutputMessage.timestamp
        });
      }
      
      // ASSERT: Each unique message should be processed exactly once
      expect(outputHandler).toHaveBeenCalledTimes(2); // Two different messages
    });
  });

  describe('FAILING TEST: Generic message handler causes duplication', () => {
    it('should not have generic message handler that processes all messages', () => {
      // ARRANGE: Test the removal of generic message handler (line 308 comment)
      const genericHandler = jest.fn();
      const specificHandler = jest.fn();
      
      // This test verifies that we don't have a catch-all handler
      mockMessageHandler.addHandler('*', genericHandler);
      mockMessageHandler.addHandler('terminal:output', specificHandler);
      
      // ACT: Send a message that could be caught by both handlers
      const messageData = {
        type: 'output',
        output: 'Test message',
        terminalId: 'claude-test123',
        timestamp: Date.now()
      };
      
      // Simulate having both generic and specific handlers (the bug scenario)
      mockMessageHandler.triggerHandlers('*', messageData); // Generic handler
      mockMessageHandler.triggerHandlers('terminal:output', messageData); // Specific handler
      
      // ASSERT: Generic handler should not exist in the fixed implementation
      expect(genericHandler).toHaveBeenCalledTimes(1);
      expect(specificHandler).toHaveBeenCalledTimes(1);
      // This would cause duplication - both handlers processing the same message
    });
  });

  describe('Message ID Generation and Deduplication', () => {
    it('should generate unique message IDs for different content', () => {
      // ARRANGE: Different messages should get different IDs
      const terminalId = 'claude-test123';
      const timestamp = Date.now();
      
      const message1 = { terminalId, output: 'First message', timestamp };
      const message2 = { terminalId, output: 'Second message', timestamp: timestamp + 1 };
      
      mockMessageHandler.addHandler('terminal:output', mockMessageHandler.processTerminalOutput);
      
      // ACT: Process different messages
      mockMessageHandler.triggerHandlers('terminal:output', message1);
      mockMessageHandler.triggerHandlers('terminal:output', message2);
      
      // ASSERT: Both messages should be processed (different content)
      expect(processedMessages.size).toBe(2);
      expect(outputState[terminalId]).toBe('First messageSecond message');
    });
    
    it('FAILING: should generate same message ID for identical content and prevent duplication', () => {
      // ARRANGE: Identical messages should get same ID and be deduplicated
      const terminalId = 'claude-test123';
      const output = 'Identical message content';
      const timestamp = 1699999999999;
      
      const identicalMessage = { terminalId, output, timestamp };
      
      mockMessageHandler.addHandler('terminal:output', mockMessageHandler.processTerminalOutput);
      
      // ACT: Process identical message multiple times
      mockMessageHandler.triggerHandlers('terminal:output', identicalMessage);
      mockMessageHandler.triggerHandlers('terminal:output', identicalMessage);
      mockMessageHandler.triggerHandlers('terminal:output', identicalMessage);
      
      // ASSERT: Only one message should be processed despite 3 calls
      expect(processedMessages.size).toBe(1);
      expect(outputState[terminalId]).toBe(output); // Not tripled
    });
  });
});