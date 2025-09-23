/**
 * Enhanced WebSocket Singleton Hook
 * SPARC Architecture Implementation - Fixes connection establishment issues
 * 
 * Key improvements:
 * 1. Proper instance ID normalization
 * 2. Robust connection state management  
 * 3. Enhanced error recovery
 * 4. Connection validation and health monitoring
 * 5. Message deduplication and ordering
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

// Import our architecture utilities
// These would be compiled/bundled for frontend use
interface InstanceMetadata {
  baseId: string;
  displayName: string;
  pid?: number;
  processType?: string;
}

// Frontend-compatible normalization (simplified version)
function normalizeInstanceId(instanceId: string): string {
  if (!instanceId || typeof instanceId !== 'string') {
    throw new Error(`Invalid instance ID: ${instanceId}`);
  }
  return instanceId.includes('(') ? instanceId.split(' (')[0].trim() : instanceId.trim();
}

function parseInstanceMetadata(instanceId: string): InstanceMetadata {
  const baseId = normalizeInstanceId(instanceId);
  const pidMatch = instanceId.match(/\\(PID:\\s*(\\d+)\\)/);
  const pid = pidMatch ? parseInt(pidMatch[1], 10) : undefined;
  const typeMatch = instanceId.match(/\\(([^)]+)\\)$/);
  const processType = typeMatch && !pidMatch ? typeMatch[1] : undefined;
  
  return {
    baseId,
    displayName: instanceId,
    pid,
    processType
  };
}

// Connection states
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

// Message types
interface WebSocketMessage {
  type: string;
  data?: any;
  output?: string;
  terminalId?: string;
  instanceId?: string;
  timestamp?: number;
  error?: string;
  sequence?: number;
}

// Connection health metrics
interface ConnectionHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  lastPing: Date;
  consecutiveFailures: number;
  uptime: number;
  messagesSent: number;
  messagesReceived: number;
}

// Enhanced singleton interface
export interface EnhancedWebSocketSingleton {
  // Connection management
  isConnected: boolean;
  connectionState: ConnectionState;
  connect: (terminalId: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<boolean>;
  
  // Messaging
  send: (message: object) => boolean;
  
  // Event handling
  addHandler: (event: string, handler: (data: any) => void) => void;
  removeHandler: (event: string, handler?: (data: any) => void) => void;
  
  // State information
  currentTerminalId: string | null;
  connectionHealth: ConnectionHealth | null;
  lastError: Error | null;
  reconnectionAttempts: number;
  
  // Metadata
  instanceMetadata: InstanceMetadata | null;
}

// Global singleton state
let globalWebSocket: WebSocket | null = null;
let globalHandlers = new Map<string, Set<(data: any) => void>>();
let globalConnectionPromise: Promise<boolean> | null = null;
let globalCurrentTerminal: string | null = null;
let globalConnectionState = ConnectionState.DISCONNECTED;
let globalHealth: ConnectionHealth | null = null;
let globalLastError: Error | null = null;
let globalReconnectionAttempts = 0;
let globalInstanceMetadata: InstanceMetadata | null = null;

// Message deduplication
const processedMessages = new Set<string>();
const messageSequence = new Map<string, number>();

// Health monitoring
let healthCheckInterval: NodeJS.Timeout | null = null;
let connectionStartTime: Date | null = null;

/**
 * Enhanced message deduplication with sequence tracking
 */
function shouldProcessMessage(message: WebSocketMessage): boolean {
  const messageId = `${message.type}-${message.terminalId || message.instanceId}-${message.timestamp}`;
  
  if (processedMessages.has(messageId)) {
    console.log('🔄 SPARC Enhanced: Duplicate message blocked:', messageId);
    return false;
  }
  
  // Check sequence ordering if available
  if (message.sequence && message.terminalId) {
    const lastSequence = messageSequence.get(message.terminalId) || 0;
    if (message.sequence <= lastSequence) {
      console.warn('⚠️ SPARC Enhanced: Out-of-order message:', message.sequence, 'vs', lastSequence);
      // Still process but log warning
    }
    messageSequence.set(message.terminalId, message.sequence);
  }
  
  processedMessages.add(messageId);
  
  // Cleanup old messages
  if (processedMessages.size > 2000) {
    const messages = Array.from(processedMessages);
    processedMessages.clear();
    messageSequence.clear();
    messages.slice(-1000).forEach(msg => processedMessages.add(msg));
  }
  
  return true;
}

