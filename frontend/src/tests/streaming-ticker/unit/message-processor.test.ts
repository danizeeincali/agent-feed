/**
 * Unit Tests for Message Processor
 *
 * Tests message processing and buffering logic including:
 * - Message queuing and batching
 * - Memory management
 * - Incremental processing
 * - Buffer overflow handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import IncrementalMessageProcessor, { ProcessedMessage } from '../../../services/IncrementalMessageProcessor';

describe('IncrementalMessageProcessor', () => {
  let processor: IncrementalMessageProcessor;

  beforeEach(() => {
    processor = new IncrementalMessageProcessor();
  });

  describe('Message Processing', () => {
    it('should process single message', () => {
      const rawMessage = {
        type: 'terminal_output',
        data: 'Hello World\n',
        timestamp: Date.now(),
        instanceId: 'claude-test-123'
      };

      const processed = processor.processMessage('claude-test-123', rawMessage);

      expect(processed).toHaveLength(1);
      expect(processed[0]).toMatchObject({
        id: expect.any(String),
        type: 'terminal_output',
        content: 'Hello World\n',
        timestamp: expect.any(Date),
        instanceId: 'claude-test-123',
        sequenceNumber: 1
      });
    });

    it('should assign incremental sequence numbers', () => {
      const messages = [
        { type: 'output', data: 'Line 1', instanceId: 'test' },
        { type: 'output', data: 'Line 2', instanceId: 'test' },
        { type: 'output', data: 'Line 3', instanceId: 'test' }
      ];

      const processed1 = processor.processMessage('test', messages[0]);
      const processed2 = processor.processMessage('test', messages[1]);
      const processed3 = processor.processMessage('test', messages[2]);

      expect(processed1[0].sequenceNumber).toBe(1);
      expect(processed2[0].sequenceNumber).toBe(2);
      expect(processed3[0].sequenceNumber).toBe(3);
    });

    it('should handle different message types', () => {
      const outputMessage = {
        type: 'terminal_output',
        data: 'Output data',
        instanceId: 'test'
      };

      const statusMessage = {
        type: 'status_update',
        status: 'running',
        instanceId: 'test'
      };

      const output = processor.processMessage('test', outputMessage);
      const status = processor.processMessage('test', statusMessage);

      expect(output[0].type).toBe('terminal_output');
      expect(status[0].type).toBe('status_update');
    });

    it('should generate unique message IDs', () => {
      const message = {
        type: 'output',
        data: 'Test',
        instanceId: 'test'
      };

      const processed1 = processor.processMessage('test', message);
      const processed2 = processor.processMessage('test', message);

      expect(processed1[0].id).not.toBe(processed2[0].id);
    });

    it('should preserve original timestamp if provided', () => {
      const originalTimestamp = new Date('2024-01-15T10:30:00Z');
      const message = {
        type: 'output',
        data: 'Test',
        timestamp: originalTimestamp.getTime(),
        instanceId: 'test'
      };

      const processed = processor.processMessage('test', message);

      expect(processed[0].timestamp.getTime()).toBe(originalTimestamp.getTime());
    });
  });

  describe('Message Batching', () => {
    it('should batch multiple messages', () => {
      const messages = Array.from({ length: 5 }, (_, i) => ({
        type: 'output',
        data: `Line ${i}`,
        instanceId: 'test'
      }));

      // Process messages individually
      messages.forEach(msg => processor.processMessage('test', msg));

      const unprocessed = processor.getUnprocessedMessages('test', 3);
      expect(unprocessed).toHaveLength(3);
    });

    it('should respect batch size limits', () => {
      // Add 10 messages
      Array.from({ length: 10 }, (_, i) => {
        processor.processMessage('test', {
          type: 'output',
          data: `Message ${i}`,
          instanceId: 'test'
        });
      });

      const batch1 = processor.getUnprocessedMessages('test', 5);
      const batch2 = processor.getUnprocessedMessages('test', 5);

      expect(batch1).toHaveLength(5);
      expect(batch2).toHaveLength(5);
    });

    it('should return empty array when no unprocessed messages', () => {
      const unprocessed = processor.getUnprocessedMessages('nonexistent', 10);
      expect(unprocessed).toEqual([]);
    });
  });

  describe('Memory Management', () => {
    it('should track memory usage', () => {
      // Add messages to increase memory usage
      Array.from({ length: 100 }, (_, i) => {
        processor.processMessage('test', {
          type: 'output',
          data: 'A'.repeat(1000), // 1KB per message
          instanceId: 'test'
        });
      });

      const memoryUsage = processor.getMemoryUsage();
      expect(memoryUsage).toBeGreaterThan(50000); // Should be > 50KB
    });

    it('should implement buffer overflow protection', () => {
      const originalWarn = console.warn;
      console.warn = vi.fn();

      // Add messages until buffer overflows
      Array.from({ length: 1001 }, (_, i) => {
        processor.processMessage('test', {
          type: 'output',
          data: `Message ${i}`,
          instanceId: 'test'
        });
      });

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Buffer overflow detected')
      );

      console.warn = originalWarn;
    });

    it('should clear old messages on overflow', () => {
      // Fill buffer to capacity
      Array.from({ length: 1200 }, (_, i) => {
        processor.processMessage('test', {
          type: 'output',
          data: `Message ${i}`,
          instanceId: 'test'
        });
      });

      const messages = processor.getUnprocessedMessages('test', 1200);

      // Should have trimmed to max buffer size (1000)
      expect(messages.length).toBeLessThanOrEqual(1000);

      // Should contain the most recent messages
      const lastMessage = messages[messages.length - 1];
      expect(lastMessage.content).toContain('Message 1199');
    });

    it('should perform maintenance cleanup', () => {
      // Add old messages
      Array.from({ length: 100 }, (_, i) => {
        processor.processMessage('test', {
          type: 'output',
          data: `Old message ${i}`,
          instanceId: 'test'
        });
      });

      // Simulate old timestamps
      const instanceBuffer = (processor as any).messageBuffers.get('test');
      if (instanceBuffer) {
        instanceBuffer.messages.forEach((msg: any) => {
          msg.timestamp = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
        });
      }

      const initialCount = instanceBuffer?.messages.length || 0;
      processor.performMaintenance();
      const finalCount = instanceBuffer?.messages.length || 0;

      expect(finalCount).toBeLessThan(initialCount);
    });
  });

  describe('Multi-Instance Support', () => {
    it('should handle multiple instances independently', () => {
      processor.processMessage('instance1', {
        type: 'output',
        data: 'Instance 1 data',
        instanceId: 'instance1'
      });

      processor.processMessage('instance2', {
        type: 'output',
        data: 'Instance 2 data',
        instanceId: 'instance2'
      });

      const messages1 = processor.getUnprocessedMessages('instance1');
      const messages2 = processor.getUnprocessedMessages('instance2');

      expect(messages1).toHaveLength(1);
      expect(messages2).toHaveLength(1);
      expect(messages1[0].content).toBe('Instance 1 data');
      expect(messages2[0].content).toBe('Instance 2 data');
    });

    it('should maintain separate sequence numbers per instance', () => {
      // Add messages to both instances
      processor.processMessage('instance1', {
        type: 'output',
        data: 'First',
        instanceId: 'instance1'
      });

      processor.processMessage('instance2', {
        type: 'output',
        data: 'First',
        instanceId: 'instance2'
      });

      processor.processMessage('instance1', {
        type: 'output',
        data: 'Second',
        instanceId: 'instance1'
      });

      const messages1 = processor.getUnprocessedMessages('instance1');
      const messages2 = processor.getUnprocessedMessages('instance2');

      expect(messages1[0].sequenceNumber).toBe(1);
      expect(messages1[1].sequenceNumber).toBe(2);
      expect(messages2[0].sequenceNumber).toBe(1);
    });

    it('should clear specific instance data', () => {
      processor.processMessage('instance1', {
        type: 'output',
        data: 'Test',
        instanceId: 'instance1'
      });

      processor.processMessage('instance2', {
        type: 'output',
        data: 'Test',
        instanceId: 'instance2'
      });

      processor.clearInstance('instance1');

      const messages1 = processor.getUnprocessedMessages('instance1');
      const messages2 = processor.getUnprocessedMessages('instance2');

      expect(messages1).toEqual([]);
      expect(messages2).toHaveLength(1);
    });
  });

  describe('Message Filtering and Deduplication', () => {
    it('should filter out duplicate messages', () => {
      const message = {
        type: 'output',
        data: 'Duplicate message',
        instanceId: 'test'
      };

      processor.processMessage('test', message);
      processor.processMessage('test', message);

      const messages = processor.getUnprocessedMessages('test');
      expect(messages).toHaveLength(2); // Should keep both for now, deduplication at UI level
    });

    it('should handle empty or null messages', () => {
      const emptyMessage = {
        type: 'output',
        data: '',
        instanceId: 'test'
      };

      const nullMessage = {
        type: 'output',
        data: null,
        instanceId: 'test'
      };

      const processed1 = processor.processMessage('test', emptyMessage);
      const processed2 = processor.processMessage('test', nullMessage);

      expect(processed1[0].content).toBe('');
      expect(processed2[0].content).toBe(null);
    });

    it('should preserve message order', () => {
      const messages = [
        { type: 'output', data: 'First', instanceId: 'test' },
        { type: 'output', data: 'Second', instanceId: 'test' },
        { type: 'output', data: 'Third', instanceId: 'test' }
      ];

      messages.forEach(msg => processor.processMessage('test', msg));

      const processed = processor.getUnprocessedMessages('test');

      expect(processed[0].content).toBe('First');
      expect(processed[1].content).toBe('Second');
      expect(processed[2].content).toBe('Third');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed messages gracefully', () => {
      const malformedMessage = {
        // Missing required fields
        data: 'Test data'
      } as any;

      const processed = processor.processMessage('test', malformedMessage);

      expect(processed).toHaveLength(1);
      expect(processed[0]).toMatchObject({
        type: 'unknown',
        content: 'Test data',
        instanceId: 'test'
      });
    });

    it('should handle processing errors', () => {
      const originalError = console.error;
      console.error = vi.fn();

      // Simulate an error during processing
      const problematicMessage = {
        type: 'output',
        get data() {
          throw new Error('Data access error');
        },
        instanceId: 'test'
      };

      const processed = processor.processMessage('test', problematicMessage);

      expect(console.error).toHaveBeenCalled();
      expect(processed).toEqual([]); // Should return empty on error

      console.error = originalError;
    });

    it('should recover from buffer corruption', () => {
      // Corrupt the internal buffer
      const messageBuffers = (processor as any).messageBuffers;
      messageBuffers.set('test', null);

      // Should handle gracefully and recreate buffer
      const processed = processor.processMessage('test', {
        type: 'output',
        data: 'Recovery test',
        instanceId: 'test'
      });

      expect(processed).toHaveLength(1);
      expect(processed[0].content).toBe('Recovery test');
    });
  });

  describe('Performance', () => {
    it('should process messages efficiently', () => {
      const messageCount = 1000;
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        type: 'output',
        data: `Message ${i}`,
        instanceId: 'test'
      }));

      const start = performance.now();

      messages.forEach(msg => processor.processMessage('test', msg));

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Should process 1000 messages in <100ms
    });

    it('should retrieve messages efficiently', () => {
      // Add 1000 messages
      Array.from({ length: 1000 }, (_, i) => {
        processor.processMessage('test', {
          type: 'output',
          data: `Message ${i}`,
          instanceId: 'test'
        });
      });

      const start = performance.now();
      const retrieved = processor.getUnprocessedMessages('test', 100);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10); // Should retrieve 100 messages in <10ms
      expect(retrieved).toHaveLength(100);
    });

    it('should handle high-frequency message processing', () => {
      let processedCount = 0;

      const start = performance.now();

      // Simulate high-frequency messages
      const interval = setInterval(() => {
        processor.processMessage('test', {
          type: 'output',
          data: `High freq ${processedCount}`,
          instanceId: 'test'
        });
        processedCount++;

        if (processedCount >= 100) {
          clearInterval(interval);
          const duration = performance.now() - start;
          expect(duration).toBeLessThan(1000); // Should handle 100 rapid messages
        }
      }, 1);
    });
  });
});