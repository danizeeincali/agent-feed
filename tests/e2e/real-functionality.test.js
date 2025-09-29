/**
 * End-to-End Real Functionality Tests - London School TDD
 * Tests 100% real functionality with actual API server
 */

import { jest } from '@jest/globals';
import { chromium } from 'playwright';
import { validate as uuidValidate } from 'uuid';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

const API_SERVER_PORT = 3001;
const FRONTEND_PORT = 5173;
const API_BASE_URL = `http://localhost:${API_SERVER_PORT}`;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

describe('End-to-End Real Functionality Tests', () => {
  let browser;
  let apiServerProcess;
  let frontendProcess;
  
  // Test configuration
  const timeout = 30000;
  
  beforeAll(async () => {
    console.log('🚀 Starting E2E test setup...');
    
    // Start API server
    await startApiServer();
    
    // Wait for API server to be ready
    await waitForApiServer();
    
    // Start frontend development server (if not already running)
    await startFrontendServer();
    
    // Start browser
    browser = await chromium.launch({
      headless: process.env.CI === 'true',
      slowMo: 100
    });
    
    console.log('✅ E2E test setup complete');
  }, timeout);
  
  afterAll(async () => {
    console.log('🧹 Cleaning up E2E test environment...');
    
    if (browser) {
      await browser.close();
    }
    
    if (apiServerProcess) {
      apiServerProcess.kill('SIGTERM');
    }
    
    if (frontendProcess) {
      frontendProcess.kill('SIGTERM');
    }
    
    console.log('✅ E2E cleanup complete');
  });

  describe('API Server Real Functionality', () => {
    it('should serve agents with valid UUID structures', async () => {
      const response = await fetch(`${API_BASE_URL}/api/agents`);
      expect(response.ok).toBe(true);
      
      const agents = await response.json();
      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBeGreaterThan(0);
      
      agents.forEach(agent => {
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('status', 'active');
        expect(agent).toHaveProperty('category');
        expect(uuidValidate(agent.id)).toBe(true);
      });
    });

    it('should serve agent posts with complete authorAgent data', async () => {
      const response = await fetch(`${API_BASE_URL}/api/agent-posts`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      
      data.data.forEach(post => {
        // Verify UUID strings support slice operations
        expect(typeof post.id).toBe('string');
        expect(() => post.id.slice(0, 8)).not.toThrow();
        expect(uuidValidate(post.id)).toBe(true);
        
        // Verify authorAgent relationship
        expect(post).toHaveProperty('authorAgent');
        expect(post.authorAgent).toHaveProperty('id');
        expect(post.authorAgent).toHaveProperty('name');
        expect(post.authorAgent).toHaveProperty('status');
        expect(post.agent_id).toBe(post.authorAgent.id);
      });
    });

    it('should respond to health checks', async () => {
      const response = await fetch(`${API_BASE_URL}/health`);
      expect(response.ok).toBe(true);
      
      const health = await response.json();
      expect(health.status).toBe('healthy');
      expect(health.version).toBe('1.0.0');
      expect(health.timestamp).toBeDefined();
    });

    it('should handle CORS requests from frontend', async () => {
      const response = await fetch(`${API_BASE_URL}/api/agents`, {
        headers: {
          'Origin': `http://localhost:${FRONTEND_PORT}`
        }
      });
      
      expect(response.ok).toBe(true);
      expect(response.headers.get('access-control-allow-origin')).toBe(`http://localhost:${FRONTEND_PORT}`);
    });
  });

  describe('Frontend Real Functionality', () => {
    let page;
    
    beforeEach(async () => {
      page = await browser.newPage();
      
      // Set up console logging for debugging
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.error('Browser console error:', msg.text());
        }
      });
      
      page.on('pageerror', error => {
        console.error('Page error:', error.message);
      });
    });
    
    afterEach(async () => {
      if (page) {
        await page.close();
      }
    });

    it('should load the frontend application', async () => {
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
      
      // Check for basic application structure
      const title = await page.title();
      expect(title).toBeTruthy();
      
      // Wait for React to mount
      await page.waitForSelector('body', { timeout: 10000 });
    });

    it('should successfully fetch and display agents', async () => {
      await page.goto(`${FRONTEND_URL}/agents`, { waitUntil: 'networkidle' });
      
      // Wait for agents to load
      await page.waitForSelector('[data-testid="agent-list"]', { timeout: 15000 });
      
      // Verify agents are displayed
      const agentCards = await page.locator('[data-testid="agent-card"]').count();
      expect(agentCards).toBeGreaterThan(0);
      
      // Verify no error messages
      const errorElements = await page.locator('.agents-error').count();
      expect(errorElements).toBe(0);
    });

    it('should display agent data with proper UUID handling', async () => {
      await page.goto(`${FRONTEND_URL}/agents`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="agent-card"]', { timeout: 15000 });
      
      // Get agent data from the page
      const agentData = await page.evaluate(() => {
        const cards = document.querySelectorAll('[data-testid="agent-card"]');
        return Array.from(cards).map(card => {
          const nameElement = card.querySelector('h3');
          const statusElement = card.querySelector('[style*="color"]');
          return {
            name: nameElement?.textContent,
            hasStatus: !!statusElement
          };
        });
      });
      
      expect(agentData.length).toBeGreaterThan(0);
      agentData.forEach(agent => {
        expect(agent.name).toBeTruthy();
        expect(agent.hasStatus).toBe(true);
      });
    });

    it('should handle API errors gracefully', async () => {
      // Create a page that will fail to connect to API
      const pageWithBadApi = await browser.newPage();
      
      // Block API requests to simulate server down
      await pageWithBadApi.route('**/api/**', route => {
        route.abort('connectionrefused');
      });
      
      await pageWithBadApi.goto(`${FRONTEND_URL}/agents`, { waitUntil: 'networkidle' });
      
      // Should show fallback content or error message
      const hasErrorMessage = await pageWithBadApi.locator('.agents-error').count() > 0;
      const hasFallbackData = await pageWithBadApi.locator('[data-testid="agent-card"]').count() > 0;
      
      // Either error message OR fallback data should be shown
      expect(hasErrorMessage || hasFallbackData).toBe(true);
      
      await pageWithBadApi.close();
    });
  });

  describe('Complete Data Flow Integration', () => {
    let page;
    
    beforeEach(async () => {
      page = await browser.newPage();
    });
    
    afterEach(async () => {
      if (page) {
        await page.close();
      }
    });

    it('should complete full data flow from API to UI', async () => {
      // Step 1: Verify API returns proper data
      const apiResponse = await fetch(`${API_BASE_URL}/api/agents`);
      const apiAgents = await apiResponse.json();
      
      expect(Array.isArray(apiAgents)).toBe(true);
      expect(apiAgents.length).toBeGreaterThan(0);
      
      // Step 2: Load frontend and verify same data is displayed
      await page.goto(`${FRONTEND_URL}/agents`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="agent-card"]', { timeout: 15000 });
      
      const uiAgentCount = await page.locator('[data-testid="agent-card"]').count();
      
      // UI should display at least as many agents as API returns
      // (might be more due to fallback data)
      expect(uiAgentCount).toBeGreaterThanOrEqual(apiAgents.length);
    });

    it('should handle UUID string operations in browser', async () => {
      await page.goto(`${FRONTEND_URL}/agents`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="agent-card"]', { timeout: 15000 });
      
      // Test UUID string operations in browser context
      const uuidTestResult = await page.evaluate(async () => {
        try {
          // Fetch data directly in browser
          const response = await fetch('/api/agents');
          const agents = await response.json();
          
          if (!Array.isArray(agents) || agents.length === 0) {
            return { success: false, error: 'No agents found' };
          }
          
          const agent = agents[0];
          
          // Test string operations that were failing before
          const shortId = agent.id.slice(0, 8);
          const lastPart = agent.id.slice(-8);
          const includes = agent.id.includes('-');
          
          return {
            success: true,
            shortId,
            lastPart,
            includes,
            originalId: agent.id
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });
      
      expect(uuidTestResult.success).toBe(true);
      expect(uuidTestResult.shortId).toHaveLength(8);
      expect(uuidTestResult.lastPart).toHaveLength(8);
      expect(uuidTestResult.includes).toBe(true);
      expect(uuidValidate(uuidTestResult.originalId)).toBe(true);
    });
  });

  describe('Performance and Reliability', () => {
    it('should load agents within performance thresholds', async () => {
      const page = await browser.newPage();
      
      const startTime = Date.now();
      await page.goto(`${FRONTEND_URL}/agents`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="agent-list"]', { timeout: 15000 });
      const loadTime = Date.now() - startTime;
      
      // Should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
      
      await page.close();
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, () => 
        fetch(`${API_BASE_URL}/api/agents`)
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.ok).toBe(true);
      });
      
      const data = await Promise.all(responses.map(r => r.json()));
      
      // All responses should have the same structure
      data.forEach(agents => {
        expect(Array.isArray(agents)).toBe(true);
        expect(agents.length).toBeGreaterThan(0);
      });
    });
  });
});

