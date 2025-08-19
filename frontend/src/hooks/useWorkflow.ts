import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  agentId?: string;
  agentName?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  dependencies: string[];
  outputs?: string[];
  progress?: number;
  estimatedDuration?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  type: 'sparc' | 'custom' | 'deployment' | 'analysis' | 'maintenance';
  status: 'draft' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
  steps: WorkflowStep[];
  startTime?: string;
  endTime?: string;
  totalDuration?: number;
  estimatedDuration?: number;
  successRate?: number;
  assignedAgents: string[];
  creator: string;
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata?: {
    repository?: string;
    branch?: string;
    environment?: string;
    version?: string;
  };
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  type: Workflow['type'];
  steps: Omit<WorkflowStep, 'id' | 'status' | 'startTime' | 'endTime' | 'duration' | 'progress'>[];
  defaultAgents: string[];
  estimatedDuration: number;
  tags: string[];
}

interface UseWorkflowOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  includeCompleted?: boolean;
}

interface UseWorkflowReturn {
  workflows: Workflow[];
  templates: WorkflowTemplate[];
  loading: boolean;
  error: string | null;
  createWorkflow: (template: WorkflowTemplate, options?: Partial<Workflow>) => Promise<string>;
  startWorkflow: (workflowId: string) => Promise<void>;
  pauseWorkflow: (workflowId: string) => Promise<void>;
  resumeWorkflow: (workflowId: string) => Promise<void>;
  cancelWorkflow: (workflowId: string) => Promise<void>;
  updateStep: (workflowId: string, stepId: string, updates: Partial<WorkflowStep>) => Promise<void>;
  getWorkflowById: (id: string) => Workflow | undefined;
  getWorkflowsByStatus: (status: Workflow['status']) => Workflow[];
  getWorkflowsByType: (type: Workflow['type']) => Workflow[];
  refreshWorkflows: () => Promise<void>;
  subscribeToWorkflow: (workflowId: string, callback: (workflow: Workflow) => void) => () => void;
}

