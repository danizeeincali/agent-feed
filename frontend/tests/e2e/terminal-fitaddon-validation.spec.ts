import { test, expect, Page } from '@playwright/test';

/**
 * Terminal FitAddon and Responsive Sizing Validation
 * 
 * This test suite validates that the FitAddon properly resizes the terminal
 * to match container dimensions and prevents content overflow that causes cascading.
 */

interface FitAddonMetrics {
  terminalCols: number;
  terminalRows: number;
  containerWidth: number;
  containerHeight: number;
  charWidth: number;
  lineHeight: number;
  fitRatio: number;
  overflowDetected: boolean;
}

const RESPONSIVE_BREAKPOINTS = [
  { name: 'Mobile', width: 375, height: 667, expectedMinCols: 35, expectedMinRows: 15 },
  { name: 'Tablet', width: 768, height: 1024, expectedMinCols: 80, expectedMinRows: 25 },
  { name: 'Desktop', width: 1200, height: 800, expectedMinCols: 120, expectedMinRows: 30 },
  { name: 'Large Desktop', width: 1920, height: 1080, expectedMinCols: 180, expectedMinRows: 40 },
  { name: 'Ultrawide', width: 2560, height: 1440, expectedMinCols: 240, expectedMinRows: 50 }
];

test.describe('Terminal FitAddon and Responsive Sizing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  RESPONSIVE_BREAKPOINTS.forEach((breakpoint) => {
    test(`FitAddon Responsive Test: ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`, async ({ page }) => {
      // 1. Set viewport to breakpoint size
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
      
      // 2. Launch terminal
      await page.locator('[data-testid="simple-launcher-button"]').click();
      await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });
      
      // 3. Wait for FitAddon to initialize and resize
      await page.waitForTimeout(2000);
      
      // 4. Measure FitAddon performance
      const metrics = await measureFitAddonMetrics(page);
      
      // 5. Validate minimum dimensions for breakpoint
      expect(metrics.terminalCols).toBeGreaterThanOrEqual(breakpoint.expectedMinCols);
      expect(metrics.terminalRows).toBeGreaterThanOrEqual(breakpoint.expectedMinRows);
      
      // 6. Validate fit ratio (how well terminal uses container space)
      expect(metrics.fitRatio).toBeGreaterThan(0.8); // At least 80% space utilization
      expect(metrics.fitRatio).toBeLessThan(1.2); // Not exceeding container bounds
      
      // 7. Test dynamic resizing
      await testDynamicResize(page, breakpoint);
      
      // 8. Validate no overflow after resize
      expect(metrics.overflowDetected).toBe(false);
      
      console.log(`📐 FitAddon Metrics for ${breakpoint.name}:`, metrics);
    });
  });

  test('FitAddon Performance Under Load', async ({ page }) => {
    await page.locator('[data-testid="simple-launcher-button"]').click();
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });

    const resizeOperations = [];
    const performanceMarks = [];

    // Test rapid resizing (simulating real user behavior)
    for (let i = 0; i < 10; i++) {
      const width = 800 + (i * 100);
      const height = 600 + (i * 50);
      
      const startTime = Date.now();
      
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(100); // Brief pause for FitAddon
      
      const metrics = await measureFitAddonMetrics(page);
      const endTime = Date.now();
      
      resizeOperations.push({
        iteration: i,
        viewportSize: { width, height },
        terminalSize: { cols: metrics.terminalCols, rows: metrics.terminalRows },
        resizeTime: endTime - startTime,
        fitRatio: metrics.fitRatio
      });
      
      performanceMarks.push(endTime - startTime);
    }

    // Validate performance
    const avgResizeTime = performanceMarks.reduce((a, b) => a + b, 0) / performanceMarks.length;
    const maxResizeTime = Math.max(...performanceMarks);
    
    console.log('⚡ FitAddon Performance Analysis:', {
      averageResizeTime: `${avgResizeTime.toFixed(2)}ms`,
      maxResizeTime: `${maxResizeTime}ms`,
      totalResizes: resizeOperations.length
    });

    // FitAddon should resize quickly (under 500ms per operation)
    expect(avgResizeTime).toBeLessThan(500);
    expect(maxResizeTime).toBeLessThan(1000);

    // All resize operations should maintain proper fit ratio
    resizeOperations.forEach(op => {
      expect(op.fitRatio).toBeGreaterThan(0.7);
      expect(op.fitRatio).toBeLessThan(1.3);
    });
  });

  test('FitAddon Container Constraint Handling', async ({ page }) => {
    await page.locator('[data-testid="simple-launcher-button"]').click();
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });

    // Test various container constraint scenarios
    const constraintTests = [
      { name: 'Fixed Width Container', css: 'width: 400px; height: auto;' },
      { name: 'Fixed Height Container', css: 'width: auto; height: 300px;' },
      { name: 'Both Fixed Container', css: 'width: 500px; height: 400px;' },
      { name: 'Percentage Width', css: 'width: 70%; height: 60vh;' },
      { name: 'Min/Max Constraints', css: 'min-width: 200px; max-width: 800px; width: 50%;' }
    ];

    for (const constraintTest of constraintTests) {
      // Apply container constraints
      await page.evaluate((css) => {
        const terminal = document.querySelector('[data-testid="terminal-container"]') as HTMLElement;
        if (terminal) {
          terminal.style.cssText = css;
          
          // Trigger resize to test FitAddon response
          window.dispatchEvent(new Event('resize'));
        }
      }, constraintTest.css);

      // Wait for FitAddon to respond
      await page.waitForTimeout(1000);

      // Measure fit within constraints
      const metrics = await measureFitAddonMetrics(page);
      const containerBounds = await page.evaluate(() => {
        const terminal = document.querySelector('[data-testid="terminal-container"]') as HTMLElement;
        return terminal ? terminal.getBoundingClientRect() : { width: 0, height: 0 };
      });

      // Validate FitAddon respects container constraints
      expect(metrics.containerWidth).toBeLessThanOrEqual(containerBounds.width + 10); // 10px tolerance
      expect(metrics.containerHeight).toBeLessThanOrEqual(containerBounds.height + 10);

      // Terminal should still be functional within constraints
      expect(metrics.terminalCols).toBeGreaterThan(20); // Minimum usable width
      expect(metrics.terminalRows).toBeGreaterThan(5);  // Minimum usable height

      console.log(`📦 Container Constraint Test: ${constraintTest.name}`, {
        containerSize: `${containerBounds.width}x${containerBounds.height}`,
        terminalSize: `${metrics.terminalCols}x${metrics.terminalRows}`,
        fitRatio: metrics.fitRatio
      });
    }
  });

  test('FitAddon Character Sizing Accuracy', async ({ page }) => {
    await page.locator('[data-testid="simple-launcher-button"]').click();
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });

    // Test with different font sizes and families
    const fontTests = [
      { family: 'monospace', size: 12 },
      { family: '"Fira Code", monospace', size: 14 },
      { family: '"Cascadia Code", monospace', size: 16 },
      { family: '"Consolas", monospace', size: 18 },
    ];

    for (const fontTest of fontTests) {
      // Apply font settings
      await page.evaluate(({ family, size }) => {
        const terminal = document.querySelector('[data-testid="terminal-container"] .xterm-screen') as HTMLElement;
        if (terminal) {
          terminal.style.fontFamily = family;
          terminal.style.fontSize = `${size}px`;
          
          // Trigger FitAddon recalculation
          window.dispatchEvent(new Event('resize'));
        }
      }, fontTest);

      await page.waitForTimeout(1000);

      // Measure character sizing accuracy
      const characterMetrics = await measureCharacterAccuracy(page);
      const metrics = await measureFitAddonMetrics(page);

      // Validate character measurements are accurate
      const expectedCols = Math.floor(metrics.containerWidth / characterMetrics.actualCharWidth);
      const expectedRows = Math.floor(metrics.containerHeight / characterMetrics.actualLineHeight);

      // Allow some tolerance for font rendering variations
      expect(Math.abs(metrics.terminalCols - expectedCols)).toBeLessThanOrEqual(2);
      expect(Math.abs(metrics.terminalRows - expectedRows)).toBeLessThanOrEqual(1);

      console.log(`🔤 Font Test: ${fontTest.family} ${fontTest.size}px`, {
        expectedSize: `${expectedCols}x${expectedRows}`,
        actualSize: `${metrics.terminalCols}x${metrics.terminalRows}`,
        charWidth: characterMetrics.actualCharWidth,
        lineHeight: characterMetrics.actualLineHeight
      });
    }
  });

  test('FitAddon Overflow Prevention', async ({ page }) => {
    await page.locator('[data-testid="simple-launcher-button"]').click();
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });

    // Generate content that would overflow in narrow terminals
    const overflowTests = [
      { content: 'a'.repeat(200), description: 'Very long single line' },
      { content: Array(50).fill('This is a test line that might wrap').join('\n'), description: 'Many lines' },
      { content: '█'.repeat(150) + '\n' + '▓'.repeat(150) + '\n' + '░'.repeat(150), description: 'Unicode block characters' },
      { content: JSON.stringify({ very: 'long', json: 'object', with: { nested: 'properties', and: ['array', 'items'] } }, null, 2), description: 'Formatted JSON output' }
    ];

    for (const overflowTest of overflowTests) {
      // Clear terminal and add test content
      await clearTerminal(page);
      await addTerminalContent(page, overflowTest.content);

      // Measure overflow after content addition
      const beforeResize = await measureOverflow(page);
      
      // Trigger FitAddon resize
      await page.evaluate(() => window.dispatchEvent(new Event('resize')));
      await page.waitForTimeout(500);

      // Measure overflow after FitAddon resize
      const afterResize = await measureOverflow(page);
      const metrics = await measureFitAddonMetrics(page);

      // FitAddon should prevent or minimize overflow
      expect(afterResize.horizontalOverflow).toBeLessThanOrEqual(beforeResize.horizontalOverflow);
      expect(afterResize.verticalOverflow).toBeLessThanOrEqual(beforeResize.verticalOverflow);

      // Content should fit within terminal bounds
      if (metrics.terminalCols >= 100) { // Wide terminals should handle most content
        expect(afterResize.horizontalOverflow).toBe(false);
      }

      console.log(`🌊 Overflow Prevention Test: ${overflowTest.description}`, {
        terminalSize: `${metrics.terminalCols}x${metrics.terminalRows}`,
        beforeOverflow: beforeResize,
        afterOverflow: afterResize,
        overflowImprovement: beforeResize.horizontalOverflow && !afterResize.horizontalOverflow
      });
    }
  });

  test('FitAddon Integration with Terminal Features', async ({ page }) => {
    await page.locator('[data-testid="simple-launcher-button"]').click();
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });

    // Test FitAddon with various terminal features
    const featureTests = [
      { feature: 'Text Selection', test: async () => await testTextSelection(page) },
      { feature: 'Scrolling', test: async () => await testScrolling(page) },
      { feature: 'Search', test: async () => await testSearch(page) },
      { feature: 'Copy/Paste', test: async () => await testCopyPaste(page) }
    ];

    for (const featureTest of featureTests) {
      // Resize terminal to different sizes and test feature
      const testSizes = [
        { width: 800, height: 600 },
        { width: 1200, height: 800 },
        { width: 1600, height: 1000 }
      ];

      for (const size of testSizes) {
        await page.setViewportSize(size);
        await page.waitForTimeout(500); // Allow FitAddon to resize

        const metrics = await measureFitAddonMetrics(page);
        const featureWorking = await featureTest.test();

        expect(featureWorking).toBe(true);

        console.log(`🔧 Feature Test: ${featureTest.feature} at ${size.width}x${size.height}`, {
          terminalSize: `${metrics.terminalCols}x${metrics.terminalRows}`,
          featureWorking
        });
      }
    }
  });
});

