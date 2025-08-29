import { test, expect, Page } from '@playwright/test';
import { ClaudeTerminalPage } from './page-objects/claude-terminal-page';
import { StressTestRunner } from './utils/stress-test-runner';
import { SystemResourceMonitor } from './utils/system-resource-monitor';
import { PerformanceMetricsCollector } from './utils/performance-metrics-collector';
import { EscapeSequenceMonitor } from './utils/escape-sequence-monitor';

test.describe('Stress Testing - Escape Sequence Storm Prevention', () => {
  let claudePage: ClaudeTerminalPage;
  let stressRunner: StressTestRunner;
  let resourceMonitor: SystemResourceMonitor;
  let metricsCollector: PerformanceMetricsCollector;
  let escapeMonitor: EscapeSequenceMonitor;
  
  test.beforeEach(async ({ page }) => {
    claudePage = new ClaudeTerminalPage(page);
    stressRunner = new StressTestRunner(page);
    resourceMonitor = new SystemResourceMonitor(page);
    metricsCollector = new PerformanceMetricsCollector(page);
    escapeMonitor = new EscapeSequenceMonitor(page);
    
    await claudePage.navigate();
    await claudePage.waitForPageLoad();
    
    // Start comprehensive monitoring
    await Promise.all([
      resourceMonitor.startMonitoring(),
      metricsCollector.startCollection(),
      escapeMonitor.startMonitoring()
    ]);
  });

  test.afterEach(async ({ page }) => {
    // Stop monitoring and collect reports
    const [resourceReport, metricsReport, escapeReport] = await Promise.all([
      resourceMonitor.stopAndGetReport(),
      metricsCollector.stopAndGetReport(),
      escapeMonitor.stopAndGetReport()
    ]);
    
    // Assert performance remained within acceptable bounds
    expect(resourceReport.maxMemoryUsageMB).toBeLessThan(1000); // < 1GB
    expect(resourceReport.maxCpuUsage).toBeLessThan(85); // < 85% CPU
    expect(metricsReport.maxResponseTime).toBeLessThan(5000); // < 5s response time
    expect(escapeReport.stormDetected).toBe(false); // No escape sequence storms
    
    // Cleanup
    await claudePage.cleanupAllProcesses();
  });

  test('should handle extreme button click stress test', async () => {
    const stressConfig = {
      testName: 'extreme-button-clicks',
      duration: 30000, // 30 seconds
      intensity: 'maximum',
      concurrency: 10,
      operations: {
        clicksPerSecond: 100,
        includeDoubleClicks: true,
        includeRightClicks: true,
        includeKeyboardShortcuts: true
      }
    };
    
    await stressRunner.executeStressTest(stressConfig);
    
    const stressResults = await stressRunner.getResults();
    
    // Verify button stress handling
    expect(stressResults.totalOperations).toBeGreaterThan(1000);
    expect(stressResults.successfulOperations).toBeLessThan(stressResults.totalOperations);
    expect(stressResults.errorsEncountered).toBe(0);
    
    // Verify only one process spawned despite extreme clicking
    const processCount = await claudePage.getActiveProcessCount();
    expect(processCount).toBeLessThanOrEqual(1);
    
    // Verify button remains functional after stress
    const buttonFunctional = await claudePage.testButtonFunctionality();
    expect(buttonFunctional).toBe(true);
  });

  test('should survive high-frequency terminal output stress', async () => {
    await claudePage.clickSpawnButton();
    await claudePage.waitForProcessSpawn();
    
    const outputStressConfig = {
      testName: 'high-frequency-output',
      duration: 60000, // 1 minute
      intensity: 'high',
      operations: {
        messagesPerSecond: 200,
        messageSize: 2048, // 2KB per message
        includeUnicode: true,
        includeControlChars: true,
        includeBinaryData: true
      }
    };
    
    await stressRunner.executeTerminalOutputStress(outputStressConfig);
    
    const outputResults = await stressRunner.getOutputStressResults();
    
    // Verify output handling
    expect(outputResults.messagesProcessed).toBeGreaterThan(5000);
    expect(outputResults.bufferOverflows).toBe(0);
    expect(outputResults.dataCorruption).toBe(false);
    
    // Verify terminal remains responsive
    const terminalResponsive = await claudePage.testTerminalResponsiveness();
    expect(terminalResponsive).toBe(true);
    
    // Test basic functionality after stress
    await claudePage.sendTerminalCommand('echo "Stress test complete"');
    await claudePage.waitForCommandCompletion();
    
    const terminalContent = await claudePage.getTerminalContent();
    expect(terminalContent).toContain('Stress test complete');
  });

  test('should handle rapid resize stress without corruption', async () => {
    await claudePage.clickSpawnButton();
    await claudePage.waitForProcessSpawn();
    
    const resizeStressConfig = {
      testName: 'rapid-resize-stress',
      duration: 20000, // 20 seconds
      operations: {
        resizesPerSecond: 20,
        minWidth: 320,
        maxWidth: 1920,
        minHeight: 240,
        maxHeight: 1080,
        includeAspectRatioChanges: true,
        includeExtremeSizes: true
      }
    };
    
    await stressRunner.executeResizeStress(resizeStressConfig);
    
    const resizeResults = await stressRunner.getResizeStressResults();
    
    // Verify resize handling
    expect(resizeResults.resizeOperations).toBeGreaterThan(200);
    expect(resizeResults.terminalCorruptions).toBe(0);
    expect(resizeResults.layoutBreaks).toBe(0);
    
    // Verify terminal content integrity
    const contentIntact = await claudePage.verifyTerminalContentIntegrity();
    expect(contentIntact).toBe(true);
    
    // Verify no escape sequence pollution from resizing
    const escapeReport = await escapeMonitor.getReport();
    expect(escapeReport.resizeEscapeSequences).toBeLessThan(50);
  });

  test('should handle keyboard input flood stress', async () => {
    await claudePage.clickSpawnButton();
    await claudePage.waitForProcessSpawn();
    
    const keyboardStressConfig = {
      testName: 'keyboard-input-flood',
      duration: 45000, // 45 seconds
      operations: {
        keysPerSecond: 150,
        includeSpecialKeys: true,
        includeModifierCombinations: true,
        includeUnicodeChars: true,
        includePasteOperations: true,
        simulateTypingBursts: true
      }
    };
    
    await stressRunner.executeKeyboardStress(keyboardStressConfig);
    
    const keyboardResults = await stressRunner.getKeyboardStressResults();
    
    // Verify keyboard handling
    expect(keyboardResults.keyEventsGenerated).toBeGreaterThan(3000);
    expect(keyboardResults.inputOverflows).toBe(0);
    expect(keyboardResults.keyboardLockups).toBe(0);
    
    // Verify input processing accuracy
    expect(keyboardResults.processedInputs / keyboardResults.keyEventsGenerated).toBeGreaterThan(0.8);
    
    // Test terminal still accepts input after stress
    await claudePage.sendTerminalInput('test after stress');
    await claudePage.pressEnter();
    await claudePage.waitForCommandCompletion();
    
    const terminalContent = await claudePage.getTerminalContent();
    expect(terminalContent).toContain('test after stress');
  });

  test('should survive memory exhaustion stress', async () => {
    await claudePage.clickSpawnButton();
    await claudePage.waitForProcessSpawn();
    
    const memoryStressConfig = {
      testName: 'memory-exhaustion-stress',
      duration: 30000, // 30 seconds
      operations: {
        targetMemoryMB: 800,
        allocationBurstsMB: 100,
        fragmentationLevel: 'high',
        includeLeakSimulation: true,
        includeGCPressure: true
      }
    };
    
    await stressRunner.executeMemoryStress(memoryStressConfig);
    
    const memoryResults = await stressRunner.getMemoryStressResults();
    
    // Verify memory handling
    expect(memoryResults.maxMemoryReached).toBeGreaterThan(500);
    expect(memoryResults.memoryLeaks).toBe(0);
    expect(memoryResults.gcCollections).toBeGreaterThan(0);
    
    // Verify system remained stable
    const systemStable = await claudePage.checkSystemStability();
    expect(systemStable).toBe(true);
    
    // Verify terminal functionality after memory pressure
    const terminalFunctional = await claudePage.testTerminalBasicFunctionality();
    expect(terminalFunctional).toBe(true);
  });

  test('should handle concurrent operation chaos stress', async () => {
    const chaosStressConfig = {
      testName: 'concurrent-operation-chaos',
      duration: 120000, // 2 minutes
      operations: {
        concurrentUsers: 5,
        operationsPerUser: {
          buttonClicks: 50,
          terminalCommands: 30,
          windowResizes: 20,
          keyboardInputs: 100,
          processManipulations: 10
        },
        randomizeTimings: true,
        includeErrorConditions: true,
        simulateNetworkIssues: true
      }
    };
    
    await stressRunner.executeConcurrentChaosStress(chaosStressConfig);
    
    const chaosResults = await stressRunner.getChaosStressResults();
    
    // Verify chaos handling
    expect(chaosResults.totalOperations).toBeGreaterThan(500);
    expect(chaosResults.criticalFailures).toBe(0);
    expect(chaosResults.dataCorruption).toBe(false);
    expect(chaosResults.deadlocks).toBe(0);
    
    // Verify system recovered from chaos
    const systemRecovered = await claudePage.checkSystemRecovery();
    expect(systemRecovered).toBe(true);
    
    // Verify no escape sequence storms during chaos
    const escapeReport = await escapeMonitor.getReport();
    expect(escapeReport.chaosStormDetected).toBe(false);
  });

  test('should handle resource limit boundary stress', async () => {
    const boundaryStressConfig = {
      testName: 'resource-limit-boundary',
      duration: 60000, // 1 minute
      operations: {
        pushCPUTo: 90, // 90% CPU usage
        pushMemoryTo: 900, // 900MB memory usage
        pushNetworkTo: 1000, // 1000 req/min
        pushDiskTo: 50, // 50MB/s disk I/O
        maintainPressure: true,
        includeSpikeTesting: true
      }
    };
    
    await stressRunner.executeResourceBoundaryStress(boundaryStressConfig);
    
    const boundaryResults = await stressRunner.getBoundaryStressResults();
    
    // Verify boundary handling
    expect(boundaryResults.maxCPUAchieved).toBeGreaterThan(80);
    expect(boundaryResults.maxMemoryAchieved).toBeGreaterThan(700);
    expect(boundaryResults.systemCrashes).toBe(0);
    expect(boundaryResults.dataLoss).toBe(false);
    
    // Verify graceful degradation
    expect(boundaryResults.gracefulDegradation).toBe(true);
    expect(boundaryResults.emergencyThrottling).toBeGreaterThan(0);
    
    // Verify terminal remained accessible
    const terminalAccessible = await claudePage.checkTerminalAccessibility();
    expect(terminalAccessible).toBe(true);
  });

  test('should validate long-duration stability stress', async () => {
    const stabilityStressConfig = {
      testName: 'long-duration-stability',
      duration: 300000, // 5 minutes
      operations: {
        continuousOperations: true,
        operationVariety: 'high',
        includeIdlePeriods: true,
        simulateUserPatterns: true,
        monitorDrifts: true,
        trackPerformanceRegression: true
      }
    };
    
    await stressRunner.executeStabilityStress(stabilityStressConfig);
    
    const stabilityResults = await stressRunner.getStabilityStressResults();
    
    // Verify long-term stability
    expect(stabilityResults.totalUptime).toBeGreaterThan(290000); // At least 4min 50sec uptime
    expect(stabilityResults.performanceRegression).toBeLessThan(0.1); // < 10% regression
    expect(stabilityResults.memoryLeaks).toBe(0);
    expect(stabilityResults.connectionLeaks).toBe(0);
    
    // Verify functionality after extended stress
    await claudePage.clickSpawnButton();
    await claudePage.waitForProcessSpawn();
    
    const processCount = await claudePage.getActiveProcessCount();
    expect(processCount).toBe(1);
    
    await claudePage.sendTerminalCommand('echo "Stability test complete"');
    await claudePage.waitForCommandCompletion();
    
    const terminalContent = await claudePage.getTerminalContent();
    expect(terminalContent).toContain('Stability test complete');
  });
});