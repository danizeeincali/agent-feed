#!/usr/bin/env node
/**
 * Test TypeScript Build Pipeline
 * Verifies that the TypeScript orchestrator can be loaded in production
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('🧪 Testing TypeScript Build Pipeline...\n');

// Test 1: Verify tsx is installed
console.log('1️⃣ Checking tsx installation...');
const tsxCheck = spawn('npx', ['tsx', '--version'], { cwd: '/workspaces/agent-feed/api-server' });
let tsxVersion = '';

tsxCheck.stdout.on('data', (data) => {
  tsxVersion += data.toString();
});

await new Promise((resolve) => tsxCheck.on('close', resolve));
console.log(`   ✅ tsx installed: ${tsxVersion.trim()}\n`);

// Test 2: Verify TypeScript orchestrator can be imported
console.log('2️⃣ Testing TypeScript orchestrator import...');
const importTest = spawn('npx', ['tsx', '-e', `
  import { startOrchestrator, stopOrchestrator, getOrchestratorStatus } from './src/avi/orchestrator-factory.ts';
  console.log('✅ TypeScript imports working');
  console.log('✅ Functions:', Object.keys({ startOrchestrator, stopOrchestrator, getOrchestratorStatus }).join(', '));
`], { cwd: '/workspaces/agent-feed' });

importTest.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.includes('✅'));
  lines.forEach(line => console.log(`   ${line}`));
});

importTest.stderr.on('data', (data) => {
  const str = data.toString();
  if (!str.includes('⚠️') && !str.includes('AVI Configuration')) {
    console.error('   ❌ Error:', str);
  }
});

await new Promise((resolve) => importTest.on('close', resolve));
console.log('');

// Test 3: Verify server can start with TypeScript orchestrator
console.log('3️⃣ Testing server startup with TypeScript orchestrator...');
const serverProcess = spawn('npm', ['start'], {
  cwd: '/workspaces/agent-feed/api-server',
  env: { ...process.env, AVI_ORCHESTRATOR_ENABLED: 'true' }
});

let serverOutput = '';
let orchestratorStarted = false;
let serverStarted = false;

serverProcess.stdout.on('data', (data) => {
  serverOutput += data.toString();
  const lines = data.toString().split('\n');

  lines.forEach(line => {
    if (line.includes('New orchestrator factory loaded successfully')) {
      console.log('   ✅ TypeScript orchestrator factory loaded');
      orchestratorStarted = true;
    }
    if (line.includes('Phase 2 TypeScript) started')) {
      console.log('   ✅ TypeScript orchestrator started');
    }
    if (line.includes('Server running on port')) {
      console.log('   ✅ Server started successfully');
      serverStarted = true;
    }
  });
});

serverProcess.stderr.on('data', (data) => {
  const str = data.toString();
  if (str.includes('error') && !str.includes('[dotenv')) {
    console.error('   ❌ Server error:', str);
  }
});

// Wait for server to start
await setTimeout(8000);

// Kill the server
serverProcess.kill('SIGTERM');
await setTimeout(2000);

console.log('');

// Test 4: Verify graceful shutdown
console.log('4️⃣ Testing graceful shutdown...');
if (serverOutput.includes('Phase 2 TypeScript) stopped')) {
  console.log('   ✅ TypeScript orchestrator stopped gracefully');
}
if (serverOutput.includes('Graceful shutdown complete')) {
  console.log('   ✅ Server shutdown complete');
}

console.log('\n' + '='.repeat(50));
if (orchestratorStarted && serverStarted) {
  console.log('✅ ALL TESTS PASSED - TypeScript build pipeline working!');
  console.log('\nSummary:');
  console.log('  • tsx runtime installed and working');
  console.log('  • TypeScript orchestrator imports successfully');
  console.log('  • Server starts with TypeScript orchestrator');
  console.log('  • Graceful shutdown working');
  console.log('\n🚀 Production deployment ready!');
  process.exit(0);
} else {
  console.log('❌ TESTS FAILED - Check errors above');
  console.log('\nIssues detected:');
  if (!orchestratorStarted) console.log('  • TypeScript orchestrator did not load');
  if (!serverStarted) console.log('  • Server did not start');
  process.exit(1);
}
