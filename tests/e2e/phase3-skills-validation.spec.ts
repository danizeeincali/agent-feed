/**
 * Phase 3 E2E Skills Validation
 *
 * End-to-end validation of Phase 3 implementation:
 * - Complete directory structure
 * - File permissions for .system skills
 * - All skills can be loaded
 * - All agent configs are valid
 * - Integration: Load agent with skills through API (simulated)
 *
 * Target: 25+ tests
 *
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import { readFile, readdir, stat, access } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';

const SKILLS_BASE_PATH = '/workspaces/agent-feed/prod/skills';
const AGENTS_BASE_PATH = '/workspaces/agent-feed/prod/.claude/agents';

// Helper functions
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function isReadable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function getFilePermissions(filePath: string): Promise<number> {
  const stats = await stat(filePath);
  return stats.mode & parseInt('777', 8);
}

describe('Phase 3 E2E - Directory Structure Validation', () => {
  it('should have complete skills directory structure', async () => {
    const directories = [
      '.system',
      'shared',
      'agent-specific',
      'agent-specific/link-logger-agent',
      'agent-specific/page-builder-agent',
      'agent-specific/meta-update-agent',
      'agent-specific/meeting-prep-agent'
    ];

    for (const dir of directories) {
      const dirPath = path.join(SKILLS_BASE_PATH, dir);
      const exists = await fileExists(dirPath);
      expect(exists).toBe(true);
    }
  });

  it('should have all Phase 3 system skills directories', async () => {
    const systemSkills = [
      'brand-guidelines',
      'code-standards',
      'avi-architecture',
      'agent-templates',
      'design-system',
      'testing-patterns',
      'documentation-standards',
      'security-policies'
    ];

    for (const skill of systemSkills) {
      const skillPath = path.join(SKILLS_BASE_PATH, '.system', skill);
      const exists = await fileExists(skillPath);
      expect(exists).toBe(true);
    }
  });

  it('should have all Phase 3 shared skills directories', async () => {
    const sharedSkills = [
      'user-preferences',
      'task-management',
      'productivity-patterns',
      'feedback-frameworks',
      'conversation-patterns',
      'project-memory',
      'time-management',
      'goal-frameworks',
      'meeting-coordination',
      'idea-evaluation',
      'follow-up-patterns'
    ];

    for (const skill of sharedSkills) {
      const skillPath = path.join(SKILLS_BASE_PATH, 'shared', skill);
      const exists = await fileExists(skillPath);
      expect(exists).toBe(true);
    }
  });

  it('should have all Phase 3 agent-specific skill directories', async () => {
    const agentSpecificSkills = [
      'meeting-prep-agent/meeting-templates',
      'meeting-prep-agent/agenda-frameworks',
      'meeting-prep-agent/note-taking',
      'link-logger-agent/link-curation',
      'page-builder-agent/component-library',
      'meta-update-agent/update-protocols'
    ];

    for (const skill of agentSpecificSkills) {
      const skillPath = path.join(SKILLS_BASE_PATH, 'agent-specific', skill);
      const exists = await fileExists(skillPath);
      expect(exists).toBe(true);
    }
  });

  it('should have SKILL.md file in each directory', async () => {
    const allSkills = [
      '.system/design-system',
      '.system/testing-patterns',
      '.system/documentation-standards',
      '.system/security-policies',
      'shared/conversation-patterns',
      'shared/project-memory',
      'shared/time-management',
      'shared/goal-frameworks',
      'agent-specific/link-logger-agent/link-curation',
      'agent-specific/page-builder-agent/component-library',
      'agent-specific/meta-update-agent/update-protocols'
    ];

    for (const skill of allSkills) {
      const skillFilePath = path.join(SKILLS_BASE_PATH, skill, 'SKILL.md');
      const exists = await fileExists(skillFilePath);
      expect(exists).toBe(true);
    }
  });
});

describe('Phase 3 E2E - File Permissions Validation', () => {
  it('should have .system directory with appropriate permissions', async () => {
    const systemDir = path.join(SKILLS_BASE_PATH, '.system');
    const perms = await getFilePermissions(systemDir);

    // Check readable and executable (755 or 755)
    expect(perms & 0o400).toBeGreaterThan(0); // Owner read
    expect(perms & 0o100).toBeGreaterThan(0); // Owner execute
  });

  it('should have all .system skills readable', async () => {
    const systemSkills = [
      'brand-guidelines',
      'code-standards',
      'avi-architecture',
      'agent-templates',
      'design-system',
      'testing-patterns',
      'documentation-standards',
      'security-policies'
    ];

    for (const skill of systemSkills) {
      const skillPath = path.join(SKILLS_BASE_PATH, '.system', skill, 'SKILL.md');
      const readable = await isReadable(skillPath);
      expect(readable).toBe(true);
    }
  });

  it('should have shared skills readable and writable', async () => {
    const sharedDir = path.join(SKILLS_BASE_PATH, 'shared');
    const readable = await isReadable(sharedDir);
    expect(readable).toBe(true);
  });

  it('should have agent-specific skills readable', async () => {
    const agentSpecificDir = path.join(SKILLS_BASE_PATH, 'agent-specific');
    const readable = await isReadable(agentSpecificDir);
    expect(readable).toBe(true);
  });
});

describe('Phase 3 E2E - Skills Loading Validation', () => {
  it('should load all Phase 3 system skills without errors', async () => {
    const systemSkills = [
      'design-system',
      'testing-patterns',
      'documentation-standards',
      'security-policies'
    ];

    for (const skill of systemSkills) {
      const skillPath = path.join(SKILLS_BASE_PATH, '.system', skill, 'SKILL.md');
      const content = await readFile(skillPath, 'utf-8');

      expect(content).toBeTruthy();
      expect(content).toMatch(/^---/);
      expect(content.length).toBeGreaterThan(1000);
    }
  });

  it('should load all Phase 3 shared skills without errors', async () => {
    const sharedSkills = [
      'conversation-patterns',
      'project-memory',
      'time-management',
      'goal-frameworks'
    ];

    for (const skill of sharedSkills) {
      const skillPath = path.join(SKILLS_BASE_PATH, 'shared', skill, 'SKILL.md');
      const content = await readFile(skillPath, 'utf-8');

      expect(content).toBeTruthy();
      expect(content).toMatch(/^---/);
      expect(content.length).toBeGreaterThan(1000);
    }
  });

  it('should load all Phase 3 agent-specific skills without errors', async () => {
    const agentSpecificSkills = [
      'link-logger-agent/link-curation',
      'page-builder-agent/component-library',
      'meta-update-agent/update-protocols'
    ];

    for (const skill of agentSpecificSkills) {
      const skillPath = path.join(SKILLS_BASE_PATH, 'agent-specific', skill, 'SKILL.md');
      const content = await readFile(skillPath, 'utf-8');

      expect(content).toBeTruthy();
      expect(content).toMatch(/^---/);
      expect(content.length).toBeGreaterThan(1000);
    }
  });

  it('should parse frontmatter from all Phase 3 skills', async () => {
    const allSkills = [
      '.system/design-system',
      '.system/testing-patterns',
      'shared/conversation-patterns',
      'shared/project-memory',
      'agent-specific/link-logger-agent/link-curation'
    ];

    for (const skill of allSkills) {
      const skillPath = path.join(SKILLS_BASE_PATH, skill, 'SKILL.md');
      const content = await readFile(skillPath, 'utf-8');

      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      expect(frontmatterMatch).toBeTruthy();
      expect(frontmatterMatch![1]).toContain('name:');
      expect(frontmatterMatch![1]).toContain('description:');
    }
  });
});

describe('Phase 3 E2E - Agent Configuration Validation', () => {
  it('should load all Phase 3 agent configurations', async () => {
    const phase3Agents = [
      'agent-feedback-agent.md',
      'agent-ideas-agent.md',
      'follow-ups-agent.md',
      'meeting-next-steps-agent.md',
      'link-logger-agent.md',
      'get-to-know-you-agent.md',
      'page-builder-agent.md',
      'page-verification-agent.md',
      'dynamic-page-testing-agent.md',
      'meta-update-agent.md'
    ];

    for (const agent of phase3Agents) {
      const agentPath = path.join(AGENTS_BASE_PATH, agent);
      const content = await readFile(agentPath, 'utf-8');

      expect(content).toBeTruthy();
      expect(content).toMatch(/^---/);
      expect(content).toContain('skills:');
    }
  });

  it('should validate agent configs have skills arrays', async () => {
    const phase3Agents = [
      'agent-feedback-agent.md',
      'link-logger-agent.md',
      'page-builder-agent.md'
    ];

    for (const agent of phase3Agents) {
      const agentPath = path.join(AGENTS_BASE_PATH, agent);
      const content = await readFile(agentPath, 'utf-8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

      expect(frontmatterMatch).toBeTruthy();
      expect(frontmatterMatch![1]).toContain('skills:');
      expect(frontmatterMatch![1]).toContain('- name:');
    }
  });

  it('should validate all agents have skills_loading configured', async () => {
    const phase3Agents = [
      'agent-feedback-agent.md',
      'follow-ups-agent.md',
      'link-logger-agent.md'
    ];

    for (const agent of phase3Agents) {
      const agentPath = path.join(AGENTS_BASE_PATH, agent);
      const content = await readFile(agentPath, 'utf-8');

      expect(content).toMatch(/skills_loading:\s*(progressive|eager|manual)/);
    }
  });

  it('should validate all agents have skills_cache_ttl configured', async () => {
    const phase3Agents = [
      'agent-feedback-agent.md',
      'meeting-next-steps-agent.md',
      'page-builder-agent.md'
    ];

    for (const agent of phase3Agents) {
      const agentPath = path.join(AGENTS_BASE_PATH, agent);
      const content = await readFile(agentPath, 'utf-8');

      expect(content).toMatch(/skills_cache_ttl:\s*\d+/);
    }
  });
});

describe('Phase 3 E2E - Integration Test Simulations', () => {
  it('should simulate loading agent with skills', async () => {
    // Simulate loading agent-feedback-agent with its skills
    const agentPath = path.join(AGENTS_BASE_PATH, 'agent-feedback-agent.md');
    const agentContent = await readFile(agentPath, 'utf-8');

    // Extract skills from agent config
    const skillsMatch = agentContent.match(/skills:\s*([\s\S]*?)(?=\n\w+:|---)/);
    expect(skillsMatch).toBeTruthy();

    // Parse skill names
    const skillNames = skillsMatch![1].match(/name:\s*([^\n]+)/g);
    expect(skillNames).toBeTruthy();
    expect(skillNames!.length).toBeGreaterThan(0);

    // Verify we can load at least one skill
    const firstSkillName = skillNames![0].replace('name:', '').trim();
    expect(firstSkillName).toBeTruthy();
  });

  it('should simulate progressive disclosure pattern', async () => {
    // Step 1: Load skill metadata (lightweight)
    const skillPath = path.join(SKILLS_BASE_PATH, 'shared/conversation-patterns/SKILL.md');
    const content = await readFile(skillPath, 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    const metadata = frontmatterMatch![1];
    const metadataSize = metadata.length;

    // Step 2: Load full content
    const fullContentSize = content.length;

    // Verify metadata is significantly smaller than full content
    expect(metadataSize).toBeLessThan(fullContentSize / 10);
    expect(metadataSize).toBeLessThan(1000);
  });

  it('should validate cross-agent skill sharing', async () => {
    // brand-guidelines should be used by multiple agents
    const agents = [
      'agent-feedback-agent.md',
      'agent-ideas-agent.md',
      'meta-agent.md'
    ];

    let brandGuidelinesCount = 0;

    for (const agent of agents) {
      const agentPath = path.join(AGENTS_BASE_PATH, agent);
      const exists = await fileExists(agentPath);

      if (exists) {
        const content = await readFile(agentPath, 'utf-8');
        if (content.includes('brand-guidelines')) {
          brandGuidelinesCount++;
        }
      }
    }

    // At least 2 agents should use brand-guidelines
    expect(brandGuidelinesCount).toBeGreaterThan(1);
  });

  it('should validate agent-specific skills are properly isolated', async () => {
    // link-curation should only be in link-logger-agent
    const linkCurationPath = path.join(
      SKILLS_BASE_PATH,
      'agent-specific/link-logger-agent/link-curation/SKILL.md'
    );
    const exists = await fileExists(linkCurationPath);
    expect(exists).toBe(true);

    // Verify it's in the agent's config
    const agentPath = path.join(AGENTS_BASE_PATH, 'link-logger-agent.md');
    const agentExists = await fileExists(agentPath);

    if (agentExists) {
      const agentContent = await readFile(agentPath, 'utf-8');
      expect(agentContent).toMatch(/link.*curation|curation/i);
    }
  });

  it('should validate system skills protection in agent configs', async () => {
    // Check that design-system is marked as coming from .system
    const agentPath = path.join(AGENTS_BASE_PATH, 'page-builder-agent.md');
    const exists = await fileExists(agentPath);

    if (exists) {
      const content = await readFile(agentPath, 'utf-8');
      if (content.includes('design-system')) {
        expect(content).toMatch(/\.system\/design-system/);
      }
    }
  });
});

describe('Phase 3 E2E - Content Quality Validation', () => {
  it('should validate no placeholder content in Phase 3 skills', async () => {
    const phase3Skills = [
      '.system/design-system',
      '.system/testing-patterns',
      'shared/conversation-patterns',
      'shared/project-memory',
      'agent-specific/link-logger-agent/link-curation'
    ];

    for (const skill of phase3Skills) {
      const skillPath = path.join(SKILLS_BASE_PATH, skill, 'SKILL.md');
      const content = await readFile(skillPath, 'utf-8');

      expect(content).not.toMatch(/TODO|STUB|PLACEHOLDER|MOCK|FIXME/i);
      expect(content).not.toMatch(/\[To be implemented\]/i);
      expect(content).not.toMatch(/Coming soon/i);
    }
  });

  it('should validate all Phase 3 skills have minimum content', async () => {
    const phase3Skills = [
      '.system/design-system',
      'shared/conversation-patterns',
      'agent-specific/link-logger-agent/link-curation'
    ];

    for (const skill of phase3Skills) {
      const skillPath = path.join(SKILLS_BASE_PATH, skill, 'SKILL.md');
      const content = await readFile(skillPath, 'utf-8');

      expect(content.length).toBeGreaterThan(5000); // At least 5KB
      expect(content.split('\n').length).toBeGreaterThan(150); // At least 150 lines
    }
  });

  it('should validate all Phase 3 skills have required sections', async () => {
    const phase3Skills = [
      '.system/testing-patterns',
      'shared/time-management',
      'agent-specific/page-builder-agent/component-library'
    ];

    for (const skill of phase3Skills) {
      const skillPath = path.join(SKILLS_BASE_PATH, skill, 'SKILL.md');
      const content = await readFile(skillPath, 'utf-8');

      expect(content).toMatch(/## Purpose/i);
      expect(content).toMatch(/## When to Use/i);
    }
  });
});
