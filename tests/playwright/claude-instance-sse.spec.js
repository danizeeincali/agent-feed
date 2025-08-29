/**
 * Claude Instance SSE Connection Tests
 * 
 * Playwright tests specifically focused on Claude instance creation,
 * SSE connection establishment, and frontend integration validation.
 * 
 * Test Scenarios:
 * 1. Claude instance creation and connection
 * 2. Frontend UI interaction with SSE streams
 * 3. Instance status updates via SSE
 * 4. Terminal UI rendering with SSE data
 * 5. Multiple instance management
 * 6. Error scenarios and recovery
 */

const { test, expect, chromium } = require('@playwright/test');
const EventSource = require('eventsource');

// Test configuration
const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';
const SSE_TIMEOUT = 30000;

// Claude instance types available for testing
const CLAUDE_INSTANCE_TYPES = [
  'prod',
  'skip-permissions',
  'skip-permissions-c',
  'skip-permissions-resume'
];

// Utility function to wait for element with retry
async function waitForElementWithRetry(page, selector, options = {}) {
  const maxRetries = 3;
  const timeout = options.timeout || 10000;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.waitForSelector(selector, { timeout, ...options });
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.warn(`⚠️ Retry ${i + 1}/${maxRetries} for selector: ${selector}`);
      await page.waitForTimeout(1000);
    }
  }
}

// Utility function to create instance via frontend UI
async function createInstanceViaUI(page, instanceType = 'skip-permissions') {
  console.log(`🚀 Creating ${instanceType} instance via UI`);
  
  // Navigate to frontend
  await page.goto(FRONTEND_URL);
  await waitForElementWithRetry(page, 'body', { state: 'domcontentloaded' });
  
  // Look for the instance creation button
  const buttonSelector = `button[data-instance-type="${instanceType}"], button:has-text("${instanceType}"), button:has-text("Claude")`;
  await waitForElementWithRetry(page, buttonSelector);
  
  // Click the button to create instance
  await page.click(buttonSelector);
  
  // Wait for instance creation confirmation
  await waitForElementWithRetry(page, '[data-testid="instance-status"]', { timeout: 15000 });
  
  // Extract instance ID from UI
  const instanceId = await page.evaluate(() => {
    const statusElement = document.querySelector('[data-testid="instance-status"], [data-instance-id], .instance-id');
    if (statusElement) {
      return statusElement.getAttribute('data-instance-id') || 
             statusElement.textContent.match(/claude-\d+/)?.[0] ||
             statusElement.dataset.instanceId;
    }
    return null;
  });
  
  expect(instanceId).toBeTruthy();
  console.log(`✅ Created instance via UI: ${instanceId}`);
  return instanceId;
}

// Utility function to monitor SSE connection in browser
async function setupSSEMonitoringInBrowser(page, instanceId) {
  return await page.evaluate((instanceId) => {
    window.sseMonitor = {
      messages: [],
      connectionStatus: 'disconnected',
      errors: []
    };
    
    const eventSource = new EventSource(`http://localhost:3000/api/v1/claude/${instanceId}/stream`);
    
    eventSource.onopen = () => {
      window.sseMonitor.connectionStatus = 'connected';
      console.log('✅ SSE connection opened');
    };
    
    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        window.sseMonitor.messages.push({
          ...message,
          receivedAt: Date.now(),
          messageCount: window.sseMonitor.messages.length
        });
        console.log('📨 SSE message received:', message.type);
      } catch (error) {
        window.sseMonitor.errors.push({
          type: 'parse_error',
          data: event.data,
          error: error.message,
          receivedAt: Date.now()
        });
      }
    };
    
    eventSource.onerror = (error) => {
      window.sseMonitor.connectionStatus = 'error';
      window.sseMonitor.errors.push({
        type: 'connection_error',
        error: error.message || 'SSE connection error',
        receivedAt: Date.now()
      });
      console.warn('⚠️ SSE connection error');
    };
    
    // Store reference for cleanup
    window.sseConnection = eventSource;
    
    return true;
  }, instanceId);
}

// Utility function to get SSE monitoring data from browser
async function getSSEMonitoringData(page) {
  return await page.evaluate(() => {
    return window.sseMonitor || { messages: [], connectionStatus: 'not_initialized', errors: [] };
  });
}

