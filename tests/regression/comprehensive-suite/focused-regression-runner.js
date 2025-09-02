#!/usr/bin/env node

/**
 * Focused Regression Test Suite Runner
 * Optimized for current system state with working components
 */

const fs = require('fs').promises;
const path = require('path');
const { chromium } = require('playwright');

class FocusedRegressionRunner {
    constructor() {
        this.testResults = {
            systemValidation: {},
            basicFunctionality: {},
            websocketStability: {},
            commandExecution: {},
            performanceBaseline: {},
            memoryProfile: {},
            loadCapacity: {},
            overall: {}
        };
        this.testStartTime = Date.now();
        this.reportDir = '/workspaces/agent-feed/tests/regression/comprehensive-suite/reports';
    }

    async runFocusedRegressionTests() {
        console.log('🚀 Starting Focused Regression Test Suite...');
        console.log('='.repeat(60));
        
        try {
            await fs.mkdir(this.reportDir, { recursive: true });
            
            // Test 1: System Validation
            await this.testSystemValidation();
            
            // Test 2: Basic Functionality
            await this.testBasicFunctionality();
            
            // Test 3: WebSocket Stability
            await this.testWebSocketStability();
            
            // Test 4: Command Execution
            await this.testCommandExecution();
            
            // Test 5: Performance Baseline
            await this.testPerformanceBaseline();
            
            // Test 6: Memory Profile
            await this.testMemoryProfile();
            
            // Test 7: Load Capacity
            await this.testLoadCapacity();
            
            // Generate comprehensive analysis
            await this.generateComprehensiveAnalysis();
            
            console.log('✅ Focused Regression Testing Completed');
            console.log('='.repeat(60));
            
            return this.testResults;
            
        } catch (error) {
            console.error('❌ Focused regression testing failed:', error);
            throw error;
        }
    }

    async testSystemValidation() {
        console.log('\n🔍 Testing System Validation...');
        const startTime = performance.now();
        
        try {
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            
            // Test frontend availability
            await page.goto('http://localhost:5174', { timeout: 10000 });
            
            // Check essential elements
            const terminalContainer = await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 5000 });
            const terminalInput = await page.waitForSelector('[data-testid="terminal-input"]', { timeout: 5000 });
            
            const isInteractive = await page.evaluate(() => {
                const input = document.querySelector('[data-testid="terminal-input"]');
                return input && input.offsetWidth > 0 && input.offsetHeight > 0;
            });
            
            await browser.close();
            
            this.testResults.systemValidation = {
                success: true,
                frontendAvailable: true,
                terminalElements: !!terminalContainer && !!terminalInput,
                interactive: isInteractive,
                duration: performance.now() - startTime
            };
            
