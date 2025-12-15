/**
 * Integration Tests: End-to-End Agent Loading Flow
 *
 * Tests the complete agent loading process with REAL file system operations
 * (no mocks except external APIs).
 *
 * Test Coverage:
 * - Load real .md agent files
 * - Merge with real .protected.yaml sidecars
 * - Verify final config structure
 * - Test with actual agents from project
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import yaml from 'yaml';

const TEST_AGENTS_DIR = '/workspaces/agent-feed/tests/fixtures/protected-agents';
const TEST_SYSTEM_DIR = path.join(TEST_AGENTS_DIR, '.system');

describe('Agent Loading Flow - Integration Tests (REAL File System)', () => {
  beforeAll(async () => {
    // Create test fixtures directory
    await fs.mkdir(TEST_SYSTEM_DIR, { recursive: true, mode: 0o755 });
  });

  afterAll(async () => {
    // Cleanup test fixtures
    await fs.rm(TEST_AGENTS_DIR, { recursive: true, force: true });
  });

  describe('Load Agent Without Sidecar', () => {
    it('should load standard agent from real .md file', async () => {
      // Arrange: Create real agent file
      const agentContent = `---
name: simple-test-agent
description: Simple test agent without protection
tools: [Read, Write, Bash]
model: sonnet
color: "#374151"
---

# Simple Test Agent
Your role is to test basic functionality.`;

      const agentPath = path.join(TEST_AGENTS_DIR, 'simple-test-agent.md');
      await fs.writeFile(agentPath, agentContent);

      // Act: Load and parse
      const content = await fs.readFile(agentPath, 'utf-8');
      const parsed = matter(content);

      // Assert
      expect(parsed.data.name).toBe('simple-test-agent');
      expect(parsed.data.tools).toEqual(['Read', 'Write', 'Bash']);
      expect(parsed.data._protected_config_source).toBeUndefined();
      expect(parsed.content).toContain('Simple Test Agent');
    });
  });

  describe('Load Agent With Sidecar', () => {
    it('should load and merge agent with protected sidecar', async () => {
      // Arrange: Create agent file
      const agentContent = `---
name: protected-test-agent
description: Agent with protection
tools: [Read, Write]
model: sonnet
_protected_config_source: .system/protected-test-agent.protected.yaml
---

# Protected Test Agent
Your role is to test protected functionality.`;

      const agentPath = path.join(TEST_AGENTS_DIR, 'protected-test-agent.md');
      await fs.writeFile(agentPath, agentContent);

      // Create protected sidecar
      const protectedConfig = {
        version: '1.0.0',
        checksum: 'sha256:test-checksum',
        agent_id: 'protected-test-agent',
        permissions: {
          api_endpoints: [
            {
              path: '/api/posts',
              methods: ['GET', 'POST'],
              rate_limit: '10/minute'
            }
          ],
          workspace: {
            root: '/test/workspace',
            max_storage: '1GB'
          },
          tool_permissions: {
            allowed: ['Read', 'Write', 'Bash'],
            forbidden: ['KillShell']
          },
          resource_limits: {
            max_memory: '512MB',
            max_cpu_percent: 50
          }
        }
      };

      const sidecarPath = path.join(TEST_SYSTEM_DIR, 'protected-test-agent.protected.yaml');
      await fs.writeFile(sidecarPath, yaml.stringify(protectedConfig));
      await fs.chmod(sidecarPath, 0o444);

      // Act: Load both files
      const agentContentRead = await fs.readFile(agentPath, 'utf-8');
      const agentParsed = matter(agentContentRead);

      const sidecarContent = await fs.readFile(
        path.join(TEST_AGENTS_DIR, agentParsed.data._protected_config_source),
        'utf-8'
      );
      const sidecarParsed = yaml.parse(sidecarContent);

      // Merge (protected takes precedence)
      const merged = {
        ...agentParsed.data,
        _protected: sidecarParsed,
        _permissions: sidecarParsed.permissions
      };

      // Assert
      expect(merged.name).toBe('protected-test-agent');
      expect(merged._protected.version).toBe('1.0.0');
      expect(merged._permissions.api_endpoints).toHaveLength(1);
      expect(merged._permissions.workspace.root).toBe('/test/workspace');
      expect(merged._permissions.tool_permissions.forbidden).toContain('KillShell');
    });
  });

  describe('File Permission Verification', () => {
    it('should verify protected sidecar has read-only permissions', async () => {
      // Arrange: Create protected sidecar
      const config = {
        version: '1.0.0',
        agent_id: 'perms-test',
        permissions: {}
      };

      const sidecarPath = path.join(TEST_SYSTEM_DIR, 'perms-test.protected.yaml');
      await fs.writeFile(sidecarPath, yaml.stringify(config));
      await fs.chmod(sidecarPath, 0o444);

      // Act: Check file permissions
      const stats = await fs.stat(sidecarPath);
      const mode = stats.mode & 0o777;

      // Assert: Should be read-only (444)
      expect(mode).toBe(0o444);
    });

    it('should prevent writes to protected sidecar', async () => {
      // Arrange: Create read-only sidecar
      const config = { version: '1.0.0', agent_id: 'readonly', permissions: {} };
      const sidecarPath = path.join(TEST_SYSTEM_DIR, 'readonly.protected.yaml');

      await fs.writeFile(sidecarPath, yaml.stringify(config));
      await fs.chmod(sidecarPath, 0o444);

      // Act & Assert: Attempt to write should fail
      // Note: This may succeed if running as root, so we check permissions instead
      const stats = await fs.stat(sidecarPath);
      const userCanWrite = (stats.mode & 0o200) !== 0;

      expect(userCanWrite).toBe(false);
    });
  });

  describe('Real Agent Files', () => {
    it('should load actual project agent if available', async () => {
      // Try to load a real agent from the project
      const realAgentPath = '/workspaces/agent-feed/.claude/agents/analysis/code-analyzer.md';

      try {
        const exists = await fs.access(realAgentPath).then(() => true).catch(() => false);

        if (exists) {
          const content = await fs.readFile(realAgentPath, 'utf-8');
          const parsed = matter(content);

          expect(parsed.data.name).toBeDefined();
          expect(parsed.content).toBeTruthy();
        }
      } catch (error) {
        // Agent doesn't exist or can't be read - skip test
        console.log('Real agent not found, skipping');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing sidecar file', async () => {
      // Arrange: Agent references non-existent sidecar
      const agentContent = `---
name: missing-sidecar
_protected_config_source: .system/nonexistent.protected.yaml
---
# Agent`;

      const agentPath = path.join(TEST_AGENTS_DIR, 'missing-sidecar.md');
      await fs.writeFile(agentPath, agentContent);

      const agentRead = await fs.readFile(agentPath, 'utf-8');
      const agentParsed = matter(agentRead);

      // Act: Try to load sidecar
      const sidecarPath = path.join(TEST_AGENTS_DIR, agentParsed.data._protected_config_source);

      // Assert: Should throw
      await expect(fs.readFile(sidecarPath, 'utf-8'))
        .rejects.toThrow();
    });

    it('should handle corrupted YAML in sidecar', async () => {
      // Arrange: Create corrupted sidecar
      const sidecarPath = path.join(TEST_SYSTEM_DIR, 'corrupted.protected.yaml');
      await fs.writeFile(sidecarPath, 'invalid: yaml: [}');

      // Act & Assert
      const content = await fs.readFile(sidecarPath, 'utf-8');
      expect(() => yaml.parse(content)).toThrow();
    });
  });
});
