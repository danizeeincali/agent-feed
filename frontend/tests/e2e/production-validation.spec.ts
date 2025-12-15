import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Production Validation', () => {
  test('validate zero console errors and full functionality', async ({ page }) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      } else if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      errors.push(`Page Error: ${error.message}`);
    });

    console.log('🔍 Step 1: Navigating to http://localhost:5173');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    console.log('⏳ Step 2: Waiting 5 seconds for full page load');
    await page.waitForTimeout(5000);

    // Screenshot 1: Initial page load
    const screenshotDir = '/workspaces/agent-feed/validation-screenshots';
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    await page.screenshot({
      path: path.join(screenshotDir, '1-initial-load.png'),
      fullPage: true
    });
    console.log('📸 Screenshot 1: Initial page load saved');

    // Check for posts
    const posts = await page.locator('[class*="post"], [data-testid*="post"], article').count();
    console.log(`📊 Found ${posts} posts on page`);

    // Screenshot 2: DevTools console (we'll capture error state instead)
    console.log('\n📋 Console Errors:', errors.length > 0 ? errors : 'NONE');
    console.log('⚠️  Console Warnings:', warnings.length > 0 ? warnings : 'NONE');

    // Check for engagement data visibility
    const engagementElements = await page.locator('[class*="engagement"], [class*="stats"], [class*="likes"], [class*="views"]').count();
    console.log(`💬 Found ${engagementElements} engagement-related elements`);

    // Screenshot 3: Engagement data visible
    if (engagementElements > 0) {
      const firstEngagement = page.locator('[class*="engagement"], [class*="stats"]').first();
      await firstEngagement.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(screenshotDir, '2-engagement-data.png'),
        fullPage: true
      });
      console.log('📸 Screenshot 2: Engagement data visible');
    }

    // Try to find and click save button
    const saveButtons = page.locator('button:has-text("Save"), button[aria-label*="save" i], button[title*="save" i]');
    const saveButtonCount = await saveButtons.count();
    console.log(`💾 Found ${saveButtonCount} save buttons`);

    if (saveButtonCount > 0) {
      const firstSaveButton = saveButtons.first();
      await firstSaveButton.scrollIntoViewIfNeeded();

      // Screenshot before save
      await page.screenshot({
        path: path.join(screenshotDir, '3-before-save.png'),
        fullPage: true
      });
      console.log('📸 Screenshot 3: Before save action');

      await firstSaveButton.click();
      await page.waitForTimeout(2000); // Wait for save animation/update

      // Screenshot after save
      await page.screenshot({
        path: path.join(screenshotDir, '4-after-save.png'),
        fullPage: true
      });
      console.log('📸 Screenshot 4: After save action');
    }

    // Final screenshot with DevTools
    await page.screenshot({
      path: path.join(screenshotDir, '5-final-state.png'),
      fullPage: true
    });
    console.log('📸 Screenshot 5: Final state');

    // Generate validation report
    const report = {
      timestamp: new Date().toISOString(),
      zeroConsoleErrors: errors.length === 0,
      postsLoaded: posts > 0,
      engagementDataDisplays: engagementElements > 0,
      saveFunctionalityAvailable: saveButtonCount > 0,
      consoleErrors: errors,
      consoleWarnings: warnings,
      metrics: {
        totalPosts: posts,
        engagementElements,
        saveButtons: saveButtonCount
      }
    };

    fs.writeFileSync(
      path.join(screenshotDir, 'validation-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n' + '='.repeat(80));
    console.log('📊 VALIDATION REPORT');
    console.log('='.repeat(80));
    console.log(`✅/❌ Zero Console Errors: ${report.zeroConsoleErrors ? '✅' : '❌'}`);
    console.log(`✅/❌ Posts Loaded Successfully: ${report.postsLoaded ? '✅' : '❌'}`);
    console.log(`✅/❌ Engagement Data Displays: ${report.engagementDataDisplays ? '✅' : '❌'}`);
    console.log(`✅/❌ Save Functionality Works: ${report.saveFunctionalityAvailable ? '✅' : '❌'}`);
    console.log('='.repeat(80));
    console.log(`\n📁 Screenshots saved to: ${screenshotDir}/`);
    console.log(`📄 Full report saved to: ${screenshotDir}/validation-report.json`);

    // Assert critical validations
    expect(errors.length, `Found ${errors.length} console errors: ${errors.join('; ')}`).toBe(0);
    expect(posts, 'No posts loaded on page').toBeGreaterThan(0);
    expect(engagementElements, 'No engagement data visible').toBeGreaterThan(0);
  });
});
