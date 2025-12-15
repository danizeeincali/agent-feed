#!/usr/bin/env node

/**
 * Test script for slug migration
 * Tests duplicate handling and slug generation logic
 */

import { generateSlug } from './add-slugs-to-agents.js';

console.log('🧪 Testing slug generation logic\n');

const testCases = [
  { input: 'BackendDeveloper', expected: 'backenddeveloper' },
  { input: 'API Integrator', expected: 'api-integrator' },
  { input: 'creative-writer', expected: 'creative-writer' },
  { input: 'Test@Agent#123', expected: 'test-agent-123' },
  { input: 'Multiple   Spaces', expected: 'multiple-spaces' },
  { input: '---Leading-Trailing---', expected: 'leading-trailing' },
  { input: 'CamelCaseAgent', expected: 'camelcaseagent' },
  { input: 'agent-feedback-agent', expected: 'agent-feedback-agent' },
  { input: '', expected: 'untitled' },
  { input: '!!!', expected: 'untitled' },
];

let passed = 0;
let failed = 0;

console.log('📋 Test Cases:\n');

testCases.forEach(({ input, expected }) => {
  const result = generateSlug(input);
  const status = result === expected ? '✅' : '❌';

  if (result === expected) {
    passed++;
  } else {
    failed++;
  }

  console.log(`${status} "${input}" → "${result}" ${result === expected ? '' : `(expected: "${expected}")`}`);
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}

console.log('✅ All tests passed!');
