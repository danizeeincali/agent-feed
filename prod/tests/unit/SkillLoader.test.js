/**
 * SkillLoader Unit Tests
 * Tests the intelligent skill loading system that reduces token usage
 *
 * Test Coverage:
 * - Skill detection for various query types
 * - Skill loading and caching
 * - System prompt building with skills
 * - Token counting accuracy
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

// Mock SkillLoader class (since it doesn't exist yet, we'll define expected behavior)
class SkillLoader {
  constructor(config = {}) {
    this.skillsDir = config.skillsDir || '/workspaces/agent-feed/prod/.claude/skills';
    this.systemInstructionsPath = config.systemInstructionsPath ||
      '/workspaces/agent-feed/prod/.claude/system-instructions.md';
    this.cache = new Map();
    this.tokenCounter = config.tokenCounter || this._defaultTokenCounter;
  }

  _defaultTokenCounter(text) {
    // Simple approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Detect if query is simple enough to skip skills
   */
  isSimpleQuery(query) {
    const simplePatterns = [
      /^\d+\s*[\+\-\*\/]\s*\d+$/,  // Simple math: "5+3", "10*2"
      /^what is \d+/i,              // "What is 5+3?"
      /^calculate \d+/i,            // "Calculate 100/2"
      /^hello$/i,                   // Greetings
      /^hi$/i,
      /^hey$/i
    ];

    return simplePatterns.some(pattern => pattern.test(query.trim()));
  }

  /**
   * Detect which skills are needed for a query
   */
  detectRequiredSkills(query) {
    const skills = [];
    const lowerQuery = query.toLowerCase();

    // Code-related skills
    if (lowerQuery.match(/code|programming|function|class|debug|refactor/)) {
      skills.push('code-analysis', 'debugging');
    }

    // File operations
    if (lowerQuery.match(/file|directory|folder|read|write|create|delete/)) {
      skills.push('file-operations');
    }

    // Database operations
    if (lowerQuery.match(/database|sql|query|table|schema/)) {
      skills.push('database-operations');
    }

    // API operations
    if (lowerQuery.match(/api|endpoint|rest|http|request/)) {
      skills.push('api-operations');
    }

    // Testing
    if (lowerQuery.match(/test|spec|jest|playwright|unit|integration/)) {
      skills.push('testing');
    }

    // Git operations
    if (lowerQuery.match(/git|commit|branch|merge|push|pull/)) {
      skills.push('git-operations');
    }

    return skills;
  }

  /**
   * Load skill content from filesystem
   */
  async loadSkill(skillName) {
    // Check cache first
    if (this.cache.has(skillName)) {
      return this.cache.get(skillName);
    }

    const skillPath = path.join(this.skillsDir, `${skillName}.md`);

    try {
      const content = await fs.readFile(skillPath, 'utf-8');
      this.cache.set(skillName, content);
      return content;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Skill not found: ${skillName}`);
      }
      throw error;
    }
  }

  /**
   * Load multiple skills
   */
  async loadSkills(skillNames) {
    const results = await Promise.allSettled(
      skillNames.map(name => this.loadSkill(name))
    );

    const loaded = {};
    const errors = [];

    results.forEach((result, i) => {
      const skillName = skillNames[i];
      if (result.status === 'fulfilled') {
        loaded[skillName] = result.value;
      } else {
        errors.push({ skill: skillName, error: result.reason.message });
      }
    });

    return { loaded, errors };
  }

  /**
   * Build system prompt with only necessary skills
   */
  async buildSystemPrompt(query) {
    // 1. Check if query is simple (no skills needed)
    if (this.isSimpleQuery(query)) {
      const baseInstructions = await fs.readFile(this.systemInstructionsPath, 'utf-8');
      return {
        prompt: baseInstructions,
        skillsLoaded: [],
        tokenCount: this.tokenCounter(baseInstructions),
        simplified: true
      };
    }

    // 2. Detect required skills
    const requiredSkills = this.detectRequiredSkills(query);

    // 3. Load only required skills
    const { loaded, errors } = await this.loadSkills(requiredSkills);

    // 4. Build prompt
    const baseInstructions = await fs.readFile(this.systemInstructionsPath, 'utf-8');

    let prompt = baseInstructions;

    if (Object.keys(loaded).length > 0) {
      prompt += '\n\n## Relevant Skills\n\n';
      for (const [name, content] of Object.entries(loaded)) {
        prompt += `### ${name}\n${content}\n\n`;
      }
    }

    return {
      prompt,
      skillsLoaded: Object.keys(loaded),
      skillsSkipped: errors.map(e => e.skill),
      tokenCount: this.tokenCounter(prompt),
      simplified: false
    };
  }

  /**
   * Estimate cost savings
   */
  calculateSavings(fullTokenCount, optimizedTokenCount) {
    const tokensSaved = fullTokenCount - optimizedTokenCount;
    const percentSaved = (tokensSaved / fullTokenCount) * 100;

    // Rough cost estimate ($3 per 1M input tokens for Claude)
    const costPerToken = 3 / 1_000_000;
    const costSaved = tokensSaved * costPerToken;

    return {
      tokensSaved,
      percentSaved: Math.round(percentSaved * 10) / 10,
      costSaved: Math.round(costSaved * 100000) / 100000, // 5 decimal places
      estimatedCostSavingsPerMonth: Math.round(costSaved * 1000 * 100) / 100 // If 1000 queries/month
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      skills: Array.from(this.cache.keys())
    };
  }
}

