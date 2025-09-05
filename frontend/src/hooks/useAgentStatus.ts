import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';

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

interface UseAgentStatusOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
  includeMetrics?: boolean;
}

interface UseAgentStatusReturn {
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

export const useAgentStatus = (options: UseAgentStatusOptions = {}): UseAgentStatusReturn => {
  const {
    refreshInterval = 30000,
    autoRefresh = true,
    includeMetrics = true
  } = options;

  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isConnected, subscribe, emit } = useWebSocket();

  // Real API service for agent data
  const apiService = import('../services/productionApiService');

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Real API call to backend service
      const response = await fetch('/api/v1/agents/status');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // Transform backend data to frontend format
      const transformedAgents: AgentStatus[] = data.data.map((agent: any) => ({
        id: agent.id,
        name: agent.display_name || agent.name,
        status: agent.status === 'active' ? 'active' : 
               agent.status === 'busy' ? 'busy' :
               agent.status === 'inactive' ? 'idle' : 'offline',
        lastActive: agent.updated_at,
        currentTask: agent.current_task,
        workload: {
          activeTasks: agent.workload?.active_tasks || 0,
          queuedTasks: agent.workload?.queued_tasks || 0,
          completedToday: agent.workload?.completed_today || 0
        },
        performance: {
          successRate: agent.performance_metrics?.success_rate || 0,
          averageResponseTime: agent.performance_metrics?.average_response_time || 0,
          tasksCompleted: agent.performance_metrics?.tasks_completed || 0
        },
        capabilities: agent.capabilities || [],
        health: {
          cpuUsage: agent.health_status?.cpu_usage || 0,
          memoryUsage: agent.health_status?.memory_usage || 0,
          uptime: agent.health_status?.uptime || 0
        }
      }));

      setAgents(transformedAgents);

      if (includeMetrics) {
        const metricsData: AgentMetrics = {
          totalAgents: transformedAgents.length,
          activeAgents: transformedAgents.filter(a => a.status === 'active').length,
          busyAgents: transformedAgents.filter(a => a.status === 'busy').length,
          idleAgents: transformedAgents.filter(a => a.status === 'idle').length,
          offlineAgents: transformedAgents.filter(a => a.status === 'offline').length,
          totalTasks: transformedAgents.reduce((sum, a) => sum + a.workload.activeTasks + a.workload.queuedTasks, 0),
          completedTasks: transformedAgents.reduce((sum, a) => sum + a.workload.completedToday, 0),
          averageResponseTime: transformedAgents.reduce((sum, a) => sum + a.performance.averageResponseTime, 0) / (transformedAgents.length || 1),
          systemLoad: data.systemLoad || 0
        };
        setMetrics(metricsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agent status');
      console.error('Failed to fetch agent status:', err);
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

    // Emit status update via WebSocket
    if (isConnected) {
      emit('agent-status-update', { agentId, status });
    }
  }, [isConnected, emit]);

  const subscribeToAgent = useCallback((
    agentId: string,
    callback: (agent: AgentStatus) => void
  ): (() => void) => {
    const unsubscribe = () => {
      // In a real implementation, this would unsubscribe from specific agent updates
    };

    if (isConnected) {
      subscribe(`agent-${agentId}-update`, callback);
    }

    return unsubscribe;
  }, [isConnected, subscribe]);

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

  // WebSocket subscriptions
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeCallbacks: Array<() => void> = [];

    // Subscribe to global agent status updates
    subscribe('agent-status-update', (data: { agentId: string; status: AgentStatus['status'] }) => {
      setAgents(prev => prev.map(agent =>
        agent.id === data.agentId
          ? { ...agent, status: data.status, lastActive: new Date().toISOString() }
          : agent
      ));
    });

    // Subscribe to agent metrics updates
    subscribe('agent-metrics-update', (data: { agentId: string; metrics: Partial<AgentStatus> }) => {
      setAgents(prev => prev.map(agent =>
        agent.id === data.agentId
          ? { ...agent, ...data.metrics }
          : agent
      ));
    });

    // Subscribe to system metrics updates
    if (includeMetrics) {
      subscribe('system-metrics-update', (data: Partial<AgentMetrics>) => {
        setMetrics(prev => prev ? { ...prev, ...data } : null);
      });
    }

    // Subscribe to agent workload updates
    subscribe('agent-workload-update', (data: { agentId: string; workload: AgentStatus['workload'] }) => {
      setAgents(prev => prev.map(agent =>
        agent.id === data.agentId
          ? { ...agent, workload: data.workload }
          : agent
      ));
    });

    // Subscribe to agent health updates
    subscribe('agent-health-update', (data: { agentId: string; health: AgentStatus['health'] }) => {
      setAgents(prev => prev.map(agent =>
        agent.id === data.agentId
          ? { ...agent, health: data.health }
          : agent
      ));
    });

    return () => {
      unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
    };
  }, [isConnected, subscribe, includeMetrics]);

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