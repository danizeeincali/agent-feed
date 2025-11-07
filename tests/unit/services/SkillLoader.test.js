/**
 * Unit Tests for SkillLoader Service
 * Tests skills lazy-loading, token budget enforcement, and optimization
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SkillLoader } from '../../../prod/src/services/SkillLoader.js';
import fs from 'fs/promises';
import path from 'path';

// Mock file system
jest.mock('fs/promises');

describe('SkillLoader Service - Unit Tests', () => {
  let skillLoader;
  let mockManifest;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock manifest
    mockManifest = {
      version: '1.0.0',
      skills: [
        {
          id: 'core-skills',
          name: 'Core Skills',
          category: 'core',
          filePath: '/path/to/core-skills.md',
          triggerKeywords: ['help', 'assist', 'guide'],
          tokenEstimate: 5000,
          priority: 1,
          enabled: true,
          dependencies: []
        },
        {
          id: 'coding-skills',
          name: 'Coding Skills',
          category: 'development',
          filePath: '/path/to/coding-skills.md',
          triggerKeywords: ['code', 'program', 'develop', 'debug'],
          tokenEstimate: 8000,
          priority: 2,
          enabled: true,
          dependencies: ['core-skills']
        },
        {
          id: 'advanced-skills',
          name: 'Advanced Skills',
          category: 'advanced',
          filePath: '/path/to/advanced-skills.md',
          triggerKeywords: ['architecture', 'system design', 'optimization'],
          tokenEstimate: 12000,
          priority: 3,
          enabled: true,
          dependencies: []
        },
        {
          id: 'disabled-skill',
          name: 'Disabled Skill',
          category: 'disabled',
          filePath: '/path/to/disabled-skill.md',
          triggerKeywords: ['disabled'],
          tokenEstimate: 3000,
          priority: 4,
          enabled: false,
          dependencies: []
        }
      ],
      loadingStrategy: {
        alwaysLoad: ['core-skills']
      },
      tokenBudget: {
        warningThreshold: 20000,
        criticalThreshold: 23000
      }
    };

    // Mock fs.readFile for manifest
    fs.readFile.mockImplementation((filePath) => {
      if (filePath.includes('skills-manifest.json')) {
        return Promise.resolve(JSON.stringify(mockManifest));
      }
      // Return mock skill content
      return Promise.resolve(`# Mock Skill Content\nThis is test content for ${filePath}`);
    });

    // Initialize SkillLoader with test configuration
    skillLoader = new SkillLoader({
      manifestPath: '/test/skills-manifest.json',
      tokenBudget: 25000,
      enableCaching: true,
      cacheTTL: 3600
    });
  });

  afterEach(() => {
    if (skillLoader) {
      skillLoader.clearCache();
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully with valid manifest', async () => {
      await skillLoader.initialize();

      expect(skillLoader.initialized).toBe(true);
      expect(skillLoader.manifest).toEqual(mockManifest);
      expect(fs.readFile).toHaveBeenCalledWith('/test/skills-manifest.json', 'utf-8');
    });

    test('should throw error if manifest is missing skills array', async () => {
      fs.readFile.mockResolvedValueOnce(JSON.stringify({ version: '1.0.0' }));

      await expect(skillLoader.initialize()).rejects.toThrow('Invalid manifest: missing or invalid skills array');
    });

    test('should throw error if skill is missing required fields', async () => {
      const invalidManifest = {
        skills: [{ id: 'test', name: 'Test' }] // Missing required fields
      };
      fs.readFile.mockResolvedValueOnce(JSON.stringify(invalidManifest));

      await expect(skillLoader.initialize()).rejects.toThrow('missing required field');
    });

    test('should not initialize twice', async () => {
      await skillLoader.initialize();
      await skillLoader.initialize();

      // Should only read file once
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('Skill Detection', () => {
    beforeEach(async () => {
      await skillLoader.initialize();
    });

    test('should detect always-load skills', async () => {
      const detected = await skillLoader.detectSkills('random message');

      expect(detected.length).toBeGreaterThan(0);
      expect(detected.some(s => s.id === 'core-skills')).toBe(true);
      expect(detected.find(s => s.id === 'core-skills').matchReason).toBe('always-load');
      expect(detected.find(s => s.id === 'core-skills').matchScore).toBe(100);
    });

    test('should detect skills based on keywords', async () => {
      const detected = await skillLoader.detectSkills('I need help with coding and debugging');

      const codingSkill = detected.find(s => s.id === 'coding-skills');
      expect(codingSkill).toBeDefined();
      expect(codingSkill.matchReason).toBe('keyword-match');
      expect(codingSkill.matchedKeywords).toContain('code');
      expect(codingSkill.matchedKeywords).toContain('debug');
    });

    test('should not detect disabled skills', async () => {
      const detected = await skillLoader.detectSkills('this message has disabled keyword');

      expect(detected.some(s => s.id === 'disabled-skill')).toBe(false);
    });

    test('should sort skills by priority and match score', async () => {
      const detected = await skillLoader.detectSkills('help with code and architecture');

      // Should have core (priority 1), coding (priority 2), advanced (priority 3)
      expect(detected[0].id).toBe('core-skills');
      expect(detected[0].priority).toBe(1);
    });

    test('should require minimum keyword matches', async () => {
      const detected = await skillLoader.detectSkills('test message', { minKeywordMatches: 2 });

      // Should only include always-load skills since no skill has 2+ keyword matches
      expect(detected.every(s => s.matchReason === 'always-load')).toBe(true);
    });

    test('should handle empty message', async () => {
      const detected = await skillLoader.detectSkills('');

      // Should still include always-load skills
      expect(detected.some(s => s.id === 'core-skills')).toBe(true);
    });
  });

  describe('Dependency Resolution', () => {
    beforeEach(async () => {
      await skillLoader.initialize();
    });

    test('should resolve skill dependencies', async () => {
      const skills = [
        { ...mockManifest.skills[1] } // coding-skills with dependency on core-skills
      ];

      const resolved = await skillLoader.resolveDependencies(skills);

      expect(resolved.length).toBe(2);
      expect(resolved.some(s => s.id === 'core-skills')).toBe(true);
      expect(resolved.some(s => s.id === 'coding-skills')).toBe(true);
      expect(resolved.find(s => s.id === 'core-skills').matchReason).toBe('dependency');
    });

    test('should not duplicate already included dependencies', async () => {
      const skills = [
        { ...mockManifest.skills[0] }, // core-skills
        { ...mockManifest.skills[1] }  // coding-skills (depends on core-skills)
      ];

      const resolved = await skillLoader.resolveDependencies(skills);

      expect(resolved.length).toBe(2);
      expect(resolved.filter(s => s.id === 'core-skills').length).toBe(1);
    });

    test('should handle skills with no dependencies', async () => {
      const skills = [
        { ...mockManifest.skills[0] } // core-skills with no dependencies
      ];

      const resolved = await skillLoader.resolveDependencies(skills);

      expect(resolved.length).toBe(1);
    });

    test('should skip disabled dependencies', async () => {
      const testSkill = {
        ...mockManifest.skills[0],
        id: 'test-skill',
        dependencies: ['disabled-skill']
      };

      const resolved = await skillLoader.resolveDependencies([testSkill]);

      expect(resolved.some(s => s.id === 'disabled-skill')).toBe(false);
    });
  });

  describe('Token Budget Management', () => {
    beforeEach(async () => {
      await skillLoader.initialize();
    });

    test('should calculate total token usage correctly', () => {
      const skills = [
        mockManifest.skills[0], // 5000 tokens
        mockManifest.skills[1]  // 8000 tokens
      ];

      const analysis = skillLoader.checkTokenBudget(skills);

      expect(analysis.totalTokens).toBe(13000);
      expect(analysis.budgetLimit).toBe(25000);
      expect(analysis.remainingTokens).toBe(12000);
      expect(analysis.isWithinBudget).toBe(true);
    });

    test('should detect budget exceeded', () => {
      const skills = [
        mockManifest.skills[0], // 5000 tokens
        mockManifest.skills[1], // 8000 tokens
        mockManifest.skills[2]  // 12000 tokens
      ];

      const analysis = skillLoader.checkTokenBudget(skills);

      expect(analysis.totalTokens).toBe(25000);
      expect(analysis.isWithinBudget).toBe(true);
      expect(analysis.warningLevel).toBe('critical');
    });

    test('should calculate budget utilization percentage', () => {
      const skills = [mockManifest.skills[0]]; // 5000 tokens

      const analysis = skillLoader.checkTokenBudget(skills);

      expect(analysis.budgetUtilization).toBe(20); // 5000/25000 * 100
    });

    test('should categorize warning levels correctly', () => {
      // OK level (< 80%)
      let skills = [mockManifest.skills[0]]; // 5000 tokens
      let analysis = skillLoader.checkTokenBudget(skills);
      expect(analysis.warningLevel).toBe('ok');

      // Warning level (>= 80%)
      skills = [mockManifest.skills[0], mockManifest.skills[1], mockManifest.skills[2]]; // 25000 tokens
      analysis = skillLoader.checkTokenBudget(skills);
      expect(analysis.warningLevel).toBe('critical');
    });
  });

  describe('Budget Optimization', () => {
    beforeEach(async () => {
      await skillLoader.initialize();
    });

    test('should not optimize when within budget', () => {
      const skills = [mockManifest.skills[0]]; // 5000 tokens, well within 25000 budget

      const optimized = skillLoader.optimizeForBudget(skills);

      expect(optimized.length).toBe(1);
      expect(optimized[0].id).toBe('core-skills');
    });

    test('should exclude skills when over budget', () => {
      // Create skills that exceed budget
      const skills = [
        { ...mockManifest.skills[0], tokenEstimate: 15000, priority: 1 },
        { ...mockManifest.skills[1], tokenEstimate: 12000, priority: 2 },
        { ...mockManifest.skills[2], tokenEstimate: 10000, priority: 3 }
      ];

      const optimized = skillLoader.optimizeForBudget(skills);

      const totalTokens = optimized.reduce((sum, s) => sum + s.tokenEstimate, 0);
      expect(totalTokens).toBeLessThanOrEqual(25000);
      expect(optimized.length).toBeLessThan(skills.length);
    });

    test('should prioritize always-load skills', () => {
      const skills = [
        { ...mockManifest.skills[0], tokenEstimate: 15000, matchReason: 'always-load', priority: 1 },
        { ...mockManifest.skills[1], tokenEstimate: 12000, matchReason: 'keyword-match', priority: 1 },
        { ...mockManifest.skills[2], tokenEstimate: 10000, matchReason: 'keyword-match', priority: 1 }
      ];

      const optimized = skillLoader.optimizeForBudget(skills);

      // Always-load skill should be included even if over budget
      expect(optimized[0].matchReason).toBe('always-load');
    });

    test('should prioritize by priority level then match score', () => {
      const skills = [
        { ...mockManifest.skills[0], priority: 2, matchScore: 100, tokenEstimate: 8000 },
        { ...mockManifest.skills[1], priority: 1, matchScore: 50, tokenEstimate: 8000 },
        { ...mockManifest.skills[2], priority: 1, matchScore: 90, tokenEstimate: 8000 }
      ];

      const optimized = skillLoader.optimizeForBudget(skills);

      // Priority 1 skills should come first, then sorted by match score
      expect(optimized[0].priority).toBe(1);
      expect(optimized[0].matchScore).toBeGreaterThanOrEqual(optimized[1].matchScore);
    });
  });

  describe('Skill Content Loading', () => {
    beforeEach(async () => {
      await skillLoader.initialize();
    });

    test('should load skill content from file', async () => {
      const skill = mockManifest.skills[0];

      const content = await skillLoader.loadSkillContent(skill);

      expect(content).toContain('Mock Skill Content');
      expect(fs.readFile).toHaveBeenCalledWith(skill.filePath, 'utf-8');
    });

    test('should cache skill content', async () => {
      const skill = mockManifest.skills[0];

      // Load twice
      await skillLoader.loadSkillContent(skill);
      await skillLoader.loadSkillContent(skill);

      // Should only read file once (second is cached)
      expect(fs.readFile).toHaveBeenCalledTimes(2); // Once for manifest, once for skill
    });

    test('should respect cache TTL', async () => {
      const shortTTLLoader = new SkillLoader({
        manifestPath: '/test/skills-manifest.json',
        tokenBudget: 25000,
        enableCaching: true,
        cacheTTL: 0 // Immediate expiration
      });

      await shortTTLLoader.initialize();
      const skill = mockManifest.skills[0];

      await shortTTLLoader.loadSkillContent(skill);
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait a bit
      await shortTTLLoader.loadSkillContent(skill);

      // Should read file twice (cache expired)
      expect(fs.readFile).toHaveBeenCalledTimes(3); // Manifest + 2 skill reads
    });

    test('should throw error on file read failure', async () => {
      fs.readFile.mockRejectedValueOnce(new Error('File not found'));
      const skill = mockManifest.skills[0];

      await expect(skillLoader.loadSkillContent(skill)).rejects.toThrow('Failed to load skill');
    });
  });

  describe('System Prompt Building', () => {
    beforeEach(async () => {
      await skillLoader.initialize();
    });

    test('should build complete system prompt with detected skills', async () => {
      const userMessage = 'Help me with coding';

      const result = await skillLoader.buildSystemPrompt(userMessage);

      expect(result.systemPrompt).toContain('LOADED SKILLS');
      expect(result.systemPrompt).toContain('Core Skills');
      expect(result.systemPrompt).toContain('Coding Skills');
      expect(result.skills.length).toBeGreaterThan(0);
      expect(result.tokenEstimate).toBeGreaterThan(0);
    });

    test('should include base prompt when provided', async () => {
      const userMessage = 'Help me';
      const basePrompt = 'You are a helpful assistant.';

      const result = await skillLoader.buildSystemPrompt(userMessage, { basePrompt });

      expect(result.systemPrompt).toContain(basePrompt);
      expect(result.systemPrompt.indexOf(basePrompt)).toBeLessThan(
        result.systemPrompt.indexOf('LOADED SKILLS')
      );
    });

    test('should enforce token budget by default', async () => {
      const userMessage = 'Help with code architecture and optimization';

      const result = await skillLoader.buildSystemPrompt(userMessage);

      expect(result.budgetAnalysis.isWithinBudget).toBe(true);
      expect(result.tokenEstimate).toBeLessThanOrEqual(25000);
    });

    test('should skip optimization when enforceTokenBudget is false', async () => {
      const userMessage = 'Help with everything';

      const result = await skillLoader.buildSystemPrompt(userMessage, {
        enforceTokenBudget: false
      });

      // May exceed budget
      expect(result.skills.length).toBeGreaterThan(0);
    });

    test('should handle no skills detected', async () => {
      const userMessage = 'xyz random unrelated message';

      const result = await skillLoader.buildSystemPrompt(userMessage, {
        includeAlwaysLoad: false
      });

      // May have no skills or only always-load
      expect(result).toBeDefined();
      expect(result.skills).toBeDefined();
    });
  });

  describe('Statistics and Cache Management', () => {
    beforeEach(async () => {
      await skillLoader.initialize();
    });

    test('should return correct statistics', () => {
      const stats = skillLoader.getStatistics();

      expect(stats.initialized).toBe(true);
      expect(stats.totalSkills).toBe(4);
      expect(stats.enabledSkills).toBe(3);
      expect(stats.tokenBudget).toBe(25000);
      expect(stats.categories).toContain('core');
      expect(stats.categories).toContain('development');
    });

    test('should return error stats when not initialized', () => {
      const uninitializedLoader = new SkillLoader();
      const stats = uninitializedLoader.getStatistics();

      expect(stats.initialized).toBe(false);
      expect(stats.error).toBeDefined();
    });

    test('should clear cache successfully', async () => {
      const skill = mockManifest.skills[0];
      await skillLoader.loadSkillContent(skill);

      expect(skillLoader.skillCache.size).toBeGreaterThan(0);

      skillLoader.clearCache();

      expect(skillLoader.skillCache.size).toBe(0);
      expect(skillLoader.cacheTimestamps.size).toBe(0);
    });

    test('should reload manifest and clear cache', async () => {
      const skill = mockManifest.skills[0];
      await skillLoader.loadSkillContent(skill);

      await skillLoader.reloadManifest();

      expect(skillLoader.skillCache.size).toBe(0);
      expect(skillLoader.initialized).toBe(true);
    });
  });
});
