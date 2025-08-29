import { test, expect, Browser, BrowserContext, devices, PlaywrightTestConfig } from '@playwright/test';
import { ClaudeTerminalPage } from './page-objects/claude-terminal-page';
import { EscapeSequenceMonitor } from './utils/escape-sequence-monitor';
import { BrowserCompatibilityTracker } from './utils/browser-compatibility-tracker';
import { DeviceEmulationTester } from './utils/device-emulation-tester';

// Define browser configurations to test
const browserConfigs = [
  { name: 'chromium', browser: 'chromium', engine: 'Blink' },
  { name: 'firefox', browser: 'firefox', engine: 'Gecko' },
  { name: 'webkit', browser: 'webkit', engine: 'WebKit' },
  { name: 'edge', browser: 'chromium', channel: 'msedge', engine: 'Blink' }
];

// Define device configurations
const deviceConfigs = [
  { name: 'Desktop', device: null, viewport: { width: 1920, height: 1080 } },
  { name: 'Tablet', device: 'iPad Pro', viewport: null },
  { name: 'Mobile', device: 'iPhone 13', viewport: null },
  { name: 'Large Desktop', device: null, viewport: { width: 2560, height: 1440 } },
  { name: 'Small Laptop', device: null, viewport: { width: 1366, height: 768 } }
];

