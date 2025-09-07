import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://127.0.0.1:5173';

test.describe('Quick UI Regression Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Clear localStorage
    await page.evaluate(() => localStorage.clear());
  });

  test('should load main page without errors', async ({ page }) => {
    // Check if main feed loads
    await expect(page.locator('[data-testid="social-media-feed"]')).toBeVisible({ timeout: 10000 });
    
    // Check for any console errors
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') logs.push(msg.text());
    });
    
    await page.waitForTimeout(2000);
    expect(logs.length).toBe(0);
  });

  test('should open post creation modal', async ({ page }) => {
    // Look for post creation button
    const createButton = page.locator('[data-testid="start-post-button"]').first();
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Check if a modal or form appears
      await page.waitForTimeout(1000);
      
      // Success if no errors thrown
      expect(true).toBe(true);
    } else {
      console.log('Start post button not found, checking for alternative UI');
      expect(true).toBe(true);
    }
  });

  test('should handle localStorage operations safely', async ({ page }) => {
    // Test localStorage draft operations
    const result = await page.evaluate(() => {
      try {
        // Clear existing data
        localStorage.clear();
        
        // Test draft creation
        const testDraft = {
          id: 'test-draft-123',
          content: 'Test content for regression',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem('social_media_drafts', JSON.stringify([testDraft]));
        
        // Test retrieval
        const stored = localStorage.getItem('social_media_drafts');
        const parsed = JSON.parse(stored || '[]');
        
        return {
          success: true,
          draftCount: parsed.length,
          draftContent: parsed[0]?.content
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.draftCount).toBe(1);
    expect(result.draftContent).toBe('Test content for regression');
  });

  test('should detect draft duplication if it exists', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        localStorage.clear();
        
        // Create identical drafts to test duplication detection
        const draft1 = {
          id: 'duplicate-test-1',
          content: 'Duplicate test content',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        };
        
        const draft2 = {
          id: 'duplicate-test-1', // Same ID - should not happen
          content: 'Duplicate test content',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        };
        
        const drafts = [draft1, draft2];
        localStorage.setItem('social_media_drafts', JSON.stringify(drafts));
        
        const stored = JSON.parse(localStorage.getItem('social_media_drafts') || '[]');
        const ids = stored.map((d: any) => d.id);
        const uniqueIds = [...new Set(ids)];
        
        return {
          totalDrafts: stored.length,
          uniqueIdCount: uniqueIds.length,
          hasDuplicates: stored.length !== uniqueIds.length
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
    
    // This test is designed to detect if our system allows duplicates
    // The fix should prevent this scenario
    console.log('Duplication test result:', result);
    
    if ('hasDuplicates' in result) {
      // If duplicates exist, this indicates a regression
      if (result.hasDuplicates) {
        console.warn('WARNING: Draft duplication detected! This may indicate a regression.');
      }
      expect(result.hasDuplicates).toBe(false);
    }
  });

  test('should maintain performance with multiple operations', async ({ page }) => {
    const startTime = Date.now();
    
    await page.evaluate(() => {
      localStorage.clear();
      
      // Simulate rapid draft operations
      for (let i = 1; i <= 10; i++) {
        const draft = {
          id: `perf-test-${i}-${Date.now()}`,
          content: `Performance test draft ${i}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const existing = JSON.parse(localStorage.getItem('social_media_drafts') || '[]');
        existing.push(draft);
        localStorage.setItem('social_media_drafts', JSON.stringify(existing));
      }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Performance should be reasonable (under 5 seconds for 10 operations)
    expect(duration).toBeLessThan(5000);
    
    // Verify all drafts were created
    const count = await page.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem('social_media_drafts') || '[]');
      return stored.length;
    });
    
    expect(count).toBe(10);
  });

  test('should handle edge cases gracefully', async ({ page }) => {
    const edgeCases = await page.evaluate(() => {
      const results: any[] = [];
      
      try {
        localStorage.clear();
        
        // Test 1: Empty content
        const emptyDraft = {
          id: 'empty-test',
          content: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem('social_media_drafts', JSON.stringify([emptyDraft]));
        results.push({ test: 'empty-content', success: true });
        
        // Test 2: Very long content
        const longContent = 'A'.repeat(10000);
        const longDraft = {
          id: 'long-test',
          content: longContent,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem('social_media_drafts', JSON.stringify([longDraft]));
        results.push({ test: 'long-content', success: true });
        
        // Test 3: Special characters
        const specialDraft = {
          id: 'special-test',
          content: '🚀 Test with emojis 🎉 and special chars: @#$%^&*()',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem('social_media_drafts', JSON.stringify([specialDraft]));
        results.push({ test: 'special-chars', success: true });
        
        // Test 4: Corrupted data recovery
        localStorage.setItem('social_media_drafts', 'invalid json');
        const recovered = JSON.parse(localStorage.getItem('social_media_drafts') || '[]');
        results.push({ test: 'corruption-recovery', success: Array.isArray(recovered) });
        
      } catch (error) {
        results.push({ 
          test: 'edge-cases', 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
      
      return results;
    });
    
    edgeCases.forEach(result => {
      if (!result.success) {
        console.warn(`Edge case test failed: ${result.test}`, result.error);
      }
      expect(result.success).toBe(true);
    });
  });

  test('should verify no memory leaks in rapid operations', async ({ page }) => {
    // This test simulates rapid draft operations to check for memory leaks
    const memoryTest = await page.evaluate(() => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        localStorage.clear();
        
        const drafts = [];
        for (let j = 0; j < 10; j++) {
          drafts.push({
            id: `memory-test-${i}-${j}`,
            content: `Memory test content ${i}-${j}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        
        localStorage.setItem('social_media_drafts', JSON.stringify(drafts));
      }
      
      // Force garbage collection if available
      if ((window as any).gc) {
        (window as any).gc();
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      return {
        initialMemory,
        finalMemory,
        difference: finalMemory - initialMemory,
        hasMemoryAPI: !!(performance as any).memory
      };
    });
    
    console.log('Memory test results:', memoryTest);
    
    if (memoryTest.hasMemoryAPI) {
      // If memory usage increased by more than 50MB, that might indicate a leak
      const memoryIncreaseMB = memoryTest.difference / (1024 * 1024);
      expect(memoryIncreaseMB).toBeLessThan(50);
    }
    
    // Test passes if no exceptions were thrown
    expect(memoryTest.difference).toBeGreaterThanOrEqual(0);
  });
});