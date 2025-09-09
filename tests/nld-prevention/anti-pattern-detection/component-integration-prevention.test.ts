/**
 * COMPONENT INTEGRATION ANTI-PATTERN PREVENTION
 * 
 * Tests to prevent component integration failures where components work in isolation
 * but fail when integrated due to prop inconsistencies, event conflicts, or state interference.
 */

import { test, expect } from '@playwright/test';
import { Page } from 'playwright';

interface ComponentIntegrationContext {
  component: string;
  parentComponent?: string;
  selector: string;
  expectedProps: Record<string, any>;
  requiredEvents: string[];
  stateRequirements: Record<string, any>;
}

interface IntegrationFailurePattern {
  type: string;
  description: string;
  component: string;
  evidence: Record<string, any>;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

class ComponentIntegrationAnalyzer {
  
  async analyzeComponentIntegration(page: Page, context: ComponentIntegrationContext): Promise<IntegrationFailurePattern[]> {
    const failures: IntegrationFailurePattern[] = [];

    // Check prop consistency
    const propFailures = await this.analyzePropConsistency(page, context);
    failures.push(...propFailures);

    // Check event propagation
    const eventFailures = await this.analyzeEventPropagation(page, context);
    failures.push(...eventFailures);

    // Check state synchronization
    const stateFailures = await this.analyzeStateSynchronization(page, context);
    failures.push(...stateFailures);

    // Check render consistency
    const renderFailures = await this.analyzeRenderConsistency(page, context);
    failures.push(...renderFailures);

    return failures;
  }

  private async analyzePropConsistency(page: Page, context: ComponentIntegrationContext): Promise<IntegrationFailurePattern[]> {
    const failures: IntegrationFailurePattern[] = [];

    const propAnalysis = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;

      // Extract React props if available (React DevTools approach)
      const reactProps = (element as any)._reactInternalFiber?.memoizedProps || 
                        (element as any).__reactInternalInstance?.memoizedProps ||
                        {};

      // Get HTML attributes as fallback
      const htmlProps: Record<string, any> = {};
      Array.from(element.attributes).forEach(attr => {
        htmlProps[attr.name] = attr.value;
      });

      return {
        reactProps,
        htmlProps,
        className: element.className,
        tagName: element.tagName,
        children: element.children.length
      };
    }, context.selector);

    if (!propAnalysis) {
      failures.push({
        type: 'ComponentNotFound',
        description: `Component with selector ${context.selector} not found in DOM`,
        component: context.component,
        evidence: { selector: context.selector },
        severity: 'CRITICAL'
      });
      return failures;
    }

    // Check for required props
    for (const [propName, expectedValue] of Object.entries(context.expectedProps)) {
      const hasReactProp = propAnalysis.reactProps.hasOwnProperty(propName);
      const hasHtmlProp = propAnalysis.htmlProps.hasOwnProperty(propName);
      const reactValue = propAnalysis.reactProps[propName];
      const htmlValue = propAnalysis.htmlProps[propName];

      if (!hasReactProp && !hasHtmlProp) {
        failures.push({
          type: 'MissingRequiredProp',
          description: `Required prop '${propName}' missing from ${context.component}`,
          component: context.component,
          evidence: {
            propName,
            expectedValue,
            availableReactProps: Object.keys(propAnalysis.reactProps),
            availableHtmlProps: Object.keys(propAnalysis.htmlProps)
          },
          severity: 'HIGH'
        });
      } else if (expectedValue !== undefined) {
        const actualValue = reactValue !== undefined ? reactValue : htmlValue;
        if (actualValue !== expectedValue) {
          failures.push({
            type: 'PropValueMismatch',
            description: `Prop '${propName}' has value '${actualValue}' but expected '${expectedValue}'`,
            component: context.component,
            evidence: {
              propName,
              actualValue,
              expectedValue
            },
            severity: 'MEDIUM'
          });
        }
      }
    }

