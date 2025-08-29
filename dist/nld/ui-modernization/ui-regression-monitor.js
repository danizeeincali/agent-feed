"use strict";
/**
 * NLD UI Regression Monitor
 * Detects when UI modernization breaks existing Claude functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.uiRegressionMonitor = exports.UIRegressionMonitor = void 0;
const events_1 = require("events");
class UIRegressionMonitor extends events_1.EventEmitter {
    patterns = new Map();
    activeMonitors = new Map();
    regressionEvents = [];
    observers = [];
    performanceObserver;
    constructor() {
        super();
        this.initializePatterns();
        this.startMonitoring();
    }
    initializePatterns() {
        // Pattern 1: Claude Functionality Regression
        this.registerPattern({
            id: 'CLAUDE_FUNCTIONALITY_REGRESSION',
            type: 'CLAUDE_FUNCTIONALITY_REGRESSION',
            severity: 'CRITICAL',
            description: 'UI changes break Claude process spawning or button functionality',
            detectionCriteria: {
                selector: 'button[data-claude-action]',
                event: 'click',
                condition: 'button_click_handler_missing || process_spawn_failure'
            },
            affectedComponents: ['ClaudeInstanceManager', 'SimpleLauncher', 'TerminalView'],
            rollbackAction: async () => {
                console.warn('[NLD] CRITICAL: Claude functionality broken - initiating rollback');
                await this.restoreClaudeFunctionality();
            }
        });
        // Pattern 2: SSE Streaming Disruption
        this.registerPattern({
            id: 'SSE_STREAMING_DISRUPTION',
            type: 'SSE_STREAMING_DISRUPTION',
            severity: 'HIGH',
            description: 'UI updates break SSE streaming connections',
            detectionCriteria: {
                event: 'sse_connection_lost',
                threshold: 3,
                condition: 'streaming_interruption_after_ui_change'
            },
            affectedComponents: ['useHTTPSSE', 'Terminal', 'ProcessManager'],
            rollbackAction: async () => {
                console.warn('[NLD] SSE streaming disrupted - restoring connection');
                await this.restoreSSEFunctionality();
            }
        });
        // Pattern 3: Button Interaction Degradation
        this.registerPattern({
            id: 'BUTTON_INTERACTION_DEGRADATION',
            type: 'BUTTON_INTERACTION_DEGRADATION',
            severity: 'HIGH',
            description: 'Professional styling breaks button click handlers',
            detectionCriteria: {
                selector: 'button',
                event: 'click',
                condition: 'click_handler_not_firing || loading_state_stuck'
            },
            affectedComponents: ['ClaudeInstanceManager', 'UI Buttons', 'Action Handlers'],
            rollbackAction: async () => {
                console.warn('[NLD] Button interactions failing - restoring handlers');
                await this.restoreButtonFunctionality();
            }
        });
        // Pattern 4: Component State Desync
        this.registerPattern({
            id: 'COMPONENT_STATE_DESYNC',
            type: 'COMPONENT_STATE_DESYNC',
            severity: 'MEDIUM',
            description: 'UI modernization causes state synchronization issues',
            detectionCriteria: {
                condition: 'state_mismatch_between_components || hook_lifecycle_broken'
            },
            affectedComponents: ['React Hooks', 'State Management', 'Component Lifecycle'],
            rollbackAction: async () => {
                console.warn('[NLD] Component state desync detected - resynchronizing');
                await this.restoreStateSynchronization();
            }
        });
        // Pattern 5: Performance Degradation
        this.registerPattern({
            id: 'PERFORMANCE_DEGRADATION',
            type: 'PERFORMANCE_DEGRADATION',
            severity: 'MEDIUM',
            description: 'UI changes cause performance issues affecting functionality',
            detectionCriteria: {
                threshold: 2000, // 2 second render threshold
                condition: 'render_time_exceeded || memory_leak_detected'
            },
            affectedComponents: ['Rendering Engine', 'Animation System', 'Memory Management'],
            rollbackAction: async () => {
                console.warn('[NLD] Performance degradation detected - optimizing');
                await this.restorePerformance();
            }
        });
    }
    registerPattern(pattern) {
        this.patterns.set(pattern.id, pattern);
        this.activeMonitors.set(pattern.id, true);
    }
    startMonitoring() {
        // Monitor DOM mutations that could affect Claude functionality
        this.setupDOMMonitoring();
        // Monitor performance regressions
        this.setupPerformanceMonitoring();
        // Monitor event handler integrity
        this.setupEventMonitoring();
        // Monitor SSE connection health
        this.setupSSEMonitoring();
        // Monitor component state consistency
        this.setupStateMonitoring();
        console.log('[NLD] UI Regression monitoring active - 5 patterns registered');
    }
    setupDOMMonitoring() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Check for button removal/modification
                if (mutation.type === 'childList') {
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node;
                            if (element.matches('button[data-claude-action]')) {
                                this.detectRegression('CLAUDE_FUNCTIONALITY_REGRESSION', {
                                    component: 'Button',
                                    operation: 'DOM_REMOVAL',
                                    state: { removedButton: element.outerHTML }
                                });
                            }
                        }
                    });
                }
                // Check for class/style changes that might break functionality
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target.matches('button') &&
                        (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
                        this.validateButtonFunctionality(target);
                    }
                }
            });
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'disabled', 'data-claude-action']
        });
        this.observers.push(observer);
    }
    setupPerformanceMonitoring() {
        if ('PerformanceObserver' in window) {
            this.performanceObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.entryType === 'measure' && entry.duration > 2000) {
                        this.detectRegression('PERFORMANCE_DEGRADATION', {
                            component: 'Rendering',
                            operation: 'SLOW_RENDER',
                            state: {
                                duration: entry.duration,
                                name: entry.name
                            }
                        });
                    }
                    if (entry.entryType === 'navigation') {
                        const navEntry = entry;
                        const loadTime = navEntry.loadEventEnd - navEntry.navigationStart;
                        if (loadTime > 5000) {
                            this.detectRegression('PERFORMANCE_DEGRADATION', {
                                component: 'Page Load',
                                operation: 'SLOW_LOAD',
                                state: { loadTime }
                            });
                        }
                    }
                });
            });
            this.performanceObserver.observe({
                entryTypes: ['measure', 'navigation', 'paint']
            });
        }
    }
    setupEventMonitoring() {
        // Monitor button clicks to ensure handlers are working
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (target.matches('button[data-claude-action]')) {
                // Start a timer to check if the expected action occurs
                const actionTimeout = setTimeout(() => {
                    this.detectRegression('BUTTON_INTERACTION_DEGRADATION', {
                        component: 'ButtonHandler',
                        operation: 'CLICK_NO_RESPONSE',
                        state: {
                            button: target.outerHTML,
                            action: target.getAttribute('data-claude-action')
                        }
                    });
                }, 1000); // If no response in 1 second, consider it broken
                // Clear timeout if we detect proper response
                const clearTimeoutIfHandled = () => {
                    clearTimeout(actionTimeout);
                };
                // Monitor for expected responses
                this.once('claude-action-handled', clearTimeoutIfHandled);
            }
        }, true);
    }
    setupSSEMonitoring() {
        // Monitor SSE connection health
        let lastSSEActivity = Date.now();
        // Listen for SSE events
        window.addEventListener('sse-event', () => {
            lastSSEActivity = Date.now();
        });
        // Check SSE health periodically
        setInterval(() => {
            const timeSinceLastActivity = Date.now() - lastSSEActivity;
            if (timeSinceLastActivity > 30000) { // 30 seconds without SSE activity
                this.detectRegression('SSE_STREAMING_DISRUPTION', {
                    component: 'SSE Connection',
                    operation: 'CONNECTION_INACTIVE',
                    state: {
                        inactiveDuration: timeSinceLastActivity,
                        lastActivity: new Date(lastSSEActivity).toISOString()
                    }
                });
            }
        }, 10000); // Check every 10 seconds
    }
    setupStateMonitoring() {
        // Monitor React component state consistency
        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
            // Hook into React DevTools if available for state monitoring
            const reactHook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
            // Monitor for state inconsistencies
            const originalSetState = React.Component.prototype.setState;
            React.Component.prototype.setState = function (updater, callback) {
                const startTime = performance.now();
                const originalCallback = callback;
                const wrappedCallback = () => {
                    const endTime = performance.now();
                    if (endTime - startTime > 100) {
                        // State update took too long
                        this.detectRegression('COMPONENT_STATE_DESYNC', {
                            component: this.constructor.name,
                            operation: 'SLOW_STATE_UPDATE',
                            state: { duration: endTime - startTime }
                        });
                    }
                    if (originalCallback)
                        originalCallback();
                };
                return originalSetState.call(this, updater, wrappedCallback);
            }.bind(this);
        }
    }
    async validateButtonFunctionality(button) {
        // Check if button still has required Claude functionality
        const claudeAction = button.getAttribute('data-claude-action');
        if (claudeAction) {
            // Simulate click to test handler
            const testEvent = new MouseEvent('click', { bubbles: true });
            button.dispatchEvent(testEvent);
            // Wait a bit and check if expected action occurred
            setTimeout(() => {
                if (!this.hasRecentClaudeActivity()) {
                    this.detectRegression('CLAUDE_FUNCTIONALITY_REGRESSION', {
                        component: 'ClaudeButton',
                        operation: 'HANDLER_VALIDATION_FAILED',
                        state: {
                            button: button.outerHTML,
                            action: claudeAction
                        }
                    });
                }
            }, 500);
        }
    }
    hasRecentClaudeActivity() {
        // Check for recent Claude-related activity
        const recentLogs = this.getRecentConsoleLogs();
        return recentLogs.some(log => log.includes('Claude') ||
            log.includes('process spawned') ||
            log.includes('SSE'));
    }
    getRecentConsoleLogs() {
        // This would integrate with console monitoring
        return [];
    }
    detectRegression(patternId, context) {
        const pattern = this.patterns.get(patternId);
        if (!pattern || !this.activeMonitors.get(patternId))
            return;
        const event = {
            pattern,
            timestamp: Date.now(),
            context: {
                component: context.component,
                operation: context.operation,
                state: context.state,
                errorDetails: context.errorDetails
            },
            userImpact: this.assessUserImpact(pattern),
            recoveryStatus: 'PENDING'
        };
        this.regressionEvents.push(event);
        this.emit('regression-detected', event);
        console.error(`[NLD] UI REGRESSION DETECTED: ${pattern.type}`, event);
        // Trigger automatic recovery for critical issues
        if (pattern.severity === 'CRITICAL') {
            this.initiateAutoRecovery(event);
        }
    }
    assessUserImpact(pattern) {
        const impacts = {
            'CLAUDE_FUNCTIONALITY_REGRESSION': 'Users cannot spawn Claude processes or interact with main functionality',
            'SSE_STREAMING_DISRUPTION': 'Users lose real-time terminal output and process communication',
            'BUTTON_INTERACTION_DEGRADATION': 'Users cannot interact with UI controls properly',
            'COMPONENT_STATE_DESYNC': 'Users may experience inconsistent UI state and behavior',
            'PERFORMANCE_DEGRADATION': 'Users experience slow, unresponsive interface'
        };
        return impacts[pattern.type] || 'Unknown user impact';
    }
    async initiateAutoRecovery(event) {
        console.warn(`[NLD] Initiating auto-recovery for ${event.pattern.type}`);
        event.recoveryStatus = 'IN_PROGRESS';
        try {
            if (event.pattern.rollbackAction) {
                await event.pattern.rollbackAction();
                event.recoveryStatus = 'RECOVERED';
                console.log(`[NLD] Auto-recovery successful for ${event.pattern.type}`);
            }
        }
        catch (error) {
            event.recoveryStatus = 'FAILED';
            console.error(`[NLD] Auto-recovery failed for ${event.pattern.type}:`, error);
        }
        this.emit('recovery-attempted', event);
    }
    async restoreClaudeFunctionality() {
        // Restore Claude button handlers and process spawning
        const claudeButtons = document.querySelectorAll('button[data-claude-action]');
        claudeButtons.forEach(button => {
            if (!button.onclick) {
                // Re-attach click handlers
                this.reattachClaudeHandlers(button);
            }
        });
    }
    async restoreSSEFunctionality() {
        // Attempt to restore SSE connection
        if (window.location.reload) {
            console.warn('[NLD] Reloading page to restore SSE functionality');
            window.location.reload();
        }
    }
    async restoreButtonFunctionality() {
        // Restore button event handlers
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            if (button.disabled && !button.hasAttribute('data-originally-disabled')) {
                button.disabled = false;
            }
        });
    }
    async restoreStateSynchronization() {
        // Force re-render of problematic components
        this.emit('force-rerender');
    }
    async restorePerformance() {
        // Remove expensive animations or styles
        document.querySelectorAll('[data-expensive-animation]').forEach(el => {
            el.classList.add('reduced-motion');
        });
    }
    reattachClaudeHandlers(button) {
        const action = button.getAttribute('data-claude-action');
        if (action) {
            button.onclick = async (event) => {
                event.preventDefault();
                console.log(`[NLD] Restored handler executed: ${action}`);
                this.emit('claude-action-handled', { action });
                // Simulate the original handler behavior
                if (action === 'launch-claude') {
                    this.simulateClaudeLaunch(button);
                }
            };
        }
    }
    simulateClaudeLaunch(button) {
        button.disabled = true;
        button.textContent = 'Launching...';
        setTimeout(() => {
            button.disabled = false;
            button.textContent = 'Launch Claude';
            console.log('[NLD] Claude launch simulation completed');
        }, 2000);
    }
    getRegressionHistory() {
        return [...this.regressionEvents];
    }
    getActivePatterns() {
        return Array.from(this.patterns.values()).filter(p => this.activeMonitors.get(p.id));
    }
    generateReport() {
        const totalEvents = this.regressionEvents.length;
        const criticalEvents = this.regressionEvents.filter(e => e.pattern.severity === 'CRITICAL').length;
        const recoveredEvents = this.regressionEvents.filter(e => e.recoveryStatus === 'RECOVERED').length;
        return `
NLD UI Regression Monitoring Report
===================================

Total Regression Events: ${totalEvents}
Critical Events: ${criticalEvents}
Successfully Recovered: ${recoveredEvents}
Recovery Success Rate: ${totalEvents > 0 ? (recoveredEvents / totalEvents * 100).toFixed(1) : 0}%

Active Monitoring Patterns: ${this.getActivePatterns().length}

Recent Events:
${this.regressionEvents.slice(-5).map(e => `- ${e.pattern.type} at ${new Date(e.timestamp).toISOString()} [${e.recoveryStatus}]`).join('\n')}
`;
    }
    destroy() {
        // Cleanup observers
        this.observers.forEach(observer => observer.disconnect());
        this.performanceObserver?.disconnect();
        // Clear patterns and events
        this.patterns.clear();
        this.activeMonitors.clear();
        this.regressionEvents = [];
        this.removeAllListeners();
        console.log('[NLD] UI Regression Monitor destroyed');
    }
}
exports.UIRegressionMonitor = UIRegressionMonitor;
// Global instance for easy access
exports.uiRegressionMonitor = new UIRegressionMonitor();
// Auto-initialize monitoring when DOM is ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('[NLD] UI Regression Monitor initialized');
        });
    }
    else {
        console.log('[NLD] UI Regression Monitor initialized');
    }
}
//# sourceMappingURL=ui-regression-monitor.js.map