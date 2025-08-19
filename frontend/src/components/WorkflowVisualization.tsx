import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { 
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Workflow,
  GitBranch,
  Timer,
  Target,
  Layers,
  Activity,
  ZapOff,
  Pause
} from 'lucide-react';
import { cn } from '../utils/cn';

interface WorkflowStep {
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
}

interface Workflow {
  id: string;
  name: string;
  type: 'sparc' | 'custom' | 'deployment' | 'analysis';
  status: 'running' | 'completed' | 'failed' | 'paused';
  steps: WorkflowStep[];
  startTime: string;
  endTime?: string;
  totalDuration?: number;
  success_rate?: number;
  assignedAgents: string[];
}

interface WorkflowVisualizationProps {
  className?: string;
}

const WorkflowVisualization: React.FC<WorkflowVisualizationProps> = ({ className = '' }) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'timeline' | 'dependency'>('timeline');

  const { isConnected, subscribe } = useWebSocket();

  // Mock workflow data
  const mockWorkflows: Workflow[] = [
    {
      id: 'sparc-001',
      name: 'SPARC Development Cycle',
      type: 'sparc',
      status: 'running',
      startTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      assignedAgents: ['chief-of-staff', 'code-review', 'testing', 'documentation'],
      steps: [
        {
          id: 'specification',
          name: 'Specification',
          description: 'Define requirements and specifications',
          status: 'completed',
          agentId: 'chief-of-staff',
          agentName: 'Chief of Staff Agent',
          startTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
          duration: 10,
          dependencies: [],
          outputs: ['requirements.md', 'specifications.yaml'],
          progress: 100
        },
        {
          id: 'pseudocode',
          name: 'Pseudocode',
          description: 'Create algorithmic pseudocode',
          status: 'completed',
          agentId: 'code-review',
          agentName: 'Code Review Agent',
          startTime: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          duration: 10,
          dependencies: ['specification'],
          outputs: ['algorithm.pseudo', 'flow-diagram.md'],
          progress: 100
        },
        {
          id: 'architecture',
          name: 'Architecture',
          description: 'Design system architecture',
          status: 'completed',
          agentId: 'backend',
          agentName: 'Backend Agent',
          startTime: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          duration: 10,
          dependencies: ['pseudocode'],
          outputs: ['architecture.md', 'api-spec.yaml'],
          progress: 100
        },
        {
          id: 'refinement',
          name: 'Refinement',
          description: 'Implement and refine solution',
          status: 'in_progress',
          agentId: 'frontend',
          agentName: 'Frontend Agent',
          startTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          duration: 20,
          dependencies: ['architecture'],
          outputs: ['components/', 'tests/'],
          progress: 65
        },
        {
          id: 'completion',
          name: 'Completion',
          description: 'Final testing and deployment',
          status: 'pending',
          agentId: 'testing',
          agentName: 'Testing Agent',
          dependencies: ['refinement'],
          outputs: ['test-results.json', 'deployment.yaml'],
          progress: 0
        }
      ]
    },
    {
      id: 'deployment-002',
      name: 'Production Deployment',
      type: 'deployment',
      status: 'completed',
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      totalDuration: 30,
      success_rate: 100,
      assignedAgents: ['devops', 'security', 'monitoring'],
      steps: [
        {
          id: 'security-scan',
          name: 'Security Scan',
          description: 'Run security vulnerability scan',
          status: 'completed',
          agentId: 'security',
          agentName: 'Security Agent',
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
          duration: 10,
          dependencies: [],
          outputs: ['security-report.json'],
          progress: 100
        },
        {
          id: 'build-deploy',
          name: 'Build & Deploy',
          description: 'Build application and deploy to production',
          status: 'completed',
          agentId: 'devops',
          agentName: 'DevOps Agent',
          startTime: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
          duration: 15,
          dependencies: ['security-scan'],
          outputs: ['build-artifacts', 'deployment-logs'],
          progress: 100
        },
        {
          id: 'monitoring-setup',
          name: 'Monitoring Setup',
          description: 'Configure monitoring and alerts',
          status: 'completed',
          agentId: 'monitoring',
          agentName: 'Monitoring Agent',
          startTime: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
          duration: 5,
          dependencies: ['build-deploy'],
          outputs: ['monitoring-config.yaml'],
          progress: 100
        }
      ]
    },
    {
      id: 'analysis-003',
      name: 'Performance Analysis',
      type: 'analysis',
      status: 'running',
      startTime: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      assignedAgents: ['performance', 'analytics', 'database'],
      steps: [
        {
          id: 'data-collection',
          name: 'Data Collection',
          description: 'Collect performance metrics',
          status: 'completed',
          agentId: 'analytics',
          agentName: 'Analytics Agent',
          startTime: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          duration: 5,
          dependencies: [],
          outputs: ['metrics.json'],
          progress: 100
        },
        {
          id: 'performance-analysis',
          name: 'Performance Analysis',
          description: 'Analyze system performance bottlenecks',
          status: 'in_progress',
          agentId: 'performance',
          agentName: 'Performance Agent',
          startTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          dependencies: ['data-collection'],
          outputs: ['performance-report.md'],
          progress: 40
        },
        {
          id: 'database-optimization',
          name: 'Database Optimization',
          description: 'Optimize database queries and performance',
          status: 'pending',
          agentId: 'database',
          agentName: 'Database Agent',
          dependencies: ['performance-analysis'],
          outputs: ['optimized-queries.sql'],
          progress: 0
        }
      ]
    }
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setWorkflows(mockWorkflows);
      setSelectedWorkflow(mockWorkflows[0].id);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isConnected) {
      subscribe('workflow-update', (data) => {
        setWorkflows(prev => prev.map(workflow =>
          workflow.id === data.workflowId
            ? { ...workflow, ...data.updates }
            : workflow
        ));
      });

      subscribe('step-update', (data) => {
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
    }
  }, [isConnected, subscribe]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Activity className="w-5 h-5 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'paused':
        return <Pause className="w-5 h-5 text-yellow-500" />;
      case 'skipped':
        return <ZapOff className="w-5 h-5 text-gray-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'skipped':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getWorkflowTypeIcon = (type: string) => {
    switch (type) {
      case 'sparc':
        return '🔄';
      case 'deployment':
        return '🚀';
      case 'analysis':
        return '📊';
      default:
        return '⚙️';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const selectedWorkflowData = workflows.find(w => w.id === selectedWorkflow);

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Visualization</h1>
          <p className="text-gray-600">Monitor SPARC workflows and agent coordination</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('timeline')}
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-lg',
              viewMode === 'timeline'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            <Timer className="w-4 h-4 mr-2 inline" />
            Timeline
          </button>
          <button
            onClick={() => setViewMode('dependency')}
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-lg',
              viewMode === 'dependency'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            <GitBranch className="w-4 h-4 mr-2 inline" />
            Dependencies
          </button>
        </div>
      </div>

      {/* Workflow List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Workflows</h2>
          <div className="space-y-3">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                onClick={() => setSelectedWorkflow(workflow.id)}
                className={cn(
                  'p-4 rounded-lg border cursor-pointer transition-colors',
                  selectedWorkflow === workflow.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getWorkflowTypeIcon(workflow.type)}</span>
                    <h3 className="font-medium text-gray-900">{workflow.name}</h3>
                  </div>
                  <div className={cn(
                    'px-2 py-1 rounded-full border text-xs font-medium flex items-center gap-1',
                    getStatusColor(workflow.status)
                  )}>
                    {getStatusIcon(workflow.status)}
                    {workflow.status}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">
                  {workflow.steps.length} steps • {workflow.assignedAgents.length} agents
                </p>
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  Started {new Date(workflow.startTime).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workflow Detail */}
        <div className="lg:col-span-2">
          {selectedWorkflowData ? (
            <div className="space-y-6">
              {/* Workflow Header */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getWorkflowTypeIcon(selectedWorkflowData.type)}</span>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{selectedWorkflowData.name}</h2>
                      <p className="text-gray-600">Workflow ID: {selectedWorkflowData.id}</p>
                    </div>
                  </div>
                  <div className={cn(
                    'px-3 py-2 rounded-lg border text-sm font-medium flex items-center gap-2',
                    getStatusColor(selectedWorkflowData.status)
                  )}>
                    {getStatusIcon(selectedWorkflowData.status)}
                    {selectedWorkflowData.status}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Steps</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedWorkflowData.steps.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Assigned Agents</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedWorkflowData.assignedAgents.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedWorkflowData.totalDuration
                        ? formatDuration(selectedWorkflowData.totalDuration)
                        : 'In Progress'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Success Rate</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedWorkflowData.success_rate ? `${selectedWorkflowData.success_rate}%` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Workflow Steps */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Workflow Steps
                </h3>

                {viewMode === 'timeline' ? (
                  <div className="space-y-4">
                    {selectedWorkflowData.steps.map((step, index) => (
                      <div key={step.id} className="relative">
                        {/* Timeline connector */}
                        {index < selectedWorkflowData.steps.length - 1 && (
                          <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200"></div>
                        )}
                        
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            {getStatusIcon(step.status)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h4 className="font-medium text-gray-900">{step.name}</h4>
                                <p className="text-sm text-gray-600">{step.description}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {step.agentName && (
                                  <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full">
                                    {step.agentName}
                                  </span>
                                )}
                                <span className={cn(
                                  'px-2 py-1 rounded-full text-xs font-medium',
                                  getStatusColor(step.status)
                                )}>
                                  {step.status}
                                </span>
                              </div>
                            </div>
                            
                            {/* Progress bar for in-progress steps */}
                            {step.status === 'in_progress' && step.progress !== undefined && (
                              <div className="mb-2">
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="text-gray-600">Progress</span>
                                  <span className="text-gray-900">{step.progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${step.progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              {step.duration && (
                                <span className="flex items-center gap-1">
                                  <Timer className="w-3 h-3" />
                                  {formatDuration(step.duration)}
                                </span>
                              )}
                              {step.outputs && (
                                <span className="flex items-center gap-1">
                                  <Target className="w-3 h-3" />
                                  {step.outputs.length} outputs
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Dependency View */
                  <div className="space-y-6">
                    {selectedWorkflowData.steps.map((step) => (
                      <div
                        key={step.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(step.status)}
                            <h4 className="font-medium text-gray-900">{step.name}</h4>
                          </div>
                          <span className={cn(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            getStatusColor(step.status)
                          )}>
                            {step.status}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{step.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-2">Dependencies</p>
                            {step.dependencies.length > 0 ? (
                              <div className="space-y-1">
                                {step.dependencies.map((dep) => (
                                  <div key={dep} className="flex items-center gap-2 text-sm">
                                    <ArrowRight className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-700">{dep}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400">No dependencies</p>
                            )}
                          </div>
                          
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-2">Outputs</p>
                            {step.outputs && step.outputs.length > 0 ? (
                              <div className="space-y-1">
                                {step.outputs.map((output, index) => (
                                  <div key={index} className="flex items-center gap-2 text-sm">
                                    <Target className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-700">{output}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400">No outputs defined</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Workflow className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">Select a workflow to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowVisualization;