/**
 * useClaudeInstances Hook
 * Comprehensive hook for managing Claude instances with WebSocket integration
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRobustWebSocketContext } from '../components/RobustWebSocketProvider';
import {
  ClaudeInstance,
  ClaudeInstanceConfig,
  ClaudeInstanceStatus,
  ClaudeInstanceCommand,
  ClaudeInstanceMessage,
  ChatMessage,
  ImageAttachment,
  InstanceMetrics,
  UseClaudeInstancesOptions,
  UseClaudeInstancesReturn,
  ClaudeInstanceError,
  InstanceWebSocketEvents
} from '../types/claude-instances';

const DEFAULT_OPTIONS: UseClaudeInstancesOptions = {
  autoConnect: true,
  maxRetries: 3,
  retryInterval: 2000,
  enableMetrics: true
};

export const useClaudeInstances = (
  options: UseClaudeInstancesOptions = {}
): UseClaudeInstancesReturn => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Get WebSocket context
  const {
    socket,
    isConnected,
    emit,
    subscribe,
    unsubscribe,
    connect: wsConnect,
    disconnect: wsDisconnect
  } = useRobustWebSocketContext();

  // State management
  const [instances, setInstances] = useState<ClaudeInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Map<string, ClaudeInstanceMessage[]>>(new Map());
  const [metrics, setMetrics] = useState<Map<string, InstanceMetrics>>(new Map());

  // Refs for stable references
  const retryCount = useRef<number>(0);
  const messageHandlers = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  // Computed values
  const selectedInstance = useMemo(() => {
    return instances.find(instance => instance.id === selectedInstanceId) || null;
  }, [instances, selectedInstanceId]);

  // Initialize WebSocket event listeners
  useEffect(() => {
    if (!socket) return;

    const eventHandlers = {
      'instances:list': (instanceList: ClaudeInstance[]) => {
        console.log('Received instances list:', instanceList);
        setInstances(instanceList);
        setError(null);
      },

      'instance:created': (instance: ClaudeInstance) => {
        console.log('Instance created:', instance);
        setInstances(prev => [...prev, instance]);
      },

      'instance:started': (status: ClaudeInstanceStatus) => {
        console.log('Instance started:', status);
        setInstances(prev => 
          prev.map(instance => 
            instance.id === status.id 
              ? { ...instance, ...status, isConnected: true }
              : instance
          )
        );
      },

      'instance:stopped': (status: ClaudeInstanceStatus) => {
        console.log('Instance stopped:', status);
        setInstances(prev => 
          prev.map(instance => 
            instance.id === status.id 
              ? { ...instance, ...status, isConnected: false }
              : instance
          )
        );
      },

      'instance:error': ({ instanceId, error: instanceError }: { instanceId: string; error: string }) => {
        console.error('Instance error:', instanceId, instanceError);
        setInstances(prev => 
          prev.map(instance => 
            instance.id === instanceId 
              ? { ...instance, status: 'error', lastError: instanceError, isConnected: false }
              : instance
          )
        );
        setError(`Instance ${instanceId}: ${instanceError}`);
      },

      'instance:status': (status: ClaudeInstanceStatus) => {
        setInstances(prev => 
          prev.map(instance => 
            instance.id === status.id 
              ? { ...instance, ...status }
              : instance
          )
        );
      },

      'instance:output': (message: ClaudeInstanceMessage) => {
        setMessages(prev => {
          const instanceMessages = prev.get(message.instanceId) || [];
          const newMessages = [...instanceMessages, message];
          const updated = new Map(prev);
          updated.set(message.instanceId, newMessages);
          return updated;
        });

        // Update instance with output flag
        setInstances(prev => 
          prev.map(instance => 
            instance.id === message.instanceId 
              ? { ...instance, hasOutput: true, lastActivity: new Date() }
              : instance
          )
        );
      },

      'chat:message': (message: ChatMessage) => {
        setMessages(prev => {
          const instanceMessages = prev.get(message.instanceId) || [];
          const newMessages = [...instanceMessages, message];
          const updated = new Map(prev);
          updated.set(message.instanceId, newMessages);
          return updated;
        });
      },

      'metrics:update': (metric: InstanceMetrics) => {
        if (opts.enableMetrics) {
          setMetrics(prev => {
            const updated = new Map(prev);
            updated.set(metric.instanceId, metric);
            return updated;
          });
        }
      }
    };

    // Subscribe to all events
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      subscribe(event as keyof InstanceWebSocketEvents, handler);
    });

    // Request initial data if connected
    if (isConnected) {
      requestInstancesList();
    }

    // Cleanup
    return () => {
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        unsubscribe(event as keyof InstanceWebSocketEvents, handler);
      });
    };
  }, [socket, isConnected, opts.enableMetrics, subscribe, unsubscribe]);

  // Request instances list from server
  const requestInstancesList = useCallback(() => {
    if (socket && isConnected) {
      emit('instances:list');
    }
  }, [socket, isConnected, emit]);

  // Instance management functions
  const createInstance = useCallback(async (config: Partial<ClaudeInstanceConfig>): Promise<ClaudeInstance> => {
    setIsLoading(true);
    setError(null);

    try {
      const instanceConfig: ClaudeInstanceConfig = {
        id: `instance-${Date.now()}`,
        name: config.name || 'New Claude Instance',
        description: config.description,
        workingDirectory: config.workingDirectory || '/workspaces/agent-feed',
        autoRestart: config.autoRestart || false,
        autoRestartHours: config.autoRestartHours || 6,
        skipPermissions: config.skipPermissions || false,
        resumeSession: config.resumeSession || false,
        useProductionMode: config.useProductionMode || false
      };

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new ClaudeInstanceError('Create instance timeout', instanceConfig.id));
        }, 30000);

        const handleCreated = (instance: ClaudeInstance) => {
          clearTimeout(timeout);
          unsubscribe('instance:created', handleCreated);
          unsubscribe('instance:error', handleError);
          resolve(instance);
        };

        const handleError = ({ instanceId, error: instanceError }: { instanceId: string; error: string }) => {
          if (instanceId === instanceConfig.id) {
            clearTimeout(timeout);
            unsubscribe('instance:created', handleCreated);
            unsubscribe('instance:error', handleError);
            reject(new ClaudeInstanceError(instanceError, instanceId));
          }
        };

        subscribe('instance:created', handleCreated);
        subscribe('instance:error', handleError);

        emit('instance:create', instanceConfig);
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create instance';
      setError(error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [socket, emit, subscribe, unsubscribe]);

  const startInstance = useCallback(async (instanceId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new ClaudeInstanceError('Start instance timeout', instanceId));
        }, 30000);

        const handleStarted = (status: ClaudeInstanceStatus) => {
          if (status.id === instanceId) {
            clearTimeout(timeout);
            unsubscribe('instance:started', handleStarted);
            unsubscribe('instance:error', handleError);
            resolve();
          }
        };

        const handleError = ({ instanceId: errorInstanceId, error: instanceError }: { instanceId: string; error: string }) => {
          if (errorInstanceId === instanceId) {
            clearTimeout(timeout);
            unsubscribe('instance:started', handleStarted);
            unsubscribe('instance:error', handleError);
            reject(new ClaudeInstanceError(instanceError, instanceId));
          }
        };

        subscribe('instance:started', handleStarted);
        subscribe('instance:error', handleError);

        emit('instance:start', { instanceId });
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to start instance';
      setError(error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [emit, subscribe, unsubscribe]);

  const stopInstance = useCallback(async (instanceId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new ClaudeInstanceError('Stop instance timeout', instanceId));
        }, 15000);

        const handleStopped = (status: ClaudeInstanceStatus) => {
          if (status.id === instanceId) {
            clearTimeout(timeout);
            unsubscribe('instance:stopped', handleStopped);
            unsubscribe('instance:error', handleError);
            resolve();
          }
        };

        const handleError = ({ instanceId: errorInstanceId, error: instanceError }: { instanceId: string; error: string }) => {
          if (errorInstanceId === instanceId) {
            clearTimeout(timeout);
            unsubscribe('instance:stopped', handleStopped);
            unsubscribe('instance:error', handleError);
            reject(new ClaudeInstanceError(instanceError, instanceId));
          }
        };

        subscribe('instance:stopped', handleStopped);
        subscribe('instance:error', handleError);

        emit('instance:stop', { instanceId });
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to stop instance';
      setError(error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [emit, subscribe, unsubscribe]);

  const restartInstance = useCallback(async (instanceId: string): Promise<void> => {
    await stopInstance(instanceId);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    await startInstance(instanceId);
  }, [startInstance, stopInstance]);

  const deleteInstance = useCallback(async (instanceId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Stop instance first if running
      const instance = instances.find(i => i.id === instanceId);
      if (instance && instance.status === 'running') {
        await stopInstance(instanceId);
      }

      emit('instance:delete', { instanceId });
      
      // Remove from local state
      setInstances(prev => prev.filter(i => i.id !== instanceId));
      setMessages(prev => {
        const updated = new Map(prev);
        updated.delete(instanceId);
        return updated;
      });
      setMetrics(prev => {
        const updated = new Map(prev);
        updated.delete(instanceId);
        return updated;
      });

      if (selectedInstanceId === instanceId) {
        setSelectedInstanceId(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete instance';
      setError(error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [instances, selectedInstanceId, stopInstance, emit]);

  const selectInstance = useCallback((instanceId: string | null) => {
    setSelectedInstanceId(instanceId);
  }, []);

  // Communication functions
  const sendCommand = useCallback(async (instanceId: string, command: ClaudeInstanceCommand): Promise<void> => {
    if (!socket || !isConnected) {
      throw new ClaudeInstanceError('Not connected to server', instanceId);
    }

    emit('instance:command', {
      instanceId,
      command
    });
  }, [socket, isConnected, emit]);

  const sendMessage = useCallback(async (instanceId: string, message: string, images?: ImageAttachment[]): Promise<void> => {
    if (!socket || !isConnected) {
      throw new ClaudeInstanceError('Not connected to server', instanceId);
    }

    const chatMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      instanceId,
      type: 'user',
      role: 'user',
      content: message,
      timestamp: new Date(),
      images
    };

    emit('chat:message', chatMessage);

    // Add to local messages
    setMessages(prev => {
      const instanceMessages = prev.get(instanceId) || [];
      const newMessages = [...instanceMessages, chatMessage];
      const updated = new Map(prev);
      updated.set(instanceId, newMessages);
      return updated;
    });
  }, [socket, isConnected, emit]);

  // Data access functions
  const getInstanceStatus = useCallback((instanceId: string): ClaudeInstanceStatus | null => {
    const instance = instances.find(i => i.id === instanceId);
    if (!instance) return null;

    return {
      id: instance.id,
      status: instance.status,
      pid: instance.pid,
      startTime: instance.startTime,
      lastActivity: instance.lastActivity,
      cpuUsage: instance.cpuUsage,
      memoryUsage: instance.memoryUsage,
      uptime: instance.uptime,
      connectionCount: instance.connectionCount,
      lastError: instance.lastError
    };
  }, [instances]);

  const getInstanceMessages = useCallback((instanceId: string, limit?: number): ClaudeInstanceMessage[] => {
    const instanceMessages = messages.get(instanceId) || [];
    return limit ? instanceMessages.slice(-limit) : instanceMessages;
  }, [messages]);

  const getInstanceMetrics = useCallback((instanceId: string): InstanceMetrics | null => {
    return metrics.get(instanceId) || null;
  }, [metrics]);

  // Connection management
  const connect = useCallback(async (): Promise<void> => {
    try {
      await wsConnect();
      retryCount.current = 0;
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Connection failed';
      setError(error);
      
      // Retry logic
      if (retryCount.current < opts.maxRetries!) {
        retryCount.current++;
        setTimeout(() => connect(), opts.retryInterval!);
      }
    }
  }, [wsConnect, opts.maxRetries, opts.retryInterval]);

  const disconnect = useCallback(() => {
    wsDisconnect();
  }, [wsDisconnect]);

  // Auto-connect on mount
  useEffect(() => {
    if (opts.autoConnect && !isConnected) {
      connect();
    }
  }, [opts.autoConnect, isConnected, connect]);

  return {
    instances,
    selectedInstance,
    isConnected,
    isLoading,
    error,

    createInstance,
    startInstance,
    stopInstance,
    restartInstance,
    deleteInstance,
    selectInstance,

    sendCommand,
    sendMessage,

    getInstanceStatus,
    getInstanceMessages,
    getInstanceMetrics,

    connect,
    disconnect,
    emit,
    subscribe,
    unsubscribe
  };
};

export default useClaudeInstances;