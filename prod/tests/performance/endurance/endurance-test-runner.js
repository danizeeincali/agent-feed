#!/usr/bin/env node

/**
 * Endurance Testing Suite for Agent Feed Enhancement System
 * Tests system stability and performance over extended periods
 */

import { performance } from 'perf_hooks';
import axios from 'axios';
import { createWriteStream } from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

class EnduranceTestRunner extends EventEmitter {
    constructor() {
        super();
        this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
        this.testDuration = parseInt(process.env.ENDURANCE_DURATION) || 3600000; // 1 hour default
        this.isRunning = false;
        this.metrics = {
            requests: 0,
            successes: 0,
            failures: 0,
            responseTimes: [],
            memorySnapshots: [],
            errorLog: [],
            performanceMetrics: []
        };
        this.reportPath = path.join(process.cwd(), 'reports', 'endurance-test-results.json');
        this.metricsInterval = null;
        this.testStartTime = null;
    }

    async runEnduranceTest() {
        console.log('🏃 Starting Endurance Testing Suite...');
        console.log(`⏰ Test Duration: ${(this.testDuration / 1000 / 60).toFixed(1)} minutes`);
        
        this.isRunning = true;
        this.testStartTime = performance.now();
        
        try {
            // Start metrics collection
            this.startMetricsCollection();
            
            // Start concurrent test scenarios
            await Promise.all([
                this.runContinuousPostCreation(),
                this.runContinuousDataRetrieval(),
                this.runPeriodicHealthChecks(),
                this.runMemoryMonitoring(),
                this.runPerformanceMonitoring()
            ]);
            
            // Generate final report
            await this.generateEnduranceReport();
            
            console.log('✅ Endurance test completed successfully');
            
        } catch (error) {
            console.error('❌ Endurance test failed:', error.message);
            throw error;
        } finally {
            this.isRunning = false;
            if (this.metricsInterval) {
                clearInterval(this.metricsInterval);
            }
        }
    }

    startMetricsCollection() {
        this.metricsInterval = setInterval(() => {
            if (!this.isRunning) return;
            
            const currentTime = performance.now();
            const elapsedTime = currentTime - this.testStartTime;
            const memUsage = process.memoryUsage();
            
            this.metrics.memorySnapshots.push({
                timestamp: Date.now(),
                elapsedTime: elapsedTime,
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external,
                rss: memUsage.rss
            });
            
            // Calculate current metrics
            const recentRequests = this.metrics.responseTimes.filter(rt => 
                (currentTime - rt.timestamp) < 60000 // Last minute
            );
            
            const currentMetrics = {
                timestamp: Date.now(),
                elapsedTime: elapsedTime,
                totalRequests: this.metrics.requests,
                requestsPerSecond: recentRequests.length / 60,
                successRate: this.metrics.successes / Math.max(1, this.metrics.requests) * 100,
                avgResponseTime: recentRequests.length > 0 ? 
                    recentRequests.reduce((sum, rt) => sum + rt.responseTime, 0) / recentRequests.length : 0,
                memoryUsage: memUsage.heapUsed / 1024 / 1024, // MB
                cpuUsage: process.cpuUsage()
            };
            
            this.metrics.performanceMetrics.push(currentMetrics);
            
            // Log progress every 5 minutes
            if (Math.floor(elapsedTime / 300000) > Math.floor((elapsedTime - 1000) / 300000)) {
                const minutesElapsed = (elapsedTime / 1000 / 60).toFixed(1);
                console.log(`⏱️  ${minutesElapsed}min - Requests: ${this.metrics.requests}, Success Rate: ${currentMetrics.successRate.toFixed(2)}%`);
                console.log(`   Memory: ${currentMetrics.memoryUsage.toFixed(2)}MB, Avg Response: ${currentMetrics.avgResponseTime.toFixed(2)}ms`);
            }
            
        }, 1000); // Collect metrics every second
    }

