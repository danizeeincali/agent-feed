/**
 * Agent Pages End-to-End Validation Test Suite
 * Tests all 3 agent pages load without "Invalid component configuration" errors
 */

const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const path = require('path');

describe('Agent Pages E2E Validation', () => {
  let browser;
  let page;
  let serverProcess;
  const BASE_URL = 'http://localhost:8080';

  beforeAll(async () => {
    // Start the backend server
    serverProcess = spawn('node', ['simple-backend.js'], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: 'pipe'
    });

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();
    
    // Monitor console for errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Browser Error: ${msg.text()}`);
      }
    });
  }, 30000);

  afterAll(async () => {
    if (browser) await browser.close();
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });

  describe('Agent Page Loading', () => {
    const agentPages = [
      {
        id: 'agent-001',
        path: 'personal-todos',
        name: 'Personal Todos',
        expectedElements: ['todo-list', 'add-todo-form', 'progress-bar']
      },
      {
        id: 'agent-002', 
        path: 'task-manager',
        name: 'Task Manager',
        expectedElements: ['task-grid', 'filter-controls', 'stats-dashboard']
      },
      {
        id: 'agent-003',
        path: 'productivity-dashboard', 
        name: 'Productivity Dashboard',
        expectedElements: ['metrics-grid', 'activity-feed', 'performance-chart']
      }
    ];

    agentPages.forEach(agentPage => {
      test(`should load ${agentPage.name} without errors`, async () => {
        const url = `${BASE_URL}/agent-pages/${agentPage.id}/${agentPage.path}`;
        
        console.log(`Testing: ${url}`);
        
        const response = await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 10000
        });

        // Check HTTP response
        expect(response.status()).toBeLessThan(400);

        // Wait for React to render
        await page.waitForTimeout(2000);

        // Check for "Invalid component configuration" errors
        const errorElements = await page.$$eval(
          '.border-red-200, .bg-red-50',
          elements => elements.map(el => el.textContent)
        );

        const hasInvalidConfigError = errorElements.some(text => 
          text.includes('Invalid component configuration')
        );

        expect(hasInvalidConfigError).toBe(false);

        // Check page title is rendered
        const pageTitle = await page.$eval('h1', el => el.textContent).catch(() => null);
        expect(pageTitle).toBeTruthy();
        expect(pageTitle).not.toBe('Page rendering error');

        // Check for React rendering errors
        const reactErrors = await page.evaluate(() => {
          return window.ReactRenderErrors || [];
        });
        
        expect(reactErrors).toHaveLength(0);

        console.log(`✅ ${agentPage.name} loaded successfully`);
      }, 15000);

      test(`should render expected components for ${agentPage.name}`, async () => {
        const url = `${BASE_URL}/agent-pages/${agentPage.id}/${agentPage.path}`;
        await page.goto(url, { waitUntil: 'networkidle0' });
        
        await page.waitForTimeout(1000);

        // Check for agent-page container
        const pageContainer = await page.$('[data-agent-page]');
        expect(pageContainer).toBeTruthy();

        // Check for specific expected elements (if they exist)
        const renderedComponents = await page.$$eval(
          '[class*="agent-"], .card, .grid, .flex',
          elements => elements.length
        );

        expect(renderedComponents).toBeGreaterThan(0);
        console.log(`✅ ${agentPage.name} rendered ${renderedComponents} components`);
      }, 10000);
    });
  });

  describe('Component Rendering Integrity', () => {
    test('should not have any components with "Component rendering error"', async () => {
      const agentPages = [
        '/agent-pages/agent-001/personal-todos',
        '/agent-pages/agent-002/task-manager', 
        '/agent-pages/agent-003/productivity-dashboard'
      ];

      for (const agentPath of agentPages) {
        await page.goto(`${BASE_URL}${agentPath}`, { waitUntil: 'networkidle0' });
        await page.waitForTimeout(1000);

        const renderingErrors = await page.$$eval(
          '*',
          elements => {
            return elements
              .filter(el => el.textContent.includes('Component rendering error'))
              .map(el => el.textContent);
          }
        );

        expect(renderingErrors).toHaveLength(0);
      }
    });

    test('should have no JavaScript errors in console', async () => {
      let consoleErrors = [];
      
      const errorHandler = (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      };

      page.on('console', errorHandler);

      // Test each page
      const pages = [
        '/agent-pages/agent-001/personal-todos',
        '/agent-pages/agent-002/task-manager',
        '/agent-pages/agent-003/productivity-dashboard'
      ];

      for (const agentPath of pages) {
        consoleErrors = []; // Reset for each page
        
        await page.goto(`${BASE_URL}${agentPath}`, { waitUntil: 'networkidle0' });
        await page.waitForTimeout(2000);

        // Filter out known non-critical errors
        const criticalErrors = consoleErrors.filter(error => 
          !error.includes('favicon.ico') &&
          !error.includes('DevTools') &&
          !error.includes('Extension')
        );

        if (criticalErrors.length > 0) {
          console.log(`Errors on ${agentPath}:`, criticalErrors);
        }

        expect(criticalErrors).toHaveLength(0);
      }

      page.off('console', errorHandler);
    });
  });
});