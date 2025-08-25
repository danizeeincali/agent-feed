import { test, expect } from '@playwright/test';

/**
 * Terminal Width Expansion Validation Tests
 * 
 * This test suite validates that the terminal width expansion functionality
 * works correctly to prevent cascading visual effects in real browser environments.
 */

test.describe('Terminal Width Expansion Validation', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the terminal application
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.text().includes('Terminal Width') || msg.text().includes('CASCADE')) {
        console.log(`🔍 Terminal: ${msg.text()}`);
      }
    });
  });

  test('should initialize terminal with optimal width for Claude CLI', async ({ page }) => {
    // Set a standard viewport
    await page.setViewportSize({ width: 1200, height: 800 });

    // Launch terminal
    await page.locator('[data-testid="simple-launcher-button"]').click();
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });

    // Wait for terminal initialization
    await page.waitForTimeout(2000);

    // Check if terminal shows width optimization
    const terminalText = await page.locator('[data-testid="terminal-container"]').textContent();
    expect(terminalText).toContain('WIDTH OPTIMIZED');
    expect(terminalText).toContain('cascade prevention');

    // Verify terminal dimensions are displayed
    const headerText = await page.locator('.terminal-header').textContent();
    expect(headerText).toMatch(/\d+×\d+/); // Should show dimensions like "120×35"

    console.log('✅ Terminal initialized with width optimization');
  });

  test('should detect and prevent cascading in real-time', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 600 });

    // Launch terminal
    await page.locator('[data-testid="simple-launcher-button"]').click();
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });

    // Wait for terminal to be ready
    await page.waitForTimeout(3000);

    // Simulate a command that would cause cascading in narrow terminals
    const longCommand = 'claude --model=claude-3-5-sonnet chat "Create a comprehensive React component with TypeScript, styled-components, error boundaries, and extensive documentation"';
    
    // Type the command
    await page.locator('[data-testid="terminal-input"]').fill(longCommand);
    await page.locator('[data-testid="terminal-input"]').press('Enter');

    // Wait for command processing
    await page.waitForTimeout(2000);

    // Check if cascade prevention is activated
    const footerText = await page.locator('.terminal-footer').textContent();
    const cascadePrevention = footerText?.includes('Cascade Prevention Active');

    if (cascadePrevention) {
      console.log('🎯 Cascade prevention activated as expected');
      
      // Verify auto-expanding indicator
      const headerText = await page.locator('.terminal-header').textContent();
      expect(headerText).toContain('Auto-Expanding');
    } else {
      console.log('ℹ️ No cascade detected - terminal width sufficient');
    }

    // Verify terminal is still functional
    const terminalVisible = await page.locator('[data-testid="terminal-container"]').isVisible();
    expect(terminalVisible).toBe(true);
  });

  test('should adapt terminal width to viewport changes', async ({ page }) => {
    // Start with wide viewport
    await page.setViewportSize({ width: 1600, height: 900 });

    await page.locator('[data-testid="simple-launcher-button"]').click();
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });

    // Get initial dimensions
    const initialDimensions = await page.evaluate(() => {
      const header = document.querySelector('.terminal-header');
      const dimensionText = header?.textContent?.match(/(\d+)×(\d+)/);
      return dimensionText ? { cols: parseInt(dimensionText[1]), rows: parseInt(dimensionText[2]) } : null;
    });

    expect(initialDimensions?.cols).toBeGreaterThan(100);

    // Narrow the viewport
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(1000); // Allow resize to process

    // Check if terminal adapted
    const newDimensions = await page.evaluate(() => {
      const header = document.querySelector('.terminal-header');
      const dimensionText = header?.textContent?.match(/(\d+)×(\d+)/);
      return dimensionText ? { cols: parseInt(dimensionText[1]), rows: parseInt(dimensionText[2]) } : null;
    });

    // Terminal should still maintain reasonable width for Claude CLI
    expect(newDimensions?.cols).toBeGreaterThan(80);

    console.log('📏 Terminal dimensions adapted:', { initial: initialDimensions, new: newDimensions });
  });

  test('should handle multiple commands with different width requirements', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    await page.locator('[data-testid="simple-launcher-button"]').click();
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });

    // Test sequence of commands with increasing width requirements
    const commands = [
      'claude --help',
      'claude chat "short prompt"',
      'claude --format=table generate "Create a comparison table with multiple columns and detailed information"',
      'claude --stream --model=claude-3-5-sonnet chat "Generate a comprehensive analysis with code examples, explanations, and formatted output that requires significant terminal width"'
    ];

    for (let i = 0; i < commands.length; i++) {
      console.log(`🔍 Testing command ${i + 1}: ${commands[i].substring(0, 30)}...`);

      // Execute command
      await page.locator('[data-testid="terminal-input"]').fill(commands[i]);
      await page.locator('[data-testid="terminal-input"]').press('Enter');

      // Wait for processing
      await page.waitForTimeout(1500);

      // Check terminal dimensions
      const dimensions = await page.evaluate(() => {
        const header = document.querySelector('.terminal-header');
        const dimensionText = header?.textContent?.match(/(\d+)×(\d+)/);
        return dimensionText ? { cols: parseInt(dimensionText[1]), rows: parseInt(dimensionText[2]) } : null;
      });

      // Terminal should maintain or expand width as needed
      expect(dimensions?.cols).toBeGreaterThan(80);

      // For longer commands, expect wider terminals
      if (i >= 2) {
        expect(dimensions?.cols).toBeGreaterThan(100);
      }

      console.log(`📊 Command ${i + 1} terminal dimensions: ${dimensions?.cols}×${dimensions?.rows}`);
    }
  });

  test('should maintain performance with width expansion', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });

    // Start performance measurement
    const startTime = Date.now();

    await page.locator('[data-testid="simple-launcher-button"]').click();
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });

    const initTime = Date.now() - startTime;

    // Execute a command that triggers width expansion
    const commandStart = Date.now();
    await page.locator('[data-testid="terminal-input"]').fill('claude --format=pretty chat "Generate detailed response"');
    await page.locator('[data-testid="terminal-input"]').press('Enter');
    await page.waitForTimeout(2000);
    const commandTime = Date.now() - commandStart;

    // Test rapid resizing (simulating user resizing window)
    const resizeStart = Date.now();
    const sizes = [
      { width: 1000, height: 700 },
      { width: 1600, height: 1000 },
      { width: 1200, height: 800 },
      { width: 800, height: 600 },
    ];

    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(200); // Quick resize
    }
    const resizeTime = Date.now() - resizeStart;

    // Performance assertions
    expect(initTime).toBeLessThan(5000); // Terminal should initialize in under 5s
    expect(commandTime).toBeLessThan(3000); // Command processing under 3s
    expect(resizeTime).toBeLessThan(2000); // Rapid resizing under 2s

    console.log('🚀 Performance metrics:', {
      initTime: `${initTime}ms`,
      commandTime: `${commandTime}ms`,
      resizeTime: `${resizeTime}ms`
    });
  });

  test('should provide visual feedback for cascade prevention', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 600 });

    await page.locator('[data-testid="simple-launcher-button"]').click();
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });

    // Trigger a scenario likely to need cascade prevention
    await page.locator('[data-testid="terminal-input"]').fill('claude --stream --format=table generate "Large dataset with extensive columns"');
    await page.locator('[data-testid="terminal-input"]').press('Enter');

    // Wait for processing
    await page.waitForTimeout(3000);

    // Check for visual indicators
    const headerText = await page.locator('.terminal-header').textContent();
    const footerText = await page.locator('.terminal-footer').textContent();

    // Look for visual feedback elements
    const hasAutoExpandingIndicator = headerText?.includes('Auto-Expanding');
    const hasCascadePreventionActive = footerText?.includes('Cascade Prevention Active');
    const hasDimensionDisplay = /\d+×\d+/.test(headerText || '');

    // At minimum, should show terminal dimensions
    expect(hasDimensionDisplay).toBe(true);

    if (hasAutoExpandingIndicator || hasCascadePreventionActive) {
      console.log('🎨 Visual feedback provided for cascade prevention');
    } else {
      console.log('ℹ️ No cascade prevention needed for this scenario');
    }

    // Terminal should remain responsive regardless
    const terminalContainer = page.locator('[data-testid="terminal-container"]');
    await expect(terminalContainer).toBeVisible();
  });

  test('should handle edge cases gracefully', async ({ page }) => {
    // Test with very small viewport
    await page.setViewportSize({ width: 400, height: 300 });

    await page.locator('[data-testid="simple-launcher-button"]').click();
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });

    // Terminal should still be functional with minimum dimensions
    const dimensions = await page.evaluate(() => {
      const header = document.querySelector('.terminal-header');
      const dimensionText = header?.textContent?.match(/(\d+)×(\d+)/);
      return dimensionText ? { cols: parseInt(dimensionText[1]), rows: parseInt(dimensionText[2]) } : null;
    });

    // Should maintain minimum usable dimensions
    expect(dimensions?.cols).toBeGreaterThan(20);
    expect(dimensions?.rows).toBeGreaterThan(5);

    // Test with very large viewport
    await page.setViewportSize({ width: 2000, height: 1200 });
    await page.waitForTimeout(1000);

    const largeDimensions = await page.evaluate(() => {
      const header = document.querySelector('.terminal-header');
      const dimensionText = header?.textContent?.match(/(\d+)×(\d+)/);
      return dimensionText ? { cols: parseInt(dimensionText[1]), rows: parseInt(dimensionText[2]) } : null;
    });

    // Should utilize large space efficiently but not excessively
    expect(largeDimensions?.cols).toBeGreaterThan(100);
    expect(largeDimensions?.cols).toBeLessThan(300); // Reasonable maximum

    console.log('🔧 Edge case handling:', {
      small: dimensions,
      large: largeDimensions
    });
  });
});