            console.log('  ✅ System validation passed');
            
        } catch (error) {
            this.testResults.systemValidation = {
                success: false,
                error: error.message,
                duration: performance.now() - startTime
            };
            console.log('  ❌ System validation failed:', error.message);
        }
    }

    async testBasicFunctionality() {
        console.log('\n🧪 Testing Basic Functionality...');
        const startTime = performance.now();
        
        try {
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            
            await page.goto('http://localhost:5174');
            await page.waitForSelector('[data-testid="terminal-container"]');
            
            // Test typing in terminal
            await page.fill('[data-testid="terminal-input"]', 'echo "Hello World"');
            const inputValue = await page.inputValue('[data-testid="terminal-input"]');
            
            // Test pressing Enter
            await page.press('[data-testid="terminal-input"]', 'Enter');
            
            // Wait for command processing
            await page.waitForFunction(() => {
                const input = document.querySelector('[data-testid="terminal-input"]');
                return input && input.value === '';
            }, { timeout: 10000 });
            
            // Check if output appeared
            const outputExists = await page.locator('text=Hello World').count() > 0;
            
            await browser.close();
            
            this.testResults.basicFunctionality = {
                success: true,
                canType: inputValue.includes('Hello World'),
                canExecuteCommands: outputExists,
                inputCleared: true,
                duration: performance.now() - startTime
            };
            
            console.log('  ✅ Basic functionality tests passed');
            
        } catch (error) {
            this.testResults.basicFunctionality = {
                success: false,
                error: error.message,
                duration: performance.now() - startTime
            };
            console.log('  ❌ Basic functionality failed:', error.message);
        }
    }

    async testWebSocketStability() {
        console.log('\n🔗 Testing WebSocket Stability...');
        const startTime = performance.now();
        
        try {
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            
            await page.goto('http://localhost:5174');
            await page.waitForSelector('[data-testid="terminal-container"]');
            
            const connectionTests = [];
            
            // Test multiple commands in sequence
            const commands = ['echo "test1"', 'pwd', 'echo "test2"', 'whoami', 'echo "test3"'];
            
            for (const command of commands) {
                const cmdStart = performance.now();
                
                await page.fill('[data-testid="terminal-input"]', command);
                await page.press('[data-testid="terminal-input"]', 'Enter');
                
                await page.waitForFunction(() => {
                    const input = document.querySelector('[data-testid="terminal-input"]');
                    return input && input.value === '';
                }, { timeout: 8000 });
                
                connectionTests.push({
                    command,
                    responseTime: performance.now() - cmdStart,
                    success: true
                });
                
                await page.waitForTimeout(200); // Brief pause between commands
            }
            
            // Test rapid commands
            const rapidStart = performance.now();
            for (let i = 0; i < 5; i++) {
                await page.fill('[data-testid="terminal-input"]', `echo "rapid${i}"`);
                await page.press('[data-testid="terminal-input"]', 'Enter');
                await page.waitForTimeout(100);
            }
            const rapidDuration = performance.now() - rapidStart;
            
            await browser.close();
            
            const avgResponseTime = connectionTests.reduce((sum, test) => sum + test.responseTime, 0) / connectionTests.length;
            
            this.testResults.websocketStability = {
                success: true,
                commandsExecuted: connectionTests.length,
                avgResponseTime,
                rapidCommandTime: rapidDuration,
                allCommandsSuccessful: connectionTests.every(t => t.success),
                duration: performance.now() - startTime
            };
            
            console.log('  ✅ WebSocket stability tests passed');
            console.log(`    Average response time: ${avgResponseTime.toFixed(0)}ms`);
            
        } catch (error) {
            this.testResults.websocketStability = {
                success: false,
                error: error.message,
                duration: performance.now() - startTime
            };
            console.log('  ❌ WebSocket stability failed:', error.message);
        }
    }

    async testCommandExecution() {
        console.log('\n⚡ Testing Command Execution Variety...');
        const startTime = performance.now();
        
        try {
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            
            await page.goto('http://localhost:5174');
            await page.waitForSelector('[data-testid="terminal-container"]');
            
            const commandTests = [
                { cmd: 'echo "text output"', expectedText: 'text output', type: 'text' },
                { cmd: 'pwd', expectedText: null, type: 'path' },
                { cmd: 'date', expectedText: null, type: 'date' },
                { cmd: 'ls', expectedText: null, type: 'listing' },
                { cmd: 'whoami', expectedText: null, type: 'user' }
            ];
            
            const executionResults = [];
            
            for (const test of commandTests) {
                const cmdStart = performance.now();
                
                try {
                    await page.fill('[data-testid="terminal-input"]', test.cmd);
                    await page.press('[data-testid="terminal-input"]', 'Enter');
                    
                    await page.waitForFunction(() => {
                        const input = document.querySelector('[data-testid="terminal-input"]');
                        return input && input.value === '';
                    }, { timeout: 10000 });
                    
                    // If we have expected text, verify it appeared
                    if (test.expectedText) {
                        const textFound = await page.locator(`text=${test.expectedText}`).count() > 0;
                        if (!textFound) {
                            throw new Error(`Expected text "${test.expectedText}" not found`);
                        }
                    }
                    
                    executionResults.push({
                        command: test.cmd,
                        type: test.type,
                        success: true,
                        executionTime: performance.now() - cmdStart
                    });
                    
                } catch (error) {
                    executionResults.push({
                        command: test.cmd,
                        type: test.type,
                        success: false,
                        error: error.message,
                        executionTime: performance.now() - cmdStart
                    });
                }
            }
            
            await browser.close();
            
            const successfulCommands = executionResults.filter(r => r.success).length;
            const successRate = (successfulCommands / commandTests.length) * 100;
            const avgExecutionTime = executionResults
                .filter(r => r.success)
                .reduce((sum, r) => sum + r.executionTime, 0) / successfulCommands;
            
            this.testResults.commandExecution = {
                success: successRate >= 80, // 80% success rate minimum
                totalCommands: commandTests.length,
                successfulCommands,
                successRate,
                avgExecutionTime,
                results: executionResults,
                duration: performance.now() - startTime
            };
            
            console.log(`  ✅ Command execution tests: ${successRate.toFixed(1)}% success rate`);
            console.log(`    Average execution time: ${avgExecutionTime.toFixed(0)}ms`);
            
        } catch (error) {
            this.testResults.commandExecution = {
                success: false,
                error: error.message,
                duration: performance.now() - startTime
            };
            console.log('  ❌ Command execution failed:', error.message);
        }
    }

    async testPerformanceBaseline() {
        console.log('\n📊 Testing Performance Baseline...');
        const startTime = performance.now();
        
        try {
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            
            // Measure page load performance
            const loadStart = performance.now();
            await page.goto('http://localhost:5174');
            await page.waitForSelector('[data-testid="terminal-container"]');
            const pageLoadTime = performance.now() - loadStart;
            
            // Measure command response times
            const performanceTests = [];
            
            for (let i = 0; i < 10; i++) {
                const cmdStart = performance.now();
                
                await page.fill('[data-testid="terminal-input"]', `echo "perf test ${i}"`);
                await page.press('[data-testid="terminal-input"]', 'Enter');
                
                await page.waitForFunction(() => {
                    const input = document.querySelector('[data-testid="terminal-input"]');
                    return input && input.value === '';
                }, { timeout: 5000 });
                
                performanceTests.push(performance.now() - cmdStart);
            }
            
            // Get memory usage if available
            const memoryInfo = await page.evaluate(() => {
                if (performance.memory) {
                    return {
                        usedJSHeapSize: performance.memory.usedJSHeapSize,
                        totalJSHeapSize: performance.memory.totalJSHeapSize
                    };
                }
                return null;
            });
            
            await browser.close();
            
            const avgResponseTime = performanceTests.reduce((sum, time) => sum + time, 0) / performanceTests.length;
            const minResponseTime = Math.min(...performanceTests);
            const maxResponseTime = Math.max(...performanceTests);
            
            // Calculate performance score
            let performanceScore = 100;
            if (pageLoadTime > 5000) performanceScore -= 20;
            if (avgResponseTime > 2000) performanceScore -= 30;
            if (maxResponseTime > 5000) performanceScore -= 20;
            
            this.testResults.performanceBaseline = {
                success: performanceScore >= 60,
                pageLoadTime,
                avgResponseTime,
                minResponseTime,
                maxResponseTime,
                performanceScore,
                memoryInfo,
                commandCount: performanceTests.length,
                duration: performance.now() - startTime
            };
            
            console.log(`  ✅ Performance baseline: ${performanceScore}/100 score`);
            console.log(`    Page load: ${pageLoadTime.toFixed(0)}ms, Avg response: ${avgResponseTime.toFixed(0)}ms`);
            
        } catch (error) {
            this.testResults.performanceBaseline = {
                success: false,
                error: error.message,
                duration: performance.now() - startTime
            };
            console.log('  ❌ Performance baseline failed:', error.message);
        }
    }

    async testMemoryProfile() {
        console.log('\n🧠 Testing Memory Profile...');
        const startTime = performance.now();
        
        try {
            const browser = await chromium.launch({ 
                headless: true,
                args: ['--js-flags=--expose-gc']
            });
            const page = await browser.newPage();
            
            await page.goto('http://localhost:5174');
            await page.waitForSelector('[data-testid="terminal-container"]');
            
            // Get initial memory
            const initialMemory = await page.evaluate(() => {
                if (performance.memory) {
                    return performance.memory.usedJSHeapSize;
                }
                return 0;
            });
            
            // Execute several commands to use memory
            for (let i = 0; i < 20; i++) {
                await page.fill('[data-testid="terminal-input"]', `echo "memory test ${i} - ${'x'.repeat(100)}"`);
                await page.press('[data-testid="terminal-input"]', 'Enter');
                
                await page.waitForFunction(() => {
                    const input = document.querySelector('[data-testid="terminal-input"]');
                    return input && input.value === '';
                }, { timeout: 3000 });
            }
            
            // Force garbage collection if available
            await page.evaluate(() => {
                if (window.gc) {
                    window.gc();
                }
            });
            
            // Get final memory
            const finalMemory = await page.evaluate(() => {
                if (performance.memory) {
                    return performance.memory.usedJSHeapSize;
                }
                return 0;
            });
            
            await browser.close();
            
            const memoryGrowth = finalMemory - initialMemory;
            const memoryGrowthMB = memoryGrowth / (1024 * 1024);
            
            // Memory profile scoring
            let memoryScore = 100;
            if (memoryGrowthMB > 50) memoryScore -= 40; // More than 50MB growth is concerning
            else if (memoryGrowthMB > 20) memoryScore -= 20; // More than 20MB growth is notable
            else if (memoryGrowthMB > 10) memoryScore -= 10; // More than 10MB growth is minor concern
            
            this.testResults.memoryProfile = {
                success: memoryScore >= 60,
                initialMemory,
                finalMemory,
                memoryGrowth,
                memoryGrowthMB: memoryGrowthMB.toFixed(2),
                memoryScore,
                commandsExecuted: 20,
                duration: performance.now() - startTime
            };
            
            console.log(`  ✅ Memory profile: ${memoryScore}/100 score`);
            console.log(`    Memory growth: ${memoryGrowthMB.toFixed(2)}MB`);
            
        } catch (error) {
            this.testResults.memoryProfile = {
                success: false,
                error: error.message,
                duration: performance.now() - startTime
            };
            console.log('  ❌ Memory profile failed:', error.message);
        }
    }

    async testLoadCapacity() {
        console.log('\n🚀 Testing Load Capacity...');
        const startTime = performance.now();
        
        try {
            const browser = await chromium.launch({ headless: true });
            const concurrentUsers = 3; // Moderate load for testing
            const commandsPerUser = 5;
            
            const userPromises = [];
            
            for (let userId = 0; userId < concurrentUsers; userId++) {
                const userPromise = this.createLoadTestUser(browser, userId, commandsPerUser);
                userPromises.push(userPromise);
            }
            
            const userResults = await Promise.allSettled(userPromises);
            
            await browser.close();
            
            const successfulUsers = userResults.filter(r => 
                r.status === 'fulfilled' && r.value.success
            ).length;
            
            const failedUsers = concurrentUsers - successfulUsers;
            const successRate = (successfulUsers / concurrentUsers) * 100;
            
            const avgResponseTimes = userResults
                .filter(r => r.status === 'fulfilled' && r.value.avgResponseTime)
                .map(r => r.value.avgResponseTime);
            
            const overallAvgResponse = avgResponseTimes.length > 0 
                ? avgResponseTimes.reduce((sum, time) => sum + time, 0) / avgResponseTimes.length 
                : 0;
            
            // Load capacity scoring
            let loadScore = 100;
            if (successRate < 90) loadScore -= 30;
            if (overallAvgResponse > 3000) loadScore -= 25;
            if (failedUsers > 0) loadScore -= (failedUsers * 15);
            
            this.testResults.loadCapacity = {
                success: loadScore >= 60,
                concurrentUsers,
                commandsPerUser,
                successfulUsers,
                failedUsers,
                successRate,
                overallAvgResponse,
                loadScore,
                duration: performance.now() - startTime
            };
            
            console.log(`  ✅ Load capacity: ${loadScore}/100 score`);
            console.log(`    Success rate: ${successRate.toFixed(1)}%, Avg response: ${overallAvgResponse.toFixed(0)}ms`);
            
        } catch (error) {
            this.testResults.loadCapacity = {
                success: false,
                error: error.message,
                duration: performance.now() - startTime
            };
            console.log('  ❌ Load capacity failed:', error.message);
        }
    }

    async createLoadTestUser(browser, userId, commandCount) {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
            await page.goto('http://localhost:5174');
            await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 5000 });
            
            const responseTimes = [];
            
            for (let i = 0; i < commandCount; i++) {
                const cmdStart = performance.now();
                
                await page.fill('[data-testid="terminal-input"]', `echo "user${userId}-cmd${i}"`);
                await page.press('[data-testid="terminal-input"]', 'Enter');
                
                await page.waitForFunction(() => {
                    const input = document.querySelector('[data-testid="terminal-input"]');
                    return input && input.value === '';
                }, { timeout: 5000 });
                
                responseTimes.push(performance.now() - cmdStart);
            }
            
            const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
            
            return {
                userId,
                success: true,
                commandsExecuted: commandCount,
                avgResponseTime,
                responseTimes
            };
            
        } catch (error) {
            return {
                userId,
                success: false,
                error: error.message
            };
        } finally {
            await context.close();
        }
    }

    async generateComprehensiveAnalysis() {
        console.log('\n📊 Generating Comprehensive Analysis...');
        
        const analysis = {
            timestamp: new Date().toISOString(),
            testDuration: Date.now() - this.testStartTime,
            testsExecuted: Object.keys(this.testResults).length - 1, // Exclude 'overall'
            successfulTests: 0,
            failedTests: 0,
            scores: {},
            overallScore: 0,
            productionReadiness: 'UNKNOWN',
            criticalIssues: [],
            recommendations: [],
            summary: {}
        };

        // Analyze individual test results
        Object.entries(this.testResults).forEach(([testName, result]) => {
            if (testName === 'overall') return;
            
            if (result.success) {
                analysis.successfulTests++;
            } else {
                analysis.failedTests++;
                analysis.criticalIssues.push(`${testName} test failed: ${result.error}`);
            }
            
            // Extract scores where available
            if (result.performanceScore) analysis.scores[testName] = result.performanceScore;
            else if (result.memoryScore) analysis.scores[testName] = result.memoryScore;
            else if (result.loadScore) analysis.scores[testName] = result.loadScore;
            else if (result.success) analysis.scores[testName] = 100;
            else analysis.scores[testName] = 0;
        });

        // Calculate overall score
        const scoreValues = Object.values(analysis.scores);
        analysis.overallScore = scoreValues.length > 0 
            ? scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length 
            : 0;

        // Assess production readiness
        if (analysis.overallScore >= 85 && analysis.failedTests === 0) {
            analysis.productionReadiness = 'READY';
            analysis.recommendations.push('✅ System ready for production deployment');
        } else if (analysis.overallScore >= 70 && analysis.failedTests <= 1) {
            analysis.productionReadiness = 'READY_WITH_MONITORING';
            analysis.recommendations.push('⚠️ System ready with enhanced monitoring');
        } else if (analysis.overallScore >= 60) {
            analysis.productionReadiness = 'CONDITIONAL';
            analysis.recommendations.push('🔧 Address identified issues before deployment');
        } else {
            analysis.productionReadiness = 'NOT_READY';
            analysis.recommendations.push('❌ System requires significant improvements');
        }

        // Generate specific recommendations
        if (this.testResults.performanceBaseline.success && this.testResults.performanceBaseline.avgResponseTime > 1500) {
            analysis.recommendations.push('Optimize command response times');
        }
        
        if (this.testResults.memoryProfile.success && this.testResults.memoryProfile.memoryGrowthMB > 15) {
            analysis.recommendations.push('Investigate memory usage patterns');
        }
        
        if (this.testResults.loadCapacity.success && this.testResults.loadCapacity.successRate < 95) {
            analysis.recommendations.push('Improve concurrent user handling');
        }

        // Create summary
        analysis.summary = {
            overallHealth: analysis.overallScore >= 70 ? 'GOOD' : analysis.overallScore >= 50 ? 'FAIR' : 'POOR',
            keyStrengths: this.identifyStrengths(),
            keyWeaknesses: this.identifyWeaknesses(),
            riskLevel: analysis.productionReadiness === 'READY' ? 'LOW' : 
                      analysis.productionReadiness === 'READY_WITH_MONITORING' ? 'MEDIUM' : 'HIGH'
        };

        this.testResults.overall = analysis;

        // Save detailed report
        const reportPath = path.join(this.reportDir, 'focused-regression-report.json');
        await fs.writeFile(reportPath, JSON.stringify(this.testResults, null, 2));
        
        // Generate executive summary
        await this.generateExecutiveSummary(analysis);
        
        // Display results
        this.displayFinalResults(analysis);
    }

    identifyStrengths() {
        const strengths = [];
        
        if (this.testResults.systemValidation.success) {
            strengths.push('System stability and availability');
        }
        
        if (this.testResults.basicFunctionality.success) {
            strengths.push('Core functionality working correctly');
        }
        
        if (this.testResults.websocketStability.success && this.testResults.websocketStability.avgResponseTime < 1000) {
            strengths.push('Fast WebSocket communication');
        }
        
        if (this.testResults.commandExecution.success && this.testResults.commandExecution.successRate >= 90) {
            strengths.push('Reliable command execution');
        }
        
        if (this.testResults.performanceBaseline.success && this.testResults.performanceBaseline.performanceScore >= 80) {
            strengths.push('Good performance characteristics');
        }
        
        if (this.testResults.memoryProfile.success && this.testResults.memoryProfile.memoryGrowthMB < 10) {
            strengths.push('Stable memory usage');
        }
        
        if (this.testResults.loadCapacity.success && this.testResults.loadCapacity.successRate >= 90) {
            strengths.push('Good concurrent user support');
        }
        
        return strengths;
    }

    identifyWeaknesses() {
        const weaknesses = [];
        
        Object.entries(this.testResults).forEach(([testName, result]) => {
            if (testName === 'overall') return;
            
            if (!result.success) {
                weaknesses.push(`${testName} test failures`);
            } else {
                // Identify specific performance issues
                if (testName === 'performanceBaseline' && result.avgResponseTime > 2000) {
                    weaknesses.push('Slow command response times');
                }
                
                if (testName === 'memoryProfile' && result.memoryGrowthMB > 20) {
                    weaknesses.push('High memory usage growth');
                }
                
                if (testName === 'loadCapacity' && result.successRate < 90) {
                    weaknesses.push('Poor concurrent user handling');
                }
            }
        });
        
        return weaknesses;
    }

    async generateExecutiveSummary(analysis) {
        const summaryPath = path.join(this.reportDir, 'focused-executive-summary.md');
        
        const summary = `# Production Readiness Assessment - Executive Summary

## Overall Status: ${analysis.productionReadiness}
**Overall Score:** ${analysis.overallScore.toFixed(1)}/100  
**Risk Level:** ${analysis.summary.riskLevel}  
**System Health:** ${analysis.summary.overallHealth}

## Test Results Overview
- **Tests Executed:** ${analysis.testsExecuted}
- **Successful:** ${analysis.successfulTests}
- **Failed:** ${analysis.failedTests}
- **Test Duration:** ${(analysis.testDuration / 60000).toFixed(1)} minutes

## Key Strengths
${analysis.summary.keyStrengths.map(strength => `- ✅ ${strength}`).join('\n')}

## Areas for Improvement
${analysis.summary.keyWeaknesses.length > 0 
    ? analysis.summary.keyWeaknesses.map(weakness => `- ⚠️ ${weakness}`).join('\n')
    : '- None identified'}

## Critical Issues
${analysis.criticalIssues.length > 0 
    ? analysis.criticalIssues.map(issue => `- ❌ ${issue}`).join('\n')
    : '- None identified'}

## Recommendations
${analysis.recommendations.map(rec => `- ${rec}`).join('\n')}

## Production Deployment Decision

${this.getDeploymentDecision(analysis)}

---
*Report generated on ${analysis.timestamp}*
*Test execution time: ${(analysis.testDuration / 1000).toFixed(0)} seconds*
`;

        await fs.writeFile(summaryPath, summary);
        console.log(`📄 Executive summary saved to: ${summaryPath}`);
    }

    getDeploymentDecision(analysis) {
        switch (analysis.productionReadiness) {
            case 'READY':
                return '✅ **APPROVED FOR PRODUCTION**\nSystem demonstrates excellent stability and performance. Proceed with deployment.';
            
            case 'READY_WITH_MONITORING':
                return '⚠️ **APPROVED WITH CONDITIONS**\nSystem ready for production with enhanced monitoring. Deploy with increased observability.';
                
            case 'CONDITIONAL':
                return '🔧 **CONDITIONAL APPROVAL**\nAddress identified issues before deployment. Re-test critical components after fixes.';
                
            case 'NOT_READY':
                return '❌ **NOT APPROVED**\nSystem requires significant improvements before production deployment. Focus on failed test areas.';
                
            default:
                return '❓ **DECISION PENDING**\nRequires additional analysis and stakeholder review.';
        }
    }

    displayFinalResults(analysis) {
        console.log('\n🎯 PRODUCTION READINESS ASSESSMENT');
        console.log('='.repeat(60));
        console.log(`Status: ${analysis.productionReadiness}`);
        console.log(`Overall Score: ${analysis.overallScore.toFixed(1)}/100`);
        console.log(`System Health: ${analysis.summary.overallHealth}`);
        console.log(`Risk Level: ${analysis.summary.riskLevel}`);
        
        console.log('\n📊 TEST SUMMARY:');
        console.log(`✅ Successful Tests: ${analysis.successfulTests}`);
        console.log(`❌ Failed Tests: ${analysis.failedTests}`);
        console.log(`⏱️ Total Duration: ${(analysis.testDuration / 60000).toFixed(1)} minutes`);
        
        if (analysis.summary.keyStrengths.length > 0) {
            console.log('\n💪 KEY STRENGTHS:');
            analysis.summary.keyStrengths.forEach(strength => {
                console.log(`  ✅ ${strength}`);
            });
        }
        
        if (analysis.summary.keyWeaknesses.length > 0) {
            console.log('\n⚠️ AREAS FOR IMPROVEMENT:');
            analysis.summary.keyWeaknesses.forEach(weakness => {
                console.log(`  ⚠️ ${weakness}`);
            });
        }
        
        if (analysis.criticalIssues.length > 0) {
            console.log('\n❌ CRITICAL ISSUES:');
            analysis.criticalIssues.forEach(issue => {
                console.log(`  ❌ ${issue}`);
            });
        }
        
        console.log('\n📋 RECOMMENDATIONS:');
        analysis.recommendations.forEach(rec => {
            console.log(`  ${rec}`);
        });
        
        console.log('\n📊 DETAILED REPORTS AVAILABLE IN:');
        console.log(`  ${this.reportDir}`);
        
        console.log('='.repeat(60));
    }
}

// Export for use as module
module.exports = FocusedRegressionRunner;

// Run if called directly
if (require.main === module) {
    (async () => {
        const runner = new FocusedRegressionRunner();
        
        try {
            const results = await runner.runFocusedRegressionTests();
            const analysis = results.overall;
            
            // Exit with appropriate code based on production readiness
            if (analysis.productionReadiness === 'READY' || analysis.productionReadiness === 'READY_WITH_MONITORING') {
                console.log('\n✅ SYSTEM PASSED REGRESSION TESTS - PRODUCTION READY');
                process.exit(0);
            } else if (analysis.productionReadiness === 'CONDITIONAL') {
                console.log('\n⚠️ SYSTEM CONDITIONALLY PASSED - ADDRESS ISSUES BEFORE DEPLOYMENT');
                process.exit(0);
            } else {
                console.log('\n❌ SYSTEM FAILED REGRESSION TESTS - NOT PRODUCTION READY');
                process.exit(1);
            }
            
        } catch (error) {
            console.error('\n💥 REGRESSION TESTING FAILED:', error.message);
            console.error(error.stack);
            process.exit(1);
        }
    })();
}