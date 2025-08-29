import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { ClaudeTerminalPage } from './page-objects/claude-terminal-page';
import { EscapeSequenceMonitor } from './utils/escape-sequence-monitor';
import { ConcurrentTestOrchestrator } from './utils/concurrent-test-orchestrator';
import { ResourceContentionTracker } from './utils/resource-contention-tracker';

test.describe('Multi-Instance Concurrent Testing', () => {
  let browser: Browser;
  let contexts: BrowserContext[] = [];
  let pages: Page[] = [];
  let claudePages: ClaudeTerminalPage[] = [];
  let escapeMonitors: EscapeSequenceMonitor[] = [];
  let orchestrator: ConcurrentTestOrchestrator;
  let contentionTracker: ResourceContentionTracker;

  const INSTANCE_COUNT = 5;

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;
    orchestrator = new ConcurrentTestOrchestrator();
    contentionTracker = new ResourceContentionTracker();
    
    // Create multiple browser contexts
    for (let i = 0; i < INSTANCE_COUNT; i++) {
      const context = await browser.newContext({
        viewport: { width: 1200, height: 800 }
      });
      const page = await context.newPage();
      
      contexts.push(context);
      pages.push(page);
      claudePages.push(new ClaudeTerminalPage(page));
      escapeMonitors.push(new EscapeSequenceMonitor(page));
    }
    
    await contentionTracker.startTracking();
  });

  test.afterAll(async () => {
    await contentionTracker.stopTracking();
    
    // Cleanup all contexts
    for (const context of contexts) {
      await context.close();
    }
  });

  test.beforeEach(async () => {
    // Initialize all instances
    await orchestrator.initializeInstances(claudePages);
    
    // Start monitoring on all instances
    for (const monitor of escapeMonitors) {
      await monitor.startMonitoring();
    }
  });

  test.afterEach(async () => {
    // Stop monitoring and collect reports
    const reports = [];
    for (const monitor of escapeMonitors) {
      await monitor.stopMonitoring();
      reports.push(await monitor.getReport());
    }
    
    // Verify no storms across any instance
    for (let i = 0; i < reports.length; i++) {
      expect(reports[i].stormDetected, `Instance ${i} had escape sequence storm`).toBe(false);
    }
    
    // Cleanup all instances
    await orchestrator.cleanupInstances(claudePages);
  });

  test('should handle simultaneous button clicks across instances', async () => {
    // Coordinate simultaneous button clicks
    const clickPromises = claudePages.map((page, index) => 
      orchestrator.scheduleAction(`instance-${index}`, async () => {
        await page.clickSpawnButton();
        await page.waitForProcessSpawn();
      })
    );
    
    // Execute all clicks simultaneously
    await orchestrator.executeSimultaneous(clickPromises);
    
    // Verify each instance spawned exactly one process
    for (let i = 0; i < claudePages.length; i++) {
      const processCount = await claudePages[i].getActiveProcessCount();
      expect(processCount, `Instance ${i} process count`).toBe(1);
    }
    
    // Verify no resource contention
    const contentionReport = await contentionTracker.getContentionReport();
    expect(contentionReport.portConflicts).toBe(0);
    expect(contentionReport.fileSystemConflicts).toBe(0);
    expect(contentionReport.processIdConflicts).toBe(0);
  });

  test('should handle concurrent terminal operations without interference', async () => {
    // Start processes on all instances
    await orchestrator.executeParallel(claudePages.map((page, index) =>
      ({ id: `spawn-${index}`, action: async () => {
        await page.clickSpawnButton();
        await page.waitForProcessSpawn();
      }})
    ));
    
    // Execute different commands on each terminal simultaneously
    const commands = [
      'echo "Instance 0 - Hello World"',
      'pwd && ls -la',
      'for i in {1..10}; do echo "Instance 2 - Line $i"; done',
      'cat /proc/version',
      'whoami && date && uptime'
    ];
    
    const commandPromises = claudePages.map((page, index) => 
      orchestrator.scheduleAction(`command-${index}`, async () => {
        await page.sendTerminalCommand(commands[index]);
        await page.waitForCommandCompletion();
      })
    );
    
    await orchestrator.executeSimultaneous(commandPromises);
    
    // Verify each terminal has correct output
    for (let i = 0; i < claudePages.length; i++) {
      const content = await claudePages[i].getTerminalContent();
      const expectedContent = commands[i].includes('echo') 
        ? commands[i].match(/"([^"]+)"/)?.[1] || commands[i]
        : commands[i];
      
      if (commands[i].includes('echo')) {
        expect(content, `Instance ${i} content`).toContain(expectedContent);
      }
      // Verify no cross-contamination from other instances
      for (let j = 0; j < commands.length; j++) {
        if (i !== j && commands[j].includes('echo')) {
          const otherContent = commands[j].match(/"([^"]+)"/)?.[1];
          if (otherContent) {
            expect(content, `Instance ${i} should not contain content from instance ${j}`).not.toContain(otherContent);
          }
        }
      }
    }
  });

  test('should handle rapid concurrent button storms across instances', async () => {
    const stormDuration = 5000; // 5 seconds
    const clickInterval = 50; // Every 50ms
    
    // Create storm on all instances simultaneously
    const stormPromises = claudePages.map((page, index) =>
      orchestrator.scheduleStorm(`storm-${index}`, async () => {
        const endTime = Date.now() + stormDuration;
        let clickCount = 0;
        
        while (Date.now() < endTime) {
          await page.clickSpawnButton({ force: true });
          clickCount++;
          await new Promise(resolve => setTimeout(resolve, clickInterval));
        }
        
        return { instanceIndex: index, clicksAttempted: clickCount };
      })
    );
    
    const stormResults = await orchestrator.executeSimultaneous(stormPromises);
    
    // Verify storm prevention worked across all instances
    for (let i = 0; i < claudePages.length; i++) {
      const processCount = await claudePages[i].getActiveProcessCount();
      expect(processCount, `Instance ${i} should have at most 1 process`).toBeLessThanOrEqual(1);
      
      const result = stormResults[i] as { instanceIndex: number; clicksAttempted: number };
      expect(result.clicksAttempted, `Instance ${i} attempted clicks`).toBeGreaterThan(20);
    }
    
    // Verify no system-wide resource exhaustion
    const contentionReport = await contentionTracker.getContentionReport();
    expect(contentionReport.systemOverload).toBe(false);
    expect(contentionReport.memoryExhaustion).toBe(false);
  });

  test('should handle process termination without affecting other instances', async () => {
    // Start processes on all instances
    await orchestrator.executeParallel(claudePages.map((page, index) =>
      ({ id: `spawn-${index}`, action: async () => {
        await page.clickSpawnButton();
        await page.waitForProcessSpawn();
      }})
    ));
    
    // Terminate processes on alternating instances
    const terminationPromises = [];
    for (let i = 0; i < claudePages.length; i += 2) {
      terminationPromises.push(
        orchestrator.scheduleAction(`terminate-${i}`, async () => {
          await claudePages[i].terminateProcess();
          await claudePages[i].waitForProcessTermination();
        })
      );
    }
    
    await orchestrator.executeSimultaneous(terminationPromises);
    
    // Verify terminated instances are clean
    for (let i = 0; i < claudePages.length; i += 2) {
      const processCount = await claudePages[i].getActiveProcessCount();
      expect(processCount, `Terminated instance ${i} process count`).toBe(0);
    }
    
    // Verify non-terminated instances are still running
    for (let i = 1; i < claudePages.length; i += 2) {
      const processCount = await claudePages[i].getActiveProcessCount();
      expect(processCount, `Running instance ${i} process count`).toBe(1);
      
      // Verify terminal is still functional
      await claudePages[i].sendTerminalCommand('echo "Still working"');
      await claudePages[i].waitForCommandCompletion();
      
      const content = await claudePages[i].getTerminalContent();
      expect(content, `Instance ${i} terminal functionality`).toContain('Still working');
    }
  });

  test('should handle network instability across concurrent instances', async () => {
    // Start processes on all instances
    await orchestrator.executeParallel(claudePages.map((page, index) =>
      ({ id: `spawn-${index}`, action: async () => {
        await page.clickSpawnButton();
        await page.waitForProcessSpawn();
      }})
    ));
    
    // Simulate network interruptions on random instances
    const networkInterruptionPromises = [];
    const affectedInstances = [0, 2, 4]; // Affect every other instance
    
    for (const instanceIndex of affectedInstances) {
      networkInterruptionPromises.push(
        orchestrator.scheduleAction(`network-interrupt-${instanceIndex}`, async () => {
          const page = pages[instanceIndex];
          
          // Simulate network interruption
          await page.setOfflineMode(true);
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second interruption
          await page.setOfflineMode(false);
          
          // Wait for recovery
          await new Promise(resolve => setTimeout(resolve, 3000));
        })
      );
    }
    
    await orchestrator.executeSimultaneous(networkInterruptionPromises);
    
    // Verify recovery on affected instances
    for (const instanceIndex of affectedInstances) {
      const terminalConnected = await claudePages[instanceIndex].checkTerminalConnection();
      expect(terminalConnected, `Instance ${instanceIndex} terminal connection recovery`).toBe(true);
    }
    
    // Verify unaffected instances remained stable
    const unaffectedInstances = [1, 3];
    for (const instanceIndex of unaffectedInstances) {
      const processCount = await claudePages[instanceIndex].getActiveProcessCount();
      expect(processCount, `Unaffected instance ${instanceIndex} process count`).toBe(1);
      
      await claudePages[instanceIndex].sendTerminalCommand('echo "Unaffected"');
      await claudePages[instanceIndex].waitForCommandCompletion();
      
      const content = await claudePages[instanceIndex].getTerminalContent();
      expect(content, `Unaffected instance ${instanceIndex} functionality`).toContain('Unaffected');
    }
  });

  test('should handle memory pressure across concurrent instances', async () => {
    // Start processes on all instances
    await orchestrator.executeParallel(claudePages.map((page, index) =>
      ({ id: `spawn-${index}`, action: async () => {
        await page.clickSpawnButton();
        await page.waitForProcessSpawn();
      }})
    ));
    
    // Generate memory pressure by running memory-intensive commands
    const memoryIntensiveCommands = claudePages.map((page, index) =>
      orchestrator.scheduleAction(`memory-pressure-${index}`, async () => {
        // Simulate memory-intensive operation
        await page.sendTerminalCommand('dd if=/dev/zero of=/tmp/memtest bs=1M count=100 2>/dev/null; rm -f /tmp/memtest');
        await page.waitForCommandCompletion();
      })
    );
    
    await orchestrator.executeSimultaneous(memoryIntensiveCommands);
    
    // Verify all instances survived memory pressure
    for (let i = 0; i < claudePages.length; i++) {
      const processCount = await claudePages[i].getActiveProcessCount();
      expect(processCount, `Instance ${i} survived memory pressure`).toBe(1);
      
      // Test basic functionality
      await claudePages[i].sendTerminalCommand('echo "Memory test complete"');
      await claudePages[i].waitForCommandCompletion();
      
      const content = await claudePages[i].getTerminalContent();
      expect(content, `Instance ${i} functionality after memory pressure`).toContain('Memory test complete');
    }
    
    // Verify no system-wide memory issues
    const contentionReport = await contentionTracker.getContentionReport();
    expect(contentionReport.memoryFragmentation).toBeLessThan(0.5); // Less than 50% fragmentation
    expect(contentionReport.swapUsage).toBeLessThan(0.1); // Less than 10% swap usage
  });

  test('should validate cross-instance isolation', async () => {
    // Start processes and set unique environment variables
    const setupPromises = claudePages.map((page, index) =>
      orchestrator.scheduleAction(`setup-${index}`, async () => {
        await page.clickSpawnButton();
        await page.waitForProcessSpawn();
        await page.sendTerminalCommand(`export INSTANCE_ID=${index}`);
        await page.waitForCommandCompletion();
        await page.sendTerminalCommand(`export UNIQUE_VAR="instance_${index}_secret"`);
        await page.waitForCommandCompletion();
      })
    );
    
    await orchestrator.executeSimultaneous(setupPromises);
    
    // Verify isolation by checking environment variables
    const verificationPromises = claudePages.map((page, index) =>
      orchestrator.scheduleAction(`verify-${index}`, async () => {
        await page.sendTerminalCommand('echo "ID: $INSTANCE_ID, VAR: $UNIQUE_VAR"');
        await page.waitForCommandCompletion();
        
        const content = await page.getTerminalContent();
        return { instanceIndex: index, content };
      })
    );
    
    const results = await orchestrator.executeSimultaneous(verificationPromises);
    
    // Verify each instance has its own isolated environment
    for (let i = 0; i < results.length; i++) {
      const result = results[i] as { instanceIndex: number; content: string };
      
      expect(result.content, `Instance ${i} has correct ID`).toContain(`ID: ${i}`);
      expect(result.content, `Instance ${i} has correct unique var`).toContain(`VAR: instance_${i}_secret`);
      
      // Verify no leakage from other instances
      for (let j = 0; j < results.length; j++) {
        if (i !== j) {
          expect(result.content, `Instance ${i} should not see instance ${j} data`).not.toContain(`instance_${j}_secret`);
        }
      }
    }
  });
});