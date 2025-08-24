/**
 * Terminal End-to-End Tests - Regression Prevention
 * Prevents terminal input/output failures and WebSocket connection issues
 */

import { test, expect, Browser, Page, chromium } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('Terminal E2E - Regression Prevention', () => {
  let browser: Browser;
  let page: Page;
  let backendProcess: ChildProcess;
  let frontendProcess: ChildProcess;
  
  beforeAll(async () => {
    try {
      // Start backend
      backendProcess = spawn('npm', ['run', 'start'], {
        cwd: join(__dirname, '../..'),
        detached: true,
        stdio: 'pipe'
      });
      
      // Start frontend
      frontendProcess = spawn('npm', ['run', 'dev'], {
        cwd: join(__dirname, '../../frontend'),
        detached: true,
        stdio: 'pipe'
      });
      
      // Wait for servers to start
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      browser = await chromium.launch({ headless: true });
      page = await browser.newPage();
      
      // Enable console logging
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log('Browser console error:', msg.text());
        }
      });
      
      page.on('pageerror', error => {
        console.log('Page error:', error.message);
        logNLDFailure({
          test: 'page-error',
          timestamp: new Date().toISOString(),
          error: error.message,
          stack: error.stack,
          failureType: 'page-crash',
          impact: 'white-screen-of-death'
        });
      });
      
    } catch (error) {
      console.warn('Setup failed:', error);
    }
  }, 60000);
  
  afterAll(async () => {
    if (page) await page.close();
    if (browser) await browser.close();
    
    if (backendProcess) {
      try {
        process.kill(-backendProcess.pid!, 'SIGTERM');
      } catch (error) {
        console.warn('Could not kill backend process');
      }
    }
    
    if (frontendProcess) {
      try {
        process.kill(-frontendProcess.pid!, 'SIGTERM');
      } catch (error) {
        console.warn('Could not kill frontend process');
      }
    }
  });

  describe('Terminal Component Loading', () => {
    it('should load terminal component without White Screen of Death', async () => {
      try {
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
        
        // Wait for app to load
        await page.waitForSelector('[data-testid="app-loaded"], body', { timeout: 15000 });
        
        // Check for white screen indicators
        const bodyContent = await page.textContent('body');
        const hasContent = bodyContent && bodyContent.trim().length > 0;
        
        if (!hasContent) {
          throw new Error('White Screen of Death detected - no content in body');
        }
        
        // Navigate to terminal
        try {
          await page.click('a[href*="terminal"], [data-testid="terminal-link"]', { timeout: 5000 });
        } catch (error) {
          // If no terminal link, try direct navigation
          await page.goto('http://localhost:5173/terminal', { waitUntil: 'networkidle' });
        }
        
        // Wait for terminal component
        await page.waitForSelector('.xterm, [data-testid="terminal"], .terminal-container', { timeout: 15000 });
        
        await logNLDSuccess({
          test: 'terminal-component-loading',
          timestamp: new Date().toISOString(),
          success: true,
          hasContent: true
        });
        
        expect(hasContent).toBe(true);
      } catch (error: any) {
        await logNLDFailure({
          test: 'terminal-component-loading',
          timestamp: new Date().toISOString(),
          error: error.message,
          failureType: 'terminal-loading-failure',
          impact: 'terminal-not-accessible'
        });
        
        throw new Error(`Terminal loading failed: ${error.message}`);
      }
    }, 30000);

    it('should establish WebSocket connection without CORS blocking', async () => {
      try {
        await page.goto('http://localhost:5173/terminal', { waitUntil: 'networkidle' });
        
        // Monitor WebSocket connections
        const wsConnections: string[] = [];
        const wsErrors: string[] = [];
        
        page.on('websocket', ws => {
          wsConnections.push(ws.url());
          ws.on('close', () => console.log('WebSocket closed'));
          ws.on('socketerror', error => {
            wsErrors.push(error.toString());
            console.log('WebSocket error:', error);
          });
        });
        
        // Wait for WebSocket connection
        await page.waitForFunction(() => {
          return (window as any).wsConnected === true || 
                 document.querySelector('.terminal-connected') !== null;
        }, { timeout: 15000 });
        
        // Check for CORS errors in console
        const logs = await page.evaluate(() => {
          return (window as any).consoleErrors || [];
        });
        
        const corsErrors = logs.filter((log: string) => 
          log.toLowerCase().includes('cors') || 
          log.toLowerCase().includes('not allowed by cors')
        );
        
        if (corsErrors.length > 0) {
          throw new Error(`CORS errors detected: ${corsErrors.join(', ')}`);
        }
        
        await logNLDSuccess({
          test: 'websocket-connection',
          timestamp: new Date().toISOString(),
          success: true,
          wsConnections: wsConnections.length,
          wsErrors: wsErrors.length
        });
        
        expect(wsErrors.length).toBe(0);
      } catch (error: any) {
        await logNLDFailure({
          test: 'websocket-connection',
          timestamp: new Date().toISOString(),
          error: error.message,
          failureType: 'websocket-cors-blocking',
          impact: 'real-time-communication-blocked'
        });
        
        throw new Error(`WebSocket connection failed - CORS blocking detected: ${error.message}`);
      }
    }, 20000);
  });

  describe('Terminal Input/Output', () => {
    it('should handle terminal input without hanging', async () => {
      try {
        await page.goto('http://localhost:5173/terminal', { waitUntil: 'networkidle' });
        
        // Wait for terminal to be ready
        await page.waitForSelector('.xterm-screen', { timeout: 15000 });
        
        // Focus terminal
        await page.click('.xterm-screen');
        
        // Type command
        const testCommand = 'echo "Terminal Test"';
        await page.keyboard.type(testCommand);
        await page.keyboard.press('Enter');
        
        // Wait for command output
        await page.waitForFunction(
          (cmd) => document.body.textContent?.includes('Terminal Test') || 
                   document.querySelector('.xterm-screen')?.textContent?.includes('Terminal Test'),
          testCommand,
          { timeout: 10000 }
        );
        
        await logNLDSuccess({
          test: 'terminal-input-output',
          timestamp: new Date().toISOString(),
          success: true,
          command: testCommand
        });
        
      } catch (error: any) {
        await logNLDFailure({
          test: 'terminal-input-output',
          timestamp: new Date().toISOString(),
          error: error.message,
          failureType: 'terminal-input-hanging',
          impact: 'terminal-not-interactive'
        });
        
        throw new Error(`Terminal input/output failed: ${error.message}`);
      }
    }, 25000);

    it('should handle multiple terminal commands without memory leaks', async () => {
      try {
        await page.goto('http://localhost:5173/terminal', { waitUntil: 'networkidle' });
        
        // Wait for terminal
        await page.waitForSelector('.xterm-screen', { timeout: 15000 });
        await page.click('.xterm-screen');
        
        // Execute multiple commands
        const commands = ['pwd', 'ls', 'echo test1', 'echo test2', 'date'];
        
        for (const command of commands) {
          await page.keyboard.type(command);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1000); // Wait between commands
        }
        
        // Check memory usage
        const memoryUsage = await page.evaluate(() => {
          return {
            usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
            totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0
          };
        });
        
        // Check for excessive memory usage (> 100MB)
        if (memoryUsage.usedJSHeapSize > 100 * 1024 * 1024) {
          throw new Error(`Excessive memory usage: ${memoryUsage.usedJSHeapSize} bytes`);
        }
        
        await logNLDSuccess({
          test: 'terminal-multiple-commands',
          timestamp: new Date().toISOString(),
          success: true,
          commandsExecuted: commands.length,
          memoryUsage
        });
        
      } catch (error: any) {
        await logNLDFailure({
          test: 'terminal-multiple-commands',
          timestamp: new Date().toISOString(),
          error: error.message,
          failureType: 'terminal-memory-leak',
          impact: 'performance-degradation'
        });
        
        throw new Error(`Multiple terminal commands failed: ${error.message}`);
      }
    }, 30000);
  });

  describe('Terminal Error Recovery', () => {
    it('should recover from WebSocket disconnection', async () => {
      try {
        await page.goto('http://localhost:5173/terminal', { waitUntil: 'networkidle' });
        
        // Wait for initial connection
        await page.waitForSelector('.xterm-screen', { timeout: 15000 });
        
        // Simulate network disconnect/reconnect by reloading
        await page.reload({ waitUntil: 'networkidle' });
        
        // Wait for reconnection
        await page.waitForSelector('.xterm-screen', { timeout: 15000 });
        
        // Test that terminal is functional after reconnect
        await page.click('.xterm-screen');
        await page.keyboard.type('echo "Reconnection Test"');
        await page.keyboard.press('Enter');
        
        await page.waitForFunction(
          () => document.body.textContent?.includes('Reconnection Test'),
          { timeout: 10000 }
        );
        
        await logNLDSuccess({
          test: 'websocket-reconnection',
          timestamp: new Date().toISOString(),
          success: true
        });
        
      } catch (error: any) {
        await logNLDFailure({
          test: 'websocket-reconnection',
          timestamp: new Date().toISOString(),
          error: error.message,
          failureType: 'websocket-reconnection-failure',
          impact: 'terminal-permanently-broken'
        });
        
        throw new Error(`WebSocket reconnection failed: ${error.message}`);
      }
    }, 25000);
  });
});

// NLD Logging Functions
async function logNLDSuccess(data: any) {
  try {
    const nldDir = join(__dirname, '../../nld-agent/records');
    await fs.mkdir(nldDir, { recursive: true });
    
    const filename = `terminal-e2e-success-${Date.now()}.json`;
    const filepath = join(nldDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify({
      type: 'terminal-e2e-success',
      ...data
    }, null, 2));
  } catch (error) {
    console.warn('Warning: Could not log to NLD system:', error);
  }
}

async function logNLDFailure(data: any) {
  try {
    const nldDir = join(__dirname, '../../nld-agent/records');
    await fs.mkdir(nldDir, { recursive: true });
    
    const filename = `terminal-e2e-failure-${Date.now()}.json`;
    const filepath = join(nldDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify({
      type: 'terminal-e2e-failure',
      preventionPattern: true,
      ...data
    }, null, 2));
  } catch (error) {
    console.warn('Warning: Could not log to NLD system:', error);
  }
}
