/**
 * Concurrent User Simulation Stress Test
 * Simulates multiple simultaneous users with high-concurrency scenarios
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;

class ConcurrentStressTest {
    constructor(options = {}) {
        this.concurrentUsers = options.users || 10;
        this.commandsPerUser = options.commands || 20;
        this.connectionCycles = options.cycles || 5;
        this.testResults = {
            concurrency: {},
            performance: {},
            reliability: {},
            errors: []
        };
        this.testStartTime = Date.now();
    }

    async runConcurrentStressTests() {
        console.log(`🚀 Starting Concurrent Stress Tests with ${this.concurrentUsers} users...`);
        
        const browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-web-security']
        });

        try {
            // Test 1: Concurrent WebSocket Connections
            await this.testConcurrentConnections(browser);
            
            // Test 2: Simultaneous Command Execution
            await this.testSimultaneousCommands(browser);
            
            // Test 3: Rapid Connection Cycling
            await this.testConnectionCycling(browser);
            
            // Test 4: Mixed Load Scenarios
            await this.testMixedLoadScenarios(browser);
            
            await this.generateStressReport();
            
        } finally {
            await browser.close();
        }

        return this.testResults;
    }

    async testConcurrentConnections(browser) {
        console.log(`  🔗 Testing ${this.concurrentUsers} concurrent connections...`);
        
        const contexts = [];
        const pages = [];
        const connectionPromises = [];
        const startTime = performance.now();

        try {
            // Create concurrent browser contexts and pages
            for (let i = 0; i < this.concurrentUsers; i++) {
                const context = await browser.newContext();
                const page = await context.newPage();
                
                contexts.push(context);
                pages.push(page);
                
                // Start connection process
                const connectionPromise = this.establishConnection(page, i)
                    .catch(error => ({ userId: i, error: error.message }));
                connectionPromises.push(connectionPromise);
            }

            // Wait for all connections to complete
            const connectionResults = await Promise.allSettled(connectionPromises);
            const connectionTime = performance.now() - startTime;

            // Analyze results
            const successfulConnections = connectionResults.filter(r => 
                r.status === 'fulfilled' && !r.value.error
            ).length;
            
            const failedConnections = connectionResults.filter(r => 
                r.status === 'rejected' || r.value?.error
            ).length;

            this.testResults.concurrency.connections = {
                totalUsers: this.concurrentUsers,
                successfulConnections,
                failedConnections,
                successRate: (successfulConnections / this.concurrentUsers) * 100,
                totalConnectionTime: connectionTime,
                avgConnectionTime: connectionTime / this.concurrentUsers,
                errors: connectionResults
                    .filter(r => r.status === 'rejected' || r.value?.error)
                    .map(r => r.value?.error || r.reason?.message)
            };

        } finally {
            // Cleanup
            for (const context of contexts) {
                await context.close().catch(() => {});
            }
        }
    }

    async establishConnection(page, userId) {
        const startTime = performance.now();
        
        await page.goto('http://localhost:5174');
        await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });
        
        // Verify WebSocket connection
        const isConnected = await page.evaluate(() => {
            return new Promise((resolve) => {
                const checkConnection = () => {
                    if (window.wsConnection && window.wsConnection.readyState === WebSocket.OPEN) {
                        resolve(true);
                    } else if (window.wsConnection?.readyState === WebSocket.CLOSED) {
                        resolve(false);
                    } else {
                        setTimeout(checkConnection, 100);
                    }
                };
                checkConnection();
            });
        });

        const connectionTime = performance.now() - startTime;
        
        if (!isConnected) {
            throw new Error(`User ${userId}: WebSocket connection failed`);
        }

        return { userId, connectionTime, success: true };
    }

    async testSimultaneousCommands(browser) {
        console.log(`  ⚡ Testing simultaneous command execution...`);
        
        const contexts = [];
        const commandPromises = [];
        const startTime = performance.now();

        try {
            // Setup concurrent users
            for (let i = 0; i < this.concurrentUsers; i++) {
                const context = await browser.newContext();
                const page = await context.newPage();
                contexts.push(context);

                await page.goto('http://localhost:5174');
                await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });
                
                // Execute commands simultaneously
                const commandPromise = this.executeCommandSequence(page, i)
                    .catch(error => ({ userId: i, error: error.message }));
                commandPromises.push(commandPromise);
            }

            // Wait for all command sequences to complete
            const commandResults = await Promise.allSettled(commandPromises);
            const totalTime = performance.now() - startTime;

            // Analyze command execution results
            const successful = commandResults.filter(r => 
                r.status === 'fulfilled' && !r.value.error
            ).length;

            const failed = commandResults.filter(r => 
                r.status === 'rejected' || r.value?.error
            ).length;

            this.testResults.concurrency.commands = {
                totalUsers: this.concurrentUsers,
                commandsPerUser: this.commandsPerUser,
                totalCommands: this.concurrentUsers * this.commandsPerUser,
                successfulUsers: successful,
                failedUsers: failed,
                successRate: (successful / this.concurrentUsers) * 100,
                totalExecutionTime: totalTime,
                avgTimePerUser: totalTime / this.concurrentUsers,
                commandThroughput: (this.concurrentUsers * this.commandsPerUser) / (totalTime / 1000)
            };

        } finally {
            for (const context of contexts) {
                await context.close().catch(() => {});
            }
        }
    }

    async executeCommandSequence(page, userId) {
        const commands = [
            'echo "User ${userId} test"',
            'pwd',
            'date',
            'echo "Command 4"',
            'ls -la',
            'whoami',
            'echo "Final command"'
        ];

        const results = [];
        
        for (let i = 0; i < Math.min(commands.length, this.commandsPerUser); i++) {
            const command = commands[i % commands.length].replace('${userId}', userId);
            const startTime = performance.now();
            
            try {
                await page.fill('[data-testid="terminal-input"]', command);
                await page.press('[data-testid="terminal-input"]', 'Enter');
                
                // Wait for command completion
                await page.waitForFunction(() => {
                    const input = document.querySelector('[data-testid="terminal-input"]');
                    return input && input.value === '';
                }, { timeout: 5000 });
                
                const executionTime = performance.now() - startTime;
                results.push({ command, executionTime, success: true });
                
            } catch (error) {
                results.push({ command, error: error.message, success: false });
            }
            
            // Small delay to prevent overwhelming
            await page.waitForTimeout(50);
        }

        return { userId, results };
    }

    async testConnectionCycling(browser) {
        console.log(`  🔄 Testing rapid connection cycling...`);
        
        const cyclePromises = [];
        const startTime = performance.now();

        for (let i = 0; i < this.concurrentUsers; i++) {
            const cyclePromise = this.performConnectionCycles(browser, i)
                .catch(error => ({ userId: i, error: error.message }));
            cyclePromises.push(cyclePromise);
        }

        const cycleResults = await Promise.allSettled(cyclePromises);
        const totalTime = performance.now() - startTime;

        const successful = cycleResults.filter(r => 
            r.status === 'fulfilled' && !r.value.error
        ).length;

        this.testResults.concurrency.cycling = {
            totalUsers: this.concurrentUsers,
            cyclesPerUser: this.connectionCycles,
            successfulUsers: successful,
            successRate: (successful / this.concurrentUsers) * 100,
            totalTime,
            avgTimePerUser: totalTime / this.concurrentUsers
        };
    }

    async performConnectionCycles(browser, userId) {
        const results = [];
        
        for (let cycle = 0; cycle < this.connectionCycles; cycle++) {
            const context = await browser.newContext();
            const page = await context.newPage();
            
            try {
                const startTime = performance.now();
                
                // Connect
                await page.goto('http://localhost:5174');
                await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 5000 });
                
                // Execute a quick command
                await page.fill('[data-testid="terminal-input"]', `echo "Cycle ${cycle}"`);
                await page.press('[data-testid="terminal-input"]', 'Enter');
                await page.waitForTimeout(100);
                
                const cycleTime = performance.now() - startTime;
                results.push({ cycle, cycleTime, success: true });
                
            } catch (error) {
                results.push({ cycle, error: error.message, success: false });
            } finally {
                await context.close();
            }
            
            // Brief pause between cycles
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return { userId, results };
    }

    async testMixedLoadScenarios(browser) {
        console.log(`  🎯 Testing mixed load scenarios...`);
        
        const scenarios = [
            { name: 'heavy-commands', weight: 0.3, action: this.heavyCommandUser.bind(this) },
            { name: 'rapid-fire', weight: 0.3, action: this.rapidFireUser.bind(this) },
            { name: 'idle-connections', weight: 0.2, action: this.idleConnectionUser.bind(this) },
            { name: 'connection-cycling', weight: 0.2, action: this.cyclingUser.bind(this) }
        ];

        const scenarioPromises = [];
        
        for (const scenario of scenarios) {
            const userCount = Math.ceil(this.concurrentUsers * scenario.weight);
            
            for (let i = 0; i < userCount; i++) {
                const promise = scenario.action(browser, `${scenario.name}-${i}`)
                    .catch(error => ({ scenario: scenario.name, userId: i, error: error.message }));
                scenarioPromises.push(promise);
            }
        }

        const startTime = performance.now();
        const scenarioResults = await Promise.allSettled(scenarioPromises);
        const totalTime = performance.now() - startTime;

        this.testResults.concurrency.mixedLoad = {
            scenarios: scenarios.map(s => s.name),
            totalTime,
            results: scenarioResults.map(r => r.status === 'fulfilled' ? r.value : r.reason)
        };
    }

    async heavyCommandUser(browser, userId) {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
            await page.goto('http://localhost:5174');
            await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });
            
            // Execute resource-intensive commands
            const heavyCommands = [
                'find /tmp -name "*.log" 2>/dev/null | head -10',
                'ps aux | head -20',
                'df -h',
                'free -h',
                'uname -a'
            ];

            for (const command of heavyCommands) {
                await page.fill('[data-testid="terminal-input"]', command);
                await page.press('[data-testid="terminal-input"]', 'Enter');
                await page.waitForTimeout(200);
            }
            
        } finally {
            await context.close();
        }
        
        return { userId, type: 'heavy-commands', success: true };
    }

    async rapidFireUser(browser, userId) {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
            await page.goto('http://localhost:5174');
            await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });
            
            // Execute rapid-fire commands
            for (let i = 0; i < 15; i++) {
                await page.fill('[data-testid="terminal-input"]', `echo "Rapid ${i}"`);
                await page.press('[data-testid="terminal-input"]', 'Enter');
                await page.waitForTimeout(25); // Very fast execution
            }
            
        } finally {
            await context.close();
        }
        
        return { userId, type: 'rapid-fire', success: true };
    }

    async idleConnectionUser(browser, userId) {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
            await page.goto('http://localhost:5174');
            await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });
            
            // Keep connection idle for extended period
            await page.waitForTimeout(5000);
            
            // Send occasional heartbeat
            await page.fill('[data-testid="terminal-input"]', 'echo "heartbeat"');
            await page.press('[data-testid="terminal-input"]', 'Enter');
            
        } finally {
            await context.close();
        }
        
        return { userId, type: 'idle-connection', success: true };
    }

    async cyclingUser(browser, userId) {
        // Rapid connect/disconnect cycles
        for (let i = 0; i < 3; i++) {
            const context = await browser.newContext();
            const page = await context.newPage();
            
            try {
                await page.goto('http://localhost:5174');
                await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 5000 });
                await page.waitForTimeout(100);
            } finally {
                await context.close();
            }
        }
        
        return { userId, type: 'connection-cycling', success: true };
    }

    async generateStressReport() {
        const reportPath = '/workspaces/agent-feed/tests/regression/comprehensive-suite/reports/concurrent-stress-report.json';
        
        const report = {
            testInfo: {
                timestamp: new Date().toISOString(),
                duration: Date.now() - this.testStartTime,
                configuration: {
                    concurrentUsers: this.concurrentUsers,
                    commandsPerUser: this.commandsPerUser,
                    connectionCycles: this.connectionCycles
                }
            },
            results: this.testResults,
            summary: this.generateSummary(),
            recommendations: this.generateRecommendations()
        };

        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n🚀 Concurrent stress test report saved to: ${reportPath}`);
    }

    generateSummary() {
        const conn = this.testResults.concurrency.connections;
        const cmd = this.testResults.concurrency.commands;
        const cycle = this.testResults.concurrency.cycling;
        
        return {
            overallSuccess: (
                (conn?.successRate || 0) + 
                (cmd?.successRate || 0) + 
                (cycle?.successRate || 0)
            ) / 3,
            criticalIssues: [
                conn?.successRate < 90 ? 'Connection reliability issues' : null,
                cmd?.successRate < 85 ? 'Command execution reliability issues' : null,
                cycle?.successRate < 80 ? 'Connection cycling issues' : null
            ].filter(Boolean),
            performanceMetrics: {
                connectionThroughput: conn?.avgConnectionTime || 0,
                commandThroughput: cmd?.commandThroughput || 0,
                cyclingPerformance: cycle?.avgTimePerUser || 0
            }
        };
    }

    generateRecommendations() {
        const recommendations = [];
        const summary = this.generateSummary();
        
        if (summary.overallSuccess < 90) {
            recommendations.push('Overall system reliability below 90% - investigate failure patterns');
        }
        
        if (summary.performanceMetrics.connectionThroughput > 5000) {
            recommendations.push('Connection establishment time > 5s - optimize WebSocket initialization');
        }
        
        if (summary.performanceMetrics.commandThroughput < 10) {
            recommendations.push('Command throughput < 10 cmd/s - optimize command processing pipeline');
        }
        
        summary.criticalIssues.forEach(issue => {
            recommendations.push(`Critical: ${issue}`);
        });
        
        return recommendations;
    }
}

module.exports = ConcurrentStressTest;

// Run if called directly
if (require.main === module) {
    (async () => {
        const stressTest = new ConcurrentStressTest({
            users: 10,
            commands: 10,
            cycles: 3
        });
        
        try {
            const results = await stressTest.runConcurrentStressTests();
            console.log('✅ Concurrent stress tests completed');
            
            const summary = stressTest.generateSummary();
            if (summary.overallSuccess < 85) {
                console.log('⚠️ System reliability issues detected');
                console.log('📋 Recommendations:', summary.recommendations);
                process.exit(1);
            } else {
                console.log(`✅ System passed stress tests with ${summary.overallSuccess.toFixed(1)}% success rate`);
            }
        } catch (error) {
            console.error('❌ Concurrent stress tests failed:', error);
            process.exit(1);
        }
    })();
}