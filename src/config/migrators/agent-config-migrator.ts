import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import yaml from 'js-yaml';
import matter from 'gray-matter';

/**
 * Protected Configuration Structure
 */
export interface ProtectedConfig {
  version: string;
  checksum: string;
  agent_id: string;
  permissions: {
    api_endpoints?: Array<{
      path: string;
      methods: string[];
      rate_limit: string;
      required_auth?: boolean;
    }>;
    workspace?: {
      root: string;
      max_storage: string;
      allowed_paths?: string[];
      forbidden_paths?: string[];
    };
    tool_permissions?: {
      allowed: string[];
      forbidden?: string[];
    };
    resource_limits?: {
      max_memory: string;
      max_cpu_percent: number;
      max_execution_time: string;
      max_concurrent_tasks: number;
    };
    posting_rules?: {
      auto_post_outcomes: boolean;
      post_threshold: string;
      default_post_type: string;
    };
    security?: {
      sandbox_enabled?: boolean;
      network_access?: string;
      file_operations?: string;
    };
  };
  _metadata?: {
    created_at: string;
    updated_at: string;
    updated_by: string;
    description?: string;
  };
}

/**
 * Migration Result
 */
export interface MigrationResult {
  success: boolean;
  agentName: string;
  sidecarPath?: string;
  backupPath?: string;
  error?: string;
}

/**
 * AgentConfigMigrator - Migrates agents to protected model
 *
 * Implements Phase 2 of the Protected Agent Fields hybrid architecture.
 * This class handles the migration of existing agent configurations to the
 * new protected sidecar model.
 */
export class AgentConfigMigrator {
  private agentsDir: string;
  private systemDir: string;
  private backupDir: string;

  constructor(options?: {
    agentsDir?: string;
    backupDir?: string;
  }) {
    this.agentsDir = options?.agentsDir || '/workspaces/agent-feed/prod/.claude/agents';
    this.systemDir = path.join(this.agentsDir, '.system');
    this.backupDir = options?.backupDir || '/workspaces/agent-feed/prod/backups/pre-protection';
  }

