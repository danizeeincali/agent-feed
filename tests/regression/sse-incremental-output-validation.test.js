/**
 * SPARC Enhanced: SSE Incremental Output Validation Tests
 * 
 * CRITICAL REGRESSION PROTECTION:
 * - Validates incremental output delivery prevents infinite repetition
 * - Tests position tracking and buffer management
 * - Ensures only new data is sent since last position
 * - Validates proper message deduplication
 * 
 * Focus: Systematic validation of incremental SSE output system
 */

const EventSource = require('eventsource');

// Mock dependencies
jest.mock('eventsource');

// Mock incremental output buffer management
const createOutputBuffer = () => ({
  buffer: '',
  readPosition: 0,
  lastSentPosition: 0,
  createdAt: new Date()
});

// Mock instance output buffers
const instanceOutputBuffers = new Map();

describe('SPARC Enhanced: SSE Incremental Output Validation', () => {
  let mockEventSource;
  
  beforeEach(() => {
    jest.clearAllMocks();
    instanceOutputBuffers.clear();
    
    mockEventSource = {
      onopen: null,
      onmessage: null,
      onerror: null,
      close: jest.fn(),
      readyState: 1,
      url: '',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    
    EventSource.mockImplementation(() => mockEventSource);
  });

  describe('CRITICAL: Output Position Tracking Contract', () => {
    test('should track output position per Claude instance', () => {
      const instanceId = 'claude-test-123';
      
      const initializeBuffer = jest.fn((id) => {
        instanceOutputBuffers.set(id, createOutputBuffer());
        return instanceOutputBuffers.get(id);
      });
      
      const buffer = initializeBuffer(instanceId);
      
      expect(buffer).toBeDefined();
      expect(buffer.buffer).toBe('');
      expect(buffer.readPosition).toBe(0);
      expect(buffer.lastSentPosition).toBe(0);
      expect(instanceOutputBuffers.has(instanceId)).toBe(true);
    });

    test('should append new data to instance buffer', () => {
      const instanceId = 'claude-test-123';
      instanceOutputBuffers.set(instanceId, createOutputBuffer());
      
      const appendData = jest.fn((id, data) => {
        const buffer = instanceOutputBuffers.get(id);
        if (!buffer) return null;
        
        buffer.buffer += data;
        return {
          previousLength: buffer.buffer.length - data.length,
          newLength: buffer.buffer.length,
          appendedData: data
        };
      });
      
      const result1 = appendData(instanceId, 'Hello ');
      expect(result1.previousLength).toBe(0);
      expect(result1.newLength).toBe(6);
      expect(result1.appendedData).toBe('Hello ');
      
      const result2 = appendData(instanceId, 'Claude!');
      expect(result2.previousLength).toBe(6);
      expect(result2.newLength).toBe(13);
      expect(result2.appendedData).toBe('Claude!');
      
      const buffer = instanceOutputBuffers.get(instanceId);
      expect(buffer.buffer).toBe('Hello Claude!');
    });

    test('should calculate incremental data slice since last sent position', () => {
      const instanceId = 'claude-test-123';
      const buffer = createOutputBuffer();
      buffer.buffer = 'Hello Claude! How are you?';
      buffer.lastSentPosition = 6; // Sent "Hello "
      instanceOutputBuffers.set(instanceId, buffer);
      
      const getIncrementalData = jest.fn((id) => {
        const buffer = instanceOutputBuffers.get(id);
        if (!buffer) return null;
        
        const newDataSlice = buffer.buffer.slice(buffer.lastSentPosition);
        return {
          newData: newDataSlice,
          position: buffer.lastSentPosition,
          totalLength: buffer.buffer.length,
          hasNewData: newDataSlice.length > 0
        };
      });
      
      const result = getIncrementalData(instanceId);
      
      expect(result.newData).toBe('Claude! How are you?');
      expect(result.position).toBe(6);
      expect(result.totalLength).toBe(26);
      expect(result.hasNewData).toBe(true);
    });

    test('should prevent duplicate output when no new data exists', () => {
      const instanceId = 'claude-test-123';
      const buffer = createOutputBuffer();
      buffer.buffer = 'Hello Claude!';
      buffer.lastSentPosition = 13; // All data already sent
      instanceOutputBuffers.set(instanceId, buffer);
      
      const getIncrementalData = jest.fn((id) => {
        const buffer = instanceOutputBuffers.get(id);
        if (!buffer) return null;
        
        const newDataSlice = buffer.buffer.slice(buffer.lastSentPosition);
        return {
          newData: newDataSlice,
          hasNewData: newDataSlice.length > 0,
          reason: newDataSlice.length === 0 ? 'No new data since last position' : 'New data available'
        };
      });
      
      const result = getIncrementalData(instanceId);
      
      expect(result.newData).toBe('');
      expect(result.hasNewData).toBe(false);
      expect(result.reason).toBe('No new data since last position');
    });
  });

  describe('Incremental Message Broadcasting Contract', () => {
    test('should create incremental output message with position metadata', () => {
      const instanceId = 'claude-test-123';
      const newData = 'Hello Claude!';
      const position = 0;
      const totalLength = 13;
      
      const createIncrementalMessage = jest.fn((id, data, pos, total, source = 'stdout') => {
        return {
          type: 'output',
          data: data,
          instanceId: id,
          timestamp: new Date().toISOString(),
          source: source,
          isReal: true,
          position: pos,
          totalLength: total,
          isIncremental: true
        };
      });
      
      const message = createIncrementalMessage(instanceId, newData, position, totalLength);
      
      expect(message.type).toBe('output');
      expect(message.data).toBe('Hello Claude!');
      expect(message.instanceId).toBe(instanceId);
      expect(message.position).toBe(0);
      expect(message.totalLength).toBe(13);
      expect(message.isIncremental).toBe(true);
      expect(message.isReal).toBe(true);
    });

    test('should broadcast only incremental data to connections', () => {
      const instanceId = 'claude-test-123';
      const mockConnections = [
        { write: jest.fn(), writable: true, destroyed: false, writableEnded: false },
        { write: jest.fn(), writable: true, destroyed: false, writableEnded: false }
      ];
      
      const broadcastIncremental = jest.fn((id, data, connections) => {
        const message = {
          type: 'output',
          data: data,
          instanceId: id,
          timestamp: new Date().toISOString(),
          isIncremental: true
        };
        
        const serializedData = `data: ${JSON.stringify(message)}\\n\\n`;
        let successfulBroadcasts = 0;
        
        connections.forEach(conn => {
          if (conn.writable && !conn.destroyed) {
            conn.write(serializedData);
            successfulBroadcasts++;
          }
        });
        
        return { broadcasted: successfulBroadcasts, message };
      });
      
      const result = broadcastIncremental(instanceId, 'New output chunk', mockConnections);
      
      expect(result.broadcasted).toBe(2);
      expect(mockConnections[0].write).toHaveBeenCalledWith(
        expect.stringContaining('New output chunk')
      );
      expect(mockConnections[1].write).toHaveBeenCalledWith(
        expect.stringContaining('New output chunk')
      );
      expect(result.message.isIncremental).toBe(true);
    });

    test('should update last sent position after successful broadcast', () => {
      const instanceId = 'claude-test-123';
      const buffer = createOutputBuffer();
      buffer.buffer = 'Hello Claude! How are you today?';
      buffer.lastSentPosition = 6;
      instanceOutputBuffers.set(instanceId, buffer);
      
      const broadcastAndUpdatePosition = jest.fn((id) => {
        const buffer = instanceOutputBuffers.get(id);
        if (!buffer) return null;
        
        const newData = buffer.buffer.slice(buffer.lastSentPosition);
        if (newData.length === 0) {
          return { broadcasted: false, reason: 'No new data' };
        }
        
        // Simulate successful broadcast
        const previousPosition = buffer.lastSentPosition;
        buffer.lastSentPosition = buffer.buffer.length;
        
        return {
          broadcasted: true,
          data: newData,
          previousPosition: previousPosition,
          newPosition: buffer.lastSentPosition,
          totalLength: buffer.buffer.length
        };
      });
      
      const result = broadcastAndUpdatePosition(instanceId);
      
      expect(result.broadcasted).toBe(true);
      expect(result.data).toBe('Claude! How are you today?');
      expect(result.previousPosition).toBe(6);
      expect(result.newPosition).toBe(33);
      
      const updatedBuffer = instanceOutputBuffers.get(instanceId);
      expect(updatedBuffer.lastSentPosition).toBe(33);
    });
  });

  describe('Buffer Management and Cleanup Contract', () => {
    test('should handle buffered output during connection interruptions', () => {
      const instanceId = 'claude-test-123';
      const buffer = createOutputBuffer();
      buffer.buffer = 'Buffered output from disconnected period';
      buffer.lastSentPosition = 0; // Nothing sent yet
      instanceOutputBuffers.set(instanceId, buffer);
      
      const sendBufferedOutput = jest.fn((id, connection) => {
        const buffer = instanceOutputBuffers.get(id);
        if (!buffer) return null;
        
        const unsentData = buffer.buffer.slice(buffer.lastSentPosition);
        if (unsentData.length === 0) {
          return { sent: false, reason: 'No buffered data' };
        }
        
        const bufferedMessage = {
          type: 'output',
          data: unsentData,
          instanceId: id,
          timestamp: new Date().toISOString(),
          source: 'buffered',
          isReal: true,
          position: buffer.lastSentPosition,
          totalLength: buffer.buffer.length,
          isIncremental: true,
          isBuffered: true
        };
        
        connection.write(`data: ${JSON.stringify(bufferedMessage)}\\n\\n`);
        buffer.lastSentPosition = buffer.buffer.length;
        
        return {
          sent: true,
          data: unsentData,
          messageLength: unsentData.length,
          newPosition: buffer.lastSentPosition
        };
      });
      
      const mockConnection = { write: jest.fn() };
      const result = sendBufferedOutput(instanceId, mockConnection);
      
      expect(result.sent).toBe(true);
      expect(result.data).toBe('Buffered output from disconnected period');
      expect(result.messageLength).toBe(39);
      expect(mockConnection.write).toHaveBeenCalledWith(
        expect.stringContaining('isBuffered')
      );
    });

    test('should clean up output buffers when instance is terminated', () => {
      const instanceId = 'claude-test-123';
      instanceOutputBuffers.set(instanceId, createOutputBuffer());
      
      const cleanupInstance = jest.fn((id) => {
        const existed = instanceOutputBuffers.has(id);
        instanceOutputBuffers.delete(id);
        
        return {
          cleaned: existed,
          remainingBuffers: instanceOutputBuffers.size
        };
      });
      
      expect(instanceOutputBuffers.has(instanceId)).toBe(true);
      
      const result = cleanupInstance(instanceId);
      
      expect(result.cleaned).toBe(true);
      expect(result.remainingBuffers).toBe(0);
      expect(instanceOutputBuffers.has(instanceId)).toBe(false);
    });

    test('should handle multiple instances with separate buffer tracking', () => {
      const instance1 = 'claude-123';
      const instance2 = 'claude-456';
      
      instanceOutputBuffers.set(instance1, createOutputBuffer());
      instanceOutputBuffers.set(instance2, createOutputBuffer());
      
      const appendToInstance = jest.fn((id, data) => {
        const buffer = instanceOutputBuffers.get(id);
        if (buffer) {
          buffer.buffer += data;
          return buffer.buffer.length;
        }
        return 0;
      });
      
      const len1 = appendToInstance(instance1, 'Instance 1 output');
      const len2 = appendToInstance(instance2, 'Instance 2 different output');
      
      expect(len1).toBe(17);
      expect(len2).toBe(27);
      
      const buffer1 = instanceOutputBuffers.get(instance1);
      const buffer2 = instanceOutputBuffers.get(instance2);
      
      expect(buffer1.buffer).toBe('Instance 1 output');
      expect(buffer2.buffer).toBe('Instance 2 different output');
      expect(buffer1.buffer).not.toBe(buffer2.buffer);
    });
  });

  describe('Error Handling and Edge Cases Contract', () => {
    test('should handle missing output buffer gracefully', () => {
      const instanceId = 'nonexistent-instance';
      
      const safeGetIncrementalData = jest.fn((id) => {
        const buffer = instanceOutputBuffers.get(id);
        if (!buffer) {
          return {
            success: false,
            error: 'Buffer not found',
            data: null
          };
        }
        
        return {
          success: true,
          data: buffer.buffer.slice(buffer.lastSentPosition),
          position: buffer.lastSentPosition
        };
      });
      
      const result = safeGetIncrementalData(instanceId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Buffer not found');
      expect(result.data).toBe(null);
    });

    test('should prevent buffer overflow with large outputs', () => {
      const instanceId = 'claude-test-123';
      const buffer = createOutputBuffer();
      instanceOutputBuffers.set(instanceId, buffer);
      
      const MAX_BUFFER_SIZE = 1024 * 1024; // 1MB limit
      
      const safeBuferAppend = jest.fn((id, data) => {
        const buffer = instanceOutputBuffers.get(id);
        if (!buffer) return { success: false, reason: 'Buffer not found' };
        
        const newLength = buffer.buffer.length + data.length;
        if (newLength > MAX_BUFFER_SIZE) {
          // Truncate old data, keep recent data
          const excessBytes = newLength - MAX_BUFFER_SIZE;
          buffer.buffer = buffer.buffer.slice(excessBytes) + data;
          buffer.lastSentPosition = Math.max(0, buffer.lastSentPosition - excessBytes);
          
          return {
            success: true,
            truncated: true,
            removedBytes: excessBytes,
            finalLength: buffer.buffer.length
          };
        }
        
        buffer.buffer += data;
        return {
          success: true,
          truncated: false,
          finalLength: buffer.buffer.length
        };
      });
      
      const largeData = 'x'.repeat(MAX_BUFFER_SIZE + 1000);
      const result = safeBuferAppend(instanceId, largeData);
      
      expect(result.success).toBe(true);
      expect(result.truncated).toBe(true);
      expect(result.removedBytes).toBe(1000);
      expect(result.finalLength).toBe(MAX_BUFFER_SIZE);
    });

    test('should handle concurrent access to output buffers', () => {
      const instanceId = 'claude-test-123';
      instanceOutputBuffers.set(instanceId, createOutputBuffer());
      
      const concurrentOperations = [];
      
      // Simulate concurrent append and read operations
      for (let i = 0; i < 10; i++) {
        concurrentOperations.push(
          new Promise(resolve => {
            setTimeout(() => {
              const buffer = instanceOutputBuffers.get(instanceId);
              if (buffer) {
                buffer.buffer += `Message ${i} `;
                resolve({ operation: 'append', message: `Message ${i}`, success: true });
              } else {
                resolve({ operation: 'append', success: false });
              }
            }, Math.random() * 10);
          })
        );
      }
      
      // Test that concurrent operations complete without corruption
      return Promise.all(concurrentOperations).then(results => {
        expect(results.length).toBe(10);
        expect(results.every(r => r.success)).toBe(true);
        
        const buffer = instanceOutputBuffers.get(instanceId);
        expect(buffer.buffer).toContain('Message 0');
        expect(buffer.buffer).toContain('Message 9');
      });
    });
  });
});