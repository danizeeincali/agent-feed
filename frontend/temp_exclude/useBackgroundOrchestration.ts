import { useState, useEffect, useCallback, useRef } from 'react';
import { wsService } from '@/services/websocket';
import { apiService } from '@/services/api';
import { Agent, Task, Workflow, OrchestrationState, WorkflowUpdate } from '@/types';

interface UseBackgroundOrchestrationReturn {
  // State
  orchestrationState: OrchestrationState | null;
  agents: Agent[];
  activeWorkflows: Workflow[];
  backgroundTasks: Task[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  triggerOrchestration: (description: string, options?: any) => Promise<void>;
  spawnAgent: (type: string, config?: any) => Promise<void>;
  pauseWorkflow: (id: string) => Promise<void>;
  resumeWorkflow: (id: string) => Promise<void>;
  cancelTask: (id: string) => Promise<void>;
  refreshState: () => Promise<void>;

  // Real-time updates
  lastUpdate: WorkflowUpdate | null;
  updateCount: number;
}

export function useBackgroundOrchestration(): UseBackgroundOrchestrationReturn {
  const [orchestrationState, setOrchestrationState] = useState<OrchestrationState | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeWorkflows, setActiveWorkflows] = useState<Workflow[]>([]);
  const [backgroundTasks, setBackgroundTasks] = useState<Task[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<WorkflowUpdate | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const stateRefreshIntervalRef = useRef<NodeJS.Timeout>();

  // Initialize WebSocket connection
  useEffect(() => {
    let mounted = true;

    const initializeConnection = async () => {
      try {
        await wsService.connect();
        if (mounted) {
          setIsConnected(true);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to connect to real-time service');
          setIsConnected(false);
          
          // Schedule reconnection
          reconnectTimeoutRef.current = setTimeout(initializeConnection, 5000);
        }
      }
    };

    initializeConnection();

    return () => {
      mounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsService.disconnect();
    };
  }, []);

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribers = [
      wsService.subscribe('workflow_update', (data: WorkflowUpdate) => {
        setLastUpdate(data);
        setUpdateCount(prev => prev + 1);
        handleWorkflowUpdate(data);
      }),

      wsService.subscribe('agent_status', (data: { agent: Agent }) => {
        setAgents(prev => 
          prev.map(agent => 
            agent.id === data.agent.id ? data.agent : agent
          )
        );
      }),

      wsService.subscribe('task_update', (data: { task: Task }) => {
        setBackgroundTasks(prev =>
          prev.map(task =>
            task.id === data.task.id ? data.task : task
          )
        );
      }),

      wsService.subscribe('orchestration_state', (data: OrchestrationState) => {
        setOrchestrationState(data);
        setAgents(data.agentPool);
        setActiveWorkflows(data.activeWorkflows);
        setBackgroundTasks(data.backgroundTasks);
      }),
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [isConnected]);

  // Initial data fetch and periodic refresh
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const [orchestrationData, agentsData, workflowsData, tasksData] = await Promise.all([
          apiService.getOrchestrationState(),
          apiService.getAgents(),
          apiService.getWorkflows(),
          apiService.getTasks(),
        ]);

        setOrchestrationState(orchestrationData);
        setAgents(agentsData);
        setActiveWorkflows(workflowsData.filter(w => w.status === 'running'));
        setBackgroundTasks(tasksData.filter(t => t.status === 'in_progress' || t.status === 'pending'));
        setError(null);
      } catch (err) {
        setError('Failed to fetch initial data');
        console.error('Initial data fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();

    // Set up periodic refresh for state synchronization
    stateRefreshIntervalRef.current = setInterval(fetchInitialData, 30000);

    return () => {
      if (stateRefreshIntervalRef.current) {
        clearInterval(stateRefreshIntervalRef.current);
      }
    };
  }, []);

