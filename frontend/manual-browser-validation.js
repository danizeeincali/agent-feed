#!/usr/bin/env node

import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function performVisualValidation() {
  console.log('🚀 Starting browser-based validation...');
  
  let browser;
  let validationResults = {
    timestamp: new Date().toISOString(),
    url: 'http://localhost:5173',
    tests: []
  };

  try {
    // Launch browser
    console.log('🌐 Launching browser...');
    browser = await chromium.launch({ 
      headless: true, // Run in headless mode for CI environment
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();

    // Listen for console messages
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
      console.log(`📝 Console [${msg.type()}]:`, msg.text());
    });

    // Listen for errors
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      console.log('❌ Page Error:', error.message);
    });

    console.log('🔗 Navigating to application...');
    
    // Test 1: Navigate to application
    const test1 = { name: 'Navigation Test', passed: false, details: {} };
    try {
      await page.goto('http://localhost:5173', { 
        waitUntil: 'networkidle',
        timeout: 15000 
      });
      
      // Wait for React to mount
      await page.waitForTimeout(3000);
      
      test1.details.navigationSuccess = true;
      test1.passed = true;
      console.log('✅ Navigation successful');
    } catch (error) {
      test1.details.error = error.message;
      console.log('❌ Navigation failed:', error.message);
    }
    validationResults.tests.push(test1);

    // Test 2: Take screenshot and verify content
    const test2 = { name: 'Content Visibility Test', passed: false, details: {} };
    try {
      const screenshotPath = path.join(__dirname, 'validation-screenshot.png');
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });
      
      console.log(`📸 Screenshot saved to: ${screenshotPath}`);
      
      // Check if content exists
      const contentAnalysis = await page.evaluate(() => {
        const body = document.body;
        const root = document.querySelector('#root');
        const computedStyle = window.getComputedStyle(body);
        
        return {
          bodyText: body.textContent?.trim().length || 0,
          bodyHTML: body.innerHTML.length,
          backgroundColor: computedStyle.backgroundColor,
          rootExists: !!root,
          rootChildren: root ? root.children.length : 0,
          totalElements: document.querySelectorAll('*').length,
          visibleElements: Array.from(document.querySelectorAll('*')).filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          }).length,
          buttons: document.querySelectorAll('button').length,
          divs: document.querySelectorAll('div').length,
          hasWhiteBackground: computedStyle.backgroundColor === 'rgb(255, 255, 255)' || 
                           computedStyle.backgroundColor === 'white'
        };
      });

      test2.details = {
        screenshot: screenshotPath,
        contentAnalysis,
        hasContent: contentAnalysis.bodyText > 0 && contentAnalysis.rootChildren > 0,
        isNotWhiteScreen: !(contentAnalysis.hasWhiteBackground && contentAnalysis.bodyText === 0)
      };

      if (contentAnalysis.bodyText > 0 && contentAnalysis.rootChildren > 0) {
        test2.passed = true;
        console.log('✅ Content is visible - NOT a white screen!');
        console.log(`📊 Content stats: ${contentAnalysis.bodyText} chars, ${contentAnalysis.rootChildren} root children, ${contentAnalysis.visibleElements} visible elements`);
      } else {
        console.log('❌ Appears to be white screen or no content');
        console.log('📊 Content analysis:', contentAnalysis);
      }
    } catch (error) {
      test2.details.error = error.message;
      console.log('❌ Content check failed:', error.message);
    }
    validationResults.tests.push(test2);

    // Test 3: Test basic interactions
    const test3 = { name: 'Interaction Test', passed: false, details: {} };
    try {
      const buttons = await page.locator('button').all();
      const buttonCount = buttons.length;
      
      console.log(`🔘 Found ${buttonCount} buttons`);
      
      const buttonTests = [];
      for (let i = 0; i < Math.min(buttonCount, 3); i++) {
        try {
          const button = buttons[i];
          const buttonText = await button.textContent();
          const isVisible = await button.isVisible();
          const isEnabled = await button.isEnabled();
          
          buttonTests.push({
            index: i,
            text: buttonText?.trim(),
            visible: isVisible,
            enabled: isEnabled
          });

          if (isVisible && isEnabled) {
            console.log(`🖱️ Clicking button ${i}: "${buttonText?.trim()}"`);
            await button.click();
            await page.waitForTimeout(1000);
          }
        } catch (error) {
          buttonTests.push({
            index: i,
            error: error.message
          });
        }
      }

      test3.details = {
        buttonCount,
        buttonTests,
        interactionsPossible: buttonTests.some(b => b.visible && b.enabled)
      };

      if (buttonCount > 0) {
        test3.passed = true;
        console.log('✅ Found interactive elements');
      } else {
        console.log('⚠️ No buttons found for interaction');
      }
    } catch (error) {
      test3.details.error = error.message;
      console.log('❌ Interaction test failed:', error.message);
    }
    validationResults.tests.push(test3);

    // Test 4: Console error check
    const test4 = { name: 'Console Errors Check', passed: false, details: {} };
    try {
      const criticalErrors = consoleMessages.filter(msg => 
        msg.type === 'error' && 
        !msg.text.includes('favicon') &&
        !msg.text.includes('DevTools')
      );

      test4.details = {
        totalMessages: consoleMessages.length,
        consoleMessages: consoleMessages,
        pageErrors: pageErrors,
        criticalErrors: criticalErrors
      };

      if (criticalErrors.length === 0 && pageErrors.length === 0) {
        test4.passed = true;
        console.log('✅ No critical console errors found');
      } else {
        console.log(`❌ Found ${criticalErrors.length} critical errors and ${pageErrors.length} page errors`);
      }
    } catch (error) {
      test4.details.error = error.message;
    }
    validationResults.tests.push(test4);

    // Take final screenshot for documentation
    console.log('\n📸 Taking final validation screenshot...');
    const finalScreenshotPath = path.join(__dirname, 'final-validation-screenshot.png');
    await page.screenshot({ 
      path: finalScreenshotPath, 
      fullPage: true 
    });
    console.log(`📸 Final screenshot saved to: ${finalScreenshotPath}`);

  } catch (error) {
    console.error('💥 Validation failed:', error);
    validationResults.error = error.message;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Save results
  try {
    const reportPath = path.join(__dirname, 'validation-report.json');
    await fs.writeFile(reportPath, JSON.stringify(validationResults, null, 2));
    console.log(`📄 Validation report saved to: ${reportPath}`);
  } catch (error) {
    console.error('Failed to save report:', error);
  }

  // Generate summary
  const passedTests = validationResults.tests.filter(t => t.passed).length;
  const totalTests = validationResults.tests.length;
  
  console.log('\n🏁 VALIDATION SUMMARY:');
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests} tests`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED - White screen issue is RESOLVED!');
  } else {
    console.log('⚠️ Some tests failed - review the results');
  }

  return validationResults;
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  performVisualValidation()
    .then(results => {
      process.exit(results.tests.every(t => t.passed) ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation script failed:', error);
      process.exit(1);
    });
}

export { performVisualValidation };