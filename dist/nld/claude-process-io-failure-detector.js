"use strict";
/**
 * Claude Process I/O Failure Detector - NLD System
 *
 * Detects and monitors specific Claude CLI process failures:
 * - PRINT_FLAG_INPUT_REQUIRED: "--print requires input" errors
 * - INTERACTIVE_MODE_BLOCKED: Interactive Claude sessions that fail to initialize
 * - PTY_STDIN_DISCONNECT: PTY processes losing stdin connection
 * - AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT: Auth works but processes remain silent
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeProcessIODetector = exports.ClaudeProcessIOFailureDetector = void 0;
class ClaudeProcessIOFailureDetector {
    activeProcesses = new Map();
    triggerConditions = [];
    detectionCallbacks = [];
    patternHistory = [];
    constructor() {
        this.initializeTriggerConditions();
    }
    initializeTriggerConditions() {
        // Pattern 1: PRINT_FLAG_INPUT_REQUIRED
        this.triggerConditions.push({
            conditionId: 'print-flag-no-input',
            pattern: 'PRINT_FLAG_INPUT_REQUIRED',
            triggerLogic: (metrics) => {
                const hasErrorMessage = metrics.errorPatterns.some(p => p.errorMessage?.includes('Input must be provided either through stdin or as a prompt argument when using --print'));
                const isPrintMode = metrics.args.includes('--print') || metrics.args.includes('-p');
                const hasInput = metrics.sessionMetrics.inputsSent > 0 || metrics.args.some(arg => !arg.startsWith('--'));
                return hasErrorMessage || (isPrintMode && !hasInput && metrics.processState === 'failed');
            },
            timeThreshold: 2000 // 2 seconds to detect
        });
        // Pattern 2: INTERACTIVE_MODE_BLOCKED
        this.triggerConditions.push({
            conditionId: 'interactive-blocked',
            pattern: 'INTERACTIVE_MODE_BLOCKED',
            triggerLogic: (metrics) => {
                const isInteractive = !metrics.args.includes('--print') && !metrics.args.includes('-p');
                const longInitialization = Date.now() - metrics.spawnTime > 10000; // 10s
                const noOutput = metrics.sessionMetrics.outputsReceived === 0;
                const expectedInteractive = metrics.processState === 'initializing' || metrics.processState === 'spawning';
                return isInteractive && longInitialization && noOutput && expectedInteractive;
            },
            timeThreshold: 10000 // 10 seconds
        });
        // Pattern 3: PTY_STDIN_DISCONNECT
        this.triggerConditions.push({
            conditionId: 'pty-stdin-disconnect',
            pattern: 'PTY_STDIN_DISCONNECT',
            triggerLogic: (metrics) => {
                const isPty = metrics.processType === 'pty';
                const wasConnected = metrics.stdinConnected;
                const hasInput = metrics.sessionMetrics.inputsSent > 0;
                const noRecentOutput = Date.now() - metrics.sessionMetrics.lastActivity > 5000;
                return isPty && hasInput && !wasConnected && noRecentOutput;
            },
            timeThreshold: 5000 // 5 seconds
        });
        // Pattern 4: AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT
        this.triggerConditions.push({
            conditionId: 'auth-success-no-output',
            pattern: 'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT',
            triggerLogic: (metrics) => {
                const authSucceeded = metrics.authenticationTime !== undefined;
                const longSilent = Date.now() - (metrics.authenticationTime || metrics.spawnTime) > 8000; // 8s
                const noOutput = metrics.sessionMetrics.outputsReceived === 0;
                const expectedOutput = metrics.processState === 'authenticated' || metrics.processState === 'interactive';
                return authSucceeded && longSilent && noOutput && expectedOutput;
            },
            timeThreshold: 8000 // 8 seconds
        });
    }
    registerProcess(instanceId, command, args, workingDirectory, processType = 'pipe') {
        const metrics = {
            instanceId,
            command,
            args: [...args],
            workingDirectory,
            processType,
            spawnTime: Date.now(),
            stdinConnected: true,
            stdoutActive: false,
            stderrActive: false,
            processState: 'spawning',
            errorPatterns: [],
            sessionMetrics: {
                inputsSent: 0,
                outputsReceived: 0,
                interactivePrompts: 0,
                silentDuration: 0,
                lastActivity: Date.now()
            }
        };
        this.activeProcesses.set(instanceId, metrics);
        console.log(`🔍 [NLD] Registered Claude process ${instanceId} for I/O monitoring`);
        // Start periodic monitoring
        this.startPeriodicCheck(instanceId);
    }
    recordProcessOutput(instanceId, outputType, data) {
        const metrics = this.activeProcesses.get(instanceId);
        if (!metrics)
            return;
        metrics.sessionMetrics.outputsReceived++;
        metrics.sessionMetrics.lastActivity = Date.now();
        if (outputType === 'stdout') {
            metrics.stdoutActive = true;
            if (!metrics.firstOutputTime) {
                metrics.firstOutputTime = Date.now();
                // Update process state based on output content
                if (data.includes('Welcome to Claude Code') || data.includes('Claude Code -')) {
                    metrics.processState = 'interactive';
                }
            }
        }
        else {
            metrics.stderrActive = true;
            // Check for specific error patterns
            this.analyzeErrorOutput(instanceId, data);
        }
        // Check for authentication success patterns
        if (data.includes('✻ Welcome to Claude Code') || data.includes('authenticated')) {
            metrics.authenticationTime = Date.now();
            metrics.processState = 'authenticated';
        }
    }
    recordProcessInput(instanceId, input) {
        const metrics = this.activeProcesses.get(instanceId);
        if (!metrics)
            return;
        metrics.sessionMetrics.inputsSent++;
        metrics.sessionMetrics.lastActivity = Date.now();
        if (input.trim().length > 0) {
            metrics.sessionMetrics.interactivePrompts++;
        }
    }
    recordProcessError(instanceId, error) {
        const metrics = this.activeProcesses.get(instanceId);
        if (!metrics)
            return;
        metrics.processState = 'failed';
        this.analyzeErrorOutput(instanceId, error.message);
    }
    updateProcessState(instanceId, state) {
        const metrics = this.activeProcesses.get(instanceId);
        if (!metrics)
            return;
        metrics.processState = state;
        if (state === 'terminated') {
            // Process cleanup, but keep metrics for analysis
            setTimeout(() => this.activeProcesses.delete(instanceId), 60000); // Keep for 1 minute
        }
    }
    analyzeErrorOutput(instanceId, errorOutput) {
        const metrics = this.activeProcesses.get(instanceId);
        if (!metrics)
            return;
        // Check for specific Claude CLI error patterns
        if (errorOutput.includes('Input must be provided either through stdin or as a prompt argument when using --print')) {
            this.detectPattern(instanceId, 'PRINT_FLAG_INPUT_REQUIRED', {
                hasStdinInput: metrics.sessionMetrics.inputsSent > 0,
                hasPromptArgument: metrics.args.some(arg => !arg.startsWith('--')),
                isPrintMode: metrics.args.includes('--print') || metrics.args.includes('-p'),
                isInteractiveMode: false,
                authenticationSucceeded: false,
                expectedOutput: false,
                actualOutput: false
            }, errorOutput);
        }
        if (errorOutput.includes('ENOENT') || errorOutput.includes('command not found')) {
            this.detectPattern(instanceId, 'INTERACTIVE_MODE_BLOCKED', {
                hasStdinInput: false,
                hasPromptArgument: false,
                isPrintMode: false,
                isInteractiveMode: true,
                authenticationSucceeded: false,
                expectedOutput: true,
                actualOutput: false
            }, errorOutput);
        }
    }
    startPeriodicCheck(instanceId) {
        const checkInterval = setInterval(() => {
            const metrics = this.activeProcesses.get(instanceId);
            if (!metrics || metrics.processState === 'terminated') {
                clearInterval(checkInterval);
                return;
            }
            // Run all trigger conditions
            for (const condition of this.triggerConditions) {
                if (condition.triggerLogic(metrics)) {
                    const diagnosticInfo = this.buildDiagnosticInfo(metrics, condition.pattern);
                    this.detectPattern(instanceId, condition.pattern, diagnosticInfo);
                }
            }
            // Update silent duration
            const silentTime = Date.now() - metrics.sessionMetrics.lastActivity;
            metrics.sessionMetrics.silentDuration = silentTime;
        }, 1000); // Check every second
    }
    buildDiagnosticInfo(metrics, pattern) {
        return {
            hasStdinInput: metrics.sessionMetrics.inputsSent > 0,
            hasPromptArgument: metrics.args.some(arg => !arg.startsWith('--')),
            isPrintMode: metrics.args.includes('--print') || metrics.args.includes('-p'),
            isInteractiveMode: !metrics.args.includes('--print') && !metrics.args.includes('-p'),
            authenticationSucceeded: metrics.authenticationTime !== undefined,
            expectedOutput: metrics.processState === 'interactive' || metrics.processState === 'authenticated',
            actualOutput: metrics.sessionMetrics.outputsReceived > 0
        };
    }
    detectPattern(instanceId, category, diagnosticInfo, errorMessage) {
        const metrics = this.activeProcesses.get(instanceId);
        if (!metrics)
            return;
        // Check if this pattern was already detected recently
        const recentPattern = metrics.errorPatterns.find(p => p.category === category && Date.now() - p.detectedAt < 5000);
        if (recentPattern)
            return;
        const pattern = {
            patternId: `${category}-${instanceId}-${Date.now()}`,
            detectedAt: Date.now(),
            severity: this.getPatternSeverity(category),
            category,
            errorMessage,
            diagnosticInfo,
            resolutionSuggestions: this.getResolutionSuggestions(category, diagnosticInfo),
            preventionStrategy: this.getPreventionStrategy(category)
        };
        metrics.errorPatterns.push(pattern);
        this.patternHistory.push(pattern);
        console.log(`🚨 [NLD] Detected Claude I/O failure pattern: ${category} for ${instanceId}`);
        // Notify callbacks
        this.detectionCallbacks.forEach(callback => {
            try {
                callback(pattern, metrics);
            }
            catch (error) {
                console.error('[NLD] Error in detection callback:', error);
            }
        });
    }
    getPatternSeverity(category) {
        switch (category) {
            case 'PRINT_FLAG_INPUT_REQUIRED':
                return 'high';
            case 'INTERACTIVE_MODE_BLOCKED':
                return 'critical';
            case 'PTY_STDIN_DISCONNECT':
                return 'high';
            case 'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT':
                return 'medium';
            default:
                return 'low';
        }
    }
    getResolutionSuggestions(category, diagnostics) {
        const suggestions = [];
        switch (category) {
            case 'PRINT_FLAG_INPUT_REQUIRED':
                if (!diagnostics.hasPromptArgument && !diagnostics.hasStdinInput) {
                    suggestions.push('Add a prompt argument: claude --print "Your question here"');
                    suggestions.push('Provide stdin input: echo "Your question" | claude --print');
                }
                if (diagnostics.isPrintMode && !diagnostics.hasPromptArgument) {
                    suggestions.push('Remove --print flag for interactive mode');
                    suggestions.push('Add prompt text after --print flag');
                }
                break;
            case 'INTERACTIVE_MODE_BLOCKED':
                suggestions.push('Check Claude CLI installation: claude --version');
                suggestions.push('Try with --dangerously-skip-permissions flag');
                suggestions.push('Verify authentication: claude auth status');
                suggestions.push('Switch to --print mode for non-interactive use');
                break;
            case 'PTY_STDIN_DISCONNECT':
                suggestions.push('Restart process with fresh PTY connection');
                suggestions.push('Fall back to pipe mode instead of PTY');
                suggestions.push('Check terminal environment variables');
                break;
            case 'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT':
                suggestions.push('Send initial prompt to activate Claude');
                suggestions.push('Check for blocked output streams');
                suggestions.push('Verify Claude service connectivity');
                suggestions.push('Try restarting with fresh authentication');
                break;
        }
        return suggestions;
    }
    getPreventionStrategy(category) {
        switch (category) {
            case 'PRINT_FLAG_INPUT_REQUIRED':
                return 'Always validate that --print mode has either stdin input or prompt argument before spawning';
            case 'INTERACTIVE_MODE_BLOCKED':
                return 'Pre-flight check Claude CLI availability and authentication before spawning interactive sessions';
            case 'PTY_STDIN_DISCONNECT':
                return 'Implement PTY connection health monitoring and automatic fallback to pipe mode';
            case 'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT':
                return 'Send initial ping/prompt after authentication success to verify output channel';
            default:
                return 'Implement comprehensive process monitoring and health checks';
        }
    }
    onPatternDetected(callback) {
        this.detectionCallbacks.push(callback);
    }
    getProcessMetrics(instanceId) {
        return this.activeProcesses.get(instanceId);
    }
    getAllActiveProcesses() {
        return Array.from(this.activeProcesses.values());
    }
    getPatternHistory(category) {
        if (category) {
            return this.patternHistory.filter(p => p.category === category);
        }
        return [...this.patternHistory];
    }
    generateSystemReport() {
        const activeProcesses = this.getAllActiveProcesses();
        const patternsByCategory = {};
        this.patternHistory.forEach(pattern => {
            patternsByCategory[pattern.category] = (patternsByCategory[pattern.category] || 0) + 1;
        });
        const criticalProcesses = activeProcesses.filter(p => p.errorPatterns.some(pattern => pattern.severity === 'critical' || pattern.severity === 'high'));
        const resolutionSuggestions = Array.from(new Set(this.patternHistory
            .filter(p => p.severity === 'critical' || p.severity === 'high')
            .flatMap(p => p.resolutionSuggestions)));
        return {
            activeProcesses: activeProcesses.length,
            totalPatternsDetected: this.patternHistory.length,
            patternsByCategory,
            criticalProcesses,
            resolutionSuggestions
        };
    }
}
exports.ClaudeProcessIOFailureDetector = ClaudeProcessIOFailureDetector;
// Export singleton instance
exports.claudeProcessIODetector = new ClaudeProcessIOFailureDetector();
//# sourceMappingURL=claude-process-io-failure-detector.js.map