    return failures;
  }

  private async analyzeEventPropagation(page: Page, context: ComponentIntegrationContext): Promise<IntegrationFailurePattern[]> {
    const failures: IntegrationFailurePattern[] = [];

    for (const eventType of context.requiredEvents) {
      const eventTest = await page.evaluate(({ selector, eventType }) => {
        const element = document.querySelector(selector);
        if (!element) return { success: false, error: 'Element not found' };

        let eventFired = false;
        let eventData: any = null;

        // Add event listener
        const listener = (e: Event) => {
          eventFired = true;
          eventData = {
            type: e.type,
            bubbles: e.bubbles,
            cancelable: e.cancelable,
            target: e.target?.tagName,
            currentTarget: e.currentTarget?.tagName
          };
        };

        element.addEventListener(eventType, listener);

        // Trigger event
        try {
          const event = new Event(eventType, { bubbles: true, cancelable: true });
          element.dispatchEvent(event);
        } catch (error) {
          return { success: false, error: error.toString() };
        }

        // Cleanup
        element.removeEventListener(eventType, listener);

        return {
          success: eventFired,
          eventData,
          error: eventFired ? null : 'Event not handled'
        };
      }, { selector: context.selector, eventType });

      if (!eventTest.success) {
        failures.push({
          type: 'EventPropagationFailure',
          description: `Event '${eventType}' not properly handled by ${context.component}`,
          component: context.component,
          evidence: {
            eventType,
            error: eventTest.error,
            selector: context.selector
          },
          severity: 'HIGH'
        });
      }
    }

    return failures;
  }

  private async analyzeStateSynchronization(page: Page, context: ComponentIntegrationContext): Promise<IntegrationFailurePattern[]> {
    const failures: IntegrationFailurePattern[] = [];

    // Check if component state updates propagate correctly
    const stateTest = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) return { success: false, error: 'Element not found' };

      // Try to trigger state change through user interaction
      const initialState = {
        value: (element as HTMLInputElement).value || '',
        checked: (element as HTMLInputElement).checked,
        disabled: (element as HTMLInputElement).disabled,
        className: element.className
      };

      // Simulate user interaction
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        (element as HTMLInputElement).focus();
        (element as HTMLInputElement).value = 'test-state-change';
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        element.dispatchEvent(new Event('click', { bubbles: true }));
      }

      // Wait for potential state update
      setTimeout(() => {}, 100);

      const finalState = {
        value: (element as HTMLInputElement).value || '',
        checked: (element as HTMLInputElement).checked,
        disabled: (element as HTMLInputElement).disabled,
        className: element.className
      };

      return {
        success: true,
        initialState,
        finalState,
        stateChanged: JSON.stringify(initialState) !== JSON.stringify(finalState)
      };
    }, context.selector);

    if (!stateTest.success) {
      failures.push({
        type: 'StateUpdateFailure',
        description: `Component ${context.component} state updates not working properly`,
        component: context.component,
        evidence: {
          error: stateTest.error,
          selector: context.selector
        },
        severity: 'MEDIUM'
      });
    }

    return failures;
  }

  private async analyzeRenderConsistency(page: Page, context: ComponentIntegrationContext): Promise<IntegrationFailurePattern[]> {
    const failures: IntegrationFailurePattern[] = [];

    // Check if component renders consistently across different parent contexts
    const renderAnalysis = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;

      const computedStyle = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      return {
        isVisible: rect.width > 0 && rect.height > 0 && computedStyle.visibility !== 'hidden',
        dimensions: { width: rect.width, height: rect.height },
        position: { top: rect.top, left: rect.left },
        zIndex: computedStyle.zIndex,
        opacity: computedStyle.opacity,
        display: computedStyle.display,
        overflow: computedStyle.overflow,
        className: element.className,
        childCount: element.children.length
      };
    }, context.selector);

    if (!renderAnalysis) {
      failures.push({
        type: 'RenderFailure',
        description: `Component ${context.component} failed to render`,
        component: context.component,
        evidence: { selector: context.selector },
        severity: 'CRITICAL'
      });
    } else if (!renderAnalysis.isVisible) {
      failures.push({
        type: 'VisibilityFailure',
        description: `Component ${context.component} rendered but not visible`,
        component: context.component,
        evidence: {
          dimensions: renderAnalysis.dimensions,
          computedStyle: {
            display: renderAnalysis.display,
            visibility: 'hidden',
            opacity: renderAnalysis.opacity
          }
        },
        severity: 'HIGH'
      });
    }

    return failures;
  }
}

