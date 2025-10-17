/**
 * Tampering Detector
 *
 * Monitors protected agent configurations for unauthorized changes and
 * automatically restores from backups when tampering is detected.
 *
 * Features:
 * - Real-time file watching on .system/ directory
 * - SHA-256 integrity verification
 * - Automatic restoration from backups
 * - Security alerts and logging
 * - Audit trail of tampering events
 *
 * Security Response:
 * 1. Detect unauthorized change via fs.watch
 * 2. Verify integrity with SHA-256
 * 3. If invalid, trigger security alert
 * 4. Restore from latest backup
 * 5. Log incident for audit
 *
 * @module tampering-detector
 */

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import crypto from 'crypto';
import { TamperingError, IntegrityError } from '../errors/security-errors.js';
import { ProtectedConfigManager, ProtectedConfig } from './protected-config-manager.js';

/**
 * Security alert interface
 */
export interface SecurityAlert {
  type: 'TAMPERING_DETECTED' | 'INTEGRITY_FAILED' | 'RESTORED' | 'UNAUTHORIZED_CHANGE';
  filePath: string;
  timestamp: string;
  expectedChecksum?: string;
  actualChecksum?: string;
  restored?: boolean;
  details?: Record<string, any>;
}

/**
 * Detector options
 */
export interface DetectorOptions {
  systemDirectory?: string;
  logDirectory?: string;
  autoRestore?: boolean;
}

/**
 * Tampering Detector
 */
export class TamperingDetector {
  private watcher?: fs.FSWatcher;
  private configManager: ProtectedConfigManager;
  private systemDirectory: string;
  private logDirectory: string;
  private autoRestore: boolean;
  private isMonitoring: boolean = false;

  constructor(options: DetectorOptions = {}) {
    this.systemDirectory = options.systemDirectory || '/workspaces/agent-feed/.claude/agents/.system';
    this.logDirectory = options.logDirectory || '/workspaces/agent-feed/logs';
    this.autoRestore = options.autoRestore !== false; // Default: true
    this.configManager = new ProtectedConfigManager();
  }

