/**
 * Advanced SSE Connection Hook - Comprehensive SSE Stream Management
 * Integrates OutputBufferManager, IncrementalMessageProcessor, UIStateManager, and ErrorRecoveryManager
 * Prevents message accumulation storms through intelligent processing and batching
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import IncrementalMessageProcessor, { ProcessedMessage } from '../services/IncrementalMessageProcessor';
import UIStateManager, { UIState, ScrollState } from '../services/UIStateManager';
import ErrorRecoveryManager, { RecoveryState } from '../services/ErrorRecoveryManager';

export interface AdvancedSSEConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  isRecovering: boolean;
  instanceId: string | null;
  lastError: string | null;
  connectionHealth: 'healthy' | 'degraded' | 'failed';
  sequenceNumber: number;
  messagesPerSecond: number;
  memoryUsage: number;
}

export interface SSEConnectionOptions {
  autoReconnect?: boolean;
  maxRetries?: number;
  enableBackfill?: boolean;
  batchSize?: number;
  maxMemoryMB?: number;
  enableCompression?: boolean;
}

export interface ConnectionMetrics {
  totalMessages: number;
  messagesPerSecond: number;
  averageLatency: number;
  connectionUptime: number;
  recoveryCount: number;
  lastRecoveryTime: number;
}

type MessageHandler = (instanceId: string, messages: ProcessedMessage[]) => void;
type StateChangeHandler = (instanceId: string, state: AdvancedSSEConnectionState) => void;

export function useAdvancedSSEConnection(
  baseUrl: string,
  options: SSEConnectionOptions = {}
) {
  // Default options
  const defaultOptions: Required<SSEConnectionOptions> = {
    autoReconnect: true,
    maxRetries: 5,
    enableBackfill: true,
    batchSize: 10,
    maxMemoryMB: 50,
    enableCompression: false
  };
  
  const config = { ...defaultOptions, ...options };
  
  // State management
  const [connectionState, setConnectionState] = useState<AdvancedSSEConnectionState>({
    isConnected: false,
    isConnecting: false,
    isRecovering: false,
    instanceId: null,
    lastError: null,
    connectionHealth: 'failed',
    sequenceNumber: 0,
    messagesPerSecond: 0,
    memoryUsage: 0
  });
  
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    totalMessages: 0,
    messagesPerSecond: 0,
    averageLatency: 0,
    connectionUptime: 0,
    recoveryCount: 0,
    lastRecoveryTime: 0
  });
  
  // Service instances
  const messageProcessor = useRef<IncrementalMessageProcessor>();
  const uiStateManager = useRef<UIStateManager>();
  const errorRecoveryManager = useRef<ErrorRecoveryManager>();
  
  // Connection management
  const eventSources = useRef<Map<string, EventSource>>(new Map());
  const messageHandlers = useRef<Set<MessageHandler>>(new Set());
  const stateChangeHandlers = useRef<Set<StateChangeHandler>>(new Set());
  
  // Performance tracking
  const performanceMetrics = useRef({
    lastMessageTime: 0,
    messageCount: 0,
    startTime: Date.now(),
    latencies: [] as number[]
  });
  
  // Initialize services
  useEffect(() => {
    messageProcessor.current = new IncrementalMessageProcessor();
    uiStateManager.current = new UIStateManager();
    errorRecoveryManager.current = new ErrorRecoveryManager({
      maxRetries: config.maxRetries,
      enableBackfill: config.enableBackfill
    });
    
    // Setup service event handlers
    setupServiceEventHandlers();
    
    // Start maintenance intervals
    const maintenanceInterval = setInterval(() => {
      performMaintenance();
    }, 30000); // Every 30 seconds
    
    const metricsInterval = setInterval(() => {
      updateMetrics();
    }, 5000); // Every 5 seconds
    
    return () => {
      cleanup();
      clearInterval(maintenanceInterval);
      clearInterval(metricsInterval);
    };
  }, []);
  
  /**
   * Connect to SSE stream for specific instance
   */
  const connectToInstance = useCallback(async (instanceId: string): Promise<void> => {
    if (!messageProcessor.current || !uiStateManager.current || !errorRecoveryManager.current) {
      throw new Error('Services not initialized');
    }
    
    // Check if already connected
    if (eventSources.current.has(instanceId)) {
      console.warn(`Already connected to instance: ${instanceId}`);
      return;
    }
    
    setConnectionState(prev => ({
      ...prev,
      isConnecting: true,
      instanceId,
      lastError: null
    }));
    
    try {
      const eventSource = await createSSEConnection(instanceId);
      eventSources.current.set(instanceId, eventSource);
      
      setConnectionState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        connectionHealth: 'healthy',
        instanceId
      }));
      
      performanceMetrics.current.startTime = Date.now();
      
      notifyStateChange(instanceId);
      
    } catch (error) {
      console.error(`Failed to connect to ${instanceId}:`, error);
      
      setConnectionState(prev => ({
        ...prev,
        isConnecting: false,
        lastError: error instanceof Error ? error.message : 'Connection failed'
      }));
      
      // Trigger recovery if auto-reconnect is enabled
      if (config.autoReconnect) {
        await errorRecoveryManager.current.handleConnectionFailure(instanceId, error as Error);
      }
    }
  }, [baseUrl, config]);
  
  /**
   * Disconnect from specific instance
   */
  const disconnectFromInstance = useCallback((instanceId: string): void => {
    const eventSource = eventSources.current.get(instanceId);
    
    if (eventSource) {
      eventSource.close();
      eventSources.current.delete(instanceId);
    }
    
    // Clean up services
    messageProcessor.current?.clearInstance(instanceId);
    uiStateManager.current?.clearInstance(instanceId);
    errorRecoveryManager.current?.clearInstance(instanceId);
    
    setConnectionState(prev => ({
      ...prev,
      isConnected: false,
      connectionHealth: 'failed',
      instanceId: prev.instanceId === instanceId ? null : prev.instanceId
    }));
    
    notifyStateChange(instanceId);
  }, []);
  
  /**
   * Get processed messages for UI display
   */
  const getMessages = useCallback((instanceId: string, batchSize?: number): ProcessedMessage[] => {
    return messageProcessor.current?.getUnprocessedMessages(instanceId, batchSize || config.batchSize) || [];
  }, [config.batchSize]);
  
  /**
   * Get UI state for instance
   */
  const getUIState = useCallback((instanceId: string): UIState | null => {
    return uiStateManager.current?.getState(instanceId) || null;
  }, []);
  
  /**
   * Get scroll state for instance
   */
  const getScrollState = useCallback((instanceId: string): ScrollState | null => {
    return uiStateManager.current?.getScrollState(instanceId) || null;
  }, []);
  
  /**
   * Update scroll position
   */
  const updateScroll = useCallback((instanceId: string, element: HTMLElement): void => {
    uiStateManager.current?.handleScrollUpdate(instanceId, element);
  }, []);
  
  /**
   * Set auto-scroll enabled/disabled
   */
  const setAutoScroll = useCallback((instanceId: string, enabled: boolean): void => {
    uiStateManager.current?.setAutoScroll(instanceId, enabled);
  }, []);
  
  /**
   * Force scroll to bottom
   */
  const scrollToBottom = useCallback((instanceId: string): void => {
    uiStateManager.current?.scrollToBottom(instanceId);
  }, []);
  
  /**
   * Set instance visibility (for performance optimization)
   */
  const setInstanceVisibility = useCallback((instanceId: string, isVisible: boolean): void => {
    uiStateManager.current?.setInstanceVisibility(instanceId, isVisible);
  }, []);
  
  /**
   * Get recovery state
   */
  const getRecoveryState = useCallback((instanceId: string): RecoveryState | null => {
    return errorRecoveryManager.current?.getRecoveryState(instanceId) || null;
  }, []);
  
  /**
   * Force recovery attempt
   */
  const forceRecovery = useCallback(async (instanceId: string): Promise<void> => {
    if (!errorRecoveryManager.current) return;
    
    await errorRecoveryManager.current.forceRecovery(instanceId);
  }, []);
  
  /**
   * Add message handler
   */
  const addMessageHandler = useCallback((handler: MessageHandler): () => void => {
    messageHandlers.current.add(handler);
    return () => messageHandlers.current.delete(handler);
  }, []);
  
  /**
   * Add state change handler
   */
  const addStateChangeHandler = useCallback((handler: StateChangeHandler): () => void => {
    stateChangeHandlers.current.add(handler);
    return () => stateChangeHandlers.current.delete(handler);
  }, []);
  
  /**
   * Get performance metrics
   */
  const getMetrics = useCallback((): ConnectionMetrics => {
    return { ...metrics };
  }, [metrics]);
  
  /**
   * Flush all pending updates immediately
   */
  const flushUpdates = useCallback((): void => {
    uiStateManager.current?.flushUpdates();
  }, []);
  
  /**
   * Create SSE connection with proper error handling
   */
  const createSSEConnection = async (instanceId: string): Promise<EventSource> => {
    const url = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`;
    console.log(`Creating SSE connection for ${instanceId}: ${url}`);
    
    const eventSource = new EventSource(url);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        eventSource.close();
        reject(new Error('Connection timeout'));
      }, 10000); // 10 second timeout
      
      eventSource.onopen = () => {
        clearTimeout(timeout);
        console.log(`SSE connection opened for ${instanceId}`);
        resolve(eventSource);
      };
      
      eventSource.onmessage = (event) => {
        handleSSEMessage(instanceId, event);
      };
      
      eventSource.onerror = (error) => {
        clearTimeout(timeout);
        console.error(`SSE connection error for ${instanceId}:`, error);
        
        if (eventSource.readyState === EventSource.CLOSED) {
          reject(new Error('Connection closed'));
        } else if (eventSource.readyState === EventSource.CONNECTING) {
          // Still trying to connect, don't reject yet
          console.warn(`SSE reconnecting for ${instanceId}`);
        }
        
        // Handle recovery
        if (errorRecoveryManager.current && config.autoReconnect) {
          errorRecoveryManager.current.handleConnectionFailure(instanceId, error);
        }
      };
    });
  };
  
  /**
   * Handle incoming SSE messages
   */
  const handleSSEMessage = (instanceId: string, event: MessageEvent): void => {
    if (!messageProcessor.current || !uiStateManager.current) return;
    
    try {
      const data = JSON.parse(event.data);
      const messageTime = Date.now();
      
      // Track latency if timestamp is provided
      if (data.timestamp) {
        const latency = messageTime - data.timestamp;
        performanceMetrics.current.latencies.push(latency);
        
        // Keep only recent latencies
        if (performanceMetrics.current.latencies.length > 100) {
          performanceMetrics.current.latencies = performanceMetrics.current.latencies.slice(-50);
        }
      }
      
      // Check for sequence gaps
      if (data.sequenceNumber && data.sequenceNumber > connectionState.sequenceNumber + 1) {
        const expectedSequence = connectionState.sequenceNumber + 1;
        console.warn(`Sequence gap detected: expected ${expectedSequence}, received ${data.sequenceNumber}`);
        
        if (errorRecoveryManager.current) {
          errorRecoveryManager.current.handleSequenceGap(instanceId, expectedSequence, data.sequenceNumber);
        }
      }
      
      // Process the message
      const processedMessages = messageProcessor.current.processMessage(instanceId, data);
      
      if (processedMessages.length > 0) {
        // Update UI state
        uiStateManager.current.updateOutput(instanceId, processedMessages);
        
        // Notify message handlers
        notifyMessageHandlers(instanceId, processedMessages);
        
        // Update performance metrics
        performanceMetrics.current.messageCount += processedMessages.length;
        performanceMetrics.current.lastMessageTime = messageTime;
        
        // Update connection state
        setConnectionState(prev => ({
          ...prev,
          sequenceNumber: Math.max(prev.sequenceNumber, data.sequenceNumber || 0),
          connectionHealth: 'healthy'
        }));
      }
      
    } catch (error) {
      console.error(`Error processing SSE message for ${instanceId}:`, error);
    }
  };
  
  /**
   * Setup service event handlers
   */
  const setupServiceEventHandlers = (): void => {
    if (!errorRecoveryManager.current) return;
    
    // Handle recovery state changes
    errorRecoveryManager.current.onRecoveryStateChange((instanceId, recoveryState) => {
      setConnectionState(prev => ({
        ...prev,
        isRecovering: recoveryState.isRecovering,
        lastError: recoveryState.lastError,
        connectionHealth: recoveryState.isRecovering ? 'degraded' : 'healthy'
      }));
      
      if (!recoveryState.isRecovering && recoveryState.lastError === null) {
        // Recovery successful
        setMetrics(prev => ({
          ...prev,
          recoveryCount: prev.recoveryCount + 1,
          lastRecoveryTime: Date.now()
        }));
      }
    });
    
    // Add reconnection handler
    errorRecoveryManager.current.addReconnectionHandler(async (instanceId) => {
      console.log(`Attempting reconnection for ${instanceId}`);
      
      // Close existing connection
      const existingConnection = eventSources.current.get(instanceId);
      if (existingConnection) {
        existingConnection.close();
        eventSources.current.delete(instanceId);
      }
      
      // Create new connection
      const newConnection = await createSSEConnection(instanceId);
      eventSources.current.set(instanceId, newConnection);
      
      console.log(`Reconnection successful for ${instanceId}`);
    });
  };
  
  /**
   * Perform periodic maintenance
   */
  const performMaintenance = (): void => {
    messageProcessor.current?.performMaintenance();
    uiStateManager.current?.performMaintenance();
    errorRecoveryManager.current?.performHealthCheck();
    
    // Update memory usage
    const memoryUsage = (messageProcessor.current?.getMemoryUsage() || 0) + 
                       (uiStateManager.current?.getMetrics().totalMemoryUsage || 0);
    
    setConnectionState(prev => ({
      ...prev,
      memoryUsage: Math.round(memoryUsage / 1024 / 1024) // Convert to MB
    }));
  };
  
  /**
   * Update performance metrics
   */
  const updateMetrics = (): void => {
    const now = Date.now();
    const timeSpan = Math.max(1, (now - performanceMetrics.current.startTime) / 1000); // Avoid division by zero
    const messagesPerSecond = performanceMetrics.current.messageCount / timeSpan;
    
    const averageLatency = performanceMetrics.current.latencies.length > 0 ?
      performanceMetrics.current.latencies.reduce((sum, lat) => sum + lat, 0) / performanceMetrics.current.latencies.length :
      0;
    
    setMetrics(prev => ({
      ...prev,
      totalMessages: performanceMetrics.current.messageCount,
      messagesPerSecond: Math.round(messagesPerSecond * 100) / 100, // Round to 2 decimal places
      averageLatency: Math.round(averageLatency),
      connectionUptime: timeSpan
    }));
    
    setConnectionState(prev => ({
      ...prev,
      messagesPerSecond: Math.round(messagesPerSecond * 100) / 100
    }));
  };
  
  /**
   * Notify message handlers
   */
  const notifyMessageHandlers = (instanceId: string, messages: ProcessedMessage[]): void => {
    messageHandlers.current.forEach(handler => {
      try {
        handler(instanceId, messages);
      } catch (error) {
        console.error('Message handler error:', error);
      }
    });
  };
  
  /**
   * Notify state change handlers
   */
  const notifyStateChange = (instanceId: string): void => {
    stateChangeHandlers.current.forEach(handler => {
      try {
        handler(instanceId, connectionState);
      } catch (error) {
        console.error('State change handler error:', error);
      }
    });
  };
  
  /**
   * Cleanup all resources
   */
  const cleanup = (): void => {
    // Close all connections
    eventSources.current.forEach((eventSource, instanceId) => {
      eventSource.close();
    });
    eventSources.current.clear();
    
    // Shutdown services
    messageProcessor.current?.shutdown?.();
    uiStateManager.current?.shutdown();
    errorRecoveryManager.current?.shutdown();
    
    // Clear handlers
    messageHandlers.current.clear();
    stateChangeHandlers.current.clear();
  };
  
  return {
    // Connection management
    connectToInstance,
    disconnectFromInstance,
    
    // Message and state access
    getMessages,
    getUIState,
    getScrollState,
    
    // UI control
    updateScroll,
    setAutoScroll,
    scrollToBottom,
    setInstanceVisibility,
    
    // Recovery management
    getRecoveryState,
    forceRecovery,
    
    // Event handling
    addMessageHandler,
    addStateChangeHandler,
    
    // Metrics and performance
    getMetrics,
    flushUpdates,
    
    // State
    connectionState,
    metrics,
    
    // Utility
    cleanup
  };
}

export default useAdvancedSSEConnection;