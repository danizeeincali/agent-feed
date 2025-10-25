#!/usr/bin/env node

/**
 * Validation Script: Subdirectory Intelligence Search Fix
 *
 * This script validates that the agent worker can properly find and extract
 * intelligence from the /intelligence subdirectory in agent workspaces.
 */

import AgentWorker from '../worker/agent-worker.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n' + '='.repeat(70));
console.log('VALIDATION: Subdirectory Intelligence Search Fix');
console.log('='.repeat(70) + '\n');

async function validateFix() {
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // Test 1: Workspace structure
  console.log('📋 Test 1: Workspace Structure Validation\n');
  const workspaceDir = '/workspaces/agent-feed/prod/agent_workspace/link-logger-agent';
  const intelligenceDir = path.join(workspaceDir, 'intelligence');

  if (fs.existsSync(workspaceDir)) {
    results.passed.push('✅ Workspace directory exists');
    console.log('   ✅ Workspace directory exists:', workspaceDir);
  } else {
    results.failed.push('❌ Workspace directory not found');
    console.log('   ❌ Workspace directory not found:', workspaceDir);
    return results;
  }

  if (fs.existsSync(intelligenceDir)) {
    results.passed.push('✅ Intelligence subdirectory exists');
    console.log('   ✅ Intelligence subdirectory exists:', intelligenceDir);

    const files = fs.readdirSync(intelligenceDir);
    console.log('   📁 Files found:', files.length);
    files.forEach((file, i) => {
      console.log(`      ${i + 1}. ${file}`);
    });

    if (files.length > 0) {
      results.passed.push(`✅ Found ${files.length} files in intelligence directory`);
    } else {
      results.warnings.push('⚠️  Intelligence directory is empty');
    }
  } else {
    results.warnings.push('⚠️  Intelligence subdirectory does not exist');
    console.log('   ⚠️  Intelligence subdirectory not found (expected for new workspaces)');
  }

  // Test 2: Intelligence extraction
  console.log('\n📋 Test 2: Intelligence Extraction\n');
  const worker = new AgentWorker({ workerId: 'validation-test' });

  try {
    const intelligence = await worker.extractFromWorkspaceFiles(workspaceDir);

    if (intelligence === null) {
      results.failed.push('❌ Intelligence extraction returned null');
      console.log('   ❌ No intelligence extracted (returned null)');
      return results;
    }

    results.passed.push('✅ Intelligence extracted successfully');
    console.log('   ✅ Intelligence extracted successfully');
    console.log('   📏 Content length:', intelligence.length, 'characters');

    // Test 3: Content quality
    console.log('\n📋 Test 3: Content Quality Validation\n');

    const contentChecks = [
      { key: 'AgentDB', label: 'Contains "AgentDB"' },
      { key: 'vector', label: 'Contains "vector"' },
      { key: 'database', label: 'Contains "database"' },
      { key: 'performance', label: 'Contains "performance"' }
    ];

    contentChecks.forEach(check => {
      if (intelligence.includes(check.key)) {
        results.passed.push(`✅ ${check.label}`);
        console.log(`   ✅ ${check.label}`);
      } else {
        results.warnings.push(`⚠️  Missing "${check.key}" in content`);
        console.log(`   ⚠️  Missing "${check.key}" in content`);
      }
    });

    // Content preview
    console.log('\n📄 Content Preview (first 300 chars):\n');
    console.log('   ' + intelligence.substring(0, 300).replace(/\n/g, '\n   '));
    console.log('\n   ...\n');

    // Test 4: Error handling
    console.log('📋 Test 4: Error Handling\n');
    const nullResult = await worker.extractFromWorkspaceFiles('/nonexistent/path');
    if (nullResult === null) {
      results.passed.push('✅ Handles missing directories gracefully');
      console.log('   ✅ Handles missing directories gracefully (returns null)');
    } else {
      results.failed.push('❌ Did not handle missing directory properly');
      console.log('   ❌ Did not handle missing directory properly');
    }

  } catch (error) {
    results.failed.push(`❌ Error during extraction: ${error.message}`);
    console.log('   ❌ Error during extraction:', error.message);
    console.error(error);
  }

  return results;
}

// Run validation
validateFix().then(results => {
  console.log('\n' + '='.repeat(70));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(70) + '\n');

  console.log(`✅ Passed: ${results.passed.length}`);
  results.passed.forEach(item => console.log(`   ${item}`));

  if (results.warnings.length > 0) {
    console.log(`\n⚠️  Warnings: ${results.warnings.length}`);
    results.warnings.forEach(item => console.log(`   ${item}`));
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length}`);
    results.failed.forEach(item => console.log(`   ${item}`));
  }

  console.log('\n' + '='.repeat(70));

  if (results.failed.length === 0) {
    console.log('🎉 VALIDATION PASSED - Fix is working correctly!');
    console.log('='.repeat(70) + '\n');
    process.exit(0);
  } else {
    console.log('❌ VALIDATION FAILED - Issues detected');
    console.log('='.repeat(70) + '\n');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n❌ VALIDATION ERROR:', error);
  process.exit(1);
});
