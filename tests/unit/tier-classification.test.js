/**
 * TDD Unit Tests: Tier Classification Service
 *
 * Test Suite for Agent Tier Classification System
 * Following TDD methodology: Write tests first, then implement service
 *
 * Coverage Target: 95%+ statements, 90%+ branches
 * Test Count: 27 tests
 *
 * Related Specification: /workspaces/agent-feed/docs/SPARC-AGENT-TIER-SYSTEM-SPEC.md
 * Related Pseudocode: /workspaces/agent-feed/docs/PSEUDOCODE-TIER-CLASSIFICATION.md
 */

const TierClassificationService = require('../../api-server/services/tier-classification.service.js');

describe('TierClassificationService', () => {

  // ============================================================================
  // TEST GROUP 1: DetermineAgentTier (Path-based classification)
  // ============================================================================

  describe('DetermineAgentTier - Path Analysis', () => {

    it('should return tier 1 for agent in root agents directory', () => {
      const filePath = '/workspaces/agent-feed/prod/.claude/agents/personal-todos-agent.md';
      const tier = TierClassificationService.DetermineAgentTier(filePath);

      expect(tier).toBe(1);
    });

    it('should return tier 2 for agent in .system subdirectory', () => {
      const filePath = '/workspaces/agent-feed/prod/.claude/agents/.system/meta-agent.md';
      const tier = TierClassificationService.DetermineAgentTier(filePath);

      expect(tier).toBe(2);
    });

    it('should handle Windows path separators correctly', () => {
      const filePath = 'C:\\agents\\.system\\meta-agent.md';
      const tier = TierClassificationService.DetermineAgentTier(filePath);

      expect(tier).toBe(2);
    });

    it('should handle mixed path separators', () => {
      const filePath = '/agents/.system/meta-agent.md';
      const tier = TierClassificationService.DetermineAgentTier(filePath);

      expect(tier).toBe(2);
    });

    it('should default to tier 1 for null path', () => {
      const tier = TierClassificationService.DetermineAgentTier(null);

      expect(tier).toBe(1);
    });

    it('should default to tier 1 for undefined path', () => {
      const tier = TierClassificationService.DetermineAgentTier(undefined);

      expect(tier).toBe(1);
    });

    it('should default to tier 1 for empty string path', () => {
      const tier = TierClassificationService.DetermineAgentTier('');

      expect(tier).toBe(1);
    });

    it('should handle relative paths with .system directory', () => {
      const filePath = '.system/skills-architect-agent.md';
      const tier = TierClassificationService.DetermineAgentTier(filePath);

      expect(tier).toBe(2);
    });
  });

  // ============================================================================
  // TEST GROUP 2: ClassifyTier (Frontmatter-based classification)
  // ============================================================================

  describe('ClassifyTier - Frontmatter Analysis', () => {

    it('should use explicit tier from frontmatter when provided', () => {
      const frontmatter = {
        name: 'test-agent',
        tier: 2
      };

      const tier = TierClassificationService.ClassifyTier(frontmatter);

      expect(tier).toBe(2);
    });

    it('should determine tier 1 from T1 registry - personal-todos-agent', () => {
      const frontmatter = {
        name: 'personal-todos-agent'
      };

      const tier = TierClassificationService.ClassifyTier(frontmatter);

      expect(tier).toBe(1);
    });

    it('should determine tier 1 from T1 registry - meeting-prep-agent', () => {
      const frontmatter = {
        name: 'meeting-prep-agent'
      };

      const tier = TierClassificationService.ClassifyTier(frontmatter);

      expect(tier).toBe(1);
    });

    it('should determine tier 2 from T2 registry - meta-agent', () => {
      const frontmatter = {
        name: 'meta-agent'
      };

      const tier = TierClassificationService.ClassifyTier(frontmatter);

      expect(tier).toBe(2);
    });

    it('should determine tier 2 from T2 registry - skills-architect-agent', () => {
      const frontmatter = {
        name: 'skills-architect-agent'
      };

      const tier = TierClassificationService.ClassifyTier(frontmatter);

      expect(tier).toBe(2);
    });

    it('should classify by pattern for meta-* agents as tier 2', () => {
      const frontmatter = {
        name: 'meta-custom-agent'
      };

      const tier = TierClassificationService.ClassifyTier(frontmatter);

      expect(tier).toBe(2); // Matches 'meta-*' pattern
    });

    it('should classify by pattern for *-architect-agent as tier 2', () => {
      const frontmatter = {
        name: 'custom-architect-agent'
      };

      const tier = TierClassificationService.ClassifyTier(frontmatter);

      expect(tier).toBe(2); // Matches '*-architect-agent' pattern
    });

    it('should default to tier 1 for completely unknown agents', () => {
      const frontmatter = {
        name: 'unknown-custom-agent'
      };

      const tier = TierClassificationService.ClassifyTier(frontmatter);

      expect(tier).toBe(1);
    });

    it('should handle missing name field', () => {
      const frontmatter = {
        description: 'Test agent'
      };

      const tier = TierClassificationService.ClassifyTier(frontmatter);

      expect(tier).toBe(1); // Default to tier 1
    });

    it('should handle null frontmatter', () => {
      const tier = TierClassificationService.ClassifyTier(null);

      expect(tier).toBe(1); // Default to tier 1
    });
  });

  // ============================================================================
  // TEST GROUP 3: ValidateAgentData
  // ============================================================================

  describe('ValidateAgentData', () => {

    it('should validate tier field is required', () => {
      const data = {
        name: 'test-agent',
        description: 'Test description'
        // tier field missing
      };

      const result = TierClassificationService.ValidateAgentData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'tier',
          code: 'REQUIRED_FIELD_MISSING'
        })
      );
    });

    it('should validate tier value must be 1 or 2', () => {
      const data = {
        name: 'test-agent',
        tier: 3, // Invalid
        visibility: 'public'
      };

      const result = TierClassificationService.ValidateAgentData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'tier',
          code: 'INVALID_VALUE'
        })
      );
    });

    it('should warn on tier 2 with posts_as_self=true (inconsistent)', () => {
      const data = {
        name: 'test-agent',
        tier: 2,
        visibility: 'protected',
        posts_as_self: true // Inconsistent with T2
      };

      const result = TierClassificationService.ValidateAgentData(data);

      expect(result.isValid).toBe(true); // Warning, not error
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'posts_as_self',
          code: 'TIER2_POSTS_AS_SELF'
        })
      );
    });

    it('should accept valid tier 1 agent data', () => {
      const data = {
        name: 'personal-todos-agent',
        tier: 1,
        visibility: 'public',
        posts_as_self: true,
        show_in_default_feed: true
      };

      const result = TierClassificationService.ValidateAgentData(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should accept valid tier 2 agent data', () => {
      const data = {
        name: 'meta-agent',
        tier: 2,
        visibility: 'protected',
        posts_as_self: false
      };

      const result = TierClassificationService.ValidateAgentData(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ============================================================================
  // TEST GROUP 4: Helper Functions
  // ============================================================================

  describe('Helper Functions', () => {

    it('should return T1 registry with 8 agents', () => {
      const registry = TierClassificationService.GetTierRegistry();

      expect(registry.tier1).toHaveLength(8);
      expect(registry.tier1).toContain('personal-todos-agent');
      expect(registry.tier1).toContain('meeting-prep-agent');
    });

    it('should return T2 registry with 11 agents', () => {
      const registry = TierClassificationService.GetTierRegistry();

      expect(registry.tier2).toHaveLength(11);
      expect(registry.tier2).toContain('meta-agent');
      expect(registry.tier2).toContain('skills-architect-agent');
    });

    it('should identify tier 1 agent correctly', () => {
      expect(TierClassificationService.IsTier1Agent('personal-todos-agent')).toBe(true);
      expect(TierClassificationService.IsTier1Agent('meta-agent')).toBe(false);
    });

    it('should identify tier 2 agent correctly', () => {
      expect(TierClassificationService.IsTier2Agent('meta-agent')).toBe(true);
      expect(TierClassificationService.IsTier2Agent('personal-todos-agent')).toBe(false);
    });
  });
});
