#!/usr/bin/env ts-node
/**
 * Execute NLD Rate Limiting Validation Pipeline
 * Standalone script to run the complete validation and export process
 */

import { nldRateLimitingValidationOrchestrator } from './nld-rate-limiting-validation-orchestrator';
import { nldLogger } from './utils/nld-logger';

async function main() {
  try {
    console.log('🚀 Starting NLD Rate Limiting Validation Pipeline...\n');

    // Execute the complete validation pipeline
    const result = await nldRateLimitingValidationOrchestrator.executeValidationPipeline();

    // Generate and display the pattern detection summary
    const summary = nldRateLimitingValidationOrchestrator.generatePatternDetectionSummary(result);

    console.log('📊 Pattern Detection Summary:');
    console.log('================================\n');

    console.log(`🎯 Trigger: ${summary.trigger}`);
    console.log(`📋 Task Type: ${summary.taskType}`);
    console.log(`❌ Failure Mode: ${summary.failureMode}`);
    console.log(`🧪 TDD Factor: ${summary.tddFactor}\n`);

    console.log('📝 NLT Record Created:');
    console.log(`   Record ID: ${summary.recordCreated.recordId}`);
    console.log(`   Effectiveness Score: ${summary.recordCreated.effectivenessScore.toFixed(3)}`);
    console.log(`   Pattern Classification: ${summary.recordCreated.patternClassification}`);
    console.log(`   Neural Training Status: ${summary.recordCreated.neuralTrainingStatus}\n`);

    console.log('💡 Recommendations:');
    console.log('-------------------');
    
    console.log('\n🧪 TDD Patterns:');
    summary.recommendations.tddPatterns.forEach(pattern => {
      console.log(`   • ${pattern}`);
    });

    console.log('\n🛡️ Prevention Strategy:');
    summary.recommendations.preventionStrategy.forEach(strategy => {
      console.log(`   • ${strategy}`);
    });

    console.log('\n🤖 Training Impact:');
    summary.recommendations.trainingImpact.forEach(impact => {
      console.log(`   • ${impact}`);
    });

    console.log('\n📈 Validation Results:');
    console.log('======================');
    console.log(`✅ Validation Passed: ${result.summary.validationPassed}`);
    console.log(`🔍 Patterns Recognized: ${result.summary.patternsRecognized}`);
    console.log(`🧠 Training Entries Generated: ${result.summary.trainingEntriesGenerated}`);
    console.log(`🛡️ Prevention Strategies Created: ${result.summary.preventionStrategiesCreated}`);
    console.log(`⚡ Error Reduction: ${(result.summary.effectiveness.errorReduction * 100).toFixed(1)}%`);
    console.log(`🚀 Performance Improvement: ${(result.summary.effectiveness.performanceImprovement * 100).toFixed(1)}%`);
    console.log(`🎯 Overall Prevention Score: ${(result.summary.effectiveness.preventionScore * 100).toFixed(1)}%`);

    console.log('\n📁 Files Generated:');
    console.log('===================');
    console.log('   • Rate limiting validation results');
    console.log('   • Positive pattern recognition data');
    console.log('   • Neural training dataset');
    console.log('   • Regression prevention strategies');
    console.log('   • Claude-flow integration export');
    console.log('   • Orchestration summary results');

    console.log('\n🎉 NLD Rate Limiting Validation Pipeline Completed Successfully!');
    console.log('   All training data has been exported for claude-flow neural system.');

  } catch (error) {
    console.error('❌ NLD Pipeline Failed:', error);
    nldLogger.renderFailure('execute-rate-limiting-validation', error as Error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}