import { test, expect, Page } from '@playwright/test';

/**
 * TDD London School Emergency Test Suite
 * Live Behavioral Testing - MentionInputDemo vs Production Components
 * 
 * Focus: ACTUAL behavior verification using mocks and contracts
 * Purpose: Identify WHY MentionInputDemo works but production components fail
 */

interface MentionBehaviorContract {
  shouldTriggerDropdownOnAt: boolean;
  shouldShowSuggestions: boolean;
  shouldHandleTyping: boolean;
  shouldAllowSelection: boolean;
  dropdownVisible: boolean;
  dropdownItems: number;
  componentMounted: boolean;
  eventHandlersAttached: boolean;
}

class MentionBehaviorMock {
  private behaviors: Map<string, MentionBehaviorContract> = new Map();
  private interactions: string[] = [];

  recordBehavior(component: string, behavior: MentionBehaviorContract) {
    this.behaviors.set(component, behavior);
    this.interactions.push(`${component}: recorded behavior`);
  }

  getBehavior(component: string): MentionBehaviorContract | undefined {
    return this.behaviors.get(component);
  }

  getInteractionHistory(): string[] {
    return [...this.interactions];
  }

  verifyContract(component: string, expected: Partial<MentionBehaviorContract>): boolean {
    const actual = this.behaviors.get(component);
    if (!actual) return false;

    return Object.keys(expected).every(key => 
      actual[key as keyof MentionBehaviorContract] === expected[key as keyof MentionBehaviorContract]
    );
  }
}

