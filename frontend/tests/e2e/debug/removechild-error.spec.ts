import { test, expect } from '@playwright/test';

test('Diagnose removeChild error on component showcase', async ({ page }) => {
  const errors: string[] = [];
  const logs: string[] = [];

  // Capture page errors
  page.on('pageerror', error => {
    errors.push(`PAGE ERROR: ${error.message}\nStack: ${error.stack}`);
    console.error('🔴 PAGE ERROR:', error.message);
  });

  // Capture console errors
  page.on('console', msg => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error' && text.includes('removeChild')) {
      console.error('🔴 CONSOLE ERROR:', text);
    }
  });

  console.log('🔍 Navigating to component showcase...');
  
  try {
    await page.goto('http://127.0.0.1:5173/agents/page-builder-agent/pages/component-showcase-complete-v3', {
      timeout: 30000
    });

    // Wait for page to settle
    await page.waitForTimeout(5000);

    console.log(`\n📊 Captured ${errors.length} page errors and ${logs.filter(l => l.includes('error')).length} console errors\n`);

    if (errors.length > 0) {
      console.log('🔴 PAGE ERRORS:');
      errors.forEach((err, i) => console.log(`\n${i + 1}. ${err}`));
    }

    // Log removeChild-related console messages
    const removeChildLogs = logs.filter(l => l.toLowerCase().includes('removechild'));
    if (removeChildLogs.length > 0) {
      console.log('\n🔴 REMOVECHILD ERRORS:');
      removeChildLogs.forEach((log, i) => console.log(`${i + 1}. ${log}`));
    }

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/debug/error-state.png', fullPage: true });
    console.log('\n📸 Screenshot saved');

    // Check if page loaded or errored
    const hasErrorBoundary = await page.locator('text=Page Error').count() > 0;
    const hasContent = await page.locator('.mermaid-diagram').count() > 0;

    console.log(`\n✅ Has Error Boundary: ${hasErrorBoundary}`);
    console.log(`✅ Has Mermaid Diagrams: ${hasContent}`);

    // Fail test if we found removeChild errors
    expect(errors.filter(e => e.includes('removeChild'))).toHaveLength(0);
    expect(removeChildLogs).toHaveLength(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
});
