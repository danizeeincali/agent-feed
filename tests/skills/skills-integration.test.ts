/**
 * Skills Integration Tests
 *
 * Tests for skills integration with:
 * - Real file system operations
 * - Actual skill loading
 * - Progressive disclosure
 * - Agent integration
 */

import { createSkillsService } from '../../api-server/services/skills-service';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

describe('Skills Integration Tests', () => {
  const skillsDir = '/workspaces/agent-feed/prod/skills';
  let service: ReturnType<typeof createSkillsService>;

  beforeAll(() => {
    // Use test API key or skip if not available
    const apiKey = process.env.ANTHROPIC_API_KEY || 'test-key';
    service = createSkillsService(apiKey);
  });

  describe('System Skills Structure', () => {
    it('should have .system directory', async () => {
      const entries = await readdir(skillsDir);
      expect(entries).toContain('.system');
    });

    it('should have protection marker in .system', async () => {
      const entries = await readdir(path.join(skillsDir, '.system'));
      expect(entries).toContain('.protected');
    });

    it('should have all 3 system skills', async () => {
      const systemSkills = await readdir(path.join(skillsDir, '.system'));

      expect(systemSkills).toContain('brand-guidelines');
      expect(systemSkills).toContain('code-standards');
      expect(systemSkills).toContain('avi-architecture');
    });

    it('should have shared and agent-specific directories', async () => {
      const entries = await readdir(skillsDir);

      expect(entries).toContain('shared');
      expect(entries).toContain('agent-specific');
    });
  });

  describe('Brand Guidelines Skill', () => {
    const skillPath = '.system/brand-guidelines';

    it('should load metadata successfully', async () => {
      const metadata = await service.loadSkillMetadata(skillPath);

      expect(metadata.name).toBe('AVI Brand Guidelines');
      expect(metadata.description).toContain('Brand voice');
      expect(metadata._protected).toBe(true);
      expect(metadata._version).toBe('1.0.0');
    });

    it('should include allowed agents', async () => {
      const metadata = await service.loadSkillMetadata(skillPath);

      expect(metadata._allowed_agents).toContain('meta-agent');
      expect(metadata._allowed_agents).toContain('agent-feedback-agent');
      expect(metadata._allowed_agents).toContain('page-builder-agent');
    });

    it('should load complete skill definition', async () => {
      const skill = await service.loadSkillFiles(skillPath);

      expect(skill.metadata.name).toBe('AVI Brand Guidelines');
      expect(skill.content).toContain('## Purpose');
      expect(skill.content).toContain('## Brand Voice Principles');
      expect(skill.content).toContain('## Messaging Frameworks');
    });

    it('should have proper content structure', async () => {
      const skill = await service.loadSkillFiles(skillPath);

      // Check for key sections
      expect(skill.content).toContain('When to Use This Skill');
      expect(skill.content).toContain('Core Attributes');
      expect(skill.content).toContain('Tone Guidelines');
      expect(skill.content).toContain('Agent Feed Posts');
    });
  });

  describe('Code Standards Skill', () => {
    const skillPath = '.system/code-standards';

    it('should load metadata successfully', async () => {
      const metadata = await service.loadSkillMetadata(skillPath);

      expect(metadata.name).toBe('AVI Code Standards');
      expect(metadata.description).toContain('TypeScript');
      expect(metadata._protected).toBe(true);
    });

    it('should include development agents in allowed list', async () => {
      const metadata = await service.loadSkillMetadata(skillPath);

      expect(metadata._allowed_agents).toContain('coder');
      expect(metadata._allowed_agents).toContain('reviewer');
      expect(metadata._allowed_agents).toContain('tester');
    });

    it('should have TypeScript standards section', async () => {
      const skill = await service.loadSkillFiles(skillPath);

      expect(skill.content).toContain('## Core Principles');
      expect(skill.content).toContain('### 1. TypeScript Standards');
      expect(skill.content).toContain('Strict Type Safety');
    });

    it('should have React component standards', async () => {
      const skill = await service.loadSkillFiles(skillPath);

      expect(skill.content).toContain('### 2. React Component Standards');
      expect(skill.content).toContain('Component Structure');
      expect(skill.content).toContain('Custom Hooks');
    });

    it('should have testing standards', async () => {
      const skill = await service.loadSkillFiles(skillPath);

      expect(skill.content).toContain('### 4. Testing Standards');
      expect(skill.content).toContain('TDD - London School');
    });
  });

  describe('AVI Architecture Skill', () => {
    const skillPath = '.system/avi-architecture';

    it('should load metadata successfully', async () => {
      const metadata = await service.loadSkillMetadata(skillPath);

      expect(metadata.name).toBe('AVI Architecture Patterns');
      expect(metadata.description).toContain('System design patterns');
      expect(metadata._protected).toBe(true);
    });

    it('should have architecture principles', async () => {
      const skill = await service.loadSkillFiles(skillPath);

      expect(skill.content).toContain('## Core Architecture Principles');
      expect(skill.content).toContain('### 1. Separation of Concerns');
      expect(skill.content).toContain('### 2. Protected vs Editable Boundaries');
    });

    it('should document agent coordination patterns', async () => {
      const skill = await service.loadSkillFiles(skillPath);

      expect(skill.content).toContain('### 3. Agent Coordination Patterns');
      expect(skill.content).toContain('Hierarchical Pattern');
      expect(skill.content).toContain('Delegation Pattern');
    });

    it('should include system diagrams', async () => {
      const skill = await service.loadSkillFiles(skillPath);

      expect(skill.content).toContain('## System Diagrams');
      expect(skill.content).toContain('### AVI System Architecture');
    });
  });

  describe('Progressive Disclosure', () => {
    it('should load metadata quickly (Tier 1)', async () => {
      const start = Date.now();

      await service.loadSkillMetadata('.system/brand-guidelines');

      const duration = Date.now() - start;

      // Metadata loading should be very fast
      expect(duration).toBeLessThan(100);
    });

    it('should use cache for repeated loads', async () => {
      const skillPath = '.system/code-standards';

      // Clear cache first
      service.clearCache();

      // First load
      await service.loadSkillFiles(skillPath);

      // Second load (cached) - should return immediately from cache
      const cached = await service.loadSkillFiles(skillPath);

      // Verify it's cached
      const stats = service.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(cached.metadata.name).toBe('AVI Code Standards');
    });

    it('should provide cache statistics', async () => {
      service.clearCache();

      await service.loadSkillFiles('.system/brand-guidelines');
      await service.loadSkillFiles('.system/code-standards');
      await service.loadSkillFiles('.system/avi-architecture');

      const stats = service.getCacheStats();

      expect(stats.size).toBe(3);
      expect(stats.entries).toHaveLength(3);
    });
  });

  describe('File System Protection', () => {
    it('should have read-only permissions on .system directory', async () => {
      const { stat } = await import('fs/promises');
      const stats = await stat(path.join(skillsDir, '.system'));

      // Directory should be 755 (rwxr-xr-x)
      const mode = stats.mode & parseInt('777', 8);
      expect(mode).toBe(parseInt('755', 8));
    });

    it('should have protection marker file', async () => {
      const content = await readFile(
        path.join(skillsDir, '.system/.protected'),
        'utf-8'
      );

      expect(content).toContain('PROTECTED');
    });
  });

  describe('Token Efficiency', () => {
    it('should have reasonable token counts for metadata', async () => {
      const metadata = await service.loadSkillMetadata('.system/brand-guidelines');

      // Estimate tokens (rough: 4 chars per token)
      const metadataStr = JSON.stringify(metadata);
      const estimatedTokens = metadataStr.length / 4;

      // Should be under 200 tokens for metadata
      expect(estimatedTokens).toBeLessThan(200);
    });

    it('should have reasonable token counts for full skills', async () => {
      const skill = await service.loadSkillFiles('.system/code-standards');

      // Estimate tokens
      const estimatedTokens = skill.content.length / 4;

      // Should be under 5000 tokens
      expect(estimatedTokens).toBeLessThan(5000);
    });
  });
});
