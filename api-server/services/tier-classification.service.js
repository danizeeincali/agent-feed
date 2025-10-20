/**
 * Tier Classification Service
 *
 * Implements agent tier classification logic for the Agent Tier System.
 * Classifies agents as Tier 1 (User-Facing) or Tier 2 (System).
 *
 * Related Specification: /workspaces/agent-feed/docs/SPARC-AGENT-TIER-SYSTEM-SPEC.md
 * Related Pseudocode: /workspaces/agent-feed/docs/PSEUDOCODE-TIER-CLASSIFICATION.md
 * Related Tests: /workspaces/agent-feed/tests/unit/tier-classification.test.js
 *
 * @module tier-classification-service
 */

// ============================================================================
// TIER REGISTRY
// ============================================================================

/**
 * Tier 1 Registry - User-Facing Agents
 * These agents post to the feed as themselves and accumulate user data
 */
const TIER1_AGENTS = [
  'personal-todos-agent',
  'meeting-prep-agent',
  'meeting-next-steps-agent',
  'follow-ups-agent',
  'get-to-know-you-agent',
  'link-logger-agent',
  'agent-ideas-agent',
  'agent-feedback-agent'
];

/**
 * Tier 2 Registry - System Agents
 * These agents perform system operations and do NOT post to feed
 */
const TIER2_AGENTS = [
  // Meta & Coordination
  'meta-agent',
  'meta-update-agent',

  // Specialized Architecture (Phase 4.2)
  'skills-architect-agent',
  'skills-maintenance-agent',
  'agent-architect-agent',
  'agent-maintenance-agent',
  'learning-optimizer-agent',
  'system-architect-agent',

  // Page Management
  'page-builder-agent',
  'page-verification-agent',
  'dynamic-page-testing-agent'
];

/**
 * Tier 2 Name Patterns
 * Agents matching these patterns are classified as Tier 2
 */
const TIER2_PATTERNS = [
  /^meta-/,              // meta-*
  /-architect-agent$/,   // *-architect-agent
  /-maintenance-agent$/, // *-maintenance-agent
  /^system-/,            // system-*
  /^page-/               // page-*
];

// ============================================================================
// CORE CLASSIFICATION FUNCTIONS
// ============================================================================

/**
 * Determine agent tier from file path
 *
 * Algorithm: Analyze file path structure
 * - If path contains .system directory → Tier 2
 * - Otherwise → Tier 1
 *
 * @param {string} filePath - Absolute or relative file path
 * @returns {number} - Tier number (1 or 2)
 *
 * @example
 * DetermineAgentTier('/agents/.system/meta-agent.md') // → 2
 * DetermineAgentTier('/agents/personal-todos-agent.md') // → 1
 */
function DetermineAgentTier(filePath) {
  // Handle null, undefined, or empty paths
  if (!filePath || filePath === '') {
    return 1; // Default to Tier 1
  }

  // Normalize path separators (handle Windows paths)
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Check if path contains .system directory
  const pathSegments = normalizedPath.split('/');
  const hasSystemDir = pathSegments.includes('.system');

  return hasSystemDir ? 2 : 1;
}

/**
 * Classify agent tier from frontmatter metadata
 *
 * Algorithm Priority:
 * 1. Explicit tier field in frontmatter
 * 2. Lookup in T1 registry
 * 3. Lookup in T2 registry
 * 4. Pattern matching (meta-*, *-architect-agent, etc.)
 * 5. Default to Tier 1
 *
 * @param {Object} frontmatter - Agent frontmatter metadata
 * @param {string} frontmatter.name - Agent name
 * @param {number} [frontmatter.tier] - Explicit tier (optional)
 * @returns {number} - Tier number (1 or 2)
 *
 * @example
 * ClassifyTier({ name: 'personal-todos-agent' }) // → 1
 * ClassifyTier({ name: 'meta-agent' }) // → 2
 * ClassifyTier({ name: 'custom-architect-agent' }) // → 2 (pattern match)
 */
