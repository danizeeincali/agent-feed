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

  // Mock agent data for demonstration
  const mockAgents: AgentStatus[] = [
    {
      id: 'chief-of-staff',
      name: 'Chief of Staff Agent',
      status: 'active',
      lastActive: new Date().toISOString(),
      currentTask: 'Coordinating workflow optimization review',
      workload: {
        activeTasks: 3,
        queuedTasks: 7,
        completedToday: 23
      },
      performance: {
        successRate: 98.7,
        averageResponseTime: 1.2,
        tasksCompleted: 1847
      },
      capabilities: ['Strategic Planning', 'Task Coordination', 'Priority Assessment'],
      health: {
        cpuUsage: 15.3,
        memoryUsage: 234.5,
        uptime: 99.8
      }
    },
    {
      id: 'performance',
      name: 'Performance Agent',
      status: 'busy',
      lastActive: new Date().toISOString(),
      currentTask: 'Analyzing system performance bottlenecks',
      workload: {
        activeTasks: 2,
        queuedTasks: 4,
        completedToday: 18
      },
      performance: {
        successRate: 96.9,
        averageResponseTime: 3.1,
        tasksCompleted: 743
      },
      capabilities: ['Performance Analysis', 'Optimization', 'Bottleneck Detection'],
      health: {
        cpuUsage: 45.2,
        memoryUsage: 512.1,
        uptime: 98.4
      }
    },
    {
      id: 'security',
      name: 'Security Agent',
      status: 'idle',
      lastActive: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      workload: {
        activeTasks: 0,
        queuedTasks: 2,
        completedToday: 8
      },
      performance: {
        successRate: 99.2,
        averageResponseTime: 5.7,
        tasksCompleted: 456
      },
      capabilities: ['Vulnerability Scanning', 'Security Analysis', 'Threat Detection'],
      health: {
        cpuUsage: 8.1,
        memoryUsage: 187.3,
        uptime: 99.9
      }
    },
    {
      id: 'frontend',
      name: 'Frontend Agent',
      status: 'active',
      lastActive: new Date().toISOString(),
      currentTask: 'Implementing responsive design updates',
      workload: {
        activeTasks: 4,
        queuedTasks: 6,
        completedToday: 15
      },
      performance: {
        successRate: 95.4,
        averageResponseTime: 4.6,
        tasksCompleted: 1287
      },
      capabilities: ['UI Development', 'React', 'User Experience'],
      health: {
        cpuUsage: 32.7,
        memoryUsage: 445.8,
        uptime: 97.2
      }
    },
    {
      id: 'backend',
      name: 'Backend Agent',
      status: 'active',
      lastActive: new Date().toISOString(),
      currentTask: 'Optimizing API endpoint performance',
      workload: {
        activeTasks: 3,
        queuedTasks: 5,
        completedToday: 19
      },
      performance: {
        successRate: 97.3,
        averageResponseTime: 3.8,
        tasksCompleted: 1156
      },
      capabilities: ['API Development', 'Microservices', 'System Architecture'],
      health: {
        cpuUsage: 28.4,
        memoryUsage: 398.2,
        uptime: 98.7
      }
    }
  ];

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // In a real implementation, this would be an API call
      // const response = await fetch('/api/v1/agents/status');
      // const data = await response.json();

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Use mock data for now
      setAgents(mockAgents);

      if (includeMetrics) {
        const metricsData: AgentMetrics = {
          totalAgents: mockAgents.length,
          activeAgents: mockAgents.filter(a => a.status === 'active').length,
          busyAgents: mockAgents.filter(a => a.status === 'busy').length,
          idleAgents: mockAgents.filter(a => a.status === 'idle').length,
          offlineAgents: mockAgents.filter(a => a.status === 'offline').length,
          totalTasks: mockAgents.reduce((sum, a) => sum + a.workload.activeTasks + a.workload.queuedTasks, 0),
          completedTasks: mockAgents.reduce((sum, a) => sum + a.workload.completedToday, 0),
          averageResponseTime: mockAgents.reduce((sum, a) => sum + a.performance.averageResponseTime, 0) / mockAgents.length,
          systemLoad: 67.3
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