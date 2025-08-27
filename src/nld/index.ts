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

// Core SSE Components
export { SSEConnectionPatternDetector, SSEConnectionPattern, SSETriggerCondition } from './sse-connection-pattern-detector';
export { RealTimeSSEFailureMonitor, SSEConnectionMetrics, FailureAlert } from './real-time-sse-failure-monitor';
export { SSEAntiPatternsDatabase, SSEAntiPattern } from './sse-anti-patterns-database';
export { TDDSSEPreventionStrategies, TDDSSETestSuite, TDDSSETestCase, MockingStrategy, AssertionPattern } from './tdd-sse-prevention-strategies';

// Silent Process Failure Components
export { SilentProcessFailureDetector, SilentProcessMetrics, SilentProcessAlert, SilentProcessPattern, silentProcessDetector } from './silent-process-failure-detector';
export { SilentProcessAntiPatternsDatabase, SilentProcessAntiPattern, silentProcessAntiPatternsDB } from './silent-process-anti-patterns-database';
export { TDDSilentProcessPreventionStrategies, SilentProcessTDDTestCase, SilentProcessTDDSuite, tddSilentProcessPrevention } from './tdd-silent-process-prevention-strategies';
export { SilentProcessNeuralTrainingExport, SilentProcessNeuralRecord, SilentProcessNeuralDataset, silentProcessNeuralExport } from './silent-process-neural-training-export';

// Process I/O and Terminal Components
export { ProcessIOAntiPatternsDatabase, ProcessIOFailurePattern } from './process-io-anti-patterns-database';
export { StdoutCaptureFailureMonitor, StdoutCaptureEvent, StdoutCaptureMetrics, stdoutCaptureMonitor } from './stdout-capture-failure-monitor';
export { TerminalAntiPatternsDatabase, AntiPattern } from './terminal-anti-patterns-database';

// Neural Training and Export Systems
export { NeuralTrainingExportSystem, NeuralTrainingDataset, NeuralTrainingRecord, NeuralArchitectureSpec } from './neural-training-export-system';

// Integration Systems
export { NLDSSEIntegrationSystem, NLDSSEValidationResult } from './nld-sse-integration';
export { NLDSilentProcessIntegrationSystem, NLDSilentProcessConfig, NLDSilentProcessReport, nldSilentProcessIntegration } from './nld-silent-process-integration';

// Deployment and Validation
export { validateNLDSystem, demonstratePatternDetectionFlow } from './validate-nld-system';
export { SilentProcessNLDDeployment, deploySilentProcessNLD } from './deploy-silent-process-nld';

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
export { claudeProcessIODetector, ClaudeProcessIOMetrics, ClaudeProcessIOErrorPattern, ClaudeProcessIOTriggerCondition } from './claude-process-io-failure-detector';
export { claudeProcessIOMonitor, ClaudeProcessIOAlert } from './claude-process-io-real-time-monitor';
export { claudeProcessIONeuralDataset, ClaudeProcessIONeuralRecord, ClaudeProcessIONeuralDataset } from './claude-process-io-neural-training-dataset';
export { claudeProcessIOTDDPrevention, ClaudeProcessIOTDDTestCase, ClaudeProcessIOTDDSuite } from './claude-process-io-tdd-prevention-strategies';
export { claudeProcessIOIntegration, ClaudeProcessIOSystemReport } from './claude-process-io-integration-system';
export { claudeProcessIODeployment, ClaudeProcessIODeploymentResult } from './claude-process-io-deployment-demo';

// Default export for convenience
export default NLDSSEIntegrationSystem;