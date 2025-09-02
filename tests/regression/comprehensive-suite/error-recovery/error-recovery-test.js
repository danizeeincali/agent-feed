/**
 * Comprehensive Error Recovery Testing Suite
 * Tests system resilience and recovery from various failure scenarios
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class ErrorRecoveryTest {
    constructor() {
        this.recoveryResults = {
            websocketFailures: {},
            backendCrashes: {},
            networkInterruptions: {},
            frontendCorruption: {},
            permissionDialogs: {},
            summary: {}
        };
        this.testStartTime = Date.now();
        this.backendProcess = null;
    }

    async runErrorRecoveryTests() {
        console.log('🛡️ Starting Error Recovery Tests...');
        
        const browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-web-security']
        });

        try {
            // Test 1: WebSocket Disconnection Recovery
            await this.testWebSocketDisconnection(browser);
            
            // Test 2: Backend Process Crash Recovery
            await this.testBackendCrashRecovery(browser);
            
            // Test 3: Network Interruption Recovery
            await this.testNetworkInterruption(browser);
            
            // Test 4: Frontend State Corruption
            await this.testFrontendStateCorruption(browser);
            
            // Test 5: Permission Dialog Edge Cases
            await this.testPermissionDialogEdgeCases(browser);
            
            await this.generateRecoveryReport();
            
        } finally {
            await browser.close();
            if (this.backendProcess) {
                this.backendProcess.kill();
            }
        }

        return this.recoveryResults;
    }

    async testWebSocketDisconnection(browser) {
        console.log('  🔌 Testing WebSocket disconnection recovery...');
        
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            await page.goto('http://localhost:5174');
            await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });
            
            // Establish baseline connection
            await page.fill('[data-testid="terminal-input"]', 'echo "initial test"');
            await page.press('[data-testid="terminal-input"]', 'Enter');
            await page.waitForSelector('text=initial test', { timeout: 5000 });
            
            const disconnectionScenarios = [
                'manual-close',
                'server-shutdown',
                'network-drop',
                'rapid-reconnect'
            ];

            const scenarioResults = {};

            for (const scenario of disconnectionScenarios) {
                console.log(`    Testing ${scenario} scenario...`);
                const result = await this.testDisconnectionScenario(page, scenario);
                scenarioResults[scenario] = result;
                
                // Wait between scenarios
                await page.waitForTimeout(1000);
            }

            this.recoveryResults.websocketFailures = {
                scenarios: scenarioResults,
                overallSuccess: Object.values(scenarioResults).every(r => r.recoverySuccessful),
                avgRecoveryTime: Object.values(scenarioResults)
                    .reduce((sum, r) => sum + (r.recoveryTime || 0), 0) / disconnectionScenarios.length
            };

        } finally {
            await context.close();
        }
    }

    async testDisconnectionScenario(page, scenario) {
        const startTime = performance.now();
        let recoverySuccessful = false;
        let recoveryTime = null;

        try {
            // Trigger disconnection based on scenario
            switch (scenario) {
                case 'manual-close':
                    await page.evaluate(() => {
                        if (window.wsConnection) {
                            window.wsConnection.close();
                        }
                    });
                    break;
                    
                case 'server-shutdown':
                    // Simulate server-side close
                    await page.evaluate(() => {
                        if (window.wsConnection) {
                            window.wsConnection.close(1006, 'Server shutdown simulation');
                        }
                    });
                    break;
                    
                case 'network-drop':
                    // Simulate network failure
                    await page.setOfflineMode(true);
                    await page.waitForTimeout(500);
                    await page.setOfflineMode(false);
                    break;
                    
                case 'rapid-reconnect':
                    // Multiple rapid disconnections
                    for (let i = 0; i < 3; i++) {
                        await page.evaluate(() => {
                            if (window.wsConnection) {
                                window.wsConnection.close();
                            }
                        });
                        await page.waitForTimeout(100);
                    }
                    break;
            }

            // Wait for reconnection and test functionality
            await page.waitForTimeout(2000);
            
            // Try to execute a command to verify recovery
            const recoveryStartTime = performance.now();
            
            await page.fill('[data-testid="terminal-input"]', `echo "recovery test ${scenario}"`);
            await page.press('[data-testid="terminal-input"]', 'Enter');
            
            // Wait for command response
            try {
                await page.waitForSelector(`text=recovery test ${scenario}`, { timeout: 5000 });
                recoveryTime = performance.now() - recoveryStartTime;
                recoverySuccessful = true;
            } catch (error) {
                console.log(`    Recovery failed for ${scenario}: ${error.message}`);
            }

        } catch (error) {
            console.log(`    Error in ${scenario} test: ${error.message}`);
        }

        return {
            scenario,
            recoverySuccessful,
            recoveryTime,
            totalTime: performance.now() - startTime
        };
    }

    async testBackendCrashRecovery(browser) {
        console.log('  💥 Testing backend crash recovery...');
        
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            await page.goto('http://localhost:5174');
            await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });
            
            // Test command execution before crash
            await page.fill('[data-testid="terminal-input"]', 'echo "pre-crash test"');
            await page.press('[data-testid="terminal-input"]', 'Enter');
            await page.waitForSelector('text=pre-crash test', { timeout: 5000 });

            const crashScenarios = [
                'graceful-restart',
                'ungraceful-termination',
                'port-conflict'
            ];

            const crashResults = {};

            for (const scenario of crashScenarios) {
                console.log(`    Testing ${scenario}...`);
                const result = await this.testBackendCrashScenario(page, scenario);
                crashResults[scenario] = result;
            }

            this.recoveryResults.backendCrashes = {
                scenarios: crashResults,
                overallSuccess: Object.values(crashResults).some(r => r.recoveryAttempted),
                gracefulDegradation: Object.values(crashResults).every(r => r.userNotified)
            };

        } finally {
            await context.close();
        }
    }

    async testBackendCrashScenario(page, scenario) {
        const startTime = performance.now();
        let recoveryAttempted = false;
        let userNotified = false;

        try {
            // Monitor for error messages or notifications
            const errorPromise = page.waitForSelector('[data-testid="connection-error"]', { 
                timeout: 10000 
            }).catch(() => null);

            // Simulate different crash scenarios
            switch (scenario) {
                case 'graceful-restart':
                    // Kill backend process gracefully
                    try {
                        await execAsync('pkill -f simple-backend.js');
                        await this.waitForTimeout(2000);
                        // Restart backend
                        await this.startBackend();
                    } catch (error) {
                        console.log(`    Backend restart failed: ${error.message}`);
                    }
                    break;

                case 'ungraceful-termination':
                    // Force kill backend
                    try {
                        await execAsync('pkill -9 -f simple-backend.js');
                        await this.waitForTimeout(1000);
                    } catch (error) {
                        console.log(`    Backend force kill failed: ${error.message}`);
                    }
                    break;

                case 'port-conflict':
                    // This is harder to simulate, so we'll just test the timeout scenario
                    await page.setOfflineMode(true);
                    await this.waitForTimeout(5000);
                    await page.setOfflineMode(false);
                    break;
            }

            // Check if user was notified of the issue
            const errorElement = await errorPromise;
            if (errorElement) {
                userNotified = true;
                console.log(`    User notified of connection issue in ${scenario}`);
            }

            // Try to recover by attempting a command
            try {
                await page.fill('[data-testid="terminal-input"]', `echo "recovery test ${scenario}"`);
                await page.press('[data-testid="terminal-input"]', 'Enter');
                
                // Look for either success or proper error handling
                const successPromise = page.waitForSelector(`text=recovery test ${scenario}`, { timeout: 5000 });
                const retryPromise = page.waitForSelector('[data-testid="retry-connection"]', { timeout: 5000 });
                
                const result = await Promise.race([
                    successPromise.then(() => 'success'),
                    retryPromise.then(() => 'retry-offered'),
                    new Promise(resolve => setTimeout(() => resolve('timeout'), 5000))
                ]);

                if (result === 'success' || result === 'retry-offered') {
                    recoveryAttempted = true;
                }

            } catch (error) {
                console.log(`    Recovery attempt failed for ${scenario}: ${error.message}`);
            }

        } catch (error) {
            console.log(`    Error in backend crash test ${scenario}: ${error.message}`);
        }

        return {
            scenario,
            recoveryAttempted,
            userNotified,
            totalTime: performance.now() - startTime
        };
    }

    async testNetworkInterruption(browser) {
        console.log('  🌐 Testing network interruption recovery...');
        
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            await page.goto('http://localhost:5174');
            await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });
            
            const networkScenarios = [
                { name: 'short-outage', duration: 1000 },
                { name: 'medium-outage', duration: 5000 },
                { name: 'long-outage', duration: 10000 },
                { name: 'intermittent', cycles: 5, cycleDuration: 500 }
            ];

            const networkResults = {};

            for (const scenario of networkScenarios) {
                console.log(`    Testing ${scenario.name}...`);
                const result = await this.testNetworkScenario(page, scenario);
                networkResults[scenario.name] = result;
                
                // Recovery time between scenarios
                await page.waitForTimeout(2000);
            }

            this.recoveryResults.networkInterruptions = {
                scenarios: networkResults,
                overallResilience: Object.values(networkResults).filter(r => r.recoveredSuccessfully).length / networkScenarios.length,
                maxToleratedOutage: Math.max(...Object.values(networkResults)
                    .filter(r => r.recoveredSuccessfully)
                    .map(r => r.outageDuration || 0))
            };

        } finally {
            await context.close();
        }
    }

    async testNetworkScenario(page, scenario) {
        const startTime = performance.now();
        let recoveredSuccessfully = false;
        let outageDuration = 0;

        try {
            // Execute command before outage
            await page.fill('[data-testid="terminal-input"]', 'echo "before outage"');
            await page.press('[data-testid="terminal-input"]', 'Enter');
            await page.waitForTimeout(500);

            // Simulate network outage
            if (scenario.cycles) {
                // Intermittent connectivity
                for (let i = 0; i < scenario.cycles; i++) {
                    await page.setOfflineMode(true);
                    await page.waitForTimeout(scenario.cycleDuration);
                    await page.setOfflineMode(false);
                    await page.waitForTimeout(scenario.cycleDuration);
                }
                outageDuration = scenario.cycles * scenario.cycleDuration;
            } else {
                // Sustained outage
                await page.setOfflineMode(true);
                await page.waitForTimeout(scenario.duration);
                await page.setOfflineMode(false);
                outageDuration = scenario.duration;
            }

            // Test recovery
            const recoveryStartTime = performance.now();
            
            // Try to execute command after network recovery
            await page.fill('[data-testid="terminal-input"]', `echo "after ${scenario.name}"`);
            await page.press('[data-testid="terminal-input"]', 'Enter');
            
            try {
                await page.waitForSelector(`text=after ${scenario.name}`, { timeout: 10000 });
                recoveredSuccessfully = true;
                console.log(`    ✅ Recovered from ${scenario.name} in ${performance.now() - recoveryStartTime}ms`);
            } catch (error) {
                console.log(`    ❌ Failed to recover from ${scenario.name}`);
            }

        } catch (error) {
            console.log(`    Error in network scenario ${scenario.name}: ${error.message}`);
        }

        return {
            scenario: scenario.name,
            outageDuration,
            recoveredSuccessfully,
            totalTime: performance.now() - startTime
        };
    }

    async testFrontendStateCorruption(browser) {
        console.log('  🔧 Testing frontend state corruption recovery...');
        
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            await page.goto('http://localhost:5174');
            await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });
            
            const corruptionScenarios = [
                'localStorage-corruption',
                'state-object-mutation',
                'component-unmounting-error',
                'memory-overflow'
            ];

            const corruptionResults = {};

            for (const scenario of corruptionScenarios) {
                console.log(`    Testing ${scenario}...`);
                const result = await this.testCorruptionScenario(page, scenario);
                corruptionResults[scenario] = result;
            }

            this.recoveryResults.frontendCorruption = {
                scenarios: corruptionResults,
                gracefulDegradation: Object.values(corruptionResults).every(r => r.gracefulHandling),
                stateRecovery: Object.values(corruptionResults).filter(r => r.stateRecovered).length / corruptionScenarios.length
            };

        } finally {
            await context.close();
        }
    }

    async testCorruptionScenario(page, scenario) {
        const startTime = performance.now();
        let gracefulHandling = false;
        let stateRecovered = false;

        try {
            // Establish baseline state
            await page.fill('[data-testid="terminal-input"]', 'echo "baseline"');
            await page.press('[data-testid="terminal-input"]', 'Enter');
            await page.waitForTimeout(500);

            // Corrupt frontend state based on scenario
            switch (scenario) {
                case 'localStorage-corruption':
                    await page.evaluate(() => {
                        try {
                            localStorage.setItem('terminal-state', 'corrupted-data-}{invalid-json');
                            window.location.reload();
                        } catch (error) {
                            console.log('localStorage corruption test completed');
                        }
                    });
                    await page.waitForTimeout(2000);
                    break;

                case 'state-object-mutation':
                    await page.evaluate(() => {
                        try {
                            // Corrupt React state if accessible
                            if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
                                const internals = window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
                                if (internals.ReactCurrentOwner) {
                                    internals.ReactCurrentOwner.current = null;
                                }
                            }
                        } catch (error) {
                            console.log('State mutation test completed');
                        }
                    });
                    break;

                case 'component-unmounting-error':
                    await page.evaluate(() => {
                        try {
                            // Simulate component unmounting error
                            const event = new Event('beforeunload');
                            window.dispatchEvent(event);
                        } catch (error) {
                            console.log('Component unmounting test completed');
                        }
                    });
                    break;

                case 'memory-overflow':
                    await page.evaluate(() => {
                        try {
                            // Create memory pressure
                            const largeArray = new Array(1000000).fill('memory-test');
                            window.memoryTest = largeArray;
                        } catch (error) {
                            console.log('Memory overflow test completed');
                        }
                    });
                    break;
            }

            // Check if application handles corruption gracefully
            try {
                // Try to interact with the application
                await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 5000 });
                gracefulHandling = true;
                
                // Try to execute a command
                await page.fill('[data-testid="terminal-input"]', `echo "recovery test ${scenario}"`);
                await page.press('[data-testid="terminal-input"]', 'Enter');
                
                await page.waitForSelector(`text=recovery test ${scenario}`, { timeout: 5000 });
                stateRecovered = true;
                
            } catch (error) {
                console.log(`    Corruption handling failed for ${scenario}: ${error.message}`);
                
                // Check if there's an error boundary or graceful fallback
                const errorBoundary = await page.$('[data-testid="error-boundary"]');
                const fallbackUI = await page.$('[data-testid="fallback-ui"]');
                
                if (errorBoundary || fallbackUI) {
                    gracefulHandling = true;
                    console.log(`    ✅ Graceful error handling detected for ${scenario}`);
                }
            }

        } catch (error) {
            console.log(`    Error in corruption scenario ${scenario}: ${error.message}`);
        }

        return {
            scenario,
            gracefulHandling,
            stateRecovered,
            totalTime: performance.now() - startTime
        };
    }

    async testPermissionDialogEdgeCases(browser) {
        console.log('  🔐 Testing permission dialog edge cases...');
        
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            await page.goto('http://localhost:5174');
            await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });
            
            const permissionScenarios = [
                'rapid-dialog-triggers',
                'dialog-dismissal',
                'permission-revocation',
                'multiple-simultaneous-dialogs'
            ];

            const permissionResults = {};

            for (const scenario of permissionScenarios) {
                console.log(`    Testing ${scenario}...`);
                const result = await this.testPermissionScenario(page, scenario);
                permissionResults[scenario] = result;
            }

            this.recoveryResults.permissionDialogs = {
                scenarios: permissionResults,
                dialogHandling: Object.values(permissionResults).every(r => r.dialogHandled),
                userExperience: Object.values(permissionResults).filter(r => r.smoothExperience).length / permissionScenarios.length
            };

        } finally {
            await context.close();
        }
    }

    async testPermissionScenario(page, scenario) {
        const startTime = performance.now();
        let dialogHandled = false;
        let smoothExperience = false;

        try {
            switch (scenario) {
                case 'rapid-dialog-triggers':
                    // Trigger multiple permission requests rapidly
                    for (let i = 0; i < 5; i++) {
                        await page.fill('[data-testid="terminal-input"]', 'sudo echo "permission test"');
                        await page.press('[data-testid="terminal-input"]', 'Enter');
                        await page.waitForTimeout(100);
                    }
                    
                    // Check if dialogs are handled properly
                    const dialogCount = await page.evaluate(() => {
                        return document.querySelectorAll('[data-testid="permission-dialog"]').length;
                    });
                    
                    dialogHandled = dialogCount <= 1; // Should not stack dialogs
                    smoothExperience = dialogHandled;
                    break;

                case 'dialog-dismissal':
                    await page.fill('[data-testid="terminal-input"]', 'sudo echo "test"');
                    await page.press('[data-testid="terminal-input"]', 'Enter');
                    
                    // Wait for dialog and dismiss it
                    try {
                        await page.waitForSelector('[data-testid="permission-dialog"]', { timeout: 2000 });
                        await page.click('[data-testid="dialog-cancel"]');
                        
                        // Check if command is properly cancelled
                        const cancelledMessage = await page.waitForSelector('text=Command cancelled', { timeout: 2000 });
                        dialogHandled = !!cancelledMessage;
                        smoothExperience = dialogHandled;
                    } catch (error) {
                        console.log(`    Dialog dismissal test: ${error.message}`);
                    }
                    break;

                case 'permission-revocation':
                    // This would typically involve browser permission API
                    // For now, we'll test the application's handling of permission denial
                    await page.fill('[data-testid="terminal-input"]', 'sudo echo "revocation test"');
                    await page.press('[data-testid="terminal-input"]', 'Enter');
                    
                    try {
                        await page.waitForSelector('[data-testid="permission-dialog"]', { timeout: 2000 });
                        await page.click('[data-testid="dialog-deny"]');
                        
                        // Application should handle denial gracefully
                        const deniedMessage = await page.waitForSelector('text=Permission denied', { timeout: 2000 });
                        dialogHandled = !!deniedMessage;
                        smoothExperience = dialogHandled;
                    } catch (error) {
                        console.log(`    Permission revocation test: ${error.message}`);
                    }
                    break;

                case 'multiple-simultaneous-dialogs':
                    // Try to trigger multiple permission dialogs
                    const commands = [
                        'sudo echo "test1"',
                        'sudo rm /tmp/test',
                        'sudo mkdir /tmp/test'
                    ];
                    
                    // Execute all commands rapidly
                    for (const command of commands) {
                        await page.fill('[data-testid="terminal-input"]', command);
                        await page.press('[data-testid="terminal-input"]', 'Enter');
                        await page.waitForTimeout(50);
                    }
                    
                    // Check dialog management
                    await page.waitForTimeout(1000);
                    const activeDialogs = await page.evaluate(() => {
                        return document.querySelectorAll('[data-testid="permission-dialog"]:not([style*="display: none"])').length;
                    });
                    
                    dialogHandled = activeDialogs <= 1; // Should queue or batch dialogs
                    smoothExperience = dialogHandled;
                    break;
            }

        } catch (error) {
            console.log(`    Error in permission scenario ${scenario}: ${error.message}`);
        }

        return {
            scenario,
            dialogHandled,
            smoothExperience,
            totalTime: performance.now() - startTime
        };
    }

    async startBackend() {
        // Helper method to restart backend process
        try {
            const { spawn } = require('child_process');
            this.backendProcess = spawn('node', ['simple-backend.js'], {
                cwd: '/workspaces/agent-feed',
                detached: true,
                stdio: 'ignore'
            });
            
            // Give backend time to start
            await this.waitForTimeout(3000);
        } catch (error) {
            console.log('Failed to restart backend:', error.message);
        }
    }

    async waitForTimeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async generateRecoveryReport() {
        const reportPath = '/workspaces/agent-feed/tests/regression/comprehensive-suite/reports/error-recovery-report.json';
        
        // Calculate overall recovery score
        const categories = [
            'websocketFailures',
            'backendCrashes', 
            'networkInterruptions',
            'frontendCorruption',
            'permissionDialogs'
        ];

        let totalScore = 0;
        let categoryCount = 0;

        const detailedScores = {};

        categories.forEach(category => {
            const categoryData = this.recoveryResults[category];
            if (categoryData && typeof categoryData === 'object') {
                let categoryScore = 0;
                
                if (category === 'websocketFailures') {
                    categoryScore = categoryData.overallSuccess ? 100 : 50;
                } else if (category === 'backendCrashes') {
                    categoryScore = (categoryData.overallSuccess ? 50 : 0) + 
                                   (categoryData.gracefulDegradation ? 50 : 0);
                } else if (category === 'networkInterruptions') {
                    categoryScore = categoryData.overallResilience * 100;
                } else if (category === 'frontendCorruption') {
                    categoryScore = (categoryData.gracefulDegradation ? 50 : 0) + 
                                   (categoryData.stateRecovery * 50);
                } else if (category === 'permissionDialogs') {
                    categoryScore = (categoryData.dialogHandling ? 50 : 0) + 
                                   (categoryData.userExperience * 50);
                }
                
                detailedScores[category] = categoryScore;
                totalScore += categoryScore;
                categoryCount++;
            }
        });

        const overallScore = categoryCount > 0 ? totalScore / categoryCount : 0;

        this.recoveryResults.summary = {
            overallRecoveryScore: overallScore,
            categoryScores: detailedScores,
            recommendations: this.generateRecoveryRecommendations(detailedScores),
            productionReadiness: overallScore >= 80 ? 'ready' : overallScore >= 60 ? 'needs-improvement' : 'not-ready'
        };

        const report = {
            testInfo: {
                timestamp: new Date().toISOString(),
                duration: Date.now() - this.testStartTime
            },
            results: this.recoveryResults
        };

        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n🛡️ Error recovery report saved to: ${reportPath}`);
    }

    generateRecoveryRecommendations(scores) {
        const recommendations = [];
        
        if (scores.websocketFailures < 80) {
            recommendations.push('Improve WebSocket reconnection logic and error handling');
        }
        
        if (scores.backendCrashes < 60) {
            recommendations.push('Implement better backend crash detection and user notification');
        }
        
        if (scores.networkInterruptions < 70) {
            recommendations.push('Add offline mode support and better network failure handling');
        }
        
        if (scores.frontendCorruption < 70) {
            recommendations.push('Implement error boundaries and state recovery mechanisms');
        }
        
        if (scores.permissionDialogs < 80) {
            recommendations.push('Improve permission dialog management and user experience');
        }
        
        const overallScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;
        
        if (overallScore < 60) {
            recommendations.push('CRITICAL: Overall system resilience is below production standards');
        } else if (overallScore < 80) {
            recommendations.push('System resilience needs improvement before production deployment');
        }
        
        return recommendations;
    }
}

module.exports = ErrorRecoveryTest;

// Run if called directly
if (require.main === module) {
    (async () => {
        const recoveryTest = new ErrorRecoveryTest();
        try {
            const results = await recoveryTest.runErrorRecoveryTests();
            console.log('✅ Error recovery tests completed');
            
            const score = results.summary.overallRecoveryScore;
            console.log(`📊 Overall Recovery Score: ${score.toFixed(1)}/100`);
            
            if (score < 60) {
                console.log('❌ System not ready for production - critical resilience issues');
                process.exit(1);
            } else if (score < 80) {
                console.log('⚠️ System needs improvement - resilience issues detected');
                console.log('📋 Recommendations:', results.summary.recommendations);
            } else {
                console.log('✅ System demonstrates good error recovery capabilities');
            }
        } catch (error) {
            console.error('❌ Error recovery tests failed:', error);
            process.exit(1);
        }
    })();
}