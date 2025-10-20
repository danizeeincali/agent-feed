/**
 * SAFLA Integration Example
 *
 * Demonstrates how to integrate SAFLA learning into the existing skills system
 */

import { SAFLAService } from '../services/safla-service';
import { SkillsService } from '../services/skills-service';

// ============================================================
// EXAMPLE 1: Basic Learning Workflow
// ============================================================

async function basicLearningWorkflow() {
  console.log('EXAMPLE 1: Basic Learning Workflow');
  console.log('='.repeat(70));

  const service = new SAFLAService();

  try {
    // Step 1: Agent executes a task
    console.log('\n1. Agent executes task: "Prioritize sprint tasks"');

    const taskDescription = 'Prioritize sprint tasks using Fibonacci sequence';

    // Step 2: Store the approach as a pattern
    const pattern = await service.storePattern({
      content: taskDescription,
      namespace: 'agent:personal-todos',
      agentId: 'personal-todos-agent',
      category: 'prioritization',
      tags: ['sprint', 'fibonacci'],
    });

    console.log(`   ✓ Pattern stored: ${pattern.id}`);
    console.log(`   Initial confidence: ${pattern.confidence}`);

    // Step 3: Task completes successfully
    console.log('\n2. Task completes successfully');

    const updated = await service.recordOutcome(pattern.id, 'success', {
      context: 'Q4 sprint planning',
      executionTimeMs: 1200,
    });

    console.log(`   ✓ Confidence updated: ${pattern.confidence} → ${updated.confidence}`);

    // Step 4: Next time, query for relevant patterns
    console.log('\n3. Agent receives similar task: "Prioritize feature requests"');

    const relevantPatterns = await service.queryPatterns(
      'prioritize features',
      'agent:personal-todos',
      5
    );

    console.log(`   ✓ Found ${relevantPatterns.length} relevant patterns`);
    if (relevantPatterns.length > 0) {
      const best = relevantPatterns[0];
      console.log(`   Best match: "${best.content}"`);
      console.log(`   Confidence: ${best.confidence}`);
    }

    console.log('\n✓ Basic workflow complete\n');
  } finally {
    service.close();
  }
}

// ============================================================
// EXAMPLE 2: Skills Service Integration
// ============================================================

async function skillsServiceIntegration() {
  console.log('EXAMPLE 2: Skills Service Integration');
  console.log('='.repeat(70));

  const safla = new SAFLAService();

  try {
    // Simulate loading a skill with learned patterns
    const skillId = 'task-management';
    const agentId = 'personal-todos-agent';
    const userTask = 'Prioritize upcoming tasks for this week';

    console.log(`\n1. Loading skill: ${skillId}`);
    console.log(`   Agent: ${agentId}`);
    console.log(`   Task: "${userTask}"`);

    // Query learned patterns for this skill
    const learnedPatterns = await safla.queryPatterns(
      userTask,
      `agent:${agentId}`,
      5
    );

    // Filter by confidence threshold
    const highConfidencePatterns = learnedPatterns.filter(p => p.confidence >= 0.7);

    console.log(`\n2. Learned patterns retrieved`);
    console.log(`   Total relevant: ${learnedPatterns.length}`);
    console.log(`   High confidence (≥0.7): ${highConfidencePatterns.length}`);

    if (highConfidencePatterns.length > 0) {
      console.log(`\n3. Augmenting skill with learned patterns:`);
      highConfidencePatterns.forEach((p, i) => {
        console.log(`   ${i + 1}. [${p.confidence.toFixed(2)}] ${p.content}`);
      });

      // Agent would now use base skill + learned patterns
      console.log(`\n4. Agent executes with enhanced knowledge`);
      console.log(`   • Base skill instructions`);
      console.log(`   • + ${highConfidencePatterns.length} proven strategies`);
    } else {
      console.log(`\n3. No high-confidence patterns yet`);
      console.log(`   Agent will use base skill only`);
    }

    console.log('\n✓ Skills integration example complete\n');
  } finally {
    safla.close();
  }
}

// ============================================================
// EXAMPLE 3: Confidence Evolution
// ============================================================

