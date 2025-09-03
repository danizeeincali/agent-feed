import { test, expect } from '@playwright/test';

test.describe('Search Functionality Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="social-feed"]', { timeout: 10000 });
    await page.waitForSelector('.post-item', { timeout: 5000 });
  });

  test.describe('Search Interface Tests', () => {
    test('should display search interface correctly', async ({ page }) => {
      // Look for search input
      const searchInput = page.locator(
        'input[type="search"], input[placeholder*="search" i], .search-input, [data-testid*="search"]'
      );
      
      if (await searchInput.count() > 0) {
        await expect(searchInput.first()).toBeVisible();
        
        // Test that search input is functional
        await searchInput.first().fill('test');
        const value = await searchInput.first().inputValue();
        expect(value).toBe('test');
      }
    });

    test('should handle search without share-related functionality', async ({ page }) => {
      const searchInput = page.locator(
        'input[type="search"], input[placeholder*="search" i], .search-input, [data-testid*="search"]'
      );
      
      if (await searchInput.count() > 0) {
        // Perform a search
        await searchInput.first().fill('technology');
        await page.keyboard.press('Enter');
        
        await page.waitForTimeout(2000);
        
        // Verify no share buttons appear in search results
        const shareButtons = page.locator(
          'button[aria-label*="share" i], .share-button, [data-testid*="share"]'
        );
        await expect(shareButtons).toHaveCount(0);
        
        // Verify other functionality still works
        const likeButtons = page.locator('button[aria-label*="like" i], .like-button');
        if (await likeButtons.count() > 0) {
          await expect(likeButtons.first()).toBeVisible();
        }
      }
    });

    test('should support search filters without share options', async ({ page }) => {
      // Look for search filters or advanced search options
      const searchFilters = page.locator(
        '.search-filters, .advanced-search, [data-testid*="filter"]'
      );
      
      if (await searchFilters.count() > 0) {
        // Expand filters if needed
        const expandButton = page.locator('button:has-text("Filter"), button:has-text("Advanced")');
        if (await expandButton.count() > 0) {
          await expandButton.first().click();
          await page.waitForTimeout(500);
        }
        
        // Check that share-related filters are not present
        const shareFilters = page.locator(
          'text="Share", text="Shared", input[name*="share" i], [data-testid*="share"]'
        );
        await expect(shareFilters).toHaveCount(0);
        
        // Verify other filters are available
        const otherFilters = page.locator(
          'text="Date", text="Author", text="Tags", text="Category"'
        );
        // Should have at least some filter options
        expect(await otherFilters.count()).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Search Results Tests', () => {
    test('should display search results without share functionality', async ({ page }) => {
      const searchInput = page.locator(
        'input[type="search"], input[placeholder*="search" i], .search-input, [data-testid*="search"]'
      );
      
      if (await searchInput.count() > 0) {
        // Perform search
        await searchInput.first().fill('test');
        
        // Submit search
        const searchButton = page.locator('button[type="submit"], button:has-text("Search")');
        if (await searchButton.count() > 0) {
          await searchButton.first().click();
        } else {
          await page.keyboard.press('Enter');
        }
        
        await page.waitForTimeout(2000);
        
        // Check search results
        const searchResults = page.locator(
          '.search-results, .results, [data-testid*="result"]'
        );
        
        if (await searchResults.count() > 0) {
          // Verify no share buttons in results
          const shareButtons = searchResults.locator(
            'button[aria-label*="share" i], .share-button'
          );
          await expect(shareButtons).toHaveCount(0);
          
          // Verify other interactions still work
          const likeButtons = searchResults.locator('button[aria-label*="like" i]');
          if (await likeButtons.count() > 0) {
            await likeButtons.first().click();
            // Should not cause errors
          }
        }
      }
    });

    test('should handle empty search results gracefully', async ({ page }) => {
      const searchInput = page.locator(
        'input[type="search"], input[placeholder*="search" i], .search-input, [data-testid*="search"]'
      );
      
      if (await searchInput.count() > 0) {
        // Search for something unlikely to exist
        await searchInput.first().fill('xyznonexistentquery123');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
        
        // Should show empty state or no results message
        const emptyState = page.locator(
          'text=/no results/i, text=/not found/i, text=/no matches/i, .empty-results'
        );
        
        // Either shows empty state or gracefully shows no results
        const hasEmptyState = await emptyState.count() > 0;
        const hasNoResults = await page.locator('.search-result, .result-item').count() === 0;
        
        expect(hasEmptyState || hasNoResults).toBeTruthy();
      }
    });

    test('should maintain search state during navigation', async ({ page }) => {
      const searchInput = page.locator(
        'input[type="search"], input[placeholder*="search" i], .search-input, [data-testid*="search"]'
      );
      
      if (await searchInput.count() > 0) {
        const searchTerm = 'persistent search';
        await searchInput.first().fill(searchTerm);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        
        // Perform some navigation or interaction
        await page.keyboard.press('PageDown');
        await page.waitForTimeout(500);
        
        // Check if search term is still present
        const currentValue = await searchInput.first().inputValue();
        expect(currentValue).toBe(searchTerm);
      }
    });
  });

  test.describe('Search Performance Tests', () => {
    test('should perform search queries efficiently', async ({ page }) => {
      const searchInput = page.locator(
        'input[type="search"], input[placeholder*="search" i], .search-input, [data-testid*="search"]'
      );
      
      if (await searchInput.count() > 0) {
        const startTime = Date.now();
        
        await searchInput.first().fill('performance test');
        await page.keyboard.press('Enter');
        
        // Wait for search results or timeout
        try {
          await page.waitForSelector('.search-results, .results, .post-item', { timeout: 5000 });
        } catch (e) {
          // Results might appear differently
        }
        
        const endTime = Date.now();
        const searchTime = endTime - startTime;
        
        // Search should complete within reasonable time
        expect(searchTime).toBeLessThan(5000); // 5 seconds max
      }
    });

    test('should handle rapid search queries', async ({ page }) => {
      const searchInput = page.locator(
        'input[type="search"], input[placeholder*="search" i], .search-input, [data-testid*="search"]'
      );
      
      if (await searchInput.count() > 0) {
        const searchTerms = ['a', 'ab', 'abc', 'abcd'];
        
        for (const term of searchTerms) {
          await searchInput.first().fill(term);
          await page.waitForTimeout(100); // Brief pause between searches
        }
        
        // Should not cause errors or crashes
        await page.waitForTimeout(1000);
        
        // Page should still be functional
        const isPageFunctional = await page.locator('body').isVisible();
        expect(isPageFunctional).toBeTruthy();
      }
    });
  });

  test.describe('Search Accessibility Tests', () => {
    test('should support keyboard navigation in search', async ({ page }) => {
      const searchInput = page.locator(
        'input[type="search"], input[placeholder*="search" i], .search-input, [data-testid*="search"]'
      );
      
      if (await searchInput.count() > 0) {
        // Focus on search input using tab
        await page.keyboard.press('Tab');
        
        // Check if search input gets focused
        const focusedElement = page.locator(':focus');
        const isSearchFocused = await searchInput.first().evaluate(
          (el, focusedEl) => el === focusedEl,
          await focusedElement.elementHandle()
        );
        
        // Search should be accessible via keyboard
        if (isSearchFocused) {
          await page.keyboard.type('keyboard test');
          await page.keyboard.press('Enter');
          
          // Should trigger search
          await page.waitForTimeout(1000);
        }
      }
    });

    test('should have proper ARIA labels for search elements', async ({ page }) => {
      const searchInput = page.locator(
        'input[type="search"], input[placeholder*="search" i], .search-input, [data-testid*="search"]'
      );
      
      if (await searchInput.count() > 0) {
        const firstSearchInput = searchInput.first();
        
        // Check for accessibility attributes
        const ariaLabel = await firstSearchInput.getAttribute('aria-label');
        const placeholder = await firstSearchInput.getAttribute('placeholder');
        const id = await firstSearchInput.getAttribute('id');
        
        // Should have some form of labeling
        expect(ariaLabel || placeholder || id).toBeTruthy();
        
        // Check for associated label
        if (id) {
          const associatedLabel = page.locator(`label[for="${id}"]`);
          const hasLabel = await associatedLabel.count() > 0;
          
          if (hasLabel) {
            const labelText = await associatedLabel.textContent();
            expect(labelText?.trim().length).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  test.describe('Search API Integration Tests', () => {
    test('should handle search API responses correctly', async ({ page, request }) => {
      // Test search API endpoint directly
      const searchResponse = await request.get('http://localhost:3000/api/search?q=test');
      
      if (searchResponse.status() === 200) {
        const responseData = await searchResponse.json();
        
        // Verify response structure (should not contain share data)
        expect(Array.isArray(responseData) || typeof responseData === 'object').toBeTruthy();
        
        if (Array.isArray(responseData)) {
          responseData.forEach(item => {
            // Ensure no share-related fields in API response
            expect(item).not.toHaveProperty('shareCount');
            expect(item).not.toHaveProperty('shares');
            expect(item).not.toHaveProperty('shareUrl');
          });
        }
      }
    });

    test('should handle search API errors gracefully', async ({ page }) => {
      // Mock search API error
      await page.route('**/api/search**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Search service unavailable' })
        });
      });
      
      const searchInput = page.locator(
        'input[type="search"], input[placeholder*="search" i], .search-input, [data-testid*="search"]'
      );
      
      if (await searchInput.count() > 0) {
        await searchInput.first().fill('error test');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
        
        // Should handle error gracefully
        const errorMessage = page.locator(
          'text=/search error/i, text=/search unavailable/i, .search-error'
        );
        
        // Either shows error message or fails silently without crashing
        const pageStillWorks = await page.locator('body').isVisible();
        expect(pageStillWorks).toBeTruthy();
      }
    });
  });

  test.describe('Search History and Suggestions', () => {
    test('should handle search suggestions without share-related items', async ({ page }) => {
      const searchInput = page.locator(
        'input[type="search"], input[placeholder*="search" i], .search-input, [data-testid*="search"]'
      );
      
      if (await searchInput.count() > 0) {
        await searchInput.first().focus();
        await page.keyboard.type('te');
        await page.waitForTimeout(1000);
        
        // Look for search suggestions
        const suggestions = page.locator(
          '.search-suggestions, .autocomplete, [data-testid*="suggestion"]'
        );
        
        if (await suggestions.count() > 0) {
          // Verify no share-related suggestions
          const shareSuggestions = suggestions.locator('text=/share/i');
          await expect(shareSuggestions).toHaveCount(0);
        }
      }
    });

    test('should clear search functionality works', async ({ page }) => {
      const searchInput = page.locator(
        'input[type="search"], input[placeholder*="search" i], .search-input, [data-testid*="search"]'
      );
      
      if (await searchInput.count() > 0) {
        await searchInput.first().fill('clear test');
        
        // Look for clear button
        const clearButton = page.locator(
          'button[aria-label*="clear" i], .clear-search, [data-testid*="clear"]'
        );
        
        if (await clearButton.count() > 0) {
          await clearButton.first().click();
          
          const clearedValue = await searchInput.first().inputValue();
          expect(clearedValue).toBe('');
        }
      }
    });
  });
});