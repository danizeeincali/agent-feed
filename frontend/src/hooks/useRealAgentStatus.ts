import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { apiService } from '../services/api';

export interface AgentStatus {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'busy' | 'offline';
  lastActive: string;
  currentTask?: string;
  workload: {
    activeTasks: number;
    queuedTasks: number;
    completedToday: number;
  };
  performance: {
    successRate: number;
    averageResponseTime: number;
    tasksCompleted: number;
  };
  capabilities: string[];
  health: {
    cpuUsage: number;
    memoryUsage: number;
    uptime: number;
  };
}

export interface AgentMetrics {
  totalAgents: number;
  activeAgents: number;
  busyAgents: number;
  idleAgents: number;
  offlineAgents: number;
  totalTasks: number;
  completedTasks: number;
  averageResponseTime: number;
  systemLoad: number;
}

interface UseRealAgentStatusOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
  includeMetrics?: boolean;
  useRealTimeUpdates?: boolean;
}

interface UseRealAgentStatusReturn {
  agents: AgentStatus[];
  metrics: AgentMetrics | null;
  loading: boolean;
  error: string | null;
  refreshAgents: () => Promise<void>;
  getAgentById: (id: string) => AgentStatus | undefined;
  getAgentsByStatus: (status: AgentStatus['status']) => AgentStatus[];
  updateAgentStatus: (agentId: string, status: AgentStatus['status']) => void;
  subscribeToAgent: (agentId: string, callback: (agent: AgentStatus) => void) => () => void;
}

