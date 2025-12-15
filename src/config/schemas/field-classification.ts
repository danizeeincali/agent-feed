/**
 * Field Classification for Protected Agent Configuration
 *
 * This module defines which fields are protected (system-controlled) versus
 * user-editable, providing constants and helper functions for field validation.
 *
 * Architecture: Hybrid Markdown + Protected Sidecar
 * Location: /workspaces/agent-feed/src/config/schemas/field-classification.ts
 */

/**
 * Protected Fields
 * These fields are system-controlled and cannot be edited by users.
 * They control security-critical settings like API access, resource limits,
 * and workspace boundaries.
 */
export const PROTECTED_FIELDS = [
  // API Access Control
  'api_endpoints',
  'api_methods',
  'api_rate_limits',
  'api_access',

  // Workspace & File System
  'workspace',
  'workspace_path',
  'workspace_root',
  'allowed_paths',
  'forbidden_paths',
  'max_storage',

  // Security Policies
  'security_policies',
  'system_boundaries',
  'sandbox_enabled',
  'network_access',
  'file_operations',

  // Tool Permissions
  'tool_permissions',
  'allowed_tools',
  'forbidden_tools',
  'forbidden_operations',

  // Resource Limits
  'resource_limits',
  'max_memory',
  'max_cpu_percent',
  'max_execution_time',
  'max_concurrent_tasks',

  // Posting Rules
  'posting_rules',
  'auto_post_outcomes',
  'post_threshold',
  'default_post_type',

  // Protected Metadata
  '_protected',
  '_permissions',
  '_protected_config_source',
] as const;

/**
 * User-Editable Fields
 * These fields can be freely modified by users to customize agent behavior,
 * personality, and preferences.
 */
export const USER_EDITABLE_FIELDS = [
  // Basic Info
  'name',
  'description',
  'color',
  'proactive',
  'priority',

  // Personality
  'personality',
  'tone',
  'style',
  'emoji_usage',
  'verbosity',

  // Specialization
  'specialization',
  'domain_expertise',

  // Custom Instructions
  'custom_instructions',
  'task_guidance',
  'preferred_approach',

  // Autonomous Mode
  'autonomous_mode',
  'collaboration_level',

  // Priority Preferences
  'priority_preferences',
  'focus',
  'timeframe',
  'task_selection',

  // Notification Preferences
  'notification_preferences',
  'on_start',
  'on_complete',
  'on_error',
  'on_milestone',

  // Model Selection (user preference, but validated)
  'model',
  'tools',
] as const;

/**
 * Field Visibility Settings
 * Defines how fields should be displayed in the UI
 */
export interface FieldVisibility {
  /** Field key */
  field: string;
  /** Whether field is system-protected */
  isProtected: boolean;
  /** Whether field is visible in UI */
  visible: boolean;
  /** Whether field is editable by user */
  editable: boolean;
  /** Icon to display (for UI) */
  icon?: '🔒' | '✏️' | '👁️';
}

/**
 * Field Categories
 * Logical grouping of fields for UI organization
 */
export const FIELD_CATEGORIES = {
  BASIC: {
    name: 'Basic Information',
    fields: ['name', 'description', 'color', 'model', 'tools'],
    icon: 'ℹ️',
  },
  PERSONALITY: {
    name: 'Personality & Style',
    fields: ['personality', 'tone', 'style', 'emoji_usage', 'verbosity'],
    icon: '🎭',
  },
  SPECIALIZATION: {
    name: 'Specialization',
    fields: ['specialization', 'domain_expertise', 'custom_instructions'],
    icon: '🎯',
  },
  BEHAVIOR: {
    name: 'Behavior & Autonomy',
    fields: ['autonomous_mode', 'proactive', 'priority', 'priority_preferences'],
    icon: '⚙️',
  },
  NOTIFICATIONS: {
    name: 'Notifications',
    fields: ['notification_preferences', 'on_start', 'on_complete', 'on_error'],
    icon: '🔔',
  },
  SECURITY: {
    name: 'Security & Permissions',
    fields: ['workspace', 'api_access', 'tool_permissions', 'resource_limits'],
    icon: '🔒',
    isProtected: true,
  },
} as const;

/**
 * Helper: Check if a field is protected
 */
