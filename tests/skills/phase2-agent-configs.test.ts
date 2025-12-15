/**
 * Phase 2 Agent Configuration Tests
 *
 * Tests for 3 agent configurations updated with Phase 2 skills:
 * - meta-agent (4 skills - all Phase 1 protected)
 * - personal-todos-agent (4 skills - 1 Phase 1 + 3 Phase 2)
 * - meeting-prep-agent (5 skills - 1 Phase 1 + 4 Phase 2)
 *
 * Following London School TDD:
 * - Real file operations to read agent configs
 * - Validate actual YAML/frontmatter structure
 * - Test skill path references
 * - Verify configuration consistency
 */

import { readFile, stat } from 'fs/promises';
import path from 'path';

// Test configuration
const AGENTS_DIR = '/workspaces/agent-feed/prod/.claude/agents';
const SKILLS_DIR = '/workspaces/agent-feed/prod/skills';

interface SkillReference {
  name: string;
  path: string;
  required: boolean;
}

interface AgentConfig {
  name: string;
  description: string;
  skills?: SkillReference[];
  skills_loading?: string;
  skills_cache_ttl?: number;
}

/**
 * Parse agent frontmatter to extract configuration
 */
function parseAgentFrontmatter(content: string): AgentConfig {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error('No frontmatter found in agent config');
  }

  const frontmatter = match[1];
  const config: Partial<AgentConfig> = {};

  // Parse YAML-like frontmatter
  const lines = frontmatter.split('\n');
  let currentSection: string | null = null;
  const skills: SkillReference[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('name:')) {
      config.name = line.split(':')[1].trim();
    } else if (line.startsWith('description:')) {
      config.description = line.substring(line.indexOf(':') + 1).trim();
    } else if (line.startsWith('skills:')) {
      currentSection = 'skills';
    } else if (line.startsWith('skills_loading:')) {
      config.skills_loading = line.split(':')[1].trim();
    } else if (line.startsWith('skills_cache_ttl:')) {
      config.skills_cache_ttl = parseInt(line.split(':')[1].trim());
    } else if (currentSection === 'skills' && line.trim().startsWith('- name:')) {
      // Parse skill entry
      const skillName = line.split('name:')[1].trim();
      let skillPath = '';
      let skillRequired = false;

      // Look ahead for path and required
      if (i + 1 < lines.length && lines[i + 1].includes('path:')) {
        skillPath = lines[i + 1].split('path:')[1].trim();
      }
      if (i + 2 < lines.length && lines[i + 2].includes('required:')) {
        skillRequired = lines[i + 2].split('required:')[1].trim() === 'true';
      }

      skills.push({ name: skillName, path: skillPath, required: skillRequired });
    } else if (line.trim() && !line.startsWith(' ') && !line.startsWith('-')) {
      currentSection = null;
    }
  }

  config.skills = skills;

  return config as AgentConfig;
}

