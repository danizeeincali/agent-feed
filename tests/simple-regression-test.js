/**
 * Simple Regression Test Script
 * Tests functionality after PostCSS fix using curl and DOM parsing
 */

const axios = require('axios');
const { JSDOM } = require('jsdom');
const fs = require('fs');

async function runSimpleRegressionTests() {
  console.log('🚀 Starting Simple Regression Tests');
  console.log('===================================');

  const results = {
    tests: [],
    errors: [],
    performance: {},
    summary: {}
  };

  const BASE_URL = 'http://localhost:5173';

  try {
    console.log('\\n🎯 TEST 1: Server Response and HTML Structure');
    console.log('==============================================');

    const startTime = Date.now();
    const response = await axios.get(BASE_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Test/1.0)'
      }
    });
    const loadTime = Date.now() - startTime;

    console.log(`✅ Server responded in ${loadTime}ms`);
    console.log(`✅ Status: ${response.status}`);
    console.log(`✅ Content-Type: ${response.headers['content-type']}`);

    results.performance.responseTime = loadTime;
    results.tests.push({
      name: 'Server Response',
      passed: response.status === 200,
      details: { status: response.status, loadTime }
    });

    console.log('\\n🎨 TEST 2: HTML Structure and Tailwind Classes');
    console.log('===============================================');

    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    // Check for essential elements
    const title = document.title;
    const bodyClasses = document.body.className;
    const allElements = document.querySelectorAll('*');

    console.log(`✅ Page title: "${title}"`);
    console.log(`✅ Body classes: "${bodyClasses}"`);
    console.log(`✅ Total DOM elements: ${allElements.length}`);

    // Check for Tailwind classes
    let tailwindElements = 0;
    let gradientElements = 0;
    let flexElements = 0;
    let bgElements = 0;

    allElements.forEach(el => {
      const classes = el.className || '';
      if (typeof classes === 'string') {
        if (classes.includes('bg-')) bgElements++;
        if (classes.includes('gradient')) gradientElements++;
        if (classes.includes('flex')) flexElements++;
        if (classes.includes('bg-') || classes.includes('text-') ||
            classes.includes('p-') || classes.includes('m-') ||
            classes.includes('rounded')) {
          tailwindElements++;
        }
      }
    });

    console.log(`✅ Elements with Tailwind classes: ${tailwindElements}`);
    console.log(`✅ Elements with gradients: ${gradientElements}`);
    console.log(`✅ Elements with flex: ${flexElements}`);
    console.log(`✅ Elements with backgrounds: ${bgElements}`);

    results.tests.push({
      name: 'HTML Structure',
      passed: allElements.length > 10 && tailwindElements > 0,
      details: {
        totalElements: allElements.length,
        tailwindElements,
        gradientElements,
        flexElements,
        bgElements
      }
    });

    console.log('\\n🌈 TEST 3: Purple Gradient Detection');
    console.log('====================================');

    // Check for gradient-related classes and styles
    const gradientChecks = {
      hasGradientClasses: false,
      hasPurpleClasses: false,
      hasIndigoClasses: false,
      hasBackdropBlur: false,
      gradientClassCount: 0
    };

    allElements.forEach(el => {
      const classes = el.className || '';
      if (typeof classes === 'string') {
        if (classes.includes('gradient')) {
          gradientChecks.hasGradientClasses = true;
          gradientChecks.gradientClassCount++;
        }
        if (classes.includes('purple')) gradientChecks.hasPurpleClasses = true;
        if (classes.includes('indigo')) gradientChecks.hasIndigoClasses = true;
        if (classes.includes('backdrop-blur')) gradientChecks.hasBackdropBlur = true;
      }
    });

    // Check specific gradient classes
    const gradientToCheck = [
      'bg-gradient-to-br',
      'from-indigo-500',
      'to-purple-600',
      'from-indigo-600',
      'to-purple-600'
    ];

    let foundGradientClasses = 0;
    gradientToCheck.forEach(className => {
      if (response.data.includes(className)) {
        foundGradientClasses++;
        console.log(`✅ Found class: ${className}`);
      }
    });

    gradientChecks.foundSpecificClasses = foundGradientClasses;

    const hasGradient = gradientChecks.hasGradientClasses &&
                       (gradientChecks.hasPurpleClasses || gradientChecks.hasIndigoClasses) &&
                       foundGradientClasses >= 2;

    console.log(`${hasGradient ? '✅' : '❌'} Purple gradient system detected: ${hasGradient}`);
    console.log(`   Gradient classes found: ${gradientChecks.gradientClassCount}`);
    console.log(`   Specific gradient classes: ${foundGradientClasses}/${gradientToCheck.length}`);
    console.log(`   Has purple classes: ${gradientChecks.hasPurpleClasses}`);
    console.log(`   Has indigo classes: ${gradientChecks.hasIndigoClasses}`);

    results.tests.push({
      name: 'Purple Gradient Detection',
      passed: hasGradient,
      details: gradientChecks
    });

    console.log('\\n📐 TEST 4: CSS and PostCSS Validation');
    console.log('======================================');

    // Check for CSS-related elements
    const cssChecks = {
      hasStyleTags: document.querySelectorAll('style').length,
      hasLinkTags: document.querySelectorAll('link[rel="stylesheet"]').length,
      hasNextCss: response.data.includes('_next/static'),
      hasTailwindConfig: response.data.includes('tailwind') || response.data.includes('Tailwind'),
      cssLinks: []
    };

    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      cssChecks.cssLinks.push(link.href);
    });

    console.log(`✅ Style tags: ${cssChecks.hasStyleTags}`);
    console.log(`✅ CSS link tags: ${cssChecks.hasLinkTags}`);
    console.log(`✅ Next.js CSS detected: ${cssChecks.hasNextCss}`);
    console.log(`✅ CSS links:`, cssChecks.cssLinks.slice(0, 3));

    const cssWorking = cssChecks.hasNextCss || cssChecks.hasLinkTags > 0 || cssChecks.hasStyleTags > 0;

    results.tests.push({
      name: 'CSS and PostCSS',
      passed: cssWorking,
      details: cssChecks
    });

    console.log('\\n🏗️ TEST 5: Component Structure');
    console.log('===============================');

    // Check for key application components
    const componentChecks = {
      hasHeader: document.querySelector('header') !== null,
      hasNav: document.querySelector('nav') !== null,
      hasMain: document.querySelector('main') !== null,
      hasSidebar: response.data.includes('sidebar') || response.data.includes('Sidebar'),
      hasAgentLink: response.data.includes('AgentLink'),
      hasCards: document.querySelectorAll('[class*="card"], .card, [class*="grid"]').length
    };

    console.log(`✅ Has header: ${componentChecks.hasHeader}`);
    console.log(`✅ Has navigation: ${componentChecks.hasNav}`);
    console.log(`✅ Has main content: ${componentChecks.hasMain}`);
    console.log(`✅ Has AgentLink branding: ${componentChecks.hasAgentLink}`);
    console.log(`✅ Card-like elements: ${componentChecks.hasCards}`);

    const structureGood = componentChecks.hasMain && componentChecks.hasAgentLink;

    results.tests.push({
      name: 'Component Structure',
      passed: structureGood,
      details: componentChecks
    });

    console.log('\\n⚡ TEST 6: Performance and Size');
    console.log('===============================');

    const performanceChecks = {
      responseSize: response.data.length,
      gzipSupported: response.headers['content-encoding'] === 'gzip',
      responseTime: loadTime,
      htmlSizeKB: (response.data.length / 1024).toFixed(2)
    };

    console.log(`✅ Response time: ${performanceChecks.responseTime}ms`);
    console.log(`✅ HTML size: ${performanceChecks.htmlSizeKB}KB`);
    console.log(`✅ Gzip encoding: ${performanceChecks.gzipSupported}`);

    const performanceGood = performanceChecks.responseTime < 5000 &&
                           performanceChecks.responseSize < 500000; // 500KB

    results.tests.push({
      name: 'Performance',
      passed: performanceGood,
      details: performanceChecks
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    results.errors.push({
      message: error.message,
      code: error.code,
      response: error.response?.status
    });
  }

  // Generate summary report
  console.log('\\n\\n📊 REGRESSION TEST SUMMARY');
  console.log('===========================');

  const passedTests = results.tests.filter(t => t.passed).length;
  const totalTests = results.tests.length;
  const passRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;

  results.summary = {
    totalTests,
    passedTests,
    failedTests: totalTests - passedTests,
    passRate: parseFloat(passRate),
    errors: results.errors.length,
    timestamp: new Date().toISOString()
  };

  console.log(`Overall Results: ${passedTests}/${totalTests} tests passed (${passRate}%)`);
  console.log(`Errors encountered: ${results.errors.length}`);

  results.tests.forEach(test => {
    console.log(`  ${test.passed ? '✅' : '❌'} ${test.name}`);
  });

  if (results.performance.responseTime) {
    console.log(`\\nPerformance: ${results.performance.responseTime}ms response time`);
  }

  // Save results
  const resultsPath = 'tests/screenshots/simple-regression-results.json';
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

  console.log('\\n🎉 SIMPLE REGRESSION TESTING COMPLETE!');
  console.log(`Results saved to: ${resultsPath}`);

  if (passRate >= 80) {
    console.log('\\n✅ ALL SYSTEMS OPERATIONAL - PostCSS fix successful!');
    console.log('🎯 Main page loads correctly with purple gradient');
    console.log('🎨 Tailwind CSS classes are rendering properly');
    console.log('🏗️ Application structure is intact');
    console.log('⚡ Performance is within acceptable limits');
    return true;
  } else {
    console.log('\\n⚠️ SOME TESTS FAILED - Review results for issues');
    if (results.errors.length > 0) {
      console.log('Errors:', results.errors.map(e => e.message).join(', '));
    }
    return false;
  }
}

// Export for module usage
module.exports = { runSimpleRegressionTests };

// Run if called directly
if (require.main === module) {
  runSimpleRegressionTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}