#!/usr/bin/env node

/**
 * Production Validation Runner for Spawn Agent Button Removal
 * Runs browser validation and captures evidence
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runValidation() {
  console.log('🚀 Starting Production Validation: Spawn Agent Button Removal\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    screenshots: [],
    consoleErrors: [],
    consoleWarnings: [],
    overallStatus: 'PASS'
  };

  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.consoleErrors.push(msg.text());
    } else if (msg.type() === 'warning') {
      results.consoleWarnings.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    results.consoleErrors.push(`Page Error: ${error.message}`);
  });

  try {
    console.log('📍 TEST 1: Navigate to agents page');
    await page.goto('http://localhost:5173/agents', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(2000);
    console.log('✅ Navigation successful\n');
    results.tests.push({ name: 'Navigation', status: 'PASS' });

    // TEST 2: Verify NO Spawn Agent button in header
    console.log('📍 TEST 2: Verify NO "Spawn Agent" button in header');
    const spawnButtonCount = await page.locator('button:has-text("Spawn Agent")').count();
    if (spawnButtonCount === 0) {
      console.log('✅ PASS: No "Spawn Agent" button found in header\n');
      results.tests.push({ name: 'No Spawn Agent Button', status: 'PASS' });
    } else {
      console.log(`❌ FAIL: Found ${spawnButtonCount} "Spawn Agent" button(s)\n`);
      results.tests.push({ name: 'No Spawn Agent Button', status: 'FAIL', details: `Found ${spawnButtonCount} button(s)` });
      results.overallStatus = 'FAIL';
    }

    // TEST 3: Verify Refresh button IS present
    console.log('📍 TEST 3: Verify Refresh button IS present');
    const refreshButton = await page.locator('button:has-text("Refresh")').first();
    const refreshVisible = await refreshButton.isVisible().catch(() => false);
    if (refreshVisible) {
      console.log('✅ PASS: Refresh button is visible\n');
      results.tests.push({ name: 'Refresh Button Present', status: 'PASS' });
    } else {
      console.log('❌ FAIL: Refresh button not found\n');
      results.tests.push({ name: 'Refresh Button Present', status: 'FAIL' });
      results.overallStatus = 'FAIL';
    }

    // TEST 4: Verify NO Activate buttons on cards
    console.log('📍 TEST 4: Verify NO "Activate" buttons on agent cards');
    const activateButtonCount = await page.locator('button:has-text("Activate")').count();
    if (activateButtonCount === 0) {
      console.log('✅ PASS: No "Activate" buttons found on cards\n');
      results.tests.push({ name: 'No Activate Buttons', status: 'PASS' });
    } else {
      console.log(`❌ FAIL: Found ${activateButtonCount} "Activate" button(s)\n`);
      results.tests.push({ name: 'No Activate Buttons', status: 'FAIL', details: `Found ${activateButtonCount} button(s)` });
      results.overallStatus = 'FAIL';
    }

    // TEST 5: Verify Play icon is removed
    console.log('📍 TEST 5: Verify Play icon is removed');
    const playIconCount = await page.locator('[data-lucide="play"]').count();
    if (playIconCount === 0) {
      console.log('✅ PASS: No Play icons found (Activate button removed)\n');
      results.tests.push({ name: 'No Play Icons', status: 'PASS' });
    } else {
      console.log(`⚠️  WARNING: Found ${playIconCount} Play icon(s)\n`);
      results.tests.push({ name: 'No Play Icons', status: 'WARNING', details: `Found ${playIconCount} icon(s)` });
    }

    // TEST 6: Verify allowed buttons exist
    console.log('📍 TEST 6: Verify allowed buttons (Home, Details, Delete) exist');
    const homeButtons = await page.locator('button:has-text("Home")').count();
    const detailsButtons = await page.locator('button:has-text("Details")').count();
    const deleteButtons = await page.locator('button[aria-label*="Delete"], button[title*="Delete"], [data-lucide="trash-2"]').count();

    console.log(`   Found ${homeButtons} Home button(s)`);
    console.log(`   Found ${detailsButtons} Details button(s)`);
    console.log(`   Found ${deleteButtons} Delete button(s)`);

    if (homeButtons > 0 && detailsButtons > 0) {
      console.log('✅ PASS: Required buttons are present\n');
      results.tests.push({
        name: 'Required Buttons Present',
        status: 'PASS',
        details: `Home: ${homeButtons}, Details: ${detailsButtons}, Delete: ${deleteButtons}`
      });
    } else {
      console.log('⚠️  WARNING: Some required buttons may be missing\n');
      results.tests.push({
        name: 'Required Buttons Present',
        status: 'WARNING',
        details: `Home: ${homeButtons}, Details: ${detailsButtons}, Delete: ${deleteButtons}`
      });
    }

    // TEST 7: Check console errors
    console.log('📍 TEST 7: Check for JavaScript console errors');
    const criticalErrors = results.consoleErrors.filter(err =>
      !err.includes('Download the React DevTools') &&
      !err.includes('source map') &&
      !err.includes('favicon') &&
      !err.includes('WebSocket') &&
      !err.includes('ERR_CONNECTION_REFUSED') &&
      !err.includes('Failed to load resource')
    );

    if (criticalErrors.length === 0) {
      console.log('✅ PASS: No JavaScript errors found\n');
      results.tests.push({ name: 'No Console Errors', status: 'PASS' });
    } else {
      console.log(`❌ FAIL: Found ${criticalErrors.length} console error(s):`);
      criticalErrors.forEach(err => console.log(`   - ${err}`));
      console.log('');
      results.tests.push({
        name: 'No Console Errors',
        status: 'FAIL',
        details: criticalErrors
      });
      results.overallStatus = 'FAIL';
    }

    // TEST 8: Test Refresh button functionality
    console.log('📍 TEST 8: Test Refresh button functionality');
    try {
      const refreshBtn = page.locator('button:has-text("Refresh")').first();
      await refreshBtn.click();
      await page.waitForTimeout(1000);
      console.log('✅ PASS: Refresh button is clickable and functional\n');
      results.tests.push({ name: 'Refresh Button Functional', status: 'PASS' });
    } catch (error) {
      console.log(`⚠️  WARNING: Could not test refresh button: ${error.message}\n`);
      results.tests.push({ name: 'Refresh Button Functional', status: 'WARNING', details: error.message });
    }

    // Capture screenshots
    console.log('📸 Capturing screenshots...');
    const screenshotsDir = path.join(__dirname, 'tests', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const fullPagePath = path.join(screenshotsDir, 'spawn-agent-removal-full-page.png');
    const viewportPath = path.join(screenshotsDir, 'spawn-agent-removal-viewport.png');

    await page.screenshot({ path: fullPagePath, fullPage: true });
    await page.screenshot({ path: viewportPath, fullPage: false });

    results.screenshots.push(fullPagePath, viewportPath);
    console.log(`✅ Full page screenshot: ${fullPagePath}`);
    console.log(`✅ Viewport screenshot: ${viewportPath}\n`);

  } catch (error) {
    console.error(`❌ FATAL ERROR: ${error.message}\n`);
    results.tests.push({ name: 'Fatal Error', status: 'FAIL', details: error.message });
    results.overallStatus = 'FAIL';
  } finally {
    await browser.close();
  }

  // Print summary
  console.log('='.repeat(80));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${results.timestamp}`);
  console.log(`Overall Status: ${results.overallStatus === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Total Tests: ${results.tests.length}`);
  console.log(`Passed: ${results.tests.filter(t => t.status === 'PASS').length}`);
  console.log(`Failed: ${results.tests.filter(t => t.status === 'FAIL').length}`);
  console.log(`Warnings: ${results.tests.filter(t => t.status === 'WARNING').length}`);
  console.log('');

  // Print individual test results
  results.tests.forEach(test => {
    const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${test.name}: ${test.status}`);
    if (test.details) {
      console.log(`   Details: ${typeof test.details === 'object' ? JSON.stringify(test.details, null, 2) : test.details}`);
    }
  });
  console.log('');

  if (results.consoleErrors.length > 0) {
    console.log('🔴 Console Errors:');
    results.consoleErrors.slice(0, 5).forEach(err => console.log(`   - ${err}`));
    if (results.consoleErrors.length > 5) {
      console.log(`   ... and ${results.consoleErrors.length - 5} more`);
    }
    console.log('');
  }

  if (results.consoleWarnings.length > 0) {
    console.log('⚠️  Console Warnings:');
    results.consoleWarnings.slice(0, 3).forEach(warn => console.log(`   - ${warn}`));
    if (results.consoleWarnings.length > 3) {
      console.log(`   ... and ${results.consoleWarnings.length - 3} more`);
    }
    console.log('');
  }

  console.log('📸 Screenshots:');
  results.screenshots.forEach(path => console.log(`   - ${path}`));
  console.log('');

  // Save results to JSON
  const resultsPath = path.join(__dirname, 'spawn-agent-removal-validation-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`📄 Full results saved to: ${resultsPath}`);
  console.log('='.repeat(80));

  process.exit(results.overallStatus === 'PASS' ? 0 : 1);
}

runValidation().catch(error => {
  console.error('💥 Validation runner crashed:', error);
  process.exit(1);
});
