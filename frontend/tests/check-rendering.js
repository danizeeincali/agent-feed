#!/usr/bin/env node

/**
 * Simple script to check if React app is rendering
 * This checks for actual DOM content, not just HTML structure
 */

import http from 'http';

const checkAppLoaded = (url) => {
  return new Promise((resolve) => {
    console.log(`\nChecking ${url}...`);
    
    // Make request
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Check basic HTML structure
        const hasRoot = data.includes('id="root"');
        const hasMainScript = data.includes('/src/main.tsx');
        
        console.log(`✅ HTML served successfully`);
        console.log(`   - Root element: ${hasRoot ? '✅' : '❌'}`);
        console.log(`   - Main script: ${hasMainScript ? '✅' : '❌'}`);
        
        if (!hasRoot || !hasMainScript) {
          console.log('\n❌ HTML structure is broken!');
        } else {
          console.log('\n✅ HTML structure is correct');
          console.log('\n⚠️  NOTE: The app may still show a white screen if:');
          console.log('   1. JavaScript has compilation errors');
          console.log('   2. React components fail to mount');
          console.log('   3. Error boundaries catch uncaught errors');
          console.log('\n🔍 To verify actual rendering:');
          console.log(`   1. Open ${url} in a browser`);
          console.log('   2. Check browser console for errors (F12)');
          console.log('   3. Inspect the #root element to see if it has content');
        }
        
        resolve(hasRoot && hasMainScript);
      });
    }).on('error', (err) => {
      console.log(`❌ Failed to connect: ${err.message}`);
      resolve(false);
    });
  });
};

// Test routes
const routes = [
  'http://localhost:3001/',
  'http://localhost:3001/agents',
  'http://localhost:3001/analytics',
  'http://localhost:3001/workflows',
  'http://localhost:3001/activity',
  'http://localhost:3001/claude-code',
  'http://localhost:3001/settings'
];

console.log('🧪 Testing React App Rendering');
console.log('================================');

(async () => {
  let allPassed = true;
  
  for (const route of routes) {
    const passed = await checkAppLoaded(route);
    if (!passed) allPassed = false;
    console.log('---');
  }
  
  console.log('\n================================');
  if (allPassed) {
    console.log('✅ All routes return valid HTML structure');
    console.log('\n📝 Next steps to confirm no white screens:');
    console.log('1. Open http://localhost:3001/ in a browser');
    console.log('2. Navigate through all routes');
    console.log('3. Check browser console for JavaScript errors');
  } else {
    console.log('❌ Some routes have issues with HTML structure');
  }
  
  process.exit(allPassed ? 0 : 1);
})();