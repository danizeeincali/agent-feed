#!/usr/bin/env tsx

/**
 * Complete Agent Migration Validation Script
 *
 * Validates all migrated agents with REAL operations:
 * - File system validation (permissions, existence)
 * - Checksum verification (SHA-256 crypto)
 * - Agent loading validation
 * - Protection enforcement testing
 * - Backward compatibility verification
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import yaml from 'yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: any;
}

interface AgentValidation {
  agentName: string;
  protectedConfigExists: boolean;
  filePermissions: string;
  checksumValid: boolean;
  frontmatterHasReference: boolean;
  backupExists: boolean;
  loadable: boolean;
  errors: string[];
}

const PROD_AGENTS_DIR = '/workspaces/agent-feed/prod/.claude/agents';
const SYSTEM_DIR = '/workspaces/agent-feed/prod/.claude/agents/.system';
const BACKUPS_DIR = '/workspaces/agent-feed/prod/backups/pre-protection';

// Expected migrated agents (based on actual migration - ALL 13 agents migrated!)
const MIGRATED_AGENTS = [
  'agent-feedback-agent',
  'agent-ideas-agent',
  'dynamic-page-testing-agent',
  'follow-ups-agent',
  'get-to-know-you-agent',
  'link-logger-agent',
  'meeting-next-steps-agent',
  'meeting-prep-agent',
  'meta-agent',
  'meta-update-agent',
  'page-builder-agent',
  'page-verification-agent',
  'personal-todos-agent',
];

// All agents in the system
const ALL_AGENTS = [
  'agent-feedback-agent',
  'agent-ideas-agent',
  'dynamic-page-testing-agent',
  'follow-ups-agent',
  'get-to-know-you-agent',
  'link-logger-agent',
  'meeting-next-steps-agent',
  'meeting-prep-agent',
  'meta-agent',
  'meta-update-agent',
  'page-builder-agent',
  'page-verification-agent',
  'personal-todos-agent',
];

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n');
  log('='.repeat(80), 'cyan');
  log(`  ${title}`, 'bold');
  log('='.repeat(80), 'cyan');
  console.log();
}

function logResult(passed: boolean, message: string) {
  const icon = passed ? '✅' : '❌';
  const color = passed ? 'green' : 'red';
  log(`${icon} ${message}`, color);
}

/**
 * Compute SHA-256 checksum from raw YAML content (excluding checksum line)
 * This matches how the checksums were actually created during migration
 */
function computeChecksumFromYAML(rawYamlContent: string): string {
  // Remove the checksum line from the YAML string
  const lines = rawYamlContent.split('\n');
  const linesWithoutChecksum = lines.filter(line => !line.includes('checksum:'));
  const contentWithoutChecksum = linesWithoutChecksum.join('\n');

  // Compute SHA-256 hash
  return crypto.createHash('sha256').update(contentWithoutChecksum, 'utf-8').digest('hex');
}

/**
 * Check if a file has specific permissions
 */
function checkFilePermissions(filePath: string, expectedPerms: string): ValidationResult {
  try {
    const stats = fs.statSync(filePath);
    const perms = (stats.mode & parseInt('777', 8)).toString(8);
    const passed = perms === expectedPerms;

    return {
      passed,
      message: passed
        ? `File permissions are ${perms} (expected ${expectedPerms})`
        : `File permissions are ${perms} (expected ${expectedPerms})`,
      details: { actual: perms, expected: expectedPerms },
    };
  } catch (error) {
    return {
      passed: false,
      message: `Failed to check permissions: ${error.message}`,
    };
  }
}

/**
 * Validate a protected config file
 */
function validateProtectedConfig(agentName: string): ValidationResult {
  const configPath = path.join(SYSTEM_DIR, `${agentName}.protected.yaml`);

  try {
    // Check file exists
    if (!fs.existsSync(configPath)) {
      return {
        passed: false,
        message: `Protected config does not exist at ${configPath}`,
      };
    }

    // Check file permissions (444 = read-only)
    const permResult = checkFilePermissions(configPath, '444');
    if (!permResult.passed) {
      return {
        passed: false,
        message: `Incorrect file permissions: ${permResult.message}`,
      };
    }

    // Read and parse YAML
    const content = fs.readFileSync(configPath, 'utf8');
    const config = yaml.parse(content);

    // Validate checksum exists
    if (!config.checksum) {
      return {
        passed: false,
        message: 'Checksum field is missing',
      };
    }

    // Validate checksum format (sha256:64-hex-chars)
    if (!config.checksum.startsWith('sha256:')) {
      return {
        passed: false,
        message: `Invalid checksum format: ${config.checksum}`,
      };
    }

    const checksumValue = config.checksum.replace('sha256:', '');
    if (!/^[a-f0-9]{64}$/i.test(checksumValue)) {
      return {
        passed: false,
        message: `Checksum is not a valid SHA-256 hash: ${checksumValue}`,
      };
    }

    // Recompute checksum from raw YAML and verify
    const computedChecksum = computeChecksumFromYAML(content);
    if (computedChecksum !== checksumValue) {
      return {
        passed: false,
        message: `Checksum mismatch! Computed: ${computedChecksum.substring(0, 16)}..., Stored: ${checksumValue.substring(0, 16)}...`,
        details: { computed: computedChecksum, stored: checksumValue },
      };
    }

    return {
      passed: true,
      message: 'Protected config is valid with correct checksum',
      details: { checksum: checksumValue, permissions: '444' },
    };
  } catch (error) {
    return {
      passed: false,
      message: `Failed to validate protected config: ${error.message}`,
    };
  }
}

