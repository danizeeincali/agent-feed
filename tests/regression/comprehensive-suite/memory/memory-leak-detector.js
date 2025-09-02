/**
 * Comprehensive Memory Leak Detection Suite
 * Detects memory leaks in WebSocket connections, React components, and DOM
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;

class MemoryLeakDetector {
    constructor() {
        this.leakDetectionResults = {
            websocket: {},
            components: {},
            dom: {},
            eventListeners: {},
            summary: {}
        };
        this.testStartTime = Date.now();
    }

    async runMemoryLeakDetection() {
        console.log('🔍 Starting Memory Leak Detection...');
        
        const browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--js-flags=--expose-gc']
        });
        
        try {
            await this.detectWebSocketLeaks(browser);
            await this.detectComponentLeaks(browser);
            await this.detectDOMLeaks(browser);
            await this.detectEventListenerLeaks(browser);
            await this.generateLeakReport();
        } finally {
            await browser.close();
        }

        return this.leakDetectionResults;
    }

    async detectWebSocketLeaks(browser) {
        console.log('  🔗 Detecting WebSocket memory leaks...');
        
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            await page.goto('http://localhost:5174');
            
            // Get initial WebSocket count
            const initialWSCount = await page.evaluate(() => {
                return window.webSocketConnections ? window.webSocketConnections.size : 0;
            });

            // Create and destroy multiple WebSocket connections
            const iterations = 10;
            const connectionResults = [];

            for (let i = 0; i < iterations; i++) {
                const startMemory = await this.getMemoryUsage(page);
                
                // Open new terminal (creates WebSocket)
                await page.click('[data-testid="new-terminal-button"]');
                await page.waitForSelector(`[data-testid="terminal-${i + 1}"]`, { timeout: 5000 });
                
                // Execute command to ensure connection is active
                await page.fill(`[data-testid="terminal-${i + 1}"] [data-testid="terminal-input"]`, 'echo test');
                await page.press(`[data-testid="terminal-${i + 1}"] [data-testid="terminal-input"]`, 'Enter');
                await page.waitForTimeout(100);
                
                // Close terminal
                await page.click(`[data-testid="close-terminal-${i + 1}"]`);
                await page.waitForTimeout(100);
                
                // Force garbage collection
                await page.evaluate(() => {
                    if (window.gc) window.gc();
                });
                
                const endMemory = await this.getMemoryUsage(page);
                
                connectionResults.push({
                    iteration: i,
                    startMemory,
                    endMemory,
                    memoryDelta: endMemory.usedJSSize - startMemory.usedJSSize
                });
            }

            // Check final WebSocket count
            const finalWSCount = await page.evaluate(() => {
                return window.webSocketConnections ? window.webSocketConnections.size : 0;
            });

            this.leakDetectionResults.websocket = {
                initialCount: initialWSCount,
                finalCount: finalWSCount,
                expectedFinalCount: 1, // Should be back to original
                connectionResults,
                hasLeak: finalWSCount > initialWSCount + 1,
                avgMemoryDelta: connectionResults.reduce((sum, r) => sum + r.memoryDelta, 0) / connectionResults.length
            };

        } finally {
            await context.close();
        }
    }

    async detectComponentLeaks(browser) {
        console.log('  ⚛️ Detecting React component memory leaks...');
        
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            await page.goto('http://localhost:5174');
            
            // Monitor React component instances
            await page.evaluate(() => {
                window.componentInstances = new WeakMap();
                window.componentCount = 0;
                
                // Hook into React DevTools if available
                if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
                    const originalOnCommitFiberRoot = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot;
                    window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = function(...args) {
                        window.componentCount++;
                        return originalOnCommitFiberRoot?.apply(this, args);
                    };
                }
            });

            const componentTests = [];
            const iterations = 5;

            for (let i = 0; i < iterations; i++) {
                const startMemory = await this.getMemoryUsage(page);
                const startComponentCount = await page.evaluate(() => window.componentCount || 0);
                
                // Create multiple components
                await page.click('[data-testid="new-terminal-button"]');
                await page.waitForTimeout(100);
                
                await page.click('[data-testid="new-terminal-button"]');
                await page.waitForTimeout(100);
                
                // Unmount components
                await page.click('[data-testid="close-terminal-1"]');
                await page.waitForTimeout(50);
                await page.click('[data-testid="close-terminal-2"]');
                await page.waitForTimeout(50);
                
                // Force garbage collection
                await page.evaluate(() => {
                    if (window.gc) window.gc();
                });
                
                const endMemory = await this.getMemoryUsage(page);
                const endComponentCount = await page.evaluate(() => window.componentCount || 0);
                
                componentTests.push({
                    iteration: i,
                    startMemory,
                    endMemory,
                    startComponentCount,
                    endComponentCount,
                    memoryDelta: endMemory.usedJSSize - startMemory.usedJSSize
                });
            }

            this.leakDetectionResults.components = {
                tests: componentTests,
                avgMemoryDelta: componentTests.reduce((sum, t) => sum + t.memoryDelta, 0) / componentTests.length,
                hasMemoryGrowth: componentTests.some(t => t.memoryDelta > 1024 * 1024), // 1MB threshold
            };

        } finally {
            await context.close();
        }
    }

    async detectDOMLeaks(browser) {
        console.log('  📄 Detecting DOM memory leaks...');
        
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            await page.goto('http://localhost:5174');
            
            const domTests = [];
            const iterations = 5;

            for (let i = 0; i < iterations; i++) {
                const startMemory = await this.getMemoryUsage(page);
                const startNodeCount = await page.evaluate(() => document.querySelectorAll('*').length);
                
                // Create DOM elements
                for (let j = 0; j < 3; j++) {
                    await page.click('[data-testid="new-terminal-button"]');
                    await page.waitForTimeout(50);
                    
                    // Add some content to create DOM nodes
                    await page.fill('[data-testid="terminal-input"]', `echo "DOM test ${i}-${j}"`);
                    await page.press('[data-testid="terminal-input"]', 'Enter');
                    await page.waitForTimeout(50);
                }
                
                // Remove elements
                const closeButtons = await page.$$('[data-testid^="close-terminal"]');
                for (const button of closeButtons) {
                    await button.click();
                    await page.waitForTimeout(25);
                }
                
                // Force garbage collection
                await page.evaluate(() => {
                    if (window.gc) window.gc();
                });
                
                const endMemory = await this.getMemoryUsage(page);
                const endNodeCount = await page.evaluate(() => document.querySelectorAll('*').length);
                
                domTests.push({
                    iteration: i,
                    startMemory,
                    endMemory,
                    startNodeCount,
                    endNodeCount,
                    nodesDelta: endNodeCount - startNodeCount,
                    memoryDelta: endMemory.usedJSSize - startMemory.usedJSSize
                });
            }

            this.leakDetectionResults.dom = {
                tests: domTests,
                avgNodesDelta: domTests.reduce((sum, t) => sum + t.nodesDelta, 0) / domTests.length,
                avgMemoryDelta: domTests.reduce((sum, t) => sum + t.memoryDelta, 0) / domTests.length,
                hasNodeLeaks: domTests.some(t => t.nodesDelta > 10)
            };

        } finally {
            await context.close();
        }
    }

    async detectEventListenerLeaks(browser) {
        console.log('  👂 Detecting event listener leaks...');
        
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            await page.goto('http://localhost:5174');
            
            // Inject listener monitoring
            await page.evaluate(() => {
                window.listenerCount = 0;
                const originalAddEventListener = EventTarget.prototype.addEventListener;
                const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
                
                EventTarget.prototype.addEventListener = function(...args) {
                    window.listenerCount++;
                    return originalAddEventListener.apply(this, args);
                };
                
                EventTarget.prototype.removeEventListener = function(...args) {
                    window.listenerCount = Math.max(0, window.listenerCount - 1);
                    return originalRemoveEventListener.apply(this, args);
                };
            });

            const listenerTests = [];
            const iterations = 5;

            for (let i = 0; i < iterations; i++) {
                const startListenerCount = await page.evaluate(() => window.listenerCount);
                const startMemory = await this.getMemoryUsage(page);
                
                // Create and destroy components with event listeners
                await page.click('[data-testid="new-terminal-button"]');
                await page.waitForTimeout(100);
                
                // Interact to trigger event listeners
                await page.hover('[data-testid="terminal-input"]');
                await page.click('[data-testid="terminal-input"]');
                await page.waitForTimeout(50);
                
                // Close component
                await page.click('[data-testid="close-terminal-1"]');
                await page.waitForTimeout(100);
                
                const endListenerCount = await page.evaluate(() => window.listenerCount);
                const endMemory = await this.getMemoryUsage(page);
                
                listenerTests.push({
                    iteration: i,
                    startListenerCount,
                    endListenerCount,
                    listenerDelta: endListenerCount - startListenerCount,
                    startMemory,
                    endMemory,
                    memoryDelta: endMemory.usedJSSize - startMemory.usedJSSize
                });
            }

            this.leakDetectionResults.eventListeners = {
                tests: listenerTests,
                avgListenerDelta: listenerTests.reduce((sum, t) => sum + t.listenerDelta, 0) / listenerTests.length,
                avgMemoryDelta: listenerTests.reduce((sum, t) => sum + t.memoryDelta, 0) / listenerTests.length,
                hasListenerLeaks: listenerTests.some(t => t.listenerDelta > 5)
            };

        } finally {
            await context.close();
        }
    }

    async getMemoryUsage(page) {
        return await page.evaluate(() => {
            if (performance.memory) {
                return {
                    usedJSSize: performance.memory.usedJSSize,
                    totalJSSize: performance.memory.totalJSSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                };
            }
            return { usedJSSize: 0, totalJSSize: 0, jsHeapSizeLimit: 0 };
        });
    }

    async generateLeakReport() {
        const reportPath = '/workspaces/agent-feed/tests/regression/comprehensive-suite/reports/memory-leak-report.json';
        
        // Calculate summary
        const hasWebSocketLeaks = this.leakDetectionResults.websocket.hasLeak;
        const hasComponentLeaks = this.leakDetectionResults.components.hasMemoryGrowth;
        const hasDOMLeaks = this.leakDetectionResults.dom.hasNodeLeaks;
        const hasListenerLeaks = this.leakDetectionResults.eventListeners.hasListenerLeaks;
        
        this.leakDetectionResults.summary = {
            hasAnyLeaks: hasWebSocketLeaks || hasComponentLeaks || hasDOMLeaks || hasListenerLeaks,
            leakTypes: {
                websocket: hasWebSocketLeaks,
                components: hasComponentLeaks,
                dom: hasDOMLeaks,
                eventListeners: hasListenerLeaks
            },
            severity: this.calculateSeverity(),
            recommendations: this.generateLeakRecommendations()
        };

        const report = {
            testInfo: {
                timestamp: new Date().toISOString(),
                duration: Date.now() - this.testStartTime
            },
            results: this.leakDetectionResults
        };

        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n🔍 Memory leak report saved to: ${reportPath}`);
    }

    calculateSeverity() {
        let score = 0;
        
        if (this.leakDetectionResults.websocket.hasLeak) score += 3;
        if (this.leakDetectionResults.components.hasMemoryGrowth) score += 2;
        if (this.leakDetectionResults.dom.hasNodeLeaks) score += 2;
        if (this.leakDetectionResults.eventListeners.hasListenerLeaks) score += 1;
        
        if (score === 0) return 'none';
        if (score <= 2) return 'low';
        if (score <= 5) return 'medium';
        return 'high';
    }

    generateLeakRecommendations() {
        const recommendations = [];
        
        if (this.leakDetectionResults.websocket.hasLeak) {
            recommendations.push('WebSocket connections not properly closed - implement proper cleanup');
        }
        
        if (this.leakDetectionResults.components.hasMemoryGrowth) {
            recommendations.push('React components showing memory growth - check useEffect cleanup');
        }
        
        if (this.leakDetectionResults.dom.hasNodeLeaks) {
            recommendations.push('DOM nodes not properly removed - verify component unmounting');
        }
        
        if (this.leakDetectionResults.eventListeners.hasListenerLeaks) {
            recommendations.push('Event listeners not properly removed - add cleanup in useEffect');
        }
        
        return recommendations;
    }
}

module.exports = MemoryLeakDetector;

// Run if called directly
if (require.main === module) {
    (async () => {
        const detector = new MemoryLeakDetector();
        try {
            const results = await detector.runMemoryLeakDetection();
            console.log('✅ Memory leak detection completed');
            
            if (results.summary.hasAnyLeaks) {
                console.log('⚠️ Memory leaks detected:', results.summary.leakTypes);
                console.log('📋 Recommendations:', results.summary.recommendations);
                process.exit(1);
            } else {
                console.log('✅ No memory leaks detected');
            }
        } catch (error) {
            console.error('❌ Memory leak detection failed:', error);
            process.exit(1);
        }
    })();
}