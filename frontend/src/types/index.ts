// Re-export monitoring types from MonitoringApiService
export type {
  Alert,
  AlertsResponse,
  AlertHistoryResponse,
  HealthStatus,
  ComponentHealth,
  SystemMetrics,
  CpuMetrics,
  MemoryMetrics,
  DiskMetrics,
  NetworkMetrics,
  RequestMetrics,
  ErrorMetrics,
  RecentError,
  CacheMetrics,
  QueueMetrics,
  HistoricalStats,
  MetricDataPoint,
  TrendAnalysis
} from '../services/MonitoringApiService';

// Re-export agent tier system types
export type {
  Agent,
  AgentListResponse,
  TierFilter,
  AgentFilterState
} from './agent';

// Legacy orchestration agent interface (deprecated - use Agent from ./agent)
export interface LegacyAgent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  capabilities: string[];
  performance: AgentPerformance;
  lastActive: Date;
}

export type AgentType = 
  | 'researcher' 
  | 'coder' 
  | 'tester' 
  | 'planner' 
  | 'reviewer'
  | 'coordinator'
  | 'analyst'
  | 'optimizer'
  | 'specialist';

export type AgentStatus = 'idle' | 'active' | 'busy' | 'error' | 'offline';

export interface AgentPerformance {
  tasksCompleted: number;
  averageCompletionTime: number;
  successRate: number;
  efficiency: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgents: string[];
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  estimatedDuration?: number;
  actualDuration?: number;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  tasks: Task[];
  progress: number;
  createdAt: Date;
  estimatedCompletion?: Date;
}

export type WorkflowStatus = 'draft' | 'running' | 'paused' | 'completed' | 'failed';

export interface WorkflowUpdate {
  type: 'task_started' | 'task_completed' | 'task_failed' | 'workflow_progress' | 'agent_status';
  payload: any;
  timestamp: Date;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface OrchestrationState {
  activeWorkflows: Workflow[];
  backgroundTasks: Task[];
  agentPool: Agent[];
  systemLoad: number;
  queueSize: number;
}