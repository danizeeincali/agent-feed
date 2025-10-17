/**
 * Protected Agent Configuration Schema
 *
 * This schema defines the structure of protected configuration fields that
 * are system-controlled and cannot be edited by users. Protected fields
 * include API access rules, resource limits, security policies, and workspace
 * restrictions.
 *
 * Architecture: Hybrid Markdown + Protected Sidecar
 * Location: /workspaces/agent-feed/src/config/schemas/protected-config.schema.ts
 */

import { z } from 'zod';

/**
 * API Endpoint Configuration
 * Defines which API endpoints an agent can access, with what methods, and rate limits
 */
export const ApiEndpointSchema = z.object({
  path: z.string()
    .startsWith('/')
    .describe('API endpoint path (e.g., /api/posts)'),

  methods: z.array(
    z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  )
    .min(1)
    .describe('Allowed HTTP methods'),

  rate_limit: z.string()
    .regex(/^\d+\/(second|minute|hour|day)$/)
    .optional()
    .describe('Rate limit (e.g., 10/minute)'),

  authentication: z.enum(['required', 'optional', 'none'])
    .default('required')
    .describe('Authentication requirement level'),
});

export type ApiEndpoint = z.infer<typeof ApiEndpointSchema>;

/**
 * Workspace Configuration
 * Defines where an agent can read/write files and storage limits
 */
export const WorkspaceConfigSchema = z.object({
  root: z.string()
    .startsWith('/')
    .describe('Workspace root directory path'),

  subdirectory: z.string()
    .optional()
    .describe('Subdirectory within root for agent workspace'),

  max_storage: z.string()
    .regex(/^\d+[KMGT]?B$/)
    .optional()
    .describe('Maximum storage limit (e.g., 1GB, 500MB)'),

  allowed_paths: z.array(z.string())
    .optional()
    .describe('Glob patterns of allowed file paths'),

  forbidden_paths: z.array(z.string())
    .optional()
    .describe('Glob patterns of forbidden file paths'),
});

export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;

/**
 * Tool Permissions
 * Defines which tools an agent can use
 */
export const ToolPermissionsSchema = z.object({
  allowed: z.array(z.string())
    .min(1)
    .describe('List of allowed tools (e.g., Read, Write, Bash)'),

  forbidden: z.array(z.string())
    .optional()
    .describe('List of explicitly forbidden tools'),
});

export type ToolPermissions = z.infer<typeof ToolPermissionsSchema>;

/**
 * Resource Limits
 * Defines compute resource constraints for agent execution
 */
export const ResourceLimitsSchema = z.object({
  max_memory: z.string()
    .regex(/^\d+[KMGT]?B$/)
    .optional()
    .describe('Maximum memory usage (e.g., 512MB)'),

  max_cpu_percent: z.number()
    .min(0)
    .max(100)
    .optional()
    .describe('Maximum CPU usage percentage'),

  max_execution_time: z.string()
    .regex(/^\d+[smh]$/)
    .optional()
    .describe('Maximum execution time (e.g., 300s, 5m, 1h)'),

  max_concurrent_tasks: z.number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum concurrent tasks'),
});

export type ResourceLimits = z.infer<typeof ResourceLimitsSchema>;

/**
 * Posting Rules
 * Defines when and how agents post outcomes to the feed
 */
export const PostingRulesSchema = z.object({
  auto_post_outcomes: z.boolean()
    .describe('Whether to automatically post work outcomes'),

  post_threshold: z.enum([
    'never',
    'completed_task',
    'significant_outcome',
    'always'
  ])
    .describe('Threshold for automatic posting'),

  default_post_type: z.enum(['reply', 'new_post', 'auto'])
    .describe('Default post type for outcomes'),
});

export type PostingRules = z.infer<typeof PostingRulesSchema>;

/**
 * Security Configuration
 * Defines security policies for agent execution
 */
export const SecurityConfigSchema = z.object({
  sandbox_enabled: z.boolean()
    .default(true)
    .describe('Whether to run agent in sandbox'),

  network_access: z.enum(['none', 'api_only', 'restricted', 'full'])
    .default('api_only')
    .describe('Network access level'),

  file_operations: z.enum(['none', 'workspace_only', 'restricted', 'full'])
    .default('workspace_only')
    .describe('File operation permissions'),
});

