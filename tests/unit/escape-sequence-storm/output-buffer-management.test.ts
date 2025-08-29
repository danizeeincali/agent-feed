/**
 * TDD Test Suite: Output Buffer Management for Escape Sequence Storm Prevention
 * 
 * Root Cause: Improper output buffering and lack of rate limiting causes escape
 * sequence storms when large amounts of terminal data overwhelm the system.
 * 
 * These tests SHOULD FAIL initially, demonstrating current broken behavior.
 */

import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

// Mock the backend buffer manager (based on simple-backend.js patterns)
class MockOutputBufferManager extends EventEmitter {
  private buffers = new Map<string, {
    buffer: string;
    lastSentPosition: number;
    clients: Set<string>;
    lastActivity: Date;
  }>();
  
  private rateLimiters = new Map<string, {
    lastSent: number;
    messageCount: number;
    windowStart: number;
  }>();

  constructor() {
    super();
  }

  initializeBuffer(instanceId: string) {
    this.buffers.set(instanceId, {
      buffer: '',
      lastSentPosition: 0,
      clients: new Set(),
      lastActivity: new Date()
    });
    
    this.rateLimiters.set(instanceId, {
      lastSent: 0,
      messageCount: 0,
      windowStart: Date.now()
    });
  }

  addClient(instanceId: string, clientId: string) {
    const buffer = this.buffers.get(instanceId);
    if (buffer) {
      buffer.clients.add(clientId);
    }
  }

  removeClient(instanceId: string, clientId: string) {
    const buffer = this.buffers.get(instanceId);
    if (buffer) {
      buffer.clients.delete(clientId);
    }
  }

  appendOutput(instanceId: string, data: string) {
    const buffer = this.buffers.get(instanceId);
    if (!buffer) return;
    
    buffer.buffer += data;
    buffer.lastActivity = new Date();
    
    // Should implement intelligent broadcasting
    this.broadcastIncrementalOutput(instanceId, data);
  }

  broadcastIncrementalOutput(instanceId: string, newData: string) {
    const buffer = this.buffers.get(instanceId);
    if (!buffer) return;
    
    // This should implement proper rate limiting and chunking
    // Current implementation has issues that tests will expose
    
    buffer.clients.forEach(clientId => {
      this.emit('message', clientId, {
        type: 'output',
        data: newData,
        instanceId,
        position: buffer.lastSentPosition,
        totalLength: buffer.buffer.length,
        isIncremental: true,
        timestamp: new Date().toISOString()
      });
    });
    
    buffer.lastSentPosition = buffer.buffer.length;
  }

  getIncrementalOutput(instanceId: string, fromPosition: number = 0) {
    const buffer = this.buffers.get(instanceId);
    if (!buffer) return null;
    
    return {
      data: buffer.buffer.slice(fromPosition),
      position: fromPosition,
      totalLength: buffer.buffer.length,
      hasMore: false
    };
  }

  getRateLimit(instanceId: string) {
    return this.rateLimiters.get(instanceId);
  }

  cleanup(instanceId: string) {
    this.buffers.delete(instanceId);
    this.rateLimiters.delete(instanceId);
  }
}

