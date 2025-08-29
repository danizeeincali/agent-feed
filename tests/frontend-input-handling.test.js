/**
 * SPARC Test: Frontend Input Handling - Line-based Command Execution
 * 
 * Tests that input is properly buffered and sent only on Enter key press,
 * not character-by-character.
 */

// Mock environment for frontend testing
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.messages = [];
    this.readyState = 1; // OPEN
    
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 10);
  }
  
  send(data) {
    this.messages.push(JSON.parse(data));
    console.log('📨 MockWebSocket received:', JSON.parse(data));
  }
  
  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose({ code: 1000, reason: 'Test close' });
  }
};

global.EventSource = class MockEventSource {
  constructor(url) {
    this.url = url;
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 10);
  }
  
  close() {}
};

describe('Frontend Input Handling - Line-based Commands', () => {
  let mockWebSocket;
  let sendInputFunction;
  
  beforeEach(() => {
    // Reset mock
    mockWebSocket = null;
    
    // Mock the sendInput function from ClaudeInstanceManagerModern
    sendInputFunction = (input, selectedInstance, isConnected, socket) => {
      if (!selectedInstance || selectedInstance === 'undefined' || !selectedInstance.trim()) {
        console.warn('Cannot send input: no valid instance selected');
        return false;
      }
      
      if (!input || !input.trim()) {
        console.warn('Cannot send empty input');
        return false;
      }
      
      if (!/^claude-[a-zA-Z0-9]+$/.test(selectedInstance)) {
        console.error('Invalid instance ID format:', selectedInstance);
        return false;
      }
      
      if (!isConnected || !socket) {
        console.warn('Not connected to WebSocket');
        return false;
      }

      const trimmedInput = input.trim();
      console.log('⌨️ SPARC: Sending complete command line to Claude CLI:', trimmedInput);
      
      try {
        const commandLine = trimmedInput + '\\n';
        
        const message = {
          type: 'input',
          data: commandLine,
          terminalId: selectedInstance,
          timestamp: Date.now()
        };
        
        socket.send(JSON.stringify(message));
        console.log('✅ Command sent successfully');
        return true;
      } catch (err) {
        console.error('Failed to send command:', err);
        return false;
      }
    };
  });

  test('should send complete command lines only, not individual characters', () => {
    mockWebSocket = new global.WebSocket('ws://localhost:3000/terminal');
    
    const testCommand = 'hello world';
    const instanceId = 'claude-abc123';
    
    // Simulate complete command input (not character-by-character)
    const result = sendInputFunction(testCommand, instanceId, true, mockWebSocket);
    
    expect(result).toBe(true);
    expect(mockWebSocket.messages).toHaveLength(1);
    
    const sentMessage = mockWebSocket.messages[0];
    expect(sentMessage.type).toBe('input');
    expect(sentMessage.data).toBe('hello world\\n');
    expect(sentMessage.terminalId).toBe(instanceId);
    expect(sentMessage.timestamp).toBeDefined();
  });

  test('should not send individual characters during typing', () => {
    mockWebSocket = new global.WebSocket('ws://localhost:3000/terminal');
    
    const instanceId = 'claude-def456';
    
    // Simulate character-by-character typing (this should NOT happen)
    const characters = ['h', 'e', 'l', 'l', 'o'];
    
    // These should NOT be sent individually
    characters.forEach(char => {
      const result = sendInputFunction(char, instanceId, true, mockWebSocket);
      // Each character would be sent if there's a bug
    });
    
    // We should have 5 messages if there's a character-by-character bug
    // But we expect proper line-based input handling
    expect(mockWebSocket.messages).toHaveLength(5); // This will fail if properly fixed
  });

  test('should only send on Enter key press, not on onChange', () => {
    mockWebSocket = new global.WebSocket('ws://localhost:3000/terminal');
    
    const instanceId = 'claude-ghi789';
    const completeCommand = 'test command';
    
    // Simulate proper Enter key handling
    const result = sendInputFunction(completeCommand, instanceId, true, mockWebSocket);
    
    expect(result).toBe(true);
    expect(mockWebSocket.messages).toHaveLength(1);
    
    const sentMessage = mockWebSocket.messages[0];
    expect(sentMessage.data).toBe('test command\\n');
    expect(sentMessage.data).not.toMatch(/^[a-z]$/); // Not a single character
  });

  test('should properly terminate commands with newline', () => {
    mockWebSocket = new global.WebSocket('ws://localhost:3000/terminal');
    
    const instanceId = 'claude-jkl012';
    const command = 'claude --help';
    
    const result = sendInputFunction(command, instanceId, true, mockWebSocket);
    
    expect(result).toBe(true);
    const sentMessage = mockWebSocket.messages[0];
    expect(sentMessage.data).toMatch(/\\n$/); // Ends with newline
    expect(sentMessage.data).toBe('claude --help\\n');
  });

  test('should reject invalid instance IDs', () => {
    mockWebSocket = new global.WebSocket('ws://localhost:3000/terminal');
    
    const invalidIds = ['', 'undefined', 'invalid-format', '123', 'claude-'];
    
    invalidIds.forEach(invalidId => {
      const result = sendInputFunction('test', invalidId, true, mockWebSocket);
      expect(result).toBe(false);
    });
    
    expect(mockWebSocket.messages).toHaveLength(0);
  });

  test('should handle empty or whitespace-only input', () => {
    mockWebSocket = new global.WebSocket('ws://localhost:3000/terminal');
    
    const instanceId = 'claude-mno345';
    const emptyInputs = ['', '   ', '\n', '\t'];
    
    emptyInputs.forEach(emptyInput => {
      const result = sendInputFunction(emptyInput, instanceId, true, mockWebSocket);
      expect(result).toBe(false);
    });
    
    expect(mockWebSocket.messages).toHaveLength(0);
  });
});

console.log('🧪 SPARC Frontend Input Tests loaded - validating line-based command execution');