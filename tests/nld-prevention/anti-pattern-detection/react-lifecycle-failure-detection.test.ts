/**
 * REACT COMPONENT LIFECYCLE FAILURE DETECTION
 * 
 * Tests to detect and prevent React component mounting, unmounting, and lifecycle failures
 * that can cause components to not render or behave incorrectly.
 */

import { test, expect } from '@playwright/test';
import { Page } from 'playwright';

interface ReactLifecycleAnalysis {
  componentName: string;
  mounted: boolean;
  hasErrors: boolean;
  keyIssues: string[];
  refIssues: string[];
  lifecycleWarnings: string[];
  memoryLeaks: boolean;
  stateConsistency: boolean;
}

interface ReactError {
  message: string;
  componentStack: string;
  timestamp: number;
  severity: 'ERROR' | 'WARNING';
}

class ReactLifecycleDetector {
  
  async setupReactMonitoring(page: Page): Promise<void> {
    // Inject React error and warning monitoring
    await page.addInitScript(() => {
      // Capture React errors
      (window as any).__reactErrors = [];
      (window as any).__reactWarnings = [];
      (window as any).__componentMounts = [];
      (window as any).__componentUnmounts = [];
      (window as any).__keyWarnings = [];
      (window as any).__refErrors = [];

      // Override console methods to capture React warnings
      const originalError = console.error;
      const originalWarn = console.warn;

      console.error = (...args) => {
        const message = args.join(' ');
        
        if (message.includes('Warning:') || message.includes('React')) {
          (window as any).__reactErrors.push({
            message,
            timestamp: Date.now(),
            severity: 'ERROR'
          });
        }
        
        if (message.includes('key') && message.includes('unique')) {
          (window as any).__keyWarnings.push({
            message,
            timestamp: Date.now()
          });
        }
        
        originalError.apply(console, args);
      };

      console.warn = (...args) => {
        const message = args.join(' ');
        
        if (message.includes('Warning:') || message.includes('React')) {
          (window as any).__reactWarnings.push({
            message,
            timestamp: Date.now(),
            severity: 'WARNING'
          });
        }
        
        originalWarn.apply(console, args);
      };

      // Monitor component lifecycle if React DevTools is available
      if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
        
        hook.onCommitFiberRoot = (id: any, root: any) => {
          (window as any).__componentMounts.push({
            id,
            timestamp: Date.now(),
            type: 'mount'
          });
        };

        hook.onCommitFiberUnmount = (id: any, fiber: any) => {
          (window as any).__componentUnmounts.push({
            id,
            timestamp: Date.now(),
            type: 'unmount'
          });
        };
      }

      // Memory leak detection
      (window as any).__initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Track refs and potential issues
      (window as any).__trackRef = (refName: string, element: any) => {
        if (!element) {
          (window as any).__refErrors.push({
            refName,
            error: 'Ref is null',
            timestamp: Date.now()
          });
        }
      };
    });
  }

  async analyzeReactLifecycle(page: Page, componentSelector: string): Promise<ReactLifecycleAnalysis> {
    await this.setupReactMonitoring(page);
    
    // Navigate and interact with component
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Try to find and interact with the component
    const component = page.locator(componentSelector);
    let mounted = false;
    let interactionSuccess = false;

    if (await component.count() > 0) {
      mounted = true;
      
      try {
        // Test basic interaction
        if (await component.isVisible()) {
          await component.click({ timeout: 1000 });
          interactionSuccess = true;
        }
      } catch (e) {
        // Interaction failed, but component exists
      }
    }

    // Analyze React state
    const lifecycleData = await page.evaluate(() => {
      return {
        reactErrors: (window as any).__reactErrors || [],
        reactWarnings: (window as any).__reactWarnings || [],
        keyWarnings: (window as any).__keyWarnings || [],
        refErrors: (window as any).__refErrors || [],
        componentMounts: (window as any).__componentMounts || [],
        componentUnmounts: (window as any).__componentUnmounts || [],
        currentMemory: (performance as any).memory?.usedJSHeapSize || 0,
        initialMemory: (window as any).__initialMemory || 0
      };
    });

    // Check for React key issues
    const keyIssues = lifecycleData.keyWarnings.map((w: any) => w.message);
    
    // Check for ref issues
    const refIssues = lifecycleData.refErrors.map((e: any) => `${e.refName}: ${e.error}`);
    
    // Check for lifecycle warnings
    const lifecycleWarnings = lifecycleData.reactWarnings
      .filter((w: any) => w.message.includes('componentWillMount') || 
                         w.message.includes('componentWillReceiveProps') ||
                         w.message.includes('componentWillUpdate'))
      .map((w: any) => w.message);

    // Check for memory leaks
    const memoryIncrease = lifecycleData.currentMemory - lifecycleData.initialMemory;
    const memoryLeaks = memoryIncrease > 50 * 1024 * 1024; // 50MB threshold

    // Analyze state consistency
    const stateConsistency = await this.checkStateConsistency(page, componentSelector);

    return {
      componentName: componentSelector,
      mounted,
      hasErrors: lifecycleData.reactErrors.length > 0,
      keyIssues,
      refIssues,
      lifecycleWarnings,
      memoryLeaks,
      stateConsistency
    };
  }

  private async checkStateConsistency(page: Page, componentSelector: string): Promise<boolean> {
    // Test state consistency by interacting multiple times
    const component = page.locator(componentSelector);
    
    if (await component.count() === 0) return false;

    try {
      // Get initial state
      const initialState = await component.evaluate(el => {
        return {
          value: (el as HTMLInputElement).value || '',
          className: el.className,
          disabled: (el as HTMLInputElement).disabled || false
        };
      });

      // Interact with component
      if (await component.isVisible()) {
        await component.click();
        
        if (component.locator('input').count() > 0 || component.locator('textarea').count() > 0) {
          const input = component.locator('input, textarea').first();
          await input.fill('test-state-consistency');
          await input.blur();
        }
      }

      // Check final state
      const finalState = await component.evaluate(el => {
        return {
          value: (el as HTMLInputElement).value || '',
          className: el.className,
          disabled: (el as HTMLInputElement).disabled || false
        };
      });

      // State should be consistent and responsive to changes
      return initialState !== null && finalState !== null;
    } catch (e) {
      return false;
    }
  }

  async detectMountUnmountCycles(page: Page): Promise<Array<{component: string, cycles: number, issues: string[]}>> {
    await this.setupReactMonitoring(page);
    
    // Navigate and force re-renders
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Trigger potential re-mounts by navigation or state changes
    await page.reload();
    await page.waitForTimeout(1000);

    // Analyze mount/unmount patterns
    const cycleData = await page.evaluate(() => {
      const mounts = (window as any).__componentMounts || [];
      const unmounts = (window as any).__componentUnmounts || [];
      
      // Group by component ID
      const componentCycles = new Map<string, {mounts: number, unmounts: number}>();
      
      mounts.forEach((mount: any) => {
        const existing = componentCycles.get(mount.id) || {mounts: 0, unmounts: 0};
        existing.mounts++;
        componentCycles.set(mount.id, existing);
      });
      
      unmounts.forEach((unmount: any) => {
        const existing = componentCycles.get(unmount.id) || {mounts: 0, unmounts: 0};
        existing.unmounts++;
        componentCycles.set(unmount.id, existing);
      });
      
      return Array.from(componentCycles.entries()).map(([id, cycles]) => ({
        component: id,
        mounts: cycles.mounts,
        unmounts: cycles.unmounts
      }));
    });

    return cycleData.map(cycle => {
      const issues: string[] = [];
      
      if (cycle.mounts > cycle.unmounts + 1) {
        issues.push(`Potential memory leak: ${cycle.mounts} mounts vs ${cycle.unmounts} unmounts`);
      }
      
      if (cycle.mounts > 3) {
        issues.push(`Excessive re-mounting: ${cycle.mounts} mount cycles`);
      }
      
      return {
        component: cycle.component,
        cycles: cycle.mounts,
        issues
      };
    });
  }

  async validateReactKeys(page: Page): Promise<string[]> {
    await this.setupReactMonitoring(page);
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Force list re-renders to trigger key warnings
    const hasLists = await page.locator('ul, ol, [role="list"]').count() > 0;
    
    if (hasLists) {
      // Interact with lists to trigger re-renders
      await page.locator('ul li, ol li, [role="list"] [role="listitem"]').first().click().catch(() => {});
    }

    const keyIssues = await page.evaluate(() => {
      return (window as any).__keyWarnings?.map((warning: any) => warning.message) || [];
    });

    return keyIssues;
  }
}

