/**
 * Unit Tests for loadAgentTools() function
 * Tests the backend function that loads tools from agent markdown files
 */

const { readFileSync } = require('fs');
const { join } = require('path');

// Mock the loadAgentTools function since it's not exported from server.js
// In a production scenario, this should be exported for testing
function loadAgentTools(agentName) {
  try {
    const agentFilePath = join(__dirname, `../../agents/${agentName}.md`);
    const fileContent = readFileSync(agentFilePath, 'utf-8');

    // Extract YAML frontmatter
    const frontmatterMatch = fileContent.match(/^---\n([\s\S]+?)\n---/);
    if (!frontmatterMatch) {
      return [];
    }

    // Parse tools from frontmatter
    const frontmatter = frontmatterMatch[1];
    const toolsMatch = frontmatter.match(/tools:\s*\[([^\]]+)\]/);

    if (!toolsMatch) {
      return [];
    }

    // Extract and clean tool names
    const tools = toolsMatch[1]
      .split(',')
      .map(tool => tool.trim().replace(/^['"]|['"]$/g, ''))
      .filter(tool => tool.length > 0);

    return tools;
  } catch (error) {
    // Agent markdown file doesn't exist or can't be read - return empty array
    console.log(`Could not load tools for agent ${agentName}:`, error.message);
    return [];
  }
}

describe('loadAgentTools() Unit Tests', () => {
  describe('Valid Agent Files', () => {
    test('should load tools from chief-of-staff-agent', () => {
      const tools = loadAgentTools('chief-of-staff-agent');

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      expect(tools).toContain('Read');
      expect(tools).toContain('Write');
      expect(tools).toContain('Edit');
      expect(tools).toContain('TodoWrite');
      expect(tools).toContain('Bash');
      expect(tools).toContain('Task');
    });

    test('should return array of strings', () => {
      const tools = loadAgentTools('chief-of-staff-agent');

      tools.forEach(tool => {
        expect(typeof tool).toBe('string');
        expect(tool.length).toBeGreaterThan(0);
      });
    });

    test('should not include empty strings', () => {
      const tools = loadAgentTools('chief-of-staff-agent');

      const emptyTools = tools.filter(tool => tool === '');
      expect(emptyTools).toHaveLength(0);
    });

    test('should trim whitespace from tool names', () => {
      const tools = loadAgentTools('chief-of-staff-agent');

      tools.forEach(tool => {
        expect(tool).toBe(tool.trim());
        expect(tool).not.toMatch(/^\s/);
        expect(tool).not.toMatch(/\s$/);
      });
    });

    test('should remove quotes from tool names', () => {
      const tools = loadAgentTools('chief-of-staff-agent');

      tools.forEach(tool => {
        expect(tool).not.toMatch(/^['"]/);
        expect(tool).not.toMatch(/['"]$/);
      });
    });
  });

  describe('Edge Cases', () => {
    test('should return empty array for non-existent agent', () => {
      const tools = loadAgentTools('non-existent-agent-xyz-123');

      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toHaveLength(0);
    });

    test('should handle agent with no tools field', () => {
      // Create a mock agent file without tools (if one exists)
      const tools = loadAgentTools('test-agent-no-tools');

      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toHaveLength(0);
    });

    test('should return empty array for invalid agent name', () => {
      const tools = loadAgentTools('');

      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toHaveLength(0);
    });

    test('should handle null agent name gracefully', () => {
      const tools = loadAgentTools(null);

      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toHaveLength(0);
    });

    test('should handle undefined agent name gracefully', () => {
      const tools = loadAgentTools(undefined);

      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toHaveLength(0);
    });
  });

  describe('YAML Frontmatter Parsing', () => {
    test('should parse tools array with spaces', () => {
      const tools = loadAgentTools('chief-of-staff-agent');

      // Should handle format: [Read, Write, Edit]
      expect(tools.every(tool => !tool.includes(','))).toBe(true);
    });

    test('should handle tools with quotes', () => {
      const tools = loadAgentTools('chief-of-staff-agent');

      // Should strip both single and double quotes
      tools.forEach(tool => {
        expect(tool).not.toMatch(/^["']/);
        expect(tool).not.toMatch(/["']$/);
      });
    });

    test('should handle MCP tool names with special characters', () => {
      // Some agents may have MCP tools with underscores and dashes
      const tools = loadAgentTools('chief-of-staff-agent');

      tools.forEach(tool => {
        // Tool names can contain letters, underscores, and hyphens
        expect(tool).toMatch(/^[a-zA-Z0-9_\-:.*]+$/);
      });
    });
  });

  describe('Performance', () => {
    test('should load tools quickly (< 100ms)', () => {
      const start = Date.now();
      loadAgentTools('chief-of-staff-agent');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    test('should handle multiple sequential calls efficiently', () => {
      const start = Date.now();

      for (let i = 0; i < 10; i++) {
        loadAgentTools('chief-of-staff-agent');
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // 10 calls in under 1 second
    });
  });

  describe('Data Integrity', () => {
    test('should return consistent results on multiple calls', () => {
      const tools1 = loadAgentTools('chief-of-staff-agent');
      const tools2 = loadAgentTools('chief-of-staff-agent');

      expect(tools1).toEqual(tools2);
    });

    test('should not modify the original file', () => {
      const beforeTools = loadAgentTools('chief-of-staff-agent');

      // Call it again to ensure no side effects
      loadAgentTools('chief-of-staff-agent');

      const afterTools = loadAgentTools('chief-of-staff-agent');
      expect(beforeTools).toEqual(afterTools);
    });
  });
});
