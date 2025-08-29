"use strict";
/**
 * Claude Process I/O TDD Prevention Strategies - NLD System
 *
 * Test-Driven Development prevention strategies specifically for Claude CLI
 * process I/O failures, using London School TDD methodology.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeProcessIOTDDPrevention = exports.ClaudeProcessIOTDDPreventionStrategies = void 0;
class ClaudeProcessIOTDDPreventionStrategies {
    testSuites = new Map();
    constructor() {
        this.initializeTDDSuites();
    }
    initializeTDDSuites() {
        this.createPrintFlagInputRequiredSuite();
        this.createInteractiveModeBlockedSuite();
        this.createPTYStdinDisconnectSuite();
        this.createAuthSuccessNoOutputSuite();
    }
    createPrintFlagInputRequiredSuite() {
        const suite = {
            suiteId: 'print-flag-input-required',
            category: 'PRINT_FLAG_INPUT_REQUIRED',
            testCases: [
                {
                    testId: 'print-flag-no-prompt-argument',
                    category: 'PRINT_FLAG_INPUT_REQUIRED',
                    description: 'Should validate prompt argument exists when --print flag is used',
                    scenario: 'Claude spawned with --print flag but no prompt argument',
                    expectedBehavior: 'Pre-spawn validation should detect missing prompt and prevent spawn',
                    testImplementation: {
                        setup: [
                            'const commandValidator = new ClaudeCommandValidator()',
                            'const spawnCollaborator = jest.fn()',
                            'const errorHandler = jest.fn()'
                        ],
                        execution: [
                            'const command = "claude"',
                            'const args = ["--print"]', // No prompt argument
                            'const result = commandValidator.validatePrintMode(command, args)'
                        ],
                        assertions: [
                            'expect(result.isValid).toBe(false)',
                            'expect(result.errors).toContain("PRINT_FLAG_REQUIRES_INPUT")',
                            'expect(spawnCollaborator).not.toHaveBeenCalled()',
                            'expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({ type: "VALIDATION_ERROR" }))'
                        ],
                        teardown: [
                            'jest.clearAllMocks()'
                        ]
                    },
                    mockingStrategy: {
                        collaborators: ['ProcessSpawner', 'ErrorHandler', 'InputValidator'],
                        mockSetup: [
                            'const mockSpawner = { spawn: jest.fn() }',
                            'const mockErrorHandler = { handle: jest.fn() }',
                            'const mockInputValidator = { hasInput: jest.fn().mockReturnValue(false) }'
                        ],
                        expectations: [
                            'expect(mockSpawner.spawn).not.toHaveBeenCalled()',
                            'expect(mockErrorHandler.handle).toHaveBeenCalledWith(expect.objectContaining({ pattern: "PRINT_FLAG_INPUT_REQUIRED" }))'
                        ]
                    },
                    preventionLevel: 'unit',
                    priority: 'high'
                },
                {
                    testId: 'print-flag-empty-stdin',
                    category: 'PRINT_FLAG_INPUT_REQUIRED',
                    description: 'Should validate stdin input exists when --print flag is used without prompt argument',
                    scenario: 'Claude spawned with --print flag, no prompt argument, but stdin has input',
                    expectedBehavior: 'Should allow spawn when stdin has input available',
                    testImplementation: {
                        setup: [
                            'const stdinMock = { hasInput: jest.fn().mockReturnValue(true) }',
                            'const processManager = new ClaudeProcessManager(stdinMock)'
                        ],
                        execution: [
                            'const result = await processManager.spawnClaudeProcess("claude", ["--print"])'
                        ],
                        assertions: [
                            'expect(result.success).toBe(true)',
                            'expect(stdinMock.hasInput).toHaveBeenCalled()',
                            'expect(result.processId).toBeDefined()'
                        ],
                        teardown: [
                            'await processManager.cleanup()'
                        ]
                    },
                    mockingStrategy: {
                        collaborators: ['StdinReader', 'ProcessSpawner'],
                        mockSetup: [
                            'const mockStdin = { hasInput: jest.fn(), read: jest.fn() }',
                            'const mockSpawner = { spawn: jest.fn().mockResolvedValue({ pid: 123 }) }'
                        ],
                        expectations: [
                            'expect(mockStdin.hasInput).toHaveBeenCalled()',
                            'expect(mockSpawner.spawn).toHaveBeenCalledWith("claude", ["--print"], expect.any(Object))'
                        ]
                    },
                    preventionLevel: 'integration',
                    priority: 'high'
                }
            ],
            coverage: {
                pathsCovered: [
                    'print-flag-with-prompt-argument',
                    'print-flag-with-stdin-input',
                    'print-flag-without-input',
                    'validation-before-spawn'
                ],
                failureScenarios: [
                    'missing-prompt-argument',
                    'empty-stdin',
                    'invalid-argument-combination'
                ],
                recoveryStrategies: [
                    'prompt-user-for-input',
                    'switch-to-interactive-mode',
                    'provide-default-prompt'
                ]
            },
            londonSchoolPatterns: {
                collaboratorInteractions: [
                    'InputValidator interacts with StdinReader to check input availability',
                    'CommandValidator collaborates with ArgumentParser to validate flags',
                    'ProcessManager coordinates with Validator before spawning'
                ],
                behaviorVerification: [
                    'Verify validation occurs before process spawn',
                    'Verify error handling is triggered for invalid combinations',
                    'Verify recovery suggestions are provided'
                ],
                outsideInDesign: [
                    'Start with user requirement: prevent --print errors',
                    'Design ProcessManager behavior first',
                    'Drive out Validator and InputReader collaborators',
                    'Implement lowest-level components last'
                ]
            }
        };
        this.testSuites.set(suite.suiteId, suite);
    }
    createInteractiveModeBlockedSuite() {
        const suite = {
            suiteId: 'interactive-mode-blocked',
            category: 'INTERACTIVE_MODE_BLOCKED',
            testCases: [
                {
                    testId: 'claude-cli-not-installed',
                    category: 'INTERACTIVE_MODE_BLOCKED',
                    description: 'Should detect when Claude CLI is not installed before spawning',
                    scenario: 'Attempt to spawn Claude when CLI is not available',
                    expectedBehavior: 'Pre-flight check should detect missing CLI and provide installation guidance',
                    testImplementation: {
                        setup: [
                            'const cliChecker = new ClaudeCLIChecker()',
                            'const installationGuide = jest.fn()',
                            'const processSpawner = jest.fn()'
                        ],
                        execution: [
                            'const result = await cliChecker.verifyInstallation()',
                            'const spawnResult = await processManager.spawnIfAvailable("claude", [])'
                        ],
                        assertions: [
                            'expect(result.isInstalled).toBe(false)',
                            'expect(result.errorType).toBe("CLI_NOT_FOUND")',
                            'expect(processSpawner).not.toHaveBeenCalled()',
                            'expect(installationGuide).toHaveBeenCalledWith("claude-cli-installation")'
                        ],
                        teardown: [
                            'jest.restoreAllMocks()'
                        ]
                    },
                    mockingStrategy: {
                        collaborators: ['CLIChecker', 'ProcessSpawner', 'InstallationGuide'],
                        mockSetup: [
                            'const mockCLIChecker = { checkCLI: jest.fn().mockResolvedValue({ available: false }) }',
                            'const mockSpawner = { spawn: jest.fn() }',
                            'const mockGuide = { showInstallationHelp: jest.fn() }'
                        ],
                        expectations: [
                            'expect(mockCLIChecker.checkCLI).toHaveBeenCalledWith("claude")',
                            'expect(mockSpawner.spawn).not.toHaveBeenCalled()',
                            'expect(mockGuide.showInstallationHelp).toHaveBeenCalled()'
                        ]
                    },
                    preventionLevel: 'contract',
                    priority: 'critical'
                },
                {
                    testId: 'authentication-failure-detection',
                    category: 'INTERACTIVE_MODE_BLOCKED',
                    description: 'Should detect authentication failures and suggest re-authentication',
                    scenario: 'Claude CLI installed but authentication has expired',
                    expectedBehavior: 'Should detect auth failure and guide user through re-authentication',
                    testImplementation: {
                        setup: [
                            'const authChecker = new ClaudeAuthChecker()',
                            'const authGuide = jest.fn()',
                            'const processTimeout = 15000'
                        ],
                        execution: [
                            'const authResult = await authChecker.verifyAuthentication()',
                            'const spawnResult = await processManager.spawnWithAuthCheck("claude", [], processTimeout)'
                        ],
                        assertions: [
                            'expect(authResult.isAuthenticated).toBe(false)',
                            'expect(spawnResult.requiresAuth).toBe(true)',
                            'expect(authGuide).toHaveBeenCalledWith("re-authentication-required")',
                            'expect(spawnResult.suggestions).toContain("claude auth login")'
                        ],
                        teardown: [
                            'authChecker.cleanup()'
                        ]
                    },
                    mockingStrategy: {
                        collaborators: ['AuthChecker', 'ProcessManager', 'AuthGuide'],
                        mockSetup: [
                            'const mockAuthChecker = { verify: jest.fn().mockResolvedValue({ valid: false, expired: true }) }',
                            'const mockProcessManager = { spawn: jest.fn() }',
                            'const mockAuthGuide = { suggest: jest.fn() }'
                        ],
                        expectations: [
                            'expect(mockAuthChecker.verify).toHaveBeenCalled()',
                            'expect(mockProcessManager.spawn).not.toHaveBeenCalled()',
                            'expect(mockAuthGuide.suggest).toHaveBeenCalledWith(expect.arrayContaining(["claude auth login"]))'
                        ]
                    },
                    preventionLevel: 'integration',
                    priority: 'critical'
                }
            ],
            coverage: {
                pathsCovered: [
                    'cli-availability-check',
                    'authentication-verification',
                    'permissions-validation',
                    'environment-setup-check'
                ],
                failureScenarios: [
                    'cli-not-installed',
                    'authentication-expired',
                    'insufficient-permissions',
                    'network-connectivity-issues'
                ],
                recoveryStrategies: [
                    'install-claude-cli',
                    're-authenticate',
                    'add-permissions-flag',
                    'check-network-connection'
                ]
            },
            londonSchoolPatterns: {
                collaboratorInteractions: [
                    'ProcessManager delegates to CLIChecker for availability',
                    'AuthChecker collaborates with TokenValidator',
                    'EnvironmentChecker coordinates with PermissionValidator'
                ],
                behaviorVerification: [
                    'Verify pre-flight checks occur before spawn attempts',
                    'Verify appropriate error messages are generated',
                    'Verify recovery suggestions match detected failure type'
                ],
                outsideInDesign: [
                    'Start with requirement: prevent interactive mode blocking',
                    'Design ProcessManager.spawnInteractiveClause() behavior',
                    'Drive out PreFlightChecker collaborator',
                    'Implement specific checker components'
                ]
            }
        };
        this.testSuites.set(suite.suiteId, suite);
    }
    createPTYStdinDisconnectSuite() {
        const suite = {
            suiteId: 'pty-stdin-disconnect',
            category: 'PTY_STDIN_DISCONNECT',
            testCases: [
                {
                    testId: 'pty-stdin-health-monitoring',
                    category: 'PTY_STDIN_DISCONNECT',
                    description: 'Should monitor PTY stdin connection health and detect disconnections',
                    scenario: 'PTY process loses stdin connection during operation',
                    expectedBehavior: 'Health monitor should detect disconnection and initiate recovery',
                    testImplementation: {
                        setup: [
                            'const ptyHealthMonitor = new PTYHealthMonitor()',
                            'const recoveryManager = jest.fn()',
                            'const mockPTYProcess = { stdin: { writable: false, destroyed: true } }'
                        ],
                        execution: [
                            'ptyHealthMonitor.monitorConnection(mockPTYProcess)',
                            'await new Promise(resolve => setTimeout(resolve, 100))', // Let monitoring detect issue
                            'const healthStatus = ptyHealthMonitor.getConnectionStatus(mockPTYProcess.pid)'
                        ],
                        assertions: [
                            'expect(healthStatus.stdinConnected).toBe(false)',
                            'expect(healthStatus.issueDetected).toBe(true)',
                            'expect(recoveryManager).toHaveBeenCalledWith(expect.objectContaining({ type: "PTY_STDIN_DISCONNECT" }))'
                        ],
                        teardown: [
                            'ptyHealthMonitor.stopMonitoring(mockPTYProcess.pid)'
                        ]
                    },
                    mockingStrategy: {
                        collaborators: ['PTYHealthMonitor', 'RecoveryManager', 'PTYProcess'],
                        mockSetup: [
                            'const mockHealthMonitor = { monitor: jest.fn(), getStatus: jest.fn() }',
                            'const mockRecovery = { recover: jest.fn() }',
                            'const mockPTY = { stdin: { writable: false }, pid: 123 }'
                        ],
                        expectations: [
                            'expect(mockHealthMonitor.monitor).toHaveBeenCalledWith(mockPTY)',
                            'expect(mockRecovery.recover).toHaveBeenCalledWith(expect.objectContaining({ strategy: "FALLBACK_TO_PIPE" }))'
                        ]
                    },
                    preventionLevel: 'integration',
                    priority: 'high'
                },
                {
                    testId: 'automatic-fallback-to-pipe-mode',
                    category: 'PTY_STDIN_DISCONNECT',
                    description: 'Should automatically fall back to pipe mode when PTY stdin fails',
                    scenario: 'PTY stdin connection fails and needs fallback to pipe mode',
                    expectedBehavior: 'Process should be restarted in pipe mode without user intervention',
                    testImplementation: {
                        setup: [
                            'const processManager = new ClaudeProcessManager()',
                            'const fallbackStrategy = new PTYFallbackStrategy()',
                            'const mockFailedPTY = { pid: 123, stdin: { destroyed: true } }'
                        ],
                        execution: [
                            'const fallbackResult = await fallbackStrategy.execute(mockFailedPTY, "claude", [])'
                        ],
                        assertions: [
                            'expect(fallbackResult.success).toBe(true)',
                            'expect(fallbackResult.newProcessType).toBe("pipe")',
                            'expect(fallbackResult.newPid).toBeDefined()',
                            'expect(fallbackResult.originalPid).toBe(123)'
                        ],
                        teardown: [
                            'await processManager.cleanup(fallbackResult.newPid)'
                        ]
                    },
                    mockingStrategy: {
                        collaborators: ['ProcessManager', 'PTYFallbackStrategy', 'ProcessSpawner'],
                        mockSetup: [
                            'const mockManager = { restart: jest.fn().mockResolvedValue({ pid: 456, type: "pipe" }) }',
                            'const mockSpawner = { spawnPipe: jest.fn() }',
                            'const mockFallback = { execute: jest.fn() }'
                        ],
                        expectations: [
                            'expect(mockManager.restart).toHaveBeenCalledWith(123, { type: "pipe" })',
                            'expect(mockSpawner.spawnPipe).toHaveBeenCalledWith("claude", [], expect.any(Object))'
                        ]
                    },
                    preventionLevel: 'end-to-end',
                    priority: 'high'
                }
            ],
            coverage: {
                pathsCovered: [
                    'pty-health-monitoring',
                    'stdin-disconnection-detection',
                    'automatic-fallback-mechanism',
                    'pipe-mode-restart'
                ],
                failureScenarios: [
                    'pty-stdin-destroyed',
                    'pty-stdin-not-writable',
                    'pty-process-crash',
                    'terminal-environment-issues'
                ],
                recoveryStrategies: [
                    'fallback-to-pipe-mode',
                    'restart-pty-process',
                    'reconnect-stdin-stream',
                    'switch-terminal-type'
                ]
            },
            londonSchoolPatterns: {
                collaboratorInteractions: [
                    'PTYHealthMonitor delegates to ConnectionChecker',
                    'FallbackStrategy collaborates with ProcessManager for restart',
                    'RecoveryManager coordinates with HealthMonitor and FallbackStrategy'
                ],
                behaviorVerification: [
                    'Verify health monitoring detects connection issues',
                    'Verify fallback strategy is executed when PTY fails',
                    'Verify new process is created successfully in pipe mode'
                ],
                outsideInDesign: [
                    'Start with requirement: prevent PTY stdin disconnection issues',
                    'Design ProcessManager.handlePTYFailure() behavior',
                    'Drive out PTYHealthMonitor and FallbackStrategy collaborators',
                    'Implement connection monitoring and recovery mechanisms'
                ]
            }
        };
        this.testSuites.set(suite.suiteId, suite);
    }
    createAuthSuccessNoOutputSuite() {
        const suite = {
            suiteId: 'auth-success-no-output',
            category: 'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT',
            testCases: [
                {
                    testId: 'activation-prompt-after-auth',
                    category: 'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT',
                    description: 'Should send activation prompt after successful authentication',
                    scenario: 'Claude authenticates successfully but remains silent',
                    expectedBehavior: 'Activation prompt should be sent automatically to trigger output',
                    testImplementation: {
                        setup: [
                            'const activationManager = new ClaudeActivationManager()',
                            'const mockAuthenticatedProcess = { pid: 123, stdin: { write: jest.fn() } }',
                            'const outputMonitor = jest.fn()'
                        ],
                        execution: [
                            'activationManager.handleAuthSuccess(mockAuthenticatedProcess)',
                            'await new Promise(resolve => setTimeout(resolve, 50))', // Let activation trigger
                        ],
                        assertions: [
                            'expect(mockAuthenticatedProcess.stdin.write).toHaveBeenCalledWith(expect.stringContaining("hello"))',
                            'expect(outputMonitor).toHaveBeenCalledWith(expect.objectContaining({ type: "ACTIVATION_SENT" }))'
                        ],
                        teardown: [
                            'activationManager.cleanup()'
                        ]
                    },
                    mockingStrategy: {
                        collaborators: ['ActivationManager', 'AuthenticatedProcess', 'OutputMonitor'],
                        mockSetup: [
                            'const mockActivation = { activate: jest.fn() }',
                            'const mockProcess = { stdin: { write: jest.fn() }, stdout: { on: jest.fn() } }',
                            'const mockMonitor = { watch: jest.fn() }'
                        ],
                        expectations: [
                            'expect(mockActivation.activate).toHaveBeenCalledWith(mockProcess)',
                            'expect(mockProcess.stdin.write).toHaveBeenCalled()',
                            'expect(mockMonitor.watch).toHaveBeenCalledWith(mockProcess.pid)'
                        ]
                    },
                    preventionLevel: 'unit',
                    priority: 'medium'
                },
                {
                    testId: 'output-timeout-detection',
                    category: 'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT',
                    description: 'Should detect when no output is received after authentication timeout',
                    scenario: 'Process authenticates but produces no output within timeout period',
                    expectedBehavior: 'Timeout detector should trigger recovery after specified duration',
                    testImplementation: {
                        setup: [
                            'const timeoutDetector = new OutputTimeoutDetector(5000)', // 5 second timeout
                            'const recoveryTrigger = jest.fn()',
                            'const mockSilentProcess = { pid: 123, lastOutput: Date.now() - 6000 }' // 6 seconds ago
                        ],
                        execution: [
                            'timeoutDetector.monitorProcess(mockSilentProcess)',
                            'await new Promise(resolve => setTimeout(resolve, 100))', // Let timeout detection run
                        ],
                        assertions: [
                            'expect(recoveryTrigger).toHaveBeenCalledWith(expect.objectContaining({ type: "OUTPUT_TIMEOUT", pid: 123 }))'
                        ],
                        teardown: [
                            'timeoutDetector.stop()'
                        ]
                    },
                    mockingStrategy: {
                        collaborators: ['OutputTimeoutDetector', 'RecoveryTrigger', 'ProcessMonitor'],
                        mockSetup: [
                            'const mockDetector = { monitor: jest.fn(), checkTimeout: jest.fn().mockReturnValue(true) }',
                            'const mockTrigger = { trigger: jest.fn() }',
                            'const mockMonitor = { getLastActivity: jest.fn() }'
                        ],
                        expectations: [
                            'expect(mockDetector.checkTimeout).toHaveBeenCalledWith(mockSilentProcess)',
                            'expect(mockTrigger.trigger).toHaveBeenCalledWith(expect.objectContaining({ reason: "OUTPUT_TIMEOUT" }))'
                        ]
                    },
                    preventionLevel: 'integration',
                    priority: 'medium'
                }
            ],
            coverage: {
                pathsCovered: [
                    'authentication-success-detection',
                    'activation-prompt-sending',
                    'output-timeout-monitoring',
                    'recovery-trigger-mechanism'
                ],
                failureScenarios: [
                    'auth-success-but-silent',
                    'activation-prompt-ignored',
                    'output-stream-blocked',
                    'claude-service-unresponsive'
                ],
                recoveryStrategies: [
                    'send-activation-prompt',
                    'restart-process',
                    'check-claude-service-status',
                    'verify-output-stream-health'
                ]
            },
            londonSchoolPatterns: {
                collaboratorInteractions: [
                    'ActivationManager coordinates with AuthenticationDetector',
                    'TimeoutDetector delegates to ProcessMonitor for activity tracking',
                    'RecoveryManager collaborates with ActivationManager and TimeoutDetector'
                ],
                behaviorVerification: [
                    'Verify activation prompt is sent after authentication success',
                    'Verify timeout detection triggers recovery mechanisms',
                    'Verify recovery actions are appropriate for detected failure'
                ],
                outsideInDesign: [
                    'Start with requirement: handle silent authenticated processes',
                    'Design ProcessManager.handleSilentAuth() behavior',
                    'Drive out ActivationManager and TimeoutDetector collaborators',
                    'Implement activation and monitoring mechanisms'
                ]
            }
        };
        this.testSuites.set(suite.suiteId, suite);
    }
    getTestSuite(category) {
        const suiteId = this.getCategoryToSuiteId(category);
        return this.testSuites.get(suiteId);
    }
    getAllTestSuites() {
        return Array.from(this.testSuites.values());
    }
    generateTestImplementation(testCase) {
        return `
describe('${testCase.description}', () => {
  test('${testCase.scenario}', async () => {
    // Setup
    ${testCase.testImplementation.setup.join('\n    ')}
    
    // Mock Strategy
    ${testCase.mockingStrategy.mockSetup.join('\n    ')}
    
    // Execution
    ${testCase.testImplementation.execution.join('\n    ')}
    
    // Assertions
    ${testCase.testImplementation.assertions.join('\n    ')}
    
    // Mock Expectations
    ${testCase.mockingStrategy.expectations.join('\n    ')}
    
    // Teardown
    ${testCase.testImplementation.teardown.join('\n    ')}
  });
});`;
    }
    generateFullTestSuite(category) {
        const suite = this.getTestSuite(category);
        if (!suite)
            return '';
        const testImplementations = suite.testCases
            .map(testCase => this.generateTestImplementation(testCase))
            .join('\n\n');
        return `
/**
 * ${suite.category} TDD Prevention Test Suite
 * Generated by Claude Process I/O NLD System
 */

