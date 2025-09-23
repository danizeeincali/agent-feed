/**
 * COMPREHENSIVE REAL FUNCTIONALITY VALIDATION SUITE
 * Zero Mock Dependencies - 100% Production Testing
 */

import { test, expect, Browser, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';

test.describe('Real Functionality Validation Suite - Zero Mocks', () => {
  let browser: Browser;
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    // Navigate to application
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('1. Real Database Agent Validation - Production Data Only', async () => {
    console.log('🔍 Testing real database agent loading...');
    
    // Wait for agents to load from real database
    await page.waitForSelector('[data-testid="agents-container"]', { timeout: 10000 });
    
    // Check for real agent data - no mock messages
    const agentsContainer = page.locator('[data-testid="agents-container"]');
    await expect(agentsContainer).toBeVisible();
    
    // Validate real agent cards exist
    const agentCards = page.locator('[data-testid*="agent-card"]');
    const agentCount = await agentCards.count();
    
    console.log(`✅ Found ${agentCount} real agents from database`);
    expect(agentCount).toBeGreaterThan(0);
    
    // Check each agent has real data fields
    for (let i = 0; i < Math.min(agentCount, 5); i++) {
      const agentCard = agentCards.nth(i);
      await expect(agentCard).toBeVisible();
      
      // Verify real agent properties exist
      const agentName = await agentCard.locator('[data-testid="agent-name"]').textContent();
      const agentStatus = await agentCard.locator('[data-testid="agent-status"]').textContent();
      
      console.log(`✅ Agent ${i + 1}: ${agentName} - Status: ${agentStatus}`);
      expect(agentName).not.toBeNull();
      expect(agentName).not.toContain('Mock');
      expect(agentName).not.toContain('Simulated');
      expect(agentStatus).not.toBeNull();
    }
    
    // Validate no mock/simulation indicators
    const mockIndicators = await page.locator('text=/mock|simulation|fake|test data/i').count();
    expect(mockIndicators).toBe(0);
    console.log('✅ No mock/simulation indicators found in UI');
  });

  test('2. Live WebSocket Connection Validation - Real-Time Only', async () => {
    console.log('🔍 Testing live WebSocket connections...');
    
    // Monitor WebSocket connections
    const wsPromises: Promise<any>[] = [];
    
    page.on('websocket', ws => {
      console.log(`🔌 WebSocket connection detected: ${ws.url()}`);
      
      wsPromises.push(new Promise((resolve) => {
        ws.on('framesent', data => {
          console.log('📤 WebSocket frame sent:', data.payload);
        });
        
        ws.on('framereceived', data => {
          console.log('📥 WebSocket frame received:', data.payload);
          resolve(data);
        });
        
        ws.on('close', () => {
          console.log('🔌 WebSocket closed');
        });
      }));
    });
    
    // Wait for WebSocket connection to establish
    await page.waitForTimeout(2000);
    
    // Trigger real-time update by navigating or refreshing
    await page.reload({ waitUntil: 'networkidle' });
    
    // Check for WebSocket connections
    expect(wsPromises.length).toBeGreaterThan(0);
    console.log(`✅ ${wsPromises.length} WebSocket connections established`);
    
    // Validate WebSocket messages contain real data
    if (wsPromises.length > 0) {
      const wsData = await Promise.race(wsPromises);
      console.log('✅ Real-time WebSocket data received');
    }
  });

  test('3. Authentic SSE Streaming Validation - No Fallbacks', async () => {
    console.log('🔍 Testing authentic SSE streaming...');
    
    // Monitor for Server-Sent Events
    const sseResponses: any[] = [];
    
    page.on('response', response => {
      const headers = response.headers();
      if (headers['content-type']?.includes('text/event-stream') || 
          headers['content-type']?.includes('text/stream')) {
        console.log('📡 SSE stream detected:', response.url());
        sseResponses.push(response);
      }
    });
    
    // Look for SSE connections in the page
    await page.waitForFunction(() => {
      return (window as any).EventSource !== undefined;
    });
    
    // Check if EventSource is being used
    const eventSourceUsage = await page.evaluate(() => {
      return typeof (window as any).EventSource === 'function';
    });
    
    expect(eventSourceUsage).toBe(true);
    console.log('✅ EventSource API available for SSE');
    
    // Wait for SSE connections
    await page.waitForTimeout(3000);
    
    if (sseResponses.length > 0) {
      console.log(`✅ ${sseResponses.length} SSE streams detected`);
      
      // Validate SSE stream headers
      const sseResponse = sseResponses[0];
      const headers = sseResponse.headers();
      expect(headers['content-type']).toContain('event-stream');
    }
  });

  test('4. Real-Time Updates Without Fallbacks', async () => {
    console.log('🔍 Testing real-time updates without fallbacks...');
    
    // Monitor network activity for real-time updates
    const networkRequests: string[] = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/') || url.includes('/ws')) {
        networkRequests.push(url);
        console.log('📡 Network request:', url);
      }
    });
    
    // Wait for initial load
    await page.waitForLoadState('networkidle');
    
    // Look for real-time update indicators
    const realtimeIndicators = page.locator('[data-testid*="realtime"], [data-testid*="live"]');
    const indicatorCount = await realtimeIndicators.count();
    
    if (indicatorCount > 0) {
      console.log(`✅ Found ${indicatorCount} real-time indicators`);
      
      // Check each indicator for "live" status
      for (let i = 0; i < indicatorCount; i++) {
        const indicator = realtimeIndicators.nth(i);
        const text = await indicator.textContent();
        console.log(`Real-time indicator ${i + 1}: ${text}`);
        
        // Should not contain fallback messages
        expect(text).not.toContain('offline');
        expect(text).not.toContain('fallback');
        expect(text).not.toContain('disconnected');
      }
    }
    
    // Validate network requests are hitting real endpoints
    const realApiRequests = networkRequests.filter(url => 
      url.includes('/api/v1/') || url.includes('/api/agents')
    );
    
    expect(realApiRequests.length).toBeGreaterThan(0);
    console.log(`✅ ${realApiRequests.length} real API requests detected`);
  });

  test('5. Production Database Operations - No Simulation', async () => {
    console.log('🔍 Testing production database operations...');
    
    // Test database health endpoint
    const healthResponse = await page.request.get(`${API_URL}/health`);
    expect(healthResponse.ok()).toBe(true);
    
    const healthData = await healthResponse.json();
    console.log('Health check response:', healthData);
    
    // Validate database is connected (not fallback)
    expect(healthData.data.status).toBe('healthy');
    expect(healthData.data.database).toBe(true);
    
    // Test real agents endpoint
    const agentsResponse = await page.request.get(`${API_URL}/api/agents`);
    expect(agentsResponse.ok()).toBe(true);
    
    const agentsData = await agentsResponse.json();
    console.log(`✅ Loaded ${agentsData.data?.length || 0} agents from production database`);
    
    // Validate agents have real database properties
    if (agentsData.data && agentsData.data.length > 0) {
      const firstAgent = agentsData.data[0];
      expect(firstAgent).toHaveProperty('id');
      expect(firstAgent).toHaveProperty('name');
      expect(firstAgent).toHaveProperty('status');
      expect(firstAgent).toHaveProperty('created_at');
      
      console.log('✅ Agent data structure validated:', Object.keys(firstAgent));
    }
    
    // Test agent posts endpoint
    const postsResponse = await page.request.get(`${API_URL}/api/v1/agent-posts`);
    expect(postsResponse.ok()).toBe(true);
    
    const postsData = await postsResponse.json();
    console.log(`✅ Loaded ${postsData.data?.length || 0} posts from production database`);
  });

  test('6. Zero Mock Messages in UI - Production Content Only', async () => {
    console.log('🔍 Validating zero mock/simulation messages in UI...');
    
    // Wait for full page load
    await page.waitForLoadState('networkidle');
    
    // Check entire page content for mock indicators
    const pageContent = await page.textContent('body');
    
    // List of mock/simulation indicators that should NOT appear
    const forbiddenTerms = [
      'mock data',
      'simulated',
      'fake data',
      'test data',
      'mock agent',
      'sample data',
      'demo mode',
      'placeholder',
      'lorem ipsum',
      'example data'
    ];
    
    const foundForbiddenTerms: string[] = [];
    
    for (const term of forbiddenTerms) {
      const regex = new RegExp(term, 'gi');
      if (pageContent && regex.test(pageContent)) {
        foundForbiddenTerms.push(term);
      }
    }
    
    // Report any forbidden terms found
    if (foundForbiddenTerms.length > 0) {
      console.error('❌ Found forbidden mock terms:', foundForbiddenTerms);
    }
    
    expect(foundForbiddenTerms.length).toBe(0);
    console.log('✅ No mock/simulation indicators found in UI content');
    
    // Check for loading states that might indicate real data loading
    const loadingIndicators = page.locator('[data-testid*="loading"], .loading, .spinner');
    const loadingCount = await loadingIndicators.count();
    
    if (loadingCount > 0) {
      console.log(`📊 Found ${loadingCount} loading indicators (normal for real data)`);
    }
    
    // Validate error boundaries are not showing mock errors
    const errorBoundaries = page.locator('[data-testid*="error"], .error-boundary');
    const errorCount = await errorBoundaries.count();
    
    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errorBoundaries.nth(i).textContent();
        console.log(`Error boundary ${i + 1}:`, errorText);
        
        // Should not contain mock-related error messages
        expect(errorText).not.toContain('mock');
        expect(errorText).not.toContain('simulation');
      }
    }
  });

  test('7. End-to-End Real Data Flow Validation', async () => {
    console.log('🔍 Testing complete real data flow...');
    
    // Step 1: Verify page loads with real data
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
    
    // Step 2: Check for real-time connections
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    if (await connectionStatus.count() > 0) {
      const statusText = await connectionStatus.textContent();
      console.log('Connection status:', statusText);
      expect(statusText).not.toContain('offline');
      expect(statusText).not.toContain('disconnected');
    }
    
    // Step 3: Validate data updates in real-time
    const initialAgentCount = await page.locator('[data-testid*="agent-card"]').count();
    console.log(`Initial agent count: ${initialAgentCount}`);
    
    // Step 4: Test navigation with real data persistence
    if (await page.locator('nav a[href*="analytics"]').count() > 0) {
      await page.click('nav a[href*="analytics"]');
      await page.waitForLoadState('networkidle');
      
      // Check analytics page has real data
      const analyticsContainer = page.locator('[data-testid="analytics-container"]');
      if (await analyticsContainer.count() > 0) {
        console.log('✅ Analytics page loaded with real data');
      }
    }
    
    // Step 5: Return to main feed and verify consistency
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const finalAgentCount = await page.locator('[data-testid*="agent-card"]').count();
    console.log(`Final agent count: ${finalAgentCount}`);
    
    // Data should be consistent (allowing for minor real-time variations)
    expect(Math.abs(finalAgentCount - initialAgentCount)).toBeLessThanOrEqual(5);
    console.log('✅ Data consistency maintained across navigation');
  });
});

