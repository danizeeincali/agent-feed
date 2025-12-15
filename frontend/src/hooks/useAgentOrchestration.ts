import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Agent {
  id: string;
  name: string;
  display_name: string;
  description: string;
  system_prompt: string;
  avatar_color: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'error' | 'testing';
  created_at: string;
  updated_at: string;
  last_used?: string;
  usage_count: number;
  performance_metrics: {
    success_rate: number;
    average_response_time: number;
    total_tokens_used: number;
    error_count: number;
  };
  health_status: {
    cpu_usage: number;
    memory_usage: number;
    response_time: number;
    last_heartbeat: string;
  };
  category: 'core' | 'sparc' | 'github' | 'performance' | 'neural';
}

export interface AgentTask {
  id: string;
  agent_id: string;
  agent_name: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  duration?: number;
  input_data?: any;
  output_data?: any;
  error_message?: string;
  progress: number;
  dependencies: string[];
  assigned_by: string;
}

export interface SwarmConfiguration {
  id: string;
  name: string;
  topology: 'mesh' | 'hierarchical' | 'ring' | 'star';
  max_agents: number;
  strategy: 'balanced' | 'specialized' | 'adaptive';
  auto_scale: boolean;
  load_balancing: boolean;
  fault_tolerance: boolean;
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive' | 'configuring';
}

export interface OrchestrationMetrics {
  total_agents: number;
  active_agents: number;
  queued_tasks: number;
  running_tasks: number;
  completed_tasks_today: number;
  average_task_duration: number;
  system_load: number;
  memory_usage: number;
  success_rate: number;
  error_rate: number;
}

interface UseAgentOrchestrationOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealTime?: boolean;
}

