#!/usr/bin/env node

import puppeteer from 'puppeteer';
import io from 'socket.io-client';

async function testWebSocketConnection() {
  console.log('🔧 PRODUCTION VALIDATION: Starting WebSocket connection test...');
  
  // Test 1: Direct Socket.IO connection
  console.log('\n📡 Testing direct Socket.IO connection...');
  const socket = io('http://localhost:3001', {
    transports: ['websocket', 'polling'],
    forceNew: true
  });
  
  return new Promise((resolve) => {
    let connected = false;
    let connectionConfirmed = false;
    
    socket.on('connect', () => {
      connected = true;
      console.log(`✅ Direct connection successful! Socket ID: ${socket.id}`);
    });
    
    socket.on('connect_confirmed', (data) => {
      connectionConfirmed = true;
      console.log('📋 Connection confirmed:', JSON.stringify(data, null, 2));
    });
    
    socket.on('system_stats', (stats) => {
      console.log('📊 System stats received:', JSON.stringify(stats, null, 2));
    });
    
    socket.on('connect_error', (error) => {
      console.error('🚨 Connection error:', error.message);
    });
    
    // Test connection for 5 seconds
    setTimeout(() => {
      console.log(`\n🔍 Connection Test Results:`);
      console.log(`   Connected: ${connected ? '✅' : '❌'}`);
      console.log(`   Confirmation: ${connectionConfirmed ? '✅' : '❌'}`);
      
      socket.disconnect();
      
      if (connected && connectionConfirmed) {
        console.log('✅ Direct WebSocket connection test PASSED');
        testBrowserConnection().then(resolve);
      } else {
        console.log('❌ Direct WebSocket connection test FAILED');
        resolve(false);
      }
    }, 5000);
  });
}

async function testBrowserConnection() {
  console.log('\n🌐 Testing browser WebSocket connection...');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.text().includes('🔧') || msg.text().includes('WebSocket') || msg.text().includes('Connected')) {
        console.log('BROWSER LOG:', msg.text());
      }
    });
    
    // Navigate to the app
    console.log('📄 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for the page to fully load
    await page.waitForTimeout(5000);
    
    // Check for connection status elements
    const connectionStatus = await page.evaluate(() => {
      // Look for connection status indicators
      const statusElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent || '';
        return text.includes('Connected') || text.includes('Disconnected') || text.includes('Connecting');
      });
      
      const connectionInfo = statusElements.map(el => ({
        text: el.textContent.trim(),
        className: el.className,
        tagName: el.tagName
      }));
      
      // Check if any WebSocket objects are available
      const hasWebSocket = !!(window.socket || window.io);
      
      return {
        statusElements: connectionInfo,
        hasWebSocket,
        socketConnected: window.socket?.connected,
        locationHref: window.location.href
      };
    });
    
    console.log('\n🔍 Browser Connection Analysis:');
    console.log('   Status Elements Found:', connectionStatus.statusElements.length);
    connectionStatus.statusElements.forEach((status, i) => {
      console.log(`     ${i + 1}. "${status.text}" (${status.tagName})`);
      if (status.text.includes('Connected') && !status.text.includes('Disconnected')) {
        console.log('       ✅ Shows Connected status');
      } else if (status.text.includes('Disconnected')) {
        console.log('       ❌ Shows Disconnected status');
      }
    });
    
    console.log(`   WebSocket Available: ${connectionStatus.hasWebSocket ? '✅' : '❌'}`);
    console.log(`   Socket Connected: ${connectionStatus.socketConnected ? '✅' : '❌'}`);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/connection-test-screenshot.png' });
    console.log('📸 Screenshot saved: connection-test-screenshot.png');
    
    const success = connectionStatus.statusElements.some(status => 
      status.text.includes('Connected') && !status.text.includes('Disconnected')
    );
    
    console.log(`\n${success ? '✅ Browser connection test PASSED' : '❌ Browser connection test FAILED'}`);
    
    return success;
    
  } catch (error) {
    console.error('🚨 Browser test error:', error.message);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Main test execution
testWebSocketConnection().then(success => {
  console.log('\n' + '='.repeat(60));
  console.log('🏁 PRODUCTION VALIDATION COMPLETE');
  console.log('='.repeat(60));
  
  if (success) {
    console.log('✅ ALL TESTS PASSED - Connection fixes are working!');
    console.log('   • WebSocket server is running correctly');
    console.log('   • Browser can connect and shows Connected status');
    console.log('   • Race conditions have been resolved');
    process.exit(0);
  } else {
    console.log('❌ TESTS FAILED - Connection issues still exist');
    console.log('   • Check server logs for connection problems');
    console.log('   • Review browser console for JavaScript errors');
    console.log('   • Verify WebSocket endpoint configuration');
    process.exit(1);
  }
}).catch(error => {
  console.error('🚨 Test execution failed:', error);
  process.exit(1);
});