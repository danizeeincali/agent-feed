/**
 * Unit Tests for toolDescriptions utility
 * Tests the tool description lookup functionality
 */

import { TOOL_DESCRIPTIONS, getToolDescription } from '../../constants/toolDescriptions';

describe('Tool Descriptions Utility', () => {
  describe('TOOL_DESCRIPTIONS Object', () => {
    test('should be defined', () => {
      expect(TOOL_DESCRIPTIONS).toBeDefined();
      expect(typeof TOOL_DESCRIPTIONS).toBe('object');
    });

    test('should contain core file tools', () => {
      expect(TOOL_DESCRIPTIONS).toHaveProperty('Read');
      expect(TOOL_DESCRIPTIONS).toHaveProperty('Write');
      expect(TOOL_DESCRIPTIONS).toHaveProperty('Edit');
      expect(TOOL_DESCRIPTIONS).toHaveProperty('MultiEdit');
    });

    test('should contain search tools', () => {
      expect(TOOL_DESCRIPTIONS).toHaveProperty('Grep');
      expect(TOOL_DESCRIPTIONS).toHaveProperty('Glob');
    });

    test('should contain execution tools', () => {
      expect(TOOL_DESCRIPTIONS).toHaveProperty('Bash');
      expect(TOOL_DESCRIPTIONS).toHaveProperty('BashOutput');
      expect(TOOL_DESCRIPTIONS).toHaveProperty('KillShell');
    });

    test('should contain web tools', () => {
      expect(TOOL_DESCRIPTIONS).toHaveProperty('WebFetch');
      expect(TOOL_DESCRIPTIONS).toHaveProperty('WebSearch');
    });

    test('should contain agent tools', () => {
      expect(TOOL_DESCRIPTIONS).toHaveProperty('Task');
      expect(TOOL_DESCRIPTIONS).toHaveProperty('SlashCommand');
    });

    test('should contain default fallback', () => {
      expect(TOOL_DESCRIPTIONS).toHaveProperty('default');
      expect(TOOL_DESCRIPTIONS.default).toBe('Tool for agent operations and automation');
    });

    test('all descriptions should be strings', () => {
      Object.values(TOOL_DESCRIPTIONS).forEach(description => {
        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(0);
      });
    });

    test('descriptions should be descriptive (>20 chars)', () => {
      Object.entries(TOOL_DESCRIPTIONS).forEach(([key, description]) => {
        if (key !== 'default') {
          expect(description.length).toBeGreaterThan(20);
        }
      });
    });
  });

  describe('getToolDescription() Function', () => {
    describe('Exact Matches', () => {
      test('should return description for "Read"', () => {
        const description = getToolDescription('Read');
        expect(description).toBe('Read files from the filesystem to access and analyze code, documentation, and data');
      });

      test('should return description for "Write"', () => {
        const description = getToolDescription('Write');
        expect(description).toBe('Create and modify files to implement features, fix bugs, and update documentation');
      });

      test('should return description for "Bash"', () => {
        const description = getToolDescription('Bash');
        expect(description).toBe('Execute terminal commands for git operations, package management, and system tasks');
      });

      test('should return description for "Task"', () => {
        const description = getToolDescription('Task');
        expect(description).toBe('Launch specialized AI agents to handle complex, multi-step tasks autonomously');
      });

      test('should return description for "Grep"', () => {
        const description = getToolDescription('Grep');
        expect(description).toBe('Search file contents using powerful regex patterns to find code and text');
      });
    });

    describe('MCP Tool Matches', () => {
      test('should return description for exact MCP tool', () => {
        const description = getToolDescription('mcp__flow-nexus__swarm_init');
        expect(description).toBe('Initialize multi-agent swarm with specified topology');
      });

      test('should return description for exact MCP tool', () => {
        const description = getToolDescription('mcp__flow-nexus__agent_spawn');
        expect(description).toBe('Create specialized AI agent in swarm');
      });

      test('should return wildcard description for unmapped MCP tool', () => {
        const description = getToolDescription('mcp__flow-nexus__some_new_function');
        expect(description).toBe('Access Flow Nexus distributed computing and swarm coordination');
      });

      test('should handle ruv-swarm MCP tools', () => {
        const description = getToolDescription('mcp__ruv-swarm__swarm_init');
        expect(description).toBe('Initialize swarm with mesh, hierarchical, ring, or star topology');
      });
    });

    describe('Wildcard Matching', () => {
      test('should match wildcard patterns', () => {
        const description = getToolDescription('mcp__flow-nexus__*');
        expect(description).toBe('Access Flow Nexus distributed computing and swarm coordination');
      });

      test('should fall back to wildcard for unknown specific tool', () => {
        const description = getToolDescription('mcp__flow-nexus__unknown_tool');
        expect(description).toBe('Access Flow Nexus distributed computing and swarm coordination');
      });

      test('should handle claude-flow wildcard', () => {
        const description = getToolDescription('mcp__claude-flow__custom_function');
        expect(description).toBe('Access Claude Flow swarm coordination and memory');
      });
    });

    describe('Fallback Behavior', () => {
      test('should return default for completely unknown tool', () => {
        const description = getToolDescription('UnknownTool123');
        expect(description).toBe('Tool for agent operations and automation');
      });

      test('should return default for empty string', () => {
        const description = getToolDescription('');
        expect(description).toBe('Tool for agent operations and automation');
      });

      test('should handle undefined gracefully', () => {
        const description = getToolDescription(undefined as any);
        expect(description).toBe('Tool for agent operations and automation');
      });

      test('should handle null gracefully', () => {
        const description = getToolDescription(null as any);
        expect(description).toBe('Tool for agent operations and automation');
      });
    });

    describe('Case Sensitivity', () => {
      test('should be case-sensitive for exact matches', () => {
        const readUpper = getToolDescription('Read');
        const readLower = getToolDescription('read');

        expect(readUpper).toBe('Read files from the filesystem to access and analyze code, documentation, and data');
        expect(readLower).toBe('Tool for agent operations and automation'); // Falls back to default
      });
    });

    describe('Special Characters', () => {
      test('should handle underscores in tool names', () => {
        const description = getToolDescription('mcp__ide__getDiagnostics');
        expect(description).toBe('Get language diagnostics from VS Code IDE');
      });

      test('should handle dashes in tool names', () => {
        const description = getToolDescription('mcp__flow-nexus__swarm_init');
        expect(description).toBeDefined();
        expect(typeof description).toBe('string');
      });

      test('should handle asterisks in wildcard patterns', () => {
        const description = getToolDescription('mcp__firecrawl__*');
        expect(description).toBe('Access Firecrawl web scraping and crawling capabilities');
      });
    });

    describe('Description Quality', () => {
      test('all returned descriptions should be non-empty strings', () => {
        const tools = ['Read', 'Write', 'Edit', 'Bash', 'Task', 'UnknownTool'];

        tools.forEach(tool => {
          const description = getToolDescription(tool);
          expect(typeof description).toBe('string');
          expect(description.length).toBeGreaterThan(0);
        });
      });

      test('descriptions should start with capital letter or number', () => {
        const tools = ['Read', 'Write', 'Edit', 'Bash'];

        tools.forEach(tool => {
          const description = getToolDescription(tool);
          expect(description[0]).toMatch(/[A-Z0-9]/);
        });
      });

      test('descriptions should be human-readable', () => {
        const description = getToolDescription('Read');
        expect(description).toContain(' '); // Contains words, not just code
        expect(description.split(' ').length).toBeGreaterThan(3); // Multiple words
      });
    });

    describe('Performance', () => {
      test('should return description quickly', () => {
        const start = performance.now();
        getToolDescription('Read');
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(5); // Very fast lookup
      });

      test('should handle many lookups efficiently', () => {
        const start = performance.now();

        for (let i = 0; i < 1000; i++) {
          getToolDescription('Read');
          getToolDescription('Write');
          getToolDescription('UnknownTool');
        }

        const duration = performance.now() - start;
        expect(duration).toBeLessThan(100); // 1000 lookups in <100ms
      });
    });

    describe('Consistency', () => {
      test('should return same result for same input', () => {
        const description1 = getToolDescription('Read');
        const description2 = getToolDescription('Read');

        expect(description1).toBe(description2);
      });

      test('should not mutate the TOOL_DESCRIPTIONS object', () => {
        const originalRead = TOOL_DESCRIPTIONS['Read'];
        getToolDescription('Read');
        expect(TOOL_DESCRIPTIONS['Read']).toBe(originalRead);
      });
    });
  });

  describe('Coverage of Common Tools', () => {
    const commonTools = [
      'Read', 'Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'LS',
      'Grep', 'Glob',
      'Bash', 'BashOutput', 'KillShell',
      'WebFetch', 'WebSearch',
      'Task', 'SlashCommand', 'TodoWrite'
    ];

    test('should have descriptions for all common tools', () => {
      commonTools.forEach(tool => {
        expect(TOOL_DESCRIPTIONS).toHaveProperty(tool);
        expect(TOOL_DESCRIPTIONS[tool].length).toBeGreaterThan(0);
      });
    });

    test('should return non-default descriptions for common tools', () => {
      commonTools.forEach(tool => {
        const description = getToolDescription(tool);
        expect(description).not.toBe(TOOL_DESCRIPTIONS.default);
      });
    });
  });

  describe('MCP Tools Coverage', () => {
    test('should have descriptions for IDE MCP tools', () => {
      expect(TOOL_DESCRIPTIONS).toHaveProperty('mcp__ide__getDiagnostics');
      expect(TOOL_DESCRIPTIONS).toHaveProperty('mcp__ide__executeCode');
    });

    test('should have wildcard patterns for MCP servers', () => {
      expect(TOOL_DESCRIPTIONS).toHaveProperty('mcp__flow-nexus__*');
      expect(TOOL_DESCRIPTIONS).toHaveProperty('mcp__ruv-swarm__*');
      expect(TOOL_DESCRIPTIONS).toHaveProperty('mcp__firecrawl__*');
      expect(TOOL_DESCRIPTIONS).toHaveProperty('mcp__claude-flow__*');
    });
  });
});
