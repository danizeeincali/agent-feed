import { chromium } from 'playwright';

async function quickDebug() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture console messages
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  try {
    console.log('🚀 Navigating to analytics...');
    await page.goto('http://127.0.0.1:5173/analytics', { waitUntil: 'networkidle' });

    // Check if page is rendered
    const bodyText = await page.textContent('body');
    console.log('📄 Page content length:', bodyText?.length || 0);
    console.log('📄 First 200 chars:', bodyText?.substring(0, 200) || 'EMPTY');

    // Take screenshot
    await page.screenshot({ path: 'analytics-debug.png', fullPage: true });
    console.log('📸 Screenshot saved as analytics-debug.png');

    await page.waitForTimeout(3000);
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

quickDebug().catch(console.error);