import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GitBranch,
  Play,
  Pause,
  Square,
  Plus,
  Edit3,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Settings,
  Copy,
  Download,
  Upload,
  Filter,
  Search,
  Workflow,
  ArrowRight,
  MoreHorizontal,
  Eye,
  Calendar,
  Zap,
  Brain,
  Code,
  TestTube,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  agent_type: string;
  dependencies: string[];
  parameters: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  duration?: number;
  output?: string;
  error_message?: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sparc' | 'development' | 'testing' | 'deployment' | 'analysis';
  steps: WorkflowStep[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
  usage_count: number;
  success_rate: number;
}

interface WorkflowExecution {
  id: string;
  template_id: string;
  template_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  duration?: number;
  steps: WorkflowStep[];
  current_step?: string;
  progress: number;
  assigned_agents: string[];
  total_tokens_used: number;
  success_rate: number;
}

interface WorkflowOrchestratorProps {
  className?: string;
}

const WORKFLOW_CATEGORIES = {
  sparc: { name: 'SPARC Methodology', color: 'purple', icon: Brain },
  development: { name: 'Development', color: 'blue', icon: Code },
  testing: { name: 'Testing & QA', color: 'green', icon: TestTube },
  deployment: { name: 'Deployment', color: 'orange', icon: Zap },
  analysis: { name: 'Analysis', color: 'pink', icon: Eye }
};

const PREDEFINED_TEMPLATES: Partial<WorkflowTemplate>[] = [
  {
    id: 'sparc-full',
    name: 'Complete SPARC Development',
    description: 'Full SPARC methodology workflow from specification to completion',
    category: 'sparc',
    steps: [
      { id: '1', name: 'Specification', description: 'Analyze requirements and create specifications', agent_type: 'specification', dependencies: [], parameters: {}, status: 'pending' },
      { id: '2', name: 'Pseudocode', description: 'Generate pseudocode from specifications', agent_type: 'pseudocode', dependencies: ['1'], parameters: {}, status: 'pending' },
      { id: '3', name: 'Architecture', description: 'Design system architecture', agent_type: 'architecture', dependencies: ['2'], parameters: {}, status: 'pending' },
      { id: '4', name: 'Refinement', description: 'Refine and optimize design', agent_type: 'refinement', dependencies: ['3'], parameters: {}, status: 'pending' },
      { id: '5', name: 'Implementation', description: 'Complete implementation', agent_type: 'coder', dependencies: ['4'], parameters: {}, status: 'pending' }
    ]
  },
  {
    id: 'rapid-prototype',
    name: 'Rapid Prototyping',
    description: 'Quick development cycle for prototyping',
    category: 'development',
    steps: [
      { id: '1', name: 'Research', description: 'Quick research and analysis', agent_type: 'researcher', dependencies: [], parameters: {}, status: 'pending' },
      { id: '2', name: 'Code Generation', description: 'Generate prototype code', agent_type: 'coder', dependencies: ['1'], parameters: {}, status: 'pending' },
      { id: '3', name: 'Testing', description: 'Basic testing and validation', agent_type: 'tester', dependencies: ['2'], parameters: {}, status: 'pending' }
    ]
  }
];

