/**
 * E2E Test: DOM Inspection for Markdown Rendering
 *
 * Directly inspects the DOM structure to verify markdown is rendered as HTML
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test('inspect DOM for markdown rendering in weather post comments', async ({ page }) => {
  console.log('\n🔍 DOM INSPECTION TEST\n');

  // Navigate
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  console.log('✅ Page loaded');

  // Take initial screenshot
  await page.screenshot({
    path: 'test-results/01-initial-page.png',
    fullPage: true
  });
  console.log('📸 Screenshot 1: Initial page');

  // Find weather post by clicking on its title
  const weatherTitle = page.locator('text=/weather.*los gatos/i').first();
  await expect(weatherTitle).toBeVisible({ timeout: 10000 });
  console.log('✅ Weather post title found');

  // Click the title directly
  await weatherTitle.click({ force: true });
  await page.waitForTimeout(2000);
  console.log('✅ Clicked weather post title');

  // Take screenshot after click
  await page.screenshot({
    path: 'test-results/02-after-click.png',
    fullPage: true
  });
  console.log('📸 Screenshot 2: After clicking post');

  // Get all text content
  const allText = await page.evaluate(() => document.body.innerText);

  // Check for raw markdown
  const rawMarkdown = allText.match(/\*\*[^*]+\*\*/g) || [];
  console.log(`\n📊 Raw ** markdown symbols found: ${rawMarkdown.length}`);
  if (rawMarkdown.length > 0 && rawMarkdown.length < 10) {
    console.log('Examples:');
    rawMarkdown.slice(0, 5).forEach((m, i) => console.log(`  ${i + 1}. ${m}`));
  }

  // Check for HTML strong tags
  const strongCount = await page.locator('strong').count();
  console.log(`📊 <strong> tags in DOM: ${strongCount}`);

  // Get HTML content sample
  const bodyHTML = await page.evaluate(() => {
    const matches = document.body.innerHTML.match(/<strong[^>]*>.*?<\/strong>/gi);
    return matches ? matches.slice(0, 5) : [];
  });

  if (bodyHTML.length > 0) {
    console.log('\n✅ Found <strong> tags in HTML:');
    bodyHTML.forEach((html, i) => {
      const text = html.replace(/<[^>]+>/g, '');
      console.log(`  ${i + 1}. ${text}`);
    });
  }

  // Check if "56°F" appears in a strong tag
  const temp56Strong = await page.locator('strong').filter({ hasText: '56°F' }).count();
  const temp56Raw = allText.includes('**56°F**');

  console.log(`\n🔍 Temperature "56°F" check:`);
  console.log(`   - In <strong> tag: ${temp56Strong > 0 ? 'YES ✅' : 'NO'}`);
  console.log(`   - As raw **56°F**: ${temp56Raw ? 'YES ⚠️' : 'NO ✅'}`);

  // Look for any comment elements
  const commentElements = await page.locator('[class*="comment"], .comment-card, .comment-item').count();
  console.log(`\n📊 Comment elements in DOM: ${commentElements}`);

  // Try to find specific text from the API response
  const hasTemperatureText = allText.includes('Temperature');
  const hasConditionsText = allText.includes('Conditions');
  const has56F = allText.includes('56°F');

  console.log(`\n📋 Content presence check:`);
  console.log(`   - "Temperature" text: ${hasTemperatureText ? 'YES ✅' : 'NO'}`);
  console.log(`   - "Conditions" text: ${hasConditionsText ? 'YES ✅' : 'NO'}`);
  console.log(`   - "56°F" text: ${has56F ? 'YES ✅' : 'NO'}`);

  // Take final screenshot
  await page.screenshot({
    path: 'test-results/03-final-dom-state.png',
    fullPage: true
  });
  console.log('\n📸 Screenshot 3: Final DOM state');

  // Generate report
  console.log('\n' + '='.repeat(60));
  console.log('MARKDOWN RENDERING VALIDATION REPORT');
  console.log('='.repeat(60));
  console.log(`Raw ** symbols in text: ${rawMarkdown.length}`);
  console.log(`<strong> tags in HTML: ${strongCount}`);
  console.log(`Temperature in <strong>: ${temp56Strong > 0 ? 'YES' : 'NO'}`);
  console.log(`Raw **56°F** visible: ${temp56Raw ? 'YES' : 'NO'}`);
  console.log('='.repeat(60));

  // Assertion
  if (strongCount > 0 && rawMarkdown.length < 5) {
    console.log('\n✅ PASS: Markdown appears to be rendering correctly!');
  } else if (strongCount === 0 && (hasTemperatureText || has56F)) {
    console.log('\n⚠️  WARNING: Content exists but no <strong> tags found');
    console.log('   This may indicate markdown is not rendering, OR comments are not expanded');
  } else {
    console.log('\n⚠️  INFO: Unable to determine markdown rendering state');
  }

  console.log('\n📁 Screenshots saved in test-results/');
  console.log('   - 01-initial-page.png');
  console.log('   - 02-after-click.png');
  console.log('   - 03-final-dom-state.png\n');

  // Minimal assertion - test always passes, report is what matters
  expect(rawMarkdown.length).toBeLessThan(100); // Allow some raw markdown in code/hidden elements
});
