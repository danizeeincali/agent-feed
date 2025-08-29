import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Global Setup for UI Modernization Tests
 * 
 * Prepares the test environment, validates backend services,
 * and ensures Claude Instance Manager is ready for testing.
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting UI Modernization Test Suite Setup');
  
  const setupStartTime = Date.now();
  
  try {
    // 1. Validate test environment
    await validateTestEnvironment();
    
    // 2. Check backend services
    await checkBackendServices();
    
    // 3. Prepare test data and state
    await prepareTestEnvironment();
    
    // 4. Validate frontend is accessible
    await validateFrontendAccess();
    
    // 5. Create baseline screenshots if needed
    await createVisualBaselines();
    
    const setupDuration = Date.now() - setupStartTime;
    console.log(`✅ UI Modernization Test Suite Setup Complete (${setupDuration}ms)`);
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

/**
 * Validate test environment configuration
 */
async function validateTestEnvironment() {
  console.log('📋 Validating test environment...');
  
  // Check required environment variables
  const requiredEnvVars = ['NODE_ENV'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
  }
  
  // Ensure test directories exist
  const testDirs = [
    'test-results',
    'test-results/screenshots',
    'test-results/videos',
    'test-results/traces'
  ];
  
  for (const dir of testDirs) {
    const dirPath = path.resolve(dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Created test directory: ${dir}`);
    }
  }
  
  console.log('✅ Test environment validated');
}

/**
 * Check backend services are running and accessible
 */
async function checkBackendServices() {
  console.log('🔍 Checking backend services...');
  
  const backendUrl = 'http://localhost:3000';
  const maxRetries = 5;
  const retryDelay = 2000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Checking backend (attempt ${attempt}/${maxRetries})...`);
      
      const response = await fetch(`${backendUrl}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const health = await response.json().catch(() => ({}));
        console.log('✅ Backend service is healthy:', health);
        return;
      } else {
        console.warn(`⚠️  Backend responded with status: ${response.status}`);
      }
    } catch (error) {
      console.warn(`⚠️  Backend check failed (attempt ${attempt}):`, (error as Error).message);
    }
    
    if (attempt < maxRetries) {
      console.log(`⏳ Waiting ${retryDelay}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  // Continue with tests even if backend check fails
  console.warn('⚠️  Backend service check incomplete - tests will proceed');
}

/**
 * Prepare test environment and clean state
 */
async function prepareTestEnvironment() {
  console.log('🧹 Preparing test environment...');
  
  // Clean up any existing test artifacts
  const cleanupDirs = [
    'test-results/screenshots',
    'test-results/videos',
    'test-results/traces'
  ];
  
  for (const dir of cleanupDirs) {
    const dirPath = path.resolve(dir);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      }
      console.log(`🗑️  Cleaned directory: ${dir}`);
    }
  }
  
  // Create test configuration file
  const testConfig = {
    startTime: new Date().toISOString(),
    testSuite: 'UI Modernization',
    environment: process.env.NODE_ENV || 'test',
    frontendUrl: 'http://localhost:5173',
    backendUrl: 'http://localhost:3000'
  };
  
  fs.writeFileSync(
    'test-results/test-config.json', 
    JSON.stringify(testConfig, null, 2)
  );
  
  console.log('✅ Test environment prepared');
}

/**
 * Validate frontend application is accessible
 */
async function validateFrontendAccess() {
  console.log('🌐 Validating frontend access...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Navigate to frontend
    await page.goto('http://localhost:5173', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Check for essential elements
    const title = await page.title();
    console.log(`📄 Frontend page title: ${title}`);
    
    // Look for Claude Instance Manager elements
    const claudeManager = page.locator('[data-testid="claude-instance-manager"]');
    const isManagerVisible = await claudeManager.isVisible().catch(() => false);
    
    if (isManagerVisible) {
      console.log('✅ Claude Instance Manager detected');
    } else {
      console.log('ℹ️  Claude Instance Manager not immediately visible (may be on different route)');
    }
    
    // Check for professional button elements
    const prodButton = page.locator('button').filter({ hasText: /prod/ }).first();
    const isProdButtonVisible = await prodButton.isVisible().catch(() => false);
    
    if (isProdButtonVisible) {
      console.log('✅ Professional buttons detected');
    } else {
      console.log('ℹ️  Professional buttons not found on current page');
    }
    
    console.log('✅ Frontend access validated');
    
  } catch (error) {
    console.warn('⚠️  Frontend validation failed:', (error as Error).message);
    console.warn('ℹ️  Tests will proceed but may fail if frontend is not accessible');
  } finally {
    await browser.close();
  }
}

/**
 * Create visual regression baselines if needed
 */
async function createVisualBaselines() {
  console.log('📸 Checking visual regression baselines...');
  
  const baselineDir = path.resolve('test-results/screenshots');
  const baselineExists = fs.existsSync(path.join(baselineDir, 'claude-instance-manager-initial.png'));
  
  if (!baselineExists) {
    console.log('📷 Creating visual regression baselines...');
    
    const browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 }
    });
    
    try {
      // Navigate to Claude Instance Manager
      await page.goto('http://localhost:5173/claude-instances', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Wait for page to stabilize
      await page.waitForTimeout(2000);
      
      // Disable animations for consistent screenshots
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
          }
        `
      });
      
      // Take baseline screenshot
      await page.screenshot({
        path: path.join(baselineDir, 'claude-instance-manager-initial.png'),
        fullPage: true
      });
      
      console.log('📸 Visual baseline created');
      
    } catch (error) {
      console.warn('⚠️  Failed to create visual baselines:', (error as Error).message);
    } finally {
      await browser.close();
    }
  } else {
    console.log('✅ Visual baselines already exist');
  }
}

/**
 * Generate setup report
 */
function generateSetupReport(duration: number) {
  const report = {
    setupCompleted: new Date().toISOString(),
    setupDuration: duration,
    environment: process.env.NODE_ENV || 'test',
    nodeVersion: process.version,
    platform: process.platform,
    testSuite: 'UI Modernization',
    configuration: {
      frontendUrl: 'http://localhost:5173',
      backendUrl: 'http://localhost:3000',
      testTimeout: 90000,
      retries: process.env.CI ? 3 : 1
    }
  };
  
  fs.writeFileSync(
    'test-results/setup-report.json',
    JSON.stringify(report, null, 2)
  );
}

export default globalSetup;
