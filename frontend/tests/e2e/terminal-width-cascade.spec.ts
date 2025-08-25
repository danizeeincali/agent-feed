import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Terminal Width and Cascade Correlation Test Suite
 * 
 * This test suite proves the correlation between terminal width and cascading
 * visual effects in Claude CLI output. The hypothesis is that narrow terminals
 * (80 cols) cause cascading while wider terminals (120+ cols) prevent it.
 */

interface TerminalDimensions {
  cols: number;
  rows: number;
  actualWidth: number;
  actualHeight: number;
  contentOverflow: boolean;
}

interface CascadeMetrics {
  cascadeDetected: boolean;
  overflowLines: number;
  wrappedContent: string[];
  visualArtifacts: number;
}

const TERMINAL_TEST_SCENARIOS = [
  { name: 'Narrow Terminal (80 cols)', cols: 80, rows: 24, expectedCascade: true },
  { name: 'Standard Terminal (100 cols)', cols: 100, rows: 30, expectedCascade: false },
  { name: 'Wide Terminal (120 cols)', cols: 120, rows: 35, expectedCascade: false },
  { name: 'Extra Wide Terminal (150 cols)', cols: 150, rows: 40, expectedCascade: false },
  { name: 'Mobile Terminal (60 cols)', cols: 60, rows: 20, expectedCascade: true },
];

const CLAUDE_CLI_COMMANDS = [
  'claude --help',
  'claude chat "test message with very long content that might cause wrapping and cascading effects"',
  'claude --model=claude-3-5-sonnet "long prompt with multiple parameters and extensive text"',
  'claude --format=json "generate response with complex formatting"',
];

