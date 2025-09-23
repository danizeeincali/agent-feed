import { io, Socket } from 'socket.io-client';
import { WebSocketService } from '../../../src/services/websocket';

// Test utilities for WebSocket regression testing
export class WebSocketTestUtils {
  static createMockSocket(): Partial<Socket> {
    const mockSocket = {
      connected: false,
      id: `test_${Date.now()}`,
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      onAny: jest.fn(),
      connect: jest.fn(() => {
        mockSocket.connected = true;
        return mockSocket;
      }),
      disconnect: jest.fn(() => {
        mockSocket.connected = false;
        return mockSocket;
      })
    };
    return mockSocket;
  }
  
  static createWebSocketService(url = 'http://localhost:3002'): WebSocketService {
    return new WebSocketService(url);
  }
  
  static async waitForConnection(service: WebSocketService, timeout = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkConnection = () => {
        if (service.isConnected()) {
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          resolve(false);
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  }
  
  static async waitForEvent(emitter: any, eventName: string, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);
      
      emitter.once(eventName, (data: any) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }
  
  static simulateNetworkError(): Promise<void> {
    return new Promise((resolve) => {
      // Simulate network disconnection
      setTimeout(resolve, 100);
    });
  }
  
  static generateTestMessage(type: string, data: any = {}) {
    return {
      type,
      data,
      timestamp: new Date().toISOString(),
      messageId: `test_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }
  
  static async measureConnectionTime(service: WebSocketService): Promise<number> {
    const startTime = Date.now();
    await service.connect();
    return Date.now() - startTime;
  }
  
  static async measureLatency(service: WebSocketService): Promise<number> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const testMessage = WebSocketTestUtils.generateTestMessage('testConnection', {
        clientSent: startTime
      });
      
      service.subscribe('testResponse', (data) => {
        const latency = Date.now() - startTime;
        resolve(latency);
      });
      
      service.send('testConnection', testMessage.data);
    });
  }
  
  static mockNetworkConditions = {
    slow3G: { latency: 400, downloadSpeed: 400, uploadSpeed: 400 },
    fastWifi: { latency: 20, downloadSpeed: 50000, uploadSpeed: 10000 },
    offline: { latency: 0, downloadSpeed: 0, uploadSpeed: 0 }
  };
  
  static validateMessage(message: any, expectedType: string): boolean {
    return (
      message &&
      typeof message === 'object' &&
      message.type === expectedType &&
      message.data &&
      message.timestamp
    );
  }
  
  static async stressTestConnections(count: number, url = 'http://localhost:3002'): Promise<number> {
    const connections: WebSocketService[] = [];
    let successfulConnections = 0;
    
    for (let i = 0; i < count; i++) {
      try {
        const service = new WebSocketService(url);
        await service.connect();
        if (service.isConnected()) {
          successfulConnections++;
          connections.push(service);
        }
      } catch (error) {
        // Connection failed
      }
    }
    
    // Cleanup
    connections.forEach(service => service.disconnect());
    
    return successfulConnections;
  }
  
  static createPerformanceMetrics() {
    return {
      connectionTime: 0,
      messageLatency: 0,
      reconnectionTime: 0,
      memoryUsage: 0,
      errorRate: 0,
      throughput: 0
    };
  }
}

// Memory usage tracking utilities
export class MemoryTestUtils {
  private static initialMemory: number = 0;
  
  static startMemoryTracking(): void {
    if (typeof performance !== 'undefined' && performance.memory) {
      MemoryTestUtils.initialMemory = performance.memory.usedJSHeapSize;
    }
  }
  
  static getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize - MemoryTestUtils.initialMemory;
    }
    return 0;
  }
  
  static forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
    }
  }
}

// Error tracking utilities
export class ErrorTestUtils {
  static consoleErrors: any[] = [];
  static consoleWarns: any[] = [];
  
  static startErrorTracking(): void {
    ErrorTestUtils.consoleErrors = [];
    ErrorTestUtils.consoleWarns = [];
  }
  
  static getConsoleErrors(): any[] {
    return [...ErrorTestUtils.consoleErrors];
  }
  
  static getConsoleWarns(): any[] {
    return [...ErrorTestUtils.consoleWarns];
  }
  
  static hasErrors(): boolean {
    return ErrorTestUtils.consoleErrors.length > 0;
  }
  
  static hasWarnings(): boolean {
    return ErrorTestUtils.consoleWarns.length > 0;
  }
}

// Test data generators
export class TestDataGenerator {
  static generateLargeMessage(sizeInKB: number): any {
    const data = 'a'.repeat(sizeInKB * 1024);
    return {
      type: 'largeMessage',
      data: { payload: data },
      timestamp: new Date().toISOString()
    };
  }
  
  static generateMessageBurst(count: number): any[] {
    return Array.from({ length: count }, (_, i) => ({
      type: 'burstMessage',
      data: { index: i, timestamp: Date.now() },
      messageId: `burst_${i}_${Date.now()}`
    }));
  }
  
  static generateConcurrentClients(count: number): Promise<WebSocketService[]> {
    const services = Array.from({ length: count }, () => new WebSocketService());
    return Promise.all(services.map(service => service.connect().then(() => service)));
  }
}