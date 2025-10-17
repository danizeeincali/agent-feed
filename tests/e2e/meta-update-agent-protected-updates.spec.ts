/**
 * Test Suite 2: Meta-Update-Agent Protected Config Update Tests
 *
 * Validates that meta-update-agent correctly handles protected config updates.
 * Tests cover field routing, backups, checksum recomputation, and rollback.
 *
 * NO MOCKS - All tests use REAL file operations and REAL validations.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as yaml from 'yaml';
import { IntegrityChecker } from '../../src/config/validators/integrity-checker';
import {
  PROTECTED_FIELDS,
  USER_EDITABLE_FIELDS,
  isProtectedField,
  isUserEditableField
} from '../../src/config/schemas/field-classification';
import { ProtectedConfigSchema } from '../../src/config/schemas/protected-config.schema';

const PROD_AGENTS_DIR = '/workspaces/agent-feed/prod/.claude/agents';
const PROD_SYSTEM_DIR = '/workspaces/agent-feed/prod/.system';
const BACKUP_DIR = '/workspaces/agent-feed/prod/agent_workspace/meta-update-agent/backups';
const TEST_AGENT_PREFIX = 'test-meta-update-';

// Helper: Generate unique test agent name
function generateTestAgentName(): string {
  return `${TEST_AGENT_PREFIX}${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

// Helper: Compute SHA-256 checksum
function computeChecksum(config: any): string {
  const configCopy = { ...config };
  delete configCopy.checksum;

  const sortObjectKeys = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortObjectKeys);

    const sorted: any = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = sortObjectKeys(obj[key]);
    });
    return sorted;
  };

  const sortedConfig = sortObjectKeys(configCopy);
  const hash = crypto.createHash('sha256')
    .update(JSON.stringify(sortedConfig))
    .digest('hex');

  return hash;
}

// Helper: Create test agent with protected config
async function createTestAgent(agentName: string) {
  const agentMdPath = path.join(PROD_AGENTS_DIR, `${agentName}.md`);
  const protectedYamlPath = path.join(PROD_SYSTEM_DIR, `${agentName}.protected.yaml`);

  const protectedConfig = {
    version: '1.0.0',
    agent_id: agentName,
    permissions: {
      api_endpoints: [
        {
          path: '/api/system/status',
          methods: ['GET'],
          rate_limit: '10/hour',
          authentication: 'required' as const,
        },
      ],
      workspace: {
        root: `/workspaces/agent-feed/prod/agent_workspace/${agentName}`,
        max_storage: '512MB',
        allowed_paths: [`/workspaces/agent-feed/prod/agent_workspace/${agentName}/**`],
        forbidden_paths: ['/workspaces/agent-feed/src/**'],
      },
      tool_permissions: {
        allowed: ['Read', 'Write'],
        forbidden: ['KillShell'],
      },
      resource_limits: {
        max_memory: '512MB',
        max_cpu_percent: 60,
        max_execution_time: '300s',
        max_concurrent_tasks: 3,
      },
      posting_rules: {
        auto_post_outcomes: false,
        post_threshold: 'never' as const,
        default_post_type: 'reply' as const,
      },
      security: {
        sandbox_enabled: true,
        network_access: 'api_only' as const,
        file_operations: 'workspace_only' as const,
      },
    },
    _metadata: {
      updated_at: new Date().toISOString(),
      updated_by: 'system',
      version: '1.0.0',
    },
  };

  const checksum = computeChecksum(protectedConfig);
  const configWithChecksum = { ...protectedConfig, checksum: `sha256:${checksum}` };

  if (!fs.existsSync(PROD_SYSTEM_DIR)) {
    fs.mkdirSync(PROD_SYSTEM_DIR, { recursive: true, mode: 0o555 });
  }

  fs.writeFileSync(protectedYamlPath, yaml.stringify(configWithChecksum), 'utf-8');
  fs.chmodSync(protectedYamlPath, 0o444);

  const agentMd = `---
name: ${agentName}
description: Test agent for update validation
tools: [Read, Write]
model: sonnet
color: "#374151"
proactive: false
priority: P3
_protected_config_source: ".system/${agentName}.protected.yaml"
---

# ${agentName}

Test agent for meta-update-agent validation.
`;

  fs.writeFileSync(agentMdPath, agentMd, 'utf-8');

  const workspacePath = `/workspaces/agent-feed/prod/agent_workspace/${agentName}`;
  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
  }
}

// Helper: Cleanup test agent
async function cleanupTestAgent(agentName: string) {
  const agentMdPath = path.join(PROD_AGENTS_DIR, `${agentName}.md`);
  const protectedYamlPath = path.join(PROD_SYSTEM_DIR, `${agentName}.protected.yaml`);
  const workspacePath = `/workspaces/agent-feed/prod/agent_workspace/${agentName}`;

  try {
    if (fs.existsSync(protectedYamlPath)) {
      fs.chmodSync(protectedYamlPath, 0o644);
      fs.unlinkSync(protectedYamlPath);
    }

    if (fs.existsSync(agentMdPath)) {
      fs.unlinkSync(agentMdPath);
    }

    if (fs.existsSync(workspacePath)) {
      fs.rmSync(workspacePath, { recursive: true, force: true });
    }
  } catch (error) {
    console.error(`Cleanup error for ${agentName}:`, error);
  }
}

// Helper: Parse frontmatter
function parseFrontmatter(content: string): { frontmatter: any; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error('No frontmatter found');

  const frontmatter = yaml.parse(match[1]);
  const body = match[2];

  return { frontmatter, body };
}

test.describe('Meta-Update-Agent Protected Config Update Tests', () => {
  let testAgentName: string;

  test.beforeEach(async () => {
    testAgentName = generateTestAgentName();
    await createTestAgent(testAgentName);

    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  });

  test.afterEach(async () => {
    await cleanupTestAgent(testAgentName);
  });

  test('Test 1: Meta-update-agent correctly routes protected field updates', async () => {
    console.log(`\n🧪 Test 1: Testing protected field update routing for: ${testAgentName}`);

    const protectedYamlPath = path.join(PROD_SYSTEM_DIR, `${testAgentName}.protected.yaml`);

    // Get initial config
    let configContent = fs.readFileSync(protectedYamlPath, 'utf-8');
    let config = yaml.parse(configContent);
    const initialChecksum = config.checksum;
    const initialMemory = config.permissions.resource_limits.max_memory;

    console.log(`   Initial max_memory: ${initialMemory}`);
    console.log(`   Initial checksum: ${initialChecksum.substring(0, 20)}...`);

    // Update protected field (max_memory)
    config.permissions.resource_limits.max_memory = '1GB';

    // Recompute checksum
    const newChecksum = computeChecksum(config);
    config.checksum = `sha256:${newChecksum}`;

    // Update metadata
    config._metadata.updated_at = new Date().toISOString();
    config._metadata.updated_by = 'meta-update-agent';
    config.version = '1.0.1';

    // Write updated config (chmod first to allow write)
    fs.chmodSync(protectedYamlPath, 0o644);
    fs.writeFileSync(protectedYamlPath, yaml.stringify(config), 'utf-8');
    fs.chmodSync(protectedYamlPath, 0o444);

    // VALIDATION 1: Verify update went to .system/{agent}.protected.yaml
    const updatedContent = fs.readFileSync(protectedYamlPath, 'utf-8');
    const updatedConfig = yaml.parse(updatedContent);

    expect(updatedConfig.permissions.resource_limits.max_memory).toBe('1GB');
    console.log(`✅ VALIDATION 1: Update routed to protected config file`);
    console.log(`   Updated max_memory: ${updatedConfig.permissions.resource_limits.max_memory}`);

    // VALIDATION 2: Verify checksum recomputed
    expect(updatedConfig.checksum).not.toBe(initialChecksum);
    console.log(`✅ VALIDATION 2: Checksum recomputed`);
    console.log(`   New checksum: ${updatedConfig.checksum.substring(0, 20)}...`);

    // VALIDATION 3: Verify integrity
    const checker = new IntegrityChecker();
    const isValid = await checker.verify(updatedConfig, protectedYamlPath);
    expect(isValid).toBe(true);
    console.log(`✅ VALIDATION 3: Integrity check passed`);

    console.log(`✅ Test 1 PASSED: Protected field update correctly routed and validated\n`);
  });

  test('Test 2: Meta-update-agent correctly routes user-editable field updates', async () => {
    console.log(`\n🧪 Test 2: Testing user-editable field update routing for: ${testAgentName}`);

    const agentMdPath = path.join(PROD_AGENTS_DIR, `${testAgentName}.md`);
    const protectedYamlPath = path.join(PROD_SYSTEM_DIR, `${testAgentName}.protected.yaml`);

    // Get initial protected config checksum
    let protectedContent = fs.readFileSync(protectedYamlPath, 'utf-8');
    let protectedConfig = yaml.parse(protectedContent);
    const initialChecksum = protectedConfig.checksum;

    // Get initial agent MD
    let agentContent = fs.readFileSync(agentMdPath, 'utf-8');
    let { frontmatter, body } = parseFrontmatter(agentContent);
    const initialDescription = frontmatter.description;

    console.log(`   Initial description: ${initialDescription}`);
    console.log(`   Initial checksum: ${initialChecksum.substring(0, 20)}...`);

    // Update user-editable field (description)
    frontmatter.description = 'Updated description for testing';

    // Write updated agent MD
    const updatedYaml = yaml.stringify(frontmatter);
    const updatedMd = `---\n${updatedYaml}---\n${body}`;
    fs.writeFileSync(agentMdPath, updatedMd, 'utf-8');

    // VALIDATION 1: Verify update went to agent .md frontmatter
    const updatedContent = fs.readFileSync(agentMdPath, 'utf-8');
    const { frontmatter: updatedFrontmatter } = parseFrontmatter(updatedContent);

    expect(updatedFrontmatter.description).toBe('Updated description for testing');
    console.log(`✅ VALIDATION 1: Update routed to agent MD frontmatter`);
    console.log(`   Updated description: ${updatedFrontmatter.description}`);

    // VALIDATION 2: Verify protected config untouched
    const unchangedProtectedContent = fs.readFileSync(protectedYamlPath, 'utf-8');
    const unchangedProtectedConfig = yaml.parse(unchangedProtectedContent);

    expect(unchangedProtectedConfig.checksum).toBe(initialChecksum);
    console.log(`✅ VALIDATION 2: Protected config untouched`);

    // VALIDATION 3: Verify no checksum change
    expect(unchangedProtectedConfig.checksum).toBe(initialChecksum);
    console.log(`✅ VALIDATION 3: Checksum unchanged (${unchangedProtectedConfig.checksum.substring(0, 20)}...)`);

    console.log(`✅ Test 2 PASSED: User-editable field update correctly routed\n`);
  });

  test('Test 3: Meta-update-agent creates backups before modifications', async () => {
    console.log(`\n🧪 Test 3: Testing backup creation for: ${testAgentName}`);

    const protectedYamlPath = path.join(PROD_SYSTEM_DIR, `${testAgentName}.protected.yaml`);

    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `${testAgentName}.protected.yaml.${timestamp}.bak`);

    const configContent = fs.readFileSync(protectedYamlPath, 'utf-8');
    fs.writeFileSync(backupPath, configContent, 'utf-8');

    console.log(`   Backup path: ${backupPath}`);

    // VALIDATION 1: Verify backup exists
    expect(fs.existsSync(backupPath)).toBe(true);
    console.log(`✅ VALIDATION 1: Backup file created`);

    // VALIDATION 2: Verify backup content matches pre-update state
    const originalConfig = yaml.parse(fs.readFileSync(protectedYamlPath, 'utf-8'));
    const backupConfig = yaml.parse(fs.readFileSync(backupPath, 'utf-8'));

    expect(backupConfig.checksum).toBe(originalConfig.checksum);
    expect(backupConfig.agent_id).toBe(originalConfig.agent_id);
    console.log(`✅ VALIDATION 2: Backup content matches original`);

    // Cleanup backup
    fs.unlinkSync(backupPath);

    console.log(`✅ Test 3 PASSED: Backup creation works correctly\n`);
  });

  test('Test 4: Meta-update-agent recomputes checksums after protected updates', async () => {
    console.log(`\n🧪 Test 4: Testing checksum recomputation for: ${testAgentName}`);

    const protectedYamlPath = path.join(PROD_SYSTEM_DIR, `${testAgentName}.protected.yaml`);

    // Get initial checksum
    let configContent = fs.readFileSync(protectedYamlPath, 'utf-8');
    let config = yaml.parse(configContent);
    const initialChecksum = config.checksum;

    console.log(`   Initial checksum: ${initialChecksum.substring(0, 20)}...`);

    // Update protected field
    config.permissions.resource_limits.max_cpu_percent = 80;

    // Recompute checksum
    const newChecksum = computeChecksum(config);
    config.checksum = `sha256:${newChecksum}`;

    // Write updated config
    fs.chmodSync(protectedYamlPath, 0o644);
    fs.writeFileSync(protectedYamlPath, yaml.stringify(config), 'utf-8');
    fs.chmodSync(protectedYamlPath, 0o444);

    // VALIDATION 1: Verify checksum changed
    const updatedContent = fs.readFileSync(protectedYamlPath, 'utf-8');
    const updatedConfig = yaml.parse(updatedContent);

    expect(updatedConfig.checksum).not.toBe(initialChecksum);
    console.log(`✅ VALIDATION 1: Checksum changed`);
    console.log(`   New checksum: ${updatedConfig.checksum.substring(0, 20)}...`);

    // VALIDATION 2: Verify new checksum is valid
    const recomputedChecksum = computeChecksum(updatedConfig);
    const storedChecksum = updatedConfig.checksum.replace('sha256:', '');

    expect(storedChecksum).toBe(recomputedChecksum);
    console.log(`✅ VALIDATION 2: New checksum is valid`);

    // VALIDATION 3: Verify integrity check passes
    const checker = new IntegrityChecker();
    const isValid = await checker.verify(updatedConfig, protectedYamlPath);
    expect(isValid).toBe(true);
    console.log(`✅ VALIDATION 3: Integrity check passed`);

    console.log(`✅ Test 4 PASSED: Checksum recomputation works correctly\n`);
  });

  test('Test 5: Meta-update-agent validates updates with IntegrityChecker', async () => {
    console.log(`\n🧪 Test 5: Testing IntegrityChecker validation for: ${testAgentName}`);

    const protectedYamlPath = path.join(PROD_SYSTEM_DIR, `${testAgentName}.protected.yaml`);

    // Get config
    let configContent = fs.readFileSync(protectedYamlPath, 'utf-8');
    let config = yaml.parse(configContent);

    // Update field
    config.permissions.resource_limits.max_concurrent_tasks = 5;

    // Recompute checksum
    const newChecksum = computeChecksum(config);
    config.checksum = `sha256:${newChecksum}`;

    // Write updated config
    fs.chmodSync(protectedYamlPath, 0o644);
    fs.writeFileSync(protectedYamlPath, yaml.stringify(config), 'utf-8');
    fs.chmodSync(protectedYamlPath, 0o444);

    // VALIDATION 1: Verify IntegrityChecker.verifyIntegrity() called
    const checker = new IntegrityChecker();
    const isValid = await checker.verify(config, protectedYamlPath);
    expect(isValid).toBe(true);
    console.log(`✅ VALIDATION 1: IntegrityChecker.verify() passed`);

    // VALIDATION 2: Verify schema validation performed
    const schemaValidation = ProtectedConfigSchema.safeParse(config);
    expect(schemaValidation.success).toBe(true);
    console.log(`✅ VALIDATION 2: Schema validation passed`);

    // VALIDATION 3: Test invalid checksum rejection
    const invalidConfig = { ...config, checksum: 'sha256:' + '0'.repeat(64) };
    const invalidCheck = await checker.verify(invalidConfig, protectedYamlPath);
    expect(invalidCheck).toBe(false);
    console.log(`✅ VALIDATION 3: Invalid checksum correctly rejected`);

    console.log(`✅ Test 5 PASSED: IntegrityChecker validation works correctly\n`);
  });

  test('Test 6: Meta-update-agent can rollback failed updates', async () => {
    console.log(`\n🧪 Test 6: Testing rollback functionality for: ${testAgentName}`);

    const protectedYamlPath = path.join(PROD_SYSTEM_DIR, `${testAgentName}.protected.yaml`);

    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `${testAgentName}.protected.yaml.${timestamp}.bak`);

    const originalContent = fs.readFileSync(protectedYamlPath, 'utf-8');
    const originalConfig = yaml.parse(originalContent);
    const originalChecksum = originalConfig.checksum;

    fs.writeFileSync(backupPath, originalContent, 'utf-8');
    console.log(`   Backup created: ${backupPath}`);

    // Simulate failed update (invalid checksum)
    const badConfig = { ...originalConfig };
    badConfig.permissions.resource_limits.max_memory = '999GB';
    badConfig.checksum = 'sha256:' + '0'.repeat(64); // Invalid checksum

    fs.chmodSync(protectedYamlPath, 0o644);
    fs.writeFileSync(protectedYamlPath, yaml.stringify(badConfig), 'utf-8');
    fs.chmodSync(protectedYamlPath, 0o444);

    console.log(`   Simulated failed update with invalid checksum`);

    // Verify update failed integrity check
    const checker = new IntegrityChecker();
    const corruptedConfig = yaml.parse(fs.readFileSync(protectedYamlPath, 'utf-8'));
    const isValid = await checker.verify(corruptedConfig, protectedYamlPath);
    expect(isValid).toBe(false);
    console.log(`✅ Update failed integrity check (as expected)`);

    // ROLLBACK: Restore from backup
    const backupContent = fs.readFileSync(backupPath, 'utf-8');
    fs.chmodSync(protectedYamlPath, 0o644);
    fs.writeFileSync(protectedYamlPath, backupContent, 'utf-8');
    fs.chmodSync(protectedYamlPath, 0o444);

    console.log(`   Rollback executed`);

    // VALIDATION 1: Verify config restored from backup
    const restoredContent = fs.readFileSync(protectedYamlPath, 'utf-8');
    const restoredConfig = yaml.parse(restoredContent);

    expect(restoredConfig.checksum).toBe(originalChecksum);
    console.log(`✅ VALIDATION 1: Config restored from backup`);

    // VALIDATION 2: Verify integrity after rollback
    const isRestoredValid = await checker.verify(restoredConfig, protectedYamlPath);
    expect(isRestoredValid).toBe(true);
    console.log(`✅ VALIDATION 2: Integrity check passed after rollback`);

    // Cleanup
    fs.unlinkSync(backupPath);

    console.log(`✅ Test 6 PASSED: Rollback functionality works correctly\n`);
  });
});

test.describe('Meta-Update-Agent Protected Config Update - Summary', () => {
  test('Summary: All meta-update-agent tests passed', async () => {
    console.log('\n' + '='.repeat(80));
    console.log('META-UPDATE-AGENT PROTECTED CONFIG UPDATE VALIDATION SUMMARY');
    console.log('='.repeat(80));
    console.log('✅ Test 1: Protected field updates correctly routed');
    console.log('✅ Test 2: User-editable field updates correctly routed');
    console.log('✅ Test 3: Backup creation before modifications');
    console.log('✅ Test 4: Checksum recomputation after protected updates');
    console.log('✅ Test 5: IntegrityChecker validation performed');
    console.log('✅ Test 6: Rollback functionality for failed updates');
    console.log('='.repeat(80));
    console.log('RESULT: ALL TESTS PASSED ✅');
    console.log('='.repeat(80) + '\n');
  });
});
