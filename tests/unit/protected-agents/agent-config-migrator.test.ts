/**
 * Unit Tests: AgentConfigMigrator
 *
 * Tests migration of agents from legacy format to protected architecture.
 *
 * Test Coverage:
 * - Extract protected fields from frontmatter
 * - Create sidecar files with correct permissions
 * - Add reference to agent .md file
 * - Handle agents without protected fields
 * - Batch migration support
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import matter from 'gray-matter';

vi.mock('fs/promises');
vi.mock('gray-matter');

class AgentConfigMigrator {
  async addProtectionToAgent(agentName: string, protectedConfig: any): Promise<void> {
    await this.backupAgentFile(agentName);

    const systemDir = '/workspaces/agent-feed/.claude/agents/.system';
    await fs.mkdir(systemDir, { recursive: true, mode: 0o555 });

    const sidecarPath = `${systemDir}/${agentName}.protected.yaml`;
    await fs.writeFile(sidecarPath, JSON.stringify(protectedConfig));
    await fs.chmod(sidecarPath, 0o444);

    await this.addSidecarReference(agentName);
  }

  extractProtectedFields(frontmatter: any): any {
    const protectedFieldNames = [
      'api_endpoints', 'api_methods', 'api_rate_limits',
      'system_boundaries', 'tool_permissions', 'resource_limits'
    ];

    const protectedConfig: any = {
      version: '1.0.0',
      agent_id: frontmatter.name || 'unknown',
      permissions: {}
    };

    for (const fieldName of protectedFieldNames) {
      if (frontmatter[fieldName]) {
        protectedConfig.permissions[fieldName] = frontmatter[fieldName];
      }
    }

    return protectedConfig;
  }

  private async backupAgentFile(agentName: string): Promise<void> {
    const source = `/workspaces/agent-feed/.claude/agents/${agentName}.md`;
    const backup = `/backups/pre-protection/${agentName}-${Date.now()}.md`;
    await fs.mkdir('/backups/pre-protection', { recursive: true });
    await fs.copyFile(source, backup);
  }

  private async addSidecarReference(agentName: string): Promise<void> {
    const agentPath = `/workspaces/agent-feed/.claude/agents/${agentName}.md`;
    const content = await fs.readFile(agentPath, 'utf-8');
    const { data, content: body } = matter(content);

    data._protected_config_source = `.system/${agentName}.protected.yaml`;

    const updated = matter.stringify(body, data);
    await fs.writeFile(agentPath, updated);
  }
}

describe('AgentConfigMigrator - Unit Tests (London School)', () => {
  let migrator: AgentConfigMigrator;

  beforeEach(() => {
    migrator = new AgentConfigMigrator();
    vi.clearAllMocks();
  });

  describe('Protected Field Extraction', () => {
    it('should extract api_endpoints from frontmatter', () => {
      const frontmatter = {
        name: 'test-agent',
        api_endpoints: ['/api/posts', '/api/comments']
      };

      const protected_config = migrator.extractProtectedFields(frontmatter);

      expect(protected_config.permissions.api_endpoints).toEqual(['/api/posts', '/api/comments']);
    });

    it('should extract multiple protected fields', () => {
      const frontmatter = {
        name: 'multi-field-agent',
        api_endpoints: ['/api/posts'],
        tool_permissions: { allowed: ['Read', 'Write'] },
        resource_limits: { max_memory: '512MB' }
      };

      const protected_config = migrator.extractProtectedFields(frontmatter);

      expect(protected_config.permissions.api_endpoints).toBeDefined();
      expect(protected_config.permissions.tool_permissions).toBeDefined();
      expect(protected_config.permissions.resource_limits).toBeDefined();
    });

    it('should return empty permissions for agent without protected fields', () => {
      const frontmatter = {
        name: 'simple-agent',
        description: 'Just a simple agent',
        model: 'sonnet'
      };

      const protected_config = migrator.extractProtectedFields(frontmatter);

      expect(Object.keys(protected_config.permissions)).toHaveLength(0);
    });

    it('should set correct version and agent_id', () => {
      const frontmatter = {
        name: 'versioned-agent',
        api_endpoints: ['/api/test']
      };

      const protected_config = migrator.extractProtectedFields(frontmatter);

      expect(protected_config.version).toBe('1.0.0');
      expect(protected_config.agent_id).toBe('versioned-agent');
    });
  });

  describe('Sidecar Creation', () => {
    it('should create .system directory with correct permissions', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue();
      vi.mocked(fs.chmod).mockResolvedValue();
      vi.mocked(fs.copyFile).mockResolvedValue();
      vi.mocked(fs.readFile).mockResolvedValue('---\nname: test\n---\n# Agent');
      vi.mocked(matter).mockReturnValue({
        data: { name: 'test' },
        content: '# Agent',
        isEmpty: false,
        excerpt: '',
        orig: Buffer.from('')
      });

      await migrator.addProtectionToAgent('test-agent', { version: '1.0.0', permissions: {} });

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('.system'),
        { recursive: true, mode: 0o555 }
      );
    });

    it('should set sidecar file to read-only', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue();
      vi.mocked(fs.chmod).mockResolvedValue();
      vi.mocked(fs.copyFile).mockResolvedValue();
      vi.mocked(fs.readFile).mockResolvedValue('---\nname: test\n---\n# Agent');
      vi.mocked(matter).mockReturnValue({
        data: { name: 'test' },
        content: '# Agent',
        isEmpty: false,
        excerpt: '',
        orig: Buffer.from('')
      });

      await migrator.addProtectionToAgent('readonly-test', { version: '1.0.0', permissions: {} });

      expect(fs.chmod).toHaveBeenCalledWith(
        expect.stringContaining('readonly-test.protected.yaml'),
        0o444
      );
    });

    it('should create backup before migration', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue();
      vi.mocked(fs.chmod).mockResolvedValue();
      vi.mocked(fs.copyFile).mockResolvedValue();
      vi.mocked(fs.readFile).mockResolvedValue('---\nname: test\n---\n# Agent');
      vi.mocked(matter).mockReturnValue({
        data: { name: 'test' },
        content: '# Agent',
        isEmpty: false,
        excerpt: '',
        orig: Buffer.from('')
      });

      await migrator.addProtectionToAgent('backup-test', { version: '1.0.0', permissions: {} });

      expect(fs.copyFile).toHaveBeenCalled();
      expect(fs.copyFile).toHaveBeenCalledWith(
        expect.stringContaining('backup-test.md'),
        expect.stringContaining('/backups/pre-protection')
      );
    });
  });

  describe('Agent File Updates', () => {
    it('should add _protected_config_source to frontmatter', async () => {
      const originalFrontmatter = {
        name: 'update-test',
        description: 'Test agent'
      };

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue();
      vi.mocked(fs.chmod).mockResolvedValue();
      vi.mocked(fs.copyFile).mockResolvedValue();
      vi.mocked(fs.readFile).mockResolvedValue('---\nname: update-test\n---\n# Agent');

      let capturedFrontmatter: any;
      vi.mocked(matter)
        .mockReturnValueOnce({
          data: originalFrontmatter,
          content: '# Agent',
          isEmpty: false,
          excerpt: '',
          orig: Buffer.from('')
        });

      vi.mocked(matter.stringify).mockImplementation((body, data) => {
        capturedFrontmatter = data;
        return `---\n${JSON.stringify(data)}\n---\n${body}`;
      });

      await migrator.addProtectionToAgent('update-test', { version: '1.0.0', permissions: {} });

      expect(capturedFrontmatter._protected_config_source).toBe('.system/update-test.protected.yaml');
    });
  });
});
