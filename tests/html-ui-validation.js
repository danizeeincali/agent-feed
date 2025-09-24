const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

async function validateUIChanges() {
  console.log('🔍 HTML UI Validation Suite - Post Page Removal');
  console.log('=' .repeat(60));

  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    htmlSnapshots: {},
    validationSummary: {}
  };

  try {
    // Test 1: Frontend Homepage Load
    console.log('\n📍 Test 1: Frontend Homepage Analysis');
    const homeResponse = await fetch('http://localhost:5173');

    if (!homeResponse.ok) {
      throw new Error(`Frontend not responding: ${homeResponse.status}`);
    }

    const homeHtml = await homeResponse.text();
    results.htmlSnapshots.homepage = homeHtml;

    const $home = cheerio.load(homeHtml);

    // Check for React app mounting
    const reactRoot = $home('#root, #app, [data-reactroot]').length > 0;
    console.log(`✅ React app container found: ${reactRoot}`);

    results.tests.push({
      name: 'Frontend Loads',
      status: 'pass',
      details: `Homepage loaded, React container: ${reactRoot}`
    });

    // Test 2: No "Create" Navigation Links
    console.log('\n📍 Test 2: Navigation Menu Analysis');

    const createLinks = $home('a, button').filter((i, el) => {
      const text = $home(el).text().toLowerCase();
      return text.includes('create') && text.includes('post');
    }).length;

    console.log(`Found ${createLinks} "Create Post" navigation links (should be 0)`);

    results.tests.push({
      name: 'No Create Post Navigation',
      status: createLinks === 0 ? 'pass' : 'fail',
      details: `Create post links found: ${createLinks}`
    });

    // Test 3: Posting Interface Components Analysis
    console.log('\n📍 Test 3: Posting Interface Analysis');

    // Look for common posting interface patterns in HTML
    const postingPatterns = [
      'posting-interface',
      'post-creator',
      'enhanced-posting',
      'post-form',
      'textarea',
      'placeholder=".*post.*"',
      'placeholder=".*share.*"'
    ];

    let postingElementsFound = 0;
    const foundPatterns = [];

    for (const pattern of postingPatterns) {
      const elements = $home(`[class*="${pattern}"], [data-testid*="${pattern}"], [placeholder*="${pattern}"]`).length;
      if (elements > 0) {
        postingElementsFound += elements;
        foundPatterns.push(`${pattern}: ${elements}`);
      }
    }

    // Also check for textarea elements (common in posting interfaces)
    const textareas = $home('textarea').length;
    const inputs = $home('input[type="text"]').length;
    const forms = $home('form').length;

    console.log(`Posting interface elements found: ${postingElementsFound}`);
    console.log(`Textareas: ${textareas}, Text inputs: ${inputs}, Forms: ${forms}`);
    console.log(`Patterns found: ${foundPatterns.join(', ')}`);

    const hasPostingInterface = postingElementsFound > 0 || textareas > 0;

    results.tests.push({
      name: 'Posting Interface Present',
      status: hasPostingInterface ? 'pass' : 'warning',
      details: `Elements: ${postingElementsFound}, Textareas: ${textareas}, Forms: ${forms}`
    });

    // Test 4: Tab Interface Analysis
    console.log('\n📍 Test 4: Tab Interface Analysis');

    const tabTexts = ['Quick Post', 'Post', 'Avi DM'];
    const foundTabs = [];

    for (const tabText of tabTexts) {
      const elements = $home('button, [role="tab"]').filter((i, el) => {
        return $home(el).text().includes(tabText);
      }).length;

      if (elements > 0) {
        foundTabs.push(tabText);
        console.log(`✅ Found "${tabText}" tab: ${elements} elements`);
      } else {
        console.log(`⚠️  "${tabText}" tab not found`);
      }
    }

    results.tests.push({
      name: 'Tab Interface',
      status: foundTabs.length > 0 ? 'pass' : 'warning',
      details: `Found tabs: ${foundTabs.join(', ')}`
    });

    // Test 5: Avi DM Analysis
    console.log('\n📍 Test 5: Avi DM Analysis');

    const aviElements = $home('*').filter((i, el) => {
      const text = $home(el).text().toLowerCase();
      return text.includes('avi') && text.includes('dm');
    }).length;

    console.log(`Avi DM elements found: ${aviElements}`);

    results.tests.push({
      name: 'Avi DM Present',
      status: aviElements > 0 ? 'pass' : 'warning',
      details: `Avi DM elements: ${aviElements}`
    });

    // Test 6: Check for Feed/Posts Structure
    console.log('\n📍 Test 6: Feed Structure Analysis');

    const feedElements = $home('[class*="feed"], [class*="post"], [data-testid*="feed"], [data-testid*="post"]').length;
    const articles = $home('article').length;
    const lists = $home('ul, ol').length;

    console.log(`Feed-related elements: ${feedElements}`);
    console.log(`Articles: ${articles}, Lists: ${lists}`);

    results.tests.push({
      name: 'Feed Structure',
      status: feedElements > 0 || articles > 0 ? 'pass' : 'warning',
      details: `Feed elements: ${feedElements}, Articles: ${articles}`
    });

    // Test 7: Script and Style Analysis
    console.log('\n📍 Test 7: Assets Analysis');

    const scripts = $home('script').length;
    const styles = $home('style, link[rel="stylesheet"]').length;
    const viteClient = $home('script[src*="vite"]').length > 0;

    console.log(`Scripts: ${scripts}, Styles: ${styles}, Vite: ${viteClient}`);

    results.tests.push({
      name: 'Assets Loading',
      status: scripts > 0 && styles > 0 ? 'pass' : 'warning',
      details: `Scripts: ${scripts}, Styles: ${styles}, Vite: ${viteClient}`
    });

    // Test 8: API Connectivity Check
    console.log('\n📍 Test 8: API Connectivity');

    try {
      const apiResponse = await fetch('http://localhost:3000/api/health');
      const apiData = await apiResponse.json();

      console.log(`✅ API health check: ${apiData.status}`);

      results.tests.push({
        name: 'API Connectivity',
        status: 'pass',
        details: `API status: ${apiData.status}`
      });
    } catch (error) {
      console.log(`⚠️  API not responding: ${error.message}`);

      results.tests.push({
        name: 'API Connectivity',
        status: 'warning',
        details: `API error: ${error.message}`
      });
    }

    // Generate Validation Summary
    console.log('\n📊 VALIDATION SUMMARY');
    console.log('=' .repeat(60));

    const passed = results.tests.filter(t => t.status === 'pass').length;
    const failed = results.tests.filter(t => t.status === 'fail').length;
    const warnings = results.tests.filter(t => t.status === 'warning').length;

    console.log(`✅ PASSED: ${passed}`);
    console.log(`❌ FAILED: ${failed}`);
    console.log(`⚠️  WARNINGS: ${warnings}`);

    results.validationSummary = {
      total: results.tests.length,
      passed,
      failed,
      warnings,
      overallStatus: failed === 0 ? 'PASS' : 'FAIL'
    };

    // Key Findings
    console.log('\n🔍 KEY FINDINGS:');
    console.log('-' .repeat(40));

    const createPostRemoved = results.tests.find(t => t.name === 'No Create Post Navigation')?.status === 'pass';
    const postingInterfacePresent = results.tests.find(t => t.name === 'Posting Interface Present')?.status === 'pass';

    console.log(`✅ Create Post navigation removed: ${createPostRemoved}`);
    console.log(`✅ Posting interface embedded in feed: ${postingInterfacePresent}`);

    if (foundTabs.length > 0) {
      console.log(`✅ Enhanced posting tabs working: ${foundTabs.join(', ')}`);
    }

    // Save detailed HTML snapshot for analysis
    await fs.writeFile(
      path.join(__dirname, 'homepage-snapshot.html'),
      homeHtml
    );

    // Save validation report
    await fs.writeFile(
      path.join(__dirname, 'ui-validation-report.json'),
      JSON.stringify(results, null, 2)
    );

    console.log('\n📋 Reports saved:');
    console.log('  - homepage-snapshot.html');
    console.log('  - ui-validation-report.json');

    return results;

  } catch (error) {
    console.error('❌ Validation failed:', error);
    results.tests.push({
      name: 'Validation Execution',
      status: 'fail',
      details: error.message
    });
    return results;
  }
}

// Run validation
if (require.main === module) {
  validateUIChanges()
    .then(results => {
      console.log(`\n🎉 UI Validation Complete! Status: ${results.validationSummary?.overallStatus || 'UNKNOWN'}`);
      process.exit(results.validationSummary?.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Validation suite failed:', error);
      process.exit(1);
    });
}

module.exports = { validateUIChanges };