import { chromium, FullConfig } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright Global Setup for White Screen Detection Tests');
  
  // Create test directories
  const testDirs = [
    'frontend/test-results',
    'frontend/test-results/white-screen-errors',
    'frontend/test-results/visual-baselines',
    'frontend/test-results/visual-actual',
    'frontend/test-results/visual-diffs',
    'frontend/test-results/videos',
    'frontend/test-results/mobile-videos'
  ];

  for (const dir of testDirs) {
    await fs.mkdir(dir, { recursive: true });
  }

  // Pre-flight check: Verify the application is running and responding
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🔍 Performing pre-flight application health check...');
    
    // Navigate to application
    const response = await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    if (!response || !response.ok()) {
      throw new Error(`Application not responding. Status: ${response?.status()}`);
    }

    // Basic smoke test - ensure React app mounts
    await page.waitForSelector('#root', { timeout: 15000 });
    
    const hasContent = await page.evaluate(() => {
      const root = document.querySelector('#root');
      return root && root.children.length > 0;
    });

    if (!hasContent) {
      console.warn('⚠️  WARNING: Application appears to have empty root - this may indicate a white screen issue');
    }

    // Check for critical JavaScript errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      console.warn('⚠️  WARNING: JavaScript errors detected during pre-flight:', errors);
    }

    // Take baseline screenshot for visual regression
    await page.screenshot({
      path: 'frontend/test-results/visual-baselines/pre-flight-baseline.png',
      fullPage: true
    });

    console.log('✅ Pre-flight check passed - application is responding');
    
    // Save pre-flight report
    const preflightReport = {
      timestamp: new Date().toISOString(),
      applicationUrl: 'http://localhost:5173',
      responseStatus: response?.status(),
      hasRootContent: hasContent,
      jsErrors: errors,
      preflightPassed: true
    };

    await fs.writeFile(
      'frontend/test-results/preflight-report.json',
      JSON.stringify(preflightReport, null, 2)
    );

  } catch (error) {
    console.error('❌ Pre-flight check failed:', error.message);
    
    // Take error screenshot
    await page.screenshot({
      path: 'frontend/test-results/preflight-error.png',
      fullPage: true
    }).catch(() => {}); // Ignore screenshot errors

    // Save error report
    const errorReport = {
      timestamp: new Date().toISOString(),
      error: error.message,
      preflightPassed: false
    };

    await fs.writeFile(
      'frontend/test-results/preflight-error.json',
      JSON.stringify(errorReport, null, 2)
    );

    throw error; // Re-throw to fail the test run
    
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }

  // Setup environment variables for tests
  process.env.PLAYWRIGHT_TEST_MODE = 'white-screen-detection';
  process.env.BASELINE_UPDATE = process.env.UPDATE_BASELINES || 'false';

  console.log('🎭 Global setup completed successfully');
}

export default globalSetup;