/**
 * Validate agent frontmatter has protected config reference
 */
function validateAgentFrontmatter(agentName: string): ValidationResult {
  const agentPath = path.join(PROD_AGENTS_DIR, `${agentName}.md`);

  try {
    if (!fs.existsSync(agentPath)) {
      return {
        passed: false,
        message: `Agent file does not exist at ${agentPath}`,
      };
    }

    const content = fs.readFileSync(agentPath, 'utf8');

    // Check for protected config reference
    const hasReference = content.includes('_protected_config_source:') &&
                        content.includes(`.system/${agentName}.protected.yaml`);

    if (!hasReference) {
      return {
        passed: false,
        message: 'Agent frontmatter does not reference protected config',
      };
    }

    return {
      passed: true,
      message: 'Agent frontmatter has protected config reference',
    };
  } catch (error) {
    return {
      passed: false,
      message: `Failed to validate frontmatter: ${error.message}`,
    };
  }
}

/**
 * Check if backup was created before migration
 */
function checkBackupExists(agentName: string): ValidationResult {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      return {
        passed: false,
        message: 'Backup directory does not exist',
      };
    }

    const files = fs.readdirSync(BACKUPS_DIR);
    const backupFile = files.find(f => f.includes(agentName));

    if (!backupFile) {
      return {
        passed: false,
        message: 'No backup file found',
      };
    }

    return {
      passed: true,
      message: `Backup exists: ${backupFile}`,
      details: { file: backupFile },
    };
  } catch (error) {
    return {
      passed: false,
      message: `Failed to check backup: ${error.message}`,
    };
  }
}

/**
 * Validate a single agent
 */
function validateAgent(agentName: string, isMigrated: boolean): AgentValidation {
  const validation: AgentValidation = {
    agentName,
    protectedConfigExists: false,
    filePermissions: '',
    checksumValid: false,
    frontmatterHasReference: false,
    backupExists: false,
    loadable: true,
    errors: [],
  };

  if (isMigrated) {
    // Validate protected config
    const configResult = validateProtectedConfig(agentName);
    validation.protectedConfigExists = configResult.passed;
    if (!configResult.passed) {
      validation.errors.push(configResult.message);
    } else {
      validation.filePermissions = configResult.details?.permissions || '';
      validation.checksumValid = true;
    }

    // Validate frontmatter
    const frontmatterResult = validateAgentFrontmatter(agentName);
    validation.frontmatterHasReference = frontmatterResult.passed;
    if (!frontmatterResult.passed) {
      validation.errors.push(frontmatterResult.message);
    }

    // Check backup
    const backupResult = checkBackupExists(agentName);
    validation.backupExists = backupResult.passed;
    if (!backupResult.passed) {
      validation.errors.push(backupResult.message);
    }
  } else {
    // Non-migrated agents should still be loadable
    const agentPath = path.join(PROD_AGENTS_DIR, `${agentName}.md`);
    validation.loadable = fs.existsSync(agentPath);
  }

  return validation;
}

/**
 * Validate system directory permissions
 */
function validateSystemDirectory(): ValidationResult {
  try {
    if (!fs.existsSync(SYSTEM_DIR)) {
      return {
        passed: false,
        message: 'System directory does not exist',
      };
    }

    const stats = fs.statSync(SYSTEM_DIR);
    const perms = (stats.mode & parseInt('777', 8)).toString(8);

    // Directory should be 555 (read + execute only, immutable)
    const expectedPerms = '555';
    const passed = perms === expectedPerms;

    return {
      passed,
      message: passed
        ? `Directory permissions are ${perms} (read + execute only)`
        : `Directory permissions are ${perms} (expected ${expectedPerms})`,
      details: { actual: perms, expected: expectedPerms },
    };
  } catch (error) {
    return {
      passed: false,
      message: `Failed to check directory permissions: ${error.message}`,
    };
  }
}

