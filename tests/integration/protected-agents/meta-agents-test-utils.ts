/**
 * Test Utilities for Meta-Agent Protected Configuration Testing
 *
 * Provides real file system operations, checksum utilities, and test helpers
 * for validating meta-agent and meta-update-agent protected config handling.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import yaml from 'yaml';
import matter from 'gray-matter';

// Paths
export const PROD_AGENTS_DIR = '/workspaces/agent-feed/prod/.claude/agents';
export const SYSTEM_DIR = path.join(PROD_AGENTS_DIR, '.system');
export const TEST_WORKSPACE = '/workspaces/agent-feed/prod/agent_workspace/test-agents';
export const BACKUP_DIR = path.join(TEST_WORKSPACE, 'backups');

/**
 * Protected Configuration Interface
 */
export interface ProtectedConfig {
  version: string;
  agent_id: string;
  checksum?: string;
  permissions: {
    api_endpoints: Array<{
      path: string;
      methods: string[];
      rate_limit: string;
      required_auth: boolean;
    }>;
    workspace: {
      root: string;
      max_storage: string;
      allowed_paths: string[];
      forbidden_paths: string[];
    };
    tool_permissions: {
      allowed: string[];
      forbidden: string[];
    };
    resource_limits: {
      max_memory: string;
      max_cpu_percent: number;
      max_execution_time: string;
      max_concurrent_tasks: number;
    };
    posting_rules: {
      auto_post_outcomes: boolean;
      post_threshold: string;
      default_post_type: string;
    };
    security?: {
      sandbox_enabled: boolean;
      network_access: string;
      file_operations: string[];
    };
  };
  _metadata: {
    created_at: string;
    updated_at: string;
    updated_by: string;
    description: string;
  };
}

/**
 * Agent Type Templates
 */
export const AGENT_TEMPLATES = {
  system: {
    rate_limit: '100/hour',
    max_memory: '512MB',
    max_cpu_percent: 60,
    max_storage: '500MB',
    max_execution_time: '300s',
    max_concurrent_tasks: 3
  },
  'user-facing': {
    rate_limit: '5/hour',
    max_memory: '256MB',
    max_cpu_percent: 30,
    max_storage: '100MB',
    max_execution_time: '180s',
    max_concurrent_tasks: 2
  },
  infrastructure: {
    rate_limit: '200/hour',
    max_memory: '1GB',
    max_cpu_percent: 80,
    max_storage: '1GB',
    max_execution_time: '600s',
    max_concurrent_tasks: 5
  },
  qa: {
    rate_limit: '50/hour',
    max_memory: '512MB',
    max_cpu_percent: 50,
    max_storage: '200MB',
    max_execution_time: '300s',
    max_concurrent_tasks: 3
  }
};

/**
 * SHA-256 Checksum Utilities
 */
export class ChecksumUtil {
  /**
   * Compute SHA-256 checksum for a config object
   */
  static computeChecksum(config: any): string {
    const normalized = ChecksumUtil.normalizeConfig(config);
    const hash = crypto.createHash('sha256');
    hash.update(normalized);
    return hash.digest('hex');
  }

  /**
   * Normalize config to deterministic JSON string
   */
  private static normalizeConfig(config: any): string {
    const sorted = ChecksumUtil.sortObjectKeys(config);
    return JSON.stringify(sorted);
  }

  /**
   * Recursively sort object keys
   */
  private static sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => ChecksumUtil.sortObjectKeys(item));
    }

    const sorted: any = {};
    Object.keys(obj)
      .sort()
      .forEach(key => {
        sorted[key] = ChecksumUtil.sortObjectKeys(obj[key]);
      });

    return sorted;
  }

  /**
   * Verify checksum matches config
   */
  static verifyChecksum(config: ProtectedConfig): boolean {
    if (!config.checksum) {
      return false;
    }

    const storedChecksum = ChecksumUtil.extractChecksum(config.checksum);
    const configWithoutChecksum = { ...config };
    delete configWithoutChecksum.checksum;

    const computedChecksum = ChecksumUtil.computeChecksum(configWithoutChecksum);

    return storedChecksum === computedChecksum;
  }

  /**
   * Extract hex checksum from sha256: prefix
   */
  static extractChecksum(checksumField: string): string {
    if (checksumField.startsWith('sha256:')) {
      return checksumField.substring(7);
    }
    return checksumField;
  }

  /**
   * Add checksum to config
   */
  static addChecksum(config: Omit<ProtectedConfig, 'checksum'>): ProtectedConfig {
    const configWithoutChecksum = { ...config };
    const checksum = ChecksumUtil.computeChecksum(configWithoutChecksum);

    return {
      ...config,
      checksum: `sha256:${checksum}`
    } as ProtectedConfig;
  }
}

