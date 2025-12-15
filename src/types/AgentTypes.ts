/**
 * Type definitions for Agent System
 */

export interface AgentFrontmatter {
  name: string;
  description: string;
  tools: string[];
  model: 'haiku' | 'sonnet' | 'opus';
  color: string;
  proactive: boolean;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  usage: string;
}

export interface AgentDefinition extends AgentFrontmatter {
  body: string;
  filePath: string;
  lastModified: Date;
  workspaceDirectory: string;
}

export interface AgentWorkspace {
  name: string;
  directory: string;
  files: string[];
  logs: AgentLog[];
  lastActivity: Date;
}

export interface AgentLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, any>;
}

export interface AgentMetrics {
  name: string;
  totalInvocations: number;
  successRate: number;
  averageResponseTime: number;
  lastUsed: Date;
  errorCount: number;
}

export class AgentParseError extends Error {
  constructor(message: string, public readonly filePath?: string) {
    super(message);
    this.name = 'AgentParseError';
  }
}

export class AgentDiscoveryError extends Error {
  constructor(message: string, public readonly directory?: string) {
    super(message);
    this.name = 'AgentDiscoveryError';
  }
}

export class AgentWorkspaceError extends Error {
  constructor(message: string, public readonly agentName?: string) {
    super(message);
    this.name = 'AgentWorkspaceError';
  }
}

export interface DatabaseSchema {
  agents: {
    id: number;
    name: string;
    slug: string;
    description: string;
    tools: string; // JSON array
    model: string;
    color: string;
    proactive: boolean;
    priority: string;
    usage: string;
    body: string;
    file_path: string;
    workspace_directory: string;
    created_at: Date;
    updated_at: Date;
    last_modified: Date;
  };
  agent_metrics: {
    id: number;
    agent_name: string;
    total_invocations: number;
    success_rate: number;
    average_response_time: number;
    last_used: Date;
    error_count: number;
    created_at: Date;
    updated_at: Date;
  };
  agent_workspaces: {
    id: number;
    agent_name: string;
    directory: string;
    files: string; // JSON array
    last_activity: Date;
    created_at: Date;
    updated_at: Date;
  };
  agent_logs: {
    id: number;
    agent_name: string;
    level: string;
    message: string;
    context: string; // JSON object
    timestamp: Date;
  };
}