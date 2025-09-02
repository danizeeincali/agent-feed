/**
 * Long-Running Stability Test Suite
 * Monitors system stability over extended periods
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;

class StabilityMonitor {
    constructor(options = {}) {
        this.config = {
            testDuration: options.duration || 300000, // 5 minutes (reduced for CI)
            sampleInterval: options.sampleInterval || 5000, // 5 seconds
            userCount: options.userCount || 3, // Reduced for stability
            commandFrequency: options.commandFrequency || 2000, // Every 2 seconds
            memoryThreshold: options.memoryThreshold || 100 * 1024 * 1024, // 100MB
            responseTimeThreshold: options.responseTimeThreshold || 5000 // 5 seconds
        };
        this.stabilityResults = {
            overallStability: {},
            memoryTrend: {},
            performanceTrend: {},
            errorPatterns: {},
            degradationPoints: [],
            summary: {}
        };
        this.testStartTime = Date.now();
        this.samples = [];
        this.errorLog = [];
        this.isMonitoring = true;
    }

    async runStabilityTests() {
        console.log('⏱️ Starting Long-Running Stability Tests...');
        console.log(`Configuration:
    - Test Duration: ${this.config.testDuration}ms
    - Sample Interval: ${this.config.sampleInterval}ms
    - Concurrent Users: ${this.config.userCount}
    - Command Frequency: ${this.config.commandFrequency}ms`);
        
        const browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-web-security', '--max_old_space_size=2048']
        });

        try {
            // Start monitoring
            const monitoringPromise = this.startContinuousMonitoring();
            
            // Start user simulation
            const userPromises = [];
            for (let userId = 0; userId < this.config.userCount; userId++) {
                const userPromise = this.createLongRunningUser(browser, userId)
                    .catch(error => ({
                        userId,
                        error: error.message,
                        success: false
                    }));
                userPromises.push(userPromise);
            }
            
            // Wait for test completion
            const [monitoringResults, ...userResults] = await Promise.all([
                monitoringPromise,
                ...userPromises
            ]);
            
            // Stop monitoring
            this.isMonitoring = false;
            
            // Analyze results
            await this.analyzeStabilityResults(userResults);
            await this.generateStabilityReport();
            
        } finally {
            await browser.close();
        }

        return this.stabilityResults;
    }

    async startContinuousMonitoring() {
        console.log('  📊 Starting continuous monitoring...');
        
        const startTime = performance.now();
        const endTime = startTime + this.config.testDuration;
        let sampleCount = 0;
        
        while (this.isMonitoring && performance.now() < endTime) {
            const sampleStart = performance.now();
            
            try {
                const sample = await this.collectSample(sampleCount);
                this.samples.push(sample);
                sampleCount++;
                
                // Check for degradation
                if (sampleCount > 5) {
                    const degradation = this.detectDegradation(sample);
                    if (degradation) {
                        this.stabilityResults.degradationPoints.push(degradation);
                    }
                }
                
                // Log progress
                if (sampleCount % 10 === 0) {
                    const elapsed = performance.now() - startTime;
                    const progress = (elapsed / this.config.testDuration) * 100;
                    console.log(`    Progress: ${progress.toFixed(1)}% (${sampleCount} samples)`);
                }
                
            } catch (error) {
                this.errorLog.push({
                    timestamp: Date.now(),
                    error: error.message,
                    sampleCount
                });
            }
            
            // Wait for next sample interval
            const sampleDuration = performance.now() - sampleStart;
            const waitTime = Math.max(0, this.config.sampleInterval - sampleDuration);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        return {
            totalSamples: sampleCount,
            duration: performance.now() - startTime
        };
    }

    async collectSample(sampleIndex) {
        const timestamp = Date.now();
        
        // Collect memory information
        const memoryUsage = process.memoryUsage();
        
        // Collect system metrics (simplified)
        const sample = {
            timestamp,
            sampleIndex,
            memory: {
                heapUsed: memoryUsage.heapUsed,
                heapTotal: memoryUsage.heapTotal,
                external: memoryUsage.external,
                rss: memoryUsage.rss
            },
            performance: {
                uptime: process.uptime(),
                // Add more metrics as needed
            },
            activeUsers: this.config.userCount,
            errorCount: this.errorLog.filter(e => e.timestamp > timestamp - this.config.sampleInterval).length
        };
        
        return sample;
    }

    detectDegradation(currentSample) {
        const recentSamples = this.samples.slice(-10); // Last 10 samples
        if (recentSamples.length < 5) return null;
        
        const degradationIssues = [];
        
        // Memory degradation
        const memoryTrend = this.calculateTrend(recentSamples, s => s.memory.heapUsed);
        if (memoryTrend.slope > 1024 * 1024) { // 1MB per sample increasing
            degradationIssues.push({
                type: 'memory-growth',
                severity: memoryTrend.slope > 5 * 1024 * 1024 ? 'critical' : 'warning',
                trend: memoryTrend
            });
        }
        
        // Error rate increase
        const errorTrend = this.calculateTrend(recentSamples, s => s.errorCount);
        if (errorTrend.slope > 0.1) { // Increasing error rate
            degradationIssues.push({
                type: 'error-increase',
                severity: errorTrend.slope > 1 ? 'critical' : 'warning',
                trend: errorTrend
            });
        }
        
        if (degradationIssues.length > 0) {
            return {
                timestamp: currentSample.timestamp,
                sampleIndex: currentSample.sampleIndex,
                issues: degradationIssues
            };
        }
        
        return null;
    }

    calculateTrend(samples, valueExtractor) {
        if (samples.length < 2) {
            return { slope: 0, correlation: 0 };
        }
        
        const n = samples.length;
        const x = samples.map((_, i) => i);
        const y = samples.map(valueExtractor);
        
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumXX = x.reduce((sum, val) => sum + val * val, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        
        return { slope, correlation: this.calculateCorrelation(x, y) };
    }

    calculateCorrelation(x, y) {
        const n = x.length;
        if (n === 0) return 0;
        
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumXX = x.reduce((sum, val) => sum + val * val, 0);
        const sumYY = y.reduce((sum, val) => sum + val * val, 0);
        
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
        
        return denominator === 0 ? 0 : numerator / denominator;
    }

    async createLongRunningUser(browser, userId) {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        const userStats = {
            userId,
            startTime: performance.now(),
            commandsExecuted: 0,
            errors: [],
            responseTimes: [],
            success: true
        };

        try {
            await page.goto('http://localhost:5174', { timeout: 10000 });
            await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 5000 });
            
            const endTime = performance.now() + this.config.testDuration;
            let commandIndex = 0;
            
            const commands = [
                'echo "stability test"',
                'pwd',
                'date',
                'whoami',
                'echo $USER',
                'ls -la .',
                'echo "long running test"'
            ];
            
            while (performance.now() < endTime && this.isMonitoring) {
                const command = commands[commandIndex % commands.length];
                const cmdStart = performance.now();
                
                try {
                    await page.fill('[data-testid="terminal-input"]', `${command} ${userId}-${commandIndex}`);
                    await page.press('[data-testid="terminal-input"]', 'Enter');
                    
                    // Wait for command completion with timeout
                    await page.waitForFunction(() => {
                        const input = document.querySelector('[data-testid="terminal-input"]');
                        return input && input.value === '';
                    }, { timeout: this.config.responseTimeThreshold });
                    
                    const responseTime = performance.now() - cmdStart;
                    userStats.responseTimes.push(responseTime);
                    userStats.commandsExecuted++;
                    
                    // Check for performance degradation
                    if (responseTime > this.config.responseTimeThreshold) {
                        userStats.errors.push({
                            type: 'slow-response',
                            command,
                            responseTime,
                            timestamp: Date.now()
                        });
                    }
                    
                } catch (error) {
                    userStats.errors.push({
                        type: 'command-error',
                        command,
                        error: error.message,
                        timestamp: Date.now()
                    });
                }
                
                commandIndex++;
                
                // Wait between commands
                await page.waitForTimeout(this.config.commandFrequency);
            }
            
            userStats.totalTime = performance.now() - userStats.startTime;
            userStats.avgResponseTime = userStats.responseTimes.length > 0 
                ? userStats.responseTimes.reduce((sum, time) => sum + time, 0) / userStats.responseTimes.length 
                : 0;

        } catch (error) {
            userStats.success = false;
            userStats.error = error.message;
        } finally {
            await context.close();
        }
        
        return userStats;
    }

    async analyzeStabilityResults(userResults) {
        console.log('  📈 Analyzing stability results...');
        
        // Overall stability analysis
        const successfulUsers = userResults.filter(u => u.success !== false);
        const failedUsers = userResults.filter(u => u.success === false);
        
        this.stabilityResults.overallStability = {
            totalUsers: userResults.length,
            successfulUsers: successfulUsers.length,
            failedUsers: failedUsers.length,
            userSuccessRate: (successfulUsers.length / userResults.length) * 100,
            totalCommands: successfulUsers.reduce((sum, u) => sum + (u.commandsExecuted || 0), 0),
            totalErrors: successfulUsers.reduce((sum, u) => sum + (u.errors?.length || 0), 0),
            avgCommandsPerUser: successfulUsers.reduce((sum, u) => sum + (u.commandsExecuted || 0), 0) / successfulUsers.length,
            avgResponseTime: successfulUsers.reduce((sum, u) => sum + (u.avgResponseTime || 0), 0) / successfulUsers.length
        };
        
        // Memory trend analysis
        if (this.samples.length > 0) {
            const memoryValues = this.samples.map(s => s.memory.heapUsed);
            const memoryTrend = this.calculateTrend(this.samples, s => s.memory.heapUsed);
            
            this.stabilityResults.memoryTrend = {
                initialMemory: memoryValues[0],
                finalMemory: memoryValues[memoryValues.length - 1],
                maxMemory: Math.max(...memoryValues),
                avgMemory: memoryValues.reduce((sum, val) => sum + val, 0) / memoryValues.length,
                memoryGrowth: memoryValues[memoryValues.length - 1] - memoryValues[0],
                growthTrend: memoryTrend,
                isStable: Math.abs(memoryTrend.slope) < 1024 * 1024, // Less than 1MB per sample
                exceedsThreshold: Math.max(...memoryValues) > this.config.memoryThreshold
            };
        }
        
        // Performance trend analysis
        const allResponseTimes = successfulUsers.flatMap(u => u.responseTimes || []);
        if (allResponseTimes.length > 0) {
            const timeWindows = this.createTimeWindows(successfulUsers);
            
            this.stabilityResults.performanceTrend = {
                overallAvgResponse: allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length,
                overallMaxResponse: Math.max(...allResponseTimes),
                overallMinResponse: Math.min(...allResponseTimes),
                timeWindows,
                performanceDegradation: this.detectPerformanceDegradation(timeWindows),
                responseTimeStability: this.calculateResponseTimeStability(allResponseTimes)
            };
        }
        
        // Error pattern analysis
        const allErrors = successfulUsers.flatMap(u => u.errors || []);
        this.stabilityResults.errorPatterns = this.analyzeErrorPatterns(allErrors);
    }

    createTimeWindows(userResults) {
        const windowSize = this.config.testDuration / 10; // 10 windows
        const windows = [];
        
        for (let i = 0; i < 10; i++) {
            const windowStart = i * windowSize;
            const windowEnd = (i + 1) * windowSize;
            
            const windowResponses = [];
            userResults.forEach(user => {
                if (user.responseTimes) {
                    // This is simplified - in reality we'd need timestamps for each response
                    const startIndex = Math.floor((user.responseTimes.length * i) / 10);
                    const endIndex = Math.floor((user.responseTimes.length * (i + 1)) / 10);
                    windowResponses.push(...user.responseTimes.slice(startIndex, endIndex));
                }
            });
            
            if (windowResponses.length > 0) {
                windows.push({
                    windowIndex: i,
                    startTime: windowStart,
                    endTime: windowEnd,
                    responseCount: windowResponses.length,
                    avgResponseTime: windowResponses.reduce((sum, time) => sum + time, 0) / windowResponses.length,
                    maxResponseTime: Math.max(...windowResponses),
                    minResponseTime: Math.min(...windowResponses)
                });
            }
        }
        
        return windows;
    }

    detectPerformanceDegradation(timeWindows) {
        if (timeWindows.length < 3) return { degraded: false };
        
        const firstThird = timeWindows.slice(0, Math.ceil(timeWindows.length / 3));
        const lastThird = timeWindows.slice(-Math.ceil(timeWindows.length / 3));
        
        const firstThirdAvg = firstThird.reduce((sum, w) => sum + w.avgResponseTime, 0) / firstThird.length;
        const lastThirdAvg = lastThird.reduce((sum, w) => sum + w.avgResponseTime, 0) / lastThird.length;
        
        const degradationPercentage = ((lastThirdAvg - firstThirdAvg) / firstThirdAvg) * 100;
        
        return {
            degraded: degradationPercentage > 25, // 25% performance degradation
            degradationPercentage,
            firstThirdAvg,
            lastThirdAvg,
            severity: degradationPercentage > 50 ? 'severe' : degradationPercentage > 25 ? 'moderate' : 'none'
        };
    }

    calculateResponseTimeStability(responseTimes) {
        if (responseTimes.length === 0) return { stable: true, variance: 0 };
        
        const mean = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / responseTimes.length;
        const standardDeviation = Math.sqrt(variance);
        const coefficientOfVariation = mean === 0 ? 0 : (standardDeviation / mean) * 100;
        
        return {
            stable: coefficientOfVariation < 30, // Less than 30% variation is considered stable
            variance,
            standardDeviation,
            coefficientOfVariation,
            mean
        };
    }

    analyzeErrorPatterns(allErrors) {
        const errorTypes = {};
        const errorTimeline = [];
        
        allErrors.forEach(error => {
            // Count error types
            const errorType = error.type || 'unknown';
            errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
            
            // Build error timeline
            errorTimeline.push({
                timestamp: error.timestamp,
                type: errorType,
                details: error.error || error.command
            });
        });
        
        // Sort timeline by timestamp
        errorTimeline.sort((a, b) => a.timestamp - b.timestamp);
        
        // Detect error clusters
        const errorClusters = this.detectErrorClusters(errorTimeline);
        
        return {
            totalErrors: allErrors.length,
            errorTypes,
            errorTimeline,
            errorClusters,
            errorRate: (allErrors.length / this.stabilityResults.overallStability.totalCommands) * 100,
            mostCommonError: Object.keys(errorTypes).reduce((a, b) => errorTypes[a] > errorTypes[b] ? a : b, null)
        };
    }

    detectErrorClusters(errorTimeline) {
        if (errorTimeline.length < 3) return [];
        
        const clusters = [];
        const clusterWindow = 30000; // 30 seconds
        
        let currentCluster = null;
        
        errorTimeline.forEach(error => {
            if (!currentCluster) {
                currentCluster = {
                    startTime: error.timestamp,
                    endTime: error.timestamp,
                    errors: [error]
                };
            } else if (error.timestamp - currentCluster.endTime <= clusterWindow) {
                // Add to current cluster
                currentCluster.endTime = error.timestamp;
                currentCluster.errors.push(error);
            } else {
                // Close current cluster and start new one
                if (currentCluster.errors.length >= 3) {
                    clusters.push(currentCluster);
                }
                currentCluster = {
                    startTime: error.timestamp,
                    endTime: error.timestamp,
                    errors: [error]
                };
            }
        });
        
        // Add final cluster if it has enough errors
        if (currentCluster && currentCluster.errors.length >= 3) {
            clusters.push(currentCluster);
        }
        
        return clusters;
    }

    async generateStabilityReport() {
        const reportPath = '/workspaces/agent-feed/tests/regression/comprehensive-suite/reports/stability-report.json';
        
        // Calculate stability score
        let stabilityScore = 100;
        const scoring = {};
        
        // User success rate (30 points)
        const userSuccessRate = this.stabilityResults.overallStability.userSuccessRate;
        if (userSuccessRate >= 95) scoring.userSuccess = 30;
        else if (userSuccessRate >= 90) scoring.userSuccess = 25;
        else if (userSuccessRate >= 80) scoring.userSuccess = 20;
        else scoring.userSuccess = 10;
        
        // Memory stability (25 points)
        const memoryStable = this.stabilityResults.memoryTrend?.isStable;
        const memoryExceeds = this.stabilityResults.memoryTrend?.exceedsThreshold;
        if (memoryStable && !memoryExceeds) scoring.memory = 25;
        else if (memoryStable || !memoryExceeds) scoring.memory = 15;
        else scoring.memory = 5;
        
        // Performance stability (25 points)
        const perfDegradation = this.stabilityResults.performanceTrend?.performanceDegradation;
        const responseStability = this.stabilityResults.performanceTrend?.responseTimeStability;
        if (!perfDegradation?.degraded && responseStability?.stable) scoring.performance = 25;
        else if (!perfDegradation?.degraded || responseStability?.stable) scoring.performance = 15;
        else scoring.performance = 5;
        
        // Error rate (20 points)
        const errorRate = this.stabilityResults.errorPatterns.errorRate || 0;
        if (errorRate < 1) scoring.errors = 20;
        else if (errorRate < 3) scoring.errors = 15;
        else if (errorRate < 5) scoring.errors = 10;
        else scoring.errors = 0;
        
        stabilityScore = Object.values(scoring).reduce((sum, score) => sum + score, 0);
        
        this.stabilityResults.summary = {
            stabilityScore,
            scoring,
            recommendations: this.generateStabilityRecommendations(scoring),
            productionReadiness: this.assessStabilityReadiness(stabilityScore),
            criticalIssues: this.identifyCriticalStabilityIssues(),
            testDuration: Date.now() - this.testStartTime,
            samplesCollected: this.samples.length,
            degradationEvents: this.stabilityResults.degradationPoints.length
        };
        
        const report = {
            testInfo: {
                timestamp: new Date().toISOString(),
                duration: Date.now() - this.testStartTime,
                configuration: this.config
            },
            results: this.stabilityResults
        };

        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n⏱️ Stability monitoring report saved to: ${reportPath}`);
    }

    generateStabilityRecommendations(scoring) {
        const recommendations = [];
        
        if (scoring.userSuccess < 25) {
            recommendations.push('CRITICAL: User success rate too low for production stability');
        }
        
        if (scoring.memory < 20) {
            recommendations.push('Memory usage unstable or exceeds thresholds - investigate memory leaks');
        }
        
        if (scoring.performance < 20) {
            recommendations.push('Performance degrades over time - optimize for long-running scenarios');
        }
        
        if (scoring.errors < 15) {
            recommendations.push('Error rate too high for stable production operation');
        }
        
        // Specific recommendations based on degradation points
        if (this.stabilityResults.degradationPoints.length > 0) {
            recommendations.push(`${this.stabilityResults.degradationPoints.length} degradation events detected - investigate causes`);
        }
        
        const totalScore = Object.values(scoring).reduce((sum, score) => sum + score, 0);
        if (totalScore < 60) {
            recommendations.push('CRITICAL: System stability insufficient for production deployment');
        }
        
        return recommendations;
    }

    assessStabilityReadiness(score) {
        if (score >= 90) return 'excellent';
        if (score >= 80) return 'good';
        if (score >= 70) return 'acceptable';
        if (score >= 50) return 'needs-improvement';
        return 'poor';
    }

    identifyCriticalStabilityIssues() {
        const issues = [];
        
        if (this.stabilityResults.overallStability.userSuccessRate < 80) {
            issues.push('User success rate below 80%');
        }
        
        if (this.stabilityResults.memoryTrend?.exceedsThreshold) {
            issues.push('Memory usage exceeds threshold');
        }
        
        if (this.stabilityResults.performanceTrend?.performanceDegradation?.severity === 'severe') {
            issues.push('Severe performance degradation over time');
        }
        
        if (this.stabilityResults.errorPatterns.errorRate > 5) {
            issues.push('High error rate during stability test');
        }
        
        if (this.stabilityResults.degradationPoints.length > 5) {
            issues.push('Multiple degradation events detected');
        }
        
        return issues;
    }
}

module.exports = StabilityMonitor;

// Run if called directly
if (require.main === module) {
    (async () => {
        const stabilityMonitor = new StabilityMonitor({
            duration: 120000, // 2 minutes for testing
            userCount: 2,
            commandFrequency: 3000
        });
        
        try {
            const results = await stabilityMonitor.runStabilityTests();
            console.log('✅ Stability monitoring completed');
            
            const score = results.summary.stabilityScore;
            console.log(`📊 Overall Stability Score: ${score}/100`);
            
            if (score < 50) {
                console.log('❌ System stability insufficient for production');
                console.log('📋 Critical Issues:', results.summary.criticalIssues);
                process.exit(1);
            } else if (score < 80) {
                console.log('⚠️ System stability needs improvement');
                console.log('📋 Recommendations:', results.summary.recommendations);
            } else {
                console.log('✅ System demonstrates good long-term stability');
            }
        } catch (error) {
            console.error('❌ Stability monitoring failed:', error);
            process.exit(1);
        }
    })();
}