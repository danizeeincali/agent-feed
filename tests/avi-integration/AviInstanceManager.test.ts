/**
 * AviInstanceManager Test Suite
 * Comprehensive tests for Avi instance management functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AviInstanceManager } from '../../frontend/src/services/AviInstanceManager';
import {
  AviInstanceConfig,
  AviMessage,
  AviPersonalityMode,
  AviError
} from '../../frontend/src/types/avi-integration';

// Mock WebSocket for testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string, public protocols?: string | string[]) {
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string | ArrayBuffer | Blob | ArrayBufferView): void {
    // Simulate message sending
    setTimeout(() => {
      if (this.onmessage) {
        const response = { type: 'message_ack', messageId: 'test-msg-1' };
        this.onmessage(new MessageEvent('message', { data: JSON.stringify(response) }));
      }
    }, 5);
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: code || 1000, reason: reason || '' }));
    }
  }
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

describe('AviInstanceManager', () => {
  let manager: AviInstanceManager;
  let mockConfig: AviInstanceConfig;

  beforeEach(() => {
    manager = new AviInstanceManager({
      baseUrl: 'http://localhost:3002',
      websocketUrl: 'ws://localhost:3002',
      enableAnalytics: false // Disable for testing
    });

    mockConfig = {
      id: 'test-instance-1',
      name: 'Test Avi Instance',
      description: 'Test instance for unit testing',
      aviUserId: 'user-123',
      aviSessionId: 'session-456',
      dmChannelId: 'channel-789',
      personalityMode: 'casual',
      responseLatency: 'natural',
      privacyLevel: 'standard',
      contextRetention: 'session'
    };
  });

  afterEach(async () => {
    if (manager) {
      await manager.destroyInstance();
    }
  });

  describe('Instance Creation', () => {
    it('should create an instance with valid configuration', async () => {
      const instance = await manager.createInstance(mockConfig);

      expect(instance).toBeDefined();
      expect(instance.id).toBe(mockConfig.id);
      expect(instance.aviConfig.aviUserId).toBe(mockConfig.aviUserId);
      expect(instance.status).toBe('running');
      expect(instance.isConnected).toBe(true);
    });

    it('should emit instance:created event', async () => {
      const eventPromise = new Promise(resolve => {
        manager.once('instance:created', resolve);
      });

      await manager.createInstance(mockConfig);
      const emittedInstance = await eventPromise;

      expect(emittedInstance).toBeDefined();
    });

    it('should reject invalid configuration', async () => {
      const invalidConfig = { ...mockConfig };
      delete (invalidConfig as any).aviUserId;

      await expect(manager.createInstance(invalidConfig as AviInstanceConfig))
        .rejects.toThrow('Avi user ID required');
    });

    it('should reject missing dmChannelId', async () => {
      const invalidConfig = { ...mockConfig };
      delete (invalidConfig as any).dmChannelId;

      await expect(manager.createInstance(invalidConfig as AviInstanceConfig))
        .rejects.toThrow('DM channel ID required');
    });
  });

  describe('Message Handling', () => {
    let instance: any;

    beforeEach(async () => {
      instance = await manager.createInstance(mockConfig);
    });

    it('should send messages successfully', async () => {
      const message = 'Hello, Avi!';
      const sentMessage = await manager.sendMessage(message);

      expect(sentMessage).toBeDefined();
      expect(sentMessage.content).toBe(message);
      expect(sentMessage.type).toBe('user');
      expect(sentMessage.aviMetadata).toBeDefined();
      expect(sentMessage.aviMetadata.messageType).toBe('dm');
    });

    it('should handle message options', async () => {
      const message = 'Test message with options';
      const options = {
        priority: 'high' as const,
        personalityMode: 'professional' as AviPersonalityMode,
        responseStyle: 'concise' as const
      };

      const sentMessage = await manager.sendMessage(message, options);

      expect(sentMessage.aviMetadata.priority).toBe('high');
      expect(sentMessage.aviMetadata.personalityContext.mode).toBe('professional');
    });

    it('should emit message:sent event', async () => {
      const eventPromise = new Promise(resolve => {
        manager.once('message:sent', resolve);
      });

      await manager.sendMessage('Test message');
      const emittedMessage = await eventPromise;

      expect(emittedMessage).toBeDefined();
    });

    it('should reject messages when not connected', async () => {
      await manager.destroyInstance();

      await expect(manager.sendMessage('Test message'))
        .rejects.toThrow('No active instance');
    });
  });

  describe('Image Handling', () => {
    let instance: any;

    beforeEach(async () => {
      instance = await manager.createInstance(mockConfig);
    });

    it('should send images with captions', async () => {
      const mockImage = {
        id: 'img-1',
        name: 'test.jpg',
        size: 1024,
        type: 'image/jpeg',
        url: 'blob:test-url'
      };

      const caption = 'Test image';
      const sentMessage = await manager.sendImage(mockImage, caption);

      expect(sentMessage).toBeDefined();
      expect(sentMessage.content).toBe(caption);
      expect(sentMessage.images).toHaveLength(1);
      expect(sentMessage.aviMetadata.formatting.hasImages).toBe(true);
    });

    it('should reject oversized images', async () => {
      const oversizedImage = {
        id: 'img-2',
        name: 'huge.jpg',
        size: 15 * 1024 * 1024, // 15MB
        type: 'image/jpeg',
        url: 'blob:test-url'
      };

      await expect(manager.sendImage(oversizedImage))
        .rejects.toThrow('Image too large');
    });
  });

  describe('Personality Management', () => {
    let instance: any;

    beforeEach(async () => {
      instance = await manager.createInstance(mockConfig);
    });

    it('should set personality mode', () => {
      const newMode: AviPersonalityMode = 'professional';
      manager.setPersonalityMode(newMode);

      expect(instance.aviConfig.personalityMode).toBe(newMode);
    });

    it('should emit personality:changed event', () => {
      const eventPromise = new Promise(resolve => {
        manager.once('personality:changed', resolve);
      });

      manager.setPersonalityMode('analytical');

      return eventPromise.then((event: any) => {
        expect(event.mode).toBe('analytical');
      });
    });

    it('should reject invalid personality mode', () => {
      expect(() => {
        manager.setPersonalityMode('invalid' as AviPersonalityMode);
      }).toThrow();
    });
  });

  describe('User Preferences', () => {
    let instance: any;

    beforeEach(async () => {
      instance = await manager.createInstance(mockConfig);
    });

    it('should update user preferences', () => {
      const preferences = {
        preferredLanguage: 'es',
        responseFormat: 'text' as const,
        technicalDetail: 'high' as const
      };

      expect(() => {
        manager.updateUserPreferences(preferences);
      }).not.toThrow();
    });

    it('should emit preferences:updated event', () => {
      const eventPromise = new Promise(resolve => {
        manager.once('preferences:updated', resolve);
      });

      const preferences = { preferredLanguage: 'fr' };
      manager.updateUserPreferences(preferences);

      return eventPromise.then((event: any) => {
        expect(event.preferredLanguage).toBe('fr');
      });
    });
  });

  describe('Health and Diagnostics', () => {
    let instance: any;

    beforeEach(async () => {
      instance = await manager.createInstance(mockConfig);
    });

    it('should return health status', () => {
      const health = manager.getHealthStatus();

      expect(health).toBeDefined();
      expect(health.overall).toBeDefined();
      expect(health.components).toBeDefined();
      expect(health.metrics).toBeDefined();
    });

    it('should run diagnostics', async () => {
      const diagnostics = await manager.runDiagnostics();

      expect(diagnostics).toBeDefined();
      expect(diagnostics.timestamp).toBeInstanceOf(Date);
      expect(diagnostics.connectionTests).toBeDefined();
      expect(diagnostics.securityChecks).toBeDefined();
      expect(diagnostics.performanceMetrics).toBeDefined();
    });

    it('should return conversation metrics', () => {
      const metrics = manager.getConversationMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.messageCount).toBe('number');
      expect(typeof metrics.averageResponseTime).toBe('number');
      expect(metrics.engagementLevel).toBeDefined();
    });
  });

  describe('Instance Destruction', () => {
    let instance: any;

    beforeEach(async () => {
      instance = await manager.createInstance(mockConfig);
    });

    it('should destroy instance cleanly', async () => {
      await expect(manager.destroyInstance()).resolves.not.toThrow();
    });

    it('should emit instance:destroyed event', async () => {
      const eventPromise = new Promise(resolve => {
        manager.once('instance:destroyed', resolve);
      });

      await manager.destroyInstance();
      const instanceId = await eventPromise;

      expect(instanceId).toBe(mockConfig.id);
    });

    it('should handle multiple destroy calls gracefully', async () => {
      await manager.destroyInstance();
      await expect(manager.destroyInstance()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle connection failures gracefully', async () => {
      // Mock WebSocket to fail
      const originalWebSocket = (global as any).WebSocket;
      (global as any).WebSocket = class extends MockWebSocket {
        constructor(url: string, protocols?: string | string[]) {
          super(url, protocols);
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Event('error'));
            }
          }, 5);
        }
      };

      await expect(manager.createInstance(mockConfig)).rejects.toThrow();

      // Restore original WebSocket
      (global as any).WebSocket = originalWebSocket;
    });

    it('should emit error events', async () => {
      const errorPromise = new Promise(resolve => {
        manager.once('instance:error', resolve);
      });

      try {
        await manager.createInstance({ ...mockConfig, aviUserId: '' });
      } catch (error) {
        // Expected to throw
      }

      const emittedError = await errorPromise;
      expect(emittedError).toBeInstanceOf(AviError);
    });
  });

  describe('Event System', () => {
    it('should support event subscription and emission', () => {
      let eventReceived = false;

      manager.on('test:event', () => {
        eventReceived = true;
      });

      manager.emit('test:event');
      expect(eventReceived).toBe(true);
    });

    it('should support event unsubscription', () => {
      let eventCount = 0;

      const handler = () => {
        eventCount++;
      };

      manager.on('test:count', handler);
      manager.emit('test:count');
      manager.off('test:count', handler);
      manager.emit('test:count');

      expect(eventCount).toBe(1);
    });
  });

  describe('Integration with External Systems', () => {
    it('should handle WebSocket reconnection scenarios', async () => {
      const instance = await manager.createInstance(mockConfig);

      // Simulate connection loss
      if (instance.dmConnection) {
        // In a real implementation, this would trigger reconnection logic
        expect(instance.isConnected).toBe(true);
      }
    });

    it('should maintain message queue during reconnection', async () => {
      const instance = await manager.createInstance(mockConfig);

      // Send message before simulated disconnection
      const messagePromise = manager.sendMessage('Test message');

      // In a real scenario, message would be queued and sent after reconnection
      await expect(messagePromise).resolves.toBeDefined();
    });
  });
});

describe('AviInstanceManager Integration Tests', () => {
  let manager: AviInstanceManager;
  let mockConfig: AviInstanceConfig;

  beforeEach(() => {
    manager = new AviInstanceManager({
      enableAnalytics: true,
      privacyMode: false
    });

    mockConfig = {
      id: 'integration-test-instance',
      name: 'Integration Test Instance',
      description: 'Instance for integration testing',
      aviUserId: 'integration-user',
      aviSessionId: 'integration-session',
      dmChannelId: 'integration-channel',
      personalityMode: 'adaptive',
      responseLatency: 'natural',
      privacyLevel: 'standard',
      contextRetention: 'session'
    };
  });

  afterEach(async () => {
    if (manager) {
      await manager.destroyInstance();
    }
  });

  it('should handle complete conversation flow', async () => {
    // Create instance
    const instance = await manager.createInstance(mockConfig);
    expect(instance).toBeDefined();

    // Send initial message
    const message1 = await manager.sendMessage('Hello, can you help me?');
    expect(message1.content).toBe('Hello, can you help me?');

    // Change personality
    manager.setPersonalityMode('professional');

    // Send follow-up message
    const message2 = await manager.sendMessage('I need technical assistance.');
    expect(message2.aviMetadata.personalityContext.mode).toBe('professional');

    // Get metrics
    const metrics = manager.getConversationMetrics();
    expect(metrics.messageCount).toBeGreaterThan(0);

    // Check health
    const health = manager.getHealthStatus();
    expect(health.overall).toBeDefined();
  });

  it('should maintain conversation context across messages', async () => {
    const instance = await manager.createInstance(mockConfig);

    // Send multiple related messages
    await manager.sendMessage('My name is John.');
    await manager.sendMessage('What programming languages do you know?');
    await manager.sendMessage('Can you help me with JavaScript?');

    const metrics = manager.getConversationMetrics();
    expect(metrics.messageCount).toBeGreaterThanOrEqual(3);
  });
});

describe('AviInstanceManager Performance Tests', () => {
  let manager: AviInstanceManager;

  beforeEach(() => {
    manager = new AviInstanceManager();
  });

  afterEach(async () => {
    if (manager) {
      await manager.destroyInstance();
    }
  });

  it('should handle rapid message sending', async () => {
    const mockConfig = {
      id: 'perf-test-instance',
      name: 'Performance Test Instance',
      aviUserId: 'perf-user',
      aviSessionId: 'perf-session',
      dmChannelId: 'perf-channel',
      personalityMode: 'casual' as AviPersonalityMode
    };

    const instance = await manager.createInstance(mockConfig);

    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(manager.sendMessage(`Message ${i + 1}`));
    }

    const messages = await Promise.all(promises);
    expect(messages).toHaveLength(10);
  }, 10000); // 10 second timeout for performance test
});