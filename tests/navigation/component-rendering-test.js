#!/usr/bin/env node

/**
 * Component Rendering Test
 * Tests if React components are actually rendering content instead of white screens
 */

const puppeteer = require('puppeteer');

const routes = [
  { path: '/', name: 'Home Feed', expectedElements: ['[data-testid="social-media-feed"]', '.bg-white'] },
  { path: '/agents', name: 'Agent Manager', expectedElements: ['[data-testid="agent-manager"]', '.bg-white'] },
  { path: '/dual-instance', name: 'Dual Instance Dashboard', expectedElements: ['[data-testid="dual-instance"]', '.bg-white'] },
  { path: '/analytics', name: 'System Analytics', expectedElements: ['[data-testid="analytics"]', '.bg-white'] },
  { path: '/claude-code', name: 'Claude Code Panel', expectedElements: ['[data-testid="claude-code"]', '.bg-white'] },
  { path: '/workflows', name: 'Workflow Visualization', expectedElements: ['[data-testid="workflows"]', '.bg-white'] },
  { path: '/activity', name: 'Live Activity Feed', expectedElements: ['[data-testid="activity"]', '.bg-white'] },
  { path: '/settings', name: 'Settings Panel', expectedElements: ['[data-testid="settings"]', '.bg-white'] },
];

async function testComponentRendering() {
  console.log('🧪 COMPONENT RENDERING TEST');
  console.log('===============================');
  
  let browser;
  let allPassed = true;
  
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    for (const route of routes) {
      try {
        console.log(`\n📍 Testing: ${route.name} (${route.path})`);
        
        // Navigate to route
        const response = await page.goto(`http://localhost:3002${route.path}`, {
          waitUntil: 'networkidle0',
          timeout: 10000
        });
        
        // Check HTTP status
        const status = response.status();
        console.log(`   HTTP Status: ${status}`);
        
        if (status !== 200) {
          console.log(`   ❌ HTTP Error: ${status}`);
          allPassed = false;
          continue;
        }
        
        // Wait for React to render
        await page.waitForTimeout(2000);
        
        // Check for white screen (empty body)
        const bodyContent = await page.evaluate(() => {
          const body = document.body;
          const text = body.innerText.trim();
          const hasVisibleElements = body.querySelectorAll('*').length > 10;
          return { text, hasVisibleElements, elementCount: body.querySelectorAll('*').length };
        });
        
        console.log(`   Elements: ${bodyContent.elementCount}`);
        console.log(`   Has content: ${bodyContent.hasVisibleElements}`);
        console.log(`   Text length: ${bodyContent.text.length}`);
        
        // Check for React errors
        const errors = await page.evaluate(() => {
          return window.console ? window.console._errors || [] : [];
        });
        
        if (errors.length > 0) {
          console.log(`   ⚠️  Console Errors: ${errors.length}`);
        }
        
        // Check if components are actually rendered
        if (bodyContent.hasVisibleElements && bodyContent.text.length > 50) {
          console.log(`   ✅ ${route.name}: Components rendered`);
        } else {
          console.log(`   ❌ ${route.name}: White screen detected`);
          allPassed = false;
          
          // Take screenshot for debugging
          await page.screenshot({ 
            path: `/workspaces/agent-feed/tests/screenshots/${route.name.replace(/\s+/g, '-').toLowerCase()}-error.png`,
            fullPage: true 
          });
        }
        
      } catch (error) {
        console.log(`   ❌ ${route.name}: Error - ${error.message}`);
        allPassed = false;
      }
    }
    
  } catch (error) {
    console.error('Browser launch failed:', error.message);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  console.log('\n📊 SUMMARY');
  console.log('===========');
  console.log(`Overall result: ${allPassed ? '✅ All routes working' : '❌ Some routes have white screens'}`);
  
  return allPassed;
}

if (require.main === module) {
  testComponentRendering().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testComponentRendering };