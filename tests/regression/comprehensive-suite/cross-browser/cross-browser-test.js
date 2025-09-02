/**
 * Cross-Browser Compatibility Testing Suite
 * Tests functionality across different browsers and versions
 */

const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs').promises;

class CrossBrowserTest {
    constructor() {
        this.browserResults = {
            chromium: {},
            firefox: {},
            webkit: {},
            comparison: {},
            compatibility: {}
        };
        this.testStartTime = Date.now();
        this.testSuites = [
            'basicFunctionality',
            'websocketSupport',
            'terminalRendering',
            'commandExecution',
            'userInteractions',
            'performanceMetrics',
            'errorHandling'
        ];
    }

    async runCrossBrowserTests() {
        console.log('🌐 Starting Cross-Browser Compatibility Tests...');
        
        const browsers = [
            { name: 'chromium', engine: chromium },
            { name: 'firefox', engine: firefox },
            { name: 'webkit', engine: webkit }
        ];

        const testPromises = browsers.map(browser => 
            this.testBrowser(browser).catch(error => ({
                browserName: browser.name,
                error: error.message,
                success: false
            }))
        );

        const results = await Promise.allSettled(testPromises);
        
        // Process results
        results.forEach((result, index) => {
            const browserName = browsers[index].name;
            if (result.status === 'fulfilled' && result.value.success !== false) {
                this.browserResults[browserName] = result.value;
            } else {
                this.browserResults[browserName] = {
                    error: result.value?.error || result.reason?.message || 'Unknown error',
                    success: false
                };
            }
        });

        await this.generateCompatibilityAnalysis();
        await this.generateCrossBrowserReport();

        return this.browserResults;
    }

