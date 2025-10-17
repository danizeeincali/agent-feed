#!/usr/bin/env node

/**
 * Protected Agent Validation Script
 * Validates all protected configurations and agent linkages
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');

const AGENTS_DIR = '/workspaces/agent-feed/prod/.claude/agents';
const SYSTEM_DIR = path.join(AGENTS_DIR, '.system');

function computeChecksum(obj) {
  const clone = JSON.parse(JSON.stringify(obj));
  delete clone.checksum;
  const sortedObj = JSON.stringify(clone, Object.keys(clone).sort());
  return crypto.createHash('sha256').update(sortedObj, 'utf8').digest('hex');
}

function validateAgent(agentId) {
  const results = {
    agentId,
    checks: {},
    errors: [],
    warnings: []
  };

  // Check 1: Agent file exists
  const agentFilePath = path.join(AGENTS_DIR, `${agentId}.md`);
  results.checks.agentFileExists = fs.existsSync(agentFilePath);
  if (!results.checks.agentFileExists) {
    results.errors.push('Agent .md file not found');
    return results;
  }

  // Check 2: Protected config exists
  const protectedConfigPath = path.join(SYSTEM_DIR, `${agentId}.protected.yaml`);
  results.checks.protectedConfigExists = fs.existsSync(protectedConfigPath);
  if (!results.checks.protectedConfigExists) {
    results.errors.push('Protected config file not found');
    return results;
  }

  // Check 3: Protected config is read-only
  const stats = fs.statSync(protectedConfigPath);
  const mode = (stats.mode & parseInt('777', 8)).toString(8);
  results.checks.isReadOnly = mode === '444';
  if (!results.checks.isReadOnly) {
    results.warnings.push(`File permissions are ${mode}, expected 444`);
  }

  // Check 4: Agent frontmatter has _protected_config_source
  const agentContent = fs.readFileSync(agentFilePath, 'utf8');
  results.checks.hasFrontmatterLink = agentContent.includes('_protected_config_source');
  if (!results.checks.hasFrontmatterLink) {
    results.errors.push('Agent frontmatter missing _protected_config_source');
  }

  // Check 5: Protected config is valid YAML
  try {
    const protectedContent = fs.readFileSync(protectedConfigPath, 'utf8');
    const protectedConfig = yaml.load(protectedContent);
    results.checks.validYAML = true;

    // Check 6: Has required fields
    const requiredFields = ['version', 'agent_id', 'checksum', 'permissions'];
    const missingFields = requiredFields.filter(f => !protectedConfig[f]);
    results.checks.hasRequiredFields = missingFields.length === 0;
    if (missingFields.length > 0) {
      results.errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Check 7: Checksum is valid
    const storedChecksum = protectedConfig.checksum;
    delete protectedConfig.checksum;
    const recomputedChecksum = `sha256:${computeChecksum(protectedConfig)}`;
    results.checks.checksumValid = storedChecksum === recomputedChecksum;
    if (!results.checks.checksumValid) {
      results.errors.push(`Checksum mismatch: stored=${storedChecksum.substring(0, 20)}..., computed=${recomputedChecksum.substring(0, 20)}...`);
    }

    // Check 8: Has security settings
    results.checks.hasSecurity = protectedConfig.permissions &&
                                 protectedConfig.permissions.security &&
                                 protectedConfig.permissions.security.sandbox_enabled === true;
    if (!results.checks.hasSecurity) {
      results.errors.push('Missing or invalid security settings');
    }

    // Check 9: Has resource limits
    results.checks.hasResourceLimits = protectedConfig.permissions &&
                                       protectedConfig.permissions.resource_limits &&
                                       protectedConfig.permissions.resource_limits.max_memory;
    if (!results.checks.hasResourceLimits) {
      results.warnings.push('Missing resource limits');
    }

    // Check 10: Workspace path matches agent_id
    const expectedWorkspace = `/workspaces/agent-feed/prod/agent_workspace/${agentId}`;
    const actualWorkspace = protectedConfig.permissions?.workspace?.root;
    results.checks.workspacePathCorrect = actualWorkspace === expectedWorkspace;
    if (!results.checks.workspacePathCorrect) {
      results.warnings.push(`Workspace mismatch: expected=${expectedWorkspace}, actual=${actualWorkspace}`);
    }

  } catch (error) {
    results.checks.validYAML = false;
    results.errors.push(`YAML parsing error: ${error.message}`);
  }

  return results;
}

function main() {
  console.log('🔍 Protected Agent Validation');
  console.log('=============================\n');

  // Get all protected config files
  const protectedFiles = fs.readdirSync(SYSTEM_DIR)
    .filter(f => f.endsWith('.protected.yaml'))
    .map(f => f.replace('.protected.yaml', ''));

  console.log(`Found ${protectedFiles.length} protected configurations\n`);

  const allResults = [];
  let totalPassed = 0;
  let totalWarnings = 0;
  let totalFailed = 0;

  for (const agentId of protectedFiles) {
    const results = validateAgent(agentId);
    allResults.push(results);

    const passed = results.errors.length === 0;
    const hasWarnings = results.warnings.length > 0;

    if (passed && !hasWarnings) {
      totalPassed++;
      console.log(`✅ ${agentId}`);
    } else if (passed && hasWarnings) {
      totalWarnings++;
      console.log(`⚠️  ${agentId}`);
      results.warnings.forEach(w => console.log(`   ⚠️  ${w}`));
    } else {
      totalFailed++;
      console.log(`❌ ${agentId}`);
      results.errors.forEach(e => console.log(`   ❌ ${e}`));
    }
  }

  console.log('\n📊 Validation Summary');
  console.log('====================\n');
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`⚠️  Warnings: ${totalWarnings}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`📁 Total: ${protectedFiles.length}\n`);

  if (totalFailed === 0 && totalWarnings === 0) {
    console.log('🎉 All agents validated successfully!');
  } else if (totalFailed === 0) {
    console.log('✅ All agents passed with minor warnings');
  } else {
    console.log('❌ Some agents failed validation - review errors above');
    process.exit(1);
  }

  // Detailed check summary
  console.log('\n📋 Detailed Check Results');
  console.log('========================\n');

  const checkTypes = [
    'agentFileExists',
    'protectedConfigExists',
    'isReadOnly',
    'hasFrontmatterLink',
    'validYAML',
    'hasRequiredFields',
    'checksumValid',
    'hasSecurity',
    'hasResourceLimits',
    'workspacePathCorrect'
  ];

  checkTypes.forEach(check => {
    const passed = allResults.filter(r => r.checks[check]).length;
    const total = allResults.length;
    const status = passed === total ? '✅' : '⚠️';
    console.log(`${status} ${check}: ${passed}/${total}`);
  });
}

if (require.main === module) {
  main();
}

module.exports = { validateAgent };