test.describe('Cross-Browser Validation - Escape Sequence Storm Prevention', () => {
  let compatibilityTracker: BrowserCompatibilityTracker;
  let deviceTester: DeviceEmulationTester;

  test.beforeAll(async () => {
    compatibilityTracker = new BrowserCompatibilityTracker();
    deviceTester = new DeviceEmulationTester();
  });

  test.afterAll(async () => {
    // Generate cross-browser compatibility report
    const compatibilityReport = await compatibilityTracker.generateReport();
    console.log('Cross-Browser Compatibility Report:', JSON.stringify(compatibilityReport, null, 2));
  });

  // Test across all browsers
  for (const browserConfig of browserConfigs) {
    test.describe(`Browser: ${browserConfig.name} (${browserConfig.engine})`, () => {
      let browser: Browser;
      let context: BrowserContext;
      let claudePage: ClaudeTerminalPage;
      let escapeMonitor: EscapeSequenceMonitor;

      test.beforeAll(async ({ playwright }) => {
        // Launch browser with specific configuration
        browser = await playwright[browserConfig.browser].launch({
          channel: browserConfig.channel || undefined,
          headless: true
        });
      });

      test.afterAll(async () => {
        if (browser) await browser.close();
      });

      test.beforeEach(async () => {
        context = await browser.newContext({
          viewport: { width: 1200, height: 800 }
        });
        const page = await context.newPage();
        
        claudePage = new ClaudeTerminalPage(page);
        escapeMonitor = new EscapeSequenceMonitor(page);
        
        await compatibilityTracker.startBrowserTest(browserConfig.name, browserConfig.engine);
        
        await claudePage.navigate();
        await claudePage.waitForPageLoad();
        await escapeMonitor.startMonitoring();
      });

      test.afterEach(async () => {
        await escapeMonitor.stopMonitoring();
        const escapeReport = await escapeMonitor.getReport();
        
        await compatibilityTracker.recordBrowserResult(
          browserConfig.name,
          {
            stormPrevention: !escapeReport.stormDetected,
            performanceScore: escapeReport.performanceScore || 0,
            compatibilityIssues: escapeReport.compatibilityIssues || []
          }
        );
        
        await context.close();
      });

      test(`should prevent escape sequence storms on ${browserConfig.name}`, async () => {
        // Test basic storm prevention
        await claudePage.clickSpawnButton();
        await claudePage.waitForProcessSpawn();

        // Execute rapid button clicks
        for (let i = 0; i < 20; i++) {
          await claudePage.clickSpawnButton({ force: true });
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Verify prevention worked
        const processCount = await claudePage.getActiveProcessCount();
        expect(processCount, `${browserConfig.name}: Process count should be ≤ 1`).toBeLessThanOrEqual(1);

        const escapeReport = await escapeMonitor.getReport();
        expect(escapeReport.stormDetected, `${browserConfig.name}: No escape sequence storm`).toBe(false);
      });

      test(`should handle terminal interactions on ${browserConfig.name}`, async () => {
        await claudePage.clickSpawnButton();
        await claudePage.waitForProcessSpawn();

        // Test terminal functionality
        await claudePage.sendTerminalCommand('echo "Browser compatibility test"');
        await claudePage.waitForCommandCompletion();

        const terminalContent = await claudePage.getTerminalContent();
        expect(terminalContent, `${browserConfig.name}: Terminal output`).toContain('Browser compatibility test');

        // Verify clean output (no escape sequences)
        expect(terminalContent, `${browserConfig.name}: No escape sequences`).not.toMatch(/\x1b\[\d*[A-Z]/g);
      });

      test(`should handle window events on ${browserConfig.name}`, async () => {
        await claudePage.clickSpawnButton();
        await claudePage.waitForProcessSpawn();

        // Test window resize
        await claudePage.page.setViewportSize({ width: 800, height: 600 });
        await new Promise(resolve => setTimeout(resolve, 1000));

        await claudePage.page.setViewportSize({ width: 1400, height: 900 });
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify terminal survived resize
        const terminalVisible = await claudePage.isTerminalVisible();
        expect(terminalVisible, `${browserConfig.name}: Terminal visible after resize`).toBe(true);

        // Test focus/blur events
        await claudePage.page.evaluate(() => window.blur());
        await new Promise(resolve => setTimeout(resolve, 500));
        await claudePage.page.evaluate(() => window.focus());

        const processStillRunning = await claudePage.getActiveProcessCount();
        expect(processStillRunning, `${browserConfig.name}: Process survived focus changes`).toBe(1);
      });

      test(`should handle browser-specific keyboard events on ${browserConfig.name}`, async () => {
        await claudePage.clickSpawnButton();
        await claudePage.waitForProcessSpawn();

        // Test browser-specific key combinations
        const keyTests = [
          { key: 'Tab', description: 'Tab completion' },
          { key: 'ArrowUp', description: 'Command history' },
          { key: 'Control+C', description: 'Interrupt signal' },
          { key: 'Control+L', description: 'Clear screen' }
        ];

        for (const keyTest of keyTests) {
          await claudePage.page.keyboard.press(keyTest.key);
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Verify terminal remains functional
        await claudePage.sendTerminalCommand('echo "Keyboard test complete"');
        await claudePage.waitForCommandCompletion();

        const terminalContent = await claudePage.getTerminalContent();
        expect(terminalContent, `${browserConfig.name}: Keyboard functionality`).toContain('Keyboard test complete');
      });
    });
  }

  // Test across devices
  for (const deviceConfig of deviceConfigs) {
    test.describe(`Device: ${deviceConfig.name}`, () => {
      let claudePage: ClaudeTerminalPage;
      let escapeMonitor: EscapeSequenceMonitor;

      test.beforeEach(async ({ browser }) => {
        const contextOptions = deviceConfig.device 
          ? { ...devices[deviceConfig.device] }
          : { viewport: deviceConfig.viewport };

        const context = await browser.newContext(contextOptions);
        const page = await context.newPage();

        claudePage = new ClaudeTerminalPage(page);
        escapeMonitor = new EscapeSequenceMonitor(page);

        await deviceTester.startDeviceTest(deviceConfig.name);

        await claudePage.navigate();
        await claudePage.waitForPageLoad();
        await escapeMonitor.startMonitoring();
      });

      test.afterEach(async ({ page }) => {
        await escapeMonitor.stopMonitoring();
        const escapeReport = await escapeMonitor.getReport();

        await deviceTester.recordDeviceResult(
          deviceConfig.name,
          {
            stormPrevention: !escapeReport.stormDetected,
            touchCompatibility: escapeReport.touchEvents || 0,
            orientationStability: escapeReport.orientationChanges || 0
          }
        );

        await page.context().close();
      });

      test(`should work on ${deviceConfig.name} viewport`, async () => {
        // Test basic functionality on device
        await claudePage.clickSpawnButton();
        await claudePage.waitForProcessSpawn();

        const processCount = await claudePage.getActiveProcessCount();
        expect(processCount, `${deviceConfig.name}: Process spawned`).toBe(1);

        // Test terminal interaction
        await claudePage.sendTerminalCommand('echo "Device test"');
        await claudePage.waitForCommandCompletion();

        const terminalContent = await claudePage.getTerminalContent();
        expect(terminalContent, `${deviceConfig.name}: Terminal output`).toContain('Device test');
      });

      if (deviceConfig.device) {
        test(`should handle touch events on ${deviceConfig.name}`, async () => {
          await claudePage.clickSpawnButton();
          await claudePage.waitForProcessSpawn();

          // Simulate touch interactions
          const terminalElement = await claudePage.getTerminalElement();
          
          // Touch tap
          await terminalElement.tap();
          await new Promise(resolve => setTimeout(resolve, 500));

          // Touch and hold
          await terminalElement.tap({ timeout: 1000 });
          await new Promise(resolve => setTimeout(resolve, 500));

          // Verify terminal still responsive
          const terminalResponsive = await claudePage.testTerminalResponsiveness();
          expect(terminalResponsive, `${deviceConfig.name}: Touch responsiveness`).toBe(true);
        });

        test(`should handle orientation changes on ${deviceConfig.name}`, async () => {
          await claudePage.clickSpawnButton();
          await claudePage.waitForProcessSpawn();

          const page = claudePage.page;
          
          // Simulate orientation change (if applicable)
          if (deviceConfig.device.includes('iPhone') || deviceConfig.device.includes('iPad')) {
            // Portrait to landscape
            await page.setViewportSize({ width: 768, height: 1024 });
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Landscape to portrait  
            await page.setViewportSize({ width: 1024, height: 768 });
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Verify process survived orientation changes
            const processCount = await claudePage.getActiveProcessCount();
            expect(processCount, `${deviceConfig.name}: Process survived orientation change`).toBe(1);
          }
        });
      }
    });
  }

  test('should generate comprehensive browser compatibility report', async ({ page }) => {
    const report = await compatibilityTracker.generateReport();
    
    // Verify all browsers were tested
    expect(Object.keys(report.browserResults)).toHaveLength(browserConfigs.length);
    
    // Verify all devices were tested
    expect(Object.keys(report.deviceResults)).toHaveLength(deviceConfigs.length);
    
    // Check overall compatibility score
    expect(report.overallCompatibilityScore).toBeGreaterThan(0.8); // At least 80% compatibility
    
    // Verify storm prevention worked across all platforms
    for (const browserResult of Object.values(report.browserResults)) {
      expect((browserResult as any).stormPrevention).toBe(true);
    }
    
    for (const deviceResult of Object.values(report.deviceResults)) {
      expect((deviceResult as any).stormPrevention).toBe(true);
    }
  });

  test('should identify browser-specific issues', async ({ page }) => {
    const issuesReport = await compatibilityTracker.getIssuesReport();
    
    // Check for known browser-specific issues
    if (issuesReport.knownIssues.length > 0) {
      console.warn('Known browser-specific issues found:', issuesReport.knownIssues);
      
      // Verify workarounds are in place
      for (const issue of issuesReport.knownIssues) {
        expect(issue.workaround, `Issue "${issue.description}" should have workaround`).toBeDefined();
        expect(issue.impact, `Issue "${issue.description}" impact should be low`).toBe('low');
      }
    }
    
    // Verify no critical compatibility issues
    const criticalIssues = issuesReport.knownIssues.filter(issue => issue.impact === 'critical');
    expect(criticalIssues, 'No critical compatibility issues').toHaveLength(0);
  });

  test('should validate performance across browsers', async ({ page }) => {
    const performanceReport = await compatibilityTracker.getPerformanceReport();
    
    // Check performance metrics across browsers
    for (const [browserName, metrics] of Object.entries(performanceReport.browserMetrics)) {
      const browserMetrics = metrics as any;
      
      expect(browserMetrics.averageResponseTime, `${browserName}: Response time`).toBeLessThan(2000);
      expect(browserMetrics.memoryUsage, `${browserName}: Memory usage`).toBeLessThan(500 * 1024 * 1024);
      expect(browserMetrics.cpuUsage, `${browserName}: CPU usage`).toBeLessThan(80);
    }
    
    // Verify performance consistency
    const responseTimesArray = Object.values(performanceReport.browserMetrics)
      .map((metrics: any) => metrics.averageResponseTime);
    
    const maxResponseTime = Math.max(...responseTimesArray);
    const minResponseTime = Math.min(...responseTimesArray);
    const performanceVariance = (maxResponseTime - minResponseTime) / minResponseTime;
    
    expect(performanceVariance, 'Performance variance between browsers').toBeLessThan(0.5); // <50% variance
  });
});