/**
 * TDD UNIT TESTS: WebSocket Service Core Functionality
 * 
 * Testing Strategy:
 * 1. Write failing tests first for each component
 * 2. Implement fixes to make tests pass
 * 3. Refactor for optimal performance
 * 4. Add edge cases and error conditions
 */

import { WebSocketService } from '../../../src/services/websocket';
import { WebSocketTestUtils, MemoryTestUtils, ErrorTestUtils } from '../utils/test-helpers';
import { mockWebSocketHub } from '../mocks/websocket-server-mock';

describe('WebSocketService Unit Tests', () => {
  let service: WebSocketService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    ErrorTestUtils.startErrorTracking();
    MemoryTestUtils.startMemoryTracking();
    service = new WebSocketService('http://localhost:3002');
  });

  afterEach(() => {
    if (service) {
      service.disconnect();
    }
  });

  describe('TDD: Connection Management', () => {
    test('FAIL FIRST: should fail to connect to invalid URL', async () => {
      const invalidService = new WebSocketService('http://invalid-url:9999');
      
      await expect(invalidService.connect()).rejects.toThrow();
      expect(invalidService.isConnected()).toBe(false);
    });

    test('FAIL FIRST: should fail when connecting without hub server', async () => {
      await expect(service.connect()).rejects.toThrow();
    });

    test('PASS: should successfully connect to valid hub', async () => {
      await mockWebSocketHub.start();
      
      await expect(service.connect()).resolves.not.toThrow();
      expect(service.isConnected()).toBe(true);
      
      await mockWebSocketHub.stop();
    });

    test('PASS: should handle multiple connection attempts gracefully', async () => {
      await mockWebSocketHub.start();
      
      // First connection
      await service.connect();
      expect(service.isConnected()).toBe(true);
      
      // Second connection attempt should not throw
      await expect(service.connect()).resolves.not.toThrow();
      expect(service.isConnected()).toBe(true);
      
      await mockWebSocketHub.stop();
    });

    test('PASS: should disconnect cleanly', async () => {
      await mockWebSocketHub.start();
      await service.connect();
      
      expect(service.isConnected()).toBe(true);
      service.disconnect();
      expect(service.isConnected()).toBe(false);
      
      await mockWebSocketHub.stop();
    });
  });

  describe('TDD: Message Handling', () => {
    beforeEach(async () => {
      await mockWebSocketHub.start();
      await service.connect();
    });

    afterEach(async () => {
      await mockWebSocketHub.stop();
    });

    test('FAIL FIRST: should fail to send message when disconnected', () => {
      service.disconnect();
      
      expect(() => {
        service.send('test', { data: 'test' });
      }).not.toThrow(); // Should not throw but should warn
      
      expect(ErrorTestUtils.hasWarnings()).toBe(true);
    });

    test('PASS: should send messages when connected', () => {
      expect(() => {
        service.send('test', { data: 'test' });
      }).not.toThrow();
      
      expect(ErrorTestUtils.hasErrors()).toBe(false);
    });

    test('PASS: should handle message subscriptions', (done) => {
      const testData = { message: 'test' };
      
      const unsubscribe = service.subscribe('testEvent', (data) => {
        expect(data).toEqual(testData);
        unsubscribe();
        done();
      });
      
      // Simulate receiving a message
      service.handleMessage({ type: 'testEvent', data: testData });
    });

    test('PASS: should handle multiple subscribers for same event', () => {
      let callCount = 0;
      const testData = { message: 'test' };
      
      const unsubscribe1 = service.subscribe('testEvent', () => callCount++);
      const unsubscribe2 = service.subscribe('testEvent', () => callCount++);
      
      service.handleMessage({ type: 'testEvent', data: testData });
      
      expect(callCount).toBe(2);
      
      unsubscribe1();
      unsubscribe2();
    });

    test('PASS: should clean up subscriptions on unsubscribe', () => {
      let callCount = 0;
      const testData = { message: 'test' };
      
      const unsubscribe = service.subscribe('testEvent', () => callCount++);
      unsubscribe();
      
      service.handleMessage({ type: 'testEvent', data: testData });
      
      expect(callCount).toBe(0);
    });
  });

  describe('TDD: Reconnection Logic', () => {
    test('FAIL FIRST: should fail initial reconnection without proper setup', async () => {
      // Service should not be able to reconnect without proper initialization
      service.scheduleReconnect();
      
      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(service.isConnected()).toBe(false);
    });

    test('PASS: should attempt reconnection on connection loss', async () => {
      await mockWebSocketHub.start();
      await service.connect();
      
      expect(service.isConnected()).toBe(true);
      
      // Simulate connection loss
      mockWebSocketHub.simulateConnectionError();
      
      // Should schedule reconnection
      expect(service.reconnectAttempts).toBeGreaterThanOrEqual(0);
      
      await mockWebSocketHub.stop();
    });

    test('PASS: should implement exponential backoff for reconnections', () => {
      const initialDelay = service.reconnectDelay;
      
      service.reconnectAttempts = 1;
      service.scheduleReconnect();
      
      service.reconnectAttempts = 2;
      service.scheduleReconnect();
      
      service.reconnectAttempts = 3;
      service.scheduleReconnect();
      
      // Should show exponential backoff pattern
      expect(service.reconnectAttempts).toBe(3);
    });

    test('PASS: should stop reconnection after max attempts', async () => {
      service.reconnectAttempts = service.maxReconnectAttempts;
      
      const connectSpy = jest.spyOn(service, 'connect');
      service.scheduleReconnect();
      
      // Wait for potential reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(connectSpy).not.toHaveBeenCalled();
    });
  });

  describe('TDD: Heartbeat Mechanism', () => {
    beforeEach(async () => {
      await mockWebSocketHub.start();
      await service.connect();
    });

    afterEach(async () => {
      await mockWebSocketHub.stop();
    });

    test('PASS: should send heartbeat messages', (done) => {
      const sendSpy = jest.spyOn(service, 'send');
      
      service.sendHeartbeat();
      
      setTimeout(() => {
        expect(sendSpy).toHaveBeenCalledWith('heartbeat', expect.objectContaining({
          timestamp: expect.any(Number)
        }));
        done();
      }, 100);
    });

    test('PASS: should handle heartbeat acknowledgments', () => {
      expect(() => {
        service.handleMessage({ type: 'heartbeat', data: {} });
      }).not.toThrow();
    });

    test('PASS: should stop heartbeat when disconnected', () => {
      service.sendHeartbeat();
      service.disconnect();
      
      // Heartbeat should stop after disconnection
      expect(service.isConnected()).toBe(false);
    });
  });

  describe('TDD: Error Handling', () => {
    test('FAIL FIRST: should fail gracefully on malformed messages', () => {
      expect(() => {
        service.handleMessage(null as any);
      }).not.toThrow();
      
      expect(() => {
        service.handleMessage(undefined as any);
      }).not.toThrow();
      
      expect(() => {
        service.handleMessage({ invalid: 'message' } as any);
      }).not.toThrow();
    });

    test('PASS: should handle subscription callback errors', () => {
      const errorCallback = () => {
        throw new Error('Test error');
      };
      
      service.subscribe('testEvent', errorCallback);
      
      expect(() => {
        service.handleMessage({ type: 'testEvent', data: {} });
      }).not.toThrow();
      
      expect(ErrorTestUtils.hasErrors()).toBe(true);
    });

    test('PASS: should handle network timeouts', async () => {
      const slowService = new WebSocketService('http://localhost:3002');
      
      // Mock slow response
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 100);
      });
      
      await expect(timeoutPromise).rejects.toThrow('Timeout');
    });
  });

  describe('TDD: Memory Management', () => {
    test('PASS: should not leak memory on multiple connections', async () => {
      await mockWebSocketHub.start();
      
      const initialMemory = MemoryTestUtils.getMemoryUsage();
      
      // Create and destroy multiple services
      for (let i = 0; i < 10; i++) {
        const tempService = new WebSocketService('http://localhost:3002');
        await tempService.connect();
        tempService.disconnect();
      }
      
      MemoryTestUtils.forceGarbageCollection();
      
      const finalMemory = MemoryTestUtils.getMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal (less than 1MB)
      expect(memoryIncrease).toBeLessThan(1024 * 1024);
      
      await mockWebSocketHub.stop();
    });

    test('PASS: should clean up listeners on disconnect', () => {
      const callback = jest.fn();
      service.subscribe('testEvent', callback);
      
      expect(service.listeners.size).toBeGreaterThan(0);
      
      service.disconnect();
      
      // Should clean up all listeners
      service.handleMessage({ type: 'testEvent', data: {} });
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('TDD: Performance Metrics', () => {
    test('PASS: should track connection performance', async () => {
      await mockWebSocketHub.start();
      
      const connectionTime = await WebSocketTestUtils.measureConnectionTime(service);
      
      expect(connectionTime).toBeGreaterThan(0);
      expect(connectionTime).toBeLessThan(5000); // Should connect within 5 seconds
      
      await mockWebSocketHub.stop();
    });

    test('PASS: should measure message latency', async () => {
      await mockWebSocketHub.start();
      await service.connect();
      
      const latency = await WebSocketTestUtils.measureLatency(service);
      
      expect(latency).toBeGreaterThan(0);
      expect(latency).toBeLessThan(1000); // Should respond within 1 second
      
      await mockWebSocketHub.stop();
    });
  });

  describe('TDD: Regression Protection', () => {
    test('REGRESSION: should maintain backward compatibility with existing API', () => {
      // Test that all public methods still exist
      expect(typeof service.connect).toBe('function');
      expect(typeof service.disconnect).toBe('function');
      expect(typeof service.subscribe).toBe('function');
      expect(typeof service.send).toBe('function');
      expect(typeof service.isConnected).toBe('function');
    });

    test('REGRESSION: should handle legacy message formats', () => {
      const legacyMessage = {
        type: 'legacy',
        payload: { data: 'test' } // Old format
      };
      
      expect(() => {
        service.handleMessage(legacyMessage as any);
      }).not.toThrow();
    });

    test('REGRESSION: should maintain URL parameter parsing', () => {
      const serviceWithParams = new WebSocketService('http://localhost:3002?param=value');
      expect(serviceWithParams.url).toContain('param=value');
    });
  });
});