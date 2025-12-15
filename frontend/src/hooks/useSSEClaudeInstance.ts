/**
 * useSSEClaudeInstance - React Hook for SSE-based Claude Instance Management
 * 
 * This hook provides React integration for the SSEClaudeInstanceManager,
 * offering reactive state management and lifecycle handling for SSE connections.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SSEClaudeInstanceManager, SSEClaudeInstanceConfig, ConnectionState, InstanceOutputMessage } from '../managers/ClaudeInstanceManager';

export interface UseSSEClaudeInstanceOptions extends Omit<SSEClaudeInstanceConfig, 'instanceId'> {
  instanceId?: string;
  autoConnect?: boolean;
}

export interface UseSSEClaudeInstanceReturn {
  // Connection management
  manager: SSEClaudeInstanceManager;
  isConnected: boolean;
  connectionState: ConnectionState;
  connectionError: string | null;
  
  // Instance management
  availableInstances: any[];
  selectedInstanceId: string | null;
  output: InstanceOutputMessage[];
  
  // Actions
  connectToInstance: (instanceId: string) => Promise<void>;
  disconnectFromInstance: (instanceId?: string) => Promise<void>;
  sendCommand: (instanceId: string, command: string) => Promise<void>;
  refreshInstances: () => Promise<void>;
  clearOutput: (instanceId: string) => void;
  
  // State
  loading: boolean;
  messageCount: number;
  lastActivity: Date | null;
}

export const useSSEClaudeInstance = (options: UseSSEClaudeInstanceOptions = {}): UseSSEClaudeInstanceReturn => {
  const {
    instanceId: initialInstanceId,
    autoConnect = false,
    apiUrl = 'http://localhost:3000',
    reconnectAttempts = 5,
    reconnectInterval = 2000,
    maxBackoffDelay = 30000
  } = options;

  // Create manager instance (stable reference)
  const managerRef = useRef<SSEClaudeInstanceManager | null>(null);
  if (!managerRef.current) {
    managerRef.current = new SSEClaudeInstanceManager({
      apiUrl,
      reconnectAttempts,
      reconnectInterval,
      maxBackoffDelay
    });
  }

  const manager = managerRef.current;

  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [availableInstances, setAvailableInstances] = useState<any[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(initialInstanceId || null);
  const [output, setOutput] = useState<InstanceOutputMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);

  // Event handlers
  const handleInstanceConnected = useCallback(({ instanceId }: { instanceId: string }) => {
    console.log('Instance connected:', instanceId);
    setConnectionError(null);
    setIsConnected(true);
    setConnectionState(ConnectionState.CONNECTED);
    
    if (selectedInstanceId === instanceId) {
      // Clear output for newly connected instance
      setOutput([]);
    }
  }, [selectedInstanceId]);

  const handleInstanceDisconnected = useCallback(({ instanceId }: { instanceId: string }) => {
    console.log('Instance disconnected:', instanceId);
    setIsConnected(false);
    setConnectionState(ConnectionState.DISCONNECTED);
  }, []);

  const handleInstanceOutput = useCallback(({ instanceId, content, isReal, timestamp }: {
    instanceId: string;
    content: string;
    isReal?: boolean;
    timestamp?: string;
  }) => {
    if (instanceId === selectedInstanceId) {
      const outputMessage: InstanceOutputMessage = {
        id: `output-${Date.now()}-${Math.random()}`,
        instanceId,
        type: 'output',
        content,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        isReal
      };

      setOutput(prev => [...prev, outputMessage]);
      setMessageCount(prev => prev + 1);
      setLastActivity(new Date());
    }
  }, [selectedInstanceId]);

  const handleInstanceError = useCallback(({ instanceId, error }: { instanceId: string; error: string }) => {
    console.error(`Instance ${instanceId} error:`, error);
    setConnectionError(error);
    setConnectionState(ConnectionState.ERROR);
  }, []);

  const handleConnectionStateChange = useCallback(({ instanceId, state }: { instanceId: string; state: ConnectionState }) => {
    if (instanceId === selectedInstanceId) {
      setConnectionState(state);
      setIsConnected(state === ConnectionState.CONNECTED);
    }
  }, [selectedInstanceId]);

  // Setup event listeners
  useEffect(() => {
    manager.on('instance:connected', handleInstanceConnected);
    manager.on('instance:disconnected', handleInstanceDisconnected);
    manager.on('instance:output', handleInstanceOutput);
    manager.on('instance:error', handleInstanceError);
    manager.on('connection:state_change', handleConnectionStateChange);

    return () => {
      manager.off('instance:connected', handleInstanceConnected);
      manager.off('instance:disconnected', handleInstanceDisconnected);
      manager.off('instance:output', handleInstanceOutput);
      manager.off('instance:error', handleInstanceError);
      manager.off('connection:state_change', handleConnectionStateChange);
    };
  }, [
    manager,
    handleInstanceConnected,
    handleInstanceDisconnected,
    handleInstanceOutput,
    handleInstanceError,
    handleConnectionStateChange
  ]);

  // Refresh available instances
  const refreshInstances = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch full instance objects with PIDs instead of just IDs
      const response = await fetch(`${apiUrl}/api/claude/instances`);
      const data = await response.json();
      
      if (data.success && data.instances) {
        const runningInstances = data.instances.filter((i: any) => i.status === 'running');
        setAvailableInstances(runningInstances);
      } else {
        setAvailableInstances([]);
      }
      
      setConnectionError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch instances';
      setConnectionError(errorMessage);
      console.error('Failed to refresh instances:', error);
      setAvailableInstances([]);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  // Connect to instance
  const connectToInstance = useCallback(async (instanceId: string) => {
    try {
      setLoading(true);
      setConnectionError(null);
      setSelectedInstanceId(instanceId);
      
      await manager.connectToInstance(instanceId);
      
      // Clear output for this instance
      setOutput([]);
      setMessageCount(0);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setConnectionError(errorMessage);
      console.error('Failed to connect to instance:', error);
    } finally {
      setLoading(false);
    }
  }, [manager]);

  // Disconnect from instance
  const disconnectFromInstance = useCallback(async (instanceId?: string) => {
    try {
      setLoading(true);
      await manager.disconnectFromInstance(instanceId);
      
      if (!instanceId || instanceId === selectedInstanceId) {
        setSelectedInstanceId(null);
        setOutput([]);
        setMessageCount(0);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Disconnect failed';
      setConnectionError(errorMessage);
      console.error('Failed to disconnect:', error);
    } finally {
      setLoading(false);
    }
  }, [manager, selectedInstanceId]);

  // Send command
  const sendCommand = useCallback(async (instanceId: string, command: string) => {
    if (!command.trim()) return;

    try {
      setConnectionError(null);
      
      // Add input to output immediately
      const inputMessage: InstanceOutputMessage = {
        id: `input-${Date.now()}`,
        instanceId,
        type: 'input',
        content: `> ${command}\n`,
        timestamp: new Date(),
        isReal: true
      };
      
      if (instanceId === selectedInstanceId) {
        setOutput(prev => [...prev, inputMessage]);
        setMessageCount(prev => prev + 1);
      }
      
      const result = await manager.sendCommand(instanceId, command);
      
      if (!result.success && result.error) {
        setConnectionError(result.error);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Command failed';
      setConnectionError(errorMessage);
      console.error('Failed to send command:', error);
    }
  }, [manager, selectedInstanceId]);

  // Clear output
  const clearOutput = useCallback((instanceId: string) => {
    manager.clearInstanceOutput(instanceId);
    if (instanceId === selectedInstanceId) {
      setOutput([]);
      setMessageCount(0);
    }
  }, [manager, selectedInstanceId]);

  // Auto-connect on mount if specified
  useEffect(() => {
    if (autoConnect && initialInstanceId) {
      connectToInstance(initialInstanceId);
    }
    
    // Refresh instances on mount
    refreshInstances();
  }, [autoConnect, initialInstanceId, connectToInstance, refreshInstances]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      manager.cleanup();
    };
  }, [manager]);

  // Update connection status when selected instance changes
  useEffect(() => {
    if (selectedInstanceId) {
      const status = manager.getConnectionStatus(selectedInstanceId);
      setIsConnected(status.isConnected);
      setConnectionState(status.state);
      
      // Load existing output for this instance
      const existingOutput = manager.getInstanceOutput(selectedInstanceId);
      setOutput(existingOutput);
      setMessageCount(existingOutput.length);
      
      if (status.connectionStats) {
        setLastActivity(status.connectionStats.lastActivity);
      }
    } else {
      setIsConnected(false);
      setConnectionState(ConnectionState.DISCONNECTED);
      setOutput([]);
      setMessageCount(0);
      setLastActivity(null);
    }
  }, [selectedInstanceId, manager]);

  return {
    manager,
    isConnected,
    connectionState,
    connectionError,
    availableInstances,
    selectedInstanceId,
    output,
    connectToInstance,
    disconnectFromInstance,
    sendCommand,
    refreshInstances,
    clearOutput,
    loading,
    messageCount,
    lastActivity
  };
};

export default useSSEClaudeInstance;