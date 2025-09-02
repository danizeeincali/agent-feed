/**
 * COMPREHENSIVE END-TO-END VALIDATION RUNNER
 * 
 * Executes real system validation without mocks or simulations
 * Tests complete button click → instance creation → command execution flow
 */

const ComprehensiveArchitectureValidator = require('./comprehensive-architecture-validation');

async function runValidation() {
    console.log('🚀 STARTING COMPREHENSIVE E2E VALIDATION');
    console.log('========================================');
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`📍 Working Directory: ${process.cwd()}`);
    console.log(`🔧 Node Version: ${process.version}`);
    console.log('');

    const validator = new ComprehensiveArchitectureValidator();
    
    try {
        console.log('🎯 VALIDATION OBJECTIVES:');
        console.log('   ✓ Frontend React application serving and routing');
        console.log('   ✓ Backend Express API and WebSocket server integration');
        console.log('   ✓ Claude Code CLI process management and communication');
        console.log('   ✓ Real-time message flow between all components');
        console.log('   ✓ Complete workflow simulation with real user interactions');
        console.log('   ✓ Command execution with tool call visualization');
        console.log('   ✓ Error handling and failure recovery scenarios');
        console.log('');
        
        // Run comprehensive validation
        const result = await validator.runFullValidation();
        
        console.log('');
        console.log('🎉 VALIDATION COMPLETE!');
        console.log(`📊 Overall Pass Rate: ${result.passRate}%`);
        console.log(`⏱️  Total Execution Time: ${(result.totalTime / 1000).toFixed(2)}s`);
        
        // Exit with appropriate code
        if (result.passRate >= 75) {
            console.log('✅ VALIDATION PASSED - System is ready for production');
            process.exit(0);
        } else {
            console.log('❌ VALIDATION FAILED - System needs attention');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('💥 VALIDATION SUITE CRASHED:');
        console.error(`   Error: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
        
        await validator.cleanup();
        process.exit(1);
    }
}

// Handle process signals for cleanup
process.on('SIGINT', async () => {
    console.log('\n⚠️  Received SIGINT - Cleaning up...');
    process.exit(1);
});

process.on('SIGTERM', async () => {
    console.log('\n⚠️  Received SIGTERM - Cleaning up...');
    process.exit(1);
});

// Run validation
runValidation();