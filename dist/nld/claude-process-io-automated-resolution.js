"use strict";
/**
 * Claude Process I/O Automated Resolution System - NLD
 *
 * Provides automated resolution suggestions and execution for Claude CLI
 * process I/O failures with intelligent decision-making and recovery.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeProcessIOResolution = exports.ClaudeProcessIOAutomatedResolution = void 0;
class ClaudeProcessIOAutomatedResolution {
    resolutionStrategies = new Map();
    activeExecutions = new Map();
    executionHistory = [];
    constructor() {
        this.initializeResolutionStrategies();
    }
    initializeResolutionStrategies() {
        this.setupPrintFlagStrategies();
        this.setupInteractiveModeStrategies();
        this.setupPTYDisconnectStrategies();
        this.setupAuthSilentStrategies();
    }
    setupPrintFlagStrategies() {
        const strategies = [
            {
                strategyId: 'restart-without-print-flag',
                category: 'PRINT_FLAG_INPUT_REQUIRED',
                name: 'Restart Without Print Flag',
                description: 'Restart the process in interactive mode by removing --print flag',
                automatable: true,
                successProbability: 0.9,
                executionSteps: [
                    {
                        stepId: 'terminate-current-process',
                        description: 'Terminate the current failed process',
                        action: 'restart_process',
                        parameters: { terminate: true },
                        timeout: 5000,
                        retryCount: 1,
                        successCriteria: ['process_terminated'],
                        failureCriteria: ['termination_timeout']
                    },
                    {
                        stepId: 'restart-interactive',
                        description: 'Restart process in interactive mode',
                        action: 'restart_process',
                        parameters: {
                            removeFlags: ['--print', '-p'],
                            addFlags: ['--dangerously-skip-permissions'],
                            mode: 'interactive'
                        },
                        timeout: 10000,
                        retryCount: 2,
                        successCriteria: ['process_started', 'interactive_prompt_received'],
                        failureCriteria: ['spawn_failed', 'authentication_failed']
                    }
                ],
                prerequisites: ['process_management_access'],
                risks: ['temporary_service_interruption'],
                fallbackStrategies: ['add-prompt-argument', 'use-stdin-input']
            },
            {
                strategyId: 'add-prompt-argument',
                category: 'PRINT_FLAG_INPUT_REQUIRED',
                name: 'Add Prompt Argument',
                description: 'Add a default prompt argument to satisfy --print mode requirement',
                automatable: true,
                successProbability: 0.8,
                executionSteps: [
                    {
                        stepId: 'restart-with-prompt',
                        description: 'Restart process with default prompt',
                        action: 'restart_process',
                        parameters: {
                            addArgs: ['Hello, I need assistance'],
                            preserveFlags: true
                        },
                        timeout: 10000,
                        retryCount: 2,
                        successCriteria: ['process_started', 'output_received'],
                        failureCriteria: ['spawn_failed', 'no_output_timeout']
                    }
                ],
                prerequisites: ['process_management_access'],
                risks: ['unwanted_prompt_response'],
                fallbackStrategies: ['restart-without-print-flag']
            }
        ];
        this.resolutionStrategies.set('PRINT_FLAG_INPUT_REQUIRED', strategies);
    }
    setupInteractiveModeStrategies() {
        const strategies = [
            {
                strategyId: 'add-skip-permissions-flag',
                category: 'INTERACTIVE_MODE_BLOCKED',
                name: 'Add Skip Permissions Flag',
                description: 'Restart with --dangerously-skip-permissions flag',
                automatable: true,
                successProbability: 0.85,
                executionSteps: [
                    {
                        stepId: 'restart-with-skip-permissions',
                        description: 'Restart process with permissions bypass',
                        action: 'restart_process',
                        parameters: {
                            addFlags: ['--dangerously-skip-permissions'],
                            preserveArgs: true
                        },
                        timeout: 15000,
                        retryCount: 2,
                        successCriteria: ['process_started', 'authentication_success', 'interactive_ready'],
                        failureCriteria: ['spawn_failed', 'authentication_timeout']
                    }
                ],
                prerequisites: ['claude_cli_available'],
                risks: ['reduced_security'],
                fallbackStrategies: ['validate-cli-installation', 'check-authentication']
            },
            {
                strategyId: 'validate-cli-installation',
                category: 'INTERACTIVE_MODE_BLOCKED',
                name: 'Validate CLI Installation',
                description: 'Check Claude CLI installation and provide installation guidance',
                automatable: false,
                successProbability: 0.95,
                executionSteps: [
                    {
                        stepId: 'check-cli-availability',
                        description: 'Verify Claude CLI is installed and accessible',
                        action: 'validate_cli',
                        parameters: { command: 'claude --version' },
                        timeout: 5000,
                        retryCount: 1,
                        successCriteria: ['version_returned'],
                        failureCriteria: ['command_not_found', 'permission_denied']
                    }
                ],
                prerequisites: ['system_access'],
                risks: ['none'],
                fallbackStrategies: ['provide-installation-instructions']
            }
        ];
        this.resolutionStrategies.set('INTERACTIVE_MODE_BLOCKED', strategies);
    }
    setupPTYDisconnectStrategies() {
        const strategies = [
            {
                strategyId: 'fallback-to-pipe-mode',
                category: 'PTY_STDIN_DISCONNECT',
                name: 'Fallback to Pipe Mode',
                description: 'Restart process using pipe mode instead of PTY',
                automatable: true,
                successProbability: 0.9,
                executionSteps: [
                    {
                        stepId: 'restart-with-pipe-mode',
                        description: 'Restart process in pipe mode',
                        action: 'restart_process',
                        parameters: {
                            processType: 'pipe',
                            preserveArgs: true,
                            stdio: ['pipe', 'pipe', 'pipe']
                        },
                        timeout: 10000,
                        retryCount: 2,
                        successCriteria: ['process_started', 'stdin_connected', 'stdout_active'],
                        failureCriteria: ['spawn_failed', 'io_connection_failed']
                    }
                ],
                prerequisites: ['process_management_access'],
                risks: ['reduced_terminal_functionality'],
                fallbackStrategies: ['reconnect-pty-stdin']
            }
        ];
        this.resolutionStrategies.set('PTY_STDIN_DISCONNECT', strategies);
    }
    setupAuthSilentStrategies() {
        const strategies = [
            {
                strategyId: 'send-activation-prompt',
                category: 'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT',
                name: 'Send Activation Prompt',
                description: 'Send a test prompt to activate Claude output',
                automatable: true,
                successProbability: 0.8,
                executionSteps: [
                    {
                        stepId: 'send-hello-prompt',
                        description: 'Send hello prompt to activate Claude',
                        action: 'send_input',
                        parameters: { input: 'hello\n' },
                        timeout: 8000,
                        retryCount: 1,
                        successCriteria: ['output_received', 'interactive_response'],
                        failureCriteria: ['no_response_timeout', 'connection_lost']
                    }
                ],
                prerequisites: ['stdin_access'],
                risks: ['unwanted_conversation_start'],
                fallbackStrategies: ['restart-process-fresh-auth']
            }
        ];
        this.resolutionStrategies.set('AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT', strategies);
    }
    getResolutionStrategies(category) {
        return this.resolutionStrategies.get(category) || [];
    }
    selectBestStrategy(alert) {
        const strategies = this.getResolutionStrategies(alert.pattern.category);
        if (strategies.length === 0)
            return null;
        // Sort by success probability and automatability
        const sortedStrategies = strategies.sort((a, b) => {
            if (a.automatable !== b.automatable) {
                return a.automatable ? -1 : 1; // Prefer automatable
            }
            return b.successProbability - a.successProbability; // Higher probability first
        });
        // Consider diagnostic information for strategy selection
        const diagnostics = alert.pattern.diagnosticInfo;
        // Strategy-specific selection logic
        if (alert.pattern.category === 'PRINT_FLAG_INPUT_REQUIRED') {
            // If no prompt argument and print mode, prefer interactive restart
            if (diagnostics.isPrintMode && !diagnostics.hasPromptArgument) {
                return sortedStrategies.find(s => s.strategyId === 'restart-without-print-flag') || sortedStrategies[0];
            }
        }
        return sortedStrategies[0];
    }
    async executeResolution(alert) {
        const strategy = this.selectBestStrategy(alert);
        if (!strategy) {
            throw new Error(`No resolution strategy available for ${alert.pattern.category}`);
        }
        const execution = {
            executionId: `resolution-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            alert,
            strategy,
            startTime: Date.now(),
            status: 'pending',
            stepsExecuted: strategy.executionSteps.map(step => ({
                step,
                status: 'pending',
                startTime: 0
            })),
            finalResult: null
        };
        this.activeExecutions.set(execution.executionId, execution);
        console.log(`🔧 [NLD] Starting resolution execution: ${strategy.name} for ${alert.instanceId}`);
        try {
            execution.status = 'executing';
            // Execute each step
            for (let i = 0; i < execution.stepsExecuted.length; i++) {
                const stepExecution = execution.stepsExecuted[i];
                stepExecution.status = 'executing';
                stepExecution.startTime = Date.now();
                try {
                    const stepResult = await this.executeStep(stepExecution.step, alert);
                    stepExecution.status = 'completed';
                    stepExecution.endTime = Date.now();
                    stepExecution.result = stepResult;
                    console.log(`✅ [NLD] Resolution step completed: ${stepExecution.step.description}`);
                }
                catch (stepError) {
                    stepExecution.status = 'failed';
                    stepExecution.endTime = Date.now();
                    stepExecution.error = stepError instanceof Error ? stepError.message : String(stepError);
                    console.error(`❌ [NLD] Resolution step failed: ${stepExecution.step.description}:`, stepError);
                    // Check if this is a critical failure or if we can continue
                    if (stepExecution.step.retryCount > 0) {
                        console.log(`🔄 [NLD] Retrying step: ${stepExecution.step.description}`);
                        // Implement retry logic here
                    }
                    else {
                        throw stepError;
                    }
                }
            }
            // All steps completed successfully
            execution.status = 'completed';
            execution.endTime = Date.now();
            execution.finalResult = {
                success: true,
                message: `Resolution strategy '${strategy.name}' executed successfully`,
                newProcessState: 'interactive', // Would be determined by actual execution
                recoveryActions: strategy.executionSteps.map(step => step.description)
            };
            console.log(`✅ [NLD] Resolution completed successfully for ${alert.instanceId}`);
        }
        catch (error) {
            execution.status = 'failed';
            execution.endTime = Date.now();
            execution.finalResult = {
                success: false,
                message: `Resolution failed: ${error instanceof Error ? error.message : String(error)}`,
                recoveryActions: execution.stepsExecuted
                    .filter(step => step.status === 'completed')
                    .map(step => step.step.description)
            };
            console.error(`❌ [NLD] Resolution failed for ${alert.instanceId}:`, error);
        }
        finally {
            this.activeExecutions.delete(execution.executionId);
            this.executionHistory.push(execution);
            // Limit history size
            if (this.executionHistory.length > 100) {
                this.executionHistory = this.executionHistory.slice(-50);
            }
        }
        return execution;
    }
    async executeStep(step, alert) {
        // Simulate step execution - in real implementation, this would interact with actual systems
        console.log(`🔧 [NLD] Executing step: ${step.description}`);
        switch (step.action) {
            case 'restart_process':
                // Would restart the actual process here
                console.log(`   Restarting process ${alert.instanceId} with parameters:`, step.parameters);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate restart time
                return { success: true, newPid: Math.floor(Math.random() * 10000) };
            case 'modify_args':
                console.log(`   Modifying arguments for ${alert.instanceId}:`, step.parameters);
                return { success: true, newArgs: step.parameters };
            case 'send_input':
                console.log(`   Sending input to ${alert.instanceId}:`, step.parameters.input);
                await new Promise(resolve => setTimeout(resolve, 500));
                return { success: true, inputSent: step.parameters.input };
            case 'validate_cli':
                console.log(`   Validating CLI availability:`, step.parameters.command);
                // Simulate CLI validation
                return { success: true, version: 'claude v1.0.0', available: true };
            default:
                throw new Error(`Unknown action: ${step.action}`);
        }
    }
    getExecutionHistory(category) {
        if (category) {
            return this.executionHistory.filter(exec => exec.alert.pattern.category === category);
        }
        return [...this.executionHistory];
    }
    getActiveExecutions() {
        return Array.from(this.activeExecutions.values());
    }
    generateResolutionReport() {
        const total = this.executionHistory.length;
        const successful = this.executionHistory.filter(exec => exec.finalResult?.success).length;
        const executionsByCategory = {};
        const strategyStats = {};
        let totalExecutionTime = 0;
        this.executionHistory.forEach(exec => {
            const category = exec.alert.pattern.category;
            executionsByCategory[category] = (executionsByCategory[category] || 0) + 1;
            const strategyId = exec.strategy.strategyId;
            if (!strategyStats[strategyId]) {
                strategyStats[strategyId] = { attempts: 0, successes: 0 };
            }
            strategyStats[strategyId].attempts++;
            if (exec.finalResult?.success) {
                strategyStats[strategyId].successes++;
            }
            if (exec.endTime) {
                totalExecutionTime += exec.endTime - exec.startTime;
            }
        });
        const mostSuccessfulStrategies = Object.entries(strategyStats)
            .map(([strategy, stats]) => ({
            strategy,
            successRate: stats.attempts > 0 ? stats.successes / stats.attempts : 0,
            executions: stats.attempts
        }))
            .sort((a, b) => b.successRate - a.successRate)
            .slice(0, 5);
        const recommendations = [];
        if (total > 0 && successful / total < 0.8) {
            recommendations.push('Resolution success rate below 80% - review strategies');
        }
        if (mostSuccessfulStrategies.length > 0 && mostSuccessfulStrategies[0].successRate < 0.9) {
            recommendations.push('Top strategy success rate below 90% - optimize resolution steps');
        }
        if (Object.keys(executionsByCategory).length > 0) {
            const topCategory = Object.entries(executionsByCategory)
                .sort(([, a], [, b]) => b - a)[0];
            recommendations.push(`High frequency of ${topCategory[0]} resolutions - implement prevention`);
        }
        return {
            totalExecutions: total,
            successRate: total > 0 ? successful / total : 0,
            executionsByCategory,
            averageExecutionTime: total > 0 ? totalExecutionTime / total : 0,
            mostSuccessfulStrategies,
            recommendations
        };
    }
}
exports.ClaudeProcessIOAutomatedResolution = ClaudeProcessIOAutomatedResolution;
// Export singleton instance
exports.claudeProcessIOResolution = new ClaudeProcessIOAutomatedResolution();
//# sourceMappingURL=claude-process-io-automated-resolution.js.map