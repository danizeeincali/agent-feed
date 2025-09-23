/**
 * useSSEClaudeManager - React hook for SSE-based Claude instance management
 * 
 * Provides a complete interface for managing Claude instances using HTTP+SSE architecture.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { SSEClaudeInstanceManager, SSEConnectionState, TerminalMessage } from '../services/SSEClaudeInstanceManager';
import { HTTPCommandService, InstanceConfig, InstanceInfo } from '../services/HTTPCommandService';

export interface UseSSEClaudeManagerConfig {
  apiBaseUrl: string;
  sseEndpoint?: string;
  inputEndpoint?: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  bufferSize?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
  commandTimeout?: number;
  autoConnect?: boolean;
}

export interface UseSSEClaudeManagerReturn {
  // Connection State
  connectionState: SSEConnectionState;
  isConnected: boolean;
  error: string | null;
  
  // Messages and History
  messages: TerminalMessage[];
  messageHistory: TerminalMessage[];
  
  // Instance Management
  instances: InstanceInfo[];
  selectedInstance: InstanceInfo | null;
  
  // Loading States
  connecting: boolean;
  sendingCommand: boolean;
  creatingInstance: boolean;
  terminatingInstance: boolean;
  
  // Actions
  connect: (instanceId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  sendInput: (input: string) => Promise<void>;
  
  // Instance Management
  createInstance: (config: InstanceConfig) => Promise<InstanceInfo>;
  terminateInstance: (instanceId: string) => Promise<void>;
  refreshInstances: () => Promise<void>;
  selectInstance: (instance: InstanceInfo | null) => void;
  
  // History Management
  clearHistory: () => void;
  getHistory: (limit?: number) => TerminalMessage[];
  
  // Statistics
  getStatistics: () => Record<string, any>;
}

export const useSSEClaudeManager = (config: UseSSEClaudeManagerConfig): UseSSEClaudeManagerReturn => {
  // Refs for service instances
  const managerRef = useRef<SSEClaudeInstanceManager | null>(null);
  const commandServiceRef = useRef<HTTPCommandService | null>(null);
  
  // State
  const [connectionState, setConnectionState] = useState<SSEConnectionState>(SSEConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<TerminalMessage[]>([]);
  const [messageHistory, setMessageHistory] = useState<TerminalMessage[]>([]);
  const [instances, setInstances] = useState<InstanceInfo[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<InstanceInfo | null>(null);
  
  // Loading states
  const [connecting, setConnecting] = useState(false);
  const [sendingCommand, setSendingCommand] = useState(false);
  const [creatingInstance, setCreatingInstance] = useState(false);
  const [terminatingInstance, setTerminatingInstance] = useState(false);
  
  // Initialize services
  useEffect(() => {
    const sseConfig = {
      apiBaseUrl: config.apiBaseUrl,
      sseEndpoint: config.sseEndpoint || '/api/claude/instances/{instanceId}/terminal/stream',
      inputEndpoint: config.inputEndpoint || '/api/claude/instances/{instanceId}/terminal/input',
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      reconnectDelay: config.reconnectDelay || 1000,
      bufferSize: config.bufferSize || 1000,
      heartbeatInterval: config.heartbeatInterval || 30000,
      connectionTimeout: config.connectionTimeout || 10000,
      commandTimeout: config.commandTimeout || 30000
    };
    
    const commandConfig = {
      baseUrl: config.apiBaseUrl,
      timeout: config.commandTimeout || 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      maxRetryDelay: 10000
    };
    
    managerRef.current = new SSEClaudeInstanceManager(sseConfig);
    commandServiceRef.current = new HTTPCommandService(commandConfig);
    
    return () => {
      if (managerRef.current) {
        managerRef.current.cleanup();
      }
    };
  }, [config]);
  
  // Setup event listeners
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;
    
    const handleStateChange = ({ newState }: { newState: SSEConnectionState }) => {
      setConnectionState(newState);
      setConnecting(newState === SSEConnectionState.CONNECTING || 
                   newState === SSEConnectionState.RECONNECTING);
    };
    
    const handleConnected = () => {
      setError(null);
      setConnecting(false);
    };
    
    const handleDisconnected = () => {
      setConnecting(false);
    };
    
    const handleConnectionError = ({ error }: { error: string }) => {
      setError(error);
      setConnecting(false);
    };
    
    const handleTerminalOutput = ({ content, timestamp, isReal }: { 
      content: string; 
      timestamp: Date; 
      isReal?: boolean; 
    }) => {
      const message: TerminalMessage = {
        id: `output-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        instanceId: selectedInstance?.id || '',
        type: 'output',
        content,
        timestamp,
        sequenceId: messages.length,
        isReal
      };
      
      setMessages(prev => [...prev, message]);
    };
    
    const handleCommandSent = ({ input }: { input: string }) => {
      const message: TerminalMessage = {
        id: `input-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        instanceId: selectedInstance?.id || '',
        type: 'input',
        content: `> ${input}\n`,
        timestamp: new Date(),
        sequenceId: messages.length,
        isReal: true
      };
      
      setMessages(prev => [...prev, message]);
    };
    
    // Add event listeners
    manager.on('stateChange', handleStateChange);
    manager.on('connected', handleConnected);
    manager.on('disconnected', handleDisconnected);
    manager.on('connectionError', handleConnectionError);
    manager.on('terminalOutput', handleTerminalOutput);
    manager.on('commandSent', handleCommandSent);
    
    return () => {
      manager.off('stateChange', handleStateChange);
      manager.off('connected', handleConnected);
      manager.off('disconnected', handleDisconnected);
      manager.off('connectionError', handleConnectionError);
      manager.off('terminalOutput', handleTerminalOutput);
      manager.off('commandSent', handleCommandSent);
    };
  }, [selectedInstance, messages.length]);
  
  // Update message history when messages change
  useEffect(() => {
    setMessageHistory([...messages]);
  }, [messages]);
  
  // Connect to instance
  const connect = useCallback(async (instanceId: string) => {
    if (!managerRef.current) {
      throw new Error('Manager not initialized');
    }
    
    try {
      setConnecting(true);
      setError(null);
      await managerRef.current.connect(instanceId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setError(errorMessage);
      throw error;
    } finally {
      setConnecting(false);
    }
  }, []);
  
  // Disconnect from instance
  const disconnect = useCallback(async () => {
    if (!managerRef.current) return;
    
    try {
      await managerRef.current.disconnect();
      setMessages([]);
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }, []);
  
  // Send input to instance
  const sendInput = useCallback(async (input: string) => {
    if (!managerRef.current) {
      throw new Error('Manager not initialized');
    }
    
    if (!input.trim()) {
      return;
    }
    
    try {
      setSendingCommand(true);
      setError(null);
      await managerRef.current.sendInput(input);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Command failed';
      setError(errorMessage);
      throw error;
    } finally {
      setSendingCommand(false);
    }
  }, []);
  
  // Create new instance
  const createInstance = useCallback(async (instanceConfig: InstanceConfig): Promise<InstanceInfo> => {
    if (!commandServiceRef.current) {
      throw new Error('Command service not initialized');
    }
    
    try {
      setCreatingInstance(true);
      setError(null);
      const instance = await commandServiceRef.current.createInstance(instanceConfig);
      await refreshInstances();
      return instance;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Instance creation failed';
      setError(errorMessage);
      throw error;
    } finally {
      setCreatingInstance(false);
    }
  }, []);
  
  // Terminate instance
  const terminateInstance = useCallback(async (instanceId: string) => {
    if (!commandServiceRef.current) {
      throw new Error('Command service not initialized');
    }
    
    try {
      setTerminatingInstance(true);
      setError(null);
      
      // Disconnect if this is the selected instance
      if (selectedInstance?.id === instanceId) {
        await disconnect();
        setSelectedInstance(null);
      }
      
      await commandServiceRef.current.terminateInstance(instanceId);
      await refreshInstances();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Instance termination failed';
      setError(errorMessage);
      throw error;
    } finally {
      setTerminatingInstance(false);
    }
  }, [selectedInstance, disconnect]);
  
  // Refresh instances list
  const refreshInstances = useCallback(async () => {
    if (!commandServiceRef.current) return;
    
    try {
      const instanceList = await commandServiceRef.current.listInstances();
      setInstances(instanceList);
    } catch (error) {
      console.error('Failed to refresh instances:', error);
    }
  }, []);
  
  // Select instance
  const selectInstance = useCallback((instance: InstanceInfo | null) => {
    setSelectedInstance(instance);
    setMessages([]); // Clear messages when switching instances
  }, []);
  
  // Clear history
  const clearHistory = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.clearHistory();
    }
    setMessages([]);
    setMessageHistory([]);
  }, []);
  
  // Get history
  const getHistory = useCallback((limit?: number): TerminalMessage[] => {
    if (!managerRef.current) {
      return limit ? messageHistory.slice(-limit) : messageHistory;
    }
    return managerRef.current.getMessageHistory(limit);
  }, [messageHistory]);
  
  // Get statistics
  const getStatistics = useCallback(() => {
    return managerRef.current?.getStatistics() || {};
  }, []);
  
  // Auto-refresh instances
  useEffect(() => {
    refreshInstances();
    
    const interval = setInterval(refreshInstances, 5000);
    return () => clearInterval(interval);
  }, [refreshInstances]);
  
  // Auto-connect if configured
  useEffect(() => {
    if (config.autoConnect && selectedInstance && connectionState === SSEConnectionState.DISCONNECTED) {
      connect(selectedInstance.id).catch(console.error);
    }
  }, [config.autoConnect, selectedInstance, connectionState, connect]);
  
  return {
    // Connection State
    connectionState,
    isConnected: connectionState === SSEConnectionState.CONNECTED,
    error,
    
    // Messages and History
    messages,
    messageHistory,
    
    // Instance Management
    instances,
    selectedInstance,
    
    // Loading States
    connecting,
    sendingCommand,
    creatingInstance,
    terminatingInstance,
    
    // Actions
    connect,
    disconnect,
    sendInput,
    
    // Instance Management
    createInstance,
    terminateInstance,
    refreshInstances,
    selectInstance,
    
    // History Management
    clearHistory,
    getHistory,
    
    // Statistics
    getStatistics
  };
};