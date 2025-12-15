/**
 * Production Structure Monitoring Service
 * Continuous monitoring of directory structure integrity
 */

const StructureProtection = require('../config/structure-protection');
const fs = require('fs');
const path = require('path');

class StructureMonitor {
    constructor(options = {}) {
        this.protector = new StructureProtection();
        this.options = {
            interval: options.interval || 60000, // 1 minute
            alertThreshold: options.alertThreshold || 1, // Alert after 1 failure
            logRetention: options.logRetention || 7 * 24 * 60 * 60 * 1000, // 7 days
            ...options
        };
        this.running = false;
        this.failureCount = 0;
        this.lastSuccessTime = null;
    }

    /**
     * Start continuous monitoring
     */
    async start() {
        if (this.running) {
            console.log('⚠️ Structure monitor is already running');
            return;
        }

        console.log('🚀 Starting production structure monitoring...');
        console.log(`   Interval: ${this.options.interval}ms`);
        console.log(`   Alert threshold: ${this.options.alertThreshold} failures`);
        console.log('');

        this.running = true;
        this.monitorLoop();
    }

    /**
     * Stop monitoring
     */
    stop() {
        console.log('🛑 Stopping structure monitoring...');
        this.running = false;
    }

    /**
     * Main monitoring loop
     */
    async monitorLoop() {
        while (this.running) {
            try {
                await this.performCheck();
                await this.sleep(this.options.interval);
            } catch (error) {
                console.error('🚨 Monitor loop error:', error.message);
                await this.logError('MONITOR_ERROR', error);
                await this.sleep(this.options.interval);
            }
        }
    }

    /**
     * Perform structure validation check
     */
    async performCheck() {
        const timestamp = new Date().toISOString();
        
        try {
            const results = await this.protector.validateStructure();
            
            if (results.status === 'PASS' && results.protection_status === 'ACTIVE') {
                // Success
                this.failureCount = 0;
                this.lastSuccessTime = timestamp;
                
                await this.logSuccess(results);
                
                if (this.options.verbose) {
                    console.log(`✅ [${timestamp}] Structure validation passed`);
                }
            } else {
                // Failure
                this.failureCount++;
                
                console.log(`❌ [${timestamp}] Structure validation failed (${this.failureCount} consecutive failures)`);
                console.log(`   Status: ${results.status}`);
                console.log(`   Protection: ${results.protection_status}`);
                console.log(`   Critical failures: ${results.critical_failures.length}`);
                
                await this.logFailure(results);
                
                // Send alert if threshold reached
                if (this.failureCount >= this.options.alertThreshold) {
                    await this.sendAlert(results);
                }
            }
        } catch (error) {
            this.failureCount++;
            console.error(`🚨 [${timestamp}] Validation error: ${error.message}`);
            await this.logError('VALIDATION_ERROR', error);
            
            if (this.failureCount >= this.options.alertThreshold) {
                await this.sendAlert(null, error);
            }
        }
    }

