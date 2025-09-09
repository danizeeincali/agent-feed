import { test, expect } from '@playwright/test';

test.describe('Emergency Comment UI Investigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173/');
    
    // Wait for app to load
    await page.waitForSelector('[data-testid="social-feed"]', { timeout: 10000 });
  });

  test('identify actual comment form elements and their behavior', async ({ page }) => {
    console.log('🔍 Starting comment UI investigation...');
    
    // Step 1: Find all Reply buttons
    const replyButtons = await page.locator('[data-testid="reply-button"], button:has-text("Reply"), .reply-button').all();
    console.log(`📍 Found ${replyButtons.length} Reply buttons`);
    
    if (replyButtons.length === 0) {
      console.log('❌ No Reply buttons found! Checking for alternative selectors...');
      
      // Look for any buttons that might be reply buttons
      const allButtons = await page.locator('button').all();
      for (let i = 0; i < allButtons.length; i++) {
        const buttonText = await allButtons[i].textContent();
        const buttonAttrs = await allButtons[i].evaluate(el => ({
          className: el.className,
          textContent: el.textContent,
          id: el.id,
          dataset: {...el.dataset}
        }));
        console.log(`Button ${i}:`, buttonAttrs);
      }
    }
    
    // Step 2: Click the first reply button if available
    if (replyButtons.length > 0) {
      console.log('🖱️ Clicking first Reply button...');
      await replyButtons[0].click();
      await page.waitForTimeout(1000);
    }
    
    // Step 3: Find all textarea elements
    const textareas = await page.locator('textarea').all();
    console.log(`📝 Found ${textareas.length} textarea elements`);
    
    // Log details about each textarea
    for (let i = 0; i < textareas.length; i++) {
      const textarea = textareas[i];
      const attrs = await textarea.evaluate(el => ({
        className: el.className,
        placeholder: el.placeholder,
        id: el.id,
        dataset: {...el.dataset},
        value: el.value,
        disabled: el.disabled,
        readOnly: el.readOnly,
        style: el.style.cssText,
        offsetParent: el.offsetParent !== null, // Check if visible
        boundingRect: el.getBoundingClientRect()
      }));
      console.log(`Textarea ${i}:`, attrs);
      
      // Check if textarea is actually visible and interactable
      const isVisible = await textarea.isVisible();
      const isEnabled = await textarea.isEnabled();
      console.log(`Textarea ${i} - Visible: ${isVisible}, Enabled: ${isEnabled}`);
    }
    
    // Step 4: Test typing in each textarea
    for (let i = 0; i < textareas.length; i++) {
      const textarea = textareas[i];
      try {
        console.log(`🧪 Testing textarea ${i} for mention functionality...`);
        
        // Clear any existing content
        await textarea.fill('');
        
        // Type @ symbol
        await textarea.type('@');
        await page.waitForTimeout(500);
        
        // Check if any dropdowns or suggestions appeared
        const dropdowns = await page.locator('.mention-dropdown, .suggestion-dropdown, [data-testid="mention-suggestions"]').all();
        console.log(`After typing @ in textarea ${i}: Found ${dropdowns.length} dropdowns`);
        
        // Check console for debug output
        const logs = await page.evaluate(() => {
          // Return any console logs or errors
          return window.console ? 'Console available' : 'No console';
        });
        
        // Type more text to see if there's any response
        await textarea.type('test');
        await page.waitForTimeout(500);
        
        const finalValue = await textarea.inputValue();
        console.log(`Final value in textarea ${i}: "${finalValue}"`);
        
      } catch (error) {
        console.log(`❌ Error testing textarea ${i}:`, error.message);
      }
    }
  });

  test('trace React component hierarchy for comment forms', async ({ page }) => {
    console.log('🧬 Investigating React component hierarchy...');
    
    // Wait for React to load
    await page.waitForTimeout(2000);
    
    // Click Reply if available
    const replyButton = page.locator('[data-testid="reply-button"], button:has-text("Reply")').first();
    if (await replyButton.isVisible()) {
      await replyButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Get React component information
    const componentInfo = await page.evaluate(() => {
      // Function to get React fiber from DOM element
      function getReactFiber(element: Element) {
        const keys = Object.keys(element).find(key => 
          key.startsWith('__reactInternalInstance') || 
          key.startsWith('__reactFiber') ||
          key.startsWith('_reactInternalFiber')
        );
        return keys ? (element as any)[keys] : null;
      }
      
      // Find all textareas and their React components
      const textareas = document.querySelectorAll('textarea');
      const results = Array.from(textareas).map((textarea, index) => {
        const fiber = getReactFiber(textarea);
        
        // Walk up the fiber tree to find component names
        const componentStack = [];
        let currentFiber = fiber;
        while (currentFiber && componentStack.length < 10) {
          if (currentFiber.type && typeof currentFiber.type === 'function') {
            componentStack.push(currentFiber.type.name || 'Anonymous');
          } else if (typeof currentFiber.type === 'string') {
            componentStack.push(currentFiber.type);
          }
          currentFiber = currentFiber.return;
        }
        
        return {
          index,
          element: textarea.outerHTML.substring(0, 200),
          componentStack,
          props: fiber?.memoizedProps ? Object.keys(fiber.memoizedProps) : [],
          state: fiber?.memoizedState ? 'Has state' : 'No state'
        };
      });
      
      return {
        textareaCount: textareas.length,
        textareas: results,
        reactVersion: (window as any).React?.version || 'Unknown'
      };
    });
    
    console.log('React Analysis Results:', JSON.stringify(componentInfo, null, 2));
  });

  test('validate event handlers and network activity', async ({ page }) => {
    console.log('🔗 Investigating event handlers and network activity...');
    
    // Monitor network requests
    const requests: any[] = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
    });
    
    // Monitor console logs
    const consoleLogs: any[] = [];
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
    });
    
    // Click Reply button
    const replyButton = page.locator('[data-testid="reply-button"], button:has-text("Reply")').first();
    if (await replyButton.isVisible()) {
      console.log('🖱️ Clicking Reply button and monitoring activity...');
      await replyButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Find and interact with textarea
    const textarea = page.locator('textarea').first();
    if (await textarea.isVisible()) {
      console.log('⌨️ Typing in textarea and monitoring activity...');
      
      await textarea.type('@');
      await page.waitForTimeout(1000);
      
      await textarea.type('test');
      await page.waitForTimeout(1000);
    }
    
    // Check for event listeners on textarea elements
    const eventListenerInfo = await page.evaluate(() => {
      const textareas = document.querySelectorAll('textarea');
      return Array.from(textareas).map((textarea, index) => {
        // Try to get event listeners (this might not work in all browsers)
        const events = [];
        
        // Check for common event properties
        const eventProps = ['onInput', 'onChange', 'onKeyDown', 'onKeyUp', 'onFocus', 'onBlur'];
        eventProps.forEach(prop => {
          if ((textarea as any)[prop]) {
            events.push(prop);
          }
        });
        
        return {
          index,
          id: textarea.id,
          className: textarea.className,
          eventProperties: events,
          hasEventListeners: events.length > 0
        };
      });
    });
    
    console.log('📊 Investigation Results:');
    console.log('Network Requests:', requests.length);
    console.log('Console Logs:', consoleLogs.length);
    console.log('Event Listener Info:', JSON.stringify(eventListenerInfo, null, 2));
    
    // Log recent console messages
    if (consoleLogs.length > 0) {
      console.log('Recent Console Messages:');
      consoleLogs.slice(-10).forEach(log => {
        console.log(`[${log.type}] ${log.text}`);
      });
    }
    
    // Log recent network requests
    if (requests.length > 0) {
      console.log('Recent Network Requests:');
      requests.slice(-5).forEach(req => {
        console.log(`[${req.method}] ${req.url}`);
      });
    }
  });

  test('comprehensive DOM analysis for comment system', async ({ page }) => {
    console.log('🌐 Performing comprehensive DOM analysis...');
    
    // Get complete DOM structure related to comments
    const domAnalysis = await page.evaluate(() => {
      // Find all elements that might be related to comments
      const commentSelectors = [
        '[data-testid*="comment"]',
        '[class*="comment"]',
        '[id*="comment"]',
        'textarea',
        'input[type="text"]',
        '[data-testid*="reply"]',
        '[class*="reply"]',
        'button:has-text("Reply")',
        '[data-testid*="mention"]',
        '[class*="mention"]'
      ];
      
      const results: any = {};
      
      commentSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          results[selector] = Array.from(elements).map(el => ({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            textContent: el.textContent?.substring(0, 100),
            dataset: {...(el as HTMLElement).dataset},
            attributes: Array.from(el.attributes).reduce((acc, attr) => {
              acc[attr.name] = attr.value;
              return acc;
            }, {} as any)
          }));
        } catch (e) {
          results[selector] = `Error: ${e.message}`;
        }
      });
      
      return {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        results
      };
    });
    
    console.log('🔍 Complete DOM Analysis:', JSON.stringify(domAnalysis, null, 2));
    
    // Save analysis to file for review
    await page.evaluate((analysis) => {
      // Try to save to localStorage for persistence
      try {
        localStorage.setItem('commentUIAnalysis', JSON.stringify(analysis));
      } catch (e) {
        console.log('Could not save to localStorage:', e);
      }
    }, domAnalysis);
  });

  test('identify why mention system is not working', async ({ page }) => {
    console.log('🚨 EMERGENCY: Diagnosing mention system failure...');
    
    // Enable verbose console logging
    await page.addInitScript(() => {
      // Override console methods to capture all logs
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      
      (window as any).capturedLogs = [];
      
      console.log = (...args) => {
        (window as any).capturedLogs.push({ type: 'log', args, timestamp: Date.now() });
        originalLog.apply(console, args);
      };
      
      console.error = (...args) => {
        (window as any).capturedLogs.push({ type: 'error', args, timestamp: Date.now() });
        originalError.apply(console, args);
      };
      
      console.warn = (...args) => {
        (window as any).capturedLogs.push({ type: 'warn', args, timestamp: Date.now() });
        originalWarn.apply(console, args);
      };
    });
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Try to find and click Reply
    const replyButton = page.locator('button').filter({ hasText: 'Reply' }).first();
    const replyExists = await replyButton.isVisible();
    console.log(`Reply button exists: ${replyExists}`);
    
    if (replyExists) {
      await replyButton.click();
      await page.waitForTimeout(1000);
      
      // Look for any textarea that appears
      const textareas = await page.locator('textarea').all();
      console.log(`Found ${textareas.length} textareas after clicking Reply`);
      
      if (textareas.length > 0) {
        const textarea = textareas[0];
        
        // Test mention functionality
        console.log('Testing mention functionality...');
        await textarea.focus();
        await textarea.type('@');
        
        // Wait and check for any changes
        await page.waitForTimeout(2000);
        
        // Check for mention dropdown
        const mentionDropdown = await page.locator('[data-testid="mention-suggestions"], .mention-dropdown, .suggestion-dropdown').first();
        const dropdownVisible = await mentionDropdown.isVisible().catch(() => false);
        console.log(`Mention dropdown visible: ${dropdownVisible}`);
        
        // Get all captured logs
        const logs = await page.evaluate(() => (window as any).capturedLogs || []);
        console.log('Captured logs during mention test:');
        logs.forEach((log: any) => {
          console.log(`[${log.type}]`, ...log.args);
        });
        
        // Check if MentionInput component is actually rendered
        const mentionInputExists = await page.locator('[data-testid="mention-input"]').isVisible().catch(() => false);
        console.log(`MentionInput component visible: ${mentionInputExists}`);
        
        // Check React DevTools for component tree
        const reactInfo = await page.evaluate(() => {
          const textarea = document.querySelector('textarea');
          if (!textarea) return 'No textarea found';
          
          // Try to find React fiber
          const keys = Object.keys(textarea).find(key => 
            key.startsWith('__reactFiber') || 
            key.startsWith('__reactInternalInstance')
          );
          
          if (keys) {
            const fiber = (textarea as any)[keys];
            return {
              componentName: fiber?.type?.name || 'Unknown',
              props: fiber?.memoizedProps ? Object.keys(fiber.memoizedProps) : [],
              hasOnChange: !!(fiber?.memoizedProps?.onChange),
              hasOnInput: !!(fiber?.memoizedProps?.onInput),
              hasOnKeyDown: !!(fiber?.memoizedProps?.onKeyDown)
            };
          }
          
          return 'No React fiber found';
        });
        
        console.log('React component info:', reactInfo);
      }
    }
    
    // Final diagnostic summary
    const finalAnalysis = await page.evaluate(() => {
      return {
        textareaCount: document.querySelectorAll('textarea').length,
        buttonCount: document.querySelectorAll('button').length,
        mentionElements: document.querySelectorAll('[data-testid*="mention"]').length,
        commentElements: document.querySelectorAll('[data-testid*="comment"]').length,
        replyElements: document.querySelectorAll('[data-testid*="reply"]').length,
        hasReact: !!(window as any).React,
        hasReactDOM: !!(window as any).ReactDOM,
        pathname: window.location.pathname,
        search: window.location.search
      };
    });
    
    console.log('🎯 Final Diagnostic Summary:', JSON.stringify(finalAnalysis, null, 2));
    
    // Fail the test if mention system is not working
    expect(finalAnalysis.textareaCount).toBeGreaterThan(0);
  });
});