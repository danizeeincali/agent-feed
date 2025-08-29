#!/usr/bin/env node

/**
 * Browser Automation Test for Frontend Status Updates
 * This simulates clicking the Create Instance button and checking if the UI updates
 */

const puppeteer = require('puppeteer');

async function testBrowserAutomation() {
  console.log('🎯 BROWSER AUTOMATION TEST');
  console.log('==========================\n');

  let browser;
  try {
    console.log('1️⃣ Launching browser...');
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      console.log(`   🖥️  BROWSER: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      console.log(`   ❌ PAGE ERROR: ${error.message}`);
    });

    console.log('2️⃣ Navigating to frontend...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    
    console.log('3️⃣ Waiting for page load...');
    await page.waitForTimeout(2000);

    console.log('4️⃣ Creating Claude instance...');
    
    // Check if button exists
    const createButton = await page.$('button:contains("Create Instance")');
    if (!createButton) {
      console.log('   ❌ Create Instance button not found');
      return false;
    }

    // Click create instance button
    await page.click('button:contains("Create Instance")');
    console.log('   ✅ Create Instance button clicked');

    // Wait for instance creation
    console.log('5️⃣ Monitoring instance status...');
    
    let statusFound = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!statusFound && attempts < maxAttempts) {
      await page.waitForTimeout(1000);
      attempts++;
      
      try {
        // Look for status indicators
        const statusElements = await page.$$eval('.instance-status, [class*="status"], [data-status]', elements => {
          return elements.map(el => ({
            text: el.textContent || el.innerText,
            className: el.className,
            dataset: el.dataset
          }));
        });
        
        if (statusElements.length > 0) {
          console.log(`   📊 Attempt ${attempts}: Found ${statusElements.length} status elements:`);
          statusElements.forEach((el, i) => {
            console.log(`      ${i + 1}. Text: "${el.text}", Class: "${el.className}"`);
          });
          
          // Check if any status shows "running"
          const runningStatus = statusElements.some(el => 
            el.text && (el.text.includes('running') || el.text.includes('Running'))
          );
          
          if (runningStatus) {
            console.log('   🎉 Found running status in UI!');
            statusFound = true;
          }
        } else {
          console.log(`   ⏱️  Attempt ${attempts}: No status elements found yet`);
        }
      } catch (error) {
        console.log(`   ⚠️  Error checking status: ${error.message}`);
      }
    }

    if (!statusFound) {
      console.log('   ❌ Status never updated to "running" in UI');
    }

    // Take screenshot for debugging
    await page.screenshot({ path: '/workspaces/agent-feed/tests/production-validation/browser-test.png' });
    console.log('   📸 Screenshot saved to browser-test.png');

    return statusFound;

  } catch (error) {
    console.error('❌ Browser automation failed:', error.message);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Check if puppeteer is available
async function checkPuppeteer() {
  try {
    require('puppeteer');
    return true;
  } catch (err) {
    console.log('Installing puppeteer...');
    require('child_process').execSync('npm install puppeteer', { stdio: 'inherit' });
    return false;
  }
}

// Run test
checkPuppeteer().then(available => {
  if (available) {
    testBrowserAutomation().then(success => {
      console.log(success ? '\n🎉 Browser test PASSED' : '\n❌ Browser test FAILED');
      process.exit(success ? 0 : 1);
    });
  } else {
    console.log('Please run the script again after puppeteer installation.');
  }
});