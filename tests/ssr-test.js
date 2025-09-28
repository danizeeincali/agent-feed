#!/usr/bin/env node

/**
 * SSR Test for BrowserRouter Fix
 * Tests that the dynamic import with ssr: false prevents SSR issues
 */

const { spawn } = require('child_process');
const http = require('http');

async function testSSR() {
  console.log('🚀 Starting SSR test for BrowserRouter fix...\n');

  // Start Next.js server
  console.log('📦 Starting Next.js server...');
  const server = spawn('npm', ['run', 'dev'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  let serverReady = false;
  let hasErrors = false;

  // Monitor server output for errors
  server.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Ready in')) {
      serverReady = true;
      console.log('✅ Server ready!');
    }
    if (output.includes('document is not defined') ||
        output.includes('window is not defined') ||
        output.includes('ReferenceError')) {
      hasErrors = true;
      console.error('❌ SSR Error detected:', output);
    }
  });

  server.stderr.on('data', (data) => {
    const output = data.toString();
    if (output.includes('document is not defined') ||
        output.includes('window is not defined') ||
        output.includes('ReferenceError')) {
      hasErrors = true;
      console.error('❌ SSR Error detected:', output);
    }
  });

  // Wait for server to be ready
  await new Promise((resolve) => {
    const checkReady = setInterval(() => {
      if (serverReady || hasErrors) {
        clearInterval(checkReady);
        resolve();
      }
    }, 100);
  });

  if (hasErrors) {
    console.error('❌ SSR test failed - errors detected during server startup');
    server.kill();
    process.exit(1);
  }

  // Wait a bit more for full startup
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test homepage request
  console.log('🌐 Testing homepage request...');

  try {
    const response = await new Promise((resolve, reject) => {
      const req = http.get('http://localhost:3002/', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Request timeout')));
    });

    console.log(`📊 Response status: ${response.status}`);

    if (response.status === 200) {
      console.log('✅ Homepage loads successfully');

      // Check for loading spinner in SSR HTML
      if (response.data.includes('Loading AgentLink...')) {
        console.log('✅ Loading spinner present in SSR HTML');
      } else {
        console.log('⚠️  Loading spinner not found in SSR HTML');
      }

      // Check that BrowserRouter isn't causing issues
      if (!response.data.includes('document is not defined') &&
          !response.data.includes('window is not defined')) {
        console.log('✅ No SSR errors in response HTML');
      } else {
        console.log('❌ SSR errors found in response HTML');
        hasErrors = true;
      }
    } else {
      console.error(`❌ Homepage request failed with status: ${response.status}`);
      hasErrors = true;
    }

  } catch (error) {
    console.error('❌ Homepage request failed:', error.message);
    hasErrors = true;
  }

  // Cleanup
  server.kill();

  console.log('\n🏁 SSR test completed');

  if (hasErrors) {
    console.log('❌ SSR test FAILED - BrowserRouter SSR issues detected');
    process.exit(1);
  } else {
    console.log('✅ SSR test PASSED - BrowserRouter SSR fix successful');
    process.exit(0);
  }
}

// Run test
testSSR().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});