/**
 * Agent Context Types for 3-Tier Protected Context Composition
 *
 * TIER 1: System Core (Protected) - Cannot be overridden by users
 * TIER 2: User Customizations - User can personalize
 * TIER 3: Runtime Composition - Merged context
 */

export interface PostingRules {
  max_length: number;
  min_interval_seconds: number;
  rate_limit_per_hour: number;
  required_hashtags?: string[];
  prohibited_words?: string[];
}

export interface ApiSchema {
  platform: string;
  endpoints: {
    post: string;
    reply: string;
  };
  auth_type: string;
}

export interface SafetyConstraints {
  content_filters: string[];
  max_mentions_per_post: number;
  requires_human_review?: string[];
}

export interface ResponseStyle {
  tone: string;
  length: string;
  use_emojis: boolean;
  preferred_language?: string;
}

/**
 * System Template (TIER 1) - Immutable system defaults
 * Stored in system_agent_templates table
 */
export interface SystemTemplate {
  name: string;
  version: number;

  // PROTECTED FIELDS - Never user-editable
  model: string | null;                    // Claude model (null = use env default)
  posting_rules: PostingRules;             // Rate limits, length, format
  api_schema: ApiSchema;                   // Platform API requirements
  safety_constraints: SafetyConstraints;   // Content filters, prohibited actions

  // DEFAULT CUSTOMIZABLE FIELDS
  default_personality: string;
  default_response_style: ResponseStyle;

  created_at?: Date;
  updated_at?: Date;
}

/**
 * User Customization (TIER 2) - User's personalized agent
 * Stored in user_agent_customizations table
 */
export interface UserCustomization {
  id?: number;
  user_id: string;
  agent_template: string;

  // USER-EDITABLE FIELDS ONLY
  custom_name?: string;           // "My Tech Buddy"
  personality?: string;           // Override default personality
  interests?: string[];           // ["AI", "startups", "crypto"]
  response_style?: ResponseStyle; // {tone: "casual", length: "brief"}
  enabled?: boolean;

  created_at?: Date;
  updated_at?: Date;
}

/**
 * Agent Context (TIER 3) - Composed runtime context
 * Result of merging system template + user customizations
 */
export interface AgentContext {
  // TIER 1: PROTECTED - User cannot change
  model: string | null;
  posting_rules: PostingRules;
  api_schema: ApiSchema;
  safety_constraints: SafetyConstraints;

  // TIER 2: CUSTOMIZABLE - User overrides apply
  personality: string;
  interests: string[];
  response_style: ResponseStyle;

  // Agent identity
  agentName: string;
  version: number;
}

/**
 * Security Error - Thrown when user attempts to override protected fields
 */
export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Validation Error - Thrown when customizations are invalid
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Protected field names - cannot be overridden by user customizations
 */
export const PROTECTED_FIELDS = ['model', 'posting_rules', 'api_schema', 'safety_constraints'] as const;

export type ProtectedField = typeof PROTECTED_FIELDS[number];
