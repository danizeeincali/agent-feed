import { test, expect } from '@playwright/test';
import { ClaudeInstancePage } from '../page-objects/ClaudeInstancePage';
import { TerminalComponent } from '../page-objects/TerminalComponent';
import { StatusIndicator } from '../page-objects/StatusIndicator';

test.describe('Visual Regression Testing', () => {
  let claudePage: ClaudeInstancePage;
  let terminal: TerminalComponent;
  let status: StatusIndicator;

  test.beforeEach(async ({ page }) => {
    claudePage = new ClaudeInstancePage(page);
    terminal = new TerminalComponent(page);
    status = new StatusIndicator(page);
    
    await claudePage.goto();
    await page.waitForLoadState('networkidle');
  });

  test.describe('Initial Page State Screenshots', () => {
    test('should match landing page appearance', async ({ page }) => {
      // Take screenshot of initial page state
      await expect(page).toHaveScreenshot('landing-page-initial.png', {
        fullPage: true,
        threshold: 0.2,
        maxDiffPixels: 100
      });
    });

    test('should match button layout and styling', async ({ page }) => {
      // Focus on button area
      const buttonArea = page.locator('.button-container, .claude-buttons').first();
      
      if (await buttonArea.isVisible()) {
        await expect(buttonArea).toHaveScreenshot('claude-buttons-layout.png');
      } else {
        // Fallback to full page if specific container not found
        await expect(page).toHaveScreenshot('claude-buttons-fallback.png');
      }
    });

    test('should match responsive design across viewports', async ({ page }) => {
      const viewports = [
        { width: 1920, height: 1080, name: 'desktop-large' },
        { width: 1440, height: 900, name: 'desktop-medium' },
        { width: 1024, height: 768, name: 'tablet-landscape' },
        { width: 768, height: 1024, name: 'tablet-portrait' },
        { width: 375, height: 667, name: 'mobile' }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(1000); // Allow layout to settle
        
        await expect(page).toHaveScreenshot(`landing-${viewport.name}.png`, {
          fullPage: true,
          threshold: 0.3
        });
      }
    });
  });

  test.describe('Claude Instance Creation Visuals', () => {
    test('should match working button instance creation flow', async ({ page }) => {
      // Before clicking
      await expect(page).toHaveScreenshot('working-before-click.png');
      
      await claudePage.clickClaudeWorkingButton();
      
      // During loading/starting
      await page.waitForTimeout(2000);
      await expect(page).toHaveScreenshot('working-during-creation.png');
      
      // After instance is ready
      await claudePage.waitForClaudeInstance();
      await expect(page).toHaveScreenshot('working-after-creation.png', {
        fullPage: true
      });
    });

    test('should match prod button instance creation flow', async ({ page }) => {
      await expect(page).toHaveScreenshot('prod-before-click.png');
      
      await claudePage.clickClaudeProdButton();
      await page.waitForTimeout(2000);
      await expect(page).toHaveScreenshot('prod-during-creation.png');
      
      await claudePage.waitForClaudeInstance();
      await expect(page).toHaveScreenshot('prod-after-creation.png', {
        fullPage: true
      });
    });

    test('should match source button instance creation flow', async ({ page }) => {
      await expect(page).toHaveScreenshot('source-before-click.png');
      
      await claudePage.clickClaudeSourceButton();
      await page.waitForTimeout(2000);
      await expect(page).toHaveScreenshot('source-during-creation.png');
      
      await claudePage.waitForClaudeInstance();
      await expect(page).toHaveScreenshot('source-after-creation.png', {
        fullPage: true
      });
    });

    test('should match tests button instance creation flow', async ({ page }) => {
      await expect(page).toHaveScreenshot('tests-before-click.png');
      
      await claudePage.clickClaudeTestsButton();
      await page.waitForTimeout(2000);
      await expect(page).toHaveScreenshot('tests-during-creation.png');
      
      await claudePage.waitForClaudeInstance();
      await expect(page).toHaveScreenshot('tests-after-creation.png', {
        fullPage: true
      });
    });
  });

  test.describe('Terminal Interface Visuals', () => {
    test('should match terminal appearance after Claude welcome', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Focus on terminal area
      const terminalArea = terminal.terminal;
      await expect(terminalArea).toHaveScreenshot('terminal-welcome-message.png');
    });

    test('should match terminal during user interaction', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Send a command
      await terminal.sendCommand('Hello Claude, this is a test message');
      await terminal.waitForNewLine();
      
      await expect(terminal.terminal).toHaveScreenshot('terminal-after-user-input.png');
    });

    test('should match terminal during streaming response', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Send command that triggers streaming
      await terminal.sendCommand('Explain the concept of test-driven development');
      
      // Capture during streaming
      await page.waitForTimeout(3000);
      await expect(terminal.terminal).toHaveScreenshot('terminal-during-streaming.png');
      
      // Capture after complete response
      await terminal.waitForNewLine();
      await page.waitForTimeout(2000);
      await expect(terminal.terminal).toHaveScreenshot('terminal-complete-response.png');
    });

    test('should match terminal scrolling behavior', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Generate enough content to cause scrolling
      await terminal.sendCommand('Generate a comprehensive list of JavaScript best practices with detailed explanations and code examples for each practice');
      await terminal.waitForNewLine();
      
      // Should auto-scroll to bottom
      await expect(terminal.terminal).toHaveScreenshot('terminal-scrolled-content.png');
    });
  });

  test.describe('Status Indicator Visuals', () => {
    test('should match status indicator during different states', async ({ page }) => {
      // Idle state
      const statusArea = status.statusContainer;
      await expect(statusArea).toHaveScreenshot('status-idle.png');
      
      // Starting state
      await claudePage.clickClaudeWorkingButton();
      await page.waitForTimeout(1000);
      await expect(statusArea).toHaveScreenshot('status-starting.png');
      
      // Running state
      await claudePage.waitForClaudeInstance();
      await expect(statusArea).toHaveScreenshot('status-running.png');
    });

    test('should match error state visuals', async ({ page }) => {
      // Simulate error condition
      await page.route('**/api/claude**', route => route.fulfill({
        status: 500,
        body: 'Server Error'
      }));

      await claudePage.clickClaudeWorkingButton();
      await page.waitForTimeout(5000);

      const statusArea = status.statusContainer;
      await expect(statusArea).toHaveScreenshot('status-error.png');
    });
  });

  test.describe('Dark Mode and Theme Variations', () => {
    test('should match dark mode appearance', async ({ page }) => {
      // Enable dark mode if supported
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark-theme');
      });

      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('dark-mode-landing.png', {
        fullPage: true
      });

      // Test dark mode with Claude instance
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      await expect(page).toHaveScreenshot('dark-mode-claude-instance.png', {
        fullPage: true
      });
    });

    test('should match high contrast mode', async ({ page }) => {
      // Enable high contrast mode
      await page.evaluate(() => {
        document.documentElement.classList.add('high-contrast');
        document.body.style.filter = 'contrast(150%)';
      });

      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('high-contrast-mode.png', {
        fullPage: true,
        threshold: 0.3
      });
    });
  });

  test.describe('Browser Compatibility Visuals', () => {
    test('should match appearance across different browsers', async ({ page, browserName }) => {
      await expect(page).toHaveScreenshot(`${browserName}-landing-page.png`, {
        fullPage: true,
        threshold: 0.3
      });

      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      await expect(page).toHaveScreenshot(`${browserName}-claude-instance.png`, {
        fullPage: true,
        threshold: 0.3
      });
    });
  });

  test.describe('Animation and Interaction Visuals', () => {
    test('should capture button hover states', async ({ page }) => {
      // Hover over working button
      await claudePage.claudeWorkingButton.hover();
      await page.waitForTimeout(500);
      await expect(claudePage.claudeWorkingButton).toHaveScreenshot('button-hover-working.png');

      // Hover over prod button
      await claudePage.claudeProdButton.hover();
      await page.waitForTimeout(500);
      await expect(claudePage.claudeProdButton).toHaveScreenshot('button-hover-prod.png');
    });

    test('should capture loading animations', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      
      // Capture loading state with animations
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot('loading-animation.png');
      
      // Wait a bit more to capture mid-animation
      await page.waitForTimeout(2000);
      await expect(page).toHaveScreenshot('loading-animation-mid.png');
    });

    test('should capture terminal cursor and typing effects', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Click in terminal to focus
      await terminal.terminal.click();
      await page.waitForTimeout(500);
      
      // Capture with cursor
      await expect(terminal.terminal).toHaveScreenshot('terminal-with-cursor.png');
      
      // Type slowly to capture typing effect
      await page.keyboard.type('Hello', { delay: 100 });
      await expect(terminal.terminal).toHaveScreenshot('terminal-typing-effect.png');
    });
  });

  test.describe('Error State Visuals', () => {
    test('should match various error conditions visually', async ({ page }) => {
      const errorConditions = [
        { 
          name: 'server-error',
          route: '**/api/claude**',
          response: { status: 500, body: 'Internal Server Error' }
        },
        {
          name: 'network-timeout',
          route: '**/api/claude**',
          response: { status: 408, body: 'Request Timeout' }
        },
        {
          name: 'unauthorized',
          route: '**/api/claude**',
          response: { status: 401, body: 'Unauthorized' }
        }
      ];

      for (const errorCondition of errorConditions) {
        await claudePage.goto();
        await page.waitForLoadState('networkidle');
        
        await page.route(errorCondition.route, route => route.fulfill(errorCondition.response));
        
        await claudePage.clickClaudeWorkingButton();
        await page.waitForTimeout(5000);
        
        await expect(page).toHaveScreenshot(`error-${errorCondition.name}.png`, {
          fullPage: true,
          threshold: 0.3
        });
        
        await page.unroute(errorCondition.route);
      }
    });

    test('should match terminal error display', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Simulate terminal error
      await page.route('**/api/claude**', route => route.fulfill({
        status: 500,
        body: 'Command processing error'
      }));
      
      await terminal.sendCommand('This command will trigger an error');
      await page.waitForTimeout(3000);
      
      await expect(terminal.terminal).toHaveScreenshot('terminal-error-display.png');
    });
  });

  test.describe('Screenshot Comparison and Diff Analysis', () => {
    test('should detect visual regressions in UI components', async ({ page }) => {
      // This test will fail if there are significant visual changes
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Take screenshots with tight thresholds to catch regressions
      await expect(page).toHaveScreenshot('ui-regression-check.png', {
        fullPage: true,
        threshold: 0.1, // Very strict threshold
        maxDiffPixels: 50
      });
      
      // Test specific UI components
      await expect(claudePage.claudeWorkingButton).toHaveScreenshot('button-regression-check.png', {
        threshold: 0.05
      });
      
      await expect(terminal.terminal).toHaveScreenshot('terminal-regression-check.png', {
        threshold: 0.1
      });
    });
  });
});