#!/usr/bin/env node

/**
 * HTML Content Test
 * Tests if routes return proper HTML content instead of white screens
 */

const { execSync } = require('child_process');

const routes = [
  { path: '/', name: 'Home Feed' },
  { path: '/agents', name: 'Agent Manager' },
  { path: '/dual-instance', name: 'Dual Instance Dashboard' },
  { path: '/analytics', name: 'System Analytics' },
  { path: '/claude-code', name: 'Claude Code Panel' },
  { path: '/workflows', name: 'Workflow Visualization' },
  { path: '/activity', name: 'Live Activity Feed' },
  { path: '/settings', name: 'Settings Panel' },
];

async function testHtmlContent() {
  console.log('🧪 HTML CONTENT TEST');
  console.log('=====================');
  
  let allPassed = true;
  
  for (const route of routes) {
    try {
      console.log(`\n📍 Testing: ${route.name} (${route.path})`);
      
      // Get HTML content
      const html = execSync(`curl -s http://localhost:3002${route.path}`, { 
        encoding: 'utf8', 
        timeout: 10000 
      });
      
      // Basic checks
      const hasHtml = html.includes('<html>') || html.includes('<!DOCTYPE html>');
      const hasHead = html.includes('<head>');
      const hasBody = html.includes('<body>');
      const hasReact = html.includes('id="root"') || html.includes('data-reactroot');
      const hasScript = html.includes('<script');
      const hasVite = html.includes('vite') || html.includes('src="/src/');
      
      console.log(`   HTML Structure: ${hasHtml ? '✅' : '❌'}`);
      console.log(`   Head section: ${hasHead ? '✅' : '❌'}`);
      console.log(`   Body section: ${hasBody ? '✅' : '❌'}`);
      console.log(`   React root: ${hasReact ? '✅' : '❌'}`);
      console.log(`   Scripts: ${hasScript ? '✅' : '❌'}`);
      console.log(`   Vite dev: ${hasVite ? '✅' : '❌'}`);
      console.log(`   Content length: ${html.length} characters`);
      
      // Check for error indicators
      const hasError = html.includes('Error') || html.includes('error') || html.includes('404');
      const hasWhiteScreen = html.length < 500 || (!hasReact && !hasScript);
      
      if (hasError) {
        console.log(`   ⚠️  Potential error in content`);
      }
      
      if (hasWhiteScreen) {
        console.log(`   ❌ Potential white screen (too little content)`);
        allPassed = false;
      } else if (hasHtml && hasBody && (hasReact || hasScript)) {
        console.log(`   ✅ ${route.name}: Proper HTML structure`);
      } else {
        console.log(`   ❌ ${route.name}: Missing essential elements`);
        allPassed = false;
      }
      
      // Check for React development indicators
      if (html.includes('development') || html.includes('react') || hasVite) {
        console.log(`   📱 React development mode detected`);
      }
      
    } catch (error) {
      console.log(`   ❌ ${route.name}: Request failed - ${error.message}`);
      allPassed = false;
    }
  }
  
  console.log('\n📊 SUMMARY');
  console.log('===========');
  console.log(`Overall result: ${allPassed ? '✅ All routes serving proper HTML' : '❌ Some routes have issues'}`);
  
  return allPassed;
}

// Additional manual test instructions
function printManualTestInstructions() {
  console.log('\n🔧 MANUAL TESTING INSTRUCTIONS');
  console.log('===============================');
  console.log('1. Open browser to http://localhost:3002');
  console.log('2. Check each route for content (not white screen):');
  routes.forEach((route, index) => {
    console.log(`   ${index + 1}. ${route.name}: http://localhost:3002${route.path}`);
  });
  console.log('3. Look for:');
  console.log('   - Visible content (not blank white screen)');
  console.log('   - No console errors in browser DevTools');
  console.log('   - Components loading properly');
  console.log('   - Navigation working between routes');
}

if (require.main === module) {
  testHtmlContent().then(success => {
    printManualTestInstructions();
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testHtmlContent };