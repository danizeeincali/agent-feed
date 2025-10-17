#!/usr/bin/env npx tsx

/**
 * CLI Tool: Migrate Agent to Protected Model
 *
 * Usage:
 *   npx tsx scripts/migrate-agent-to-protected.ts <agent-name>
 *   npx tsx scripts/migrate-agent-to-protected.ts meta-agent
 *   npx tsx scripts/migrate-agent-to-protected.ts --all
 *
 * This script migrates an existing agent to the protected configuration model
 * by creating a sidecar YAML file with protected permissions.
 */

import readline from 'readline';
import { AgentConfigMigrator, ProtectedConfig } from '../src/config/migrators/agent-config-migrator.js';

/**
 * CLI Interface for user prompts
 */
class MigrationCLI {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Prompt user for input
   */
  async prompt(question: string): Promise<string> {
    return new Promise(resolve => {
      this.rl.question(question, answer => {
        resolve(answer.trim());
      });
    });
  }

  /**
   * Prompt for protected config values
   */
  async promptForProtectedConfig(agentName: string): Promise<Partial<ProtectedConfig>> {
    console.log(`\n🔧 Configuring protected settings for: ${agentName}\n`);

    // Workspace configuration
    console.log('📁 Workspace Configuration:');
    const workspaceRoot = await this.prompt(
      `   Workspace root path [/workspaces/agent-feed/prod/agent_workspace/agents/${agentName}]: `
    ) || `/workspaces/agent-feed/prod/agent_workspace/agents/${agentName}`;

    const maxStorage = await this.prompt(
      '   Max storage [1GB]: '
    ) || '1GB';

    // Tool permissions
    console.log('\n🛠️  Tool Permissions:');
    const allowedToolsInput = await this.prompt(
      '   Allowed tools (comma-separated) [Read,Write,Edit,Bash,Grep,Glob]: '
    );
    const allowedTools = allowedToolsInput
      ? allowedToolsInput.split(',').map(t => t.trim())
      : ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'];

    const forbiddenToolsInput = await this.prompt(
      '   Forbidden tools (comma-separated) [KillShell]: '
    );
    const forbiddenTools = forbiddenToolsInput
      ? forbiddenToolsInput.split(',').map(t => t.trim())
      : ['KillShell'];

    // Resource limits
    console.log('\n⚡ Resource Limits:');
    const maxMemory = await this.prompt(
      '   Max memory [512MB]: '
    ) || '512MB';

    const maxCpu = await this.prompt(
      '   Max CPU percent [50]: '
    ) || '50';

    const maxExecutionTime = await this.prompt(
      '   Max execution time [300s]: '
    ) || '300s';

    const maxConcurrentTasks = await this.prompt(
      '   Max concurrent tasks [3]: '
    ) || '3';

    // Posting rules
    console.log('\n📝 Posting Rules:');
    const autoPost = await this.prompt(
      '   Auto-post outcomes? (y/n) [y]: '
    );
    const autoPostOutcomes = !autoPost || autoPost.toLowerCase() === 'y';

    const postThreshold = await this.prompt(
      '   Post threshold (never/completed_task/significant_outcome/always) [completed_task]: '
    ) || 'completed_task';

    const defaultPostType = await this.prompt(
      '   Default post type (reply/new_post/auto) [reply]: '
    ) || 'reply';

    // Build protected config
    const protectedConfig: Partial<ProtectedConfig> = {
      version: '1.0.0',
      agent_id: agentName,
      permissions: {
        workspace: {
          root: workspaceRoot,
          max_storage: maxStorage,
          allowed_paths: [`${workspaceRoot}/**`],
          forbidden_paths: [
            '/workspaces/agent-feed/src/**',
            '/workspaces/agent-feed/api-server/**',
            '/workspaces/agent-feed/.claude/**'
          ]
        },
        tool_permissions: {
          allowed: allowedTools,
          forbidden: forbiddenTools
        },
        resource_limits: {
          max_memory: maxMemory,
          max_cpu_percent: parseInt(maxCpu, 10),
          max_execution_time: maxExecutionTime,
          max_concurrent_tasks: parseInt(maxConcurrentTasks, 10)
        },
        posting_rules: {
          auto_post_outcomes: autoPostOutcomes,
          post_threshold: postThreshold,
          default_post_type: defaultPostType
        }
      },
      _metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: 'cli-migration',
        description: `Protected configuration for ${agentName}`
      }
    };

