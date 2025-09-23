import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

test.describe('🚨 ULTRA EMERGENCY: Comment Form DOM Investigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173/');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('MISSION 1: Identify actual comment component DOM structure', async ({ page }) => {
    console.log('🔍 MISSION 1: Starting DOM investigation...');
    
    // Take initial screenshot
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/test-results/investigation-initial-state.png',
      fullPage: true 
    });
    
    // Find all reply buttons
    const replyButtons = await page.locator('text=Reply').count();
    console.log(`Found ${replyButtons} Reply buttons`);
    
    if (replyButtons > 0) {
      // Click the first Reply button
      await page.click('text=Reply');
      console.log('✅ Clicked Reply button');
      
      // Wait for any form to appear
      await page.waitForTimeout(1000);
      
      // Take screenshot after clicking
      await page.screenshot({ 
        path: '/workspaces/agent-feed/frontend/test-results/investigation-after-reply-click.png',
        fullPage: true 
      });
      
      // Look for any textarea elements
      const textareas = await page.$$eval('textarea', els => 
        els.map((el, index) => ({
          index,
          placeholder: el.placeholder,
          className: el.className,
          id: el.id,
          name: el.name,
          dataset: {...el.dataset},
          visible: el.offsetParent !== null,
          value: el.value,
          disabled: el.disabled,
          readOnly: el.readOnly,
          rows: el.rows,
          cols: el.cols,
          style: {
            display: getComputedStyle(el).display,
            visibility: getComputedStyle(el).visibility,
            opacity: getComputedStyle(el).opacity,
            height: getComputedStyle(el).height,
            width: getComputedStyle(el).width
          },
          boundingRect: el.getBoundingClientRect(),
          parentElement: {
            tagName: el.parentElement?.tagName,
            className: el.parentElement?.className,
            id: el.parentElement?.id
          }
        }))
      );
      
      console.log('📊 TEXTAREA ANALYSIS:', JSON.stringify(textareas, null, 2));
      
      // Look for any input elements too
      const inputs = await page.$$eval('input', els => 
        els.map((el, index) => ({
          index,
          type: el.type,
          placeholder: el.placeholder,
          className: el.className,
          id: el.id,
          name: el.name,
          dataset: {...el.dataset},
          visible: el.offsetParent !== null
        }))
      );
      
      console.log('📊 INPUT ANALYSIS:', JSON.stringify(inputs, null, 2));
    }
    
    // Get all elements with data-testid
    const testIdElements = await page.$$eval('[data-testid]', els => 
      els.map(el => ({
        tagName: el.tagName,
        testId: el.dataset.testid,
        className: el.className,
        id: el.id,
        textContent: el.textContent?.substring(0, 100)
      }))
    );
    
    console.log('🎯 TEST ID ELEMENTS:', JSON.stringify(testIdElements, null, 2));
    
    expect(true).toBe(true); // Always pass for investigation
  });

  test('MISSION 2: Test comment form interaction patterns', async ({ page }) => {
    console.log('🔍 MISSION 2: Testing interaction patterns...');
    
    // Try to find any comment-related forms
    const commentForms = await page.locator('form').count();
    console.log(`Found ${commentForms} forms total`);
    
    // Look for any elements with "comment" in class name or id
    const commentElements = await page.$$eval('*[class*="comment" i], *[id*="comment" i]', els => 
      els.map(el => ({
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        dataset: {...el.dataset},
        textContent: el.textContent?.substring(0, 50)
      }))
    );
    
    console.log('💬 COMMENT-RELATED ELEMENTS:', JSON.stringify(commentElements, null, 2));
    
    // Try clicking any visible Reply buttons and test input
    const replySelectors = [
      'text=Reply',
      'button:has-text("Reply")',
      '[data-testid*="reply"]',
      '.reply-button',
      '#reply-button'
    ];
    
    for (const selector of replySelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          console.log(`🎯 Found element with selector: ${selector}`);
          await element.click();
          await page.waitForTimeout(500);
          
          // Try to type in any visible textarea
          const visibleTextareas = page.locator('textarea:visible');
          const count = await visibleTextareas.count();
          
          if (count > 0) {
            console.log(`📝 Found ${count} visible textareas`);
            await visibleTextareas.first().fill('Test comment input');
            
            // Take screenshot of the state
            await page.screenshot({ 
              path: `/workspaces/agent-feed/frontend/test-results/investigation-input-test-${selector.replace(/[^a-zA-Z0-9]/g, '_')}.png`,
              fullPage: true 
            });
          }
          break;
        }
      } catch (error) {
        console.log(`❌ Failed with selector ${selector}:`, error.message);
      }
    }
    
    expect(true).toBe(true); // Always pass for investigation
  });

  test('MISSION 3: Extract React component hierarchy', async ({ page }) => {
    console.log('🔍 MISSION 3: Analyzing React component hierarchy...');
    
    // Get all elements with React-related attributes
    const reactElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements
        .filter(el => {
          const keys = Object.keys(el).concat(Object.keys(el.dataset || {}));
          return keys.some(key => 
            key.includes('react') || 
            key.includes('React') || 
            key.startsWith('__react') ||
            key.includes('fiber')
          );
        })
        .map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          dataset: {...el.dataset},
          reactKeys: Object.keys(el).filter(key => 
            key.includes('react') || 
            key.includes('React') || 
            key.startsWith('__react')
          )
        }));
    });
    
    console.log('⚛️ REACT ELEMENTS:', JSON.stringify(reactElements, null, 2));
    
    // Get component stack trace information
    const componentInfo = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const components = [];
      
      elements.forEach(el => {
        // Check for React fiber properties
        const keys = Object.keys(el);
        const reactKey = keys.find(key => key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber'));
        
        if (reactKey) {
          try {
            const fiber = el[reactKey];
            if (fiber && fiber.type) {
              components.push({
                element: {
                  tagName: el.tagName,
                  className: el.className,
                  id: el.id
                },
                componentName: fiber.type?.name || fiber.type?.displayName || 'Unknown',
                props: Object.keys(fiber.memoizedProps || {}),
                state: Object.keys(fiber.memoizedState || {})
              });
            }
          } catch (e) {
            // Ignore errors accessing React internals
          }
        }
      });
      
      return components;
    });
    
    console.log('🏗️ COMPONENT HIERARCHY:', JSON.stringify(componentInfo, null, 2));
    
    expect(true).toBe(true); // Always pass for investigation
  });

  test('MISSION 4: Capture comprehensive DOM snapshot', async ({ page }) => {
    console.log('🔍 MISSION 4: Creating comprehensive DOM snapshot...');
    
    // Get full DOM structure
    const domSnapshot = await page.evaluate(() => {
      function getElementInfo(element, depth = 0) {
        if (depth > 10) return null; // Prevent infinite recursion
        
        const info = {
          tagName: element.tagName,
          className: element.className,
          id: element.id,
          dataset: {...element.dataset},
          attributes: {},
          children: [],
          textContent: element.childNodes.length === 1 && 
                      element.childNodes[0].nodeType === Node.TEXT_NODE ? 
                      element.textContent?.trim() : null
        };
        
        // Get all attributes
        for (const attr of element.attributes) {
          info.attributes[attr.name] = attr.value;
        }
        
        // Get children (limit to prevent huge output)
        for (let i = 0; i < Math.min(element.children.length, 20); i++) {
          const childInfo = getElementInfo(element.children[i], depth + 1);
          if (childInfo) {
            info.children.push(childInfo);
          }
        }
        
        return info;
      }
      
      return getElementInfo(document.body);
    });
    
    // Save DOM snapshot to file
    const snapshotPath = '/workspaces/agent-feed/frontend/test-results/dom-snapshot.json';
    await fs.writeFile(snapshotPath, JSON.stringify(domSnapshot, null, 2));
    console.log(`📁 DOM snapshot saved to: ${snapshotPath}`);
    
    // Take final comprehensive screenshot
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/test-results/investigation-final-comprehensive.png',
      fullPage: true 
    });
    
    expect(true).toBe(true); // Always pass for investigation
  });

  test('MISSION 5: Event handling investigation', async ({ page }) => {
    console.log('🔍 MISSION 5: Investigating event handling...');
    
    // Add event listeners to capture interactions
    await page.evaluate(() => {
      window.eventLog = [];
      
      // Log all events on document
      ['click', 'keydown', 'keyup', 'input', 'change', 'focus', 'blur'].forEach(eventType => {
        document.addEventListener(eventType, (e) => {
          window.eventLog.push({
            type: eventType,
            target: {
              tagName: e.target.tagName,
              className: e.target.className,
              id: e.target.id,
              placeholder: e.target.placeholder,
              value: e.target.value
            },
            timestamp: Date.now()
          });
        }, true);
      });
    });
    
    // Try to interact with reply buttons and textareas
    try {
      const replyButton = page.locator('text=Reply').first();
      if (await replyButton.count() > 0) {
        await replyButton.click();
        await page.waitForTimeout(500);
        
        const textareas = page.locator('textarea');
        const textareaCount = await textareas.count();
        
        if (textareaCount > 0) {
          await textareas.first().click();
          await textareas.first().fill('Test input for event logging');
          await page.keyboard.press('Enter');
        }
      }
    } catch (error) {
      console.log('❌ Error during event testing:', error.message);
    }
    
    // Get the event log
    const eventLog = await page.evaluate(() => window.eventLog);
    console.log('📝 EVENT LOG:', JSON.stringify(eventLog, null, 2));
    
    // Save event log
    const eventLogPath = '/workspaces/agent-feed/frontend/test-results/event-log.json';
    await fs.writeFile(eventLogPath, JSON.stringify(eventLog, null, 2));
    console.log(`📁 Event log saved to: ${eventLogPath}`);
    
    expect(true).toBe(true); // Always pass for investigation
  });
});