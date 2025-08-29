"use strict";
/**
 * Component State Desync Detector
 * Monitors React component state consistency during UI modernization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.componentStateTracker = exports.ComponentStateTracker = void 0;
const events_1 = require("events");
class ComponentStateTracker extends events_1.EventEmitter {
    componentStates = new Map();
    stateHistory = new Map();
    desyncEvents = [];
    hookUsages = new Map();
    renderCycles = new Map();
    reactDevToolsHook = null;
    mutationObserver = null;
    constructor() {
        super();
        this.initializeReactMonitoring();
        this.setupDOMMonitoring();
        this.startStateConsistencyChecks();
    }
    initializeReactMonitoring() {
        // Check for React DevTools Global Hook
        if (typeof window !== 'undefined' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
            this.reactDevToolsHook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
            console.log('[NLD] React DevTools integration available');
            this.setupReactDevToolsMonitoring();
        }
        else {
            console.warn('[NLD] React DevTools not available, using alternative monitoring');
            this.setupAlternativeReactMonitoring();
        }
    }
    setupReactDevToolsMonitoring() {
        if (!this.reactDevToolsHook)
            return;
        // Hook into React's render process
        const originalOnCommitFiberRoot = this.reactDevToolsHook.onCommitFiberRoot;
        const tracker = this;
        this.reactDevToolsHook.onCommitFiberRoot = function (id, root, ...args) {
            try {
                tracker.analyzeRenderCommit(root);
            }
            catch (error) {
                console.warn('[NLD] Error in React DevTools hook:', error);
            }
            if (originalOnCommitFiberRoot) {
                return originalOnCommitFiberRoot.call(this, id, root, ...args);
            }
        };
        console.log('[NLD] React DevTools monitoring established');
    }
    setupAlternativeReactMonitoring() {
        // Fallback monitoring using React internals (less reliable but better than nothing)
        // Override console.error to catch React errors
        const originalConsoleError = console.error;
        console.error = (...args) => {
            const message = args.join(' ');
            if (message.includes('React') || message.includes('Warning:')) {
                this.recordDesyncEvent({
                    type: 'render_error',
                    componentId: 'unknown',
                    componentName: 'unknown',
                    timestamp: Date.now(),
                    details: {
                        error: message
                    },
                    severity: message.includes('Warning:') ? 'MEDIUM' : 'HIGH'
                });
            }
            originalConsoleError.apply(console, args);
        };
        // Monitor for unhandled promise rejections (often state-related)
        window.addEventListener('unhandledrejection', (event) => {
            this.recordDesyncEvent({
                type: 'lifecycle_error',
                componentId: 'unknown',
                componentName: 'unknown',
                timestamp: Date.now(),
                details: {
                    error: event.reason?.toString() || 'Unhandled promise rejection'
                },
                severity: 'HIGH'
            });
        });
        console.log('[NLD] Alternative React monitoring established');
    }
    setupDOMMonitoring() {
        // Monitor DOM changes that might indicate React state issues
        this.mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check for components that disappeared unexpectedly
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node;
                            const reactKey = this.findReactKey(element);
                            if (reactKey) {
                                this.checkForUnexpectedUnmount(reactKey, element);
                            }
                        }
                    });
                }
                // Monitor attribute changes that might indicate state issues
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    const reactKey = this.findReactKey(target);
                    if (reactKey && mutation.attributeName === 'class') {
                        this.validateComponentStateConsistency(reactKey, target);
                    }
                }
            });
        });
        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'data-testid', 'id']
        });
        console.log('[NLD] DOM state monitoring established');
    }
    startStateConsistencyChecks() {
        // Run consistency checks every 15 seconds
        setInterval(() => {
            this.runStateConsistencyCheck();
        }, 15000);
        // Check for hook rule violations every 30 seconds
        setInterval(() => {
            this.checkHookRuleViolations();
        }, 30000);
        console.log('[NLD] State consistency checks started');
    }
    analyzeRenderCommit(fiberRoot) {
        if (!fiberRoot || !fiberRoot.current)
            return;
        try {
            this.walkFiberTree(fiberRoot.current);
        }
        catch (error) {
            console.warn('[NLD] Error walking fiber tree:', error);
        }
    }
    walkFiberTree(fiber) {
        if (!fiber)
            return;
        // Analyze this fiber node
        if (fiber.type && fiber.stateNode) {
            const componentInfo = this.extractComponentInfo(fiber);
            if (componentInfo) {
                this.trackComponentState(componentInfo);
            }
        }
        // Walk children
        let child = fiber.child;
        while (child) {
            this.walkFiberTree(child);
            child = child.sibling;
        }
    }
    extractComponentInfo(fiber) {
        try {
            const componentName = this.getComponentName(fiber);
            if (!componentName)
                return null;
            const componentId = this.generateComponentId(fiber);
            const state = this.extractState(fiber);
            const props = this.extractProps(fiber);
            return {
                componentId,
                componentName,
                state,
                props,
                lastUpdate: Date.now(),
                renderCount: this.incrementRenderCount(componentId),
                errorCount: 0
            };
        }
        catch (error) {
            console.warn('[NLD] Error extracting component info:', error);
            return null;
        }
    }
    getComponentName(fiber) {
        if (fiber.type) {
            if (typeof fiber.type === 'string') {
                return fiber.type; // DOM element
            }
            else if (fiber.type.name) {
                return fiber.type.name; // Function component
            }
            else if (fiber.type.displayName) {
                return fiber.type.displayName; // Component with displayName
            }
        }
        return null;
    }
    generateComponentId(fiber) {
        // Generate a unique ID for this component instance
        const key = fiber.key || '';
        const index = fiber.index || 0;
        const componentName = this.getComponentName(fiber) || 'Unknown';
        return `${componentName}_${key}_${index}_${Date.now()}`;
    }
    extractState(fiber) {
        const state = {};
        try {
            if (fiber.stateNode && fiber.stateNode.state) {
                // Class component state
                state.classState = fiber.stateNode.state;
            }
            if (fiber.memoizedState) {
                // Hook state
                let hookState = fiber.memoizedState;
                let hookIndex = 0;
                while (hookState) {
                    state[`hook_${hookIndex}`] = hookState.memoizedState;
                    hookState = hookState.next;
                    hookIndex++;
                }
            }
        }
        catch (error) {
            console.warn('[NLD] Error extracting state:', error);
        }
        return state;
    }
    extractProps(fiber) {
        try {
            return fiber.pendingProps || fiber.memoizedProps || {};
        }
        catch (error) {
            console.warn('[NLD] Error extracting props:', error);
            return {};
        }
    }
    incrementRenderCount(componentId) {
        const current = this.renderCycles.get(componentId) || 0;
        const newCount = current + 1;
        this.renderCycles.set(componentId, newCount);
        return newCount;
    }
    trackComponentState(componentState) {
        const existingState = this.componentStates.get(componentState.componentId);
        if (existingState) {
            // Check for state inconsistencies
            this.compareStates(existingState, componentState);
        }
        // Update current state
        this.componentStates.set(componentState.componentId, componentState);
        // Store in history
        const history = this.stateHistory.get(componentState.componentId) || [];
        history.push(componentState);
        // Keep only last 10 states
        if (history.length > 10) {
            history.shift();
        }
        this.stateHistory.set(componentState.componentId, history);
    }
    compareStates(oldState, newState) {
        // Check for unexpected state changes
        const stateChanges = this.detectStateChanges(oldState.state, newState.state);
        if (stateChanges.length > 0) {
            stateChanges.forEach(change => {
                if (change.unexpected) {
                    this.recordDesyncEvent({
                        type: 'state_mismatch',
                        componentId: newState.componentId,
                        componentName: newState.componentName,
                        timestamp: Date.now(),
                        details: {
                            expected: change.oldValue,
                            actual: change.newValue,
                            phase: 'state_update'
                        },
                        severity: 'MEDIUM'
                    });
                }
            });
        }
        // Check for prop changes that might indicate parent-child desync
        const propChanges = this.detectStateChanges(oldState.props, newState.props);
        if (propChanges.some(change => change.critical)) {
            this.recordDesyncEvent({
                type: 'props_mismatch',
                componentId: newState.componentId,
                componentName: newState.componentName,
                timestamp: Date.now(),
                details: {
                    expected: oldState.props,
                    actual: newState.props,
                    phase: 'props_update'
                },
                severity: 'HIGH'
            });
        }
    }
    detectStateChanges(oldState, newState) {
        const changes = [];
        // Compare all keys from both states
        const allKeys = new Set([...Object.keys(oldState || {}), ...Object.keys(newState || {})]);
        allKeys.forEach(key => {
            const oldValue = oldState?.[key];
            const newValue = newState?.[key];
            if (!this.deepEqual(oldValue, newValue)) {
                const unexpected = this.isUnexpectedStateChange(key, oldValue, newValue);
                const critical = this.isCriticalStateChange(key, oldValue, newValue);
                changes.push({
                    key,
                    oldValue,
                    newValue,
                    unexpected,
                    critical
                });
            }
        });
        return changes;
    }
    isUnexpectedStateChange(key, oldValue, newValue) {
        // Define rules for what constitutes unexpected state changes
        // Type changes are usually unexpected
        if (typeof oldValue !== typeof newValue && oldValue !== null && newValue !== null) {
            return true;
        }
        // Null/undefined flips without explicit user action
        if ((oldValue === null && newValue !== null) || (oldValue !== null && newValue === null)) {
            return true;
        }
        // Object/array reference changes without deep changes (might indicate improper updates)
        if (typeof oldValue === 'object' && typeof newValue === 'object') {
            if (oldValue !== newValue && this.deepEqual(oldValue, newValue)) {
                return true; // Same content but different reference - potentially inefficient
            }
        }
        return false;
    }
    isCriticalStateChange(key, oldValue, newValue) {
        // Critical changes that might break functionality
        const criticalKeys = ['instanceId', 'selectedInstance', 'isConnected', 'socket'];
        if (criticalKeys.some(criticalKey => key.includes(criticalKey))) {
            return true;
        }
        // Boolean flips on important flags
        if (typeof oldValue === 'boolean' && typeof newValue === 'boolean' && oldValue !== newValue) {
            const importantBooleans = ['connected', 'loading', 'error', 'disabled'];
            if (importantBooleans.some(important => key.toLowerCase().includes(important))) {
                return true;
            }
        }
        return false;
    }
    deepEqual(a, b) {
        if (a === b)
            return true;
        if (a == null || b == null)
            return a === b;
        if (typeof a !== typeof b)
            return false;
        if (typeof a !== 'object')
            return a === b;
        if (Array.isArray(a) !== Array.isArray(b))
            return false;
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length)
            return false;
        return keysA.every(key => this.deepEqual(a[key], b[key]));
    }
    runStateConsistencyCheck() {
        // Check for components with inconsistent state
        this.componentStates.forEach((state, componentId) => {
            const timeSinceUpdate = Date.now() - state.lastUpdate;
            // Check for components that haven't updated in a long time (might be stuck)
            if (timeSinceUpdate > 300000) { // 5 minutes
                this.recordDesyncEvent({
                    type: 'lifecycle_error',
                    componentId,
                    componentName: state.componentName,
                    timestamp: Date.now(),
                    details: {
                        error: 'Component appears to be stuck - no updates for 5 minutes',
                        phase: 'consistency_check'
                    },
                    severity: 'MEDIUM'
                });
            }
            // Check for excessive renders
            if (state.renderCount > 100) {
                this.recordDesyncEvent({
                    type: 'render_error',
                    componentId,
                    componentName: state.componentName,
                    timestamp: Date.now(),
                    details: {
                        error: `Excessive renders detected: ${state.renderCount}`,
                        phase: 'render_optimization'
                    },
                    severity: 'HIGH'
                });
            }
        });
    }
    checkHookRuleViolations() {
        // Check for common hook rule violations
        this.hookUsages.forEach((hooks, componentId) => {
            // Check for hooks called in wrong order
            const callOrders = hooks.map(hook => hook.callOrder);
            const sortedOrders = [...callOrders].sort((a, b) => a - b);
            if (!this.arraysEqual(callOrders, sortedOrders)) {
                this.recordDesyncEvent({
                    type: 'hook_error',
                    componentId,
                    componentName: 'Unknown',
                    timestamp: Date.now(),
                    details: {
                        error: 'Hooks called in inconsistent order',
                        phase: 'hook_validation'
                    },
                    severity: 'CRITICAL'
                });
            }
            // Check for excessive hook errors
            const totalErrors = hooks.reduce((sum, hook) => sum + hook.errorCount, 0);
            if (totalErrors > 10) {
                this.recordDesyncEvent({
                    type: 'hook_error',
                    componentId,
                    componentName: 'Unknown',
                    timestamp: Date.now(),
                    details: {
                        error: `Excessive hook errors: ${totalErrors}`,
                        phase: 'hook_error_analysis'
                    },
                    severity: 'HIGH'
                });
            }
        });
    }
    arraysEqual(a, b) {
        if (a.length !== b.length)
            return false;
        return a.every((val, index) => val === b[index]);
    }
    findReactKey(element) {
        // Look for React-related attributes or properties
        const reactKeys = Object.keys(element).filter(key => key.startsWith('__react') || key.startsWith('_react'));
        return reactKeys.length > 0 ? reactKeys[0] : null;
    }
    checkForUnexpectedUnmount(reactKey, element) {
        // Check if this component was expected to unmount
        const componentId = element.getAttribute('data-component-id');
        if (componentId && this.componentStates.has(componentId)) {
            this.recordDesyncEvent({
                type: 'lifecycle_error',
                componentId,
                componentName: element.tagName.toLowerCase(),
                timestamp: Date.now(),
                details: {
                    error: 'Component unmounted unexpectedly',
                    phase: 'unmount'
                },
                severity: 'HIGH'
            });
        }
    }
    validateComponentStateConsistency(reactKey, element) {
        // Check if visual state matches component state
        const componentId = element.getAttribute('data-component-id');
        if (componentId && this.componentStates.has(componentId)) {
            const state = this.componentStates.get(componentId);
            // Example: Check if disabled state matches visual appearance
            const isVisuallyDisabled = element.classList.contains('disabled') ||
                element.hasAttribute('disabled');
            const isStateDisabled = state.state?.disabled || state.props?.disabled;
            if (isVisuallyDisabled !== isStateDisabled) {
                this.recordDesyncEvent({
                    type: 'state_mismatch',
                    componentId,
                    componentName: state.componentName,
                    timestamp: Date.now(),
                    details: {
                        expected: isStateDisabled,
                        actual: isVisuallyDisabled,
                        phase: 'visual_state_sync'
                    },
                    severity: 'MEDIUM'
                });
            }
        }
    }
    recordDesyncEvent(event) {
        this.desyncEvents.push(event);
        // Keep only last 500 events
        if (this.desyncEvents.length > 500) {
            this.desyncEvents = this.desyncEvents.slice(-500);
        }
        console.warn(`[NLD] Component state desync detected:`, event);
        this.emit('state-desync', event);
        // Trigger auto-recovery for critical issues
        if (event.severity === 'CRITICAL') {
            this.attemptStateRecovery(event);
        }
    }
    async attemptStateRecovery(event) {
        console.log(`[NLD] Attempting state recovery for: ${event.componentName}`);
        try {
            // Method 1: Force component re-render
            this.emit('force-rerender', { componentId: event.componentId });
            // Method 2: Reset component state if possible
            if (event.type === 'state_mismatch') {
                this.emit('reset-component-state', { componentId: event.componentId });
            }
            // Method 3: Reload component if hook errors
            if (event.type === 'hook_error') {
                console.warn(`[NLD] Hook error recovery - component reload recommended: ${event.componentName}`);
                this.emit('component-reload-needed', { componentId: event.componentId });
            }
        }
        catch (error) {
            console.error(`[NLD] State recovery failed for ${event.componentName}:`, error);
        }
    }
    getComponentStates() {
        return new Map(this.componentStates);
    }
    getDesyncEvents(count = 50) {
        return this.desyncEvents.slice(-count);
    }
    generateStateHealthReport() {
        const totalComponents = this.componentStates.size;
        const recentEvents = this.getDesyncEvents(20);
        const criticalEvents = recentEvents.filter(e => e.severity === 'CRITICAL');
        const errorComponents = new Set(recentEvents.map(e => e.componentId)).size;
        const componentSummary = Array.from(this.componentStates.entries())
            .slice(0, 10)
            .map(([id, state]) => {
            const timeSinceUpdate = Date.now() - state.lastUpdate;
            return `${state.componentName} (${id.slice(0, 8)}): ${state.renderCount} renders, ${Math.round(timeSinceUpdate / 1000)}s ago`;
        });
        return `
Component State Health Report
============================

Total Components Tracked: ${totalComponents}
Components with Recent Errors: ${errorComponents}
Critical State Issues: ${criticalEvents.length}

Component Status:
${componentSummary.join('\n') || 'No components tracked'}

Recent State Issues:
${recentEvents.slice(-5).map(event => `${new Date(event.timestamp).toLocaleTimeString()} - ${event.type} in ${event.componentName}: ${event.details.error || 'State inconsistency'}`).join('\n') || 'No recent issues'}

State Sync Recommendations:
${this.generateStateSyncRecommendations()}
`;
    }
    generateStateSyncRecommendations() {
        const recommendations = [];
        const recentEvents = this.getDesyncEvents(50);
        const hookErrors = recentEvents.filter(e => e.type === 'hook_error');
        const stateErrors = recentEvents.filter(e => e.type === 'state_mismatch');
        const renderErrors = recentEvents.filter(e => e.type === 'render_error');
        if (hookErrors.length > 5) {
            recommendations.push('- High hook error rate, review hook usage patterns');
        }
        if (stateErrors.length > 10) {
            recommendations.push('- Frequent state mismatches, check state update logic');
        }
        if (renderErrors.length > 3) {
            recommendations.push('- Excessive renders detected, optimize component performance');
        }
        const stuckComponents = Array.from(this.componentStates.values())
            .filter(state => Date.now() - state.lastUpdate > 300000);
        if (stuckComponents.length > 0) {
            recommendations.push(`- ${stuckComponents.length} components may be stuck, check lifecycle methods`);
        }
        if (recommendations.length === 0) {
            recommendations.push('✅ Component state synchronization operating normally');
        }
        return recommendations.join('\n');
    }
    destroy() {
        // Disconnect mutation observer
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }
        // Clear data structures
        this.componentStates.clear();
        this.stateHistory.clear();
        this.desyncEvents = [];
        this.hookUsages.clear();
        this.renderCycles.clear();
        // Remove event listeners
        this.removeAllListeners();
        console.log('[NLD] Component State Tracker destroyed');
    }
}
exports.ComponentStateTracker = ComponentStateTracker;
exports.componentStateTracker = new ComponentStateTracker();
//# sourceMappingURL=component-state-tracker.js.map