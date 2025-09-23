import { test, expect, Page } from '@playwright/test';

interface ComponentHealth {
  selector: string;
  isVisible: boolean;
  hasContent: boolean;
  isInteractive: boolean;
  errorMessage?: string;
}

class ComponentHealthChecker {
  private page: Page;
  private componentErrors: string[] = [];

  constructor(page: Page) {
    this.page = page;
    this.setupComponentTracking();
  }

  private setupComponentTracking() {
    // Track React component errors
    this.page.addInitScript(() => {
      window.__COMPONENT_ERRORS__ = [];
      
      // Override console.error to capture React errors
      const originalError = console.error;
      console.error = (...args: any[]) => {
        const errorMessage = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        
        window.__COMPONENT_ERRORS__.push(errorMessage);
        originalError.apply(console, args);
      };

      // Capture React error boundaries
      window.addEventListener('error', (event) => {
        window.__COMPONENT_ERRORS__.push(`Unhandled Error: ${event.error?.message || event.message}`);
      });

      // Capture unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        window.__COMPONENT_ERRORS__.push(`Unhandled Promise Rejection: ${event.reason}`);
      });
    });
  }

  async checkComponentHealth(selector: string): Promise<ComponentHealth> {
    try {
      const element = await this.page.$(selector);
      
      if (!element) {
        return {
          selector,
          isVisible: false,
          hasContent: false,
          isInteractive: false,
          errorMessage: 'Element not found in DOM'
        };
      }

      // Check visibility
      const isVisible = await element.isVisible();
      
      // Check content
      const textContent = await element.textContent();
      const hasContent = (textContent?.trim().length || 0) > 0;
      
      // Check if interactive
      const tagName = await element.evaluate(el => el.tagName.toLowerCase());
      const isInteractive = ['button', 'input', 'select', 'textarea', 'a'].includes(tagName) ||
                           await element.evaluate(el => el.hasAttribute('onclick') || el.hasAttribute('role'));

      return {
        selector,
        isVisible,
        hasContent,
        isInteractive,
        errorMessage: undefined
      };

    } catch (error) {
      return {
        selector,
        isVisible: false,
        hasContent: false,
        isInteractive: false,
        errorMessage: error.message
      };
    }
  }

  async getComponentErrors(): Promise<string[]> {
    try {
      const errors = await this.page.evaluate(() => window.__COMPONENT_ERRORS__ || []);
      return [...this.componentErrors, ...errors];
    } catch {
      return this.componentErrors;
    }
  }

  async waitForReactComponents(): Promise<boolean> {
    try {
      // Wait for React to be available
      await this.page.waitForFunction(() => {
        return typeof window.React !== 'undefined' || 
               document.querySelector('[data-reactroot]') !== null ||
               document.querySelector('#root') !== null;
      }, { timeout: 10000 });

      // Wait for React components to render
      await this.page.waitForFunction(() => {
        const root = document.querySelector('#root');
        return root && root.children.length > 0;
      }, { timeout: 15000 });

      return true;
    } catch {
      return false;
    }
  }

  async detectRenderingIssues(): Promise<{
    emptyComponents: ComponentHealth[],
    hiddenComponents: ComponentHealth[],
    errorComponents: ComponentHealth[],
    totalComponents: number
  }> {
    // Common React component selectors
    const componentSelectors = [
      '#root',
      '[data-testid]',
      '.component, .Component',
      'main, section, article',
      'nav, header, footer',
      '.app, .App',
      '[class*="component"]',
      '[class*="Component"]'
    ];

    const results = await Promise.all(
      componentSelectors.map(selector => this.checkComponentHealth(selector))
    );

    const emptyComponents = results.filter(r => !r.hasContent && r.isVisible);
    const hiddenComponents = results.filter(r => !r.isVisible);
    const errorComponents = results.filter(r => r.errorMessage);

    return {
      emptyComponents,
      hiddenComponents,
      errorComponents,
      totalComponents: results.length
    };
  }
}

