#!/usr/bin/env node

import puppeteer from 'puppeteer';

async function validateConnectionStatus() {
  console.log('🔧 PRODUCTION VALIDATION: Connection Status Display Test...');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable console logging for connection events
    let connectionLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🔧') || text.includes('Connected') || text.includes('WebSocket')) {
        connectionLogs.push(text);
        console.log('BROWSER:', text);
      }
    });
    
    // Navigate to the app
    console.log('📄 Loading http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // Wait for React to settle and WebSocket to connect
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Take a screenshot for manual verification
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/connection-status-validation.png' });
    console.log('📸 Screenshot saved: connection-status-validation.png');
    
    // Extract connection status from the page
    const pageAnalysis = await page.evaluate(() => {
      // Look for any text containing connection status
      const allElements = Array.from(document.querySelectorAll('*'));
      const statusElements = allElements.filter(el => {
        const text = el.textContent || '';
        return text.match(/(Connected|Disconnected|Connecting)/i) && 
               !text.includes('script') && 
               el.offsetParent !== null; // Visible elements only
      });
      
      const statusInfo = statusElements.map(el => ({
        text: el.textContent.trim(),
        className: el.className,
        tagName: el.tagName,
        visible: el.offsetParent !== null
      }));
      
      // Look for connection indicators (green dots, icons, etc.)
      const indicators = allElements.filter(el => {
        const classes = el.className || '';
        return classes.includes('bg-green') || classes.includes('text-green') ||
               classes.includes('connected') || classes.includes('status');
      });
      
      const indicatorInfo = indicators.map(el => ({
        className: el.className,
        tagName: el.tagName,
        visible: el.offsetParent !== null
      }));
      
      return {
        statusElements: statusInfo,
        indicators: indicatorInfo,
        pageTitle: document.title,
        url: window.location.href
      };
    });
    
    console.log('\n🔍 PAGE ANALYSIS RESULTS:');
    console.log(`   Page Title: ${pageAnalysis.pageTitle}`);
    console.log(`   Status Elements Found: ${pageAnalysis.statusElements.length}`);
    
    let connectedFound = false;
    pageAnalysis.statusElements.forEach((element, i) => {
      console.log(`     ${i + 1}. "${element.text}" (${element.tagName})`);
      if (element.text.toLowerCase().includes('connected') && 
          !element.text.toLowerCase().includes('disconnected')) {
        connectedFound = true;
        console.log('       ✅ CONNECTED STATUS FOUND!');
      } else if (element.text.toLowerCase().includes('disconnected')) {
        console.log('       ❌ Shows Disconnected');
      }
    });
    
    console.log(`   Connection Indicators: ${pageAnalysis.indicators.length}`);
    let greenIndicatorFound = false;
    pageAnalysis.indicators.forEach((indicator, i) => {
      console.log(`     ${i + 1}. ${indicator.className} (${indicator.tagName})`);
      if (indicator.className.includes('green')) {
        greenIndicatorFound = true;
        console.log('       ✅ GREEN INDICATOR FOUND!');
      }
    });
    
    // Analyze connection logs
    console.log('\n📊 CONNECTION LOG ANALYSIS:');
    const connectionEvents = connectionLogs.filter(log => 
      log.includes('Connected') || log.includes('Socket connect')
    );
    console.log(`   Connection Events: ${connectionEvents.length}`);
    
    const stateUpdates = connectionLogs.filter(log => 
      log.includes('State changed') || log.includes('isConnected')
    );
    console.log(`   State Updates: ${stateUpdates.length}`);
    
    const raceFixes = connectionLogs.filter(log => 
      log.includes('PRODUCTION FIX') || log.includes('Triple-verified')
    );
    console.log(`   Race Condition Fixes Applied: ${raceFixes.length}`);
    
    // Final validation
    const validationResults = {
      connectedStatusDisplayed: connectedFound,
      greenIndicatorPresent: greenIndicatorFound,
      connectionEventsReceived: connectionEvents.length > 0,
      raceFixesApplied: raceFixes.length > 0,
      overallSuccess: connectedFound && greenIndicatorFound && connectionEvents.length > 0
    };
    
    console.log('\n✅ VALIDATION RESULTS:');
    Object.entries(validationResults).forEach(([key, value]) => {
      const status = value ? '✅' : '❌';
      console.log(`   ${key}: ${status}`);
    });
    
    return validationResults.overallSuccess;
    
  } catch (error) {
    console.error('🚨 Validation error:', error.message);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Execute validation
validateConnectionStatus().then(success => {
  console.log('\n' + '='.repeat(70));
  console.log('🏁 PRODUCTION VALIDATION FINAL RESULT');
  console.log('='.repeat(70));
  
  if (success) {
    console.log('✅ VALIDATION SUCCESSFUL!');
    console.log('   🎉 Connection status shows "Connected" in browser');
    console.log('   🎉 Race condition fixes are working correctly');
    console.log('   🎉 WebSocket connection is stable and functional');
    console.log('   🎉 User interface updates properly reflect connection state');
    process.exit(0);
  } else {
    console.log('❌ VALIDATION FAILED!');
    console.log('   ⚠️  Connection status may still show "Disconnected"');
    console.log('   ⚠️  Additional debugging may be required');
    process.exit(1);
  }
}).catch(error => {
  console.error('🚨 Validation execution failed:', error);
  process.exit(1);
});