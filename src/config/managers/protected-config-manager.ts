/**
 * Protected Configuration Manager
 *
 * Manages updates to protected agent configurations with:
 * - System privilege verification
 * - Automatic backups before updates
 * - Version management
 * - Atomic writes (temp file + rename)
 * - Rollback capability
 *
 * Security:
 * - Only system admins can update protected configs
 * - All changes are audited
 * - Automatic backups enable rollback
 * - Atomic writes prevent partial updates
 *
 * @module protected-config-manager
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import crypto from 'crypto';
import { PrivilegeChecker } from '../utils/privilege-checker.js';
import { SecurityError, PermissionError } from '../errors/security-errors.js';

/**
 * Protected configuration interface
 */
export interface ProtectedConfig {
  version: string;
  agent_id: string;
  checksum: string;
  permissions?: Record<string, any>;
  _metadata?: {
    created_at?: string;
    updated_at?: string;
    updated_by?: string;
    previous_version?: string;
  };
}

/**
 * Config version for history tracking
 */
export interface ConfigVersion {
  version: string;
  timestamp: string;
  path: string;
  updatedBy?: string;
}

/**
 * Manager options
 */
export interface ManagerOptions {
  agentDirectory?: string;
  backupDirectory?: string;
  systemDirectory?: string;
}

/**
 * Protected Configuration Manager
 */
export class ProtectedConfigManager {
  private agentDirectory: string;
  private backupDirectory: string;
  private systemDirectory: string;

  constructor(options: ManagerOptions = {}) {
    this.agentDirectory = options.agentDirectory || '/workspaces/agent-feed/.claude/agents';
    this.backupDirectory = options.backupDirectory || '/workspaces/agent-feed/prod/backups/protected-configs';
    this.systemDirectory = options.systemDirectory || path.join(this.agentDirectory, '.system');
  }

  /**
   * Update protected configuration (admin only)
   */
  async updateProtectedConfig(
    agentName: string,
    updates: Partial<ProtectedConfig>
  ): Promise<ProtectedConfig> {
    // 1. Verify system privileges
    if (!this.hasSystemPrivileges()) {
      throw new PermissionError(
        'Unauthorized: System privileges required to update protected configurations',
        'SYSTEM_ADMIN'
      );
    }

    // 2. Load current protected config
    const currentPath = this.getProtectedConfigPath(agentName);
    let current: ProtectedConfig;

    try {
      const currentContent = await fs.readFile(currentPath, 'utf-8');
      current = yaml.load(currentContent) as ProtectedConfig;
    } catch (error) {
      throw new SecurityError(
        `Failed to load current protected config: ${agentName}`,
        { agentName, error: (error as Error).message }
      );
    }

    // 3. Backup before modification
    await this.backupProtectedConfig(agentName, current);

    // 4. Apply updates
    const updated: ProtectedConfig = {
      ...current,
      ...updates,
      version: this.incrementVersion(current.version),
      _metadata: {
        ...current._metadata,
        updated_at: new Date().toISOString(),
        updated_by: process.env.USER || 'system',
        previous_version: current.version,
      },
    };

    // 5. Compute new integrity checksum
    const withChecksum = this.updateChecksum(updated);

    // 6. Write atomically (temp file + rename)
    await this.writeProtectedConfig(agentName, withChecksum);

    // 7. Log the update
    this.logUpdate(agentName, withChecksum.version, current.version);

    return withChecksum;
  }

  /**
   * Check if current process has system privileges
   */
  hasSystemPrivileges(): boolean {
    return PrivilegeChecker.isSystemAdmin();
  }

  /**
   * Backup protected configuration with timestamp
   */
  async backupProtectedConfig(
    agentName: string,
    config: ProtectedConfig
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.backupDirectory, agentName);
    const backupPath = path.join(
      backupDir,
      `${timestamp}_v${config.version}.protected.yaml`
    );

    // Create backup directory
    await fs.mkdir(backupDir, { recursive: true });

    // Write backup
    await fs.writeFile(backupPath, yaml.dump(config));

    console.log(`[ProtectedConfigManager] Backed up ${agentName} to ${backupPath}`);