import { jest } from '@jest/globals';

${testImplementations}

/**
 * Coverage Analysis:
 * - Paths Covered: ${suite.coverage.pathsCovered.join(', ')}
 * - Failure Scenarios: ${suite.coverage.failureScenarios.join(', ')}
 * - Recovery Strategies: ${suite.coverage.recoveryStrategies.join(', ')}
 */

/**
 * London School TDD Patterns Applied:
 * - Collaborator Interactions: ${suite.londonSchoolPatterns.collaboratorInteractions.join(', ')}
 * - Behavior Verification: ${suite.londonSchoolPatterns.behaviorVerification.join(', ')}
 * - Outside-In Design: ${suite.londonSchoolPatterns.outsideInDesign.join(', ')}
 */
`;
    }
    getCategoryToSuiteId(category) {
        const mapping = {
            'PRINT_FLAG_INPUT_REQUIRED': 'print-flag-input-required',
            'INTERACTIVE_MODE_BLOCKED': 'interactive-mode-blocked',
            'PTY_STDIN_DISCONNECT': 'pty-stdin-disconnect',
            'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT': 'auth-success-no-output'
        };
        return mapping[category];
    }
    generateCoverageReport() {
        const allSuites = this.getAllTestSuites();
        const totalTestCases = allSuites.reduce((sum, suite) => sum + suite.testCases.length, 0);
        const testsByCategory = {};
        const testsByPriority = {};
        const testsByLevel = {};
        const coverageByCategory = {};
        allSuites.forEach(suite => {
            testsByCategory[suite.category] = suite.testCases.length;
            coverageByCategory[suite.category] = {
                pathsCovered: suite.coverage.pathsCovered.length,
                failureScenarios: suite.coverage.failureScenarios.length,
                recoveryStrategies: suite.coverage.recoveryStrategies.length
            };
            suite.testCases.forEach(testCase => {
                testsByPriority[testCase.priority] = (testsByPriority[testCase.priority] || 0) + 1;
                testsByLevel[testCase.preventionLevel] = (testsByLevel[testCase.preventionLevel] || 0) + 1;
            });
        });
        return {
            totalTestCases,
            testsByCategory,
            testsByPriority,
            testsByLevel,
            coverageByCategory
        };
    }
}
exports.ClaudeProcessIOTDDPreventionStrategies = ClaudeProcessIOTDDPreventionStrategies;
// Export singleton instance
exports.claudeProcessIOTDDPrevention = new ClaudeProcessIOTDDPreventionStrategies();
//# sourceMappingURL=claude-process-io-tdd-prevention-strategies.js.map