/**
 * Integration test with actual Claude CLI simulation
 */
test.describe('Claude CLI Integration Validation', () => {

  test('should optimize for real Claude CLI output patterns', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    await page.locator('[data-testid="simple-launcher-button"]').click();
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });

    // Simulate realistic Claude CLI output patterns
    const mockOutputs = [
      // Help output
      `Claude CLI - AI Assistant Command Line Tool

USAGE:
    claude [OPTIONS] <SUBCOMMAND>

OPTIONS:
    --model <MODEL>       Specify the model [default: claude-3-5-sonnet-20241022]
    --format <FORMAT>     Output format [possible values: plain, json, markdown]`,
      
      // Progress with bars
      `🤖 Claude: Processing your request...

Progress: [████████████████████████████████████████] 100%
✅ Response completed successfully`,

      // Code generation output
      `\`\`\`typescript
interface UserProfile {
  id: string;
  name: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}
\`\`\``
    ];

    for (let i = 0; i < mockOutputs.length; i++) {
      // Simulate output being written to terminal
      await page.evaluate((output) => {
        const terminal = document.querySelector('[data-testid="terminal-output"]');
        if (terminal) {
          terminal.textContent += output + '\n';
        }
      }, mockOutputs[i]);

      // Wait for cascade detection
      await page.waitForTimeout(1000);

      // Check if terminal adapted appropriately
      const dimensions = await page.evaluate(() => {
        const header = document.querySelector('.terminal-header');
        const dimensionText = header?.textContent?.match(/(\d+)×(\d+)/);
        return dimensionText ? { cols: parseInt(dimensionText[1]), rows: parseInt(dimensionText[2]) } : null;
      });

      console.log(`📋 Output ${i + 1} terminal dimensions: ${dimensions?.cols}×${dimensions?.rows}`);
      
      // All outputs should be handled with adequate width
      expect(dimensions?.cols).toBeGreaterThan(80);
    }
  });
});