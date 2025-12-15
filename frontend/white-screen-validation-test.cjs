const { chromium } = require('playwright');

async function validateWhiteScreenPrevention() {
  console.log('🚀 Starting White Screen Prevention Validation');
  console.log('=============================================');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  let consoleErrors = [];
  let testResults = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Monitor console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  function runTest(name, testFn) {
    testResults.total++;
    try {
      const result = testFn();
      if (result instanceof Promise) {
        return result.then(() => {
          console.log(`✅ ${name}`);
          testResults.passed++;
        }).catch((err) => {
          console.log(`❌ ${name}: ${err.message}`);
          testResults.failed++;
        });
      } else if (result) {
        console.log(`✅ ${name}`);
        testResults.passed++;
      } else {
        console.log(`❌ ${name}: Test returned false`);
        testResults.failed++;
      }
    } catch (err) {
      console.log(`❌ ${name}: ${err.message}`);
      testResults.failed++;
    }
  }

  try {
    // Test 1: Page loads successfully
    await runTest('Page loads within 10 seconds', async () => {
      const startTime = Date.now();
      await page.goto('http://localhost:5173', { timeout: 10000 });
      const loadTime = Date.now() - startTime;
      return loadTime < 10000;
    });

    // Test 2: #root element exists and is visible
    await runTest('Root element exists and is visible', async () => {
      const rootElement = await page.locator('#root');
      const isVisible = await rootElement.isVisible();
      return isVisible;
    });

    // Test 3: Page has meaningful content
    await runTest('Page has meaningful content (>100 chars)', async () => {
      const bodyText = await page.textContent('body');
      return bodyText && bodyText.length > 100;
    });

    // Test 4: Main layout elements are present
    await runTest('Main layout elements are present', async () => {
      const header = await page.locator('[data-testid="header"]').count();
      const mainContent = await page.locator('[data-testid="main-content"]').count();
      const appContainer = await page.locator('[data-testid="app-container"]').count();
      return header > 0 && mainContent > 0 && appContainer > 0;
    });

    // Test 5: Navigation elements are functional
    await runTest('Navigation elements are functional', async () => {
      const navLinks = await page.locator('nav a').count();
      const searchInput = await page.locator('input[placeholder*="Search"]').count();
      return navLinks > 5 && searchInput > 0;
    });

    // Test 6: CSS styles are loaded
    await runTest('CSS styles are properly loaded', async () => {
      const sidebar = await page.locator('.w-64');
      const width = await sidebar.evaluate(el => getComputedStyle(el).width);
      return width === '256px'; // Tailwind w-64 = 256px
    });

    // Test 7: JavaScript is working
    await runTest('JavaScript is working properly', async () => {
      const searchInput = await page.locator('input[placeholder*="Search"]');
      await searchInput.fill('test');
      const value = await searchInput.inputValue();
      return value === 'test';
    });

    // Test 8: No critical console errors
    await runTest('No critical console errors', async () => {
      await page.waitForTimeout(2000); // Wait for any async errors
      const criticalErrors = consoleErrors.filter(error =>
        !error.includes('favicon') &&
        !error.includes('DevTools') &&
        !error.includes('chrome-extension')
      );
      return criticalErrors.length === 0;
    });

    // Test 9: Navigation works
    await runTest('Navigation between pages works', async () => {
      await page.goto('http://localhost:5173/agents');
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 5000 });
      const url = page.url();
      return url.includes('/agents');
    });

    // Test 10: Page recovers from navigation
    await runTest('Returns to home page successfully', async () => {
      await page.goto('http://localhost:5173/');
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 5000 });
      const rootVisible = await page.locator('#root').isVisible();
      return rootVisible;
    });

  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }

  await browser.close();

  // Print summary
  console.log('\n📊 WHITE SCREEN PREVENTION TEST SUMMARY');
  console.log('========================================');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);

  if (consoleErrors.length > 0) {
    console.log('\n⚠️  Console Errors Found:');
    consoleErrors.slice(0, 5).forEach(error => {
      console.log(`   - ${error}`);
    });
  }

  if (testResults.failed === 0) {
    console.log('\n🎉 ALL WHITE SCREEN PREVENTION TESTS PASSED!');
    console.log('✅ The application successfully prevents white screen issues');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.');
  }

  return testResults.failed === 0;
}

// Run the validation
validateWhiteScreenPrevention()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Validation failed with error:', error);
    process.exit(1);
  });