    async runContinuousPostCreation() {
        console.log('📝 Starting continuous post creation...');
        
        let postCounter = 0;
        const postCreationInterval = 2000; // Create post every 2 seconds
        
        while (this.isRunning && (performance.now() - this.testStartTime) < this.testDuration) {
            try {
                const startTime = performance.now();
                
                const response = await axios.post(`${this.baseUrl}/api/posts`, {
                    title: `Endurance Test Post ${postCounter}`,
                    content: this.generateTestContent(postCounter),
                    author: `endurance-agent-${postCounter % 10}`,
                    tags: ['endurance', 'test', `hour-${Math.floor(postCounter / 1800)}`],
                    metadata: {
                        testRun: 'endurance-test',
                        postNumber: postCounter,
                        timestamp: Date.now()
                    }
                }, {
                    timeout: 10000
                });
                
                const responseTime = performance.now() - startTime;
                
                this.metrics.requests++;
                this.metrics.responseTimes.push({
                    timestamp: performance.now(),
                    responseTime: responseTime,
                    operation: 'post_creation'
                });
                
                if (response.status === 201) {
                    this.metrics.successes++;
                } else {
                    this.metrics.failures++;
                }
                
                postCounter++;
                
            } catch (error) {
                this.metrics.requests++;
                this.metrics.failures++;
                this.metrics.errorLog.push({
                    timestamp: Date.now(),
                    operation: 'post_creation',
                    error: error.message,
                    postNumber: postCounter
                });
                
                console.warn(`Post creation error at post ${postCounter}:`, error.message);
            }
            
            await this.sleep(postCreationInterval);
        }
        
        console.log(`📝 Post creation completed. Created ${postCounter} posts.`);
    }

    async runContinuousDataRetrieval() {
        console.log('🔍 Starting continuous data retrieval...');
        
        let retrievalCounter = 0;
        const retrievalInterval = 1000; // Retrieve data every second
        
        const retrievalPatterns = [
            () => axios.get(`${this.baseUrl}/api/posts?limit=20`),
            () => axios.get(`${this.baseUrl}/api/posts/${Math.floor(Math.random() * 1000) + 1}`),
            () => axios.get(`${this.baseUrl}/api/posts/search?query=endurance&limit=50`),
            () => axios.get(`${this.baseUrl}/api/feed/realtime`),
            () => axios.get(`${this.baseUrl}/api/agents`)
        ];
        
        while (this.isRunning && (performance.now() - this.testStartTime) < this.testDuration) {
            try {
                const startTime = performance.now();
                const pattern = retrievalPatterns[retrievalCounter % retrievalPatterns.length];
                
                const response = await pattern();
                const responseTime = performance.now() - startTime;
                
                this.metrics.requests++;
                this.metrics.responseTimes.push({
                    timestamp: performance.now(),
                    responseTime: responseTime,
                    operation: 'data_retrieval'
                });
                
                if (response.status === 200) {
                    this.metrics.successes++;
                } else {
                    this.metrics.failures++;
                }
                
                retrievalCounter++;
                
            } catch (error) {
                this.metrics.requests++;
                this.metrics.failures++;
                this.metrics.errorLog.push({
                    timestamp: Date.now(),
                    operation: 'data_retrieval',
                    error: error.message,
                    retrievalNumber: retrievalCounter
                });
            }
            
            await this.sleep(retrievalInterval);
        }
        
        console.log(`🔍 Data retrieval completed. ${retrievalCounter} retrievals performed.`);
    }

    async runPeriodicHealthChecks() {
        console.log('💓 Starting periodic health checks...');
        
        let healthCheckCounter = 0;
        const healthCheckInterval = 30000; // Health check every 30 seconds
        
        while (this.isRunning && (performance.now() - this.testStartTime) < this.testDuration) {
            try {
                const startTime = performance.now();
                
                const [healthResponse, metricsResponse, statusResponse] = await Promise.all([
                    axios.get(`${this.baseUrl}/api/health`, { timeout: 5000 }),
                    axios.get(`${this.baseUrl}/api/metrics`, { timeout: 5000 }),
                    axios.get(`${this.baseUrl}/api/system/status`, { timeout: 5000 })
                ]);
                
                const responseTime = performance.now() - startTime;
                
                this.metrics.requests += 3;
                this.metrics.responseTimes.push({
                    timestamp: performance.now(),
                    responseTime: responseTime,
                    operation: 'health_check'
                });
                
                const allHealthy = healthResponse.status === 200 && 
                                 metricsResponse.status === 200 && 
                                 statusResponse.status === 200;
                
                if (allHealthy) {
                    this.metrics.successes += 3;
                } else {
                    this.metrics.failures += 3;
                    console.warn(`Health check failed at ${healthCheckCounter}`);
                }
                
                // Store detailed health data
                this.metrics.performanceMetrics.push({
                    timestamp: Date.now(),
                    type: 'health_check',
                    healthData: {
                        health: healthResponse.data,
                        metrics: metricsResponse.data,
                        status: statusResponse.data
                    }
                });
                
                healthCheckCounter++;
                
            } catch (error) {
                this.metrics.requests++;
                this.metrics.failures++;
                this.metrics.errorLog.push({
                    timestamp: Date.now(),
                    operation: 'health_check',
                    error: error.message,
                    checkNumber: healthCheckCounter
                });
                
                console.warn(`Health check error:`, error.message);
            }
            
            await this.sleep(healthCheckInterval);
        }
        
        console.log(`💓 Health checks completed. ${healthCheckCounter} checks performed.`);
    }

