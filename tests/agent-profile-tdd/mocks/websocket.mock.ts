/**
 * WebSocket Mock for London School TDD
 * Provides controlled WebSocket behavior for testing real-time features
 */

import { swarmCoordinator } from '../helpers/swarm-coordinator';

interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: number;
}

interface SubscriptionHandler {
  event: string;
  callback: (data: any) => void;
  id: string;
}

class MockWebSocket {
  private subscriptions = new Map<string, SubscriptionHandler[]>();
  private connectionState: 'connecting' | 'open' | 'closed' | 'error' = 'closed';
  private messageQueue: WebSocketMessage[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private mockLatency = 0;

  // Mock control methods
  setConnectionState(state: 'connecting' | 'open' | 'closed' | 'error') {
    this.connectionState = state;
    this.emitConnectionEvent(state);
  }

  setMockLatency(ms: number) {
    this.mockLatency = ms;
  }

  setMaxReconnectAttempts(attempts: number) {
    this.maxReconnectAttempts = attempts;
  }

  // WebSocket API implementation
  connect(url: string): Promise<void> {
    this.recordInteraction('connect', [url]);
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (this.connectionState === 'error') {
          reject(new Error('Mock connection failed'));
        } else {
          this.setConnectionState('open');
          resolve();
        }
      }, this.mockLatency);
    });
  }

  disconnect(): void {
    this.recordInteraction('disconnect', []);
    this.setConnectionState('closed');
    this.subscriptions.clear();
  }

  subscribe(event: string, callback: (data: any) => void): string {
    const subscriptionId = `sub-${Date.now()}-${Math.random()}`;
    
    this.recordInteraction('subscribe', [event, subscriptionId]);
    
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, []);
    }
    
    this.subscriptions.get(event)!.push({
      event,
      callback,
      id: subscriptionId
    });
    
    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    this.recordInteraction('unsubscribe', [subscriptionId]);
    
    for (const [event, handlers] of this.subscriptions.entries()) {
      const index = handlers.findIndex(h => h.id === subscriptionId);
      if (index !== -1) {
        handlers.splice(index, 1);
        if (handlers.length === 0) {
          this.subscriptions.delete(event);
        }
        break;
      }
    }
  }

  send(message: WebSocketMessage): void {
    this.recordInteraction('send', [message]);
    
    if (this.connectionState !== 'open') {
      throw new Error('WebSocket is not connected');
    }
    
    // In a real implementation, this would send to server
    // For testing, we queue the message
    this.messageQueue.push({
      ...message,
      timestamp: Date.now()
    });
  }

  // Test utility methods
  simulateMessage(event: string, data: any): void {
    this.recordInteraction('simulateMessage', [event, data]);
    
    const handlers = this.subscriptions.get(event);
    if (handlers) {
      // Simulate network latency
      setTimeout(() => {
        handlers.forEach(handler => {
          try {
            handler.callback(data);
          } catch (error) {
            console.error(`Error in WebSocket handler for ${event}:`, error);
          }
        });
      }, this.mockLatency);
    }
  }

  simulateConnectionLoss(): void {
    this.recordInteraction('simulateConnectionLoss', []);
    this.setConnectionState('closed');
    
    // Simulate reconnection attempts
    this.attemptReconnect();
  }

  simulateError(error: Error): void {
    this.recordInteraction('simulateError', [error.message]);
    this.setConnectionState('error');
    
    // Emit error to all subscribers
    this.emitToAllSubscribers('error', { error: error.message });
  }

  simulateReconnect(): void {
    this.recordInteraction('simulateReconnect', []);
    this.reconnectAttempts = 0;
    this.setConnectionState('open');
  }

  // Agent-specific message simulation
  simulateAgentActivity(agentId: string, activity: any): void {
    this.simulateMessage('agent-activity', {
      agentId,
      activity: {
        id: `activity-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...activity
      }
    });
  }

  simulateAgentMetricsUpdate(agentId: string, metrics: any): void {
    this.simulateMessage('agent-metrics-update', {
      agentId,
      metrics,
      timestamp: new Date().toISOString()
    });
  }

  simulateAgentStatusChange(agentId: string, status: string): void {
    this.simulateMessage('agent-status', {
      agentId,
      status,
      timestamp: new Date().toISOString()
    });
  }

  simulateBulkAgentUpdate(updates: Array<{ agentId: string, data: any }>): void {
    this.simulateMessage('agents-bulk-update', {
      updates,
      timestamp: new Date().toISOString()
    });
  }

  // Test inspection methods
  getSubscriptions(): Map<string, SubscriptionHandler[]> {
    return new Map(this.subscriptions);
  }

  getConnectionState(): string {
    return this.connectionState;
  }

  getMessageQueue(): WebSocketMessage[] {
    return [...this.messageQueue];
  }

  getSubscriptionCount(event?: string): number {
    if (event) {
      return this.subscriptions.get(event)?.length || 0;
    }
    return Array.from(this.subscriptions.values())
      .reduce((total, handlers) => total + handlers.length, 0);
  }

  clearMessageQueue(): void {
    this.messageQueue = [];
  }

  reset(): void {
    this.subscriptions.clear();
    this.messageQueue = [];
    this.connectionState = 'closed';
    this.reconnectAttempts = 0;
    this.mockLatency = 0;
  }

  // Private helper methods
  private recordInteraction(method: string, args: any[]) {
    swarmCoordinator.recordMockInteraction({
      mockName: 'WebSocket',
      method,
      args
    });
  }

  private emitConnectionEvent(state: string) {
    const eventMap = {
      connecting: 'connecting',
      open: 'connected',
      closed: 'disconnected',
      error: 'error'
    };
    
    const event = eventMap[state];
    if (event) {
      this.emitToAllSubscribers('connection', { state, event });
    }
  }

  private emitToAllSubscribers(event: string, data: any) {
    const handlers = this.subscriptions.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler.callback(data);
        } catch (error) {
          console.error(`Error in WebSocket handler for ${event}:`, error);
        }
      });
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts - 1) * 1000; // Exponential backoff
      
      setTimeout(() => {
        this.setConnectionState('connecting');
        
        setTimeout(() => {
          if (this.reconnectAttempts <= this.maxReconnectAttempts) {
            this.setConnectionState('open');
            this.emitToAllSubscribers('reconnected', {
              attempts: this.reconnectAttempts
            });
          }
        }, this.mockLatency);
      }, delay);
    } else {
      this.emitToAllSubscribers('connection-failed', {
        maxAttemptsReached: true
      });
    }
  }
}

// Mock WebSocket hook
class MockUseWebSocket {
  private mockWS: MockWebSocket;
  private isConnected = false;

  constructor() {
    this.mockWS = new MockWebSocket();
  }

  // Hook API
  useWebSocket() {
    return {
      isConnected: this.isConnected,
      subscribe: (event: string, callback: (data: any) => void) => {
        return this.mockWS.subscribe(event, callback);
      },
      send: (message: any) => {
        this.mockWS.send(message);
      },
      disconnect: () => {
        this.mockWS.disconnect();
        this.isConnected = false;
      },
      connect: async () => {
        await this.mockWS.connect('mock://websocket');
        this.isConnected = true;
      }
    };
  }

  // Test control methods
  setConnected(connected: boolean) {
    this.isConnected = connected;
    this.mockWS.setConnectionState(connected ? 'open' : 'closed');
  }

  getMockWebSocket(): MockWebSocket {
    return this.mockWS;
  }

  reset() {
    this.isConnected = false;
    this.mockWS.reset();
  }
}

// Export singleton instances
export const mockWebSocket = new MockWebSocket();
export const mockUseWebSocket = new MockUseWebSocket();

// Contract for WebSocket testing
export const WEBSOCKET_CONTRACT = {
  componentName: 'WebSocket',
  dependencies: ['NetworkLayer', 'EventSystem', 'ReconnectionLogic'],
  interactions: [
    {
      dependency: 'NetworkLayer',
      method: 'connect',
      expectedCallCount: 1,
      callOrder: 1
    },
    {
      dependency: 'EventSystem',
      method: 'subscribe',
      callOrder: 2
    },
    {
      dependency: 'ReconnectionLogic',
      method: 'handleDisconnect',
      callOrder: 3
    }
  ]
};