import { test as base, expect } from '@playwright/test';
import { BrowserDebugger, PageStateAnalyzer } from '../utils/debug-helpers';

// Extend Playwright test with custom fixtures
export const test = base.extend<{
  debugger: BrowserDebugger;
  pageAnalyzer: PageStateAnalyzer;
}>({
  debugger: async ({ page }, use) => {
    const debugger = new BrowserDebugger();
    await debugger.setupApiInterception(page);
    await debugger.setupComponentTracking(page);
    await use(debugger);
  },

  pageAnalyzer: async ({ page }, use) => {
    const analyzer = new PageStateAnalyzer();
    await use(analyzer);
  }
});

export { expect } from '@playwright/test';

// Global test configuration
export const TEST_CONFIG = {
  BASE_URL: 'http://127.0.0.1:5173',
  API_TIMEOUT: 15000,
  NAVIGATION_TIMEOUT: 10000,
  SCREENSHOT_DIR: '/workspaces/agent-feed/frontend/tests/screenshots',
  REPORTS_DIR: '/workspaces/agent-feed/frontend/tests/reports'
};

// Test data for consistent scenarios
export const TEST_SCENARIOS = {
  AGENT_PAGES_FLOW: {
    agentId: 'personal-todos-agent',
    pageId: 'b2935f20-b8a2-4be4-bed4-f6f467a8df9d',
    expectedUrl: '/agents/personal-todos-agent/pages/b2935f20-b8a2-4be4-bed4-f6f467a8df9d'
  },
  
  API_ENDPOINTS: {
    AGENTS_LIST: '/api/agents',
    AGENT_DETAIL: '/api/agents/{agentId}',
    AGENT_PAGES: '/api/agents/{agentId}/pages',
    PAGE_DETAIL: '/api/agents/{agentId}/pages/{pageId}'
  }
};

// Custom assertions for agent pages
expect.extend({
  async toHaveApiCallMade(debugger: BrowserDebugger, urlPattern: string) {
    const calls = debugger.getApiCallsForPattern(urlPattern);
    const pass = calls.length > 0;
    
    return {
      message: () => 
        pass 
          ? `Expected no API call matching "${urlPattern}", but found ${calls.length}`
          : `Expected API call matching "${urlPattern}", but none found`,
      pass
    };
  },

  async toShowPageContent(page: any) {
    const pageAnalyzer = new PageStateAnalyzer();
    const state = await pageAnalyzer.analyzeCurrentState(page);
    
    const hasContent = state.visibleElements.pageContent > 0;
    const hasEmptyState = state.emptyStates.some(text => 
      text?.toLowerCase().includes('no pages')
    );
    
    const pass = hasContent && !hasEmptyState;
    
    return {
      message: () => 
        pass 
          ? `Expected page to show empty state, but found content`
          : `Expected page content, but found: ${JSON.stringify(state.emptyStates)}`,
      pass
    };
  }
});

// Global setup for all tests
export async function globalSetup() {
  // Create necessary directories
  const fs = require('fs');
  const path = require('path');
  
  const dirs = [
    TEST_CONFIG.SCREENSHOT_DIR,
    TEST_CONFIG.REPORTS_DIR
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// Utility functions for tests
export class TestUtils {
  static async waitForApiResponse(page: any, urlPattern: string, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for API response matching: ${urlPattern}`));
      }, timeout);

      page.on('response', (response: any) => {
        if (response.url().includes(urlPattern)) {
          clearTimeout(timer);
          resolve(response);
        }
      });
    });
  }

  static async logPageState(page: any, label: string) {
    const analyzer = new PageStateAnalyzer();
    const state = await analyzer.analyzeCurrentState(page);
    
    console.log(`📊 Page State [${label}]:`, JSON.stringify(state, null, 2));
    
    return state;
  }

  static async retryWithBackoff(
    operation: () => Promise<any>, 
    maxRetries = 3, 
    baseDelay = 1000
  ) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        const delay = baseDelay * Math.pow(2, i);
        console.log(`⏳ Retry ${i + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}