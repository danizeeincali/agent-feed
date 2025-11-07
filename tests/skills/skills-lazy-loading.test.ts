/**
 * Skills Lazy-Loading Tests (TDD)
 *
 * Tests the three-tier progressive disclosure pattern:
 * - Tier 1: Metadata only (~100 tokens)
 * - Tier 2: Full content on-demand (~2K tokens)
 * - Tier 3: Resources on-demand (~varies)
 *
 * Target: Reduce token usage from 64K to <8K per conversation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SkillsService } from '../../api-server/services/skills-service';
import { ConversationContext } from '../../api-server/services/conversation-context';
import { readFile, stat, readdir } from 'fs/promises';

// Mock fs/promises
jest.mock('fs/promises');

describe('Skills Lazy-Loading (TDD)', () => {
  let skillsService: SkillsService;
  let conversationContext: ConversationContext;
  const mockApiKey = 'sk-ant-api03-test-key';

  beforeEach(() => {
    skillsService = new SkillsService(mockApiKey);
    conversationContext = new ConversationContext({
      maxTokens: 50000,
      warningThreshold: 30000
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    skillsService.clearCache();
  });

  describe('Tier 1: Metadata-Only Loading', () => {
    it('should load skill metadata with minimal tokens (~100)', async () => {
      const mockSkillContent = `---
name: Productivity Patterns
description: Task management and workflow optimization
_protected: false
version: "1.0.0"
---

# Productivity Patterns
[Full content would be here]`;

      (readFile as jest.MockedFunction<typeof readFile>).mockResolvedValue(mockSkillContent);

      const metadata = await skillsService.loadSkillMetadata('productivity/patterns');

      // Should only have metadata fields
      expect(metadata).toEqual({
        name: 'Productivity Patterns',
        description: 'Task management and workflow optimization',
        _protected: false,
        version: '1.0.0'
      });

      // Estimate tokens (name + description + version)
      const estimatedTokens = JSON.stringify(metadata).length / 4;
      expect(estimatedTokens).toBeLessThan(150);
    });

    it('should load multiple skill metadata efficiently', async () => {
      const mockSkills = [
        'productivity/patterns',
        'communication/email',
        'data-analysis/visualization'
      ];

      const mockContent = (name: string) => `---
name: ${name}
description: Test skill ${name}
---

# Content`;

      (readFile as jest.MockedFunction<typeof readFile>).mockImplementation(async (path) => {
        const skillName = path.toString().split('/').pop()?.replace('/SKILL.md', '');
        return mockContent(skillName || 'unknown');
      });

      const metadataList = await Promise.all(
        mockSkills.map(skill => skillsService.loadSkillMetadata(skill))
      );

      // All metadata should be loaded
      expect(metadataList).toHaveLength(3);

      // Total tokens should be minimal
      const totalTokens = metadataList.reduce((sum, meta) => {
        return sum + (JSON.stringify(meta).length / 4);
      }, 0);

      expect(totalTokens).toBeLessThan(500); // ~166 tokens per skill
    });
  });

  describe('Tier 2: On-Demand Full Content Loading', () => {
    it('should load full skill content only when explicitly requested', async () => {
      const mockSkillContent = `---
name: Task Management
description: Advanced task tracking
---

# Task Management Skill

## Purpose
Comprehensive task management system.

## Instructions
1. Create tasks with context
2. Track dependencies
3. Monitor progress`;

      (readFile as jest.MockedFunction<typeof readFile>).mockResolvedValue(mockSkillContent);
      (readdir as jest.MockedFunction<typeof readdir>).mockResolvedValue([] as any);

      // First, load only metadata
      const metadata = await skillsService.loadSkillMetadata('productivity/task-management');
      expect(metadata.name).toBe('Task Management');

      // Then, load full content when needed
      const fullSkill = await skillsService.loadSkillFiles('productivity/task-management', false);

      expect(fullSkill.content).toContain('## Purpose');
      expect(fullSkill.content).toContain('## Instructions');
      expect(fullSkill.metadata).toEqual(metadata);

      // Full content should be ~2K tokens
      const contentTokens = fullSkill.content.length / 4;
      expect(contentTokens).toBeGreaterThan(50); // Has actual content
      expect(contentTokens).toBeLessThan(3000); // But not excessive
    });

    it('should cache full content after first load', async () => {
      const mockSkillContent = `---
name: Cached Skill
description: Test caching
---

# Content here`;

      (readFile as jest.MockedFunction<typeof readFile>).mockResolvedValue(mockSkillContent);
      (readdir as jest.MockedFunction<typeof readdir>).mockResolvedValue([] as any);

      // Load twice
      await skillsService.loadSkillFiles('test/cached-skill');
      await skillsService.loadSkillFiles('test/cached-skill');

      // Should only read file once
      expect(readFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tier 3: Resource Lazy-Loading', () => {
    it('should load resources only when requested', async () => {
      const mockSkillContent = `---
name: Data Analysis
description: Analysis tools
---

# Data Analysis`;

      const mockResources = [
        { name: 'example.py', isFile: () => true, isDirectory: () => false },
        { name: 'README.md', isFile: () => true, isDirectory: () => false }
      ] as any;

      (readFile as jest.MockedFunction<typeof readFile>)
        .mockResolvedValueOnce(mockSkillContent) // SKILL.md
        .mockResolvedValueOnce('# Python example code'); // example.py

      (readdir as jest.MockedFunction<typeof readdir>).mockResolvedValue(mockResources);

      // Load skill (doesn't load resource content yet)
      const skill = await skillsService.loadSkillFiles('data/analysis', false);

      expect(skill.resources).toHaveLength(2);
      expect(skill.resources[0].path).toContain('example.py');
      expect(skill.resources[0].content).toBeUndefined(); // Not loaded yet

      // Load specific resource on-demand
      const resourceContent = await skillsService.loadResource('data/analysis', 'example.py');
      expect(resourceContent).toBe('# Python example code');
    });
  });

  describe('ConversationContext: Token Budget Management', () => {
    it('should track token usage and warn at 30K tokens', () => {
      // Add some context
      conversationContext.addMessage('user', 'Hello');
      conversationContext.addMessage('assistant', 'Hi there!');

      // Add skills metadata (minimal tokens)
      conversationContext.addSkillReference({
        id: 'prod-001',
        name: 'Productivity Patterns',
        description: 'Task management',
        path: 'productivity/patterns'
      });

      const stats = conversationContext.getTokenStats();
      expect(stats.totalTokens).toBeLessThan(1000);
      expect(stats.warningTriggered).toBe(false);

      // Simulate approaching limit
      conversationContext.estimatedTokens = 31000;
      expect(conversationContext.shouldWarn()).toBe(true);
    });

    it('should enforce 50K token hard limit', () => {
      conversationContext.estimatedTokens = 51000;

      expect(() => {
        conversationContext.addMessage('user', 'New message');
      }).toThrow('Token limit exceeded');
    });

    it('should auto-trim old messages when approaching limit', () => {
      // Add many messages
      for (let i = 0; i < 100; i++) {
        conversationContext.addMessage('user', `Message ${i}`);
        conversationContext.addMessage('assistant', `Response ${i}`);
      }

      conversationContext.estimatedTokens = 45000;

      // Trim oldest messages
      conversationContext.trimToLimit(40000);

      const stats = conversationContext.getTokenStats();
      expect(stats.totalTokens).toBeLessThan(40000);
      expect(stats.messagesTrimmed).toBeGreaterThan(0);
    });

    it('should maintain skill references in context (metadata only)', () => {
      const skillRef = {
        id: 'skill-001',
        name: 'Test Skill',
        description: 'A test skill',
        path: 'test/skill'
      };

      conversationContext.addSkillReference(skillRef);

      const context = conversationContext.getContext();
      expect(context.skills).toHaveLength(1);
      expect(context.skills[0]).toEqual(skillRef);

      // Skills section should be minimal tokens
      const skillsTokens = JSON.stringify(context.skills).length / 4;
      expect(skillsTokens).toBeLessThan(100);
    });

    it('should load full skill content on explicit reference', async () => {
      const mockSkillContent = `---
name: Referenced Skill
description: Explicitly referenced
---

# Full Content Here`;

      (readFile as jest.MockedFunction<typeof readFile>).mockResolvedValue(mockSkillContent);
      (readdir as jest.MockedFunction<typeof readdir>).mockResolvedValue([] as any);

      // User explicitly references a skill
      const skillPath = 'test/referenced-skill';
      const fullSkill = await conversationContext.loadSkill(skillPath, skillsService);

      // Full content should now be in context
      const context = conversationContext.getContext();
      const loadedSkill = context.loadedSkills?.find(s => s.path === skillPath);

      expect(loadedSkill).toBeDefined();
      expect(loadedSkill?.content).toContain('# Full Content Here');
    });
  });

  describe('Token Measurement & Reporting', () => {
    it('should accurately measure token usage before and after', () => {
      const beforeTokens = conversationContext.getTokenStats().totalTokens;

      // Add metadata-only skills
      for (let i = 0; i < 10; i++) {
        conversationContext.addSkillReference({
          id: `skill-${i}`,
          name: `Skill ${i}`,
          description: `Description ${i}`,
          path: `test/skill-${i}`
        });
      }

      const afterTokens = conversationContext.getTokenStats().totalTokens;
      const tokensAdded = afterTokens - beforeTokens;

      // 10 skills * ~100 tokens each = ~1000 tokens
      expect(tokensAdded).toBeLessThan(1500);
      expect(tokensAdded).toBeGreaterThan(500);
    });

    it('should report token savings from lazy-loading', () => {
      // Old approach: load all skills upfront
      const oldApproachTokens = 64000; // All skills loaded

      // New approach: metadata only
      for (let i = 0; i < 100; i++) {
        conversationContext.addSkillReference({
          id: `skill-${i}`,
          name: `Skill ${i}`,
          description: `Description ${i}`,
          path: `test/skill-${i}`
        });
      }

      const newApproachTokens = conversationContext.getTokenStats().totalTokens;

      const savings = oldApproachTokens - newApproachTokens;
      const savingsPercent = (savings / oldApproachTokens) * 100;

      // Should save at least 75%
      expect(savingsPercent).toBeGreaterThan(75);
      expect(newApproachTokens).toBeLessThan(10000);
    });

    it('should generate token usage report', () => {
      conversationContext.addMessage('user', 'Hello');
      conversationContext.addMessage('assistant', 'Hi');

      for (let i = 0; i < 5; i++) {
        conversationContext.addSkillReference({
          id: `skill-${i}`,
          name: `Skill ${i}`,
          description: `Desc ${i}`,
          path: `test/skill-${i}`
        });
      }

      const report = conversationContext.generateTokenReport();

      expect(report).toHaveProperty('totalTokens');
      expect(report).toHaveProperty('messageTokens');
      expect(report).toHaveProperty('skillMetadataTokens');
      expect(report).toHaveProperty('fullSkillsTokens');
      expect(report).toHaveProperty('breakdown');
      expect(report).toHaveProperty('savingsEstimate');
    });
  });

  describe('Integration: Session Manager with Lazy-Loading', () => {
    it('should initialize with skill metadata only', async () => {
      const mockSkills = ['productivity/patterns', 'communication/email'];

      const mockContent = `---
name: Test Skill
description: Test
---

# Content`;

      (readFile as jest.MockedFunction<typeof readFile>).mockResolvedValue(mockContent);

      // Load all available skills metadata
      for (const skillPath of mockSkills) {
        const metadata = await skillsService.loadSkillMetadata(skillPath);
        conversationContext.addSkillReference({
          id: skillPath,
          name: metadata.name,
          description: metadata.description,
          path: skillPath
        });
      }

      const stats = conversationContext.getTokenStats();

      // Should be minimal tokens (no full content)
      expect(stats.totalTokens).toBeLessThan(1000);
      expect(stats.skillReferences).toBe(2);
      expect(stats.fullSkillsLoaded).toBe(0);
    });

    it('should load full skill only when user references it', async () => {
      const mockSkillContent = `---
name: Productivity Patterns
description: Task management
---

# Productivity Patterns

## Detailed Instructions
1. Create tasks
2. Track progress
3. Complete items`;

      (readFile as jest.MockedFunction<typeof readFile>).mockResolvedValue(mockSkillContent);
      (readdir as jest.MockedFunction<typeof readdir>).mockResolvedValue([] as any);

      // Start with metadata only
      conversationContext.addSkillReference({
        id: 'prod-001',
        name: 'Productivity Patterns',
        description: 'Task management',
        path: 'productivity/patterns'
      });

      const beforeTokens = conversationContext.getTokenStats().totalTokens;

      // User explicitly asks about the skill
      conversationContext.addMessage('user', 'Tell me about Productivity Patterns skill');

      // System detects skill reference and loads full content
      await conversationContext.loadSkill('productivity/patterns', skillsService);

      const afterTokens = conversationContext.getTokenStats().totalTokens;
      const tokensAdded = afterTokens - beforeTokens;

      // Should add ~2K tokens for full content
      expect(tokensAdded).toBeGreaterThan(500);
      expect(tokensAdded).toBeLessThan(3000);
    });
  });
});
