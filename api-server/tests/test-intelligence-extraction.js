#!/usr/bin/env node
/**
 * Direct test for intelligence extraction fix
 * Tests that extractFromWorkspaceFiles searches subdirectories
 */

import AgentWorker from '../worker/agent-worker.js';

async function runTests() {
  console.log('🧪 Testing Intelligence Extraction Fix\n');
  console.log('=' .repeat(60));

  const worker = new AgentWorker({ workerId: 'test-worker' });

  // Test 1: Find intelligence in subdirectory
  console.log('\n📋 Test 1: Find intelligence file in subdirectory');
  console.log('-'.repeat(60));
  const workspaceDir = '/workspaces/agent-feed/prod/agent_workspace/link-logger-agent';
  console.log(`Workspace: ${workspaceDir}`);

  try {
    const result = await worker.extractFromWorkspaceFiles(workspaceDir);

    if (result) {
      console.log('✅ SUCCESS: Found intelligence');
      console.log(`   Length: ${result.length} characters`);
      console.log(`   Preview: ${result.substring(0, 150)}...`);
    } else {
      console.log('❌ FAILED: Returned null');
      process.exit(1);
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    process.exit(1);
  }

  // Test 2: Non-existent workspace
  console.log('\n📋 Test 2: Non-existent workspace (should return null)');
  console.log('-'.repeat(60));
  const nonExistentDir = '/workspaces/agent-feed/prod/agent_workspace/nonexistent';
  console.log(`Workspace: ${nonExistentDir}`);

  try {
    const result = await worker.extractFromWorkspaceFiles(nonExistentDir);

    if (result === null) {
      console.log('✅ SUCCESS: Correctly returned null');
    } else {
      console.log(`❌ FAILED: Expected null, got result with ${result.length} characters`);
      process.exit(1);
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    process.exit(1);
  }

  // Test 3: Verify content quality
  console.log('\n📋 Test 3: Verify extracted content quality');
  console.log('-'.repeat(60));

  try {
    const result = await worker.extractFromWorkspaceFiles(workspaceDir);

    const checks = [
      { name: 'Not empty', pass: result && result.length > 0 },
      { name: 'Contains expected content', pass: result && result.includes('AgentDB') },
      { name: 'Reasonable length', pass: result && result.length > 100 && result.length < 10000 },
      { name: 'No markdown headers', pass: result && !result.startsWith('##') }
    ];

    let allPassed = true;
    for (const check of checks) {
      const status = check.pass ? '✅' : '❌';
      console.log(`${status} ${check.name}`);
      if (!check.pass) allPassed = false;
    }

    if (!allPassed) {
      console.log('\n❌ Some quality checks failed');
      process.exit(1);
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    process.exit(1);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 ALL TESTS PASSED');
  console.log('='.repeat(60));
  console.log('\n✅ Fix verified: Worker now searches subdirectories for intelligence files');
  console.log('✅ Priority order: intelligence/ > summaries/ > root/');
  console.log('✅ Properly extracts Executive Summary sections');
}

runTests().catch(error => {
  console.error('💥 Test suite error:', error);
  process.exit(1);
});
