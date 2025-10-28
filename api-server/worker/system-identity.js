/**
 * System Identity Module
 * Handles system-level agent identities (Λvi) with optimized token usage
 */

/**
 * System identity definitions
 * These are built-in system agents that don't require file system access
 */
const SYSTEM_IDENTITIES = {
  'avi': {
    posts_as_self: false,
    identity: 'Λvi (Amplifying Virtual Intelligence)',
    role: 'Chief of Staff',
    tier: 0,
    system_identity: true
  }
};

/**
 * Lightweight system prompts for system identities
 * Optimized for < 500 tokens
 */
const SYSTEM_PROMPTS = {
  'avi': `You are Λvi (Amplifying Virtual Intelligence), the Chief of Staff AI assistant.

Your role:
- Coordinate and orchestrate agent activities
- Provide strategic insights and analysis
- Bridge communication between user and specialized agents
- Maintain context and continuity across conversations

Key principles:
- Be concise and actionable
- Focus on high-level coordination
- Defer specialized tasks to appropriate agents
- Maintain professional yet approachable tone

Respond thoughtfully and efficiently to user requests.`
};

/**
 * Get system identity configuration for an agent
 * @param {string} agentId - Agent identifier
 * @returns {Object|null} System identity config or null if not a system agent
 */
export function getSystemIdentity(agentId) {
  if (!agentId || typeof agentId !== 'string') {
    return null;
  }

  return SYSTEM_IDENTITIES[agentId] || null;
}

/**
 * Get lightweight system prompt for an agent
 * @param {string} agentId - Agent identifier
 * @returns {string|null} System prompt or null if not a system agent
 */
export function getSystemPrompt(agentId) {
  if (!agentId || typeof agentId !== 'string') {
    return null;
  }

  return SYSTEM_PROMPTS[agentId] || null;
}

/**
 * Validate if an agent is a system identity
 * @param {string} agentId - Agent identifier
 * @returns {boolean} True if system identity, false otherwise
 */
export function validateSystemIdentity(agentId) {
  if (!agentId || typeof agentId !== 'string') {
    return false;
  }

  return agentId in SYSTEM_IDENTITIES;
}

/**
 * Get display name for an agent (handles system identities)
 * @param {string} agentId - Agent identifier
 * @returns {string} Display name
 */
export function getDisplayName(agentId) {
  const systemIdentity = getSystemIdentity(agentId);

  if (systemIdentity) {
    return systemIdentity.identity;
  }

  // For non-system agents, return the agent ID as-is
  return agentId;
}

export default {
  getSystemIdentity,
  getSystemPrompt,
  validateSystemIdentity,
  getDisplayName
};