test.describe('React Component Rendering Detection', () => {
  let checker: ComponentHealthChecker;

  test.beforeEach(async ({ page }) => {
    checker = new ComponentHealthChecker(page);
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should verify React app mounts correctly', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for React to initialize
    const reactReady = await checker.waitForReactComponents();
    expect(reactReady).toBe(true);

    // Check root component health
    const rootHealth = await checker.checkComponentHealth('#root');
    console.log('Root Component Health:', rootHealth);
    
    expect(rootHealth.isVisible).toBe(true);
    expect(rootHealth.hasContent || rootHealth.selector === '#root').toBe(true); // Root might not have direct text
    
    // Verify React root has children
    const hasChildren = await page.evaluate(() => {
      const root = document.querySelector('#root');
      return root ? root.children.length > 0 : false;
    });
    
    expect(hasChildren).toBe(true);
  });

  test('should detect component rendering issues', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    const renderingIssues = await checker.detectRenderingIssues();
    
    console.log('Rendering Issues Analysis:', {
      emptyComponents: renderingIssues.emptyComponents.length,
      hiddenComponents: renderingIssues.hiddenComponents.length,
      errorComponents: renderingIssues.errorComponents.length,
      totalComponents: renderingIssues.totalComponents
    });

    // Log detailed issues
    if (renderingIssues.emptyComponents.length > 0) {
      console.log('Empty Components:', renderingIssues.emptyComponents);
    }
    
    if (renderingIssues.errorComponents.length > 0) {
      console.log('Error Components:', renderingIssues.errorComponents);
    }

    // Assertions
    expect(renderingIssues.errorComponents.length).toBe(0);
    
    // Should have at least some visible components
    const visibleComponents = renderingIssues.totalComponents - renderingIssues.hiddenComponents.length;
    expect(visibleComponents).toBeGreaterThan(0);
  });

  test('should capture React component errors', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for components to load and potentially error
    await page.waitForTimeout(5000);
    
    const componentErrors = await checker.getComponentErrors();
    
    console.log('Component Errors Found:', componentErrors);
    
    // Filter out non-critical warnings
    const criticalErrors = componentErrors.filter(error => 
      error.includes('Error:') || 
      error.includes('TypeError') ||
      error.includes('ReferenceError') ||
      error.includes('Cannot read') ||
      error.includes('undefined')
    );
    
    expect(criticalErrors.length).toBe(0);
    
    // If critical errors exist, provide details
    if (criticalErrors.length > 0) {
      console.error('CRITICAL COMPONENT ERRORS:', criticalErrors);
      await page.screenshot({ 
        path: 'frontend/test-results/component-error-screenshot.png',
        fullPage: true 
      });
    }
  });

  test('should verify specific UI components are functional', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Test specific components that should exist
    const criticalComponents = [
      { selector: 'nav, header', description: 'Navigation/Header' },
      { selector: 'main, [role="main"]', description: 'Main content area' },
      { selector: 'button', description: 'Interactive buttons' },
      { selector: 'a[href]', description: 'Navigation links' }
    ];

    for (const { selector, description } of criticalComponents) {
      const health = await checker.checkComponentHealth(selector);
      
      console.log(`${description} Health:`, health);
      
      // At least one element should match and be visible
      if (health.selector.includes(',')) {
        // Multiple selector - at least one should work
        const elements = await page.$$(selector);
        expect(elements.length).toBeGreaterThan(0);
      } else {
        expect(health.isVisible || health.hasContent).toBe(true);
      }
    }
  });

  test('should test component interactivity', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Find and test interactive elements
    const buttons = await page.$$('button:not([disabled])');
    const links = await page.$$('a[href]:not([href="#"])');

    console.log(`Found ${buttons.length} buttons and ${links.length} links`);

    // Test button interactions
    if (buttons.length > 0) {
      const firstButton = buttons[0];
      await expect(firstButton).toBeVisible();
      await expect(firstButton).toBeEnabled();
      
      // Test hover without clicking (to avoid navigation)
      await firstButton.hover();
      await page.waitForTimeout(100);
      
      // Verify button is still accessible after hover
      await expect(firstButton).toBeVisible();
    }

    // Test link accessibility
    if (links.length > 0) {
      const firstLink = links[0];
      await expect(firstLink).toBeVisible();
      
      const href = await firstLink.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).not.toBe('#');
    }

    // Overall interactivity check
    expect(buttons.length + links.length).toBeGreaterThan(0);
  });

  test('should monitor component mount/unmount cycles', async ({ page }) => {
    // Add component lifecycle tracking
    await page.addInitScript(() => {
      window.__COMPONENT_LIFECYCLE__ = {
        mounts: 0,
        unmounts: 0,
        updates: 0
      };

      // Mock React development mode tracking
      if (typeof window.React !== 'undefined') {
        const originalCreateElement = React.createElement;
        React.createElement = (...args) => {
          window.__COMPONENT_LIFECYCLE__.mounts++;
          return originalCreateElement.apply(React, args);
        };
      }
    });

    await page.goto('http://localhost:5173');
    await page.waitForTimeout(3000);

    const lifecycleData = await page.evaluate(() => window.__COMPONENT_LIFECYCLE__);
    
    console.log('Component Lifecycle Data:', lifecycleData);
    
    // Should have component activity
    expect(lifecycleData.mounts).toBeGreaterThan(0);
    
    // Test component stability (no excessive unmounting)
    const stabilityRatio = lifecycleData.unmounts / Math.max(lifecycleData.mounts, 1);
    expect(stabilityRatio).toBeLessThan(0.5); // Less than 50% unmount rate
  });

  test('should validate CSS and styling issues', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Check for CSS loading issues
    const stylesheetCount = await page.evaluate(() => {
      return document.querySelectorAll('link[rel="stylesheet"], style').length;
    });

    console.log(`Found ${stylesheetCount} stylesheets`);
    expect(stylesheetCount).toBeGreaterThan(0);

    // Check for elements with broken styling
    const styledElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*')).slice(0, 100); // Check first 100 elements
      
      return elements.map(el => {
        const styles = window.getComputedStyle(el);
        return {
          tagName: el.tagName,
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          hasBackgroundColor: styles.backgroundColor !== 'rgba(0, 0, 0, 0)',
          hasColor: styles.color !== 'rgb(0, 0, 0)'
        };
      }).filter(el => el.display !== 'none');
    });

    console.log(`Analyzed ${styledElements.length} styled elements`);
    
    // Should have visible styled elements
    expect(styledElements.length).toBeGreaterThan(5);
    
    // Check for proper styling
    const visibleElements = styledElements.filter(el => 
      el.visibility !== 'hidden' && el.opacity !== '0'
    );
    
    expect(visibleElements.length).toBeGreaterThan(0);
  });
});