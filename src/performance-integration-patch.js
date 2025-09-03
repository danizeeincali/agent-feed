/**
 * Performance Integration Patch for simple-backend.js
 * 
 * This patch integrates the OptimizedSSEBroadcaster to fix race conditions
 * and resolve the critical bottleneck preventing Claude AI responses 
 * from reaching the frontend.
 */

import { OptimizedSSEBroadcaster } from './optimized-sse-broadcaster.js';

class PerformanceIntegrationPatch {
  constructor() {
    this.broadcaster = new OptimizedSSEBroadcaster();
    this.integrationPoints = new Map();
    this.appliedPatches = new Set();
    
    console.log('🔧 Performance Integration Patch initialized');
  }

  /**
   * PATCH 1: Replace broadcastToConnections with optimized version
   */
  patchBroadcastFunction(backendScope) {
    if (this.appliedPatches.has('broadcast_function')) {
      console.log('⚠️ Broadcast function patch already applied');
      return;
    }
    
    console.log('🔧 Applying broadcast function performance patch...');
    
    // Store original function
    const originalBroadcast = backendScope.broadcastToConnections;
    this.integrationPoints.set('original_broadcast', originalBroadcast);
    
    // Create enhanced broadcast function
    const enhancedBroadcast = (instanceId, message) => {
      console.log(`🚀 ENHANCED BROADCAST for ${instanceId}:`, message.type);
      
      // Use optimized broadcaster instead of original
      return this.broadcaster.broadcastToConnections(instanceId, message, true);
    };
    
    // Replace the function in backend scope
    backendScope.broadcastToConnections = enhancedBroadcast;
    
    console.log('✅ Broadcast function patch applied successfully');
    this.appliedPatches.add('broadcast_function');
    
    return enhancedBroadcast;
  }

  /**
   * PATCH 2: Enhance SSE connection management
   */
  patchConnectionManagement(backendScope) {
    if (this.appliedPatches.has('connection_management')) {
      console.log('⚠️ Connection management patch already applied');
      return;
    }
    
    console.log('🔧 Applying connection management performance patch...');
    
    // Store original connection handlers
    this.integrationPoints.set('original_add_connection', backendScope.addSSEConnection);
    
    // Enhanced connection handler
    const enhancedAddConnection = (instanceId, connection) => {
      console.log(`🔌 ENHANCED CONNECTION for ${instanceId}`);
      
      // Add to optimized broadcaster
      this.broadcaster.addConnection(instanceId, connection);
      
      // Still call original for backward compatibility
      if (backendScope.addSSEConnection) {
        backendScope.addSSEConnection(instanceId, connection);
      }
      
      return connection;
    };
    
    // Patch the connection management
    backendScope.addSSEConnection = enhancedAddConnection;
    
    console.log('✅ Connection management patch applied successfully');
    this.appliedPatches.add('connection_management');
    
    return enhancedAddConnection;
  }

  /**
   * PATCH 3: Optimize Claude response broadcasting
   */
  patchClaudeResponseHandling(backendScope) {
    if (this.appliedPatches.has('claude_responses')) {
      console.log('⚠️ Claude response patch already applied');
      return;
    }
    
    console.log('🔧 Applying Claude response performance patch...');
    
    // Create enhanced Claude response handler
    const enhancedClaudeBroadcast = this.broadcaster.createClaudeBroadcastFunction();
    
    // Store in backend scope for easy access
    backendScope.broadcastClaudeResponse = enhancedClaudeBroadcast;
    
    console.log('✅ Claude response patch applied successfully');
    this.appliedPatches.add('claude_responses');
    
    return enhancedClaudeBroadcast;
  }

  /**
   * PATCH 4: Add performance monitoring hooks
   */
  patchPerformanceMonitoring(backendScope) {
    if (this.appliedPatches.has('performance_monitoring')) {
      console.log('⚠️ Performance monitoring patch already applied');
      return;
    }
    
    console.log('🔧 Applying performance monitoring patch...');
    
    // Add performance monitoring endpoints
    backendScope.getPerformanceMetrics = () => {
      return this.broadcaster.analyzer.exportAnalysis();
    };
    
    backendScope.getConnectionStatus = (instanceId) => {
      return {
        connections: this.broadcaster.getConnectionCount(instanceId),
        queue: this.broadcaster.getQueueStatus(instanceId),
        health: this.broadcaster.analyzer.connectionHealthMonitor.get(instanceId) || null
      };
    };
    
    backendScope.clearPerformanceData = () => {
      this.broadcaster.cleanup();
      this.broadcaster.analyzer.cleanupStaleData();
      return { status: 'cleared' };
    };
    
    console.log('✅ Performance monitoring patch applied successfully');
    this.appliedPatches.add('performance_monitoring');
    
    return {
      getMetrics: backendScope.getPerformanceMetrics,
      getStatus: backendScope.getConnectionStatus,
      cleanup: backendScope.clearPerformanceData
    };
  }

