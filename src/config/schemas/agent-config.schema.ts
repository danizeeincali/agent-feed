/**
 * Agent Configuration Schema (User-Editable Fields)
 *
 * This schema defines the structure of user-editable agent configuration fields.
 * These fields control agent personality, behavior, and preferences but do NOT
 * include protected system-level settings (API access, resource limits, etc.).
 *
 * Architecture: Hybrid Markdown + Protected Sidecar
 * Location: /workspaces/agent-feed/src/config/schemas/agent-config.schema.ts
 */

import { z } from 'zod';
import { ProtectedConfig } from './protected-config.schema';

/**
 * Agent Personality Configuration
 * Defines communication style and tone preferences
 */
export const PersonalityConfigSchema = z.object({
  tone: z.string()
    .optional()
    .describe('Communication tone (e.g., professional, friendly, concise)'),

  style: z.string()
    .optional()
    .describe('Writing style (e.g., technical, conversational, academic)'),

  emoji_usage: z.enum(['none', 'minimal', 'moderate', 'expressive'])
    .default('minimal')
    .optional()
    .describe('Emoji usage preference'),

  verbosity: z.enum(['concise', 'balanced', 'detailed'])
    .default('balanced')
    .optional()
    .describe('Response length preference'),
});

export type PersonalityConfig = z.infer<typeof PersonalityConfigSchema>;

/**
 * Priority Preferences
 * Defines how agent prioritizes work
 */
export const PriorityPreferencesSchema = z.object({
  focus: z.string()
    .optional()
    .describe('Primary focus area (e.g., quality, speed, collaboration)'),

  timeframe: z.enum(['immediate', 'short_term', 'long_term', 'balanced'])
    .default('balanced')
    .optional()
    .describe('Preferred timeframe for work'),

  task_selection: z.enum(['automatic', 'guided', 'manual'])
    .default('automatic')
    .optional()
    .describe('How agent selects tasks'),
});

export type PriorityPreferences = z.infer<typeof PriorityPreferencesSchema>;

/**
 * Notification Preferences
 * Defines when and how agent sends notifications
 */
export const NotificationPreferencesSchema = z.object({
  on_start: z.boolean()
    .default(false)
    .optional()
    .describe('Notify when starting work'),

  on_complete: z.boolean()
    .default(true)
    .optional()
    .describe('Notify when completing tasks'),

  on_error: z.boolean()
    .default(true)
    .optional()
    .describe('Notify on errors'),

  on_milestone: z.boolean()
    .default(false)
    .optional()
    .describe('Notify on significant milestones'),
});

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

/**
 * Agent Configuration Schema (User-Editable)
 * Main schema for agent configuration from frontmatter
 */
export const AgentConfigSchema = z.object({
  // Required fields
  name: z.string()
    .min(1)
    .max(100)
    .describe('Agent display name'),

  description: z.string()
    .min(1)
    .max(500)
    .describe('Agent purpose and capabilities description'),

  tools: z.array(z.string())
    .min(1)
    .describe('Available tools (e.g., Read, Write, Bash)'),

  model: z.enum(['haiku', 'sonnet', 'opus'])
    .describe('Claude model to use'),

  // Optional visual/metadata fields
  color: z.string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .describe('UI color theme (hex color)'),

  proactive: z.boolean()
    .default(false)
    .optional()
    .describe('Whether agent proactively suggests tasks'),

  priority: z.enum(['P0', 'P1', 'P2', 'P3'])
    .optional()
    .describe('Agent priority level'),

  // User customization fields
  personality: PersonalityConfigSchema
    .optional()
    .describe('Personality and communication preferences'),

  specialization: z.array(z.string())
    .optional()
    .describe('Domain expertise areas'),

  custom_instructions: z.string()
    .max(5000)
    .optional()
    .describe('Custom task-specific guidance'),

  autonomous_mode: z.enum(['supervised', 'collaborative', 'autonomous'])
    .default('collaborative')
    .optional()
    .describe('Level of autonomy'),

  priority_preferences: PriorityPreferencesSchema
    .optional()
    .describe('Work prioritization preferences'),

  notification_preferences: NotificationPreferencesSchema
    .optional()
    .describe('Notification settings'),

  // Internal system fields (optional, added at runtime)
  _protected_config_source: z.string()
    .optional()
    .describe('Path to protected config sidecar (if exists)'),

  _body: z.string()
    .optional()
    .describe('Markdown body content from agent file'),

  _protected: z.any()
    .optional()
    .describe('Protected configuration (merged at runtime)'),

  _permissions: z.any()
    .optional()
    .describe('Protected permissions (merged at runtime)'),

  _resource_limits: z.any()
    .optional()
    .describe('Protected resource limits (merged at runtime)'),

  _workspace: z.any()
    .optional()
    .describe('Protected workspace config (merged at runtime)'),

  _api_access: z.any()
    .optional()
    .describe('Protected API access config (merged at runtime)'),

  _tool_permissions: z.any()
    .optional()
    .describe('Protected tool permissions (merged at runtime)'),

  // Allow additional fields from frontmatter
}).passthrough();

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

/**
 * Merged Agent Configuration
 * Agent config with protected fields merged in
 */
export interface MergedAgentConfig extends AgentConfig {
  _protected?: ProtectedConfig;
  _permissions?: ProtectedConfig['permissions'];
}

/**
 * Validation helper: Validate agent config
 */
export function validateAgentConfig(data: unknown): AgentConfig {
  return AgentConfigSchema.parse(data);
}

/**
 * Validation helper: Safe validation with error details
 */
export function safeValidateAgentConfig(data: unknown): {
  success: boolean;
  data?: AgentConfig;
  errors?: z.ZodError;
} {
  const result = AgentConfigSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Example agent configuration
 */
export const exampleAgentConfig: AgentConfig = {
  name: 'Strategic Planner',
  description: 'Strategic planning and goal analysis specialist',
  tools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
  model: 'sonnet',
  color: '#3B82F6',
  proactive: true,
  priority: 'P1',
  personality: {
    tone: 'professional',
    style: 'strategic',
    emoji_usage: 'minimal',
    verbosity: 'detailed',
  },
  specialization: [
    'strategic planning',
    'roadmap creation',
    'goal analysis',
  ],
  custom_instructions: 'Focus on long-term business value and impact assessment',
  autonomous_mode: 'collaborative',
  priority_preferences: {
    focus: 'quality',
    timeframe: 'long_term',
    task_selection: 'automatic',
  },
  notification_preferences: {
    on_start: false,
    on_complete: true,
    on_error: true,
    on_milestone: true,
  },
  _protected_config_source: '.system/strategic-planner.protected.yaml',
};
