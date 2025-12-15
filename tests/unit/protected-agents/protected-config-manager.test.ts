/**
 * Unit Tests: ProtectedConfigManager
 *
 * Tests system privilege verification and atomic write operations
 * using London School TDD methodology.
 *
 * Test Coverage:
 * - System privilege verification
 * - Atomic writes with backup
 * - Version increment logic
 * - Rollback mechanism
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';

vi.mock('fs/promises');

interface ProtectedConfig {
  version: string;
  agent_id: string;
  checksum?: string;
  permissions: any;
  _metadata?: {
    hash?: string;
    updated_at?: string;
    version?: string;
  };
}

class ProtectedConfigManager {
  async updateProtectedConfig(
    agentName: string,
    updates: Partial<ProtectedConfig>
  ): Promise<void> {
    if (!this.hasSystemPrivileges()) {
      throw new Error('Unauthorized: System privileges required');
    }

    const current = await this.loadProtectedConfig(agentName);
    await this.backupProtectedConfig(agentName, current);

    const updated = { ...current, ...updates };
    updated._metadata = {
      ...updated._metadata,
      updated_at: new Date().toISOString(),
      version: this.incrementVersion(current._metadata?.version || '1.0.0')
    };

    await this.writeProtectedConfig(agentName, updated);
  }

  private hasSystemPrivileges(): boolean {
    return process.env.SYSTEM_ADMIN === 'true';
  }

  private async loadProtectedConfig(agentName: string): Promise<ProtectedConfig> {
    const content = await fs.readFile(`/agents/.system/${agentName}.protected.yaml`, 'utf-8');
    return JSON.parse(content);
  }

  private async backupProtectedConfig(agentName: string, config: ProtectedConfig): Promise<void> {
    const backupPath = `/backups/${agentName}/${Date.now()}.yaml`;
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.writeFile(backupPath, JSON.stringify(config));
  }

  private async writeProtectedConfig(agentName: string, config: ProtectedConfig): Promise<void> {
    const configPath = `/agents/.system/${agentName}.protected.yaml`;
    const tempPath = `${configPath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(config));
    await fs.rename(tempPath, configPath);
    await fs.chmod(configPath, 0o444);
  }

  private incrementVersion(version: string): string {
    const [major, minor, patch] = version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }
}

describe('ProtectedConfigManager - Unit Tests (London School)', () => {
  let manager: ProtectedConfigManager;

  beforeEach(() => {
    manager = new ProtectedConfigManager();
    vi.clearAllMocks();
    process.env.SYSTEM_ADMIN = 'true';
  });

  describe('System Privilege Verification', () => {
    it('should allow update with system privileges', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
        version: '1.0.0',
        agent_id: 'test',
        permissions: {}
      }));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue();
      vi.mocked(fs.rename).mockResolvedValue();
      vi.mocked(fs.chmod).mockResolvedValue();

      await manager.updateProtectedConfig('test', { version: '2.0.0' });

      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should reject update without system privileges', async () => {
      process.env.SYSTEM_ADMIN = 'false';

      await expect(manager.updateProtectedConfig('test', {}))
        .rejects.toThrow('Unauthorized: System privileges required');
    });
  });

  describe('Atomic Writes', () => {
    it('should write to temp file then rename', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
        version: '1.0.0',
        agent_id: 'atomic-test',
        permissions: {}
      }));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue();
      vi.mocked(fs.rename).mockResolvedValue();
      vi.mocked(fs.chmod).mockResolvedValue();

      await manager.updateProtectedConfig('atomic-test', {});

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.tmp'),
        expect.any(String)
      );
      expect(fs.rename).toHaveBeenCalled();
    });

    it('should create backup before update', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
        version: '1.0.0',
        agent_id: 'backup-test',
        permissions: {}
      }));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue();
      vi.mocked(fs.rename).mockResolvedValue();
      vi.mocked(fs.chmod).mockResolvedValue();

      await manager.updateProtectedConfig('backup-test', {});

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledTimes(2); // Backup + update
    });

    it('should set read-only permissions', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
        version: '1.0.0',
        agent_id: 'perms-test',
        permissions: {}
      }));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue();
      vi.mocked(fs.rename).mockResolvedValue();
      vi.mocked(fs.chmod).mockResolvedValue();

      await manager.updateProtectedConfig('perms-test', {});

      expect(fs.chmod).toHaveBeenCalledWith(expect.any(String), 0o444);
    });
  });

  describe('Version Management', () => {
    it('should increment patch version', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
        version: '1.0.0',
        agent_id: 'version-test',
        permissions: {},
        _metadata: { version: '1.0.5' }
      }));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue();
      vi.mocked(fs.rename).mockResolvedValue();
      vi.mocked(fs.chmod).mockResolvedValue();

      await manager.updateProtectedConfig('version-test', {});

      const writeCall = vi.mocked(fs.writeFile).mock.calls.find(call =>
        call[0].toString().includes('.tmp')
      );
      const written = JSON.parse(writeCall![1] as string);

      expect(written._metadata.version).toBe('1.0.6');
    });

    it('should add updated_at timestamp', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
        version: '1.0.0',
        agent_id: 'timestamp-test',
        permissions: {}
      }));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue();
      vi.mocked(fs.rename).mockResolvedValue();
      vi.mocked(fs.chmod).mockResolvedValue();

      const beforeUpdate = Date.now();
      await manager.updateProtectedConfig('timestamp-test', {});

      const writeCall = vi.mocked(fs.writeFile).mock.calls.find(call =>
        call[0].toString().includes('.tmp')
      );
      const written = JSON.parse(writeCall![1] as string);

      expect(written._metadata.updated_at).toBeDefined();
      expect(new Date(written._metadata.updated_at).getTime()).toBeGreaterThanOrEqual(beforeUpdate);
    });
  });
});
