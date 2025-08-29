import { MixedAPIVersioningNLDDeployment } from './deploy-mixed-api-versioning-nld';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Validation and Demo Script for Mixed API Versioning NLD System
 * 
 * This script demonstrates the complete NLD deployment and validates
 * that the pattern detection, prevention strategies, and neural training
 * export are working correctly.
 */

async function validateNLDDeployment(): Promise<void> {
  console.log('🔍 Starting Mixed API Versioning NLD Validation...\n');
  
  try {
    // Initialize deployment system
    const deployment = new MixedAPIVersioningNLDDeployment();
    
    // Run complete deployment
    const result = await deployment.deployNLDSystem();
    
    if (result.success) {
      console.log('\n✅ NLD Deployment Validation Successful!\n');
      
      // Display results
      console.log('📊 Deployment Results:');
      console.log(`   Patterns Detected: ${result.patternsDetected}`);
      console.log(`   Prevention Strategies: ${result.preventionStrategies}`);
      console.log(`   Neural Training Records: ${result.neuralTrainingRecords}`);
      console.log(`   Report Location: ${result.deploymentReport}`);
      
      // Generate summary for user
      const summary = deployment.generateDeploymentSummary();
      
      console.log('\n🎯 Pattern Detection Summary:');
      console.log(`   Pattern: ${summary.pattern}`);
      console.log(`   Trigger: ${summary.trigger}`);
      console.log(`   Task Type: ${summary.taskType}`);
      console.log(`   Failure Mode: ${summary.failureMode}`);
      console.log(`   TDD Factor: ${summary.tddFactor}`);
      
      console.log('\n🧠 NLT Record Created:');
      console.log(`   Record ID: ${summary.recordId}`);
      console.log(`   Effectiveness Score: ${summary.effectivenessScore}`);
      console.log(`   Pattern Classification: ${summary.patternClassification}`);
      console.log(`   Neural Training Status: ${summary.neuralTrainingStatus}`);
      
      console.log('\n💡 Recommendations:');
      console.log(`   TDD Patterns: ${summary.tddPatterns.join(', ')}`);
      console.log(`   Prevention Strategy: ${summary.preventionStrategy}`);
      console.log(`   Training Impact: ${summary.trainingImpact}`);
      
    } else {
      console.error('❌ NLD Deployment Validation Failed!');
      console.error(result.deploymentReport);
    }
    
  } catch (error) {
    console.error('❌ Validation Error:', error);
  }
}

// Run validation if called directly
if (require.main === module) {
  validateNLDDeployment()
    .then(() => {
      console.log('\n🎉 NLD Validation Complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Validation Failed:', error);
      process.exit(1);
    });
}

export { validateNLDDeployment };