  /**
   * Add protection to a specific agent (incremental migration)
   *
   * @param agentName - Agent identifier (e.g., "meta-agent")
   * @param protectedConfig - Protected configuration to add
   * @returns Migration result
   */
  async addProtectionToAgent(
    agentName: string,
    protectedConfig: Partial<ProtectedConfig>
  ): Promise<MigrationResult> {
    try {
      console.log(`📦 Starting protection migration for: ${agentName}`);

      // 1. Backup existing agent file
      const backupPath = await this.backupAgentFile(agentName);

      // 2. Ensure .system directory exists with proper permissions
      await this.ensureSystemDirectory();

      // 3. Complete and validate protected config
      const completeConfig: ProtectedConfig = {
        version: protectedConfig.version || '1.0.0',
        checksum: '', // Will be computed below
        agent_id: agentName,
        permissions: protectedConfig.permissions || {},
        _metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: 'migration',
          ...protectedConfig._metadata
        }
      };

      // 4. Compute SHA-256 checksum
      const checksum = this.computeChecksum(completeConfig);
      completeConfig.checksum = `sha256:${checksum}`;

      // 5. Write protected sidecar
      const sidecarPath = await this.writeSidecar(agentName, completeConfig);

      // 6. Update agent .md file to reference sidecar
      await this.addSidecarReference(agentName);

      console.log(`✅ Successfully added protection to ${agentName}`);
      console.log(`   Sidecar: ${sidecarPath}`);
      console.log(`   Backup: ${backupPath}`);

      return {
        success: true,
        agentName,
        sidecarPath,
        backupPath
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to add protection to ${agentName}:`, errorMessage);

      return {
        success: false,
        agentName,
        error: errorMessage
      };
    }
  }

  /**
   * Migrate all agents (bulk operation - use with caution)
   *
   * @returns Summary of migration results
   */
  async migrateAllAgents(): Promise<{
    total: number;
    migrated: number;
    skipped: number;
    failed: number;
    results: MigrationResult[];
  }> {
    console.log('🚀 Starting bulk agent migration...');

    const agents = await this.discoverAgents();
    const results: MigrationResult[] = [];

    for (const agentFile of agents) {
      const agentName = this.extractAgentName(agentFile);

      try {
        // Check if already protected
        const hasProtection = await this.hasProtectedSidecar(agentName);
        if (hasProtection) {
          console.log(`⏭️  Skipping ${agentName} (already protected)`);
          results.push({
            success: true,
            agentName,
            error: 'Already protected'
          });
          continue;
        }

        // Extract protected config from agent frontmatter
        const protectedConfig = await this.extractProtectedFields(agentName);

        // Add protection
        const result = await this.addProtectionToAgent(agentName, protectedConfig);
        results.push(result);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Migration failed for ${agentName}:`, errorMessage);
        results.push({
          success: false,
          agentName,
          error: errorMessage
        });
      }
    }

    const summary = {
      total: agents.length,
      migrated: results.filter(r => r.success && !r.error?.includes('Already')).length,
      skipped: results.filter(r => r.error?.includes('Already')).length,
      failed: results.filter(r => !r.success).length,
      results
    };

    console.log('\n📊 Migration Summary:');
    console.log(`   Total: ${summary.total}`);
    console.log(`   Migrated: ${summary.migrated}`);
    console.log(`   Skipped: ${summary.skipped}`);
    console.log(`   Failed: ${summary.failed}`);

    return summary;
  }

  /**
   * Extract protected fields from existing agent frontmatter
   *
   * @param agentName - Agent identifier
   * @returns Extracted protected configuration
   */
  async extractProtectedFields(agentName: string): Promise<Partial<ProtectedConfig>> {
    const agentPath = path.join(this.agentsDir, `${agentName}.md`);
    const content = await fs.readFile(agentPath, 'utf-8');
    const { data: frontmatter } = matter(content);

    // Protected field names to extract
    const protectedFieldNames = [
      'api_endpoints',
      'api_methods',
      'api_rate_limits',
      'workspace',
      'workspace_path',
      'tool_permissions',
      'resource_limits',
      'posting_rules',
      'security_policies',
      'system_boundaries',
      'forbidden_operations'
    ];

    const permissions: any = {};

    // Extract protected fields
    for (const fieldName of protectedFieldNames) {
      if (frontmatter[fieldName]) {
        permissions[fieldName] = frontmatter[fieldName];
      }
    }

    // Build protected config
    const protectedConfig: Partial<ProtectedConfig> = {
      version: '1.0.0',
      agent_id: agentName,
      permissions,
      _metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: 'extraction',
        description: `Extracted from ${agentName}.md frontmatter`
      }
    };

    return protectedConfig;
  }

  /**
   * Add sidecar reference to agent .md frontmatter
   *
   * @param agentName - Agent identifier
   */
  async addSidecarReference(agentName: string): Promise<void> {
    const agentPath = path.join(this.agentsDir, `${agentName}.md`);
    const content = await fs.readFile(agentPath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);

    // Add reference to protected sidecar
    frontmatter._protected_config_source = `.system/${agentName}.protected.yaml`;

    // Write updated agent file
    const updated = matter.stringify(body, frontmatter);
    await fs.writeFile(agentPath, updated);

    console.log(`   ✓ Added sidecar reference to ${agentName}.md`);
  }

  /**
   * Backup agent file before migration
   *
   * @param agentName - Agent identifier
   * @returns Path to backup file
   */
  async backupAgentFile(agentName: string): Promise<string> {
    const agentPath = path.join(this.agentsDir, `${agentName}.md`);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `${agentName}_${timestamp}.md`);

    // Ensure backup directory exists
    await fs.mkdir(this.backupDir, { recursive: true });

    // Copy agent file to backup
    await fs.copyFile(agentPath, backupPath);

    console.log(`   ✓ Backed up to: ${backupPath}`);
    return backupPath;
  }

  /**
   * Ensure .system directory exists with proper permissions
   */
  private async ensureSystemDirectory(): Promise<void> {
    try {
      await fs.access(this.systemDir);
    } catch {
      await fs.mkdir(this.systemDir, { recursive: true, mode: 0o555 });
      console.log(`   ✓ Created .system directory`);
    }
  }

  /**
   * Write protected sidecar file
   *
   * @param agentName - Agent identifier
   * @param config - Protected configuration
   * @returns Path to sidecar file
   */
  private async writeSidecar(
    agentName: string,
    config: ProtectedConfig
  ): Promise<string> {
    const sidecarPath = path.join(this.systemDir, `${agentName}.protected.yaml`);

    // Temporarily make directory writable
    await fs.chmod(this.systemDir, 0o755);

    // Write YAML
    const yamlContent = yaml.dump(config, {
      indent: 2,
      lineWidth: 100,
      noRefs: true
    });
    await fs.writeFile(sidecarPath, yamlContent);

    // Set read-only permissions
    await fs.chmod(sidecarPath, 0o444);
    await fs.chmod(this.systemDir, 0o555);

    console.log(`   ✓ Created sidecar: ${sidecarPath}`);
    return sidecarPath;
  }

  /**
   * Compute SHA-256 checksum of configuration
   *
   * @param config - Configuration object (without checksum field)
   * @returns SHA-256 hex digest
   */
  private computeChecksum(config: any): string {
    // Create copy without checksum field
    const configCopy = { ...config };
    delete configCopy.checksum;

    // Normalize to stable JSON
    const normalized = JSON.stringify(this.sortObjectKeys(configCopy), null, 2);

    // Compute SHA-256
    return crypto.createHash('sha256').update(normalized, 'utf-8').digest('hex');
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
   * Discover all agent .md files
   *
   * @returns Array of agent filenames
   */
  private async discoverAgents(): Promise<string[]> {
    const files = await fs.readdir(this.agentsDir);
    return files.filter(f => f.endsWith('.md') && !f.startsWith('.'));
  }

  /**
   * Check if agent already has protected sidecar
   *
   * @param agentName - Agent identifier
   * @returns True if sidecar exists
   */
  private async hasProtectedSidecar(agentName: string): Promise<boolean> {
    const sidecarPath = path.join(this.systemDir, `${agentName}.protected.yaml`);
    try {
      await fs.access(sidecarPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract agent name from filename
   *
   * @param filename - Agent filename (e.g., "meta-agent.md")
   * @returns Agent name (e.g., "meta-agent")
   */
  private extractAgentName(filename: string): string {
    return path.basename(filename, '.md');
  }
}
