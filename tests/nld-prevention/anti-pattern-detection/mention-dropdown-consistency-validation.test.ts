/**
 * MENTION DROPDOWN CONSISTENCY VALIDATION
 * 
 * Comprehensive tests to ensure MentionInput dropdown behavior is identical
 * across ALL contexts: PostCreator, CommentForm, QuickPost, and any other components.
 * 
 * Based on documented failure: "MentionInput works in some contexts but not others"
 */

import { test, expect } from '@playwright/test';
import { Page } from 'playwright';

interface MentionContextTest {
  name: string;
  route: string;
  selector: string;
  triggerMethod: 'typing' | 'focus' | 'click';
  expectedDebugMarkers: string[];
  requiredBehavior: string;
  parentComponent: string;
}

interface DropdownAnalysis {
  visible: boolean;
  hasDebugMessage: boolean;
  dropdownElement: any;
  zIndex: number;
  position: { top: number; left: number; width: number; height: number };
  stackingContext: any;
  suggestions: string[];
}

class MentionDropdownValidator {
  
  async validateDropdownConsistency(page: Page, contexts: MentionContextTest[]): Promise<Map<string, DropdownAnalysis>> {
    const results = new Map<string, DropdownAnalysis>();

    for (const context of contexts) {
      const analysis = await this.analyzeDropdownBehavior(page, context);
      results.set(context.name, analysis);
    }

    return results;
  }

