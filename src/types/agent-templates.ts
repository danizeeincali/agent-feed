/**
 * Agent Template Type Definitions and Validation
 * Phase 1: Template types with runtime validation using Zod
 */

import { z } from 'zod';

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

// Posting Rules Schema
export const PostingRulesSchema = z.object({
  max_length: z.number().int().positive().optional(),
  min_interval_seconds: z.number().int().nonnegative().optional(),
  rate_limit_per_hour: z.number().int().positive().optional(),
  required_hashtags: z.array(z.string()).optional(),
  prohibited_words: z.array(z.string()).optional(),
}).catchall(z.unknown()); // Allow additional properties

// API Schema
export const ApiSchemaSchema = z.object({
  platform: z.string().min(1).optional(),
  endpoints: z.object({
    post: z.string().min(1).optional(),
    reply: z.string().min(1).optional(),
  }).catchall(z.string()).optional(), // Allow additional endpoints
  auth_type: z.string().min(1).optional(),
}).catchall(z.unknown()); // Allow additional properties

// Safety Constraints Schema
export const SafetyConstraintsSchema = z.object({
  content_filters: z.array(z.string()).optional(),
  max_mentions_per_post: z.number().int().nonnegative().optional(),
  requires_human_review: z.array(z.string()).optional(),
}).catchall(z.unknown()); // Allow additional properties

// Response Style Schema
export const ResponseStyleSchema = z.object({
  tone: z.string().min(1).optional(),
  length: z.string().min(1).optional(),
  use_emojis: z.boolean().optional(),
}).catchall(z.unknown()); // Allow additional properties

// System Agent Template Config (from JSON file)
export const SystemTemplateConfigSchema = z.object({
  name: z.string().min(1).max(50),
  version: z.number().int().positive(),
  model: z.string().nullable(),
  posting_rules: PostingRulesSchema,
  api_schema: ApiSchemaSchema,
  safety_constraints: SafetyConstraintsSchema,
  default_personality: z.string().nullable(),
  default_response_style: ResponseStyleSchema.nullable(),
});

// User Customization Input (API request)
export const UserCustomizationInputSchema = z.object({
  agent_template: z.string().min(1).max(50),
  custom_name: z.string().max(100).nullable().optional(),
  personality: z.string().max(5000).nullable().optional(),
  interests: z.array(z.string()).max(50).nullable().optional(),
  response_style: ResponseStyleSchema.nullable().optional(),
  enabled: z.boolean().optional(),
});

// Memory Metadata Schema
export const MemoryMetadataSchema = z.object({
  topic: z.string().optional(),
  sentiment: z.string().optional(),
  mentioned_users: z.array(z.string()).optional(),
}).catchall(z.unknown()); // Allow additional properties

// Workspace Metadata Schema
export const WorkspaceMetadataSchema = z.object({
  file_type: z.string().optional(),
  size_bytes: z.number().int().nonnegative().optional(),
  encoding: z.string().optional(),
}).catchall(z.unknown()); // Allow additional properties

// Work Ticket Schema
export const WorkTicketSchema = z.object({
  id: z.string(),
  postId: z.string(),
  postContent: z.string(),
  postAuthor: z.string(),
  assignedAgent: z.string(),
  relevantMemories: z.array(z.unknown()).optional(),
  createdAt: z.number().int().positive(),
});

// Error Context Schema
export const ErrorContextSchema = z.object({
  ticket_id: z.string().optional(),
  user_id: z.string().optional(),
  agent_name: z.string().optional(),
  error_stack: z.string().optional(),
}).catchall(z.unknown()); // Allow additional properties

// ============================================================================
// Type Inference from Schemas
// ============================================================================

export type PostingRules = z.infer<typeof PostingRulesSchema>;
export type ApiSchema = z.infer<typeof ApiSchemaSchema>;
export type SafetyConstraints = z.infer<typeof SafetyConstraintsSchema>;
export type ResponseStyle = z.infer<typeof ResponseStyleSchema>;
export type SystemTemplateConfig = z.infer<typeof SystemTemplateConfigSchema>;
export type UserCustomizationInput = z.infer<typeof UserCustomizationInputSchema>;
export type MemoryMetadata = z.infer<typeof MemoryMetadataSchema>;
export type WorkspaceMetadata = z.infer<typeof WorkspaceMetadataSchema>;
export type WorkTicket = z.infer<typeof WorkTicketSchema>;
export type ErrorContext = z.infer<typeof ErrorContextSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate system template configuration from JSON file
 */
export function validateSystemTemplateConfig(
  data: unknown
): { success: true; data: SystemTemplateConfig } | { success: false; errors: z.ZodError } {
  const result = SystemTemplateConfigSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Validate user customization input (ensure no protected fields)
 */
export function validateUserCustomizationInput(
  data: unknown
): { success: true; data: UserCustomizationInput } | { success: false; errors: z.ZodError | string } {
  // Check for protected fields first
  const PROTECTED_FIELDS = ['model', 'posting_rules', 'api_schema', 'safety_constraints'];

  if (typeof data === 'object' && data !== null) {
    for (const field of PROTECTED_FIELDS) {
      if (field in data) {
        return {
          success: false,
          errors: `Cannot customize protected field: ${field}`,
        };
      }
    }
  }

  const result = UserCustomizationInputSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Validate memory metadata
 */
export function validateMemoryMetadata(
  data: unknown
): { success: true; data: MemoryMetadata } | { success: false; errors: z.ZodError } {
  const result = MemoryMetadataSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Validate workspace metadata
 */
export function validateWorkspaceMetadata(
  data: unknown
): { success: true; data: WorkspaceMetadata } | { success: false; errors: z.ZodError } {
  const result = WorkspaceMetadataSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Validate work ticket
 */
export function validateWorkTicket(
  data: unknown
): { success: true; data: WorkTicket } | { success: false; errors: z.ZodError } {
  const result = WorkTicketSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Validate error context
 */
export function validateErrorContext(
  data: unknown
): { success: true; data: ErrorContext } | { success: false; errors: z.ZodError } {
  const result = ErrorContextSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

// ============================================================================
// Constants
// ============================================================================

export const PROTECTED_TEMPLATE_FIELDS = [
  'model',
  'posting_rules',
  'api_schema',
  'safety_constraints',
] as const;

export const CUSTOMIZABLE_TEMPLATE_FIELDS = [
  'custom_name',
  'personality',
  'interests',
  'response_style',
] as const;

export const DEFAULT_MODELS = {
  AGENT_MODEL: 'claude-sonnet-4-5-20250929',
  AVI_MODEL: 'claude-sonnet-4-5-20250929',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if field is protected
 */
export function isProtectedField(field: string): boolean {
  return PROTECTED_TEMPLATE_FIELDS.includes(field as typeof PROTECTED_TEMPLATE_FIELDS[number]);
}

/**
 * Check if field is customizable
 */
export function isCustomizableField(field: string): boolean {
  return CUSTOMIZABLE_TEMPLATE_FIELDS.includes(field as typeof CUSTOMIZABLE_TEMPLATE_FIELDS[number]);
}

/**
 * Get model to use for agent
 * Priority: template.model > env var > hardcoded default
 */
export function getAgentModel(templateModel: string | null, envModel?: string): string {
  return templateModel || envModel || DEFAULT_MODELS.AGENT_MODEL;
}

/**
 * Get model to use for Avi orchestrator
 * Priority: env var > hardcoded default
 */
export function getAviModel(envModel?: string): string {
  return envModel || DEFAULT_MODELS.AVI_MODEL;
}