async function confidenceEvolution() {
  console.log('EXAMPLE 3: Confidence Evolution Over Time');
  console.log('='.repeat(70));

  const service = new SAFLAService();

  try {
    // Create a pattern
    const pattern = await service.storePattern({
      content: 'Critical bugs get P0 priority, severity-based for others',
      namespace: 'agent:personal-todos',
      category: 'prioritization',
    });

    console.log(`\nPattern: "${pattern.content}"`);
    console.log(`\nConfidence evolution:`);

    // Simulate outcomes over time
    const outcomes: Array<{ day: number; outcome: 'success' | 'failure'; context: string }> = [
      { day: 1, outcome: 'success', context: 'Production bug fix prioritized correctly' },
      { day: 2, outcome: 'success', context: 'Security issue handled with P0' },
      { day: 3, outcome: 'success', context: 'Minor bug given appropriate priority' },
      { day: 5, outcome: 'failure', context: 'Edge case: urgent but not critical' },
      { day: 7, outcome: 'success', context: 'Recovered from failure, worked for similar case' },
      { day: 10, outcome: 'success', context: 'Consistent success with bug prioritization' },
    ];

    let currentPattern = pattern;

    console.log(`  Day 0: ${currentPattern.confidence.toFixed(3)} (initial)`);

    for (const { day, outcome, context } of outcomes) {
      currentPattern = await service.recordOutcome(currentPattern.id, outcome, { context });

      const icon = outcome === 'success' ? '✓' : '✗';
      console.log(`  Day ${day}: ${currentPattern.confidence.toFixed(3)} ${icon} ${outcome}`);
      console.log(`          "${context}"`);
    }

    // Show final statistics
    const stats = service.getPatternOutcomes(pattern.id);
    const successCount = stats.filter(s => s.outcome === 'success').length;
    const failureCount = stats.filter(s => s.outcome === 'failure').length;

    console.log(`\nFinal Statistics:`);
    console.log(`  Confidence: ${currentPattern.confidence.toFixed(3)}`);
    console.log(`  Successes: ${successCount}`);
    console.log(`  Failures: ${failureCount}`);
    console.log(`  Success Rate: ${(successCount / (successCount + failureCount) * 100).toFixed(1)}%`);

    console.log('\n✓ Confidence evolution example complete\n');
  } finally {
    service.close();
  }
}

// ============================================================
// EXAMPLE 4: Cross-Agent Pattern Sharing
// ============================================================

async function crossAgentSharing() {
  console.log('EXAMPLE 4: Cross-Agent Pattern Sharing');
  console.log('='.repeat(70));

  const service = new SAFLAService();

  try {
    console.log('\n1. Meta-agent learns valuable pattern');

    // Meta-agent discovers a best practice
    const metaPattern = await service.storePattern({
      content: 'Always include TodoWrite tool for user transparency and progress tracking',
      namespace: 'agent:meta',
      agentId: 'meta-agent',
      category: 'tool-selection',
      tags: ['transparency', 'best-practice'],
    });

    console.log(`   Pattern: "${metaPattern.content}"`);
    console.log(`   Initial confidence: ${metaPattern.confidence}`);

    // Meta-agent uses this successfully multiple times
    console.log('\n2. Meta-agent validates pattern through usage');

    for (let i = 0; i < 5; i++) {
      await service.recordOutcome(metaPattern.id, 'success', {
        context: `Agent creation ${i + 1} with high user satisfaction`,
      });
    }

    const validated = service.getPattern(metaPattern.id);
    console.log(`   After 5 successes: confidence = ${validated!.confidence}`);

    // Share to other agents
    console.log('\n3. Sharing pattern to other agents');

    const targetAgents = ['personal-todos-agent', 'meeting-prep-agent', 'follow-ups-agent'];

    for (const agentId of targetAgents) {
      const shared = await service.storePattern({
        content: metaPattern.content,
        namespace: `agent:${agentId}`,
        agentId: agentId,
        category: metaPattern.category,
        tags: metaPattern.tags,
        metadata: {
          sharedFrom: metaPattern.id,
          sharedAt: Date.now(),
          originalConfidence: validated!.confidence,
        },
      });

      // Initialize with reduced confidence (safety)
      await service.recordOutcome(shared.id, 'success');
      const initialized = service.getPattern(shared.id);

      console.log(`   ✓ Shared to ${agentId}: confidence = ${initialized!.confidence}`);
    }

    // Verify sharing worked
    console.log('\n4. Verify agents can find shared pattern');

    for (const agentId of targetAgents) {
      const found = await service.queryPatterns(
        'tool selection transparency',
        `agent:${agentId}`,
        5
      );

      if (found.length > 0) {
        console.log(`   ✓ ${agentId}: Found shared pattern`);
      }
    }

    console.log('\n✓ Cross-agent sharing example complete\n');
  } finally {
    service.close();
  }
}

// ============================================================
// EXAMPLE 5: Semantic Search and MMR Ranking
// ============================================================

