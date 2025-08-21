/**
 * NLD (Neuro Learning Development) System Entry Point
 * Main interface for System Instructions Protection
 */

const { NLDSystemOrchestrator, getNLDSystem } = require('./NLDSystemOrchestrator');

// Auto-start the system when imported
const nldSystem = getNLDSystem();

// Export public API
module.exports = {
    // Core system
    NLDSystem: nldSystem,
    
    // Quick access methods
    async reportViolation(violation) {
        return await nldSystem.reportViolation(violation);
    },
    
    async reportModificationAttempt(attempt) {
        return await nldSystem.reportModificationAttempt(attempt);
    },
    
    async reportSuccessfulRead(operation) {
        return await nldSystem.reportSuccessfulRead(operation);
    },
    
    async reportProtectionBreach(breach) {
        return await nldSystem.reportProtectionBreach(breach);
    },
    
    async reportSystemBoundaryViolation(violation) {
        return await nldSystem.reportSystemBoundaryViolation(violation);
    },
    
    // System information
    getSystemStatus() {
        return nldSystem.getSystemStatus();
    },
    
    getRecentViolations(limit) {
        return nldSystem.getRecentViolations(limit);
    },
    
    getLearningStats() {
        return nldSystem.getLearningStats();
    },
    
    // System control
    async shutdown() {
        return await nldSystem.shutdown();
    },
    
    async restart() {
        return await nldSystem.restart();
    }
};

// CLI interface for testing and debugging
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
        case 'status':
            console.log('NLD System Status:');
            console.log(JSON.stringify(nldSystem.getSystemStatus(), null, 2));
            break;
            
        case 'violations':
            const limit = parseInt(args[1]) || 10;
            console.log(`Recent Violations (${limit}):`);
            console.log(JSON.stringify(nldSystem.getRecentViolations(limit), null, 2));
            break;
            
        case 'stats':
            console.log('Learning Statistics:');
            console.log(JSON.stringify(nldSystem.getLearningStats(), null, 2));
            break;
            
        case 'test-violation':
            const testViolation = {
                type: 'test_violation',
                source: 'cli_test',
                target: '.claude/prod/system-instructions',
                action: 'unauthorized_read',
                severity: 'medium'
            };
            nldSystem.reportViolation(testViolation).then(result => {
                console.log('Test violation reported:');
                console.log(JSON.stringify(result, null, 2));
            });
            break;
            
        case 'help':
        default:
            console.log('NLD System CLI Commands:');
            console.log('  status              - Show system status');
            console.log('  violations [limit]  - Show recent violations');
            console.log('  stats              - Show learning statistics');
            console.log('  test-violation     - Generate test violation');
            console.log('  help               - Show this help');
            break;
    }
}

console.log('🛡️ NLD System for System Instructions Protection is active');
console.log('🧠 Neural learning and adaptive protection enabled');
console.log('📊 Monitoring for access patterns, modifications, and breaches');