    async runMemoryMonitoring() {
        console.log('🧠 Starting memory monitoring...');
        
        const memoryCheckInterval = 10000; // Check memory every 10 seconds
        let previousMemory = process.memoryUsage();
        let memoryLeaks = [];
        
        while (this.isRunning && (performance.now() - this.testStartTime) < this.testDuration) {
            const currentMemory = process.memoryUsage();
            const memoryDelta = currentMemory.heapUsed - previousMemory.heapUsed;
            
            // Detect potential memory leaks (consistent growth over 5 minutes)
            if (memoryDelta > 10 * 1024 * 1024) { // 10MB increase
                memoryLeaks.push({
                    timestamp: Date.now(),
                    memoryIncrease: memoryDelta,
                    currentHeap: currentMemory.heapUsed,
                    elapsedTime: performance.now() - this.testStartTime
                });
                
                console.warn(`🚨 Potential memory leak detected: +${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
            }
            
            // Force garbage collection periodically if available
            if (global.gc && Date.now() % 300000 < 1000) { // Every 5 minutes
                console.log('♻️  Forcing garbage collection...');
                global.gc();
            }
            
            previousMemory = currentMemory;
            await this.sleep(memoryCheckInterval);
        }
        
        if (memoryLeaks.length > 0) {
            console.warn(`🚨 ${memoryLeaks.length} potential memory leaks detected during test`);
            this.metrics.memoryLeaks = memoryLeaks;
        } else {
            console.log('✅ No significant memory leaks detected');
        }
    }

    async runPerformanceMonitoring() {
        console.log('📊 Starting performance monitoring...');
        
        const performanceCheckInterval = 60000; // Check performance every minute
        let performanceBaseline = null;
        let performanceDegradation = [];
        
        while (this.isRunning && (performance.now() - this.testStartTime) < this.testDuration) {
            const recentResponses = this.metrics.responseTimes.filter(rt => 
                (performance.now() - rt.timestamp) < 60000 // Last minute
            );
            
            if (recentResponses.length > 10) {
                const avgResponseTime = recentResponses.reduce((sum, rt) => sum + rt.responseTime, 0) / recentResponses.length;
                const p95ResponseTime = this.calculatePercentile(recentResponses.map(rt => rt.responseTime), 95);
                
                const currentPerformance = {
                    timestamp: Date.now(),
                    avgResponseTime: avgResponseTime,
                    p95ResponseTime: p95ResponseTime,
                    requestCount: recentResponses.length,
                    elapsedTime: performance.now() - this.testStartTime
                };
                
                if (!performanceBaseline) {
                    performanceBaseline = currentPerformance;
                    console.log(`📊 Performance baseline established: ${avgResponseTime.toFixed(2)}ms avg`);
                } else {
                    // Check for performance degradation (>50% increase)
                    const degradationThreshold = performanceBaseline.avgResponseTime * 1.5;
                    
                    if (avgResponseTime > degradationThreshold) {
                        performanceDegradation.push({
                            timestamp: Date.now(),
                            baselineResponseTime: performanceBaseline.avgResponseTime,
                            currentResponseTime: avgResponseTime,
                            degradationPercent: ((avgResponseTime - performanceBaseline.avgResponseTime) / performanceBaseline.avgResponseTime) * 100
                        });
                        
                        console.warn(`📉 Performance degradation detected: ${avgResponseTime.toFixed(2)}ms (${((avgResponseTime - performanceBaseline.avgResponseTime) / performanceBaseline.avgResponseTime * 100).toFixed(1)}% increase)`);
                    }
                }
            }
            
            await this.sleep(performanceCheckInterval);
        }
        
        if (performanceDegradation.length > 0) {
            console.warn(`📉 ${performanceDegradation.length} performance degradation events detected`);
            this.metrics.performanceDegradation = performanceDegradation;
        } else {
            console.log('✅ No significant performance degradation detected');
        }
    }

    generateTestContent(counter) {
        const templates = [
            `This is endurance test post number ${counter}. Testing system stability over extended periods.`,
            `Long-running test content for post ${counter}. Verifying consistent performance and memory usage.`,
            `Endurance testing post ${counter} with varied content length to simulate real-world usage patterns.`,
            `Post ${counter} in the endurance test suite. Monitoring for memory leaks, performance degradation, and system stability.`
        ];
        
        const template = templates[counter % templates.length];
        const extraContent = counter % 10 === 0 ? 
            ' '.repeat(500) + `Extended content for post ${counter} to test memory handling.` : '';
        
        return template + extraContent;
    }

    calculatePercentile(values, percentile) {
        const sorted = values.sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * (percentile / 100)) - 1;
        return sorted[index] || 0;
    }

    async generateEnduranceReport() {
        console.log('📊 Generating Endurance Test Report...');
        
        const totalDuration = performance.now() - this.testStartTime;
        const finalMemory = process.memoryUsage();
        const initialMemory = this.metrics.memorySnapshots[0] || finalMemory;
        
        // Calculate summary statistics
        const responseTimesOnly = this.metrics.responseTimes.map(rt => rt.responseTime);
        const avgResponseTime = responseTimesOnly.length > 0 ? 
            responseTimesOnly.reduce((sum, rt) => sum + rt, 0) / responseTimesOnly.length : 0;
        const p95ResponseTime = this.calculatePercentile(responseTimesOnly, 95);
        const p99ResponseTime = this.calculatePercentile(responseTimesOnly, 99);
        
        const report = {
            testSuite: 'Endurance Testing Suite',
            timestamp: new Date().toISOString(),
            testConfiguration: {
                duration: this.testDuration,
                baseUrl: this.baseUrl
            },
            testResults: {
                actualDuration: totalDuration,
                totalRequests: this.metrics.requests,
                successfulRequests: this.metrics.successes,
                failedRequests: this.metrics.failures,
                successRate: (this.metrics.successes / Math.max(1, this.metrics.requests)) * 100,
                avgRequestsPerSecond: this.metrics.requests / (totalDuration / 1000),
                responseTimeStats: {
                    average: avgResponseTime,
                    p95: p95ResponseTime,
                    p99: p99ResponseTime,
                    min: Math.min(...responseTimesOnly),
                    max: Math.max(...responseTimesOnly)
                }
            },
            memoryAnalysis: {
                initialMemoryMB: initialMemory.heapUsed / 1024 / 1024,
                finalMemoryMB: finalMemory.heapUsed / 1024 / 1024,
                memoryGrowthMB: (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024,
                peakMemoryMB: Math.max(...this.metrics.memorySnapshots.map(ms => ms.heapUsed)) / 1024 / 1024,
                memoryLeaks: this.metrics.memoryLeaks || [],
                memorySnapshots: this.metrics.memorySnapshots
            },
            performanceAnalysis: {
                performanceDegradation: this.metrics.performanceDegradation || [],
                performanceMetrics: this.metrics.performanceMetrics
            },
            errorAnalysis: {
                totalErrors: this.metrics.errorLog.length,
                errorsByType: this.groupErrorsByType(this.metrics.errorLog),
                errorLog: this.metrics.errorLog
            },
            systemStability: {
                uptimeSeconds: totalDuration / 1000,
                memoryStable: (this.metrics.memoryLeaks || []).length === 0,
                performanceStable: (this.metrics.performanceDegradation || []).length === 0,
                errorRate: (this.metrics.failures / Math.max(1, this.metrics.requests)) * 100
            },
            recommendations: this.generateRecommendations(),
            rawMetrics: {
                responseTimes: this.metrics.responseTimes,
                memorySnapshots: this.metrics.memorySnapshots,
                performanceMetrics: this.metrics.performanceMetrics
            }
        };
        
        // Write report to file
        await this.writeFile(this.reportPath, JSON.stringify(report, null, 2));
        
        // Generate CSV summary
        await this.generateCSVSummary(report);
        
        // Print summary to console
        this.printTestSummary(report);
        
        console.log(`📄 Endurance test report saved to: ${this.reportPath}`);
    }

    groupErrorsByType(errorLog) {
        const errorGroups = {};
        errorLog.forEach(error => {
            const key = `${error.operation}: ${error.error}`;
            errorGroups[key] = (errorGroups[key] || 0) + 1;
        });
        return errorGroups;
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Memory recommendations
        if ((this.metrics.memoryLeaks || []).length > 0) {
            recommendations.push('Investigate memory leaks - consistent memory growth detected');
        }
        
        // Performance recommendations
        if ((this.metrics.performanceDegradation || []).length > 0) {
            recommendations.push('Address performance degradation - response times increased over test duration');
        }
        
        // Error rate recommendations
        const errorRate = (this.metrics.failures / Math.max(1, this.metrics.requests)) * 100;
        if (errorRate > 5) {
            recommendations.push(`High error rate (${errorRate.toFixed(2)}%) - investigate system stability`);
        }
        
        // Success rate recommendations
        const successRate = (this.metrics.successes / Math.max(1, this.metrics.requests)) * 100;
        if (successRate < 95) {
            recommendations.push(`Low success rate (${successRate.toFixed(2)}%) - review system reliability`);
        }
        
        if (recommendations.length === 0) {
            recommendations.push('System performed well during endurance test - no immediate concerns');
        }
        
        return recommendations;
    }

    async generateCSVSummary(report) {
        const csvPath = path.join(path.dirname(this.reportPath), 'endurance-test-summary.csv');
        
        const csvContent = [
            'Metric,Value,Unit',
            `Test Duration,${(report.testResults.actualDuration / 1000 / 60).toFixed(2)},minutes`,
            `Total Requests,${report.testResults.totalRequests},count`,
            `Success Rate,${report.testResults.successRate.toFixed(2)},%`,
            `Requests per Second,${report.testResults.avgRequestsPerSecond.toFixed(2)},req/s`,
            `Average Response Time,${report.testResults.responseTimeStats.average.toFixed(2)},ms`,
            `P95 Response Time,${report.testResults.responseTimeStats.p95.toFixed(2)},ms`,
            `Memory Growth,${report.memoryAnalysis.memoryGrowthMB.toFixed(2)},MB`,
            `Error Count,${report.errorAnalysis.totalErrors},count`,
            `Memory Leaks,${report.memoryAnalysis.memoryLeaks.length},count`,
            `Performance Degradations,${report.performanceAnalysis.performanceDegradation.length},count`
        ].join('\n');
        
        await this.writeFile(csvPath, csvContent);
    }

    printTestSummary(report) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 ENDURANCE TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`⏰ Duration: ${(report.testResults.actualDuration / 1000 / 60).toFixed(2)} minutes`);
        console.log(`📨 Total Requests: ${report.testResults.totalRequests}`);
        console.log(`✅ Success Rate: ${report.testResults.successRate.toFixed(2)}%`);
        console.log(`🚀 Throughput: ${report.testResults.avgRequestsPerSecond.toFixed(2)} req/s`);
        console.log(`⚡ Avg Response Time: ${report.testResults.responseTimeStats.average.toFixed(2)}ms`);
        console.log(`📈 P95 Response Time: ${report.testResults.responseTimeStats.p95.toFixed(2)}ms`);
        console.log(`🧠 Memory Growth: ${report.memoryAnalysis.memoryGrowthMB.toFixed(2)}MB`);
        console.log(`🚨 Errors: ${report.errorAnalysis.totalErrors}`);
        console.log(`💧 Memory Leaks: ${report.memoryAnalysis.memoryLeaks.length}`);
        console.log(`📉 Performance Degradations: ${report.performanceAnalysis.performanceDegradation.length}`);
        console.log('\n🎯 RECOMMENDATIONS:');
        report.recommendations.forEach(rec => console.log(`   • ${rec}`));
        console.log('='.repeat(60) + '\n');
    }

    async writeFile(filePath, content) {
        return new Promise((resolve, reject) => {
            const stream = createWriteStream(filePath);
            stream.write(content);
            stream.end();
            stream.on('finish', resolve);
            stream.on('error', reject);
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run endurance tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const runner = new EnduranceTestRunner();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Received SIGINT, stopping endurance test gracefully...');
        runner.isRunning = false;
    });
    
    process.on('SIGTERM', () => {
        console.log('\n🛑 Received SIGTERM, stopping endurance test gracefully...');
        runner.isRunning = false;
    });
    
    runner.runEnduranceTest()
        .then(() => {
            console.log('✅ Endurance test completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Endurance test failed:', error);
            process.exit(1);
        });
}

export default EnduranceTestRunner;