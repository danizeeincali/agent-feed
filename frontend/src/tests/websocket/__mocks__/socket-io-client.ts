/**
 * TDD London School Mock for Socket.IO Client
 * 
 * This mock focuses on interaction patterns and behavior verification
 * following the London School (mockist) approach to TDD.
 */

import { EventEmitter } from 'events';

export interface MockSocket extends EventEmitter {
  id?: string;
  connected: boolean;
  disconnected: boolean;
  connect: jest.MockedFunction<() => MockSocket>;
  disconnect: jest.MockedFunction<() => MockSocket>;
  emit: jest.MockedFunction<(event: string, ...args: any[]) => boolean>;
  on: jest.MockedFunction<(event: string, listener: (...args: any[]) => void) => MockSocket>;
  off: jest.MockedFunction<(event: string, listener?: (...args: any[]) => void) => MockSocket>;
  removeAllListeners: jest.MockedFunction<(event?: string) => MockSocket>;
  onAny: jest.MockedFunction<(listener: (event: string, ...args: any[]) => void) => MockSocket>;
  offAny: jest.MockedFunction<(listener?: (event: string, ...args: any[]) => void) => MockSocket>;
}

export interface MockSocketFactory {
  createSocket: (url: string, options?: any) => MockSocket;
  getLastCreatedSocket: () => MockSocket | null;
  getAllSockets: () => MockSocket[];
  clearSocketHistory: () => void;
  simulateServerEvent: (socket: MockSocket, event: string, data?: any) => void;
  simulateConnectionError: (socket: MockSocket, error: Error) => void;
  simulateDisconnection: (socket: MockSocket, reason: string) => void;
  simulateSuccessfulConnection: (socket: MockSocket, data?: any) => void;
}

// Track all created socket instances for test verification
const socketInstances: MockSocket[] = [];
let lastCreatedSocket: MockSocket | null = null;

// Socket behavior simulator
class SocketBehaviorSimulator {
  private socket: MockSocket;
  
  constructor(socket: MockSocket) {
    this.socket = socket;
  }
  
  simulateConnection(data?: any) {
    this.socket.connected = true;
    this.socket.disconnected = false;
    this.socket.id = data?.socketId || `mock-socket-${Date.now()}`;
    this.socket.emit('connect', data);
  }
  
  simulateDisconnection(reason: string) {
    this.socket.connected = false;
    this.socket.disconnected = true;
    this.socket.id = undefined;
    this.socket.emit('disconnect', reason);
  }
  
  simulateError(error: Error) {
    this.socket.emit('error', error);
  }
  
  simulateConnectionError(error: Error) {
    this.socket.emit('connect_error', error);
  }
  
  simulateServerEvent(event: string, data?: any) {
    this.socket.emit(event, data);
  }
}

function createMockSocket(url: string, options?: any): MockSocket {
  const mockSocket = new EventEmitter() as MockSocket;
  
  // Initialize state
  mockSocket.connected = false;
  mockSocket.disconnected = true;
  mockSocket.id = undefined;
  
  // Create behavior simulator
  const simulator = new SocketBehaviorSimulator(mockSocket);
  
  // Mock Socket.IO methods with Jest spy functions
  mockSocket.connect = jest.fn().mockImplementation(() => {
    // Auto-simulate connection if not manually controlled
    if (options?.autoConnect !== false) {
      setTimeout(() => simulator.simulateConnection(), 0);
    }
    return mockSocket;
  });
  
  mockSocket.disconnect = jest.fn().mockImplementation(() => {
    simulator.simulateDisconnection('io client disconnect');
    return mockSocket;
  });
  
  // Override emit to track emitted events while preserving EventEmitter functionality
  const originalEmit = mockSocket.emit.bind(mockSocket);
  mockSocket.emit = jest.fn().mockImplementation((event: string, ...args: any[]) => {
    return originalEmit(event, ...args);
  });
  
  // Override on to track event listeners
  const originalOn = mockSocket.on.bind(mockSocket);
  mockSocket.on = jest.fn().mockImplementation((event: string, listener: (...args: any[]) => void) => {
    return originalOn(event, listener);
  });
  
  // Override off to track event listener removal
  const originalOff = mockSocket.off.bind(mockSocket);
  mockSocket.off = jest.fn().mockImplementation((event: string, listener?: (...args: any[]) => void) => {
    return originalOff(event, listener);
  });
  
  mockSocket.removeAllListeners = jest.fn().mockImplementation((event?: string) => {
    // Call original EventEmitter method
    const originalRemoveAllListeners = EventEmitter.prototype.removeAllListeners.bind(mockSocket);
    originalRemoveAllListeners(event);
    return mockSocket;
  });
  
  mockSocket.onAny = jest.fn().mockImplementation((listener: (event: string, ...args: any[]) => void) => {
    // Simple implementation of onAny - in real socket.io this would capture all events
    return mockSocket;
  });
  
  mockSocket.offAny = jest.fn().mockImplementation((listener?: (event: string, ...args: any[]) => void) => {
    return mockSocket;
  });
  
  // Store simulator for external test control
  (mockSocket as any)._simulator = simulator;
  
  // Track instance
  socketInstances.push(mockSocket);
  lastCreatedSocket = mockSocket;
  
  return mockSocket;
}

// Mock factory implementation
export const mockSocketFactory: MockSocketFactory = {
  createSocket: createMockSocket,
  
  getLastCreatedSocket: () => lastCreatedSocket,
  
  getAllSockets: () => [...socketInstances],
  
  clearSocketHistory: () => {
    socketInstances.length = 0;
    lastCreatedSocket = null;
  },
  
  simulateServerEvent: (socket: MockSocket, event: string, data?: any) => {
    const simulator = (socket as any)._simulator;
    if (simulator) {
      simulator.simulateServerEvent(event, data);
    }
  },
  
  simulateConnectionError: (socket: MockSocket, error: Error) => {
    const simulator = (socket as any)._simulator;
    if (simulator) {
      simulator.simulateConnectionError(error);
    }
  },
  
  simulateDisconnection: (socket: MockSocket, reason: string) => {
    const simulator = (socket as any)._simulator;
    if (simulator) {
      simulator.simulateDisconnection(reason);
    }
  },
  
  simulateSuccessfulConnection: (socket: MockSocket, data?: any) => {
    const simulator = (socket as any)._simulator;
    if (simulator) {
      simulator.simulateConnection(data);
    }
  }
};

// Mock the io function from socket.io-client
export const io = jest.fn().mockImplementation(createMockSocket);

// Export Socket type for TypeScript compatibility
export type Socket = MockSocket;

// Export default for ES module compatibility
export default { io, mockSocketFactory };