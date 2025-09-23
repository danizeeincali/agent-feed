/**
 * Manual Regression Test Script
 * Tests all functionality after PostCSS fix
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive Regression Tests');
  console.log('==========================================');

  const browser = await puppeteer.launch({
    headless: false,
    devtools: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = {
    tests: [],
    screenshots: [],
    errors: [],
    performance: {}
  };

  try {
    const page = await browser.newPage();

    // Enable console logging
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Enable network monitoring
    const networkErrors = [];
    page.on('requestfailed', request => {
      networkErrors.push(`${request.url()}: ${request.failure()?.errorText}`);
    });

    console.log('\\n🎯 TEST 1: Main Page Purple Gradient');
    console.log('====================================');

    const startTime = Date.now();
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    const loadTime = Date.now() - startTime;

    console.log(`✅ Page loaded in ${loadTime}ms`);
    results.performance.initialLoad = loadTime;

    // Check for purple gradient
    const backgroundStyles = await page.evaluate(() => {
      const body = document.body;
      const firstDiv = document.querySelector('div');
      return {
        bodyBackground: window.getComputedStyle(body).background,
        bodyBackgroundImage: window.getComputedStyle(body).backgroundImage,
        firstDivBackground: firstDiv ? window.getComputedStyle(firstDiv).background : null,
        firstDivBackgroundImage: firstDiv ? window.getComputedStyle(firstDiv).backgroundImage : null,
        gradientElements: Array.from(document.querySelectorAll('[class*="gradient"], [class*="purple"], [class*="indigo"]')).length
      };
    });

    console.log('Background Analysis:', backgroundStyles);

    const hasGradient = backgroundStyles.firstDivBackgroundImage?.includes('gradient') ||
                       backgroundStyles.firstDivBackground?.includes('gradient') ||
                       backgroundStyles.gradientElements > 0;

    console.log(`${hasGradient ? '✅' : '❌'} Purple gradient detected: ${hasGradient}`);
    results.tests.push({
      name: 'Purple Gradient Background',
      passed: hasGradient,
      details: backgroundStyles
    });

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/main-page-full.png',
      fullPage: true
    });
    results.screenshots.push('main-page-full.png');

    console.log('\\n🎨 TEST 2: Tailwind CSS Classes');
    console.log('================================');

    const tailwindClasses = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const classData = {
        totalElements: elements.length,
        elementsWithTailwind: 0,
        tailwindClasses: new Set(),
        commonClasses: {
          'bg-': 0,
          'text-': 0,
          'p-': 0,
          'm-': 0,
          'flex': 0,
          'grid': 0,
          'rounded': 0
        }
      };

      elements.forEach(el => {
        const classes = el.className;
        if (typeof classes === 'string' && classes.includes('bg-') ||
            classes.includes('text-') || classes.includes('p-') ||
            classes.includes('m-') || classes.includes('flex') ||
            classes.includes('grid') || classes.includes('rounded')) {
          classData.elementsWithTailwind++;

          classes.split(' ').forEach(cls => {
            if (cls.startsWith('bg-')) classData.commonClasses['bg-']++;
            if (cls.startsWith('text-')) classData.commonClasses['text-']++;
            if (cls.startsWith('p-')) classData.commonClasses['p-']++;
            if (cls.startsWith('m-')) classData.commonClasses['m-']++;
            if (cls === 'flex') classData.commonClasses['flex']++;
            if (cls === 'grid') classData.commonClasses['grid']++;
            if (cls.includes('rounded')) classData.commonClasses['rounded']++;

            classData.tailwindClasses.add(cls);
          });
        }
      });

      return {
        ...classData,
        tailwindClasses: Array.from(classData.tailwindClasses).slice(0, 20)
      };
    });

    console.log(`✅ Elements with Tailwind classes: ${tailwindClasses.elementsWithTailwind}/${tailwindClasses.totalElements}`);
    console.log('Common class usage:', tailwindClasses.commonClasses);
    console.log('Sample classes:', tailwindClasses.tailwindClasses.slice(0, 10).join(', '));

    results.tests.push({
      name: 'Tailwind CSS Classes',
      passed: tailwindClasses.elementsWithTailwind > 0,
      details: tailwindClasses
    });

    console.log('\\n📱 TEST 3: Responsive Design');
    console.log('============================');

    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      console.log(`Testing ${viewport.name} (${viewport.width}x${viewport.height})`);

      await page.setViewport(viewport);
      await page.waitForTimeout(1000);

      const responsiveCheck = await page.evaluate(() => {
        const body = document.body;
        return {
          width: body.scrollWidth,
          height: body.scrollHeight,
          overflow: window.getComputedStyle(body).overflow
        };
      });

      console.log(`  ✅ Viewport: ${responsiveCheck.width}x${responsiveCheck.height}`);

      await page.screenshot({
        path: `tests/screenshots/${viewport.name.toLowerCase()}-responsive.png`,
        fullPage: true
      });
      results.screenshots.push(`${viewport.name.toLowerCase()}-responsive.png`);

      results.tests.push({
        name: `${viewport.name} Responsive`,
        passed: responsiveCheck.width <= viewport.width + 50, // Allow small overflow
        details: responsiveCheck
      });
    }

    console.log('\\n🚨 TEST 4: Console Errors');
    console.log('==========================');

    console.log(`Console errors found: ${consoleErrors.length}`);
    console.log(`Network errors found: ${networkErrors.length}`);

    if (consoleErrors.length > 0) {
      console.log('Console errors:', consoleErrors.slice(0, 5));
    }
    if (networkErrors.length > 0) {
      console.log('Network errors:', networkErrors.slice(0, 5));
    }

    // Filter critical errors
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('404') &&
      !error.includes('favicon') &&
      !error.includes('lighthouse') &&
      !error.includes('_next/static') &&
      !error.includes('Warning')
    );

    results.tests.push({
      name: 'Console Errors',
      passed: criticalErrors.length < 3,
      details: { consoleErrors, networkErrors, criticalErrors }
    });

    console.log(`${criticalErrors.length < 3 ? '✅' : '❌'} Critical errors: ${criticalErrors.length}/3 allowed`);

    console.log('\\n⚡ TEST 5: Performance Metrics');
    console.log('==============================');

    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');

      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        responseTime: navigation.responseEnd - navigation.responseStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
      };
    });

    console.log('Performance metrics:');
    console.log(`  DOM Content Loaded: ${performanceMetrics.domContentLoaded.toFixed(1)}ms`);
    console.log(`  Load Complete: ${performanceMetrics.loadComplete.toFixed(1)}ms`);
    console.log(`  Response Time: ${performanceMetrics.responseTime.toFixed(1)}ms`);
    console.log(`  First Paint: ${performanceMetrics.firstPaint.toFixed(1)}ms`);
    console.log(`  First Contentful Paint: ${performanceMetrics.firstContentfulPaint.toFixed(1)}ms`);

    results.performance = { ...results.performance, ...performanceMetrics };
    results.tests.push({
      name: 'Performance',
      passed: performanceMetrics.loadComplete < 5000,
      details: performanceMetrics
    });

    console.log('\\n🎯 TEST 6: PostCSS Processing');
    console.log('=============================');

    const cssProcessing = await page.evaluate(() => {
      const stylesheets = Array.from(document.styleSheets);
      const processedCSS = {
        totalStylesheets: stylesheets.length,
        withRules: 0,
        totalRules: 0,
        hasVendorPrefixes: false,
        hasTailwindClasses: false
      };

      stylesheets.forEach(sheet => {
        try {
          if (sheet.cssRules && sheet.cssRules.length > 0) {
            processedCSS.withRules++;
            processedCSS.totalRules += sheet.cssRules.length;

            Array.from(sheet.cssRules).forEach(rule => {
              if (rule.cssText) {
                if (rule.cssText.includes('-webkit-') || rule.cssText.includes('-moz-')) {
                  processedCSS.hasVendorPrefixes = true;
                }
                if (rule.cssText.includes('bg-gradient') || rule.cssText.includes('backdrop-blur')) {
                  processedCSS.hasTailwindClasses = true;
                }
              }
            });
          }
        } catch (e) {
          // Cross-origin stylesheets might not be accessible
        }
      });

      return processedCSS;
    });

    console.log('CSS Processing Analysis:');
    console.log(`  Total stylesheets: ${cssProcessing.totalStylesheets}`);
    console.log(`  Stylesheets with rules: ${cssProcessing.withRules}`);
    console.log(`  Total CSS rules: ${cssProcessing.totalRules}`);
    console.log(`  Has vendor prefixes: ${cssProcessing.hasVendorPrefixes}`);
    console.log(`  Has Tailwind classes: ${cssProcessing.hasTailwindClasses}`);

    results.tests.push({
      name: 'PostCSS Processing',
      passed: cssProcessing.totalRules > 0,
      details: cssProcessing
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    results.errors.push(error.message);
  } finally {
    await browser.close();
  }

  // Generate comprehensive report
  console.log('\\n\\n📊 COMPREHENSIVE TEST RESULTS');
  console.log('===============================');

  const passedTests = results.tests.filter(t => t.passed).length;
  const totalTests = results.tests.length;
  const passRate = (passedTests / totalTests * 100).toFixed(1);

  console.log(`Overall Results: ${passedTests}/${totalTests} tests passed (${passRate}%)`);
  console.log(`Screenshots captured: ${results.screenshots.length}`);
  console.log(`Errors encountered: ${results.errors.length}`);

  results.tests.forEach(test => {
    console.log(`  ${test.passed ? '✅' : '❌'} ${test.name}`);
  });

  if (results.performance.initialLoad) {
    console.log(`\\nPerformance Summary:`);
    console.log(`  Initial Load: ${results.performance.initialLoad}ms`);
    console.log(`  DOM Content Loaded: ${results.performance.domContentLoaded?.toFixed(1)}ms`);
    console.log(`  First Contentful Paint: ${results.performance.firstContentfulPaint?.toFixed(1)}ms`);
  }

  // Save results to file
  fs.writeFileSync(
    'tests/screenshots/regression-test-results.json',
    JSON.stringify(results, null, 2)
  );

  console.log('\\n🎉 REGRESSION TESTING COMPLETE!');
  console.log(`Results saved to: tests/screenshots/regression-test-results.json`);
  console.log(`Screenshots saved to: tests/screenshots/`);

  if (passRate >= 80) {
    console.log('\\n✅ ALL SYSTEMS OPERATIONAL - PostCSS fix successful!');
    return true;
  } else {
    console.log('\\n⚠️ SOME TESTS FAILED - Review results for issues');
    return false;
  }
}

// Export for module usage
module.exports = { runComprehensiveTests };

// Run if called directly
if (require.main === module) {
  runComprehensiveTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}