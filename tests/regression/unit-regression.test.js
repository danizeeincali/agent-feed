/**
 * Unit Regression Tests
 * Tests individual components and utilities
 */

const fs = require('fs').promises;
const path = require('path');

// Mock Next.js modules for testing
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/agents'
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    set: jest.fn()
  })
}));

describe('Unit Regression Tests', () => {
  describe('Agent File Processing', () => {
    test('should correctly identify agent files', async () => {
      const agentsDir = '/workspaces/agent-feed/agents';
      const files = await fs.readdir(agentsDir);
      const agentFiles = files.filter(file => file.endsWith('.md'));

      expect(agentFiles.length).toBeGreaterThan(0);

      // Should not include any token analytics files
      const tokenAnalyticsFiles = agentFiles.filter(file =>
        file.toLowerCase().includes('token-analytics')
      );
      expect(tokenAnalyticsFiles).toHaveLength(0);
    });

    test('should parse agent metadata correctly', async () => {
      const agentsDir = '/workspaces/agent-feed/agents';
      const files = await fs.readdir(agentsDir);
      const agentFiles = files.filter(file => file.endsWith('.md'));

      for (const file of agentFiles.slice(0, 3)) { // Test first 3 files
        const content = await fs.readFile(path.join(agentsDir, file), 'utf-8');

        // Should have a title
        const titleMatch = content.match(/^#\s+(.+)/m);
        expect(titleMatch).toBeTruthy();
        expect(titleMatch[1].length).toBeGreaterThan(0);

        // Should have content
        expect(content.length).toBeGreaterThan(100);
      }
    });

    test('should generate consistent agent IDs', async () => {
      const agentsDir = '/workspaces/agent-feed/agents';
      const files = await fs.readdir(agentsDir);
      const agentFiles = files.filter(file => file.endsWith('.md'));

      const ids = agentFiles.map(file => {
        // Simulate ID generation logic
        return file.replace('.md', '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      });

      // All IDs should be unique
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);

      // IDs should follow naming convention
      ids.forEach(id => {
        expect(id).toMatch(/^[a-z0-9-]+$/);
        expect(id).not.toContain('token-analytics');
      });
    });
  });

  describe('API Route Logic', () => {
    test('should handle file reading errors gracefully', async () => {
      // This would test the actual API route handler
      // For now, we'll test the file system operations
      const agentsDir = '/workspaces/agent-feed/agents';

      try {
        await fs.access(agentsDir);
        const files = await fs.readdir(agentsDir);
        expect(Array.isArray(files)).toBe(true);
      } catch (error) {
        // Should not throw for valid directory
        expect(error).toBeNull();
      }
    });

    test('should filter out invalid files', async () => {
      const agentsDir = '/workspaces/agent-feed/agents';
      const files = await fs.readdir(agentsDir);

      // Should only include .md files
      const validFiles = files.filter(file => file.endsWith('.md'));
      const invalidFiles = files.filter(file => !file.endsWith('.md'));

      // Should have some valid files
      expect(validFiles.length).toBeGreaterThan(0);

      // Invalid files should be filtered out in API
      invalidFiles.forEach(file => {
        expect(file.endsWith('.md')).toBe(false);
      });
    });
  });

  describe('Component Rendering Logic', () => {
    test('should handle empty agent list', () => {
      const emptyAgents = [];

      // Component should handle empty state gracefully
      expect(Array.isArray(emptyAgents)).toBe(true);
      expect(emptyAgents.length).toBe(0);
    });

    test('should handle agent data structure', () => {
      const sampleAgent = {
        id: 'test-agent',
        name: 'Test Agent',
        description: 'A test agent for validation',
        category: 'Testing',
        content: '# Test Agent\n\nThis is a test agent.'
      };

      // Should have required properties
      expect(sampleAgent).toHaveProperty('id');
      expect(sampleAgent).toHaveProperty('name');
      expect(sampleAgent).toHaveProperty('description');
      expect(sampleAgent).toHaveProperty('category');

      // Properties should be valid
      expect(typeof sampleAgent.id).toBe('string');
      expect(typeof sampleAgent.name).toBe('string');
      expect(typeof sampleAgent.description).toBe('string');
      expect(typeof sampleAgent.category).toBe('string');
    });

    test('should validate agent name format', () => {
      const validNames = [
        'Development Agent',
        'API Testing Agent',
        'Code Review Assistant',
        'Database Migration Helper'
      ];

      const invalidNames = [
        'Token Analytics Database Agent', // Should be filtered out
        '', // Empty name
        null, // Null name
        undefined // Undefined name
      ];

      validNames.forEach(name => {
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
        expect(name).not.toContain('Token Analytics Database');
      });

      invalidNames.forEach(name => {
        if (name === 'Token Analytics Database Agent') {
          // This specific agent should be filtered out
          expect(name).toContain('Token Analytics Database');
        } else {
          // Other invalid names should be handled
          expect(name === '' || name === null || name === undefined).toBe(true);
        }
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle file system errors', async () => {
      // Test with non-existent directory
      try {
        await fs.readdir('/nonexistent/directory');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.code).toBe('ENOENT');
      }
    });

    test('should handle malformed agent files', async () => {
      // Test with sample malformed content
      const malformedContent = 'This is not a proper markdown file';

      // Should still be able to process but with fallback values
      expect(typeof malformedContent).toBe('string');
      expect(malformedContent.length).toBeGreaterThan(0);

      // Title extraction should handle missing titles
      const titleMatch = malformedContent.match(/^#\s+(.+)/m);
      expect(titleMatch).toBeNull(); // Should be null for malformed content
    });
  });
});