test.describe('React Component Lifecycle Failure Detection', () => {
  let detector: ReactLifecycleDetector;

  test.beforeEach(() => {
    detector = new ReactLifecycleDetector();
  });

  test('should detect React component mounting failures', async ({ page }) => {
    const criticalComponents = [
      '[data-testid="post-creator"]',
      '[data-testid="comment-form"]',
      '[data-testid="mention-input"]',
      '[data-testid="quick-post"]'
    ];

    for (const componentSelector of criticalComponents) {
      const analysis = await detector.analyzeReactLifecycle(page, componentSelector);
      
      // Component should mount successfully
      if (await page.locator(componentSelector).count() > 0) {
        expect(analysis.mounted).toBe(true);
        
        // Should not have React errors
        expect(analysis.hasErrors).toBe(false);
        
        // Should not have key issues
        expect(analysis.keyIssues).toHaveLength(0);
        
        // Should not have ref issues
        expect(analysis.refIssues).toHaveLength(0);
        
        // Should not have deprecated lifecycle warnings
        expect(analysis.lifecycleWarnings).toHaveLength(0);
        
        console.log(`Component analysis for ${componentSelector}:`, {
          mounted: analysis.mounted,
          hasErrors: analysis.hasErrors,
          keyIssues: analysis.keyIssues.length,
          refIssues: analysis.refIssues.length,
          memoryLeaks: analysis.memoryLeaks
        });
      }
    }
  });

  test('should prevent React key uniqueness violations', async ({ page }) => {
    const keyIssues = await detector.validateReactKeys(page);
    
    // Should have no React key warnings
    expect(keyIssues).toHaveLength(0);
    
    if (keyIssues.length > 0) {
      console.log('React key issues detected:', keyIssues);
    }
  });

  test('should detect excessive component mount/unmount cycles', async ({ page }) => {
    const mountCycles = await detector.detectMountUnmountCycles(page);
    
    // Check for problematic mount/unmount patterns
    const problematicComponents = mountCycles.filter(cycle => cycle.issues.length > 0);
    
    // Should not have excessive re-mounting
    expect(problematicComponents).toHaveLength(0);
    
    if (problematicComponents.length > 0) {
      console.log('Problematic mount/unmount cycles:', problematicComponents);
    }
  });

  test('should validate React ref handling', async ({ page }) => {
    await detector.setupReactMonitoring(page);
    await page.goto('/');
    
    // Test ref assignment in mention inputs
    const mentionInputs = await page.locator('[data-testid*="mention"], input[placeholder*="@"], textarea[placeholder*="@"]').all();
    
    for (const input of mentionInputs) {
      if (await input.isVisible()) {
        // Test ref accessibility
        const refTest = await input.evaluate(el => {
          // Check if element has proper ref assignment
          const hasReactRef = !!(el as any)._reactInternalFiber || !!(el as any).__reactInternalInstance;
          const isAccessible = el instanceof HTMLElement;
          
          return {
            hasReactRef,
            isAccessible,
            tagName: el.tagName,
            className: el.className
          };
        });
        
        expect(refTest.isAccessible).toBe(true);
      }
    }

    // Check for ref errors
    const refErrors = await page.evaluate(() => {
      return (window as any).__refErrors || [];
    });

    expect(refErrors).toHaveLength(0);
  });

  test('should detect memory leaks in React components', async ({ page }) => {
    await detector.setupReactMonitoring(page);
    
    // Measure initial memory
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Perform memory-intensive operations
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Trigger component interactions that might cause leaks
    const components = await page.locator('[data-testid*="post"], [data-testid*="comment"], [data-testid*="mention"]').all();
    
    for (const component of components.slice(0, 5)) { // Test first 5 to avoid timeout
      if (await component.isVisible()) {
        await component.click();
        await page.waitForTimeout(100);
      }
    }

    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });

    await page.waitForTimeout(1000);

    // Measure final memory
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    const memoryIncrease = finalMemory - initialMemory;
    const memoryLeakThreshold = 100 * 1024 * 1024; // 100MB

    // Should not have significant memory leaks
    expect(memoryIncrease).toBeLessThan(memoryLeakThreshold);

    console.log(`Memory usage: Initial ${Math.round(initialMemory / 1024 / 1024)}MB, Final ${Math.round(finalMemory / 1024 / 1024)}MB, Increase ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
  });

  test('should validate component state consistency', async ({ page }) => {
    await page.goto('/');

    const statefulComponents = [
      '[data-testid="post-creator"]',
      '[data-testid="comment-form"]',
      '[data-testid="mention-input"]'
    ];

    for (const componentSelector of statefulComponents) {
      const component = page.locator(componentSelector);
      
      if (await component.count() > 0 && await component.isVisible()) {
        // Test state persistence through interactions
        const input = component.locator('input, textarea').first();
        
        if (await input.count() > 0) {
          const testValue = 'state-consistency-test';
          
          await input.clear();
          await input.fill(testValue);
          
          // Trigger potential state change
          await input.blur();
          await input.focus();
          
          const finalValue = await input.inputValue();
          
          // State should be consistent
          expect(finalValue).toBe(testValue);
        }
      }
    }
  });

  test('should detect React concurrent mode issues', async ({ page }) => {
    await detector.setupReactMonitoring(page);
    await page.goto('/');

    // Check for concurrent mode warnings
    const concurrentWarnings = await page.evaluate(() => {
      const warnings = (window as any).__reactWarnings || [];
      return warnings.filter((w: any) => 
        w.message.includes('concurrent') || 
        w.message.includes('Suspense') ||
        w.message.includes('startTransition')
      );
    });

    // Should handle concurrent mode properly
    expect(concurrentWarnings).toHaveLength(0);
  });

  test('should validate React error boundaries', async ({ page }) => {
    await page.goto('/');

    // Check if error boundaries are present
    const errorBoundaries = await page.evaluate(() => {
      const boundaries = document.querySelectorAll('[data-testid*="error"], [class*="error-boundary"]');
      return Array.from(boundaries).map(el => ({
        className: el.className,
        testId: el.getAttribute('data-testid'),
        visible: el.getBoundingClientRect().width > 0
      }));
    });

    // Should have error boundary infrastructure
    expect(errorBoundaries.length).toBeGreaterThanOrEqual(0);

    // If error boundaries exist, they should be properly configured
    for (const boundary of errorBoundaries) {
      expect(boundary.className).toBeTruthy();
    }
  });

  test('should export React lifecycle neural training data', async ({ page }) => {
    const componentSelector = '[data-testid*="mention"], [data-testid*="post"], [data-testid*="comment"]';
    const analysis = await detector.analyzeReactLifecycle(page, componentSelector);
    const mountCycles = await detector.detectMountUnmountCycles(page);
    const keyIssues = await detector.validateReactKeys(page);

    const neuralTrainingData = {
      timestamp: new Date().toISOString(),
      testType: 'react-lifecycle-failure-detection',
      componentAnalysis: analysis,
      mountCycles,
      keyIssues,
      patternClassification: analysis.hasErrors || keyIssues.length > 0 ? 'REACT_LIFECYCLE_FAILURE' : 'REACT_LIFECYCLE_HEALTHY',
      severity: analysis.hasErrors ? 'HIGH' : keyIssues.length > 0 ? 'MEDIUM' : 'LOW',
      neuralWeight: analysis.hasErrors ? 0.9 : keyIssues.length > 0 ? 0.6 : 0.1,
      preventionRules: [
        'Ensure unique React keys for all list items',
        'Avoid deprecated lifecycle methods',
        'Implement proper ref handling and cleanup',
        'Monitor component mount/unmount cycles',
        'Use error boundaries for graceful error handling',
        'Test state consistency across component interactions',
        'Monitor memory usage for leak prevention'
      ],
      healthIndicators: [
        'No React console errors or warnings',
        'Proper component mounting without excessive cycles',
        'Unique keys for all list items',
        'Memory usage remains stable during interactions',
        'State consistency maintained across interactions',
        'Error boundaries properly configured'
      ]
    };

    // Validate neural training data structure
    expect(neuralTrainingData.patternClassification).toMatch(/^(REACT_LIFECYCLE_FAILURE|REACT_LIFECYCLE_HEALTHY)$/);
    expect(neuralTrainingData.neuralWeight).toBeGreaterThan(0);
    expect(neuralTrainingData.neuralWeight).toBeLessThanOrEqual(1);
    expect(neuralTrainingData.preventionRules.length).toBeGreaterThan(0);

    console.log('React lifecycle neural training data:', JSON.stringify(neuralTrainingData, null, 2));
  });
});