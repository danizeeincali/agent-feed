/**
 * Skills Service Unit Tests
 *
 * Tests for the SkillsService class including:
 * - Skill loading (metadata, full content, resources)
 * - Protected skill validation
 * - Caching behavior
 * - Error handling
 */

import { SkillsService, createSkillsService } from '../../api-server/services/skills-service';
import { readFile, stat, readdir } from 'fs/promises';

// Mock fs/promises
jest.mock('fs/promises');

describe('SkillsService', () => {
  let service: SkillsService;
  const mockApiKey = 'sk-ant-api03-test-key';

  beforeEach(() => {
    service = new SkillsService(mockApiKey);
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('Constructor', () => {
    it('should throw error if API key is missing', () => {
      expect(() => new SkillsService('')).toThrow('Anthropic API key is required');
    });

    it('should initialize with valid API key', () => {
      expect(service).toBeInstanceOf(SkillsService);
    });
  });

  describe('loadSkillMetadata', () => {
    it('should load skill metadata from SKILL.md', async () => {
      const mockSkillContent = `---
name: Test Skill
description: A test skill for unit testing
_protected: true
_version: "1.0.0"
---

# Test Skill Content`;

      (readFile as jest.MockedFunction<typeof readFile>).mockResolvedValue(mockSkillContent);

      const metadata = await service.loadSkillMetadata('.system/test-skill');

      expect(metadata).toEqual({
        name: 'Test Skill',
        description: 'A test skill for unit testing',
        _protected: true,
        _version: '1.0.0'
      });
    });

    it('should throw error if frontmatter is missing', async () => {
      (readFile as jest.MockedFunction<typeof readFile>).mockResolvedValue('No frontmatter here');

      await expect(service.loadSkillMetadata('.system/test-skill')).rejects.toThrow(
        'Failed to load skill metadata'
      );
    });

    it('should throw error if name or description is missing', async () => {
      const invalidSkillContent = `---
name: Test Skill
---

# Missing description`;

      (readFile as jest.MockedFunction<typeof readFile>).mockResolvedValue(invalidSkillContent);

      await expect(service.loadSkillMetadata('.system/test-skill')).rejects.toThrow(
        'Failed to load skill metadata'
      );
    });
  });

  describe('loadSkillFiles', () => {
    it('should load complete skill definition', async () => {
      const mockSkillContent = `---
name: Test Skill
description: A test skill
_protected: true
---

# Test Skill

## Purpose
Test purpose

## Instructions
1. Step 1
2. Step 2`;

      (readFile as jest.MockedFunction<typeof readFile>).mockResolvedValue(mockSkillContent);
      (readdir as jest.MockedFunction<typeof readdir>).mockResolvedValue([] as any);

      const skill = await service.loadSkillFiles('.system/test-skill', false);

      expect(skill.metadata.name).toBe('Test Skill');
      expect(skill.content).toContain('## Purpose');
      expect(skill.path).toBe('.system/test-skill');
      expect(skill.hash).toBeTruthy();
    });

    it('should use cache on subsequent calls', async () => {
      const mockSkillContent = `---
name: Cached Skill
description: Test caching
---

# Content`;

      (readFile as jest.MockedFunction<typeof readFile>).mockResolvedValue(mockSkillContent);
      (readdir as jest.MockedFunction<typeof readdir>).mockResolvedValue([] as any);

      // First call - loads from file
      await service.loadSkillFiles('.system/cached-skill');

      // Second call - should use cache
      await service.loadSkillFiles('.system/cached-skill');

      // readFile should only be called once
      expect(readFile).toHaveBeenCalledTimes(1);
    });

    it('should bypass cache when useCache is false', async () => {
      const mockSkillContent = `---
name: No Cache Skill
description: Test cache bypass
---

# Content`;

      (readFile as jest.MockedFunction<typeof readFile>).mockResolvedValue(mockSkillContent);
      (readdir as jest.MockedFunction<typeof readdir>).mockResolvedValue([] as any);

      // First call
      await service.loadSkillFiles('.system/no-cache-skill', false);

      // Second call with useCache = false
      await service.loadSkillFiles('.system/no-cache-skill', false);

      // readFile should be called twice
      expect(readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('Protected Skill Validation', () => {
    it('should validate protected skill with correct permissions', async () => {
      // Mock protection marker exists
      (stat as jest.MockedFunction<typeof stat>).mockResolvedValueOnce({
        mode: 0o100644
      } as any);

      // Mock directory with 755 permissions
      (stat as jest.MockedFunction<typeof stat>).mockResolvedValueOnce({
        mode: 0o40755
      } as any);

      const mockSkillContent = `---
name: Protected Skill
description: A protected skill
_protected: true
---

# Content`;

      (readFile as jest.MockedFunction<typeof readFile>).mockResolvedValue(mockSkillContent);
      (readdir as jest.MockedFunction<typeof readdir>).mockResolvedValue([] as any);

      // Should not throw
      await service.loadSkillFiles('.system/protected-skill');
    });

    it('should skip validation when _protected is false', async () => {
      const mockSkillContent = `---
name: Non-Protected Skill
description: Not protected
_protected: false
---

# Content`;

      (readFile as jest.MockedFunction<typeof readFile>).mockResolvedValue(mockSkillContent);
      (readdir as jest.MockedFunction<typeof readdir>).mockResolvedValue([] as any);

      // Should not throw even without protection marker
      const skill = await service.loadSkillFiles('.system/non-protected');
      expect(skill.metadata._protected).toBe(false);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', async () => {
      const mockSkillContent = `---
name: Cache Test
description: Test cache clearing
---

# Content`;

      (readFile as jest.MockedFunction<typeof readFile>).mockResolvedValue(mockSkillContent);
      (readdir as jest.MockedFunction<typeof readdir>).mockResolvedValue([] as any);

      await service.loadSkillFiles('.system/cache-test');

      const statsBefore = service.getCacheStats();
      expect(statsBefore.size).toBe(1);

      service.clearCache();

      const statsAfter = service.getCacheStats();
      expect(statsAfter.size).toBe(0);
    });

    it('should return cache statistics', async () => {
      const mockSkillContent = `---
name: Stats Test
description: Test statistics
---

# Content`;

      (readFile as jest.MockedFunction<typeof readFile>).mockResolvedValue(mockSkillContent);
      (readdir as jest.MockedFunction<typeof readdir>).mockResolvedValue([] as any);

      await service.loadSkillFiles('.system/stats-test-1');
      await service.loadSkillFiles('.system/stats-test-2');

      const stats = service.getCacheStats();

      expect(stats.size).toBe(2);
      expect(stats.entries).toContain('.system/stats-test-1');
      expect(stats.entries).toContain('.system/stats-test-2');
    });
  });

  describe('createSkillsService Factory', () => {
    it('should create service with provided API key', () => {
      const service = createSkillsService('test-key');
      expect(service).toBeInstanceOf(SkillsService);
    });

    it('should use environment variable if no key provided', () => {
      process.env.ANTHROPIC_API_KEY = 'env-test-key';
      const service = createSkillsService();
      expect(service).toBeInstanceOf(SkillsService);
      delete process.env.ANTHROPIC_API_KEY;
    });

    it('should throw if no API key available', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => createSkillsService()).toThrow(
        'Anthropic API key not found. Set ANTHROPIC_API_KEY environment variable.'
      );
    });
  });
});
