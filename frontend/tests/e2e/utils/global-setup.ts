/**
 * Global Setup for Playwright E2E Tests
 * Initializes test environment, authentication, and baseline captures
 */

import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global E2E test setup...');

  // Ensure test directories exist
  await ensureTestDirectories();

  // Initialize NLD pattern capture database
  await initializeNLDDatabase();

  // Create baseline screenshots for visual regression
  await createVisualBaselines(config);

  // Set up performance monitoring baseline
  await initializePerformanceBaseline();

  console.log('✅ Global E2E test setup completed');
}

async function ensureTestDirectories() {
  const dirs = [
    'test-results',
    'test-results/screenshots',
    'test-results/videos',
    'test-results/traces',
    'test-results/nld-patterns',
    'test-results/performance-reports'
  ];

  for (const dir of dirs) {
    await fs.mkdir(path.join(process.cwd(), dir), { recursive: true });
  }
}

async function initializeNLDDatabase() {
  const nldConfigPath = path.join(process.cwd(), 'test-results/nld-patterns');
  
  const nldConfig = {
    initialized: new Date().toISOString(),
    patterns: [],
    failurePatterns: [],
    testRunId: `run-${Date.now()}`,
    environment: process.env.NODE_ENV || 'test'
  };

  await fs.writeFile(
    path.join(nldConfigPath, 'test-session.json'),
    JSON.stringify(nldConfig, null, 2)
  );
}

async function createVisualBaselines(config: FullConfig) {
  if (process.env.CI) {
    console.log('⏭️ Skipping visual baseline creation in CI');
    return;
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📸 Creating visual regression baselines...');
    
    // Navigate to app and wait for load
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Create baseline screenshots for key components
    await page.screenshot({ 
      path: 'test-results/screenshots/baseline-homepage.png',
      fullPage: true 
    });

    // If we have specific components, capture those too
    const components = [
      { selector: '[data-testid="nld-dashboard"]', name: 'nld-dashboard' },
      { selector: '[data-testid="terminal-launcher"]', name: 'terminal-launcher' },
      { selector: '[data-testid="connection-health"]', name: 'connection-health' }
    ];

    for (const component of components) {
      try {
        const element = await page.locator(component.selector);
        if (await element.count() > 0) {
          await element.screenshot({ 
            path: `test-results/screenshots/baseline-${component.name}.png` 
          });
        }
      } catch (error) {
        console.log(`⚠️ Could not capture baseline for ${component.name}:`, error.message);
      }
    }

    console.log('✅ Visual baselines created');
  } catch (error) {
    console.warn('⚠️ Could not create visual baselines:', error.message);
  } finally {
    await context.close();
    await browser.close();
  }
}

async function initializePerformanceBaseline() {
  const perfBaseline = {
    timestamp: new Date().toISOString(),
    metrics: {
      pageLoad: {
        target: 3000, // 3 seconds
        warning: 5000, // 5 seconds
        critical: 10000 // 10 seconds
      },
      firstContentfulPaint: {
        target: 1500,
        warning: 3000,
        critical: 5000
      },
      largestContentfulPaint: {
        target: 2500,
        warning: 4000,
        critical: 6000
      },
      cumulativeLayoutShift: {
        target: 0.1,
        warning: 0.25,
        critical: 0.5
      },
      firstInputDelay: {
        target: 100,
        warning: 300,
        critical: 500
      }
    },
    thresholds: {
      websocketConnection: 1000,
      componentRender: 500,
      apiResponse: 2000
    }
  };

  await fs.writeFile(
    path.join(process.cwd(), 'test-results/performance-baseline.json'),
    JSON.stringify(perfBaseline, null, 2)
  );
}

export default globalSetup;