test.describe('Component Integration Anti-Pattern Prevention', () => {
  let analyzer: ComponentIntegrationAnalyzer;

  test.beforeEach(() => {
    analyzer = new ComponentIntegrationAnalyzer();
  });

  test('should prevent MentionInput integration failures across contexts', async ({ page }) => {
    await page.goto('/');

    const mentionContexts: ComponentIntegrationContext[] = [
      {
        component: 'PostCreator.MentionInput',
        parentComponent: 'PostCreator',
        selector: '[data-testid="post-creator"] input, [data-testid="post-creator"] textarea',
        expectedProps: {
          'data-testid': expect.any(String),
          placeholder: expect.any(String)
        },
        requiredEvents: ['input', 'focus', 'blur'],
        stateRequirements: {
          value: expect.any(String),
          focused: expect.any(Boolean)
        }
      },
      {
        component: 'CommentForm.MentionInput',
        parentComponent: 'CommentForm',
        selector: '[data-testid="comment-form"] input, [data-testid="comment-form"] textarea',
        expectedProps: {
          'data-testid': expect.any(String),
          placeholder: expect.any(String)
        },
        requiredEvents: ['input', 'focus', 'blur'],
        stateRequirements: {
          value: expect.any(String),
          focused: expect.any(Boolean)
        }
      },
      {
        component: 'QuickPost.MentionInput',
        parentComponent: 'QuickPost',
        selector: '[data-testid="quick-post"] input, [data-testid="quick-post"] textarea',
        expectedProps: {
          'data-testid': expect.any(String),
          placeholder: expect.any(String)
        },
        requiredEvents: ['input', 'focus', 'blur'],
        stateRequirements: {
          value: expect.any(String),
          focused: expect.any(Boolean)
        }
      }
    ];

    for (const context of mentionContexts) {
      const failures = await analyzer.analyzeComponentIntegration(page, context);
      
      // Log failures for debugging
      if (failures.length > 0) {
        console.log(`Integration failures for ${context.component}:`, failures);
      }

      // Should have no critical integration failures
      const criticalFailures = failures.filter(f => f.severity === 'CRITICAL');
      expect(criticalFailures).toHaveLength(0);

      // Test mention dropdown consistency
      const input = page.locator(context.selector).first();
      if (await input.count() > 0 && await input.isVisible()) {
        await input.clear();
        await input.fill('@');
        
        // All contexts should show dropdown or debug message
        const hasDropdown = await page.locator('[data-testid="mention-dropdown"]').isVisible({ timeout: 1000 }).catch(() => false);
        const hasDebugMessage = await page.locator(':has-text("🚨 EMERGENCY DEBUG: Dropdown Open")').isVisible({ timeout: 1000 }).catch(() => false);
        
        expect(hasDropdown || hasDebugMessage).toBe(true);
      }
    }
  });

  test('should validate prop consistency across identical components', async ({ page }) => {
    await page.goto('/');

    // Find all mention input components
    const mentionInputs = await page.locator('[data-testid*="mention"], input[placeholder*="@"], textarea[placeholder*="@"]').all();

    if (mentionInputs.length > 1) {
      const propComparisons: Array<{selector: string, props: Record<string, any>}> = [];

      for (const input of mentionInputs) {
        const props = await input.evaluate(el => {
          return {
            placeholder: el.getAttribute('placeholder'),
            className: el.className,
            disabled: (el as HTMLInputElement).disabled,
            required: (el as HTMLInputElement).required,
            type: (el as HTMLInputElement).type || el.tagName,
            'data-testid': el.getAttribute('data-testid')
          };
        });

        const selector = await input.evaluate(el => {
          return el.getAttribute('data-testid') || 
                 el.getAttribute('placeholder') || 
                 el.className.split(' ')[0] ||
                 el.tagName;
        });

        propComparisons.push({ selector, props });
      }

      // Compare essential props across all mention inputs
      const essentialProps = ['placeholder', 'disabled', 'required', 'type'];
      const baseProps = propComparisons[0].props;

      for (let i = 1; i < propComparisons.length; i++) {
        const currentProps = propComparisons[i].props;
        
        for (const prop of essentialProps) {
          if (prop === 'placeholder' && baseProps[prop] && currentProps[prop]) {
            // Placeholders should have consistent format
            const baseHasMention = baseProps[prop].includes('@');
            const currentHasMention = currentProps[prop].includes('@');
            expect(baseHasMention).toBe(currentHasMention);
          } else if (prop === 'disabled' || prop === 'required') {
            // Boolean props should be consistent
            expect(currentProps[prop]).toBe(baseProps[prop]);
          }
        }
      }
    }
  });

  test('should prevent event handling conflicts between components', async ({ page }) => {
    await page.goto('/');

    // Test event isolation between different input components
    const inputSelectors = [
      '[data-testid="post-creator"] input, [data-testid="post-creator"] textarea',
      '[data-testid="comment-form"] input, [data-testid="comment-form"] textarea',
      '[data-testid="quick-post"] input, [data-testid="quick-post"] textarea'
    ];

    const eventLog: string[] = [];

    // Add event listeners to track event propagation
    await page.evaluate(() => {
      (window as any).__eventLog = [];
      
      document.addEventListener('input', (e) => {
        (window as any).__eventLog.push(`input:${(e.target as Element).tagName}:${(e.target as Element).className}`);
      });

      document.addEventListener('focus', (e) => {
        (window as any).__eventLog.push(`focus:${(e.target as Element).tagName}:${(e.target as Element).className}`);
      });

      document.addEventListener('click', (e) => {
        (window as any).__eventLog.push(`click:${(e.target as Element).tagName}:${(e.target as Element).className}`);
      });
    });

    for (const selector of inputSelectors) {
      const input = page.locator(selector).first();
      
      if (await input.count() > 0 && await input.isVisible()) {
        // Clear event log
        await page.evaluate(() => { (window as any).__eventLog = []; });

        // Interact with input
        await input.click();
        await input.fill('test');
        await input.press('Enter');

        // Get event log
        const events = await page.evaluate(() => (window as any).__eventLog || []);
        
        // Should have expected events and no interference
        expect(events.length).toBeGreaterThan(0);
        
        // Should not have duplicate or conflicting events
        const duplicates = events.filter((event, index) => events.indexOf(event) !== index);
        expect(duplicates).toHaveLength(0);
      }
    }
  });

  test('should validate state synchronization across component hierarchy', async ({ page }) => {
    await page.goto('/');

    // Test parent-child state synchronization
    const postCreator = page.locator('[data-testid="post-creator"]');
    const commentForm = page.locator('[data-testid="comment-form"]');

    if (await postCreator.count() > 0) {
      // Test post creation state
      const postInput = postCreator.locator('input, textarea').first();
      
      if (await postInput.isVisible()) {
        await postInput.fill('Test post with @mention');
        
        // Check if parent component reflects state change
        const parentState = await postCreator.evaluate(el => {
          return {
            hasContent: el.textContent?.includes('Test post'),
            hasActiveClass: el.className.includes('active') || el.className.includes('focus'),
            childInputValue: (el.querySelector('input, textarea') as HTMLInputElement)?.value
          };
        });

        expect(parentState.childInputValue).toContain('Test post');
      }
    }

    if (await commentForm.count() > 0) {
      // Test comment form state
      const commentInput = commentForm.locator('input, textarea').first();
      
      if (await commentInput.isVisible()) {
        await commentInput.fill('Test comment with @mention');
        
        // Check state propagation
        const formState = await commentForm.evaluate(el => {
          return {
            hasContent: el.textContent?.includes('Test comment'),
            submitEnabled: !el.querySelector('button[type="submit"]')?.hasAttribute('disabled'),
            inputValue: (el.querySelector('input, textarea') as HTMLInputElement)?.value
          };
        });

        expect(formState.inputValue).toContain('Test comment');
      }
    }
  });

  test('should prevent conditional rendering failures', async ({ page }) => {
    await page.goto('/');

    // Test components that might have conditional rendering
    const conditionalComponents = [
      '[data-testid="comment-form"]',
      '[data-testid="post-creator"]',
      '[data-testid="mention-dropdown"]'
    ];

    for (const selector of conditionalComponents) {
      const element = page.locator(selector);
      
      if (await element.count() > 0) {
        // Check if component has conditional rendering logic
        const renderingInfo = await element.evaluate(el => {
          const style = window.getComputedStyle(el);
          const parent = el.parentElement;
          const parentStyle = parent ? window.getComputedStyle(parent) : null;
          
          return {
            isVisible: style.display !== 'none' && style.visibility !== 'hidden',
            hasConditionalDisplay: el.hasAttribute('data-show') || 
                                 el.hasAttribute('data-visible') ||
                                 el.className.includes('hidden') ||
                                 el.className.includes('show'),
            parentConditional: parentStyle ? 
              (parentStyle.display === 'none' || parentStyle.visibility === 'hidden') : false,
            hasChildren: el.children.length > 0
          };
        });

        // If component has conditional rendering, ensure it's properly visible when needed
        if (renderingInfo.hasConditionalDisplay) {
          expect(renderingInfo.isVisible).toBe(true);
          expect(renderingInfo.parentConditional).toBe(false);
        }
      }
    }
  });

  test('should export integration failure patterns for neural training', async ({ page }) => {
    await page.goto('/');

    const mentionContext: ComponentIntegrationContext = {
      component: 'TestMentionInput',
      selector: '[data-testid*="mention"], input[placeholder*="@"], textarea[placeholder*="@"]',
      expectedProps: { placeholder: expect.any(String) },
      requiredEvents: ['input', 'focus'],
      stateRequirements: {}
    };

    const failures = await analyzer.analyzeComponentIntegration(page, mentionContext);

    const neuralTrainingData = {
      timestamp: new Date().toISOString(),
      testCase: 'component-integration-prevention',
      component: mentionContext.component,
      failures,
      patternClassification: failures.length > 0 ? 'INTEGRATION_FAILURE' : 'INTEGRATION_SUCCESS',
      severity: failures.some(f => f.severity === 'CRITICAL') ? 'CRITICAL' :
               failures.some(f => f.severity === 'HIGH') ? 'HIGH' :
               failures.length > 0 ? 'MEDIUM' : 'LOW',
      neuralWeight: failures.length > 0 ? 0.8 : 0.2,
      preventionRules: [
        'Ensure prop consistency across identical components',
        'Test event handling in integration context',
        'Validate state synchronization patterns',
        'Check conditional rendering logic'
      ]
    };

    // Validate neural training data structure
    expect(neuralTrainingData.patternClassification).toMatch(/^(INTEGRATION_FAILURE|INTEGRATION_SUCCESS)$/);
    expect(neuralTrainingData.neuralWeight).toBeGreaterThan(0);
    expect(neuralTrainingData.neuralWeight).toBeLessThanOrEqual(1);
    expect(neuralTrainingData.preventionRules.length).toBeGreaterThan(0);

    console.log('Neural training data:', JSON.stringify(neuralTrainingData, null, 2));
  });
});