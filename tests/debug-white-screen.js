// Debug White Screen Issue - Deep Investigation
const { chromium } = require('playwright');

async function debugWhiteScreen() {
  console.log('🔍 DEBUGGING WHITE SCREEN ISSUE - Deep Investigation...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console errors
  const consoleErrors = [];
  const networkErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  page.on('response', response => {
    if (!response.ok()) {
      networkErrors.push(`${response.status()} - ${response.url()}`);
    }
  });
  
  try {
    console.log('🌐 Step 1: Loading page and analyzing...');
    
    // Go to the page
    await page.goto('http://localhost:3001', { 
      waitUntil: 'networkidle',
      timeout: 15000 
    });
    
    console.log('📄 Step 2: Checking HTML structure...');
    
    // Check basic HTML elements
    const hasRoot = await page.locator('#root').isVisible();
    const hasTitle = await page.title();
    const bodyText = await page.locator('body').textContent();
    
    console.log(`   Root div exists: ${hasRoot}`);
    console.log(`   Page title: "${hasTitle}"`);
    console.log(`   Body text length: ${bodyText.length} characters`);
    
    if (bodyText.length < 50) {
      console.log(`   Body text: "${bodyText}"`);
      console.log('   ❌ Body is nearly empty - React not mounting!');
    }
    
    console.log('⚛️  Step 3: Testing React mounting...');
    
    // Wait for React to potentially mount
    await page.waitForTimeout(5000);
    
    // Check for React-specific elements
    const hasReactContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    });
    
    console.log(`   React content mounted: ${hasReactContent}`);
    
    if (!hasReactContent) {
      console.log('   ❌ React app is not mounting - this is the white screen cause!');
      
      // Check for script loading errors
      const scripts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('script')).map(s => ({
          src: s.src,
          type: s.type,
          loaded: s.readyState || 'unknown'
        }));
      });
      
      console.log('   📜 Scripts on page:');
      scripts.forEach(script => {
        console.log(`     ${script.src || 'inline'} (${script.type || 'text/javascript'})`);
      });
    }
    
    console.log('🚨 Step 4: Console errors...');
    if (consoleErrors.length > 0) {
      console.log(`   Found ${consoleErrors.length} console errors:`);
      consoleErrors.forEach((error, i) => {
        console.log(`     ${i + 1}. ${error}`);
      });
    } else {
      console.log('   ✅ No console errors detected');
    }
    
    console.log('🌐 Step 5: Network errors...');
    if (networkErrors.length > 0) {
      console.log(`   Found ${networkErrors.length} network errors:`);
      networkErrors.forEach((error, i) => {
        console.log(`     ${i + 1}. ${error}`);
      });
    } else {
      console.log('   ✅ No network errors detected');
    }
    
    console.log('🔎 Step 6: Testing API directly...');
    
    try {
      // Test API through the page context
      const apiTest = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/v1/agent-posts');
          const data = await response.json();
          return {
            success: true,
            status: response.status,
            posts: data.data?.length || 0
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });
      
      console.log(`   API test result: ${JSON.stringify(apiTest)}`);
    } catch (error) {
      console.log(`   API test failed: ${error.message}`);
    }
    
    console.log('📸 Step 7: Taking diagnostic screenshot...');
    await page.screenshot({ 
      path: '/workspaces/agent-feed/tests/debug-white-screen.png',
      fullPage: true 
    });
    console.log('   Screenshot saved: debug-white-screen.png');
    
    console.log('🔧 Step 8: Attempting manual React check...');
    
    // Try to find any React-related errors or issues
    const reactDiagnostic = await page.evaluate(() => {
      const diagnostics = {
        hasReact: typeof React !== 'undefined',
        hasReactDOM: typeof ReactDOM !== 'undefined',
        rootElement: !!document.getElementById('root'),
        rootChildren: document.getElementById('root')?.children.length || 0,
        documentReady: document.readyState,
        scripts: document.querySelectorAll('script').length,
        errors: window.console?.memory || 'No console info'
      };
      
      return diagnostics;
    });
    
    console.log('   React diagnostics:');
    Object.entries(reactDiagnostic).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`);
    });
    
    // Final diagnosis
    console.log('\n🏁 DIAGNOSIS:');
    
    if (!hasReactContent) {
      console.log('❌ ISSUE CONFIRMED: React app is not mounting');
      console.log('   Possible causes:');
      console.log('   - JavaScript errors preventing React from loading');
      console.log('   - Missing dependencies or import errors');
      console.log('   - Vite development server configuration issues');
      console.log('   - Module resolution problems');
      
      if (consoleErrors.length > 0) {
        console.log('   - Console errors detected (see above)');
      }
      
      if (networkErrors.length > 0) {
        console.log('   - Network loading errors detected');
      }
    } else {
      console.log('✅ React is mounting correctly');
      console.log('   The issue might be in the component rendering logic');
    }
    
    return {
      reactMounted: hasReactContent,
      hasErrors: consoleErrors.length > 0 || networkErrors.length > 0,
      consoleErrors,
      networkErrors
    };
    
  } catch (error) {
    console.log(`❌ Debug failed: ${error.message}`);
    return { error: error.message };
  } finally {
    await browser.close();
  }
}

debugWhiteScreen().then(result => {
  console.log(`\n🎯 DEBUG RESULT: ${result.reactMounted ? 'REACT WORKING' : 'REACT NOT MOUNTING'}`);
  if (result.hasErrors) {
    console.log('🚨 Errors found - need to fix these first!');
  }
});