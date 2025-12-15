import { test, expect } from '@playwright/test';

/**
 * 🚨 EMERGENCY DROPDOWN RENDERING INVESTIGATION
 * 
 * Based on runtime DOM inspection showing @ typing works but no dropdowns appear,
 * this test specifically investigates the dropdown rendering mechanism
 */

test.describe('🚨 Dropdown Rendering Investigation', () => {
  test('Investigate Demo Dropdown Rendering', async ({ page }) => {
    console.log('🔍 Testing Demo dropdown rendering...');
    
    await page.goto('http://localhost:5173/mention-demo');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Focus the textarea
    await page.click('textarea');
    
    // Type @ and wait for dropdown
    await page.type('textarea', '@');
    await page.waitForTimeout(1000);
    
    // Check if dropdown appears
    const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-dropdown, [role="listbox"]');
    const dropdownExists = await dropdown.count() > 0;
    console.log(`Demo dropdown exists: ${dropdownExists}`);
    
    if (dropdownExists) {
      await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/demo-dropdown-found.png' });
      console.log('✅ Demo dropdown found and screenshotted');
    } else {
      await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/demo-no-dropdown.png' });
      console.log('❌ Demo dropdown NOT found');
    }
    
    // Type more characters
    await page.type('textarea', 'test');
    await page.waitForTimeout(1000);
    
    const afterTyping = await dropdown.count() > 0;
    console.log(`Demo dropdown after typing: ${afterTyping}`);
    
    if (afterTyping) {
      await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/demo-dropdown-after-typing.png' });
    }
    
    // Clear input
    await page.fill('textarea', '');
  });

  test('Investigate Production Dropdown Rendering', async ({ page }) => {
    console.log('🔍 Testing Production dropdown rendering...');
    
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for textarea in production
    const textarea = page.locator('textarea').first();
    const textareaExists = await textarea.count() > 0;
    console.log(`Production textarea exists: ${textareaExists}`);
    
    if (textareaExists) {
      await textarea.click();
      
      // Type @ and wait for dropdown
      await textarea.type('@');
      await page.waitForTimeout(1000);
      
      // Check if dropdown appears  
      const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-dropdown, [role="listbox"]');
      const dropdownExists = await dropdown.count() > 0;
      console.log(`Production dropdown exists: ${dropdownExists}`);
      
      if (dropdownExists) {
        await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/production-dropdown-found.png' });
        console.log('✅ Production dropdown found and screenshotted');
      } else {
        await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/production-no-dropdown.png' });
        console.log('❌ Production dropdown NOT found');
      }
      
      // Type more characters
      await textarea.type('test');
      await page.waitForTimeout(1000);
      
      const afterTyping = await dropdown.count() > 0;
      console.log(`Production dropdown after typing: ${afterTyping}`);
      
      if (afterTyping) {
        await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/production-dropdown-after-typing.png' });
      }
      
      // Clear input
      await textarea.fill('');
    }
  });

  test('Console Log Investigation', async ({ page }) => {
    console.log('🔍 Investigating console logs during @ typing...');
    
    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    // Test demo first
    await page.goto('http://localhost:5173/mention-demo');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await page.click('textarea');
    await page.type('textarea', '@test');
    await page.waitForTimeout(2000);
    
    console.log('Demo console logs:');
    logs.forEach(log => {
      if (log.includes('mention') || log.includes('dropdown') || log.includes('@')) {
        console.log(`  ${log}`);
      }
    });
    
    // Clear logs and test production
    logs.length = 0;
    
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const textarea = page.locator('textarea').first();
    if (await textarea.count() > 0) {
      await textarea.click();
      await textarea.type('@test');
      await page.waitForTimeout(2000);
    }
    
    console.log('Production console logs:');
    logs.forEach(log => {
      if (log.includes('mention') || log.includes('dropdown') || log.includes('@')) {
        console.log(`  ${log}`);
      }
    });
  });

  test('MentionService Debug Investigation', async ({ page }) => {
    console.log('🔍 Investigating MentionService calls...');
    
    // Inject debug code to monitor MentionService
    await page.goto('http://localhost:5173/mention-demo');
    await page.waitForLoadState('networkidle');
    
    // Add debugging to window object
    await page.evaluate(() => {
      (window as any).mentionDebug = {
        calls: [],
        log: function(method: string, args: any) {
          this.calls.push({ method, args, timestamp: Date.now() });
          console.log(`[MENTION DEBUG] ${method}:`, args);
        }
      };
    });
    
    await page.click('textarea');
    await page.type('textarea', '@');
    await page.waitForTimeout(1000);
    
    const debugCalls = await page.evaluate(() => (window as any).mentionDebug?.calls || []);
    console.log('Demo MentionService debug calls:', debugCalls);
    
    // Test production
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    
    await page.evaluate(() => {
      (window as any).mentionDebug = {
        calls: [],
        log: function(method: string, args: any) {
          this.calls.push({ method, args, timestamp: Date.now() });
          console.log(`[MENTION DEBUG] ${method}:`, args);
        }
      };
    });
    
    const textarea = page.locator('textarea').first();
    if (await textarea.count() > 0) {
      await textarea.click();
      await textarea.type('@');
      await page.waitForTimeout(1000);
    }
    
    const productionDebugCalls = await page.evaluate(() => (window as any).mentionDebug?.calls || []);
    console.log('Production MentionService debug calls:', productionDebugCalls);
  });
});