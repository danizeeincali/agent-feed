import { chromium } from 'playwright';

async function validateRoutes() {
  console.log('🔍 Starting route navigation validation...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = {
    routes: {},
    consoleErrors: [],
    success: true
  };
  
  try {
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        results.consoleErrors.push(msg.text());
      }
    });
    
    // Test root route
    console.log('Testing route: /');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const rootContent = await page.textContent('body');
    results.routes['/'] = {
      loaded: true,
      hasContent: rootContent?.length > 20,
      content: rootContent?.substring(0, 100) || ''
    };
    console.log('✅ Root route loaded:', results.routes['/'].hasContent);
    
    // Check for navigation elements
    const navLinks = await page.$$eval('a', links => 
      links.map(link => ({
        href: link.href,
        text: link.textContent?.trim() || ''
      }))
    );
    
    console.log('Found navigation links:', navLinks.length);
    navLinks.forEach(link => console.log(`  - ${link.text}: ${link.href}`));
    
    // Try to navigate to /agents route directly
    console.log('Testing route: /agents');
    await page.goto('http://localhost:5173/agents', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const agentsContent = await page.textContent('body');
    results.routes['/agents'] = {
      loaded: true,
      hasContent: agentsContent?.length > 20,
      content: agentsContent?.substring(0, 100) || ''
    };
    console.log('✅ Agents route loaded:', results.routes['/agents'].hasContent);
    
    // Check URL state
    const currentUrl = page.url();
    console.log('Current URL after navigation:', currentUrl);
    
    // Test back to root
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    const backToRootUrl = page.url();
    console.log('Back to root URL:', backToRootUrl);
    
    console.log('\n🎯 ROUTE VALIDATION RESULTS:');
    console.log('Root route working:', results.routes['/'].hasContent);
    console.log('Agents route working:', results.routes['/agents'].hasContent);
    console.log('Console errors:', results.consoleErrors.length);
    
    if (results.consoleErrors.length > 0) {
      console.log('❌ Console errors found:');
      results.consoleErrors.forEach(error => console.log(`  - ${error}`));
    }
    
    // Overall success
    results.success = results.routes['/'].hasContent && results.routes['/agents'].hasContent;
    console.log('Overall routing status:', results.success ? '✅ SUCCESS' : '❌ ISSUES');
    
    return results;
    
  } catch (error) {
    console.error('❌ Route validation failed:', error.message);
    results.success = false;
    results.error = error.message;
    return results;
  } finally {
    await browser.close();
  }
}

validateRoutes().then(result => {
  console.log('\n📊 Final Results:', result);
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('Validation error:', error);
  process.exit(1);
});