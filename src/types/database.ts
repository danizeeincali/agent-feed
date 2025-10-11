/**
 * Database Type Definitions
 * Phase 1: All 6 tables with exact column types
 *
 * 3-Tier Data Protection Model:
 * - TIER 1: system_agent_templates (Immutable system defaults)
 * - TIER 2: user_agent_customizations (User's personalized agents)
 * - TIER 3: agent_memories, agent_workspaces (User's conversation history and files)
 */

// TIER 1: System Agent Templates (Immutable system defaults)
export interface SystemAgentTemplate {
  name: string;                          // PRIMARY KEY
  version: number;                       // NOT NULL

  // PROTECTED FIELDS - Never user-editable
  model: string | null;                  // Claude model (null = use env default)
  posting_rules: PostingRules;           // JSONB NOT NULL
  api_schema: ApiSchema;                 // JSONB NOT NULL
  safety_constraints: SafetyConstraints; // JSONB NOT NULL

  // DEFAULT CUSTOMIZABLE FIELDS - Users can override
  default_personality: string | null;
  default_response_style: ResponseStyle | null; // JSONB

  // Metadata
  created_at: Date;                      // DEFAULT NOW()
  updated_at: Date;                      // DEFAULT NOW()
}

// TIER 2: User Agent Customizations (User's personalized agents)
export interface UserAgentCustomization {
  id: number;                            // SERIAL PRIMARY KEY
  user_id: string;                       // VARCHAR(100) NOT NULL
  agent_template: string;                // FK to system_agent_templates(name)

  // USER-EDITABLE FIELDS ONLY
  custom_name: string | null;            // VARCHAR(100)
  personality: string | null;            // TEXT
  interests: string[] | null;            // JSONB
  response_style: ResponseStyle | null;  // JSONB
  enabled: boolean;                      // DEFAULT TRUE

  // Metadata
  created_at: Date;                      // DEFAULT NOW()
  updated_at: Date;                      // DEFAULT NOW()
}

// TIER 3: Agent Memories (User's conversation history)
export interface AgentMemory {
  id: number;                            // SERIAL PRIMARY KEY
  user_id: string;                       // VARCHAR(100) NOT NULL
  agent_name: string;                    // VARCHAR(50) NOT NULL
  post_id: string | null;                // VARCHAR(100)
  content: string;                       // TEXT NOT NULL
  metadata: MemoryMetadata | null;       // JSONB
  created_at: Date;                      // DEFAULT NOW()
}

// TIER 3: Agent Workspaces (User's agent-generated files)
export interface AgentWorkspace {
  id: number;                            // SERIAL PRIMARY KEY
  user_id: string;                       // VARCHAR(100) NOT NULL
  agent_name: string;                    // VARCHAR(100) NOT NULL
  file_path: string;                     // TEXT NOT NULL
  content: Buffer | null;                // BYTEA
  metadata: WorkspaceMetadata | null;    // JSONB
  created_at: Date;                      // DEFAULT NOW()
  updated_at: Date;                      // DEFAULT NOW()
}

// Avi State (Single row for orchestrator state)
export interface AviState {
  id: number;                            // PRIMARY KEY DEFAULT 1, MUST be 1
  last_feed_position: string | null;     // VARCHAR(100)
  pending_tickets: Record<string, unknown> | null;  // JSONB (flexible structure)
  context_size: number;                  // DEFAULT 0
  last_restart: Date | null;             // TIMESTAMP
  uptime_seconds: number;                // DEFAULT 0
}

// Error Log (Error tracking)
export interface ErrorLog {
  id: number;                            // SERIAL PRIMARY KEY
  agent_name: string | null;             // VARCHAR(50)
  error_type: string | null;             // VARCHAR(50)
  error_message: string | null;          // TEXT
  context: ErrorContext | null;          // JSONB
  retry_count: number;                   // DEFAULT 0
  resolved: boolean;                     // DEFAULT FALSE
  created_at: Date;                      // DEFAULT NOW()
}

// ============================================================================
// Supporting Types (JSONB structures)
// ============================================================================

