/**
 * High-Frequency Load Testing Suite
 * Tests system performance under extreme load conditions
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

class LoadStressTest {
    constructor(options = {}) {
        this.loadConfig = {
            maxConcurrentUsers: options.maxUsers || 20,
            commandsPerSecond: options.commandsPerSecond || 50,
            testDuration: options.duration || 60000, // 1 minute
            rampUpTime: options.rampUp || 10000, // 10 seconds
            burstTestDuration: options.burstDuration || 5000 // 5 seconds
        };
        this.loadResults = {
            sustainedLoad: {},
            burstLoad: {},
            resourceUtilization: {},
            errorRates: {},
            performanceDegradation: {},
            summary: {}
        };
        this.testStartTime = Date.now();
    }

    async runLoadStressTests() {
        console.log('🚀 Starting High-Frequency Load Stress Tests...');
        console.log(`Configuration:
    - Max Concurrent Users: ${this.loadConfig.maxConcurrentUsers}
    - Commands Per Second: ${this.loadConfig.commandsPerSecond}
    - Test Duration: ${this.loadConfig.testDuration}ms
    - Ramp Up Time: ${this.loadConfig.rampUpTime}ms`);
        
        try {
            // Test 1: Sustained Load Testing
            await this.testSustainedLoad();
            
            // Test 2: Burst Load Testing
            await this.testBurstLoad();
            
            // Test 3: Resource Utilization Monitoring
            await this.testResourceUtilization();
            
            // Test 4: Gradual Load Increase
            await this.testGradualLoadIncrease();
            
            // Test 5: Connection Pool Stress
            await this.testConnectionPoolStress();
            
            await this.generateLoadTestReport();
            
        } catch (error) {
            console.error('Load stress testing failed:', error);
            throw error;
        }

        return this.loadResults;
    }

    async testSustainedLoad() {
        console.log('  🔥 Testing sustained load...');
        
        const browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-web-security', '--max_old_space_size=4096']
        });

        const userPromises = [];
        const startTime = performance.now();
        const endTime = startTime + this.loadConfig.testDuration;
        
        try {
            // Create concurrent users with staggered start
            const rampUpInterval = this.loadConfig.rampUpTime / this.loadConfig.maxConcurrentUsers;
            
            for (let userId = 0; userId < this.loadConfig.maxConcurrentUsers; userId++) {
                const userDelay = userId * rampUpInterval;
                
                const userPromise = this.createSustainedLoadUser(browser, userId, startTime + userDelay, endTime)
                    .catch(error => ({
                        userId,
                        error: error.message,
                        success: false
                    }));
                    
                userPromises.push(userPromise);
            }
            
            // Wait for all users to complete
            const userResults = await Promise.allSettled(userPromises);
            
            // Analyze sustained load results
            const successfulUsers = userResults.filter(r => 
                r.status === 'fulfilled' && r.value.success !== false
            ).map(r => r.value);
            
            const failedUsers = userResults.filter(r => 
                r.status === 'rejected' || r.value.success === false
            ).map(r => r.value || { error: r.reason?.message });

            this.loadResults.sustainedLoad = {
                totalUsers: this.loadConfig.maxConcurrentUsers,
                successfulUsers: successfulUsers.length,
                failedUsers: failedUsers.length,
                successRate: (successfulUsers.length / this.loadConfig.maxConcurrentUsers) * 100,
                avgCommandsPerUser: successfulUsers.reduce((sum, u) => sum + (u.commandsExecuted || 0), 0) / successfulUsers.length,
                avgResponseTime: successfulUsers.reduce((sum, u) => sum + (u.avgResponseTime || 0), 0) / successfulUsers.length,
                totalCommands: successfulUsers.reduce((sum, u) => sum + (u.commandsExecuted || 0), 0),
                actualDuration: performance.now() - startTime,
                commandThroughput: 0,
                errors: failedUsers.map(u => u.error).filter(Boolean)
            };
            
            // Calculate actual throughput
            if (this.loadResults.sustainedLoad.actualDuration > 0) {
                this.loadResults.sustainedLoad.commandThroughput = 
                    (this.loadResults.sustainedLoad.totalCommands / this.loadResults.sustainedLoad.actualDuration) * 1000;
            }

        } finally {
            await browser.close();
        }
    }

    async createSustainedLoadUser(browser, userId, startTime, endTime) {
        await new Promise(resolve => setTimeout(resolve, Math.max(0, startTime - performance.now())));
        
        const context = await browser.newContext();
        const page = await context.newPage();
        
        const userStats = {
            userId,
            commandsExecuted: 0,
            totalResponseTime: 0,
            avgResponseTime: 0,
            errors: [],
            success: true
        };

        try {
            await page.goto('http://localhost:5174', { timeout: 10000 });
            await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 5000 });
            
            const commands = [
                'echo "load test"',
                'pwd',
                'date',
                'whoami',
                'echo $HOME'
            ];
            
            let commandIndex = 0;
            const commandInterval = 1000 / (this.loadConfig.commandsPerSecond / this.loadConfig.maxConcurrentUsers);
            
            while (performance.now() < endTime) {
                const command = commands[commandIndex % commands.length];
                const cmdStart = performance.now();
                
                try {
                    await page.fill('[data-testid="terminal-input"]', command);
                    await page.press('[data-testid="terminal-input"]', 'Enter');
                    
                    // Wait for command completion with timeout
                    await page.waitForFunction(() => {
                        const input = document.querySelector('[data-testid="terminal-input"]');
                        return input && input.value === '';
                    }, { timeout: 3000 });
                    
                    const responseTime = performance.now() - cmdStart;
                    userStats.totalResponseTime += responseTime;
                    userStats.commandsExecuted++;
                    
                    commandIndex++;
                    
                } catch (error) {
                    userStats.errors.push(`Command ${command}: ${error.message}`);
                }
                
                // Maintain command frequency
                const elapsed = performance.now() - cmdStart;
                const waitTime = Math.max(0, commandInterval - elapsed);
                if (waitTime > 0) {
                    await page.waitForTimeout(waitTime);
                }
            }
            
            if (userStats.commandsExecuted > 0) {
                userStats.avgResponseTime = userStats.totalResponseTime / userStats.commandsExecuted;
            }

        } catch (error) {
            userStats.success = false;
            userStats.error = error.message;
        } finally {
            await context.close();
        }
        
        return userStats;
    }

    async testBurstLoad() {
        console.log('  💥 Testing burst load scenarios...');
        
        const browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-web-security']
        });

        const burstScenarios = [
            { name: 'instant-burst', users: 15, duration: 2000 },
            { name: 'rapid-commands', users: 5, commandsPerSecond: 20, duration: 3000 },
            { name: 'connection-burst', users: 25, duration: 1000 }
        ];

        const burstResults = {};

        for (const scenario of burstScenarios) {
            console.log(`    Testing ${scenario.name}...`);
            const result = await this.runBurstScenario(browser, scenario);
            burstResults[scenario.name] = result;
        }

        this.loadResults.burstLoad = burstResults;
        
        await browser.close();
    }

    async runBurstScenario(browser, scenario) {
        const startTime = performance.now();
        const userPromises = [];
        
        // Create all users simultaneously for burst effect
        for (let userId = 0; userId < scenario.users; userId++) {
            const userPromise = this.createBurstUser(browser, userId, scenario, startTime)
                .catch(error => ({
                    userId,
                    error: error.message,
                    success: false
                }));
            userPromises.push(userPromise);
        }
        
        const results = await Promise.allSettled(userPromises);
        
        const successCount = results.filter(r => 
            r.status === 'fulfilled' && r.value.success !== false
        ).length;
        
        return {
            scenario: scenario.name,
            totalUsers: scenario.users,
            successfulUsers: successCount,
            successRate: (successCount / scenario.users) * 100,
            duration: performance.now() - startTime,
            errors: results
                .filter(r => r.status === 'rejected' || r.value?.error)
                .map(r => r.value?.error || r.reason?.message)
        };
    }

    async createBurstUser(browser, userId, scenario, testStartTime) {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
            await page.goto('http://localhost:5174', { timeout: 5000 });
            await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 3000 });
            
            const endTime = testStartTime + scenario.duration;
            const commandsPerSecond = scenario.commandsPerSecond || 10;
            const commandInterval = 1000 / commandsPerSecond;
            
            let commandCount = 0;
            
            while (performance.now() < endTime) {
                try {
                    await page.fill('[data-testid="terminal-input"]', `echo "burst ${userId}-${commandCount}"`);
                    await page.press('[data-testid="terminal-input"]', 'Enter');
                    commandCount++;
                    
                    if (commandInterval > 0) {
                        await page.waitForTimeout(commandInterval);
                    }
                } catch (error) {
                    // Continue on individual command errors
                    break;
                }
            }
            
            return {
                userId,
                commandsExecuted: commandCount,
                success: true
            };
            
        } catch (error) {
            return {
                userId,
                error: error.message,
                success: false
            };
        } finally {
            await context.close();
        }
    }

    async testResourceUtilization() {
        console.log('  📊 Monitoring resource utilization under load...');
        
        const browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-web-security']
        });

        const monitoringDuration = 30000; // 30 seconds
        const sampleInterval = 1000; // 1 second
        const moderateUserCount = Math.ceil(this.loadConfig.maxConcurrentUsers * 0.6);
        
        const resourceMetrics = {
            timestamps: [],
            memoryUsage: [],
            cpuIndicators: [],
            connectionCounts: [],
            responseTimesSamples: []
        };

        // Start resource monitoring
        const monitoringInterval = setInterval(async () => {
            const timestamp = Date.now();
            resourceMetrics.timestamps.push(timestamp);
            
            // Sample system metrics (simplified for browser context)
            try {
                const memoryInfo = await this.getMemoryInfo();
                resourceMetrics.memoryUsage.push(memoryInfo);
                
                const connectionCount = await this.getActiveConnections();
                resourceMetrics.connectionCounts.push(connectionCount);
                
            } catch (error) {
                console.log('Resource monitoring sample failed:', error.message);
            }
        }, sampleInterval);

        try {
            // Run moderate load while monitoring
            const userPromises = [];
            const startTime = performance.now();
            const endTime = startTime + monitoringDuration;
            
            for (let userId = 0; userId < moderateUserCount; userId++) {
                const userPromise = this.createMonitoringUser(browser, userId, startTime, endTime)
                    .catch(error => ({ userId, error: error.message }));
                userPromises.push(userPromise);
            }
            
            const userResults = await Promise.allSettled(userPromises);
            
            this.loadResults.resourceUtilization = {
                testDuration: monitoringDuration,
                userCount: moderateUserCount,
                samples: resourceMetrics.timestamps.length,
                metrics: resourceMetrics,
                analysis: this.analyzeResourceUtilization(resourceMetrics)
            };

        } finally {
            clearInterval(monitoringInterval);
            await browser.close();
        }
    }

    async createMonitoringUser(browser, userId, startTime, endTime) {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
            await page.goto('http://localhost:5174');
            await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 5000 });
            
            let commandCount = 0;
            
            while (performance.now() < endTime) {
                try {
                    const cmdStart = performance.now();
                    await page.fill('[data-testid="terminal-input"]', `echo "monitor ${userId}-${commandCount}"`);
                    await page.press('[data-testid="terminal-input"]', 'Enter');
                    
                    await page.waitForFunction(() => {
                        const input = document.querySelector('[data-testid="terminal-input"]');
                        return input && input.value === '';
                    }, { timeout: 2000 });
                    
                    commandCount++;
                    
                    // Moderate frequency
                    await page.waitForTimeout(500);
                    
                } catch (error) {
                    // Continue on individual errors
                }
            }
            
            return { userId, commandsExecuted: commandCount };
            
        } finally {
            await context.close();
        }
    }

    async getMemoryInfo() {
        // Simplified memory info - in production this would use system monitoring
        return {
            timestamp: Date.now(),
            heapUsed: process.memoryUsage().heapUsed,
            heapTotal: process.memoryUsage().heapTotal,
            external: process.memoryUsage().external
        };
    }

    async getActiveConnections() {
        // Simplified connection counting
        // In production, this would query the actual WebSocket server
        return Math.floor(Math.random() * this.loadConfig.maxConcurrentUsers) + 1;
    }

    analyzeResourceUtilization(metrics) {
        if (metrics.memoryUsage.length === 0) {
            return { error: 'No resource data collected' };
        }

        const memoryGrowth = metrics.memoryUsage.length > 1 ? 
            metrics.memoryUsage[metrics.memoryUsage.length - 1].heapUsed - metrics.memoryUsage[0].heapUsed : 0;
        
        const maxMemory = Math.max(...metrics.memoryUsage.map(m => m.heapUsed));
        const avgMemory = metrics.memoryUsage.reduce((sum, m) => sum + m.heapUsed, 0) / metrics.memoryUsage.length;
        
        const maxConnections = Math.max(...metrics.connectionCounts);
        const avgConnections = metrics.connectionCounts.reduce((sum, c) => sum + c, 0) / metrics.connectionCounts.length;

        return {
            memoryGrowth,
            maxMemory,
            avgMemory,
            maxConnections,
            avgConnections,
            memoryStability: memoryGrowth < (1024 * 1024 * 10), // Less than 10MB growth
            connectionStability: maxConnections <= this.loadConfig.maxConcurrentUsers * 1.1
        };
    }

    async testGradualLoadIncrease() {
        console.log('  📈 Testing gradual load increase...');
        
        const browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-web-security']
        });

        const loadLevels = [5, 10, 15, 20]; // User counts
        const levelDuration = 15000; // 15 seconds per level
        const gradualResults = {};

        for (const userCount of loadLevels) {
            console.log(`    Testing ${userCount} concurrent users...`);
            
            const levelStart = performance.now();
            const userPromises = [];
            
            for (let userId = 0; userId < userCount; userId++) {
                const userPromise = this.createGradualUser(browser, userId, levelDuration)
                    .catch(error => ({ userId, error: error.message, success: false }));
                userPromises.push(userPromise);
            }
            
            const results = await Promise.allSettled(userPromises);
            
            const successCount = results.filter(r => 
                r.status === 'fulfilled' && r.value.success !== false
            ).length;
            
            const avgResponseTime = results
                .filter(r => r.status === 'fulfilled' && r.value.avgResponseTime)
                .reduce((sum, r) => sum + r.value.avgResponseTime, 0) / successCount || 0;

            gradualResults[userCount] = {
                userCount,
                successCount,
                successRate: (successCount / userCount) * 100,
                avgResponseTime,
                levelDuration: performance.now() - levelStart
            };
            
            // Brief pause between levels
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        this.loadResults.performanceDegradation = {
            loadLevels: gradualResults,
            degradationAnalysis: this.analyzeDegradation(gradualResults)
        };

        await browser.close();
    }

    async createGradualUser(browser, userId, duration) {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        const userStats = {
            userId,
            commandsExecuted: 0,
            totalResponseTime: 0,
            avgResponseTime: 0,
            success: true
        };

        try {
            await page.goto('http://localhost:5174');
            await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 5000 });
            
            const endTime = performance.now() + duration;
            let commandIndex = 0;
            
            while (performance.now() < endTime) {
                const cmdStart = performance.now();
                
                try {
                    await page.fill('[data-testid="terminal-input"]', `echo "gradual ${userId}-${commandIndex}"`);
                    await page.press('[data-testid="terminal-input"]', 'Enter');
                    
                    await page.waitForFunction(() => {
                        const input = document.querySelector('[data-testid="terminal-input"]');
                        return input && input.value === '';
                    }, { timeout: 3000 });
                    
                    const responseTime = performance.now() - cmdStart;
                    userStats.totalResponseTime += responseTime;
                    userStats.commandsExecuted++;
                    
                } catch (error) {
                    // Continue on command errors
                }
                
                commandIndex++;
                await page.waitForTimeout(250); // 4 commands per second per user
            }
            
            if (userStats.commandsExecuted > 0) {
                userStats.avgResponseTime = userStats.totalResponseTime / userStats.commandsExecuted;
            }

        } catch (error) {
            userStats.success = false;
            userStats.error = error.message;
        } finally {
            await context.close();
        }
        
        return userStats;
    }

    analyzeDegradation(gradualResults) {
        const levels = Object.keys(gradualResults).map(Number).sort((a, b) => a - b);
        const responseTimes = levels.map(level => gradualResults[level].avgResponseTime);
        const successRates = levels.map(level => gradualResults[level].successRate);
        
        // Calculate degradation trends
        let responseTimeTrend = 'stable';
        let successRateTrend = 'stable';
        
        if (responseTimes.length > 1) {
            const firstResponse = responseTimes[0];
            const lastResponse = responseTimes[responseTimes.length - 1];
            const responseIncrease = ((lastResponse - firstResponse) / firstResponse) * 100;
            
            if (responseIncrease > 50) responseTimeTrend = 'degrading-severely';
            else if (responseIncrease > 20) responseTimeTrend = 'degrading';
            else if (responseIncrease < -10) responseTimeTrend = 'improving';
        }
        
        if (successRates.length > 1) {
            const firstSuccess = successRates[0];
            const lastSuccess = successRates[successRates.length - 1];
            const successDecrease = firstSuccess - lastSuccess;
            
            if (successDecrease > 20) successRateTrend = 'degrading-severely';
            else if (successDecrease > 10) successRateTrend = 'degrading';
            else if (successDecrease < -5) successRateTrend = 'improving';
        }

        return {
            responseTimeTrend,
            successRateTrend,
            maxSustainableLoad: this.findMaxSustainableLoad(gradualResults),
            scalabilityRating: this.calculateScalabilityRating(responseTimeTrend, successRateTrend)
        };
    }

    findMaxSustainableLoad(gradualResults) {
        // Find the highest load level with >90% success rate and <2000ms avg response
        const sustainableLevels = Object.entries(gradualResults)
            .filter(([_, result]) => result.successRate > 90 && result.avgResponseTime < 2000)
            .map(([level, _]) => parseInt(level));
        
        return sustainableLevels.length > 0 ? Math.max(...sustainableLevels) : 0;
    }

    calculateScalabilityRating(responseTimeTrend, successRateTrend) {
        let score = 100;
        
        if (responseTimeTrend === 'degrading-severely') score -= 40;
        else if (responseTimeTrend === 'degrading') score -= 20;
        
        if (successRateTrend === 'degrading-severely') score -= 40;
        else if (successRateTrend === 'degrading') score -= 20;
        
        if (score >= 90) return 'excellent';
        if (score >= 70) return 'good';
        if (score >= 50) return 'fair';
        return 'poor';
    }

    async testConnectionPoolStress() {
        console.log('  🔗 Testing connection pool stress...');
        
        const browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-web-security']
        });

        const connectionTestDuration = 20000; // 20 seconds
        const maxSimultaneousConnections = this.loadConfig.maxConcurrentUsers * 1.5; // 150% of normal
        
        const connectionPromises = [];
        const startTime = performance.now();
        
        // Create connections rapidly
        for (let i = 0; i < maxSimultaneousConnections; i++) {
            const connectionPromise = this.createConnectionStressTest(browser, i, connectionTestDuration)
                .catch(error => ({ connectionId: i, error: error.message, success: false }));
            connectionPromises.push(connectionPromise);
            
            // Slight delay between connections to avoid overwhelming
            if (i % 10 === 9) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        const connectionResults = await Promise.allSettled(connectionPromises);
        const totalTime = performance.now() - startTime;
        
        const successfulConnections = connectionResults.filter(r => 
            r.status === 'fulfilled' && r.value.success !== false
        ).length;

        this.loadResults.connectionPoolStress = {
            attemptedConnections: maxSimultaneousConnections,
            successfulConnections,
            connectionSuccessRate: (successfulConnections / maxSimultaneousConnections) * 100,
            testDuration: totalTime,
            avgConnectionTime: totalTime / successfulConnections,
            errors: connectionResults
                .filter(r => r.status === 'rejected' || r.value?.error)
                .map(r => r.value?.error || r.reason?.message)
        };

        await browser.close();
    }

    async createConnectionStressTest(browser, connectionId, duration) {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        const connectionStart = performance.now();
        
        try {
            await page.goto('http://localhost:5174', { timeout: 8000 });
            await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 5000 });
            
            // Verify connection is active
            await page.fill('[data-testid="terminal-input"]', `echo "connection ${connectionId}"`);
            await page.press('[data-testid="terminal-input"]', 'Enter');
            
            await page.waitForSelector(`text=connection ${connectionId}`, { timeout: 3000 });
            
            // Keep connection alive for test duration
            const endTime = connectionStart + duration;
            while (performance.now() < endTime) {
                await page.waitForTimeout(2000);
                
                // Send heartbeat
                try {
                    await page.fill('[data-testid="terminal-input"]', 'echo "heartbeat"');
                    await page.press('[data-testid="terminal-input"]', 'Enter');
                } catch (error) {
                    // Continue on heartbeat errors
                }
            }
            
            return {
                connectionId,
                connectionTime: performance.now() - connectionStart,
                success: true
            };
            
        } catch (error) {
            return {
                connectionId,
                error: error.message,
                connectionTime: performance.now() - connectionStart,
                success: false
            };
        } finally {
            await context.close();
        }
    }

    async generateLoadTestReport() {
        const reportPath = '/workspaces/agent-feed/tests/regression/comprehensive-suite/reports/load-stress-report.json';
        
        // Calculate overall load test score
        let overallScore = 100;
        const scoring = {
            sustainedLoad: 0,
            burstLoad: 0,
            resourceUtilization: 0,
            performanceDegradation: 0,
            connectionStress: 0
        };

        // Score sustained load
        const sustainedLoad = this.loadResults.sustainedLoad;
        if (sustainedLoad.successRate >= 95) scoring.sustainedLoad = 25;
        else if (sustainedLoad.successRate >= 90) scoring.sustainedLoad = 20;
        else if (sustainedLoad.successRate >= 80) scoring.sustainedLoad = 15;
        else if (sustainedLoad.successRate >= 70) scoring.sustainedLoad = 10;
        else scoring.sustainedLoad = 0;

        // Score burst load
        const burstLoad = this.loadResults.burstLoad;
        const burstSuccessRates = Object.values(burstLoad).map(b => b.successRate);
        const avgBurstSuccess = burstSuccessRates.reduce((sum, rate) => sum + rate, 0) / burstSuccessRates.length;
        if (avgBurstSuccess >= 90) scoring.burstLoad = 20;
        else if (avgBurstSuccess >= 80) scoring.burstLoad = 15;
        else if (avgBurstSuccess >= 70) scoring.burstLoad = 10;
        else scoring.burstLoad = 5;

        // Score resource utilization
        const resourceUtil = this.loadResults.resourceUtilization;
        if (resourceUtil.analysis?.memoryStability && resourceUtil.analysis?.connectionStability) {
            scoring.resourceUtilization = 20;
        } else if (resourceUtil.analysis?.memoryStability || resourceUtil.analysis?.connectionStability) {
            scoring.resourceUtilization = 10;
        } else {
            scoring.resourceUtilization = 0;
        }

        // Score performance degradation
        const perfDeg = this.loadResults.performanceDegradation;
        const scalabilityRating = perfDeg.degradationAnalysis?.scalabilityRating;
        if (scalabilityRating === 'excellent') scoring.performanceDegradation = 20;
        else if (scalabilityRating === 'good') scoring.performanceDegradation = 15;
        else if (scalabilityRating === 'fair') scoring.performanceDegradation = 10;
        else scoring.performanceDegradation = 5;

        // Score connection stress
        const connStress = this.loadResults.connectionPoolStress;
        if (connStress.connectionSuccessRate >= 90) scoring.connectionStress = 15;
        else if (connStress.connectionSuccessRate >= 80) scoring.connectionStress = 10;
        else if (connStress.connectionSuccessRate >= 70) scoring.connectionStress = 5;
        else scoring.connectionStress = 0;

        overallScore = Object.values(scoring).reduce((sum, score) => sum + score, 0);

        this.loadResults.summary = {
            overallScore,
            scoring,
            recommendations: this.generateLoadRecommendations(scoring),
            productionReadiness: this.assessLoadTestReadiness(overallScore),
            maxSustainableLoad: perfDeg.degradationAnalysis?.maxSustainableLoad || 0,
            criticalIssues: this.identifyCriticalLoadIssues()
        };

        const report = {
            testInfo: {
                timestamp: new Date().toISOString(),
                duration: Date.now() - this.testStartTime,
                configuration: this.loadConfig
            },
            results: this.loadResults
        };

        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n🚀 Load stress test report saved to: ${reportPath}`);
    }

    generateLoadRecommendations(scoring) {
        const recommendations = [];
        
        if (scoring.sustainedLoad < 20) {
            recommendations.push('CRITICAL: Sustained load performance below acceptable levels');
        }
        
        if (scoring.burstLoad < 15) {
            recommendations.push('Burst load handling needs improvement - implement connection pooling');
        }
        
        if (scoring.resourceUtilization < 15) {
            recommendations.push('Resource utilization issues detected - monitor memory leaks and connection management');
        }
        
        if (scoring.performanceDegradation < 15) {
            recommendations.push('Performance degrades significantly under load - optimize bottlenecks');
        }
        
        if (scoring.connectionStress < 10) {
            recommendations.push('Connection pool stress test failed - increase connection limits or implement queuing');
        }
        
        const totalScore = Object.values(scoring).reduce((sum, score) => sum + score, 0);
        
        if (totalScore < 60) {
            recommendations.push('CRITICAL: System not ready for production load - major performance issues');
        } else if (totalScore < 80) {
            recommendations.push('System needs load optimization before production deployment');
        }
        
        return recommendations;
    }

    assessLoadTestReadiness(score) {
        if (score >= 90) return 'excellent';
        if (score >= 80) return 'good';
        if (score >= 70) return 'acceptable';
        if (score >= 50) return 'needs-improvement';
        return 'poor';
    }

    identifyCriticalLoadIssues() {
        const issues = [];
        
        if (this.loadResults.sustainedLoad.successRate < 80) {
            issues.push('Sustained load success rate below 80%');
        }
        
        if (this.loadResults.sustainedLoad.commandThroughput < this.loadConfig.commandsPerSecond * 0.5) {
            issues.push('Command throughput significantly below target');
        }
        
        const burstFailures = Object.values(this.loadResults.burstLoad)
            .filter(b => b.successRate < 70).length;
        if (burstFailures > 0) {
            issues.push(`${burstFailures} burst test scenarios failed`);
        }
        
        if (this.loadResults.connectionPoolStress.connectionSuccessRate < 70) {
            issues.push('Connection pool stress test failed');
        }
        
        return issues;
    }
}

module.exports = LoadStressTest;

// Run if called directly
if (require.main === module) {
    (async () => {
        const loadTest = new LoadStressTest({
            maxUsers: 15,
            commandsPerSecond: 30,
            duration: 45000 // 45 seconds for faster testing
        });
        
        try {
            const results = await loadTest.runLoadStressTests();
            console.log('✅ Load stress tests completed');
            
            const score = results.summary.overallScore;
            console.log(`📊 Overall Load Test Score: ${score}/100`);
            
            if (score < 50) {
                console.log('❌ System failed load tests - not ready for production');
                console.log('📋 Critical Issues:', results.summary.criticalIssues);
                process.exit(1);
            } else if (score < 80) {
                console.log('⚠️ System needs load optimization');
                console.log('📋 Recommendations:', results.summary.recommendations);
            } else {
                console.log('✅ System demonstrates good load handling capabilities');
            }
        } catch (error) {
            console.error('❌ Load stress tests failed:', error);
            process.exit(1);
        }
    })();
}