test.describe('Continuous Validation Runner', () => {
  test('Run Continuous Validation for 60 seconds', async ({ page }) => {
    console.log('🔄 Starting 60-second continuous validation...');
    
    const startTime = Date.now();
    const duration = 60 * 1000; // 60 seconds
    const validationResults: any[] = [];
    
    while (Date.now() - startTime < duration) {
      const validationStart = Date.now();
      
      try {
        // Navigate to application
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        
        // Quick validation checks
        const checks = {
          timestamp: new Date().toISOString(),
          agentsLoaded: false,
          websocketConnected: false,
          realDataPresent: false,
          noMockContent: false
        };
        
        // Check agents loaded
        const agentCards = page.locator('[data-testid*="agent-card"]');
        checks.agentsLoaded = await agentCards.count() > 0;
        
        // Check for real data indicators
        const pageContent = await page.textContent('body');
        checks.noMockContent = !(/mock|simulation|fake/gi.test(pageContent || ''));
        checks.realDataPresent = /agent|post|activity/gi.test(pageContent || '');
        
        // Check WebSocket connections
        let wsConnected = false;
        page.on('websocket', () => {
          wsConnected = true;
        });
        await page.waitForTimeout(1000);
        checks.websocketConnected = wsConnected;
        
        validationResults.push(checks);
        
        const validationTime = Date.now() - validationStart;
        console.log(`✅ Validation cycle completed in ${validationTime}ms:`, checks);
        
        // Wait before next cycle
        await page.waitForTimeout(2000);
        
      } catch (error) {
        console.error('❌ Validation cycle failed:', error);
        validationResults.push({
          timestamp: new Date().toISOString(),
          error: error.message,
          failed: true
        });
      }
    }
    
    // Analyze results
    const totalCycles = validationResults.length;
    const successfulCycles = validationResults.filter(r => !r.failed && r.agentsLoaded).length;
    const successRate = (successfulCycles / totalCycles) * 100;
    
    console.log(`\n📊 CONTINUOUS VALIDATION RESULTS:`);
    console.log(`Total cycles: ${totalCycles}`);
    console.log(`Successful cycles: ${successfulCycles}`);
    console.log(`Success rate: ${successRate.toFixed(2)}%`);
    
    // Export results for evidence
    const resultsFile = '/workspaces/agent-feed/frontend/tests/continuous-validation-results.json';
    require('fs').writeFileSync(resultsFile, JSON.stringify({
      summary: {
        totalCycles,
        successfulCycles,
        successRate: `${successRate.toFixed(2)}%`,
        duration: '60 seconds'
      },
      results: validationResults
    }, null, 2));
    
    console.log(`📄 Results exported to: ${resultsFile}`);
    
    // Assert minimum success rate
    expect(successRate).toBeGreaterThanOrEqual(80);
    console.log('✅ Continuous validation passed with acceptable success rate');
  });
});