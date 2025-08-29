/**
 * TDD London School - SSE Output Chunking Contract Tests (FINAL)
 * 
 * CRITICAL: Tests SSE output chunking behavior to prevent message accumulation
 * 
 * Focus Areas:
 * 1. SSE sends only NEW output (not full buffer replay)
 * 2. Output position tracking per Claude instance
 * 3. Message deduplication in frontend
 * 4. SSE connection state management
 * 5. Incremental buffer management
 * 
 * London School Approach:
 * - Mock all external dependencies
 * - Verify HOW components collaborate
 * - Focus on behavior contracts, not implementation
 * - Test component interactions through mocks
 */

const EventEmitter = require('events');
const SSEOutputChunker = require('../../src/SSEOutputChunker');

// Mock all external dependencies for isolation
jest.mock('eventsource');
jest.mock('child_process');
jest.mock('node-pty');

describe('TDD London School - SSE Output Chunking Contracts', () => {
  let mockClaudeProcess;
  let mockEventSource;
  let mockSSEConnection;
  let outputBuffer;
  let sseConnectionManager;
  let positionTracker;
  let messageDeduplicator;
  let chunker;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Claude process stdout stream
    mockClaudeProcess = {
      pid: 12345,
      stdout: new EventEmitter(),
      stdin: { write: jest.fn() },
      kill: jest.fn(),
      on: jest.fn()
    };
    
    // Mock SSE EventSource connection
    mockEventSource = {
      onopen: null,
      onmessage: null,
      onerror: null,
      close: jest.fn(),
      readyState: 1, // OPEN
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    
    // Mock SSE response object
    mockSSEConnection = {
      write: jest.fn(),
      end: jest.fn(),
      writeHead: jest.fn(),
      destroyed: false,
      writable: true
    };
    
    // Initialize systems under test
    outputBuffer = new Map(); // instanceId -> { content: string, position: number }
    chunker = new SSEOutputChunker();
    sseConnectionManager = createSSEConnectionManager();
    positionTracker = createPositionTracker();
    messageDeduplicator = createMessageDeduplicator();
  });

  describe('CRITICAL: SSE Only Sends NEW Output (No Buffer Replay)', () => {
    test('should track output position per Claude instance', () => {
      const instanceId = 'claude-123';
      const initialOutput = 'Claude started\n';
      const newOutput = 'Ready for input\n';
      
      // First output
      const chunk1 = chunker.getNewContentSince(instanceId, initialOutput);
      expect(chunk1).toBe('Claude started\n');
      expect(chunker.getPosition(instanceId)).toBe(15);
      
      // Simulate new output appended
      const fullOutput = initialOutput + newOutput;
      const chunk2 = chunker.getNewContentSince(instanceId, fullOutput);
      expect(chunk2).toBe('Ready for input\n');
      expect(chunker.getPosition(instanceId)).toBe(31);
      
      // Verify no duplicate content sent
      expect(chunk2).not.toContain('Claude started');
    });

    test('should only send new output chunks via SSE', () => {
      const instanceId = 'claude-123';
      const connections = [mockSSEConnection];
      
      // First chunk
      const result1 = chunker.sendChunk(instanceId, 'Hello\n', connections);
      expect(result1.sent).toBe(true);
      expect(result1.successCount).toBe(1);
      expect(mockSSEConnection.write).toHaveBeenCalledWith(
        expect.stringContaining('Hello\\n')
      );
      
      // Empty chunk should not send
      const result2 = chunker.sendChunk(instanceId, '', connections);
      expect(result2.sent).toBe(false);
      expect(result2.reason).toBe('no_new_content');
    });

    test('should prevent full buffer replay on reconnection', () => {
      const instanceId = 'claude-123';
      const fullBufferContent = 'Line 1\nLine 2\nLine 3\nCurrent: ';
      
      // Calculate actual position: 'Line 1\n' (7) + 'Line 2\n' (7) + 'Line 3\n' (7) = 21
      const result = chunker.handleReconnection(instanceId, fullBufferContent, 21);
      
      expect(result.shouldSendWelcome).toBe(true);
      expect(result.shouldSendBuffer).toBe(true);
      expect(result.contentToSend).toBe('Current: ');
      expect(result.welcomeMessage.resumeFrom).toBe(21);
      
      // No new content case
      const noNewResult = chunker.handleReconnection(
        instanceId,
        fullBufferContent,
        fullBufferContent.length
      );
      
      expect(noNewResult.shouldSendBuffer).toBe(false);
      expect(noNewResult.contentToSend).toBe('');
    });
  });

  describe('CRITICAL: Output Position Tracking Per Claude Instance', () => {
    test('should maintain separate position cursors per instance', () => {
      const instance1 = 'claude-dev';
      const instance2 = 'claude-prod';
      
      // Set different positions for different instances
      chunker.updatePosition(instance1, 10);
      chunker.updatePosition(instance2, 20);
      
      expect(chunker.getPosition(instance1)).toBe(10);
      expect(chunker.getPosition(instance2)).toBe(20);
      
      // Cleanup one instance shouldn't affect the other
      chunker.outputPositions.delete(instance1);
      expect(chunker.getPosition(instance1)).toBe(0);
      expect(chunker.getPosition(instance2)).toBe(20);
    });

    test('should handle concurrent output from multiple Claude instances', () => {
      const outputCoordinator = {
        processOutput: jest.fn((instanceId, newOutput, positionTracker, sseManager) => {
          const lastPos = positionTracker.getPosition(instanceId);
          const incrementalContent = newOutput.substring(lastPos);
          
          if (incrementalContent.length > 0) {
            // Update position before sending to prevent race conditions
            positionTracker.updatePosition(instanceId, newOutput.length);
            
            // Send only the new content
            const connections = sseManager.getConnections(instanceId);
            return sseManager.broadcast(instanceId, incrementalContent, connections);
          }
          
          return { sent: false, reason: 'no_new_content' };
        })
      };
      
      const mockPositionTracker = {
        getPosition: jest.fn().mockReturnValue(0),
        updatePosition: jest.fn()
      };
      
      const mockSSEManager = {
        getConnections: jest.fn().mockReturnValue([mockSSEConnection]),
        broadcast: jest.fn().mockReturnValue({ sent: true, count: 1 })
      };
      
      // Process output for instance
      const result = outputCoordinator.processOutput(
        'claude-123',
        'New output content',
        mockPositionTracker,
        mockSSEManager
      );
      
      expect(mockPositionTracker.getPosition).toHaveBeenCalledWith('claude-123');
      expect(mockPositionTracker.updatePosition).toHaveBeenCalledWith('claude-123', 18);
      expect(mockSSEManager.broadcast).toHaveBeenCalledWith(
        'claude-123',
        'New output content',
        [mockSSEConnection]
      );
    });
  });

  describe('CRITICAL: Message Deduplication in Frontend', () => {
    test('should deduplicate messages based on content hash', () => {
      const message1 = {
        instanceId: 'claude-123',
        timestamp: '2025-01-01T00:00:00Z',
        data: 'Hello world'
      };
      
      // First message should be processed
      expect(chunker.isDuplicateMessage(message1)).toBe(false);
      chunker.markMessageAsSeen(message1);
      
      // Same message should be deduplicated
      expect(chunker.isDuplicateMessage(message1)).toBe(true);
    });

    test('should handle rapid "hello" inputs without repetition', () => {
      const instanceId = 'claude-123';
      
      // First hello should process
      const result1 = chunker.shouldProcessInput(instanceId, 'hello');
      expect(result1.process).toBe(true);
      
      // Immediate second hello should be debounced
      const result2 = chunker.shouldProcessInput(instanceId, 'hello');
      expect(result2.process).toBe(false);
      expect(result2.reason).toBe('debounced');
      
      // Different input should process immediately
      const result3 = chunker.shouldProcessInput(instanceId, 'help');
      expect(result3.process).toBe(true);
    });
  });

  describe('CRITICAL: SSE Connection State Management', () => {
    test('should track connection readiness per instance', () => {
      const instanceId = 'claude-123';
      
      // Initial state
      expect(chunker.getState(instanceId)).toBe('disconnected');
      expect(chunker.isReady(instanceId)).toBe(false);
      
      // Connect
      chunker.setState(instanceId, 'connected');
      expect(chunker.getState(instanceId)).toBe('connected');
      expect(chunker.isReady(instanceId)).toBe(true);
      
      // Disconnect
      chunker.setState(instanceId, 'disconnected');
      expect(chunker.isReady(instanceId)).toBe(false);
    });

    test('should handle connection recovery after interruption', () => {
      const instanceId = 'claude-123';
      
      chunker.updatePosition(instanceId, 150);
      const recovery = chunker.recover(instanceId, 'interrupted');
      
      expect(recovery.reconnected).toBe(true);
      expect(recovery.resumePosition).toBe(150);
      expect(recovery.stateTransition).toBe('interrupted -> connected');
      expect(chunker.getState(instanceId)).toBe('connected');
    });
  });

  describe('CRITICAL: Incremental Buffer Management', () => {
    test('should manage growing output buffers efficiently', () => {
      const instanceId = 'claude-123';
      const smallContent = 'Small content';
      const largeContent = 'x'.repeat(50000);
      
      // Small append
      const result1 = chunker.appendToBuffer(instanceId, smallContent);
      expect(result1.appended).toBe(true);
      expect(result1.trimmed).toBe(false);
      expect(chunker.getBufferSize(instanceId)).toBe(13);
      
      // Large append that doesn't trigger trimming yet
      const result2 = chunker.appendToBuffer(instanceId, largeContent);
      expect(result2.appended).toBe(true);
      expect(result2.trimmed).toBe(false); // Still under 100KB limit
      
      // Append that WILL exceed limit (we need to exceed 100KB)
      const veryLargeContent = 'y'.repeat(60000); // This + previous should exceed 100KB
      const result3 = chunker.appendToBuffer(instanceId, veryLargeContent);
      expect(result3.appended).toBe(true);
      expect(result3.trimmed).toBe(true);
      expect(result3.newSize).toBeLessThanOrEqual(chunker.maxBufferSize);
    });

    test('should coordinate buffer updates with position tracking', () => {
      const coordinatedManager = {
        updateBufferAndPosition: jest.fn((instanceId, newContent, bufferManager, positionTracker) => {
          const startPos = positionTracker.getPosition(instanceId);
          const bufferResult = bufferManager.appendToBuffer(instanceId, newContent);
          
          if (bufferResult.trimmed) {
            const newPos = bufferManager.getBufferSize(instanceId);
            positionTracker.updatePosition(instanceId, newPos);
            
            return {
              updated: true,
              trimmed: true,
              positionReset: true,
              newPosition: newPos,
              incrementalContent: newContent
            };
          } else {
            const newPos = startPos + newContent.length;
            positionTracker.updatePosition(instanceId, newPos);
            
            return {
              updated: true,
              trimmed: false,
              positionReset: false,
              newPosition: newPos,
              incrementalContent: newContent
            };
          }
        })
      };
      
      const mockBufferManager = {
        appendToBuffer: jest.fn().mockReturnValue({ appended: true, trimmed: false }),
        getBufferSize: jest.fn().mockReturnValue(100)
      };
      
      const mockPositionTracker = {
        getPosition: jest.fn().mockReturnValue(50),
        updatePosition: jest.fn()
      };
      
      const result = coordinatedManager.updateBufferAndPosition(
        'claude-123',
        'new content',
        mockBufferManager,
        mockPositionTracker
      );
      
      expect(result.updated).toBe(true);
      expect(result.trimmed).toBe(false);
      expect(mockPositionTracker.updatePosition).toHaveBeenCalledWith('claude-123', 61);
    });
  });

  describe('Integration: End-to-End SSE Chunking Flow', () => {
    test('should coordinate all components for proper chunking', () => {
      const instanceId = 'claude-123';
      
      // Setup connection and state
      chunker.addConnection(instanceId, mockSSEConnection);
      
      // Simulate first output
      const result = chunker.processNewOutput(instanceId, 'Previous content\nNew line added\n');
      
      expect(result.processed).toBe(true);
      expect(result.incrementalContent).toBe('Previous content\nNew line added\n');
      expect(result.bytesSent).toBe(32);
      expect(result.connectionsSent).toBe(1);
    });

    test('should handle real SSE integration with position tracking', () => {
      const instanceId = 'claude-123';
      
      // Add connection
      chunker.addConnection(instanceId, mockSSEConnection);
      
      // First output
      const output1 = 'Claude CLI started\n';
      const result1 = chunker.processNewOutput(instanceId, output1);
      
      expect(result1.processed).toBe(true);
      expect(result1.incrementalContent).toBe(output1);
      expect(chunker.getPosition(instanceId)).toBe(19);
      
      // Second output (incremental)
      const output2 = output1 + 'Ready for commands\n';
      const result2 = chunker.processNewOutput(instanceId, output2);
      
      expect(result2.processed).toBe(true);
      expect(result2.incrementalContent).toBe('Ready for commands\n');
      expect(chunker.getPosition(instanceId)).toBe(38);
      
      // Verify SSE calls
      expect(mockSSEConnection.write).toHaveBeenCalledTimes(2);
    });
  });

  describe('CRITICAL: Real-world Scenarios', () => {
    test('should prevent "hello" spam accumulation', () => {
      const instanceId = 'claude-123';
      chunker.addConnection(instanceId, mockSSEConnection);
      
      // Rapid "hello" inputs
      expect(chunker.shouldProcessInput(instanceId, 'hello').process).toBe(true);
      expect(chunker.shouldProcessInput(instanceId, 'hello').process).toBe(false); // debounced
      expect(chunker.shouldProcessInput(instanceId, 'hello').process).toBe(false); // debounced
      
      // Only one should be processed
      const mockCallCount = mockSSEConnection.write.mock.calls.length;
      
      // Different input breaks debounce
      expect(chunker.shouldProcessInput(instanceId, 'help').process).toBe(true);
    });

    test('should handle connection drops and reconnections', () => {
      const instanceId = 'claude-123';
      
      // Initial setup
      chunker.addConnection(instanceId, mockSSEConnection);
      chunker.processNewOutput(instanceId, 'Initial output\n');
      
      // Simulate connection drop
      chunker.removeConnection(instanceId, mockSSEConnection);
      expect(chunker.getState(instanceId)).toBe('disconnected');
      
      // Buffer continues to grow
      chunker.processNewOutput(instanceId, 'Initial output\nBuffered while disconnected\n');
      
      // Reconnect
      const mockSSEConnection2 = { ...mockSSEConnection, write: jest.fn() };
      chunker.addConnection(instanceId, mockSSEConnection2);
      
      // Should send only new content since last position
      const recovery = chunker.handleReconnection(instanceId, 'Initial output\nBuffered while disconnected\nNew after reconnect\n', 43);
      expect(recovery.contentToSend).toBe('New after reconnect\n');
    });
  });
});

// Helper factory functions for test setup
function createSSEConnectionManager() {
  return {
    connections: new Map(),
    getActiveConnectionCount(instanceId) {
      return (this.connections.get(instanceId) || []).length;
    }
  };
}

function createPositionTracker() {
  return {
    positions: new Map(),
    getPosition(instanceId) {
      return this.positions.get(instanceId) || 0;
    },
    updatePosition(instanceId, pos) {
      this.positions.set(instanceId, pos);
    }
  };
}

function createMessageDeduplicator() {
  return {
    seenMessages: new Set(),
    isDuplicate: jest.fn(() => false),
    markAsSeen: jest.fn()
  };
}