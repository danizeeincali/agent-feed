#!/usr/bin/env node

/**
 * Avi DM Real Integration Validation
 * Tests that Avi DM is using real Claude Code, not mocks
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';
const TIMEOUT = 40000; // 40 seconds for Claude Code responses

console.log('🔍 Avi DM Real Integration Validation\n');

async function testAviEndpoint() {
  console.log('Test 1: Verify /api/claude-code/streaming-chat endpoint exists');

  const systemContext = `You are Λvi, the production Claude instance operating as Chief of Staff. Your complete operating instructions and personality are defined in /workspaces/agent-feed/prod/CLAUDE.md. Read that file using your Read tool to understand your role and boundaries.`;

  const userMessage = 'Who are you? Answer in one short sentence.';
  const fullPrompt = `${systemContext}\n\nUser message: ${userMessage}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(`${API_BASE}/api/claude-code/streaming-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: fullPrompt,
        options: { cwd: '/workspaces/agent-feed/prod' }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`❌ FAIL: HTTP ${response.status} ${response.statusText}`);
      return false;
    }

    const data = await response.json();

    // Verify response structure
    if (!data.success) {
      console.log('❌ FAIL: Response success=false');
      return false;
    }

    if (!data.message) {
      console.log('❌ FAIL: No message in response');
      return false;
    }

    console.log('✅ PASS: Endpoint returns successful response');
    console.log(`📝 Response: "${data.message.substring(0, 100)}..."`);

    // Check for Λvi identity
    const messageLower = data.message.toLowerCase();
    if (messageLower.includes('λvi') || messageLower.includes('avi') || messageLower.includes('chief of staff')) {
      console.log('✅ PASS: Response mentions Λvi/Chief of Staff identity');
    } else {
      console.log('⚠️  WARNING: Response does not clearly mention Λvi identity');
    }

    // Check for mock indicators
    const mockIndicators = [
      'thanks for your message',
      'i\'m avi, your ai assistant',
      'setTimeout',
      'mock response'
    ];

    const hasMockIndicators = mockIndicators.some(indicator =>
      messageLower.includes(indicator.toLowerCase())
    );

    if (hasMockIndicators) {
      console.log('❌ FAIL: Response contains mock/template indicators');
      return false;
    }

    console.log('✅ PASS: No mock/template indicators detected');

    // Check for real Claude Code metadata
    if (data.claudeCode === true) {
      console.log('✅ PASS: Response marked as real Claude Code');
    } else {
      console.log('⚠️  WARNING: Response not explicitly marked as Claude Code');
    }

    if (data.toolsEnabled === true) {
      console.log('✅ PASS: Tools are enabled');
    }

    return true;

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`⏱️  TIMEOUT: Request exceeded ${TIMEOUT}ms`);
      console.log('ℹ️  Note: Claude Code requests can take 20-40 seconds');
      return false;
    }
    console.log(`❌ ERROR: ${error.message}`);
    return false;
  }
}

async function testFrontendIntegration() {
  console.log('\nTest 2: Verify frontend code has no mock setTimeout');

  const fs = await import('fs');
  const path = '/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx';

  try {
    const content = fs.readFileSync(path, 'utf8');

    // Check for removed mock code
    if (content.includes('setTimeout') && content.includes('Thanks for your message')) {
      console.log('❌ FAIL: Mock setTimeout code still present');
      return false;
    }

    // Check for real API call
    if (!content.includes('callAviClaudeCode')) {
      console.log('❌ FAIL: callAviClaudeCode function not found');
      return false;
    }

    if (!content.includes('/api/claude-code/streaming-chat')) {
      console.log('❌ FAIL: Real API endpoint not found');
      return false;
    }

    // Check for CLAUDE.md reference
    if (!content.includes('CLAUDE.md')) {
      console.log('⚠️  WARNING: No reference to CLAUDE.md found');
    } else {
      console.log('✅ PASS: CLAUDE.md reference present');
    }

    // Check for Λvi branding
    if (!content.includes('Λvi')) {
      console.log('⚠️  WARNING: Λvi branding not found');
    } else {
      console.log('✅ PASS: Λvi branding present');
    }

    console.log('✅ PASS: Frontend code uses real API integration');
    return true;

  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return false;
  }
}

async function testCLAUDEmdExists() {
  console.log('\nTest 3: Verify CLAUDE.md file exists and is readable');

  const fs = await import('fs');
  const path = '/workspaces/agent-feed/prod/CLAUDE.md';

  try {
    const content = fs.readFileSync(path, 'utf8');

    if (content.length === 0) {
      console.log('❌ FAIL: CLAUDE.md is empty');
      return false;
    }

    console.log(`✅ PASS: CLAUDE.md exists (${content.length} bytes)`);

    // Check for key content
    if (content.includes('Λvi')) {
      console.log('✅ PASS: Contains Λvi identity');
    }

    if (content.includes('Chief of Staff')) {
      console.log('✅ PASS: Contains Chief of Staff role');
    }

    if (content.includes('/prod/agent_workspace/')) {
      console.log('✅ PASS: Contains agent_workspace path');
    }

    return true;

  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return false;
  }
}

// Run all tests
async function main() {
  const results = [];

  results.push(await testCLAUDEmdExists());
  results.push(await testFrontendIntegration());
  results.push(await testAviEndpoint());

  const passed = results.filter(r => r === true).length;
  const total = results.length;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Results: ${passed}/${total} tests passed`);
  console.log(`${'='.repeat(60)}\n`);

  if (passed === total) {
    console.log('✅ SUCCESS: All validation tests passed!');
    console.log('✅ Avi DM is using REAL Claude Code integration');
    console.log('✅ No mock/simulation data detected');
    process.exit(0);
  } else {
    console.log('❌ FAILURE: Some tests failed');
    console.log('⚠️  Please review the failures above');
    process.exit(1);
  }
}

main();