export const useAgentOrchestration = (options: UseAgentOrchestrationOptions = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000,
    enableRealTime = true
  } = options;

  const queryClient = useQueryClient();
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    search: ''
  });

  // Fetch all agents
  const {
    data: agents = [],
    isLoading: agentsLoading,
    error: agentsError,
    refetch: refetchAgents
  } = useQuery<Agent[]>({
    queryKey: ['agents', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/v1/agents?${params}`);
      if (!response.ok) throw new Error('Failed to fetch agents');
      return response.json();
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 10000
  });

  // Fetch agent tasks
  const {
    data: tasks = [],
    isLoading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks
  } = useQuery<AgentTask[]>({
    queryKey: ['agent-tasks'],
    queryFn: async () => {
      const response = await fetch('/api/v1/agents/tasks');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
    refetchInterval: autoRefresh ? refreshInterval / 2 : false
  });

  // Fetch orchestration metrics
  const {
    data: metrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics
  } = useQuery<OrchestrationMetrics>({
    queryKey: ['orchestration-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/v1/agents/metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
    initialData: {
      total_agents: 17,
      active_agents: 12,
      queued_tasks: 5,
      running_tasks: 3,
      completed_tasks_today: 89,
      average_task_duration: 245,
      system_load: 65,
      memory_usage: 72,
      success_rate: 0.94,
      error_rate: 0.06
    }
  });

  // Fetch swarm configurations
  const {
    data: swarms = [],
    isLoading: swarmsLoading,
    refetch: refetchSwarms
  } = useQuery<SwarmConfiguration[]>({
    queryKey: ['swarm-configurations'],
    queryFn: async () => {
      const response = await fetch('/api/v1/swarms');
      if (!response.ok) throw new Error('Failed to fetch swarms');
      return response.json();
    },
    refetchInterval: autoRefresh ? refreshInterval * 2 : false
  });

  // Spawn agent mutation
  const spawnAgent = useMutation({
    mutationFn: async (agentConfig: Partial<Agent>) => {
      const response = await fetch('/api/v1/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentConfig)
      });
      if (!response.ok) throw new Error('Failed to spawn agent');
      return response.json();
    },
    onSuccess: () => {
      refetchAgents();
      refetchMetrics();
    }
  });

  // Update agent mutation
  const updateAgent = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Agent> }) => {
      const response = await fetch(`/api/v1/agents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update agent');
      return response.json();
    },
    onSuccess: () => {
      refetchAgents();
    }
  });

  // Delete agent mutation
  const deleteAgent = useMutation({
    mutationFn: async (agentId: string) => {
      const response = await fetch(`/api/v1/agents/${agentId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete agent');
      return response.json();
    },
    onSuccess: () => {
      refetchAgents();
      refetchMetrics();
    }
  });

  // Assign task mutation
  const assignTask = useMutation({
    mutationFn: async (taskData: {
      agent_id: string;
      title: string;
      description: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      input_data?: any;
      dependencies?: string[];
    }) => {
      const response = await fetch('/api/v1/agents/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      if (!response.ok) throw new Error('Failed to assign task');
      return response.json();
    },
    onSuccess: () => {
      refetchTasks();
      refetchMetrics();
    }
  });

  // Cancel task mutation
  const cancelTask = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/v1/agents/tasks/${taskId}/cancel`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to cancel task');
      return response.json();
    },
    onSuccess: () => {
      refetchTasks();
    }
  });

  // Bulk operations mutation
  const bulkOperation = useMutation({
    mutationFn: async ({
      operation,
      agentIds,
      params
    }: {
      operation: 'activate' | 'deactivate' | 'delete' | 'restart' | 'configure';
      agentIds: string[];
      params?: any;
    }) => {
      const response = await fetch('/api/v1/agents/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, agent_ids: agentIds, params })
      });
      if (!response.ok) throw new Error(`Failed to ${operation} agents`);
      return response.json();
    },
    onSuccess: () => {
      refetchAgents();
      refetchMetrics();
      setSelectedAgents(new Set());
    }
  });

  // Initialize swarm mutation
  const initializeSwarm = useMutation({
    mutationFn: async (config: Partial<SwarmConfiguration>) => {
      const response = await fetch('/api/v1/swarms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!response.ok) throw new Error('Failed to initialize swarm');
      return response.json();
    },
    onSuccess: () => {
      refetchSwarms();
      refetchAgents();
    }
  });

  // Test agent mutation
  const testAgent = useMutation({
    mutationFn: async ({ agentId, testPrompt }: { agentId: string; testPrompt: string }) => {
      const response = await fetch(`/api/v1/agents/${agentId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: testPrompt })
      });
      if (!response.ok) throw new Error('Failed to test agent');
      return response.json();
    }
  });

  // Utility functions
  const getAgentsByCategory = useCallback((category: string) => {
    return agents.filter(agent => agent.category === category);
  }, [agents]);

  const getActiveAgents = useCallback(() => {
    return agents.filter(agent => agent.status === 'active');
  }, [agents]);

  const getAgentTasks = useCallback((agentId: string) => {
    return tasks.filter(task => task.agent_id === agentId);
  }, [tasks]);

  const getRunningTasks = useCallback(() => {
    return tasks.filter(task => task.status === 'running');
  }, [tasks]);

  const getPendingTasks = useCallback(() => {
    return tasks.filter(task => task.status === 'pending');
  }, [tasks]);

  const getTasksByPriority = useCallback((priority: AgentTask['priority']) => {
    return tasks.filter(task => task.priority === priority);
  }, [tasks]);

  const calculateAverageResponseTime = useCallback(() => {
    const activeTasks = tasks.filter(task => task.status === 'completed' && task.duration);
    if (activeTasks.length === 0) return 0;
    return activeTasks.reduce((sum, task) => sum + (task.duration || 0), 0) / activeTasks.length;
  }, [tasks]);

  const getSystemHealth = useCallback(() => {
    const activeAgents = getActiveAgents();
    const totalCpu = activeAgents.reduce((sum, agent) => sum + agent.health_status.cpu_usage, 0);
    const totalMemory = activeAgents.reduce((sum, agent) => sum + agent.health_status.memory_usage, 0);
    const avgCpu = activeAgents.length > 0 ? totalCpu / activeAgents.length : 0;
    const avgMemory = activeAgents.length > 0 ? totalMemory / activeAgents.length : 0;
    
    return {
      cpu_usage: avgCpu,
      memory_usage: avgMemory,
      active_agents: activeAgents.length,
      total_agents: agents.length,
      running_tasks: getRunningTasks().length,
      pending_tasks: getPendingTasks().length
    };
  }, [agents, getActiveAgents, getRunningTasks, getPendingTasks]);

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!enableRealTime) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/socket.io/agents`;
    
    let ws: WebSocket;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('Connected to agent orchestration WebSocket');
          reconnectAttempts = 0;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
              case 'agent_updated':
                queryClient.invalidateQueries({ queryKey: ['agents'] });
                break;
              case 'task_updated':
                queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
                break;
              case 'metrics_updated':
                queryClient.invalidateQueries({ queryKey: ['orchestration-metrics'] });
                break;
              case 'swarm_updated':
                queryClient.invalidateQueries({ queryKey: ['swarm-configurations'] });
                break;
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          console.log('Disconnected from agent orchestration WebSocket');
          
          // Attempt to reconnect
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            setTimeout(connect, Math.pow(2, reconnectAttempts) * 1000);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [enableRealTime, queryClient]);

  // Filter management
  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Agent selection management
  const selectAgent = useCallback((agentId: string) => {
    setSelectedAgents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(agentId)) {
        newSet.delete(agentId);
      } else {
        newSet.add(agentId);
      }
      return newSet;
    });
  }, []);

  const selectAllAgents = useCallback(() => {
    setSelectedAgents(new Set(agents.map(agent => agent.id)));
  }, [agents]);

  const clearSelection = useCallback(() => {
    setSelectedAgents(new Set());
  }, []);

  // Refresh all data
  const refreshAll = useCallback(() => {
    refetchAgents();
    refetchTasks();
    refetchMetrics();
    refetchSwarms();
  }, [refetchAgents, refetchTasks, refetchMetrics, refetchSwarms]);

  return {
    // Data
    agents,
    tasks,
    metrics,
    swarms,
    
    // Loading states
    isLoading: agentsLoading || tasksLoading || metricsLoading || swarmsLoading,
    agentsLoading,
    tasksLoading,
    metricsLoading,
    swarmsLoading,
    
    // Errors
    error: agentsError || tasksError,
    agentsError,
    tasksError,
    
    // Mutations
    spawnAgent,
    updateAgent,
    deleteAgent,
    assignTask,
    cancelTask,
    bulkOperation,
    initializeSwarm,
    testAgent,
    
    // Utility functions
    getAgentsByCategory,
    getActiveAgents,
    getAgentTasks,
    getRunningTasks,
    getPendingTasks,
    getTasksByPriority,
    calculateAverageResponseTime,
    getSystemHealth,
    
    // UI state
    filters,
    updateFilters,
    selectedAgents,
    selectAgent,
    selectAllAgents,
    clearSelection,
    
    // Actions
    refreshAll,
    refetchAgents,
    refetchTasks,
    refetchMetrics,
    refetchSwarms
  };
};

export default useAgentOrchestration;