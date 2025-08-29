#!/usr/bin/env node

/**
 * NLD SSE Buffer Storm Deployment Script
 * 
 * Deploys comprehensive monitoring for SSE buffer accumulation storms
 * Integrates with existing SSE infrastructure for real-time pattern detection
 */

import { sseBufferStormDetector } from './real-time-sse-buffer-storm-detector';
import { sseIntegrationGapMonitor } from './sse-integration-gap-monitor';
import { neuralTrainingExportSystem } from './neural-training-export-system';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

class SSEBufferStormNLDDeployment {
  private deploymentStatus: Map<string, boolean> = new Map();

  constructor() {
    console.log('[NLD Deploy] Starting SSE Buffer Storm monitoring deployment...');
  }

  /**
   * Deploy complete NLD monitoring system for SSE buffer storms
   */
  public async deployComplete(): Promise<void> {
    try {
      // Step 1: Initialize pattern storage directories
      await this.initializeStorage();
      
      // Step 2: Start real-time detectors
      await this.startDetectors();
      
      // Step 3: Hook into existing SSE infrastructure
      await this.hookIntoSSEInfrastructure();
      
      // Step 4: Export initial neural training data
      await this.exportNeuralTrainingData();
      
      // Step 5: Validate deployment
      await this.validateDeployment();
      
      console.log('[NLD Deploy] SSE Buffer Storm monitoring deployed successfully!');
      this.reportDeploymentStatus();
      
    } catch (error) {
      console.error('[NLD Deploy] Deployment failed:', error);
      throw error;
    }
  }

  private async initializeStorage(): Promise<void> {
    try {
      // Create pattern storage directories
      execSync('mkdir -p /workspaces/agent-feed/src/nld/sse-buffer-storm/patterns');
      execSync('mkdir -p /workspaces/agent-feed/src/nld/sse-buffer-storm/neural-exports');
      execSync('mkdir -p /workspaces/agent-feed/src/nld/sse-buffer-storm/monitoring-logs');
      
      this.deploymentStatus.set('storage_initialized', true);
      console.log('[NLD Deploy] ✓ Pattern storage directories initialized');
      
    } catch (error) {
      console.error('[NLD Deploy] ✗ Failed to initialize storage:', error);
      this.deploymentStatus.set('storage_initialized', false);
      throw error;
    }
  }

  private async startDetectors(): Promise<void> {
    try {
      // Start buffer storm detector
      sseBufferStormDetector.startMonitoring();
      
      // Set up event handlers for real-time alerts
      sseBufferStormDetector.on('bufferStormDetected', (event) => {
        console.log(`[NLD Alert] BUFFER STORM DETECTED: ${event.endpoint} (${event.severity})`);
        console.log(`[NLD Alert] Duplicate ratio: ${(event.duplicateRatio * 100).toFixed(1)}%, Buffer size: ${event.bufferSize}`);
      });

      sseBufferStormDetector.on('integrationGapDetected', (event) => {
        console.log(`[NLD Alert] INTEGRATION GAP: ${event.pattern} (${event.severity})`);
      });

      sseBufferStormDetector.on('patternDetected', (pattern) => {
        console.log(`[NLD Pattern] ${pattern.antiPatternType}: ${pattern.endpoint} (Effectiveness: ${pattern.trainingData.effectivenessScore})`);
      });

      // Start integration gap monitor
      sseIntegrationGapMonitor.on('integrationGapDetected', (gap) => {
        console.log(`[NLD Gap] ${gap.pattern_type}: ${gap.helper_function} -> ${gap.actual_endpoint}`);
        console.log(`[NLD Gap] Integration score: ${gap.integration_score}, Impact: ${gap.failure_impact}`);
      });

      this.deploymentStatus.set('detectors_started', true);
      console.log('[NLD Deploy] ✓ Real-time detectors started');
      
    } catch (error) {
      console.error('[NLD Deploy] ✗ Failed to start detectors:', error);
      this.deploymentStatus.set('detectors_started', false);
      throw error;
    }
  }

  private async hookIntoSSEInfrastructure(): Promise<void> {
    try {
      // Hook into existing SSE infrastructure by monkey-patching common SSE patterns
      this.deploySSEInterceptors();
      
      this.deploymentStatus.set('sse_integration', true);
      console.log('[NLD Deploy] ✓ Hooked into SSE infrastructure');
      
    } catch (error) {
      console.warn('[NLD Deploy] ⚠ SSE infrastructure hook failed (will monitor externally):', error);
      this.deploymentStatus.set('sse_integration', false);
    }
  }

  private deploySSEInterceptors(): void {
    // Intercept common SSE response patterns
    const originalWrite = require('http').ServerResponse.prototype.write;
    
    require('http').ServerResponse.prototype.write = function(chunk: any, ...args: any[]) {
      // Detect SSE messages by content-type or data format
      const isSSE = this.getHeader('content-type') === 'text/event-stream' || 
                   (chunk && chunk.toString().includes('data:'));
      
      if (isSSE) {
        // Capture SSE message for monitoring
        const message = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          data: chunk.toString(),
          timestamp: Date.now(),
          endpoint: this.req?.url || 'unknown-endpoint'
        };
        
        // Send to buffer storm detector
        sseBufferStormDetector.captureSSEMessage(message);
      }
      
      // Call original write method
      return originalWrite.call(this, chunk, ...args);
    };

