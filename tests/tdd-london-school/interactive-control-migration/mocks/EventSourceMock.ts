/**
 * TDD London School: EventSource Mock Implementation
 * 
 * Comprehensive mock for EventSource API that enables behavior verification
 * and contract testing in London School TDD approach.
 */

import { vi, type Mock } from 'vitest';

export interface EventSourceMockOptions {
  url?: string;
  withCredentials?: boolean;
  initialReadyState?: number;
  autoConnect?: boolean;
  simulateNetworkDelay?: boolean;
}

export interface EventSourceMockController {
  // Connection simulation
  simulateOpen(): void;
  simulateError(error?: ErrorEvent): void;
  simulateClose(): void;
  
  // Message simulation
  simulateMessage(data: string, eventType?: string): void;
  simulateCustomEvent(eventType: string, data: any): void;
  simulateBatch(messages: Array<{data: string, type?: string}>): void;
  
  // State management
  setReadyState(state: number): void;
  triggerStateChange(state: number): void;
  
  // Verification helpers
  getEventListeners(): Map<string, Function[]>;
  getCallHistory(): Array<{method: string, args: any[]}>;
  wasEventFired(eventType: string): boolean;
  getMessageHistory(): Array<{data: string, type: string, timestamp: Date}>;
  
  // Cleanup
  reset(): void;
  destroy(): void;
}

/**
 * Creates a comprehensive EventSource mock with behavior verification capabilities
 */
export function createEventSourceMock(options: EventSourceMockOptions = {}): {
  mockClass: typeof EventSource;
  mockInstance: EventSource & { __controller: EventSourceMockController };
  controller: EventSourceMockController;
} {
  const {
    url = 'mock://sse/stream',
    withCredentials = false,
    initialReadyState = EventSource.CONNECTING,
    autoConnect = true,
    simulateNetworkDelay = false
  } = options;

  // Event listener storage
  const eventListeners = new Map<string, Function[]>();
  const callHistory: Array<{method: string, args: any[]}> = [];
  const messageHistory: Array<{data: string, type: string, timestamp: Date}> = [];
  const firedEvents = new Set<string>();

  // Mock methods
  const addEventListener: Mock = vi.fn((type: string, listener: Function) => {
    callHistory.push({method: 'addEventListener', args: [type, listener]});
    
    if (!eventListeners.has(type)) {
      eventListeners.set(type, []);
    }
    eventListeners.get(type)!.push(listener);
  });

  const removeEventListener: Mock = vi.fn((type: string, listener: Function) => {
    callHistory.push({method: 'removeEventListener', args: [type, listener]});
    
    const listeners = eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  });

  const close: Mock = vi.fn(() => {
    callHistory.push({method: 'close', args: []});
    mockInstance.readyState = EventSource.CLOSED;
    triggerEvent('close');
  });

  const dispatchEvent: Mock = vi.fn((event: Event) => {
    callHistory.push({method: 'dispatchEvent', args: [event]});
    return true;
  });

  // State management
  let currentReadyState = initialReadyState;

  // Mock instance properties
  const mockInstance = {
    // EventSource API
    addEventListener,
    removeEventListener,
    close,
    dispatchEvent,
    
    // Properties
    get readyState() { return currentReadyState; },
    set readyState(value: number) { currentReadyState = value; },
    url,
    withCredentials,
    
    // Constants
    CONNECTING: EventSource.CONNECTING,
    OPEN: EventSource.OPEN,
    CLOSED: EventSource.CLOSED,
    
    // Event handlers (can be set directly)
    onopen: null as ((event: Event) => void) | null,
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null as ((event: ErrorEvent) => void) | null,
    
    // Controller for test manipulation
    __controller: null as any // Will be set below
  } as EventSource & { __controller: EventSourceMockController };

  // Helper function to trigger events
  const triggerEvent = (eventType: string, eventData?: any) => {
    firedEvents.add(eventType);
    
    // Call direct handler if set
    const directHandler = (mockInstance as any)[`on${eventType}`];
    if (directHandler && typeof directHandler === 'function') {
      directHandler(eventData);
    }
    
    // Call addEventListener handlers
    const listeners = eventListeners.get(eventType) || [];
    listeners.forEach(listener => {
      try {
        listener(eventData);
      } catch (error) {
        console.error(`Error in ${eventType} listener:`, error);
      }
    });
  };

  // Create controller
  const controller: EventSourceMockController = {
    // Connection simulation
    simulateOpen() {
      mockInstance.readyState = EventSource.OPEN;
      const openEvent = new Event('open');
      triggerEvent('open', openEvent);
    },

    simulateError(error?: ErrorEvent) {
      mockInstance.readyState = EventSource.CLOSED;
      const errorEvent = error || new ErrorEvent('error', {
        message: 'Mock EventSource error',
        error: new Error('Simulated connection error')
      });
      triggerEvent('error', errorEvent);
    },

    simulateClose() {
      mockInstance.readyState = EventSource.CLOSED;
      triggerEvent('close');
    },

    // Message simulation
    simulateMessage(data: string, eventType: string = 'message') {
      if (mockInstance.readyState !== EventSource.OPEN) {
        throw new Error('Cannot send message: EventSource is not open');
      }

      const messageEvent = new MessageEvent('message', {
        data,
        origin: new URL(url).origin,
        lastEventId: `${Date.now()}-${Math.random()}`,
        type: eventType
      });

      messageHistory.push({
        data,
        type: eventType,
        timestamp: new Date()
      });

      triggerEvent('message', messageEvent);
    },

    simulateCustomEvent(eventType: string, data: any) {
      if (mockInstance.readyState !== EventSource.OPEN) {
        throw new Error('Cannot send event: EventSource is not open');
      }

      const customEvent = new MessageEvent(eventType, {
        data: JSON.stringify(data),
        origin: new URL(url).origin
      });

      triggerEvent(eventType, customEvent);
    },

    simulateBatch(messages: Array<{data: string, type?: string}>) {
      messages.forEach(msg => {
        controller.simulateMessage(msg.data, msg.type);
        
        // Add small delay between messages if network delay is enabled
        if (simulateNetworkDelay) {
          // In real tests, you might want to use setTimeout or fake timers
        }
      });
    },

    // State management
    setReadyState(state: number) {
      const oldState = currentReadyState;
      currentReadyState = state;
      
      // Trigger appropriate events based on state change
      if (oldState !== state) {
        controller.triggerStateChange(state);
      }
    },

    triggerStateChange(state: number) {
      switch (state) {
        case EventSource.OPEN:
          controller.simulateOpen();
          break;
        case EventSource.CLOSED:
          controller.simulateClose();
          break;
        default:
          // CONNECTING state doesn't trigger specific events
          break;
      }
    },

    // Verification helpers
    getEventListeners() {
      return new Map(eventListeners);
    },

    getCallHistory() {
      return [...callHistory];
    },

    wasEventFired(eventType: string) {
      return firedEvents.has(eventType);
    },

    getMessageHistory() {
      return [...messageHistory];
    },

    // Cleanup
    reset() {
      eventListeners.clear();
      callHistory.length = 0;
      messageHistory.length = 0;
      firedEvents.clear();
      currentReadyState = EventSource.CONNECTING;
      
      mockInstance.onopen = null;
      mockInstance.onmessage = null;
      mockInstance.onerror = null;
      
      vi.clearAllMocks();
    },

    destroy() {
      controller.reset();
      controller.simulateClose();
    }
  };

  // Attach controller to mock instance
  mockInstance.__controller = controller;

  // Auto-connect simulation
  if (autoConnect) {
    setTimeout(() => {
      if (currentReadyState === EventSource.CONNECTING) {
        controller.simulateOpen();
      }
    }, simulateNetworkDelay ? 100 : 0);
  }

  // Create mock class constructor
  const MockEventSourceClass = vi.fn().mockImplementation((url: string, options?: EventSourceInit) => {
    callHistory.push({method: 'constructor', args: [url, options]});
    return mockInstance;
  }) as any;

  // Add static constants
  MockEventSourceClass.CONNECTING = EventSource.CONNECTING;
  MockEventSourceClass.OPEN = EventSource.OPEN;
  MockEventSourceClass.CLOSED = EventSource.CLOSED;

  return {
    mockClass: MockEventSourceClass,
    mockInstance,
    controller
  };
}

