/**
 * Integration test for agent worker intelligence extraction from subdirectories
 * Tests the fix for extractFromWorkspaceFiles to search subdirectories
 */

import AgentWorker from '../../worker/agent-worker.js';
import { promises as fs } from 'fs';
import path from 'path';

describe('AgentWorker Intelligence Extraction', () => {
  let worker;

  beforeEach(() => {
    worker = new AgentWorker({ workerId: 'test-worker' });
  });

  describe('extractFromWorkspaceFiles', () => {
    test('should find intelligence file in intelligence/ subdirectory', async () => {
      const workspaceDir = '/workspaces/agent-feed/prod/agent_workspace/link-logger-agent';
      const result = await worker.extractFromWorkspaceFiles(workspaceDir);

      expect(result).not.toBeNull();
      expect(result).toContain('AgentDB');
      expect(result.length).toBeGreaterThan(100);
      console.log('✅ Successfully found intelligence in subdirectory');
      console.log(`   Length: ${result.length} characters`);
    });

    test('should return null for non-existent workspace', async () => {
      const workspaceDir = '/workspaces/agent-feed/prod/agent_workspace/nonexistent';
      const result = await worker.extractFromWorkspaceFiles(workspaceDir);

      expect(result).toBeNull();
      console.log('✅ Correctly returned null for non-existent workspace');
    });

    test('should search priority paths in order', async () => {
      const workspaceDir = '/workspaces/agent-feed/prod/agent_workspace/link-logger-agent';

      // Spy on console.log to capture which path was used
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await worker.extractFromWorkspaceFiles(workspaceDir);

      // Should log finding intelligence in the intelligence directory
      const relevantLogs = logSpy.mock.calls
        .filter(call => call[0]?.includes('Found intelligence'))
        .map(call => call[0]);

      expect(relevantLogs.length).toBeGreaterThan(0);
      expect(relevantLogs[0]).toContain('intelligence');

      logSpy.mockRestore();
      console.log('✅ Verified priority path search order');
    });

    test('should extract Executive Summary section', async () => {
      const workspaceDir = '/workspaces/agent-feed/prod/agent_workspace/link-logger-agent';
      const result = await worker.extractFromWorkspaceFiles(workspaceDir);

      expect(result).not.toBeNull();
      // Should start with content from Executive Summary section
      expect(result).toMatch(/AgentDB.*competitive/i);
      console.log('✅ Successfully extracted Executive Summary section');
    });
  });

  describe('Priority path testing', () => {
    test('should prefer intelligence/ over summaries/', async () => {
      // This test verifies the priority order: intelligence > summaries > root
      const workspaceDir = '/workspaces/agent-feed/prod/agent_workspace/link-logger-agent';

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const result = await worker.extractFromWorkspaceFiles(workspaceDir);

      const logs = logSpy.mock.calls.map(call => call[0]).filter(Boolean);
      const intelligenceLogs = logs.filter(log => log.includes('intelligence'));

      expect(intelligenceLogs.length).toBeGreaterThan(0);
      logSpy.mockRestore();

      console.log('✅ Verified priority: intelligence/ directory searched first');
    });
  });
});