/**
 * Test Agent Factory
 */
export class TestAgentFactory {
  /**
   * Create test agent config based on type
   */
  static createAgentConfig(
    agentName: string,
    agentType: keyof typeof AGENT_TEMPLATES,
    description: string = 'Test agent'
  ): ProtectedConfig {
    const template = AGENT_TEMPLATES[agentType];
    const now = new Date().toISOString();

    const config: Omit<ProtectedConfig, 'checksum'> = {
      version: '1.0.0',
      agent_id: agentName,
      permissions: {
        api_endpoints: [
          {
            path: '/api/posts',
            methods: ['POST'],
            rate_limit: template.rate_limit,
            required_auth: true
          }
        ],
        workspace: {
          root: `/workspaces/agent-feed/prod/agent_workspace/${agentName}`,
          max_storage: template.max_storage,
          allowed_paths: [
            `/workspaces/agent-feed/prod/agent_workspace/${agentName}/**`,
            '/workspaces/agent-feed/prod/.claude/agents/**'
          ],
          forbidden_paths: [
            '/workspaces/agent-feed/src/**',
            '/workspaces/agent-feed/api-server/**',
            '/workspaces/agent-feed/frontend/**'
          ]
        },
        tool_permissions: {
          allowed: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
          forbidden: ['KillShell']
        },
        resource_limits: {
          max_memory: template.max_memory,
          max_cpu_percent: template.max_cpu_percent,
          max_execution_time: template.max_execution_time,
          max_concurrent_tasks: template.max_concurrent_tasks
        },
        posting_rules: {
          auto_post_outcomes: false,
          post_threshold: 'never',
          default_post_type: 'new_post'
        },
        security: {
          sandbox_enabled: true,
          network_access: 'restricted',
          file_operations: ['read', 'write', 'edit']
        }
      },
      _metadata: {
        created_at: now,
        updated_at: now,
        updated_by: 'test-runner',
        description
      }
    };

    return ChecksumUtil.addChecksum(config);
  }

  /**
   * Create agent markdown file
   */
  static createAgentMarkdown(
    agentName: string,
    description: string,
    protectedConfigSource: string
  ): string {
    return `---
name: ${agentName}
description: ${description}
tools: [Read, Write, Edit, Bash, Grep, Glob]
model: sonnet
color: "#3b82f6"
proactive: false
priority: P2
usage: Test agent
_protected_config_source: ${protectedConfigSource}
---

# ${agentName}

## Purpose

Test agent for validation.

## Instructions

1. Execute tests
2. Report results
`;
  }
}

/**
 * File System Utilities
 */
export class FileSystemUtil {
  /**
   * Check if file exists
   */
  static async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file permissions
   */
  static async getPermissions(filePath: string): Promise<number> {
    const stats = await fs.stat(filePath);
    return stats.mode & 0o777;
  }

  /**
   * Set file permissions
   */
  static async setPermissions(filePath: string, mode: number): Promise<void> {
    await fs.chmod(filePath, mode);
  }

  /**
   * Read YAML file
   */
  static async readYaml<T = any>(filePath: string): Promise<T> {
    const content = await fs.readFile(filePath, 'utf-8');
    return yaml.parse(content) as T;
  }

