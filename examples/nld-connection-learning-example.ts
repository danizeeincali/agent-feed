/**
 * NLD Connection Learning System - Complete Example
 * Demonstrates the full capabilities of the NLD system
 */

import {
  createCompleteNLDSystem,
  createNLDWebSocketService,
  quickSetupNLD,
  checkNLDCompatibility,
  NLDDevUtils,
  type ConnectionFailureContext,
  type NLDWebSocketConfig
} from '../src/nld';

/**
 * Example 1: Basic NLD WebSocket Integration
 */
async function basicNLDExample() {
  console.log('🚀 Starting Basic NLD WebSocket Integration Example');
  
  // Check system compatibility
  const compatibility = checkNLDCompatibility();
  if (!compatibility.compatible) {
    console.warn('⚠️ Compatibility issues detected:', compatibility.issues);
    console.log('💡 Recommendations:', compatibility.recommendations);
  }

  // Create enhanced WebSocket service with NLD capabilities
  const { service, nldIntegration } = createNLDWebSocketService({
    enableLearning: true,
    enableAdaptiveRetry: true,
    enablePerformanceMonitoring: true,
    enableTroubleshooting: true,
    fallbackTransports: ['sse', 'polling'],
    neuralTrainingEnabled: true
  });

  // Set up event listeners to monitor NLD activities
  nldIntegration.on('nldPatternDetected', (data) => {
    console.log('🧠 Pattern detected:', data.pattern.pattern);
    console.log('📊 Severity:', data.pattern.severity);
    console.log('🔄 Frequency:', data.pattern.frequency);
  });

  nldIntegration.on('nldAlert', (alert) => {
    console.log(`🚨 ${alert.severity.toUpperCase()} Alert:`, alert.message);
    console.log('💡 Recommendations:', alert.recommendations);
  });

  nldIntegration.on('troubleshootingSuggestions', (suggestions) => {
    console.log('🔧 Troubleshooting suggestions generated:');
    suggestions.quick_fixes.forEach((fix, index) => {
      console.log(`  ${index + 1}. ${fix.title} (${fix.estimated_time}min)`);
    });
  });

  try {
    // Attempt connection - NLD will handle failures intelligently
    await service.connect();
    console.log('✅ Connection successful!');
    
    // Send a message with NLD metadata
    service.send('test_message', { 
      content: 'Hello from NLD-enhanced WebSocket!',
      timestamp: Date.now()
    });

    // Get real-time connection health
    const health = nldIntegration.getConnectionHealth();
    console.log('📈 Connection Health:', health.connection_health.isHealthy);
    console.log('📊 Success Rate:', health.performance_metrics?.realtime?.connection_success_rate);

  } catch (error) {
    console.log('❌ Connection failed, but NLD is learning from it');
    console.log('📚 Error details:', error.message);
    
    // Generate troubleshooting suggestions for the failure
    const suggestions = await nldIntegration.generateTroubleshootingSuggestions();
    console.log('🛠️ NLD suggests these quick fixes:');
    suggestions.quick_fixes?.forEach((fix, index) => {
      console.log(`  ${index + 1}. ${fix.title}`);
      console.log(`     Confidence: ${Math.round(fix.confidence * 100)}%`);
      console.log(`     Effort: ${fix.estimated_effort}`);
    });
  }

  // Demonstrate neural training
  console.log('🧠 Triggering neural pattern training...');
  await nldIntegration.trainNeuralPatterns();

  // Get comprehensive statistics
  const stats = nldIntegration.getStatistics();
  console.log('📊 NLD Statistics:');
  console.log('  - Total connection attempts:', stats.total_connection_attempts);
  console.log('  - Success rate:', stats.adaptive_connection_stats?.successRate);
  console.log('  - Components active:', Object.keys(stats.nld_components_active).filter(
    key => stats.nld_components_active[key]
  ).length);

  // Clean up
  await nldIntegration.shutdown();
  console.log('✅ Basic NLD example completed\n');
}

/**
 * Example 2: Complete NLD System with All Components
 */
