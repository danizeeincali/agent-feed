/**
 * Test Script: Feedback Loop System
 *
 * Demonstrates the automated feedback loop by:
 * 1. Simulating repeated validation failures
 * 2. Triggering pattern detection
 * 3. Auto-updating agent instructions
 * 4. Generating reports
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import feedbackLoop from './services/feedback-loop.js';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../database.db');

console.log('='.repeat(60));
console.log('FEEDBACK LOOP SYSTEM TEST');
console.log('='.repeat(60));
console.log('');

// Connect to database
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

// Initialize feedback loop
feedbackLoop.setDatabase(db);

console.log('✅ Database connected');
console.log('✅ Feedback loop initialized');
console.log('');

async function runTest() {
  const agentId = 'page-builder-agent';
  const testPageId = 'test-page-' + Date.now();

  console.log(`Testing with agent: ${agentId}`);
  console.log(`Test page ID: ${testPageId}`);
  console.log('');

  // Simulate 3 sidebar navigation failures (should trigger pattern)
  console.log('Step 1: Simulating 3 sidebar navigation failures...');
  console.log('-'.repeat(60));

  for (let i = 1; i <= 3; i++) {
    const error = {
      type: 'UNKNOWN_TYPE',
      message: 'Unknown component type: SidebarNavigation',
      details: {
        componentType: 'SidebarNavigation',
        suggestion: 'Use "Sidebar" instead'
      },
      componentType: 'SidebarNavigation',
      validationRule: 'component_type_check',
      pageConfig: JSON.stringify({
        components: [{
          type: 'SidebarNavigation',
          props: { items: [] }
        }]
      }),
      stackTrace: new Error().stack
    };

    const result = await feedbackLoop.recordFailure(
      `${testPageId}-${i}`,
      agentId,
      error
    );

    console.log(`  [${i}/3] Failure recorded: ${result.failureId}`);

    if (result.pattern) {
      console.log(`  ✓ Pattern detected: ${result.pattern.error_signature}`);
      console.log(`    Occurrences: ${result.pattern.occurrence_count}`);

      if (result.pattern.auto_fix_applied) {
        console.log(`    🔧 Auto-fix has been applied!`);
      }
    }
  }

  console.log('');

  // Simulate 2 more different failures (missing props)
  console.log('Step 2: Simulating 2 missing props failures...');
  console.log('-'.repeat(60));

  for (let i = 1; i <= 2; i++) {
    const error = {
      type: 'ZOD_ERROR',
      message: 'Required prop missing: items',
      details: {
        field: 'items',
        expected: 'array'
      },
      componentType: 'Sidebar',
      validationRule: 'required_props',
      pageConfig: JSON.stringify({
        components: [{
          type: 'Sidebar',
          props: {}
        }]
      }),
      stackTrace: new Error().stack
    };

    const result = await feedbackLoop.recordFailure(
      `${testPageId}-props-${i}`,
      agentId,
      error
    );

    console.log(`  [${i}/2] Failure recorded: ${result.failureId}`);
  }

  console.log('');

  // Generate report
  console.log('Step 3: Generating comprehensive report...');
  console.log('-'.repeat(60));

  const report = await feedbackLoop.generateReport(agentId, 7);

  console.log(`\nReport Summary:`);
  console.log(`  Total failures: ${report.summary.total_failures}`);
  console.log(`  Unique error types: ${report.summary.unique_error_types}`);
  console.log(`  Affected pages: ${report.summary.affected_pages}`);
  console.log('');

  console.log(`Detected Patterns (${report.patterns.length}):`);
  report.patterns.forEach((pattern, idx) => {
    console.log(`  ${idx + 1}. ${pattern.pattern_type}`);
    console.log(`     Signature: ${pattern.error_signature}`);
    console.log(`     Occurrences: ${pattern.occurrence_count}`);
    console.log(`     Status: ${pattern.status}`);
    console.log(`     Auto-fix applied: ${pattern.auto_fix_applied ? 'Yes' : 'No'}`);
  });
  console.log('');

  // Get agent metrics
  console.log('Step 4: Fetching agent metrics...');
  console.log('-'.repeat(60));

  const metrics = await feedbackLoop.getAgentMetrics(agentId);

  console.log(`\nAgent Health:`);
  console.log(`  Health Score: ${metrics.health_score.toFixed(1)}/100`);
  console.log(`  Success Rate: ${(metrics.success_rate * 100).toFixed(1)}%`);
  console.log(`  Active Patterns: ${metrics.active_patterns}`);
  console.log(`  Recent Failures: ${metrics.recent_failures.length}`);
  console.log(`  Feedback Applied: ${metrics.feedback_applied}`);
  console.log('');

  // Check if instruction file was created
  console.log('Step 5: Checking auto-generated instruction file...');
  console.log('-'.repeat(60));

  const instructionPath = join(
    __dirname,
    '../prod/agent_workspace/instructions',
    `${agentId}.md`
  );

  try {
    const instructionContent = await fs.readFile(instructionPath, 'utf-8');
    console.log(`\n✅ Instruction file created at:`);
    console.log(`   ${instructionPath}`);
    console.log(`\nFile preview (first 500 chars):`);
    console.log('-'.repeat(60));
    console.log(instructionContent.substring(0, 500));
    if (instructionContent.length > 500) {
      console.log('\n... (truncated)');
    }
  } catch (error) {
    console.log(`⚠️  Instruction file not yet created`);
    console.log(`   (Threshold may not be reached or auto-fix not triggered)`);
  }

  console.log('');

  // Check memory file
  console.log('Step 6: Checking memory file...');
  console.log('-'.repeat(60));

  const memoryPath = join(
    __dirname,
    '../prod/agent_workspace/memories',
    'page-builder-failures.md'
  );

  try {
    const memoryContent = await fs.readFile(memoryPath, 'utf-8');
    console.log(`\n✅ Memory file exists at:`);
    console.log(`   ${memoryPath}`);

    // Count active patterns in memory
    const patternMatches = memoryContent.match(/##\s+.*?\(Updated:/g) || [];
    console.log(`\n   Active pattern entries: ${patternMatches.length}`);
  } catch (error) {
    console.log(`❌ Memory file not found`);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('');
  console.log('Summary:');
  console.log(`  ✓ Recorded ${report.summary.total_failures} failures`);
  console.log(`  ✓ Detected ${report.patterns.length} patterns`);
  console.log(`  ✓ Agent health score: ${metrics.health_score.toFixed(1)}/100`);
  console.log(`  ✓ Feedback system operational`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Review generated instruction file');
  console.log('  2. Check memory file for accumulated learnings');
  console.log('  3. Test with real agent page creation');
  console.log('  4. Monitor /api/feedback endpoints');
  console.log('');
}

// Run test
runTest()
  .then(() => {
    db.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    db.close();
    process.exit(1);
  });
