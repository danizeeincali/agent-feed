/**
 * SPARC Test Setup
 * Setup configuration for SPARC TDD validation tests
 */

import { jest } from '@jest/globals';

// Setup test environment
beforeAll(() => {
  console.log('🚀 SPARC TDD Validation Suite Initializing...');
  console.log('📋 Testing corrected agent loading functionality');
  console.log('🎯 Expected: Real agent files, no system processes');
  console.log('📍 Agent Directory: /workspaces/agent-feed/prod/.claude/agents');
  console.log('');
});

// Global test utilities
global.expectValidAgent = (agent) => {
  expect(agent).toHaveProperty('id');
  expect(agent).toHaveProperty('name');
  expect(agent).toHaveProperty('description');
  expect(agent).toHaveProperty('system_prompt');
  expect(agent).toHaveProperty('capabilities');
  expect(agent).toHaveProperty('status');

  expect(typeof agent.id).toBe('string');
  expect(typeof agent.name).toBe('string');
  expect(typeof agent.description).toBe('string');
  expect(typeof agent.system_prompt).toBe('string');
  expect(Array.isArray(agent.capabilities)).toBe(true);
  expect(typeof agent.status).toBe('string');
};

global.expectNoSystemProcessArtifacts = (agent) => {
  const textContent = [
    agent.id,
    agent.name,
    agent.description,
    agent.system_prompt
  ].join(' ').toLowerCase();

  expect(textContent).not.toContain('pid');
  expect(textContent).not.toContain('%cpu');
  expect(textContent).not.toContain('%mem');
  expect(textContent).not.toContain('process id');
  expect(textContent).not.toContain('command line');
  expect(textContent).not.toContain('analytics database agent');
};

// Test result tracking
let testResults = {
  specification: 0,
  pseudocode: 0,
  architecture: 0,
  refinement: 0,
  completion: 0,
  total: 0,
  passed: 0,
  failed: 0
};

// Track test results by SPARC phase
const originalTest = global.test;
global.test = (name, fn) => {
  return originalTest(name, async () => {
    testResults.total++;

    // Identify SPARC phase
    if (name.toLowerCase().includes('specification')) testResults.specification++;
    if (name.toLowerCase().includes('pseudocode')) testResults.pseudocode++;
    if (name.toLowerCase().includes('architecture')) testResults.architecture++;
    if (name.toLowerCase().includes('refinement')) testResults.refinement++;
    if (name.toLowerCase().includes('completion')) testResults.completion++;

    try {
      await fn();
      testResults.passed++;
    } catch (error) {
      testResults.failed++;
      throw error;
    }
  });
};

// Cleanup and reporting
afterAll(() => {
  console.log('');
  console.log('🏁 SPARC TDD Validation Complete');
  console.log('═══════════════════════════════════');
  console.log(`📊 Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  console.log('');
  console.log('SPARC Phase Breakdown:');
  console.log(`📋 Specification: ${testResults.specification} tests`);
  console.log(`🔄 Pseudocode: ${testResults.pseudocode} tests`);
  console.log(`🏗️ Architecture: ${testResults.architecture} tests`);
  console.log(`🔧 Refinement: ${testResults.refinement} tests`);
  console.log(`🎯 Completion: ${testResults.completion} tests`);
  console.log('');

  if (testResults.failed === 0) {
    console.log('🎉 ALL TESTS PASSED - Agent loading system validated!');
    console.log('✅ Confirmed: Data source is real_agent_files');
    console.log('✅ Confirmed: No system processes in agent data');
    console.log('✅ Confirmed: Agent count matches directory files');
  } else {
    console.log('⚠️ Some tests failed - check results above');
  }
  console.log('');
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

export { testResults };