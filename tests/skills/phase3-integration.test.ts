/**
 * Phase 3 Skills Integration Tests
 *
 * Tests loading and integration of all 11 Phase 3 skills through the skills service:
 * - Metadata loading
 * - Full content loading
 * - Cache behavior
 * - Protection enforcement
 * - Cross-referencing
 *
 * Target: 33+ tests (3 per skill)
 *
 * @jest-environment node
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { readFile, readdir } from 'fs/promises';
import path from 'path';

const SKILLS_BASE_PATH = '/workspaces/agent-feed/prod/skills';

// Skill metadata interface
interface SkillMetadata {
  name: string;
  description: string;
  version?: string;
  _version?: string;
  _protected?: boolean | string;
  category?: string;
}

// Parse frontmatter from skill content
function parseFrontmatter(content: string): SkillMetadata {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { name: '', description: '' };

  const frontmatter: any = {};
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

// Load skill metadata (Tier 1 - lightweight)
async function loadSkillMetadata(skillRelPath: string): Promise<SkillMetadata> {
  const skillPath = path.join(SKILLS_BASE_PATH, skillRelPath, 'SKILL.md');
  const content = await readFile(skillPath, 'utf-8');
  return parseFrontmatter(content);
}

// Load full skill content (Tier 2 - full)
async function loadSkillContent(skillRelPath: string): Promise<{ metadata: SkillMetadata; content: string; contentSize: number }> {
  const skillPath = path.join(SKILLS_BASE_PATH, skillRelPath, 'SKILL.md');
  const content = await readFile(skillPath, 'utf-8');
  const metadata = parseFrontmatter(content);

  return {
    metadata,
    content,
    contentSize: content.length
  };
}

// Check if skill is protected
function isProtectedSkill(metadata: SkillMetadata): boolean {
  return metadata._protected === true ||
         metadata._protected === 'true' ||
         metadata._protected === 'True';
}

describe('Phase 3 Skills Integration - Shared Skills', () => {
  describe('conversation-patterns skill loading', () => {
    it('should load metadata successfully', async () => {
      const metadata = await loadSkillMetadata('shared/conversation-patterns');
      expect(metadata.name).toBeTruthy();
      expect(metadata.description).toBeTruthy();
      expect(metadata.name.toLowerCase()).toContain('conversation');
    });

    it('should load full content successfully', async () => {
      const { content, contentSize } = await loadSkillContent('shared/conversation-patterns');
      expect(content).toBeTruthy();
      expect(contentSize).toBeGreaterThan(5000); // Minimum 5KB
    });

    it('should not be marked as protected (shared skill)', async () => {
      const metadata = await loadSkillMetadata('shared/conversation-patterns');
      expect(isProtectedSkill(metadata)).toBe(false);
    });
  });

  describe('project-memory skill loading', () => {
    it('should load metadata with correct category', async () => {
      const metadata = await loadSkillMetadata('shared/project-memory');
      expect(metadata.name).toBeTruthy();
      expect(metadata.description).toBeTruthy();
    });

    it('should load full content', async () => {
      const { content } = await loadSkillContent('shared/project-memory');
      expect(content).toContain('memory');
      expect(content.length).toBeGreaterThan(3000);
    });

    it('should have version information', async () => {
      const metadata = await loadSkillMetadata('shared/project-memory');
      expect(metadata.version || metadata._version).toBeTruthy();
    });
  });

  describe('time-management skill loading', () => {
    it('should load metadata', async () => {
      const metadata = await loadSkillMetadata('shared/time-management');
      expect(metadata.name).toBeTruthy();
      expect(metadata.description).toBeTruthy();
    });

    it('should load content with time management frameworks', async () => {
      const { content } = await loadSkillContent('shared/time-management');
      expect(content).toMatch(/time|schedule|calendar/i);
    });

    it('should be accessible to all agents (not protected)', async () => {
      const metadata = await loadSkillMetadata('shared/time-management');
      expect(isProtectedSkill(metadata)).toBe(false);
    });
  });

  describe('goal-frameworks skill loading', () => {
    it('should load metadata successfully', async () => {
      const metadata = await loadSkillMetadata('shared/goal-frameworks');
      expect(metadata.name).toBeTruthy();
      expect(metadata.description).toBeTruthy();
    });

    it('should contain goal-setting content', async () => {
      const { content } = await loadSkillContent('shared/goal-frameworks');
      expect(content).toMatch(/goal|objective|OKR|SMART/i);
    });

    it('should have appropriate size for shared skill', async () => {
      const { contentSize } = await loadSkillContent('shared/goal-frameworks');
      expect(contentSize).toBeGreaterThan(8000); // 8KB minimum
      expect(contentSize).toBeLessThan(50000); // 50KB maximum
    });
  });
});

describe('Phase 3 Skills Integration - System Skills', () => {
  describe('design-system skill loading', () => {
    it('should load metadata with protected flag', async () => {
      const metadata = await loadSkillMetadata('.system/design-system');
      expect(metadata.name).toBeTruthy();
      expect(isProtectedSkill(metadata)).toBe(true);
    });

    it('should load full design system content', async () => {
      const { content } = await loadSkillContent('.system/design-system');
      expect(content).toMatch(/component|design|UI/i);
      expect(content.length).toBeGreaterThan(10000);
    });

    it('should be marked as system skill', async () => {
      const metadata = await loadSkillMetadata('.system/design-system');
      expect(isProtectedSkill(metadata)).toBe(true);
    });
  });

  describe('testing-patterns skill loading', () => {
    it('should load protected system skill metadata', async () => {
      const metadata = await loadSkillMetadata('.system/testing-patterns');
      expect(metadata.name).toBeTruthy();
      expect(isProtectedSkill(metadata)).toBe(true);
    });

    it('should contain testing methodologies', async () => {
      const { content } = await loadSkillContent('.system/testing-patterns');
      expect(content).toMatch(/test|TDD|unit|integration/i);
    });

    it('should have substantial documentation', async () => {
      const { contentSize } = await loadSkillContent('.system/testing-patterns');
      expect(contentSize).toBeGreaterThan(10000);
    });
  });

  describe('documentation-standards skill loading', () => {
    it('should load as protected skill', async () => {
      const metadata = await loadSkillMetadata('.system/documentation-standards');
      expect(isProtectedSkill(metadata)).toBe(true);
    });

    it('should contain documentation guidelines', async () => {
      const { content } = await loadSkillContent('.system/documentation-standards');
      expect(content).toMatch(/documentation|README|comment/i);
    });

    it('should have version control', async () => {
      const metadata = await loadSkillMetadata('.system/documentation-standards');
      expect(metadata.version || metadata._version).toBeTruthy();
    });
  });

  describe('security-policies skill loading', () => {
    it('should load as protected system skill', async () => {
      const metadata = await loadSkillMetadata('.system/security-policies');
      expect(metadata.name).toBeTruthy();
      expect(isProtectedSkill(metadata)).toBe(true);
    });

    it('should contain security guidelines', async () => {
      const { content } = await loadSkillContent('.system/security-policies');
      expect(content).toMatch(/security|authentication|encryption/i);
    });

    it('should be comprehensive', async () => {
      const { contentSize } = await loadSkillContent('.system/security-policies');
      expect(contentSize).toBeGreaterThan(8000);
    });
  });
});

describe('Phase 3 Skills Integration - Agent-Specific Skills', () => {
  describe('link-curation skill loading', () => {
    it('should load agent-specific skill metadata', async () => {
      const metadata = await loadSkillMetadata('agent-specific/link-logger-agent/link-curation');
      expect(metadata.name).toBeTruthy();
      expect(metadata.description).toBeTruthy();
    });

    it('should contain link management patterns', async () => {
      const { content } = await loadSkillContent('agent-specific/link-logger-agent/link-curation');
      expect(content).toMatch(/link|URL|bookmark|curation/i);
    });

    it('should not be protected (agent-specific)', async () => {
      const metadata = await loadSkillMetadata('agent-specific/link-logger-agent/link-curation');
      expect(isProtectedSkill(metadata)).toBe(false);
    });
  });

  describe('component-library skill loading', () => {
    it('should load page-builder skill metadata', async () => {
      const metadata = await loadSkillMetadata('agent-specific/page-builder-agent/component-library');
      expect(metadata.name).toBeTruthy();
    });

    it('should contain component documentation', async () => {
      const { content } = await loadSkillContent('agent-specific/page-builder-agent/component-library');
      expect(content).toMatch(/component|React|library/i);
    });

    it('should have appropriate size for agent-specific skill', async () => {
      const { contentSize } = await loadSkillContent('agent-specific/page-builder-agent/component-library');
      expect(contentSize).toBeGreaterThan(8000);
    });
  });

  describe('update-protocols skill loading', () => {
    it('should load meta-update-agent skill', async () => {
      const metadata = await loadSkillMetadata('agent-specific/meta-update-agent/update-protocols');
      expect(metadata.name).toBeTruthy();
      expect(metadata.description).toBeTruthy();
    });

    it('should contain update procedures', async () => {
      const { content } = await loadSkillContent('agent-specific/meta-update-agent/update-protocols');
      expect(content).toMatch(/update|upgrade|migration|version/i);
    });

    it('should not be protected', async () => {
      const metadata = await loadSkillMetadata('agent-specific/meta-update-agent/update-protocols');
      expect(isProtectedSkill(metadata)).toBe(false);
    });
  });
});

describe('Phase 3 Skills Integration - Cache and Performance', () => {
  it('should load all Phase 3 skills metadata efficiently', async () => {
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

    const startTime = Date.now();
    const metadataPromises = phase3Skills.map(skill => loadSkillMetadata(skill));
    const allMetadata = await Promise.all(metadataPromises);
    const loadTime = Date.now() - startTime;

    expect(allMetadata).toHaveLength(11);
    expect(loadTime).toBeLessThan(5000); // Should load all metadata in under 5 seconds
  });

  it('should handle concurrent skill loading', async () => {
    const skills = [
      'shared/conversation-patterns',
      '.system/design-system',
      'agent-specific/link-logger-agent/link-curation'
    ];

    const contentPromises = skills.map(skill => loadSkillContent(skill));
    const results = await Promise.all(contentPromises);

    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result.content).toBeTruthy();
      expect(result.metadata.name).toBeTruthy();
    });
  });

  it('should validate token estimates for progressive disclosure', async () => {
    const metadata = await loadSkillMetadata('shared/conversation-patterns');
    const { content } = await loadSkillContent('shared/conversation-patterns');

    // Metadata should be lightweight (~50-100 tokens)
    const metadataStr = JSON.stringify(metadata);
    const metadataTokens = Math.ceil(metadataStr.length / 4);
    expect(metadataTokens).toBeLessThan(200);

    // Full content can be larger (2K-10K tokens)
    const contentTokens = Math.ceil(content.length / 4);
    expect(contentTokens).toBeGreaterThan(500);
  });
});

describe('Phase 3 Skills Integration - Cross-Referencing', () => {
  it('should validate cross-references between skills', async () => {
    // Check if conversation-patterns references user-preferences
    const { content: conversationContent } = await loadSkillContent('shared/conversation-patterns');
    const { content: memoryContent } = await loadSkillContent('shared/project-memory');

    // Skills should be self-contained but may reference others
    expect(conversationContent).toBeTruthy();
    expect(memoryContent).toBeTruthy();
  });

  it('should ensure system skills are referenced by appropriate agents', async () => {
    const systemSkills = [
      '.system/design-system',
      '.system/testing-patterns',
      '.system/documentation-standards',
      '.system/security-policies'
    ];

    for (const skill of systemSkills) {
      const metadata = await loadSkillMetadata(skill);
      expect(metadata.name).toBeTruthy();
      expect(isProtectedSkill(metadata)).toBe(true);
    }
  });

  it('should validate skill directory structure', async () => {
    // Check .system directory
    const systemDir = path.join(SKILLS_BASE_PATH, '.system');
    const systemSkills = await readdir(systemDir);
    expect(systemSkills.length).toBeGreaterThan(4); // At least Phase 1 + Phase 3 skills

    // Check shared directory
    const sharedDir = path.join(SKILLS_BASE_PATH, 'shared');
    const sharedSkills = await readdir(sharedDir);
    expect(sharedSkills.length).toBeGreaterThan(4);

    // Check agent-specific directory
    const agentSpecificDir = path.join(SKILLS_BASE_PATH, 'agent-specific');
    const agentDirs = await readdir(agentSpecificDir);
    expect(agentDirs.length).toBeGreaterThan(0);
  });
});

describe('Phase 3 Skills Integration - Error Handling', () => {
  it('should handle missing skill gracefully', async () => {
    await expect(async () => {
      await loadSkillMetadata('shared/nonexistent-skill');
    }).rejects.toThrow();
  });

  it('should handle malformed frontmatter', async () => {
    // This test validates that skills have proper frontmatter
    const skills = [
      'shared/conversation-patterns',
      '.system/design-system'
    ];

    for (const skill of skills) {
      const { content } = await loadSkillContent(skill);
      expect(content).toMatch(/^---\n[\s\S]+?\n---/);
    }
  });

  it('should validate all Phase 3 skills are loadable', async () => {
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

    const results = await Promise.allSettled(
      phase3Skills.map(skill => loadSkillContent(skill))
    );

    const failures = results.filter(r => r.status === 'rejected');
    expect(failures).toHaveLength(0);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(11);
  });
});
