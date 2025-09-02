/**
 * Global E2E Test Setup
 * Ensures backend services are available and configured correctly
 */

import { test as setup, expect } from '@playwright/test';

const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

setup('verify services are running', async ({ page }) => {
  console.log('🔧 Verifying test environment setup...');
  
  // Check frontend is accessible
  try {
    await page.goto(FRONTEND_URL, { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Claude Code Launcher', { timeout: 5000 });
    console.log('✅ Frontend service is running');
  } catch (error) {
    console.error('❌ Frontend service not accessible:', error);
    throw new Error(`Frontend not running at ${FRONTEND_URL}. Please start with: npm run dev`);
  }
  
  // Check backend API is accessible
  try {
    const response = await fetch(`${BACKEND_URL}/api/claude/check`);
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }
    console.log('✅ Backend API is running');
  } catch (error) {
    console.error('❌ Backend API not accessible:', error);
    throw new Error(`Backend not running at ${BACKEND_URL}. Please start backend server`);
  }
  
  // Check if Claude CLI is available (optional - tests can still run)
  try {
    await page.goto(FRONTEND_URL);
    
    // Wait for Claude availability check
    const availabilityElement = page.locator('[data-testid="claude-availability"]');
    const availabilityText = await availabilityElement.textContent({ timeout: 10000 });
    
    if (availabilityText?.includes('Available')) {
      console.log('✅ Claude CLI is available - full integration tests possible');
    } else {
      console.log('⚠️ Claude CLI not available - some tests may be limited');
    }
  } catch (error) {
    console.log('⚠️ Could not verify Claude CLI availability:', error);
  }
  
  console.log('🚀 Test environment setup complete');
});

// Global test configuration and utilities
export const testConfig = {
  maxRetries: 2,
  timeout: 60000,
  retryDelay: 2000,
  
  // Service URLs
  frontendUrl: FRONTEND_URL,
  backendUrl: BACKEND_URL,
  
  // Test data
  testCommands: [
    'hello Claude',
    'pwd',
    'ls -la',
    'echo "test message"',
    'whoami'
  ],
  
  // Selectors (data-testid based for reliability)
  selectors: {
    launchButton: 'button:has-text("🚀 prod/claude")',
    webViewToggle: '[data-testid="web-view-toggle"]',
    terminalViewToggle: '[data-testid="terminal-view-toggle"]',
    instanceCard: '[data-testid="instance-card"]',
    connectButton: '[data-testid^="connect-button-"]',
    disconnectButton: '[data-testid^="disconnect-button-"]',
    status: '[data-testid^="status-"]',
    commandInput: '[data-testid="command-input"]',
    sendButton: '[data-testid="send-command-button"]',
    terminalOutput: '[data-testid="terminal-output"]',
    claudeAvailability: '[data-testid="claude-availability"]'
  }
};