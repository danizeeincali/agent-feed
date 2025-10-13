/**
 * Validation Utilities
 * Ensures user customizations don't override protected system fields
 * Validates system agent templates
 */

import { z } from 'zod';
import {
  UserCustomization,
  SystemTemplate,
  SecurityError,
  ValidationError,
  PROTECTED_FIELDS
} from '../types/agent-context';

/**
 * Posting rules schema
 */
export const PostingRulesSchema = z.object({
  max_length: z.number().positive(),
  min_interval_seconds: z.number().nonnegative(),
  rate_limit_per_hour: z.number().positive(),
  required_hashtags: z.array(z.string()).optional(),
  prohibited_words: z.array(z.string()).optional()
});

/**
 * API schema
 */
export const ApiSchemaSchema = z.object({
  platform: z.string(),
  endpoints: z.record(z.string()),
  auth_type: z.string().optional()
});

/**
 * Safety constraints schema
 */
export const SafetyConstraintsSchema = z.object({
  content_filters: z.array(z.string()),
  max_mentions_per_post: z.number().nonnegative(),
  requires_human_review: z.array(z.string()).optional()
});

/**
 * Response style schema
 */
export const ResponseStyleSchema = z.object({
  tone: z.string(),
  length: z.string(),
  use_emojis: z.boolean()
});

/**
 * System Agent Template schema
 * Validates the complete template structure
 */
export const SystemAgentTemplateSchema = z.object({
  name: z.string().min(1).max(50),
  version: z.number().int().positive(),
  model: z.string().nullable(),
  posting_rules: PostingRulesSchema,
  api_schema: ApiSchemaSchema,
  safety_constraints: SafetyConstraintsSchema,
  default_personality: z.string(),
  default_response_style: ResponseStyleSchema
});

/**
 * Type inference from schema
 */
export type SystemAgentTemplateValidated = z.infer<typeof SystemAgentTemplateSchema>;
export type PostingRules = z.infer<typeof PostingRulesSchema>;
export type ApiSchema = z.infer<typeof ApiSchemaSchema>;
export type SafetyConstraints = z.infer<typeof SafetyConstraintsSchema>;
export type ResponseStyle = z.infer<typeof ResponseStyleSchema>;

/**
 * Validate a template object against the schema
 *
 * @param template - Template object to validate
 * @returns Validated template
 * @throws ZodError if validation fails
 */
export function validateTemplate(template: unknown): SystemAgentTemplateValidated {
  return SystemAgentTemplateSchema.parse(template);
}

/**
 * Safely validate a template, returning error details
 *
 * @param template - Template object to validate
 * @returns Result object with success status and data/error
 */
export function safeValidateTemplate(template: unknown): {
  success: boolean;
  data?: SystemAgentTemplateValidated;
  error?: z.ZodError;
} {
  const result = SystemAgentTemplateSchema.safeParse(template);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * Validate user customizations against system template
 * Throws SecurityError if user attempts to override protected fields
 * Throws ValidationError if customization values are invalid
 *
 * @param custom - User customization object
 * @param template - System template object
 * @throws {SecurityError} When protected fields are present in customization
 * @throws {ValidationError} When customization values exceed limits
 */
export function validateCustomizations(
  custom: UserCustomization | any,
  template: SystemTemplate
): void {
  // Check for protected field override attempts
  for (const field of PROTECTED_FIELDS) {
    if (custom?.hasOwnProperty(field)) {
      throw new SecurityError(
        `User attempted to override protected field: ${field}`
      );
    }
  }

  // Validate personality length
  if (custom.personality && custom.personality.length > 5000) {
    throw new ValidationError('Personality text too long');
  }

  // Validate interests count
  if (custom.interests && custom.interests.length > 50) {
    throw new ValidationError('Too many interests specified');
  }

  // Additional validations can be added here as needed
}

/**
 * Validate and parse ticket ID
 * @param ticketId - String ticket ID to validate
 * @returns Parsed integer ticket ID
 * @throws Error if ticket ID is invalid
 */
export function validateTicketId(ticketId: string): number {
  const id = parseInt(ticketId, 10);

  if (isNaN(id)) {
    throw new ValidationError(`Invalid ticket ID format: ${ticketId}`);
  }

  if (id <= 0) {
    throw new ValidationError(`Invalid ticket ID: must be positive (got ${id})`);
  }

  return id;
}

/**
 * Validate worker ID format
 * @param workerId - Worker ID to validate
 * @returns Validated worker ID
 * @throws Error if worker ID is invalid
 */
export function validateWorkerId(workerId: string): string {
  if (!workerId || typeof workerId !== 'string') {
    throw new ValidationError('Worker ID is required and must be a string');
  }

  if (workerId.length === 0) {
    throw new ValidationError('Worker ID cannot be empty');
  }

  // Accept various formats: worker-*, uuid, etc.
  if (!/^[a-zA-Z0-9-_]+$/.test(workerId)) {
    throw new ValidationError(`Invalid worker ID format: ${workerId}`);
  }

  return workerId;
}

/**
 * Validate status value from database
 * @param status - Status string to validate
 * @param validStatuses - Array of valid status values
 * @param defaultStatus - Default status if invalid
 * @returns Validated status or default
 */
export function validateStatus<T extends string>(
  status: any,
  validStatuses: readonly T[],
  defaultStatus: T
): T {
  if (typeof status === 'string' && validStatuses.includes(status as T)) {
    return status as T;
  }
  return defaultStatus;
}

/**
 * Validate and parse integer from string or number
 * @param value - Value to parse
 * @param fieldName - Field name for error messages
 * @param min - Minimum allowed value (optional)
 * @param max - Maximum allowed value (optional)
 * @returns Parsed integer
 * @throws Error if value is invalid
 */
export function validateInteger(
  value: any,
  fieldName: string,
  min?: number,
  max?: number
): number {
  const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);

  if (isNaN(parsed)) {
    throw new ValidationError(`Invalid ${fieldName}: must be a valid integer`);
  }

  if (min !== undefined && parsed < min) {
    throw new ValidationError(`Invalid ${fieldName}: must be at least ${min} (got ${parsed})`);
  }

  if (max !== undefined && parsed > max) {
    throw new ValidationError(`Invalid ${fieldName}: must be at most ${max} (got ${parsed})`);
  }

  return parsed;
}

/**
 * Validate user ID format
 * @param userId - User ID to validate
 * @returns Validated user ID
 * @throws Error if user ID is invalid
 */
export function validateUserId(userId: string): string {
  if (!userId || typeof userId !== 'string') {
    throw new ValidationError('User ID is required and must be a string');
  }

  if (userId.length === 0) {
    throw new ValidationError('User ID cannot be empty');
  }

  // UUIDs or other alphanumeric IDs
  if (!/^[a-zA-Z0-9-_]+$/.test(userId)) {
    throw new ValidationError(`Invalid user ID format: ${userId}`);
  }

  return userId;
}
