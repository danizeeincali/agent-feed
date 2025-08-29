import { chromium, FullConfig } from '@playwright/test';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Global Teardown for TDD London School Testing
 * 
 * PURPOSE: Clean up test environment and generate reports
 * APPROACH: Verify mock contracts and behavior analysis
 */

async function globalTeardown(config: FullConfig) {
  console.log('🛑 TDD London School: Global Test Teardown');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Generate test summary report
    console.log('📊 Generating TDD test summary...');
    await generateTestSummary();
    
    // Cleanup test data
    console.log('🧹 Cleaning up test environment...');
    await page.goto('http://localhost:5173');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear any test-specific data
      if ((window as any).TDDLondonSchool) {
        (window as any).TDDLondonSchool.reset();
      }
    });
    
    // Verify no test artifacts remain
    console.log('🔍 Verifying cleanup...');
    const remainingData = await page.evaluate(() => ({
      localStorage: Object.keys(localStorage).length,
      sessionStorage: Object.keys(sessionStorage).length,
      testNamespace: !!(window as any).TDDLondonSchool
    }));
    
    if (remainingData.localStorage > 0 || remainingData.sessionStorage > 0) {
      console.warn('⚠️ Some test data may remain:', remainingData);
    }
    
    console.log('✅ TDD London School: Global teardown completed');
    
  } catch (error) {
    console.error('❌ TDD London School: Global teardown failed:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

async function generateTestSummary() {
  const testResultsDir = './test-results';
  const summaryPath = join(testResultsDir, 'tdd-london-school-summary.json');
  
  const summary = {
    testFramework: 'TDD London School',
    purpose: 'Claude Instance Duplication Bug Reproduction',
    methodology: 'Mock-driven outside-in testing with behavior verification',
    timestamp: new Date().toISOString(),
    expectedOutcome: 'Tests should FAIL initially, proving duplication bug exists',
    testScenarios: [
      {
        name: 'Single Message Workflow',
        focus: 'User creates instance and sends message',
        expectation: 'Single response without duplication',
        mockContracts: ['WebSocket', 'ClaudeManager', 'DeduplicationService']
      },
      {
        name: 'WebSocket Message Coordination',
        focus: 'Message handling and deduplication',
        expectation: 'Proper contract fulfillment',
        mockContracts: ['WebSocket', 'MessageDeduplication']
      },
      {
        name: 'Message Input Collaboration',
        focus: 'Component interaction patterns',
        expectation: 'Single send event without duplication',
        mockContracts: ['MessageHandler', 'ValidationService']
      },
      {
        name: 'Instance Lifecycle Management',
        focus: 'State management responsibilities',
        expectation: 'No duplicate instances in UI',
        mockContracts: ['InstanceManager', 'StateTracker']
      },
      {
        name: 'Rapid User Interactions',
        focus: 'System behavior under pressure',
        expectation: 'Correct response count without duplicates',
        mockContracts: ['DeduplicationService', 'EventHandler']
      }
    ],
    regressionScenarios: [
      {
        name: 'Multiple Instance Creation',
        bugSymptom: 'Each instance appears multiple times',
        testFocus: 'UI duplication verification'
      },
      {
        name: 'Message Flooding',
        bugSymptom: 'Messages appear multiple times',
        testFocus: 'Response deduplication'
      },
      {
        name: 'Connection State Changes',
        bugSymptom: 'Multiple connection handlers created',
        testFocus: 'Event handler accumulation'
      },
      {
        name: 'SSE Stream Duplication',
        bugSymptom: 'Status updates trigger multiple times',
        testFocus: 'Status update deduplication'
      },
      {
        name: 'DOM Manipulation Consistency',
        bugSymptom: 'Elements duplicated in DOM tree',
        testFocus: 'DOM consistency maintenance'
      },
      {
        name: 'Memory Leak Prevention',
        bugSymptom: 'Event listeners and objects accumulate',
        testFocus: 'Resource cleanup verification'
      }
    ],
    contractDefinitions: {
      WebSocketContract: {
        send: 'Function to send messages',
        close: 'Function to close connection',
        addEventListener: 'Function to add event listeners',
        readyState: 'Number representing connection state'
      },
      ClaudeManagerContract: {
        createInstance: 'Function to create Claude instance',
        connectToTerminal: 'Function to connect to terminal',
        sendInput: 'Function to send user input',
        processOutput: 'Function to process output',
        deduplicationService: 'Service for message deduplication'
      },
      MessageDeduplicationContract: {
        hasMessage: 'Function to check if message exists',
        addMessage: 'Function to add message to tracking',
        clear: 'Function to clear tracked messages',
        size: 'Function to get number of tracked messages'
      }
    },
    londonSchoolPrinciples: [
      'Outside-in development starting from user behavior',
      'Mock-driven development to define object contracts',
      'Behavior verification focusing on interactions',
      'Contract testing to ensure proper collaborations',
      'Test-first approach with failing tests proving bugs exist'
    ],
    nextSteps: [
      '1. Run tests and verify they FAIL (proving bug exists)',
      '2. Analyze failure patterns to understand duplication mechanism',
      '3. Implement fixes in React components and WebSocket handling',
      '4. Re-run tests and verify they PASS (proving bug is fixed)',
      '5. Add additional edge case tests based on findings'
    ]
  };
  
  try {
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log('📄 Test summary generated:', summaryPath);
  } catch (error) {
    console.error('❌ Failed to generate test summary:', error);
  }
}

export default globalTeardown;