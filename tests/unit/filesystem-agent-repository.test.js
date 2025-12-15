/**
 * Unit Tests: Filesystem Agent Repository
 * Tests the agent loading from /prod/.claude/agents/ directory
 */

const fs = require('fs/promises');
const path = require('path');
const matter = require('gray-matter');

const AGENTS_DIR = '/workspaces/agent-feed/prod/.claude/agents';

describe('Filesystem Agent Repository - Unit Tests', () => {

  describe('Production Agents Directory', () => {
    it('should exist and be accessible', async () => {
      const stat = await fs.stat(AGENTS_DIR);
      expect(stat.isDirectory()).toBe(true);
    });

    it('should contain exactly 13 agent files', async () => {
      const files = await fs.readdir(AGENTS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      expect(mdFiles.length).toBe(13);
    });

    it('should contain all expected production agents', async () => {
      const files = await fs.readdir(AGENTS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      const expectedAgents = [
        'agent-feedback-agent.md',
        'agent-ideas-agent.md',
        'dynamic-page-testing-agent.md',
        'follow-ups-agent.md',
        'get-to-know-you-agent.md',
        'link-logger-agent.md',
        'meeting-next-steps-agent.md',
        'meeting-prep-agent.md',
        'meta-agent.md',
        'meta-update-agent.md',
        'page-builder-agent.md',
        'page-verification-agent.md',
        'personal-todos-agent.md'
      ];

      expectedAgents.forEach(expected => {
        expect(mdFiles).toContain(expected);
      });
    });

    it('should NOT contain system template agents', async () => {
      const files = await fs.readdir(AGENTS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      const systemTemplates = [
        'apiintegrator',
        'api-integrator',
        'template',
        'example'
      ];

      mdFiles.forEach(file => {
        const lower = file.toLowerCase();
        systemTemplates.forEach(template => {
          expect(lower).not.toContain(template);
        });
      });
    });
  });

  describe('Agent File Structure', () => {
    let sampleAgentPath;

    beforeAll(async () => {
      const files = await fs.readdir(AGENTS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      sampleAgentPath = path.join(AGENTS_DIR, mdFiles[0]);
    });

    it('should have valid YAML frontmatter', async () => {
      const content = await fs.readFile(sampleAgentPath, 'utf-8');
      const parsed = matter(content);

      expect(parsed.data).toBeDefined();
      expect(parsed.content).toBeDefined();
    });

    it('should have required fields in frontmatter', async () => {
      const content = await fs.readFile(sampleAgentPath, 'utf-8');
      const { data: frontmatter } = matter(content);

      // Check for at least some fields (name or description)
      const hasName = frontmatter.name !== undefined;
      const hasDescription = frontmatter.description !== undefined;

      expect(hasName || hasDescription).toBe(true);
    });

    it('should have tools field as array or string', async () => {
      const content = await fs.readFile(sampleAgentPath, 'utf-8');
      const { data: frontmatter } = matter(content);

      if (frontmatter.tools) {
        const isValid = Array.isArray(frontmatter.tools) || typeof frontmatter.tools === 'string';
        expect(isValid).toBe(true);
      }
    });

    it('should have markdown content after frontmatter', async () => {
      const content = await fs.readFile(sampleAgentPath, 'utf-8');
      const { content: markdownContent } = matter(content);

      expect(markdownContent.length).toBeGreaterThan(0);
    });
  });

  describe('All Agent Files Validation', () => {
    it('should parse all 13 agents without errors', async () => {
      const files = await fs.readdir(AGENTS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      const promises = mdFiles.map(async file => {
        const filePath = path.join(AGENTS_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = matter(content);

        return {
          file,
          success: true,
          data: parsed.data,
          contentLength: parsed.content.length
        };
      });

      const results = await Promise.all(promises);

      expect(results.length).toBe(13);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.contentLength).toBeGreaterThan(0);
      });
    });

    it('should have unique agent names', async () => {
      const files = await fs.readdir(AGENTS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      const names = await Promise.all(mdFiles.map(async file => {
        const filePath = path.join(AGENTS_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const { data } = matter(content);
        return data.name || path.basename(file, '.md');
      }));

      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have non-empty descriptions', async () => {
      const files = await fs.readdir(AGENTS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      const descriptions = await Promise.all(mdFiles.map(async file => {
        const filePath = path.join(AGENTS_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const { data } = matter(content);
        return data.description || '';
      }));

      descriptions.forEach(desc => {
        expect(desc.length).toBeGreaterThan(0);
      });
    });
  });

  describe('File System Performance', () => {
    it('should read all files in under 500ms', async () => {
      const start = Date.now();

      const files = await fs.readdir(AGENTS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      await Promise.all(mdFiles.map(file => {
        return fs.readFile(path.join(AGENTS_DIR, file), 'utf-8');
      }));

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it('should handle concurrent file reads', async () => {
      const files = await fs.readdir(AGENTS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      // Read same file multiple times concurrently
      const promises = Array(10).fill(null).map(() =>
        fs.readFile(path.join(AGENTS_DIR, mdFiles[0]), 'utf-8')
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(10);
      results.forEach(content => {
        expect(content.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle file read errors gracefully', async () => {
      const nonExistentPath = path.join(AGENTS_DIR, 'non-existent.md');

      await expect(
        fs.readFile(nonExistentPath, 'utf-8')
      ).rejects.toThrow();
    });

    it('should have valid UTF-8 encoding', async () => {
      const files = await fs.readdir(AGENTS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      for (const file of mdFiles.slice(0, 3)) {
        const filePath = path.join(AGENTS_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');

        // Should not have null bytes or invalid characters
        expect(content).not.toContain('\0');
        expect(typeof content).toBe('string');
      }
    });
  });
});
