#!/usr/bin/env node

/**
 * Quick script to check for JavaScript errors on the Agent Manager page
 */

const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    console.log('🔍 Checking Agent Manager page for errors...\n');
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Capture console messages
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });
    
    // Capture page errors
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });
    
    // Navigate to Agent Manager
    console.log('📄 Navigating to http://localhost:3001/agents...');
    await page.goto('http://localhost:3001/agents', {
      waitUntil: 'networkidle2',
      timeout: 10000
    });
    
    // Wait a bit for any async errors
    await page.waitForTimeout(2000);
    
    // Get page content
    const pageContent = await page.content();
    const bodyText = await page.$eval('body', el => el.textContent);
    
    // Check for specific elements
    const hasAgentManager = pageContent.includes('Agent Manager');
    const hasMainElement = await page.$('main') !== null;
    const hasSidebar = await page.$('nav') !== null;
    const hasCreateButton = pageContent.includes('Create Agent');
    
    console.log('\n📊 Page Analysis:');
    console.log('-------------------');
    console.log(`✓ Page loaded: ${pageContent.length > 0 ? 'Yes' : 'No'}`);
    console.log(`✓ Has <main> element: ${hasMainElement ? 'Yes' : 'No'}`);
    console.log(`✓ Has sidebar nav: ${hasSidebar ? 'Yes' : 'No'}`);
    console.log(`✓ Has "Agent Manager" text: ${hasAgentManager ? 'Yes' : 'No'}`);
    console.log(`✓ Has "Create Agent" button: ${hasCreateButton ? 'Yes' : 'No'}`);
    
    // Report console messages
    if (consoleMessages.length > 0) {
      console.log('\n📝 Console Messages:');
      console.log('-------------------');
      consoleMessages.forEach(msg => {
        const icon = msg.type === 'error' ? '❌' : 
                    msg.type === 'warning' ? '⚠️' : 
                    msg.type === 'log' ? '📄' : '📝';
        console.log(`${icon} [${msg.type}]: ${msg.text}`);
      });
    }
    
    // Report page errors
    if (pageErrors.length > 0) {
      console.log('\n❌ Page Errors:');
      console.log('-------------------');
      pageErrors.forEach(error => {
        console.log(`   ${error}`);
      });
    }
    
    // Check body content length
    console.log('\n📏 Content Info:');
    console.log('-------------------');
    console.log(`Body text length: ${bodyText.length} characters`);
    console.log(`Body preview: "${bodyText.substring(0, 200).replace(/\s+/g, ' ').trim()}..."`);
    
    // Try to find React root
    const hasReactRoot = await page.$('#root') !== null;
    console.log(`\n⚛️ React Status:`);
    console.log('-------------------');
    console.log(`Has #root element: ${hasReactRoot ? 'Yes' : 'No'}`);
    
    if (hasReactRoot) {
      const rootContent = await page.$eval('#root', el => el.innerHTML);
      console.log(`Root element has content: ${rootContent.length > 0 ? 'Yes' : 'No'}`);
      if (rootContent.length === 0) {
        console.log('⚠️  React root is empty - app may not be rendering');
      }
    }
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'agent-manager-debug.png', fullPage: true });
    console.log('\n📸 Screenshot saved as agent-manager-debug.png');
    
    // Final verdict
    console.log('\n🎯 Diagnosis:');
    console.log('-------------------');
    if (!hasMainElement && !hasAgentManager) {
      console.log('❌ The Agent Manager component is not rendering at all');
      console.log('   Possible causes:');
      console.log('   - React routing issue');
      console.log('   - Component import error');
      console.log('   - JavaScript error preventing render');
    } else if (hasMainElement && !hasAgentManager) {
      console.log('⚠️  Layout is rendering but Agent Manager content is missing');
      console.log('   Possible causes:');
      console.log('   - Component internal error');
      console.log('   - Data loading issue');
      console.log('   - Conditional rendering problem');
    } else {
      console.log('✅ Agent Manager appears to be rendering correctly');
    }
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();