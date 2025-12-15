import { test, expect, Page } from '@playwright/test';

/**
 * EMERGENCY TDD London School Live Diagnosis
 * Real-time behavior testing to identify WHY @ mentions fail in production
 * 
 * Key Focus: LIVE TESTING against localhost:5173 with actual user interactions
 */

test.describe('EMERGENCY: Live @ Mention Behavior Diagnosis', () => {
  test('CRITICAL: @ Symbol Input Behavior - PostCreator vs Expected', async ({ page }) => {
    console.log('🚨 EMERGENCY LIVE TEST: Testing @ symbol behavior in PostCreator');

    // Navigate to PostCreator
    await page.goto('http://localhost:5173/create');
    await page.waitForLoadState('networkidle');
    
    // Wait for component to fully render
    await page.waitForTimeout(1000);

    // STEP 1: Find the actual content textarea
    const contentTextarea = page.locator('textarea[placeholder*="insights"]').first();
    await expect(contentTextarea).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Found PostCreator textarea');

    // STEP 2: Clear any existing content and click
    await contentTextarea.clear();
    await contentTextarea.click();
    
    // Wait for focus
    await page.waitForTimeout(500);

    // STEP 3: CRITICAL TEST - Type @ symbol
    console.log('🎯 CRITICAL: Typing @ symbol...');
    await contentTextarea.type('@', { delay: 100 });
    
    // STEP 4: Wait for potential dropdown appearance
    await page.waitForTimeout(1000);

    // STEP 5: BEHAVIOR VERIFICATION - Check what actually happens
    const behaviorCheck = await page.evaluate(() => {
      const textarea = document.querySelector('textarea[placeholder*="insights"]');
      const dropdown = document.querySelector('[role="listbox"]');
      const mentionDropdowns = document.querySelectorAll('[class*="dropdown"], [data-testid*="dropdown"], [id*="dropdown"]');
      
      return {
        textareaValue: textarea?.value || '',
        textareaFocused: document.activeElement === textarea,
        dropdownExists: !!dropdown,
        dropdownVisible: dropdown ? getComputedStyle(dropdown).display !== 'none' : false,
        dropdownClasses: dropdown?.className || 'NO_DROPDOWN',
        allDropdowns: mentionDropdowns.length,
        dropdownHTML: dropdown?.outerHTML?.substring(0, 200) || 'NO_DROPDOWN_HTML',
        textareaClasses: textarea?.className || 'NO_TEXTAREA',
        ariaExpanded: textarea?.getAttribute('aria-expanded') || 'NO_ARIA',
        hasPopup: textarea?.getAttribute('aria-haspopup') || 'NO_POPUP'
      };
    });

    console.log('📊 LIVE BEHAVIOR RESULTS:', behaviorCheck);

    // STEP 6: CRITICAL ASSERTIONS - What SHOULD happen vs what ACTUALLY happens
    console.log('🔍 EXPECTED: Dropdown should appear after typing @');
    console.log('🔍 ACTUAL:', behaviorCheck.dropdownExists ? 'Dropdown found' : 'NO DROPDOWN');
    
    // Test the critical failure point
    if (!behaviorCheck.dropdownExists) {
      console.log('🚨 CRITICAL FAILURE: No dropdown found after typing @');
      
      // EMERGENCY DIAGNOSIS: Why no dropdown?
      const diagnostics = await page.evaluate(() => {
        const textarea = document.querySelector('textarea[placeholder*="insights"]');
        return {
          mentionInputComponent: !!textarea?.closest('[data-mention]'),
          reactComponent: !!textarea?._reactInternalFiber,
          eventListeners: {
            onChange: typeof textarea?.onchange,
            onInput: typeof textarea?.oninput,
            onKeyDown: typeof textarea?.onkeydown
          },
          mentionService: typeof window.MentionService,
          consoleErrors: window.console.error.toString()
        };
      });
      
      console.log('🔬 FAILURE DIAGNOSIS:', diagnostics);
    }

    // BEHAVIORAL COMPARISON: Test another component for reference
    console.log('🔄 BEHAVIORAL COMPARISON: Testing MentionInputDemo if available');
    
    // Try to access MentionInputDemo for comparison
    const demoComparison = await page.evaluate(() => {
      // Look for any other textareas that might work
      const allTextareas = Array.from(document.querySelectorAll('textarea'));
      const workingTextareas = allTextareas.filter(t => 
        t.getAttribute('aria-haspopup') === 'listbox' || 
        t.classList.toString().includes('mention')
      );
      
      return {
        totalTextareas: allTextareas.length,
        workingTextareas: workingTextareas.length,
        textareaTypes: allTextareas.map(t => ({
          placeholder: t.placeholder,
          hasPopup: t.getAttribute('aria-haspopup'),
          classes: t.className
        }))
      };
    });
    
    console.log('🔍 COMPONENT COMPARISON:', demoComparison);

    // LONDON SCHOOL ASSERTION: Test the contract expectation
    expect(behaviorCheck.textareaValue).toBe('@');
    expect(behaviorCheck.textareaFocused).toBe(true);
    
    // CRITICAL FAILING ASSERTION: This will expose the bug
    expect(behaviorCheck.dropdownExists).toBe(true); // THIS SHOULD FAIL and show us the problem
  });

  test('LIVE DEBUGGING: Step-by-step @ mention workflow', async ({ page }) => {
    console.log('🔬 LIVE DEBUG: Step-by-step @ mention process');

    await page.goto('http://localhost:5173/create');
    await page.waitForLoadState('networkidle');

    // STEP 1: Component mounting verification
    const mountingCheck = await page.evaluate(() => {
      const textarea = document.querySelector('textarea[placeholder*="insights"]');
      return {
        step: 'MOUNTING',
        componentFound: !!textarea,
        parentComponent: textarea?.closest('[class*="PostCreator"]')?.tagName || 'NO_PARENT',
        mentionInputRef: textarea?.hasAttribute('data-mention-input') || false
      };
    });
    console.log('🔍 STEP 1 - MOUNTING:', mountingCheck);

    const textarea = page.locator('textarea[placeholder*="insights"]').first();
    await expect(textarea).toBeVisible();
    await textarea.click();

    // STEP 2: Focus and event listener verification
    const focusCheck = await page.evaluate(() => {
      const textarea = document.querySelector('textarea[placeholder*="insights"]');
      return {
        step: 'FOCUS',
        focused: document.activeElement === textarea,
        hasListeners: !!(textarea?.onchange || textarea?.oninput || textarea?.onkeydown)
      };
    });
    console.log('🔍 STEP 2 - FOCUS:', focusCheck);

    // STEP 3: Type @ and monitor real-time changes
    console.log('🔍 STEP 3 - TYPING @');
    
    // Monitor changes in real-time
    await page.evaluate(() => {
      window.mentionDebugLog = [];
      const textarea = document.querySelector('textarea[placeholder*="insights"]');
      
      if (textarea) {
        ['input', 'keydown', 'change'].forEach(eventType => {
          textarea.addEventListener(eventType, (e) => {
            window.mentionDebugLog.push({
              event: eventType,
              key: e.key || 'N/A',
              value: textarea.value,
              timestamp: Date.now(),
              dropdownExists: !!document.querySelector('[role="listbox"]')
            });
          });
        });
      }
    });

    await textarea.type('@', { delay: 200 });
    await page.waitForTimeout(1000);

    // STEP 4: Capture real-time behavior
    const realtimeResults = await page.evaluate(() => {
      return {
        step: 'REALTIME_CAPTURE',
        debugLog: window.mentionDebugLog || [],
        finalState: {
          textareaValue: document.querySelector('textarea[placeholder*="insights"]')?.value,
          dropdownVisible: !!document.querySelector('[role="listbox"]'),
          dropdownCount: document.querySelectorAll('[role="listbox"]').length
        }
      };
    });
    
    console.log('🔍 STEP 4 - REALTIME RESULTS:', realtimeResults);

    // STEP 5: Component state analysis
    const componentState = await page.evaluate(() => {
      const textarea = document.querySelector('textarea[placeholder*="insights"]');
      const reactInstance = textarea?._reactInternalFiber || textarea?._reactInternals;
      
      return {
        step: 'COMPONENT_STATE',
        hasReactInstance: !!reactInstance,
        componentName: reactInstance?.type?.name || 'NO_COMPONENT',
        props: reactInstance?.memoizedProps ? Object.keys(reactInstance.memoizedProps) : [],
        state: reactInstance?.memoizedState ? 'HAS_STATE' : 'NO_STATE'
      };
    });
    
    console.log('🔍 STEP 5 - COMPONENT STATE:', componentState);

    // CRITICAL BEHAVIORAL ASSERTION
    expect(realtimeResults.debugLog.length).toBeGreaterThan(0);
    expect(realtimeResults.debugLog.some(log => log.key === '@')).toBe(true);
    
    // THE CRITICAL FAILURE POINT
    expect(realtimeResults.finalState.dropdownVisible).toBe(true); // This should FAIL
  });

  test('COMPONENT COMPARISON: Working Demo vs Broken Production', async ({ page }) => {
    console.log('⚖️ COMPARISON TEST: Demo vs Production behavior');

    // First test production component (PostCreator)
    await page.goto('http://localhost:5173/create');
    await page.waitForLoadState('networkidle');
    
    const productionTextarea = page.locator('textarea[placeholder*="insights"]').first();
    await expect(productionTextarea).toBeVisible();
    await productionTextarea.click();
    await productionTextarea.type('@');
    await page.waitForTimeout(500);

    const productionBehavior = await page.evaluate(() => ({
      component: 'PRODUCTION_PostCreator',
      dropdownVisible: !!document.querySelector('[role="listbox"]'),
      dropdownItems: document.querySelectorAll('[role="listbox"] li').length,
      hasAriaPopup: document.querySelector('textarea[placeholder*="insights"]')?.hasAttribute('aria-haspopup'),
      value: document.querySelector('textarea[placeholder*="insights"]')?.value
    }));

    console.log('📊 PRODUCTION BEHAVIOR:', productionBehavior);

    // Now create inline MentionInputDemo for comparison
    await page.evaluate(() => {
      // Create a test MentionInput instance for comparison
      const testContainer = document.createElement('div');
      testContainer.id = 'comparison-test';
      testContainer.style.cssText = 'position:fixed;top:50px;left:50px;z-index:10000;background:white;padding:20px;border:2px solid red;';
      testContainer.innerHTML = `
        <h3>COMPARISON TEST</h3>
        <textarea id="demo-mention-input" placeholder="Type @ to mention agents..." style="width:300px;height:100px;"></textarea>
      `;
      document.body.appendChild(testContainer);
      
      // Manually attach basic mention functionality
      const demoTextarea = document.getElementById('demo-mention-input');
      if (demoTextarea) {
        demoTextarea.addEventListener('input', (e) => {
          if (e.target.value.includes('@')) {
            console.log('📢 DEMO: @ detected in manual demo input');
            
            // Create a basic dropdown for testing
            let dropdown = document.getElementById('demo-dropdown');
            if (!dropdown) {
              dropdown = document.createElement('div');
              dropdown.id = 'demo-dropdown';
              dropdown.role = 'listbox';
              dropdown.style.cssText = 'position:absolute;top:100%;left:0;background:white;border:1px solid #ccc;z-index:1000;';
              dropdown.innerHTML = '<li role="option">Demo Agent 1</li><li role="option">Demo Agent 2</li>';
              testContainer.appendChild(dropdown);
            }
            dropdown.style.display = 'block';
          }
        });
      }
    });

    // Test the demo component
    const demoTextarea = page.locator('#demo-mention-input');
    await expect(demoTextarea).toBeVisible();
    await demoTextarea.click();
    await demoTextarea.type('@');
    await page.waitForTimeout(500);

    const demoBehavior = await page.evaluate(() => ({
      component: 'DEMO_MentionInput',
      dropdownVisible: !!document.querySelector('#demo-dropdown[style*="block"]'),
      dropdownItems: document.querySelectorAll('#demo-dropdown li').length,
      value: document.querySelector('#demo-mention-input')?.value
    }));

    console.log('📊 DEMO BEHAVIOR:', demoBehavior);

    // BEHAVIORAL COMPARISON ANALYSIS
    const comparison = {
      productionWorks: productionBehavior.dropdownVisible,
      demoWorks: demoBehavior.dropdownVisible,
      bothHaveAt: productionBehavior.value === '@' && demoBehavior.value === '@',
      dropdownDifference: demoBehavior.dropdownItems - productionBehavior.dropdownItems
    };

    console.log('⚖️ COMPARISON RESULTS:', comparison);

    // LONDON SCHOOL ASSERTIONS: Compare contracts
    expect(productionBehavior.value).toBe('@');
    expect(demoBehavior.value).toBe('@');
    expect(comparison.bothHaveAt).toBe(true);
    
    // CRITICAL COMPARISON: This exposes the difference
    console.log('🚨 CRITICAL DIFFERENCE EXPOSED:');
    console.log(`Production dropdown: ${productionBehavior.dropdownVisible}`);
    console.log(`Demo dropdown: ${demoBehavior.dropdownVisible}`);
    
    // Clean up test elements
    await page.evaluate(() => {
      const testContainer = document.getElementById('comparison-test');
      if (testContainer) testContainer.remove();
    });
  });

  test('ROOT CAUSE ANALYSIS: Why MentionInput fails in PostCreator', async ({ page }) => {
    console.log('🔬 ROOT CAUSE ANALYSIS: Deep dive into MentionInput failure');

    await page.goto('http://localhost:5173/create');
    await page.waitForLoadState('networkidle');

    // ANALYSIS 1: Component integration check
    const integrationAnalysis = await page.evaluate(() => {
      const textarea = document.querySelector('textarea[placeholder*="insights"]');
      const mentionInput = textarea?.closest('[data-mention]') || textarea?.closest('[class*="MentionInput"]');
      
      return {
        analysis: 'INTEGRATION',
        textareaExists: !!textarea,
        mentionInputWrapper: !!mentionInput,
        componentHierarchy: {
          textarea: textarea?.tagName,
          parent1: textarea?.parentElement?.tagName,
          parent2: textarea?.parentElement?.parentElement?.tagName,
          parent3: textarea?.parentElement?.parentElement?.parentElement?.tagName
        },
        reactProps: textarea?._reactInternals?.memoizedProps ? 'FOUND' : 'MISSING',
        mentionCallbacks: {
          onChange: typeof textarea?._reactInternals?.memoizedProps?.onChange,
          onMentionSelect: typeof textarea?._reactInternals?.memoizedProps?.onMentionSelect
        }
      };
    });

    console.log('🔍 INTEGRATION ANALYSIS:', integrationAnalysis);

    // ANALYSIS 2: Event handling verification
    const textarea = page.locator('textarea[placeholder*="insights"]').first();
    await textarea.click();

    const eventAnalysis = await page.evaluate(() => {
      const textarea = document.querySelector('textarea[placeholder*="insights"]');
      
      // Check all possible event handlers
      return {
        analysis: 'EVENT_HANDLERS',
        directHandlers: {
          onchange: typeof textarea?.onchange,
          oninput: typeof textarea?.oninput,
          onkeydown: typeof textarea?.onkeydown,
          onclick: typeof textarea?.onclick
        },
        reactProps: textarea?._reactInternals?.memoizedProps ? {
          onChange: typeof textarea?._reactInternals?.memoizedProps.onChange,
          onInput: typeof textarea?._reactInternals?.memoizedProps.onInput,
          onKeyDown: typeof textarea?._reactInternals?.memoizedProps.onKeyDown,
          onMentionSelect: typeof textarea?._reactInternals?.memoizedProps.onMentionSelect
        } : 'NO_REACT_PROPS',
        eventListenerCount: textarea?.getEventListeners ? textarea.getEventListeners() : 'UNABLE_TO_CHECK'
      };
    });

    console.log('🔍 EVENT ANALYSIS:', eventAnalysis);

    // ANALYSIS 3: Type @ and capture what happens
    await textarea.type('@');
    await page.waitForTimeout(500);

    const behaviorAnalysis = await page.evaluate(() => {
      const textarea = document.querySelector('textarea[placeholder*="insights"]');
      
      return {
        analysis: 'BEHAVIOR',
        textareaValue: textarea?.value,
        mentionQuery: textarea?.getAttribute('data-mention-query'),
        dropdownSearch: {
          byRole: !!document.querySelector('[role="listbox"]'),
          byClass: !!document.querySelector('[class*="dropdown"]'),
          byTestId: !!document.querySelector('[data-testid*="dropdown"]'),
          anyDropdown: document.querySelectorAll('div').length // All divs that could be dropdowns
        },
        mentionState: window.mentionState || 'NO_GLOBAL_STATE',
        consoleErrors: window.console.error.calls || 'NO_ERROR_TRACKING'
      };
    });

    console.log('🔍 BEHAVIOR ANALYSIS:', behaviorAnalysis);

    // ANALYSIS 4: Compare with expected MentionInput behavior
    const expectedBehavior = {
      shouldTriggerDropdown: true,
      shouldShowSuggestions: true,
      shouldUpdateState: true,
      shouldHaveEventHandlers: true
    };

    const actualBehavior = {
      triggersDropdown: behaviorAnalysis.dropdownSearch.byRole,
      showsSuggestions: behaviorAnalysis.dropdownSearch.byRole && document.querySelectorAll('[role="listbox"] li').length > 0,
      updatesState: behaviorAnalysis.textareaValue === '@',
      hasEventHandlers: eventAnalysis.reactProps !== 'NO_REACT_PROPS'
    };

    const rootCause = {
      integrationIssue: !integrationAnalysis.mentionInputWrapper,
      eventHandlerIssue: eventAnalysis.reactProps === 'NO_REACT_PROPS',
      stateUpdateIssue: !actualBehavior.updatesState,
      dropdownRenderIssue: !actualBehavior.triggersDropdown
    };

    console.log('🎯 ROOT CAUSE IDENTIFIED:', rootCause);

    // CRITICAL ASSERTIONS to expose the exact failure point
    expect(integrationAnalysis.textareaExists).toBe(true);
    expect(actualBehavior.updatesState).toBe(true);
    expect(actualBehavior.hasEventHandlers).toBe(true);
    
    // THE CRITICAL FAILURE - This will tell us exactly what's broken
    expect(actualBehavior.triggersDropdown).toBe(true); // This should FAIL and expose the root cause
  });
});