/**
 * Start connection health monitoring
 */
function startHealthMonitoring(): void {
  if (healthCheckInterval || !globalWebSocket) return;
  
  connectionStartTime = new Date();
  
  healthCheckInterval = setInterval(() => {
    if (!globalWebSocket || globalWebSocket.readyState !== WebSocket.OPEN) {
      stopHealthMonitoring();
      return;
    }
    
    const now = new Date();
    
    // Send ping
    try {
      globalWebSocket.send(JSON.stringify({
        type: 'ping',
        timestamp: now.getTime()
      }));
      
      // Update health metrics
      if (globalHealth) {
        globalHealth.messagesSent++;
      }
    } catch (error) {
      console.error('❌ SPARC Enhanced: Health ping failed:', error);
      if (globalHealth) {
        globalHealth.consecutiveFailures++;
        globalHealth.status = globalHealth.consecutiveFailures > 3 ? 'unhealthy' : 'degraded';
      }
    }
  }, 30000); // Every 30 seconds
}

/**
 * Stop connection health monitoring
 */
function stopHealthMonitoring(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

/**
 * Initialize connection health metrics
 */
function initializeHealth(): void {
  globalHealth = {
    status: 'healthy',
    latency: 0,
    lastPing: new Date(),
    consecutiveFailures: 0,
    uptime: 0,
    messagesSent: 0,
    messagesReceived: 0
  };
}

/**
 * Update health metrics on pong response
 */
function updateHealthOnPong(pingTimestamp: number): void {
  if (!globalHealth) return;
  
  const now = Date.now();
  const latency = now - pingTimestamp;
  
  globalHealth.latency = latency;
  globalHealth.lastPing = new Date();
  globalHealth.consecutiveFailures = 0;
  globalHealth.messagesReceived++;
  globalHealth.uptime = connectionStartTime ? now - connectionStartTime.getTime() : 0;
  
  // Update status based on latency
  if (latency < 100) {
    globalHealth.status = 'healthy';
  } else if (latency < 500) {
    globalHealth.status = 'degraded';
  } else {
    globalHealth.status = 'unhealthy';
  }
}

/**
 * Enhanced WebSocket Singleton Hook
 */
export const useWebSocketSingletonEnhanced = (apiUrl: string = 'http://localhost:3000'): EnhancedWebSocketSingleton => {
  // Local state for reactivity
  const [connectionState, setConnectionState] = useState(globalConnectionState);
  const [currentTerminalId, setCurrentTerminalId] = useState(globalCurrentTerminal);
  const [connectionHealth, setConnectionHealth] = useState(globalHealth);
  const [lastError, setLastError] = useState(globalLastError);
  const [reconnectionAttempts, setReconnectionAttempts] = useState(globalReconnectionAttempts);
  const [instanceMetadata, setInstanceMetadata] = useState(globalInstanceMetadata);
  
  const mountedRef = useRef(true);
  const reconnectionTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Sync global state to local state
  const syncGlobalState = useCallback(() => {
    if (!mountedRef.current) return;
    
    setConnectionState(globalConnectionState);
    setCurrentTerminalId(globalCurrentTerminal);
    setConnectionHealth(globalHealth ? { ...globalHealth } : null);
    setLastError(globalLastError);
    setReconnectionAttempts(globalReconnectionAttempts);
    setInstanceMetadata(globalInstanceMetadata);
  }, []);
  
  // Update global state and sync
  const updateGlobalState = useCallback((updates: Partial<{
    connectionState: ConnectionState;
    currentTerminal: string | null;
    health: ConnectionHealth | null;
    lastError: Error | null;
    reconnectionAttempts: number;
    instanceMetadata: InstanceMetadata | null;
  }>) => {
    if (updates.connectionState !== undefined) {
      globalConnectionState = updates.connectionState;
    }
    if (updates.currentTerminal !== undefined) {
      globalCurrentTerminal = updates.currentTerminal;
    }
    if (updates.health !== undefined) {
      globalHealth = updates.health;
    }
    if (updates.lastError !== undefined) {
      globalLastError = updates.lastError;
    }
    if (updates.reconnectionAttempts !== undefined) {
      globalReconnectionAttempts = updates.reconnectionAttempts;
    }
    if (updates.instanceMetadata !== undefined) {
      globalInstanceMetadata = updates.instanceMetadata;
    }
    
    syncGlobalState();
  }, [syncGlobalState]);
  
  // Handler management
  const addHandler = useCallback((event: string, handler: (data: any) => void) => {
    if (!globalHandlers.has(event)) {
      globalHandlers.set(event, new Set());
    }
    globalHandlers.get(event)!.add(handler);
    console.log(`✅ SPARC Enhanced: Added handler for ${event}`);
  }, []);
  
  const removeHandler = useCallback((event: string, handler?: (data: any) => void) => {
    if (handler) {
      globalHandlers.get(event)?.delete(handler);
    } else {
      globalHandlers.delete(event);
    }
    console.log(`🗑️ SPARC Enhanced: Removed handler for ${event}`);
  }, []);
  
  const triggerHandlers = useCallback((event: string, data: any) => {
    if (!mountedRef.current) return;
    
    const handlers = globalHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`❌ SPARC Enhanced: Handler error for ${event}:`, error);
        }
      });
    }
  }, []);
  
  // Create WebSocket connection
  const createConnection = useCallback(async (terminalId: string): Promise<WebSocket> => {
    const normalizedId = normalizeInstanceId(terminalId);
    const metadata = parseInstanceMetadata(terminalId);
    
    updateGlobalState({ 
      connectionState: ConnectionState.CONNECTING,
      instanceMetadata: metadata
    });
    
    console.log('🚀 SPARC Enhanced: Creating WebSocket connection for', normalizedId);
    
    const wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    const ws = new WebSocket(`${wsUrl}/terminal`);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        const error = new Error(`Connection timeout for ${normalizedId}`);
        updateGlobalState({ 
          connectionState: ConnectionState.FAILED,
          lastError: error
        });
        reject(error);
      }, 10000);
      
      ws.onopen = () => {
        console.log('✅ SPARC Enhanced: WebSocket connected to', normalizedId);
        clearTimeout(timeout);
        
        globalWebSocket = ws;
        initializeHealth();
        startHealthMonitoring();
        
        updateGlobalState({
          connectionState: ConnectionState.CONNECTED,
          currentTerminal: normalizedId,
          lastError: null
        });
        
        // Send connection message with normalized ID
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId: normalizedId, // Use normalized ID consistently
          metadata: metadata,
          timestamp: Date.now()
        }));
        
        resolve(ws);
      };
      
      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Handle pong responses for health monitoring
          if (message.type === 'pong' && message.timestamp) {
            updateHealthOnPong(message.timestamp);
            syncGlobalState();
            return;
          }
          
          // Apply enhanced message deduplication
          if (!shouldProcessMessage(message)) return;
          
          console.log('📨 SPARC Enhanced: Message received:', message.type, message.terminalId?.slice(0, 8) || 'no-id');
          
          // Normalize message instance ID
          if (message.terminalId) {
            message.instanceId = normalizeInstanceId(message.terminalId);
          }
          
          // Route to appropriate handlers
          if (message.type === 'output' || message.type === 'terminal_output') {
            triggerHandlers('terminal:output', {
              output: message.data || message.output,
              terminalId: message.instanceId || normalizedId,
              timestamp: message.timestamp,
              sequence: message.sequence
            });
          } else if (message.type === 'status') {
            triggerHandlers('terminal:status', {
              ...message,
              instanceId: message.instanceId || normalizedId
            });
          } else if (message.type === 'error') {
            const error = new Error(message.error || 'WebSocket error');
            updateGlobalState({ lastError: error });
            triggerHandlers('error', { 
              error: message.error,
              instanceId: message.instanceId || normalizedId
            });
          } else if (message.type === 'connect') {
            triggerHandlers('connect', { 
              terminalId: message.instanceId || normalizedId,
              status: 'connected'
            });
          }
          
          // Update health on any message
          if (globalHealth) {
            globalHealth.messagesReceived++;
            globalHealth.lastPing = new Date();
          }
          
        } catch (parseError) {
          console.error('❌ SPARC Enhanced: Message parsing error:', parseError);
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ SPARC Enhanced: WebSocket error:', error);
        clearTimeout(timeout);
        
        const wsError = new Error(`WebSocket error for ${normalizedId}`);
        updateGlobalState({ 
          connectionState: ConnectionState.FAILED,
          lastError: wsError
        });
        
        triggerHandlers('error', { error: wsError.message });
        reject(wsError);
      };
      
      ws.onclose = (event) => {
        console.log('🔌 SPARC Enhanced: WebSocket closed:', event.code, event.reason);
        
        stopHealthMonitoring();
        globalWebSocket = null;
        globalConnectionPromise = null;
        
        const newState = globalReconnectionAttempts > 0 ? ConnectionState.RECONNECTING : ConnectionState.DISCONNECTED;
        updateGlobalState({ connectionState: newState });
        
        triggerHandlers('disconnect', { 
          code: event.code, 
          reason: event.reason,
          instanceId: normalizedId
        });
      };
    });
  }, [apiUrl, updateGlobalState, triggerHandlers]);
  
  // Connection function
  const connect = useCallback(async (terminalId: string): Promise<boolean> => {
    if (!terminalId) {
      const error = new Error('Invalid terminal ID provided');
      updateGlobalState({ lastError: error });
      return false;
    }
    
    const normalizedId = normalizeInstanceId(terminalId);
    console.log('🔗 SPARC Enhanced: Connect requested for', normalizedId);
    
    // Cancel any existing connection attempt
    if (globalConnectionPromise) {
      console.log('🔄 SPARC Enhanced: Cancelling previous connection attempt');
    }
    
    try {
      globalConnectionPromise = createConnection(terminalId).then(() => true);
      const success = await globalConnectionPromise;
      
      if (success) {
        updateGlobalState({ reconnectionAttempts: 0 });
      }
      
      return success;
      
    } catch (error) {
      console.error('❌ SPARC Enhanced: Connection failed:', error);
      globalConnectionPromise = null;
      updateGlobalState({ 
        connectionState: ConnectionState.FAILED,
        lastError: error instanceof Error ? error : new Error(String(error))
      });
      return false;
    }
  }, [createConnection, updateGlobalState]);
  
  // Disconnect function
  const disconnect = useCallback(async (): Promise<void> => {
    console.log('🔌 SPARC Enhanced: Disconnect requested');
    
    // Clear reconnection timeout
    if (reconnectionTimeoutRef.current) {
      clearTimeout(reconnectionTimeoutRef.current);
      reconnectionTimeoutRef.current = undefined;
    }
    
    stopHealthMonitoring();
    
    if (globalWebSocket) {
      globalWebSocket.close(1000, 'Manual disconnect');
      globalWebSocket = null;
    }
    
    globalConnectionPromise = null;
    processedMessages.clear();
    messageSequence.clear();
    
    updateGlobalState({
      connectionState: ConnectionState.DISCONNECTED,
      currentTerminal: null,
      health: null,
      reconnectionAttempts: 0,
      instanceMetadata: null
    });
  }, [updateGlobalState]);
  
  // Reconnection with exponential backoff
  const reconnect = useCallback(async (): Promise<boolean> => {
    if (!globalCurrentTerminal) {
      console.warn('⚠️ SPARC Enhanced: No terminal ID for reconnection');
      return false;
    }
    
    const maxAttempts = 10;
    const baseDelay = 1000;
    const maxDelay = 30000;
    
    if (globalReconnectionAttempts >= maxAttempts) {
      console.error('❌ SPARC Enhanced: Max reconnection attempts reached');
      updateGlobalState({ 
        connectionState: ConnectionState.FAILED,
        lastError: new Error('Max reconnection attempts exceeded')
      });
      return false;
    }
    
    const attempt = globalReconnectionAttempts + 1;
    const delay = Math.min(baseDelay * Math.pow(1.5, attempt - 1), maxDelay);
    
    console.log(`🔄 SPARC Enhanced: Reconnection attempt ${attempt}/${maxAttempts} in ${delay}ms`);
    
    updateGlobalState({ 
      connectionState: ConnectionState.RECONNECTING,
      reconnectionAttempts: attempt
    });
    
    return new Promise((resolve) => {
      reconnectionTimeoutRef.current = setTimeout(async () => {
        try {
          const success = await connect(globalCurrentTerminal!);
          if (success) {
            console.log('✅ SPARC Enhanced: Reconnection successful');
            resolve(true);
          } else {
            // Schedule next attempt
            reconnect();
            resolve(false);
          }
        } catch (error) {
          console.error('❌ SPARC Enhanced: Reconnection failed:', error);
          reconnect();
          resolve(false);
        }
      }, delay);
    });
  }, [connect, updateGlobalState]);
  
  // Send message
  const send = useCallback((message: object): boolean => {
    if (!globalWebSocket || globalWebSocket.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ SPARC Enhanced: Cannot send, WebSocket not connected');
      return false;
    }
    
    try {
      const messageStr = JSON.stringify(message);
      globalWebSocket.send(messageStr);
      
      if (globalHealth) {
        globalHealth.messagesSent++;
      }
      
      console.log('📤 SPARC Enhanced: Message sent:', messageStr.slice(0, 100));
      return true;
      
    } catch (error) {
      console.error('❌ SPARC Enhanced: Send failed:', error);
      updateGlobalState({ lastError: error instanceof Error ? error : new Error(String(error)) });
      return false;
    }
  }, [updateGlobalState]);
  
  // Detect connection loss and auto-reconnect
  useEffect(() => {
    const handleConnectionLoss = () => {
      if (globalConnectionState === ConnectionState.CONNECTED && globalCurrentTerminal) {
        console.log('🚨 SPARC Enhanced: Connection loss detected, initiating reconnection');
        reconnect();
      }
    };
    
    // Monitor for connection issues
    const monitorInterval = setInterval(() => {
      if (globalWebSocket && globalWebSocket.readyState === WebSocket.CLOSED) {
        handleConnectionLoss();
      }
    }, 5000);
    
    return () => {
      clearInterval(monitorInterval);
    };
  }, [reconnect]);
  
  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    syncGlobalState();
    
    return () => {
      mountedRef.current = false;
      if (reconnectionTimeoutRef.current) {
        clearTimeout(reconnectionTimeoutRef.current);
      }
    };
  }, [syncGlobalState]);
  
  // Memoized return object
  const singleton = useMemo((): EnhancedWebSocketSingleton => ({
    isConnected: connectionState === ConnectionState.CONNECTED,
    connectionState,
    connect,
    disconnect,
    reconnect,
    send,
    addHandler,
    removeHandler,
    currentTerminalId,
    connectionHealth,
    lastError,
    reconnectionAttempts,
    instanceMetadata
  }), [
    connectionState,
    connect,
    disconnect, 
    reconnect,
    send,
    addHandler,
    removeHandler,
    currentTerminalId,
    connectionHealth,
    lastError,
    reconnectionAttempts,
    instanceMetadata
  ]);
  
  return singleton;
};