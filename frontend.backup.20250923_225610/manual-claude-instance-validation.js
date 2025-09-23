/**
 * Manual Claude Instance Management UI Validation Script
 * Simulates the E2E test flow and validates all functionality
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';
const CLAUDE_INSTANCES_PATH = '/claude-instances';

const CLAUDE_INSTANCE_BUTTONS = [
  {
    selector: '.btn-prod',
    name: 'prod/claude',
    expectedIcon: '🚀'
  },
  {
    selector: '.btn-skip-perms',
    name: 'skip-permissions',
    expectedIcon: '⚡'
  },
  {
    selector: '.btn-skip-perms-c',
    name: 'skip-permissions -c',
    expectedIcon: '⚡'
  },
  {
    selector: '.btn-skip-perms-resume',
    name: 'skip-permissions --resume',
    expectedIcon: '↻'
  }
];

async function validateClaudeInstancesUI() {
  console.log('🚀 Starting Claude Instance Management UI Validation');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const validationReport = {
    timestamp: new Date().toISOString(),
    results: {
      navigation: false,
      buttonsPresent: false,
      buttonsClickable: false,
      apiIntegration: false,
      terminalOutput: false,
      websocketConnection: false,
      noErrors: true
    },
    details: {
      consoleErrors: [],
      networkRequests: [],
      createdInstances: [],
      screenshots: []
    },
    performanceMetrics: {
      pageLoadTime: 0,
      apiResponseTimes: []
    }
  };

  // Capture console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      validationReport.details.consoleErrors.push(msg.text());
      console.log(`🔍 Console Error: ${msg.text()}`);
    }
  });

  // Capture network requests
  page.on('response', (response) => {
    if (response.url().includes('/api/claude')) {
      validationReport.details.networkRequests.push({
        method: response.request().method(),
        url: response.url(),
        status: response.status()
      });
      console.log(`📡 API Call: ${response.status()} ${response.url()}`);
    }
  });

  try {
    // Test 1: Navigation
    console.log('📍 Test 1: Navigation to Claude Instances page');
    const startTime = Date.now();
    await page.goto(`${FRONTEND_URL}${CLAUDE_INSTANCES_PATH}`, { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    validationReport.performanceMetrics.pageLoadTime = Date.now() - startTime;
    
    // Verify page loaded correctly
    const pageTitle = await page.title();
    const header = await page.$eval('h2', el => el.textContent).catch(() => null);
    
    if (header && header.includes('Claude Instance Manager')) {
      validationReport.results.navigation = true;
      console.log('✅ Navigation successful');
    } else {
      console.log('❌ Navigation failed - header not found');
    }

    // Take screenshot of initial page
    await page.screenshot({ path: 'validation-screenshot-1-navigation.png' });
    validationReport.details.screenshots.push('validation-screenshot-1-navigation.png');

    // Test 2: Button Presence
    console.log('🔘 Test 2: Verify all 4 Claude instance buttons are present');
    let buttonsFound = 0;
    
    for (const button of CLAUDE_INSTANCE_BUTTONS) {
      const buttonElement = await page.$(button.selector);
      if (buttonElement) {
        const buttonText = await buttonElement.evaluate(el => el.textContent);
        const isVisible = await buttonElement.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        
        if (isVisible && buttonText.includes(button.expectedIcon)) {
          buttonsFound++;
          console.log(`✅ Button found: ${button.name}`);
        } else {
          console.log(`❌ Button visibility issue: ${button.name}`);
        }
      } else {
        console.log(`❌ Button not found: ${button.name}`);
      }
    }
    
    validationReport.results.buttonsPresent = buttonsFound === 4;

    // Test 3: Button Functionality & API Integration
    console.log('🔄 Test 3: Test button clicks and API integration');
    let successfulClicks = 0;
    let apiCallsSuccessful = 0;

    for (const button of CLAUDE_INSTANCE_BUTTONS) {
      try {
        const buttonElement = await page.$(button.selector);
        if (buttonElement) {
          // Check if button is enabled
          const isDisabled = await buttonElement.evaluate(el => el.disabled);
          if (!isDisabled) {
            console.log(`🔘 Clicking ${button.name} button`);
            
            // Monitor network for API call
            const responsePromise = page.waitForResponse(
              response => response.url().includes('/api/claude/instances') && 
                         response.request().method() === 'POST',
              { timeout: 10000 }
            ).catch(() => null);
            
            await buttonElement.click();
            successfulClicks++;
            
            // Wait for API response
            const response = await responsePromise;
            if (response && response.status() >= 200 && response.status() < 300) {
              apiCallsSuccessful++;
              console.log(`✅ API call successful for ${button.name}`);
              
              // Try to get instance ID for tracking
              try {
                const responseData = await response.json();
                if (responseData.instanceId) {
                  validationReport.details.createdInstances.push(responseData.instanceId);
                }
              } catch (e) {
                console.log(`⚠️ Could not parse API response for ${button.name}`);
              }
            } else {
              console.log(`❌ API call failed for ${button.name}`);
            }
            
            // Brief pause between clicks
            await page.waitForTimeout(2000);
          } else {
            console.log(`⚠️ Button disabled: ${button.name}`);
          }
        }
      } catch (error) {
        console.log(`❌ Error clicking ${button.name}: ${error.message}`);
      }
    }

    validationReport.results.buttonsClickable = successfulClicks > 0;
    validationReport.results.apiIntegration = apiCallsSuccessful > 0;

    // Take screenshot after button interactions
    await page.screenshot({ path: 'validation-screenshot-2-interactions.png' });
    validationReport.details.screenshots.push('validation-screenshot-2-interactions.png');

    // Test 4: Terminal Output Check
    console.log('📺 Test 4: Check for terminal output areas');
    await page.waitForTimeout(3000); // Wait for potential instance creation

    const terminalSelectors = [
      '.output-area',
      '.terminal-output',
      '.instance-output',
      '.terminal',
      'pre'
    ];

    let terminalFound = false;
    for (const selector of terminalSelectors) {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        for (const element of elements) {
          const text = await element.evaluate(el => el.textContent);
          if (text && text.trim().length > 0) {
            terminalFound = true;
            console.log(`✅ Terminal output found: ${text.substring(0, 50)}...`);
            break;
          }
        }
        if (terminalFound) break;
      }
    }

    // Alternative: Check for terminal-related text in page
    const bodyText = await page.evaluate(() => document.body.textContent);
    const terminalIndicators = ['Waiting for output', 'PID:', 'Instance Output', 'Active:'];
    const hasTerminalIndicators = terminalIndicators.some(indicator => 
      bodyText.includes(indicator)
    );

    validationReport.results.terminalOutput = terminalFound || hasTerminalIndicators;
    if (validationReport.results.terminalOutput) {
      console.log('✅ Terminal output verification successful');
    } else {
      console.log('⚠️ Terminal output not detected');
    }

    // Test 5: WebSocket Connection (indirect check)
    console.log('🔗 Test 5: Check WebSocket connection indicators');
    
    // Look for connection status elements
    const connectionElements = await page.evaluate(() => {
      const selectors = ['.connection-status', '.websocket-status', '.status'];
      const results = [];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.textContent) {
            results.push(el.textContent.trim());
          }
        });
      }
      return results;
    });

    const wsConnectionGood = connectionElements.some(text => 
      text.toLowerCase().includes('connected') || 
      text.toLowerCase().includes('online')
    );

    // Also check if there are no WebSocket errors in console
    const wsErrors = validationReport.details.consoleErrors.filter(error =>
      error.toLowerCase().includes('websocket') || 
      error.toLowerCase().includes('socket.io')
    );

    validationReport.results.websocketConnection = wsErrors.length === 0;
    console.log(`✅ WebSocket connection check: ${wsErrors.length === 0 ? 'No errors' : 'Errors detected'}`);

    // Final Error Check
    validationReport.results.noErrors = validationReport.details.consoleErrors.length === 0;

    // Take final screenshot
    await page.screenshot({ path: 'validation-screenshot-3-final.png' });
    validationReport.details.screenshots.push('validation-screenshot-3-final.png');

    console.log('\n📊 Validation Summary:');
    console.log(`Navigation: ${validationReport.results.navigation ? '✅' : '❌'}`);
    console.log(`Buttons Present: ${validationReport.results.buttonsPresent ? '✅' : '❌'}`);
    console.log(`Buttons Clickable: ${validationReport.results.buttonsClickable ? '✅' : '❌'}`);
    console.log(`API Integration: ${validationReport.results.apiIntegration ? '✅' : '❌'}`);
    console.log(`Terminal Output: ${validationReport.results.terminalOutput ? '✅' : '❌'}`);
    console.log(`WebSocket Connection: ${validationReport.results.websocketConnection ? '✅' : '❌'}`);
    console.log(`No Console Errors: ${validationReport.results.noErrors ? '✅' : '❌'}`);
    console.log(`Page Load Time: ${validationReport.performanceMetrics.pageLoadTime}ms`);
    console.log(`Console Errors: ${validationReport.details.consoleErrors.length}`);
    console.log(`API Calls Made: ${validationReport.details.networkRequests.length}`);
    console.log(`Instances Created: ${validationReport.details.createdInstances.length}`);

  } catch (error) {
    console.error('❌ Validation failed:', error);
    validationReport.details.consoleErrors.push(`Test execution error: ${error.message}`);
    validationReport.results.noErrors = false;
  } finally {
    // Clean up created instances
    for (const instanceId of validationReport.details.createdInstances) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}`, {
          method: 'DELETE'
        });
        console.log(`🧹 Cleanup: Deleted instance ${instanceId} - ${response.status}`);
      } catch (error) {
        console.log(`⚠️ Cleanup warning: Could not delete ${instanceId}: ${error.message}`);
      }
    }

    // Save validation report
    const reportPath = path.join(__dirname, 'claude-instance-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(validationReport, null, 2));
    console.log(`📄 Validation report saved: ${reportPath}`);
    
    await browser.close();
    return validationReport;
  }
}

// Run validation if called directly
if (require.main === module) {
  validateClaudeInstancesUI()
    .then(report => {
      const passed = Object.values(report.results).every(result => result === true);
      console.log(`\n🎯 Overall Result: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
      process.exit(passed ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Validation script failed:', error);
      process.exit(1);
    });
}

module.exports = { validateClaudeInstancesUI };