  const handleWorkflowUpdate = useCallback((update: WorkflowUpdate) => {
    switch (update.type) {
      case 'task_started':
        setBackgroundTasks(prev => [...prev, update.payload.task]);
        break;
      
      case 'task_completed':
        setBackgroundTasks(prev => 
          prev.filter(task => task.id !== update.payload.taskId)
        );
        break;
      
      case 'task_failed':
        setBackgroundTasks(prev =>
          prev.map(task =>
            task.id === update.payload.taskId
              ? { ...task, status: 'failed' as const }
              : task
          )
        );
        break;
      
      case 'workflow_progress':
        setActiveWorkflows(prev =>
          prev.map(workflow =>
            workflow.id === update.payload.workflowId
              ? { ...workflow, progress: update.payload.progress }
              : workflow
          )
        );
        break;
      
      case 'agent_status':
        setAgents(prev =>
          prev.map(agent =>
            agent.id === update.payload.agentId
              ? { ...agent, status: update.payload.status }
              : agent
          )
        );
        break;
    }
  }, []);

  const triggerOrchestration = useCallback(async (description: string, options?: any) => {
    try {
      const result = await apiService.orchestrateTask(description, options);
      
      // Send WebSocket message for immediate UI feedback
      wsService.send('orchestration_triggered', {
        taskId: result.taskId,
        workflowId: result.workflowId,
        description,
      });
      
      setError(null);
    } catch (err) {
      setError('Failed to trigger orchestration');
      console.error('Orchestration error:', err);
      throw err;
    }
  }, []);

  const spawnAgent = useCallback(async (type: string, config?: any) => {
    try {
      const agent = await apiService.spawnAgent(type, config);
      setAgents(prev => [...prev, agent]);
      setError(null);
    } catch (err) {
      setError('Failed to spawn agent');
      console.error('Agent spawn error:', err);
      throw err;
    }
  }, []);

  const pauseWorkflow = useCallback(async (id: string) => {
    try {
      await apiService.pauseWorkflow(id);
      setActiveWorkflows(prev =>
        prev.map(workflow =>
          workflow.id === id
            ? { ...workflow, status: 'paused' as const }
            : workflow
        )
      );
      setError(null);
    } catch (err) {
      setError('Failed to pause workflow');
      console.error('Workflow pause error:', err);
      throw err;
    }
  }, []);

  const resumeWorkflow = useCallback(async (id: string) => {
    try {
      await apiService.startWorkflow(id);
      setActiveWorkflows(prev =>
        prev.map(workflow =>
          workflow.id === id
            ? { ...workflow, status: 'running' as const }
            : workflow
        )
      );
      setError(null);
    } catch (err) {
      setError('Failed to resume workflow');
      console.error('Workflow resume error:', err);
      throw err;
    }
  }, []);

  const cancelTask = useCallback(async (id: string) => {
    try {
      await apiService.cancelTask(id);
      setBackgroundTasks(prev =>
        prev.map(task =>
          task.id === id
            ? { ...task, status: 'cancelled' as const }
            : task
        )
      );
      setError(null);
    } catch (err) {
      setError('Failed to cancel task');
      console.error('Task cancel error:', err);
      throw err;
    }
  }, []);

  const refreshState = useCallback(async () => {
    try {
      const orchestrationData = await apiService.getOrchestrationState();
      setOrchestrationState(orchestrationData);
      setAgents(orchestrationData.agentPool);
      setActiveWorkflows(orchestrationData.activeWorkflows);
      setBackgroundTasks(orchestrationData.backgroundTasks);
      setError(null);
    } catch (err) {
      setError('Failed to refresh state');
      console.error('State refresh error:', err);
      throw err;
    }
  }, []);

  return {
    // State
    orchestrationState,
    agents,
    activeWorkflows,
    backgroundTasks,
    isConnected,
    isLoading,
    error,

    // Actions
    triggerOrchestration,
    spawnAgent,
    pauseWorkflow,
    resumeWorkflow,
    cancelTask,
    refreshState,

    // Real-time updates
    lastUpdate,
    updateCount,
  };
}