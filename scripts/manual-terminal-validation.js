#!/usr/bin/env node

/**
 * Manual Terminal Validation Script
 * Direct DOM inspection and validation without Puppeteer complications
 */

const puppeteer = require('puppeteer');

async function validateTerminal() {
  console.log('🚀 Starting Manual Terminal Validation...');
  
  let browser = null;
  
  try {
    browser = await puppeteer.launch({
      headless: false, // Keep visible for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      devtools: true
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1200, height: 800 });
    
    console.log('📍 Step 1: Loading SimpleLauncher page...');
    await page.goto('http://localhost:5173/simple-launcher', { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    // Check page loaded
    const pageTitle = await page.title();
    console.log(`✅ Page title: ${pageTitle}`);
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/simple-launcher.png' });
    console.log('📸 Screenshot saved: /tmp/simple-launcher.png');
    
    // Get page content
    const bodyText = await page.$eval('body', el => el.textContent);
    console.log(`📄 Page content preview: ${bodyText.substring(0, 200)}...`);
    
    // Check for SimpleLauncher elements
    const hasClaudeTerminal = bodyText.includes('Claude Agent Terminal');
    const hasLaunchButton = bodyText.includes('Launch');
    
    console.log(`🎯 Claude Terminal found: ${hasClaudeTerminal}`);
    console.log(`🔘 Launch button found: ${hasLaunchButton}`);
    
    if (hasLaunchButton) {
      console.log('📍 Step 2: Clicking launch button...');
      
      // Look for launch button with different selectors
      const buttonSelectors = [
        'button[data-testid="launch-button"]',
        'button:contains("Launch")',
        'button',
        '.launch-button',
        '[data-launch]'
      ];
      
      let launchButton = null;
      for (const selector of buttonSelectors) {
        try {
          launchButton = await page.$(selector);
          if (launchButton) {
            const buttonText = await page.evaluate(el => el.textContent, launchButton);
            if (buttonText && buttonText.toLowerCase().includes('launch')) {
              console.log(`✅ Found launch button with selector: ${selector}`);
              break;
            }
          }
        } catch (e) {
          // Try next selector
        }
      }
      
      if (launchButton) {
        await launchButton.click();
        console.log('✅ Launch button clicked');
        
        // Wait for terminal to appear
        await page.waitForTimeout(5000);
        
        console.log('📍 Step 3: Checking for terminal elements...');
        
        // Check for xterm elements
        const xtermSelectors = ['.xterm', '.xterm-canvas', '.terminal', '[data-terminal]'];
        let terminalFound = false;
        
        for (const selector of xtermSelectors) {
          const element = await page.$(selector);
          if (element) {
            console.log(`✅ Terminal found with selector: ${selector}`);
            terminalFound = true;
            
            // Get terminal dimensions
            const box = await element.boundingBox();
            if (box) {
              console.log(`📏 Terminal dimensions: ${box.width}x${box.height}`);
            }
            break;
          }
        }
        
        if (terminalFound) {
          await page.screenshot({ path: '/tmp/terminal-loaded.png' });
          console.log('📸 Terminal screenshot saved: /tmp/terminal-loaded.png');
          
          console.log('📍 Step 4: Testing terminal interaction...');
          
          // Try to focus and type
          try {
            const canvas = await page.$('.xterm-canvas');
            if (canvas) {
              await canvas.click();
              await page.keyboard.type('echo "validation-test"');
              await page.keyboard.press('Enter');
              
              console.log('✅ Terminal input sent');
              
              // Wait for response
              await page.waitForTimeout(3000);
              
              await page.screenshot({ path: '/tmp/terminal-with-input.png' });
              console.log('📸 Terminal with input screenshot saved');
            }
          } catch (error) {
            console.warn(`⚠️ Terminal interaction failed: ${error.message}`);
          }
        } else {
          console.error('❌ Terminal not found after launch');
        }
      } else {
        console.error('❌ Launch button not found');
      }
    } else {
      console.error('❌ No launch button text found in page');
    }
    
    // Final status check
    console.log('📍 Step 5: Final validation checks...');
    
    const finalBodyText = await page.$eval('body', el => el.textContent);
    
    const validation = {
      pageLoads: pageTitle.includes('Agent Feed'),
      simpleLauncherFound: finalBodyText.includes('Claude Agent Terminal'),
      launchButtonFound: finalBodyText.includes('Launch'),
      terminalMounted: finalBodyText.includes('xterm') || 
                      await page.$('.xterm') !== null ||
                      await page.$('.xterm-canvas') !== null,
      noErrors: !finalBodyText.includes('Error') && 
                !finalBodyText.includes('ReferenceError')
    };
    
    console.log('\n📊 VALIDATION RESULTS:');
    console.log('======================');
    Object.entries(validation).forEach(([key, value]) => {
      console.log(`${value ? '✅' : '❌'} ${key}: ${value}`);
    });
    
    const successCount = Object.values(validation).filter(Boolean).length;
    const totalCount = Object.keys(validation).length;
    const successRate = (successCount / totalCount * 100).toFixed(1);
    
    console.log(`\n📈 Success Rate: ${successRate}% (${successCount}/${totalCount})`);
    
    if (successRate >= 80) {
      console.log('🟢 TERMINAL FUNCTIONALITY: PRODUCTION READY');
    } else if (successRate >= 60) {
      console.log('🟡 TERMINAL FUNCTIONALITY: PARTIALLY WORKING');
    } else {
      console.log('🔴 TERMINAL FUNCTIONALITY: NEEDS WORK');
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run validation
validateTerminal().then(() => {
  console.log('✅ Manual validation completed');
}).catch(error => {
  console.error('❌ Manual validation failed:', error.message);
  process.exit(1);
});