function ClassifyTier(frontmatter) {
  // Handle null or undefined frontmatter
  if (!frontmatter) {
    return 1; // Default to Tier 1
  }

  // Priority 1: Explicit tier field
  if (frontmatter.tier) {
    return frontmatter.tier;
  }

  // Get agent name
  const agentName = frontmatter.name;

  // Handle missing name
  if (!agentName) {
    return 1; // Default to Tier 1
  }

  // Priority 2: T1 registry lookup
  if (TIER1_AGENTS.includes(agentName)) {
    return 1;
  }

  // Priority 3: T2 registry lookup
  if (TIER2_AGENTS.includes(agentName)) {
    return 2;
  }

  // Priority 4: Pattern matching
  const matchesT2Pattern = TIER2_PATTERNS.some(pattern => pattern.test(agentName));
  if (matchesT2Pattern) {
    return 2;
  }

  // Priority 5: Default to Tier 1
  return 1;
}

/**
 * Validate agent data for tier consistency
 *
 * Validates:
 * - Tier field is present
 * - Tier value is 1 or 2
 * - Tier 2 agents should not have posts_as_self=true (warning)
 *
 * @param {Object} data - Agent data object
 * @returns {Object} - Validation result
 * @returns {boolean} result.isValid - Whether data is valid
 * @returns {Array} result.errors - Array of error objects
 * @returns {Array} result.warnings - Array of warning objects
 *
 * @example
 * ValidateAgentData({ name: 'test', tier: 1 })
 * // → { isValid: true, errors: [], warnings: [] }
 *
 * ValidateAgentData({ name: 'test' }) // Missing tier
 * // → { isValid: false, errors: [{ field: 'tier', code: 'REQUIRED_FIELD_MISSING' }], warnings: [] }
 */
function ValidateAgentData(data) {
  const errors = [];
  const warnings = [];

  // Check tier field exists
  if (data.tier === undefined || data.tier === null) {
    errors.push({
      field: 'tier',
      code: 'REQUIRED_FIELD_MISSING',
      message: 'Tier field is required'
    });
  } else {
    // Check tier value is valid (1 or 2)
    if (data.tier !== 1 && data.tier !== 2) {
      errors.push({
        field: 'tier',
        code: 'INVALID_VALUE',
        message: 'Tier must be 1 or 2',
        value: data.tier
      });
    }

    // Warn if Tier 2 agent has posts_as_self=true (inconsistent)
    if (data.tier === 2 && data.posts_as_self === true) {
      warnings.push({
        field: 'posts_as_self',
        code: 'TIER2_POSTS_AS_SELF',
        message: 'Tier 2 agents should not post as themselves (Avi posts their outcomes)',
        suggestion: 'Set posts_as_self to false'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get tier registry (T1 and T2 agent lists)
 *
 * @returns {Object} - Registry object
 * @returns {Array<string>} result.tier1 - Tier 1 agent names
 * @returns {Array<string>} result.tier2 - Tier 2 agent names
 */
function GetTierRegistry() {
  return {
    tier1: [...TIER1_AGENTS],
    tier2: [...TIER2_AGENTS]
  };
}

/**
 * Check if agent is Tier 1
 *
 * @param {string} agentName - Agent name
 * @returns {boolean} - True if agent is in T1 registry
 */
function IsTier1Agent(agentName) {
  return TIER1_AGENTS.includes(agentName);
}

/**
 * Check if agent is Tier 2
 *
 * @param {string} agentName - Agent name
 * @returns {boolean} - True if agent is in T2 registry
 */
function IsTier2Agent(agentName) {
  return TIER2_AGENTS.includes(agentName);
}

// ============================================================================
// EXPORTS (CommonJS)
// ============================================================================

module.exports = {
  DetermineAgentTier,
  ClassifyTier,
  ValidateAgentData,
  GetTierRegistry,
  IsTier1Agent,
  IsTier2Agent
};
