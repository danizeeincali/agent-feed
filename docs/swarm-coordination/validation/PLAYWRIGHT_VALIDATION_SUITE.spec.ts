import { test, expect } from '@playwright/test';

/**
 * EMERGENCY PLAYWRIGHT VALIDATION SUITE
 * Live browser tests for @ mention system debugging
 * Agent: Playwright Validator
 * Priority: Emergency
 */

test.describe('Emergency @ Mention System Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app with mention input
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Critical @ Symbol Detection', () => {
    test('should detect @ symbol and trigger dropdown immediately', async ({ page }) => {
      // CRITICAL: Test immediate @ detection
      const textarea = page.locator('textarea[placeholder*="mention"]');
      await expect(textarea).toBeVisible();

      // Type @ symbol
      await textarea.fill('@');
      
      // CRITICAL: Dropdown should appear within 200ms
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 200 });
      
      // Verify dropdown has suggestions
      const suggestions = page.locator('[role="option"]');
      await expect(suggestions.first()).toBeVisible();
      
      // Count suggestions to ensure they loaded
      const suggestionCount = await suggestions.count();
      expect(suggestionCount).toBeGreaterThan(0);
      
      console.log(`✅ VALIDATION: ${suggestionCount} suggestions loaded`);
    });

    test('should handle @ in middle of text', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="mention"]');
      
      // Type some text, then @ in middle
      await textarea.fill('Hello ');
      await textarea.press('End'); // Ensure cursor at end
      await textarea.type('@');
      
      // Dropdown should appear
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 300 });
      
      // Verify debug info in dropdown
      const debugInfo = page.locator('text=/EMERGENCY DEBUG.*Dropdown Open/');
      await expect(debugInfo).toBeVisible();
    });

    test('should handle multiple @ symbols correctly', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="mention"]');
      
      // Type multiple @ symbols
      await textarea.fill('Hello @agent1 and @');
      
      // Should show dropdown for the second @
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 300 });
      
      // Should show suggestions for empty query
      const suggestions = page.locator('[role="option"]');
      expect(await suggestions.count()).toBeGreaterThan(0);
    });
  });

  test.describe('Suggestion Loading and Display', () => {
    test('should load suggestions without errors', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="mention"]');
      
      // Monitor console for errors
      const consoleMessages: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleMessages.push(msg.text());
        }
      });
      
      await textarea.fill('@');
      
      // Wait for suggestions to load
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible();
      
      // Check for loading indicator disappearance
      const loadingIndicator = page.locator('text=/Loading agents/');
      await expect(loadingIndicator).not.toBeVisible({ timeout: 2000 });
      
      // Verify no console errors
      expect(consoleMessages).toHaveLength(0);
    });

    test('should display suggestion details correctly', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="mention"]');
      await textarea.fill('@');
      
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible();
      
      // Check suggestion structure
      const firstSuggestion = page.locator('[role="option"]').first();
      await expect(firstSuggestion).toBeVisible();
      
      // Should have display name
      const displayName = firstSuggestion.locator('span.font-medium');
      await expect(displayName).toBeVisible();
      
      // Should have @name
      const mentionName = firstSuggestion.locator('text=/^@/');
      await expect(mentionName).toBeVisible();
      
      // Should have description
      const description = firstSuggestion.locator('p.text-xs');
      await expect(description).toBeVisible();
    });

    test('should filter suggestions based on query', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="mention"]');
      
      // Type @ to get all suggestions
      await textarea.fill('@');
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible();
      
      const initialCount = await page.locator('[role="option"]').count();
      expect(initialCount).toBeGreaterThan(0);
      
      // Add search query
      await textarea.fill('@chief');
      
      // Should filter suggestions
      await page.waitForTimeout(200); // Wait for debounce
      const filteredCount = await page.locator('[role="option"]').count();
      
      // Should have fewer or equal suggestions
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
      
      // Should contain "chief" in suggestions
      const chiefSuggestion = page.locator('[role="option"]:has-text("Chief")');
      await expect(chiefSuggestion).toBeVisible();
    });
  });

  test.describe('User Interaction Flows', () => {
    test('should handle keyboard navigation', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="mention"]');
      await textarea.fill('@');
      
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible();
      
      // First option should be selected by default
      const firstOption = page.locator('[role="option"][aria-selected="true"]');
      await expect(firstOption).toBeVisible();
      
      // Arrow down should select next option
      await textarea.press('ArrowDown');
      
      // Check selection changed
      const secondOption = page.locator('[role="option"]').nth(1);
      await expect(secondOption).toHaveAttribute('aria-selected', 'true');
      
      // Enter should select the option
      await textarea.press('Enter');
      
      // Dropdown should close
      await expect(dropdown).not.toBeVisible();
      
      // Text should contain the mention
      const textContent = await textarea.inputValue();
      expect(textContent).toMatch(/@\w+\s/);
    });

    test('should handle mouse interactions', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="mention"]');
      await textarea.fill('@');
      
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible();
      
      // Click on a suggestion
      const suggestion = page.locator('[role="option"]').first();
      await suggestion.click();
      
      // Dropdown should close
      await expect(dropdown).not.toBeVisible();
      
      // Text should contain the mention
      const textContent = await textarea.inputValue();
      expect(textContent).toMatch(/@\w+\s/);
    });

    test('should close dropdown on outside click', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="mention"]');
      await textarea.fill('@');
      
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible();
      
      // Click outside the component
      await page.locator('body').click();
      
      // Dropdown should close
      await expect(dropdown).not.toBeVisible();
    });

    test('should handle Escape key to close dropdown', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="mention"]');
      await textarea.fill('@');
      
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible();
      
      // Press Escape
      await textarea.press('Escape');
      
      // Dropdown should close
      await expect(dropdown).not.toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network failures gracefully', async ({ page }) => {
      // Block network requests to simulate failure
      await page.route('**/api/**', route => route.abort());
      
      const textarea = page.locator('textarea[placeholder*="mention"]');
      await textarea.fill('@');
      
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible();
      
      // Should show fallback suggestions or error message
      const fallbackContent = page.locator('[role="listbox"] :text("fallback")');
      const errorContent = page.locator('[role="listbox"] :text("error")');
      const noResults = page.locator('[role="listbox"] :text("No agents")');
      
      // One of these should be visible
      await expect(
        fallbackContent.or(errorContent).or(noResults)
      ).toBeVisible({ timeout: 3000 });
    });

    test('should handle rapid typing without breaking', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="mention"]');
      
      // Rapid typing simulation
      for (const char of '@chief@personal@assistant') {
        await textarea.press('Backspace');
        await textarea.type(char);
        await page.waitForTimeout(50); // Fast typing
      }
      
      // Should not crash or show multiple dropdowns
      const dropdowns = page.locator('[role="listbox"]');
      expect(await dropdowns.count()).toBeLessThanOrEqual(1);
    });

    test('should handle very long text input', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="mention"]');
      
      // Create very long text with @ at the end
      const longText = 'A'.repeat(1000) + '@';
      await textarea.fill(longText);
      
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 1000 });
      
      // Should still show suggestions
      const suggestions = page.locator('[role="option"]');
      expect(await suggestions.count()).toBeGreaterThan(0);
    });
  });

  test.describe('Performance Validation', () => {
    test('should render suggestions within performance budget', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="mention"]');
      
      // Measure performance
      const startTime = Date.now();
      
      await textarea.fill('@');
      
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible();
      
      // Wait for suggestions to load
      const suggestions = page.locator('[role="option"]');
      await expect(suggestions.first()).toBeVisible();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should render within 500ms (performance budget)
      expect(duration).toBeLessThan(500);
      
      console.log(`⚡ Performance: Suggestions rendered in ${duration}ms`);
    });

    test('should not cause memory leaks during repeated use', async ({ page }) => {
      const textarea = page.locator('textarea[placeholder*="mention"]');
      
      // Repeat the flow multiple times
      for (let i = 0; i < 10; i++) {
        await textarea.fill('@test');
        const dropdown = page.locator('[role="listbox"]');
        await expect(dropdown).toBeVisible();
        
        await textarea.press('Escape');
        await expect(dropdown).not.toBeVisible();
        
        await textarea.clear();
        await page.waitForTimeout(100);
      }
      
      // No specific assertion - just ensuring no crashes occur
      console.log('✅ Memory leak test completed without crashes');
    });
  });
});

/**
 * DEBUG UTILITIES FOR EMERGENCY DEBUGGING
 */
test.describe('Debug and Diagnostic Tests', () => {
  test('should capture debug information for analysis', async ({ page }) => {
    // Capture all console messages
    const consoleMessages: Array<{type: string, text: string}> = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });
    
    const textarea = page.locator('textarea[placeholder*="mention"]');
    await textarea.fill('@');
    
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toBeVisible();
    
    // Extract debug information
    const debugInfo = await page.locator('text=/EMERGENCY DEBUG.*Dropdown Open/').textContent();
    
    // Log all captured information
    console.log('=== EMERGENCY DEBUG CAPTURE ===');
    console.log('Debug Info:', debugInfo);
    console.log('Console Messages:', consoleMessages.filter(m => m.text.includes('EMERGENCY')));
    console.log('================================');
  });

  test('should take screenshots for visual regression', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder*="mention"]');
    await textarea.fill('@');
    
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ 
      path: 'docs/swarm-coordination/validation/mention-dropdown-debug.png',
      fullPage: true 
    });
    
    console.log('📸 Debug screenshot saved');
  });
});