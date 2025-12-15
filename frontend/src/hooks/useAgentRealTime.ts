/**
 * useAgentRealTime - Hook for real-time agent data updates
 * Phase 2: WebSocket integration for live agent status and metrics
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface Agent {
  id: string;
  name: string;
  description: string;
  status: string;
  version: string;
  isActive: boolean;
  metadata?: {
    lastActive?: string;
    fileCount?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

interface UseAgentRealTimeOptions {
  enableRealTime?: boolean;
  pollingInterval?: number;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

interface UseAgentRealTimeReturn {
  agents: Agent[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  refetch: () => Promise<void>;
}

const DEFAULT_OPTIONS: UseAgentRealTimeOptions = {
  enableRealTime: true,
  pollingInterval: 30000, // 30 seconds
  reconnectAttempts: 3,
  reconnectDelay: 5000 // 5 seconds
};

export const useAgentRealTime = (
  options: UseAgentRealTimeOptions = {}
): UseAgentRealTimeReturn => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // State management
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Refs for cleanup and connection management
  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch agents from REST API
   */
  const fetchAgents = useCallback(async (): Promise<Agent[]> => {
    try {
      const response = await fetch('/api/agents');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const agentsList = Array.isArray(data) ? data : data.agents || [];
      
      return agentsList;
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      throw err;
    }
  }, []);

  /**
   * Update agent data and state
   */
  const updateAgents = useCallback((newAgents: Agent[]) => {
    setAgents(newAgents);
    setLastUpdated(new Date());
    setError(null);
  }, []);

  /**
   * Handle WebSocket connection
   */
  const connectWebSocket = useCallback(() => {
    if (!opts.enableRealTime) return;

    try {
      // Determine WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/agents/live`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected for agent updates');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        
        // Request initial data
        ws.send(JSON.stringify({ type: 'subscribe', resource: 'agents' }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'agents_update':
              updateAgents(message.data);
              break;
            case 'agent_status_change':
              setAgents(prev => prev.map(agent => 
                agent.id === message.data.id 
                  ? { ...agent, ...message.data }
                  : agent
              ));
              setLastUpdated(new Date());
              break;
            case 'agent_metrics':
              setAgents(prev => prev.map(agent => 
                agent.id === message.data.id 
                  ? { 
                      ...agent, 
                      metadata: { 
                        ...agent.metadata, 
                        ...message.data.metrics 
                      } 
                    }
                  : agent
              ));
              setLastUpdated(new Date());
              break;
            default:
              console.log('Unknown WebSocket message type:', message.type);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnection if not intentional close
        if (event.code !== 1000 && reconnectAttemptsRef.current < opts.reconnectAttempts!) {
          reconnectAttemptsRef.current++;
          console.log(`Attempting WebSocket reconnection ${reconnectAttemptsRef.current}/${opts.reconnectAttempts}`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, opts.reconnectDelay);
        } else if (reconnectAttemptsRef.current >= opts.reconnectAttempts!) {
          setError('WebSocket connection failed after multiple attempts');
        }
      };

    } catch (err) {
      console.error('Failed to establish WebSocket connection:', err);
      setError('Failed to establish WebSocket connection');
    }
  }, [opts.enableRealTime, opts.reconnectAttempts, opts.reconnectDelay, updateAgents]);

  /**
   * Setup polling fallback
   */
  const setupPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      try {
        const agentsList = await fetchAgents();
        updateAgents(agentsList);
      } catch (err) {
        console.error('Polling failed:', err);
        // Don't update error state for polling failures if WebSocket is working
        if (!isConnected) {
          setError(err instanceof Error ? err.message : 'Failed to fetch agents');
        }
      }
    }, opts.pollingInterval);
  }, [fetchAgents, updateAgents, isConnected, opts.pollingInterval]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const agentsList = await fetchAgents();
      updateAgents(agentsList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  }, [fetchAgents, updateAgents]);

  // Alias for refresh
  const refetch = refresh;

  /**
   * Cleanup function
   */
  const cleanup = useCallback(() => {
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }

    // Clear polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Initialize data and connections
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        // Initial data fetch
        const agentsList = await fetchAgents();
        if (mounted) {
          updateAgents(agentsList);
          setLoading(false);
        }

        // Setup real-time connections
        if (opts.enableRealTime && mounted) {
          connectWebSocket();
        }

        // Setup polling as fallback
        if (mounted) {
          setupPolling();
        }

      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize');
          setLoading(false);
          
          // Still setup polling for fallback
          setupPolling();
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [fetchAgents, updateAgents, connectWebSocket, setupPolling, cleanup, opts.enableRealTime]);

  return {
    agents,
    loading,
    error,
    isConnected,
    lastUpdated,
    refresh,
    refetch
  };
};