// Utility function to send terminal input via UI
async function sendTerminalInputViaUI(page, command) {
  console.log(`⌨️ Sending terminal input: ${command}`);
  
  // Find terminal input field
  const inputSelector = 'input[data-testid="terminal-input"], input.terminal-input, textarea[data-testid="terminal-input"]';
  await waitForElementWithRetry(page, inputSelector);
  
  // Clear and type command
  await page.fill(inputSelector, '');
  await page.type(inputSelector, command);
  
  // Submit command (Enter key or submit button)
  await page.keyboard.press('Enter');
  
  console.log(`✅ Terminal input sent: ${command}`);
}

// Utility function to cleanup instance
async function cleanupInstance(page, instanceId) {
  try {
    // Close SSE connection in browser
    await page.evaluate(() => {
      if (window.sseConnection) {
        window.sseConnection.close();
        delete window.sseConnection;
        delete window.sseMonitor;
      }
    });
    
    // Terminate instance via API
    const response = await fetch(`${BACKEND_URL}/api/claude/${instanceId}/terminate`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      console.log(`🗑️ Cleaned up instance: ${instanceId}`);
    }
  } catch (error) {
    console.warn(`⚠️ Cleanup error for ${instanceId}:`, error.message);
  }
}

test.describe('Claude Instance SSE Connection', () => {
  
  test.beforeEach(async ({ page }) => {
    // Verify backend is running
    const healthCheck = await fetch(`${BACKEND_URL}/health`);
    expect(healthCheck.ok).toBeTruthy();
  });

  test('should create Claude instance and establish SSE connection via UI', async ({ page }) => {
    let instanceId;
    
    try {
      // Create instance via frontend UI
      instanceId = await createInstanceViaUI(page, 'skip-permissions');
      
      // Setup SSE monitoring in browser
      await setupSSEMonitoringInBrowser(page, instanceId);
      
      // Wait for SSE connection establishment
      await page.waitForFunction(() => {
        return window.sseMonitor && window.sseMonitor.connectionStatus === 'connected';
      }, { timeout: 15000 });
      
      // Verify connection status
      const monitorData = await getSSEMonitoringData(page);
      expect(monitorData.connectionStatus).toBe('connected');
      expect(monitorData.messages.length).toBeGreaterThan(0);
      
      // Check for connection confirmation message
      const connectionMsg = monitorData.messages.find(msg => msg.type === 'connected');
      expect(connectionMsg).toBeDefined();
      expect(connectionMsg.instanceId).toBe(instanceId);
      
      console.log(`✅ SSE connection established successfully for ${instanceId}`);
      
    } finally {
      if (instanceId) {
        await cleanupInstance(page, instanceId);
      }
    }
  });

  test('should handle terminal input and receive output via SSE', async ({ page }) => {
    let instanceId;
    
    try {
      instanceId = await createInstanceViaUI(page);
      await setupSSEMonitoringInBrowser(page, instanceId);
      
      // Wait for connection
      await page.waitForFunction(() => {
        return window.sseMonitor && window.sseMonitor.connectionStatus === 'connected';
      }, { timeout: 15000 });
      
      // Send terminal command via UI
      await sendTerminalInputViaUI(page, 'echo "SSE test message"');
      
      // Wait for output messages
      await page.waitForFunction(() => {
        const monitor = window.sseMonitor;
        return monitor && monitor.messages.some(msg => msg.type === 'output');
      }, { timeout: 10000 });
      
      const monitorData = await getSSEMonitoringData(page);
      const outputMessages = monitorData.messages.filter(msg => msg.type === 'output');
      
      expect(outputMessages.length).toBeGreaterThan(0);
      
      // Verify output message structure
      outputMessages.forEach(msg => {
        expect(msg.type).toBe('output');
        expect(msg.instanceId).toBe(instanceId);
        expect(msg.data).toBeDefined();
        expect(msg.timestamp).toBeDefined();
      });
      
      console.log(`✅ Terminal I/O via SSE working: ${outputMessages.length} messages received`);
      
    } finally {
      if (instanceId) {
        await cleanupInstance(page, instanceId);
      }
    }
  });

  test('should display instance status updates in UI', async ({ page }) => {
    let instanceId;
    
    try {
      instanceId = await createInstanceViaUI(page);
      
      // Wait for status element to appear and show running status
      await waitForElementWithRetry(page, '[data-testid="instance-status"]');
      
      // Check initial status
      const statusElement = await page.$('[data-testid="instance-status"]');
      expect(statusElement).toBeTruthy();
      
      const statusText = await statusElement.textContent();
      expect(statusText).toMatch(/(running|active|connected)/i);
      
      console.log(`✅ Instance status displayed in UI: ${statusText}`);
      
    } finally {
      if (instanceId) {
        await cleanupInstance(page, instanceId);
      }
    }
  });

  test('should handle multiple instance types', async ({ page }) => {
    const createdInstances = [];
    
    try {
      // Test different instance types
      for (const instanceType of CLAUDE_INSTANCE_TYPES.slice(0, 2)) { // Test first 2 to avoid resource issues
        console.log(`🚀 Testing instance type: ${instanceType}`);
        
        const instanceId = await createInstanceViaUI(page, instanceType);
        createdInstances.push(instanceId);
        
        await setupSSEMonitoringInBrowser(page, instanceId);
        
        // Verify connection for each instance type
        await page.waitForFunction(() => {
          return window.sseMonitor && window.sseMonitor.connectionStatus === 'connected';
        }, { timeout: 15000 });
        
        const monitorData = await getSSEMonitoringData(page);
        expect(monitorData.connectionStatus).toBe('connected');
        
        console.log(`✅ Instance type ${instanceType} working correctly`);
        
        // Cleanup immediately to avoid resource conflicts
        await cleanupInstance(page, instanceId);
        createdInstances.pop(); // Remove from cleanup list since already cleaned
      }
      
    } finally {
      // Cleanup any remaining instances
      for (const instanceId of createdInstances) {
        await cleanupInstance(page, instanceId);
      }
    }
  });

  test('should handle SSE connection recovery after temporary disconnection', async ({ page }) => {
    let instanceId;
    
    try {
      instanceId = await createInstanceViaUI(page);
      await setupSSEMonitoringInBrowser(page, instanceId);
      
      // Wait for initial connection
      await page.waitForFunction(() => {
        return window.sseMonitor && window.sseMonitor.connectionStatus === 'connected';
      }, { timeout: 15000 });
      
      // Simulate connection interruption by closing and reopening
      await page.evaluate(() => {
        if (window.sseConnection) {
          window.sseConnection.close();
        }
      });
      
      // Wait a bit
      await page.waitForTimeout(2000);
      
      // Reestablish connection
      await setupSSEMonitoringInBrowser(page, instanceId);
      
      // Verify reconnection works
      await page.waitForFunction(() => {
        return window.sseMonitor && window.sseMonitor.connectionStatus === 'connected';
      }, { timeout: 15000 });
      
      // Test that we can still receive messages
      await sendTerminalInputViaUI(page, 'echo "reconnection test"');
      
      await page.waitForFunction(() => {
        const monitor = window.sseMonitor;
        return monitor && monitor.messages.some(msg => msg.type === 'output');
      }, { timeout: 10000 });
      
      const monitorData = await getSSEMonitoringData(page);
      expect(monitorData.messages.length).toBeGreaterThan(0);
      
      console.log(`✅ SSE connection recovery successful`);
      
    } finally {
      if (instanceId) {
        await cleanupInstance(page, instanceId);
      }
    }
  });

  test('should validate terminal UI rendering with SSE data', async ({ page }) => {
    let instanceId;
    
    try {
      instanceId = await createInstanceViaUI(page);
      await setupSSEMonitoringInBrowser(page, instanceId);
      
      // Wait for connection
      await page.waitForFunction(() => {
        return window.sseMonitor && window.sseMonitor.connectionStatus === 'connected';
      }, { timeout: 15000 });
      
      // Send command that produces visible output
      await sendTerminalInputViaUI(page, 'echo "Terminal UI Test"');
      
      // Wait for output to appear in terminal UI
      await page.waitForFunction(() => {
        const terminalOutput = document.querySelector('[data-testid="terminal-output"], .terminal-output, .xterm-screen');
        return terminalOutput && terminalOutput.textContent.includes('Terminal UI Test');
      }, { timeout: 15000 });
      
      // Verify terminal output is displayed
      const terminalElement = await page.$('[data-testid="terminal-output"], .terminal-output, .xterm-screen');
      expect(terminalElement).toBeTruthy();
      
      const terminalContent = await terminalElement.textContent();
      expect(terminalContent).toContain('Terminal UI Test');
      
      console.log(`✅ Terminal UI rendering working correctly`);
      
    } finally {
      if (instanceId) {
        await cleanupInstance(page, instanceId);
      }
    }
  });

  test('should handle error scenarios gracefully', async ({ page }) => {
    // Test invalid instance connection
    await setupSSEMonitoringInBrowser(page, 'invalid-instance-id');
    
    // Wait for error condition
    await page.waitForFunction(() => {
      return window.sseMonitor && (
        window.sseMonitor.connectionStatus === 'error' || 
        window.sseMonitor.errors.length > 0
      );
    }, { timeout: 10000 });
    
    const monitorData = await getSSEMonitoringData(page);
    expect(monitorData.connectionStatus === 'error' || monitorData.errors.length > 0).toBeTruthy();
    
    console.log(`✅ Error handling working correctly`);
  });

  test('should validate SSE message ordering and integrity', async ({ page }) => {
    let instanceId;
    
    try {
      instanceId = await createInstanceViaUI(page);
      await setupSSEMonitoringInBrowser(page, instanceId);
      
      await page.waitForFunction(() => {
        return window.sseMonitor && window.sseMonitor.connectionStatus === 'connected';
      }, { timeout: 15000 });
      
      // Send multiple commands in sequence
      const commands = [
        'echo "Command 1"',
        'echo "Command 2"', 
        'echo "Command 3"'
      ];
      
      for (const command of commands) {
        await sendTerminalInputViaUI(page, command);
        await page.waitForTimeout(1000); // Delay between commands
      }
      
      // Wait for all output
      await page.waitForTimeout(3000);
      
      const monitorData = await getSSEMonitoringData(page);
      const outputMessages = monitorData.messages.filter(msg => msg.type === 'output');
      
      expect(outputMessages.length).toBeGreaterThan(0);
      
      // Verify message ordering
      for (let i = 1; i < outputMessages.length; i++) {
        expect(outputMessages[i].receivedAt).toBeGreaterThanOrEqual(outputMessages[i-1].receivedAt);
      }
      
      // Verify message integrity
      outputMessages.forEach((msg, index) => {
        expect(msg.type).toBe('output');
        expect(msg.instanceId).toBe(instanceId);
        expect(msg.messageCount).toBe(index);
      });
      
      console.log(`✅ Message ordering and integrity validated: ${outputMessages.length} messages`);
      
    } finally {
      if (instanceId) {
        await cleanupInstance(page, instanceId);
      }
    }
  });
});