export const useWorkflow = (options: UseWorkflowOptions = {}): UseWorkflowReturn => {
  const {
    autoRefresh = true,
    refreshInterval = 10000, // 10 seconds for workflow updates
    includeCompleted = true
  } = options;

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isConnected, subscribe, emit } = useWebSocket();

  // Mock workflow templates
  const mockTemplates: WorkflowTemplate[] = [
    {
      id: 'sparc-template',
      name: 'SPARC Development Workflow',
      description: 'Complete SPARC methodology implementation workflow',
      type: 'sparc',
      steps: [
        {
          name: 'Specification',
          description: 'Define requirements and specifications',
          dependencies: [],
          estimatedDuration: 15,
          priority: 'high'
        },
        {
          name: 'Pseudocode',
          description: 'Create algorithmic pseudocode',
          dependencies: ['Specification'],
          estimatedDuration: 20,
          priority: 'high'
        },
        {
          name: 'Architecture',
          description: 'Design system architecture',
          dependencies: ['Pseudocode'],
          estimatedDuration: 30,
          priority: 'high'
        },
        {
          name: 'Refinement',
          description: 'Implement and refine solution',
          dependencies: ['Architecture'],
          estimatedDuration: 60,
          priority: 'medium'
        },
        {
          name: 'Completion',
          description: 'Final testing and deployment',
          dependencies: ['Refinement'],
          estimatedDuration: 25,
          priority: 'medium'
        }
      ],
      defaultAgents: ['chief-of-staff', 'backend', 'frontend', 'testing'],
      estimatedDuration: 150,
      tags: ['development', 'sparc', 'methodology']
    },
    {
      id: 'deployment-template',
      name: 'Production Deployment',
      description: 'Complete production deployment workflow with security and monitoring',
      type: 'deployment',
      steps: [
        {
          name: 'Security Scan',
          description: 'Run comprehensive security vulnerability scan',
          dependencies: [],
          estimatedDuration: 10,
          priority: 'critical'
        },
        {
          name: 'Build & Test',
          description: 'Build application and run test suites',
          dependencies: ['Security Scan'],
          estimatedDuration: 20,
          priority: 'high'
        },
        {
          name: 'Deploy to Staging',
          description: 'Deploy to staging environment for final testing',
          dependencies: ['Build & Test'],
          estimatedDuration: 15,
          priority: 'high'
        },
        {
          name: 'Production Deployment',
          description: 'Deploy to production environment',
          dependencies: ['Deploy to Staging'],
          estimatedDuration: 10,
          priority: 'critical'
        },
        {
          name: 'Monitoring Setup',
          description: 'Configure monitoring and alerts',
          dependencies: ['Production Deployment'],
          estimatedDuration: 5,
          priority: 'medium'
        }
      ],
      defaultAgents: ['security', 'devops', 'monitoring', 'testing'],
      estimatedDuration: 60,
      tags: ['deployment', 'production', 'security']
    },
    {
      id: 'analysis-template',
      name: 'Performance Analysis',
      description: 'Comprehensive system performance analysis and optimization',
      type: 'analysis',
      steps: [
        {
          name: 'Data Collection',
          description: 'Collect performance metrics and system data',
          dependencies: [],
          estimatedDuration: 5,
          priority: 'medium'
        },
        {
          name: 'Performance Analysis',
          description: 'Analyze performance bottlenecks and issues',
          dependencies: ['Data Collection'],
          estimatedDuration: 30,
          priority: 'high'
        },
        {
          name: 'Database Analysis',
          description: 'Analyze database performance and query optimization',
          dependencies: ['Performance Analysis'],
          estimatedDuration: 20,
          priority: 'medium'
        },
        {
          name: 'Recommendations',
          description: 'Generate optimization recommendations',
          dependencies: ['Database Analysis'],
          estimatedDuration: 15,
          priority: 'medium'
        }
      ],
      defaultAgents: ['performance', 'analytics', 'database'],
      estimatedDuration: 70,
      tags: ['analysis', 'performance', 'optimization']
    }
  ];

  // Mock workflows
  const mockWorkflows: Workflow[] = [
    {
      id: 'wf-001',
      name: 'SPARC Implementation - User Authentication',
      description: 'Implementing user authentication system using SPARC methodology',
      type: 'sparc',
      status: 'running',
      steps: [
        {
          id: 'step-001',
          name: 'Specification',
          description: 'Define authentication requirements and specifications',
          status: 'completed',
          agentId: 'chief-of-staff',
          agentName: 'Chief of Staff Agent',
          startTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
          duration: 10,
          dependencies: [],
          outputs: ['auth-requirements.md', 'security-specs.yaml'],
          progress: 100,
          priority: 'high'
        },
        {
          id: 'step-002',
          name: 'Pseudocode',
          description: 'Create authentication algorithm pseudocode',
          status: 'completed',
          agentId: 'backend',
          agentName: 'Backend Agent',
          startTime: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          duration: 10,
          dependencies: ['step-001'],
          outputs: ['auth-algorithm.pseudo', 'jwt-flow.md'],
          progress: 100,
          priority: 'high'
        },
        {
          id: 'step-003',
          name: 'Architecture',
          description: 'Design authentication system architecture',
          status: 'in_progress',
          agentId: 'backend',
          agentName: 'Backend Agent',
          startTime: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          dependencies: ['step-002'],
          outputs: ['auth-architecture.md', 'api-endpoints.yaml'],
          progress: 65,
          priority: 'high'
        },
        {
          id: 'step-004',
          name: 'Refinement',
          description: 'Implement authentication endpoints and middleware',
          status: 'pending',
          dependencies: ['step-003'],
          priority: 'medium'
        },
        {
          id: 'step-005',
          name: 'Completion',
          description: 'Test authentication system and deploy',
          status: 'pending',
          agentId: 'testing',
          agentName: 'Testing Agent',
          dependencies: ['step-004'],
          priority: 'medium'
        }
      ],
      startTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      estimatedDuration: 120,
      assignedAgents: ['chief-of-staff', 'backend', 'security', 'testing'],
      creator: 'chief-of-staff',
      tags: ['authentication', 'security', 'backend'],
      priority: 'high',
      metadata: {
        repository: 'agent-feed',
        branch: 'feature/auth',
        environment: 'development'
      }
    }
  ];

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // In a real implementation, this would be API calls
      // const [workflowsResponse, templatesResponse] = await Promise.all([
      //   fetch('/api/v1/workflows'),
      //   fetch('/api/v1/workflow-templates')
      // ]);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      setWorkflows(mockWorkflows);
      setTemplates(mockTemplates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workflows');
      console.error('Failed to fetch workflows:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createWorkflow = useCallback(async (
    template: WorkflowTemplate,
    options: Partial<Workflow> = {}
  ): Promise<string> => {
    try {
      const newWorkflow: Workflow = {
        id: `wf-${Date.now()}`,
        name: options.name || `${template.name} - ${new Date().toLocaleDateString()}`,
        description: options.description || template.description,
        type: template.type,
        status: 'draft',
        steps: template.steps.map((step, index) => ({
          ...step,
          id: `step-${Date.now()}-${index}`,
          status: 'pending' as const,
          progress: 0
        })),
        assignedAgents: options.assignedAgents || template.defaultAgents,
        creator: options.creator || 'user',
        tags: options.tags || template.tags,
        priority: options.priority || 'medium',
        estimatedDuration: template.estimatedDuration,
        metadata: options.metadata || {}
      };

      // In a real implementation, this would be an API call
      // const response = await fetch('/api/v1/workflows', {
      //   method: 'POST',
      //   body: JSON.stringify(newWorkflow)
      // });

      setWorkflows(prev => [newWorkflow, ...prev]);

      if (isConnected) {
        emit('workflow-created', { workflow: newWorkflow });
      }

      return newWorkflow.id;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create workflow');
    }
  }, [isConnected, emit]);

  const startWorkflow = useCallback(async (workflowId: string) => {
    try {
      setWorkflows(prev => prev.map(workflow =>
        workflow.id === workflowId
          ? { 
              ...workflow, 
              status: 'running' as const,
              startTime: new Date().toISOString()
            }
          : workflow
      ));

      if (isConnected) {
        emit('workflow-start', { workflowId });
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to start workflow');
    }
  }, [isConnected, emit]);

  const pauseWorkflow = useCallback(async (workflowId: string) => {
    setWorkflows(prev => prev.map(workflow =>
      workflow.id === workflowId
        ? { ...workflow, status: 'paused' as const }
        : workflow
    ));

    if (isConnected) {
      emit('workflow-pause', { workflowId });
    }
  }, [isConnected, emit]);

  const resumeWorkflow = useCallback(async (workflowId: string) => {
    setWorkflows(prev => prev.map(workflow =>
      workflow.id === workflowId
        ? { ...workflow, status: 'running' as const }
        : workflow
    ));

    if (isConnected) {
      emit('workflow-resume', { workflowId });
    }
  }, [isConnected, emit]);

  const cancelWorkflow = useCallback(async (workflowId: string) => {
    setWorkflows(prev => prev.map(workflow =>
      workflow.id === workflowId
        ? { 
            ...workflow, 
            status: 'cancelled' as const,
            endTime: new Date().toISOString()
          }
        : workflow
    ));

    if (isConnected) {
      emit('workflow-cancel', { workflowId });
    }
  }, [isConnected, emit]);

  const updateStep = useCallback(async (
    workflowId: string,
    stepId: string,
    updates: Partial<WorkflowStep>
  ) => {
    setWorkflows(prev => prev.map(workflow =>
      workflow.id === workflowId
        ? {
            ...workflow,
            steps: workflow.steps.map(step =>
              step.id === stepId
                ? { ...step, ...updates }
                : step
            )
          }
        : workflow
    ));

    if (isConnected) {
      emit('step-update', { workflowId, stepId, updates });
    }
  }, [isConnected, emit]);

  const getWorkflowById = useCallback((id: string): Workflow | undefined => {
    return workflows.find(workflow => workflow.id === id);
  }, [workflows]);

  const getWorkflowsByStatus = useCallback((status: Workflow['status']): Workflow[] => {
    return workflows.filter(workflow => workflow.status === status);
  }, [workflows]);

  const getWorkflowsByType = useCallback((type: Workflow['type']): Workflow[] => {
    return workflows.filter(workflow => workflow.type === type);
  }, [workflows]);

  const refreshWorkflows = useCallback(async () => {
    await fetchWorkflows();
  }, [fetchWorkflows]);

  const subscribeToWorkflow = useCallback((
    workflowId: string,
    callback: (workflow: Workflow) => void
  ): (() => void) => {
    const unsubscribe = () => {
      // In a real implementation, this would unsubscribe from specific workflow updates
    };

    if (isConnected) {
      subscribe(`workflow-${workflowId}-update`, callback);
    }

    return unsubscribe;
  }, [isConnected, subscribe]);

  // Initial fetch
  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchWorkflows();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchWorkflows]);

  // WebSocket subscriptions
  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to workflow updates
    subscribe('workflow-update', (data: { workflowId: string; updates: Partial<Workflow> }) => {
      setWorkflows(prev => prev.map(workflow =>
        workflow.id === data.workflowId
          ? { ...workflow, ...data.updates }
          : workflow
      ));
    });

    // Subscribe to step updates
    subscribe('step-update', (data: { workflowId: string; stepId: string; updates: Partial<WorkflowStep> }) => {
      setWorkflows(prev => prev.map(workflow =>
        workflow.id === data.workflowId
          ? {
              ...workflow,
              steps: workflow.steps.map(step =>
                step.id === data.stepId
                  ? { ...step, ...data.updates }
                  : step
              )
            }
          : workflow
      ));
    });

    // Subscribe to workflow completion
    subscribe('workflow-completed', (data: { workflowId: string; successRate: number; duration: number }) => {
      setWorkflows(prev => prev.map(workflow =>
        workflow.id === data.workflowId
          ? {
              ...workflow,
              status: 'completed' as const,
              endTime: new Date().toISOString(),
              totalDuration: data.duration,
              successRate: data.successRate
            }
          : workflow
      ));
    });

    // Subscribe to workflow failures
    subscribe('workflow-failed', (data: { workflowId: string; error: string }) => {
      setWorkflows(prev => prev.map(workflow =>
        workflow.id === data.workflowId
          ? {
              ...workflow,
              status: 'failed' as const,
              endTime: new Date().toISOString()
            }
          : workflow
      ));
    });

  }, [isConnected, subscribe]);

  return {
    workflows,
    templates,
    loading,
    error,
    createWorkflow,
    startWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    cancelWorkflow,
    updateStep,
    getWorkflowById,
    getWorkflowsByStatus,
    getWorkflowsByType,
    refreshWorkflows,
    subscribeToWorkflow
  };
};