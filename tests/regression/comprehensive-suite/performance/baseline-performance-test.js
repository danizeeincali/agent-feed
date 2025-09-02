/**
 * Comprehensive Performance Baseline Test Suite
 * Establishes performance baselines for all system components
 */

const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

class PerformanceBaseline {
    constructor() {
        this.metrics = {
            websocket: {},
            commands: {},
            ui: {},
            memory: {},
            network: {}
        };
        this.browsers = ['chromium', 'firefox', 'webkit'];
        this.testStartTime = Date.now();
    }

    async runBaselineTests() {
        console.log('🚀 Starting Performance Baseline Tests...');
        
        for (const browserName of this.browsers) {
            console.log(`\n📊 Testing ${browserName}...`);
            await this.testBrowser(browserName);
        }
        
        await this.generateBaselineReport();
        return this.metrics;
    }

    async testBrowser(browserName) {
        const browser = await this.launchBrowser(browserName);
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            // Enable performance monitoring
            await page.coverage.startJSCoverage();
            await page.coverage.startCSSCoverage();

            // WebSocket Connection Performance
            await this.measureWebSocketPerformance(page, browserName);
            
            // Command Execution Performance
            await this.measureCommandPerformance(page, browserName);
            
            // UI Rendering Performance
            await this.measureUIPerformance(page, browserName);
            
            // Memory Usage Patterns
            await this.measureMemoryPatterns(page, browserName);

        } finally {
            await context.close();
            await browser.close();
        }
    }

    async launchBrowser(browserName) {
        const browsers = { chromium, firefox, webkit };
        return await browsers[browserName].launch({
            headless: true,
            args: ['--no-sandbox', '--disable-web-security']
        });
    }

    async measureWebSocketPerformance(page, browser) {
        console.log(`  🔗 Measuring WebSocket performance for ${browser}...`);
        
        const startTime = performance.now();
        
        // Navigate to application
        await page.goto('http://localhost:5174');
        
        // Wait for WebSocket connection
        await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });
        
        // Measure connection establishment time
        const connectionTime = performance.now() - startTime;
        
        // Test WebSocket message round-trip time
        const messageStartTime = performance.now();
        await page.fill('[data-testid="terminal-input"]', 'echo "performance test"');
        await page.press('[data-testid="terminal-input"]', 'Enter');
        await page.waitForSelector('text=performance test', { timeout: 5000 });
        const messageRoundTrip = performance.now() - messageStartTime;

        this.metrics.websocket[browser] = {
            connectionTime,
            messageRoundTrip,
            timestamp: Date.now()
        };
    }

    async measureCommandPerformance(page, browser) {
        console.log(`  ⚡ Measuring command performance for ${browser}...`);
        
        const commands = [
            'echo "test"',
            'pwd',
            'ls -la',
            'npm --version',
            'git status'
        ];

        const commandMetrics = {};

        for (const command of commands) {
            const startTime = performance.now();
            
            await page.fill('[data-testid="terminal-input"]', command);
            await page.press('[data-testid="terminal-input"]', 'Enter');
            
            // Wait for command completion (look for prompt return)
            await page.waitForFunction(() => {
                const input = document.querySelector('[data-testid="terminal-input"]');
                return input && input.value === '';
            }, { timeout: 10000 });
            
            const executionTime = performance.now() - startTime;
            commandMetrics[command] = executionTime;
        }

        this.metrics.commands[browser] = commandMetrics;
    }

    async measureUIPerformance(page, browser) {
        console.log(`  🎨 Measuring UI performance for ${browser}...`);
        
        // Measure page load and first paint
        const paintMetrics = await page.evaluate(() => {
            const entries = performance.getEntriesByType('paint');
            return entries.reduce((metrics, entry) => {
                metrics[entry.name] = entry.startTime;
                return metrics;
            }, {});
        });

        // Measure component rendering time
        const renderStartTime = performance.now();
        await page.click('[data-testid="new-terminal-button"]');
        await page.waitForSelector('[data-testid="terminal-container"]:nth-child(2)', { timeout: 5000 });
        const componentRenderTime = performance.now() - renderStartTime;

        // Measure scroll performance
        const scrollStartTime = performance.now();
        await page.evaluate(() => {
            const terminal = document.querySelector('[data-testid="terminal-output"]');
            if (terminal) {
                for (let i = 0; i < 100; i++) {
                    terminal.scrollTop = i * 10;
                }
            }
        });
        const scrollPerformance = performance.now() - scrollStartTime;

        this.metrics.ui[browser] = {
            paintMetrics,
            componentRenderTime,
            scrollPerformance,
            timestamp: Date.now()
        };
    }

    async measureMemoryPatterns(page, browser) {
        console.log(`  🧠 Measuring memory patterns for ${browser}...`);
        
        // Get initial memory usage
        const initialMemory = await page.evaluate(() => {
            if (performance.memory) {
                return {
                    usedJSSize: performance.memory.usedJSSize,
                    totalJSSize: performance.memory.totalJSSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                };
            }
            return null;
        });

        // Perform memory-intensive operations
        for (let i = 0; i < 10; i++) {
            await page.fill('[data-testid="terminal-input"]', `echo "memory test ${i}"`);
            await page.press('[data-testid="terminal-input"]', 'Enter');
            await page.waitForTimeout(100);
        }

        // Get final memory usage
        const finalMemory = await page.evaluate(() => {
            if (performance.memory) {
                return {
                    usedJSSize: performance.memory.usedJSSize,
                    totalJSSize: performance.memory.totalJSSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                };
            }
            return null;
        });

        this.metrics.memory[browser] = {
            initial: initialMemory,
            final: finalMemory,
            growth: finalMemory && initialMemory ? {
                usedJS: finalMemory.usedJSSize - initialMemory.usedJSSize,
                totalJS: finalMemory.totalJSSize - initialMemory.totalJSSize
            } : null,
            timestamp: Date.now()
        };
    }

    async generateBaselineReport() {
        const reportPath = '/workspaces/agent-feed/tests/regression/comprehensive-suite/reports/performance-baseline-report.json';
        
        const report = {
            testInfo: {
                timestamp: new Date().toISOString(),
                duration: Date.now() - this.testStartTime,
                browsers: this.browsers
            },
            metrics: this.metrics,
            baselines: this.calculateBaselines(),
            recommendations: this.generateRecommendations()
        };

        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📊 Performance baseline report saved to: ${reportPath}`);
    }

    calculateBaselines() {
        const baselines = {};
        
        // WebSocket baselines
        const wsMetrics = Object.values(this.metrics.websocket);
        if (wsMetrics.length > 0) {
            baselines.websocket = {
                avgConnectionTime: wsMetrics.reduce((sum, m) => sum + m.connectionTime, 0) / wsMetrics.length,
                avgMessageRoundTrip: wsMetrics.reduce((sum, m) => sum + m.messageRoundTrip, 0) / wsMetrics.length
            };
        }

        // Command execution baselines
        const commandMetrics = Object.values(this.metrics.commands);
        if (commandMetrics.length > 0) {
            const allCommands = {};
            commandMetrics.forEach(browserCommands => {
                Object.entries(browserCommands).forEach(([cmd, time]) => {
                    if (!allCommands[cmd]) allCommands[cmd] = [];
                    allCommands[cmd].push(time);
                });
            });
            
            baselines.commands = {};
            Object.entries(allCommands).forEach(([cmd, times]) => {
                baselines.commands[cmd] = times.reduce((sum, time) => sum + time, 0) / times.length;
            });
        }

        return baselines;
    }

    generateRecommendations() {
        const recommendations = [];
        
        // WebSocket performance recommendations
        const wsBaselines = this.calculateBaselines().websocket;
        if (wsBaselines) {
            if (wsBaselines.avgConnectionTime > 2000) {
                recommendations.push('WebSocket connection time exceeds 2s - consider connection optimization');
            }
            if (wsBaselines.avgMessageRoundTrip > 500) {
                recommendations.push('WebSocket message round-trip time exceeds 500ms - check network latency');
            }
        }

        // Memory recommendations
        Object.entries(this.metrics.memory).forEach(([browser, memory]) => {
            if (memory.growth && memory.growth.usedJS > 10 * 1024 * 1024) { // 10MB
                recommendations.push(`${browser}: Memory growth exceeds 10MB - potential memory leak`);
            }
        });

        return recommendations;
    }
}

// Export for use in other tests
module.exports = PerformanceBaseline;

// Run if called directly
if (require.main === module) {
    (async () => {
        const baseline = new PerformanceBaseline();
        try {
            await baseline.runBaselineTests();
            console.log('✅ Performance baseline tests completed successfully');
        } catch (error) {
            console.error('❌ Performance baseline tests failed:', error);
            process.exit(1);
        }
    })();
}