async function semanticSearchAndRanking() {
  console.log('EXAMPLE 5: Semantic Search and MMR Ranking');
  console.log('='.repeat(70));

  const service = new SAFLAService();

  try {
    console.log('\n1. Creating diverse set of patterns');

    const patterns = [
      'Prioritize sprint tasks using Fibonacci sequence (P1=1, P2=2, P3=3, P5=5)',
      'Prioritize sprint tasks by business value and urgency',
      'Critical bugs get P0 priority, severity-based for all others',
      'Meeting agendas: 30min 1-on-1s, 3 items max, personal time first',
      'Team standups: 15min max, blockers-first format',
      'Use RICE scoring for feature prioritization (Reach × Impact × Confidence / Effort)',
    ];

    const storedPatterns = [];
    for (const content of patterns) {
      const p = await service.storePattern({
        content,
        namespace: 'test',
        category: 'prioritization',
      });
      storedPatterns.push(p);
      console.log(`   ✓ Stored: "${content.substring(0, 60)}..."`);
    }

    // Give some patterns higher confidence
    await service.recordOutcome(storedPatterns[0].id, 'success');
    await service.recordOutcome(storedPatterns[0].id, 'success');
    await service.recordOutcome(storedPatterns[2].id, 'success');

    console.log('\n2. Semantic search for "task prioritization"');

    const searchResults = await service.queryPatterns('task prioritization', 'test', 10);

    console.log(`   Found ${searchResults.length} relevant patterns:`);
    searchResults.forEach((p, i) => {
      console.log(`   ${i + 1}. [conf: ${p.confidence.toFixed(2)}] ${p.content.substring(0, 50)}...`);
    });

    console.log('\n3. MMR ranking for diversity (lambda = 0.7)');

    const ranked = await service.rankPatterns(
      searchResults,
      'task prioritization',
      0.7
    );

    console.log(`   Ranked patterns (relevance + diversity):`);
    ranked.forEach((p, i) => {
      console.log(`   ${i + 1}. [score: ${p.finalScore.toFixed(4)}] ${p.content.substring(0, 50)}...`);
      console.log(`       Similarity: ${p.similarity.toFixed(3)}, Confidence: ${p.confidence.toFixed(2)}`);
    });

    console.log('\n✓ Semantic search and ranking example complete\n');
  } finally {
    service.close();
  }
}

// ============================================================
// EXAMPLE 6: Namespace Statistics and Analytics
// ============================================================

async function namespaceAnalytics() {
  console.log('EXAMPLE 6: Namespace Statistics and Analytics');
  console.log('='.repeat(70));

  const service = new SAFLAService();

  try {
    // Create patterns for different agents
    console.log('\n1. Creating patterns for multiple agents');

    const agentPatterns = [
      {
        agent: 'personal-todos-agent',
        patterns: [
          'Fibonacci prioritization for features',
          'Severity-based prioritization for bugs',
          'Time-blocking for focused work sessions',
        ],
      },
      {
        agent: 'meeting-prep-agent',
        patterns: [
          '30min 1-on-1s with 3 items max',
          'Team standups: 15min, blockers-first',
          'All-hands: start with wins, end with action items',
        ],
      },
    ];

    for (const { agent, patterns } of agentPatterns) {
      console.log(`\n   ${agent}:`);

      for (const content of patterns) {
        const p = await service.storePattern({
          content,
          namespace: `agent:${agent}`,
          agentId: agent,
        });

        // Simulate some usage
        const outcomes = Math.random() > 0.3 ? 'success' : 'failure';
        await service.recordOutcome(p.id, outcomes);

        console.log(`     ✓ ${content}`);
      }
    }

    // Get statistics
    console.log('\n2. Namespace statistics');

    for (const { agent } of agentPatterns) {
      const stats = service.getNamespaceStats(`agent:${agent}`);

      console.log(`\n   ${agent}:`);
      console.log(`     Total patterns: ${stats.totalPatterns}`);
      console.log(`     Avg confidence: ${stats.avgConfidence.toFixed(3)}`);
      console.log(`     Total successes: ${stats.totalSuccesses}`);
      console.log(`     Total failures: ${stats.totalFailures}`);
      console.log(`     Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
    }

    console.log('\n✓ Namespace analytics example complete\n');
  } finally {
    service.close();
  }
}

// ============================================================
// MAIN: Run All Examples
// ============================================================

async function runAllExamples() {
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('SAFLA INTEGRATION EXAMPLES');
  console.log('═'.repeat(70));
  console.log('\n');

  try {
    await basicLearningWorkflow();
    await skillsServiceIntegration();
    await confidenceEvolution();
    await crossAgentSharing();
    await semanticSearchAndRanking();
    await namespaceAnalytics();

    console.log('═'.repeat(70));
    console.log('ALL EXAMPLES COMPLETED SUCCESSFULLY');
    console.log('═'.repeat(70));
    console.log('\n');
  } catch (error) {
    console.error('Error running examples:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples()
    .then(() => {
      console.log('✓ Examples completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Examples failed:', error);
      process.exit(1);
    });
}

// Export for use in other files
export {
  basicLearningWorkflow,
  skillsServiceIntegration,
  confidenceEvolution,
  crossAgentSharing,
  semanticSearchAndRanking,
  namespaceAnalytics,
  runAllExamples,
};
