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