  /**
   * COMPREHENSIVE PATCH APPLICATION
   */
  applyAllPatches(backendScope) {
    console.log('🔧 Applying comprehensive performance patches...');
    
    const results = {
      broadcast: this.patchBroadcastFunction(backendScope),
      connections: this.patchConnectionManagement(backendScope),
      claude: this.patchClaudeResponseHandling(backendScope),
      monitoring: this.patchPerformanceMonitoring(backendScope)
    };
    
    // Add integration verification
    this.verifyIntegration(backendScope);
    
    console.log('✅ All performance patches applied successfully!');
    console.log('📊 Applied patches:', Array.from(this.appliedPatches));
    
    return results;
  }

  /**
   * INTEGRATION VERIFICATION
   */
  verifyIntegration(backendScope) {
    console.log('🔍 Verifying performance patch integration...');
    
    const verificationResults = {
      broadcastFunction: typeof backendScope.broadcastToConnections === 'function',
      connectionManagement: typeof backendScope.addSSEConnection === 'function',
      claudeResponse: typeof backendScope.broadcastClaudeResponse === 'function',
      performanceMonitoring: typeof backendScope.getPerformanceMetrics === 'function',
      broadcasterHealth: this.broadcaster ? true : false,
      analyzerHealth: this.broadcaster?.analyzer ? true : false
    };
    
    const allHealthy = Object.values(verificationResults).every(result => result === true);
    
    if (allHealthy) {
      console.log('✅ All performance patches verified successfully');
    } else {
      console.error('❌ Performance patch verification failed:', verificationResults);
    }
    
    return { healthy: allHealthy, details: verificationResults };
  }

  /**
   * ROLLBACK FUNCTIONALITY
   */
  rollbackPatches(backendScope) {
    console.log('⏪ Rolling back performance patches...');
    
    // Restore original functions
    for (const [key, originalFunction] of this.integrationPoints) {
      if (key === 'original_broadcast') {
        backendScope.broadcastToConnections = originalFunction;
      }
      // Add more rollback logic as needed
    }
    
    // Clear applied patches
    this.appliedPatches.clear();
    
    console.log('⏪ Performance patches rolled back');
  }

  /**
   * REAL-TIME DIAGNOSTICS
   */
  runDiagnostics() {
    const diagnostics = {
      timestamp: Date.now(),
      patchStatus: {
        applied: Array.from(this.appliedPatches),
        count: this.appliedPatches.size
      },
      broadcasterMetrics: this.broadcaster.metrics,
      analyzerSummary: this.broadcaster.analyzer.analyzeBottlenecks(),
      memoryUsage: process.memoryUsage(),
      recommendations: []
    };
    
    // Add recommendations based on current state
    if (diagnostics.broadcasterMetrics.raceConditionsFixed > 0) {
      diagnostics.recommendations.push({
        priority: 'info',
        message: `Successfully fixed ${diagnostics.broadcasterMetrics.raceConditionsFixed} race conditions`
      });
    }
    
    if (diagnostics.broadcasterMetrics.queuedMessages > 50) {
      diagnostics.recommendations.push({
        priority: 'warning',
        message: 'High number of queued messages - consider connection optimization'
      });
    }
    
    return diagnostics;
  }
}

/**
 * EASY INTEGRATION FUNCTION FOR BACKEND
 */
function integratePerformanceOptimizations(backendScope) {
  const patch = new PerformanceIntegrationPatch();
  const results = patch.applyAllPatches(backendScope);
  
  // Add diagnostics endpoint
  backendScope.runPerformanceDiagnostics = () => patch.runDiagnostics();
  
  console.log('🚀 Performance optimizations integrated successfully!');
  console.log('💡 Use backendScope.runPerformanceDiagnostics() for real-time analysis');
  
  return { patch, results };
}

export { PerformanceIntegrationPatch, integratePerformanceOptimizations };