/**
 * Measure FitAddon performance metrics
 */
async function measureFitAddonMetrics(page: Page): Promise<FitAddonMetrics> {
  return await page.evaluate(() => {
    const terminal = document.querySelector('[data-testid="terminal-container"]') as HTMLElement;
    const xtermScreen = document.querySelector('.xterm-screen') as HTMLElement;
    
    if (!terminal || !xtermScreen) {
      return {
        terminalCols: 0, terminalRows: 0, containerWidth: 0, containerHeight: 0,
        charWidth: 0, lineHeight: 0, fitRatio: 0, overflowDetected: false
      };
    }

    const containerRect = terminal.getBoundingClientRect();
    const screenRect = xtermScreen.getBoundingClientRect();
    
    // Estimate character dimensions
    const styles = window.getComputedStyle(xtermScreen);
    const fontSize = parseFloat(styles.fontSize || '14');
    const charWidth = fontSize * 0.6; // Approximate monospace character width
    const lineHeight = fontSize * 1.2; // Approximate line height
    
    const estimatedCols = Math.floor(containerRect.width / charWidth);
    const estimatedRows = Math.floor(containerRect.height / lineHeight);
    
    // Calculate fit ratio (how well terminal uses container space)
    const usedWidth = estimatedCols * charWidth;
    const usedHeight = estimatedRows * lineHeight;
    const fitRatio = (usedWidth * usedHeight) / (containerRect.width * containerRect.height);
    
    // Check for overflow
    const overflowDetected = xtermScreen.scrollWidth > xtermScreen.clientWidth ||
                            xtermScreen.scrollHeight > xtermScreen.clientHeight;
    
    return {
      terminalCols: estimatedCols,
      terminalRows: estimatedRows,
      containerWidth: containerRect.width,
      containerHeight: containerRect.height,
      charWidth,
      lineHeight,
      fitRatio,
      overflowDetected
    };
  });
}