async function completeNLDSystemExample() {
  console.log('🚀 Starting Complete NLD System Example');

  // Create a complete NLD system with custom configuration
  const nldSystem = createCompleteNLDSystem({
    webSocketConfig: {
      enableLearning: true,
      enableAdaptiveRetry: true,
      enablePerformanceMonitoring: true,
      enableTroubleshooting: true,
      neuralTrainingEnabled: true
    },
    performanceConfig: {
      monitoringIntervalMs: 5000, // 5 seconds
      reportingIntervalMs: 30000, // 30 seconds
      alertingEnabled: true
    },
    neuralConfig: {
      batchSize: 20,
      learningRate: 0.001,
      epochs: 30,
      featureEngineering: true
    }
  });

  // Monitor system status
  const systemStatus = nldSystem.getSystemStatus();
  console.log('🔍 System Status:');
  console.log('  - NLD Integration:', systemStatus.nld_integration.components);
  console.log('  - Performance Health:', systemStatus.performance_metrics.performance_score);

  // Simulate connection scenarios for learning
  console.log('🎭 Simulating various connection scenarios for learning...');
  
  const scenarios = [
    {
      name: 'Slow Network Timeout',
      context: NLDDevUtils.createMockFailureContext({
        errorDetails: { code: 'ETIMEDOUT', message: 'Slow network timeout', type: 'timeout' },
        networkConditions: NLDDevUtils.simulateNetworkConditions('slow-2g')
      })
    },
    {
      name: 'WiFi Protocol Error',
      context: NLDDevUtils.createMockFailureContext({
        errorDetails: { code: '1002', message: 'Protocol error', type: 'protocol' },
        networkConditions: NLDDevUtils.simulateNetworkConditions('wifi')
      })
    },
    {
      name: 'Mobile Network Failure',
      context: NLDDevUtils.createMockFailureContext({
        errorDetails: { code: 'ECONNREFUSED', message: 'Network refused', type: 'network' },
        networkConditions: NLDDevUtils.simulateNetworkConditions('4g'),
        clientInfo: {
          userAgent: 'mobile-app',
          platform: 'ios',
          isMobile: true,
          supportedProtocols: ['websocket', 'polling']
        }
      })
    }
  ];

  // Process each scenario through the troubleshooting engine
  for (const scenario of scenarios) {
    console.log(`📱 Processing ${scenario.name}...`);
    
    const suggestions = await nldSystem.troubleshootingEngine.generateSuggestions({
      context: scenario.context,
      urgency: 'medium'
    });

    console.log(`  🔧 Generated ${suggestions.suggestions.length} suggestions`);
    console.log(`  ⚡ ${suggestions.quick_fixes.length} quick fixes available`);
    console.log(`  📈 Confidence score: ${Math.round(suggestions.confidence_score * 100)}%`);
    
    // Show top suggestion
    if (suggestions.suggestions.length > 0) {
      const topSuggestion = suggestions.suggestions[0];
      console.log(`  💡 Top suggestion: ${topSuggestion.title}`);
      console.log(`     Category: ${topSuggestion.category}`);
      console.log(`     Success probability: ${Math.round(topSuggestion.success_probability * 100)}%`);
    }
  }

  // Generate comprehensive system report
  console.log('📊 Generating comprehensive system report...');
  const allData = await nldSystem.exportAllData();
  
  console.log('📈 System Report Summary:');
  console.log('  - Total patterns learned:', allData.nld_data?.claude_flow_data?.failure_detection?.uniquePatterns || 0);
  console.log('  - Neural models trained:', Object.keys(allData.neural_models?.models || {}).length);
  console.log('  - Performance metrics collected:', allData.performance_report?.summary?.total_metrics || 0);
  console.log('  - Alerts generated:', allData.performance_report?.summary?.alerts_generated || 0);

  // Clean up
  await nldSystem.shutdown();
  console.log('✅ Complete NLD system example completed\n');
}

/**
 * Example 3: Real-time Performance Monitoring
 */
