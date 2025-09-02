/**
 * Test Helper Functions for Single-Connection E2E Tests
 * Shared utilities for consistent testing across all specs
 */

import { Page, expect } from '@playwright/test';

export const TEST_CONFIG = {
  BACKEND_URL: 'http://localhost:3001',
  FRONTEND_URL: 'http://localhost:3000',
  WEBSOCKET_URL: 'ws://localhost:3001',
  
  // Timeouts for real AI interactions
  CLAUDE_RESPONSE_TIMEOUT: 30000, // 30 seconds for Claude to respond
  CONNECTION_TIMEOUT: 10000, // 10 seconds for WebSocket connection
  COMMAND_TIMEOUT: 5000, // 5 seconds for command to be sent
  INSTANCE_CREATION_TIMEOUT: 10000, // 10 seconds for instance creation
  
  // Test data
  DEFAULT_COMMANDS: [
    'hello Claude',
    'pwd',
    'ls -la',
    'echo "test message"'
  ]
};

/**
 * Wait for application to be fully loaded and ready
 */
export async function waitForAppReady(page: Page): Promise<void> {
  // Wait for main heading
  await expect(page.locator('h1')).toContainText('Claude Code Launcher');
  
  // Wait for Claude availability check
  await expect(page.locator('[data-testid="claude-availability"]')).toContainText('Available', {
    timeout: TEST_CONFIG.CONNECTION_TIMEOUT
  });
  
  // Wait for any loading states to complete
  await page.waitForTimeout(1000);
}

/**
 * Wait for WebSocket connection establishment
 */
export async function waitForWebSocketConnection(page: Page, instanceId: string): Promise<void> {
  console.log(`Waiting for WebSocket connection to ${instanceId}...`);
  
  // Wait for connection status indicator
  const statusLocator = page.locator(`[data-testid="status-${instanceId}"]`);
  await expect(statusLocator).toContainText('Connected', {
    timeout: TEST_CONFIG.CONNECTION_TIMEOUT
  });

  // Monitor console for WebSocket connection confirmation
  const wsConnected = new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 3000); // Fallback timeout
    
    const handler = (msg: any) => {
      if (msg.type() === 'log' && msg.text().includes('WebSocket connected')) {
        clearTimeout(timeout);
        page.off('console', handler);
        resolve();
      }
    };
    
    page.on('console', handler);
  });

  await wsConnected;
  
  // Additional stability wait
  await page.waitForTimeout(1000);
  console.log(`✅ WebSocket connection established for ${instanceId}`);
}

/**
 * Wait for real Claude AI response with content validation
 */
export async function waitForClaudeResponse(page: Page, minLength = 20): Promise<string> {
  console.log('Waiting for Claude AI response...');
  
  const outputLocator = page.locator('[data-testid="terminal-output"]');
  
  // Wait for output to appear
  await expect(outputLocator).not.toBeEmpty({ timeout: TEST_CONFIG.CLAUDE_RESPONSE_TIMEOUT });
  
  // Wait for substantive content using more sophisticated detection
  await page.waitForFunction((minLen) => {
    const output = document.querySelector('[data-testid="terminal-output"]');
    if (!output) return false;
    
    const text = output.textContent || '';
    
    // Check for loading indicators that should be resolved
    if (text.includes('...') && text.length < 50) return false;
    if (text.includes('Loading') && text.length < 100) return false;
    
    // Look for Claude-like response patterns
    const hasClaudeMarkers = 
      text.includes('I\'ll help') || 
      text.includes('I can assist') ||
      text.includes('Hello!') ||
      text.includes('How can I help') ||
      /I'm Claude/.test(text) ||
      /I'd be happy/.test(text);
    
    // Ensure minimum length and either Claude markers or substantial content
    return text.length >= minLen && (hasClaudeMarkers || text.length > 100);
  }, minLength, { timeout: TEST_CONFIG.CLAUDE_RESPONSE_TIMEOUT });
  
  const response = await outputLocator.textContent() || '';
  console.log(`✅ Claude response received (${response.length} chars): ${response.substring(0, 150)}...`);
  
  return response;
}

/**
 * Create a new Claude instance via UI
 */