export const WorkflowOrchestrator: React.FC<WorkflowOrchestratorProps> = ({ className }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null);
  const [viewMode, setViewMode] = useState<'templates' | 'executions'>('templates');

  const queryClient = useQueryClient();

  // Fetch workflow templates
  const { data: templates = [], refetch: refetchTemplates } = useQuery<WorkflowTemplate[]>({
    queryKey: ['workflow-templates', selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      
      const response = await fetch(`/api/v1/workflows/templates?${params}`);
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    },
    initialData: PREDEFINED_TEMPLATES as WorkflowTemplate[]
  });

  // Fetch workflow executions
  const { data: executions = [], refetch: refetchExecutions } = useQuery<WorkflowExecution[]>({
    queryKey: ['workflow-executions'],
    queryFn: async () => {
      const response = await fetch('/api/v1/workflows/executions');
      if (!response.ok) throw new Error('Failed to fetch executions');
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds for running workflows
    initialData: []
  });

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Execute workflow mutation
  const executeWorkflow = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await fetch(`/api/v1/workflows/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId })
      });
      if (!response.ok) throw new Error('Failed to execute workflow');
      return response.json();
    },
    onSuccess: () => {
      refetchExecutions();
      queryClient.invalidateQueries({ queryKey: ['workflow-executions'] });
    }
  });

  // Control workflow execution
  const controlExecution = useMutation({
    mutationFn: async ({ executionId, action }: { executionId: string; action: 'pause' | 'resume' | 'cancel' }) => {
      const response = await fetch(`/api/v1/workflows/executions/${executionId}/${action}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error(`Failed to ${action} workflow`);
      return response.json();
    },
    onSuccess: () => {
      refetchExecutions();
    }
  });

  // Get status color and icon
  const getStatusDisplay = (status: string) => {
    const statusConfig = {
      pending: { color: 'text-gray-600 bg-gray-100', icon: Clock },
      running: { color: 'text-blue-600 bg-blue-100', icon: Play },
      completed: { color: 'text-green-600 bg-green-100', icon: CheckCircle },
      failed: { color: 'text-red-600 bg-red-100', icon: AlertTriangle },
      cancelled: { color: 'text-orange-600 bg-orange-100', icon: Square },
      skipped: { color: 'text-gray-600 bg-gray-100', icon: ArrowRight }
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center">
            <Workflow className="w-8 h-8 mr-3 text-purple-600" />
            Workflow Orchestrator
          </h2>
          <p className="text-gray-600 mt-1">Manage and execute automated agent workflows</p>
        </div>
        
        <div className="mt-4 lg:mt-0 flex items-center space-x-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('templates')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                viewMode === 'templates'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Templates
            </button>
            <button
              onClick={() => setViewMode('executions')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                viewMode === 'executions'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Executions
            </button>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      {viewMode === 'templates' && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {Object.entries(WORKFLOW_CATEGORIES).map(([key, config]) => (
                <option key={key} value={key}>{config.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Workflow className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Templates</p>
              <p className="text-2xl font-bold text-gray-900">{templates.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Play className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Running</p>
              <p className="text-2xl font-bold text-gray-900">
                {executions.filter(e => e.status === 'running').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {executions.filter(e => 
                  e.status === 'completed' && 
                  new Date(e.started_at).toDateString() === new Date().toDateString()
                ).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Duration</p>
              <p className="text-2xl font-bold text-gray-900">
                {executions.length > 0 
                  ? formatDuration(executions.reduce((acc, e) => acc + (e.duration || 0), 0) / executions.length)
                  : '0s'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'templates' ? (
        /* Templates Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const categoryConfig = WORKFLOW_CATEGORIES[template.category];
            const CategoryIcon = categoryConfig?.icon || Workflow;
            
            return (
              <div key={template.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 bg-${categoryConfig?.color || 'gray'}-100 rounded-lg`}>
                        <CategoryIcon className={`w-5 h-5 text-${categoryConfig?.color || 'gray'}-600`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-500">{categoryConfig?.name || 'Unknown'}</p>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mt-4 text-sm">{template.description}</p>
                  
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-gray-500">{template.steps.length} steps</span>
                    <span className="text-gray-500">Used {template.usage_count || 0} times</span>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Success Rate:</span>
                      <span className="text-sm font-medium text-green-600">
                        {((template.success_rate || 0.95) * 100).toFixed(1)}%
                      </span>
                    </div>
                    
                    <button
                      onClick={() => executeWorkflow.mutate(template.id)}
                      disabled={executeWorkflow.isPending}
                      className="flex items-center px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Execute
                    </button>
                  </div>
                </div>
                
                <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setSelectedTemplate(template)}
                        className="text-xs text-purple-600 hover:text-purple-800 transition-colors"
                      >
                        View Details
                      </button>
                      <button className="text-xs text-gray-600 hover:text-gray-800 transition-colors">
                        <Copy className="w-3 h-3 inline mr-1" />
                        Clone
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button className="p-1 text-red-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Executions Table */
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Workflow Executions</h3>
              <button
                onClick={() => refetchExecutions()}
                className="flex items-center px-3 py-1 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workflow
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agents
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {executions.map((execution) => {
                  const statusDisplay = getStatusDisplay(execution.status);
                  const StatusIcon = statusDisplay.icon;
                  
                  return (
                    <tr key={execution.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{execution.template_name}</div>
                        <div className="text-sm text-gray-500">ID: {execution.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          statusDisplay.color
                        )}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {execution.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${execution.progress}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{execution.progress.toFixed(1)}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {execution.duration ? formatDuration(execution.duration) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{execution.assigned_agents.length}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(execution.started_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {execution.status === 'running' && (
                            <>
                              <button
                                onClick={() => controlExecution.mutate({ executionId: execution.id, action: 'pause' })}
                                className="text-orange-600 hover:text-orange-900 transition-colors"
                              >
                                <Pause className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => controlExecution.mutate({ executionId: execution.id, action: 'cancel' })}
                                className="text-red-600 hover:text-red-900 transition-colors"
                              >
                                <Square className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          
                          <button
                            onClick={() => setSelectedExecution(execution)}
                            className="text-purple-600 hover:text-purple-900 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No results */}
      {((viewMode === 'templates' && filteredTemplates.length === 0) || 
        (viewMode === 'executions' && executions.length === 0)) && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Workflow className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {viewMode === 'templates' ? 'No workflow templates found' : 'No executions found'}
          </h3>
          <p className="text-gray-500 mb-6">
            {viewMode === 'templates' 
              ? 'Create your first workflow template to get started' 
              : 'Execute a workflow template to see executions here'}
          </p>
          {viewMode === 'templates' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkflowOrchestrator;