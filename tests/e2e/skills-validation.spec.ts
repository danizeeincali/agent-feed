/**
 * Skills E2E Validation Tests
 *
 * Playwright E2E tests for skills system:
 * - File structure validation
 * - Permission checks
 * - Content validation
 * - Integration verification
 */

import { test, expect } from '@playwright/test';
import { readdir, readFile, stat, access } from 'fs/promises';
import path from 'path';
import { constants } from 'fs';

const SKILLS_DIR = '/workspaces/agent-feed/prod/skills';

test.describe('Skills System E2E Validation', () => {
  test.describe('Directory Structure', () => {
    test('should have correct skills directory structure', async () => {
      const entries = await readdir(SKILLS_DIR);

      expect(entries).toContain('.system');
      expect(entries).toContain('shared');
      expect(entries).toContain('agent-specific');
    });

    test('should have all 3 system skills', async () => {
      const systemSkills = await readdir(path.join(SKILLS_DIR, '.system'));

      expect(systemSkills).toContain('brand-guidelines');
      expect(systemSkills).toContain('code-standards');
      expect(systemSkills).toContain('avi-architecture');
      expect(systemSkills).toContain('.protected');
    });

    test('should have SKILL.md in each system skill', async () => {
      const systemSkills = ['brand-guidelines', 'code-standards', 'avi-architecture'];

      for (const skill of systemSkills) {
        const skillPath = path.join(SKILLS_DIR, '.system', skill, 'SKILL.md');
        await expect(access(skillPath, constants.R_OK)).resolves.toBeUndefined();
      }
    });
  });

  test.describe('File Permissions', () => {
    test('should have correct permissions on .system directory', async () => {
      const stats = await stat(path.join(SKILLS_DIR, '.system'));
      const mode = stats.mode & parseInt('777', 8);

      // Should be 755 (rwxr-xr-x)
      expect(mode).toBe(parseInt('755', 8));
    });

    test('should have protection marker', async () => {
      const markerPath = path.join(SKILLS_DIR, '.system', '.protected');
      const content = await readFile(markerPath, 'utf-8');

      expect(content).toContain('PROTECTED');
      expect(content).toContain('System skills - Read-only');
    });

    test('should have read-only files in .system', async () => {
      const skillPath = path.join(
        SKILLS_DIR,
        '.system',
        'brand-guidelines',
        'SKILL.md'
      );
      const stats = await stat(skillPath);
      const mode = stats.mode & parseInt('777', 8);

      // Should be 444 (r--r--r--)
      expect(mode).toBe(parseInt('444', 8));
    });
  });

  test.describe('Brand Guidelines Skill Content', () => {
    test('should have valid frontmatter', async () => {
      const skillPath = path.join(
        SKILLS_DIR,
        '.system',
        'brand-guidelines',
        'SKILL.md'
      );
      const content = await readFile(skillPath, 'utf-8');

      // Check frontmatter exists
      expect(content).toMatch(/^---\s*\n/);
      expect(content).toContain('name: AVI Brand Guidelines');
      expect(content).toContain('description:');
      expect(content).toContain('_protected: true');
      expect(content).toContain('_version: "1.0.0"');
    });

    test('should include required sections', async () => {
      const skillPath = path.join(
        SKILLS_DIR,
        '.system',
        'brand-guidelines',
        'SKILL.md'
      );
      const content = await readFile(skillPath, 'utf-8');

      expect(content).toContain('## Purpose');
      expect(content).toContain('## When to Use This Skill');
      expect(content).toContain('## Brand Voice Principles');
      expect(content).toContain('## Messaging Frameworks');
    });

    test('should include agent-specific guidelines', async () => {
      const skillPath = path.join(
        SKILLS_DIR,
        '.system',
        'brand-guidelines',
        'SKILL.md'
      );
      const content = await readFile(skillPath, 'utf-8');

      expect(content).toContain('Strategic Agents');
      expect(content).toContain('Personal Agents');
      expect(content).toContain('Development Agents');
      expect(content).toContain('Λvi-Specific Voice Guidelines');
    });
  });

  test.describe('Code Standards Skill Content', () => {
    test('should have valid frontmatter', async () => {
      const skillPath = path.join(
        SKILLS_DIR,
        '.system',
        'code-standards',
        'SKILL.md'
      );
      const content = await readFile(skillPath, 'utf-8');

      expect(content).toContain('name: AVI Code Standards');
      expect(content).toContain('_protected: true');
    });

    test('should include TypeScript standards', async () => {
      const skillPath = path.join(
        SKILLS_DIR,
        '.system',
        'code-standards',
        'SKILL.md'
      );
      const content = await readFile(skillPath, 'utf-8');

      expect(content).toContain('### 1. TypeScript Standards');
      expect(content).toContain('Strict Type Safety');
      expect(content).toContain('interface');
      expect(content).toContain('type');
    });

    test('should include React standards', async () => {
      const skillPath = path.join(
        SKILLS_DIR,
        '.system',
        'code-standards',
        'SKILL.md'
      );
      const content = await readFile(skillPath, 'utf-8');

      expect(content).toContain('### 2. React Component Standards');
      expect(content).toContain('Functional components');
      expect(content).toContain('hooks');
    });

    test('should include testing standards', async () => {
      const skillPath = path.join(
        SKILLS_DIR,
        '.system',
        'code-standards',
        'SKILL.md'
      );
      const content = await readFile(skillPath, 'utf-8');

      expect(content).toContain('### 4. Testing Standards');
      expect(content).toContain('TDD - London School');
      expect(content).toContain('Test Structure');
    });

    test('should include security standards', async () => {
      const skillPath = path.join(
        SKILLS_DIR,
        '.system',
        'code-standards',
        'SKILL.md'
      );
      const content = await readFile(skillPath, 'utf-8');

      expect(content).toContain('### 6. Security Standards');
      expect(content).toContain('Input Validation');
      expect(content).toContain('XSS Prevention');
    });
  });

  test.describe('Architecture Skill Content', () => {
    test('should have valid frontmatter', async () => {
      const skillPath = path.join(
        SKILLS_DIR,
        '.system',
        'avi-architecture',
        'SKILL.md'
      );
      const content = await readFile(skillPath, 'utf-8');

      expect(content).toContain('name: AVI Architecture Patterns');
      expect(content).toContain('_protected: true');
    });

    test('should include core principles', async () => {
      const skillPath = path.join(
        SKILLS_DIR,
        '.system',
        'avi-architecture',
        'SKILL.md'
      );
      const content = await readFile(skillPath, 'utf-8');

      expect(content).toContain('## Core Architecture Principles');
      expect(content).toContain('### 1. Separation of Concerns');
      expect(content).toContain('### 2. Protected vs Editable Boundaries');
    });

    test('should document agent patterns', async () => {
      const skillPath = path.join(
        SKILLS_DIR,
        '.system',
        'avi-architecture',
        'SKILL.md'
      );
      const content = await readFile(skillPath, 'utf-8');

      expect(content).toContain('### 3. Agent Coordination Patterns');
      expect(content).toContain('Hierarchical Pattern');
      expect(content).toContain('Λvi');
    });

    test('should include API design patterns', async () => {
      const skillPath = path.join(
        SKILLS_DIR,
        '.system',
        'avi-architecture',
        'SKILL.md'
      );
      const content = await readFile(skillPath, 'utf-8');

      expect(content).toContain('### 7. API Design Patterns');
      expect(content).toContain('RESTful');
    });
  });

  test.describe('Content Quality', () => {
    test('should have reasonable content length', async () => {
      const skills = ['brand-guidelines', 'code-standards', 'avi-architecture'];

      for (const skill of skills) {
        const skillPath = path.join(SKILLS_DIR, '.system', skill, 'SKILL.md');
        const content = await readFile(skillPath, 'utf-8');

        // Remove frontmatter for token estimation
        const contentWithoutFrontmatter = content.replace(
          /^---\s*\n[\s\S]*?\n---\s*\n/,
          ''
        );

        // Rough token estimation: ~4 chars per token
        const estimatedTokens = contentWithoutFrontmatter.length / 4;

        // Should be under 5000 tokens
        expect(estimatedTokens).toBeLessThan(5000);
        // Should be substantive (at least 500 tokens)
        expect(estimatedTokens).toBeGreaterThan(500);
      }
    });

    test('should have no placeholder content', async () => {
      const skills = ['brand-guidelines', 'code-standards', 'avi-architecture'];

      for (const skill of skills) {
        const skillPath = path.join(SKILLS_DIR, '.system', skill, 'SKILL.md');
        const content = await readFile(skillPath, 'utf-8');

        // Check for common placeholders
        expect(content).not.toContain('TODO');
        expect(content).not.toContain('[INSERT');
        expect(content).not.toContain('PLACEHOLDER');
        expect(content).not.toContain('Lorem ipsum');
      }
    });

    test('should have proper markdown structure', async () => {
      const skills = ['brand-guidelines', 'code-standards', 'avi-architecture'];

      for (const skill of skills) {
        const skillPath = path.join(SKILLS_DIR, '.system', skill, 'SKILL.md');
        const content = await readFile(skillPath, 'utf-8');

        // Should have h1 title
        expect(content).toMatch(/^# [^\n]+/m);
        // Should have h2 sections
        expect(content).toMatch(/^## [^\n]+/m);
        // Should have code blocks
        expect(content).toMatch(/```[\s\S]*?```/);
      }
    });
  });

  test.describe('Integration Validation', () => {
    test('should be referenceable from CLAUDE.md', async () => {
      const claudeMdPath = '/workspaces/agent-feed/prod/.claude/CLAUDE.md';
      const content = await readFile(claudeMdPath, 'utf-8');

      expect(content).toContain('## 🎯 Claude Agent Skills Integration');
      expect(content).toContain('brand-guidelines');
      expect(content).toContain('code-standards');
      expect(content).toContain('avi-architecture');
    });

    test('should have skills service available', async () => {
      const servicePath = '/workspaces/agent-feed/api-server/services/skills-service.ts';
      await expect(access(servicePath, constants.R_OK)).resolves.toBeUndefined();
    });
  });
});