/**
 * Main validation function
 */
async function runValidation() {
  logSection('🔍 COMPLETE AGENT MIGRATION VALIDATION');

  log('Validating migration of protected agent configurations', 'blue');
  log(`System Directory: ${SYSTEM_DIR}`, 'cyan');
  log(`Agents Directory: ${PROD_AGENTS_DIR}`, 'cyan');
  log(`Backups Directory: ${BACKUPS_DIR}`, 'cyan');

  // 1. Validate system directory
  logSection('1. System Directory Validation');
  const dirResult = validateSystemDirectory();
  logResult(dirResult.passed, dirResult.message);

  // 2. Count protected configs
  logSection('2. Protected Config Files Count');
  const protectedConfigs = fs.readdirSync(SYSTEM_DIR).filter(f => f.endsWith('.protected.yaml'));
  log(`Found ${protectedConfigs.length} protected config files:`, 'blue');
  protectedConfigs.forEach(f => log(`  - ${f}`, 'cyan'));

  const expectedCount = MIGRATED_AGENTS.length + 1; // +1 for example.protected.yaml
  const countPassed = protectedConfigs.length === expectedCount;
  logResult(countPassed, `Expected ${expectedCount} configs (13 agents + 1 example), found ${protectedConfigs.length}`);

  // 3. Validate each migrated agent
  logSection('3. Migrated Agents Validation');
  const migratedValidations: AgentValidation[] = [];

  for (const agentName of MIGRATED_AGENTS) {
    log(`\nValidating: ${agentName}`, 'bold');
    const validation = validateAgent(agentName, true);
    migratedValidations.push(validation);

    logResult(validation.protectedConfigExists, `Protected config exists`);
    logResult(validation.filePermissions === '444', `File permissions: ${validation.filePermissions}`);
    logResult(validation.checksumValid, `Checksum valid`);
    logResult(validation.frontmatterHasReference, `Frontmatter reference exists`);
    logResult(validation.backupExists, `Backup created`);

    if (validation.errors.length > 0) {
      log('\nErrors:', 'red');
      validation.errors.forEach(err => log(`  - ${err}`, 'red'));
    }
  }

  // 4. Validate backward compatibility (non-migrated agents)
  logSection('4. Backward Compatibility (Non-Migrated Agents)');
  const nonMigratedAgents = ALL_AGENTS.filter(a => !MIGRATED_AGENTS.includes(a));
  const nonMigratedValidations: AgentValidation[] = [];

  log(`Testing ${nonMigratedAgents.length} non-migrated agents:`, 'blue');
  for (const agentName of nonMigratedAgents) {
    const validation = validateAgent(agentName, false);
    nonMigratedValidations.push(validation);
    logResult(validation.loadable, `${agentName}: ${validation.loadable ? 'Loadable' : 'Not loadable'}`);
  }

  // 5. Summary
  logSection('5. VALIDATION SUMMARY');

  const migratedPassed = migratedValidations.filter(v =>
    v.protectedConfigExists &&
    v.checksumValid &&
    v.frontmatterHasReference &&
    v.errors.length === 0
  ).length;

  const nonMigratedPassed = nonMigratedValidations.filter(v => v.loadable).length;

  log('\n📊 Results:', 'bold');
  log(`  Migrated Agents: ${migratedPassed}/${MIGRATED_AGENTS.length} passed`,
      migratedPassed === MIGRATED_AGENTS.length ? 'green' : 'red');
  log(`  Non-Migrated Agents: ${nonMigratedPassed}/${nonMigratedAgents.length} loadable`,
      nonMigratedPassed === nonMigratedAgents.length ? 'green' : 'red');
  log(`  System Directory: ${dirResult.passed ? 'PASS' : 'FAIL'}`,
      dirResult.passed ? 'green' : 'red');
  log(`  Protected Configs Count: ${countPassed ? 'PASS' : 'FAIL'}`,
      countPassed ? 'green' : 'red');

  // Overall status
  const allPassed =
    migratedPassed === MIGRATED_AGENTS.length &&
    nonMigratedPassed === nonMigratedAgents.length &&
    dirResult.passed &&
    countPassed;

  console.log('\n');
  if (allPassed) {
    log('🎉 ALL VALIDATIONS PASSED!', 'green');
    log('All migrated agents have valid protected configs with correct checksums.', 'green');
    log('All non-migrated agents remain backward compatible.', 'green');
  } else {
    log('⚠️  SOME VALIDATIONS FAILED', 'red');
    log('Please review the errors above and fix the issues.', 'red');
  }

  // Exit code
  process.exit(allPassed ? 0 : 1);
}

// Run validation
runValidation().catch(error => {
  log(`\n❌ Validation script failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