    return backupPath;
  }

  /**
   * Write protected config atomically (temp + rename)
   */
  async writeProtectedConfig(
    agentName: string,
    config: ProtectedConfig
  ): Promise<void> {
    const configPath = this.getProtectedConfigPath(agentName);
    const tempPath = `${configPath}.tmp.${Date.now()}`;

    try {
      // 1. Write to temp file
      await fs.writeFile(tempPath, yaml.dump(config), { mode: 0o644 });

      // 2. Atomic rename
      await fs.rename(tempPath, configPath);

      // 3. Set read-only permissions (444)
      await fs.chmod(configPath, 0o444);

      console.log(`[ProtectedConfigManager] Wrote protected config: ${configPath}`);
    } catch (error) {
      // Clean up temp file on failure
      try {
        await fs.unlink(tempPath);
      } catch {}

      throw new SecurityError(
        `Failed to write protected config: ${agentName}`,
        { agentName, error: (error as Error).message }
      );
    }
  }

  /**
   * Rollback to previous version
   */
  async rollbackProtectedConfig(
    agentName: string,
    version?: string
  ): Promise<void> {
    // Verify privileges
    if (!this.hasSystemPrivileges()) {
      throw new PermissionError(
        'Unauthorized: System privileges required to rollback protected configurations',
        'SYSTEM_ADMIN'
      );
    }

    // Find backup to restore
    const backup = version
      ? await this.findBackupByVersion(agentName, version)
      : await this.getLatestBackup(agentName);

    if (!backup) {
      throw new Error(
        `No backup found for ${agentName}${version ? ` version ${version}` : ''}`
      );
    }

    // Load backup config
    const backupContent = await fs.readFile(backup.path, 'utf-8');
    const config = yaml.load(backupContent) as ProtectedConfig;

    // Write restored config
    await this.writeProtectedConfig(agentName, config);

    console.log(`[ProtectedConfigManager] Rolled back ${agentName} to version ${config.version}`);
  }

  /**
   * Get update history for an agent
   */
  async getUpdateHistory(agentName: string): Promise<ConfigVersion[]> {
    const backupDir = path.join(this.backupDirectory, agentName);

    try {
      const files = await fs.readdir(backupDir);
      const versions: ConfigVersion[] = [];

      for (const file of files) {
        if (!file.endsWith('.protected.yaml')) continue;

        const filePath = path.join(backupDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const config = yaml.load(content) as ProtectedConfig;

        versions.push({
          version: config.version,
          timestamp: config._metadata?.updated_at || '',
          path: filePath,
          updatedBy: config._metadata?.updated_by,
        });
      }

      // Sort by timestamp (newest first)
      return versions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch (error) {
      // Directory might not exist yet
      return [];
    }
  }

  /**
   * Get protected config path
   */
  private getProtectedConfigPath(agentName: string): string {
    return path.join(this.systemDirectory, `${agentName}.protected.yaml`);
  }

  /**
   * Increment semantic version
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const major = parseInt(parts[0] || '1', 10);
    const minor = parseInt(parts[1] || '0', 10);
    const patch = parseInt(parts[2] || '0', 10);

    // Increment patch version
    return `${major}.${minor}.${patch + 1}`;
  }

  /**
   * Update checksum in config
   */
  private updateChecksum(config: ProtectedConfig): ProtectedConfig {
    const configCopy = { ...config };
    delete configCopy.checksum;

    const checksum = this.computeChecksum(configCopy);

    return {
      ...config,
      checksum: `sha256:${checksum}`,
    };
  }

  /**
   * Compute SHA-256 checksum
   */
  private computeChecksum(config: any): string {
    // Normalize config for deterministic hashing
    const normalized = this.sortObjectKeys(config);
    const content = JSON.stringify(normalized);

    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Sort object keys recursively for deterministic hashing
   */
  private sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }

    const sorted: any = {};
    Object.keys(obj)
      .sort()
      .forEach(key => {
        sorted[key] = this.sortObjectKeys(obj[key]);
      });

    return sorted;
  }

  /**
   * Get latest backup
   */
  private async getLatestBackup(
    agentName: string
  ): Promise<{ path: string; version: string } | null> {
    const history = await this.getUpdateHistory(agentName);
    return history.length > 0
      ? { path: history[0].path, version: history[0].version }
      : null;
  }

  /**
   * Find backup by version
   */
  private async findBackupByVersion(
    agentName: string,
    version: string
  ): Promise<{ path: string; version: string } | null> {
    const history = await this.getUpdateHistory(agentName);
    const backup = history.find(h => h.version === version);
    return backup ? { path: backup.path, version: backup.version } : null;
  }

  /**
   * Log update action
   */
  private logUpdate(agentName: string, newVersion: string, oldVersion: string): void {
    console.log(
      `[ProtectedConfigManager] Updated ${agentName}: ${oldVersion} → ${newVersion}`
    );
  }
}