export async function createClaudeInstance(page: Page, name: string = 'Test Instance'): Promise<string> {
  console.log(`Creating Claude instance: ${name}...`);
  
  // Check if we're in the right view mode
  const isWebView = await page.locator('[data-testid="web-view-toggle"]').getAttribute('class');
  if (!isWebView?.includes('active')) {
    await page.click('[data-testid="web-view-toggle"]');
    await page.waitForTimeout(1000);
  }
  
  // Look for create instance button or launch button
  const createButton = page.locator('[data-testid="create-instance-button"]');
  const launchButton = page.locator('button:has-text("🚀 prod/claude")');
  
  if (await createButton.isVisible()) {
    await createButton.click();
  } else {
    // Fall back to main launch button
    await launchButton.click();
  }
  
  // Wait for instance to appear
  await expect(page.locator('[data-testid="instance-card"]')).toBeVisible({ 
    timeout: TEST_CONFIG.INSTANCE_CREATION_TIMEOUT 
  });
  
  // Extract instance ID from the first visible instance card
  const instanceCard = page.locator('[data-testid="instance-card"]').first();
  const instanceId = await instanceCard.getAttribute('data-instance-id') || 
                     await instanceCard.getAttribute('id') || 
                     `instance-${Date.now()}`;
  
  console.log(`✅ Instance created: ${instanceId}`);
  return instanceId;
}

/**
 * Send command safely with verification
 */
export async function sendCommandSafely(page: Page, command: string): Promise<void> {
  console.log(`Sending command: ${command}`);
  
  // Look for command input field
  const inputSelectors = [
    '[data-testid="command-input"]',
    '[data-testid="terminal-input"]',
    'input[placeholder*="command"]',
    'textarea[placeholder*="command"]'
  ];
  
  let inputField = null;
  for (const selector of inputSelectors) {
    if (await page.locator(selector).isVisible()) {
      inputField = page.locator(selector);
      break;
    }
  }
  
  if (!inputField) {
    throw new Error('Command input field not found');
  }
  
  // Clear and type command
  await inputField.fill('');
  await inputField.fill(command);
  
  // Look for send button
  const sendSelectors = [
    '[data-testid="send-command-button"]',
    '[data-testid="send-button"]',
    'button:has-text("Send")',
    'button[type="submit"]'
  ];
  
  let sendButton = null;
  for (const selector of sendSelectors) {
    if (await page.locator(selector).isVisible()) {
      sendButton = page.locator(selector);
      break;
    }
  }
  
  if (sendButton) {
    await sendButton.click();
  } else {
    // Fallback to Enter key
    await inputField.press('Enter');
  }
  
  // Wait for command to be processed
  await page.waitForTimeout(TEST_CONFIG.COMMAND_TIMEOUT);
  console.log(`✅ Command sent: ${command}`);
}

/**
 * Verify single connection enforcement
 */
export async function verifySingleConnection(page: Page, activeInstanceId: string, otherInstanceIds: string[]): Promise<void> {
  console.log(`Verifying single connection: ${activeInstanceId} active, others disconnected`);
  
  // Check active instance
  await expect(page.locator(`[data-testid="status-${activeInstanceId}"]`)).toContainText('Connected', {
    timeout: 5000
  });
  
  // Check other instances are disconnected
  for (const instanceId of otherInstanceIds) {
    await expect(page.locator(`[data-testid="status-${instanceId}"]`)).toContainText('Disconnected', {
      timeout: 5000
    });
  }
  
  console.log('✅ Single connection enforcement verified');
}

/**
 * Clean up instances (disconnect and remove if possible)
 */
export async function cleanupInstances(page: Page, instanceIds: string[]): Promise<void> {
  console.log('Cleaning up test instances...');
  
  for (const instanceId of instanceIds) {
    try {
      // Try to disconnect
      const disconnectButton = page.locator(`[data-testid="disconnect-button-${instanceId}"]`);
      if (await disconnectButton.isVisible()) {
        await disconnectButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Try to remove/delete instance
      const deleteButton = page.locator(`[data-testid="delete-button-${instanceId}"]`);
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (error) {
      console.warn(`Failed to cleanup instance ${instanceId}:`, error);
    }
  }
  
  console.log('✅ Instance cleanup completed');
}

/**
 * Monitor WebSocket connections for debugging
 */
export function setupWebSocketMonitoring(page: Page): void {
  page.on('websocket', ws => {
    console.log(`🔌 WebSocket connection opened: ${ws.url()}`);
    
    ws.on('framereceived', event => {
      if (event.payload.length < 1000) { // Only log smaller payloads
        console.log(`📨 WS Received: ${event.payload}`);
      }
    });
    
    ws.on('framesent', event => {
      if (event.payload.length < 1000) {
        console.log(`📤 WS Sent: ${event.payload}`);
      }
    });
    
    ws.on('close', () => {
      console.log(`🔌 WebSocket connection closed: ${ws.url()}`);
    });
  });
}

/**
 * Setup console monitoring for errors and important events
 */
export function setupConsoleMonitoring(page: Page): void {
  page.on('console', msg => {
    const text = msg.text();
    
    if (msg.type() === 'error') {
      console.error('❌ Browser console error:', text);
    } else if (text.includes('WebSocket') || text.includes('Claude') || text.includes('connection')) {
      console.log(`🔍 Console: ${text}`);
    }
  });
  
  page.on('pageerror', err => {
    console.error('❌ Page error:', err.message);
  });
}