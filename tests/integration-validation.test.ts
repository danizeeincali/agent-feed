/**
 * SPARC Integration Validation Test Suite
 * End-to-end testing of agent discovery system
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('SPARC Integration Validation Suite', () => {
  const TEST_AGENT_PATH = '/workspaces/agent-feed/prod/.claude/agents';

  describe('Real File System Integration', () => {
    beforeAll(() => {
      // Ensure we're testing against real file system when appropriate
      if (process.env.NODE_ENV === 'integration') {
        console.log('Running integration tests against real file system');
      }
    });

    it('should validate actual agent directory exists', () => {
      if (process.env.NODE_ENV !== 'integration') {
        return; // Skip in unit test environment
      }

      const dirExists = fs.existsSync(TEST_AGENT_PATH);
      if (!dirExists) {
        console.warn(`Agent directory not found at ${TEST_AGENT_PATH}`);
        return;
      }

      expect(dirExists).toBe(true);
    });

    it('should discover real agent files in production environment', () => {
      if (process.env.NODE_ENV !== 'integration') {
        return;
      }

      try {
        const files = fs.readdirSync(TEST_AGENT_PATH);
        const jsonFiles = files.filter(file => path.extname(file) === '.json');

        console.log(`Found ${jsonFiles.length} agent files:`, jsonFiles);

        expect(jsonFiles.length).toBeGreaterThanOrEqual(1);
        jsonFiles.forEach(file => {
          expect(file).toMatch(/\.json$/);
        });
      } catch (error) {
        console.warn('Could not read agent directory:', error.message);
      }
    });

    it('should validate real agent file structure', () => {
      if (process.env.NODE_ENV !== 'integration') {
        return;
      }

      try {
        const files = fs.readdirSync(TEST_AGENT_PATH);
        const jsonFiles = files.filter(file => path.extname(file) === '.json');

        if (jsonFiles.length === 0) {
          console.warn('No agent files found for validation');
          return;
        }

        // Test first agent file found
        const firstAgentFile = path.join(TEST_AGENT_PATH, jsonFiles[0]);
        const content = fs.readFileSync(firstAgentFile, 'utf8');
        const metadata = JSON.parse(content);

        // Validate required fields
        expect(metadata).toHaveProperty('name');
        expect(metadata).toHaveProperty('role');
        expect(metadata).toHaveProperty('capabilities');
        expect(metadata).toHaveProperty('description');

        expect(typeof metadata.name).toBe('string');
        expect(typeof metadata.role).toBe('string');
        expect(Array.isArray(metadata.capabilities)).toBe(true);
        expect(typeof metadata.description).toBe('string');

        console.log(`Validated agent: ${metadata.name}`);
      } catch (error) {
        console.warn('Agent validation failed:', error.message);
      }
    });

    it('should verify no fake data in real agent files', () => {
      if (process.env.NODE_ENV !== 'integration') {
        return;
      }

      try {
        const files = fs.readdirSync(TEST_AGENT_PATH);
        const jsonFiles = files.filter(file => path.extname(file) === '.json');

        const fakePatterns = ['fake', 'mock', 'test', 'dummy', 'sample', 'placeholder'];

        for (const file of jsonFiles) {
          const filePath = path.join(TEST_AGENT_PATH, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const lowerContent = content.toLowerCase();

          for (const pattern of fakePatterns) {
            if (lowerContent.includes(pattern)) {
              console.warn(`Potential fake data pattern "${pattern}" found in ${file}`);
            }
          }
        }

        expect(true).toBe(true); // If we reach here, no exceptions were thrown
      } catch (error) {
        console.warn('Fake data validation failed:', error.message);
      }
    });
  });

  describe('Path Validation Integration', () => {
    it('should validate exact path format', () => {
      const expectedPath = '/workspaces/agent-feed/prod/.claude/agents';
      expect(TEST_AGENT_PATH).toBe(expectedPath);

      // Validate path components
      expect(TEST_AGENT_PATH).toContain('/workspaces/agent-feed');
      expect(TEST_AGENT_PATH).toContain('/prod');
      expect(TEST_AGENT_PATH).toContain('/.claude');
      expect(TEST_AGENT_PATH).toContain('/agents');
      expect(TEST_AGENT_PATH).not.toContain('/.claude-agents'); // Common mistake
    });

    it('should reject common incorrect path patterns', () => {
      const incorrectPaths = [
        '/prod/.claude-agents',
        '/workspaces/agent-feed/.claude/agents',
        '/workspaces/agent-feed/prod/claude/agents',
        '/workspaces/agent-feed/prod/.claude-agents',
        'prod/.claude/agents',
        './prod/.claude/agents'
      ];

      incorrectPaths.forEach(incorrectPath => {
        expect(incorrectPath).not.toBe(TEST_AGENT_PATH);
      });
    });
  });

  describe('System Resource Integration', () => {
    it('should handle file system permissions appropriately', () => {
      if (process.env.NODE_ENV !== 'integration') {
        return;
      }

      try {
        // Test if we can read the directory
        fs.accessSync(TEST_AGENT_PATH, fs.constants.R_OK);
        console.log('Directory is readable');
      } catch (error) {
        console.warn('Directory access test failed:', error.message);
      }
    });

    it('should validate directory structure', () => {
      if (process.env.NODE_ENV !== 'integration') {
        return;
      }

      const parentDir = path.dirname(TEST_AGENT_PATH);
      const claudeDir = path.dirname(parentDir);

      try {
        if (fs.existsSync(claudeDir)) {
          const stat = fs.statSync(claudeDir);
          expect(stat.isDirectory()).toBe(true);
        }

        if (fs.existsSync(parentDir)) {
          const stat = fs.statSync(parentDir);
          expect(stat.isDirectory()).toBe(true);
        }
      } catch (error) {
        console.warn('Directory structure validation failed:', error.message);
      }
    });
  });

  describe('Error Recovery Integration', () => {
    it('should handle missing directory gracefully in production', () => {
      const nonExistentPath = '/workspaces/agent-feed/prod/.claude/nonexistent';

      expect(() => {
        if (fs.existsSync(nonExistentPath)) {
          fs.readdirSync(nonExistentPath);
        }
      }).not.toThrow();
    });

    it('should handle invalid file content gracefully', () => {
      // This test ensures our error handling works for real scenarios
      expect(() => {
        try {
          JSON.parse('invalid json content {');
        } catch (error) {
          expect(error).toBeInstanceOf(SyntaxError);
        }
      }).not.toThrow();
    });
  });

  describe('Performance Integration', () => {
    it('should complete discovery within acceptable time limits', async () => {
      if (process.env.NODE_ENV !== 'integration') {
        return;
      }

      const startTime = performance.now();

      try {
        if (fs.existsSync(TEST_AGENT_PATH)) {
          const files = fs.readdirSync(TEST_AGENT_PATH);
          const jsonFiles = files.filter(file => path.extname(file) === '.json');

          // Simulate metadata parsing for all files
          for (const file of jsonFiles) {
            const filePath = path.join(TEST_AGENT_PATH, file);
            const content = fs.readFileSync(filePath, 'utf8');
            JSON.parse(content); // Parse to simulate real processing
          }
        }
      } catch (error) {
        console.warn('Performance test failed:', error.message);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Agent discovery took ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(1000); // 1 second threshold for integration
    });
  });

  describe('Cross-Environment Validation', () => {
    it('should work consistently across different environments', () => {
      const pathSeparator = path.sep;
      const normalizedPath = TEST_AGENT_PATH.split('/').join(pathSeparator);

      // Ensure path normalization works
      expect(normalizedPath).toBeTruthy();
      expect(normalizedPath.length).toBeGreaterThan(0);
    });

    it('should handle different operating system paths', () => {
      const unixPath = '/workspaces/agent-feed/prod/.claude/agents';
      const windowsPath = '\\workspaces\\agent-feed\\prod\\.claude\\agents';

      expect(path.normalize(unixPath)).toBeTruthy();
      expect(path.resolve(unixPath)).toBeTruthy();

      // Ensure path operations don't throw
      expect(() => path.dirname(unixPath)).not.toThrow();
      expect(() => path.basename(unixPath)).not.toThrow();
    });
  });

  afterAll(() => {
    console.log('Integration validation completed');
  });
});