import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Component Showcase Page
 * Encapsulates all interactions with the component showcase page
 */
export class ComponentShowcasePage {
  readonly page: Page;
  readonly url = '/agents/page-builder-agent/pages/component-showcase-and-examples';

  // Main container
  readonly pageContainer: Locator;
  readonly sidebar: Locator;
  readonly mainContent: Locator;

  // Component sections - flexible selectors to handle various implementations
  readonly photoGridSection: Locator;
  readonly swipeCardSection: Locator;
  readonly checklistSection: Locator;
  readonly calendarSection: Locator;
  readonly markdownSection: Locator;
  readonly ganttChartSection: Locator;
  readonly cardSection: Locator;
  readonly buttonSection: Locator;
  readonly gridSection: Locator;
  readonly badgeSection: Locator;
  readonly metricSection: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators with fallback selectors
    this.pageContainer = page.locator('[data-testid="component-showcase-page"], .component-showcase-page, main');
    this.sidebar = page.locator('[data-testid="sidebar"], .sidebar, nav, aside');
    this.mainContent = page.locator('[data-testid="main-content"], .main-content, main');

    // Component sections with multiple selector strategies
    this.photoGridSection = page.locator('[data-component="PhotoGrid"], .photo-grid-component, [class*="photo-grid"], [class*="PhotoGrid"]');
    this.swipeCardSection = page.locator('[data-component="SwipeCard"], .swipe-card-component, [class*="swipe-card"], [class*="SwipeCard"]');
    this.checklistSection = page.locator('[data-component="Checklist"], .checklist-component, [class*="checklist"], [class*="Checklist"]');
    this.calendarSection = page.locator('[data-component="Calendar"], .calendar-component, [class*="calendar"], [class*="Calendar"]');
    this.markdownSection = page.locator('[data-component="Markdown"], .markdown-component, [class*="markdown"], [class*="Markdown"]');
    this.ganttChartSection = page.locator('[data-component="GanttChart"], .gantt-chart-component, [class*="gantt"], [class*="Gantt"]');
    this.cardSection = page.locator('[data-component="Card"], .card-component:not([class*="swipe"]), [class*="Card"]:not([class*="Swipe"])').first();
    this.buttonSection = page.locator('[data-component="Button"], .button-component, [class*="button-demo"]');
    this.gridSection = page.locator('[data-component="Grid"], .grid-component, [class*="grid-demo"]');
    this.badgeSection = page.locator('[data-component="Badge"], .badge-component, [class*="badge-demo"]');
    this.metricSection = page.locator('[data-component="Metric"], .metric-component, [class*="metric-demo"]');
  }

  /**
   * Navigate to the component showcase page
   */
  async navigate() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    await this.page.goto(`${baseUrl}${this.url}`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await this.waitForPageFullyLoaded();
  }

  /**
   * Wait for page to be fully loaded with all components
   */
  async waitForPageFullyLoaded() {
    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle', { timeout: 30000 });

    // Wait for DOM to be fully loaded
    await this.page.waitForLoadState('domcontentloaded');

    // Wait for main container to be visible
    try {
      await this.pageContainer.first().waitFor({ state: 'visible', timeout: 10000 });
    } catch (error) {
      console.warn('Main container not found, page might use different structure');
    }

    // Give React time to hydrate
    await this.page.waitForTimeout(1000);
  }

  /**
   * Get all component sections
   */
  async getAllComponentSections() {
    return [
      { name: 'PhotoGrid', locator: this.photoGridSection },
      { name: 'SwipeCard', locator: this.swipeCardSection },
      { name: 'Checklist', locator: this.checklistSection },
      { name: 'Calendar', locator: this.calendarSection },
      { name: 'Markdown', locator: this.markdownSection },
      { name: 'GanttChart', locator: this.ganttChartSection },
      { name: 'Card', locator: this.cardSection },
      { name: 'Button', locator: this.buttonSection },
      { name: 'Grid', locator: this.gridSection },
      { name: 'Badge', locator: this.badgeSection },
      { name: 'Metric', locator: this.metricSection },
    ];
  }

  /**
   * Verify component is rendered
   */
  async verifyComponentRendered(componentName: string): Promise<boolean> {
    const components = await this.getAllComponentSections();
    const component = components.find(c => c.name === componentName);

    if (!component) {
      throw new Error(`Component ${componentName} not found in page object`);
    }

    try {
      const count = await component.locator.count();
      if (count === 0) {
        console.warn(`Component ${componentName} not found on page`);
        return false;
      }

      const isVisible = await component.locator.first().isVisible();
      if (!isVisible) {
        console.warn(`Component ${componentName} exists but is not visible`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error checking component ${componentName}:`, error);
      return false;
    }
  }

  /**
   * Count total visible components
   */
  async countVisibleComponents(): Promise<number> {
    const components = await this.getAllComponentSections();
    let count = 0;

    for (const component of components) {
      try {
        const locatorCount = await component.locator.count();
        if (locatorCount > 0) {
          const isVisible = await component.locator.first().isVisible();
          if (isVisible) count++;
        }
      } catch (error) {
        // Component might not exist, continue
        continue;
      }
    }

    return count;
  }

  /**
   * Scroll to specific component
   */
  async scrollToComponent(componentName: string) {
    const components = await this.getAllComponentSections();
    const component = components.find(c => c.name === componentName);

    if (!component) {
      throw new Error(`Component ${componentName} not found`);
    }

    try {
      const count = await component.locator.count();
      if (count === 0) {
        console.warn(`Component ${componentName} not found, skipping scroll`);
        return;
      }

      await component.locator.first().scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(500); // Allow smooth scroll to complete
    } catch (error) {
      console.error(`Error scrolling to ${componentName}:`, error);
      throw error;
    }
  }

  /**
   * Click sidebar navigation item
   */
  async clickSidebarItem(itemText: string) {
    try {
      const sidebarItem = this.sidebar.locator(`text="${itemText}"`).first();
      await sidebarItem.click();
      await this.page.waitForTimeout(300); // Allow navigation animation
    } catch (error) {
      console.warn(`Sidebar item "${itemText}" not found or not clickable`);
      throw error;
    }
  }

  /**
   * Get sidebar navigation items
   */
  async getSidebarItems(): Promise<string[]> {
    try {
      const sidebarVisible = await this.sidebar.first().isVisible({ timeout: 3000 });
      if (!sidebarVisible) {
        console.warn('Sidebar not visible');
        return [];
      }

      const items = await this.sidebar.locator('a, button, [role="link"], [role="button"]').allTextContents();
      return items.filter(text => text.trim().length > 0);
    } catch (error) {
      console.warn('Could not get sidebar items:', error);
      return [];
    }
  }

  /**
   * Take full page screenshot
   */
  async captureFullPageScreenshot(name: string) {
    await this.page.screenshot({
      path: `tests/e2e/component-showcase/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  /**
   * Capture component screenshot
   */
  async captureComponentScreenshot(componentName: string) {
    const components = await this.getAllComponentSections();
    const component = components.find(c => c.name === componentName);

    if (!component) {
      throw new Error(`Component ${componentName} not found`);
    }

    try {
      const count = await component.locator.count();
      if (count === 0) {
        console.warn(`Cannot capture screenshot: ${componentName} not found`);
        return;
      }

      await component.locator.first().screenshot({
        path: `tests/e2e/component-showcase/screenshots/${componentName}-component.png`,
      });
    } catch (error) {
      console.error(`Error capturing screenshot for ${componentName}:`, error);
    }
  }

  /**
   * Check for console errors
   */
  async getConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];

    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    this.page.on('pageerror', error => {
      errors.push(`Page Error: ${error.message}`);
    });

    return errors;
  }

  /**
   * Measure page performance
   */
  async measurePerformance() {
    return await this.page.evaluate(() => {
      const perf = window.performance;
      const perfData = perf.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (!perfData) {
        return {
          domContentLoaded: 0,
          loadComplete: 0,
          domInteractive: 0,
          firstPaint: 0,
        };
      }

      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
        domInteractive: perfData.domInteractive - perfData.fetchStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
      };
    });
  }

  /**
   * Set viewport size for responsive testing
   */
  async setViewport(width: number, height: number) {
    await this.page.setViewportSize({ width, height });
    await this.page.waitForTimeout(500); // Allow layout to adjust
  }

  /**
   * Scroll to bottom of page
   */
  async scrollToBottom() {
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await this.page.waitForTimeout(500);
  }

  /**
   * Scroll to top of page
   */
  async scrollToTop() {
    await this.page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await this.page.waitForTimeout(300);
  }
}
