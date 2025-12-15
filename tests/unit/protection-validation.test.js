/**
 * TDD Unit Tests: Protection Validation Service
 *
 * Test Suite for Agent Protection Validation System
 * Following TDD methodology: Write tests first, then implement service
 *
 * Coverage Target: 95%+ statements, 90%+ branches
 * Test Count: 20 tests
 *
 * Related Specification: /workspaces/agent-feed/docs/SPARC-AGENT-TIER-SYSTEM-SPEC.md
 * Related Pseudocode: /workspaces/agent-feed/docs/PSEUDOCODE-PROTECTION-VALIDATION.md
 */

const ProtectionService = require('../../api-server/services/protection-validation.service.js');

describe('ProtectionValidationService', () => {

  // Mock user contexts for testing
  const regularUser = {
    userId: 'user-123',
    isAuthenticated: true,
    isAdmin: false,
    permissions: []
  };

  const adminUser = {
    userId: 'admin-456',
    isAuthenticated: true,
    isAdmin: true,
    permissions: ['admin', 'edit_agents']
  };

  // ============================================================================
  // TEST GROUP 1: DetermineProtectionStatus - Filesystem Protection
  // ============================================================================

  describe('DetermineProtectionStatus - Filesystem Protection', () => {

    it('should protect agents in .system directory with SYSTEM level', () => {
      const agent = {
        id: 'test-1',
        slug: 'meta-agent',
        name: 'meta-agent',
        tier: 2,
        visibility: 'protected',
        filePath: '/workspaces/agent-feed/prod/.claude/agents/.system/meta-agent.md'
      };

      const protection = ProtectionService.DetermineProtectionStatus(agent, regularUser);

      expect(protection.isProtected).toBe(true);
      expect(protection.protectionReason).toBe('FILESYSTEM_READONLY');
      expect(protection.protectionLevel).toBe('SYSTEM');
      expect(protection.canEdit).toBe(false);
      expect(protection.canDelete).toBe(false);
      expect(protection.canViewSource).toBe(true);
      expect(protection.warningMessage).toContain('System directory');
    });

    it('should not protect agents in root agents directory', () => {
      const agent = {
        id: 'test-2',
        slug: 'personal-todos-agent',
        name: 'personal-todos-agent',
        tier: 1,
        visibility: 'public',
        filePath: '/workspaces/agent-feed/prod/.claude/agents/personal-todos-agent.md'
      };

      const protection = ProtectionService.DetermineProtectionStatus(agent, regularUser);

      expect(protection.isProtected).toBe(false);
      expect(protection.canEdit).toBe(true);
      expect(protection.canDelete).toBe(true);
    });

    it('should handle null filePath gracefully', () => {
      const agent = {
        id: 'test-3',
        slug: 'test-agent',
        name: 'test-agent',
        tier: 1,
        visibility: 'public',
        filePath: null
      };

      const protection = ProtectionService.DetermineProtectionStatus(agent, regularUser);

      expect(protection.isProtected).toBe(false);
    });
  });

  // ============================================================================
  // TEST GROUP 2: DetermineProtectionStatus - Tier 2 Protected
  // ============================================================================

  describe('DetermineProtectionStatus - Tier 2 Protected', () => {

    it('should protect tier 2 agents with protected visibility', () => {
      const agent = {
        id: 'test-4',
        slug: 'skills-architect-agent',
        name: 'skills-architect-agent',
        tier: 2,
        visibility: 'protected',
        filePath: '/agents/skills-architect-agent.md'
      };

      const protection = ProtectionService.DetermineProtectionStatus(agent, regularUser);

      expect(protection.isProtected).toBe(true);
      expect(protection.protectionReason).toBe('TIER2_PROTECTED');
      expect(protection.protectionLevel).toBe('PROTECTED');
      expect(protection.canEdit).toBe(false);
      expect(protection.canDelete).toBe(false);
    });

    it('should allow admin to edit tier 2 protected agents', () => {
      const agent = {
        id: 'test-5',
        slug: 'skills-architect-agent',
        name: 'skills-architect-agent',
        tier: 2,
        visibility: 'protected',
        filePath: '/agents/skills-architect-agent.md'
      };

      const protection = ProtectionService.DetermineProtectionStatus(agent, adminUser);

      expect(protection.isProtected).toBe(true);
      expect(protection.canEdit).toBe(true); // Admin override
      expect(protection.canDelete).toBe(false); // Still cannot delete
    });

    it('should not protect tier 2 agents with public visibility', () => {
      const agent = {
        id: 'test-6',
        slug: 'test-system-agent',
        name: 'test-system-agent',
        tier: 2,
        visibility: 'public',
        filePath: '/agents/test-system-agent.md'
      };

      const protection = ProtectionService.DetermineProtectionStatus(agent, regularUser);

      expect(protection.isProtected).toBe(false);
      expect(protection.canEdit).toBe(true);
    });
  });

  // ============================================================================
  // TEST GROUP 3: DetermineProtectionStatus - Registry Checks
  // ============================================================================

  describe('DetermineProtectionStatus - Protected Agent Registry', () => {

    it('should protect Phase 4.2 specialist agents - skills-architect-agent', () => {
      const agent = {
        id: 'test-7',
        slug: 'skills-architect-agent',
        name: 'skills-architect-agent',
        tier: 2,
        visibility: 'protected',
        filePath: '/agents/skills-architect-agent.md'
      };

      const protection = ProtectionService.DetermineProtectionStatus(agent, regularUser);

      expect(protection.isProtected).toBe(true);
      expect(protection.protectionReason).toMatch(/TIER2_PROTECTED|SYSTEM_CRITICAL/);
    });

    it('should protect Phase 4.2 specialist agents - agent-architect-agent', () => {
      const agent = {
        id: 'test-8',
        slug: 'agent-architect-agent',
        name: 'agent-architect-agent',
        tier: 2,
        visibility: 'protected',
        filePath: '/agents/agent-architect-agent.md'
      };

      const protection = ProtectionService.DetermineProtectionStatus(agent, regularUser);

      expect(protection.isProtected).toBe(true);
    });

    it('should protect meta-coordination agents - meta-agent', () => {
      const agent = {
        id: 'test-9',
        slug: 'meta-agent',
        name: 'meta-agent',
        tier: 1, // Meta-agent is T1
        visibility: 'protected',
        filePath: '/agents/meta-agent.md'
      };

      const protection = ProtectionService.DetermineProtectionStatus(agent, regularUser);

      expect(protection.isProtected).toBe(true);
      expect(protection.canEdit).toBe(false);
    });

    it('should protect meta-update-agent', () => {
      const agent = {
        id: 'test-10',
        slug: 'meta-update-agent',
        name: 'meta-update-agent',
        tier: 1,
        visibility: 'protected',
        filePath: '/agents/meta-update-agent.md'
      };

      const protection = ProtectionService.DetermineProtectionStatus(agent, regularUser);

      expect(protection.isProtected).toBe(true);
    });
  });

  // ============================================================================
  // TEST GROUP 4: Helper Functions
  // ============================================================================

  describe('Helper Functions', () => {

    it('should identify system directory agents correctly', () => {
      const systemAgent = {
        filePath: '/workspaces/agent-feed/prod/.claude/agents/.system/meta-agent.md'
      };

      const regularAgent = {
        filePath: '/workspaces/agent-feed/prod/.claude/agents/personal-todos-agent.md'
      };

      expect(ProtectionService.IsSystemDirectoryAgent(systemAgent)).toBe(true);
      expect(ProtectionService.IsSystemDirectoryAgent(regularAgent)).toBe(false);
    });

    it('should handle null filePath in IsSystemDirectoryAgent', () => {
      const agent = { filePath: null };

      expect(ProtectionService.IsSystemDirectoryAgent(agent)).toBe(false);
    });

    it('should determine if user can modify agent - regular user', () => {
      const protectedAgent = {
        id: 'test-11',
        slug: 'meta-agent',
        name: 'meta-agent',
        tier: 2,
        visibility: 'protected',
        filePath: '/agents/meta-agent.md'
      };

      const canModify = ProtectionService.CanUserModifyAgent(protectedAgent, regularUser);

      expect(canModify).toBe(false);
    });

    it('should determine if user can modify agent - admin user', () => {
      const protectedAgent = {
        id: 'test-12',
        slug: 'meta-agent',
        name: 'meta-agent',
        tier: 2,
        visibility: 'protected',
        filePath: '/agents/meta-agent.md'
      };

      const canModify = ProtectionService.CanUserModifyAgent(protectedAgent, adminUser);

      expect(canModify).toBe(true);
    });

    it('should allow regular user to modify unprotected agents', () => {
      const publicAgent = {
        id: 'test-13',
        slug: 'personal-todos-agent',
        name: 'personal-todos-agent',
        tier: 1,
        visibility: 'public',
        filePath: '/agents/personal-todos-agent.md'
      };

      const canModify = ProtectionService.CanUserModifyAgent(publicAgent, regularUser);

      expect(canModify).toBe(true);
    });
  });

  // ============================================================================
  // TEST GROUP 5: Protection Badge Configuration
  // ============================================================================

  describe('GetProtectionBadgeConfig', () => {

    it('should return correct badge config for SYSTEM protection level', () => {
      const protection = {
        isProtected: true,
        protectionLevel: 'SYSTEM',
        warningMessage: 'System directory agents are read-only'
      };

      const badgeConfig = ProtectionService.GetProtectionBadgeConfig(protection);

      expect(badgeConfig).toBeDefined();
      expect(badgeConfig.text).toBe('System Protected');
      expect(badgeConfig.color).toMatch(/#DC2626|red/i);
      expect(badgeConfig.icon).toBe('Lock');
    });

    it('should return correct badge config for PROTECTED level', () => {
      const protection = {
        isProtected: true,
        protectionLevel: 'PROTECTED',
        warningMessage: 'Protected system agent'
      };

      const badgeConfig = ProtectionService.GetProtectionBadgeConfig(protection);

      expect(badgeConfig).toBeDefined();
      expect(badgeConfig.text).toBe('Protected');
      expect(badgeConfig.color).toMatch(/#F59E0B|amber|orange/i);
      expect(badgeConfig.icon).toMatch(/Shield|Lock/i);
    });

    it('should return null for unprotected agents', () => {
      const protection = {
        isProtected: false,
        protectionLevel: 'PUBLIC'
      };

      const badgeConfig = ProtectionService.GetProtectionBadgeConfig(protection);

      expect(badgeConfig).toBeNull();
    });
  });

  // ============================================================================
  // TEST GROUP 6: GetProtectedAgentRegistry
  // ============================================================================

  describe('GetProtectedAgentRegistry', () => {

    it('should return Phase 4.2 specialist agents list', () => {
      const registry = ProtectionService.GetProtectedAgentRegistry();

      expect(registry.phase42Specialists).toContain('skills-architect-agent');
      expect(registry.phase42Specialists).toContain('agent-architect-agent');
      expect(registry.phase42Specialists).toContain('learning-optimizer-agent');
      expect(registry.phase42Specialists).toHaveLength(6);
    });

    it('should return meta-coordination agents list', () => {
      const registry = ProtectionService.GetProtectedAgentRegistry();

      expect(registry.metaCoordination).toContain('meta-agent');
      expect(registry.metaCoordination).toContain('meta-update-agent');
      expect(registry.metaCoordination).toHaveLength(2);
    });

    it('should return all protected agents combined', () => {
      const registry = ProtectionService.GetProtectedAgentRegistry();

      expect(registry.allProtected).toContain('meta-agent');
      expect(registry.allProtected).toContain('skills-architect-agent');
      expect(registry.allProtected).toHaveLength(8);
    });
  });
});