// Posting Rules (TIER 1 - Protected)
export interface PostingRules {
  max_length?: number;
  min_interval_seconds?: number;
  rate_limit_per_hour?: number;
  required_hashtags?: string[];
  prohibited_words?: string[];
  [key: string]: unknown; // Allow additional properties
}

// API Schema (TIER 1 - Protected)
export interface ApiSchema {
  platform?: string;
  endpoints?: {
    post?: string;
    reply?: string;
    [key: string]: string | undefined;
  };
  auth_type?: string;
  [key: string]: unknown; // Allow additional properties
}

// Safety Constraints (TIER 1 - Protected)
export interface SafetyConstraints {
  content_filters?: string[];
  max_mentions_per_post?: number;
  requires_human_review?: string[];
  [key: string]: unknown; // Allow additional properties
}

// Response Style (TIER 1 defaults, TIER 2 customizable)
export interface ResponseStyle {
  tone?: string;
  length?: string;
  use_emojis?: boolean;
  [key: string]: unknown; // Allow additional properties
}

// Memory Metadata (TIER 3)
export interface MemoryMetadata {
  topic?: string;
  sentiment?: string;
  mentioned_users?: string[];
  [key: string]: unknown; // Allow additional properties
}

// Workspace Metadata (TIER 3)
export interface WorkspaceMetadata {
  file_type?: string;
  size_bytes?: number;
  encoding?: string;
  [key: string]: unknown; // Allow additional properties
}

// Work Ticket (for avi_state.pending_tickets)
export interface WorkTicket {
  id: string;
  postId: string;
  postContent: string;
  postAuthor: string;
  assignedAgent: string;
  relevantMemories?: unknown[];
  createdAt: number;
}

// Error Context (for error_log.context)
export interface ErrorContext {
  ticket_id?: string;
  user_id?: string;
  agent_name?: string;
  error_stack?: string;
  [key: string]: unknown; // Allow additional properties
}

// ============================================================================
// Type Guards
// ============================================================================

export function isSystemAgentTemplate(obj: unknown): obj is SystemAgentTemplate {
  const template = obj as SystemAgentTemplate;
  return (
    typeof template === 'object' &&
    template !== null &&
    typeof template.name === 'string' &&
    typeof template.version === 'number' &&
    (template.model === null || typeof template.model === 'string') &&
    typeof template.posting_rules === 'object' &&
    typeof template.api_schema === 'object' &&
    typeof template.safety_constraints === 'object'
  );
}

export function isUserAgentCustomization(obj: unknown): obj is UserAgentCustomization {
  const custom = obj as UserAgentCustomization;
  return (
    typeof custom === 'object' &&
    custom !== null &&
    typeof custom.id === 'number' &&
    typeof custom.user_id === 'string' &&
    typeof custom.agent_template === 'string' &&
    typeof custom.enabled === 'boolean'
  );
}

export function isAgentMemory(obj: unknown): obj is AgentMemory {
  const memory = obj as AgentMemory;
  return (
    typeof memory === 'object' &&
    memory !== null &&
    typeof memory.id === 'number' &&
    typeof memory.user_id === 'string' &&
    typeof memory.agent_name === 'string' &&
    typeof memory.content === 'string'
  );
}

export function isAgentWorkspace(obj: unknown): obj is AgentWorkspace {
  const workspace = obj as AgentWorkspace;
  return (
    typeof workspace === 'object' &&
    workspace !== null &&
    typeof workspace.id === 'number' &&
    typeof workspace.user_id === 'string' &&
    typeof workspace.agent_name === 'string' &&
    typeof workspace.file_path === 'string'
  );
}

export function isAviState(obj: unknown): obj is AviState {
  const state = obj as AviState;
  return (
    typeof state === 'object' &&
    state !== null &&
    typeof state.id === 'number' &&
    state.id === 1 && // Must be exactly 1
    typeof state.context_size === 'number' &&
    typeof state.uptime_seconds === 'number'
  );
}

export function isErrorLog(obj: unknown): obj is ErrorLog {
  const error = obj as ErrorLog;
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof error.id === 'number' &&
    typeof error.retry_count === 'number' &&
    typeof error.resolved === 'boolean'
  );
}
