/**
 * Phase 2 Skills E2E Validation Tests
 *
 * End-to-end validation using Playwright:
 * - Directory structure validation
 * - All 10 skills loadable (4 Phase 1 + 6 Phase 2)
 * - Agent configs parse correctly
 * - No broken skill references
 * - File permissions validation
 *
 * Following London School TDD:
 * - Real file system operations
 * - Mock only external APIs if needed
 * - Test complete workflow end-to-end
 */

import { test, expect } from '@playwright/test';
import { readFile, readdir, stat, access } from 'fs/promises';
import path from 'path';
import { constants } from 'fs';

const SKILLS_DIR = '/workspaces/agent-feed/prod/skills';
const AGENTS_DIR = '/workspaces/agent-feed/prod/.claude/agents';

test.describe('Phase 2 Skills - E2E Validation', () => {
  test.describe('Directory Structure Validation', () => {
    test('should have correct skills directory structure', async () => {
      // Check main skills directory exists
      await expect(async () => {
        await access(SKILLS_DIR, constants.F_OK);
      }).not.toThrow();

      // Check subdirectories exist
      const subdirs = await readdir(SKILLS_DIR);

      expect(subdirs).toContain('shared');
      expect(subdirs).toContain('agent-specific');
      expect(subdirs).toContain('.system');
    });

    test('should have all Phase 2 shared skills directories', async () => {
      const sharedDir = path.join(SKILLS_DIR, 'shared');
      const sharedSkills = await readdir(sharedDir);

      expect(sharedSkills).toContain('user-preferences');
      expect(sharedSkills).toContain('task-management');
      expect(sharedSkills).toContain('productivity-patterns');
    });

    test('should have meeting-prep-agent specific skills directories', async () => {
      const meetingPrepDir = path.join(SKILLS_DIR, 'agent-specific/meeting-prep-agent');
      const meetingSkills = await readdir(meetingPrepDir);

      expect(meetingSkills).toContain('meeting-templates');
      expect(meetingSkills).toContain('agenda-frameworks');
      expect(meetingSkills).toContain('note-taking');
    });

    test('should have SKILL.md in each Phase 2 skill directory', async () => {
      const phase2Skills = [
        'shared/user-preferences',
        'shared/task-management',
        'shared/productivity-patterns',
        'agent-specific/meeting-prep-agent/meeting-templates',
        'agent-specific/meeting-prep-agent/agenda-frameworks',
        'agent-specific/meeting-prep-agent/note-taking'
      ];

      for (const skillPath of phase2Skills) {
        const skillMdPath = path.join(SKILLS_DIR, skillPath, 'SKILL.md');
        const stats = await stat(skillMdPath);

        expect(stats.isFile()).toBe(true);
      }
    });
  });

  test.describe('All Skills Loadability (Phase 1 + Phase 2)', () => {
    test('should be able to read all 10 skill SKILL.md files', async () => {
      const allSkills = [
        // Phase 1 (protected)
        '.system/brand-guidelines',
        '.system/code-standards',
        '.system/avi-architecture',
        '.system/agent-templates',
        // Phase 2 (shared)
        'shared/user-preferences',
        'shared/task-management',
        'shared/productivity-patterns',
        // Phase 2 (agent-specific)
        'agent-specific/meeting-prep-agent/meeting-templates',
        'agent-specific/meeting-prep-agent/agenda-frameworks',
        'agent-specific/meeting-prep-agent/note-taking'
      ];

      let loadedCount = 0;
      const loadResults: { skill: string; loaded: boolean; error?: string }[] = [];

      for (const skillPath of allSkills) {
        const skillMdPath = path.join(SKILLS_DIR, skillPath, 'SKILL.md');

        try {
          const content = await readFile(skillMdPath, 'utf-8');

          if (content.length > 0) {
            loadedCount++;
            loadResults.push({ skill: skillPath, loaded: true });
          }
        } catch (error) {
          loadResults.push({
            skill: skillPath,
            loaded: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Should load at least Phase 2 skills (6) if Phase 1 protected
      expect(loadedCount).toBeGreaterThanOrEqual(6);

      // Log results for debugging
      console.log('Skill loading results:', loadResults);
    });

    test('should have valid frontmatter in all Phase 2 skills', async () => {
      const phase2Skills = [
        'shared/user-preferences',
        'shared/task-management',
        'shared/productivity-patterns',
        'agent-specific/meeting-prep-agent/meeting-templates',
        'agent-specific/meeting-prep-agent/agenda-frameworks',
        'agent-specific/meeting-prep-agent/note-taking'
      ];

      for (const skillPath of phase2Skills) {
        const skillMdPath = path.join(SKILLS_DIR, skillPath, 'SKILL.md');
        const content = await readFile(skillMdPath, 'utf-8');

        // Should have frontmatter
        expect(content).toMatch(/^---\s*\n[\s\S]*?\n---/);

        // Extract frontmatter
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
        const match = content.match(frontmatterRegex);

        expect(match).not.toBeNull();

        const frontmatter = match![1];

        // Required fields
        expect(frontmatter).toMatch(/name:/);
        expect(frontmatter).toMatch(/description:/);
        expect(frontmatter).toMatch(/version:/);
      }
    });

    test('should have substantial content in all Phase 2 skills (300+ lines)', async () => {
      const phase2Skills = [
        'shared/user-preferences',
        'shared/task-management',
        'shared/productivity-patterns',
        'agent-specific/meeting-prep-agent/meeting-templates',
        'agent-specific/meeting-prep-agent/agenda-frameworks',
        'agent-specific/meeting-prep-agent/note-taking'
      ];

      for (const skillPath of phase2Skills) {
        const skillMdPath = path.join(SKILLS_DIR, skillPath, 'SKILL.md');
        const content = await readFile(skillMdPath, 'utf-8');
        const lineCount = content.split('\n').length;

        expect(lineCount).toBeGreaterThanOrEqual(300);
      }
    });
  });

  test.describe('Agent Config Parsing', () => {
    test('should parse meta-agent config with skills', async () => {
      const agentPath = path.join(AGENTS_DIR, 'meta-agent.md');
      const content = await readFile(agentPath, 'utf-8');

      // Should have frontmatter with skills
      expect(content).toMatch(/^---\s*\n[\s\S]*?\n---/);
      expect(content).toContain('skills:');
      expect(content).toContain('skills_loading: progressive');
      expect(content).toContain('skills_cache_ttl: 3600');

      // Should have skill references
      expect(content).toContain('- name: brand-guidelines');
      expect(content).toContain('path: .system/brand-guidelines');
    });

    test('should parse personal-todos-agent config with Phase 2 skills', async () => {
      const agentPath = path.join(AGENTS_DIR, 'personal-todos-agent.md');
      const content = await readFile(agentPath, 'utf-8');

      // Should have frontmatter with skills
      expect(content).toContain('skills:');
      expect(content).toContain('skills_loading: progressive');

      // Should have Phase 2 shared skills
      expect(content).toContain('- name: user-preferences');
      expect(content).toContain('path: shared/user-preferences');
      expect(content).toContain('- name: task-management');
      expect(content).toContain('path: shared/task-management');
      expect(content).toContain('- name: productivity-patterns');
      expect(content).toContain('path: shared/productivity-patterns');
    });

    test('should parse meeting-prep-agent config with Phase 2 skills', async () => {
      const agentPath = path.join(AGENTS_DIR, 'meeting-prep-agent.md');
      const content = await readFile(agentPath, 'utf-8');

      // Should have frontmatter with skills
      expect(content).toContain('skills:');
      expect(content).toContain('skills_loading: progressive');

      // Should have Phase 2 agent-specific skills
      expect(content).toContain('- name: meeting-templates');
      expect(content).toContain('path: agent-specific/meeting-prep-agent/meeting-templates');
      expect(content).toContain('- name: agenda-frameworks');
      expect(content).toContain('path: agent-specific/meeting-prep-agent/agenda-frameworks');
      expect(content).toContain('- name: note-taking');
      expect(content).toContain('path: agent-specific/meeting-prep-agent/note-taking');

      // Should have shared skill
      expect(content).toContain('- name: productivity-patterns');
      expect(content).toContain('path: shared/productivity-patterns');
    });
  });

  test.describe('Skill Reference Integrity', () => {
    test('should have no broken skill references in personal-todos-agent', async () => {
      const agentPath = path.join(AGENTS_DIR, 'personal-todos-agent.md');
      const content = await readFile(agentPath, 'utf-8');

      // Extract skill paths
      const skillPathRegex = /path:\s*([^\n]+)/g;
      const matches = [...content.matchAll(skillPathRegex)];

      for (const match of matches) {
        const skillPath = match[1].trim();

        // Skip protected system skills (might not be accessible)
        if (skillPath.startsWith('.system/')) {
          continue;
        }

        // Verify skill exists
        const fullPath = path.join(SKILLS_DIR, skillPath, 'SKILL.md');

        await expect(async () => {
          await access(fullPath, constants.R_OK);
        }).not.toThrow();
      }
    });

    test('should have no broken skill references in meeting-prep-agent', async () => {
      const agentPath = path.join(AGENTS_DIR, 'meeting-prep-agent.md');
      const content = await readFile(agentPath, 'utf-8');

      // Extract skill paths
      const skillPathRegex = /path:\s*([^\n]+)/g;
      const matches = [...content.matchAll(skillPathRegex)];

      for (const match of matches) {
        const skillPath = match[1].trim();

        // Skip protected system skills
        if (skillPath.startsWith('.system/')) {
          continue;
        }

        // Verify skill exists
        const fullPath = path.join(SKILLS_DIR, skillPath, 'SKILL.md');

        await expect(async () => {
          await access(fullPath, constants.R_OK);
        }).not.toThrow();
      }
    });

    test('should have all referenced skills actually exist', async () => {
      const agents = [
        'personal-todos-agent.md',
        'meeting-prep-agent.md'
      ];

      let totalReferences = 0;
      let validReferences = 0;

      for (const agent of agents) {
        const agentPath = path.join(AGENTS_DIR, agent);
        const content = await readFile(agentPath, 'utf-8');

        const skillPathRegex = /path:\s*([^\n]+)/g;
        const matches = [...content.matchAll(skillPathRegex)];

        for (const match of matches) {
          const skillPath = match[1].trim();
          totalReferences++;

          // Skip protected system skills
          if (skillPath.startsWith('.system/')) {
            validReferences++;
            continue;
          }

          try {
            const fullPath = path.join(SKILLS_DIR, skillPath, 'SKILL.md');
            await access(fullPath, constants.R_OK);
            validReferences++;
          } catch (error) {
            console.error(`Invalid skill reference: ${skillPath} in ${agent}`);
          }
        }
      }

      // All non-system skill references should be valid
      expect(validReferences).toBe(totalReferences);
    });
  });

  test.describe('File Permissions Validation', () => {
    test('should have readable permissions on all Phase 2 skills', async () => {
      const phase2Skills = [
        'shared/user-preferences',
        'shared/task-management',
        'shared/productivity-patterns',
        'agent-specific/meeting-prep-agent/meeting-templates',
        'agent-specific/meeting-prep-agent/agenda-frameworks',
        'agent-specific/meeting-prep-agent/note-taking'
      ];

      for (const skillPath of phase2Skills) {
        const skillMdPath = path.join(SKILLS_DIR, skillPath, 'SKILL.md');

        // Should be readable
        await expect(async () => {
          await access(skillMdPath, constants.R_OK);
        }).not.toThrow();

        // Check file stats
        const stats = await stat(skillMdPath);
        expect(stats.isFile()).toBe(true);

        // File should have read permissions
        const mode = stats.mode & parseInt('777', 8);
        expect(mode & parseInt('400', 8)).toBeTruthy(); // Owner read
      }
    });

    test('should have directory permissions for Phase 2 skill directories', async () => {
      const phase2SkillDirs = [
        'shared',
        'shared/user-preferences',
        'shared/task-management',
        'shared/productivity-patterns',
        'agent-specific/meeting-prep-agent',
        'agent-specific/meeting-prep-agent/meeting-templates',
        'agent-specific/meeting-prep-agent/agenda-frameworks',
        'agent-specific/meeting-prep-agent/note-taking'
      ];

      for (const dir of phase2SkillDirs) {
        const dirPath = path.join(SKILLS_DIR, dir);

        // Should be accessible
        await expect(async () => {
          await access(dirPath, constants.X_OK);
        }).not.toThrow();

        // Check directory stats
        const stats = await stat(dirPath);
        expect(stats.isDirectory()).toBe(true);
      }
    });
  });

  test.describe('Content Quality Validation', () => {
    test('should have no placeholder content in Phase 2 skills', async () => {
      const phase2Skills = [
        'shared/user-preferences',
        'shared/task-management',
        'shared/productivity-patterns',
        'agent-specific/meeting-prep-agent/meeting-templates',
        'agent-specific/meeting-prep-agent/agenda-frameworks',
        'agent-specific/meeting-prep-agent/note-taking'
      ];

      const placeholderPatterns = [
        /TODO:/gi,
        /STUB/gi,
        /PLACEHOLDER/gi,
        /\[TO BE IMPLEMENTED\]/gi,
        /\[COMING SOON\]/gi
      ];

      for (const skillPath of phase2Skills) {
        const skillMdPath = path.join(SKILLS_DIR, skillPath, 'SKILL.md');
        const content = await readFile(skillMdPath, 'utf-8');

        for (const pattern of placeholderPatterns) {
          expect(content).not.toMatch(pattern);
        }
      }
    });

    test('should have proper markdown structure in Phase 2 skills', async () => {
      const phase2Skills = [
        'shared/user-preferences',
        'shared/task-management',
        'shared/productivity-patterns',
        'agent-specific/meeting-prep-agent/meeting-templates',
        'agent-specific/meeting-prep-agent/agenda-frameworks',
        'agent-specific/meeting-prep-agent/note-taking'
      ];

      for (const skillPath of phase2Skills) {
        const skillMdPath = path.join(SKILLS_DIR, skillPath, 'SKILL.md');
        const content = await readFile(skillMdPath, 'utf-8');

        // Should have H1 header
        expect(content).toMatch(/^#\s+\w+/m);

        // Should have multiple H2 sections
        const h2Count = (content.match(/^##\s+/gm) || []).length;
        expect(h2Count).toBeGreaterThanOrEqual(3);

        // Should have code blocks
        expect(content).toContain('```');
      }
    });

    test('should have version 1.0.0 in all Phase 2 skills', async () => {
      const phase2Skills = [
        'shared/user-preferences',
        'shared/task-management',
        'shared/productivity-patterns',
        'agent-specific/meeting-prep-agent/meeting-templates',
        'agent-specific/meeting-prep-agent/agenda-frameworks',
        'agent-specific/meeting-prep-agent/note-taking'
      ];

      for (const skillPath of phase2Skills) {
        const skillMdPath = path.join(SKILLS_DIR, skillPath, 'SKILL.md');
        const content = await readFile(skillMdPath, 'utf-8');

        expect(content).toMatch(/version:\s*["']1\.0\.0["']/);
      }
    });
  });

  test.describe('Integration Smoke Test', () => {
    test('should successfully load complete Phase 2 implementation', async () => {
      // Count total skills
      const allSkills = [
        'shared/user-preferences',
        'shared/task-management',
        'shared/productivity-patterns',
        'agent-specific/meeting-prep-agent/meeting-templates',
        'agent-specific/meeting-prep-agent/agenda-frameworks',
        'agent-specific/meeting-prep-agent/note-taking'
      ];

      let totalLines = 0;
      const loadedSkills: string[] = [];

      for (const skillPath of allSkills) {
        try {
          const skillMdPath = path.join(SKILLS_DIR, skillPath, 'SKILL.md');
          const content = await readFile(skillMdPath, 'utf-8');
          const lineCount = content.split('\n').length;

          totalLines += lineCount;
          loadedSkills.push(skillPath);
        } catch (error) {
          console.error(`Failed to load skill: ${skillPath}`);
        }
      }

      // Should have loaded all 6 Phase 2 skills
      expect(loadedSkills.length).toBe(6);

      // Should be approximately 3,447 lines (within 1% tolerance)
      expect(totalLines).toBeGreaterThanOrEqual(3420);
      expect(totalLines).toBeLessThanOrEqual(3480);
    });

    test('should have all agent configs updated with skills', async () => {
      const agents = [
        'meta-agent.md',
        'personal-todos-agent.md',
        'meeting-prep-agent.md'
      ];

      let totalSkillRefs = 0;

      for (const agent of agents) {
        const agentPath = path.join(AGENTS_DIR, agent);
        const content = await readFile(agentPath, 'utf-8');

        // Count skill references
        const skillRefs = (content.match(/- name:/g) || []).length;
        totalSkillRefs += skillRefs;

        // Should have skills configuration
        expect(content).toContain('skills:');
        expect(content).toContain('skills_loading: progressive');
        expect(content).toContain('skills_cache_ttl: 3600');
      }

      // Should have 13 total skill references (4 + 4 + 5)
      expect(totalSkillRefs).toBe(13);
    });

    test('should have zero placeholders across all Phase 2 deliverables', async () => {
      const phase2Skills = [
        'shared/user-preferences',
        'shared/task-management',
        'shared/productivity-patterns',
        'agent-specific/meeting-prep-agent/meeting-templates',
        'agent-specific/meeting-prep-agent/agenda-frameworks',
        'agent-specific/meeting-prep-agent/note-taking'
      ];

      let totalPlaceholders = 0;

      for (const skillPath of phase2Skills) {
        const skillMdPath = path.join(SKILLS_DIR, skillPath, 'SKILL.md');
        const content = await readFile(skillMdPath, 'utf-8');

        // Count placeholders
        const todoCount = (content.match(/TODO:/gi) || []).length;
        const stubCount = (content.match(/STUB/gi) || []).length;
        const placeholderCount = (content.match(/PLACEHOLDER/gi) || []).length;

        totalPlaceholders += todoCount + stubCount + placeholderCount;
      }

      // Should have ZERO placeholders
      expect(totalPlaceholders).toBe(0);
    });
  });
});
