/**
 * Protection Validation Service
 *
 * Implements multi-layer protection validation for the Agent Tier System.
 * Prevents modification of critical system agents while maintaining UX.
 *
 * Related Specification: /workspaces/agent-feed/docs/SPARC-AGENT-TIER-SYSTEM-SPEC.md
 * Related Pseudocode: /workspaces/agent-feed/docs/PSEUDOCODE-PROTECTION-VALIDATION.md
 * Related Tests: /workspaces/agent-feed/tests/unit/protection-validation.test.js
 *
 * @module protection-validation-service
 */

// ============================================================================
// PROTECTED AGENT REGISTRY
// ============================================================================

/**
 * Phase 4.2 Specialist Agents (T2, visibility=protected)
 * These agents are critical for platform operations
 */
const PHASE_4_2_SPECIALISTS = [
  'agent-architect-agent',
  'agent-maintenance-agent',
  'skills-architect-agent',
  'skills-maintenance-agent',
  'learning-optimizer-agent',
  'system-architect-agent'
];

/**
 * Meta-coordination agents (visibility=protected)
 * These agents manage agent lifecycle and coordination
 */
const META_COORDINATION_AGENTS = [
  'meta-agent',
  'meta-update-agent'
];

/**
 * All protected agents (combined)
 */
const ALL_PROTECTED_AGENTS = [
  ...PHASE_4_2_SPECIALISTS,
  ...META_COORDINATION_AGENTS
];

/**
 * System directory pattern (filesystem read-only)
 */
const SYSTEM_DIRECTORY_PATTERN = /\.system/;

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

const ProtectionReason = {
  TIER2_PROTECTED: 'TIER2_PROTECTED',
  SYSTEM_CRITICAL: 'SYSTEM_CRITICAL',
  FILESYSTEM_READONLY: 'FILESYSTEM_READONLY',
  META_COORDINATION: 'META_COORDINATION'
};

const ProtectionLevel = {
  PUBLIC: 'PUBLIC',
  PROTECTED: 'PROTECTED',
  SYSTEM: 'SYSTEM',
  ADMIN_ONLY: 'ADMIN_ONLY'
};

// ============================================================================
// CORE PROTECTION FUNCTIONS
// ============================================================================

/**
 * Determine protection status for an agent
 *
 * Algorithm Priority:
 * 1. Filesystem protection (.system directory) → SYSTEM level
 * 2. Tier 2 + protected visibility → PROTECTED level
 * 3. Phase 4.2 specialist agents → PROTECTED level
 * 4. Meta-coordination agents → PROTECTED level
 * 5. Default → PUBLIC (not protected)
 *
 * @param {Object} agent - Agent object
 * @param {Object} user - User context with permissions
 * @returns {Object} - Protection status object
 *
 * @example
 * DetermineProtectionStatus(agent, { isAdmin: false })
 * // → { isProtected: true, canEdit: false, ... }
 */