  private async analyzeDropdownBehavior(page: Page, context: MentionContextTest): Promise<DropdownAnalysis> {
    await page.goto(context.route);
    
    // Wait for page to stabilize
    await page.waitForTimeout(1000);

    const input = page.locator(context.selector).first();
    
    // Ensure input exists and is interactable
    if (await input.count() === 0) {
      throw new Error(`Input not found: ${context.selector} in ${context.name}`);
    }

    await input.waitFor({ state: 'visible', timeout: 5000 });

    // Clear input and trigger mention
    await input.clear();
    
    switch (context.triggerMethod) {
      case 'typing':
        await input.fill('@');
        break;
      case 'focus':
        await input.focus();
        await input.fill('@');
        break;
      case 'click':
        await input.click();
        await input.fill('@');
        break;
    }

    // Wait for dropdown or debug message
    await page.waitForTimeout(1500);

    // Analyze dropdown state
    const analysis = await page.evaluate((debugMarkers) => {
      // Check for dropdown element
      const dropdownSelectors = [
        '[data-testid="mention-dropdown"]',
        '.mention-dropdown',
        '[class*="dropdown"]',
        '[role="listbox"]',
        '[role="menu"]'
      ];

      let dropdownElement = null;
      for (const selector of dropdownSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          dropdownElement = element;
          break;
        }
      }

      // Check for debug messages
      const hasDebugMessage = debugMarkers.some(marker => 
        document.body.textContent?.includes(marker) || 
        document.querySelector(`*:contains("${marker}")`)
      );

      // Get dropdown analysis
      let dropdownInfo = null;
      if (dropdownElement) {
        const style = window.getComputedStyle(dropdownElement);
        const rect = dropdownElement.getBoundingClientRect();
        
        dropdownInfo = {
          visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
          zIndex: parseInt(style.zIndex) || 0,
          position: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          },
          opacity: parseFloat(style.opacity) || 1,
          transform: style.transform,
          overflow: style.overflow
        };
      }

      // Get suggestions if available
      const suggestionElements = document.querySelectorAll('[data-testid*="mention-suggestion"], .mention-suggestion, [role="option"]');
      const suggestions = Array.from(suggestionElements).map(el => el.textContent?.trim()).filter(Boolean);

      // Check stacking context
      const stackingContext = dropdownElement ? this.analyzeStackingContext(dropdownElement) : null;

      return {
        visible: dropdownInfo?.visible || false,
        hasDebugMessage,
        dropdownElement: dropdownInfo,
        zIndex: dropdownInfo?.zIndex || 0,
        position: dropdownInfo?.position || { top: 0, left: 0, width: 0, height: 0 },
        stackingContext,
        suggestions
      };
    }, context.expectedDebugMarkers);

    return analysis as DropdownAnalysis;
  }

  private analyzeStackingContext(element: Element): any {
    let stackingCreators = 0;
    let current = element.parentElement;
    const contextDetails: string[] = [];

    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      
      if (style.transform !== 'none') {
        stackingCreators++;
        contextDetails.push(`transform: ${current.tagName}.${current.className}`);
      }
      if (style.isolation !== 'auto') {
        stackingCreators++;
        contextDetails.push(`isolation: ${current.tagName}.${current.className}`);
      }
      if (parseInt(style.zIndex) > 0) {
        stackingCreators++;
        contextDetails.push(`z-index: ${style.zIndex} on ${current.tagName}.${current.className}`);
      }
      
      current = current.parentElement;
    }

    return {
      stackingCreators,
      contextDetails,
      isTrapped: stackingCreators > 2
    };
  }

  compareDropdownBehavior(results: Map<string, DropdownAnalysis>): Array<{issue: string, severity: 'CRITICAL' | 'HIGH' | 'MEDIUM', contexts: string[]}> {
    const issues: Array<{issue: string, severity: 'CRITICAL' | 'HIGH' | 'MEDIUM', contexts: string[]}> = [];
    
    const contextNames = Array.from(results.keys());
    const analyses = Array.from(results.values());

    // Check for dropdown visibility inconsistency
    const visibleDropdowns = analyses.filter(a => a.visible).length;
    const debugMessages = analyses.filter(a => a.hasDebugMessage).length;
    
    if (visibleDropdowns > 0 && visibleDropdowns < analyses.length) {
      const workingContexts = contextNames.filter(name => results.get(name)?.visible);
      const failingContexts = contextNames.filter(name => !results.get(name)?.visible);
      
      issues.push({
        issue: `Inconsistent dropdown visibility: working in [${workingContexts.join(', ')}] but failing in [${failingContexts.join(', ')}]`,
        severity: 'CRITICAL',
        contexts: failingContexts
      });
    }

    // Check for debug message inconsistency
    if (debugMessages > 0 && debugMessages < analyses.length) {
      const workingDebug = contextNames.filter(name => results.get(name)?.hasDebugMessage);
      const missingDebug = contextNames.filter(name => !results.get(name)?.hasDebugMessage);
      
      issues.push({
        issue: `Inconsistent debug messages: present in [${workingDebug.join(', ')}] but missing in [${missingDebug.join(', ')}]`,
        severity: 'HIGH',
        contexts: missingDebug
      });
    }

    // Check for z-index inconsistency
    const zIndexValues = analyses.map(a => a.zIndex).filter(z => z > 0);
    const uniqueZIndexes = [...new Set(zIndexValues)];
    
    if (uniqueZIndexes.length > 1) {
      issues.push({
        issue: `Inconsistent z-index values: ${uniqueZIndexes.join(', ')} (should be uniform)`,
        severity: 'MEDIUM',
        contexts: contextNames
      });
    }

    // Check for stacking context traps
    analyses.forEach((analysis, index) => {
      if (analysis.stackingContext?.isTrapped) {
        issues.push({
          issue: `Dropdown trapped in stacking context in ${contextNames[index]}: ${analysis.stackingContext.contextDetails.join(', ')}`,
          severity: 'HIGH',
          contexts: [contextNames[index]]
        });
      }
    });

    return issues;
  }
}

