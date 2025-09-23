import { test, expect } from '@playwright/test';

/**
 * DOM INSPECTION AND ANALYSIS SUITE
 * 
 * Deep dive into DOM structure to understand why @ mention system
 * is broken in certain components and working in others.
 */

test.describe('@ Mention System DOM Inspector', () => {
  test('Comprehensive DOM Structure Analysis', async ({ page }) => {
    console.log('🔍 Starting comprehensive DOM structure analysis');
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Comprehensive DOM analysis
    const domAnalysis = await page.evaluate(() => {
      const analysis = {
        timestamp: new Date().toISOString(),
        components: {},
        globalState: {},
        eventListeners: {},
        reactState: {}
      };
      
      // Find all potential mention-related elements
      const mentionInputs = document.querySelectorAll('[data-testid="mention-input"]');
      const dropdownElements = document.querySelectorAll('.mention-dropdown, .dropdown-menu, .suggestions');
      const postCreators = document.querySelectorAll('[data-testid="post-creator"], .post-creator, textarea');
      const commentInputs = document.querySelectorAll('[data-testid="comment-input"], .comment-input');
      const allInputs = document.querySelectorAll('input, textarea, [contenteditable="true"]');
      
      // Component analysis
      analysis.components = {
        mentionInputComponents: {
          count: mentionInputs.length,
          elements: Array.from(mentionInputs).map((el, idx) => ({
            index: idx,
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            dataset: Object.keys(el.dataset),
            eventListeners: el.outerHTML.includes('on') ? 'detected' : 'none',
            parentComponent: el.closest('[data-testid], [class*="component"]')?.className || 'unknown'
          }))
        },
        dropdownElements: {
          count: dropdownElements.length,
          elements: Array.from(dropdownElements).map((el, idx) => ({
            index: idx,
            className: el.className,
            visibility: el.offsetParent !== null ? 'visible' : 'hidden',
            zIndex: getComputedStyle(el).zIndex,
            position: getComputedStyle(el).position,
            display: getComputedStyle(el).display
          }))
        },
        postCreators: {
          count: postCreators.length,
          elements: Array.from(postCreators).map((el, idx) => ({
            index: idx,
            tagName: el.tagName,
            className: el.className,
            placeholder: el.getAttribute('placeholder'),
            hasValue: el.value?.length > 0 || false,
            parentComponent: el.closest('[data-testid], [class*="component"]')?.className || 'unknown'
          }))
        },
        commentInputs: {
          count: commentInputs.length,
          elements: Array.from(commentInputs).map((el, idx) => ({
            index: idx,
            tagName: el.tagName,
            className: el.className,
            isVisible: el.offsetParent !== null
          }))
        },
        allInputElements: {
          count: allInputs.length,
          breakdown: {
            input: document.querySelectorAll('input').length,
            textarea: document.querySelectorAll('textarea').length,
            contenteditable: document.querySelectorAll('[contenteditable="true"]').length
          }
        }
      };
      
      // Global state analysis
      analysis.globalState = {
        reactRoot: !!document.querySelector('[data-reactroot]'),
        reactComponents: document.querySelectorAll('[data-react*], [class*="react"]').length,
        mentionServiceLoaded: typeof window.MentionService !== 'undefined',
        globalMentionState: window.mentionState || 'not found',
        localStorage: {
          mentionData: localStorage.getItem('mention-data') || 'none',
          agentData: localStorage.getItem('agent-data') || 'none',
          userPrefs: localStorage.getItem('user-preferences') || 'none'
        },
        windowProps: {
          mentionRelated: Object.keys(window).filter(key => 
            key.toLowerCase().includes('mention') || 
            key.toLowerCase().includes('agent') ||
            key.toLowerCase().includes('dropdown')
          )
        }
      };
      
      // Event listener detection
      analysis.eventListeners = {
        inputEventListeners: Array.from(allInputs).map((input, idx) => {
          const events = [];
          
          // Check for common event attributes
          if (input.oninput) events.push('input');
          if (input.onchange) events.push('change');
          if (input.onkeyup) events.push('keyup');
          if (input.onkeydown) events.push('keydown');
          if (input.onfocus) events.push('focus');
          if (input.onblur) events.push('blur');
          
          return {
            index: idx,
            tagName: input.tagName,
            className: input.className,
            detectedEvents: events,
            hasReactProps: input.outerHTML.includes('data-react') || input.outerHTML.includes('__react'),
            parentComponent: input.closest('[data-testid]')?.getAttribute('data-testid') || 'unknown'
          };
        })
      };
      
      // React state detection (if accessible)
      try {
        const reactElements = document.querySelectorAll('[data-reactroot] *');
        analysis.reactState = {
          totalReactElements: reactElements.length,
          mentionComponents: Array.from(reactElements).filter(el => 
            el.className && (
              el.className.includes('mention') || 
              el.className.includes('Mention') ||
              el.className.includes('dropdown')
            )
          ).length,
          stateManagementPresent: !!(
            window.Redux || 
            window.__REDUX_DEVTOOLS_EXTENSION__ || 
            window.Zustand ||
            document.querySelector('[data-testid*="context"]')
          )
        };
      } catch (error) {
        analysis.reactState = { error: error.message };
      }
      
      return analysis;
    });
    
    console.log('📊 Complete DOM Analysis:', JSON.stringify(domAnalysis, null, 2));
    
    // Save analysis to file for review
    await page.evaluate((analysis) => {
      const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dom-analysis-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, domAnalysis);
    
    // Take comprehensive screenshots
    await page.screenshot({ 
      path: `test-results/dom-analysis-full-page-${Date.now()}.png`,
      fullPage: true 
    });
    
    // Validation assertions
    expect(domAnalysis.components.allInputElements.count, 'Should have input elements').toBeGreaterThan(0);
    console.log(`✅ Found ${domAnalysis.components.allInputElements.count} input elements`);
    
    return domAnalysis;
  });

  test('Component-Specific Integration Analysis', async ({ page }) => {
    console.log('🔍 Analyzing component-specific integrations');
    
    const components = [
      { name: 'MentionInputDemo', url: 'http://localhost:5173/mention-demo' },
      { name: 'MainFeed', url: 'http://localhost:5173/' }
    ];
    
    const componentAnalysis = {};
    
    for (const component of components) {
      await page.goto(component.url);
      await page.waitForLoadState('networkidle');
      
      const analysis = await page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          mentionInputs: document.querySelectorAll('[data-testid="mention-input"]').length,
          dropdowns: document.querySelectorAll('.mention-dropdown, .dropdown-menu').length,
          inputElements: document.querySelectorAll('input, textarea').length,
          reactComponents: document.querySelectorAll('[data-react*]').length,
          cssClasses: Array.from(document.styleSheets).flatMap(sheet => {
            try {
              return Array.from(sheet.cssRules).map(rule => rule.selectorText).filter(Boolean);
            } catch {
              return [];
            }
          }).filter(selector => 
            selector && (
              selector.includes('mention') || 
              selector.includes('dropdown') ||
              selector.includes('suggest')
            )
          ),
          jsModules: Array.from(document.scripts).map(script => script.src).filter(Boolean),
          errors: [],
          networkRequests: [] // Will be populated by network monitoring
        };
      });
      
      componentAnalysis[component.name] = analysis;
      
      // Take component screenshot
      await page.screenshot({ 
        path: `test-results/component-${component.name.toLowerCase()}-analysis-${Date.now()}.png`,
        fullPage: true 
      });
    }
    
    console.log('Component Analysis Results:', componentAnalysis);
    
    // Compare working vs broken components
    const workingComponent = componentAnalysis.MentionInputDemo;
    const brokenComponent = componentAnalysis.MainFeed;
    
    const comparison = {
      mentionInputDifference: workingComponent.mentionInputs - brokenComponent.mentionInputs,
      dropdownDifference: workingComponent.dropdowns - brokenComponent.dropdowns,
      cssClassDifference: {
        working: workingComponent.cssClasses.length,
        broken: brokenComponent.cssClasses.length,
        uniqueToWorking: workingComponent.cssClasses.filter(cls => 
          !brokenComponent.cssClasses.includes(cls)
        ),
        uniqueToBroken: brokenComponent.cssClasses.filter(cls => 
          !workingComponent.cssClasses.includes(cls)
        )
      }
    };
    
    console.log('🔍 Working vs Broken Comparison:', comparison);
    
    return { componentAnalysis, comparison };
  });

  test('Event Flow Tracing', async ({ page }) => {
    console.log('🔍 Tracing event flow for @ character input');
    
    await page.goto('http://localhost:5173/mention-demo');
    await page.waitForLoadState('networkidle');
    
    // Install event tracing
    await page.evaluate(() => {
      window.eventTrace = [];
      
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (type.includes('input') || type.includes('key') || type.includes('change')) {
          window.eventTrace.push({
            timestamp: Date.now(),
            type: type,
            target: this.tagName || this.constructor.name,
            targetClass: this.className,
            phase: 'addEventListener'
          });
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
      
      // Monitor input events
      document.addEventListener('input', (e) => {
        window.eventTrace.push({
          timestamp: Date.now(),
          type: 'input',
          target: e.target.tagName,
          targetClass: e.target.className,
          value: e.target.value,
          phase: 'event-fired'
        });
      }, true);
      
      document.addEventListener('keydown', (e) => {
        window.eventTrace.push({
          timestamp: Date.now(),
          type: 'keydown',
          key: e.key,
          target: e.target.tagName,
          targetClass: e.target.className,
          phase: 'event-fired'
        });
      }, true);
    });
    
    // Simulate @ input and trace events
    const input = page.locator('input, textarea').first();
    await input.click();
    await input.type('@');
    
    await page.waitForTimeout(1000);
    
    // Get event trace
    const eventTrace = await page.evaluate(() => window.eventTrace);
    
    console.log('🔍 Event Trace:', eventTrace);
    
    // Analyze event flow
    const atSymbolEvents = eventTrace.filter(event => 
      event.value === '@' || event.key === '@'
    );
    
    console.log('@ Symbol Events:', atSymbolEvents);
    
    expect(atSymbolEvents.length, 'Should capture @ input events').toBeGreaterThan(0);
    
    return eventTrace;
  });

  test('CSS and Styling Analysis', async ({ page }) => {
    console.log('🎨 Analyzing CSS and styling for mention components');
    
    await page.goto('http://localhost:5173/mention-demo');
    await page.waitForLoadState('networkidle');
    
    const stylingAnalysis = await page.evaluate(() => {
      const analysis = {
        mentionInputStyles: {},
        dropdownStyles: {},
        zIndexLayers: [],
        hiddenElements: []
      };
      
      // Analyze mention input styling
      const mentionInputs = document.querySelectorAll('[data-testid="mention-input"], input, textarea');
      mentionInputs.forEach((input, idx) => {
        const styles = getComputedStyle(input);
        analysis.mentionInputStyles[`input_${idx}`] = {
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          position: styles.position,
          zIndex: styles.zIndex,
          overflow: styles.overflow,
          pointerEvents: styles.pointerEvents
        };
      });
      
      // Analyze dropdown styling
      const dropdowns = document.querySelectorAll('.mention-dropdown, .dropdown-menu, .suggestions');
      dropdowns.forEach((dropdown, idx) => {
        const styles = getComputedStyle(dropdown);
        analysis.dropdownStyles[`dropdown_${idx}`] = {
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          position: styles.position,
          zIndex: styles.zIndex,
          top: styles.top,
          left: styles.left,
          maxHeight: styles.maxHeight,
          overflow: styles.overflow
        };
      });
      
      // Find all elements with z-index
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        const zIndex = getComputedStyle(el).zIndex;
        if (zIndex !== 'auto') {
          analysis.zIndexLayers.push({
            element: el.tagName,
            className: el.className,
            zIndex: parseInt(zIndex),
            isVisible: el.offsetParent !== null
          });
        }
      });
      
      // Sort z-index layers
      analysis.zIndexLayers.sort((a, b) => b.zIndex - a.zIndex);
      
      // Find hidden elements that might be mention-related
      allElements.forEach(el => {
        if (el.className && el.className.includes('mention') || el.className.includes('dropdown')) {
          const styles = getComputedStyle(el);
          if (styles.display === 'none' || styles.visibility === 'hidden' || styles.opacity === '0') {
            analysis.hiddenElements.push({
              element: el.tagName,
              className: el.className,
              hiddenBy: {
                display: styles.display,
                visibility: styles.visibility,
                opacity: styles.opacity
              }
            });
          }
        }
      });
      
      return analysis;
    });
    
    console.log('🎨 CSS Styling Analysis:', stylingAnalysis);
    
    // Check for styling issues
    const hasVisibleDropdowns = Object.values(stylingAnalysis.dropdownStyles).some(
      styles => styles.display !== 'none' && styles.visibility !== 'hidden'
    );
    
    console.log(`Visible dropdowns found: ${hasVisibleDropdowns}`);
    
    return stylingAnalysis;
  });
});