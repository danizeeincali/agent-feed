#!/usr/bin/env node
"use strict";
/**
 * NLD SSE Buffer Storm Deployment Script
 *
 * Deploys comprehensive monitoring for SSE buffer accumulation storms
 * Integrates with existing SSE infrastructure for real-time pattern detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSEBufferStormNLDDeployment = void 0;
const real_time_sse_buffer_storm_detector_1 = require("./real-time-sse-buffer-storm-detector");
const sse_integration_gap_monitor_1 = require("./sse-integration-gap-monitor");
const neural_training_export_system_1 = require("./neural-training-export-system");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
class SSEBufferStormNLDDeployment {
    deploymentStatus = new Map();
    constructor() {
        console.log('[NLD Deploy] Starting SSE Buffer Storm monitoring deployment...');
    }
    /**
     * Deploy complete NLD monitoring system for SSE buffer storms
     */
    async deployComplete() {
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
        }
        catch (error) {
            console.error('[NLD Deploy] Deployment failed:', error);
            throw error;
        }
    }
    async initializeStorage() {
        try {
            // Create pattern storage directories
            (0, child_process_1.execSync)('mkdir -p /workspaces/agent-feed/src/nld/sse-buffer-storm/patterns');
            (0, child_process_1.execSync)('mkdir -p /workspaces/agent-feed/src/nld/sse-buffer-storm/neural-exports');
            (0, child_process_1.execSync)('mkdir -p /workspaces/agent-feed/src/nld/sse-buffer-storm/monitoring-logs');
            this.deploymentStatus.set('storage_initialized', true);
            console.log('[NLD Deploy] ✓ Pattern storage directories initialized');
        }
        catch (error) {
            console.error('[NLD Deploy] ✗ Failed to initialize storage:', error);
            this.deploymentStatus.set('storage_initialized', false);
            throw error;
        }
    }
    async startDetectors() {
        try {
            // Start buffer storm detector
            real_time_sse_buffer_storm_detector_1.sseBufferStormDetector.startMonitoring();
            // Set up event handlers for real-time alerts
            real_time_sse_buffer_storm_detector_1.sseBufferStormDetector.on('bufferStormDetected', (event) => {
                console.log(`[NLD Alert] BUFFER STORM DETECTED: ${event.endpoint} (${event.severity})`);
                console.log(`[NLD Alert] Duplicate ratio: ${(event.duplicateRatio * 100).toFixed(1)}%, Buffer size: ${event.bufferSize}`);
            });
            real_time_sse_buffer_storm_detector_1.sseBufferStormDetector.on('integrationGapDetected', (event) => {
                console.log(`[NLD Alert] INTEGRATION GAP: ${event.pattern} (${event.severity})`);
            });
            real_time_sse_buffer_storm_detector_1.sseBufferStormDetector.on('patternDetected', (pattern) => {
                console.log(`[NLD Pattern] ${pattern.antiPatternType}: ${pattern.endpoint} (Effectiveness: ${pattern.trainingData.effectivenessScore})`);
            });
            // Start integration gap monitor
            sse_integration_gap_monitor_1.sseIntegrationGapMonitor.on('integrationGapDetected', (gap) => {
                console.log(`[NLD Gap] ${gap.pattern_type}: ${gap.helper_function} -> ${gap.actual_endpoint}`);
                console.log(`[NLD Gap] Integration score: ${gap.integration_score}, Impact: ${gap.failure_impact}`);
            });
            this.deploymentStatus.set('detectors_started', true);
            console.log('[NLD Deploy] ✓ Real-time detectors started');
        }
        catch (error) {
            console.error('[NLD Deploy] ✗ Failed to start detectors:', error);
            this.deploymentStatus.set('detectors_started', false);
            throw error;
        }
    }
    async hookIntoSSEInfrastructure() {
        try {
            // Hook into existing SSE infrastructure by monkey-patching common SSE patterns
            this.deploySSEInterceptors();
            this.deploymentStatus.set('sse_integration', true);
            console.log('[NLD Deploy] ✓ Hooked into SSE infrastructure');
        }
        catch (error) {
            console.warn('[NLD Deploy] ⚠ SSE infrastructure hook failed (will monitor externally):', error);
            this.deploymentStatus.set('sse_integration', false);
        }
    }
    deploySSEInterceptors() {
        // Intercept common SSE response patterns
        const originalWrite = require('http').ServerResponse.prototype.write;
        require('http').ServerResponse.prototype.write = function (chunk, ...args) {
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
                real_time_sse_buffer_storm_detector_1.sseBufferStormDetector.captureSSEMessage(message);
            }
            // Call original write method
            return originalWrite.call(this, chunk, ...args);
        };
        console.log('[NLD Deploy] SSE interceptors deployed for real-time monitoring');
    }
    async exportNeuralTrainingData() {
        try {
            // Export initial neural training dataset
            const datasetFile = await neural_training_export_system_1.neuralTrainingExportSystem.exportSSEBufferStormDataset();
            const preventionFile = neural_training_export_system_1.neuralTrainingExportSystem.exportTDDPreventionDatabase();
            console.log(`[NLD Deploy] ✓ Neural training data exported:`);
            console.log(`[NLD Deploy]   - Dataset: ${datasetFile}`);
            console.log(`[NLD Deploy]   - Prevention DB: ${preventionFile}`);
            this.deploymentStatus.set('neural_export', true);
        }
        catch (error) {
            console.error('[NLD Deploy] ✗ Failed to export neural training data:', error);
            this.deploymentStatus.set('neural_export', false);
            throw error;
        }
    }
    async validateDeployment() {
        try {
            // Validate all components are working
            const bufferStormStats = real_time_sse_buffer_storm_detector_1.sseBufferStormDetector.getMonitoringStats();
            const integrationGapStats = sse_integration_gap_monitor_1.sseIntegrationGapMonitor.getGapAnalysisStats();
            const exportStats = neural_training_export_system_1.neuralTrainingExportSystem.getExportStats();
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
                if (!(0, fs_1.existsSync)(path)) {
                    throw new Error(`Required path missing: ${path}`);
                }
            }
            this.deploymentStatus.set('validation_passed', true);
            console.log('[NLD Deploy] ✓ Deployment validation passed');
        }
        catch (error) {
            console.error('[NLD Deploy] ✗ Deployment validation failed:', error);
            this.deploymentStatus.set('validation_passed', false);
            throw error;
        }
    }
    reportDeploymentStatus() {
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
        }
        else {
            console.log('[NLD Deploy] ⚠️  Partial deployment - some components failed');
            console.log('[NLD Deploy] Manual intervention may be required for full functionality');
        }
    }
    /**
     * Test the deployed system with simulated SSE buffer storm
     */
    simulateBufferStormTest() {
        console.log('[NLD Test] Simulating SSE buffer storm for testing...');
        // Simulate problematic SSE messages
        for (let i = 0; i < 20; i++) {
            const duplicatedMessage = {
                id: `test-msg-${i}`,
                data: 'FULL BUFFER: ' + 'repeated content '.repeat(100), // Large duplicated content
                timestamp: Date.now(),
                endpoint: '/test-sse-endpoint'
            };
            real_time_sse_buffer_storm_detector_1.sseBufferStormDetector.captureSSEMessage(duplicatedMessage);
        }
        setTimeout(() => {
            const stats = real_time_sse_buffer_storm_detector_1.sseBufferStormDetector.getMonitoringStats();
            console.log('[NLD Test] Simulation results:');
            console.log(`[NLD Test]   - Patterns detected: ${stats.totalPatternsDetected}`);
            console.log(`[NLD Test]   - Critical patterns: ${stats.criticalPatterns}`);
            console.log('[NLD Test] Test completed - check logs for pattern detection alerts');
        }, 2000);
    }
}
exports.SSEBufferStormNLDDeployment = SSEBufferStormNLDDeployment;
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
    }
    catch (error) {
        console.error('[NLD Deploy] Deployment failed:', error);
        process.exit(1);
    }
}
// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=deploy-sse-buffer-storm-nld.js.map