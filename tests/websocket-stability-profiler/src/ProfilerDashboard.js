/**
 * Real-time Profiling Dashboard
 * Provides live monitoring and visualization of WebSocket connection stability
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class ProfilerDashboard extends EventEmitter {
    constructor(profiler, options = {}) {
        super();
        
        this.profiler = profiler;
        this.options = {
            updateInterval: options.updateInterval || 2000, // 2 seconds
            historyLength: options.historyLength || 300, // 5 minutes at 2-second intervals
            enableConsoleOutput: options.enableConsoleOutput !== false,
            enableWebInterface: options.enableWebInterface || false,
            webPort: options.webPort || 3000,
            ...options
        };
        
        // Dashboard state
        this.isRunning = false;
        this.updateTimer = null;
        this.webServer = null;
        
        // Historical data for trends
        this.history = {
            connectionCounts: [],
            failureRates: [],
            memoryUsage: [],
            thirtySecondFailures: [],
            resourceMetrics: [],
            performanceScores: []
        };
        
        // Real-time metrics
        this.currentMetrics = {
            activeConnections: 0,
            totalConnections: 0,
            failureRate: 0,
            thirtySecondFailures: 0,
            memoryGrowth: 0,
            averageLifetime: 0,
            performanceScore: 100
        };
        
        // Alert thresholds
        this.alertThresholds = {
            failureRate: 20, // 20%
            thirtySecondFailures: 5,
            memoryGrowth: 50 * 1024 * 1024, // 50MB
            performanceScore: 70
        };
        
        // Active alerts
        this.activeAlerts = new Set();
        
        this.setupProfilerListeners();
    }

    /**
     * Setup listeners for profiler events
     */
    setupProfilerListeners() {
        this.profiler.on('connection:opened', (connectionData) => {
            this.updateConnectionMetrics();
        });
        
        this.profiler.on('connection:closed', (connectionData) => {
            this.updateConnectionMetrics();
            this.checkConnectionFailurePattern(connectionData);
        });
        
        this.profiler.on('failure:pattern', (pattern) => {
            this.handleFailurePattern(pattern);
        });
        
        this.profiler.on('report:live', (report) => {
            this.updateMetricsFromReport(report);
        });
    }

    /**
     * Start the dashboard
     */
    async start() {
        if (this.isRunning) return;
        
        console.log('📊 Starting Profiler Dashboard...');
        
        this.isRunning = true;
        
        // Start periodic updates
        this.startPeriodicUpdates();
        
        // Start web interface if enabled
        if (this.options.enableWebInterface) {
            await this.startWebInterface();
        }
        
        this.emit('dashboard:started');
        
        console.log('✅ Profiler Dashboard started');
        if (this.options.enableWebInterface) {
            console.log(`🌐 Web interface available at http://localhost:${this.options.webPort}`);
        }
    }

    /**
     * Start periodic metric updates
     */
    startPeriodicUpdates() {
        this.updateTimer = setInterval(() => {
            this.updateMetrics();
            this.displayDashboard();
            this.checkAlerts();
        }, this.options.updateInterval);
        
        // Initial update
        this.updateMetrics();
        this.displayDashboard();
    }

    /**
     * Update all metrics
     */
    updateMetrics() {
        this.updateConnectionMetrics();
        this.updateResourceMetrics();
        this.updatePerformanceScore();
        this.updateHistory();
    }

    /**
     * Update connection-related metrics
     */
    updateConnectionMetrics() {
        this.currentMetrics.activeConnections = this.profiler.connections.size;
        this.currentMetrics.totalConnections = this.profiler.counters.totalConnections;
        
        // Calculate failure rate
        const totalCompleted = this.profiler.counters.successfulConnections + this.profiler.counters.failedConnections;
        this.currentMetrics.failureRate = totalCompleted > 0 ? 
            (this.profiler.counters.failedConnections / totalCompleted) * 100 : 0;
        
        // Count 30-second failures
        this.currentMetrics.thirtySecondFailures = this.profiler.intervalFailures['30s'] || 0;
        
        // Calculate average connection lifetime
        if (this.profiler.connectionStats.length > 0) {
            const lifetimes = this.profiler.connectionStats
                .filter(stat => stat.lifetime > 0)
                .map(stat => stat.lifetime);
            
            this.currentMetrics.averageLifetime = lifetimes.length > 0 ?
                lifetimes.reduce((sum, lifetime) => sum + lifetime, 0) / lifetimes.length : 0;
        }
    }

    /**
     * Update resource-related metrics
     */
    updateResourceMetrics() {
        if (this.profiler.resourceMetrics.length > 0) {
            const latest = this.profiler.resourceMetrics[this.profiler.resourceMetrics.length - 1];
            this.currentMetrics.memoryGrowth = latest.memory.growthFromBaseline;
        }
    }

    /**
     * Update performance score
     */
    updatePerformanceScore() {
        let score = 100;
        
        // Deduct for high failure rate
        if (this.currentMetrics.failureRate > 10) {
            score -= Math.min(30, this.currentMetrics.failureRate * 2);
        }
        
        // Deduct for 30-second failures
        if (this.currentMetrics.thirtySecondFailures > 0) {
            score -= Math.min(25, this.currentMetrics.thirtySecondFailures * 5);
        }
        
        // Deduct for memory growth
        const memoryGrowthMB = this.currentMetrics.memoryGrowth / (1024 * 1024);
        if (memoryGrowthMB > 20) {
            score -= Math.min(20, memoryGrowthMB / 5);
        }
        
        // Deduct for short connection lifetimes
        if (this.currentMetrics.averageLifetime > 0 && this.currentMetrics.averageLifetime < 60000) {
            score -= 15;
        }
        
        this.currentMetrics.performanceScore = Math.max(0, Math.round(score));
    }

    /**
     * Update historical data
     */
    updateHistory() {
        const timestamp = Date.now();
        
        // Add current metrics to history
        this.history.connectionCounts.push({
            timestamp,
            active: this.currentMetrics.activeConnections,
            total: this.currentMetrics.totalConnections
        });
        
        this.history.failureRates.push({
            timestamp,
            rate: this.currentMetrics.failureRate
        });
        
        this.history.memoryUsage.push({
            timestamp,
            growth: this.currentMetrics.memoryGrowth
        });
        
        this.history.thirtySecondFailures.push({
            timestamp,
            count: this.currentMetrics.thirtySecondFailures
        });
        
        this.history.performanceScores.push({
            timestamp,
            score: this.currentMetrics.performanceScore
        });
        
        // Trim history to keep only recent data
        const maxLength = this.options.historyLength;
        for (const key of Object.keys(this.history)) {
            if (this.history[key].length > maxLength) {
                this.history[key] = this.history[key].slice(-maxLength);
            }
        }
    }

    /**
     * Display console dashboard
     */
    displayDashboard() {
        if (!this.options.enableConsoleOutput) return;
        
        // Clear screen (for ANSI terminals)
        process.stdout.write('\x1Bc');
        
        const uptime = this.profiler.startTime ? Date.now() - this.profiler.startTime : 0;
        const uptimeStr = this.formatDuration(uptime);
        
        console.log('╔══════════════════════════════════════════════════════════════════════╗');
        console.log('║                    WebSocket Stability Profiler                     ║');
        console.log('╠══════════════════════════════════════════════════════════════════════╣');
        console.log(`║ Uptime: ${uptimeStr.padEnd(20)} │ Performance Score: ${this.getScoreDisplay()} ║`);
        console.log('╠══════════════════════════════════════════════════════════════════════╣');
        
        // Connection Status
        console.log('║ CONNECTION STATUS                                                    ║');
        console.log(`║ Active: ${this.currentMetrics.activeConnections.toString().padStart(3)} │ Total: ${this.currentMetrics.totalConnections.toString().padStart(4)} │ Failure Rate: ${this.currentMetrics.failureRate.toFixed(1).padStart(5)}% ║`);
        console.log(`║ Avg Lifetime: ${this.formatDuration(this.currentMetrics.averageLifetime).padEnd(12)} │ 30s Failures: ${this.currentMetrics.thirtySecondFailures.toString().padStart(3)}   ║`);
        console.log('╠══════════════════════════════════════════════════════════════════════╣');
        
        // Resource Usage
        const memoryMB = Math.round(this.currentMetrics.memoryGrowth / 1024 / 1024);
        console.log('║ RESOURCE USAGE                                                       ║');
        console.log(`║ Memory Growth: ${memoryMB.toString().padStart(4)}MB                                         ║`);
        console.log('╠══════════════════════════════════════════════════════════════════════╣');
        
        // Pattern Detection
        console.log('║ PATTERN DETECTION                                                    ║');
        this.displayPatternAnalysis();
        console.log('╠══════════════════════════════════════════════════════════════════════╣');
        
        // Active Alerts
        console.log('║ ALERTS                                                               ║');
        this.displayActiveAlerts();
        console.log('╠══════════════════════════════════════════════════════════════════════╣');
        
        // Recent Activity
        console.log('║ RECENT ACTIVITY                                                      ║');
        this.displayRecentActivity();
        console.log('╚══════════════════════════════════════════════════════════════════════╝');
        
        console.log(`\nLast Updated: ${new Date().toLocaleTimeString()}`);
        
        // Show trend indicators
        this.displayTrendIndicators();
    }

    /**
     * Get performance score display with color
     */
    getScoreDisplay() {
        const score = this.currentMetrics.performanceScore;
        let color, indicator;
        
        if (score >= 90) {
            color = '\x1b[32m'; // Green
            indicator = '●';
        } else if (score >= 70) {
            color = '\x1b[33m'; // Yellow
            indicator = '◐';
        } else {
            color = '\x1b[31m'; // Red
            indicator = '○';
        }
        
        return `${color}${indicator} ${score.toString().padStart(3)}\x1b[0m`;
    }

    /**
     * Display pattern analysis
     */
    displayPatternAnalysis() {
        const patterns = this.analyzeCurrentPatterns();
        
        if (patterns.length === 0) {
            console.log('║ No significant patterns detected                                     ║');
            return;
        }
        
        for (let i = 0; i < Math.min(patterns.length, 3); i++) {
            const pattern = patterns[i];
            const line = `║ ${pattern.description.padEnd(68)} ║`;
            console.log(line);
        }
    }

    /**
     * Analyze current patterns
     */
    analyzeCurrentPatterns() {
        const patterns = [];
        
        // 30-second pattern
        if (this.currentMetrics.thirtySecondFailures > 0) {
            patterns.push({
                type: 'thirty_second_timeout',
                severity: 'HIGH',
                description: `🚨 ${this.currentMetrics.thirtySecondFailures} connections dropped at ~30s`
            });
        }
        
        // High failure rate pattern
        if (this.currentMetrics.failureRate > 25) {
            patterns.push({
                type: 'high_failure_rate',
                severity: 'HIGH',
                description: `⚠️  High failure rate: ${this.currentMetrics.failureRate.toFixed(1)}%`
            });
        }
        
        // Memory growth pattern
        const memoryMB = this.currentMetrics.memoryGrowth / 1024 / 1024;
        if (memoryMB > 30) {
            patterns.push({
                type: 'memory_growth',
                severity: 'MEDIUM',
                description: `💾 Memory growth: ${memoryMB.toFixed(1)}MB`
            });
        }
        
        // Short lifetime pattern
        if (this.currentMetrics.averageLifetime > 0 && this.currentMetrics.averageLifetime < 45000) {
            patterns.push({
                type: 'short_lifetime',
                severity: 'MEDIUM',
                description: `⏱️  Short avg lifetime: ${this.formatDuration(this.currentMetrics.averageLifetime)}`
            });
        }
        
        return patterns.sort((a, b) => {
            const severityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
            return severityOrder[b.severity] - severityOrder[a.severity];
        });
    }

    /**
     * Display active alerts
     */
    displayActiveAlerts() {
        if (this.activeAlerts.size === 0) {
            console.log('║ No active alerts                                                    ║');
            return;
        }
        
        const alerts = Array.from(this.activeAlerts).slice(0, 3);
        for (const alert of alerts) {
            const line = `║ ${alert.padEnd(68)} ║`;
            console.log(line);
        }
    }

    /**
     * Display recent activity
     */
    displayRecentActivity() {
        const recentEvents = this.getRecentEvents(3);
        
        if (recentEvents.length === 0) {
            console.log('║ No recent activity                                                   ║');
            return;
        }
        
        for (const event of recentEvents) {
            const time = new Date(event.timestamp).toLocaleTimeString();
            const line = `║ ${time} │ ${event.description.padEnd(50)} ║`;
            console.log(line);
        }
    }

    /**
     * Get recent events
     */
    getRecentEvents(limit = 5) {
        const events = [];
        
        // Add recent failure patterns
        const recentFailures = this.profiler.failurePatterns.slice(-limit);
        for (const failure of recentFailures) {
            events.push({
                timestamp: failure.timestamp,
                type: 'failure',
                description: `Connection ${failure.connectionId} failed (${Math.round(failure.connectionLifetime/1000)}s)`
            });
        }
        
        return events
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    /**
     * Display trend indicators
     */
    displayTrendIndicators() {
        if (this.history.performanceScores.length < 2) return;
        
        const trends = this.calculateTrends();
        
        console.log('\nTrends (last 5 minutes):');
        console.log(`Performance: ${this.getTrendIndicator(trends.performance)} │ ` +
                   `Failure Rate: ${this.getTrendIndicator(trends.failureRate)} │ ` +
                   `Memory: ${this.getTrendIndicator(trends.memory)}`);
    }

    /**
     * Calculate trends from historical data
     */
    calculateTrends() {
        const trends = {};
        
        // Performance trend
        if (this.history.performanceScores.length >= 2) {
            const recent = this.history.performanceScores.slice(-10);
            const first = recent[0].score;
            const last = recent[recent.length - 1].score;
            trends.performance = last - first;
        }
        
        // Failure rate trend
        if (this.history.failureRates.length >= 2) {
            const recent = this.history.failureRates.slice(-10);
            const first = recent[0].rate;
            const last = recent[recent.length - 1].rate;
            trends.failureRate = last - first;
        }
        
        // Memory trend
        if (this.history.memoryUsage.length >= 2) {
            const recent = this.history.memoryUsage.slice(-10);
            const first = recent[0].growth;
            const last = recent[recent.length - 1].growth;
            trends.memory = last - first;
        }
        
        return trends;
    }

    /**
     * Get trend indicator symbol
     */
    getTrendIndicator(trend) {
        if (trend === undefined) return '─';
        if (trend > 5) return '↗️';
        if (trend < -5) return '↘️';
        return '→';
    }

    /**
     * Check for alert conditions
     */
    checkAlerts() {
        this.activeAlerts.clear();
        
        // Failure rate alert
        if (this.currentMetrics.failureRate > this.alertThresholds.failureRate) {
            this.activeAlerts.add(`🚨 High failure rate: ${this.currentMetrics.failureRate.toFixed(1)}%`);
        }
        
        // 30-second failure alert
        if (this.currentMetrics.thirtySecondFailures >= this.alertThresholds.thirtySecondFailures) {
            this.activeAlerts.add(`⏰ 30s timeout pattern: ${this.currentMetrics.thirtySecondFailures} failures`);
        }
        
        // Memory growth alert
        if (this.currentMetrics.memoryGrowth > this.alertThresholds.memoryGrowth) {
            const memoryMB = Math.round(this.currentMetrics.memoryGrowth / 1024 / 1024);
            this.activeAlerts.add(`💾 High memory growth: ${memoryMB}MB`);
        }
        
        // Performance score alert
        if (this.currentMetrics.performanceScore < this.alertThresholds.performanceScore) {
            this.activeAlerts.add(`📉 Low performance score: ${this.currentMetrics.performanceScore}`);
        }
    }

    /**
     * Handle failure patterns
     */
    handleFailurePattern(pattern) {
        // Emit pattern event for external handling
        this.emit('pattern:detected', pattern);
        
        // Log significant patterns
        if (pattern.connectionLifetime >= 25000 && pattern.connectionLifetime <= 35000) {
            console.log(`🎯 30-second pattern detected: ${pattern.connectionId}`);
        }
    }

    /**
     * Check for connection failure patterns
     */
    checkConnectionFailurePattern(connectionData) {
        const lifetime = connectionData.duration || (Date.now() - connectionData.startTime);
        
        // Check for specific timing patterns
        if (lifetime >= 29000 && lifetime <= 31000) {
            this.emit('pattern:thirty_second', {
                connectionId: connectionData.id,
                lifetime: lifetime,
                closeCode: connectionData.closeCode,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Update metrics from profiler report
     */
    updateMetricsFromReport(report) {
        // Update current metrics with data from profiler report
        if (report.counters) {
            this.currentMetrics.totalConnections = report.counters.totalConnections;
        }
        
        if (report.resourceHealth) {
            this.currentMetrics.memoryGrowth = report.resourceHealth.memory.growthFromBaseline;
        }
        
        if (report.intervalFailures) {
            this.currentMetrics.thirtySecondFailures = report.intervalFailures['30s'] || 0;
        }
    }

    /**
     * Start web interface (basic implementation)
     */
    async startWebInterface() {
        // This would start an HTTP server serving a web dashboard
        // For now, we'll just log that it would be available
        console.log(`🌐 Web interface would be available at http://localhost:${this.options.webPort}`);
        console.log('   (Web interface implementation not included in this example)');
    }

    /**
     * Export dashboard data
     */
    async exportData(filePath) {
        const data = {
            timestamp: Date.now(),
            currentMetrics: this.currentMetrics,
            history: this.history,
            activeAlerts: Array.from(this.activeAlerts),
            profilerStats: {
                connections: this.profiler.connections.size,
                counters: this.profiler.counters,
                intervalFailures: this.profiler.intervalFailures
            }
        };
        
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        console.log(`📊 Dashboard data exported to: ${filePath}`);
    }

    /**
     * Utility method to format duration
     */
    formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
        return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
    }

    /**
     * Stop the dashboard
     */
    async stop() {
        if (!this.isRunning) return;
        
        console.log('🛑 Stopping Profiler Dashboard...');
        
        this.isRunning = false;
        
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        
        if (this.webServer) {
            await new Promise((resolve) => {
                this.webServer.close(resolve);
            });
            this.webServer = null;
        }
        
        this.emit('dashboard:stopped');
        console.log('✅ Profiler Dashboard stopped');
    }
}

module.exports = ProfilerDashboard;