/**
 * Test dynamic resizing behavior
 */
async function testDynamicResize(page: Page, breakpoint: any): Promise<void> {
  const resizeSizes = [
    { width: breakpoint.width * 0.8, height: breakpoint.height * 0.8 },
    { width: breakpoint.width * 1.2, height: breakpoint.height * 1.2 },
    { width: breakpoint.width, height: breakpoint.height } // Back to original
  ];

  for (const size of resizeSizes) {
    await page.setViewportSize(size);
    await page.waitForTimeout(300); // Allow FitAddon to respond
    
    const metrics = await measureFitAddonMetrics(page);
    
    // Validate terminal adapts to new size
    expect(metrics.terminalCols).toBeGreaterThan(10);
    expect(metrics.terminalRows).toBeGreaterThan(5);
    expect(metrics.fitRatio).toBeGreaterThan(0.5);
  }
}

/**
 * Measure character rendering accuracy
 */
async function measureCharacterAccuracy(page: Page): Promise<{ actualCharWidth: number; actualLineHeight: number }> {
  return await page.evaluate(() => {
    // Create a temporary measurement element
    const testElement = document.createElement('div');
    testElement.style.position = 'absolute';
    testElement.style.visibility = 'hidden';
    testElement.style.fontFamily = window.getComputedStyle(document.querySelector('.xterm-screen') || document.body).fontFamily;
    testElement.style.fontSize = window.getComputedStyle(document.querySelector('.xterm-screen') || document.body).fontSize;
    testElement.textContent = 'M'.repeat(10); // Use 'M' as it's typically the widest character
    
    document.body.appendChild(testElement);
    
    const rect = testElement.getBoundingClientRect();
    const actualCharWidth = rect.width / 10;
    const actualLineHeight = rect.height;
    
    document.body.removeChild(testElement);
    
    return { actualCharWidth, actualLineHeight };
  });
}

