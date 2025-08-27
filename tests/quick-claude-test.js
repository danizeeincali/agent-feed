#!/usr/bin/env node

/**
 * Quick Claude CLI Test - Simple test to check basic Claude functionality
 */

const { exec } = require('child_process');

console.log('=== Quick Claude CLI Test ===\n');

const tests = [
  {
    name: 'Basic claude command',
    command: 'timeout 5s claude --help || echo "HELP_FAILED"'
  },
  {
    name: 'Claude version',
    command: 'claude --version || echo "VERSION_FAILED"'
  },
  {
    name: 'Which claude',
    command: 'which claude || echo "NOT_FOUND"'
  },
  {
    name: 'Echo test',
    command: 'echo "test" | timeout 3s claude || echo "ECHO_FAILED"'
  },
  {
    name: 'Working directory test',
    command: 'cd /workspaces/agent-feed/prod && timeout 3s claude --help || echo "WORKDIR_FAILED"'
  }
];

async function runTest(test) {
  return new Promise((resolve) => {
    console.log(`Running: ${test.name}`);
    const startTime = Date.now();
    
    exec(test.command, { timeout: 10000 }, (error, stdout, stderr) => {
      const duration = Date.now() - startTime;
      const result = {
        name: test.name,
        command: test.command,
        duration,
        exitCode: error ? error.code : 0,
        stdout: stdout.toString().trim(),
        stderr: stderr.toString().trim(),
        error: error ? error.message : null
      };
      
      console.log(`  Duration: ${duration}ms`);
      console.log(`  Exit Code: ${result.exitCode}`);
      if (result.stdout) console.log(`  Output: ${result.stdout.slice(0, 100)}...`);
      if (result.stderr) console.log(`  Error: ${result.stderr.slice(0, 100)}...`);
      console.log('');
      
      resolve(result);
    });
  });
}

async function main() {
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await runTest(test);
      results.push(result);
    } catch (error) {
      console.error(`Failed to run test ${test.name}:`, error);
      results.push({
        name: test.name,
        error: error.message,
        failed: true
      });
    }
  }
  
  console.log('=== SUMMARY ===');
  results.forEach(result => {
    const status = result.error || result.exitCode !== 0 ? '❌ FAILED' : '✅ PASSED';
    console.log(`${status} - ${result.name}`);
  });
  
  // Check for common issues
  const whichResult = results.find(r => r.name.includes('Which'));
  if (whichResult && whichResult.stdout.includes('NOT_FOUND')) {
    console.log('\n🚨 Claude CLI not found in PATH');
  }
  
  const helpResult = results.find(r => r.name.includes('Basic'));
  if (helpResult && helpResult.stdout.includes('HELP_FAILED')) {
    console.log('\n🚨 Claude CLI does not respond to --help');
  }
  
  console.log('\nFor detailed analysis, run: node debug-claude-cli.js');
}

main().catch(console.error);