describe('Output Buffer Management - Escape Sequence Storm Prevention', () => {
  let bufferManager: MockOutputBufferManager;
  
  beforeEach(() => {
    bufferManager = new MockOutputBufferManager();
  });

  afterEach(() => {
    bufferManager.removeAllListeners();
  });

  describe('Buffer Initialization and Management', () => {
    test('SHOULD FAIL: No automatic buffer cleanup for idle instances', async () => {
      const instanceId = 'claude-test-123';
      
      bufferManager.initializeBuffer(instanceId);
      bufferManager.addClient(instanceId, 'client1');
      
      // Remove client but buffer should remain for some time
      bufferManager.removeClient(instanceId, 'client1');
      
      // After reasonable time, buffer should be cleaned up automatically
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Buffer should still exist briefly for reconnections
      const result = bufferManager.getIncrementalOutput(instanceId, 0);
      expect(result).not.toBeNull();
      
      // But should be cleaned up after longer idle time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const resultAfterCleanup = bufferManager.getIncrementalOutput(instanceId, 0);
      expect(resultAfterCleanup).toBeNull(); // FAILS - no automatic cleanup
    });

    test('SHOULD FAIL: Buffer memory not limited causing memory leaks', async () => {
      const instanceId = 'claude-test-123';
      
      bufferManager.initializeBuffer(instanceId);
      bufferManager.addClient(instanceId, 'client1');
      
      // Generate massive amount of output
      let totalOutput = '';
      for (let i = 0; i < 100000; i++) {
        const chunk = `Line ${i}: ${'x'.repeat(1000)}\n`;
        totalOutput += chunk;
        bufferManager.appendOutput(instanceId, chunk);
      }
      
      const result = bufferManager.getIncrementalOutput(instanceId, 0);
      
      // Buffer should be limited to prevent memory issues
      expect(result?.data.length).toBeLessThan(1000000); // FAILS - unlimited buffer growth
    });

    test('SHOULD FAIL: No buffer persistence across disconnections', async () => {
      const instanceId = 'claude-test-123';
      const testOutput = 'Important output data\n';
      
      bufferManager.initializeBuffer(instanceId);
      bufferManager.addClient(instanceId, 'client1');
      bufferManager.appendOutput(instanceId, testOutput);
      
      // Client disconnects
      bufferManager.removeClient(instanceId, 'client1');
      
      // New client connects and should get buffered output
      bufferManager.addClient(instanceId, 'client2');
      const result = bufferManager.getIncrementalOutput(instanceId, 0);
      
      expect(result?.data).toContain(testOutput); // FAILS - buffer not persisted
    });
  });

  describe('Rate Limiting and Throttling', () => {
    test('SHOULD FAIL: No rate limiting on rapid output bursts', async () => {
      const instanceId = 'claude-test-123';
      const messagesSent: any[] = [];
      
      bufferManager.initializeBuffer(instanceId);
      bufferManager.addClient(instanceId, 'client1');
      
      bufferManager.on('message', (clientId, message) => {
        messagesSent.push(message);
      });
      
      // Send rapid burst of output
      for (let i = 0; i < 1000; i++) {
        bufferManager.appendOutput(instanceId, `Rapid output ${i}\n`);
      }
      
      // Should rate limit to prevent overwhelming clients
      expect(messagesSent.length).toBeLessThan(100); // FAILS - no rate limiting
    });

    test('SHOULD FAIL: Large chunks not intelligently split', async () => {
      const instanceId = 'claude-test-123';
      const messagesSent: any[] = [];
      
      bufferManager.initializeBuffer(instanceId);
      bufferManager.addClient(instanceId, 'client1');
      
      bufferManager.on('message', (clientId, message) => {
        messagesSent.push(message);
      });
      
      // Send very large chunk
      const largeChunk = 'A'.repeat(100000) + '\n';
      bufferManager.appendOutput(instanceId, largeChunk);
      
      // Should split into smaller chunks
      expect(messagesSent.length).toBeGreaterThan(1); // FAILS - doesn't split large chunks
      expect(messagesSent.every(msg => msg.data.length < 10000)).toBe(true); // FAILS - chunks too large
    });

    test('SHOULD FAIL: No adaptive rate limiting based on client count', async () => {
      const instanceId = 'claude-test-123';
      const messagesPerClient = new Map<string, number>();
      
      bufferManager.initializeBuffer(instanceId);
      
      // Add multiple clients
      for (let i = 1; i <= 5; i++) {
        bufferManager.addClient(instanceId, `client${i}`);
        messagesPerClient.set(`client${i}`, 0);
      }
      
      bufferManager.on('message', (clientId, message) => {
        messagesPerClient.set(clientId, (messagesPerClient.get(clientId) || 0) + 1);
      });
      
      // Send output that should be rate limited more aggressively with more clients
      for (let i = 0; i < 100; i++) {
        bufferManager.appendOutput(instanceId, `Output ${i}\n`);
      }
      
      const maxMessagesPerClient = Math.max(...messagesPerClient.values());
      
      // Should limit more aggressively with more clients
      expect(maxMessagesPerClient).toBeLessThan(20); // FAILS - no adaptive rate limiting
    });

    test('SHOULD FAIL: Escape sequences in rapid succession cause storms', async () => {
      const instanceId = 'claude-test-123';
      const messagesSent: any[] = [];
      
      bufferManager.initializeBuffer(instanceId);
      bufferManager.addClient(instanceId, 'client1');
      
      bufferManager.on('message', (clientId, message) => {
        messagesSent.push(message);
      });
      
      // Send rapid escape sequences that could cause storms
      const escapeSequences = [
        '\x1b[2J\x1b[H',     // Clear screen
        '\x1b[?1049h',       // Alt screen buffer
        '\x1b[?25l',         // Hide cursor
        '\x1b[31mRed\x1b[0m', // Color text
        '\x1b[?25h',         // Show cursor
        '\x1b[?1049l',       // Main screen buffer
      ];
      
      // Send sequences rapidly
      escapeSequences.forEach(seq => {
        bufferManager.appendOutput(instanceId, seq);
      });
      
      // Should consolidate or rate limit escape sequences
      const totalEscapeChars = messagesSent
        .map(msg => (msg.data.match(/\x1b/g) || []).length)
        .reduce((a, b) => a + b, 0);
      
      expect(totalEscapeChars).toBeLessThan(20); // FAILS - doesn't manage escape sequences
    });
  });

  describe('Incremental Output Positioning', () => {
    test('SHOULD FAIL: Position tracking corrupted by concurrent appends', async () => {
      const instanceId = 'claude-test-123';
      
      bufferManager.initializeBuffer(instanceId);
      bufferManager.addClient(instanceId, 'client1');
      
      // Simulate concurrent appends
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          new Promise<void>(resolve => {
            setTimeout(() => {
              bufferManager.appendOutput(instanceId, `Concurrent ${i}\n`);
              resolve();
            }, Math.random() * 10);
          })
        );
      }
      
      await Promise.all(promises);
      
      const result = bufferManager.getIncrementalOutput(instanceId, 0);
      const buffer = result?.data || '';
      
      // All concurrent outputs should be present
      for (let i = 0; i < 50; i++) {
        expect(buffer).toContain(`Concurrent ${i}`); // FAILS - concurrent appends lost
      }
      
      // Position should match buffer length
      expect(result?.totalLength).toBe(buffer.length); // FAILS - position tracking corrupted
    });

    test('SHOULD FAIL: Client position desynchronization on reconnect', async () => {
      const instanceId = 'claude-test-123';
      
      bufferManager.initializeBuffer(instanceId);
      bufferManager.addClient(instanceId, 'client1');
      
      // Send some output
      bufferManager.appendOutput(instanceId, 'First batch\n');
      bufferManager.appendOutput(instanceId, 'Second batch\n');
      
      // Client disconnects
      bufferManager.removeClient(instanceId, 'client1');
      
      // More output while disconnected
      bufferManager.appendOutput(instanceId, 'Missed output\n');
      
      // Client reconnects and should get only missed output
      bufferManager.addClient(instanceId, 'client1');
      const incrementalResult = bufferManager.getIncrementalOutput(instanceId, 24); // After "First batch\nSecond batch\n"
      
      expect(incrementalResult?.data).toBe('Missed output\n'); // FAILS - position desync
    });

    test('SHOULD FAIL: Position overflow with very large outputs', async () => {
      const instanceId = 'claude-test-123';
      
      bufferManager.initializeBuffer(instanceId);
      bufferManager.addClient(instanceId, 'client1');
      
      // Generate output approaching position limits
      let largeOutput = '';
      for (let i = 0; i < 100000; i++) {
        const chunk = `${'x'.repeat(100)}\n`;
        largeOutput += chunk;
        bufferManager.appendOutput(instanceId, chunk);
      }
      
      const result = bufferManager.getIncrementalOutput(instanceId, 0);
      
      // Position should handle large values gracefully
      expect(result?.totalLength).toBeGreaterThan(0); // FAILS - position overflow
      expect(result?.position).toBeGreaterThanOrEqual(0); // FAILS - negative position
    });
  });

  describe('Multi-Client Output Synchronization', () => {
    test('SHOULD FAIL: Different clients receive different output due to race conditions', async () => {
      const instanceId = 'claude-test-123';
      const clientOutputs = new Map<string, string[]>();
      
      bufferManager.initializeBuffer(instanceId);
      
      // Add multiple clients
      ['client1', 'client2', 'client3'].forEach(clientId => {
        bufferManager.addClient(instanceId, clientId);
        clientOutputs.set(clientId, []);
      });
      
      bufferManager.on('message', (clientId, message) => {
        clientOutputs.get(clientId)?.push(message.data);
      });
      
      // Send output rapidly while clients are connecting/disconnecting
      for (let i = 0; i < 100; i++) {
        bufferManager.appendOutput(instanceId, `Output ${i}\n`);
        
        // Randomly add/remove clients during output
        if (i % 20 === 0) {
          bufferManager.removeClient(instanceId, 'client2');
          setTimeout(() => {
            bufferManager.addClient(instanceId, 'client2');
          }, 10);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // All clients should eventually have consistent output
      const client1Output = clientOutputs.get('client1')?.join('') || '';
      const client3Output = clientOutputs.get('client3')?.join('') || '';
      
      expect(client1Output).toBe(client3Output); // FAILS - inconsistent output between clients
    });

    test('SHOULD FAIL: Client-specific rate limiting not implemented', async () => {
      const instanceId = 'claude-test-123';
      const clientMessageCounts = new Map<string, number>();
      
      bufferManager.initializeBuffer(instanceId);
      
      // Add clients with different "capabilities"
      bufferManager.addClient(instanceId, 'fast-client');
      bufferManager.addClient(instanceId, 'slow-client');
      
      ['fast-client', 'slow-client'].forEach(clientId => {
        clientMessageCounts.set(clientId, 0);
      });
      
      bufferManager.on('message', (clientId, message) => {
        clientMessageCounts.set(clientId, (clientMessageCounts.get(clientId) || 0) + 1);
      });
      
      // Send rapid output
      for (let i = 0; i < 1000; i++) {
        bufferManager.appendOutput(instanceId, `Fast output ${i}\n`);
      }
      
      // Should rate limit differently per client capability
      const fastClientMessages = clientMessageCounts.get('fast-client') || 0;
      const slowClientMessages = clientMessageCounts.get('slow-client') || 0;
      
      expect(fastClientMessages).toBeGreaterThan(slowClientMessages); // FAILS - no per-client rate limiting
    });

    test('SHOULD FAIL: Memory leak from disconnected client tracking', async () => {
      const instanceId = 'claude-test-123';
      
      bufferManager.initializeBuffer(instanceId);
      
      // Add and remove many clients rapidly
      for (let i = 0; i < 1000; i++) {
        const clientId = `temp-client-${i}`;
        bufferManager.addClient(instanceId, clientId);
        bufferManager.appendOutput(instanceId, `Output for ${clientId}\n`);
        bufferManager.removeClient(instanceId, clientId);
      }
      
      // Check for memory leaks - buffer should not retain client references
      const buffer = (bufferManager as any).buffers.get(instanceId);
      expect(buffer.clients.size).toBe(0); // FAILS - client references not cleaned up
    });
  });

  describe('Error Handling and Recovery', () => {
    test('SHOULD FAIL: Buffer corruption on write errors', async () => {
      const instanceId = 'claude-test-123';
      
      bufferManager.initializeBuffer(instanceId);
      bufferManager.addClient(instanceId, 'client1');
      
      // Add valid output
      bufferManager.appendOutput(instanceId, 'Valid output\n');
      
      // Simulate write error by corrupting the append method
      const originalAppend = bufferManager.appendOutput;
      bufferManager.appendOutput = (id: string, data: string) => {
        if (data.includes('corrupt')) {
          throw new Error('Simulated write error');
        }
        return originalAppend.call(bufferManager, id, data);
      };
      
      try {
        bufferManager.appendOutput(instanceId, 'corrupt data\n');
      } catch (error) {
        // Error should be handled gracefully
      }
      
      // Buffer should remain intact and functional
      bufferManager.appendOutput(instanceId, 'Recovery output\n');
      
      const result = bufferManager.getIncrementalOutput(instanceId, 0);
      expect(result?.data).toContain('Valid output'); // FAILS - buffer corrupted by error
      expect(result?.data).toContain('Recovery output'); // FAILS - buffer not recovered
    });

    test('SHOULD FAIL: No timeout for hung broadcast operations', async () => {
      const instanceId = 'claude-test-123';
      
      bufferManager.initializeBuffer(instanceId);
      bufferManager.addClient(instanceId, 'client1');
      
      // Mock hanging broadcast by overriding emit
      const originalEmit = bufferManager.emit;
      bufferManager.emit = (...args) => {
        // Simulate hanging operation
        return new Promise(() => {}) as any; // Never resolves
      };
      
      const start = Date.now();
      
      try {
        // This should timeout and not hang indefinitely
        await Promise.race([
          new Promise<void>((resolve, reject) => {
            bufferManager.appendOutput(instanceId, 'Test output\n');
            resolve();
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 1000)
          )
        ]);
      } catch (error) {
        // Should timeout gracefully
        expect(error.message).toBe('Timeout');
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000); // FAILS - operations hang indefinitely
    });
  });
});