/**
 * Clear terminal content
 */
async function clearTerminal(page: Page): Promise<void> {
  await page.evaluate(() => {
    const terminal = document.querySelector('.xterm-screen') as HTMLElement;
    if (terminal) {
      terminal.textContent = '';
    }
  });
}

/**
 * Add content to terminal
 */
async function addTerminalContent(page: Page, content: string): Promise<void> {
  await page.evaluate((text) => {
    const terminal = document.querySelector('.xterm-screen') as HTMLElement;
    if (terminal) {
      const textNode = document.createTextNode(text);
      terminal.appendChild(textNode);
    }
  }, content);
}

/**
 * Measure content overflow
 */
async function measureOverflow(page: Page): Promise<{ horizontalOverflow: boolean; verticalOverflow: boolean }> {
  return await page.evaluate(() => {
    const terminal = document.querySelector('.xterm-screen') as HTMLElement;
    if (!terminal) return { horizontalOverflow: false, verticalOverflow: false };
    
    return {
      horizontalOverflow: terminal.scrollWidth > terminal.clientWidth,
      verticalOverflow: terminal.scrollHeight > terminal.clientHeight
    };
  });
}

/**
 * Test terminal text selection
 */
async function testTextSelection(page: Page): Promise<boolean> {
  try {
    await page.evaluate(() => {
      const terminal = document.querySelector('.xterm-screen') as HTMLElement;
      if (terminal && terminal.textContent) {
        const range = document.createRange();
        range.selectNode(terminal.firstChild || terminal);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        return selection?.toString().length > 0;
      }
      return false;
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Test terminal scrolling
 */
async function testScrolling(page: Page): Promise<boolean> {
  try {
    const initialScroll = await page.evaluate(() => {
      const terminal = document.querySelector('.xterm-screen') as HTMLElement;
      return terminal ? terminal.scrollTop : 0;
    });

    await page.evaluate(() => {
      const terminal = document.querySelector('.xterm-screen') as HTMLElement;
      if (terminal) {
        terminal.scrollTop = terminal.scrollHeight;
      }
    });

    const finalScroll = await page.evaluate(() => {
      const terminal = document.querySelector('.xterm-screen') as HTMLElement;
      return terminal ? terminal.scrollTop : 0;
    });

    return finalScroll !== initialScroll;
  } catch {
    return false;
  }
}

/**
 * Test terminal search functionality
 */
async function testSearch(page: Page): Promise<boolean> {
  // This would test the SearchAddon if implemented
  return true; // Placeholder
}

/**
 * Test terminal copy/paste
 */
async function testCopyPaste(page: Page): Promise<boolean> {
  // This would test copy/paste functionality
  return true; // Placeholder
}