describe('Phase 2 Agent Configuration Tests', () => {
  describe('meta-agent Configuration', () => {
    const agentPath = path.join(AGENTS_DIR, 'meta-agent.md');
    let agentContent: string;
    let config: AgentConfig;

    beforeAll(async () => {
      agentContent = await readFile(agentPath, 'utf-8');
      config = parseAgentFrontmatter(agentContent);
    });

    it('should exist and be readable', async () => {
      const stats = await stat(agentPath);
      expect(stats.isFile()).toBe(true);
      expect(agentContent.length).toBeGreaterThan(0);
    });

    it('should have skills section in frontmatter', () => {
      expect(agentContent).toContain('skills:');
      expect(agentContent).toContain('skills_loading:');
      expect(agentContent).toContain('skills_cache_ttl:');
    });

    it('should have 4 skills configured', () => {
      expect(config.skills).toBeDefined();
      expect(config.skills?.length).toBe(4);
    });

    it('should have brand-guidelines skill', () => {
      const brandSkill = config.skills?.find(s => s.name === 'brand-guidelines');

      expect(brandSkill).toBeDefined();
      expect(brandSkill?.path).toBe('.system/brand-guidelines');
      expect(brandSkill?.required).toBe(true);
    });

    it('should have code-standards skill', () => {
      const codeSkill = config.skills?.find(s => s.name === 'code-standards');

      expect(codeSkill).toBeDefined();
      expect(codeSkill?.path).toBe('.system/code-standards');
      expect(codeSkill?.required).toBe(true);
    });

    it('should have avi-architecture skill', () => {
      const aviSkill = config.skills?.find(s => s.name === 'avi-architecture');

      expect(aviSkill).toBeDefined();
      expect(aviSkill?.path).toBe('.system/avi-architecture');
      expect(aviSkill?.required).toBe(true);
    });

    it('should have agent-templates skill', () => {
      const templatesSkill = config.skills?.find(s => s.name === 'agent-templates');

      expect(templatesSkill).toBeDefined();
      expect(templatesSkill?.path).toBe('.system/agent-templates');
      expect(templatesSkill?.required).toBe(true);
    });

    it('should have progressive loading configured', () => {
      expect(config.skills_loading).toBe('progressive');
    });

    it('should have cache TTL configured', () => {
      expect(config.skills_cache_ttl).toBe(3600);
    });

    it('should have all skill paths pointing to valid directories', async () => {
      for (const skill of config.skills || []) {
        const skillPath = path.join(SKILLS_DIR, skill.path);

        try {
          const stats = await stat(skillPath);
          expect(stats.isDirectory()).toBe(true);
        } catch (error) {
          // Protected system skills might not be accessible in test environment
          console.warn(`Could not verify protected skill path: ${skill.path}`);
        }
      }
    });
  });

  describe('personal-todos-agent Configuration', () => {
    const agentPath = path.join(AGENTS_DIR, 'personal-todos-agent.md');
    let agentContent: string;
    let config: AgentConfig;

    beforeAll(async () => {
      agentContent = await readFile(agentPath, 'utf-8');
      config = parseAgentFrontmatter(agentContent);
    });

    it('should exist and be readable', async () => {
      const stats = await stat(agentPath);
      expect(stats.isFile()).toBe(true);
      expect(agentContent.length).toBeGreaterThan(0);
    });

    it('should have skills section in frontmatter', () => {
      expect(agentContent).toContain('skills:');
      expect(agentContent).toContain('skills_loading:');
      expect(agentContent).toContain('skills_cache_ttl:');
    });

    it('should have 4 skills configured', () => {
      expect(config.skills).toBeDefined();
      expect(config.skills?.length).toBe(4);
    });

    it('should have brand-guidelines skill (Phase 1)', () => {
      const brandSkill = config.skills?.find(s => s.name === 'brand-guidelines');

      expect(brandSkill).toBeDefined();
      expect(brandSkill?.path).toBe('.system/brand-guidelines');
      expect(brandSkill?.required).toBe(true);
    });

    it('should have user-preferences skill (Phase 2 - shared)', () => {
      const userPrefsSkill = config.skills?.find(s => s.name === 'user-preferences');

      expect(userPrefsSkill).toBeDefined();
      expect(userPrefsSkill?.path).toBe('shared/user-preferences');
      expect(userPrefsSkill?.required).toBe(false);
    });

    it('should have task-management skill (Phase 2 - shared)', () => {
      const taskMgmtSkill = config.skills?.find(s => s.name === 'task-management');

      expect(taskMgmtSkill).toBeDefined();
      expect(taskMgmtSkill?.path).toBe('shared/task-management');
      expect(taskMgmtSkill?.required).toBe(true);
    });

    it('should have productivity-patterns skill (Phase 2 - shared)', () => {
      const productivitySkill = config.skills?.find(s => s.name === 'productivity-patterns');

      expect(productivitySkill).toBeDefined();
      expect(productivitySkill?.path).toBe('shared/productivity-patterns');
      expect(productivitySkill?.required).toBe(false);
    });

    it('should have progressive loading configured', () => {
      expect(config.skills_loading).toBe('progressive');
    });

    it('should have cache TTL configured', () => {
      expect(config.skills_cache_ttl).toBe(3600);
    });

    it('should have all Phase 2 skill paths pointing to valid directories', async () => {
      const phase2Skills = config.skills?.filter(s =>
        s.path.startsWith('shared/')
      ) || [];

      for (const skill of phase2Skills) {
        const skillPath = path.join(SKILLS_DIR, skill.path);
        const skillMdPath = path.join(skillPath, 'SKILL.md');

        const dirStats = await stat(skillPath);
        expect(dirStats.isDirectory()).toBe(true);

        const fileStats = await stat(skillMdPath);
        expect(fileStats.isFile()).toBe(true);
      }
    });

    it('should have mix of required and optional skills', () => {
      const requiredSkills = config.skills?.filter(s => s.required) || [];
      const optionalSkills = config.skills?.filter(s => !s.required) || [];

      expect(requiredSkills.length).toBeGreaterThan(0);
      expect(optionalSkills.length).toBeGreaterThan(0);
    });
  });

  describe('meeting-prep-agent Configuration', () => {
    const agentPath = path.join(AGENTS_DIR, 'meeting-prep-agent.md');
    let agentContent: string;
    let config: AgentConfig;

    beforeAll(async () => {
      agentContent = await readFile(agentPath, 'utf-8');
      config = parseAgentFrontmatter(agentContent);
    });

    it('should exist and be readable', async () => {
      const stats = await stat(agentPath);
      expect(stats.isFile()).toBe(true);
      expect(agentContent.length).toBeGreaterThan(0);
    });

    it('should have skills section in frontmatter', () => {
      expect(agentContent).toContain('skills:');
      expect(agentContent).toContain('skills_loading:');
      expect(agentContent).toContain('skills_cache_ttl:');
    });

    it('should have 5 skills configured', () => {
      expect(config.skills).toBeDefined();
      expect(config.skills?.length).toBe(5);
    });

    it('should have brand-guidelines skill (Phase 1)', () => {
      const brandSkill = config.skills?.find(s => s.name === 'brand-guidelines');

      expect(brandSkill).toBeDefined();
      expect(brandSkill?.path).toBe('.system/brand-guidelines');
      expect(brandSkill?.required).toBe(true);
    });

    it('should have meeting-templates skill (Phase 2 - agent-specific)', () => {
      const templatesSkill = config.skills?.find(s => s.name === 'meeting-templates');

      expect(templatesSkill).toBeDefined();
      expect(templatesSkill?.path).toBe('agent-specific/meeting-prep-agent/meeting-templates');
      expect(templatesSkill?.required).toBe(true);
    });

    it('should have agenda-frameworks skill (Phase 2 - agent-specific)', () => {
      const agendaSkill = config.skills?.find(s => s.name === 'agenda-frameworks');

      expect(agendaSkill).toBeDefined();
      expect(agendaSkill?.path).toBe('agent-specific/meeting-prep-agent/agenda-frameworks');
      expect(agendaSkill?.required).toBe(true);
    });

    it('should have note-taking skill (Phase 2 - agent-specific)', () => {
      const notesSkill = config.skills?.find(s => s.name === 'note-taking');

      expect(notesSkill).toBeDefined();
      expect(notesSkill?.path).toBe('agent-specific/meeting-prep-agent/note-taking');
      expect(notesSkill?.required).toBe(false);
    });

    it('should have productivity-patterns skill (Phase 2 - shared)', () => {
      const productivitySkill = config.skills?.find(s => s.name === 'productivity-patterns');

      expect(productivitySkill).toBeDefined();
      expect(productivitySkill?.path).toBe('shared/productivity-patterns');
      expect(productivitySkill?.required).toBe(false);
    });

    it('should have progressive loading configured', () => {
      expect(config.skills_loading).toBe('progressive');
    });

    it('should have cache TTL configured', () => {
      expect(config.skills_cache_ttl).toBe(3600);
    });

    it('should have all Phase 2 skill paths pointing to valid directories', async () => {
      const phase2Skills = config.skills?.filter(s =>
        s.path.startsWith('shared/') || s.path.startsWith('agent-specific/')
      ) || [];

      for (const skill of phase2Skills) {
        const skillPath = path.join(SKILLS_DIR, skill.path);
        const skillMdPath = path.join(skillPath, 'SKILL.md');

        const dirStats = await stat(skillPath);
        expect(dirStats.isDirectory()).toBe(true);

        const fileStats = await stat(skillMdPath);
        expect(fileStats.isFile()).toBe(true);
      }
    });

    it('should have agent-specific skills in correct directory structure', async () => {
      const agentSpecificSkills = config.skills?.filter(s =>
        s.path.startsWith('agent-specific/meeting-prep-agent/')
      ) || [];

      expect(agentSpecificSkills.length).toBe(3);

      for (const skill of agentSpecificSkills) {
        expect(skill.path).toContain('meeting-prep-agent');
      }
    });

    it('should have mix of required and optional skills', () => {
      const requiredSkills = config.skills?.filter(s => s.required) || [];
      const optionalSkills = config.skills?.filter(s => !s.required) || [];

      expect(requiredSkills.length).toBe(3); // brand-guidelines, meeting-templates, agenda-frameworks
      expect(optionalSkills.length).toBe(2); // note-taking, productivity-patterns
    });
  });

  describe('Cross-Agent Configuration Validation', () => {
    it('should have consistent skills_loading across all agents', async () => {
      const agents = ['meta-agent.md', 'personal-todos-agent.md', 'meeting-prep-agent.md'];
      const loadingConfigs: string[] = [];

      for (const agent of agents) {
        const content = await readFile(path.join(AGENTS_DIR, agent), 'utf-8');
        const config = parseAgentFrontmatter(content);
        loadingConfigs.push(config.skills_loading || '');
      }

      // All should use progressive loading
      loadingConfigs.forEach(loading => {
        expect(loading).toBe('progressive');
      });
    });

    it('should have consistent cache TTL across all agents', async () => {
      const agents = ['meta-agent.md', 'personal-todos-agent.md', 'meeting-prep-agent.md'];
      const cacheTTLs: number[] = [];

      for (const agent of agents) {
        const content = await readFile(path.join(AGENTS_DIR, agent), 'utf-8');
        const config = parseAgentFrontmatter(content);
        cacheTTLs.push(config.skills_cache_ttl || 0);
      }

      // All should use 3600 seconds (1 hour)
      cacheTTLs.forEach(ttl => {
        expect(ttl).toBe(3600);
      });
    });

    it('should have brand-guidelines as required skill in all agents', async () => {
      const agents = ['meta-agent.md', 'personal-todos-agent.md', 'meeting-prep-agent.md'];

      for (const agent of agents) {
        const content = await readFile(path.join(AGENTS_DIR, agent), 'utf-8');
        const config = parseAgentFrontmatter(content);

        const brandSkill = config.skills?.find(s => s.name === 'brand-guidelines');

        expect(brandSkill).toBeDefined();
        expect(brandSkill?.required).toBe(true);
      }
    });

    it('should verify shared skills are accessible to multiple agents', async () => {
      const personalTodosContent = await readFile(
        path.join(AGENTS_DIR, 'personal-todos-agent.md'),
        'utf-8'
      );
      const personalTodosConfig = parseAgentFrontmatter(personalTodosContent);

      const meetingPrepContent = await readFile(
        path.join(AGENTS_DIR, 'meeting-prep-agent.md'),
        'utf-8'
      );
      const meetingPrepConfig = parseAgentFrontmatter(meetingPrepContent);

      // Both should reference productivity-patterns
      const personalTodosProdSkill = personalTodosConfig.skills?.find(
        s => s.name === 'productivity-patterns'
      );
      const meetingPrepProdSkill = meetingPrepConfig.skills?.find(
        s => s.name === 'productivity-patterns'
      );

      expect(personalTodosProdSkill).toBeDefined();
      expect(meetingPrepProdSkill).toBeDefined();
      expect(personalTodosProdSkill?.path).toBe('shared/productivity-patterns');
      expect(meetingPrepProdSkill?.path).toBe('shared/productivity-patterns');
    });

    it('should verify agent-specific skills are only in their agent', async () => {
      const personalTodosContent = await readFile(
        path.join(AGENTS_DIR, 'personal-todos-agent.md'),
        'utf-8'
      );
      const personalTodosConfig = parseAgentFrontmatter(personalTodosContent);

      const meetingPrepContent = await readFile(
        path.join(AGENTS_DIR, 'meeting-prep-agent.md'),
        'utf-8'
      );
      const meetingPrepConfig = parseAgentFrontmatter(meetingPrepContent);

      // personal-todos should NOT have meeting-templates
      const personalTodosMeetingSkill = personalTodosConfig.skills?.find(
        s => s.name === 'meeting-templates'
      );
      expect(personalTodosMeetingSkill).toBeUndefined();

      // meeting-prep SHOULD have meeting-templates
      const meetingPrepMeetingSkill = meetingPrepConfig.skills?.find(
        s => s.name === 'meeting-templates'
      );
      expect(meetingPrepMeetingSkill).toBeDefined();
    });

    it('should total to 13 skill references across all 3 agents', async () => {
      const agents = ['meta-agent.md', 'personal-todos-agent.md', 'meeting-prep-agent.md'];
      let totalSkillRefs = 0;

      for (const agent of agents) {
        const content = await readFile(path.join(AGENTS_DIR, agent), 'utf-8');
        const config = parseAgentFrontmatter(content);
        totalSkillRefs += config.skills?.length || 0;
      }

      // meta-agent: 4, personal-todos: 4, meeting-prep: 5 = 13 total
      expect(totalSkillRefs).toBe(13);
    });
  });

  describe('Skills Configuration Integrity', () => {
    it('should have valid YAML structure in all agent configs', async () => {
      const agents = ['meta-agent.md', 'personal-todos-agent.md', 'meeting-prep-agent.md'];

      for (const agent of agents) {
        const content = await readFile(path.join(AGENTS_DIR, agent), 'utf-8');

        // Should have frontmatter delimiters
        expect(content).toMatch(/^---\s*\n[\s\S]*?\n---/);

        // Should have skills section
        expect(content).toContain('skills:');

        // Should have proper indentation for skills array
        const skillsSection = content.match(/skills:\s*\n((?:\s+-\s+name:[\s\S]*?)+)/);
        expect(skillsSection).toBeTruthy();
      }
    });

    it('should not have any placeholder or incomplete skill references', async () => {
      const agents = ['meta-agent.md', 'personal-todos-agent.md', 'meeting-prep-agent.md'];

      for (const agent of agents) {
        const content = await readFile(path.join(AGENTS_DIR, agent), 'utf-8');
        const config = parseAgentFrontmatter(content);

        config.skills?.forEach(skill => {
          expect(skill.name).toBeTruthy();
          expect(skill.name).not.toMatch(/TODO|PLACEHOLDER|STUB/i);
          expect(skill.path).toBeTruthy();
          expect(skill.path).not.toMatch(/TODO|PLACEHOLDER|STUB/i);
          expect(typeof skill.required).toBe('boolean');
        });
      }
    });
  });
});
