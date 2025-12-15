#!/usr/bin/env node

/**
 * Protected Agent Migration Script
 * Migrates remaining 8 production agents to protected configuration model
 *
 * Requirements:
 * - Real SHA-256 checksums
 * - Real file permissions (chmod 444)
 * - Real backups with timestamps
 * - Validation of agent loading
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');

const AGENTS_DIR = '/workspaces/agent-feed/prod/.claude/agents';
const SYSTEM_DIR = path.join(AGENTS_DIR, '.system');
const BACKUP_DIR = '/workspaces/agent-feed/prod/backups/pre-protection';

// Agent classifications based on analysis
const AGENT_CONFIGS = {
  'agent-feedback-agent': {
    type: 'system',
    description: 'System agent for feedback collection and agent improvement tracking',
    api_rate_limit: '100/hour',
    max_storage: '512MB',
    max_memory: '256MB',
    max_cpu_percent: 50,
    max_execution_time: '300s',
    max_concurrent_tasks: 3,
    auto_post_outcomes: false,
    post_threshold: 'never'
  },
  'agent-ideas-agent': {
    type: 'system',
    description: 'System agent for production agent ecosystem expansion and planning',
    api_rate_limit: '50/hour',
    max_storage: '256MB',
    max_memory: '256MB',
    max_cpu_percent: 30,
    max_execution_time: '240s',
    max_concurrent_tasks: 2,
    auto_post_outcomes: false,
    post_threshold: 'never'
  },
  'get-to-know-you-agent': {
    type: 'user-facing',
    description: 'Critical onboarding agent - creates initial posts with Λvi',
    api_rate_limit: '10/hour',
    max_storage: '512MB',
    max_memory: '256MB',
    max_cpu_percent: 40,
    max_execution_time: '300s',
    max_concurrent_tasks: 2,
    auto_post_outcomes: true,
    post_threshold: 'completed_task'
  },
  'link-logger-agent': {
    type: 'user-facing',
    description: 'Strategic link capture and progressive summarization agent',
    api_rate_limit: '10/hour',
    max_storage: '1GB',
    max_memory: '512MB',
    max_cpu_percent: 50,
    max_execution_time: '600s',
    max_concurrent_tasks: 3,
    auto_post_outcomes: true,
    post_threshold: 'significant_outcome'
  },
  'meeting-next-steps-agent': {
    type: 'user-facing',
    description: 'Meeting transcript processing and action item extraction agent',
    api_rate_limit: '8/hour',
    max_storage: '512MB',
    max_memory: '256MB',
    max_cpu_percent: 40,
    max_execution_time: '300s',
    max_concurrent_tasks: 2,
    auto_post_outcomes: true,
    post_threshold: 'completed_task'
  },
  'meeting-prep-agent': {
    type: 'user-facing',
    description: 'Meeting agenda creation and preparation agent',
    api_rate_limit: '8/hour',
    max_storage: '512MB',
    max_memory: '256MB',
    max_cpu_percent: 40,
    max_execution_time: '300s',
    max_concurrent_tasks: 2,
    auto_post_outcomes: true,
    post_threshold: 'completed_task'
  },
  'meta-update-agent': {
    type: 'system',
    description: 'System agent for agent configuration maintenance and improvement',
    api_rate_limit: '100/hour',
    max_storage: '256MB',
    max_memory: '256MB',
    max_cpu_percent: 40,
    max_execution_time: '240s',
    max_concurrent_tasks: 2,
    auto_post_outcomes: false,
    post_threshold: 'never'
  },
  'page-verification-agent': {
    type: 'qa',
    description: 'Autonomous QA testing agent for dynamic pages',
    api_rate_limit: '50/hour',
    max_storage: '1GB',
    max_memory: '512MB',
    max_cpu_percent: 60,
    max_execution_time: '600s',
    max_concurrent_tasks: 3,
    auto_post_outcomes: false,
    post_threshold: 'never'
  }
};

// Extract tools from agent frontmatter
function extractToolsFromFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return [];

  const frontmatter = match[1];
  const toolsMatch = frontmatter.match(/tools:\s*\[(.*?)\]/);
  if (!toolsMatch) return [];

  return toolsMatch[1].split(',').map(tool => tool.trim().replace(/['"]/g, ''));
}

// Compute SHA-256 checksum
function computeChecksum(obj) {
  const clone = JSON.parse(JSON.stringify(obj));
  delete clone.checksum;

  // Sort keys for deterministic hashing
  const sortedObj = JSON.stringify(clone, Object.keys(clone).sort());
  return crypto.createHash('sha256').update(sortedObj, 'utf8').digest('hex');
}

// Create protected configuration
function createProtectedConfig(agentId, tools) {
  const config = AGENT_CONFIGS[agentId];

  const protectedConfig = {
    version: '1.0.0',
    agent_id: agentId,
    checksum: '', // Will be computed
    permissions: {
      api_endpoints: [
        {
          path: '/api/posts',
          methods: ['POST'],
          rate_limit: config.api_rate_limit,
          required_auth: true
        }
      ],
      workspace: {
        root: `/workspaces/agent-feed/prod/agent_workspace/${agentId}`,
        max_storage: config.max_storage,
        allowed_paths: [
          `/workspaces/agent-feed/prod/agent_workspace/${agentId}/**`,
          '/workspaces/agent-feed/prod/agent_workspace/shared/**'
        ],
        forbidden_paths: [
          '/workspaces/agent-feed/src/**',
          '/workspaces/agent-feed/api-server/**',
          '/workspaces/agent-feed/frontend/**',
          '/workspaces/agent-feed/prod/system_instructions/**'
        ]
      },
      tool_permissions: {
        allowed: tools,
        forbidden: ['KillShell']
      },
      resource_limits: {
        max_memory: config.max_memory,
        max_cpu_percent: config.max_cpu_percent,
        max_execution_time: config.max_execution_time,
        max_concurrent_tasks: config.max_concurrent_tasks
      },
      posting_rules: {
        auto_post_outcomes: config.auto_post_outcomes,
        post_threshold: config.post_threshold,
        default_post_type: config.type === 'user-facing' ? 'new_post' : 'reply'
      },
      security: {
        sandbox_enabled: true,
        network_access: 'api_only',
        file_operations: 'workspace_only'
      }
    },
    _metadata: {
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: 'sparc-coder-agent',
      description: config.description
    }
  };

  // Compute and set checksum
  protectedConfig.checksum = `sha256:${computeChecksum(protectedConfig)}`;

  return protectedConfig;
}

// Migrate single agent
function migrateAgent(agentId) {
  console.log(`\n=== Migrating ${agentId} ===`);

  try {
    // 1. Read agent file
    const agentFilePath = path.join(AGENTS_DIR, `${agentId}.md`);
    if (!fs.existsSync(agentFilePath)) {
      console.error(`❌ Agent file not found: ${agentFilePath}`);
      return { success: false, error: 'File not found' };
    }

    const agentContent = fs.readFileSync(agentFilePath, 'utf8');

    // 2. Extract tools
    const tools = extractToolsFromFrontmatter(agentContent);
    console.log(`📋 Tools extracted: ${tools.join(', ')}`);

    // 3. Create backup
    const backupPath = path.join(BACKUP_DIR, `${agentId}.md.${Date.now()}.backup`);
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    fs.copyFileSync(agentFilePath, backupPath);
    console.log(`💾 Backup created: ${backupPath}`);

    // 4. Create protected config
    const protectedConfig = createProtectedConfig(agentId, tools);
    const protectedConfigPath = path.join(SYSTEM_DIR, `${agentId}.protected.yaml`);

    fs.mkdirSync(SYSTEM_DIR, { recursive: true });
    fs.writeFileSync(protectedConfigPath, yaml.dump(protectedConfig, { lineWidth: -1 }));
    console.log(`✅ Protected config created: ${protectedConfigPath}`);
    console.log(`🔐 Checksum: ${protectedConfig.checksum}`);

    // 5. Set permissions (chmod 444 - read-only)
    fs.chmodSync(protectedConfigPath, 0o444);
    console.log(`🔒 Permissions set: 444 (read-only)`);

    // 6. Update agent frontmatter
    const frontmatterMatch = agentContent.match(/^(---\n[\s\S]*?\n)(---)/);
    if (frontmatterMatch) {
      const existingFrontmatter = frontmatterMatch[1];
      const updatedFrontmatter = existingFrontmatter.trimEnd() +
        `\n_protected_config_source: ".system/${agentId}.protected.yaml"\n`;
      const updatedContent = agentContent.replace(
        /^---\n[\s\S]*?\n---/,
        updatedFrontmatter + frontmatterMatch[2]
      );

      fs.writeFileSync(agentFilePath, updatedContent);
      console.log(`📝 Agent frontmatter updated`);
    }

    // 7. Verify checksum
    const writtenContent = fs.readFileSync(protectedConfigPath, 'utf8');
    const parsedConfig = yaml.load(writtenContent);
    const storedChecksum = parsedConfig.checksum;

    delete parsedConfig.checksum;
    const recomputedChecksum = `sha256:${computeChecksum(parsedConfig)}`;

    if (storedChecksum !== recomputedChecksum) {
      console.error(`❌ Checksum verification failed!`);
      return { success: false, error: 'Checksum mismatch' };
    }

    console.log(`✅ Checksum verified: ${storedChecksum}`);

    return {
      success: true,
      agentId,
      type: AGENT_CONFIGS[agentId].type,
      tools: tools.length,
      checksum: storedChecksum,
      configPath: protectedConfigPath,
      backupPath
    };

  } catch (error) {
    console.error(`❌ Migration failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main execution
function main() {
  console.log('🚀 Starting Protected Agent Migration');
  console.log('====================================\n');

  const agentsToMigrate = Object.keys(AGENT_CONFIGS);
  const results = [];

  for (const agentId of agentsToMigrate) {
    const result = migrateAgent(agentId);
    results.push(result);
  }

  // Summary report
  console.log('\n\n📊 Migration Summary');
  console.log('===================\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}\n`);

  if (successful.length > 0) {
    console.log('Migrated Agents:');
    console.log('┌─────────────────────────────────┬──────────────┬───────┬──────────────────────────────────────────────────────────────────┐');
    console.log('│ Agent ID                        │ Type         │ Tools │ Checksum                                                         │');
    console.log('├─────────────────────────────────┼──────────────┼───────┼──────────────────────────────────────────────────────────────────┤');

    successful.forEach(r => {
      const agentId = r.agentId.padEnd(31);
      const type = r.type.padEnd(12);
      const tools = String(r.tools).padStart(5);
      const checksum = r.checksum.substring(0, 64);
      console.log(`│ ${agentId} │ ${type} │ ${tools} │ ${checksum} │`);
    });

    console.log('└─────────────────────────────────┴──────────────┴───────┴──────────────────────────────────────────────────────────────────┘');
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed Migrations:');
    failed.forEach(r => {
      console.log(`  - ${r.agentId}: ${r.error}`);
    });
  }

  console.log('\n✅ Migration complete!');
  console.log(`📁 Protected configs: ${SYSTEM_DIR}`);
  console.log(`💾 Backups: ${BACKUP_DIR}`);
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = { migrateAgent, createProtectedConfig, computeChecksum };