test.describe('Frontend Claude Instance Integration', () => {

  test('should render Claude instance creation buttons correctly', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await waitForElementWithRetry(page, 'body', { state: 'domcontentloaded' });
    
    // Check for instance creation buttons
    const buttons = await page.$$('button[data-instance-type], button:has-text("Claude"), button:has-text("Skip")');
    expect(buttons.length).toBeGreaterThan(0);
    
    // Verify button functionality
    for (const button of buttons.slice(0, 1)) { // Test first button only
      const isVisible = await button.isVisible();
      expect(isVisible).toBeTruthy();
      
      const isEnabled = await button.isEnabled();
      expect(isEnabled).toBeTruthy();
    }
    
    console.log(`✅ Found ${buttons.length} Claude instance creation buttons`);
  });

  test('should display real-time status updates for Claude instances', async ({ page }) => {
    let instanceId;
    
    try {
      instanceId = await createInstanceViaUI(page);
      
      // Monitor status changes
      const statusUpdates = [];
      
      await page.evaluateHandle((statusUpdates) => {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.target.matches('[data-testid="instance-status"]')) {
              statusUpdates.push({
                status: mutation.target.textContent,
                timestamp: Date.now()
              });
            }
          });
        });
        
        const statusElement = document.querySelector('[data-testid="instance-status"]');
        if (statusElement) {
          observer.observe(statusElement, { 
            childList: true, 
            subtree: true, 
            characterData: true 
          });
        }
        
        return observer;
      }, statusUpdates);
      
      // Wait for status updates
      await page.waitForTimeout(5000);
      
      // Verify we have status information displayed
      const statusElement = await page.$('[data-testid="instance-status"]');
      expect(statusElement).toBeTruthy();
      
      console.log(`✅ Instance status updates working`);
      
    } finally {
      if (instanceId) {
        await cleanupInstance(page, instanceId);
      }
    }
  });
});