    console.log('[NLD Deploy] SSE interceptors deployed for real-time monitoring');
  }

  private async exportNeuralTrainingData(): Promise<void> {
    try {
      // Export initial neural training dataset
      const datasetFile = await neuralTrainingExportSystem.exportSSEBufferStormDataset();
      const preventionFile = neuralTrainingExportSystem.exportTDDPreventionDatabase();
      
      console.log(`[NLD Deploy] ✓ Neural training data exported:`);
      console.log(`[NLD Deploy]   - Dataset: ${datasetFile}`);
      console.log(`[NLD Deploy]   - Prevention DB: ${preventionFile}`);
      
      this.deploymentStatus.set('neural_export', true);
      
    } catch (error) {
      console.error('[NLD Deploy] ✗ Failed to export neural training data:', error);
      this.deploymentStatus.set('neural_export', false);
      throw error;
    }
  }

  private async validateDeployment(): Promise<void> {
    try {
      // Validate all components are working
      const bufferStormStats = sseBufferStormDetector.getMonitoringStats();
      const integrationGapStats = sseIntegrationGapMonitor.getGapAnalysisStats();
      const exportStats = neuralTrainingExportSystem.getExportStats();

      console.log('[NLD Deploy] Deployment validation:');
      console.log(`[NLD Deploy]   - Buffer storm detector: ${bufferStormStats.endpointsMonitored} endpoints monitored`);
      console.log(`[NLD Deploy]   - Integration gap monitor: ${integrationGapStats.total_gaps_detected} gaps detected`);
      console.log(`[NLD Deploy]   - Neural training: ${exportStats.neural_training_ready ? 'Ready' : 'Not ready'}`);

      // Validate file existence
      const requiredFiles = [
        '/workspaces/agent-feed/src/nld/sse-buffer-storm/patterns',
        '/workspaces/agent-feed/src/nld/sse-buffer-storm/neural-exports'
      ];

      for (const path of requiredFiles) {
        if (!existsSync(path)) {
          throw new Error(`Required path missing: ${path}`);
        }
      }

      this.deploymentStatus.set('validation_passed', true);
      console.log('[NLD Deploy] ✓ Deployment validation passed');
      
    } catch (error) {
      console.error('[NLD Deploy] ✗ Deployment validation failed:', error);
      this.deploymentStatus.set('validation_passed', false);
      throw error;
    }
  }

  private reportDeploymentStatus(): void {
    console.log('\n[NLD Deploy] === SSE Buffer Storm NLD Deployment Status ===');
    
    for (const [component, status] of this.deploymentStatus.entries()) {
      const statusIcon = status ? '✅' : '❌';
      const statusText = status ? 'SUCCESS' : 'FAILED';
      console.log(`[NLD Deploy] ${statusIcon} ${component}: ${statusText}`);
    }

    const totalComponents = this.deploymentStatus.size;
    const successfulComponents = Array.from(this.deploymentStatus.values()).filter(Boolean).length;
    const successRate = (successfulComponents / totalComponents) * 100;

    console.log(`\n[NLD Deploy] Overall Success Rate: ${successRate.toFixed(1)}% (${successfulComponents}/${totalComponents})`);
    
    if (successRate >= 80) {
      console.log('[NLD Deploy] 🎉 SSE Buffer Storm NLD is operational!');
      console.log('[NLD Deploy] Monitoring for:');
      console.log('[NLD Deploy]   - Buffer replay loops (CRITICAL)');
      console.log('[NLD Deploy]   - Integration gaps between helpers and endpoints (CRITICAL)');
      console.log('[NLD Deploy]   - Position tracking failures (HIGH)');
      console.log('[NLD Deploy]   - Frontend-backend data mismatches (HIGH)');
      console.log('[NLD Deploy]   - Input echo accumulation (MEDIUM)');
      console.log('\n[NLD Deploy] Neural training data ready for claude-flow integration.');
    } else {
      console.log('[NLD Deploy] ⚠️  Partial deployment - some components failed');
      console.log('[NLD Deploy] Manual intervention may be required for full functionality');
    }
  }

  /**
   * Test the deployed system with simulated SSE buffer storm
   */
  public simulateBufferStormTest(): void {
    console.log('[NLD Test] Simulating SSE buffer storm for testing...');
    
    // Simulate problematic SSE messages
    for (let i = 0; i < 20; i++) {
      const duplicatedMessage = {
        id: `test-msg-${i}`,
        data: 'FULL BUFFER: ' + 'repeated content '.repeat(100), // Large duplicated content
        timestamp: Date.now(),
        endpoint: '/test-sse-endpoint'
      };
      
      sseBufferStormDetector.captureSSEMessage(duplicatedMessage);
    }

    setTimeout(() => {
      const stats = sseBufferStormDetector.getMonitoringStats();
      console.log('[NLD Test] Simulation results:');
      console.log(`[NLD Test]   - Patterns detected: ${stats.totalPatternsDetected}`);
      console.log(`[NLD Test]   - Critical patterns: ${stats.criticalPatterns}`);
      console.log('[NLD Test] Test completed - check logs for pattern detection alerts');
    }, 2000);
  }
}

// Main deployment execution
async function main() {
  const deployment = new SSEBufferStormNLDDeployment();
  
  try {
    await deployment.deployComplete();
    
    // Run simulation test if requested
    if (process.argv.includes('--test')) {
      deployment.simulateBufferStormTest();
    }
    
    console.log('\n[NLD Deploy] SSE Buffer Storm NLD is now monitoring for failure patterns.');
    console.log('[NLD Deploy] The system will automatically detect and learn from SSE streaming failures.');
    
  } catch (error) {
    console.error('[NLD Deploy] Deployment failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { SSEBufferStormNLDDeployment };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}