async function performanceMonitoringExample() {
  console.log('🚀 Starting Performance Monitoring Example');

  const { service, nldIntegration } = quickSetupNLD({ monitoringOnly: true });

  // Set up real-time monitoring
  nldIntegration.on('nldAlert', (alert) => {
    console.log(`🔔 Performance Alert [${alert.severity}]: ${alert.message}`);
    
    if (alert.severity === 'critical') {
      console.log('🚨 CRITICAL: Implementing emergency measures...');
      // In a real application, you might:
      // - Switch to fallback servers
      // - Enable circuit breakers
      // - Alert operations team
    }
  });

  nldIntegration.on('nldPerformanceReport', (report) => {
    console.log('📊 Performance Report Generated:');
    console.log(`  - Overall health: ${Math.round(report.summary.overall_health * 100)}%`);
    console.log(`  - Total metrics: ${report.summary.total_metrics}`);
    console.log(`  - Trends identified: ${report.summary.trends_identified}`);
    
    if (report.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      report.recommendations.slice(0, 3).forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }
  });

  // Simulate some activity for monitoring
  console.log('📈 Simulating connection activity for monitoring...');
  
  // Wait for monitoring to collect some data
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Get real-time metrics
  const metrics = nldIntegration.getRealtimeMetrics();
  if (metrics) {
    console.log('⚡ Real-time Metrics:');
    console.log('  - System health:', Math.round(metrics.realtime.system_health * 100), '%');
    console.log('  - Connection success rate:', Math.round(metrics.realtime.connection_success_rate * 100), '%');
    console.log('  - Learning efficiency:', Math.round(metrics.realtime.learning_efficiency * 100), '%');
  }

  await nldIntegration.shutdown();
  console.log('✅ Performance monitoring example completed\n');
}

/**
 * Example 4: Advanced Neural Learning
 */
async function neuralLearningExample() {
  console.log('🚀 Starting Neural Learning Example');

  const { service, nldIntegration } = quickSetupNLD({ learningOnly: true });

  // Monitor neural training events
  nldIntegration.on('nldNeuralTrained', (data) => {
    console.log('🧠 Neural models updated:');
    console.log('  - Training data size:', data.trainingDataSize);
    console.log('  - Training time:', data.trainingTime, 'ms');
    console.log('  - Models:', data.models);
  });

  // Simulate learning from various failure scenarios
  console.log('🎓 Simulating learning scenarios...');

  const learningScenarios = [
    'Timeout on slow network',
    'Protocol upgrade failure on WiFi', 
    'Authentication token expiry',
    'Server overload during peak hours',
    'Network interruption on mobile'
  ];

  for (let i = 0; i < learningScenarios.length; i++) {
    console.log(`📚 Learning from: ${learningScenarios[i]}`);
    
    // In a real scenario, these would be actual connection failures
    // that the system learns from automatically
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Trigger neural training
  console.log('🧠 Triggering neural pattern training...');
  await nldIntegration.trainNeuralPatterns();

  // Show learned intelligence
  console.log('🎯 Demonstrating learned intelligence...');
  
  const testContext = NLDDevUtils.createMockFailureContext({
    errorDetails: { code: 'ETIMEDOUT', message: 'Connection timeout', type: 'timeout' },
    networkConditions: NLDDevUtils.simulateNetworkConditions('slow-2g')
  });

  const suggestions = await nldIntegration.generateTroubleshootingSuggestions(testContext);
  
  console.log('🤖 AI-generated suggestions for timeout on slow network:');
  suggestions.suggestions?.slice(0, 3).forEach((suggestion, index) => {
    console.log(`  ${index + 1}. ${suggestion.title}`);
    console.log(`     Confidence: ${Math.round(suggestion.confidence * 100)}%`);
    console.log(`     Priority: ${suggestion.priority}/10`);
  });

  await nldIntegration.shutdown();
  console.log('✅ Neural learning example completed\n');
}

/**
 * Main function to run all examples
 */
async function main() {
  console.log('🌟 NLD Connection Learning System - Complete Examples\n');
  console.log('=' .repeat(60));

  try {
    await basicNLDExample();
    await completeNLDSystemExample();
    await performanceMonitoringExample();
    await neuralLearningExample();

    console.log('🎉 All NLD examples completed successfully!');
    console.log('\n📚 Key takeaways:');
    console.log('  1. NLD transparently enhances existing WebSocket connections');
    console.log('  2. The system learns from failures and optimizes strategies');
    console.log('  3. Real-time monitoring provides immediate insights');
    console.log('  4. Neural training enables intelligent predictions');
    console.log('  5. Troubleshooting suggestions improve resolution times');
    console.log('\n🚀 Ready for production deployment!');

  } catch (error) {
    console.error('❌ Example execution failed:', error);
    console.log('\n🔧 This might be expected in a demo environment.');
    console.log('💡 In production, ensure proper WebSocket endpoints are available.');
  }
}

// Export for use in other modules
export {
  basicNLDExample,
  completeNLDSystemExample,
  performanceMonitoringExample,
  neuralLearningExample,
  main as runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}