/**
 * Global EventSource mock setup helper
 */
export function setupGlobalEventSourceMock(options?: EventSourceMockOptions) {
  const { mockClass, mockInstance, controller } = createEventSourceMock(options);
  
  // Replace global EventSource
  const originalEventSource = global.EventSource;
  global.EventSource = mockClass;
  
  return {
    mockInstance,
    controller,
    restore: () => {
      global.EventSource = originalEventSource;
    }
  };
}

/**
 * Swarm coordination helpers for EventSource mocks
 */
export const EventSourceMockSwarmHelpers = {
  /**
   * Create coordinated mock setup for swarm testing
   */
  createSwarmMock(swarmId: string, instanceIds: string[]) {
    const mocks = new Map<string, {mockInstance: EventSource, controller: EventSourceMockController}>();
    
    instanceIds.forEach(instanceId => {
      const { mockInstance, controller } = createEventSourceMock({
        url: `/api/v1/claude/instances/${instanceId}/terminal/stream`,
        autoConnect: false
      });
      
      mocks.set(instanceId, { mockInstance, controller });
    });
    
    return {
      mocks,
      simulateSwarmCoordination(messages: Array<{instanceId: string, data: string, type?: string}>) {
        messages.forEach(msg => {
          const mock = mocks.get(msg.instanceId);
          if (mock) {
            mock.controller.simulateMessage(msg.data, msg.type);
          }
        });
      },
      
      cleanup() {
        mocks.forEach(({ controller }) => {
          controller.destroy();
        });
        mocks.clear();
      }
    };
  },

  /**
   * Verify swarm communication patterns
   */
  verifySwarmCommunication(
    mocks: Map<string, {mockInstance: EventSource, controller: EventSourceMockController}>,
    expectedPattern: Array<{instanceId: string, messageCount: number}>
  ) {
    expectedPattern.forEach(({ instanceId, messageCount }) => {
      const mock = mocks.get(instanceId);
      if (mock) {
        const messageHistory = mock.controller.getMessageHistory();
        expect(messageHistory).toHaveLength(messageCount);
      }
    });
  }
};