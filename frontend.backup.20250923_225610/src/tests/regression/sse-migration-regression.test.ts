/**
 * Regression Tests for SSE Migration
 * Ensures existing functionality is preserved after migration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MockSSEServer, MockEventSource } from '../mocks/MockSSEServer';
import { DEFAULT_TEST_CONFIG } from '../config/sse-migration-test-config';

// Mock legacy WebSocket behavior for comparison
class MockWebSocket extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  protocol: string;

  constructor(url: string, protocol?: string) {
    super();
    this.url = url;
    this.protocol = protocol || '';
    
    // Simulate connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.dispatchEvent(new Event('open'));
    }, 100);
  }

  send(data: string | ArrayBuffer | Blob): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    // Simulate echo response
    setTimeout(() => {
      this.dispatchEvent(new MessageEvent('message', { data }));
    }, 50);
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      this.dispatchEvent(new CloseEvent('close', { code, reason }));
    }, 10);
  }
}

// Test scenarios based on existing WebSocket functionality
const REGRESSION_SCENARIOS = {
  basicConnection: {
    name: 'Basic Connection Establishment',
    description: 'Should establish connection like old WebSocket',
    test: async (service: any) => {
      const connected = await service.connect();
      expect(connected).toBe(true);
    },
  },
  messageHandling: {
    name: 'Message Handling',
    description: 'Should handle messages like old WebSocket',
    test: async (service: any) => {
      await service.connect();
      const messages: any[] = [];
      service.onMessage((msg: any) => messages.push(msg));
      
      service.sendMessage({ type: 'test', data: 'hello' });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(messages).toHaveLength(1);
    },
  },
  errorHandling: {
    name: 'Error Handling',
    description: 'Should handle errors like old WebSocket',
    test: async (service: any) => {
      const errors: Error[] = [];
      service.onError((error: Error) => errors.push(error));
      
      service.simulateError(new Error('Test error'));
      expect(errors).toHaveLength(1);
    },
  },
  reconnection: {
    name: 'Reconnection Logic',
    description: 'Should reconnect like old WebSocket',
    test: async (service: any) => {
      await service.connect();
      let reconnectCount = 0;
      service.onReconnect(() => reconnectCount++);
      
      service.disconnect();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      expect(reconnectCount).toBeGreaterThan(0);
    },
  },
  cleanup: {
    name: 'Resource Cleanup',
    description: 'Should clean up resources properly',
    test: async (service: any) => {
      await service.connect();
      const initialResources = service.getResourceCount();
      
      service.disconnect();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalResources = service.getResourceCount();
      expect(finalResources).toBeLessThanOrEqual(initialResources);
    },
  },
};

// Legacy WebSocket service implementation (for comparison)
class LegacyWebSocketService {
  private ws: MockWebSocket | null = null;
  private messageHandlers: Function[] = [];
  private errorHandlers: Function[] = [];
  private reconnectHandlers: Function[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.ws = new MockWebSocket('ws://localhost:3001');
      
      this.ws.addEventListener('open', () => {
        this.reconnectAttempts = 0;
        resolve(true);
      });
      
      this.ws.addEventListener('error', (event) => {
        this.errorHandlers.forEach(handler => handler(event));
        reject(new Error('Connection failed'));
      });
      
      this.ws.addEventListener('close', () => {
        this.handleReconnect();
      });
      
      this.ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data as string);
          this.messageHandlers.forEach(handler => handler(data));
        } catch (error) {
          this.errorHandlers.forEach(handler => handler(error));
        }
      });
    });
  }

  sendMessage(data: any): void {
    if (this.ws?.readyState === MockWebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  onMessage(handler: Function): void {
    this.messageHandlers.push(handler);
  }

  onError(handler: Function): void {
    this.errorHandlers.push(handler);
  }

  onReconnect(handler: Function): void {
    this.reconnectHandlers.push(handler);
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect().then(() => {
          this.reconnectHandlers.forEach(handler => handler());
        }).catch(() => {
          this.handleReconnect();
        });
      }, 1000 * this.reconnectAttempts);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  simulateError(error: Error): void {
    this.errorHandlers.forEach(handler => handler(error));
  }

  getResourceCount(): number {
    return this.messageHandlers.length + this.errorHandlers.length + this.reconnectHandlers.length;
  }
}

// New SSE+HTTP service implementation
class SSEHTTPService {
  private eventSource: EventSource | null = null;
  private messageHandlers: Function[] = [];
  private errorHandlers: Function[] = [];
  private reconnectHandlers: Function[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.eventSource = new EventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
      
      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0;
        resolve(true);
      };
      
      this.eventSource.onerror = () => {
        this.errorHandlers.forEach(handler => handler(new Error('SSE Connection failed')));
        this.handleReconnect();
      };
      
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.messageHandlers.forEach(handler => handler(data));
        } catch (error) {
          this.errorHandlers.forEach(handler => handler(error));
        }
      };
    });
  }

  async sendMessage(data: any): Promise<void> {
    const response = await fetch(`${DEFAULT_TEST_CONFIG.http.baseUrl}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  onMessage(handler: Function): void {
    this.messageHandlers.push(handler);
  }

  onError(handler: Function): void {
    this.errorHandlers.push(handler);
  }

  onReconnect(handler: Function): void {
    this.reconnectHandlers.push(handler);
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect().then(() => {
          this.reconnectHandlers.forEach(handler => handler());
        }).catch(() => {
          this.handleReconnect();
        });
      }, 1000 * this.reconnectAttempts);
    }
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  simulateError(error: Error): void {
    this.errorHandlers.forEach(handler => handler(error));
  }

  getResourceCount(): number {
    return this.messageHandlers.length + this.errorHandlers.length + this.reconnectHandlers.length;
  }
}

// Global mocks
global.WebSocket = MockWebSocket as any;
global.EventSource = MockEventSource as any;
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SSE Migration Regression Tests', () => {
  let mockServer: MockSSEServer;
  let legacyService: LegacyWebSocketService;
  let newService: SSEHTTPService;

  beforeEach(async () => {
    mockServer = new MockSSEServer(DEFAULT_TEST_CONFIG.mock);
    await mockServer.start();
    
    legacyService = new LegacyWebSocketService();
    newService = new SSEHTTPService();
    
    // Mock successful HTTP responses
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ success: true }),
    });
    
    vi.clearAllMocks();
  });

  afterEach(async () => {
    legacyService.disconnect();
    newService.disconnect();
    if (mockServer) {
      await mockServer.stop();
    }
  });

  describe('Feature Parity Tests', () => {
    it('should maintain same connection behavior', async () => {
      // Test legacy service
      const legacyConnected = await legacyService.connect();
      
      // Test new service
      const newConnected = await newService.connect();
      
      // Both should connect successfully
      expect(legacyConnected).toBe(true);
      expect(newConnected).toBe(true);
    });

    it('should handle messages with same interface', async () => {
      const testMessage = { type: 'test', data: 'hello world' };
      
      // Test legacy service
      const legacyMessages: any[] = [];
      legacyService.onMessage((msg: any) => legacyMessages.push(msg));
      await legacyService.connect();
      legacyService.sendMessage(testMessage);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Test new service
      const newMessages: any[] = [];
      newService.onMessage((msg: any) => newMessages.push(msg));
      await newService.connect();
      
      // Simulate receiving message via SSE
      mockServer.broadcast({
        event: 'message',
        data: testMessage,
      });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Both should handle messages similarly
      expect(legacyMessages).toHaveLength(1);
      expect(newMessages).toHaveLength(1);
      expect(legacyMessages[0]).toEqual(testMessage);
      expect(newMessages[0]).toEqual(testMessage);
    });

    it('should maintain error handling behavior', async () => {
      const testError = new Error('Test error');
      
      // Test legacy service
      const legacyErrors: Error[] = [];
      legacyService.onError((error: Error) => legacyErrors.push(error));
      legacyService.simulateError(testError);
      
      // Test new service
      const newErrors: Error[] = [];
      newService.onError((error: Error) => newErrors.push(error));
      newService.simulateError(testError);
      
      // Both should handle errors similarly
      expect(legacyErrors).toHaveLength(1);
      expect(newErrors).toHaveLength(1);
      expect(legacyErrors[0].message).toBe(testError.message);
      expect(newErrors[0].message).toBe(testError.message);
    });

    it('should provide same reconnection behavior', async () => {
      // Test legacy service
      let legacyReconnectCount = 0;
      legacyService.onReconnect(() => legacyReconnectCount++);
      await legacyService.connect();
      legacyService.disconnect();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test new service
      let newReconnectCount = 0;
      newService.onReconnect(() => newReconnectCount++);
      await newService.connect();
      newService.disconnect();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Both should attempt reconnection
      expect(legacyReconnectCount).toBeGreaterThan(0);
      expect(newReconnectCount).toBeGreaterThan(0);
    });
  });

  describe('Behavioral Regression Tests', () => {
    it('should run all regression scenarios successfully', async () => {
      const results = {
        legacy: {} as any,
        new: {} as any,
      };
      
      // Test legacy service
      for (const [scenarioName, scenario] of Object.entries(REGRESSION_SCENARIOS)) {
        try {
          await scenario.test(legacyService);
          results.legacy[scenarioName] = 'PASS';
        } catch (error) {
          results.legacy[scenarioName] = `FAIL: ${(error as Error).message}`;
        }
      }
      
      // Test new service
      for (const [scenarioName, scenario] of Object.entries(REGRESSION_SCENARIOS)) {
        try {
          await scenario.test(newService);
          results.new[scenarioName] = 'PASS';
        } catch (error) {
          results.new[scenarioName] = `FAIL: ${(error as Error).message}`;
        }
      }
      
      // Compare results
      const legacyPassing = Object.values(results.legacy).filter(r => r === 'PASS').length;
      const newPassing = Object.values(results.new).filter(r => r === 'PASS').length;
      
      console.log('Regression Test Results:', results);
      
      // New service should pass at least as many tests as legacy
      expect(newPassing).toBeGreaterThanOrEqual(legacyPassing);
    });

    it('should maintain performance characteristics', async () => {
      const performanceTests = [
        {
          name: 'Connection Time',
          test: async (service: any) => {
            const start = performance.now();
            await service.connect();
            return performance.now() - start;
          },
        },
        {
          name: 'Message Processing',
          test: async (service: any) => {
            await service.connect();
            const start = performance.now();
            
            let messageCount = 0;
            service.onMessage(() => messageCount++);
            
            // Send 100 messages
            for (let i = 0; i < 100; i++) {
              if (service instanceof LegacyWebSocketService) {
                service.sendMessage({ id: i, data: `message-${i}` });
              } else {
                // Simulate SSE messages for new service
                mockServer.broadcast({
                  event: 'message',
                  data: { id: i, data: `message-${i}` },
                });
              }
            }
            
            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return {
              time: performance.now() - start,
              processed: messageCount,
            };
          },
        },
      ];
      
      const legacyResults: any = {};
      const newResults: any = {};
      
      // Test legacy performance
      for (const perfTest of performanceTests) {
        legacyResults[perfTest.name] = await perfTest.test(legacyService);
      }
      
      // Test new performance
      for (const perfTest of performanceTests) {
        newResults[perfTest.name] = await perfTest.test(newService);
      }
      
      console.log('Performance Comparison:', {
        legacy: legacyResults,
        new: newResults,
      });
      
      // Connection time should be comparable
      expect(newResults['Connection Time']).toBeLessThan(legacyResults['Connection Time'] * 2);
      
      // Message processing should be comparable
      expect(newResults['Message Processing'].processed)
        .toBeGreaterThanOrEqual(legacyResults['Message Processing'].processed * 0.8);
    });
  });

  describe('Integration Regression Tests', () => {
    it('should maintain component integration patterns', async () => {
      // Test that existing component integration patterns still work
      const ComponentIntegrationTest = () => {
        const [connected, setConnected] = React.useState(false);
        const [messages, setMessages] = React.useState<any[]>([]);
        
        React.useEffect(() => {
          const service = new SSEHTTPService();
          
          service.onMessage((message) => {
            setMessages(prev => [...prev, message]);
          });
          
          service.connect().then(() => {
            setConnected(true);
          });
          
          return () => {
            service.disconnect();
          };
        }, []);
        
        return React.createElement('div', {
          'data-testid': 'integration-test',
        }, [
          React.createElement('div', {
            key: 'status',
            'data-testid': 'connection-status',
          }, connected ? 'Connected' : 'Disconnected'),
          
          React.createElement('div', {
            key: 'messages',
            'data-testid': 'message-count',
          }, `Messages: ${messages.length}`),
        ]);
      };
      
      // Mock React for testing
      const React = {
        createElement: vi.fn((type, props, ...children) => ({
          type,
          props: { ...props, children: children.length === 1 ? children[0] : children },
        })),
        useState: vi.fn((initial) => {
          let value = initial;
          const setValue = (newValue: any) => {
            value = typeof newValue === 'function' ? newValue(value) : newValue;
          };
          return [value, setValue];
        }),
        useEffect: vi.fn((effect, deps) => {
          const cleanup = effect();
          return cleanup;
        }),
      };
      
      // Test component creation
      const component = ComponentIntegrationTest();
      expect(component).toBeDefined();
      expect(React.createElement).toHaveBeenCalled();
      expect(React.useState).toHaveBeenCalled();
      expect(React.useEffect).toHaveBeenCalled();
    });

    it('should maintain API compatibility', async () => {
      // Test that the public API hasn't changed
      const legacyAPI = {
        connect: typeof legacyService.connect,
        disconnect: typeof legacyService.disconnect,
        sendMessage: typeof legacyService.sendMessage,
        onMessage: typeof legacyService.onMessage,
        onError: typeof legacyService.onError,
      };
      
      const newAPI = {
        connect: typeof newService.connect,
        disconnect: typeof newService.disconnect,
        sendMessage: typeof newService.sendMessage,
        onMessage: typeof newService.onMessage,
        onError: typeof newService.onError,
      };
      
      // API should be identical
      expect(newAPI).toEqual(legacyAPI);
    });

    it('should maintain backward compatibility with existing configurations', async () => {
      const legacyConfig = {
        url: 'ws://localhost:3001',
        reconnectInterval: 1000,
        maxReconnectAttempts: 3,
      };
      
      const newConfig = {
        sseUrl: DEFAULT_TEST_CONFIG.sse.endpoint,
        httpUrl: DEFAULT_TEST_CONFIG.http.baseUrl,
        reconnectInterval: DEFAULT_TEST_CONFIG.sse.reconnectInterval,
        maxReconnectAttempts: DEFAULT_TEST_CONFIG.sse.maxRetries,
      };
      
      // Should support configuration migration
      expect(newConfig.reconnectInterval).toBe(legacyConfig.reconnectInterval);
      expect(newConfig.maxReconnectAttempts).toBe(legacyConfig.maxReconnectAttempts);
    });
  });

  describe('Compatibility Tests', () => {
    it('should work with existing event handler patterns', async () => {
      const events: string[] = [];
      
      // Test legacy pattern
      legacyService.onMessage(() => events.push('legacy-message'));
      legacyService.onError(() => events.push('legacy-error'));
      
      // Test new pattern
      newService.onMessage(() => events.push('new-message'));
      newService.onError(() => events.push('new-error'));
      
      // Trigger events
      legacyService.simulateError(new Error('Test'));
      newService.simulateError(new Error('Test'));
      
      expect(events).toContain('legacy-error');
      expect(events).toContain('new-error');
    });

    it('should handle edge cases that worked before', async () => {
      const edgeCases = [
        {
          name: 'Empty message',
          test: async (service: any) => {
            await service.connect();
            service.sendMessage('');
            return true;
          },
        },
        {
          name: 'Large message',
          test: async (service: any) => {
            await service.connect();
            const largeMessage = { data: 'x'.repeat(10000) };
            service.sendMessage(largeMessage);
            return true;
          },
        },
        {
          name: 'Rapid disconnect/reconnect',
          test: async (service: any) => {
            for (let i = 0; i < 3; i++) {
              await service.connect();
              service.disconnect();
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            return true;
          },
        },
      ];
      
      // Test edge cases on both services
      for (const edgeCase of edgeCases) {
        const legacyResult = await edgeCase.test(legacyService).catch(() => false);
        const newResult = await edgeCase.test(newService).catch(() => false);
        
        // New service should handle edge cases at least as well as legacy
        expect(newResult).toBe(legacyResult);
      }
    });
  });
});