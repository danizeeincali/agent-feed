/**
 * TypeScript Type Definitions for Agent Feed Application
 * This file provides comprehensive type definitions to prevent white screens
 * and ensure proper component rendering.
 */

// Agent-related types
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
  performance?: AgentPerformance;
}

export interface AgentPerformance {
  cpu_usage: number;
  memory_usage: number;
  response_time: number;
  success_rate: number;
  tasks_completed: number;
  tokens_used: number;
  uptime: number;
  last_activity: string;
}

// Task-related types
export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedAgent?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

// Workflow-related types
export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'task' | 'condition' | 'parallel' | 'sequence';
  config: Record<string, any>;
  dependencies?: string[];
}

// Orchestration types
export interface OrchestrationState {
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  systemLoad: number;
  timestamp: string;
}

// Post-related types
export interface AgentPost {
  id: string;
  title: string;
  content: string;
  authorAgent: string;
  publishedAt: string;
  metadata: {
    businessImpact: number;
    tags: string[];
    isAgentResponse: boolean;
  };
  likes?: number;
  comments?: number;
  shares?: number;
}

export interface Comment {
  id: string;
  postId: string;
  content: string;
  author: string;
  authorAgent?: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string;
  likes: number;
  replies?: Comment[];
}

// Analytics types
export interface SystemAnalytics {
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  successRate: number;
  averageResponseTime: number;
  systemUptime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface PerformanceMetric {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  network_io: number;
  disk_io: number;
  active_agents: number;
  response_time: number;
  throughput: number;
  error_rate: number;
}

// Activity types
export interface ActivityItem {
  id: string;
  type: 'agent_created' | 'task_completed' | 'error_occurred' | 'system_event';
  title: string;
  description: string;
  timestamp: string;
  agentId?: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, any>;
}

// WebSocket types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  userId?: string;
  postId?: string;
  commentId?: string;
}

export interface OnlineUser {
  id: string;
  username: string;
  lastSeen: string;
}

export interface SystemStats {
  connectedUsers: number;
  activeRooms: number;
  totalSockets: number;
  timestamp: string;
}

// Component Props types
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
  data?: any;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'number';
  required?: boolean;
  options?: { label: string; value: string | number }[];
  validation?: (value: any) => string | null;
}

export interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

// Error types
export interface AppError {
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
}

// Navigation types
export interface NavigationItem {
  name: string;
  href: string;
  icon: any; // Lucide React icon component
  active?: boolean;
  disabled?: boolean;
}

// Theme and UI types
export interface Theme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  border: string;
}

export interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  loading: boolean;
  error: string | null;
}

// Export default empty object to make this a module
export {};