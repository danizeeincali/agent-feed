#!/usr/bin/env node

/**
 * Quick validation script to check if the real output streaming fix is working
 */

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🔧 Validating Real Claude Output Streaming Fix');
console.log('=============================================');

// Check backend file for removed mock responses
console.log('1. Checking backend for mock response removal...');

const backendContent = fs.readFileSync('/workspaces/agent-feed/simple-backend.js', 'utf8');

const mockIndicators = [
  'Claude Code session started for instance',
  'HTTP/SSE terminal active - WebSocket storm eliminated',
  '[${new Date().toLocaleTimeString()}] HTTP/SSE terminal active'
];

let mockResponsesFound = 0;
mockIndicators.forEach(indicator => {
  if (backendContent.includes(indicator)) {
    console.log(`❌ Found mock response: "${indicator}"`);
    mockResponsesFound++;
  }
});

if (mockResponsesFound === 0) {
  console.log('✅ No mock responses found in backend');
} else {
  console.log(`❌ Found ${mockResponsesFound} mock response patterns`);
}

// Check that real output broadcasting is present
console.log('2. Checking for real Claude output broadcasting...');

const realOutputIndicators = [
  'claudeProcess.stdout.on(\'data\'',
  'claudeProcess.stderr.on(\'data\'',
  'broadcastToAllConnections(instanceId, {',
  'type: \'output\','
];

let realOutputHandlers = 0;
realOutputIndicators.forEach(indicator => {
  if (backendContent.includes(indicator)) {
    realOutputHandlers++;
  }
});

if (realOutputHandlers === realOutputIndicators.length) {
  console.log('✅ All real output handlers found');
} else {
  console.log(`❌ Missing real output handlers: ${realOutputHandlers}/${realOutputIndicators.length}`);
}

// Check frontend for removed mock responses
console.log('3. Checking frontend for mock response handling...');

const frontendContent = fs.readFileSync('/workspaces/agent-feed/frontend/src/components/ClaudeInstanceManager.tsx', 'utf8');

const frontendMockIndicators = [
  '[RESPONSE] Claude Code session started',
  'Ready for input'
];

let frontendMockFound = 0;
frontendMockIndicators.forEach(indicator => {
  if (frontendContent.includes(indicator)) {
    console.log(`⚠️  Found potential mock response in frontend: "${indicator}"`);
    frontendMockFound++;
  }
});

// Check that real output handlers are present
const frontendRealOutputIndicators = [
  'on(\'output\', (data)',
  'on(\'terminal:output\', (data)',
  'data.data && data.instanceId',
  'setOutput(prev => ({'
];

let frontendRealHandlers = 0;
frontendRealOutputIndicators.forEach(indicator => {
  if (frontendContent.includes(indicator)) {
    frontendRealHandlers++;
  }
});

if (frontendRealHandlers === frontendRealOutputIndicators.length) {
  console.log('✅ All frontend real output handlers found');
} else {
  console.log(`❌ Missing frontend real output handlers: ${frontendRealHandlers}/${frontendRealOutputIndicators.length}`);
}

// Summary
console.log('4. Summary:');
console.log(`   Backend mock responses: ${mockResponsesFound === 0 ? '✅ REMOVED' : '❌ STILL PRESENT'}`);
console.log(`   Backend real output handlers: ${realOutputHandlers === realOutputIndicators.length ? '✅ PRESENT' : '❌ MISSING'}`);
console.log(`   Frontend real output handlers: ${frontendRealHandlers === frontendRealOutputIndicators.length ? '✅ PRESENT' : '❌ MISSING'}`);

const allGood = mockResponsesFound === 0 && 
               realOutputHandlers === realOutputIndicators.length && 
               frontendRealHandlers === frontendRealOutputIndicators.length;

if (allGood) {
  console.log('🎉 FIX VALIDATION PASSED: Real Claude output streaming should work!');
} else {
  console.log('❌ FIX VALIDATION FAILED: Some issues remain');
}

console.log('\n📋 Next steps:');
console.log('  1. Start backend: node simple-backend.js');
console.log('  2. Start frontend: cd frontend && npm run dev');
console.log('  3. Create Claude instance and test real output');
console.log('  4. Verify no mock responses appear in terminal');