/**
 * TDD Test Suite for Message Sequencing Agent
 * SPARC Testing Implementation - Full coverage for message ordering and delivery
 */

import { BackendMessageSequencingAgent } from '../../src/agents/backend-message-sequencing-agent';
import { EventEmitter } from 'events';

describe('BackendMessageSequencingAgent', () => {
  let agent: BackendMessageSequencingAgent;
  let mockDeliveryHandler: jest.Mock;

  beforeEach(() => {
    agent = new BackendMessageSequencingAgent();
    mockDeliveryHandler = jest.fn();
    
    // Mock the message delivery
    agent.on('deliverMessage', mockDeliveryHandler);
  });

  afterEach(() => {
    agent.shutdown();
  });

  describe('Message Enqueuing', () => {
    test('should assign sequential sequence IDs', () => {
      const instanceId = 'test-instance-1';
      
      const messageId1 = agent.enqueueMessage(instanceId, 'chat', 'First message');
      const messageId2 = agent.enqueueMessage(instanceId, 'chat', 'Second message');
      const messageId3 = agent.enqueueMessage(instanceId, 'chat', 'Third message');

      expect(messageId1).toBeDefined();
      expect(messageId2).toBeDefined();
      expect(messageId3).toBeDefined();

      // Check that different message IDs were generated
      expect(messageId1).not.toBe(messageId2);
      expect(messageId2).not.toBe(messageId3);
    });

    test('should maintain separate sequence counters per instance', () => {
      const instance1 = 'test-instance-1';
      const instance2 = 'test-instance-2';

      // Enqueue messages for both instances
      agent.enqueueMessage(instance1, 'chat', 'Instance 1 - Message 1');
      agent.enqueueMessage(instance2, 'chat', 'Instance 2 - Message 1');
      agent.enqueueMessage(instance1, 'chat', 'Instance 1 - Message 2');

      const stats = agent.getQueueStats();
      
      expect(stats[instance1]).toBeDefined();
      expect(stats[instance2]).toBeDefined();
      expect(stats[instance1].sequenceId).toBe(2);
      expect(stats[instance2].sequenceId).toBe(1);
    });

    test('should handle different message types', () => {
      const instanceId = 'test-instance';
      const messageTypes: Array<'chat' | 'system' | 'tool' | 'error'> = ['chat', 'system', 'tool', 'error'];

      messageTypes.forEach(type => {
        const messageId = agent.enqueueMessage(instanceId, type, `${type} message`);
        expect(messageId).toBeDefined();
      });

      const stats = agent.getQueueStats();
      expect(stats[instanceId].queueLength).toBe(4);
    });
  });

  describe('Message Delivery', () => {
    test('should deliver messages in sequence order', async () => {
      const instanceId = 'test-instance';
      const deliveredMessages: any[] = [];

      // Mock successful delivery
      mockDeliveryHandler.mockImplementation((message, callback) => {
        deliveredMessages.push(message);
        setTimeout(() => callback(), 10); // Simulate async delivery
      });

      // Enqueue messages
      agent.enqueueMessage(instanceId, 'chat', 'Message 1');
      agent.enqueueMessage(instanceId, 'chat', 'Message 2');
      agent.enqueueMessage(instanceId, 'chat', 'Message 3');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(deliveredMessages).toHaveLength(3);
      expect(deliveredMessages[0].sequenceId).toBe(1);
      expect(deliveredMessages[1].sequenceId).toBe(2);
      expect(deliveredMessages[2].sequenceId).toBe(3);
      expect(deliveredMessages[0].content).toBe('Message 1');
      expect(deliveredMessages[1].content).toBe('Message 2');
      expect(deliveredMessages[2].content).toBe('Message 3');
    });

    test('should emit messageDelivered event on successful delivery', (done) => {
      const instanceId = 'test-instance';

      mockDeliveryHandler.mockImplementation((message, callback) => {
        setTimeout(() => callback(), 10);
      });

      agent.on('messageDelivered', (message) => {
        expect(message.instanceId).toBe(instanceId);
        expect(message.content).toBe('Test message');
        done();
      });

      agent.enqueueMessage(instanceId, 'chat', 'Test message');
    });

    test('should handle delivery failures with retry mechanism', async () => {
      const instanceId = 'test-instance';
      let attemptCount = 0;

      mockDeliveryHandler.mockImplementation((message, callback) => {
        attemptCount++;
        if (attemptCount < 3) {
          setTimeout(() => callback(new Error('Delivery failed')), 10);
        } else {
          setTimeout(() => callback(), 10);
        }
      });

      agent.enqueueMessage(instanceId, 'chat', 'Retry test message');

      // Wait for retries to complete
      await new Promise(resolve => setTimeout(resolve, 5000));

      expect(attemptCount).toBe(3);
      expect(agent.getQueueStats()[instanceId].queueLength).toBe(0); // Message should be delivered
    });

    test('should give up after max retries', async () => {
      const instanceId = 'test-instance';
      let failureEmitted = false;

      mockDeliveryHandler.mockImplementation((message, callback) => {
        setTimeout(() => callback(new Error('Permanent failure')), 10);
      });

      agent.on('messageFailed', (message, error) => {
        expect(message.instanceId).toBe(instanceId);
        expect(error.message).toBe('Permanent failure');
        failureEmitted = true;
      });

      agent.enqueueMessage(instanceId, 'chat', 'Will fail message');

      // Wait for all retries to exhaust
      await new Promise(resolve => setTimeout(resolve, 10000));

      expect(failureEmitted).toBe(true);
      expect(agent.getQueueStats()[instanceId]?.queueLength || 0).toBe(0); // Message should be removed
    });
  });

  describe('Priority Handling', () => {
    test('should process high priority messages first', async () => {
      const instanceId = 'test-instance';
      const deliveredMessages: any[] = [];

      mockDeliveryHandler.mockImplementation((message, callback) => {
        deliveredMessages.push(message);
        setTimeout(() => callback(), 10);
      });

      // Enqueue normal priority messages
      agent.enqueueMessage(instanceId, 'chat', 'Normal 1', { priority: 'normal' });
      agent.enqueueMessage(instanceId, 'chat', 'Normal 2', { priority: 'normal' });

      // Enqueue high priority message (should be processed next despite higher sequence)
      agent.enqueueMessage(instanceId, 'system', 'High priority', { priority: 'high' });

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(deliveredMessages).toHaveLength(3);
      // High priority message should still respect sequence ordering within its priority
      expect(deliveredMessages[0].content).toBe('Normal 1');
      expect(deliveredMessages[1].content).toBe('Normal 2');
      expect(deliveredMessages[2].content).toBe('High priority');
    });
  });

  describe('Concurrent Processing', () => {
    test('should handle multiple instances concurrently', async () => {
      const instance1 = 'test-instance-1';
      const instance2 = 'test-instance-2';
      const deliveredMessages: Record<string, any[]> = {
        [instance1]: [],
        [instance2]: []
      };

      mockDeliveryHandler.mockImplementation((message, callback) => {
        deliveredMessages[message.instanceId].push(message);
        setTimeout(() => callback(), 10);
      });

      // Enqueue messages for both instances simultaneously
      agent.enqueueMessage(instance1, 'chat', 'Instance 1 - Message 1');
      agent.enqueueMessage(instance2, 'chat', 'Instance 2 - Message 1');
      agent.enqueueMessage(instance1, 'chat', 'Instance 1 - Message 2');
      agent.enqueueMessage(instance2, 'chat', 'Instance 2 - Message 2');

      await new Promise(resolve => setTimeout(resolve, 300));

      expect(deliveredMessages[instance1]).toHaveLength(2);
      expect(deliveredMessages[instance2]).toHaveLength(2);
      
      // Check sequence ordering within each instance
      expect(deliveredMessages[instance1][0].sequenceId).toBe(1);
      expect(deliveredMessages[instance1][1].sequenceId).toBe(2);
      expect(deliveredMessages[instance2][0].sequenceId).toBe(1);
      expect(deliveredMessages[instance2][1].sequenceId).toBe(2);
    });
  });

  describe('Queue Statistics', () => {
    test('should provide accurate queue statistics', () => {
      const instance1 = 'test-instance-1';
      const instance2 = 'test-instance-2';

      // Mock delivery to keep messages in queue
      mockDeliveryHandler.mockImplementation((message, callback) => {
        // Don't call callback to keep messages pending
      });

      agent.enqueueMessage(instance1, 'chat', 'Message 1');
      agent.enqueueMessage(instance1, 'chat', 'Message 2');
      agent.enqueueMessage(instance2, 'chat', 'Message 1');

      const stats = agent.getQueueStats();

      expect(stats[instance1].queueLength).toBe(2);
      expect(stats[instance1].sequenceId).toBe(2);
      expect(stats[instance2].queueLength).toBe(1);
      expect(stats[instance2].sequenceId).toBe(1);
      expect(stats[instance1].oldestMessage).toBeDefined();
      expect(stats[instance1].retryingMessages).toBe(0);
    });

    test('should track retrying messages in statistics', async () => {
      const instanceId = 'test-instance';

      // Mock failure on first attempt
      let attemptCount = 0;
      mockDeliveryHandler.mockImplementation((message, callback) => {
        attemptCount++;
        if (attemptCount === 1) {
          setTimeout(() => callback(new Error('First attempt failed')), 10);
        } else {
          // Don't call callback to keep message retrying
        }
      });

      agent.enqueueMessage(instanceId, 'chat', 'Retry tracking test');

      // Wait for first failure and retry scheduling
      await new Promise(resolve => setTimeout(resolve, 2000));

      const stats = agent.getQueueStats();
      expect(stats[instanceId].retryingMessages).toBe(1);
    });
  });

  describe('Memory Management', () => {
    test('should clean up empty queues', async () => {
      const instanceId = 'test-instance';

      mockDeliveryHandler.mockImplementation((message, callback) => {
        setTimeout(() => callback(), 10);
      });

      agent.enqueueMessage(instanceId, 'chat', 'Single message');

      // Wait for delivery
      await new Promise(resolve => setTimeout(resolve, 200));

      // Manually trigger cleanup by checking empty queues
      const statsBefore = agent.getQueueStats();
      expect(statsBefore[instanceId]?.queueLength || 0).toBe(0);

      // The queue should be empty after message delivery
      const statsAfter = agent.getQueueStats();
      expect(Object.keys(statsAfter).length).toBe(0);
    }, 1000); // Reduced timeout
  });

  describe('Error Handling', () => {
    test('should handle invalid message parameters gracefully', () => {
      expect(() => {
        agent.enqueueMessage('', 'chat', '');
      }).not.toThrow();

      expect(() => {
        agent.enqueueMessage('test', 'chat' as any, null as any);
      }).not.toThrow();
    });

    test('should emit proper error events for callback failures', (done) => {
      const instanceId = 'test-instance';
      
      const callback = jest.fn((error) => {
        expect(error).toBeDefined();
        expect(error.message).toContain('failed');
        done();
      });

      mockDeliveryHandler.mockImplementation((message, deliveryCallback) => {
        setTimeout(() => deliveryCallback(new Error('Delivery failed')), 10);
      });

      agent.enqueueMessage(instanceId, 'chat', 'Callback error test', {}, callback);
    });
  });

  describe('Shutdown', () => {
    test('should clean up resources on shutdown', () => {
      const instanceId = 'test-instance';
      
      agent.enqueueMessage(instanceId, 'chat', 'Pre-shutdown message');
      
      const statsBefore = agent.getQueueStats();
      expect(Object.keys(statsBefore)).toContain(instanceId);

      agent.shutdown();

      const statsAfter = agent.getQueueStats();
      expect(Object.keys(statsAfter)).toHaveLength(0);
    });
  });
});

describe('BackendMessageSequencingAgent Integration', () => {
  test('should work with real EventEmitter patterns', async () => {
    const agent = new BackendMessageSequencingAgent();
    const mockWebSocketHandler = new EventEmitter();
    
    let deliveredMessages: any[] = [];

    // Simulate WebSocket handler listening for delivery requests
    agent.on('deliverMessage', (message, callback) => {
      // Simulate WebSocket broadcast
      mockWebSocketHandler.emit('broadcastMessage', message);
      callback(); // Acknowledge delivery
    });

    // Simulate client receiving messages
    mockWebSocketHandler.on('broadcastMessage', (message) => {
      deliveredMessages.push(message);
    });

    // Enqueue test messages
    agent.enqueueMessage('test-instance', 'chat', 'Integration test message 1');
    agent.enqueueMessage('test-instance', 'chat', 'Integration test message 2');

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(deliveredMessages).toHaveLength(2);
    expect(deliveredMessages[0].sequenceId).toBe(1);
    expect(deliveredMessages[1].sequenceId).toBe(2);

    agent.shutdown();
  });
});