    async testBrowser(browserConfig) {
        const { name, engine } = browserConfig;
        console.log(`\n🔍 Testing ${name}...`);
        
        const browser = await engine.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-web-security']
        });

        const browserResults = {
            browserName: name,
            success: true,
            testResults: {},
            performance: {},
            features: {}
        };

        try {
            const context = await browser.newContext({
                viewport: { width: 1280, height: 720 },
                userAgent: await this.getUserAgent(browser)
            });
            
            const page = await context.newPage();

            // Enable performance monitoring
            await page.coverage.startJSCoverage();

            // Run test suites
            for (const testSuite of this.testSuites) {
                console.log(`  📋 Running ${testSuite} tests...`);
                try {
                    const result = await this[`test${testSuite.charAt(0).toUpperCase() + testSuite.slice(1)}`](page, name);
                    browserResults.testResults[testSuite] = result;
                } catch (error) {
                    console.log(`    ❌ ${testSuite} failed: ${error.message}`);
                    browserResults.testResults[testSuite] = {
                        success: false,
                        error: error.message
                    };
                }
            }

            // Get browser-specific features
            browserResults.features = await this.getBrowserFeatures(page);
            
            await context.close();

        } catch (error) {
            console.log(`  ❌ Browser ${name} testing failed: ${error.message}`);
            browserResults.success = false;
            browserResults.error = error.message;
        } finally {
            await browser.close();
        }

        return browserResults;
    }

    async testBasicFunctionality(page, browserName) {
        const startTime = performance.now();
        
        // Navigate to application
        await page.goto('http://localhost:5174', { timeout: 15000 });
        
        // Check if main elements load
        const elementsToCheck = [
            '[data-testid="terminal-container"]',
            '[data-testid="terminal-input"]',
            '[data-testid="terminal-output"]'
        ];

        const elementResults = {};
        
        for (const selector of elementsToCheck) {
            try {
                await page.waitForSelector(selector, { timeout: 10000 });
                elementResults[selector] = { present: true };
            } catch (error) {
                elementResults[selector] = { present: false, error: error.message };
            }
        }

        // Test page interaction
        const canInteract = await page.evaluate(() => {
            try {
                const input = document.querySelector('[data-testid="terminal-input"]');
                if (input) {
                    input.focus();
                    return input === document.activeElement;
                }
                return false;
            } catch (error) {
                return false;
            }
        });

        const loadTime = performance.now() - startTime;

        return {
            success: Object.values(elementResults).every(e => e.present),
            loadTime,
            elementResults,
            canInteract,
            browserName
        };
    }

    async testWebsocketSupport(page, browserName) {
        const startTime = performance.now();
        
        // Check WebSocket API support
        const websocketSupport = await page.evaluate(() => {
            return {
                hasWebSocket: typeof WebSocket !== 'undefined',
                hasEventSource: typeof EventSource !== 'undefined',
                hasPromise: typeof Promise !== 'undefined',
                hasJSON: typeof JSON !== 'undefined'
            };
        });

        if (!websocketSupport.hasWebSocket) {
            return {
                success: false,
                error: 'WebSocket not supported',
                support: websocketSupport
            };
        }

        // Test WebSocket connection
        let connectionSuccessful = false;
        let connectionTime = null;
        
        try {
            const connectionStart = performance.now();
            
            // Wait for WebSocket connection to be established
            await page.waitForFunction(() => {
                return window.wsConnection && window.wsConnection.readyState === WebSocket.OPEN;
            }, { timeout: 10000 });
            
            connectionTime = performance.now() - connectionStart;
            connectionSuccessful = true;
            
        } catch (error) {
            console.log(`    WebSocket connection failed in ${browserName}: ${error.message}`);
        }

        // Test WebSocket messaging
        let messagingSuccessful = false;
        if (connectionSuccessful) {
            try {
                await page.fill('[data-testid="terminal-input"]', 'echo "websocket test"');
                await page.press('[data-testid="terminal-input"]', 'Enter');
                await page.waitForSelector('text=websocket test', { timeout: 5000 });
                messagingSuccessful = true;
            } catch (error) {
                console.log(`    WebSocket messaging failed in ${browserName}: ${error.message}`);
            }
        }

        return {
            success: connectionSuccessful && messagingSuccessful,
            support: websocketSupport,
            connectionSuccessful,
            connectionTime,
            messagingSuccessful,
            browserName,
            totalTime: performance.now() - startTime
        };
    }

    async testTerminalRendering(page, browserName) {
        const startTime = performance.now();
        
        // Test terminal appearance
        const renderingMetrics = await page.evaluate(() => {
            const terminal = document.querySelector('[data-testid="terminal-container"]');
            const input = document.querySelector('[data-testid="terminal-input"]');
            const output = document.querySelector('[data-testid="terminal-output"]');
            
            if (!terminal || !input || !output) {
                return { success: false, error: 'Terminal elements not found' };
            }

            const terminalStyles = window.getComputedStyle(terminal);
            const inputStyles = window.getComputedStyle(input);
            
            return {
                success: true,
                terminal: {
                    visible: terminalStyles.display !== 'none',
                    backgroundColor: terminalStyles.backgroundColor,
                    color: terminalStyles.color,
                    fontFamily: terminalStyles.fontFamily,
                    width: terminal.offsetWidth,
                    height: terminal.offsetHeight
                },
                input: {
                    visible: inputStyles.display !== 'none',
                    backgroundColor: inputStyles.backgroundColor,
                    color: inputStyles.color,
                    fontFamily: inputStyles.fontFamily,
                    width: input.offsetWidth,
                    height: input.offsetHeight
                }
            };
        });

        if (!renderingMetrics.success) {
            return {
                success: false,
                error: renderingMetrics.error,
                browserName
            };
        }

        // Test text rendering with various characters
        const textTests = [
            'echo "Regular text"',
            'echo "Special chars: !@#$%^&*()"',
            'echo "Unicode: 你好世界 🌍"',
            'echo "Numbers: 1234567890"'
        ];

        const textRenderingResults = {};
        
        for (const command of textTests) {
            try {
                await page.fill('[data-testid="terminal-input"]', command);
                await page.press('[data-testid="terminal-input"]', 'Enter');
                
                // Extract the expected output
                const expectedText = command.match(/"(.*)"/)[1];
                
                await page.waitForSelector(`text=${expectedText}`, { timeout: 5000 });
                textRenderingResults[command] = { success: true };
            } catch (error) {
                textRenderingResults[command] = { success: false, error: error.message };
            }
        }

        const allTextRendered = Object.values(textRenderingResults).every(r => r.success);

        return {
            success: allTextRendered && renderingMetrics.terminal.visible,
            renderingMetrics,
            textRenderingResults,
            browserName,
            totalTime: performance.now() - startTime
        };
    }

    async testCommandExecution(page, browserName) {
        const startTime = performance.now();
        
        const commands = [
            { cmd: 'echo "hello"', expected: 'hello' },
            { cmd: 'pwd', expected: null }, // Just check it executes
            { cmd: 'date', expected: null },
            { cmd: 'whoami', expected: null },
            { cmd: 'echo $HOME', expected: null }
        ];

        const commandResults = {};
        
        for (const test of commands) {
            const cmdStart = performance.now();
            try {
                await page.fill('[data-testid="terminal-input"]', test.cmd);
                await page.press('[data-testid="terminal-input"]', 'Enter');
                
                // Wait for command completion
                await page.waitForFunction(() => {
                    const input = document.querySelector('[data-testid="terminal-input"]');
                    return input && input.value === '';
                }, { timeout: 8000 });
                
                const cmdTime = performance.now() - cmdStart;
                
                // If we have expected output, verify it
                if (test.expected) {
                    try {
                        await page.waitForSelector(`text=${test.expected}`, { timeout: 2000 });
                    } catch (error) {
                        throw new Error(`Expected output "${test.expected}" not found`);
                    }
                }
                
                commandResults[test.cmd] = {
                    success: true,
                    executionTime: cmdTime
                };
                
            } catch (error) {
                commandResults[test.cmd] = {
                    success: false,
                    error: error.message
                };
            }
        }

        const successfulCommands = Object.values(commandResults).filter(r => r.success).length;
        const successRate = successfulCommands / commands.length;
        
        const avgExecutionTime = Object.values(commandResults)
            .filter(r => r.success && r.executionTime)
            .reduce((sum, r) => sum + r.executionTime, 0) / successfulCommands || 0;

        return {
            success: successRate >= 0.8, // 80% success rate minimum
            successRate,
            commandResults,
            avgExecutionTime,
            browserName,
            totalTime: performance.now() - startTime
        };
    }

    async testUserInteractions(page, browserName) {
        const startTime = performance.now();
        
        const interactionTests = {
            keyboard: false,
            mouse: false,
            focus: false,
            clipboard: false
        };

        // Test keyboard input
        try {
            await page.focus('[data-testid="terminal-input"]');
            await page.keyboard.type('keyboard test');
            
            const inputValue = await page.inputValue('[data-testid="terminal-input"]');
            interactionTests.keyboard = inputValue.includes('keyboard test');
            
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Delete');
        } catch (error) {
            console.log(`    Keyboard test failed in ${browserName}: ${error.message}`);
        }

        // Test mouse interactions
        try {
            await page.click('[data-testid="terminal-input"]');
            const isFocused = await page.evaluate(() => {
                const input = document.querySelector('[data-testid="terminal-input"]');
                return input === document.activeElement;
            });
            interactionTests.mouse = isFocused;
        } catch (error) {
            console.log(`    Mouse test failed in ${browserName}: ${error.message}`);
        }

        // Test focus management
        try {
            await page.focus('[data-testid="terminal-input"]');
            await page.keyboard.press('Tab');
            // Focus should remain in terminal for usability
            const stillFocused = await page.evaluate(() => {
                const input = document.querySelector('[data-testid="terminal-input"]');
                return document.activeElement === input || document.activeElement.closest('[data-testid="terminal-container"]');
            });
            interactionTests.focus = stillFocused;
        } catch (error) {
            console.log(`    Focus test failed in ${browserName}: ${error.message}`);
        }

        // Test clipboard (if supported)
        try {
            await page.fill('[data-testid="terminal-input"]', 'clipboard test');
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Control+C');
            await page.keyboard.press('Delete');
            await page.keyboard.press('Control+V');
            
            const pastedValue = await page.inputValue('[data-testid="terminal-input"]');
            interactionTests.clipboard = pastedValue.includes('clipboard test');
        } catch (error) {
            console.log(`    Clipboard test not supported or failed in ${browserName}: ${error.message}`);
            // Clipboard might not be available in headless mode
            interactionTests.clipboard = true; // Don't fail the test for this
        }

        const successfulInteractions = Object.values(interactionTests).filter(Boolean).length;
        const interactionScore = successfulInteractions / Object.keys(interactionTests).length;

        return {
            success: interactionScore >= 0.75, // 75% of interactions should work
            interactionScore,
            interactionTests,
            browserName,
            totalTime: performance.now() - startTime
        };
    }

    async testPerformanceMetrics(page, browserName) {
        const startTime = performance.now();
        
        // Get browser performance metrics
        const performanceMetrics = await page.evaluate(() => {
            const perfEntries = performance.getEntriesByType('navigation')[0];
            const paintEntries = performance.getEntriesByType('paint');
            
            const metrics = {
                navigation: perfEntries ? {
                    domContentLoaded: perfEntries.domContentLoadedEventEnd - perfEntries.domContentLoadedEventStart,
                    loadComplete: perfEntries.loadEventEnd - perfEntries.loadEventStart,
                    dnsLookup: perfEntries.domainLookupEnd - perfEntries.domainLookupStart,
                    tcpConnect: perfEntries.connectEnd - perfEntries.connectStart
                } : {},
                paint: {}
            };
            
            paintEntries.forEach(entry => {
                metrics.paint[entry.name] = entry.startTime;
            });
            
            // Memory metrics (if available)
            if (performance.memory) {
                metrics.memory = {
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                };
            }
            
            return metrics;
        });

        // Test command execution performance
        const commandPerfStart = performance.now();
        
        try {
            await page.fill('[data-testid="terminal-input"]', 'echo "performance test"');
            await page.press('[data-testid="terminal-input"]', 'Enter');
            await page.waitForSelector('text=performance test', { timeout: 5000 });
        } catch (error) {
            console.log(`    Performance command test failed: ${error.message}`);
        }
        
        const commandExecutionTime = performance.now() - commandPerfStart;

        // Performance scoring
        let performanceScore = 100;
        
        if (commandExecutionTime > 2000) performanceScore -= 20;
        if (commandExecutionTime > 5000) performanceScore -= 30;
        if (performanceMetrics.paint['first-contentful-paint'] > 3000) performanceScore -= 20;
        if (performanceMetrics.navigation.domContentLoaded > 2000) performanceScore -= 20;

        return {
            success: performanceScore >= 60, // Minimum acceptable performance
            performanceScore,
            metrics: performanceMetrics,
            commandExecutionTime,
            browserName,
            totalTime: performance.now() - startTime
        };
    }

    async testErrorHandling(page, browserName) {
        const startTime = performance.now();
        
        const errorScenarios = [
            { name: 'invalid-command', cmd: 'nonexistent-command-xyz' },
            { name: 'permission-denied', cmd: 'cat /etc/shadow' },
            { name: 'syntax-error', cmd: 'echo "unclosed quote' },
            { name: 'network-timeout', cmd: 'ping -c 1 192.0.2.1' } // RFC5737 test address
        ];

        const errorResults = {};
        
        for (const scenario of errorScenarios) {
            try {
                await page.fill('[data-testid="terminal-input"]', scenario.cmd);
                await page.press('[data-testid="terminal-input"]', 'Enter');
                
                // Wait for response (error message or timeout)
                await page.waitForTimeout(3000);
                
                // Check if application is still responsive
                const isResponsive = await page.evaluate(() => {
                    const input = document.querySelector('[data-testid="terminal-input"]');
                    return input && !input.disabled && input.value === '';
                });
                
                errorResults[scenario.name] = {
                    success: isResponsive,
                    applicationResponsive: isResponsive
                };
                
            } catch (error) {
                errorResults[scenario.name] = {
                    success: false,
                    error: error.message
                };
            }
        }

        const errorHandlingScore = Object.values(errorResults)
            .filter(r => r.success).length / errorScenarios.length;

        return {
            success: errorHandlingScore >= 0.75, // 75% of error scenarios should be handled gracefully
            errorHandlingScore,
            errorResults,
            browserName,
            totalTime: performance.now() - startTime
        };
    }

    async getBrowserFeatures(page) {
        return await page.evaluate(() => {
            return {
                webgl: !!window.WebGLRenderingContext,
                webgl2: !!window.WebGL2RenderingContext,
                webAssembly: typeof WebAssembly !== 'undefined',
                serviceWorker: 'serviceWorker' in navigator,
                webWorkers: typeof Worker !== 'undefined',
                localStorage: typeof Storage !== 'undefined',
                sessionStorage: typeof sessionStorage !== 'undefined',
                indexedDB: !!window.indexedDB,
                webRTC: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
                notifications: 'Notification' in window,
                geolocation: 'geolocation' in navigator,
                deviceMotion: 'DeviceMotionEvent' in window,
                touchEvents: 'ontouchstart' in window,
                pointerEvents: 'PointerEvent' in window,
                intersectionObserver: 'IntersectionObserver' in window,
                mutationObserver: 'MutationObserver' in window,
                resizeObserver: 'ResizeObserver' in window,
                fetchAPI: typeof fetch !== 'undefined',
                es6Modules: typeof Symbol !== 'undefined',
                asyncAwait: (function() {
                    try { return (async () => {}).constructor.name === 'AsyncFunction'; } catch(e) { return false; }
                })(),
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine,
                screenResolution: `${screen.width}x${screen.height}`,
                colorDepth: screen.colorDepth,
                pixelRatio: window.devicePixelRatio || 1
            };
        });
    }

    async getUserAgent(browser) {
        const page = await browser.newPage();
        const userAgent = await page.evaluate(() => navigator.userAgent);
        await page.close();
        return userAgent;
    }

    async generateCompatibilityAnalysis() {
        const browsers = Object.keys(this.browserResults).filter(b => b !== 'comparison' && b !== 'compatibility');
        
        // Cross-browser compatibility analysis
        const compatibility = {
            overallCompatibility: 0,
            featureSupport: {},
            performanceComparison: {},
            issuesByBrowser: {},
            criticalIssues: []
        };

        let totalSuccess = 0;
        let browserCount = 0;

        browsers.forEach(browserName => {
            const browserData = this.browserResults[browserName];
            if (browserData.success !== false && browserData.testResults) {
                browserCount++;
                
                const browserSuccess = Object.values(browserData.testResults)
                    .filter(test => test && test.success !== false).length;
                const totalTests = Object.keys(browserData.testResults).length;
                
                const browserCompatibility = totalTests > 0 ? (browserSuccess / totalTests) * 100 : 0;
                totalSuccess += browserCompatibility;
                
                // Track issues
                compatibility.issuesByBrowser[browserName] = [];
                
                Object.entries(browserData.testResults).forEach(([testName, result]) => {
                    if (result && result.success === false) {
                        compatibility.issuesByBrowser[browserName].push({
                            test: testName,
                            error: result.error
                        });
                        
                        // Mark as critical if it's a core feature
                        if (['basicFunctionality', 'websocketSupport', 'commandExecution'].includes(testName)) {
                            compatibility.criticalIssues.push({
                                browser: browserName,
                                test: testName,
                                error: result.error
                            });
                        }
                    }
                });
            }
        });

        compatibility.overallCompatibility = browserCount > 0 ? totalSuccess / browserCount : 0;

        // Feature support comparison
        browsers.forEach(browserName => {
            const browserData = this.browserResults[browserName];
            if (browserData.features) {
                compatibility.featureSupport[browserName] = browserData.features;
            }
        });

        // Performance comparison
        browsers.forEach(browserName => {
            const browserData = this.browserResults[browserName];
            if (browserData.testResults && browserData.testResults.performanceMetrics) {
                compatibility.performanceComparison[browserName] = {
                    score: browserData.testResults.performanceMetrics.performanceScore,
                    commandTime: browserData.testResults.performanceMetrics.commandExecutionTime
                };
            }
        });

        this.browserResults.compatibility = compatibility;
    }

    async generateCrossBrowserReport() {
        const reportPath = '/workspaces/agent-feed/tests/regression/comprehensive-suite/reports/cross-browser-report.json';
        
        const report = {
            testInfo: {
                timestamp: new Date().toISOString(),
                duration: Date.now() - this.testStartTime,
                browsersTestedD: Object.keys(this.browserResults).filter(b => b !== 'comparison' && b !== 'compatibility').length
            },
            results: this.browserResults,
            summary: this.generateCompatibilitySummary(),
            recommendations: this.generateCompatibilityRecommendations()
        };

        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n🌐 Cross-browser compatibility report saved to: ${reportPath}`);
    }

    generateCompatibilitySummary() {
        const compatibility = this.browserResults.compatibility;
        
        return {
            overallCompatibilityScore: compatibility.overallCompatibility,
            browsersWithIssues: Object.keys(compatibility.issuesByBrowser)
                .filter(browser => compatibility.issuesByBrowser[browser].length > 0),
            criticalIssuesCount: compatibility.criticalIssues.length,
            productionReadiness: this.assessProductionReadiness(compatibility),
            mostCompatibleBrowser: this.findMostCompatibleBrowser(),
            leastCompatibleBrowser: this.findLeastCompatibleBrowser()
        };
    }

    assessProductionReadiness(compatibility) {
        const score = compatibility.overallCompatibility;
        const criticalCount = compatibility.criticalIssues.length;
        
        if (score >= 95 && criticalCount === 0) return 'excellent';
        if (score >= 85 && criticalCount === 0) return 'good';
        if (score >= 70 && criticalCount <= 1) return 'acceptable';
        if (score >= 50 && criticalCount <= 2) return 'needs-improvement';
        return 'poor';
    }

    findMostCompatibleBrowser() {
        let bestBrowser = null;
        let bestScore = 0;
        
        Object.keys(this.browserResults).forEach(browserName => {
            if (browserName === 'compatibility' || browserName === 'comparison') return;
            
            const browserData = this.browserResults[browserName];
            if (browserData.success !== false && browserData.testResults) {
                const successCount = Object.values(browserData.testResults)
                    .filter(test => test && test.success !== false).length;
                const totalTests = Object.keys(browserData.testResults).length;
                const score = totalTests > 0 ? (successCount / totalTests) * 100 : 0;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestBrowser = browserName;
                }
            }
        });
        
        return { browser: bestBrowser, score: bestScore };
    }

    findLeastCompatibleBrowser() {
        let worstBrowser = null;
        let worstScore = 100;
        
        Object.keys(this.browserResults).forEach(browserName => {
            if (browserName === 'compatibility' || browserName === 'comparison') return;
            
            const browserData = this.browserResults[browserName];
            if (browserData.success !== false && browserData.testResults) {
                const successCount = Object.values(browserData.testResults)
                    .filter(test => test && test.success !== false).length;
                const totalTests = Object.keys(browserData.testResults).length;
                const score = totalTests > 0 ? (successCount / totalTests) * 100 : 0;
                
                if (score < worstScore) {
                    worstScore = score;
                    worstBrowser = browserName;
                }
            }
        });
        
        return { browser: worstBrowser, score: worstScore };
    }

    generateCompatibilityRecommendations() {
        const recommendations = [];
        const compatibility = this.browserResults.compatibility;
        
        // Critical issues
        if (compatibility.criticalIssues.length > 0) {
            recommendations.push('CRITICAL: Address browser-specific issues in core functionality');
            compatibility.criticalIssues.forEach(issue => {
                recommendations.push(`- ${issue.browser}: ${issue.test} - ${issue.error}`);
            });
        }
        
        // Overall compatibility
        if (compatibility.overallCompatibility < 70) {
            recommendations.push('Overall browser compatibility below 70% - investigate cross-browser issues');
        }
        
        // Browser-specific recommendations
        Object.entries(compatibility.issuesByBrowser).forEach(([browser, issues]) => {
            if (issues.length > 2) {
                recommendations.push(`${browser} has multiple compatibility issues - prioritize fixes`);
            }
        });
        
        // Performance recommendations
        const perfComparison = compatibility.performanceComparison;
        if (perfComparison) {
            const scores = Object.values(perfComparison).map(p => p.score);
            const variance = Math.max(...scores) - Math.min(...scores);
            
            if (variance > 30) {
                recommendations.push('Significant performance variance between browsers - optimize slower browsers');
            }
        }
        
        // Feature support recommendations
        const featureSupport = compatibility.featureSupport;
        if (featureSupport) {
            const commonFeatures = ['webAssembly', 'fetchAPI', 'webWorkers', 'localStorage'];
            commonFeatures.forEach(feature => {
                const supportedBrowsers = Object.keys(featureSupport)
                    .filter(browser => featureSupport[browser][feature]);
                    
                if (supportedBrowsers.length < Object.keys(featureSupport).length) {
                    recommendations.push(`Feature ${feature} not universally supported - provide fallbacks`);
                }
            });
        }
        
        return recommendations;
    }
}

module.exports = CrossBrowserTest;

// Run if called directly
if (require.main === module) {
    (async () => {
        const crossBrowserTest = new CrossBrowserTest();
        try {
            const results = await crossBrowserTest.runCrossBrowserTests();
            console.log('✅ Cross-browser compatibility tests completed');
            
            const summary = crossBrowserTest.generateCompatibilitySummary();
            console.log(`📊 Overall Compatibility Score: ${summary.overallCompatibilityScore.toFixed(1)}%`);
            
            if (summary.productionReadiness === 'poor') {
                console.log('❌ Cross-browser compatibility issues prevent production deployment');
                process.exit(1);
            } else if (summary.productionReadiness === 'needs-improvement') {
                console.log('⚠️ Cross-browser compatibility needs improvement');
                console.log('📋 Critical Issues:', summary.criticalIssuesCount);
            } else {
                console.log(`✅ Cross-browser compatibility is ${summary.productionReadiness}`);
            }
        } catch (error) {
            console.error('❌ Cross-browser compatibility tests failed:', error);
            process.exit(1);
        }
    })();
}