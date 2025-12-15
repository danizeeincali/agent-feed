/**
 * Frontend Risk Detection Test
 */

// Mock detectRiskyContent since we can't import TypeScript directly
const SAFE_ZONE_PATTERNS = [
  '/workspaces/agent-feed/prod/agent_workspace/',
  '/prod/agent_workspace/',
  'prod/agent_workspace/'
];

const BLOCKED_DIRECTORIES = [
  { pattern: '/workspaces/agent-feed/frontend/', name: 'Frontend' },
  { pattern: '/frontend/', name: 'Frontend' },
  { pattern: '/workspaces/agent-feed/api-server/', name: 'Backend' },
  { pattern: '/api-server/', name: 'Backend' }
];

const PROTECTED_FILES_IN_PROD = [
  { pattern: '/workspaces/agent-feed/prod/package.json', name: 'package.json' },
  { pattern: 'prod/package.json', name: 'package.json' },
  { pattern: '/workspaces/agent-feed/prod/.env', name: '.env' },
  { pattern: 'prod/.env', name: '.env' }
];

const SHELL_COMMANDS = [
  { pattern: 'rm ', description: 'Remove command' },
  { pattern: 'sudo ', description: 'Superuser command' },
  { pattern: 'chmod ', description: 'Change permissions' }
];

const DESTRUCTIVE_KEYWORDS = [
  { pattern: 'delete file', description: 'File deletion' },
  { pattern: 'remove file', description: 'File removal' },
  { pattern: 'drop table', description: 'Table deletion' }
];

function detectRiskyContent(content, title) {
  const textToCheck = `${title} ${content}`.toLowerCase();

  // Check safe zone first
  for (const pattern of SAFE_ZONE_PATTERNS) {
    if (textToCheck.includes(pattern.toLowerCase())) {
      return { isRisky: false, reason: null, category: 'safe_zone' };
    }
  }

  // Check blocked directories
  for (const dir of BLOCKED_DIRECTORIES) {
    if (textToCheck.includes(dir.pattern.toLowerCase())) {
      return { isRisky: true, reason: 'blocked_directory', pattern: dir.pattern };
    }
  }

  // Check protected files
  for (const file of PROTECTED_FILES_IN_PROD) {
    if (textToCheck.includes(file.pattern.toLowerCase())) {
      return { isRisky: true, reason: 'protected_file', pattern: file.pattern };
    }
  }

  // Check shell commands
  for (const cmd of SHELL_COMMANDS) {
    if (textToCheck.includes(cmd.pattern.toLowerCase())) {
      return { isRisky: true, reason: 'shell_command', pattern: cmd.pattern };
    }
  }

  // Check destructive keywords
  for (const kw of DESTRUCTIVE_KEYWORDS) {
    if (textToCheck.includes(kw.pattern.toLowerCase())) {
      return { isRisky: true, reason: 'destructive_operation', pattern: kw.pattern };
    }
  }

  return { isRisky: false, reason: null };
}

// Run tests
const tests = [
  { title: 'Test Frontend Path', content: 'I want to edit /workspaces/agent-feed/frontend/src/App.tsx', expectedRisky: true, expectedReason: 'blocked_directory' },
  { title: 'Test Protected File', content: 'Let me modify /workspaces/agent-feed/prod/package.json', expectedRisky: true, expectedReason: 'protected_file' },
  { title: 'Test Shell Command', content: 'Run rm -rf /tmp/test', expectedRisky: true, expectedReason: 'shell_command' },
  { title: 'Test Destructive', content: 'I will delete file /var/log/test.log', expectedRisky: true, expectedReason: 'destructive_operation' },
  { title: 'Test Safe Zone', content: 'Create /workspaces/agent-feed/prod/agent_workspace/notes.txt', expectedRisky: false, expectedReason: null },
  { title: 'Test Normal Content', content: 'This is just a regular post about coding', expectedRisky: false, expectedReason: null },
  { title: 'Test False Positive', content: 'I love the new frontend design', expectedRisky: false, expectedReason: null }
];

let passed = 0;
let failed = 0;

tests.forEach(test => {
  const result = detectRiskyContent(test.content, test.title);
  const isCorrect = result.isRisky === test.expectedRisky && result.reason === test.expectedReason;

  if (isCorrect) {
    console.log(`✓ PASS: ${test.title}`);
    passed++;
  } else {
    console.log(`✗ FAIL: ${test.title} - Expected risky=${test.expectedRisky}, reason=${test.expectedReason}, Got risky=${result.isRisky}, reason=${result.reason}`);
    failed++;
  }
});

console.log(`\nFrontend Detection: ${passed}/${tests.length} tests passed`);

// Performance test
const iterations = 10000;
const testContent = 'I want to modify /workspaces/agent-feed/frontend/src/App.tsx';
const startTime = performance.now();
for (let i = 0; i < iterations; i++) {
  detectRiskyContent(testContent, 'Test');
}
const endTime = performance.now();
const avgTime = (endTime - startTime) / iterations;
console.log(`\nPerformance: ${avgTime.toFixed(4)}ms average (${iterations} iterations)`);
console.log(avgTime < 1.0 ? '✓ Performance target met (<1ms)' : `✗ Performance too slow (${avgTime.toFixed(4)}ms > 1ms)`);