export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;

/**
 * Protected Permissions
 * Container for all protected permission settings
 */
export const ProtectedPermissionsSchema = z.object({
  api_endpoints: z.array(ApiEndpointSchema)
    .optional()
    .describe('API endpoints the agent can access'),

  workspace: WorkspaceConfigSchema
    .optional()
    .describe('Workspace configuration'),

  tool_permissions: ToolPermissionsSchema
    .optional()
    .describe('Tool usage permissions'),

  resource_limits: ResourceLimitsSchema
    .optional()
    .describe('Resource consumption limits'),

  posting_rules: PostingRulesSchema
    .optional()
    .describe('Outcome posting configuration'),

  security: SecurityConfigSchema
    .optional()
    .describe('Security policies'),
});

export type ProtectedPermissions = z.infer<typeof ProtectedPermissionsSchema>;

/**
 * Protected Configuration Metadata
 * Tracking information for configuration versioning and auditing
 */
export const ProtectedConfigMetadataSchema = z.object({
  hash: z.string()
    .optional()
    .describe('SHA-256 hash of config content'),

  updated_at: z.string()
    .datetime()
    .optional()
    .describe('ISO 8601 timestamp of last update'),

  version: z.string()
    .regex(/^\d+\.\d+\.\d+$/)
    .optional()
    .describe('Semantic version number'),

  updated_by: z.string()
    .optional()
    .describe('User or system that performed update'),
});

export type ProtectedConfigMetadata = z.infer<typeof ProtectedConfigMetadataSchema>;

/**
 * Protected Configuration Schema
 * Complete schema for protected agent configuration sidecars
 */
export const ProtectedConfigSchema = z.object({
  version: z.string()
    .regex(/^\d+\.\d+\.\d+$/)
    .describe('Configuration schema version'),

  checksum: z.string()
    .regex(/^sha256:[a-f0-9]{64}$/)
    .describe('SHA-256 integrity checksum'),

  agent_id: z.string()
    .min(1)
    .describe('Agent identifier this config applies to'),

  permissions: ProtectedPermissionsSchema
    .describe('Protected permission settings'),

  _metadata: ProtectedConfigMetadataSchema
    .optional()
    .describe('Configuration metadata'),
});

export type ProtectedConfig = z.infer<typeof ProtectedConfigSchema>;

/**
 * Validation helper: Validate protected config
 */
export function validateProtectedConfig(data: unknown): ProtectedConfig {
  return ProtectedConfigSchema.parse(data);
}

/**
 * Validation helper: Safe validation with error details
 */
export function safeValidateProtectedConfig(data: unknown): {
  success: boolean;
  data?: ProtectedConfig;
  errors?: z.ZodError;
} {
  const result = ProtectedConfigSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Example protected configuration
 */
export const exampleProtectedConfig: ProtectedConfig = {
  version: '1.0.0',
  checksum: 'sha256:' + '0'.repeat(64), // Placeholder
  agent_id: 'example-agent',
  permissions: {
    api_endpoints: [
      {
        path: '/api/posts',
        methods: ['GET', 'POST'],
        rate_limit: '10/minute',
        authentication: 'required',
      },
    ],
    workspace: {
      root: '/workspaces/agent-feed/prod/agent_workspace/agents/example-agent',
      max_storage: '1GB',
      allowed_paths: [
        '/workspaces/agent-feed/prod/agent_workspace/agents/example-agent/**',
      ],
      forbidden_paths: [
        '/workspaces/agent-feed/src/**',
      ],
    },
    tool_permissions: {
      allowed: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
      forbidden: ['KillShell'],
    },
    resource_limits: {
      max_memory: '512MB',
      max_cpu_percent: 50,
      max_execution_time: '300s',
      max_concurrent_tasks: 3,
    },
    posting_rules: {
      auto_post_outcomes: true,
      post_threshold: 'completed_task',
      default_post_type: 'reply',
    },
    security: {
      sandbox_enabled: true,
      network_access: 'api_only',
      file_operations: 'workspace_only',
    },
  },
};