    /**
     * Log successful validation
     */
    async logSuccess(results) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'SUCCESS',
            status: results.status,
            protection_status: results.protection_status,
            validated_paths: results.validated_paths.length,
            consecutive_failures: 0
        };

        await this.writeLog('monitoring.log', logEntry);
    }

    /**
     * Log validation failure
     */
    async logFailure(results) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'FAILURE',
            status: results.status,
            protection_status: results.protection_status,
            critical_failures: results.critical_failures,
            warnings: results.warnings,
            validated_paths: results.validated_paths.length,
            missing_paths: results.missing_paths.length,
            consecutive_failures: this.failureCount
        };

        await this.writeLog('monitoring.log', logEntry);
        await this.writeLog('failures.log', logEntry);
    }

    /**
     * Log system errors
     */
    async logError(type, error) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: type,
            error: error.message,
            stack: error.stack,
            consecutive_failures: this.failureCount
        };

        await this.writeLog('errors.log', logEntry);
    }

    /**
     * Write log entry to file
     */
    async writeLog(filename, entry) {
        const logDir = '/workspaces/agent-feed/prod/logs';
        const logFile = path.join(logDir, filename);

        // Ensure log directory exists
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
    }

    /**
     * Send alert for critical failures
     */
    async sendAlert(results, error = null) {
        const timestamp = new Date().toISOString();
        
        console.log('🚨 **STRUCTURE INTEGRITY ALERT**');
        console.log(`   Time: ${timestamp}`);
        console.log(`   Consecutive failures: ${this.failureCount}`);
        console.log(`   Last success: ${this.lastSuccessTime || 'Never'}`);
        
        if (error) {
            console.log(`   Error: ${error.message}`);
        } else if (results) {
            console.log(`   Status: ${results.status}`);
            console.log(`   Protection: ${results.protection_status}`);
            console.log(`   Critical failures: ${results.critical_failures.length}`);
        }
        
        // Create alert file for external monitoring systems
        const alertDir = '/workspaces/agent-feed/prod/monitoring/alerts';
        if (!fs.existsSync(alertDir)) {
            fs.mkdirSync(alertDir, { recursive: true });
        }
        
        const alertFile = path.join(alertDir, `alert-${timestamp.replace(/[:.]/g, '-')}.json`);
        const alertData = {
            timestamp,
            type: 'STRUCTURE_INTEGRITY_ALERT',
            consecutive_failures: this.failureCount,
            last_success: this.lastSuccessTime,
            validation_results: results,
            error: error ? {
                message: error.message,
                stack: error.stack
            } : null
        };
        
        fs.writeFileSync(alertFile, JSON.stringify(alertData, null, 2));
        
        // Log alert
        await this.logError('ALERT_SENT', new Error(`Structure integrity alert sent after ${this.failureCount} consecutive failures`));
    }

    /**
     * Get monitoring status
     */
    getStatus() {
        return {
            running: this.running,
            consecutive_failures: this.failureCount,
            last_success: this.lastSuccessTime,
            interval: this.options.interval,
            alert_threshold: this.options.alertThreshold
        };
    }

    /**
     * Get monitoring statistics
     */
    async getStatistics(timeWindow = 24 * 60 * 60 * 1000) { // 24 hours
        const logFile = '/workspaces/agent-feed/prod/logs/monitoring.log';
        
        if (!fs.existsSync(logFile)) {
            return {
                total_checks: 0,
                successful_checks: 0,
                failed_checks: 0,
                success_rate: 0,
                average_interval: this.options.interval
            };
        }

        const cutoffTime = new Date(Date.now() - timeWindow).toISOString();
        const logContent = fs.readFileSync(logFile, 'utf8');
        const lines = logContent.trim().split('\n').filter(line => line);
        
        let totalChecks = 0;
        let successfulChecks = 0;
        let failedChecks = 0;
        
        for (const line of lines) {
            try {
                const entry = JSON.parse(line);
                if (entry.timestamp >= cutoffTime) {
                    totalChecks++;
                    if (entry.type === 'SUCCESS') {
                        successfulChecks++;
                    } else if (entry.type === 'FAILURE') {
                        failedChecks++;
                    }
                }
            } catch (error) {
                // Skip invalid JSON lines
            }
        }
        
        return {
            total_checks: totalChecks,
            successful_checks: successfulChecks,
            failed_checks: failedChecks,
            success_rate: totalChecks > 0 ? (successfulChecks / totalChecks * 100).toFixed(2) : 0,
            average_interval: this.options.interval
        };
    }

    /**
     * Clean up old log files
     */
    async cleanupLogs() {
        const logDir = '/workspaces/agent-feed/prod/logs';
        const alertDir = '/workspaces/agent-feed/prod/monitoring/alerts';
        const cutoffTime = Date.now() - this.options.logRetention;
        
        // Clean monitoring logs
        await this.cleanupDirectory(logDir, cutoffTime);
        
        // Clean alert files
        await this.cleanupDirectory(alertDir, cutoffTime);
    }

    /**
     * Clean up files older than cutoff time
     */
    async cleanupDirectory(dir, cutoffTime) {
        if (!fs.existsSync(dir)) return;
        
        const files = fs.readdirSync(dir);
        let cleanedCount = 0;
        
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            
            if (stats.mtime.getTime() < cutoffTime) {
                fs.unlinkSync(filePath);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} old files from ${dir}`);
        }
    }

    /**
     * Sleep utility
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// CLI entry point
if (require.main === module) {
    const monitor = new StructureMonitor({
        verbose: process.argv.includes('--verbose'),
        interval: process.argv.includes('--fast') ? 10000 : 60000
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        monitor.stop();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
        monitor.stop();
        process.exit(0);
    });

    // Start monitoring
    monitor.start().catch(error => {
        console.error('🚨 Failed to start monitoring:', error.message);
        process.exit(1);
    });
}

module.exports = StructureMonitor;