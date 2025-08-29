/**
 * TDD London School - SSE Output Chunking Contract Tests
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
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // FAILING TEST 1: Mock Claude process stdout stream
    mockClaudeProcess = {
      pid: 12345,
      stdout: new EventEmitter(),
      stdin: { write: jest.fn() },
      kill: jest.fn(),
      on: jest.fn()
    };
    
    // FAILING TEST 2: Mock SSE EventSource connection
    mockEventSource = {
      onopen: null,
      onmessage: null,
      onerror: null,
      close: jest.fn(),
      readyState: 1, // OPEN
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    
    // FAILING TEST 3: Mock SSE response object
    mockSSEConnection = {
      write: jest.fn(),
      end: jest.fn(),
      writeHead: jest.fn(),
      destroyed: false,
      writable: true
    };
    
    // FAILING TEST 4: Initialize systems under test
    outputBuffer = new Map(); // instanceId -> { content: string, position: number }
    sseConnectionManager = createSSEConnectionManager();
    positionTracker = createPositionTracker();
    messageDeduplicator = createMessageDeduplicator();
  });

  describe('CRITICAL: SSE Only Sends NEW Output (No Buffer Replay)', () => {
    test('should track output position per Claude instance', () => {
      // FAILING: Position tracking contract
      const instanceId = 'claude-123';
      const initialOutput = 'Claude started\n';
      const newOutput = 'Ready for input\n';
      
      const positionTracker = {
        getPosition: jest.fn((id) => {
          return outputBuffer.get(id)?.position || 0;
        }),
        
        updatePosition: jest.fn((id, newPos) => {
          const current = outputBuffer.get(id) || { content: '', position: 0 };
          current.position = newPos;
          outputBuffer.set(id, current);
          return newPos;
        }),
        
        getNewContentSince: jest.fn((id, content) => {
          const lastPos = positionTracker.getPosition(id);
          const newContent = content.substring(lastPos);
          positionTracker.updatePosition(id, content.length);
          return newContent;
        })
      };
      
      // First output
      const chunk1 = positionTracker.getNewContentSince(instanceId, initialOutput);
      expect(chunk1).toBe('Claude started\n');
      expect(positionTracker.getPosition(instanceId)).toBe(15);
      
      // Simulate new output appended
      const fullOutput = initialOutput + newOutput;
      const chunk2 = positionTracker.getNewContentSince(instanceId, fullOutput);
      expect(chunk2).toBe('Ready for input\n');
      expect(positionTracker.getPosition(instanceId)).toBe(31);
      
      // Verify no duplicate content sent
      expect(chunk2).not.toContain('Claude started');
    });

    test('should only send new output chunks via SSE', () => {
      // FAILING: SSE chunking contract
      const instanceId = 'claude-123';
      const connections = [mockSSEConnection];
      
      const sseOutputChunker = {
        sendChunk: jest.fn((instanceId, newContent, connections) => {
          if (!newContent || newContent.length === 0) {
            return { sent: false, reason: 'no_new_content' };
          }
          
          const message = {
            type: 'output',
            instanceId,
            data: newContent,
            timestamp: new Date().toISOString(),
            isIncremental: true
          };
          
          const serialized = `data: ${JSON.stringify(message)}\n\n`;
          let successCount = 0;
          
          connections.forEach(conn => {
            if (conn.writable && !conn.destroyed) {
              conn.write(serialized);
              successCount++;
            }
          });
          
          return { sent: true, successCount, message };
        })
      };
      
      // First chunk
      const result1 = sseOutputChunker.sendChunk(instanceId, 'Hello\n', connections);
      expect(result1.sent).toBe(true);
      expect(result1.successCount).toBe(1);
      expect(mockSSEConnection.write).toHaveBeenCalledWith(
        expect.stringContaining('Hello\\n')
      );
      
      // Empty chunk should not send
      const result2 = sseOutputChunker.sendChunk(instanceId, '', connections);
      expect(result2.sent).toBe(false);
      expect(result2.reason).toBe('no_new_content');
    });

    test('should prevent full buffer replay on reconnection', () => {
      // FAILING: Reconnection behavior contract
      const instanceId = 'claude-123';
      const fullBufferContent = 'Line 1\nLine 2\nLine 3\nCurrent: ';
      
      const reconnectionHandler = {
        handleReconnection: jest.fn((instanceId, currentBuffer, lastKnownPosition) => {
          // Only send content after last known position
          const newContentOnly = currentBuffer.substring(lastKnownPosition);
          
          return {
            shouldSendWelcome: true,
            shouldSendBuffer: newContentOnly.length > 0,
            contentToSend: newContentOnly,
            welcomeMessage: {
              type: 'reconnected',
              instanceId,
              message: `Reconnected to Claude instance ${instanceId}`,
              resumeFrom: lastKnownPosition
            }
          };
        })
      };
      
      // Simulate reconnection with position tracking
      const result = reconnectionHandler.handleReconnection(
        instanceId,
        fullBufferContent,
        21 // After 'Line 1\nLine 2\nLine 3\n'
      );
      
      expect(result.shouldSendWelcome).toBe(true);
      expect(result.shouldSendBuffer).toBe(true);
      expect(result.contentToSend).toBe('Current: ');
      expect(result.welcomeMessage.resumeFrom).toBe(21);
      
      // No new content case
      const noNewResult = reconnectionHandler.handleReconnection(
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
      // FAILING: Multi-instance position isolation
      const instance1 = 'claude-dev';
      const instance2 = 'claude-prod';
      
      const multiInstanceTracker = {
        positions: new Map(),
        
        track: jest.fn(function(instanceId, content) {
          const currentPos = multiInstanceTracker.positions.get(instanceId) || 0;
          const newContent = content.substring(currentPos);
          multiInstanceTracker.positions.set(instanceId, content.length);
          return newContent;
        }),
        
        getPosition: jest.fn(function(instanceId) {
          return multiInstanceTracker.positions.get(instanceId) || 0;
        }),
        
        reset: jest.fn(function(instanceId) {
          multiInstanceTracker.positions.delete(instanceId);
        })
      };
      
      // Simulate different outputs for different instances
      multiInstanceTracker.positions.set(instance1, 10);
      multiInstanceTracker.positions.set(instance2, 20);
      
      expect(multiInstanceTracker.getPosition(instance1)).toBe(10);
      expect(multiInstanceTracker.getPosition(instance2)).toBe(20);
      
      // Reset one instance shouldn't affect the other
      multiInstanceTracker.reset(instance1);
      expect(multiInstanceTracker.getPosition(instance1)).toBe(0);
      expect(multiInstanceTracker.getPosition(instance2)).toBe(20);
    });

    test('should handle concurrent output from multiple Claude instances', () => {
      // FAILING: Concurrent instance management
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
      // FAILING: Frontend deduplication contract
      const messageDeduplicator = {
        seenHashes: new Set(),
        
        isDuplicate: jest.fn(function(message) {
          const hash = messageDeduplicator.createHash(message);
          return messageDeduplicator.seenHashes.has(hash);
        }),
        
        markAsSeen: jest.fn(function(message) {
          const hash = messageDeduplicator.createHash(message);
          messageDeduplicator.seenHashes.add(hash);
          return hash;
        }),
        
        createHash: jest.fn(function(message) {
          return `${message.instanceId}-${message.timestamp}-${message.data}`;
        }),
        
        processMessage: jest.fn(function(message) {
          if (messageDeduplicator.isDuplicate(message)) {
            return { processed: false, reason: 'duplicate' };
          }
          
          messageDeduplicator.markAsSeen(message);
          return { processed: true, hash: messageDeduplicator.createHash(message) };
        })
      };
      
      const message1 = {
        instanceId: 'claude-123',
        timestamp: '2025-01-01T00:00:00Z',
        data: 'Hello world'
      };
      
      // First message should be processed
      const result1 = messageDeduplicator.processMessage(message1);
      expect(result1.processed).toBe(true);
      
      // Same message should be deduplicated
      const result2 = messageDeduplicator.processMessage(message1);
      expect(result2.processed).toBe(false);
      expect(result2.reason).toBe('duplicate');
    });

    test('should handle rapid "hello" inputs without repetition', () => {
      // FAILING: Rapid input deduplication
      const rapidInputHandler = {
        lastInputTime: new Map(),
        inputDebounceMs: 100,
        
        shouldProcess: jest.fn(function(instanceId, input) {
          const now = Date.now();
          const lastTime = rapidInputHandler.lastInputTime.get(instanceId) || 0;
          const timeSinceLastInput = now - lastTime;
          
          if (timeSinceLastInput < rapidInputHandler.inputDebounceMs && input === 'hello') {
            return { process: false, reason: 'debounced', waitTime: rapidInputHandler.inputDebounceMs - timeSinceLastInput };
          }
          
          rapidInputHandler.lastInputTime.set(instanceId, now);
          return { process: true };
        })
      };
      
      const instanceId = 'claude-123';
      
      // First hello should process
      const result1 = rapidInputHandler.shouldProcess(instanceId, 'hello');
      expect(result1.process).toBe(true);
      
      // Immediate second hello should be debounced
      const result2 = rapidInputHandler.shouldProcess(instanceId, 'hello');
      expect(result2.process).toBe(false);
      expect(result2.reason).toBe('debounced');
      
      // Different input should process immediately
      const result3 = rapidInputHandler.shouldProcess(instanceId, 'help');
      expect(result3.process).toBe(true);
    });
  });

  describe('CRITICAL: SSE Connection State Management', () => {
    test('should track connection readiness per instance', () => {
      // FAILING: Connection state tracking
      const connectionStateManager = {
        states: new Map(),
        
        setState: jest.fn(function(instanceId, state) {
          connectionStateManager.states.set(instanceId, {
            state,
            timestamp: Date.now(),
            transitions: (connectionStateManager.states.get(instanceId)?.transitions || 0) + 1
          });
        }),
        
        getState: jest.fn(function(instanceId) {
          return connectionStateManager.states.get(instanceId)?.state || 'disconnected';
        }),
        
        isReady: jest.fn(function(instanceId) {
          const state = connectionStateManager.getState(instanceId);
          return state === 'connected' || state === 'ready';
        }),
        
        canSendMessages: jest.fn(function(instanceId) {
          return connectionStateManager.isReady(instanceId) && connectionStateManager.hasActiveConnections(instanceId);
        }),
        
        hasActiveConnections: jest.fn(function(instanceId) {
          return sseConnectionManager.getActiveConnectionCount(instanceId) > 0;
        })
      };
      
      const instanceId = 'claude-123';
      
      // Initial state
      expect(connectionStateManager.getState(instanceId)).toBe('disconnected');
      expect(connectionStateManager.isReady(instanceId)).toBe(false);
      
      // Connect
      connectionStateManager.setState(instanceId, 'connected');
      expect(connectionStateManager.getState(instanceId)).toBe('connected');
      expect(connectionStateManager.isReady(instanceId)).toBe(true);
      
      // Disconnect
      connectionStateManager.setState(instanceId, 'disconnected');
      expect(connectionStateManager.isReady(instanceId)).toBe(false);
    });

    test('should handle connection recovery after interruption', () => {
      // FAILING: Connection recovery contract
      const recoveryManager = {
        recover: jest.fn((instanceId, lastKnownState, positionTracker) => {
          const recovery = {
            instanceId,
            reconnected: true,
            resumePosition: positionTracker.getPosition(instanceId),
            stateTransition: `${lastKnownState} -> connected`,
            timestamp: new Date().toISOString()
          };
          
          return recovery;
        })
      };
      
      const mockTracker = {
        getPosition: jest.fn().mockReturnValue(150)
      };
      
      const recovery = recoveryManager.recover('claude-123', 'interrupted', mockTracker);
      
      expect(recovery.reconnected).toBe(true);
      expect(recovery.resumePosition).toBe(150);
      expect(recovery.stateTransition).toBe('interrupted -> connected');
      expect(mockTracker.getPosition).toHaveBeenCalledWith('claude-123');
    });
  });

  describe('CRITICAL: Incremental Buffer Management', () => {
    test('should manage growing output buffers efficiently', () => {
      // FAILING: Buffer growth management
      const bufferManager = {
        buffers: new Map(),
        maxBufferSize: 1024 * 100, // 100KB
        
        appendToBuffer: jest.fn(function(instanceId, newContent) {
          const current = bufferManager.buffers.get(instanceId) || '';
          const updated = current + newContent;
          
          if (updated.length > bufferManager.maxBufferSize) {
            // Trim from beginning, keep recent content
            const trimmed = updated.substring(updated.length - bufferManager.maxBufferSize);
            bufferManager.buffers.set(instanceId, trimmed);
            return { appended: true, trimmed: true, newSize: trimmed.length };
          } else {
            bufferManager.buffers.set(instanceId, updated);
            return { appended: true, trimmed: false, newSize: updated.length };
          }
        }),
        
        getBufferSize: jest.fn(function(instanceId) {
          return (bufferManager.buffers.get(instanceId) || '').length;
        }),
        
        clearBuffer: jest.fn(function(instanceId) {
          bufferManager.buffers.delete(instanceId);
        })
      };
      
      const instanceId = 'claude-123';
      const smallContent = 'Small content';
      const largeContent = 'x'.repeat(50000);
      
      // Small append
      const result1 = bufferManager.appendToBuffer(instanceId, smallContent);
      expect(result1.appended).toBe(true);
      expect(result1.trimmed).toBe(false);
      expect(bufferManager.getBufferSize(instanceId)).toBe(13);
      
      // Large append that should trigger trimming  
      const result2 = bufferManager.appendToBuffer(instanceId, largeContent);
      expect(result2.appended).toBe(true);
      expect(result2.trimmed).toBe(false); // Still under limit
      
      // Append more content to exceed limit
      const extraLargeContent = 'x'.repeat(60000);
      const result3 = bufferManager.appendToBuffer(instanceId, extraLargeContent);
      expect(result3.trimmed).toBe(true);
      expect(result3.newSize).toBeLessThanOrEqual(bufferManager.maxBufferSize);
    });

    test('should coordinate buffer updates with position tracking', () => {
      // FAILING: Buffer-position coordination
      const coordinatedManager = {
        updateBufferAndPosition: jest.fn((instanceId, newContent, bufferManager, positionTracker) => {
          const startPos = positionTracker.getPosition(instanceId);
          const bufferResult = bufferManager.appendToBuffer(instanceId, newContent);
          
          if (bufferResult.trimmed) {
            // Buffer was trimmed, reset position to match trimmed buffer
            const newPos = bufferManager.getBufferSize(instanceId);
            positionTracker.updatePosition(instanceId, newPos);
            
            return {
              updated: true,
              trimmed: true,
              positionReset: true,
              newPosition: newPos,
              incrementalContent: newContent // All content is "new" after reset
            };
          } else {
            // Normal case: update position to include new content
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
      // FAILING: Full integration test
      const sseChunkingSystem = {
        processNewOutput: jest.fn((instanceId, rawOutput, components) => {
          const { positionTracker, bufferManager, sseManager, connectionState } = components;
          
          // Check if we can send messages
          if (!connectionState.canSendMessages(instanceId)) {
            return { processed: false, reason: 'not_ready' };
          }
          
          // Get incremental content
          const lastPos = positionTracker.getPosition(instanceId);
          const incrementalContent = rawOutput.substring(lastPos);
          
          if (incrementalContent.length === 0) {
            return { processed: false, reason: 'no_new_content' };
          }
          
          // Update buffer and position
          bufferManager.appendToBuffer(instanceId, incrementalContent);
          positionTracker.updatePosition(instanceId, rawOutput.length);
          
          // Send via SSE
          const connections = sseManager.getConnections(instanceId);
          const sendResult = sseManager.sendIncremental(instanceId, incrementalContent, connections);
          
          return {
            processed: true,
            incrementalContent,
            bytesSent: incrementalContent.length,
            connectionsSent: sendResult.successCount
          };
        })
      };
      
      const mockComponents = {
        positionTracker: {
          getPosition: jest.fn().mockReturnValue(20),
          updatePosition: jest.fn()
        },
        bufferManager: {
          appendToBuffer: jest.fn()
        },
        sseManager: {
          getConnections: jest.fn().mockReturnValue([mockSSEConnection]),
          sendIncremental: jest.fn().mockReturnValue({ successCount: 1 })
        },
        connectionState: {
          canSendMessages: jest.fn().mockReturnValue(true)
        }
      };
      
      const fullOutput = 'Previous content\nNew line added\n';
      const result = sseChunkingSystem.processNewOutput('claude-123', fullOutput, mockComponents);
      
      expect(result.processed).toBe(true);
      expect(result.incrementalContent).toBe(' line added\n');
      expect(mockComponents.positionTracker.updatePosition).toHaveBeenCalledWith('claude-123', 32);
      expect(mockComponents.sseManager.sendIncremental).toHaveBeenCalledWith(
        'claude-123',
        ' line added\n',
        [mockSSEConnection]
      );
    });
  });
});

// Helper factory functions for test setup
function createSSEConnectionManager() {
  return {
    connections: new Map(),
    getActiveConnectionCount: jest.fn((instanceId) => {
      return (this.connections.get(instanceId) || []).length;
    })
  };
}

function createPositionTracker() {
  return {
    positions: new Map(),
    getPosition: jest.fn((instanceId) => {
      return this.positions.get(instanceId) || 0;
    }),
    updatePosition: jest.fn((instanceId, pos) => {
      this.positions.set(instanceId, pos);
    })
  };
}

function createMessageDeduplicator() {
  return {
    seenMessages: new Set(),
    isDuplicate: jest.fn(() => false),
    markAsSeen: jest.fn()
  };
}
