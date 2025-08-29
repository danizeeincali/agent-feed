"use strict";
/**
 * NLD (Neuro-Learning Development) System - Entry Point
 *
 * Complete NLD system for failure pattern detection and prevention across:
 * - SSE connection failures
 * - Silent process failures (TTY, authentication, permissions, environment)
 * - Process I/O capture failures
 * - Working directory and terminal issues
 *
 * Features:
 * - Real-time failure monitoring and pattern detection
 * - Comprehensive anti-pattern databases with prevention strategies
 * - Neural training data export for claude-flow integration
 * - TDD prevention strategies and automated test generation
 * - Silent process failure detection with automated recovery
 * - Integrated monitoring and reporting system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeProcessIODeployment = exports.claudeProcessIOIntegration = exports.claudeProcessIOTDDPrevention = exports.claudeProcessIONeuralDataset = exports.claudeProcessIOMonitor = exports.claudeProcessIODetector = exports.deploySilentProcessNLD = exports.SilentProcessNLDDeployment = exports.demonstratePatternDetectionFlow = exports.validateNLDSystem = exports.nldSilentProcessIntegration = exports.NLDSilentProcessIntegrationSystem = exports.NLDSSEIntegrationSystem = exports.NeuralTrainingExportSystem = exports.TerminalAntiPatternsDatabase = exports.stdoutCaptureMonitor = exports.StdoutCaptureFailureMonitor = exports.ProcessIOAntiPatternsDatabase = exports.silentProcessNeuralExport = exports.SilentProcessNeuralTrainingExport = exports.tddSilentProcessPrevention = exports.TDDSilentProcessPreventionStrategies = exports.silentProcessAntiPatternsDB = exports.SilentProcessAntiPatternsDatabase = exports.silentProcessDetector = exports.SilentProcessFailureDetector = exports.TDDSSEPreventionStrategies = exports.SSEAntiPatternsDatabase = exports.RealTimeSSEFailureMonitor = exports.SSEConnectionPatternDetector = void 0;
// Core SSE Components
var sse_connection_pattern_detector_1 = require("./sse-connection-pattern-detector");
Object.defineProperty(exports, "SSEConnectionPatternDetector", { enumerable: true, get: function () { return sse_connection_pattern_detector_1.SSEConnectionPatternDetector; } });
var real_time_sse_failure_monitor_1 = require("./real-time-sse-failure-monitor");
Object.defineProperty(exports, "RealTimeSSEFailureMonitor", { enumerable: true, get: function () { return real_time_sse_failure_monitor_1.RealTimeSSEFailureMonitor; } });
var sse_anti_patterns_database_1 = require("./sse-anti-patterns-database");
Object.defineProperty(exports, "SSEAntiPatternsDatabase", { enumerable: true, get: function () { return sse_anti_patterns_database_1.SSEAntiPatternsDatabase; } });
var tdd_sse_prevention_strategies_1 = require("./tdd-sse-prevention-strategies");
Object.defineProperty(exports, "TDDSSEPreventionStrategies", { enumerable: true, get: function () { return tdd_sse_prevention_strategies_1.TDDSSEPreventionStrategies; } });
// Silent Process Failure Components
var silent_process_failure_detector_1 = require("./silent-process-failure-detector");
Object.defineProperty(exports, "SilentProcessFailureDetector", { enumerable: true, get: function () { return silent_process_failure_detector_1.SilentProcessFailureDetector; } });
Object.defineProperty(exports, "silentProcessDetector", { enumerable: true, get: function () { return silent_process_failure_detector_1.silentProcessDetector; } });
var silent_process_anti_patterns_database_1 = require("./silent-process-anti-patterns-database");
Object.defineProperty(exports, "SilentProcessAntiPatternsDatabase", { enumerable: true, get: function () { return silent_process_anti_patterns_database_1.SilentProcessAntiPatternsDatabase; } });
Object.defineProperty(exports, "silentProcessAntiPatternsDB", { enumerable: true, get: function () { return silent_process_anti_patterns_database_1.silentProcessAntiPatternsDB; } });
var tdd_silent_process_prevention_strategies_1 = require("./tdd-silent-process-prevention-strategies");
Object.defineProperty(exports, "TDDSilentProcessPreventionStrategies", { enumerable: true, get: function () { return tdd_silent_process_prevention_strategies_1.TDDSilentProcessPreventionStrategies; } });
Object.defineProperty(exports, "tddSilentProcessPrevention", { enumerable: true, get: function () { return tdd_silent_process_prevention_strategies_1.tddSilentProcessPrevention; } });
var silent_process_neural_training_export_1 = require("./silent-process-neural-training-export");
Object.defineProperty(exports, "SilentProcessNeuralTrainingExport", { enumerable: true, get: function () { return silent_process_neural_training_export_1.SilentProcessNeuralTrainingExport; } });
Object.defineProperty(exports, "silentProcessNeuralExport", { enumerable: true, get: function () { return silent_process_neural_training_export_1.silentProcessNeuralExport; } });
// Process I/O and Terminal Components
var process_io_anti_patterns_database_1 = require("./process-io-anti-patterns-database");
Object.defineProperty(exports, "ProcessIOAntiPatternsDatabase", { enumerable: true, get: function () { return process_io_anti_patterns_database_1.ProcessIOAntiPatternsDatabase; } });
var stdout_capture_failure_monitor_1 = require("./stdout-capture-failure-monitor");
Object.defineProperty(exports, "StdoutCaptureFailureMonitor", { enumerable: true, get: function () { return stdout_capture_failure_monitor_1.StdoutCaptureFailureMonitor; } });
Object.defineProperty(exports, "stdoutCaptureMonitor", { enumerable: true, get: function () { return stdout_capture_failure_monitor_1.stdoutCaptureMonitor; } });
var terminal_anti_patterns_database_1 = require("./terminal-anti-patterns-database");
Object.defineProperty(exports, "TerminalAntiPatternsDatabase", { enumerable: true, get: function () { return terminal_anti_patterns_database_1.TerminalAntiPatternsDatabase; } });
// Neural Training and Export Systems
var neural_training_export_system_1 = require("./neural-training-export-system");
Object.defineProperty(exports, "NeuralTrainingExportSystem", { enumerable: true, get: function () { return neural_training_export_system_1.NeuralTrainingExportSystem; } });
// Integration Systems
var nld_sse_integration_1 = require("./nld-sse-integration");
Object.defineProperty(exports, "NLDSSEIntegrationSystem", { enumerable: true, get: function () { return nld_sse_integration_1.NLDSSEIntegrationSystem; } });
var nld_silent_process_integration_1 = require("./nld-silent-process-integration");
Object.defineProperty(exports, "NLDSilentProcessIntegrationSystem", { enumerable: true, get: function () { return nld_silent_process_integration_1.NLDSilentProcessIntegrationSystem; } });
Object.defineProperty(exports, "nldSilentProcessIntegration", { enumerable: true, get: function () { return nld_silent_process_integration_1.nldSilentProcessIntegration; } });
// Deployment and Validation
var validate_nld_system_1 = require("./validate-nld-system");
Object.defineProperty(exports, "validateNLDSystem", { enumerable: true, get: function () { return validate_nld_system_1.validateNLDSystem; } });
Object.defineProperty(exports, "demonstratePatternDetectionFlow", { enumerable: true, get: function () { return validate_nld_system_1.demonstratePatternDetectionFlow; } });
var deploy_silent_process_nld_1 = require("./deploy-silent-process-nld");
Object.defineProperty(exports, "SilentProcessNLDDeployment", { enumerable: true, get: function () { return deploy_silent_process_nld_1.SilentProcessNLDDeployment; } });
Object.defineProperty(exports, "deploySilentProcessNLD", { enumerable: true, get: function () { return deploy_silent_process_nld_1.deploySilentProcessNLD; } });
/**
 * Quick Start Guide
 * ================
 *
 * 1. Initialize the complete NLD system:
 * ```typescript
 * import { nldSilentProcessIntegration, NLDSSEIntegrationSystem } from '@/src/nld';
 *
 * // Initialize SSE monitoring
 * const sseSystem = new NLDSSEIntegrationSystem();
 * await sseSystem.initialize();
 *
 * // Initialize silent process monitoring
 * await nldSilentProcessIntegration.initialize();
 * ```
 *
 * 2. Register processes for monitoring:
 * ```typescript
 * // When spawning a new process
 * nldSilentProcessIntegration.registerProcess(instanceId, processId, command, workingDirectory);
 *
 * // Record process output
 * nldSilentProcessIntegration.recordProcessOutput(instanceId, 'stdout', data);
 * nldSilentProcessIntegration.recordProcessInput(instanceId, input);
 * ```
 *
 * 3. Monitor for failure patterns:
 * ```typescript
 * const systemReport = nldSilentProcessIntegration.generateSystemReport();
 * console.log('System Status:', systemReport.systemStatus);
 * console.log('Silent Processes:', systemReport.silentProcesses);
 * console.log('Detected Patterns:', systemReport.detectedPatterns);
 * ```
 *
 * 4. Run TDD prevention tests:
 * ```typescript
 * const testResults = await nldSilentProcessIntegration.runTDDTestSuite();
 * console.log('TDD Coverage:', testResults.patternsCovered);
 * ```
 *
 * 5. Deploy complete silent process detection:
 * ```typescript
 * import { deploySilentProcessNLD } from '@/src/nld';
 *
 * const deploymentResult = await deploySilentProcessNLD();
 * console.log('Deployment Status:', deploymentResult.validationResults);
 * ```
 */
