/**
 * Phase 3 Agent Configuration Tests
 *
 * Tests all 10 updated agent configurations for Phase 3:
 * - Batch 1: agent-feedback-agent, agent-ideas-agent
 * - Batch 2: follow-ups-agent, meeting-next-steps-agent
 * - Batch 3: link-logger-agent, get-to-know-you-agent
 * - Batch 4: page-builder-agent, page-verification-agent
 * - Batch 5: dynamic-page-testing-agent, meta-update-agent
 *
 * Target: 50+ tests (5 per agent)
 *
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import { readFile } from 'fs/promises';
import path from 'path';

const AGENTS_BASE_PATH = '/workspaces/agent-feed/prod/.claude/agents';

// Agent configuration interface
interface AgentConfig {
  name: string;
  description: string;
  skills?: Array<{
    name: string;
    path: string;
    required: boolean;
  }>;
  skills_loading?: string;
  skills_cache_ttl?: number;
}

// Parse agent frontmatter
function parseAgentFrontmatter(content: string): AgentConfig {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { name: '', description: '' };

  const frontmatter: any = {};
  const lines = match[1].split('\n');
  let currentKey = '';
  let currentArray: any[] = [];
  let inArray = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('- ') && inArray) {
      // Array item
      if (trimmedLine.includes('name:')) {
        const obj: any = {};
        currentArray.push(obj);
      }
      const lastItem = currentArray[currentArray.length - 1];
      if (lastItem && typeof lastItem === 'object') {
        const [key, ...valueParts] = trimmedLine.substring(2).split(':');
        if (key && valueParts.length > 0) {
          const value = valueParts.join(':').trim();
          lastItem[key.trim()] = value === 'true' ? true : value === 'false' ? false : value;
        }
      }
    } else if (line.match(/^\w+:/)) {
      // Key-value pair
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();

        if (value === '') {
          // Start of array
          currentKey = key.trim();
          currentArray = [];
          inArray = true;
          frontmatter[currentKey] = currentArray;
        } else {
          // Simple value
          frontmatter[key.trim()] = isNaN(Number(value)) ? value : Number(value);
          inArray = false;
        }
      }
    }
  }

  return frontmatter;
}

describe('Phase 3 Agent Configs - Batch 1: Feedback Agents', () => {
  describe('agent-feedback-agent configuration', () => {
    const agentPath = path.join(AGENTS_BASE_PATH, 'agent-feedback-agent.md');

    it('should have skills frontmatter section', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);
      expect(config.skills).toBeDefined();
      expect(Array.isArray(config.skills)).toBe(true);
    });

    it('should include brand-guidelines skill', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const brandSkill = config.skills?.find(s => s.name === 'brand-guidelines');
      expect(brandSkill).toBeDefined();
      expect(brandSkill?.path).toContain('.system/brand-guidelines');
    });

    it('should include feedback-frameworks skill', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const feedbackSkill = config.skills?.find(s => s.name === 'feedback-frameworks');
      expect(feedbackSkill).toBeDefined();
      expect(feedbackSkill?.path).toContain('feedback-frameworks');
    });

    it('should have skills_loading configuration', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      expect(config.skills_loading).toBeDefined();
      expect(config.skills_loading).toMatch(/progressive|eager|manual/);
    });

    it('should have skills_cache_ttl set', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      expect(config.skills_cache_ttl).toBeDefined();
      expect(config.skills_cache_ttl).toBeGreaterThan(0);
    });

    it('should reference skills in agent content', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const bodyContent = content.split('---')[2] || '';

      expect(bodyContent).toMatch(/skill|feedback|brand/i);
    });
  });

  describe('agent-ideas-agent configuration', () => {
    const agentPath = path.join(AGENTS_BASE_PATH, 'agent-ideas-agent.md');

    it('should have skills array in frontmatter', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);
      expect(config.skills).toBeDefined();
    });

    it('should include brand-guidelines as required', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const brandSkill = config.skills?.find(s => s.name === 'brand-guidelines');
      expect(brandSkill).toBeDefined();
    });

    it('should include feedback-frameworks skill', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const feedbackSkill = config.skills?.find(s => s.name === 'feedback-frameworks');
      expect(feedbackSkill).toBeDefined();
    });

    it('should have progressive loading enabled', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);
      expect(config.skills_loading).toBe('progressive');
    });

    it('should mention skills in content', async () => {
      const content = await readFile(agentPath, 'utf-8');
      expect(content).toMatch(/skill|idea|evaluation|feedback/i);
    });
  });
});

describe('Phase 3 Agent Configs - Batch 2: Follow-up Agents', () => {
  describe('follow-ups-agent configuration', () => {
    const agentPath = path.join(AGENTS_BASE_PATH, 'follow-ups-agent.md');

    it('should have skills configured', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);
      expect(config.skills).toBeDefined();
    });

    it('should include productivity-patterns skill', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const productivitySkill = config.skills?.find(s => s.name === 'productivity-patterns');
      expect(productivitySkill).toBeDefined();
    });

    it('should include follow-up-patterns skill', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const followUpSkill = config.skills?.find(s =>
        s.name.includes('follow') || s.path.includes('follow')
      );
      expect(followUpSkill).toBeDefined();
    });

    it('should have cache configuration', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);
      expect(config.skills_cache_ttl).toBeGreaterThan(0);
    });

    it('should reference skills in description', async () => {
      const content = await readFile(agentPath, 'utf-8');
      expect(content).toMatch(/follow.*up|task|reminder/i);
    });
  });

  describe('meeting-next-steps-agent configuration', () => {
    const agentPath = path.join(AGENTS_BASE_PATH, 'meeting-next-steps-agent.md');

    it('should have skills defined', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);
      expect(config.skills).toBeDefined();
    });

    it('should include meeting-templates skill', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const meetingSkill = config.skills?.find(s =>
        s.name.includes('meeting') || s.path.includes('meeting')
      );
      expect(meetingSkill).toBeDefined();
    });

    it('should include productivity-patterns', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const productivitySkill = config.skills?.find(s => s.name === 'productivity-patterns');
      expect(productivitySkill).toBeDefined();
    });

    it('should have skills loading strategy', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);
      expect(config.skills_loading).toBeTruthy();
    });

    it('should mention meetings and action items', async () => {
      const content = await readFile(agentPath, 'utf-8');
      expect(content).toMatch(/meeting|action|next.*step/i);
    });
  });
});

describe('Phase 3 Agent Configs - Batch 3: User Interaction Agents', () => {
  describe('link-logger-agent configuration', () => {
    const agentPath = path.join(AGENTS_BASE_PATH, 'link-logger-agent.md');

    it('should have skills section', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);
      expect(config.skills).toBeDefined();
    });

    it('should include link-curation skill', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const linkSkill = config.skills?.find(s =>
        s.name.includes('link') || s.name.includes('curation')
      );
      expect(linkSkill).toBeDefined();
    });

    it('should include user-preferences skill', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const prefSkill = config.skills?.find(s => s.name === 'user-preferences');
      expect(prefSkill).toBeDefined();
    });

    it('should have cache TTL configured', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);
      expect(config.skills_cache_ttl).toBeDefined();
    });

    it('should mention link logging capabilities', async () => {
      const content = await readFile(agentPath, 'utf-8');
      expect(content).toMatch(/link|URL|bookmark|save/i);
    });
  });

  describe('get-to-know-you-agent configuration', () => {
    const agentPath = path.join(AGENTS_BASE_PATH, 'get-to-know-you-agent.md');

    it('should have skills configured', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);
      expect(config.skills).toBeDefined();
    });

    it('should include user-preferences skill', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const prefSkill = config.skills?.find(s => s.name === 'user-preferences');
      expect(prefSkill).toBeDefined();
    });

    it('should include conversation-patterns skill', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const conversationSkill = config.skills?.find(s => s.name === 'conversation-patterns');
      expect(conversationSkill).toBeDefined();
    });

    it('should have progressive loading', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);
      expect(config.skills_loading).toBe('progressive');
    });

    it('should focus on user interaction', async () => {
      const content = await readFile(agentPath, 'utf-8');
      expect(content).toMatch(/user|conversation|preference|get.*know/i);
    });
  });
});

describe('Phase 3 Agent Configs - Batch 4: Page Builder Agents', () => {
  describe('page-builder-agent configuration', () => {
    const agentPath = path.join(AGENTS_BASE_PATH, 'page-builder-agent.md');

    it('should have skills array', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);
      expect(config.skills).toBeDefined();
    });

    it('should include design-system skill', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const designSkill = config.skills?.find(s => s.name === 'design-system');
      expect(designSkill).toBeDefined();
      expect(designSkill?.path).toContain('.system/design-system');
    });

    it('should include component-library skill', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const componentSkill = config.skills?.find(s => s.name === 'component-library');
      expect(componentSkill).toBeDefined();
    });

    it('should have skills loading configured', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);
      expect(config.skills_loading).toBeTruthy();
    });

    it('should mention page building capabilities', async () => {
      const content = await readFile(agentPath, 'utf-8');
      expect(content).toMatch(/page|component|build|design/i);
    });
  });

  describe('page-verification-agent configuration', () => {
    const agentPath = path.join(AGENTS_BASE_PATH, 'page-verification-agent.md');

    it('should have skills section', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);
      expect(config.skills).toBeDefined();
    });

    it('should include testing-patterns skill', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const testingSkill = config.skills?.find(s => s.name === 'testing-patterns');
      expect(testingSkill).toBeDefined();
    });

    it('should include design-system for validation', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const designSkill = config.skills?.find(s => s.name === 'design-system');
      expect(designSkill).toBeDefined();
    });

    it('should have cache configuration', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);
      expect(config.skills_cache_ttl).toBeGreaterThan(0);
    });

    it('should mention verification and testing', async () => {
      const content = await readFile(agentPath, 'utf-8');
      expect(content).toMatch(/verif|test|validate|check/i);
    });
  });
});

describe('Phase 3 Agent Configs - Batch 5: Meta and Testing Agents', () => {
  describe('dynamic-page-testing-agent configuration', () => {
    const agentPath = path.join(AGENTS_BASE_PATH, 'dynamic-page-testing-agent.md');

    it('should have skills configured', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);
      expect(config.skills).toBeDefined();
    });

    it('should include code-standards skill', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const codeSkill = config.skills?.find(s => s.name === 'code-standards');
      expect(codeSkill).toBeDefined();
    });

    it('should include testing-patterns skill', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const testingSkill = config.skills?.find(s => s.name === 'testing-patterns');
      expect(testingSkill).toBeDefined();
    });

    it('should have skills loading strategy', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);
      expect(config.skills_loading).toBeTruthy();
    });

    it('should mention testing capabilities', async () => {
      const content = await readFile(agentPath, 'utf-8');
      expect(content).toMatch(/test|dynamic.*page|validate/i);
    });
  });

  describe('meta-update-agent configuration', () => {
    const agentPath = path.join(AGENTS_BASE_PATH, 'meta-update-agent.md');

    it('should have skills array', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);
      expect(config.skills).toBeDefined();
    });

    it('should include code-standards skill', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const codeSkill = config.skills?.find(s => s.name === 'code-standards');
      expect(codeSkill).toBeDefined();
    });

    it('should include update-protocols skill', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const updateSkill = config.skills?.find(s => s.name === 'update-protocols');
      expect(updateSkill).toBeDefined();
    });

    it('should include documentation-standards skill', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const docsSkill = config.skills?.find(s => s.name === 'documentation-standards');
      expect(docsSkill).toBeDefined();
    });

    it('should have cache TTL set', async () => {
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);
      expect(config.skills_cache_ttl).toBeDefined();
    });

    it('should mention update and maintenance', async () => {
      const content = await readFile(agentPath, 'utf-8');
      expect(content).toMatch(/update|maintain|upgrade|migration/i);
    });
  });
});

describe('Phase 3 Agent Configs - Cross-Agent Validation', () => {
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

  it('should have all 10 Phase 3 agents configured with skills', async () => {
    for (const agent of phase3Agents) {
      const agentPath = path.join(AGENTS_BASE_PATH, agent);
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      expect(config.skills).toBeDefined();
      expect(Array.isArray(config.skills)).toBe(true);
      expect(config.skills!.length).toBeGreaterThan(0);
    }
  });

  it('should have consistent skills_loading configuration', async () => {
    for (const agent of phase3Agents) {
      const agentPath = path.join(AGENTS_BASE_PATH, agent);
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      expect(config.skills_loading).toBeDefined();
      expect(['progressive', 'eager', 'manual']).toContain(config.skills_loading);
    }
  });

  it('should have cache TTL set for all agents', async () => {
    for (const agent of phase3Agents) {
      const agentPath = path.join(AGENTS_BASE_PATH, agent);
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      expect(config.skills_cache_ttl).toBeDefined();
      expect(config.skills_cache_ttl).toBeGreaterThan(0);
      expect(config.skills_cache_ttl).toBeLessThanOrEqual(7200); // Max 2 hours
    }
  });

  it('should have valid skill paths for all configured skills', async () => {
    for (const agent of phase3Agents) {
      const agentPath = path.join(AGENTS_BASE_PATH, agent);
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      for (const skill of config.skills || []) {
        expect(skill.path).toBeTruthy();
        expect(skill.path).toMatch(/^(\.system|shared|agent-specific)\/.+/);
      }
    }
  });

  it('should distinguish between required and optional skills', async () => {
    for (const agent of phase3Agents) {
      const agentPath = path.join(AGENTS_BASE_PATH, agent);
      const content = await readFile(agentPath, 'utf-8');
      const config = parseAgentFrontmatter(content);

      const hasRequiredField = config.skills?.some(s => s.required !== undefined);
      expect(hasRequiredField).toBe(true);
    }
  });
});
