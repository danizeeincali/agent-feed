"use strict";
/**
 * SSE Streaming Guardian
 * Monitors and protects SSE streaming functionality during UI modernization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sseStreamingGuardian = exports.SSEStreamingGuardian = void 0;
const events_1 = require("events");
class SSEStreamingGuardian extends events_1.EventEmitter {
    connectionHealth = new Map();
    streamingEvents = [];
    monitoringInterval = null;
    disruptionDetectionTimeout = null;
    activeConnections = new Set();
    messageCounters = new Map();
    constructor() {
        super();
        this.startStreami;
        GuardianngMonitoring();
        this.setupEventSourceMonitoring();
    }
    startStreamingMonitoring() {
        // Monitor SSE health every 10 seconds
        this.monitoringInterval = setInterval(() => {
            this.checkStreamingHealth();
        }, 10000);
        // Check for disruptions every 5 seconds
        this.disruptionDetectionTimeout = setInterval(() => {
            this.detectStreamingDisruptions();
        }, 5000);
        console.log('[NLD] SSE Streaming Guardian monitoring started');
    }
    setupEventSourceMonitoring() {
        // Override EventSource to monitor all SSE connections
        const originalEventSource = window.EventSource;
        const guardian = this;
        window.EventSource = class extends originalEventSource {
            instanceId = null;
            startTime = Date.now();
            messageCount = 0;
            constructor(url, eventSourceInitDict) {
                super(url, eventSourceInitDict);
                // Extract instance ID from URL if present
                const urlStr = url.toString();
                const instanceMatch = urlStr.match(/claude-[a-zA-Z0-9]+/);
                if (instanceMatch) {
                    this.instanceId = instanceMatch[0];
                    guardian.registerConnection(this.instanceId);
                }
                // Monitor connection establishment
                this.addEventListener('open', () => {
                    guardian.recordStreamingEvent({
                        type: 'connection',
                        timestamp: Date.now(),
                        data: { status: 'connected', url: urlStr },
                        instanceId: this.instanceId || 'unknown',
                        severity: 'LOW'
                    });
                    if (this.instanceId) {
                        guardian.updateConnectionHealth(this.instanceId, {
                            isConnected: true,
                            connectionType: 'sse',
                            lastMessageTime: Date.now(),
                            messageCount: 0,
                            errorCount: 0,
                            latency: Date.now() - this.startTime
                        });
                    }
                });
                // Monitor messages
                this.addEventListener('message', (event) => {
                    this.messageCount++;
                    guardian.recordStreamingEvent({
                        type: 'message',
                        timestamp: Date.now(),
                        data: { messageSize: event.data.length, messageCount: this.messageCount },
                        instanceId: this.instanceId || 'unknown',
                        severity: 'LOW'
                    });
                    if (this.instanceId) {
                        guardian.updateMessageCount(this.instanceId);
                        guardian.updateLastMessageTime(this.instanceId);
                    }
                });
                // Monitor errors
                this.addEventListener('error', (event) => {
                    guardian.recordStreamingEvent({
                        type: 'error',
                        timestamp: Date.now(),
                        data: { error: 'SSE connection error', readyState: this.readyState },
                        instanceId: this.instanceId || 'unknown',
                        severity: 'HIGH'
                    });
                    if (this.instanceId) {
                        guardian.incrementErrorCount(this.instanceId);
                    }
                });
            }
            close() {
                if (this.instanceId) {
                    guardian.unregisterConnection(this.instanceId);
                }
                super.close();
            }
        };
        console.log('[NLD] EventSource monitoring override established');
    }
    registerConnection(instanceId) {
        this.activeConnections.add(instanceId);
        this.messageCounters.set(instanceId, 0);
        // Initialize health tracking
        this.connectionHealth.set(instanceId, {
            isConnected: false,
            connectionType: 'none',
            lastMessageTime: 0,
            messageCount: 0,
            errorCount: 0,
            latency: 0
        });
        console.log(`[NLD] SSE connection registered: ${instanceId}`);
    }
    unregisterConnection(instanceId) {
        this.activeConnections.delete(instanceId);
        this.messageCounters.delete(instanceId);
        this.connectionHealth.delete(instanceId);
        console.log(`[NLD] SSE connection unregistered: ${instanceId}`);
    }
    updateConnectionHealth(instanceId, health) {
        const current = this.connectionHealth.get(instanceId);
        if (current) {
            this.connectionHealth.set(instanceId, { ...current, ...health });
        }
    }
    updateMessageCount(instanceId) {
        const current = this.messageCounters.get(instanceId) || 0;
        this.messageCounters.set(instanceId, current + 1);
        const health = this.connectionHealth.get(instanceId);
        if (health) {
            health.messageCount = current + 1;
        }
    }
    updateLastMessageTime(instanceId) {
        const health = this.connectionHealth.get(instanceId);
        if (health) {
            health.lastMessageTime = Date.now();
        }
    }
    incrementErrorCount(instanceId) {
        const health = this.connectionHealth.get(instanceId);
        if (health) {
            health.errorCount++;
        }
    }
    checkStreamingHealth() {
        const currentTime = Date.now();
        this.connectionHealth.forEach((health, instanceId) => {
            // Check for stale connections (no messages for 60 seconds)
            if (health.isConnected && health.lastMessageTime > 0) {
                const timeSinceLastMessage = currentTime - health.lastMessageTime;
                if (timeSinceLastMessage > 60000) { // 60 seconds
                    this.recordStreamingEvent({
                        type: 'disruption',
                        timestamp: currentTime,
                        data: {
                            reason: 'stale_connection',
                            inactiveDuration: timeSinceLastMessage,
                            instanceId
                        },
                        instanceId,
                        severity: 'HIGH'
                    });
                    console.warn(`[NLD] Stale SSE connection detected: ${instanceId} (${timeSinceLastMessage}ms inactive)`);
                }
            }
            // Check for excessive errors
            if (health.errorCount > 5) {
                this.recordStreamingEvent({
                    type: 'disruption',
                    timestamp: currentTime,
                    data: {
                        reason: 'excessive_errors',
                        errorCount: health.errorCount,
                        instanceId
                    },
                    instanceId,
                    severity: 'CRITICAL'
                });
                console.error(`[NLD] Excessive SSE errors detected: ${instanceId} (${health.errorCount} errors)`);
            }
        });
    }
    detectStreamingDisruptions() {
        // Detect UI changes that might have broken streaming
        const currentTime = Date.now();
        // Check if any previously active connections have gone silent
        this.activeConnections.forEach(instanceId => {
            const health = this.connectionHealth.get(instanceId);
            if (health && health.isConnected) {
                const timeSinceLastMessage = currentTime - health.lastMessageTime;
                // If connection was established but no messages for 30 seconds, it might be disrupted
                if (health.lastMessageTime > 0 && timeSinceLastMessage > 30000) {
                    // Check if this is due to recent DOM changes (UI modernization)
                    if (this.hasRecentDOMChanges()) {
                        this.recordStreamingEvent({
                            type: 'disruption',
                            timestamp: currentTime,
                            data: {
                                reason: 'ui_modernization_disruption',
                                timeSinceLastMessage,
                                instanceId,
                                domChangesDetected: true
                            },
                            instanceId,
                            severity: 'CRITICAL'
                        });
                        console.error(`[NLD] UI modernization disrupted SSE streaming: ${instanceId}`);
                        this.emit('ui-disruption-detected', { instanceId, timeSinceLastMessage });
                    }
                }
            }
        });
    }
    hasRecentDOMChanges() {
        // Simple heuristic: check if there have been significant DOM mutations recently
        // In a real implementation, this would integrate with MutationObserver
        const recentEvents = this.streamingEvents.filter(event => Date.now() - event.timestamp < 30000 &&
            event.type === 'error');
        return recentEvents.length > 2; // More than 2 errors in 30 seconds suggests disruption
    }
    recordStreamingEvent(event) {
        this.streamingEvents.push(event);
        // Keep only last 1000 events
        if (this.streamingEvents.length > 1000) {
            this.streamingEvents = this.streamingEvents.slice(-1000);
        }
        // Emit alerts for high severity events
        if (event.severity === 'HIGH' || event.severity === 'CRITICAL') {
            this.emit('streaming-alert', event);
        }
        // Trigger automatic recovery for critical disruptions
        if (event.severity === 'CRITICAL' && event.type === 'disruption') {
            this.attemptStreamingRecovery(event.instanceId || 'unknown');
        }
    }
    async attemptStreamingRecovery(instanceId) {
        console.log(`[NLD] Attempting SSE streaming recovery for: ${instanceId}`);
        try {
            // Step 1: Check if the connection still exists
            const health = this.connectionHealth.get(instanceId);
            if (!health) {
                console.warn(`[NLD] No health record for instance: ${instanceId}`);
                return false;
            }
            // Step 2: Try to re-establish connection
            const recoverySuccess = await this.forceConnectionReestablishment(instanceId);
            if (recoverySuccess) {
                console.log(`[NLD] SSE streaming recovery successful: ${instanceId}`);
                this.emit('streaming-recovered', { instanceId });
                return true;
            }
            else {
                console.warn(`[NLD] SSE streaming recovery failed: ${instanceId}`);
                this.emit('streaming-recovery-failed', { instanceId });
                return false;
            }
        }
        catch (error) {
            console.error(`[NLD] SSE streaming recovery error: ${instanceId}`, error);
            this.emit('streaming-recovery-error', { instanceId, error });
            return false;
        }
    }
    async forceConnectionReestablishment(instanceId) {
        // Attempt to trigger reconnection through various mechanisms
        // Method 1: Trigger useHTTPSSE reconnection if available
        const reconnectionEvent = new CustomEvent('sse-force-reconnect', {
            detail: { instanceId }
        });
        window.dispatchEvent(reconnectionEvent);
        // Method 2: Signal component to reestablish connection
        this.emit('force-reconnect', { instanceId });
        // Method 3: Last resort - page refresh if critical
        const health = this.connectionHealth.get(instanceId);
        if (health && health.errorCount > 10) {
            console.warn(`[NLD] Critical SSE failure, considering page refresh for: ${instanceId}`);
            this.emit('critical-failure', { instanceId, action: 'page_refresh_recommended' });
        }
        // Wait a bit and check if recovery worked
        await new Promise(resolve => setTimeout(resolve, 2000));
        const newHealth = this.connectionHealth.get(instanceId);
        return newHealth ? newHealth.isConnected : false;
    }
    getStreamingHealth() {
        return new Map(this.connectionHealth);
    }
    getRecentEvents(count = 50) {
        return this.streamingEvents.slice(-count);
    }
    getActiveConnections() {
        return Array.from(this.activeConnections);
    }
    generateStreamingReport() {
        const activeCount = this.activeConnections.size;
        const recentEvents = this.getRecentEvents(20);
        const errorEvents = recentEvents.filter(e => e.type === 'error' || e.severity === 'HIGH');
        const disruptionEvents = recentEvents.filter(e => e.type === 'disruption');
        const healthSummary = Array.from(this.connectionHealth.entries())
            .map(([instanceId, health]) => {
            const timeSinceLastMessage = health.lastMessageTime > 0
                ? Date.now() - health.lastMessageTime
                : 0;
            return `${instanceId.slice(0, 8)}: ${health.isConnected ? '🟢' : '🔴'} ${health.connectionType} (${health.messageCount} msgs, ${Math.round(timeSinceLastMessage / 1000)}s ago)`;
        });
        return `
SSE Streaming Guardian Report
============================

Active Connections: ${activeCount}
Recent Errors: ${errorEvents.length}
Recent Disruptions: ${disruptionEvents.length}

Connection Health:
${healthSummary.length > 0 ? healthSummary.join('\n') : 'No active connections'}

Recent Critical Events:
${errorEvents.slice(-5).map(event => `${new Date(event.timestamp).toLocaleTimeString()} - ${event.type}: ${JSON.stringify(event.data)}`).join('\n') || 'None'}

Streaming Disruptions:
${disruptionEvents.slice(-3).map(event => `${new Date(event.timestamp).toLocaleTimeString()} - ${event.data.reason} (${event.instanceId})`).join('\n') || 'None detected'}

Recovery Recommendations:
${this.generateRecoveryRecommendations()}
`;
    }
    generateRecoveryRecommendations() {
        const recommendations = [];
        const errorEvents = this.getRecentEvents(50).filter(e => e.type === 'error');
        const disruptionEvents = this.getRecentEvents(50).filter(e => e.type === 'disruption');
        if (errorEvents.length > 10) {
            recommendations.push('- High error rate detected, check SSE endpoint stability');
        }
        if (disruptionEvents.some(e => e.data.reason === 'ui_modernization_disruption')) {
            recommendations.push('- UI modernization disrupted streaming, consider rollback');
        }
        if (this.activeConnections.size === 0) {
            recommendations.push('- No active SSE connections, check connection establishment');
        }
        const staleConnections = Array.from(this.connectionHealth.entries())
            .filter(([_, health]) => health.isConnected && Date.now() - health.lastMessageTime > 60000);
        if (staleConnections.length > 0) {
            recommendations.push(`- ${staleConnections.length} stale connections detected, force reconnection`);
        }
        if (recommendations.length === 0) {
            recommendations.push('✅ SSE streaming operating normally');
        }
        return recommendations.join('\n');
    }
    destroy() {
        // Clear monitoring intervals
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        if (this.disruptionDetectionTimeout) {
            clearInterval(this.disruptionDetectionTimeout);
            this.disruptionDetectionTimeout = null;
        }
        // Clear data structures
        this.connectionHealth.clear();
        this.streamingEvents = [];
        this.activeConnections.clear();
        this.messageCounters.clear();
        // Remove event listeners
        this.removeAllListeners();
        console.log('[NLD] SSE Streaming Guardian destroyed');
    }
}
exports.SSEStreamingGuardian = SSEStreamingGuardian;
exports.sseStreamingGuardian = new SSEStreamingGuardian();
//# sourceMappingURL=sse-streaming-guardian.js.map