function DetermineProtectionStatus(agent, user) {
  // Initialize default protection (not protected)
  const protection = {
    isProtected: false,
    protectionReason: null,
    protectionLevel: ProtectionLevel.PUBLIC,
    canEdit: true,
    canDelete: true,
    canViewSource: true,
    warningMessage: null
  };

  // Check 1: Filesystem protection (.system directory)
  if (IsSystemDirectoryAgent(agent)) {
    protection.isProtected = true;
    protection.protectionReason = ProtectionReason.FILESYSTEM_READONLY;
    protection.protectionLevel = ProtectionLevel.SYSTEM;
    protection.canEdit = false;
    protection.canDelete = false;
    protection.canViewSource = true;
    protection.warningMessage = 'System directory agents are read-only';
    return protection;
  }

  // Check 2: Tier 2 with protected visibility
  if (agent.tier === 2 && agent.visibility === 'protected') {
    protection.isProtected = true;
    protection.protectionReason = ProtectionReason.TIER2_PROTECTED;
    protection.protectionLevel = ProtectionLevel.PROTECTED;
    protection.canEdit = user.isAdmin === true;
    protection.canDelete = false;
    protection.canViewSource = true;
    protection.warningMessage = 'Protected system agent - modifications restricted';
    return protection;
  }

  // Check 3: Phase 4.2 specialist agents
  if (PHASE_4_2_SPECIALISTS.includes(agent.slug)) {
    protection.isProtected = true;
    protection.protectionReason = ProtectionReason.SYSTEM_CRITICAL;
    protection.protectionLevel = ProtectionLevel.PROTECTED;
    protection.canEdit = user.isAdmin === true;
    protection.canDelete = false;
    protection.canViewSource = true;
    protection.warningMessage = 'System specialist agent - critical for platform operations';
    return protection;
  }

  // Check 4: Meta-coordination agents
  if (META_COORDINATION_AGENTS.includes(agent.slug)) {
    protection.isProtected = true;
    protection.protectionReason = ProtectionReason.META_COORDINATION;
    protection.protectionLevel = ProtectionLevel.PROTECTED;
    protection.canEdit = user.isAdmin === true;
    protection.canDelete = false;
    protection.canViewSource = true;
    protection.warningMessage = 'Meta-agent - manages agent lifecycle';
    return protection;
  }

  // Default: Not protected (Tier 1, public visibility)
  return protection;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if agent is in .system directory
 *
 * @param {Object} agent - Agent object with filePath
 * @returns {boolean} - True if agent is in .system directory
 *
 * @example
 * IsSystemDirectoryAgent({ filePath: '/agents/.system/meta-agent.md' }) // → true
 * IsSystemDirectoryAgent({ filePath: '/agents/todos-agent.md' }) // → false
 */
function IsSystemDirectoryAgent(agent) {
  if (!agent.filePath) {
    return false;
  }

  // Check if path contains .system directory
  return SYSTEM_DIRECTORY_PATTERN.test(agent.filePath);
}

/**
 * Check if user can modify agent
 *
 * @param {Object} agent - Agent object
 * @param {Object} user - User context
 * @returns {boolean} - True if user can modify agent
 *
 * @example
 * CanUserModifyAgent(protectedAgent, { isAdmin: true }) // → true
 * CanUserModifyAgent(protectedAgent, { isAdmin: false }) // → false
 */
function CanUserModifyAgent(agent, user) {
  const protection = DetermineProtectionStatus(agent, user);

  // Admin override: Admins can modify protected agents
  if (user.isAdmin === true) {
    return true;
  }

  // Non-protected agents: All users can modify
  if (protection.isProtected === false) {
    return true;
  }

  // Protected agents: Only admins can modify
  return false;
}

/**
 * Get protection badge configuration for UI rendering
 *
 * @param {Object} protection - Protection status object
 * @returns {Object|null} - Badge configuration or null if not protected
 *
 * @example
 * GetProtectionBadgeConfig({ protectionLevel: 'SYSTEM' })
 * // → { text: 'System Protected', color: '#DC2626', icon: 'Lock' }
 */
function GetProtectionBadgeConfig(protection) {
  if (!protection.isProtected) {
    return null;
  }

  switch (protection.protectionLevel) {
    case ProtectionLevel.SYSTEM:
      return {
        text: 'System Protected',
        color: '#DC2626', // Red
        icon: 'Lock',
        tooltip: 'Filesystem read-only - cannot be modified'
      };

    case ProtectionLevel.PROTECTED:
      return {
        text: 'Protected',
        color: '#F59E0B', // Amber
        icon: 'ShieldAlert',
        tooltip: protection.warningMessage
      };

    case ProtectionLevel.ADMIN_ONLY:
      return {
        text: 'Admin Only',
        color: '#8B5CF6', // Purple
        icon: 'Key',
        tooltip: 'Requires administrator privileges'
      };

    default:
      return null;
  }
}

/**
 * Get protected agent registry
 *
 * @returns {Object} - Registry of protected agents
 * @returns {Array<string>} result.phase42Specialists - Phase 4.2 specialist agents
 * @returns {Array<string>} result.metaCoordination - Meta-coordination agents
 * @returns {Array<string>} result.allProtected - All protected agents combined
 */
function GetProtectedAgentRegistry() {
  return {
    phase42Specialists: [...PHASE_4_2_SPECIALISTS],
    metaCoordination: [...META_COORDINATION_AGENTS],
    allProtected: [...ALL_PROTECTED_AGENTS]
  };
}

/**
 * Check if agent is protected
 *
 * @param {string} agentSlug - Agent slug
 * @returns {boolean} - True if agent is in protected registry
 */
function IsProtectedAgent(agentSlug) {
  return ALL_PROTECTED_AGENTS.includes(agentSlug);
}

// ============================================================================
// EXPORTS (CommonJS)
// ============================================================================

module.exports = {
  // Core functions
  DetermineProtectionStatus,
  IsSystemDirectoryAgent,
  CanUserModifyAgent,
  GetProtectionBadgeConfig,
  GetProtectedAgentRegistry,
  IsProtectedAgent,

  // Constants (for testing and external use)
  ProtectionReason,
  ProtectionLevel
};
