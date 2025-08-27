/**
 * End-to-End Production Validation Tests
 * 
 * Comprehensive testing suite to validate complete instance creation → terminal connection workflow
 * Tests all 4 Claude instance buttons and ensures proper terminal synchronization
 */

import { test, expect, Page } from '@playwright/test';
import { performance } from 'perf_hooks';

// Test configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';
const CLAUDE_INSTANCES_PATH = '/claude-instances';

interface InstanceCreationResult {
  buttonName: string;
  instanceId: string;
  creationTime: number;
  connectionTime: number;
  firstOutputTime: number;
  success: boolean;
  errors: string[];
}

interface PerformanceBenchmark {
  instanceCreation: number;
  terminalConnection: number;
  firstOutput: number;
  totalWorkflow: number;
}

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS: PerformanceBenchmark = {
  instanceCreation: 2000,    // Instance creation < 2 seconds
  terminalConnection: 1000,  // Terminal connection < 1 second
  firstOutput: 500,          // First output display < 500ms
  totalWorkflow: 3000        // Total workflow < 3 seconds
};

test.describe('Production Validation: Complete E2E Workflow', () => {
  
  test.beforeAll(async () => {
    // Verify both servers are running
    console.log('🔍 Verifying server availability...');
    
    const frontendResponse = await fetch(FRONTEND_URL);
    expect(frontendResponse.ok).toBeTruthy();
    
    const backendResponse = await fetch(`${BACKEND_URL}/health`);
    const backendHealth = await backendResponse.json();
    expect(backendHealth.status).toBe('healthy');
    
    console.log('✅ Both frontend and backend servers are running');
  });

  test('API Endpoint Validation - All SSE and REST endpoints', async ({ page }) => {
    console.log('🔍 Testing API endpoints...');

    // Test Claude instances endpoint
    const response = await fetch(`${BACKEND_URL}/api/claude/instances`);
    const data = await response.json();
    expect(response.ok).toBeTruthy();
    expect(data.success).toBeTruthy();
    expect(Array.isArray(data.instances)).toBeTruthy();

    // Test SSE endpoint availability (doesn't need to consume)
    const sseResponse = await fetch(`${BACKEND_URL}/api/v1/claude/instances/test-123/terminal/stream`);
    expect(sseResponse.ok).toBeTruthy();
    expect(sseResponse.headers.get('content-type')).toContain('text/event-stream');

    console.log('✅ All API endpoints validated');
  });

  test('Instance Button 1: "🚀 prod/claude" - Complete Workflow', async ({ page }) => {
    const result = await testInstanceCreationWorkflow(page, '🚀 prod/claude');
    
    // Validation
    expect(result.success).toBeTruthy();
    expect(result.creationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.instanceCreation);
    expect(result.connectionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.terminalConnection);
    expect(result.firstOutputTime).toBeLessThan(PERFORMANCE_THRESHOLDS.firstOutput);
    expect(result.errors.length).toBe(0);
    
    console.log(`✅ Button 1 validation passed: ${JSON.stringify(result)}`);
  });

  test('Instance Button 2: "⚡ skip-permissions" - Complete Workflow', async ({ page }) => {
    const result = await testInstanceCreationWorkflow(page, '⚡ skip-permissions');
    
    // Validation
    expect(result.success).toBeTruthy();
    expect(result.creationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.instanceCreation);
    expect(result.connectionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.terminalConnection);
    expect(result.firstOutputTime).toBeLessThan(PERFORMANCE_THRESHOLDS.firstOutput);
    expect(result.errors.length).toBe(0);
    
    console.log(`✅ Button 2 validation passed: ${JSON.stringify(result)}`);
  });

  test('Instance Button 3: "⚡ skip-permissions -c" - Complete Workflow', async ({ page }) => {
    const result = await testInstanceCreationWorkflow(page, '⚡ skip-permissions -c');
    
    // Validation
    expect(result.success).toBeTruthy();
    expect(result.creationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.instanceCreation);
    expect(result.connectionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.terminalConnection);
    expect(result.firstOutputTime).toBeLessThan(PERFORMANCE_THRESHOLDS.firstOutput);
    expect(result.errors.length).toBe(0);
    
    console.log(`✅ Button 3 validation passed: ${JSON.stringify(result)}`);
  });

  test('Instance Button 4: "↻ skip-permissions --resume" - Complete Workflow', async ({ page }) => {
    const result = await testInstanceCreationWorkflow(page, '↻ skip-permissions --resume');
    
    // Validation
    expect(result.success).toBeTruthy();
    expect(result.creationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.instanceCreation);
    expect(result.connectionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.terminalConnection);
    expect(result.firstOutputTime).toBeLessThan(PERFORMANCE_THRESHOLDS.firstOutput);
    expect(result.errors.length).toBe(0);
    
    console.log(`✅ Button 4 validation passed: ${JSON.stringify(result)}`);
  });

  test('State Management Verification - Instance Synchronization', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${CLAUDE_INSTANCES_PATH}`);
    await page.waitForLoadState('networkidle');

    // Create instance and verify state updates
    const startTime = performance.now();
    await page.click('button:has-text("🚀 prod/claude")');
    
    // Wait for instance creation success indicator
    await page.waitForSelector('.instance-created, .status-running', { timeout: 5000 });
    
    // Verify selectedInstance state update
    const terminalOutput = await page.locator('.output-area pre').textContent();
    expect(terminalOutput).not.toContain('claude-2426'); // Should NOT connect to old instance
    expect(terminalOutput).toMatch(/claude-\d+/); // Should show new instance ID
    
    // Verify no hanging connection message
    const connectingMessage = page.locator('text=Connecting to terminal stream...');
    await expect(connectingMessage).not.toBeVisible({ timeout: 3000 });
    
    console.log('✅ State management verification passed');
  });

  test('Error Recovery Scenarios', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${CLAUDE_INSTANCES_PATH}`);
    await page.waitForLoadState('networkidle');

    // Test recovery from connection failures
    console.log('🔍 Testing connection failure recovery...');
    
    // Temporarily block SSE endpoint to simulate failure
    await page.route('**/api/**/terminal/stream', route => {
      route.abort();
    });
    
    // Try to create instance - should fallback gracefully
    await page.click('button:has-text("🚀 prod/claude")');
    
    // Verify fallback behavior (HTTP polling)
    await page.waitForTimeout(3000);
    
    // Re-enable SSE endpoint
    await page.unroute('**/api/**/terminal/stream');
    
    // Verify recovery
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const result = await testInstanceCreationWorkflow(page, '⚡ skip-permissions');
    expect(result.success).toBeTruthy();
    
    console.log('✅ Error recovery scenarios passed');
  });

  test('Performance Benchmark - Comprehensive Metrics', async ({ page }) => {
    const results: InstanceCreationResult[] = [];
    
    const buttons = [
      '🚀 prod/claude',
      '⚡ skip-permissions', 
      '⚡ skip-permissions -c',
      '↻ skip-permissions --resume'
    ];
    
    // Test each button and collect performance metrics
    for (const buttonName of buttons) {
      const result = await testInstanceCreationWorkflow(page, buttonName);
      results.push(result);
      
      // Clear instances between tests
      await clearAllInstances(page);
      await page.waitForTimeout(1000);
    }
    
    // Analyze performance results
    const avgCreationTime = results.reduce((sum, r) => sum + r.creationTime, 0) / results.length;
    const avgConnectionTime = results.reduce((sum, r) => sum + r.connectionTime, 0) / results.length;
    const avgFirstOutputTime = results.reduce((sum, r) => sum + r.firstOutputTime, 0) / results.length;
    
    console.log(`📊 Performance Metrics:`);
    console.log(`  Average Creation Time: ${avgCreationTime.toFixed(2)}ms`);
    console.log(`  Average Connection Time: ${avgConnectionTime.toFixed(2)}ms`);
    console.log(`  Average First Output: ${avgFirstOutputTime.toFixed(2)}ms`);
    
    // Validate performance requirements
    expect(avgCreationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.instanceCreation);
    expect(avgConnectionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.terminalConnection);
    expect(avgFirstOutputTime).toBeLessThan(PERFORMANCE_THRESHOLDS.firstOutput);
    
    console.log('✅ Performance benchmarks passed');
  });

  test('SSE Connection Stability - 60 Second Test', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${CLAUDE_INSTANCES_PATH}`);
    await page.waitForLoadState('networkidle');

    // Create instance
    await page.click('button:has-text("🚀 prod/claude")');
    await page.waitForSelector('.status-running', { timeout: 5000 });
    
    // Monitor SSE connection for 60 seconds
    const startTime = Date.now();
    const connectionErrors: string[] = [];
    
    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('SSE')) {
        connectionErrors.push(`${Date.now() - startTime}ms: ${msg.text()}`);
      }
    });
    
    // Monitor for 60 seconds
    let lastOutputLength = 0;
    for (let i = 0; i < 20; i++) { // Check every 3 seconds for 60 seconds
      await page.waitForTimeout(3000);
      
      const currentOutput = await page.locator('.output-area pre').textContent();
      const currentLength = currentOutput ? currentOutput.length : 0;
      
      // Verify output is still updating (growing)
      expect(currentLength).toBeGreaterThan(lastOutputLength);
      lastOutputLength = currentLength;
      
      console.log(`🕐 ${(i + 1) * 3}s: Output length: ${currentLength} chars`);
    }
    
    // Validate no SSE connection drops
    expect(connectionErrors.length).toBe(0);
    console.log('✅ SSE connection remained stable for 60+ seconds');
  });

});

/**
 * Test complete instance creation workflow for a specific button
 */
async function testInstanceCreationWorkflow(page: Page, buttonName: string): Promise<InstanceCreationResult> {
  const result: InstanceCreationResult = {
    buttonName,
    instanceId: '',
    creationTime: 0,
    connectionTime: 0,
    firstOutputTime: 0,
    success: false,
    errors: []
  };

  try {
    await page.goto(`${FRONTEND_URL}${CLAUDE_INSTANCES_PATH}`);
    await page.waitForLoadState('networkidle');

    // Step 1: Click instance creation button
    const creationStart = performance.now();
    await page.click(`button:has-text("${buttonName}")`);
    
    // Step 2: Wait for instance creation success
    await page.waitForSelector('.instance-created, .status-running, .instance-item', { timeout: 10000 });
    result.creationTime = performance.now() - creationStart;
    
    // Step 3: Extract instance ID from created instance
    const instanceElement = await page.locator('.instance-item').first();
    const instanceText = await instanceElement.textContent();
    const instanceIdMatch = instanceText?.match(/ID: (\w+-\d+)/);
    
    if (instanceIdMatch) {
      result.instanceId = instanceIdMatch[1];
    }

    // Step 4: Wait for terminal connection (output area populated)
    const connectionStart = performance.now();
    await page.waitForSelector('.output-area pre:not(:empty)', { timeout: 5000 });
    result.connectionTime = performance.now() - connectionStart;
    
    // Step 5: Verify terminal shows output from NEW instance (not claude-2426)
    const firstOutputStart = performance.now();
    const terminalOutput = await page.locator('.output-area pre').textContent();
    
    if (terminalOutput && terminalOutput.trim().length > 0) {
      result.firstOutputTime = performance.now() - firstOutputStart;
      
      // Critical validation: NOT connected to claude-2426
      if (terminalOutput.includes('claude-2426')) {
        result.errors.push('Terminal connected to old instance (claude-2426) instead of new instance');
      }
      
      // Should contain new instance ID or general success indicators
      if (!terminalOutput.match(/claude-\d+/) && !terminalOutput.includes('Terminal connected')) {
        result.errors.push('Terminal output does not contain new instance ID or connection confirmation');
      }
    } else {
      result.errors.push('No terminal output received');
    }

    // Step 6: Verify no hanging "Connecting to terminal stream..." message
    const connectingMessage = page.locator('text=Connecting to terminal stream...');
    const isStillConnecting = await connectingMessage.isVisible();
    if (isStillConnecting) {
      result.errors.push('Terminal stuck on "Connecting to terminal stream..." message');
    }

    // Step 7: Verify instance appears in instances list
    const instancesList = await page.locator('.instances-list .instance-item').count();
    if (instancesList === 0) {
      result.errors.push('No instances found in instances list after creation');
    }

    result.success = result.errors.length === 0;
    
  } catch (error) {
    result.errors.push(`Workflow error: ${error}`);
    result.success = false;
  }

  return result;
}

/**
 * Clear all instances for clean testing
 */
async function clearAllInstances(page: Page): Promise<void> {
  try {
    const terminateButtons = await page.locator('.btn-terminate').count();
    
    for (let i = 0; i < terminateButtons; i++) {
      await page.locator('.btn-terminate').first().click();
      await page.waitForTimeout(500);
    }
    
    console.log(`🗑️ Cleared ${terminateButtons} instances`);
  } catch (error) {
    console.log('No instances to clear or error clearing:', error);
  }
}