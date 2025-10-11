/**
 * Agent Context Composer
 * Composes agent context from system templates + user customizations
 * with 3-tier protection model
 */

import {
  AgentContext,
  SystemTemplate,
  UserCustomization,
  SecurityError
} from '../types/agent-context';
import { DatabaseManager } from '../types/database-manager';
import { validateCustomizations } from '../utils/validation';
import { getSystemTemplate } from './queries/templates';
import { getUserCustomization } from './queries/customizations';

/**
 * Compose agent context from system template + user customizations
 * CRITICAL: System rules always override user customizations
 *
 * @param userId - User ID
 * @param agentType - Agent template name (e.g., 'tech-guru')
 * @param db - Database manager instance
 * @returns Composed agent context with protected fields enforced
 * @throws {Error} When system template is not found
 * @throws {SecurityError} When user attempts to override protected fields
 */
export async function composeAgentContext(
  userId: string,
  agentType: string,
  db: DatabaseManager
): Promise<AgentContext> {
  // 1. Load IMMUTABLE system template (TIER 1)
  const template = await getSystemTemplate(db, agentType);

  if (!template) {
    throw new Error(`System template not found: ${agentType}`);
  }

  // 2. Load user customizations (TIER 2) - optional
  const custom = await getUserCustomization(db, userId, agentType);

  // 3. Validate user didn't try to override protected fields
  if (custom) {
    validateCustomizations(custom, template);
  }

  // 4. Compose final context (SYSTEM RULES ALWAYS WIN)
  const finalContext: AgentContext = {
    // TIER 1: PROTECTED - User cannot change
    model: template.model,
    posting_rules: template.posting_rules,
    api_schema: template.api_schema,
    safety_constraints: template.safety_constraints,

    // TIER 2: CUSTOMIZABLE - User overrides apply
    personality: custom?.personality || template.default_personality,
    interests: custom?.interests || [],
    response_style: custom?.response_style || template.default_response_style,

    // Agent identity
    agentName: custom?.custom_name || agentType,
    version: template.version
  };

  return finalContext;
}

/**
 * Get the Claude model to use for this agent
 * Priority: template.model > env var > hardcoded default
 *
 * @param agentContext - Composed agent context
 * @returns Claude model name
 */
export function getModelForAgent(agentContext: AgentContext): string {
  const DEFAULT_AGENT_MODEL = 'claude-sonnet-4-5-20250929';

  return agentContext.model
    || process.env.AGENT_MODEL
    || DEFAULT_AGENT_MODEL;
}

/**
 * Get the Claude model to use for Avi orchestrator
 * Priority: env var > hardcoded default
 *
 * @returns Claude model name for Avi
 */
export function getModelForAvi(): string {
  const DEFAULT_AVI_MODEL = 'claude-sonnet-4-5-20250929';

  return process.env.AVI_MODEL || DEFAULT_AVI_MODEL;
}

/**
 * Re-export validation function for convenience
 */
export { validateCustomizations } from '../utils/validation';