describe('SkillLoader - Unit Tests', () => {
  let skillLoader;
  let mockFs;

  beforeEach(() => {
    skillLoader = new SkillLoader({
      skillsDir: '/test/skills',
      systemInstructionsPath: '/test/system.md'
    });

    // Mock filesystem
    mockFs = {
      '/test/system.md': 'Base system instructions (100 tokens)',
      '/test/skills/code-analysis.md': 'Code analysis skill content (50 tokens)',
      '/test/skills/debugging.md': 'Debugging skill content (50 tokens)',
      '/test/skills/file-operations.md': 'File operations skill content (50 tokens)',
      '/test/skills/database-operations.md': 'Database operations skill content (50 tokens)',
      '/test/skills/api-operations.md': 'API operations skill content (50 tokens)',
      '/test/skills/testing.md': 'Testing skill content (50 tokens)',
      '/test/skills/git-operations.md': 'Git operations skill content (50 tokens)'
    };

    vi.spyOn(fs, 'readFile').mockImplementation(async (filePath) => {
      if (mockFs[filePath]) {
        return mockFs[filePath];
      }
      const error = new Error('ENOENT');
      error.code = 'ENOENT';
      throw error;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    skillLoader.clearCache();
  });

  describe('Simple Query Detection', () => {
    it('should detect simple math queries', () => {
      expect(skillLoader.isSimpleQuery('5+3')).toBe(true);
      expect(skillLoader.isSimpleQuery('100 * 2')).toBe(true);
      expect(skillLoader.isSimpleQuery('50 / 2')).toBe(true);
      expect(skillLoader.isSimpleQuery('10 - 3')).toBe(true);
    });

    it('should detect simple calculation requests', () => {
      expect(skillLoader.isSimpleQuery('what is 3000+500?')).toBe(true);
      expect(skillLoader.isSimpleQuery('Calculate 100/2')).toBe(true);
    });

    it('should detect simple greetings', () => {
      expect(skillLoader.isSimpleQuery('hello')).toBe(true);
      expect(skillLoader.isSimpleQuery('hi')).toBe(true);
      expect(skillLoader.isSimpleQuery('hey')).toBe(true);
    });

    it('should NOT detect complex queries as simple', () => {
      expect(skillLoader.isSimpleQuery('debug this code')).toBe(false);
      expect(skillLoader.isSimpleQuery('create a test file')).toBe(false);
      expect(skillLoader.isSimpleQuery('write a function to calculate...')).toBe(false);
    });
  });

  describe('Skill Detection', () => {
    it('should detect code-related skills', () => {
      const skills = skillLoader.detectRequiredSkills('debug this code');
      expect(skills).toContain('code-analysis');
      expect(skills).toContain('debugging');
    });

    it('should detect file operation skills', () => {
      const skills = skillLoader.detectRequiredSkills('create a new file');
      expect(skills).toContain('file-operations');
    });

    it('should detect database skills', () => {
      const skills = skillLoader.detectRequiredSkills('create a database table');
      expect(skills).toContain('database-operations');
    });

    it('should detect API skills', () => {
      const skills = skillLoader.detectRequiredSkills('create a REST API endpoint');
      expect(skills).toContain('api-operations');
    });

    it('should detect testing skills', () => {
      const skills = skillLoader.detectRequiredSkills('write unit tests');
      expect(skills).toContain('testing');
    });

    it('should detect git skills', () => {
      const skills = skillLoader.detectRequiredSkills('commit these changes');
      expect(skills).toContain('git-operations');
    });

    it('should detect multiple skills for complex queries', () => {
      const skills = skillLoader.detectRequiredSkills(
        'create a database table and write tests for the API'
      );
      expect(skills).toContain('database-operations');
      expect(skills).toContain('testing');
      expect(skills).toContain('api-operations');
    });

    it('should return empty array for simple queries', () => {
      const skills = skillLoader.detectRequiredSkills('hello');
      expect(skills).toEqual([]);
    });
  });

  describe('Skill Loading', () => {
    it('should load skill from filesystem', async () => {
      const content = await skillLoader.loadSkill('code-analysis');
      expect(content).toBe('Code analysis skill content (50 tokens)');
    });

    it('should cache loaded skills', async () => {
      await skillLoader.loadSkill('code-analysis');
      await skillLoader.loadSkill('code-analysis');

      // Should only read file once
      expect(fs.readFile).toHaveBeenCalledTimes(1);

      const stats = skillLoader.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.skills).toContain('code-analysis');
    });

    it('should throw error for missing skills', async () => {
      await expect(skillLoader.loadSkill('nonexistent-skill'))
        .rejects.toThrow('Skill not found: nonexistent-skill');
    });

    it('should load multiple skills', async () => {
      const { loaded, errors } = await skillLoader.loadSkills([
        'code-analysis',
        'debugging',
        'file-operations'
      ]);

      expect(Object.keys(loaded)).toHaveLength(3);
      expect(loaded['code-analysis']).toBeDefined();
      expect(loaded['debugging']).toBeDefined();
      expect(loaded['file-operations']).toBeDefined();
      expect(errors).toHaveLength(0);
    });

    it('should handle partial failures when loading multiple skills', async () => {
      const { loaded, errors } = await skillLoader.loadSkills([
        'code-analysis',
        'nonexistent-skill',
        'debugging'
      ]);

      expect(Object.keys(loaded)).toHaveLength(2);
      expect(errors).toHaveLength(1);
      expect(errors[0].skill).toBe('nonexistent-skill');
    });
  });

  describe('System Prompt Building', () => {
    it('should return base instructions only for simple queries', async () => {
      const result = await skillLoader.buildSystemPrompt('5+3');

      expect(result.prompt).toBe('Base system instructions (100 tokens)');
      expect(result.skillsLoaded).toHaveLength(0);
      expect(result.simplified).toBe(true);
      expect(result.tokenCount).toBeGreaterThan(0);
    });

    it('should include relevant skills for complex queries', async () => {
      const result = await skillLoader.buildSystemPrompt('debug this code');

      expect(result.prompt).toContain('Base system instructions');
      expect(result.prompt).toContain('code-analysis');
      expect(result.prompt).toContain('debugging');
      expect(result.skillsLoaded).toContain('code-analysis');
      expect(result.skillsLoaded).toContain('debugging');
      expect(result.simplified).toBe(false);
    });

    it('should not duplicate base instructions', async () => {
      const result = await skillLoader.buildSystemPrompt('create a file');

      const baseCount = (result.prompt.match(/Base system instructions/g) || []).length;
      expect(baseCount).toBe(1);
    });

    it('should handle queries with no matching skills', async () => {
      const result = await skillLoader.buildSystemPrompt('what is the weather?');

      expect(result.prompt).toBe('Base system instructions (100 tokens)');
      expect(result.skillsLoaded).toHaveLength(0);
    });
  });

  describe('Token Counting', () => {
    it('should count tokens accurately', () => {
      const text = 'This is a test string with approximately 10 tokens here';
      const count = skillLoader.tokenCounter(text);

      // Simple approximation: 1 token ≈ 4 characters
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(text.length); // Should be less than character count
    });

    it('should show token reduction for simple queries', async () => {
      const fullPromptTokens = 500; // Assume full system + all skills = 500 tokens
      const result = await skillLoader.buildSystemPrompt('hello');

      expect(result.tokenCount).toBeLessThan(fullPromptTokens);
    });

    it('should calculate accurate token counts for built prompts', async () => {
      const result = await skillLoader.buildSystemPrompt('debug this code');

      expect(result.tokenCount).toBeGreaterThan(0);
      expect(typeof result.tokenCount).toBe('number');
    });
  });

  describe('Cost Estimation', () => {
    it('should calculate token savings correctly', () => {
      const savings = skillLoader.calculateSavings(1000, 200);

      expect(savings.tokensSaved).toBe(800);
      expect(savings.percentSaved).toBe(80);
      expect(savings.costSaved).toBeGreaterThan(0);
    });

    it('should estimate monthly cost savings', () => {
      const savings = skillLoader.calculateSavings(1000, 200);

      expect(savings.estimatedCostSavingsPerMonth).toBeGreaterThan(0);
    });

    it('should handle no savings scenario', () => {
      const savings = skillLoader.calculateSavings(500, 500);

      expect(savings.tokensSaved).toBe(0);
      expect(savings.percentSaved).toBe(0);
      expect(savings.costSaved).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', async () => {
      await skillLoader.loadSkill('code-analysis');
      await skillLoader.loadSkill('debugging');

      let stats = skillLoader.getCacheStats();
      expect(stats.size).toBe(2);

      skillLoader.clearCache();

      stats = skillLoader.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should provide accurate cache stats', async () => {
      await skillLoader.loadSkill('code-analysis');
      await skillLoader.loadSkill('debugging');
      await skillLoader.loadSkill('file-operations');

      const stats = skillLoader.getCacheStats();

      expect(stats.size).toBe(3);
      expect(stats.skills).toHaveLength(3);
      expect(stats.skills).toContain('code-analysis');
      expect(stats.skills).toContain('debugging');
      expect(stats.skills).toContain('file-operations');
    });
  });

  describe('Error Handling', () => {
    it('should handle filesystem errors gracefully', async () => {
      vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('Permission denied'));

      await expect(skillLoader.loadSkill('code-analysis'))
        .rejects.toThrow('Permission denied');
    });

    it('should handle missing system instructions file', async () => {
      vi.spyOn(fs, 'readFile').mockImplementation(async (filePath) => {
        if (filePath.includes('system.md')) {
          throw new Error('System instructions not found');
        }
        return mockFs[filePath] || '';
      });

      await expect(skillLoader.buildSystemPrompt('hello'))
        .rejects.toThrow('System instructions not found');
    });

    it('should continue with available skills if some fail to load', async () => {
      const { loaded, errors } = await skillLoader.loadSkills([
        'code-analysis',
        'missing-skill-1',
        'debugging',
        'missing-skill-2'
      ]);

      expect(Object.keys(loaded)).toHaveLength(2);
      expect(errors).toHaveLength(2);
    });
  });

  describe('Performance', () => {
    it('should load skills in parallel', async () => {
      const startTime = Date.now();

      await skillLoader.loadSkills([
        'code-analysis',
        'debugging',
        'file-operations',
        'database-operations'
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Parallel loading should be faster than sequential
      // Even with mocks, should complete quickly
      expect(duration).toBeLessThan(1000);
    });

    it('should use cache to avoid redundant file reads', async () => {
      // First load
      await skillLoader.buildSystemPrompt('debug this code');
      const firstCallCount = fs.readFile.mock.calls.length;

      // Second load with same query
      await skillLoader.buildSystemPrompt('debug this code');
      const secondCallCount = fs.readFile.mock.calls.length;

      // Should not re-read skills (only system.md)
      expect(secondCallCount - firstCallCount).toBeLessThanOrEqual(1);
    });
  });
});
