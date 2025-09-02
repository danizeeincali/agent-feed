#!/usr/bin/env node

/**
 * Comprehensive Regression Test Suite Runner
 * Executes all regression tests and generates production assessment
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Import test modules
const PerformanceBaseline = require('./performance/baseline-performance-test');
const MemoryLeakDetector = require('./memory/memory-leak-detector');
const ConcurrentStressTest = require('./concurrent/concurrent-stress-test');
const ErrorRecoveryTest = require('./error-recovery/error-recovery-test');
const CrossBrowserTest = require('./cross-browser/cross-browser-test');
const LoadStressTest = require('./load/load-stress-test');
const StabilityMonitor = require('./stability/stability-monitor');

class ComprehensiveRegressionRunner {
    constructor() {
        this.testResults = {
            performance: {},
            memory: {},
            concurrency: {},
            errorRecovery: {},
            crossBrowser: {},
            load: {},
            stability: {},
            overall: {}
        };
        this.testStartTime = Date.now();
        this.reportDir = '/workspaces/agent-feed/tests/regression/comprehensive-suite/reports';
    }

    async runComprehensiveRegressionTests() {
        console.log('🚀 Starting Comprehensive Regression Test Suite...');
        console.log('='.repeat(60));
        
        try {
            // Ensure reports directory exists
            await fs.mkdir(this.reportDir, { recursive: true });
            
            // Pre-test system validation
            await this.validateSystemReadiness();
            
            // Execute all test suites
            await this.executeTestSuites();
            
            // Generate comprehensive analysis
            await this.generateComprehensiveAnalysis();
            
            // Create production readiness assessment
            await this.createProductionAssessment();
            
            console.log('✅ Comprehensive Regression Testing Completed');
            console.log('='.repeat(60));
            
            return this.testResults;
            
        } catch (error) {
            console.error('❌ Comprehensive regression testing failed:', error);
            throw error;
        }
    }

    async validateSystemReadiness() {
        console.log('🔍 Validating system readiness...');
        
        const validations = [
            this.checkFrontendAvailability(),
            this.checkBackendAvailability(),
            this.checkSystemResources()
        ];
        
        const results = await Promise.allSettled(validations);
        
        const failures = results
            .map((result, index) => ({ index, result }))
            .filter(({ result }) => result.status === 'rejected')
            .map(({ index, result }) => ({
                check: ['frontend', 'backend', 'resources'][index],
                error: result.reason.message
            }));
        
        if (failures.length > 0) {
            console.error('❌ System readiness checks failed:');
            failures.forEach(failure => {
                console.error(`  - ${failure.check}: ${failure.error}`);
            });
            throw new Error('System not ready for regression testing');
        }
        
        console.log('✅ System readiness validated');
    }

    async checkFrontendAvailability() {
        try {
            const { stdout } = await execAsync('curl -s http://localhost:5174 | head -1');
            if (!stdout.includes('<!DOCTYPE') && !stdout.includes('<html')) {
                throw new Error('Frontend not responding with HTML');
            }
        } catch (error) {
            throw new Error(`Frontend unavailable: ${error.message}`);
        }
    }

    async checkBackendAvailability() {
        try {
            // Check if WebSocket server is running
            const { stdout } = await execAsync('lsof -ti:8080 || echo "not found"');
            if (stdout.trim() === 'not found') {
                console.log('⚠️ Backend WebSocket server not found on port 8080');
                // This might be okay if using a different port
            }
        } catch (error) {
            console.log(`⚠️ Backend check warning: ${error.message}`);
            // Don't fail the test for this
        }
    }

    async checkSystemResources() {
        try {
            const memoryUsage = process.memoryUsage();
            const freeMemoryGB = (process.memoryUsage().heapTotal / 1024 / 1024 / 1024);
            
            if (freeMemoryGB > 2) { // More than 2GB used
                console.log('⚠️ High memory usage detected, but continuing...');
            }
        } catch (error) {
            console.log(`⚠️ Resource check warning: ${error.message}`);
        }
    }

    async executeTestSuites() {
        console.log('📋 Executing Test Suites...');
        
        const testSuites = [
            {
                name: 'Performance Baseline',
                key: 'performance',
                runner: () => new PerformanceBaseline().runBaselineTests(),
                timeout: 120000 // 2 minutes
            },
            {
                name: 'Memory Leak Detection',
                key: 'memory',
                runner: () => new MemoryLeakDetector().runMemoryLeakDetection(),
                timeout: 90000 // 1.5 minutes
            },
            {
                name: 'Concurrent Stress Test',
                key: 'concurrency',
                runner: () => new ConcurrentStressTest({ users: 5, commands: 5, cycles: 3 }).runConcurrentStressTests(),
                timeout: 120000 // 2 minutes
            },
            {
                name: 'Error Recovery Test',
                key: 'errorRecovery',
                runner: () => new ErrorRecoveryTest().runErrorRecoveryTests(),
                timeout: 180000 // 3 minutes
            },
            {
                name: 'Cross-Browser Compatibility',
                key: 'crossBrowser',
                runner: () => new CrossBrowserTest().runCrossBrowserTests(),
                timeout: 300000 // 5 minutes
            },
            {
                name: 'Load Stress Test',
                key: 'load',
                runner: () => new LoadStressTest({ maxUsers: 8, commandsPerSecond: 20, duration: 30000 }).runLoadStressTests(),
                timeout: 120000 // 2 minutes
            },
            {
                name: 'Stability Monitor',
                key: 'stability',
                runner: () => new StabilityMonitor({ duration: 60000, userCount: 2 }).runStabilityTests(),
                timeout: 90000 // 1.5 minutes
            }
        ];

        // Execute test suites with individual timeout handling
        for (const suite of testSuites) {
            console.log(`\n🧪 Running ${suite.name}...`);
            const suiteStartTime = performance.now();
            
            try {
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`Test suite timeout after ${suite.timeout}ms`)), suite.timeout)
                );
                
                const result = await Promise.race([
                    suite.runner(),
                    timeoutPromise
                ]);
                
                this.testResults[suite.key] = {
                    success: true,
                    result,
                    duration: performance.now() - suiteStartTime,
                    timestamp: Date.now()
                };
                
                console.log(`✅ ${suite.name} completed in ${((performance.now() - suiteStartTime) / 1000).toFixed(1)}s`);
                
            } catch (error) {
                console.error(`❌ ${suite.name} failed: ${error.message}`);
                
                this.testResults[suite.key] = {
                    success: false,
                    error: error.message,
                    duration: performance.now() - suiteStartTime,
                    timestamp: Date.now()
                };
            }
            
            // Brief pause between test suites
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    async generateComprehensiveAnalysis() {
        console.log('\n📊 Generating comprehensive analysis...');
        
        const analysis = {
            testSuitesExecuted: Object.keys(this.testResults).length - 1, // Exclude 'overall'
            successfulSuites: Object.values(this.testResults).filter(r => r.success).length,
            failedSuites: Object.values(this.testResults).filter(r => !r.success).length,
            totalTestDuration: Object.values(this.testResults).reduce((sum, r) => sum + (r.duration || 0), 0),
            scores: {},
            criticalIssues: [],
            recommendations: [],
            regressionDetected: false
        };

        // Extract scores from each test suite
        try {
            if (this.testResults.performance.success && this.testResults.performance.result.baselines) {
                analysis.scores.performance = this.calculatePerformanceScore(this.testResults.performance.result);
            }
            
            if (this.testResults.memory.success && this.testResults.memory.result.summary) {
                analysis.scores.memory = this.calculateMemoryScore(this.testResults.memory.result);
            }
            
            if (this.testResults.concurrency.success) {
                analysis.scores.concurrency = this.calculateConcurrencyScore(this.testResults.concurrency.result);
            }
            
            if (this.testResults.errorRecovery.success && this.testResults.errorRecovery.result.summary) {
                analysis.scores.errorRecovery = this.testResults.errorRecovery.result.summary.overallRecoveryScore || 0;
            }
            
            if (this.testResults.crossBrowser.success && this.testResults.crossBrowser.result.compatibility) {
                analysis.scores.crossBrowser = this.testResults.crossBrowser.result.compatibility.overallCompatibility || 0;
            }
            
            if (this.testResults.load.success && this.testResults.load.result.summary) {
                analysis.scores.load = this.testResults.load.result.summary.overallScore || 0;
            }
            
            if (this.testResults.stability.success && this.testResults.stability.result.summary) {
                analysis.scores.stability = this.testResults.stability.result.summary.stabilityScore || 0;
            }
        } catch (error) {
            console.error('Warning: Error extracting scores:', error.message);
        }

        // Calculate overall score
        const validScores = Object.values(analysis.scores).filter(score => typeof score === 'number' && score > 0);
        analysis.overallScore = validScores.length > 0 
            ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length 
            : 0;

        // Collect critical issues and recommendations
        Object.entries(this.testResults).forEach(([key, result]) => {
            if (key === 'overall') return;
            
            if (!result.success) {
                analysis.criticalIssues.push(`${key} test suite failed: ${result.error}`);
            } else if (result.result) {
                // Extract recommendations from each test suite
                if (result.result.recommendations) {
                    analysis.recommendations.push(...result.result.recommendations);
                }
                if (result.result.summary?.recommendations) {
                    analysis.recommendations.push(...result.result.summary.recommendations);
                }
            }
        });

        // Detect regressions
        analysis.regressionDetected = this.detectRegressions(analysis);

        this.testResults.overall = analysis;
        
        console.log(`📈 Overall Score: ${analysis.overallScore.toFixed(1)}/100`);
        console.log(`📊 Successful Suites: ${analysis.successfulSuites}/${analysis.testSuitesExecuted}`);
    }

    calculatePerformanceScore(performanceResult) {
        try {
            const baselines = performanceResult.baselines;
            let score = 100;
            
            // WebSocket performance
            if (baselines.websocket?.avgConnectionTime > 3000) score -= 20;
            if (baselines.websocket?.avgMessageRoundTrip > 1000) score -= 15;
            
            // Command performance
            const commandTimes = Object.values(baselines.commands || {});
            const avgCommandTime = commandTimes.reduce((sum, time) => sum + time, 0) / commandTimes.length || 0;
            if (avgCommandTime > 2000) score -= 20;
            
            return Math.max(0, score);
        } catch (error) {
            return 0;
        }
    }

    calculateMemoryScore(memoryResult) {
        try {
            const summary = memoryResult.summary;
            let score = 100;
            
            if (summary.hasAnyLeaks) score -= 40;
            if (summary.leakTypes.websocket) score -= 20;
            if (summary.leakTypes.components) score -= 15;
            if (summary.leakTypes.dom) score -= 10;
            if (summary.leakTypes.eventListeners) score -= 5;
            
            return Math.max(0, score);
        } catch (error) {
            return 0;
        }
    }

    calculateConcurrencyScore(concurrencyResult) {
        try {
            let score = 100;
            
            if (concurrencyResult.concurrency?.connections?.successRate < 90) score -= 30;
            if (concurrencyResult.concurrency?.commands?.successRate < 85) score -= 25;
            if (concurrencyResult.concurrency?.cycling?.successRate < 80) score -= 20;
            
            return Math.max(0, score);
        } catch (error) {
            return 0;
        }
    }

    detectRegressions(analysis) {
        // Simple regression detection based on overall score and critical issues
        const criticalFailures = analysis.criticalIssues.filter(issue => 
            issue.toLowerCase().includes('critical') || 
            issue.toLowerCase().includes('failed')
        );
        
        return analysis.overallScore < 60 || criticalFailures.length > 2;
    }

    async createProductionAssessment() {
        console.log('\n🎯 Creating Production Readiness Assessment...');
        
        const analysis = this.testResults.overall;
        const assessment = {
            timestamp: new Date().toISOString(),
            testDuration: Date.now() - this.testStartTime,
            overallScore: analysis.overallScore,
            productionReadiness: this.assessProductionReadiness(analysis),
            testResults: this.testResults,
            criticalBlocks: this.identifyCriticalBlockers(),
            recommendations: this.prioritizeRecommendations(analysis),
            nextSteps: this.generateNextSteps(analysis),
            signOff: this.generateSignOffStatus(analysis)
        };

        // Save comprehensive report
        const reportPath = path.join(this.reportDir, 'comprehensive-regression-report.json');
        await fs.writeFile(reportPath, JSON.stringify(assessment, null, 2));
        
        // Generate executive summary
        await this.generateExecutiveSummary(assessment);
        
        // Display results
        this.displayProductionAssessment(assessment);
        
        return assessment;
    }

    assessProductionReadiness(analysis) {
        if (analysis.overallScore >= 90 && analysis.failedSuites === 0) {
            return {
                status: 'READY',
                confidence: 'HIGH',
                description: 'System demonstrates excellent stability and performance'
            };
        } else if (analysis.overallScore >= 80 && analysis.failedSuites <= 1) {
            return {
                status: 'READY_WITH_MONITORING',
                confidence: 'MEDIUM',
                description: 'System ready for production with enhanced monitoring'
            };
        } else if (analysis.overallScore >= 70 && analysis.failedSuites <= 2) {
            return {
                status: 'CONDITIONAL',
                confidence: 'MEDIUM',
                description: 'System can be deployed with specific mitigations'
            };
        } else if (analysis.overallScore >= 50) {
            return {
                status: 'NOT_READY',
                confidence: 'LOW',
                description: 'System requires significant improvements before production'
            };
        } else {
            return {
                status: 'BLOCKED',
                confidence: 'NONE',
                description: 'Critical issues prevent production deployment'
            };
        }
    }

    identifyCriticalBlockers() {
        const blockers = [];
        
        Object.entries(this.testResults).forEach(([key, result]) => {
            if (key === 'overall') return;
            
            if (!result.success) {
                blockers.push({
                    severity: 'CRITICAL',
                    category: key,
                    issue: `${key} test suite failed completely`,
                    impact: 'System stability cannot be verified'
                });
            } else if (result.result) {
                // Check for critical issues within successful tests
                if (key === 'memory' && result.result.summary?.hasAnyLeaks) {
                    blockers.push({
                        severity: 'HIGH',
                        category: 'memory',
                        issue: 'Memory leaks detected',
                        impact: 'Long-term system degradation'
                    });
                }
                
                if (key === 'errorRecovery' && result.result.summary?.overallRecoveryScore < 60) {
                    blockers.push({
                        severity: 'HIGH',
                        category: 'resilience',
                        issue: 'Poor error recovery capabilities',
                        impact: 'System may not handle failures gracefully'
                    });
                }
                
                if (key === 'load' && result.result.summary?.overallScore < 50) {
                    blockers.push({
                        severity: 'CRITICAL',
                        category: 'performance',
                        issue: 'System fails under load',
                        impact: 'Cannot handle production traffic'
                    });
                }
            }
        });
        
        return blockers;
    }

    prioritizeRecommendations(analysis) {
        const allRecommendations = analysis.recommendations || [];
        
        // Categorize and prioritize recommendations
        const prioritized = {
            critical: [],
            high: [],
            medium: [],
            low: []
        };
        
        allRecommendations.forEach(rec => {
            const recLower = rec.toLowerCase();
            if (recLower.includes('critical') || recLower.includes('blocked')) {
                prioritized.critical.push(rec);
            } else if (recLower.includes('memory') || recLower.includes('leak') || recLower.includes('crash')) {
                prioritized.high.push(rec);
            } else if (recLower.includes('performance') || recLower.includes('optimize')) {
                prioritized.medium.push(rec);
            } else {
                prioritized.low.push(rec);
            }
        });
        
        return prioritized;
    }

    generateNextSteps(analysis) {
        const steps = [];
        const readiness = this.assessProductionReadiness(analysis);
        
        switch (readiness.status) {
            case 'READY':
                steps.push('✅ System approved for production deployment');
                steps.push('📊 Implement continuous monitoring dashboard');
                steps.push('🔄 Schedule regular regression testing');
                break;
                
            case 'READY_WITH_MONITORING':
                steps.push('⚠️ Deploy with enhanced monitoring and alerting');
                steps.push('🔍 Implement additional performance monitoring');
                steps.push('📈 Create rollback procedures');
                steps.push('⏱️ Schedule follow-up testing in 1 week');
                break;
                
            case 'CONDITIONAL':
                steps.push('🔧 Address high-priority issues before deployment');
                steps.push('🧪 Re-run failed test suites after fixes');
                steps.push('📋 Implement specific mitigations for identified risks');
                steps.push('👥 Require additional stakeholder approval');
                break;
                
            case 'NOT_READY':
                steps.push('🚫 BLOCK deployment until critical issues resolved');
                steps.push('🔨 Focus development on failed test areas');
                steps.push('📅 Schedule comprehensive re-testing');
                steps.push('👨‍💻 Assign dedicated team to address issues');
                break;
                
            case 'BLOCKED':
                steps.push('🛑 IMMEDIATE BLOCK - Critical system failures');
                steps.push('🚨 Emergency development focus required');
                steps.push('📞 Escalate to senior engineering leadership');
                steps.push('🔄 Complete regression testing required after fixes');
                break;
        }
        
        return steps;
    }

    generateSignOffStatus(analysis) {
        const readiness = this.assessProductionReadiness(analysis);
        
        return {
            qaApproval: readiness.status === 'READY' || readiness.status === 'READY_WITH_MONITORING',
            securityApproval: analysis.scores.errorRecovery >= 70,
            performanceApproval: analysis.scores.performance >= 70 && analysis.scores.load >= 70,
            stabilityApproval: analysis.scores.stability >= 70 && analysis.scores.memory >= 80,
            overallApproval: readiness.status === 'READY' || readiness.status === 'READY_WITH_MONITORING',
            requiredApprovals: this.getRequiredApprovals(readiness.status)
        };
    }

    getRequiredApprovals(status) {
        switch (status) {
            case 'READY':
                return ['QA Lead', 'Tech Lead'];
            case 'READY_WITH_MONITORING':
                return ['QA Lead', 'Tech Lead', 'Platform Team'];
            case 'CONDITIONAL':
                return ['QA Lead', 'Tech Lead', 'Engineering Manager', 'Product Owner'];
            case 'NOT_READY':
            case 'BLOCKED':
                return ['Senior Engineering Leadership', 'Product Leadership'];
            default:
                return ['QA Lead'];
        }
    }

    async generateExecutiveSummary(assessment) {
        const summaryPath = path.join(this.reportDir, 'executive-summary.md');
        
        const summary = `# Production Readiness Assessment - Executive Summary

## Overall Status: ${assessment.productionReadiness.status}
**Confidence Level:** ${assessment.productionReadiness.confidence}  
**Overall Score:** ${assessment.overallScore.toFixed(1)}/100

${assessment.productionReadiness.description}

## Test Results Summary
- **Total Test Suites:** ${assessment.testResults.overall.testSuitesExecuted}
- **Successful:** ${assessment.testResults.overall.successfulSuites}
- **Failed:** ${assessment.testResults.overall.failedSuites}
- **Test Duration:** ${(assessment.testDuration / 60000).toFixed(1)} minutes

## Critical Blockers
${assessment.criticalBlocks.length === 0 
    ? '✅ No critical blockers identified' 
    : assessment.criticalBlocks.map(b => `- **${b.severity}:** ${b.issue}`).join('\n')}

## Key Recommendations
${Object.entries(assessment.recommendations).map(([priority, recs]) => 
    recs.length > 0 ? `### ${priority.toUpperCase()}\n${recs.map(r => `- ${r}`).join('\n')}` : ''
).filter(Boolean).join('\n\n')}

## Next Steps
${assessment.nextSteps.map(step => `- ${step}`).join('\n')}

## Sign-off Requirements
${assessment.signOff.requiredApprovals.map(approval => `- [ ] ${approval}`).join('\n')}

---
*Generated on ${assessment.timestamp}*
*Test Duration: ${(assessment.testDuration / 1000).toFixed(0)} seconds*
`;

        await fs.writeFile(summaryPath, summary);
        console.log(`📄 Executive summary saved to: ${summaryPath}`);
    }

    displayProductionAssessment(assessment) {
        console.log('\n🎯 PRODUCTION READINESS ASSESSMENT');
        console.log('='.repeat(60));
        console.log(`Status: ${assessment.productionReadiness.status}`);
        console.log(`Confidence: ${assessment.productionReadiness.confidence}`);
        console.log(`Overall Score: ${assessment.overallScore.toFixed(1)}/100`);
        console.log(`Description: ${assessment.productionReadiness.description}`);
        
        if (assessment.criticalBlocks.length > 0) {
            console.log('\n❌ CRITICAL BLOCKERS:');
            assessment.criticalBlocks.forEach(blocker => {
                console.log(`  - ${blocker.severity}: ${blocker.issue}`);
            });
        }
        
        console.log('\n📋 NEXT STEPS:');
        assessment.nextSteps.forEach(step => {
            console.log(`  ${step}`);
        });
        
        console.log('\n✅ SIGN-OFF REQUIRED FROM:');
        assessment.signOff.requiredApprovals.forEach(approval => {
            console.log(`  - ${approval}`);
        });
        
        console.log('\n📊 DETAILED REPORTS AVAILABLE IN:');
        console.log(`  ${this.reportDir}`);
        
        console.log('='.repeat(60));
    }
}

// Export for use as module
module.exports = ComprehensiveRegressionRunner;

// Run if called directly
if (require.main === module) {
    (async () => {
        const runner = new ComprehensiveRegressionRunner();
        
        try {
            console.log('🚀 Starting Comprehensive Regression Test Suite...');
            
            const results = await runner.runComprehensiveRegressionTests();
            
            // Exit with appropriate code
            const overallScore = results.overall.overallScore;
            const status = runner.assessProductionReadiness(results.overall).status;
            
            if (status === 'READY' || status === 'READY_WITH_MONITORING') {
                console.log('✅ System PASSED comprehensive regression tests');
                process.exit(0);
            } else if (status === 'CONDITIONAL') {
                console.log('⚠️ System passed with CONDITIONS - see recommendations');
                process.exit(0);
            } else {
                console.log('❌ System FAILED comprehensive regression tests');
                process.exit(1);
            }
            
        } catch (error) {
            console.error('💥 Comprehensive regression testing FAILED:', error.message);
            console.error(error.stack);
            process.exit(1);
        }
    })();
}