/**
 * Detected SSE Anti-Patterns
 * ==========================
 *
 * 1. Status SSE Zero Connections While Terminal Connected (Critical)
 *    - Symptoms: UI stuck on "starting", terminal works, status SSE = 0 connections
 *    - Prevention: Establish status SSE before terminal SSE
 *    - Recovery: Restart status SSE connections
 *
 * 2. Terminal Input Forwarding Breakdown (High)
 *    - Symptoms: Input accepted but no command responses
 *    - Prevention: Input path validation before sending
 *    - Recovery: Reset terminal input connection
 *
 * 3. Mixed Connection State Inconsistency (Medium)
 *    - Symptoms: Frontend/backend connection state mismatch
 *    - Prevention: Connection state synchronization
 *    - Recovery: Force state reconciliation
 *
 * 4. UI State Lock on Instance Status (High)
 *    - Symptoms: Status stuck despite backend showing "running"
 *    - Prevention: Status update timeout detection
 *    - Recovery: Force status refresh
 *
 * 5. Connection Recovery Loop Failure (Medium)
 *    - Symptoms: Infinite reconnection attempts
 *    - Prevention: Circuit breaker pattern
 *    - Recovery: Manual recovery override
 */
/**
 * TDD Implementation Priority
 * ===========================
 *
 * Critical:
 * - Connection establishment order validation tests
 * - Connection state synchronization tests
 *
 * High:
 * - UI status update timeout tests
 * - Terminal input forwarding validation tests
 *
 * Medium:
 * - Connection recovery mechanism tests
 * - Performance benchmark tests
 */
