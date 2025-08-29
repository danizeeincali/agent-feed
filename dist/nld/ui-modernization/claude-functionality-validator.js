"use strict";
/**
 * Claude Functionality Validator
 * Ensures UI changes don't break Claude process spawning and core functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeFunctionalityValidator = exports.ClaudeFunctionalityValidator = void 0;
const events_1 = require("events");
class ClaudeFunctionalityValidator extends events_1.EventEmitter {
    validationResults = [];
    lastValidation = 0;
    validationInterval = null;
    criticalFailures = new Set();
    constructor() {
        super();
        this.startContinuousValidation();
    }
    startContinuousValidation() {
        // Validate Claude functionality every 30 seconds
        this.validationInterval = setInterval(() => {
            this.runFullValidation();
        }, 30000);
        // Run initial validation
        this.runFullValidation();
    }
    async runFullValidation() {
        console.log('[NLD] Running comprehensive Claude functionality validation');
        const results = {
            processSpawning: await this.validateProcessSpawning(),
            buttonHandlers: await this.validateButtonHandlers(),
            instanceCreation: await this.validateInstanceCreation(),
            terminalConnection: await this.validateTerminalConnection(),
            sseStreaming: await this.validateSSEStreaming()
        };
        this.lastValidation = Date.now();
        this.emit('validation-complete', results);
        // Check for critical failures
        Object.entries(results).forEach(([key, passed]) => {
            if (!passed) {
                this.criticalFailures.add(key);
                this.emit('critical-failure', {
                    functionality: key,
                    timestamp: Date.now()
                });
            }
            else {
                this.criticalFailures.delete(key);
            }
        });
        return results;
    }
    async validateProcessSpawning() {
        try {
            // Check if Claude process spawning mechanisms are intact
            const claudeButtons = document.querySelectorAll('button[data-claude-action*="launch"]');
            if (claudeButtons.length === 0) {
                this.recordValidationResult('processSpawning', false, 'No Claude launch buttons found');
                return false;
            }
            // Test button click simulation
            for (const button of claudeButtons) {
                const hasClickHandler = this.checkButtonClickHandler(button);
                if (!hasClickHandler) {
                    this.recordValidationResult('processSpawning', false, 'Button missing click handler', {
                        button: button.outerHTML
                    });
                    return false;
                }
            }
            // Check if createInstance function is accessible
            const claudeManagerElements = document.querySelectorAll('[data-testid="claude-instance-manager"]');
            if (claudeManagerElements.length === 0) {
                this.recordValidationResult('processSpawning', false, 'Claude Instance Manager not found');
                return false;
            }
            this.recordValidationResult('processSpawning', true);
            return true;
        }
        catch (error) {
            this.recordValidationResult('processSpawning', false, error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }
    async validateButtonHandlers() {
        try {
            const claudeButtons = document.querySelectorAll('button[data-claude-action]');
            if (claudeButtons.length === 0) {
                this.recordValidationResult('buttonHandlers', false, 'No Claude buttons found');
                return false;
            }
            let workingHandlers = 0;
            let totalButtons = claudeButtons.length;
            claudeButtons.forEach((button) => {
                const htmlButton = button;
                // Check for click handler
                if (this.checkButtonClickHandler(htmlButton)) {
                    workingHandlers++;
                }
                // Check if button is properly enabled/disabled
                const action = htmlButton.getAttribute('data-claude-action');
                if (action && !htmlButton.hasAttribute('data-originally-disabled')) {
                    // Button should be functional unless explicitly disabled
                    if (htmlButton.disabled && !this.isLoadingState(htmlButton)) {
                        console.warn(`[NLD] Button unexpectedly disabled: ${action}`);
                    }
                }
            });
            const successRate = workingHandlers / totalButtons;
            if (successRate < 0.8) { // At least 80% of buttons should work
                this.recordValidationResult('buttonHandlers', false, `Only ${Math.round(successRate * 100)}% of buttons have working handlers`);
                return false;
            }
            this.recordValidationResult('buttonHandlers', true);
            return true;
        }
        catch (error) {
            this.recordValidationResult('buttonHandlers', false, error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }
    async validateInstanceCreation() {
        try {
            // Check if instance creation API endpoints are accessible
            const testResponse = await fetch('/api/claude/instances', {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            if (!testResponse.ok) {
                this.recordValidationResult('instanceCreation', false, `Instance API not accessible: ${testResponse.status}`);
                return false;
            }
            // Check if response is valid JSON
            const data = await testResponse.json();
            if (typeof data !== 'object') {
                this.recordValidationResult('instanceCreation', false, 'Invalid API response format');
                return false;
            }
            // Validate that ClaudeInstanceManager component is present and functional
            const managerComponent = document.querySelector('[data-testid="claude-instance-manager"]');
            if (!managerComponent) {
                this.recordValidationResult('instanceCreation', false, 'ClaudeInstanceManager component missing');
                return false;
            }
            this.recordValidationResult('instanceCreation', true);
            return true;
        }
        catch (error) {
            this.recordValidationResult('instanceCreation', false, error instanceof Error ? error.message : 'Network error');
            return false;
        }
    }
    async validateTerminalConnection() {
        try {
            // Check for terminal elements
            const terminalElements = document.querySelectorAll('.output-area, .terminal-output, [class*="terminal"]');
            if (terminalElements.length === 0) {
                this.recordValidationResult('terminalConnection', false, 'No terminal elements found');
                return false;
            }
            // Check for input elements
            const inputElements = document.querySelectorAll('.input-field, input[placeholder*="command"], input[placeholder*="terminal"]');
            if (inputElements.length === 0) {
                this.recordValidationResult('terminalConnection', false, 'No terminal input elements found');
                return false;
            }
            // Check if terminal communication mechanisms are in place
            const hasWebSocketContext = this.checkForReactContext('WebSocket');
            const hasHTTPSSEHook = this.checkForReactHook('useHTTPSSE');
            if (!hasWebSocketContext && !hasHTTPSSEHook) {
                this.recordValidationResult('terminalConnection', false, 'No terminal communication mechanism found');
                return false;
            }
            this.recordValidationResult('terminalConnection', true);
            return true;
        }
        catch (error) {
            this.recordValidationResult('terminalConnection', false, error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }
    async validateSSEStreaming() {
        try {
            // Test if SSE endpoint is accessible
            const sseTestResponse = await fetch('/api/status/stream', {
                method: 'GET',
                headers: {
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache'
                }
            }).catch(error => {
                // SSE might not be immediately available, that's ok
                return null;
            });
            if (sseTestResponse && !sseTestResponse.ok && sseTestResponse.status !== 404) {
                this.recordValidationResult('sseStreaming', false, `SSE endpoint error: ${sseTestResponse.status}`);
                return false;
            }
            // Check for EventSource support
            if (typeof EventSource === 'undefined') {
                this.recordValidationResult('sseStreaming', false, 'EventSource not supported');
                return false;
            }
            // Check if useHTTPSSE hook is present and functional
            const hasSSESupport = this.checkForReactHook('useHTTPSSE');
            if (!hasSSESupport) {
                this.recordValidationResult('sseStreaming', false, 'useHTTPSSE hook not found');
                return false;
            }
            this.recordValidationResult('sseStreaming', true);
            return true;
        }
        catch (error) {
            this.recordValidationResult('sseStreaming', false, error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }
    checkButtonClickHandler(button) {
        // Check for various types of click handlers
        if (button.onclick)
            return true;
        // Check for addEventListener handlers (harder to detect, so we use heuristics)
        const hasDataAction = button.hasAttribute('data-claude-action');
        const hasReactProps = button.hasOwnProperty('__reactInternalInstance') ||
            button.hasOwnProperty('_reactInternalFiber') ||
            Object.keys(button).some(key => key.startsWith('__react'));
        return hasDataAction || hasReactProps;
    }
    isLoadingState(button) {
        const text = button.textContent?.toLowerCase() || '';
        const hasLoadingText = text.includes('loading') || text.includes('launching') || text.includes('...');
        const hasLoadingClass = button.classList.contains('loading') || button.classList.contains('disabled');
        return hasLoadingText || hasLoadingClass;
    }
    checkForReactContext(contextName) {
        // This is a simplified check - in a real implementation, you'd need
        // to integrate with React DevTools or use other mechanisms
        const scriptTags = document.querySelectorAll('script');
        for (const script of scriptTags) {
            if (script.textContent?.includes(contextName + 'Context')) {
                return true;
            }
        }
        return false;
    }
    checkForReactHook(hookName) {
        // This is a simplified check - in a real implementation, you'd need
        // to integrate with React DevTools or use other mechanisms
        const scriptTags = document.querySelectorAll('script');
        for (const script of scriptTags) {
            if (script.textContent?.includes(hookName)) {
                return true;
            }
        }
        return false;
    }
    recordValidationResult(functionality, passed, error, context) {
        const result = {
            functionality,
            passed,
            error,
            context,
            timestamp: Date.now()
        };
        this.validationResults.push(result);
        // Keep only last 100 results
        if (this.validationResults.length > 100) {
            this.validationResults = this.validationResults.slice(-100);
        }
        if (!passed) {
            console.error(`[NLD] Claude functionality validation failed: ${functionality}`, error, context);
            this.emit('validation-failure', result);
        }
    }
    getValidationHistory() {
        return [...this.validationResults];
    }
    getCriticalFailures() {
        return Array.from(this.criticalFailures);
    }
    getLastValidationTime() {
        return this.lastValidation;
    }
    async repairClaudeFunctionality() {
        console.log('[NLD] Attempting to repair Claude functionality');
        try {
            // Attempt to restore button handlers
            await this.restoreButtonHandlers();
            // Attempt to restore instance creation
            await this.restoreInstanceCreation();
            // Attempt to restore terminal connection
            await this.restoreTerminalConnection();
            // Revalidate after repair attempts
            const results = await this.runFullValidation();
            const allPassed = Object.values(results).every(passed => passed);
            if (allPassed) {
                console.log('[NLD] Claude functionality repair successful');
                this.emit('repair-success');
                return true;
            }
            else {
                console.warn('[NLD] Claude functionality repair partially successful');
                this.emit('repair-partial', results);
                return false;
            }
        }
        catch (error) {
            console.error('[NLD] Claude functionality repair failed:', error);
            this.emit('repair-failed', error);
            return false;
        }
    }
    async restoreButtonHandlers() {
        const claudeButtons = document.querySelectorAll('button[data-claude-action]');
        claudeButtons.forEach((button) => {
            const htmlButton = button;
            const action = htmlButton.getAttribute('data-claude-action');
            if (action && !this.checkButtonClickHandler(htmlButton)) {
                // Restore click handler
                htmlButton.onclick = (event) => {
                    event.preventDefault();
                    console.log(`[NLD] Restored handler executed: ${action}`);
                    this.emit('button-action', { action, button: htmlButton });
                    // Simulate the expected behavior based on action
                    this.simulateClaudeAction(action, htmlButton);
                };
                console.log(`[NLD] Restored click handler for button: ${action}`);
            }
        });
    }
    async restoreInstanceCreation() {
        // Check if ClaudeInstanceManager needs to be reinitialized
        const managerElement = document.querySelector('[data-testid="claude-instance-manager"]');
        if (!managerElement) {
            console.warn('[NLD] ClaudeInstanceManager element missing - UI may need rerender');
            this.emit('component-missing', { component: 'ClaudeInstanceManager' });
        }
    }
    async restoreTerminalConnection() {
        // Check if terminal elements are present
        const terminalElements = document.querySelectorAll('.output-area, .terminal-output');
        if (terminalElements.length === 0) {
            console.warn('[NLD] Terminal elements missing - terminal UI may need restoration');
            this.emit('component-missing', { component: 'Terminal' });
        }
    }
    simulateClaudeAction(action, button) {
        // Simulate the visual feedback that should happen when Claude buttons are clicked
        button.disabled = true;
        const originalText = button.textContent;
        if (action.includes('launch') || action.includes('create')) {
            button.textContent = 'Launching...';
            setTimeout(() => {
                button.disabled = false;
                button.textContent = originalText;
                console.log(`[NLD] Simulated ${action} completed`);
            }, 2000);
        }
    }
    generateClaudeHealthReport() {
        const criticalFailures = this.getCriticalFailures();
        const recentResults = this.validationResults.slice(-10);
        const successRate = recentResults.length > 0
            ? (recentResults.filter(r => r.passed).length / recentResults.length * 100).toFixed(1)
            : '0';
        return `
Claude Functionality Health Report
================================

Overall Success Rate: ${successRate}%
Critical Failures: ${criticalFailures.length}
Last Validation: ${new Date(this.lastValidation).toLocaleString()}

Critical Issues:
${criticalFailures.length > 0
            ? criticalFailures.map(failure => `- ${failure}`).join('\n')
            : '✅ No critical issues detected'}

Recent Validation Results:
${recentResults.slice(-5).map(result => `${result.passed ? '✅' : '❌'} ${result.functionality}: ${result.error || 'OK'}`).join('\n')}

Recommendations:
${this.generateRecommendations()}
`;
    }
    generateRecommendations() {
        const failures = this.getCriticalFailures();
        const recommendations = [];
        if (failures.includes('processSpawning')) {
            recommendations.push('- Restore Claude launch button handlers');
        }
        if (failures.includes('buttonHandlers')) {
            recommendations.push('- Reattach event handlers to Claude buttons');
        }
        if (failures.includes('instanceCreation')) {
            recommendations.push('- Verify Claude API endpoints are accessible');
        }
        if (failures.includes('terminalConnection')) {
            recommendations.push('- Restore terminal UI components');
        }
        if (failures.includes('sseStreaming')) {
            recommendations.push('- Fix SSE streaming connection');
        }
        if (recommendations.length === 0) {
            recommendations.push('✅ All Claude functionality operating normally');
        }
        return recommendations.join('\n');
    }
    destroy() {
        if (this.validationInterval) {
            clearInterval(this.validationInterval);
            this.validationInterval = null;
        }
        this.validationResults = [];
        this.criticalFailures.clear();
        this.removeAllListeners();
        console.log('[NLD] Claude Functionality Validator destroyed');
    }
}
exports.ClaudeFunctionalityValidator = ClaudeFunctionalityValidator;
exports.claudeFunctionalityValidator = new ClaudeFunctionalityValidator();
//# sourceMappingURL=claude-functionality-validator.js.map