export const useRealAgentStatus = (options: UseRealAgentStatusOptions = {}): UseRealAgentStatusReturn => {
  const {
    refreshInterval = 30000,
    autoRefresh = true,
    includeMetrics = true,
    useRealTimeUpdates = true
  } = options;

  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isConnected, subscribe } = useWebSocket({
    autoConnect: useRealTimeUpdates
  });

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use real API service for production data
      const response = await apiService.getAgents();
      
      if (response.success && response.data) {
        setAgents(response.data);
        
        if (includeMetrics) {
          // Get metrics from separate endpoint
          try {
            const metricsResponse = await fetch('/api/v1/agents/metrics');
            if (metricsResponse.ok) {
              const metricsData = await metricsResponse.json();
              if (metricsData.success) {
                setMetrics(metricsData.data);
              }
            } else {
              // Calculate metrics from agent data if endpoint unavailable
              const calculatedMetrics: AgentMetrics = {
                totalAgents: response.data.length,
                activeAgents: response.data.filter((a: AgentStatus) => a.status === 'active').length,
                busyAgents: response.data.filter((a: AgentStatus) => a.status === 'busy').length,
                idleAgents: response.data.filter((a: AgentStatus) => a.status === 'idle').length,
                offlineAgents: response.data.filter((a: AgentStatus) => a.status === 'offline').length,
                totalTasks: response.data.reduce((sum: number, a: AgentStatus) => sum + a.workload.activeTasks + a.workload.queuedTasks, 0),
                completedTasks: response.data.reduce((sum: number, a: AgentStatus) => sum + a.workload.completedToday, 0),
                averageResponseTime: response.data.reduce((sum: number, a: AgentStatus) => sum + a.performance.averageResponseTime, 0) / (response.data.length || 1),
                systemLoad: 0 // Would need system metrics endpoint
              };
              setMetrics(calculatedMetrics);
            }
          } catch (metricsError) {
            console.warn('Failed to fetch metrics, calculating from agent data');
            // Calculate basic metrics from agent data
            const calculatedMetrics: AgentMetrics = {
              totalAgents: response.data.length,
              activeAgents: response.data.filter((a: AgentStatus) => a.status === 'active').length,
              busyAgents: response.data.filter((a: AgentStatus) => a.status === 'busy').length,
              idleAgents: response.data.filter((a: AgentStatus) => a.status === 'idle').length,
              offlineAgents: response.data.filter((a: AgentStatus) => a.status === 'offline').length,
              totalTasks: response.data.reduce((sum: number, a: AgentStatus) => sum + a.workload.activeTasks + a.workload.queuedTasks, 0),
              completedTasks: response.data.reduce((sum: number, a: AgentStatus) => sum + a.workload.completedToday, 0),
              averageResponseTime: response.data.reduce((sum: number, a: AgentStatus) => sum + a.performance.averageResponseTime, 0) / (response.data.length || 1),
              systemLoad: 0
            };
            setMetrics(calculatedMetrics);
          }
        }
      } else {
        throw new Error(response.error || 'Failed to fetch agents from API');
      }
    } catch (err) {
      // For development, provide fallback empty state
      if (process.env.NODE_ENV === 'development') {
        console.warn('API call failed, using development fallback:', err);
        setAgents([]);
        setMetrics(includeMetrics ? {
          totalAgents: 0,
          activeAgents: 0,
          busyAgents: 0,
          idleAgents: 0,
          offlineAgents: 0,
          totalTasks: 0,
          completedTasks: 0,
          averageResponseTime: 0,
          systemLoad: 0
        } : null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch agent status');
        console.error('Failed to fetch agent status:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [includeMetrics]);

  const refreshAgents = useCallback(async () => {
    await fetchAgents();
  }, [fetchAgents]);

  const getAgentById = useCallback((id: string): AgentStatus | undefined => {
    return agents.find(agent => agent.id === id);
  }, [agents]);

  const getAgentsByStatus = useCallback((status: AgentStatus['status']): AgentStatus[] => {
    return agents.filter(agent => agent.status === status);
  }, [agents]);

  const updateAgentStatus = useCallback((agentId: string, status: AgentStatus['status']) => {
    setAgents(prev => prev.map(agent =>
      agent.id === agentId
        ? { ...agent, status, lastActive: new Date().toISOString() }
        : agent
    ));

    // Send update to backend if WebSocket connected
    if (isConnected) {
      // This would emit via WebSocket to update other clients
      console.log(`Agent ${agentId} status updated to ${status}`);
    }
  }, [isConnected]);

  const subscribeToAgent = useCallback((
    agentId: string,
    callback: (agent: AgentStatus) => void
  ): (() => void) => {
    if (useRealTimeUpdates && isConnected) {
      // Subscribe to real-time agent updates
      const unsubscribe = subscribe(`agent-${agentId}-update`, callback);
      return unsubscribe;
    }

    // Return empty unsubscribe function for non-real-time mode
    return () => {};
  }, [useRealTimeUpdates, isConnected, subscribe]);

  // Initial fetch
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAgents();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAgents]);

  // Real-time WebSocket subscriptions
  useEffect(() => {
    if (!useRealTimeUpdates || !isConnected) return;

    const unsubscribeCallbacks: Array<() => void> = [];

    // Subscribe to global agent status updates
    const unsubscribeAgentUpdates = subscribe('agent-status-update', (data: { agentId: string; status: AgentStatus['status'] }) => {
      setAgents(prev => prev.map(agent =>
        agent.id === data.agentId
          ? { ...agent, status: data.status, lastActive: new Date().toISOString() }
          : agent
      ));
    });
    unsubscribeCallbacks.push(unsubscribeAgentUpdates);

    // Subscribe to agent metrics updates
    const unsubscribeMetricsUpdates = subscribe('agent-metrics-update', (data: { agentId: string; metrics: Partial<AgentStatus> }) => {
      setAgents(prev => prev.map(agent =>
        agent.id === data.agentId
          ? { ...agent, ...data.metrics }
          : agent
      ));
    });
    unsubscribeCallbacks.push(unsubscribeMetricsUpdates);

    // Subscribe to system metrics updates
    if (includeMetrics) {
      const unsubscribeSystemMetrics = subscribe('system-metrics-update', (data: Partial<AgentMetrics>) => {
        setMetrics(prev => prev ? { ...prev, ...data } : null);
      });
      unsubscribeCallbacks.push(unsubscribeSystemMetrics);
    }

    // Subscribe to agent workload updates
    const unsubscribeWorkload = subscribe('agent-workload-update', (data: { agentId: string; workload: AgentStatus['workload'] }) => {
      setAgents(prev => prev.map(agent =>
        agent.id === data.agentId
          ? { ...agent, workload: data.workload }
          : agent
      ));
    });
    unsubscribeCallbacks.push(unsubscribeWorkload);

    // Subscribe to agent health updates
    const unsubscribeHealth = subscribe('agent-health-update', (data: { agentId: string; health: AgentStatus['health'] }) => {
      setAgents(prev => prev.map(agent =>
        agent.id === data.agentId
          ? { ...agent, health: data.health }
          : agent
      ));
    });
    unsubscribeCallbacks.push(unsubscribeHealth);

    return () => {
      unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
    };
  }, [useRealTimeUpdates, isConnected, subscribe, includeMetrics]);

  return {
    agents,
    metrics,
    loading,
    error,
    refreshAgents,
    getAgentById,
    getAgentsByStatus,
    updateAgentStatus,
    subscribeToAgent
  };
};