  /**
   * Start watching for tampering
   */
  startWatching(): void {
    if (this.isMonitoring) {
      console.log('[TamperingDetector] Already monitoring');
      return;
    }

    try {
      // Watch .system directory for changes
      this.watcher = fs.watch(
        this.systemDirectory,
        { recursive: false },
        (eventType, filename) => {
          if (!filename || !filename.endsWith('.protected.yaml')) {
            return;
          }

          console.log(
            `[TamperingDetector] Protected config change detected: ${eventType} - ${filename}`
          );

          // Handle potentially unauthorized change
          const filePath = path.join(this.systemDirectory, filename);
          this.handleTampering(filePath).catch(error => {
            console.error(
              `[TamperingDetector] Failed to handle tampering: ${error.message}`
            );
          });
        }
      );

      this.isMonitoring = true;
      console.log(`[TamperingDetector] Started monitoring: ${this.systemDirectory}`);
    } catch (error) {
      console.error(`[TamperingDetector] Failed to start watcher: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Stop watching
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
      this.isMonitoring = false;
      console.log('[TamperingDetector] Stopped monitoring');
    }
  }

  /**
   * Handle potential tampering event
   */
  async handleTampering(filePath: string): Promise<void> {
    try {
      // 1. Load modified config
      const content = await fsPromises.readFile(filePath, 'utf-8');
      const config = yaml.load(content) as ProtectedConfig;

      // 2. Verify integrity
      const isValid = this.verifyIntegrity(config);

      if (isValid) {
        console.log(
          `[TamperingDetector] Protected config change authorized (integrity valid): ${filePath}`
        );
        return;
      }

      // 3. TAMPERING DETECTED
      const alert: SecurityAlert = {
        type: 'TAMPERING_DETECTED',
        filePath,
        timestamp: new Date().toISOString(),
        expectedChecksum: config.checksum,
        actualChecksum: this.computeChecksum(config),
        restored: false,
      };

      console.error(`🚨 [TamperingDetector] SECURITY ALERT: Tampering detected: ${filePath}`);

      // 4. Alert security team
      await this.alertSecurityTeam(alert);

      // 5. Restore from backup if enabled
      if (this.autoRestore) {
        await this.restoreFromBackup(filePath);
        alert.restored = true;
        await this.alertSecurityTeam({
          ...alert,
          type: 'RESTORED',
        });
      }
    } catch (error) {
      console.error(
        `[TamperingDetector] Failed to handle tampering: ${(error as Error).message}`
      );

      await this.alertSecurityTeam({
        type: 'UNAUTHORIZED_CHANGE',
        filePath,
        timestamp: new Date().toISOString(),
        details: {
          error: (error as Error).message,
        },
      });
    }
  }

  /**
   * Restore protected config from backup
   */
  async restoreFromBackup(filePath: string): Promise<void> {
    try {
      const agentName = this.extractAgentName(filePath);

      console.log(`[TamperingDetector] Restoring ${agentName} from backup...`);

      // Rollback to latest backup
      await this.configManager.rollbackProtectedConfig(agentName);

      console.log(`[TamperingDetector] Successfully restored ${agentName} from backup`);
    } catch (error) {
      console.error(
        `[TamperingDetector] Failed to restore from backup: ${(error as Error).message}`
      );
      throw error;
    }
  }

  /**
   * Alert security team
   */
  async alertSecurityTeam(alert: SecurityAlert): Promise<void> {
    // Log to console
    console.error('🚨 SECURITY ALERT:', JSON.stringify(alert, null, 2));

    // Write to security log file
    try {
      const logPath = path.join(this.logDirectory, 'security.log');
      await fsPromises.mkdir(this.logDirectory, { recursive: true });

      const logEntry = JSON.stringify({
        ...alert,
        timestamp: new Date().toISOString(),
      }) + '\n';

      await fsPromises.appendFile(logPath, logEntry);
    } catch (error) {
      console.error(
        `[TamperingDetector] Failed to write security log: ${(error as Error).message}`
      );
    }

    // TODO: Implement additional alerting (email, Slack, PagerDuty, etc.)
    // Example:
    // await this.sendEmailAlert(alert);
    // await this.sendSlackAlert(alert);
  }

  /**
   * Verify config integrity using checksum
   */
  private verifyIntegrity(config: ProtectedConfig): boolean {
    const storedChecksum = config.checksum?.replace('sha256:', '');

    if (!storedChecksum) {
      console.warn(`[TamperingDetector] No checksum found in config`);
      return false;
    }

    // Compute checksum (exclude checksum field)
    const configCopy = { ...config };
    delete configCopy.checksum;

    const computedChecksum = this.computeChecksum(configCopy);

    const isValid = storedChecksum === computedChecksum;

    if (!isValid) {
      console.error(`[TamperingDetector] Checksum mismatch:`);
      console.error(`  Expected: ${storedChecksum.substring(0, 16)}...`);
      console.error(`  Got:      ${computedChecksum.substring(0, 16)}...`);
    }

    return isValid;
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
   * Sort object keys recursively
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
   * Extract agent name from file path
   */
  private extractAgentName(filePath: string): string {
    const filename = path.basename(filePath, '.protected.yaml');
    return filename;
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    monitoring: boolean;
    directory: string;
    autoRestore: boolean;
  } {
    return {
      monitoring: this.isMonitoring,
      directory: this.systemDirectory,
      autoRestore: this.autoRestore,
    };
  }
}

/**
 * Create and start a tampering detector instance
 */
export function createTamperingDetector(options?: DetectorOptions): TamperingDetector {
  const detector = new TamperingDetector(options);
  detector.startWatching();
  return detector;
}
