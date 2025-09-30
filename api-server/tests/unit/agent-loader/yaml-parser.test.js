import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import grayMatter from 'gray-matter';

describe('YAML Frontmatter Parser - Agent Markdown Files', () => {
  const agentsDir = '/workspaces/agent-feed/prod/.claude/agents';
  let agentFiles = [];

  beforeAll(async () => {
    const files = await fs.readdir(agentsDir);
    agentFiles = files.filter(f => f.endsWith('.md'));
  });

  describe('Valid YAML Frontmatter Parsing', () => {
    it('should parse agent-feedback-agent.md with all required fields', async () => {
      const filePath = path.join(agentsDir, 'agent-feedback-agent.md');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const { data, content } = grayMatter(fileContent);

      expect(data.name).toBe('agent-feedback-agent');
      expect(data.description).toBeDefined();
      expect(data.tools).toBeInstanceOf(Array);
      expect(data.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(content.trim()).not.toBe('');
    });

    it('should parse all 11 agent files without errors', async () => {
      const parseResults = await Promise.all(
        agentFiles.map(async (file) => {
          const filePath = path.join(agentsDir, file);
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const { data, content } = grayMatter(fileContent);
          return { file, data, content, success: true };
        })
      );

      expect(parseResults).toHaveLength(11);
      parseResults.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.data.name).toBeDefined();
      });
    });

    it('should extract name field from all agents', async () => {
      const names = await Promise.all(
        agentFiles.map(async (file) => {
          const filePath = path.join(agentsDir, file);
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const { data } = grayMatter(fileContent);
          return data.name;
        })
      );

      expect(names).toHaveLength(11);
      names.forEach(name => {
        expect(name).toBeDefined();
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      });
    });

    it('should extract description field from all agents', async () => {
      const descriptions = await Promise.all(
        agentFiles.map(async (file) => {
          const filePath = path.join(agentsDir, file);
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const { data } = grayMatter(fileContent);
          return data.description;
        })
      );

      expect(descriptions).toHaveLength(11);
      descriptions.forEach(desc => {
        expect(desc).toBeDefined();
        expect(typeof desc).toBe('string');
        expect(desc.length).toBeGreaterThan(10);
      });
    });

    it('should extract tools array from all agents', async () => {
      const toolsArrays = await Promise.all(
        agentFiles.map(async (file) => {
          const filePath = path.join(agentsDir, file);
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const { data } = grayMatter(fileContent);
          return data.tools;
        })
      );

      expect(toolsArrays).toHaveLength(11);
      toolsArrays.forEach(tools => {
        expect(tools).toBeDefined();
        expect(Array.isArray(tools)).toBe(true);
        expect(tools.length).toBeGreaterThan(0);
      });
    });

    it('should extract color field with valid hex format', async () => {
      const colors = await Promise.all(
        agentFiles.map(async (file) => {
          const filePath = path.join(agentsDir, file);
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const { data } = grayMatter(fileContent);
          return data.color;
        })
      );

      colors.forEach(color => {
        if (color) {
          expect(color).toMatch(/^#[0-9a-f]{6}$/i);
        }
      });
    });
  });

  describe('Markdown Content Extraction', () => {
    it('should extract non-empty markdown content from all agents', async () => {
      const contents = await Promise.all(
        agentFiles.map(async (file) => {
          const filePath = path.join(agentsDir, file);
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const { content } = grayMatter(fileContent);
          return content.trim();
        })
      );

      expect(contents).toHaveLength(11);
      contents.forEach(content => {
        expect(content).toBeDefined();
        expect(content.length).toBeGreaterThan(50);
      });
    });

    it('should extract markdown headers from content', async () => {
      const filePath = path.join(agentsDir, 'agent-feedback-agent.md');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const { content } = grayMatter(fileContent);

      expect(content).toContain('#');
      const headers = content.match(/^#{1,6}\s+.+$/gm);
      expect(headers).toBeDefined();
      expect(headers.length).toBeGreaterThan(0);
    });

    it('should preserve markdown formatting in content', async () => {
      const filePath = path.join(agentsDir, 'agent-feedback-agent.md');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const { content } = grayMatter(fileContent);

      // Check for common markdown elements
      const hasHeaders = content.includes('#');
      const hasLists = content.includes('-') || content.includes('*');
      const hasCodeBlocks = content.includes('```') || content.includes('`');

      expect(hasHeaders || hasLists || hasCodeBlocks).toBe(true);
    });
  });

  describe('Optional Fields and Defaults', () => {
    it('should handle agents with model field', async () => {
      const models = await Promise.all(
        agentFiles.map(async (file) => {
          const filePath = path.join(agentsDir, file);
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const { data } = grayMatter(fileContent);
          return data.model;
        })
      );

      models.forEach(model => {
        if (model) {
          expect(typeof model).toBe('string');
          expect(['sonnet', 'opus', 'haiku']).toContain(model);
        }
      });
    });

    it('should handle agents with proactive field', async () => {
      const proactiveFlags = await Promise.all(
        agentFiles.map(async (file) => {
          const filePath = path.join(agentsDir, file);
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const { data } = grayMatter(fileContent);
          return data.proactive;
        })
      );

      proactiveFlags.forEach(flag => {
        if (flag !== undefined) {
          expect(typeof flag).toBe('boolean');
        }
      });
    });

    it('should handle agents with priority field', async () => {
      const priorities = await Promise.all(
        agentFiles.map(async (file) => {
          const filePath = path.join(agentsDir, file);
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const { data } = grayMatter(fileContent);
          return data.priority;
        })
      );

      priorities.forEach(priority => {
        if (priority) {
          expect(priority).toMatch(/^P\d+$/);
        }
      });
    });

    it('should handle agents with usage field', async () => {
      const usages = await Promise.all(
        agentFiles.map(async (file) => {
          const filePath = path.join(agentsDir, file);
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const { data } = grayMatter(fileContent);
          return data.usage;
        })
      );

      usages.forEach(usage => {
        if (usage) {
          expect(typeof usage).toBe('string');
          expect(usage.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing frontmatter gracefully', () => {
      const contentWithoutFrontmatter = '# Just a markdown file\nNo YAML here.';
      const { data, content } = grayMatter(contentWithoutFrontmatter);

      expect(data).toEqual({});
      expect(content).toBe(contentWithoutFrontmatter);
    });

    it('should handle malformed YAML gracefully', () => {
      const contentWithBadYaml = `---
name: test-agent
description: "Unclosed quote
---
# Content`;

      expect(() => {
        grayMatter(contentWithBadYaml);
      }).toThrow();
    });
  });
});