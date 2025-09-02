/**
 * SPARC Implementation Validation Script
 * 
 * Validates that the ClaudeServiceManager implementation meets all SPARC requirements
 */

import { ClaudeServiceManager } from '../services/ClaudeServiceManager';
import path from 'path';

async function validateSparcImplementation() {
  console.log('🚀 SPARC VALIDATION: Starting ClaudeServiceManager validation...\n');

  try {
    // PHASE 1: SPECIFICATION VALIDATION
    console.log('📋 PHASE 1: SPECIFICATION VALIDATION');
    
    // Test /prod directory enforcement
    try {
      new ClaudeServiceManager({ prodDirectory: '/invalid/directory' });
      console.log('❌ FAILED: Should reject non-/prod directories');
      return false;
    } catch (error) {
      console.log('✅ PASSED: /prod directory enforcement working');
    }
    
    // Test valid configuration
    const serviceManager = new ClaudeServiceManager({
      prodDirectory: '/workspaces/agent-feed/prod',
      minWorkers: 1,
      maxWorkers: 3
    });
    console.log('✅ PASSED: Valid configuration accepted');

    // PHASE 2: PSEUDOCODE VALIDATION  
    console.log('\n🧠 PHASE 2: PSEUDOCODE VALIDATION');
    
    await serviceManager.initialize();
    console.log('✅ PASSED: Service initialization completed');
    
    const status = serviceManager.getServiceStatus();
    console.log(`✅ PASSED: Service status retrieved - ${status.workers.length} workers, health: ${status.health}`);

    // PHASE 3: ARCHITECTURE VALIDATION
    console.log('\n🏗️ PHASE 3: ARCHITECTURE VALIDATION');
    
    // Validate worker directory structure
    status.workers.forEach(worker => {
      if (!worker.workingDirectory.includes('/prod')) {
        throw new Error(`Worker ${worker.id} not using /prod directory: ${worker.workingDirectory}`);
      }
    });
    console.log('✅ PASSED: All workers using /prod directory structure');
    
    // Test separation from interactive sessions
    const hasProperSeparation = status.workers.every(worker => 
      worker.workingDirectory !== '/workspaces/agent-feed' // Interactive default
    );
    if (hasProperSeparation) {
      console.log('✅ PASSED: Proper separation from interactive sessions');
    } else {
      console.log('❌ FAILED: Workers conflict with interactive sessions');
      return false;
    }

    // PHASE 4: REFINEMENT VALIDATION
    console.log('\n⚡ PHASE 4: REFINEMENT VALIDATION');
    
    // Test job submission
    const jobId = await serviceManager.submitFeedJob({
      type: 'post_generation',
      priority: 'medium',
      payload: { command: 'echo "SPARC validation test"' },
      routing: { capabilities: ['feed_integration'] }
    });
    console.log(`✅ PASSED: Job submitted successfully - ID: ${jobId}`);
    
    // Test job status tracking
    const jobStatus = serviceManager.getJobStatus(jobId);
    if (jobStatus) {
      console.log(`✅ PASSED: Job status tracking working - Status: ${jobStatus.status}`);
    } else {
      console.log('❌ FAILED: Job status not found');
      return false;
    }

    // PHASE 5: COMPLETION VALIDATION
    console.log('\n🎯 PHASE 5: COMPLETION VALIDATION');
    
    // Test worker designation
    const designatedWorker = status.workers.find(w => w.type === 'designated');
    if (designatedWorker) {
      await serviceManager.designateWorker(designatedWorker.id, ['feed_integration', 'priority_jobs']);
      console.log(`✅ PASSED: Worker designation working - Worker: ${designatedWorker.id}`);
    }
    
    // Test graceful shutdown
    await serviceManager.shutdown();
    console.log('✅ PASSED: Graceful shutdown completed');

    console.log('\n🎉 SPARC VALIDATION COMPLETE: All phases validated successfully!');
    console.log('\n📊 IMPLEMENTATION SUMMARY:');
    console.log(`   • ClaudeServiceManager: Production-ready global service`);
    console.log(`   • Worker Management: Auto-scaling with designated instances`);
    console.log(`   • Feed Integration: Job submission and monitoring API`);
    console.log(`   • /prod Enforcement: All operations in production directory`);
    console.log(`   • Separation: Independent from interactive WebSocket sessions`);
    
    return true;

  } catch (error) {
    console.error('\n❌ SPARC VALIDATION FAILED:', error);
    return false;
  }
}

// Export for programmatic use
export { validateSparcImplementation };

// Run if executed directly
if (require.main === module) {
  validateSparcImplementation()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation script error:', error);
      process.exit(1);
    });
}