test.describe('Terminal Width and Cascade Correlation Analysis', () => {
  test.use({ headless: true }); // Force headless mode
  
  test.beforeEach(async ({ page }) => {
    // Enable console logging for debugging
    page.on('console', msg => console.log(`Browser Console: ${msg.text()}`));
    page.on('pageerror', error => console.error(`Browser Error: ${error.message}`));

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  TERMINAL_TEST_SCENARIOS.forEach((scenario) => {
    test(`Terminal Width Test: ${scenario.name}`, async () => {
      // 1. Set viewport to match terminal scenario
      await page.setViewportSize({
        width: Math.max(scenario.cols * 9, 800), // Approximate character width
        height: Math.max(scenario.rows * 20, 600), // Approximate line height
      });

      // 2. Launch terminal with specific dimensions
      await page.locator('[data-testid="simple-launcher-button"]').click();
      await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });

      // 3. Measure actual terminal dimensions
      const terminalDimensions = await measureTerminalDimensions(page);
      
      // 4. Validate terminal dimensions match expected
      expect(terminalDimensions.cols).toBeGreaterThanOrEqual(scenario.cols - 5); // Allow 5 col tolerance
      expect(terminalDimensions.rows).toBeGreaterThanOrEqual(scenario.rows - 3); // Allow 3 row tolerance

      // 5. Execute Claude CLI commands and measure cascade
      for (const command of CLAUDE_CLI_COMMANDS) {
        const cascadeMetrics = await executeCommandAndMeasureCascade(page, command, scenario.cols);
        
        // 6. Assert cascade correlation with terminal width
        if (scenario.expectedCascade) {
          expect(cascadeMetrics.cascadeDetected).toBe(true);
          expect(cascadeMetrics.overflowLines).toBeGreaterThan(0);
          console.log(`✅ EXPECTED: Cascade detected in ${scenario.name} for command: ${command}`);
        } else {
          expect(cascadeMetrics.cascadeDetected).toBe(false);
          expect(cascadeMetrics.overflowLines).toBe(0);
          console.log(`✅ EXPECTED: No cascade in ${scenario.name} for command: ${command}`);
        }

        // 7. Log detailed metrics for analysis
        console.log(`📊 Cascade Metrics for ${scenario.name}:`, {
          command,
          cascadeDetected: cascadeMetrics.cascadeDetected,
          overflowLines: cascadeMetrics.overflowLines,
          visualArtifacts: cascadeMetrics.visualArtifacts,
          terminalCols: terminalDimensions.cols,
          actualWidth: terminalDimensions.actualWidth
        });
      }
    });
  });

  test('Terminal Width Expansion Prevents Cascading', async () => {
    // 1. Start with narrow terminal (known to cascade)
    await page.setViewportSize({ width: 800, height: 600 });
    await page.locator('[data-testid="simple-launcher-button"]').click();
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });

    // 2. Execute command in narrow terminal
    const narrowCascade = await executeCommandAndMeasureCascade(page, CLAUDE_CLI_COMMANDS[1], 80);
    expect(narrowCascade.cascadeDetected).toBe(true);
    console.log('📏 BASELINE: Cascade detected in narrow terminal');

    // 3. Expand terminal width dynamically
    await expandTerminalWidth(page, 120);

    // 4. Execute same command in expanded terminal
    const wideCascade = await executeCommandAndMeasureCascade(page, CLAUDE_CLI_COMMANDS[1], 120);
    expect(wideCascade.cascadeDetected).toBe(false);
    console.log('📏 VALIDATION: No cascade in expanded terminal');

    // 5. Prove width expansion correlation
    expect(wideCascade.overflowLines).toBeLessThan(narrowCascade.overflowLines);
    expect(wideCascade.visualArtifacts).toBeLessThan(narrowCascade.visualArtifacts);
  });

  test('Responsive Terminal Sizing with FitAddon', async () => {
    await page.locator('[data-testid="simple-launcher-button"]').click();
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });

    const viewportSizes = [
      { width: 600, height: 400 },  // Small
      { width: 1000, height: 600 }, // Medium  
      { width: 1400, height: 800 }, // Large
      { width: 1920, height: 1080 } // Extra Large
    ];

    for (const viewport of viewportSizes) {
      // Resize viewport
      await page.setViewportSize(viewport);
      
      // Wait for FitAddon to resize terminal
      await page.waitForTimeout(500);
      
      // Measure new dimensions
      const dimensions = await measureTerminalDimensions(page);
      
      // Validate responsive behavior
      expect(dimensions.actualWidth).toBeGreaterThan(viewport.width * 0.7); // At least 70% of viewport
      expect(dimensions.actualHeight).toBeGreaterThan(viewport.height * 0.3); // At least 30% of viewport
      
      // Test cascade at each size
      const cascade = await executeCommandAndMeasureCascade(page, 'claude --help', dimensions.cols);
      
      console.log(`📱 Responsive Test ${viewport.width}x${viewport.height}:`, {
        terminalCols: dimensions.cols,
        terminalRows: dimensions.rows,
        cascadeDetected: cascade.cascadeDetected,
        viewportUsage: `${Math.round(dimensions.actualWidth / viewport.width * 100)}%`
      });
      
      // Wide viewports should not cascade
      if (viewport.width >= 1200) {
        expect(cascade.cascadeDetected).toBe(false);
      }
    }
  });

  test('Terminal Content Overflow Analysis', async () => {
    await page.locator('[data-testid="simple-launcher-button"]').click();
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });

    // Test content of increasing width
    const contentTests = [
      { content: 'short', expectedOverflow: false },
      { content: 'medium length content that might wrap', expectedOverflow: false },
      { content: 'very long content that definitely exceeds normal terminal width and should cause wrapping and potential cascading effects in narrow terminals', expectedOverflow: true },
      { content: 'extremely long content with many words and characters that will definitely cause overflow and wrapping in standard terminal widths creating visual cascading effects that we want to detect and prevent through proper terminal width configuration and responsive design principles', expectedOverflow: true }
    ];

    for (const test of contentTests) {
      // Send content to terminal
      await page.locator('[data-testid="terminal-input"]').fill(`echo "${test.content}"`);
      await page.locator('[data-testid="terminal-input"]').press('Enter');
      
      // Wait for output
      await page.waitForTimeout(1000);
      
      // Analyze overflow
      const overflow = await analyzeContentOverflow(page, test.content);
      
      expect(overflow.detected).toBe(test.expectedOverflow);
      
      console.log(`📝 Content Overflow Test:`, {
        contentLength: test.content.length,
        expectedOverflow: test.expectedOverflow,
        actualOverflow: overflow.detected,
        wrappedLines: overflow.wrappedLines
      });
    }
  });

  test('Claude CLI Progress Bar Width Requirements', async () => {
    await page.locator('[data-testid="simple-launcher-button"]').click();
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });

    // Simulate Claude CLI with progress bars
    const progressCommands = [
      'claude chat "test" --stream',
      'claude --model=claude-3-5-sonnet "analyze code"',
      'claude generate --format=markdown "long response"'
    ];

    for (const command of progressCommands) {
      // Execute command
      await page.locator('[data-testid="terminal-input"]').fill(command);
      await page.locator('[data-testid="terminal-input"]').press('Enter');
      
      // Wait for progress indicators
      await page.waitForTimeout(2000);
      
      // Measure progress bar rendering
      const progressMetrics = await measureProgressBarRendering(page);
      
      console.log(`🎯 Progress Bar Metrics:`, {
        command,
        progressBarsDetected: progressMetrics.count,
        averageWidth: progressMetrics.averageWidth,
        maxWidth: progressMetrics.maxWidth,
        cascadingDetected: progressMetrics.cascading
      });
      
      // Progress bars should not cause cascading in wide terminals
      const terminalDims = await measureTerminalDimensions(page);
      if (terminalDims.cols >= 100) {
        expect(progressMetrics.cascading).toBe(false);
      }
    }
  });

  test('Performance Impact of Terminal Width Expansion', async () => {
    const performanceMetrics = [];
    
    for (const scenario of TERMINAL_TEST_SCENARIOS) {
      const startTime = Date.now();
      
      // Set viewport
      await page.setViewportSize({
        width: scenario.cols * 9,
        height: scenario.rows * 20,
      });

      await page.locator('[data-testid="simple-launcher-button"]').click();
      await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });

      // Execute performance test
      const perfStart = Date.now();
      await executeCommandAndMeasureCascade(page, CLAUDE_CLI_COMMANDS[2], scenario.cols);
      const perfEnd = Date.now();
      
      const totalTime = Date.now() - startTime;
      const executionTime = perfEnd - perfStart;
      
      performanceMetrics.push({
        scenario: scenario.name,
        cols: scenario.cols,
        totalTime,
        executionTime,
        timePerCol: executionTime / scenario.cols
      });
      
      // Cleanup for next iteration
      await page.reload();
      await page.waitForLoadState('networkidle');
    }
    
    // Analyze performance correlation with width
    console.log('🚀 Performance Analysis:', performanceMetrics);
    
    // Wider terminals should not significantly impact performance
    const narrowPerf = performanceMetrics.find(m => m.cols <= 80);
    const widePerf = performanceMetrics.find(m => m.cols >= 120);
    
    if (narrowPerf && widePerf) {
      const perfRatio = widePerf.executionTime / narrowPerf.executionTime;
      expect(perfRatio).toBeLessThan(2.0); // Width expansion should not double execution time
      console.log(`📊 Performance Ratio (Wide/Narrow): ${perfRatio.toFixed(2)}`);
    }
  });
});

