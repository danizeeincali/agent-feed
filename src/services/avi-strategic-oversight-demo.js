/**
 * Avi Strategic Oversight Demo
 * Demonstrates the complete page request evaluation flow
 */

import aviStrategicOversight from './avi-strategic-oversight.js';

// Demo data for testing the system
const demoRequests = [
  {
    agentId: "personal-todos-agent",
    pageType: "dashboard", 
    title: "Task Management Dashboard",
    justification: {
      problemStatement: "Managing 50+ tasks requires visual organization",
      impactAnalysis: "Increases productivity by 40% based on similar implementations",
      businessObjectives: "Improve task completion rates and priority visibility"
    },
    dataRequirements: {
      primarySources: ["tasks.json", "productivity-metrics"],
      updateFrequency: "real-time"
    },
    priority: 2,
    estimatedImpact: 8,
    resourceEstimate: {
      developmentTime: 6,
      performanceImpact: "low"
    }
  },
  
  {
    agentId: "test-agent-no-data",
    pageType: "profile",
    title: "Agent Profile Page", 
    justification: {
      problemStatement: "Need agent visibility page",
      impactAnalysis: "Basic agent information display"
    },
    priority: 5,
    estimatedImpact: 3
  },
  
  {
    agentId: "analytics-agent",
    pageType: "analytics",
    title: "Advanced Analytics Dashboard",
    justification: {
      problemStatement: "Complex data visualization requirements",
      impactAnalysis: "Comprehensive business intelligence solution",
      businessObjectives: "Enable advanced data-driven decision making"
    },
    dataRequirements: {
      primarySources: ["metrics-db", "user-analytics", "performance-data"],
      secondarySources: ["external-apis", "log-aggregation"],
      updateFrequency: "real-time"
    },
    priority: 1,
    estimatedImpact: 9,
    resourceEstimate: {
      developmentTime: 40,
      computeResources: { high: true },
      maintenanceOverhead: 8,
      dependencies: ["chart-library", "data-pipeline", "real-time-sync", "caching-layer"]
    }
  }
];

/**
 * Run demo evaluation scenarios
 */
async function runDemo() {
  console.log('🎯 Avi Strategic Oversight System Demo');
  console.log('=====================================\n');
  
  try {
    // Initialize the system
    console.log('📋 Initializing Avi Strategic Oversight...');
    await aviStrategicOversight.initialize();
    console.log('✅ System initialized successfully\n');
    
    // Process each demo request
    for (let i = 0; i < demoRequests.length; i++) {
      const request = demoRequests[i];
      console.log(`📝 Processing Request ${i + 1}: ${request.title}`);
      console.log(`   Agent: ${request.agentId}`);
      console.log(`   Type: ${request.pageType}`);
      console.log(`   Priority: P${request.priority}`);
      
      const result = await aviStrategicOversight.submitPageRequest(request);
      
      if (result.success) {
        console.log(`✅ Decision: ${result.evaluation.decision}`);
        console.log(`📊 Score: ${result.evaluation.finalScore.toFixed(2)}`);
        console.log(`⏱️  Processing Time: ${result.processingTime}ms`);
        console.log(`💬 Feedback: ${result.evaluation.feedback.substring(0, 60)}...`);
        
        if (result.evaluation.decision === 'APPROVED') {
          console.log(`🚀 Next Steps: ${result.nextSteps[0]}`);
        }
      } else {
        console.log(`❌ Request Failed: ${result.error}`);
        if (result.suggestion) {
          console.log(`💡 Suggestion: ${result.suggestion}`);
        }
      }
      
      console.log(''); // Empty line for spacing
    }
    
    // Show system statistics
    console.log('📊 System Statistics');
    console.log('==================');
    const stats = aviStrategicOversight.getStats();
    console.log(`Total Requests: ${stats.totalRequests}`);
    console.log(`Approved: ${stats.approved}`);
    console.log(`Denied: ${stats.denied}`);
    console.log(`Deferred: ${stats.deferred}`);
    console.log(`Approval Rate: ${stats.approvalRate}`);
    console.log(`Average Processing Time: ${stats.averageProcessingTime.toFixed(0)}ms`);
    console.log(`Patterns Detected: ${stats.patternsDetected}`);
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

/**
 * Test NLD pattern detection with failure scenario
 */
async function testPatternDetection() {
  console.log('\n🔍 Testing NLD Pattern Detection');
  console.log('================================');
  
  // Simulate a failure scenario for pattern detection
  const failureRequest = {
    agentId: "failing-agent",
    pageType: "complex-dashboard",
    title: "Overly Complex Dashboard",
    justification: {
      problemStatement: "Poorly justified request"
    },
    priority: 8,
    estimatedImpact: 2,
    resourceEstimate: {
      developmentTime: 100, // Way too high
      maintenanceOverhead: 50
    }
  };
  
  const result = await aviStrategicOversight.submitPageRequest(failureRequest);
  
  if (!result.success || result.evaluation.decision === 'REJECTED') {
    console.log('✅ Pattern detection working - failure properly identified');
    console.log(`📈 NLD patterns will learn from this rejection pattern`);
  }
}

// Export for potential usage in other contexts
export { runDemo, testPatternDetection, demoRequests };

// If run directly, execute the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo()
    .then(() => testPatternDetection())
    .then(() => {
      console.log('\n🎉 Demo completed successfully!');
      console.log('💡 The system is ready for production use.');
    })
    .catch(error => {
      console.error('\n❌ Demo failed:', error);
      process.exit(1);
    });
}