/**
 * Comprehensive WebSocket Connection Stability Profiler
 * Monitors connection lifetime, resource usage, and failure patterns
 */

const WebSocket = require('ws');
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class ConnectionProfiler extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            serverUrl: options.serverUrl || 'ws://localhost:8080',
            maxConnections: options.maxConnections || 10,
            testDuration: options.testDuration || 300000, // 5 minutes
            samplingInterval: options.samplingInterval || 1000, // 1 second
            reportInterval: options.reportInterval || 10000, // 10 seconds
            ...options
        };
        
        // Tracking data structures
        this.connections = new Map();
        this.connectionStats = [];
        this.resourceMetrics = [];
        this.apiCallCorrelations = [];
        this.failurePatterns = [];
        this.healthMetrics = [];
        
        // Performance counters
        this.counters = {
            totalConnections: 0,
            successfulConnections: 0,
            failedConnections: 0,
            prematureDisconnections: 0,
            timeouts: 0,
            apiCallsTotal: 0,
            apiCallsSuccessful: 0,
            apiCallsFailed: 0
        };
        
        // Timing patterns
        this.commonFailureTimes = new Map();
        this.intervalFailures = {
            '30s': 0,
            '60s': 0,
            '90s': 0,
            '120s': 0,
            '300s': 0
        };
        
        // Resource monitoring
        this.resourceMonitor = null;
        this.memoryBaseline = null;
        
        this.isRunning = false;
        this.startTime = null;
    }

    /**
     * Start comprehensive profiling session
     */
    async startProfiling() {
        console.log('🔍 Starting WebSocket Connection Stability Profiling...');
        
        this.isRunning = true;
        this.startTime = Date.now();
        this.memoryBaseline = process.memoryUsage();
        
        // Start resource monitoring
        this.startResourceMonitoring();
        
        // Start connection lifecycle testing
        this.startConnectionTesting();
        
        // Start periodic reporting
        this.startPeriodicReporting();
        
        // Set profiling duration
        setTimeout(() => {
            this.stopProfiling();
        }, this.options.testDuration);
        
        this.emit('profiling:started', {
            startTime: this.startTime,
            duration: this.options.testDuration,
            maxConnections: this.options.maxConnections
        });
    }

    /**
     * Start resource monitoring
     */
    startResourceMonitoring() {
        this.resourceMonitor = setInterval(() => {
            const memUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            
            const metrics = {
                timestamp: Date.now(),
                memory: {
                    rss: memUsage.rss,
                    heapUsed: memUsage.heapUsed,
                    heapTotal: memUsage.heapTotal,
                    external: memUsage.external,
                    arrayBuffers: memUsage.arrayBuffers,
                    growthFromBaseline: memUsage.rss - this.memoryBaseline.rss
                },
                cpu: {
                    user: cpuUsage.user,
                    system: cpuUsage.system
                },
                connections: {
                    active: this.connections.size,
                    total: this.counters.totalConnections,
                    failed: this.counters.failedConnections
                }
            };
            
            this.resourceMetrics.push(metrics);
            
            // Detect memory leaks
            if (metrics.memory.growthFromBaseline > 50 * 1024 * 1024) { // 50MB growth
                console.warn(`⚠️  Memory growth detected: ${Math.round(metrics.memory.growthFromBaseline / 1024 / 1024)}MB`);
            }
            
        }, this.options.samplingInterval);
    }

    /**
     * Start connection lifecycle testing
     */
    async startConnectionTesting() {
        // Create multiple connections with staggered timing
        for (let i = 0; i < this.options.maxConnections; i++) {
            setTimeout(() => {
                if (this.isRunning) {
                    this.createAndMonitorConnection(`conn_${i}`);
                }
            }, i * 2000); // Stagger connections by 2 seconds
        }
        
        // Continuously create new connections to replace failed ones
        const connectionRefreshInterval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(connectionRefreshInterval);
                return;
            }
            
            // Replace any failed connections
            const activeConnections = Array.from(this.connections.values())
                .filter(conn => conn.ws.readyState === WebSocket.OPEN).length;
            
            const connectionsToCreate = this.options.maxConnections - activeConnections;
            
            for (let i = 0; i < connectionsToCreate; i++) {
                const connId = `conn_${Date.now()}_${i}`;
                this.createAndMonitorConnection(connId);
            }
            
        }, 5000); // Check every 5 seconds
    }

    /**
     * Create and monitor individual connection
     */
    createAndMonitorConnection(connectionId) {
        const connectionStart = Date.now();
        const ws = new WebSocket(this.options.serverUrl);
        
        const connectionData = {
            id: connectionId,
            ws: ws,
            startTime: connectionStart,
            endTime: null,
            lifetime: null,
            state: 'connecting',
            messagesSent: 0,
            messagesReceived: 0,
            bytesSent: 0,
            bytesReceived: 0,
            errors: [],
            apiCalls: [],
            pingTimes: [],
            lastPong: null
        };
        
        this.connections.set(connectionId, connectionData);
        this.counters.totalConnections++;
        
        // Connection opened
        ws.on('open', () => {
            connectionData.state = 'open';
            connectionData.openTime = Date.now();
            this.counters.successfulConnections++;
            
            console.log(`✅ Connection ${connectionId} opened (${Date.now() - connectionStart}ms)`);
            
            // Start ping-pong monitoring
            this.startPingPongMonitoring(connectionData);
            
            // Start API call simulation
            this.startApiCallSimulation(connectionData);
            
            this.emit('connection:opened', connectionData);
        });

        // Message received
        ws.on('message', (data) => {
            connectionData.messagesReceived++;
            connectionData.bytesReceived += data.length;
            connectionData.lastMessageTime = Date.now();
            
            // Track pong responses
            if (data.toString().includes('pong')) {
                const pingTime = Date.now() - connectionData.lastPingTime;
                connectionData.pingTimes.push(pingTime);
                connectionData.lastPong = Date.now();
            }
        });

        // Connection error
        ws.on('error', (error) => {
            const errorData = {
                timestamp: Date.now(),
                message: error.message,
                code: error.code,
                lifetime: Date.now() - connectionStart
            };
            
            connectionData.errors.push(errorData);
            connectionData.state = 'error';
            
            console.error(`❌ Connection ${connectionId} error after ${errorData.lifetime}ms: ${error.message}`);
            
            this.analyzeFailurePattern(connectionData, 'error', errorData);
        });

        // Connection closed
        ws.on('close', (code, reason) => {
            const closeTime = Date.now();
            const lifetime = closeTime - connectionStart;
            
            connectionData.endTime = closeTime;
            connectionData.lifetime = lifetime;
            connectionData.state = 'closed';
            connectionData.closeCode = code;
            connectionData.closeReason = reason?.toString();
            
            // Categorize the disconnection
            const category = this.categorizeDisconnection(connectionData, code, lifetime);
            
            console.log(`🔌 Connection ${connectionId} closed after ${lifetime}ms (code: ${code}, reason: ${reason}, category: ${category})`);
            
            // Record statistics
            this.recordConnectionStats(connectionData, category);
            
            // Analyze failure patterns
            this.analyzeFailurePattern(connectionData, 'close', { code, reason, lifetime });
            
            // Clean up connection data
            this.connections.delete(connectionId);
            
            this.emit('connection:closed', connectionData);
        });
    }

    /**
     * Start ping-pong monitoring for connection health
     */
    startPingPongMonitoring(connectionData) {
        const pingInterval = setInterval(() => {
            if (connectionData.ws.readyState !== WebSocket.OPEN) {
                clearInterval(pingInterval);
                return;
            }
            
            connectionData.lastPingTime = Date.now();
            connectionData.ws.ping();
            
            // Check for missed pongs (connection health issue)
            if (connectionData.lastPong && 
                Date.now() - connectionData.lastPong > 15000) { // 15 second timeout
                console.warn(`⚠️  Connection ${connectionData.id} missing pong responses`);
            }
            
        }, 5000); // Ping every 5 seconds
    }

    /**
     * Simulate API calls to correlate with connection drops
     */
    startApiCallSimulation(connectionData) {
        const makeApiCall = () => {
            if (connectionData.ws.readyState !== WebSocket.OPEN) return;
            
            const callStart = Date.now();
            const callId = `api_${Date.now()}_${Math.random()}`;
            
            const apiCall = {
                id: callId,
                connectionId: connectionData.id,
                startTime: callStart,
                endTime: null,
                duration: null,
                success: false,
                error: null
            };
            
            connectionData.apiCalls.push(apiCall);
            this.counters.apiCallsTotal++;
            
            // Simulate different types of API calls
            const callType = Math.random();
            let message;
            
            if (callType < 0.3) {
                // Simple message
                message = JSON.stringify({
                    type: 'simple',
                    id: callId,
                    data: 'Hello server'
                });
            } else if (callType < 0.6) {
                // Complex message with large payload
                message = JSON.stringify({
                    type: 'complex',
                    id: callId,
                    data: 'x'.repeat(1000) // 1KB payload
                });
            } else {
                // Claude API simulation
                message = JSON.stringify({
                    type: 'claude_api',
                    id: callId,
                    prompt: 'Analyze this code for performance issues...',
                    context: 'x'.repeat(2000) // 2KB context
                });
            }
            
            try {
                connectionData.ws.send(message);
                connectionData.messagesSent++;
                connectionData.bytesSent += message.length;
                
                // Simulate response delay
                setTimeout(() => {
                    apiCall.endTime = Date.now();
                    apiCall.duration = apiCall.endTime - callStart;
                    apiCall.success = connectionData.ws.readyState === WebSocket.OPEN;
                    
                    if (apiCall.success) {
                        this.counters.apiCallsSuccessful++;
                    } else {
                        this.counters.apiCallsFailed++;
                    }
                    
                    // Check if connection dropped shortly after API call
                    if (!apiCall.success && apiCall.duration < 5000) {
                        this.apiCallCorrelations.push({
                            timestamp: callStart,
                            connectionId: connectionData.id,
                            callType: message.type || 'unknown',
                            duration: apiCall.duration,
                            connectionLifetime: Date.now() - connectionData.startTime,
                            correlation: 'api_call_preceded_drop'
                        });
                    }
                    
                }, Math.random() * 3000); // Random delay 0-3 seconds
                
            } catch (error) {
                apiCall.error = error.message;
                apiCall.endTime = Date.now();
                apiCall.duration = apiCall.endTime - callStart;
                this.counters.apiCallsFailed++;
                
                console.error(`API call ${callId} failed: ${error.message}`);
            }
        };
        
        // Start with initial call
        setTimeout(makeApiCall, Math.random() * 5000);
        
        // Continue making calls at intervals
        const apiCallInterval = setInterval(() => {
            if (connectionData.ws.readyState !== WebSocket.OPEN) {
                clearInterval(apiCallInterval);
                return;
            }
            
            makeApiCall();
        }, 8000 + Math.random() * 4000); // Every 8-12 seconds
    }

    /**
     * Categorize disconnection type
     */
    categorizeDisconnection(connectionData, code, lifetime) {
        if (lifetime < 1000) return 'immediate_failure';
        if (lifetime < 10000) return 'early_failure';
        if (lifetime >= 25000 && lifetime <= 35000) return 'thirty_second_pattern';
        if (lifetime >= 55000 && lifetime <= 65000) return 'sixty_second_pattern';
        if (lifetime >= 85000 && lifetime <= 95000) return 'ninety_second_pattern';
        if (lifetime >= 115000 && lifetime <= 125000) return 'two_minute_pattern';
        if (lifetime >= 295000 && lifetime <= 305000) return 'five_minute_pattern';
        if (code === 1000) return 'normal_closure';
        if (code === 1001) return 'going_away';
        if (code === 1002) return 'protocol_error';
        if (code === 1006) return 'abnormal_closure';
        if (lifetime > 120000) return 'long_lived_success';
        return 'unexpected_pattern';
    }

    /**
     * Record connection statistics
     */
    recordConnectionStats(connectionData, category) {
        const stats = {
            timestamp: Date.now(),
            connectionId: connectionData.id,
            lifetime: connectionData.lifetime,
            category: category,
            messagesSent: connectionData.messagesSent,
            messagesReceived: connectionData.messagesReceived,
            bytesSent: connectionData.bytesSent,
            bytesReceived: connectionData.bytesReceived,
            apiCalls: connectionData.apiCalls.length,
            successfulApiCalls: connectionData.apiCalls.filter(call => call.success).length,
            errors: connectionData.errors.length,
            averagePingTime: connectionData.pingTimes.length > 0 ? 
                connectionData.pingTimes.reduce((sum, time) => sum + time, 0) / connectionData.pingTimes.length : 0,
            closeCode: connectionData.closeCode,
            closeReason: connectionData.closeReason
        };
        
        this.connectionStats.push(stats);
        
        // Update pattern counters
        if (category.includes('thirty_second')) this.intervalFailures['30s']++;
        else if (category.includes('sixty_second')) this.intervalFailures['60s']++;
        else if (category.includes('ninety_second')) this.intervalFailures['90s']++;
        else if (category.includes('two_minute')) this.intervalFailures['120s']++;
        else if (category.includes('five_minute')) this.intervalFailures['300s']++;
        
        if (category !== 'normal_closure' && category !== 'long_lived_success') {
            this.counters.prematureDisconnections++;
        }
    }

    /**
     * Analyze failure patterns
     */
    analyzeFailurePattern(connectionData, eventType, eventData) {
        const pattern = {
            timestamp: Date.now(),
            connectionId: connectionData.id,
            eventType: eventType,
            eventData: eventData,
            connectionLifetime: eventData.lifetime || (Date.now() - connectionData.startTime),
            resourceMetricsAtFailure: this.getCurrentResourceMetrics(),
            apiCallsInProgress: connectionData.apiCalls.filter(call => !call.endTime).length,
            recentApiCalls: connectionData.apiCalls.slice(-3), // Last 3 API calls
            pingHealth: {
                averagePingTime: connectionData.pingTimes.length > 0 ? 
                    connectionData.pingTimes.reduce((sum, time) => sum + time, 0) / connectionData.pingTimes.length : 0,
                lastPongDelay: connectionData.lastPong ? Date.now() - connectionData.lastPong : null,
                missedPongs: connectionData.pingTimes.length === 0 && connectionData.lastPingTime
            }
        };
        
        this.failurePatterns.push(pattern);
        
        // Check for common failure times
        const lifetimeSeconds = Math.round(pattern.connectionLifetime / 1000);
        const count = this.commonFailureTimes.get(lifetimeSeconds) || 0;
        this.commonFailureTimes.set(lifetimeSeconds, count + 1);
        
        // Emit pattern detection event
        this.emit('failure:pattern', pattern);
    }

    /**
     * Get current resource metrics
     */
    getCurrentResourceMetrics() {
        const memUsage = process.memoryUsage();
        return {
            memory: {
                rss: memUsage.rss,
                heapUsed: memUsage.heapUsed,
                growthFromBaseline: memUsage.rss - this.memoryBaseline.rss
            },
            activeConnections: this.connections.size,
            totalConnectionsCreated: this.counters.totalConnections
        };
    }

    /**
     * Start periodic reporting
     */
    startPeriodicReporting() {
        const reportInterval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(reportInterval);
                return;
            }
            
            this.generateLiveReport();
        }, this.options.reportInterval);
    }

    /**
     * Generate live report
     */
    generateLiveReport() {
        const elapsed = Date.now() - this.startTime;
        const activeConnections = this.connections.size;
        
        const report = {
            timestamp: Date.now(),
            elapsed: elapsed,
            activeConnections: activeConnections,
            counters: { ...this.counters },
            intervalFailures: { ...this.intervalFailures },
            resourceHealth: this.getCurrentResourceMetrics(),
            topFailureTimes: this.getTopFailureTimes(5)
        };
        
        console.log(`📊 Live Report (${Math.round(elapsed/1000)}s):`);
        console.log(`   Active Connections: ${activeConnections}`);
        console.log(`   Total Created: ${this.counters.totalConnections}`);
        console.log(`   Success Rate: ${((this.counters.successfulConnections / this.counters.totalConnections) * 100).toFixed(1)}%`);
        console.log(`   Premature Disconnections: ${this.counters.prematureDisconnections}`);
        console.log(`   30s Pattern Failures: ${this.intervalFailures['30s']}`);
        console.log(`   60s Pattern Failures: ${this.intervalFailures['60s']}`);
        console.log(`   Memory Growth: ${Math.round(report.resourceHealth.memory.growthFromBaseline / 1024 / 1024)}MB`);
        
        this.emit('report:live', report);
    }

    /**
     * Get top failure times
     */
    getTopFailureTimes(limit = 10) {
        return Array.from(this.commonFailureTimes.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([seconds, count]) => ({ seconds, count }));
    }

    /**
     * Stop profiling and generate final report
     */
    async stopProfiling() {
        console.log('🛑 Stopping WebSocket Connection Stability Profiling...');
        
        this.isRunning = false;
        
        // Clear intervals
        if (this.resourceMonitor) {
            clearInterval(this.resourceMonitor);
        }
        
        // Close all remaining connections
        for (const [connectionId, connectionData] of this.connections) {
            if (connectionData.ws.readyState === WebSocket.OPEN) {
                connectionData.ws.close(1000, 'Profiling session ended');
            }
        }
        
        // Generate final comprehensive report
        const finalReport = await this.generateFinalReport();
        
        // Save reports
        await this.saveReports(finalReport);
        
        this.emit('profiling:completed', finalReport);
        
        return finalReport;
    }

    /**
     * Generate comprehensive final report
     */
    async generateFinalReport() {
        const totalDuration = Date.now() - this.startTime;
        
        const report = {
            meta: {
                testDuration: totalDuration,
                startTime: this.startTime,
                endTime: Date.now(),
                serverUrl: this.options.serverUrl,
                maxConnections: this.options.maxConnections
            },
            summary: {
                totalConnections: this.counters.totalConnections,
                successfulConnections: this.counters.successfulConnections,
                failedConnections: this.counters.failedConnections,
                successRate: (this.counters.successfulConnections / this.counters.totalConnections) * 100,
                prematureDisconnections: this.counters.prematureDisconnections,
                avgConnectionLifetime: this.calculateAverageConnectionLifetime(),
                medianConnectionLifetime: this.calculateMedianConnectionLifetime()
            },
            failureAnalysis: {
                intervalPatterns: { ...this.intervalFailures },
                topFailureTimes: this.getTopFailureTimes(20),
                thirtySecondAnalysis: this.analyzeThirtySecondPattern(),
                resourceCorrelations: this.analyzeResourceFailureCorrelations(),
                apiCallCorrelations: this.analyzeApiCallCorrelations()
            },
            performance: {
                resourceUsage: this.analyzeResourceUsage(),
                connectionHealthMetrics: this.analyzeConnectionHealth(),
                systemStability: this.analyzeSystemStability()
            },
            recommendations: this.generateRecommendations(),
            rawData: {
                connectionStats: this.connectionStats,
                resourceMetrics: this.resourceMetrics.slice(-100), // Last 100 samples
                failurePatterns: this.failurePatterns,
                apiCallCorrelations: this.apiCallCorrelations
            }
        };
        
        return report;
    }

    /**
     * Analyze the 30-second failure pattern specifically
     */
    analyzeThirtySecondPattern() {
        const thirtySecondFailures = this.failurePatterns.filter(pattern => {
            const lifetime = pattern.connectionLifetime;
            return lifetime >= 25000 && lifetime <= 35000;
        });
        
        if (thirtySecondFailures.length === 0) {
            return { detected: false, count: 0 };
        }
        
        const analysis = {
            detected: true,
            count: thirtySecondFailures.length,
            averageLifetime: thirtySecondFailures.reduce((sum, f) => sum + f.connectionLifetime, 0) / thirtySecondFailures.length,
            commonCauses: this.identifyCommonCauses(thirtySecondFailures),
            resourcePatterns: this.analyzeResourcePatternsAtFailure(thirtySecondFailures),
            apiCallContext: this.analyzeApiCallContextAtFailure(thirtySecondFailures),
            timing: {
                distribution: this.calculateLifetimeDistribution(thirtySecondFailures),
                clustering: this.detectTimingClusters(thirtySecondFailures)
            }
        };
        
        return analysis;
    }

    /**
     * Calculate average connection lifetime
     */
    calculateAverageConnectionLifetime() {
        const completedConnections = this.connectionStats.filter(stat => stat.lifetime > 0);
        if (completedConnections.length === 0) return 0;
        
        return completedConnections.reduce((sum, stat) => sum + stat.lifetime, 0) / completedConnections.length;
    }

    /**
     * Calculate median connection lifetime
     */
    calculateMedianConnectionLifetime() {
        const lifetimes = this.connectionStats
            .filter(stat => stat.lifetime > 0)
            .map(stat => stat.lifetime)
            .sort((a, b) => a - b);
        
        if (lifetimes.length === 0) return 0;
        
        const mid = Math.floor(lifetimes.length / 2);
        return lifetimes.length % 2 === 0 
            ? (lifetimes[mid - 1] + lifetimes[mid]) / 2 
            : lifetimes[mid];
    }

    /**
     * Analyze resource failure correlations
     */
    analyzeResourceFailureCorrelations() {
        const correlations = [];
        
        for (const pattern of this.failurePatterns) {
            const resourceMetrics = pattern.resourceMetricsAtFailure;
            if (!resourceMetrics) continue;
            
            // Memory correlation
            if (resourceMetrics.memory.growthFromBaseline > 20 * 1024 * 1024) { // 20MB
                correlations.push({
                    type: 'memory_growth',
                    connectionLifetime: pattern.connectionLifetime,
                    memoryGrowth: resourceMetrics.memory.growthFromBaseline,
                    correlation: 'high'
                });
            }
            
            // Connection count correlation
            if (resourceMetrics.activeConnections >= this.options.maxConnections) {
                correlations.push({
                    type: 'connection_limit',
                    connectionLifetime: pattern.connectionLifetime,
                    activeConnections: resourceMetrics.activeConnections,
                    correlation: 'medium'
                });
            }
        }
        
        return correlations;
    }

    /**
     * Analyze API call correlations
     */
    analyzeApiCallCorrelations() {
        return {
            totalCorrelations: this.apiCallCorrelations.length,
            correlationsByType: this.groupBy(this.apiCallCorrelations, 'callType'),
            averageCorrelationDelay: this.apiCallCorrelations.reduce((sum, corr) => sum + corr.duration, 0) / 
                Math.max(this.apiCallCorrelations.length, 1),
            strongCorrelations: this.apiCallCorrelations.filter(corr => corr.duration < 2000) // Drops within 2s of API call
        };
    }

    /**
     * Analyze resource usage patterns
     */
    analyzeResourceUsage() {
        if (this.resourceMetrics.length === 0) return null;
        
        const memoryGrowth = this.resourceMetrics.map(m => m.memory.growthFromBaseline);
        const maxMemoryGrowth = Math.max(...memoryGrowth);
        const avgMemoryGrowth = memoryGrowth.reduce((sum, growth) => sum + growth, 0) / memoryGrowth.length;
        
        return {
            memoryAnalysis: {
                maxGrowth: maxMemoryGrowth,
                avgGrowth: avgMemoryGrowth,
                leakDetected: maxMemoryGrowth > 100 * 1024 * 1024, // 100MB
                growthRate: this.calculateMemoryGrowthRate()
            },
            stabilityMetrics: {
                memoryStable: Math.abs(maxMemoryGrowth - avgMemoryGrowth) < 10 * 1024 * 1024, // Within 10MB
                connectionStable: this.counters.prematureDisconnections < this.counters.totalConnections * 0.1
            }
        };
    }

    /**
     * Calculate memory growth rate
     */
    calculateMemoryGrowthRate() {
        if (this.resourceMetrics.length < 2) return 0;
        
        const first = this.resourceMetrics[0];
        const last = this.resourceMetrics[this.resourceMetrics.length - 1];
        const timeDiff = last.timestamp - first.timestamp;
        const memoryDiff = last.memory.growthFromBaseline - first.memory.growthFromBaseline;
        
        return timeDiff > 0 ? (memoryDiff / timeDiff) * 1000 : 0; // bytes per second
    }

    /**
     * Generate recommendations based on analysis
     */
    generateRecommendations() {
        const recommendations = [];
        
        // 30-second pattern recommendations
        if (this.intervalFailures['30s'] > 0) {
            recommendations.push({
                category: 'Connection Stability',
                priority: 'HIGH',
                issue: '30-second connection drop pattern detected',
                recommendation: 'Implement connection keepalive with 20-second ping interval',
                evidence: `${this.intervalFailures['30s']} connections dropped at ~30 seconds`
            });
        }
        
        // Memory recommendations
        const maxMemoryGrowth = Math.max(...this.resourceMetrics.map(m => m.memory.growthFromBaseline));
        if (maxMemoryGrowth > 50 * 1024 * 1024) {
            recommendations.push({
                category: 'Memory Management',
                priority: 'MEDIUM',
                issue: 'Significant memory growth during testing',
                recommendation: 'Review connection cleanup and implement proper resource disposal',
                evidence: `Memory grew by ${Math.round(maxMemoryGrowth / 1024 / 1024)}MB`
            });
        }
        
        // API call recommendations
        if (this.apiCallCorrelations.length > 0) {
            recommendations.push({
                category: 'API Integration',
                priority: 'MEDIUM',
                issue: 'API calls correlated with connection drops',
                recommendation: 'Implement API call timeout and retry logic',
                evidence: `${this.apiCallCorrelations.length} correlations detected`
            });
        }
        
        return recommendations;
    }

    /**
     * Save reports to files
     */
    async saveReports(report) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportsDir = path.join(__dirname, '..', 'reports');
        
        // Ensure reports directory exists
        await fs.mkdir(reportsDir, { recursive: true });
        
        // Save comprehensive report
        const reportPath = path.join(reportsDir, `websocket-stability-report-${timestamp}.json`);
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        // Save summary report
        const summaryPath = path.join(reportsDir, `websocket-stability-summary-${timestamp}.txt`);
        const summaryContent = this.generateTextSummary(report);
        await fs.writeFile(summaryPath, summaryContent);
        
        // Save CSV data for further analysis
        const csvPath = path.join(reportsDir, `connection-stats-${timestamp}.csv`);
        const csvContent = this.generateCsvData();
        await fs.writeFile(csvPath, csvContent);
        
        console.log(`📄 Reports saved:`);
        console.log(`   Comprehensive: ${reportPath}`);
        console.log(`   Summary: ${summaryPath}`);
        console.log(`   CSV Data: ${csvPath}`);
    }

    /**
     * Generate text summary
     */
    generateTextSummary(report) {
        const lines = [];
        lines.push('='.repeat(80));
        lines.push('WEBSOCKET CONNECTION STABILITY PROFILING REPORT');
        lines.push('='.repeat(80));
        lines.push('');
        
        // Summary
        lines.push('EXECUTIVE SUMMARY');
        lines.push('-'.repeat(40));
        lines.push(`Test Duration: ${Math.round(report.meta.testDuration / 1000)}s`);
        lines.push(`Total Connections: ${report.summary.totalConnections}`);
        lines.push(`Success Rate: ${report.summary.successRate.toFixed(1)}%`);
        lines.push(`Premature Disconnections: ${report.summary.prematureDisconnections}`);
        lines.push(`Average Connection Lifetime: ${Math.round(report.summary.avgConnectionLifetime / 1000)}s`);
        lines.push('');
        
        // Key Findings
        lines.push('KEY FINDINGS');
        lines.push('-'.repeat(40));
        
        if (report.failureAnalysis.intervalPatterns['30s'] > 0) {
            lines.push(`🚨 CRITICAL: ${report.failureAnalysis.intervalPatterns['30s']} connections dropped at ~30 seconds`);
            
            const thirtySecondAnalysis = report.failureAnalysis.thirtySecondAnalysis;
            if (thirtySecondAnalysis.detected) {
                lines.push(`   Average failure time: ${Math.round(thirtySecondAnalysis.averageLifetime / 1000)}s`);
                lines.push(`   This suggests a timeout or keepalive issue`);
            }
        }
        
        if (report.performance.resourceUsage?.memoryAnalysis.leakDetected) {
            lines.push(`⚠️  Memory leak detected: ${Math.round(report.performance.resourceUsage.memoryAnalysis.maxGrowth / 1024 / 1024)}MB growth`);
        }
        
        if (report.failureAnalysis.apiCallCorrelations.strongCorrelations.length > 0) {
            lines.push(`📞 ${report.failureAnalysis.apiCallCorrelations.strongCorrelations.length} API calls preceded connection drops`);
        }
        
        lines.push('');
        
        // Recommendations
        lines.push('RECOMMENDATIONS');
        lines.push('-'.repeat(40));
        for (const rec of report.recommendations) {
            lines.push(`${rec.priority}: ${rec.issue}`);
            lines.push(`   → ${rec.recommendation}`);
            lines.push(`   Evidence: ${rec.evidence}`);
            lines.push('');
        }
        
        // Failure Patterns
        lines.push('FAILURE TIME DISTRIBUTION');
        lines.push('-'.repeat(40));
        for (const { seconds, count } of report.failureAnalysis.topFailureTimes.slice(0, 10)) {
            lines.push(`${seconds}s: ${count} failures`);
        }
        
        return lines.join('\n');
    }

    /**
     * Generate CSV data
     */
    generateCsvData() {
        const headers = [
            'timestamp', 'connectionId', 'lifetime', 'category', 
            'messagesSent', 'messagesReceived', 'bytesSent', 'bytesReceived',
            'apiCalls', 'successfulApiCalls', 'errors', 'averagePingTime',
            'closeCode', 'closeReason'
        ];
        
        const csvLines = [headers.join(',')];
        
        for (const stat of this.connectionStats) {
            const row = [
                stat.timestamp,
                stat.connectionId,
                stat.lifetime,
                stat.category,
                stat.messagesSent,
                stat.messagesReceived,
                stat.bytesSent,
                stat.bytesReceived,
                stat.apiCalls,
                stat.successfulApiCalls,
                stat.errors,
                stat.averagePingTime.toFixed(2),
                stat.closeCode,
                `"${stat.closeReason || ''}"`
            ];
            csvLines.push(row.join(','));
        }
        
        return csvLines.join('\n');
    }

    /**
     * Utility methods
     */
    groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = item[key];
            result[group] = result[group] || [];
            result[group].push(item);
            return result;
        }, {});
    }

    identifyCommonCauses(failures) {
        // Analyze common patterns in the failures
        const causes = {};
        
        for (const failure of failures) {
            if (failure.eventData.code === 1006) {
                causes['abnormal_closure'] = (causes['abnormal_closure'] || 0) + 1;
            }
            if (failure.pingHealth.missedPongs) {
                causes['missed_pongs'] = (causes['missed_pongs'] || 0) + 1;
            }
            if (failure.apiCallsInProgress > 0) {
                causes['api_calls_in_progress'] = (causes['api_calls_in_progress'] || 0) + 1;
            }
        }
        
        return causes;
    }

    analyzeResourcePatternsAtFailure(failures) {
        const patterns = {
            highMemoryGrowth: 0,
            maxConnections: 0,
            averageMemoryAtFailure: 0
        };
        
        let totalMemory = 0;
        let count = 0;
        
        for (const failure of failures) {
            const metrics = failure.resourceMetricsAtFailure;
            if (metrics) {
                totalMemory += metrics.memory.growthFromBaseline;
                count++;
                
                if (metrics.memory.growthFromBaseline > 20 * 1024 * 1024) {
                    patterns.highMemoryGrowth++;
                }
                
                if (metrics.activeConnections >= this.options.maxConnections) {
                    patterns.maxConnections++;
                }
            }
        }
        
        patterns.averageMemoryAtFailure = count > 0 ? totalMemory / count : 0;
        
        return patterns;
    }

    analyzeApiCallContextAtFailure(failures) {
        const context = {
            withActiveApiCalls: 0,
            recentClaudeApiCalls: 0,
            averageApiCallsInProgress: 0
        };
        
        let totalApiCalls = 0;
        
        for (const failure of failures) {
            totalApiCalls += failure.apiCallsInProgress;
            
            if (failure.apiCallsInProgress > 0) {
                context.withActiveApiCalls++;
            }
            
            const recentClaude = failure.recentApiCalls.filter(call => 
                call && call.id && call.id.includes('claude_api')
            );
            
            if (recentClaude.length > 0) {
                context.recentClaudeApiCalls++;
            }
        }
        
        context.averageApiCallsInProgress = failures.length > 0 ? totalApiCalls / failures.length : 0;
        
        return context;
    }

    calculateLifetimeDistribution(failures) {
        const lifetimes = failures.map(f => f.connectionLifetime);
        lifetimes.sort((a, b) => a - b);
        
        return {
            min: lifetimes[0],
            max: lifetimes[lifetimes.length - 1],
            median: lifetimes[Math.floor(lifetimes.length / 2)],
            q1: lifetimes[Math.floor(lifetimes.length * 0.25)],
            q3: lifetimes[Math.floor(lifetimes.length * 0.75)]
        };
    }

    detectTimingClusters(failures) {
        // Detect if failures cluster around specific times
        const lifetimes = failures.map(f => Math.round(f.connectionLifetime / 1000)); // Convert to seconds
        const clusters = {};
        
        for (const lifetime of lifetimes) {
            // Group by 5-second windows
            const window = Math.floor(lifetime / 5) * 5;
            clusters[window] = (clusters[window] || 0) + 1;
        }
        
        // Find the most common cluster
        const sortedClusters = Object.entries(clusters)
            .sort(([,a], [,b]) => b - a)
            .map(([window, count]) => ({ window: parseInt(window), count }));
        
        return sortedClusters.slice(0, 5); // Top 5 clusters
    }

    analyzeConnectionHealth() {
        const healthMetrics = {
            pingResponseRate: 0,
            averagePingTime: 0,
            connectionStability: 0
        };
        
        let totalPingResponses = 0;
        let totalPings = 0;
        let totalPingTime = 0;
        let pingCount = 0;
        
        for (const stat of this.connectionStats) {
            if (stat.averagePingTime > 0) {
                totalPingTime += stat.averagePingTime;
                pingCount++;
            }
        }
        
        healthMetrics.averagePingTime = pingCount > 0 ? totalPingTime / pingCount : 0;
        healthMetrics.connectionStability = (this.counters.successfulConnections / this.counters.totalConnections) * 100;
        
        return healthMetrics;
    }

    analyzeSystemStability() {
        return {
            memoryStable: this.resourceMetrics.length > 0 && 
                Math.max(...this.resourceMetrics.map(m => m.memory.growthFromBaseline)) < 100 * 1024 * 1024,
            connectionStable: this.counters.prematureDisconnections < this.counters.totalConnections * 0.2,
            apiCallStable: this.counters.apiCallsSuccessful / Math.max(this.counters.apiCallsTotal, 1) > 0.8
        };
    }
}

module.exports = ConnectionProfiler;