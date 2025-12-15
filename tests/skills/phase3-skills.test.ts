/**
 * Phase 3 Skills Unit Tests
 *
 * Tests all 11 new skill files for Phase 3 implementation:
 * - conversation-patterns
 * - link-curation
 * - design-system
 * - testing-patterns
 * - component-library
 * - update-protocols
 * - documentation-standards
 * - time-management
 * - goal-frameworks
 * - project-memory
 * - security-policies
 *
 * Target: 55+ tests (5 per skill)
 *
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import { readFile, access, stat } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';

const SKILLS_BASE_PATH = '/workspaces/agent-feed/prod/skills';

// Helper to check if file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Helper to parse frontmatter
function parseFrontmatter(content: string): Record<string, any> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontmatter: Record<string, any> = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      const value = valueParts.join(':').trim();
      frontmatter[key.trim()] = value;
    }
  }

  return frontmatter;
}

// Helper to estimate tokens (rough: 4 chars = 1 token)
function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

describe('Phase 3 Skills - Batch 3: Shared Skills', () => {
  describe('conversation-patterns skill', () => {
    const skillPath = path.join(SKILLS_BASE_PATH, 'shared/conversation-patterns/SKILL.md');

    it('should exist at correct path', async () => {
      const exists = await fileExists(skillPath);
      expect(exists).toBe(true);
    });

    it('should have valid frontmatter with required fields', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).toMatch(/^---\n/);

      const frontmatter = parseFrontmatter(content);
      expect(frontmatter.name).toBeTruthy();
      expect(frontmatter.name.toLowerCase()).toContain('conversation');
      expect(frontmatter.description).toBeTruthy();
    });

    it('should contain required sections', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).toMatch(/## Purpose/i);
      expect(content).toMatch(/## When to Use/i);
    });

    it('should have zero placeholders', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).not.toMatch(/TODO|STUB|PLACEHOLDER|MOCK|FIXME/i);
      expect(content).not.toMatch(/\[To be implemented\]/i);
      expect(content).not.toMatch(/Coming soon/i);
    });

    it('should have reasonable line count (200-700 lines)', async () => {
      const content = await readFile(skillPath, 'utf-8');
      const lineCount = content.split('\n').length;
      expect(lineCount).toBeGreaterThan(200);
      expect(lineCount).toBeLessThan(700);
    });

    it('should have token estimate within acceptable range', async () => {
      const content = await readFile(skillPath, 'utf-8');
      const tokens = estimateTokens(content);
      expect(tokens).toBeGreaterThan(1000); // Minimum useful content
      expect(tokens).toBeLessThan(12000); // Max for shared skill
    });
  });

  describe('project-memory skill', () => {
    const skillPath = path.join(SKILLS_BASE_PATH, 'shared/project-memory/SKILL.md');

    it('should exist at correct path', async () => {
      const exists = await fileExists(skillPath);
      expect(exists).toBe(true);
    });

    it('should have valid frontmatter', async () => {
      const content = await readFile(skillPath, 'utf-8');
      const frontmatter = parseFrontmatter(content);
      expect(frontmatter.name).toBeTruthy();
      expect(frontmatter.name.toLowerCase()).toContain('memory');
      expect(frontmatter.description).toBeTruthy();
      expect(frontmatter.category).toBeTruthy();
    });

    it('should contain memory management sections', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).toMatch(/## Purpose/i);
      expect(content).toMatch(/memory|storage|persistence/i);
    });

    it('should have no placeholders', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).not.toMatch(/TODO|STUB|PLACEHOLDER|MOCK|FIXME/i);
    });

    it('should have substantial content', async () => {
      const content = await readFile(skillPath, 'utf-8');
      const lineCount = content.split('\n').length;
      expect(lineCount).toBeGreaterThan(150);
    });
  });

  describe('time-management skill', () => {
    const skillPath = path.join(SKILLS_BASE_PATH, 'shared/time-management/SKILL.md');

    it('should exist at correct path', async () => {
      const exists = await fileExists(skillPath);
      expect(exists).toBe(true);
    });

    it('should have valid frontmatter', async () => {
      const content = await readFile(skillPath, 'utf-8');
      const frontmatter = parseFrontmatter(content);
      expect(frontmatter.name).toBeTruthy();
      expect(frontmatter.description).toBeTruthy();
    });

    it('should contain time management frameworks', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).toMatch(/time|schedule|calendar|planning/i);
    });

    it('should have no incomplete sections', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).not.toMatch(/TODO|PLACEHOLDER/i);
    });

    it('should be properly formatted', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).toMatch(/^---\n[\s\S]+\n---\n\n#/);
    });
  });

  describe('goal-frameworks skill', () => {
    const skillPath = path.join(SKILLS_BASE_PATH, 'shared/goal-frameworks/SKILL.md');

    it('should exist at correct path', async () => {
      const exists = await fileExists(skillPath);
      expect(exists).toBe(true);
    });

    it('should have valid frontmatter', async () => {
      const content = await readFile(skillPath, 'utf-8');
      const frontmatter = parseFrontmatter(content);
      expect(frontmatter.name).toBeTruthy();
      expect(frontmatter.description).toBeTruthy();
    });

    it('should contain goal-setting frameworks', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).toMatch(/goal|objective|OKR|SMART/i);
    });

    it('should have comprehensive content', async () => {
      const content = await readFile(skillPath, 'utf-8');
      const tokens = estimateTokens(content);
      expect(tokens).toBeGreaterThan(2000);
    });

    it('should have no stubs', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).not.toMatch(/stub|mock|fixme/i);
    });
  });
});

describe('Phase 3 Skills - Batch 4: Development Skills', () => {
  describe('design-system skill', () => {
    const skillPath = path.join(SKILLS_BASE_PATH, 'shared/design-system/SKILL.md');

    it('should exist at correct path', async () => {
      const exists = await fileExists(skillPath);
      expect(exists).toBe(true);
    });

    it('should have shared category in frontmatter', async () => {
      const content = await readFile(skillPath, 'utf-8');
      const frontmatter = parseFrontmatter(content);
      expect(frontmatter.category).toBe('shared');
    });

    it('should contain design system components', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).toMatch(/component|design|UI|interface/i);
    });

    it('should have no placeholders', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).not.toMatch(/TODO|STUB|PLACEHOLDER/i);
    });

    it('should be comprehensive', async () => {
      const content = await readFile(skillPath, 'utf-8');
      const lineCount = content.split('\n').length;
      expect(lineCount).toBeGreaterThan(200);
    });
  });

  describe('testing-patterns skill', () => {
    const skillPath = path.join(SKILLS_BASE_PATH, 'shared/testing-patterns/SKILL.md');

    it('should exist at correct path', async () => {
      const exists = await fileExists(skillPath);
      expect(exists).toBe(true);
    });

    it('should have shared category', async () => {
      const content = await readFile(skillPath, 'utf-8');
      const frontmatter = parseFrontmatter(content);
      expect(frontmatter.category).toBe('shared');
    });

    it('should contain testing methodologies', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).toMatch(/test|TDD|BDD|unit|integration/i);
    });

    it('should have complete content', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).not.toMatch(/TODO|PLACEHOLDER/i);
    });

    it('should have substantial documentation', async () => {
      const content = await readFile(skillPath, 'utf-8');
      const tokens = estimateTokens(content);
      expect(tokens).toBeGreaterThan(2500);
    });
  });

  describe('documentation-standards skill', () => {
    const skillPath = path.join(SKILLS_BASE_PATH, '.system/documentation-standards/SKILL.md');

    it('should exist at correct path', async () => {
      const exists = await fileExists(skillPath);
      expect(exists).toBe(true);
    });

    it('should be protected', async () => {
      const content = await readFile(skillPath, 'utf-8');
      const frontmatter = parseFrontmatter(content);
      expect(frontmatter._protected).toBeTruthy();
    });

    it('should contain documentation guidelines', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).toMatch(/documentation|README|comment|JSDoc/i);
    });

    it('should have no incomplete sections', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).not.toMatch(/TODO|STUB/i);
    });

    it('should be well-structured', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).toMatch(/^---\n[\s\S]+\n---\n\n# /);
    });
  });

  describe('security-policies skill', () => {
    const skillPath = path.join(SKILLS_BASE_PATH, '.system/security-policies/SKILL.md');

    it('should exist at correct path', async () => {
      const exists = await fileExists(skillPath);
      expect(exists).toBe(true);
    });

    it('should be protected system skill', async () => {
      const content = await readFile(skillPath, 'utf-8');
      const frontmatter = parseFrontmatter(content);
      expect(frontmatter._protected).toBeTruthy();
    });

    it('should contain security guidelines', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).toMatch(/security|authentication|authorization|encryption/i);
    });

    it('should have complete content', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).not.toMatch(/TODO|PLACEHOLDER|FIXME/i);
    });

    it('should be comprehensive', async () => {
      const content = await readFile(skillPath, 'utf-8');
      const lineCount = content.split('\n').length;
      expect(lineCount).toBeGreaterThan(150);
    });
  });
});

describe('Phase 3 Skills - Batch 5: Additional Shared and System Skills', () => {
  describe('link-curation skill', () => {
    const skillPath = path.join(SKILLS_BASE_PATH, 'shared/link-curation/SKILL.md');

    it('should exist at correct path', async () => {
      const exists = await fileExists(skillPath);
      expect(exists).toBe(true);
    });

    it('should have valid frontmatter', async () => {
      const content = await readFile(skillPath, 'utf-8');
      const frontmatter = parseFrontmatter(content);
      expect(frontmatter.name).toBeTruthy();
      expect(frontmatter.description).toBeTruthy();
    });

    it('should contain link management patterns', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).toMatch(/link|URL|bookmark|curation/i);
    });

    it('should have no placeholders', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).not.toMatch(/TODO|STUB|PLACEHOLDER/i);
    });

    it('should have reasonable size', async () => {
      const content = await readFile(skillPath, 'utf-8');
      const tokens = estimateTokens(content);
      expect(tokens).toBeGreaterThan(1500);
      expect(tokens).toBeLessThan(12000);
    });
  });

  describe('component-library skill', () => {
    const skillPath = path.join(SKILLS_BASE_PATH, 'shared/component-library/SKILL.md');

    it('should exist at correct path', async () => {
      const exists = await fileExists(skillPath);
      expect(exists).toBe(true);
    });

    it('should have valid frontmatter', async () => {
      const content = await readFile(skillPath, 'utf-8');
      const frontmatter = parseFrontmatter(content);
      expect(frontmatter.name).toBeTruthy();
      expect(frontmatter.description).toBeTruthy();
    });

    it('should contain component documentation', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).toMatch(/component|React|library|UI/i);
    });

    it('should be complete', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).not.toMatch(/TODO|PLACEHOLDER/i);
    });

    it('should have substantial content', async () => {
      const content = await readFile(skillPath, 'utf-8');
      const lineCount = content.split('\n').length;
      expect(lineCount).toBeGreaterThan(200);
    });
  });

  describe('update-protocols skill', () => {
    const skillPath = path.join(SKILLS_BASE_PATH, '.system/update-protocols/SKILL.md');

    it('should exist at correct path', async () => {
      const exists = await fileExists(skillPath);
      expect(exists).toBe(true);
    });

    it('should have valid frontmatter', async () => {
      const content = await readFile(skillPath, 'utf-8');
      const frontmatter = parseFrontmatter(content);
      expect(frontmatter.name).toBeTruthy();
      expect(frontmatter.description).toBeTruthy();
    });

    it('should contain update procedures', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).toMatch(/update|upgrade|migration|version/i);
    });

    it('should have no stubs', async () => {
      const content = await readFile(skillPath, 'utf-8');
      expect(content).not.toMatch(/TODO|STUB|FIXME/i);
    });

    it('should be well-documented', async () => {
      const content = await readFile(skillPath, 'utf-8');
      const tokens = estimateTokens(content);
      expect(tokens).toBeGreaterThan(2000);
    });
  });
});

describe('Phase 3 Skills - Cross-Cutting Validation', () => {
  const phase3Skills = [
    'shared/conversation-patterns',
    'shared/project-memory',
    'shared/time-management',
    'shared/goal-frameworks',
    '.system/design-system',
    '.system/testing-patterns',
    '.system/documentation-standards',
    '.system/security-policies',
    'agent-specific/link-logger-agent/link-curation',
    'agent-specific/page-builder-agent/component-library',
    'agent-specific/meta-update-agent/update-protocols'
  ];

  it('should have all 11 Phase 3 skills present', async () => {
    for (const skillRelPath of phase3Skills) {
      const skillPath = path.join(SKILLS_BASE_PATH, skillRelPath, 'SKILL.md');
      const exists = await fileExists(skillPath);
      expect(exists).toBe(true);
    }
  });

  it('should have consistent frontmatter structure across all skills', async () => {
    for (const skillRelPath of phase3Skills) {
      const skillPath = path.join(SKILLS_BASE_PATH, skillRelPath, 'SKILL.md');
      const content = await readFile(skillPath, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.name).toBeTruthy();
      expect(frontmatter.description).toBeTruthy();
      expect(typeof frontmatter.name).toBe('string');
      expect(typeof frontmatter.description).toBe('string');
    }
  });

  it('should mark system skills as protected', async () => {
    const systemSkills = phase3Skills.filter(s => s.startsWith('.system/'));

    for (const skillRelPath of systemSkills) {
      const skillPath = path.join(SKILLS_BASE_PATH, skillRelPath, 'SKILL.md');
      const content = await readFile(skillPath, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter._protected).toBeTruthy();
    }
  });

  it('should have version numbers in frontmatter', async () => {
    for (const skillRelPath of phase3Skills) {
      const skillPath = path.join(SKILLS_BASE_PATH, skillRelPath, 'SKILL.md');
      const content = await readFile(skillPath, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.version || frontmatter._version).toBeTruthy();
    }
  });

  it('should have no duplicate skill names', async () => {
    const names = new Set<string>();

    for (const skillRelPath of phase3Skills) {
      const skillPath = path.join(SKILLS_BASE_PATH, skillRelPath, 'SKILL.md');
      const content = await readFile(skillPath, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      expect(names.has(frontmatter.name)).toBe(false);
      names.add(frontmatter.name);
    }

    expect(names.size).toBe(11);
  });
});
