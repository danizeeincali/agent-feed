/**
 * Performance Monitor for E2E Tests
 */
import { Page } from '@playwright/test';

export class PerformanceMonitor {
  private page?: Page;
  private metrics: any[] = [];

  async startMonitoring(page: Page) {
    this.page = page;
    this.metrics = [];
  }

  async generateReport() {
    if (!this.page) {
      return { error: 'Page not initialized' };
    }

    try {
      const metrics = await this.page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');

        return {
          pageLoad: navigation.loadEventEnd - navigation.fetchStart,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          timestamp: new Date().toISOString()
        };
      });

      return metrics;
    } catch (error) {
      return { error: String(error) };
    }
  }
}