  /**
   * Write YAML file
   */
  static async writeYaml(filePath: string, data: any): Promise<void> {
    const content = yaml.stringify(data);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Read Markdown with frontmatter
   */
  static async readMarkdown(filePath: string): Promise<{ data: any; content: string }> {
    const content = await fs.readFile(filePath, 'utf-8');
    return matter(content);
  }

  /**
   * Create backup of file
   */
  static async createBackup(filePath: string, backupDir: string): Promise<string> {
    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${fileName}.${timestamp}.backup`);

    await fs.mkdir(backupDir, { recursive: true });
    await fs.copyFile(filePath, backupPath);

    return backupPath;
  }

  /**
   * Restore from backup
   */
  static async restoreBackup(backupPath: string, targetPath: string): Promise<void> {
    await fs.copyFile(backupPath, targetPath);
  }

  /**
   * Clean up test files
   */
  static async cleanup(basePath: string, pattern: string): Promise<void> {
    try {
      const files = await fs.readdir(basePath);
      for (const file of files) {
        if (file.includes(pattern)) {
          const filePath = path.join(basePath, file);
          const stats = await fs.stat(filePath);

          if (stats.isDirectory()) {
            await fs.rm(filePath, { recursive: true, force: true });
          } else {
            // Make writable before deletion if read-only
            await fs.chmod(filePath, 0o644);
            await fs.rm(filePath, { force: true });
          }
        }
      }
    } catch (error) {
      console.warn(`Cleanup warning: ${error}`);
    }
  }
}

/**
 * Protected Config Validator
 */
export class ProtectedConfigValidator {
  /**
   * Validate all required fields are present
   */
  static validateRequiredFields(config: ProtectedConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required top-level fields
    if (!config.version) errors.push('Missing version');
    if (!config.agent_id) errors.push('Missing agent_id');
    if (!config.checksum) errors.push('Missing checksum');

    // Required permission fields
    if (!config.permissions) {
      errors.push('Missing permissions object');
      return { valid: false, errors };
    }

    if (!config.permissions.api_endpoints) errors.push('Missing api_endpoints');
    if (!config.permissions.workspace) errors.push('Missing workspace');
    if (!config.permissions.tool_permissions) errors.push('Missing tool_permissions');
    if (!config.permissions.resource_limits) errors.push('Missing resource_limits');
    if (!config.permissions.posting_rules) errors.push('Missing posting_rules');

    // Validate nested fields
    if (config.permissions.workspace) {
      if (!config.permissions.workspace.root) errors.push('Missing workspace.root');
      if (!config.permissions.workspace.max_storage) errors.push('Missing workspace.max_storage');
      if (!config.permissions.workspace.allowed_paths) errors.push('Missing workspace.allowed_paths');
      if (!config.permissions.workspace.forbidden_paths) errors.push('Missing workspace.forbidden_paths');
    }

    if (config.permissions.resource_limits) {
      if (!config.permissions.resource_limits.max_memory) errors.push('Missing resource_limits.max_memory');
      if (config.permissions.resource_limits.max_cpu_percent === undefined) errors.push('Missing resource_limits.max_cpu_percent');
      if (!config.permissions.resource_limits.max_execution_time) errors.push('Missing resource_limits.max_execution_time');
      if (config.permissions.resource_limits.max_concurrent_tasks === undefined) errors.push('Missing resource_limits.max_concurrent_tasks');
    }

    // Metadata
    if (!config._metadata) errors.push('Missing _metadata');

    return { valid: errors.length === 0, errors };
  }

  /**
   * Count protected fields
   */
  static countProtectedFields(config: ProtectedConfig): number {
    const protectedFields = [
      'api_endpoints',
      'workspace',
      'workspace.root',
      'workspace.max_storage',
      'workspace.allowed_paths',
      'workspace.forbidden_paths',
      'tool_permissions',
      'tool_permissions.allowed',
      'tool_permissions.forbidden',
      'resource_limits',
      'resource_limits.max_memory',
      'resource_limits.max_cpu_percent',
      'resource_limits.max_execution_time',
      'resource_limits.max_concurrent_tasks',
      'posting_rules',
      'posting_rules.auto_post_outcomes',
      'posting_rules.post_threshold',
      'posting_rules.default_post_type',
      'security',
      'security.sandbox_enabled',
      'security.network_access',
      'security.file_operations'
    ];

    let count = 0;
    for (const field of protectedFields) {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        if (config.permissions[parent] && config.permissions[parent][child] !== undefined) {
          count++;
        }
      } else {
        if (config.permissions[field] !== undefined) {
          count++;
        }
      }
    }

    return count;
  }
}

/**
 * Test Cleanup Helper
 */
export class TestCleanup {
  private static testAgents: string[] = [];

  /**
   * Register test agent for cleanup
   */
  static registerAgent(agentName: string): void {
    if (!this.testAgents.includes(agentName)) {
      this.testAgents.push(agentName);
    }
  }

  /**
   * Cleanup all registered test agents
   */
  static async cleanupAll(): Promise<void> {
    for (const agentName of this.testAgents) {
      // Clean up agent .md file
      const agentPath = path.join(PROD_AGENTS_DIR, `${agentName}.md`);
      if (await FileSystemUtil.exists(agentPath)) {
        await fs.rm(agentPath, { force: true });
      }

      // Clean up protected config
      const configPath = path.join(SYSTEM_DIR, `${agentName}.protected.yaml`);
      if (await FileSystemUtil.exists(configPath)) {
        await fs.chmod(configPath, 0o644); // Make writable
        await fs.rm(configPath, { force: true });
      }

      // Clean up workspace
      const workspacePath = path.join(TEST_WORKSPACE, agentName);
      if (await FileSystemUtil.exists(workspacePath)) {
        await fs.rm(workspacePath, { recursive: true, force: true });
      }
    }

    this.testAgents = [];
  }
}
