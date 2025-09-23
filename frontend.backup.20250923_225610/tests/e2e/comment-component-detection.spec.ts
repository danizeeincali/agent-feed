import { test, expect } from '@playwright/test';

test.describe('🔍 Comment Component Detection - Ultra Emergency', () => {
  test.beforeEach(async ({ page }) => {
    // Enable comprehensive console logging
    page.on('console', msg => {
      console.log(`🖥️ BROWSER [${msg.type()}]:`, msg.text());
    });
    
    // Capture any errors
    page.on('pageerror', err => {
      console.log('🚨 PAGE ERROR:', err.message);
    });
    
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
  });

  test('🎯 Identify actual comment form component in use', async ({ page }) => {
    console.log('🔍 Starting component detection...');
    
    // Wait for page to fully load
    await page.waitForTimeout(2000);
    
    // Look for reply buttons
    const replyButtons = await page.locator('text=Reply').all();
    console.log(`📍 Found ${replyButtons.length} reply buttons`);
    
    if (replyButtons.length > 0) {
      // Click the first reply button
      await replyButtons[0].click();
      console.log('🖱️ Clicked reply button');
      
      // Wait for comment form to appear
      await page.waitForTimeout(1000);
      
      // Find all textarea elements that appear after clicking
      const textareas = await page.locator('textarea').all();
      console.log(`📝 Found ${textareas.length} textarea elements`);
      
      for (let i = 0; i < textareas.length; i++) {
        const textarea = textareas[i];
        
        // Get comprehensive component information
        const componentInfo = await textarea.evaluate((el, index) => {
          // Helper function to get React component name
          const getReactComponentName = (element: Element): string | null => {
            const keys = Object.keys(element);
            const reactKey = keys.find(key => key.startsWith('__reactInternalInstance') || key.startsWith('_reactInternalFiber'));
            if (reactKey) {
              const instance = (element as any)[reactKey];
              if (instance && instance.type) {
                return instance.type.name || instance.type.displayName || 'Unknown';
              }
            }
            return null;
          };
          
          // Get all React-related properties
          const reactProps = Object.keys(el).filter(key => 
            key.startsWith('__react') || 
            key.startsWith('_react') ||
            key.includes('react')
          );
          
          // Get component hierarchy
          let parent = el.parentElement;
          const hierarchy = [];
          let depth = 0;
          while (parent && depth < 5) {
            hierarchy.push({
              tagName: parent.tagName,
              className: parent.className,
              id: parent.id,
              reactComponent: getReactComponentName(parent)
            });
            parent = parent.parentElement;
            depth++;
          }
          
          return {
            index,
            element: {
              tagName: el.tagName,
              className: el.className,
              placeholder: el.placeholder,
              id: el.id,
              name: el.getAttribute('name'),
              value: el.value,
              visible: el.offsetParent !== null,
              focused: document.activeElement === el,
              reactComponent: getReactComponentName(el)
            },
            styles: {
              display: getComputedStyle(el).display,
              visibility: getComputedStyle(el).visibility,
              opacity: getComputedStyle(el).opacity,
              position: getComputedStyle(el).position
            },
            reactProps,
            hierarchy,
            dataAttributes: Object.fromEntries(
              Array.from(el.attributes)
                .filter(attr => attr.name.startsWith('data-'))
                .map(attr => [attr.name, attr.value])
            ),
            eventListeners: {
              hasOnChange: typeof (el as any).onchange === 'function',
              hasOnInput: typeof (el as any).oninput === 'function',
              hasOnKeyDown: typeof (el as any).onkeydown === 'function'
            }
          };
        }, i);
        
        console.log(`\n🔍 TEXTAREA ${i} ANALYSIS:`, JSON.stringify(componentInfo, null, 2));
        
        // Test if this textarea is interactive
        if (componentInfo.element.visible) {
          console.log(`\n🧪 Testing interaction with textarea ${i}...`);
          
          // Focus and type @ symbol
          await textarea.focus();
          await page.waitForTimeout(500);
          
          await textarea.type('@');
          await page.waitForTimeout(1000);
          
          // Check for mention dropdown or any reaction
          const mentionElements = await page.locator('[data-testid*="mention"], .mention, [class*="mention"]').count();
          const dropdowns = await page.locator('.dropdown, [role="listbox"], [role="menu"]').count();
          const suggestionLists = await page.locator('ul, [class*="suggestion"], [class*="dropdown"]').count();
          
          console.log(`📊 After typing '@' in textarea ${i}:`, {
            mentionElements,
            dropdowns,
            suggestionLists
          });
          
          // Clear the textarea
          await textarea.fill('');
        }
      }
    } else {
      console.log('❌ No reply buttons found - checking for existing comment forms');
      
      // Look for existing comment forms
      const existingTextareas = await page.locator('textarea').all();
      console.log(`📝 Found ${existingTextareas.length} existing textarea elements`);
      
      for (let i = 0; i < existingTextareas.length; i++) {
        const info = await existingTextareas[i].evaluate(el => ({
          placeholder: el.placeholder,
          className: el.className,
          visible: el.offsetParent !== null,
          parent: el.parentElement?.className
        }));
        console.log(`EXISTING TEXTAREA ${i}:`, info);
      }
    }
  });

  test('🔎 Scan all form elements and components', async ({ page }) => {
    console.log('🔍 Scanning all form elements...');
    
    // Get all form-related elements
    const formElements = await page.evaluate(() => {
      const elements = {
        textareas: [],
        inputs: [],
        forms: [],
        buttons: []
      };
      
      // Scan textareas
      document.querySelectorAll('textarea').forEach((el, i) => {
        elements.textareas.push({
          index: i,
          placeholder: el.placeholder,
          className: el.className,
          id: el.id,
          visible: el.offsetParent !== null,
          parentClass: el.parentElement?.className || ''
        });
      });
      
      // Scan input elements
      document.querySelectorAll('input[type="text"], input[type="search"]').forEach((el, i) => {
        elements.inputs.push({
          index: i,
          placeholder: el.placeholder,
          className: el.className,
          id: el.id,
          type: el.type,
          visible: el.offsetParent !== null
        });
      });
      
      // Scan forms
      document.querySelectorAll('form').forEach((el, i) => {
        elements.forms.push({
          index: i,
          className: el.className,
          id: el.id,
          action: el.action,
          method: el.method
        });
      });
      
      // Scan buttons
      document.querySelectorAll('button').forEach((el, i) => {
        if (el.textContent?.toLowerCase().includes('reply') || 
            el.textContent?.toLowerCase().includes('comment') ||
            el.textContent?.toLowerCase().includes('post')) {
          elements.buttons.push({
            index: i,
            text: el.textContent?.trim(),
            className: el.className,
            type: el.type,
            visible: el.offsetParent !== null
          });
        }
      });
      
      return elements;
    });
    
    console.log('📊 FORM ELEMENTS SCAN:', JSON.stringify(formElements, null, 2));
  });

  test('🧬 React Component Tree Analysis', async ({ page }) => {
    console.log('🧬 Analyzing React component tree...');
    
    // Inject React DevTools-like inspection
    const reactAnalysis = await page.evaluate(() => {
      const components = [];
      
      // Find all elements with React fiber nodes
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_ELEMENT,
        null,
        false
      );
      
      let node;
      while (node = walker.nextNode()) {
        const element = node as Element;
        
        // Look for React internal properties
        const keys = Object.keys(element);
        const reactKey = keys.find(key => 
          key.startsWith('__reactInternalInstance') || 
          key.startsWith('_reactInternalFiber') ||
          key.startsWith('__reactFiber')
        );
        
        if (reactKey) {
          const fiber = (element as any)[reactKey];
          if (fiber && fiber.type) {
            const componentName = fiber.type.name || fiber.type.displayName;
            if (componentName && 
                (componentName.toLowerCase().includes('comment') ||
                 componentName.toLowerCase().includes('post') ||
                 componentName.toLowerCase().includes('form') ||
                 componentName.toLowerCase().includes('mention'))) {
              
              components.push({
                name: componentName,
                tagName: element.tagName,
                className: element.className,
                id: element.id,
                hasTextarea: element.querySelector('textarea') !== null,
                hasInput: element.querySelector('input') !== null,
                visible: element.offsetParent !== null
              });
            }
          }
        }
      }
      
      return components;
    });
    
    console.log('🧬 REACT COMPONENTS FOUND:', JSON.stringify(reactAnalysis, null, 2));
  });

  test('🎯 Focus and Event Detection', async ({ page }) => {
    console.log('🎯 Testing focus and event detection...');
    
    // Add event listeners to detect component interactions
    await page.evaluate(() => {
      let eventCount = 0;
      
      // Listen for all input events
      document.addEventListener('input', (e) => {
        console.log(`INPUT EVENT ${++eventCount}:`, {
          target: e.target.tagName,
          className: e.target.className,
          placeholder: e.target.placeholder,
          value: e.target.value
        });
      });
      
      // Listen for focus events
      document.addEventListener('focus', (e) => {
        console.log(`FOCUS EVENT:`, {
          target: e.target.tagName,
          className: e.target.className,
          placeholder: e.target.placeholder
        });
      }, true);
      
      // Listen for keydown events
      document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
          console.log(`KEYDOWN EVENT:`, {
            key: e.key,
            target: e.target.tagName,
            className: e.target.className,
            placeholder: e.target.placeholder
          });
        }
      });
    });
    
    // Try to trigger comment form
    const replyButton = page.locator('text=Reply').first();
    if (await replyButton.isVisible()) {
      await replyButton.click();
      await page.waitForTimeout(1000);
      
      // Type in any visible textarea
      const textarea = page.locator('textarea').first();
      if (await textarea.isVisible()) {
        await textarea.focus();
        await textarea.type('@test');
        await page.waitForTimeout(2000);
      }
    }
  });

  test('🔍 Component File Detection', async ({ page }) => {
    console.log('🔍 Attempting to detect component source files...');
    
    // Look for source map information or component names in dev tools
    const sourceInfo = await page.evaluate(() => {
      const info = {
        reactDevTools: typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined',
        reactVersion: '',
        components: []
      };
      
      // Try to get React version
      if (window.React) {
        info.reactVersion = window.React.version || 'unknown';
      }
      
      // Look for webpack or vite hot reload info
      if (window.__vite_plugin_react_preamble_installed__) {
        info.bundler = 'vite';
      }
      
      return info;
    });
    
    console.log('🔍 SOURCE INFO:', JSON.stringify(sourceInfo, null, 2));
  });

  test('🚨 Emergency Component Identification', async ({ page }) => {
    console.log('🚨 EMERGENCY: Final component identification attempt...');
    
    // Go to page and wait
    await page.waitForTimeout(3000);
    
    // Take a screenshot for visual reference
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/test-results/component-detection-initial.png',
      fullPage: true 
    });
    
    // Click reply and wait
    const replyButton = page.locator('text=Reply').first();
    if (await replyButton.isVisible()) {
      await replyButton.click();
      await page.waitForTimeout(2000);
      
      // Take screenshot after reply click
      await page.screenshot({ 
        path: '/workspaces/agent-feed/frontend/test-results/component-detection-after-reply.png',
        fullPage: true 
      });
      
      // Get the exact DOM structure around comment forms
      const domStructure = await page.evaluate(() => {
        const commentSections = [];
        
        // Look for comment-related elements
        const selectors = [
          'textarea',
          '[class*="comment"]',
          '[class*="reply"]',
          '[class*="form"]',
          '[id*="comment"]',
          '[data-testid*="comment"]'
        ];
        
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el, i) => {
            if (el.offsetParent !== null) { // Only visible elements
              commentSections.push({
                selector,
                index: i,
                tagName: el.tagName,
                className: el.className,
                id: el.id,
                textContent: el.textContent?.substring(0, 100),
                outerHTML: el.outerHTML.substring(0, 200)
              });
            }
          });
        });
        
        return commentSections;
      });
      
      console.log('🎯 ACTIVE COMMENT SECTIONS:', JSON.stringify(domStructure, null, 2));
      
      // Try typing in the most likely textarea
      const activeTextarea = page.locator('textarea').first();
      if (await activeTextarea.isVisible()) {
        console.log('⌨️ Typing test in active textarea...');
        await activeTextarea.focus();
        await activeTextarea.type('@emergency-test');
        
        // Wait and check for any changes
        await page.waitForTimeout(2000);
        
        // Take final screenshot
        await page.screenshot({ 
          path: '/workspaces/agent-feed/frontend/test-results/component-detection-after-typing.png',
          fullPage: true 
        });
        
        // Check if any mention-related elements appeared
        const finalCheck = await page.evaluate(() => {
          const elements = document.querySelectorAll('*');
          const mentionRelated = [];
          
          elements.forEach(el => {
            const className = el.className?.toString() || '';
            const id = el.id || '';
            
            if (className.includes('mention') || 
                className.includes('dropdown') || 
                className.includes('suggestion') ||
                id.includes('mention')) {
              mentionRelated.push({
                tagName: el.tagName,
                className,
                id,
                visible: el.offsetParent !== null,
                textContent: el.textContent?.substring(0, 50)
              });
            }
          });
          
          return mentionRelated;
        });
        
        console.log('🔍 MENTION-RELATED ELEMENTS AFTER TYPING:', JSON.stringify(finalCheck, null, 2));
      }
    }
    
    console.log('✅ Component detection completed. Check screenshots and logs above.');
  });
});