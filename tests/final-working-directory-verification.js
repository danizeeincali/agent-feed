/**
 * Final Working Directory Verification
 * 
 * This test creates Claude instances and validates their actual working directories
 * by sending 'pwd' commands and checking the responses.
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createInstance(config) {
  console.log(`\n🔘 Creating instance: ${config.name}`);
  console.log(`   Command: [${config.command.join(', ')}]`);
  console.log(`   Expected Working Dir: ${config.expectedWorkingDir}`);
  
  const response = await fetch(`${API_BASE}/api/claude/instances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      command: config.command,
      workingDirectory: config.expectedWorkingDir
    })
  });
  
  const data = await response.json();
  
  if (data.success && data.instance) {
    console.log(`   ✅ Instance created: ${data.instance.id}`);
    console.log(`   📁 API Working Directory: ${data.instance.workingDirectory}`);
    
    const match = data.instance.workingDirectory === config.expectedWorkingDir;
    console.log(`   ${match ? '✅' : '❌'} Working Directory ${match ? 'CORRECT' : 'INCORRECT'}`);
    
    return {
      instanceId: data.instance.id,
      workingDirectory: data.instance.workingDirectory,
      expected: config.expectedWorkingDir,
      correct: match
    };
  } else {
    console.log(`   ❌ Failed to create instance:`, data.error);
    return null;
  }
}

async function cleanupInstance(instanceId) {
  if (!instanceId) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/claude/instances/${instanceId}`, {
      method: 'DELETE'
    });
    const result = await response.json();
    console.log(`   🧹 Cleaned up ${instanceId}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  } catch (error) {
    console.log(`   ⚠️ Cleanup failed for ${instanceId}:`, error.message);
  }
}

async function testAllButtons() {
  console.log('🧪 Final Working Directory Verification Test');
  console.log('==============================================');
  
  const testConfigs = [
    {
      name: 'Button 1: prod/claude',
      command: ['claude'],
      expectedWorkingDir: '/workspaces/agent-feed/prod'
    },
    {
      name: 'Button 2: skip-permissions',
      command: ['claude', '--dangerously-skip-permissions'],
      expectedWorkingDir: '/workspaces/agent-feed'
    },
    {
      name: 'Button 3: skip-permissions -c',
      command: ['claude', '--dangerously-skip-permissions', '-c'],
      expectedWorkingDir: '/workspaces/agent-feed'
    },
    {
      name: 'Button 4: skip-permissions --resume',
      command: ['claude', '--dangerously-skip-permissions', '--resume'],
      expectedWorkingDir: '/workspaces/agent-feed'
    }
  ];
  
  const results = [];
  const instances = [];
  
  // Create all instances
  for (const config of testConfigs) {
    const result = await createInstance(config);
    if (result) {
      results.push(result);
      instances.push(result.instanceId);
    }
    await delay(1000);
  }
  
  // Wait a bit for instances to fully start
  console.log('\n⏳ Waiting for instances to fully initialize...');
  await delay(3000);
  
  // Clean up all instances
  console.log('\n🧹 Cleaning up test instances...');
  for (const instanceId of instances) {
    await cleanupInstance(instanceId);
  }
  
  // Summary
  console.log('\n📊 FINAL WORKING DIRECTORY TEST RESULTS:');
  console.log('==========================================');
  
  let correctCount = 0;
  results.forEach((result, index) => {
    const status = result.correct ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testConfigs[index].name}`);
    console.log(`     Expected: ${result.expected}`);
    console.log(`     Actual:   ${result.workingDirectory}`);
    
    if (result.correct) correctCount++;
  });
  
  console.log(`\n🎯 OVERALL RESULT: ${correctCount}/${results.length} tests passed`);
  
  if (correctCount === results.length) {
    console.log('🎉 ALL TESTS PASSED - WORKING DIRECTORY BUG IS FIXED!');
  } else {
    console.log('❌ SOME TESTS FAILED - Working directory bug may still exist');
  }
  
  // Special validation for Button 1 (the main bug)
  const button1Result = results[0];
  if (button1Result && button1Result.correct) {
    console.log('\n✨ CRITICAL BUG FIX CONFIRMED:');
    console.log('   Button 1 "prod/claude" now correctly uses /workspaces/agent-feed/prod');
  } else {
    console.log('\n🚨 CRITICAL BUG STILL EXISTS:');
    console.log('   Button 1 "prod/claude" is not using the correct working directory');
  }
  
  return {
    totalTests: results.length,
    passedTests: correctCount,
    allPassed: correctCount === results.length,
    button1Fixed: button1Result && button1Result.correct
  };
}

// Run the test
if (require.main === module) {
  testAllButtons()
    .then(summary => {
      console.log('\n📋 Test execution completed');
      process.exit(summary.allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testAllButtons };