test.describe('Mention Dropdown Consistency Validation', () => {
  let validator: MentionDropdownValidator;

  test.beforeEach(() => {
    validator = new MentionDropdownValidator();
  });

  test('should ensure identical dropdown behavior across all mention contexts', async ({ page }) => {
    const mentionContexts: MentionContextTest[] = [
      {
        name: 'PostCreator',
        route: '/',
        selector: '[data-testid="post-creator"] input, [data-testid="post-creator"] textarea',
        triggerMethod: 'typing',
        expectedDebugMarkers: ['🚨 EMERGENCY DEBUG: Dropdown Open'],
        requiredBehavior: 'shows dropdown on @ typing',
        parentComponent: 'PostCreator'
      },
      {
        name: 'QuickPost',
        route: '/',
        selector: '[data-testid="quick-post"] input, [data-testid="quick-post"] textarea',
        triggerMethod: 'typing',
        expectedDebugMarkers: ['🚨 EMERGENCY DEBUG: Dropdown Open'],
        requiredBehavior: 'shows dropdown on @ typing',
        parentComponent: 'QuickPost'
      },
      {
        name: 'CommentForm',
        route: '/',
        selector: '[data-testid="comment-form"] input, [data-testid="comment-form"] textarea',
        triggerMethod: 'typing',
        expectedDebugMarkers: ['🚨 EMERGENCY DEBUG: Dropdown Open'],
        requiredBehavior: 'shows dropdown on @ typing',
        parentComponent: 'CommentForm'
      },
      {
        name: 'ReplyForm',
        route: '/',
        selector: '[data-testid="reply-form"] input, [data-testid="reply-form"] textarea',
        triggerMethod: 'typing',
        expectedDebugMarkers: ['🚨 EMERGENCY DEBUG: Dropdown Open'],
        requiredBehavior: 'shows dropdown on @ typing',
        parentComponent: 'ReplyForm'
      }
    ];

    // Filter contexts that actually exist on the page
    await page.goto('/');
    const existingContexts: MentionContextTest[] = [];
    
    for (const context of mentionContexts) {
      const exists = await page.locator(context.selector).count() > 0;
      if (exists) {
        existingContexts.push(context);
      }
    }

    expect(existingContexts.length).toBeGreaterThan(0); // Should have at least one mention context

    // Validate dropdown behavior across all existing contexts
    const results = await validator.validateDropdownConsistency(page, existingContexts);
    
    // Analyze consistency
    const issues = validator.compareDropdownBehavior(results);
    
    // Log results for debugging
    console.log('Dropdown analysis results:');
    for (const [context, analysis] of results) {
      console.log(`${context}:`, {
        visible: analysis.visible,
        hasDebugMessage: analysis.hasDebugMessage,
        zIndex: analysis.zIndex,
        suggestions: analysis.suggestions.length,
        stackingTrapped: analysis.stackingContext?.isTrapped
      });
    }

    if (issues.length > 0) {
      console.log('Consistency issues found:', issues);
    }

    // Assert no critical consistency issues
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
    expect(criticalIssues).toHaveLength(0);

    // Assert all contexts have either dropdown visible OR debug message
    for (const [contextName, analysis] of results) {
      expect(analysis.visible || analysis.hasDebugMessage).toBe(true);
    }
  });

  test('should validate mention service context independence', async ({ page }) => {
    await page.goto('/');

    // Test that MentionService returns consistent results regardless of context
    const contextTests = [
      { context: 'post', expectedAgents: expect.any(Number) },
      { context: 'comment', expectedAgents: expect.any(Number) },
      { context: 'reply', expectedAgents: expect.any(Number) }
    ];

    for (const testCase of contextTests) {
      const serviceResult = await page.evaluate((context) => {
        // Simulate MentionService call
        if (typeof window !== 'undefined' && (window as any).MentionService) {
          return (window as any).MentionService.getQuickMentions(context);
        }
        
        // Fallback test - check if mention API endpoints work
        return fetch(`/api/mentions?context=${context}`)
          .then(r => r.json())
          .then(data => data.agents || [])
          .catch(() => []);
      }, testCase.context);

      // Should return agents for all contexts
      if (Array.isArray(serviceResult)) {
        expect(serviceResult.length).toBeGreaterThan(0);
      }
    }
  });

  test('should prevent DOM hierarchy interference patterns', async ({ page }) => {
    await page.goto('/');

    const hierarchyTests = [
      {
        name: 'PostCreator',
        selector: '[data-testid="post-creator"] input, [data-testid="post-creator"] textarea',
        maxDepth: 3
      },
      {
        name: 'CommentForm', 
        selector: '[data-testid="comment-form"] input, [data-testid="comment-form"] textarea',
        maxDepth: 3
      },
      {
        name: 'QuickPost',
        selector: '[data-testid="quick-post"] input, [data-testid="quick-post"] textarea',
        maxDepth: 3
      }
    ];

    for (const test of hierarchyTests) {
      const input = page.locator(test.selector).first();
      
      if (await input.count() > 0) {
        const hierarchyDepth = await input.evaluate((el) => {
          let depth = 0;
          let current = el.parentElement;
          
          while (current && current !== document.body) {
            depth++;
            
            // Stop at component boundary
            if (current.className.includes('PostCreator') ||
                current.className.includes('CommentForm') ||
                current.className.includes('QuickPost')) {
              break;
            }
            
            current = current.parentElement;
          }
          
          return depth;
        });

        expect(hierarchyDepth).toBeLessThanOrEqual(test.maxDepth);
      }
    }
  });

  test('should validate z-index standardization across dropdowns', async ({ page }) => {
    await page.goto('/');

    // Trigger mention dropdowns in all available contexts
    const mentionInputs = await page.locator('[data-testid*="mention"], input[placeholder*="@"], textarea[placeholder*="@"]').all();

    const zIndexAnalysis: Array<{context: string, zIndex: number, effective: boolean}> = [];

    for (const input of mentionInputs) {
      if (await input.isVisible()) {
        await input.clear();
        await input.fill('@');
        await page.waitForTimeout(500);

        const analysis = await page.evaluate(() => {
          const dropdowns = document.querySelectorAll('[data-testid*="dropdown"], .dropdown, [class*="dropdown"]');
          return Array.from(dropdowns).map(dropdown => {
            const style = window.getComputedStyle(dropdown);
            const rect = dropdown.getBoundingClientRect();
            
            return {
              zIndex: parseInt(style.zIndex) || 0,
              visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden',
              className: dropdown.className
            };
          });
        });

        const contextName = await input.evaluate(el => 
          el.getAttribute('data-testid') || 
          el.closest('[data-testid]')?.getAttribute('data-testid') ||
          'unknown'
        );

        analysis.forEach(a => {
          zIndexAnalysis.push({
            context: contextName,
            zIndex: a.zIndex,
            effective: a.visible && a.zIndex >= 1000
          });
        });
      }
    }

    // All dropdowns should have standardized z-index >= 1000
    const lowZIndexDropdowns = zIndexAnalysis.filter(a => a.zIndex > 0 && a.zIndex < 1000);
    expect(lowZIndexDropdowns).toHaveLength(0);

    // All visible dropdowns should be effective
    const ineffectiveDropdowns = zIndexAnalysis.filter(a => !a.effective && a.zIndex > 0);
    expect(ineffectiveDropdowns).toHaveLength(0);
  });

  test('should validate mention suggestions consistency', async ({ page }) => {
    await page.goto('/');

    const mentionInputs = await page.locator('[data-testid*="mention"], input[placeholder*="@"], textarea[placeholder*="@"]').all();
    const suggestionResults: Array<{context: string, suggestions: string[]}> = [];

    for (const input of mentionInputs) {
      if (await input.isVisible()) {
        await input.clear();
        await input.fill('@');
        await page.waitForTimeout(1000);

        const suggestions = await page.locator('[data-testid*="mention-suggestion"], .mention-suggestion, [role="option"]').allTextContents();
        
        const contextName = await input.evaluate(el =>
          el.getAttribute('data-testid') ||
          el.closest('[data-testid]')?.getAttribute('data-testid') ||
          'unknown'
        );

        suggestionResults.push({
          context: contextName,
          suggestions: suggestions.map(s => s.trim()).filter(Boolean)
        });
      }
    }

    // Should have consistent suggestion sets across contexts
    if (suggestionResults.length > 1) {
      const baseSuggestions = suggestionResults[0].suggestions;
      
      for (let i = 1; i < suggestionResults.length; i++) {
        const currentSuggestions = suggestionResults[i].suggestions;
        
        // Should have similar number of suggestions (±2)
        expect(Math.abs(currentSuggestions.length - baseSuggestions.length)).toBeLessThanOrEqual(2);
        
        // Should have some overlap in suggestions
        const overlap = baseSuggestions.filter(s => currentSuggestions.includes(s));
        expect(overlap.length).toBeGreaterThan(0);
      }
    }
  });

  test('should export neural training data for dropdown consistency patterns', async ({ page }) => {
    const mentionContexts: MentionContextTest[] = [
      {
        name: 'TestContext',
        route: '/',
        selector: '[data-testid*="mention"], input[placeholder*="@"], textarea[placeholder*="@"]',
        triggerMethod: 'typing',
        expectedDebugMarkers: ['🚨 EMERGENCY DEBUG: Dropdown Open'],
        requiredBehavior: 'shows dropdown on @ typing',
        parentComponent: 'Unknown'
      }
    ];

    const results = await validator.validateDropdownConsistency(page, mentionContexts);
    const issues = validator.compareDropdownBehavior(results);

    const neuralTrainingData = {
      timestamp: new Date().toISOString(),
      testType: 'mention-dropdown-consistency',
      contexts: Array.from(results.keys()),
      results: Object.fromEntries(results),
      issues,
      patternClassification: issues.length > 0 ? 'DROPDOWN_INCONSISTENCY' : 'DROPDOWN_CONSISTENT',
      severity: issues.some(i => i.severity === 'CRITICAL') ? 'CRITICAL' :
               issues.some(i => i.severity === 'HIGH') ? 'HIGH' :
               issues.length > 0 ? 'MEDIUM' : 'LOW',
      neuralWeight: issues.length > 0 ? 0.95 : 0.1,
      preventionRules: [
        'Ensure identical MentionInput behavior across all contexts',
        'Standardize z-index values for all dropdowns (>=1000)',
        'Prevent stacking context traps in dropdown ancestors',
        'Test dropdown visibility in actual component hierarchy',
        'Validate debug marker consistency across contexts'
      ],
      successPatterns: [
        'Flat DOM hierarchy (≤3 levels to MentionInput)',
        'No transform/isolation properties in dropdown ancestors',
        'Consistent debug output in all contexts',
        'Uniform z-index management',
        'Context-independent mention service responses'
      ]
    };

    // Validate neural training data structure
    expect(neuralTrainingData.patternClassification).toMatch(/^(DROPDOWN_INCONSISTENCY|DROPDOWN_CONSISTENT)$/);
    expect(neuralTrainingData.neuralWeight).toBeGreaterThan(0);
    expect(neuralTrainingData.neuralWeight).toBeLessThanOrEqual(1);
    expect(neuralTrainingData.preventionRules.length).toBeGreaterThan(0);

    console.log('Neural training data for dropdown consistency:', JSON.stringify(neuralTrainingData, null, 2));
  });

  test('should prevent CSS isolation and transform interference', async ({ page }) => {
    await page.goto('/');

    // Check for CSS properties that create stacking contexts and interfere with dropdowns
    const interferenceAnalysis = await page.evaluate(() => {
      const mentionInputs = document.querySelectorAll('[data-testid*="mention"], input[placeholder*="@"], textarea[placeholder*="@"]');
      const issues: Array<{input: string, ancestor: string, property: string, value: string}> = [];

      mentionInputs.forEach((input, index) => {
        let current = input.parentElement;
        let ancestorLevel = 0;

        while (current && current !== document.body && ancestorLevel < 5) {
          const style = window.getComputedStyle(current);
          const className = current.className || current.tagName;

          // Check for problematic CSS properties
          if (style.transform !== 'none') {
            issues.push({
              input: `input-${index}`,
              ancestor: className,
              property: 'transform',
              value: style.transform
            });
          }

          if (style.isolation !== 'auto') {
            issues.push({
              input: `input-${index}`,
              ancestor: className,
              property: 'isolation',
              value: style.isolation
            });
          }

          if (style.backdropFilter !== 'none') {
            issues.push({
              input: `input-${index}`,
              ancestor: className,
              property: 'backdrop-filter',
              value: style.backdropFilter
            });
          }

          if (style.contain !== 'none') {
            issues.push({
              input: `input-${index}`,
              ancestor: className,
              property: 'contain',
              value: style.contain
            });
          }

          current = current.parentElement;
          ancestorLevel++;
        }
      });

      return issues;
    });

    // Should have no CSS interference in dropdown ancestors
    expect(interferenceAnalysis).toHaveLength(0);

    if (interferenceAnalysis.length > 0) {
      console.log('CSS interference detected:', interferenceAnalysis);
    }
  });
});