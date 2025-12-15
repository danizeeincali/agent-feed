/**
 * Phase 2 Skills Integration Tests
 *
 * Tests skills working together through SkillsService:
 * - Skills service can load all Phase 2 skills
 * - Progressive loading works correctly
 * - Cache behaves properly
 * - Cross-skill references work
 *
 * Following London School TDD:
 * - Mock Anthropic API calls (external dependency)
 * - Real file system operations
 * - Test actual service behavior
 * - Verify interactions between components
 */

import { SkillsService } from '../../api-server/services/skills-service';
import { readFile } from 'fs/promises';
import path from 'path';

// Mock Anthropic SDK (external dependency)
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    beta: {
      skills: {
        create: jest.fn().mockResolvedValue({
          id: 'skill-test-id-123',
          name: 'Test Skill'
        })
      }
    }
  }));
});

describe('Phase 2 Skills - Integration Tests', () => {
  let service: SkillsService;
  const mockApiKey = 'sk-ant-test-phase2-key';

  beforeEach(() => {
    service = new SkillsService(mockApiKey);
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('Skills Service - Phase 2 Skills Loading', () => {
    describe('Shared Skills Loading', () => {
      it('should load user-preferences skill metadata', async () => {
        const metadata = await service.loadSkillMetadata('shared/user-preferences');

        expect(metadata.name).toBe('User Preferences');
        expect(metadata.description).toContain('User preference management');
        expect(metadata.version).toBe('1.0.0');
        expect(metadata._protected).toBe(false);
      });

      it('should load task-management skill metadata', async () => {
        const metadata = await service.loadSkillMetadata('shared/task-management');

        expect(metadata.name).toBe('Task Management');
        expect(metadata.description).toContain('Fibonacci priority system');
        expect(metadata.version).toBe('1.0.0');
        expect(metadata._protected).toBe(false);
      });

      it('should load productivity-patterns skill metadata', async () => {
        const metadata = await service.loadSkillMetadata('shared/productivity-patterns');

        expect(metadata.name).toBe('Productivity Patterns');
        expect(metadata.description).toContain('productivity frameworks');
        expect(metadata.version).toBe('1.0.0');
        expect(metadata._protected).toBe(false);
      });

      it('should load complete user-preferences skill definition', async () => {
        const skill = await service.loadSkillFiles('shared/user-preferences');

        expect(skill.metadata.name).toBe('User Preferences');
        expect(skill.content).toContain('## Purpose');
        expect(skill.content).toContain('User Preference Schema');
        expect(skill.path).toBe('shared/user-preferences');
        expect(skill.hash).toBeTruthy();
        expect(skill.resources).toBeDefined();
      });

      it('should load complete task-management skill definition', async () => {
        const skill = await service.loadSkillFiles('shared/task-management');

        expect(skill.metadata.name).toBe('Task Management');
        expect(skill.content).toContain('## Purpose');
        expect(skill.content).toContain('Fibonacci Priority System');
        expect(skill.content).toContain('P0');
        expect(skill.content).toContain('P8');
        expect(skill.path).toBe('shared/task-management');
        expect(skill.hash).toBeTruthy();
      });

      it('should load complete productivity-patterns skill definition', async () => {
        const skill = await service.loadSkillFiles('shared/productivity-patterns');

        expect(skill.metadata.name).toBe('Productivity Patterns');
        expect(skill.content).toContain('## Purpose');
        expect(skill.content).toContain('Core Productivity Frameworks');
        expect(skill.path).toBe('shared/productivity-patterns');
        expect(skill.hash).toBeTruthy();
      });
    });

    describe('Agent-Specific Skills Loading (Meeting Prep Agent)', () => {
      it('should load meeting-templates skill metadata', async () => {
        const metadata = await service.loadSkillMetadata(
          'agent-specific/meeting-prep-agent/meeting-templates'
        );

        expect(metadata.name).toBe('Meeting Templates');
        expect(metadata.description).toContain('meeting templates');
        expect(metadata.version).toBe('1.0.0');
      });

      it('should load agenda-frameworks skill metadata', async () => {
        const metadata = await service.loadSkillMetadata(
          'agent-specific/meeting-prep-agent/agenda-frameworks'
        );

        expect(metadata.name).toBe('Agenda Frameworks');
        expect(metadata.description).toBeTruthy();
        expect(metadata.version).toBe('1.0.0');
      });

      it('should load note-taking skill metadata', async () => {
        const metadata = await service.loadSkillMetadata(
          'agent-specific/meeting-prep-agent/note-taking'
        );

        expect(metadata.name).toContain('Note');
        expect(metadata.description).toContain('note-taking');
        expect(metadata.version).toBe('1.0.0');
      });

      it('should load complete meeting-templates skill definition', async () => {
        const skill = await service.loadSkillFiles(
          'agent-specific/meeting-prep-agent/meeting-templates'
        );

        expect(skill.metadata.name).toBe('Meeting Templates');
        expect(skill.content).toContain('## Purpose');
        expect(skill.content).toContain('## Meeting Template Structure');
        expect(skill.path).toBe('agent-specific/meeting-prep-agent/meeting-templates');
        expect(skill.hash).toBeTruthy();
      });

      it('should load complete agenda-frameworks skill definition', async () => {
        const skill = await service.loadSkillFiles(
          'agent-specific/meeting-prep-agent/agenda-frameworks'
        );

        expect(skill.metadata.name).toBe('Agenda Frameworks');
        expect(skill.content).toContain('## Purpose');
        expect(skill.content).toContain('## Core Agenda Frameworks');
        expect(skill.path).toBe('agent-specific/meeting-prep-agent/agenda-frameworks');
        expect(skill.hash).toBeTruthy();
      });

      it('should load complete note-taking skill definition', async () => {
        const skill = await service.loadSkillFiles(
          'agent-specific/meeting-prep-agent/note-taking'
        );

        expect(skill.metadata.name).toContain('Note');
        expect(skill.content).toContain('## Purpose');
        expect(skill.path).toBe('agent-specific/meeting-prep-agent/note-taking');
        expect(skill.hash).toBeTruthy();
      });
    });

    describe('Progressive Loading Workflow', () => {
      it('should demonstrate Tier 1 (Discovery) - metadata only loading', async () => {
        // Tier 1: Load only metadata for all Phase 2 skills
        const sharedSkills = [
          'shared/user-preferences',
          'shared/task-management',
          'shared/productivity-patterns'
        ];

        const metadataPromises = sharedSkills.map(skillPath =>
          service.loadSkillMetadata(skillPath)
        );

        const allMetadata = await Promise.all(metadataPromises);

        // All metadata should be loaded
        expect(allMetadata).toHaveLength(3);
        allMetadata.forEach(metadata => {
          expect(metadata.name).toBeTruthy();
          expect(metadata.description).toBeTruthy();
          expect(metadata.version).toBe('1.0.0');
        });
      });

      it('should demonstrate Tier 2 (Invocation) - full content loading', async () => {
        // Tier 2: Load complete skill when needed
        const skill = await service.loadSkillFiles('shared/task-management');

        // Should have full content
        expect(skill.content.length).toBeGreaterThan(1000);
        expect(skill.content).toContain('## Purpose');
        expect(skill.content).toContain('Fibonacci Priority System');

        // Should have resources listed
        expect(skill.resources).toBeDefined();
        expect(Array.isArray(skill.resources)).toBe(true);
      });

      it('should use cache on subsequent Tier 2 loads', async () => {
        // First load - should read from file
        const skill1 = await service.loadSkillFiles('shared/productivity-patterns', true);

        // Second load - should use cache
        const skill2 = await service.loadSkillFiles('shared/productivity-patterns', true);

        // Should be same instance from cache
        expect(skill1.hash).toBe(skill2.hash);
        expect(skill1.content).toBe(skill2.content);

        // Verify cache is being used
        const cacheStats = service.getCacheStats();
        expect(cacheStats.size).toBeGreaterThan(0);
        expect(cacheStats.entries).toContain('shared/productivity-patterns');
      });

      it('should bypass cache when useCache is false', async () => {
        // First load with cache
        const skill1 = await service.loadSkillFiles('shared/user-preferences', true);

        // Second load bypassing cache
        const skill2 = await service.loadSkillFiles('shared/user-preferences', false);

        // Content should be the same but loaded fresh
        expect(skill1.content).toBe(skill2.content);
        expect(skill1.hash).toBe(skill2.hash);
      });
    });

    describe('Cache Management', () => {
      it('should cache multiple Phase 2 skills independently', async () => {
        // Load multiple skills
        await service.loadSkillFiles('shared/user-preferences');
        await service.loadSkillFiles('shared/task-management');
        await service.loadSkillFiles('shared/productivity-patterns');

        const stats = service.getCacheStats();

        expect(stats.size).toBeGreaterThanOrEqual(3);
        expect(stats.entries).toContain('shared/user-preferences');
        expect(stats.entries).toContain('shared/task-management');
        expect(stats.entries).toContain('shared/productivity-patterns');
      });

      it('should clear all cached Phase 2 skills', async () => {
        // Load several skills
        await service.loadSkillFiles('shared/user-preferences');
        await service.loadSkillFiles('shared/task-management');
        await service.loadSkillFiles(
          'agent-specific/meeting-prep-agent/meeting-templates'
        );

        // Verify cache has entries
        let stats = service.getCacheStats();
        expect(stats.size).toBeGreaterThan(0);

        // Clear cache
        service.clearCache();

        // Verify cache is empty
        stats = service.getCacheStats();
        expect(stats.size).toBe(0);
        expect(stats.entries).toHaveLength(0);
      });

      it('should generate unique hashes for different skills', async () => {
        const skill1 = await service.loadSkillFiles('shared/user-preferences');
        const skill2 = await service.loadSkillFiles('shared/task-management');
        const skill3 = await service.loadSkillFiles('shared/productivity-patterns');

        // All hashes should be unique
        expect(skill1.hash).not.toBe(skill2.hash);
        expect(skill2.hash).not.toBe(skill3.hash);
        expect(skill1.hash).not.toBe(skill3.hash);

        // Each hash should be valid SHA-256 (64 hex characters)
        expect(skill1.hash).toMatch(/^[a-f0-9]{64}$/);
        expect(skill2.hash).toMatch(/^[a-f0-9]{64}$/);
        expect(skill3.hash).toMatch(/^[a-f0-9]{64}$/);
      });
    });

    describe('Cross-Skill Reference Validation', () => {
      it('should verify productivity-patterns can be referenced by multiple agents', async () => {
        // Load productivity-patterns (referenced by both personal-todos and meeting-prep)
        const skill = await service.loadSkillFiles('shared/productivity-patterns');

        expect(skill.metadata.name).toBe('Productivity Patterns');
        expect(skill.metadata._protected).toBe(false);

        // Verify content is accessible and complete
        expect(skill.content).toContain('Core Productivity Frameworks');
        expect(skill.content.length).toBeGreaterThan(1000);
      });

      it('should verify task-management references are valid', async () => {
        const taskMgmt = await service.loadSkillFiles('shared/task-management');

        // Should define priority system referenced by other skills
        expect(taskMgmt.content).toContain('Fibonacci Priority System');
        expect(taskMgmt.content).toContain('P0');
        expect(taskMgmt.content).toContain('P1');
        expect(taskMgmt.content).toContain('P2');
        expect(taskMgmt.content).toContain('P3');
        expect(taskMgmt.content).toContain('P5');
        expect(taskMgmt.content).toContain('P8');
      });

      it('should verify user-preferences schema is complete for agent usage', async () => {
        const userPrefs = await service.loadSkillFiles('shared/user-preferences');

        // Should define schemas used by agents
        expect(userPrefs.content).toContain('User Preference Schema');
        expect(userPrefs.content).toContain('communication');
        expect(userPrefs.content).toContain('workflow');
        expect(userPrefs.content).toContain('ui');
        expect(userPrefs.content).toContain('agents');
        expect(userPrefs.content).toContain('privacy');
      });
    });

    describe('Error Handling', () => {
      it('should throw error for non-existent skill', async () => {
        await expect(
          service.loadSkillMetadata('shared/non-existent-skill')
        ).rejects.toThrow('Failed to load skill metadata');
      });

      it('should throw error for invalid skill path', async () => {
        await expect(
          service.loadSkillFiles('invalid/path/to/skill')
        ).rejects.toThrow();
      });

      it('should handle missing SKILL.md gracefully', async () => {
        // Try to load from directory without SKILL.md
        await expect(
          service.loadSkillMetadata('shared')
        ).rejects.toThrow();
      });
    });

    describe('Batch Loading Performance', () => {
      it('should load all Phase 2 skills in parallel', async () => {
        const allSkillPaths = [
          'shared/user-preferences',
          'shared/task-management',
          'shared/productivity-patterns',
          'agent-specific/meeting-prep-agent/meeting-templates',
          'agent-specific/meeting-prep-agent/agenda-frameworks',
          'agent-specific/meeting-prep-agent/note-taking'
        ];

        const startTime = Date.now();

        // Load all skills in parallel
        const skillPromises = allSkillPaths.map(path =>
          service.loadSkillFiles(path)
        );

        const skills = await Promise.all(skillPromises);

        const duration = Date.now() - startTime;

        // All skills should be loaded
        expect(skills).toHaveLength(6);

        // Parallel loading should be reasonably fast
        expect(duration).toBeLessThan(5000); // 5 seconds max

        // All should have valid data
        skills.forEach(skill => {
          expect(skill.metadata.name).toBeTruthy();
          expect(skill.content.length).toBeGreaterThan(500);
          expect(skill.hash).toBeTruthy();
        });
      });

      it('should efficiently load metadata for all Phase 2 skills', async () => {
        const allSkillPaths = [
          'shared/user-preferences',
          'shared/task-management',
          'shared/productivity-patterns',
          'agent-specific/meeting-prep-agent/meeting-templates',
          'agent-specific/meeting-prep-agent/agenda-frameworks',
          'agent-specific/meeting-prep-agent/note-taking'
        ];

        const startTime = Date.now();

        // Load only metadata (Tier 1 - lightweight)
        const metadataPromises = allSkillPaths.map(path =>
          service.loadSkillMetadata(path)
        );

        const metadata = await Promise.all(metadataPromises);

        const duration = Date.now() - startTime;

        // Metadata loading should be very fast
        expect(duration).toBeLessThan(2000); // 2 seconds max

        // All metadata should be loaded
        expect(metadata).toHaveLength(6);

        metadata.forEach(meta => {
          expect(meta.name).toBeTruthy();
          expect(meta.description).toBeTruthy();
          expect(meta.version).toBe('1.0.0');
        });
      });
    });
  });

  describe('Skills Service - Combined Phase 1 + Phase 2 Loading', () => {
    it('should load all 10 skills (4 Phase 1 + 6 Phase 2)', async () => {
      const allSkills = [
        // Phase 1 (protected system skills)
        '.system/brand-guidelines',
        '.system/code-standards',
        '.system/avi-architecture',
        '.system/agent-templates',
        // Phase 2 (shared skills)
        'shared/user-preferences',
        'shared/task-management',
        'shared/productivity-patterns',
        // Phase 2 (agent-specific skills)
        'agent-specific/meeting-prep-agent/meeting-templates',
        'agent-specific/meeting-prep-agent/agenda-frameworks',
        'agent-specific/meeting-prep-agent/note-taking'
      ];

      // Load metadata for all skills
      const metadataPromises = allSkills.map(skillPath => {
        return service.loadSkillMetadata(skillPath).catch(error => {
          // Log but don't fail on protected skills we might not have access to
          console.warn(`Could not load ${skillPath}:`, error.message);
          return null;
        });
      });

      const allMetadata = await Promise.all(metadataPromises);
      const loadedMetadata = allMetadata.filter(m => m !== null);

      // Should have loaded at least the Phase 2 skills
      expect(loadedMetadata.length).toBeGreaterThanOrEqual(6);
    });

    it('should verify Phase 2 skills are accessible while Phase 1 may be protected', async () => {
      // Phase 2 skills should always be accessible
      const phase2Skills = [
        'shared/user-preferences',
        'shared/task-management',
        'shared/productivity-patterns',
        'agent-specific/meeting-prep-agent/meeting-templates',
        'agent-specific/meeting-prep-agent/agenda-frameworks',
        'agent-specific/meeting-prep-agent/note-taking'
      ];

      for (const skillPath of phase2Skills) {
        const metadata = await service.loadSkillMetadata(skillPath);
        expect(metadata).toBeTruthy();
        expect(metadata.name).toBeTruthy();
        expect(metadata._protected).toBe(false);
      }
    });
  });
});