// Helper functions for test setup
async function startApiServer() {
  return new Promise((resolve, reject) => {
    console.log('Starting API server...');
    
    const serverPath = '/workspaces/agent-feed/api-server/server.js';
    apiServerProcess = spawn('node', [serverPath], {
      env: { ...process.env, PORT: API_SERVER_PORT },
      stdio: 'pipe'
    });
    
    apiServerProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('API Server:', output.trim());
      if (output.includes('API Server running')) {
        resolve();
      }
    });
    
    apiServerProcess.stderr.on('data', (data) => {
      console.error('API Server Error:', data.toString());
    });
    
    apiServerProcess.on('error', (error) => {
      console.error('Failed to start API server:', error);
      reject(error);
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      resolve(); // Continue even if we don't see the startup message
    }, 10000);
  });
}

async function waitForApiServer() {
  console.log('Waiting for API server to be ready...');
  
  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        console.log('✅ API server is ready');
        return;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error('API server did not become ready within 30 seconds');
}

async function startFrontendServer() {
  try {
    // Check if frontend is already running
    const response = await fetch(`${FRONTEND_URL}`);
    if (response.ok) {
      console.log('✅ Frontend server already running');
      return;
    }
  } catch (error) {
    // Frontend not running, start it
  }
  
  console.log('Starting frontend server...');
  
  const frontendPath = '/workspaces/agent-feed/frontend';
  frontendProcess = spawn('npm', ['run', 'dev'], {
    cwd: frontendPath,
    env: { ...process.env, PORT: FRONTEND_PORT },
    stdio: 'pipe'
  });
  
  return new Promise((resolve) => {
    frontendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Frontend:', output.trim());
      if (output.includes('Local:') || output.includes('localhost')) {
        setTimeout(resolve, 2000); // Give it a moment to fully start
      }
    });
    
    frontendProcess.stderr.on('data', (data) => {
      console.error('Frontend Error:', data.toString());
    });
    
    // Timeout after 20 seconds
    setTimeout(resolve, 20000);
  });
}
