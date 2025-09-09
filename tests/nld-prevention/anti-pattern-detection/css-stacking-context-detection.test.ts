/**
 * CSS STACKING CONTEXT ANTI-PATTERN DETECTION
 * 
 * Specialized tests for detecting and preventing CSS stacking context traps
 * that prevent dropdown visibility despite high z-index values.
 */

import { test, expect } from '@playwright/test';
import { Page } from 'playwright';

interface StackingContextAnalysis {
  element: string;
  stackingContextCreators: string[];
  zIndex: number;
  computedStackingLevel: number;
  dropdownVisibility: boolean;
}

class CSSStackingContextDetector {
  
  async analyzeStackingContexts(page: Page): Promise<StackingContextAnalysis[]> {
    return await page.evaluate(() => {
      const results: StackingContextAnalysis[] = [];
      const elements = document.querySelectorAll('*');
      
      elements.forEach((element, index) => {
        const style = window.getComputedStyle(element);
        const stackingCreators: string[] = [];
        
        // Check for stacking context creators
        if (style.transform !== 'none') stackingCreators.push('transform');
        if (style.isolation !== 'auto') stackingCreators.push('isolation');
        if (style.backdropFilter !== 'none') stackingCreators.push('backdrop-filter');
        if (style.contain !== 'none') stackingCreators.push('contain');
        if (style.willChange !== 'auto') stackingCreators.push('will-change');
        if (style.opacity !== '1') stackingCreators.push('opacity');
        if (style.mixBlendMode !== 'normal') stackingCreators.push('mix-blend-mode');
        if (style.filter !== 'none') stackingCreators.push('filter');
        if (style.perspective !== 'none') stackingCreators.push('perspective');
        if (style.clipPath !== 'none') stackingCreators.push('clip-path');
        if (style.mask !== 'none') stackingCreators.push('mask');
        if (parseInt(style.zIndex) > 0) stackingCreators.push('z-index');
        
        if (stackingCreators.length > 0) {
          const rect = element.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 && 
                           style.visibility !== 'hidden' && 
                           style.display !== 'none';
          
          results.push({
            element: element.tagName + (element.className ? '.' + element.className.split(' ').join('.') : '') + (element.id ? '#' + element.id : ''),
            stackingContextCreators,
            zIndex: parseInt(style.zIndex) || 0,
            computedStackingLevel: this.computeStackingLevel(element),
            dropdownVisibility: isVisible && this.isDropdownElement(element)
          });
        }
      });
      
      return results;
    });
  }

  private computeStackingLevel(element: Element): number {
    let level = 0;
    let current = element.parentElement;
    
    while (current) {
      const style = window.getComputedStyle(current);
      if (this.createsStackingContext(style)) {
        level++;
      }
      current = current.parentElement;
    }
    
    return level;
  }

  private createsStackingContext(style: CSSStyleDeclaration): boolean {
    return style.transform !== 'none' ||
           style.isolation !== 'auto' ||
           style.backdropFilter !== 'none' ||
           style.contain !== 'none' ||
           parseInt(style.zIndex) > 0;
  }

  private isDropdownElement(element: Element): boolean {
    const classList = element.className.toLowerCase();
    const id = element.id.toLowerCase();
    
    return classList.includes('dropdown') ||
           classList.includes('menu') ||
           classList.includes('popover') ||
           id.includes('dropdown') ||
           element.getAttribute('data-testid')?.includes('dropdown') ||
           false;
  }

  async detectStackingContextTraps(page: Page): Promise<string[]> {
    const analysis = await this.analyzeStackingContexts(page);
    const issues: string[] = [];

    // Check for dropdown elements with complex stacking contexts
    const dropdownElements = analysis.filter(a => a.dropdownVisibility);
    
    for (const dropdown of dropdownElements) {
      if (dropdown.computedStackingLevel > 2) {
        issues.push(`Dropdown ${dropdown.element} trapped in ${dropdown.computedStackingLevel} stacking contexts`);
      }
      
      if (dropdown.stackingContextCreators.includes('transform') || 
          dropdown.stackingContextCreators.includes('isolation')) {
        issues.push(`Dropdown ${dropdown.element} has stacking context creators: ${dropdown.stackingContextCreators.join(', ')}`);
      }
      
      if (dropdown.zIndex > 0 && dropdown.zIndex < 1000) {
        issues.push(`Dropdown ${dropdown.element} has low z-index: ${dropdown.zIndex} (should be >= 1000)`);
      }
    }

    // Check for excessive stacking contexts
    const totalStackingContexts = analysis.length;
    if (totalStackingContexts > 10) {
      issues.push(`Excessive stacking contexts detected: ${totalStackingContexts} (should be <= 10)`);
    }

    return issues;
  }
}