export function isProtectedField(fieldName: string): boolean {
  return (PROTECTED_FIELDS as readonly string[]).includes(fieldName);
}

/**
 * Helper: Check if a field is user-editable
 */
export function isUserEditableField(fieldName: string): boolean {
  return (USER_EDITABLE_FIELDS as readonly string[]).includes(fieldName);
}

/**
 * Helper: Get field category
 */
export function getFieldCategory(fieldName: string): string | null {
  for (const [key, category] of Object.entries(FIELD_CATEGORIES)) {
    const fields = category.fields as readonly string[];
    if (fields.includes(fieldName)) {
      return key;
    }
  }
  return null;
}

/**
 * Helper: Get field visibility settings
 */
export function getFieldVisibility(fieldName: string): FieldVisibility {
  const fieldIsProtected = isProtectedField(fieldName);

  return {
    field: fieldName,
    isProtected: fieldIsProtected,
    visible: true, // All fields visible (but some read-only)
    editable: !fieldIsProtected,
    icon: fieldIsProtected ? '🔒' : '✏️',
  };
}

/**
 * Helper: Validate field edit permissions
 */
export function canEditField(
  fieldName: string,
  isSystemAdmin: boolean = false
): boolean {
  const isProtected = isProtectedField(fieldName);

  // System admins can edit protected fields via special API
  if (isSystemAdmin) {
    return true;
  }

  // Regular users can only edit user-editable fields
  return !isProtected;
}

/**
 * Helper: Get all fields by protection status
 */
export function getFieldsByProtection(isProtected: boolean): readonly string[] {
  return isProtected ? PROTECTED_FIELDS : USER_EDITABLE_FIELDS;
}

/**
 * Helper: Extract protected fields from config object
 */
export function extractProtectedFields(config: Record<string, any>): Record<string, any> {
  const protectedFields: Record<string, any> = {};

  for (const field of PROTECTED_FIELDS) {
    if (field in config) {
      protectedFields[field] = config[field];
    }
  }

  return protectedFields;
}

/**
 * Helper: Extract user-editable fields from config object
 */
export function extractUserEditableFields(config: Record<string, any>): Record<string, any> {
  const userFields: Record<string, any> = {};

  for (const field of USER_EDITABLE_FIELDS) {
    if (field in config) {
      userFields[field] = config[field];
    }
  }

  return userFields;
}

/**
 * Helper: Merge protected and user configs (protected takes precedence)
 */
export function mergeProtectedAndUserConfigs(
  userConfig: Record<string, any>,
  protectedConfig: Record<string, any>
): Record<string, any> {
  // Start with user config
  const merged = { ...userConfig };

  // Override with protected fields
  for (const field of PROTECTED_FIELDS) {
    if (field in protectedConfig) {
      merged[field] = protectedConfig[field];
    }
  }

  return merged;
}

/**
 * Helper: Validate field modification attempt
 */
export interface FieldModificationResult {
  allowed: boolean;
  field: string;
  reason?: string;
}

export function validateFieldModification(
  fieldName: string,
  isSystemAdmin: boolean = false
): FieldModificationResult {
  const isProtected = isProtectedField(fieldName);

  if (!isProtected) {
    return {
      allowed: true,
      field: fieldName,
    };
  }

  if (isSystemAdmin) {
    return {
      allowed: true,
      field: fieldName,
      reason: 'System administrator privileges',
    };
  }

  return {
    allowed: false,
    field: fieldName,
    reason: `Field "${fieldName}" is protected and cannot be modified by users`,
  };
}

/**
 * Type Guards
 */
export type ProtectedFieldName = typeof PROTECTED_FIELDS[number];
export type UserEditableFieldName = typeof USER_EDITABLE_FIELDS[number];

/**
 * Export for use in other modules
 */
export default {
  PROTECTED_FIELDS,
  USER_EDITABLE_FIELDS,
  FIELD_CATEGORIES,
  isProtectedField,
  isUserEditableField,
  getFieldCategory,
  getFieldVisibility,
  canEditField,
  getFieldsByProtection,
  extractProtectedFields,
  extractUserEditableFields,
  mergeProtectedAndUserConfigs,
  validateFieldModification,
};