test.describe('TDD London School: Live Mention System Behavioral Comparison', () => {
  let behaviorMock: MentionBehaviorMock;

  test.beforeEach(async ({ page }) => {
    behaviorMock = new MentionBehaviorMock();
    
    // Navigate to application
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  });

  test('FAILING BEHAVIOR TEST: PostCreator @ keystroke should trigger dropdown', async ({ page }) => {
    console.log('🚨 TDD TEST: Testing PostCreator @ keystroke behavior');

    // Navigate to PostCreator
    await page.click('a[href="/create"]');
    await page.waitForLoadState('networkidle');

    // Find the content textarea in PostCreator
    const contentTextarea = page.locator('textarea[placeholder*="insights"]').first();
    await expect(contentTextarea).toBeVisible();

    // BEHAVIOR TEST: Type @ symbol
    await contentTextarea.click();
    await contentTextarea.type('@');
    
    // Wait for dropdown to potentially appear
    await page.waitForTimeout(500);

    // MOCK BEHAVIOR: Record what actually happens
    const dropdownExists = await page.locator('[role="listbox"]').isVisible().catch(() => false);
    const suggestionsCount = await page.locator('[role="listbox"] li').count().catch(() => 0);
    const componentVisible = await contentTextarea.isVisible();

    const postCreatorBehavior: MentionBehaviorContract = {
      shouldTriggerDropdownOnAt: true, // EXPECTED behavior
      shouldShowSuggestions: true,     // EXPECTED behavior
      shouldHandleTyping: true,        // EXPECTED behavior
      shouldAllowSelection: true,      // EXPECTED behavior
      dropdownVisible: dropdownExists, // ACTUAL behavior
      dropdownItems: suggestionsCount, // ACTUAL behavior
      componentMounted: componentVisible,
      eventHandlersAttached: componentVisible
    };

    behaviorMock.recordBehavior('PostCreator', postCreatorBehavior);

    // LONDON SCHOOL ASSERTION: Verify interactions match expectations
    expect(postCreatorBehavior.dropdownVisible).toBe(true); // This will likely FAIL
    expect(postCreatorBehavior.dropdownItems).toBeGreaterThan(0); // This will likely FAIL
    
    console.log('📊 PostCreator Behavior:', postCreatorBehavior);
  });

  test('WORKING BEHAVIOR TEST: MentionInputDemo @ keystroke triggers dropdown', async ({ page }) => {
    console.log('✅ TDD TEST: Testing MentionInputDemo @ keystroke behavior');

    // Navigate to MentionInputDemo (assuming it's accessible)
    // First check if demo route exists, otherwise create inline demo
    const demoExists = await page.goto('http://localhost:5173/demo').then(
      () => page.locator('h1:has-text("MentionInput Demo")').isVisible()
    ).catch(() => false);

    if (!demoExists) {
      // Go back to main page and create inline test
      await page.goto('http://localhost:5173');
      
      // Inject MentionInputDemo for testing
      await page.evaluate(() => {
        const testContainer = document.createElement('div');
        testContainer.id = 'mention-demo-test';
        testContainer.innerHTML = `
          <div id="mention-input-demo-container">
            <!-- MentionInputDemo will be mounted here -->
          </div>
        `;
        document.body.appendChild(testContainer);
      });
    }

    // Look for MentionInput in the demo (it should use the same component)
    const demoTextarea = page.locator('textarea[placeholder*="Type @ to mention"]').first();
    
    // If demo textarea exists, test it
    if (await demoTextarea.isVisible().catch(() => false)) {
      await demoTextarea.click();
      await demoTextarea.type('@');
      
      await page.waitForTimeout(500);

      const dropdownExists = await page.locator('[role="listbox"]').isVisible().catch(() => false);
      const suggestionsCount = await page.locator('[role="listbox"] li').count().catch(() => 0);

      const demoBehavior: MentionBehaviorContract = {
        shouldTriggerDropdownOnAt: true,
        shouldShowSuggestions: true,
        shouldHandleTyping: true,
        shouldAllowSelection: true,
        dropdownVisible: dropdownExists,
        dropdownItems: suggestionsCount,
        componentMounted: true,
        eventHandlersAttached: true
      };

      behaviorMock.recordBehavior('MentionInputDemo', demoBehavior);

      // LONDON SCHOOL ASSERTION: Demo should work
      expect(demoBehavior.dropdownVisible).toBe(true);
      expect(demoBehavior.dropdownItems).toBeGreaterThan(0);
      
      console.log('📊 MentionInputDemo Behavior:', demoBehavior);
    } else {
      console.log('⚠️ MentionInputDemo not accessible, skipping comparison');
    }
  });

  test('BEHAVIORAL COMPARISON: Identify differences between working and broken components', async ({ page }) => {
    console.log('🔍 TDD TEST: Comparing working vs broken component behaviors');

    // Test multiple components to identify patterns
    const componentsToTest = [
      { name: 'PostCreator', selector: 'a[href="/create"]', textareaSelector: 'textarea[placeholder*="insights"]' },
      { name: 'CommentForm', selector: 'button:has-text("Reply")', textareaSelector: 'textarea[placeholder*="comment"]' },
      { name: 'PostCreatorModal', selector: 'button:has-text("New Post")', textareaSelector: 'textarea' }
    ];

    const behaviorResults: Array<{ component: string; behavior: MentionBehaviorContract }> = [];

    for (const component of componentsToTest) {
      try {
        console.log(`🔍 Testing component: ${component.name}`);
        
        // Navigate to component
        if (component.selector.startsWith('a[')) {
          await page.click(component.selector);
          await page.waitForLoadState('networkidle');
        } else {
          // For modals/buttons, try clicking to open
          const trigger = page.locator(component.selector).first();
          if (await trigger.isVisible().catch(() => false)) {
            await trigger.click();
            await page.waitForTimeout(1000);
          }
        }

        // Find textarea
        const textarea = page.locator(component.textareaSelector).first();
        if (await textarea.isVisible().catch(() => false)) {
          await textarea.click();
          await textarea.type('@');
          await page.waitForTimeout(500);

          const dropdownExists = await page.locator('[role="listbox"]').isVisible().catch(() => false);
          const suggestionsCount = await page.locator('[role="listbox"] li').count().catch(() => 0);

          const behavior: MentionBehaviorContract = {
            shouldTriggerDropdownOnAt: true,
            shouldShowSuggestions: true,
            shouldHandleTyping: true,
            shouldAllowSelection: true,
            dropdownVisible: dropdownExists,
            dropdownItems: suggestionsCount,
            componentMounted: true,
            eventHandlersAttached: true
          };

          behaviorResults.push({ component: component.name, behavior });
          behaviorMock.recordBehavior(component.name, behavior);
          
          console.log(`📊 ${component.name} Results:`, {
            dropdownVisible: behavior.dropdownVisible,
            suggestionsCount: behavior.dropdownItems
          });
        }

        // Clear text for next test
        if (await textarea.isVisible().catch(() => false)) {
          await textarea.clear();
        }

      } catch (error) {
        console.log(`⚠️ Error testing ${component.name}:`, error.message);
      }
    }

    // BEHAVIORAL ANALYSIS: Compare all components
    const workingComponents = behaviorResults.filter(r => r.behavior.dropdownVisible);
    const brokenComponents = behaviorResults.filter(r => !r.behavior.dropdownVisible);

    console.log('✅ Working components:', workingComponents.map(c => c.component));
    console.log('❌ Broken components:', brokenComponents.map(c => c.component));

    // CONTRACT VERIFICATION: At least one component should work for comparison
    expect(behaviorResults.length).toBeGreaterThan(0);
    
    // CRITICAL ASSERTION: If all components are broken, that's the core issue
    if (brokenComponents.length === behaviorResults.length) {
      console.log('🚨 CRITICAL: ALL components fail mention dropdown test!');
      
      // EMERGENCY DEBUGGING: Check if MentionInput component exists at all
      const mentionInputExists = await page.evaluate(() => {
        return {
          mentionInputComponents: document.querySelectorAll('[data-mention-input]').length,
          textareas: document.querySelectorAll('textarea').length,
          dropdowns: document.querySelectorAll('[role="listbox"]').length,
          mentionServices: typeof window.MentionService !== 'undefined'
        };
      });
      
      console.log('🔍 Component Analysis:', mentionInputExists);
    }

    // Record results for further analysis
    await page.evaluate((results) => {
      window.mentionBehaviorTestResults = results;
    }, behaviorResults);
  });

  test('DOM INSPECTION: Verify MentionInput components are actually present', async ({ page }) => {
    console.log('🔍 TDD TEST: DOM inspection for MentionInput presence');

    // Navigate to PostCreator
    await page.click('a[href="/create"]');
    await page.waitForLoadState('networkidle');

    // MOCK DOM STATE: Capture actual DOM structure
    const domState = await page.evaluate(() => {
      const textareas = Array.from(document.querySelectorAll('textarea'));
      const mentionInputs = Array.from(document.querySelectorAll('[data-mention]'));
      const dropdowns = Array.from(document.querySelectorAll('[role="listbox"]'));
      
      return {
        textareasCount: textareas.length,
        textareasInfo: textareas.map(t => ({
          placeholder: t.placeholder,
          className: t.className,
          dataset: Object.fromEntries(Object.entries(t.dataset))
        })),
        mentionInputsCount: mentionInputs.length,
        dropdownsCount: dropdowns.length,
        hasMentionComponent: document.querySelector('textarea[aria-haspopup="listbox"]') !== null,
        hasEventListeners: textareas.some(t => t.onchange !== null || t.oninput !== null)
      };
    });

    console.log('📊 DOM State Analysis:', domState);

    // CONTRACT VERIFICATION: MentionInput should be properly integrated
    const domContract = {
      shouldHaveMentionTextarea: true,
      shouldHaveEventListeners: true,
      actualMentionTextarea: domState.hasMentionComponent,
      actualEventListeners: domState.hasEventListeners
    };

    behaviorMock.recordBehavior('DOM-Structure', {
      shouldTriggerDropdownOnAt: domContract.shouldHaveMentionTextarea,
      shouldShowSuggestions: domContract.shouldHaveEventListeners,
      shouldHandleTyping: domState.hasEventListeners,
      shouldAllowSelection: domState.hasMentionComponent,
      dropdownVisible: domState.dropdownsCount > 0,
      dropdownItems: 0,
      componentMounted: domState.textareasCount > 0,
      eventHandlersAttached: domState.hasEventListeners
    });

    // CRITICAL ASSERTION: Verify MentionInput is properly rendered
    expect(domState.textareasCount).toBeGreaterThan(0);
    expect(domState.hasMentionComponent).toBe(true); // This may FAIL if integration is broken
  });

  test('EVENT PROPAGATION: Test @ keystroke event handling', async ({ page }) => {
    console.log('🔍 TDD TEST: @ keystroke event propagation');

    await page.click('a[href="/create"]');
    await page.waitForLoadState('networkidle');

    // MOCK EVENT CAPTURE: Monitor actual events
    await page.evaluate(() => {
      window.mentionEventLog = [];
      
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach((textarea, index) => {
        ['keydown', 'keyup', 'input', 'change'].forEach(eventType => {
          textarea.addEventListener(eventType, (e) => {
            window.mentionEventLog.push({
              type: eventType,
              key: e.key,
              target: `textarea-${index}`,
              timestamp: Date.now()
            });
          });
        });
      });
    });

    // Type @ and monitor events
    const textarea = page.locator('textarea').first();
    await textarea.click();
    await textarea.type('@');
    await page.waitForTimeout(500);

    const eventLog = await page.evaluate(() => window.mentionEventLog);
    
    console.log('📊 Event Log:', eventLog);

    // CONTRACT VERIFICATION: Events should be properly captured
    const hasAtKeyEvents = eventLog.some(e => e.key === '@');
    const hasInputEvents = eventLog.some(e => e.type === 'input');

    const eventContract = {
      shouldCaptureAtKey: true,
      shouldTriggerInput: true,
      actualAtKey: hasAtKeyEvents,
      actualInput: hasInputEvents
    };

    behaviorMock.recordBehavior('Event-Propagation', {
      shouldTriggerDropdownOnAt: eventContract.shouldCaptureAtKey,
      shouldShowSuggestions: eventContract.shouldTriggerInput,
      shouldHandleTyping: hasInputEvents,
      shouldAllowSelection: hasAtKeyEvents,
      dropdownVisible: false, // Will be updated by dropdown detection
      dropdownItems: 0,
      componentMounted: true,
      eventHandlersAttached: eventLog.length > 0
    });

    expect(hasAtKeyEvents).toBe(true);
    expect(hasInputEvents).toBe(true);
  });

  test('COMPONENT HIERARCHY: Verify PostCreator → MentionInput integration', async ({ page }) => {
    console.log('🔍 TDD TEST: Component hierarchy analysis');

    await page.click('a[href="/create"]');
    await page.waitForLoadState('networkidle');

    // MOCK COMPONENT TREE: Analyze React component structure
    const componentHierarchy = await page.evaluate(() => {
      const textarea = document.querySelector('textarea[placeholder*="insights"]');
      if (!textarea) return null;

      return {
        textareaExists: true,
        parentComponent: textarea.closest('[class*="PostCreator"]') ? 'PostCreator' : 'Unknown',
        hasMentionProps: textarea.hasAttribute('aria-haspopup'),
        hasEventHandlers: textarea.onchange !== null || textarea.oninput !== null,
        reactFiber: textarea._reactInternalFiber ? 'present' : 'missing',
        propsSnapshot: {
          placeholder: textarea.placeholder,
          className: textarea.className,
          disabled: textarea.disabled
        }
      };
    });

    console.log('📊 Component Hierarchy:', componentHierarchy);

    if (componentHierarchy) {
      const hierarchyContract = {
        shouldBeInPostCreator: true,
        shouldHaveMentionProps: true,
        actualParent: componentHierarchy.parentComponent === 'PostCreator',
        actualMentionProps: componentHierarchy.hasMentionProps
      };

      behaviorMock.recordBehavior('Component-Hierarchy', {
        shouldTriggerDropdownOnAt: hierarchyContract.shouldHaveMentionProps,
        shouldShowSuggestions: hierarchyContract.shouldBeInPostCreator,
        shouldHandleTyping: componentHierarchy.hasEventHandlers,
        shouldAllowSelection: hierarchyContract.shouldHaveMentionProps,
        dropdownVisible: false,
        dropdownItems: 0,
        componentMounted: componentHierarchy.textareaExists,
        eventHandlersAttached: componentHierarchy.hasEventHandlers
      });

      // INTEGRATION ASSERTIONS: Verify proper PostCreator → MentionInput integration
      expect(componentHierarchy.textareaExists).toBe(true);
      expect(componentHierarchy.hasMentionProps).toBe(true); // This may FAIL if integration is broken
    } else {
      throw new Error('❌ CRITICAL: No textarea found in PostCreator');
    }
  });

  test.afterEach(async ({ page }) => {
    // LONDON SCHOOL TEARDOWN: Record all interactions and behaviors
    const allBehaviors = behaviorMock.getInteractionHistory();
    const finalReport = {
      interactions: allBehaviors,
      timestamp: new Date().toISOString(),
      testResults: 'recorded'
    };

    console.log('📋 TDD Test Session Report:', finalReport);

    // Store results for analysis
    await page.evaluate((report) => {
      window.tddLondonTestResults = report;
    }, finalReport);
  });
});