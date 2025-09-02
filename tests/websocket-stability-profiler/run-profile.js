/**
 * Demonstration script for WebSocket Stability Profiling
 * Shows the 30-second connection drop pattern detection
 */

const WebSocketStabilityProfiler = require('./src/index.js');

async function runProfilerDemo() {
    console.log('🚀 WebSocket Connection Stability Profiler Demo');
    console.log('=' .repeat(60));
    console.log('This demo will:');
    console.log('• Create a mock WebSocket server with 30-second timeout simulation');
    console.log('• Test 5 concurrent connections for 75 seconds');
    console.log('• Show real-time monitoring dashboard');
    console.log('• Detect and analyze the 30-second drop pattern');
    console.log('• Generate comprehensive analysis with root cause');
    console.log('');

    const profiler = new WebSocketStabilityProfiler({
        testDuration: 75000,                  // 75 seconds - long enough to see pattern
        maxConnections: 5,                    // 5 concurrent connections
        enableThirtySecondTimeout: true,      // Enable the 30s timeout pattern
        thirtySecondTimeoutRate: 0.8,         // 80% of connections will hit 30s timeout
        enableRandomDrops: true,              // Some additional random drops
        randomDropRate: 0.1,                  // 10% random drops
        enableSlowResponses: true,            // Simulate slow server responses
        enableDashboard: true,                // Show real-time dashboard
        enableConsoleOutput: true,            // Console logging
        outputDirectory: './reports'          // Save reports here
    });

    try {
        console.log('Starting profiling session...\n');
        const analysis = await profiler.run();
        
        console.log('\n' + '='.repeat(80));
        console.log('🎯 PROFILING COMPLETE - KEY FINDINGS:');
        console.log('='.repeat(80));
        
        if (analysis.failureAnalysis.intervalPatterns['30s'] > 0) {
            console.log(`✅ SUCCESS: Detected ${analysis.failureAnalysis.intervalPatterns['30s']} connections dropping at ~30 seconds`);
            console.log('   This is the classic WebSocket timeout pattern!');
            console.log('');
            console.log('📋 ROOT CAUSE ANALYSIS:');
            console.log('   • WebSocket connections drop consistently at 30 seconds');
            console.log('   • Indicates server-side keepalive timeout or load balancer timeout');
            console.log('   • Client not sending keepalive pings to maintain connection');
            console.log('');
            console.log('🛠️  RECOMMENDED SOLUTION:');
            console.log('   • Implement client-side ping/pong every 20 seconds');
            console.log('   • Configure server keepalive settings');
            console.log('   • Add connection retry logic with exponential backoff');
        } else {
            console.log('ℹ️  No 30-second pattern detected in this run');
            console.log('   (Try running again or increase thirtySecondTimeoutRate)');
        }
        
        console.log('');
        console.log('📊 OVERALL STATISTICS:');
        console.log(`   • Total Connections: ${analysis.summary.totalConnections}`);
        console.log(`   • Success Rate: ${analysis.summary.successRate.toFixed(1)}%`);
        console.log(`   • Average Lifetime: ${Math.round(analysis.summary.avgConnectionLifetime / 1000)} seconds`);
        console.log(`   • Premature Disconnections: ${analysis.summary.prematureDisconnections}`);
        
        if (analysis.recommendations && analysis.recommendations.length > 0) {
            console.log('');
            console.log('🚨 CRITICAL ACTION ITEMS:');
            for (const rec of analysis.recommendations) {
                if (rec.priority === 'CRITICAL' || rec.priority === 'HIGH') {
                    console.log(`   • ${rec.title}`);
                    console.log(`     Solution: ${rec.solution}`);
                }
            }
        }
        
        console.log('');
        console.log('📄 DETAILED REPORTS SAVED TO:');
        console.log(`   • ${profiler.options.outputDirectory}/`);
        console.log('   • Check the markdown report for implementation details');
        console.log('   • Review CSV data for connection-level analysis');
        
        console.log('\n✅ Demo completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Profiling failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the demo
if (require.main === module) {
    runProfilerDemo();
}

module.exports = { runProfilerDemo };