    return protectedConfig;
  }

  close(): void {
    this.rl.close();
  }
}

/**
 * Main CLI execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
📦 Agent Protection Migration Tool

Usage:
  npx tsx scripts/migrate-agent-to-protected.ts <agent-name>
  npx tsx scripts/migrate-agent-to-protected.ts meta-agent
  npx tsx scripts/migrate-agent-to-protected.ts --all
  npx tsx scripts/migrate-agent-to-protected.ts --help

Options:
  <agent-name>  Name of agent to migrate (without .md extension)
  --all         Migrate all agents (uses extracted values from frontmatter)
  --help, -h    Show this help message

Examples:
  # Migrate single agent with interactive prompts
  npx tsx scripts/migrate-agent-to-protected.ts meta-agent

  # Migrate all agents automatically
  npx tsx scripts/migrate-agent-to-protected.ts --all

Description:
  This tool migrates existing agents to the protected configuration model.
  It creates a protected sidecar file (.protected.yaml) with security-critical
  settings and updates the agent's frontmatter to reference it.

  The migration process:
  1. Backs up the existing agent file
  2. Creates protected sidecar with permissions
  3. Updates agent frontmatter with sidecar reference
  4. Sets proper file permissions (444 for sidecar, 555 for .system dir)
    `);
    process.exit(0);
  }

  const migrator = new AgentConfigMigrator();

  // Bulk migration
  if (args.includes('--all')) {
    console.log('🚀 Starting bulk agent migration...\n');

    const result = await migrator.migrateAllAgents();

    console.log('\n✅ Bulk migration complete!');
    console.log(`   Total: ${result.total}`);
    console.log(`   Migrated: ${result.migrated}`);
    console.log(`   Skipped: ${result.skipped}`);
    console.log(`   Failed: ${result.failed}`);

    if (result.failed > 0) {
      console.log('\n❌ Failed migrations:');
      result.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   - ${r.agentName}: ${r.error}`);
        });
    }

    process.exit(result.failed > 0 ? 1 : 0);
  }

  // Single agent migration
  const agentName = args[0];
  console.log(`\n📦 Migrating agent: ${agentName}\n`);

  const cli = new MigrationCLI();

  try {
    // Prompt for protected config values
    const protectedConfig = await cli.promptForProtectedConfig(agentName);

    // Confirm migration
    console.log('\n🔍 Review Configuration:');
    console.log(JSON.stringify(protectedConfig, null, 2));

    const confirm = await cli.prompt('\n✅ Proceed with migration? (y/n): ');

    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ Migration cancelled');
      process.exit(0);
    }

    // Perform migration
    const result = await migrator.addProtectionToAgent(agentName, protectedConfig);

    if (result.success) {
      console.log('\n✅ Migration successful!');
      console.log(`   Sidecar: ${result.sidecarPath}`);
      console.log(`   Backup: ${result.backupPath}`);

      // Validation instructions
      console.log('\n📋 Next Steps:');
      console.log('   1. Review the generated sidecar file');
      console.log('   2. Test agent loading with protected config');
      console.log('   3. Verify permissions are enforced');
      console.log(`   4. Check backup at: ${result.backupPath}`);
    } else {
      console.error('\n❌ Migration failed:', result.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Migration error:', error);
    process.exit(1);
  } finally {
    cli.close();
  }
}

// Run CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
