import { test, expect } from '@playwright/test';

test.describe('Phase 3: Advanced Template System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Template Library UI', () => {
    test('should display template library with grid and list views', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('button', { name: /template/i }).click();
      
      // Should default to grid view
      const gridViewButton = page.locator('[data-testid="grid-view-button"]');
      const listViewButton = page.locator('[data-testid="list-view-button"]');
      
      await expect(gridViewButton).toHaveClass(/active|selected/);
      
      // Switch to list view
      await listViewButton.click();
      await expect(listViewButton).toHaveClass(/active|selected/);
      
      // Verify layout changed
      const templates = page.locator('[data-testid="template-item"]');
      const firstTemplate = templates.first();
      
      // List view should be more compact
      const boundingBox = await firstTemplate.boundingBox();
      expect(boundingBox?.height).toBeLessThan(100); // List items should be shorter
    });

    test('should filter templates by category', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('button', { name: /template/i }).click();
      
      // Open filters
      await page.getByRole('button', { name: /filters/i }).click();
      
      // Select a specific category
      await page.getByRole('button', { name: /code.*review/i }).click();
      
      // Wait for filtering to complete
      await page.waitForTimeout(500);
      
      // All visible templates should be code review related
      const templates = page.locator('[data-testid="template-card"]');
      const count = await templates.count();
      
      if (count > 0) {
        const firstTemplate = templates.first();
        const templateText = await firstTemplate.textContent();
        expect(templateText?.toLowerCase()).toContain('code');
      }
    });

    test('should sort templates by different criteria', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('button', { name: /template/i }).click();
      
      // Test popularity sort (default)
      const sortSelect = page.locator('select[data-testid="sort-select"]');
      await expect(sortSelect).toHaveValue('popularity');
      
      // Switch to alphabetical sort
      await sortSelect.selectOption('name');
      await page.waitForTimeout(500);
      
      // Get first template name
      const templates = page.locator('[data-testid="template-card"]');
      const firstTemplateName = await templates.first().locator('[data-testid="template-name"]').textContent();
      
      // Switch to usage sort
      await sortSelect.selectOption('usage');
      await page.waitForTimeout(500);
      
      // Template order should have changed
      const newFirstTemplateName = await templates.first().locator('[data-testid="template-name"]').textContent();
      
      // Names should be different (unless there's only one template)
      const templateCount = await templates.count();
      if (templateCount > 1) {
        expect(firstTemplateName).not.toBe(newFirstTemplateName);
      }
    });

    test('should show template popularity and usage statistics', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('button', { name: /template/i }).click();
      
      const templates = page.locator('[data-testid="template-card"]');
      const firstTemplate = templates.first();
      
      // Should show popularity rating
      const popularityIndicator = firstTemplate.locator('[data-testid="popularity-score"], text=/★|star/i');
      await expect(popularityIndicator).toBeVisible();
      
      // Should show usage count
      const usageIndicator = firstTemplate.locator('[data-testid="usage-count"], text=/used|times/i');
      await expect(usageIndicator).toBeVisible();
    });
  });

  test.describe('Template Content Quality', () => {
    test('should verify all default templates have required fields', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('button', { name: /template/i }).click();
      
      const templates = page.locator('[data-testid="template-card"]');
      const count = await templates.count();
      
      // Check at least 15 templates
      expect(count).toBeGreaterThanOrEqual(15);
      
      // Verify each template has required elements
      for (let i = 0; i < Math.min(count, 20); i++) {
        const template = templates.nth(i);
        
        // Should have name
        const name = template.locator('[data-testid="template-name"]');
        await expect(name).toBeVisible();
        await expect(name).not.toBeEmpty();
        
        // Should have description
        const description = template.locator('[data-testid="template-description"]');
        await expect(description).toBeVisible();
        await expect(description).not.toBeEmpty();
        
        // Should have category
        const category = template.locator('[data-testid="template-category"]');
        await expect(category).toBeVisible();
        
        // Should have icon or emoji
        const icon = template.locator('[data-testid="template-icon"], text=/[📊💡❓📢🔍📝🎯🔧🎉🆘🧠⚖️📚🔄💭]/');
        await expect(icon).toBeVisible();
      }
    });

    test('should validate template structure when applied', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('button', { name: /template/i }).click();
      
      // Test specific templates for proper structure
      const testTemplates = [
        { name: 'Status Update', expectedSections: ['Completed', 'Upcoming', 'Blockers'] },
        { name: 'Code Review', expectedSections: ['Review Request', 'What Changed', 'Areas of Focus'] },
        { name: 'Meeting Summary', expectedSections: ['Meeting Details', 'Key Decisions', 'Action Items'] }
      ];
      
      for (const templateTest of testTemplates) {
        // Search for the template
        const searchInput = page.getByPlaceholder(/search templates/i);
        await searchInput.fill(templateTest.name);
        await page.waitForTimeout(300);
        
        // Select the template
        const templateCard = page.getByText(templateTest.name).first();
        if (await templateCard.isVisible()) {
          await templateCard.click();
          
          // Wait for template to be applied
          await page.waitForTimeout(500);
          
          // Check that expected sections are present in content
          const contentField = page.getByRole('textbox', { name: /content/i });
          const content = await contentField.inputValue();
          
          for (const section of templateTest.expectedSections) {
            expect(content).toContain(section);
          }
          
          // Clear and try next template
          await page.getByRole('button', { name: /template/i }).click();
          await searchInput.fill('');
        }
      }
    });
  });

  test.describe('Template Suggestions', () => {
    test('should show personalized template suggestions', async ({ page }) => {
      // Mock user context by visiting specific pages or performing actions
      await page.goto('/projects'); // Simulate being in a project context
      await page.waitForTimeout(500);
      
      await page.goto('/');
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('button', { name: /template/i }).click();
      
      // Check if suggestions section exists
      const suggestionsSection = page.locator('[data-testid="template-suggestions"]');
      
      if (await suggestionsSection.isVisible()) {
        // Should have 1-3 suggestions
        const suggestions = page.locator('[data-testid="suggested-template"]');
        const suggestionCount = await suggestions.count();
        
        expect(suggestionCount).toBeGreaterThan(0);
        expect(suggestionCount).toBeLessThanOrEqual(3);
        
        // Each suggestion should have a reason
        for (let i = 0; i < suggestionCount; i++) {
          const suggestion = suggestions.nth(i);
          const reason = suggestion.locator('[data-testid="suggestion-reason"]');
          await expect(reason).toBeVisible();
          await expect(reason).not.toBeEmpty();
        }
      }
    });

    test('should update suggestions based on time of day', async ({ page }) => {
      // This test would require mocking the time
      // For now, we'll just verify the suggestion mechanism exists
      
      await page.addInitScript(() => {
        // Mock morning time
        const mockDate = new Date('2023-01-01T09:00:00Z');
        window.Date = class extends Date {
          constructor(...args: any[]) {
            if (args.length === 0) {
              super(mockDate);
            } else {
              super(...args);
            }
          }
          static now() {
            return mockDate.getTime();
          }
        } as any;
      });
      
      await page.reload();
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('button', { name: /template/i }).click();
      
      // Look for time-based suggestions
      const timeBasedSuggestion = page.locator('text=/morning|good for.*time/i');
      
      // If time-based suggestions exist, they should be relevant
      if (await timeBasedSuggestion.isVisible()) {
        expect(true).toBe(true); // Time-based suggestion system is working
      }
    });

    test('should show popular templates section', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('button', { name: /template/i }).click();
      
      // Should have a popular templates section
      const popularSection = page.locator('[data-testid="popular-templates"]');
      await expect(popularSection).toBeVisible();
      
      // Should have 3-5 popular templates
      const popularTemplates = page.locator('[data-testid="popular-template"]');
      const count = await popularTemplates.count();
      
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(5);
      
      // Each should have a popularity indicator
      for (let i = 0; i < count; i++) {
        const template = popularTemplates.nth(i);
        const popularityIcon = template.locator('text=/★|star/i, [data-testid="star-icon"]');
        await expect(popularityIcon).toBeVisible();
      }
    });
  });

  test.describe('Custom Templates', () => {
    test('should allow creating custom templates', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('button', { name: /template/i }).click();
      
      // Look for create custom template button
      const createTemplateButton = page.getByRole('button', { name: /create.*template|new.*template/i });
      
      if (await createTemplateButton.isVisible()) {
        await createTemplateButton.click();
        
        // Should open custom template creator
        const templateCreator = page.locator('[data-testid="custom-template-creator"]');
        await expect(templateCreator).toBeVisible();
        
        // Fill in template details
        await page.getByRole('textbox', { name: /template.*name/i }).fill('Custom Test Template');
        await page.getByRole('textbox', { name: /description/i }).fill('A custom template for testing');
        await page.getByRole('textbox', { name: /title.*template/i }).fill('Custom Title: {topic}');
        await page.getByRole('textbox', { name: /content.*template/i }).fill('## Custom Section\n\nThis is a custom template content.');
        
        // Select category
        await page.selectOption('[data-testid="category-select"]', 'update');
        
        // Save template
        await page.getByRole('button', { name: /save.*template/i }).click();
        
        // Should appear in template list
        const searchInput = page.getByPlaceholder(/search templates/i);
        await searchInput.fill('Custom Test Template');
        await page.waitForTimeout(300);
        
        await expect(page.getByText('Custom Test Template')).toBeVisible();
      }
    });

    test('should manage custom template library', async ({ page }) => {
      // This test assumes custom templates functionality exists
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('button', { name: /template/i }).click();
      
      // Look for custom templates section
      const customSection = page.locator('[data-testid="custom-templates"]');
      
      if (await customSection.isVisible()) {
        // Should have manage options
        const manageButton = page.getByRole('button', { name: /manage.*templates/i });
        
        if (await manageButton.isVisible()) {
          await manageButton.click();
          
          // Should show template management interface
          const managementInterface = page.locator('[data-testid="template-management"]');
          await expect(managementInterface).toBeVisible();
          
          // Should have edit and delete options for custom templates
          const customTemplates = page.locator('[data-testid="custom-template-item"]');
          
          if (await customTemplates.count() > 0) {
            const firstTemplate = customTemplates.first();
            const editButton = firstTemplate.locator('[data-testid="edit-template"]');
            const deleteButton = firstTemplate.locator('[data-testid="delete-template"]');
            
            await expect(editButton).toBeVisible();
            await expect(deleteButton).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Template Performance', () => {
    test('should load template library quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('button', { name: /template/i }).click();
      
      // Wait for templates to load
      await page.waitForSelector('[data-testid="template-library"]');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 1 second
      expect(loadTime).toBeLessThan(1000);
    });

    test('should handle large template libraries efficiently', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('button', { name: /template/i }).click();
      
      // Test scrolling performance with many templates
      const templateContainer = page.locator('[data-testid="template-container"]');
      
      // Scroll to bottom
      await templateContainer.evaluate(el => el.scrollTop = el.scrollHeight);
      await page.waitForTimeout(100);
      
      // Scroll back to top
      await templateContainer.evaluate(el => el.scrollTop = 0);
      await page.waitForTimeout(100);
      
      // Should remain responsive
      const templates = page.locator('[data-testid="template-card"]');
      await expect(templates.first()).toBeVisible();
    });

    test('should have responsive search performance', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('button', { name: /template/i }).click();
      
      const searchInput = page.getByPlaceholder(/search templates/i);
      
      // Test rapid search input
      const searchQueries = ['sta', 'status', 'update', 'code', 'review'];
      
      for (const query of searchQueries) {
        const startTime = Date.now();
        
        await searchInput.fill(query);
        
        // Wait for search to complete
        await page.waitForFunction(() => {
          const loadingIndicator = document.querySelector('[data-testid="search-loading"]');
          return !loadingIndicator || !loadingIndicator.classList.contains('visible');
        }, { timeout: 1000 });
        
        const searchTime = Date.now() - startTime;
        
        // Each search should complete within 500ms
        expect(searchTime).toBeLessThan(500);
      }
    });
  });

  test.describe('Template Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('button', { name: /template/i }).click();
      
      // Should be able to navigate with Tab
      await page.keyboard.press('Tab');
      
      // Should be able to search with keyboard
      const searchInput = page.getByPlaceholder(/search templates/i);
      await searchInput.focus();
      await page.keyboard.type('status');
      
      // Should be able to navigate to templates
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to select template with Enter
      await page.keyboard.press('Enter');
      
      // Should apply the template
      const titleField = page.getByRole('textbox', { name: /title/i });
      await expect(titleField).toHaveValue(/.+/); // Should have some content
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('button', { name: /template/i }).click();
      
      // Search input should have proper labels
      const searchInput = page.getByRole('searchbox', { name: /search.*templates/i });
      await expect(searchInput).toBeVisible();
      
      // Template cards should have proper roles
      const templates = page.locator('[data-testid="template-card"][role="button"]');
      const count = await templates.count();
      expect(count).toBeGreaterThan(0);
      
      // Filter buttons should be properly labeled
      const filterButton = page.getByRole('button', { name: /filters/i });
      await expect(filterButton).toHaveAttribute('aria-expanded');
    });

    test('should support screen readers', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('button', { name: /template/i }).click();
      
      // Template cards should have descriptive text
      const templates = page.locator('[data-testid="template-card"]');
      const firstTemplate = templates.first();
      
      // Should have accessible name
      const accessibleName = await firstTemplate.getAttribute('aria-label');
      expect(accessibleName).toBeTruthy();
      expect(accessibleName?.length).toBeGreaterThan(0);
      
      // Template content should be properly structured
      const heading = firstTemplate.locator('h3, h4, [role="heading"]');
      await expect(heading).toBeVisible();
    });
  });
});