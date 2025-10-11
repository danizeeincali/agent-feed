/**
 * Agent Identity Composition Helper
 *
 * Implements the 3-tier data protection model by composing agent context
 * from TIER 1 (system templates) + TIER 2 (user customizations).
 *
 * CRITICAL: System rules always override user customizations.
 *
 * This is the core security mechanism that prevents users from bypassing
 * system constraints while allowing safe personalization.
 */

import { SystemTemplateRepository, type SystemTemplate } from '../repositories/SystemTemplateRepository';
import { UserCustomizationRepository, type UserCustomization, type ComposedAgent } from '../repositories/UserCustomizationRepository';

/**
 * Error thrown when user attempts to override protected fields
 */
export class SecurityViolationError extends Error {
  constructor(field: string) {
    super(`Security violation: Cannot customize protected field: ${field}`);
    this.name = 'SecurityViolationError';
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Compose agent context from system template + user customizations
 *
 * This function:
 * 1. Loads the immutable system template (TIER 1)
 * 2. Loads the user's customization (TIER 2) if it exists
 * 3. Validates that user didn't try to override protected fields
 * 4. Merges the two with system rules always winning
 * 5. Returns a validated, composed agent configuration
 *
 * @param userId - User ID for multi-tenant support
 * @param agentTemplate - System template name (e.g., "tech-guru")
 * @param systemRepo - System template repository instance
 * @param customRepo - User customization repository instance
 * @returns Composed agent configuration ready for use
 * @throws SecurityViolationError if user tried to override protected fields
 * @throws ValidationError if validation fails
 */
export async function composeAgentContext(
  userId: string,
  agentTemplate: string,
  systemRepo: SystemTemplateRepository,
  customRepo: UserCustomizationRepository
): Promise<ComposedAgent> {
  // Input validation
  if (!userId || userId.trim().length === 0) {
    throw new ValidationError('User ID is required');
  }

  if (!agentTemplate || agentTemplate.trim().length === 0) {
    throw new ValidationError('Agent template name is required');
  }

  // 1. Load IMMUTABLE system template (TIER 1)
  const template = await systemRepo.getById(agentTemplate);

  if (!template) {
    throw new ValidationError(`System template not found: ${agentTemplate}`);
  }

  // 2. Load user customization (TIER 2) - optional
  const customization = await customRepo.getByUserAndTemplate(userId, agentTemplate);

  // 3. Validate user customization if it exists
  if (customization) {
    validateCustomization(customization, template);
  }

  // 4. Compose final context (SYSTEM RULES ALWAYS WIN)
  const composedAgent: ComposedAgent = {
    // TIER 1: PROTECTED - User cannot change these
    model: template.model,
    posting_rules: template.posting_rules,
    api_schema: template.api_schema,
    safety_constraints: template.safety_constraints,

    // TIER 2: CUSTOMIZABLE - User overrides apply
    agent_name: customization?.custom_name || agentTemplate,
    personality: customization?.personality || template.default_personality,
    interests: customization?.interests || {},
    response_style: customization?.response_style || template.default_response_style || {},

    // Metadata
    template_name: template.name,
    template_version: template.version,
    user_id: userId,
    customization_id: customization?.id || null
  };

  // 5. Final validation
  validateComposedAgent(composedAgent);

  return composedAgent;
}

/**
 * Validate that user customization doesn't contain protected fields
 * and meets all constraints.
 *
 * @param customization - User customization to validate
 * @param template - System template for reference
 * @throws SecurityViolationError if protected fields are present
 * @throws ValidationError if validation fails
 */
function validateCustomization(
  customization: UserCustomization,
  template: SystemTemplate
): void {
  // Check for protected fields (security validation)
  const protectedFields = ['model', 'posting_rules', 'api_schema', 'safety_constraints', 'version'];
  const customizationData = customization as any;

  for (const field of protectedFields) {
    if (customizationData.hasOwnProperty(field)) {
      throw new SecurityViolationError(field);
    }
  }

  // Validate personality length
  if (customization.personality && customization.personality.length > 5000) {
    throw new ValidationError('Personality text too long (max 5000 characters)');
  }

  // Validate interests
  if (customization.interests) {
    if (Array.isArray(customization.interests)) {
      if (customization.interests.length > 50) {
        throw new ValidationError('Too many interests specified (max 50)');
      }
    } else if (typeof customization.interests === 'object') {
      // Allow objects as well, but validate size
      const interestCount = Object.keys(customization.interests).length;
      if (interestCount > 50) {
        throw new ValidationError('Too many interests specified (max 50)');
      }
    }
  }

  // Validate response_style
  if (customization.response_style) {
    if (typeof customization.response_style !== 'object') {
      throw new ValidationError('Response style must be an object');
    }
  }

  // Validate custom_name length
  if (customization.custom_name && customization.custom_name.length > 100) {
    throw new ValidationError('Custom name too long (max 100 characters)');
  }
}

/**
 * Validate the final composed agent configuration
 *
 * @param agent - Composed agent to validate
 * @throws ValidationError if validation fails
 */
function validateComposedAgent(agent: ComposedAgent): void {
  // Validate required protected fields are present
  if (!agent.posting_rules || typeof agent.posting_rules !== 'object') {
    throw new ValidationError('Invalid posting_rules in composed agent');
  }

  if (!agent.api_schema || typeof agent.api_schema !== 'object') {
    throw new ValidationError('Invalid api_schema in composed agent');
  }

  if (!agent.safety_constraints || typeof agent.safety_constraints !== 'object') {
    throw new ValidationError('Invalid safety_constraints in composed agent');
  }

  // Validate metadata
  if (!agent.template_name || agent.template_name.trim().length === 0) {
    throw new ValidationError('Template name is missing in composed agent');
  }

  if (!agent.template_version || agent.template_version <= 0) {
    throw new ValidationError('Invalid template version in composed agent');
  }

  if (!agent.user_id || agent.user_id.trim().length === 0) {
    throw new ValidationError('User ID is missing in composed agent');
  }

  // Validate posting_rules structure
  if (!agent.posting_rules.max_length) {
    throw new ValidationError('posting_rules must contain max_length');
  }

  // Validate api_schema structure
  if (!agent.api_schema.platform) {
    throw new ValidationError('api_schema must contain platform');
  }

  // Validate safety_constraints structure
  if (!agent.safety_constraints.content_filters) {
    throw new ValidationError('safety_constraints must contain content_filters');
  }
}

/**
 * Get the Claude model to use for this agent
 *
 * Priority:
 * 1. template.model (if set)
 * 2. AGENT_MODEL env var
 * 3. Hardcoded default
 *
 * @param agentContext - Composed agent context
 * @returns Model name to use
 */
export function getModelForAgent(agentContext: ComposedAgent): string {
  const DEFAULT_AGENT_MODEL = 'claude-sonnet-4-5-20250929';

  return agentContext.model
    || process.env.AGENT_MODEL
    || DEFAULT_AGENT_MODEL;
}

/**
 * Get the Claude model to use for Avi orchestrator
 *
 * Priority:
 * 1. AVI_MODEL env var
 * 2. Hardcoded default
 *
 * @returns Model name to use
 */
export function getModelForAvi(): string {
  const DEFAULT_AVI_MODEL = 'claude-sonnet-4-5-20250929';

  return process.env.AVI_MODEL || DEFAULT_AVI_MODEL;
}