/**
 * Helper function to measure terminal dimensions
 */
async function measureTerminalDimensions(page: Page): Promise<TerminalDimensions> {
  return await page.evaluate(() => {
    const terminal = document.querySelector('[data-testid="terminal-container"]') as HTMLElement;
    if (!terminal) return { cols: 0, rows: 0, actualWidth: 0, actualHeight: 0, contentOverflow: false };
    
    // Get computed dimensions
    const rect = terminal.getBoundingClientRect();
    const styles = window.getComputedStyle(terminal);
    
    // Estimate cols/rows based on character size
    const charWidth = 9; // Approximate monospace character width
    const lineHeight = 20; // Approximate line height
    
    const estimatedCols = Math.floor(rect.width / charWidth);
    const estimatedRows = Math.floor(rect.height / lineHeight);
    
    // Check for content overflow
    const hasOverflow = terminal.scrollWidth > terminal.clientWidth || 
                       terminal.scrollHeight > terminal.clientHeight;
    
    return {
      cols: estimatedCols,
      rows: estimatedRows,
      actualWidth: rect.width,
      actualHeight: rect.height,
      contentOverflow: hasOverflow
    };
  });
}

/**
 * Execute command and measure cascade effects
 */
async function executeCommandAndMeasureCascade(page: Page, command: string, expectedCols: number): Promise<CascadeMetrics> {
  // Send command to terminal
  await page.locator('[data-testid="terminal-input"]').fill(command);
  await page.locator('[data-testid="terminal-input"]').press('Enter');
  
  // Wait for command execution
  await page.waitForTimeout(3000);
  
  // Analyze terminal output for cascade effects
  return await page.evaluate((cols) => {
    const terminalOutput = document.querySelector('[data-testid="terminal-output"]');
    if (!terminalOutput) {
      return { cascadeDetected: false, overflowLines: 0, wrappedContent: [], visualArtifacts: 0 };
    }
    
    const outputText = terminalOutput.textContent || '';
    const lines = outputText.split('\n');
    
    let overflowLines = 0;
    let visualArtifacts = 0;
    const wrappedContent: string[] = [];
    
    lines.forEach(line => {
      // Detect lines that exceed expected column width
      if (line.length > cols) {
        overflowLines++;
        wrappedContent.push(line);
      }
      
      // Detect visual artifacts (ANSI escape sequences, broken formatting)
      if (line.includes('\x1b[') || line.includes('��') || line.match(/\[\d+m/)) {
        visualArtifacts++;
      }
    });
    
    const cascadeDetected = overflowLines > 0 || visualArtifacts > 2;
    
    return {
      cascadeDetected,
      overflowLines,
      wrappedContent,
      visualArtifacts
    };
  }, expectedCols);
}

/**
 * Expand terminal width dynamically
 */
async function expandTerminalWidth(page: Page, targetCols: number): Promise<void> {
  await page.evaluate((cols) => {
    const terminal = document.querySelector('[data-testid="terminal-container"]') as HTMLElement;
    if (terminal) {
      const charWidth = 9;
      const newWidth = cols * charWidth;
      terminal.style.width = `${newWidth}px`;
      
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
    }
  }, targetCols);
  
  // Wait for FitAddon to process resize
  await page.waitForTimeout(1000);
}

/**
 * Analyze content overflow in terminal
 */
async function analyzeContentOverflow(page: Page, content: string): Promise<{ detected: boolean; wrappedLines: number }> {
  return await page.evaluate((testContent) => {
    const terminal = document.querySelector('[data-testid="terminal-container"]') as HTMLElement;
    if (!terminal) return { detected: false, wrappedLines: 0 };
    
    const terminalWidth = terminal.getBoundingClientRect().width;
    const charWidth = 9; // Approximate character width
    const maxCharsPerLine = Math.floor(terminalWidth / charWidth);
    
    const contentLines = testContent.split('\n');
    let wrappedLines = 0;
    
    contentLines.forEach(line => {
      if (line.length > maxCharsPerLine) {
        wrappedLines += Math.ceil(line.length / maxCharsPerLine) - 1;
      }
    });
    
    return {
      detected: wrappedLines > 0,
      wrappedLines
    };
  }, content);
}

/**
 * Measure progress bar rendering metrics
 */
async function measureProgressBarRendering(page: Page): Promise<{ count: number; averageWidth: number; maxWidth: number; cascading: boolean }> {
  return await page.evaluate(() => {
    // Look for progress bar indicators in terminal output
    const progressElements = document.querySelectorAll('[data-testid*="progress"], .progress-bar, [aria-label*="progress"]');
    const progressTexts = document.querySelectorAll('*').length; // Simplified - look for progress text patterns
    
    const terminalOutput = document.querySelector('[data-testid="terminal-output"]')?.textContent || '';
    
    // Count progress indicators in text
    const progressMatches = terminalOutput.match(/[▓░▒█▌▍▎▏▊▉]\s*\d+%?|Loading\.\.\.|Processing\.\.\./g) || [];
    
    let totalWidth = 0;
    let maxWidth = 0;
    
    progressMatches.forEach(match => {
      const width = match.length;
      totalWidth += width;
      maxWidth = Math.max(maxWidth, width);
    });
    
    const averageWidth = progressMatches.length > 0 ? totalWidth / progressMatches.length : 0;
    
    // Detect if progress bars are causing visual cascading
    const cascading = progressMatches.some(match => match.length > 80) || // Exceeds standard terminal width
                     terminalOutput.includes('█'.repeat(10)) && terminalOutput.includes('\n█'); // Broken progress bars
    
    return {
      count: progressMatches.length,
      averageWidth,
      maxWidth,
      cascading
    };
  });
}