/**
 * Neural Training Capabilities
 * ============================
 *
 * - Pattern classification and prediction
 * - Failure probability estimation
 * - Recovery action effectiveness tracking
 * - TDD test case generation
 * - Continuous learning from user feedback
 * - Integration with claude-flow neural network
 */
// Claude Process I/O Components (NEW)
var claude_process_io_failure_detector_1 = require("./claude-process-io-failure-detector");
Object.defineProperty(exports, "claudeProcessIODetector", { enumerable: true, get: function () { return claude_process_io_failure_detector_1.claudeProcessIODetector; } });
var claude_process_io_real_time_monitor_1 = require("./claude-process-io-real-time-monitor");
Object.defineProperty(exports, "claudeProcessIOMonitor", { enumerable: true, get: function () { return claude_process_io_real_time_monitor_1.claudeProcessIOMonitor; } });
var claude_process_io_neural_training_dataset_1 = require("./claude-process-io-neural-training-dataset");
Object.defineProperty(exports, "claudeProcessIONeuralDataset", { enumerable: true, get: function () { return claude_process_io_neural_training_dataset_1.claudeProcessIONeuralDataset; } });
var claude_process_io_tdd_prevention_strategies_1 = require("./claude-process-io-tdd-prevention-strategies");
Object.defineProperty(exports, "claudeProcessIOTDDPrevention", { enumerable: true, get: function () { return claude_process_io_tdd_prevention_strategies_1.claudeProcessIOTDDPrevention; } });
var claude_process_io_integration_system_1 = require("./claude-process-io-integration-system");
Object.defineProperty(exports, "claudeProcessIOIntegration", { enumerable: true, get: function () { return claude_process_io_integration_system_1.claudeProcessIOIntegration; } });
var claude_process_io_deployment_demo_1 = require("./claude-process-io-deployment-demo");
Object.defineProperty(exports, "claudeProcessIODeployment", { enumerable: true, get: function () { return claude_process_io_deployment_demo_1.claudeProcessIODeployment; } });
// Default export for convenience
exports.default = NLDSSEIntegrationSystem;
//# sourceMappingURL=index.js.map