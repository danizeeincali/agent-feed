/**
 * Simple test to verify the React app renders without errors
 */

import http from 'http';

function testAppRender(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        // Check if HTML contains root element
        const hasRoot = data.includes('<div id="root">');
        const hasScript = data.includes('src="/src/main.tsx"');
        const hasVite = data.includes('@vite/client');
        
        if (hasRoot && hasScript && hasVite) {
          resolve({
            success: true,
            message: 'HTML structure is correct',
            checks: {
              hasRoot,
              hasScript,
              hasVite
            }
          });
        } else {
          reject({
            success: false,
            message: 'HTML structure issues',
            checks: {
              hasRoot,
              hasScript,
              hasVite
            }
          });
        }
      });
    }).on('error', (err) => {
      reject({ success: false, message: err.message });
    });
  });
}

// Test the app
console.log('Testing React app rendering...\n');

testAppRender('http://localhost:3001/')
  .then(result => {
    console.log('✅ Root route test PASSED');
    console.log('  - HTML has root element:', result.checks.hasRoot);
    console.log('  - HTML has main script:', result.checks.hasScript);
    console.log('  - HTML has Vite client:', result.checks.hasVite);
    console.log('\n✅ App HTML structure is correct!');
    console.log('\n⚠️  Note: This test only checks HTML structure.');
    console.log('   To fully verify no white screen, open http://localhost:3001/ in a browser');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Root route test FAILED');
    console.error('  Error:', error.message || 'Unknown error');
    if (error.checks) {
      console.error('  - HTML has root element:', error.checks.hasRoot);
      console.error('  - HTML has main script:', error.checks.hasScript);
      console.error('  - HTML has Vite client:', error.checks.hasVite);
    }
    process.exit(1);
  });