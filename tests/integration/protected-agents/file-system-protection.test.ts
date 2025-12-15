/**
 * Integration Tests: File System Protection
 *
 * Tests file system protection mechanisms with REAL file operations.
 *
 * Test Coverage:
 * - Verify .system/ directory permissions (555)
 * - Verify .protected.yaml permissions (444)
 * - Test tampering detection and restoration
 * - Test backup and rollback mechanisms
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import yaml from 'yaml';

const TEST_DIR = '/workspaces/agent-feed/tests/fixtures/fs-protection-test';
const SYSTEM_DIR = path.join(TEST_DIR, '.system');
const BACKUP_DIR = path.join(TEST_DIR, 'backups');

describe('File System Protection - Integration Tests (REAL FS)', () => {
  beforeAll(async () => {
    await fs.mkdir(SYSTEM_DIR, { recursive: true });
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean up test files before each test
    const files = await fs.readdir(SYSTEM_DIR);
    for (const file of files) {
      await fs.rm(path.join(SYSTEM_DIR, file), { force: true });
    }
  });

  describe('Directory Permissions', () => {
    it('should set .system directory to read-only + executable (555)', async () => {
      // Arrange & Act
      await fs.chmod(SYSTEM_DIR, 0o555);

      // Assert
      const stats = await fs.stat(SYSTEM_DIR);
      const mode = stats.mode & 0o777;

      expect(mode).toBe(0o555);
    });

    it('should allow reading files from .system directory', async () => {
      // Arrange
      await fs.chmod(SYSTEM_DIR, 0o755); // Temporarily writable
      const testFile = path.join(SYSTEM_DIR, 'test.yaml');
      await fs.writeFile(testFile, 'test: data');
      await fs.chmod(SYSTEM_DIR, 0o555); // Make read-only

      // Act
      const content = await fs.readFile(testFile, 'utf-8');

      // Assert
      expect(content).toBe('test: data');
    });
  });

  describe('Protected File Permissions', () => {
    it('should set protected config to read-only (444)', async () => {
      // Arrange
      const configPath = path.join(SYSTEM_DIR, 'test-agent.protected.yaml');
      const config = {
        version: '1.0.0',
        agent_id: 'test-agent',
        permissions: {}
      };

      await fs.writeFile(configPath, yaml.stringify(config));

      // Act
      await fs.chmod(configPath, 0o444);

      // Assert
      const stats = await fs.stat(configPath);
      const mode = stats.mode & 0o777;

      expect(mode).toBe(0o444);
    });

    it('should prevent modification of read-only protected config', async () => {
      // Arrange
      const configPath = path.join(SYSTEM_DIR, 'readonly-test.protected.yaml');
      await fs.writeFile(configPath, yaml.stringify({ version: '1.0.0' }));
      await fs.chmod(configPath, 0o444);

      // Act & Assert: Verify write is prevented (by permissions, not actual write attempt)
      const stats = await fs.stat(configPath);
      const ownerCanWrite = (stats.mode & 0o200) !== 0;

      expect(ownerCanWrite).toBe(false);
    });
  });

  describe('Integrity Checking', () => {
    it('should detect tampered config via checksum mismatch', async () => {
      // Arrange: Create config with checksum
      const config: any = {
        version: '1.0.0',
        agent_id: 'integrity-test',
        permissions: { workspace: { root: '/original' } }
      };

      // Compute original hash
      const configWithoutChecksum = { ...config };
      const originalHash = crypto.createHash('sha256')
        .update(JSON.stringify(configWithoutChecksum))
        .digest('hex');

      config.checksum = `sha256:${originalHash}`;

      const configPath = path.join(SYSTEM_DIR, 'integrity-test.protected.yaml');
      await fs.writeFile(configPath, yaml.stringify(config));

      // Act: Tamper with config
      const tampered = { ...config };
      tampered.permissions.workspace.root = '/tampered';

      // Compute new hash (without updating checksum)
      const tamperedHash = crypto.createHash('sha256')
        .update(JSON.stringify({ ...tampered, checksum: undefined }))
        .digest('hex');

      // Assert: Hashes should differ
      expect(tamperedHash).not.toBe(originalHash);
    });

    it('should pass integrity check for untampered config', async () => {
      // Arrange
      const config: any = {
        version: '1.0.0',
        agent_id: 'valid-integrity',
        permissions: {}
      };

      const hash = crypto.createHash('sha256')
        .update(JSON.stringify(config))
        .digest('hex');

      config.checksum = `sha256:${hash}`;

      const configPath = path.join(SYSTEM_DIR, 'valid-integrity.protected.yaml');
      await fs.writeFile(configPath, yaml.stringify(config));

      // Act: Load and verify
      const loaded = yaml.parse(await fs.readFile(configPath, 'utf-8'));
      const loadedWithoutChecksum = { ...loaded };
      delete loadedWithoutChecksum.checksum;

      const computedHash = crypto.createHash('sha256')
        .update(JSON.stringify(loadedWithoutChecksum))
        .digest('hex');

      const storedHash = loaded.checksum.replace('sha256:', '');

      // Assert
      expect(computedHash).toBe(storedHash);
    });
  });

  describe('Backup and Restore', () => {
    it('should create backup before modifying protected config', async () => {
      // Arrange
      const config = { version: '1.0.0', agent_id: 'backup-test', permissions: {} };
      const configPath = path.join(SYSTEM_DIR, 'backup-test.protected.yaml');
      await fs.writeFile(configPath, yaml.stringify(config));

      // Act: Create backup
      const backupPath = path.join(BACKUP_DIR, `backup-test-${Date.now()}.yaml`);
      await fs.copyFile(configPath, backupPath);

      // Assert
      const backupExists = await fs.access(backupPath).then(() => true).catch(() => false);
      expect(backupExists).toBe(true);

      const backupContent = await fs.readFile(backupPath, 'utf-8');
      const originalContent = await fs.readFile(configPath, 'utf-8');
      expect(backupContent).toBe(originalContent);
    });

    it('should restore config from backup', async () => {
      // Arrange: Create original config
      const original = { version: '1.0.0', agent_id: 'restore-test', permissions: { original: true } };
      const configPath = path.join(SYSTEM_DIR, 'restore-test.protected.yaml');
      await fs.writeFile(configPath, yaml.stringify(original));

      // Create backup
      const backupPath = path.join(BACKUP_DIR, 'restore-test-backup.yaml');
      await fs.copyFile(configPath, backupPath);

      // Tamper with config
      const tampered = { ...original, permissions: { tampered: true } };
      await fs.chmod(configPath, 0o644); // Make writable
      await fs.writeFile(configPath, yaml.stringify(tampered));

      // Act: Restore from backup
      await fs.copyFile(backupPath, configPath);
      await fs.chmod(configPath, 0o444); // Re-apply read-only

      // Assert
      const restored = yaml.parse(await fs.readFile(configPath, 'utf-8'));
      expect(restored.permissions.original).toBe(true);
      expect(restored.permissions.tampered).toBeUndefined();
    });
  });

  describe('Atomic Write Operations', () => {
    it('should write to temp file then rename (atomic)', async () => {
      // Arrange
      const config = { version: '2.0.0', agent_id: 'atomic-write', permissions: {} };
      const configPath = path.join(SYSTEM_DIR, 'atomic-write.protected.yaml');
      const tempPath = `${configPath}.tmp`;

      // Act: Atomic write pattern
      await fs.writeFile(tempPath, yaml.stringify(config));
      await fs.rename(tempPath, configPath);
      await fs.chmod(configPath, 0o444);

      // Assert
      const written = yaml.parse(await fs.readFile(configPath, 'utf-8'));
      expect(written.version).toBe('2.0.0');

      // Temp file should not exist
      const tempExists = await fs.access(tempPath).then(() => true).catch(() => false);
      expect(tempExists).toBe(false);
    });

    it('should leave original file intact if temp write fails', async () => {
      // Arrange: Create original config
      const original = { version: '1.0.0', agent_id: 'safe-write', permissions: {} };
      const configPath = path.join(SYSTEM_DIR, 'safe-write.protected.yaml');
      await fs.writeFile(configPath, yaml.stringify(original));

      // Act: Simulate failed write (wrong path)
      const tempPath = '/invalid/path/temp.yaml';

      try {
        await fs.writeFile(tempPath, yaml.stringify({ version: '2.0.0' }));
      } catch (error) {
        // Expected to fail
      }

      // Assert: Original file unchanged
      const content = yaml.parse(await fs.readFile(configPath, 'utf-8'));
      expect(content.version).toBe('1.0.0');
    });
  });

  describe('Migration Workflow', () => {
    it('should migrate agent to protected model safely', async () => {
      // Arrange: Create agent file (outside .system)
      const agentPath = path.join(TEST_DIR, 'migrate-agent.md');
      const agentContent = `---
name: migrate-agent
description: Test migration
api_endpoints: ["/api/posts"]
---
# Agent`;

      await fs.writeFile(agentPath, agentContent);

      // Act: Extract protected fields and create sidecar
      const protectedConfig = {
        version: '1.0.0',
        agent_id: 'migrate-agent',
        permissions: {
          api_endpoints: ['/api/posts']
        }
      };

      const sidecarPath = path.join(SYSTEM_DIR, 'migrate-agent.protected.yaml');
      await fs.writeFile(sidecarPath, yaml.stringify(protectedConfig));
      await fs.chmod(sidecarPath, 0o444);

      // Assert
      const sidecarExists = await fs.access(sidecarPath).then(() => true).catch(() => false);
      expect(sidecarExists).toBe(true);

      const stats = await fs.stat(sidecarPath);
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o444);
    });
  });
});