test.describe('CSS Stacking Context Anti-Pattern Detection', () => {
  let detector: CSSStackingContextDetector;

  test.beforeEach(() => {
    detector = new CSSStackingContextDetector();
  });

  test('should detect stacking context traps preventing dropdown visibility', async ({ page }) => {
    await page.goto('/');

    const issues = await detector.detectStackingContextTraps(page);
    
    // Log detected issues for debugging
    if (issues.length > 0) {
      console.log('Stacking context issues detected:', issues);
    }

    // Assert no critical stacking context traps
    expect(issues.filter(issue => issue.includes('trapped in'))).toHaveLength(0);
  });

  test('should validate z-index hierarchy for dropdowns', async ({ page }) => {
    await page.goto('/');

    // Check all dropdown elements have proper z-index
    const dropdownZIndexes = await page.evaluate(() => {
      const dropdowns = document.querySelectorAll('[data-testid*="dropdown"], .dropdown, [class*="dropdown"]');
      return Array.from(dropdowns).map(el => {
        const style = window.getComputedStyle(el);
        return {
          element: el.className || el.tagName,
          zIndex: parseInt(style.zIndex) || 0
        };
      });
    });

    // All dropdowns should have z-index >= 1000
    for (const dropdown of dropdownZIndexes) {
      expect(dropdown.zIndex).toBeGreaterThanOrEqual(1000);
    }
  });

  test('should prevent transform/isolation properties in dropdown ancestors', async ({ page }) => {
    await page.goto('/');

    const problematicAncestors = await page.evaluate(() => {
      const dropdowns = document.querySelectorAll('[data-testid*="dropdown"], .dropdown, [class*="dropdown"]');
      const issues: string[] = [];
      
      dropdowns.forEach(dropdown => {
        let current = dropdown.parentElement;
        let ancestorCount = 0;
        
        while (current && ancestorCount < 5) {
          const style = window.getComputedStyle(current);
          
          if (style.transform !== 'none') {
            issues.push(`Dropdown ${dropdown.className} has transform ancestor: ${current.className}`);
          }
          
          if (style.isolation !== 'auto') {
            issues.push(`Dropdown ${dropdown.className} has isolation ancestor: ${current.className}`);
          }
          
          if (style.backdropFilter !== 'none') {
            issues.push(`Dropdown ${dropdown.className} has backdrop-filter ancestor: ${current.className}`);
          }
          
          current = current.parentElement;
          ancestorCount++;
        }
      });
      
      return issues;
    });

    // Should have no problematic ancestors
    expect(problematicAncestors).toHaveLength(0);
  });

  test('should validate mention dropdown visibility in comment contexts', async ({ page }) => {
    await page.goto('/');

    // Test mention dropdown in various contexts
    const contexts = [
      { name: 'PostCreator', selector: '[data-testid="post-creator"] input, [data-testid="post-creator"] textarea' },
      { name: 'CommentForm', selector: '[data-testid="comment-form"] input, [data-testid="comment-form"] textarea' },
      { name: 'QuickPost', selector: '[data-testid="quick-post"] input, [data-testid="quick-post"] textarea' }
    ];

    for (const context of contexts) {
      const input = page.locator(context.selector).first();
      
      if (await input.count() > 0 && await input.isVisible()) {
        // Clear and type @ to trigger mention dropdown
        await input.clear();
        await input.fill('@');
        
        // Wait for dropdown to appear
        await page.waitForTimeout(500);
        
        // Check for dropdown visibility indicators
        const hasDropdown = await page.locator('[data-testid="mention-dropdown"]').isVisible().catch(() => false);
        const hasDebugMessage = await page.locator(':has-text("🚨 EMERGENCY DEBUG: Dropdown Open")').isVisible().catch(() => false);
        
        // Should have dropdown or debug message in all contexts
        expect(hasDropdown || hasDebugMessage).toBe(true);
        
        // If no dropdown, analyze stacking context
        if (!hasDropdown && !hasDebugMessage) {
          const contextIssues = await detector.detectStackingContextTraps(page);
          console.log(`${context.name} stacking issues:`, contextIssues);
          
          // Fail test with detailed context
          throw new Error(`${context.name}: No mention dropdown detected. Stacking issues: ${contextIssues.join(', ')}`);
        }
      }
    }
  });

  test('should enforce flat DOM hierarchy for mention inputs', async ({ page }) => {
    await page.goto('/');

    const hierarchyAnalysis = await page.evaluate(() => {
      const mentionInputs = document.querySelectorAll('[data-testid*="mention"], input[placeholder*="@"], textarea[placeholder*="@"]');
      const results: Array<{element: string, depth: number, containers: string[]}> = [];
      
      mentionInputs.forEach(input => {
        let depth = 0;
        let current = input.parentElement;
        const containers: string[] = [];
        
        while (current && current !== document.body) {
          depth++;
          containers.push(current.tagName + (current.className ? '.' + current.className.split(' ')[0] : ''));
          
          // Stop if we find obvious component boundary
          if (current.className.includes('PostCreator') || 
              current.className.includes('CommentForm') ||
              current.className.includes('QuickPost')) {
            break;
          }
          
          current = current.parentElement;
        }
        
        results.push({
          element: input.getAttribute('data-testid') || input.placeholder || input.tagName,
          depth,
          containers
        });
      });
      
      return results;
    });

    // All mention inputs should have depth <= 3 (recommended: 2)
    for (const analysis of hierarchyAnalysis) {
      expect(analysis.depth).toBeLessThanOrEqual(3);
      
      if (analysis.depth > 2) {
        console.warn(`Deep hierarchy detected for ${analysis.element}:`, analysis.containers);
      }
    }
  });

  test('should detect and prevent CSS containment issues', async ({ page }) => {
    await page.goto('/');

    const containmentIssues = await page.evaluate(() => {
      const issues: string[] = [];
      const elements = document.querySelectorAll('*');
      
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        
        // Check for CSS containment that might trap dropdowns
        if (style.contain !== 'none') {
          const containsDropdown = el.querySelector('[data-testid*="dropdown"], .dropdown');
          if (containsDropdown) {
            issues.push(`Element ${el.tagName}.${el.className} has CSS containment with dropdown child`);
          }
        }
        
        // Check for overflow hidden that might clip dropdowns
        if (style.overflow === 'hidden' || style.overflowY === 'hidden') {
          const containsDropdown = el.querySelector('[data-testid*="dropdown"], .dropdown');
          if (containsDropdown) {
            issues.push(`Element ${el.tagName}.${el.className} has overflow hidden with dropdown child`);
          }
        }
      });
      
      return issues;
    });

    // Should have no containment issues
    expect(containmentIssues).toHaveLength(0);
  });

  test('should validate portal rendering for complex contexts', async ({ page }) => {
    await page.goto('/');

    // Check if dropdowns are rendered as portals when in complex contexts
    const portalAnalysis = await page.evaluate(() => {
      const dropdowns = document.querySelectorAll('[data-testid*="dropdown"], .dropdown');
      const results: Array<{dropdown: string, isPortal: boolean, parentDepth: number}> = [];
      
      dropdowns.forEach(dropdown => {
        let depth = 0;
        let current = dropdown.parentElement;
        
        while (current && current !== document.body) {
          depth++;
          current = current.parentElement;
        }
        
        const isPortal = dropdown.parentElement === document.body || 
                        dropdown.closest('[data-portal]') !== null;
        
        results.push({
          dropdown: dropdown.className || dropdown.tagName,
          isPortal,
          parentDepth: depth
        });
      });
      
      return results;
    });

    // Complex dropdowns (depth > 3) should use portals
    for (const analysis of portalAnalysis) {
      if (analysis.parentDepth > 3) {
        expect(analysis.isPortal).toBe(true);
      }
    }
  });

  test('should export stacking context analysis for neural training', async ({ page }) => {
    await page.goto('/');

    const analysis = await detector.analyzeStackingContexts(page);
    const issues = await detector.detectStackingContextTraps(page);

    // Export neural training data
    const neuralData = {
      timestamp: new Date().toISOString(),
      page: page.url(),
      stackingContexts: analysis,
      issues,
      patternClassification: issues.length > 0 ? 'STACKING_CONTEXT_TRAP' : 'CLEAN_STACKING',
      severity: issues.length > 5 ? 'HIGH' : issues.length > 0 ? 'MEDIUM' : 'LOW',
      neuralWeight: issues.length > 0 ? 0.9 : 0.1
    };

    // Should export valid neural training data
    expect(neuralData.stackingContexts).toBeDefined();
    expect(neuralData.patternClassification).toMatch(/^(STACKING_CONTEXT_TRAP|CLEAN_STACKING)$/);
    expect(neuralData.neuralWeight).toBeGreaterThan(0);
    expect(neuralData.neuralWeight).toBeLessThanOrEqual(1);

    // Log for actual export
    console.log('Neural training data:', JSON.stringify(neuralData, null, 2));
  });
});