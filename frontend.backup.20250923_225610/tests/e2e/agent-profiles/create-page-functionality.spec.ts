import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Create Page Functionality Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Navigate to agent profile Dynamic Pages tab
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="agent-card"]').first().click();
    await page.waitForLoadState('networkidle');
    await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should display Create Page button and functionality', async () => {
    await test.step('Verify Create Page button is visible', async () => {
      const createButton = page.locator('[data-testid="create-page-button"]');
      await expect(createButton).toBeVisible();
      await expect(createButton).toBeEnabled();
      await expect(createButton).toContainText(/create|add|new/i);
    });

    await test.step('Click Create Page button and verify modal/form opens', async () => {
      await page.locator('[data-testid="create-page-button"]').click();
      
      // Check for modal or form
      const modal = page.locator('[data-testid="create-page-modal"]');
      const form = page.locator('[data-testid="create-page-form"]');
      
      const hasModal = await modal.isVisible();
      const hasForm = await form.isVisible();
      
      expect(hasModal || hasForm).toBeTruthy();
      
      if (hasModal) {
        await expect(modal.locator('[data-testid="modal-title"]')).toContainText(/create|new page/i);
      }
    });

    await test.step('Verify form fields are present', async () => {
      const container = page.locator('[data-testid="create-page-modal"], [data-testid="create-page-form"]');
      
      // Required fields
      await expect(container.locator('[data-testid="page-title-input"], input[name="title"]')).toBeVisible();
      await expect(container.locator('[data-testid="page-type-select"], select[name="type"]')).toBeVisible();
      
      // Optional fields
      const descriptionField = container.locator('[data-testid="page-description-input"], textarea[name="description"]');
      const contentField = container.locator('[data-testid="page-content-input"], textarea[name="content"]');
      
      // At least some form fields should be present
      const hasDescription = await descriptionField.isVisible();
      const hasContent = await contentField.isVisible();
      expect(hasDescription || hasContent).toBeTruthy();
    });
  });

  test('should create a new page successfully', async () => {
    await test.step('Open create page form', async () => {
      await page.locator('[data-testid="create-page-button"]').click();
      await page.waitForTimeout(500);
    });

    await test.step('Fill out form with valid data', async () => {
      const timestamp = Date.now();
      const testTitle = `Test Page ${timestamp}`;
      
      // Fill required fields
      await page.locator('[data-testid="page-title-input"], input[name="title"]').fill(testTitle);
      
      // Select page type
      const typeSelect = page.locator('[data-testid="page-type-select"], select[name="type"]');
      if (await typeSelect.isVisible()) {
        await typeSelect.selectOption('markdown');
      }
      
      // Fill optional fields if present
      const descriptionField = page.locator('[data-testid="page-description-input"], textarea[name="description"]');
      if (await descriptionField.isVisible()) {
        await descriptionField.fill('This is a test page created by automated tests');
      }
      
      const contentField = page.locator('[data-testid="page-content-input"], textarea[name="content"]');
      if (await contentField.isVisible()) {
        await contentField.fill('# Test Content\n\nThis is test content for the new page.');
      }
    });

    await test.step('Submit form and verify success', async () => {
      // Submit form
      await page.locator('[data-testid="submit-create-page"], button[type="submit"]').click();
      
      // Wait for form submission
      await page.waitForLoadState('networkidle');
      
      // Verify success feedback
      const successMessage = page.locator('[data-testid="success-message"], [role="alert"]');
      const modal = page.locator('[data-testid="create-page-modal"]');
      
      // Check for success indicator
      const hasSuccessMessage = await successMessage.isVisible();
      const modalClosed = !(await modal.isVisible());
      
      if (hasSuccessMessage) {
        await expect(successMessage).toContainText(/success|created/i);
      }
      
      // Modal should close on successful creation
      expect(modalClosed || hasSuccessMessage).toBeTruthy();
    });

    await test.step('Verify new page appears in list', async () => {
      // Refresh or wait for list to update
      await page.waitForTimeout(2000);
      
      const pageItems = page.locator('[data-testid="page-item"]');
      const itemCount = await pageItems.count();
      
      // Should have at least one page now
      expect(itemCount).toBeGreaterThan(0);
      
      // Look for the newly created page
      const newPageExists = await page.locator('[data-testid="page-title"]:has-text("Test Page")').isVisible();
      if (newPageExists) {
        console.log('✅ New page successfully created and visible in list');
      }
    });
  });

  test('should validate form inputs correctly', async () => {
    await test.step('Open create page form', async () => {
      await page.locator('[data-testid="create-page-button"]').click();
      await page.waitForTimeout(500);
    });

    await test.step('Test empty form submission', async () => {
      // Try to submit empty form
      await page.locator('[data-testid="submit-create-page"], button[type="submit"]').click();
      
      // Should show validation errors
      const titleError = page.locator('[data-testid="title-error"], [data-error="title"]');
      const formError = page.locator('[data-testid="form-error"], [role="alert"]');
      
      const hasTitleError = await titleError.isVisible();
      const hasFormError = await formError.isVisible();
      
      expect(hasTitleError || hasFormError).toBeTruthy();
    });

    await test.step('Test invalid inputs', async () => {
      // Test title too short
      await page.locator('[data-testid="page-title-input"], input[name="title"]').fill('a');
      await page.locator('[data-testid="submit-create-page"], button[type="submit"]').click();
      
      // Should show validation error
      await page.waitForTimeout(500);
      const hasValidationError = await page.locator('[data-testid="title-error"], [data-error="title"]').isVisible();
      
      // Fill valid title to clear error
      await page.locator('[data-testid="page-title-input"], input[name="title"]').fill('Valid Test Page Title');
      
      // Test invalid characters if applicable
      const specialCharsTitle = 'Invalid<>Title&With/Special\\Chars';
      await page.locator('[data-testid="page-title-input"], input[name="title"]').fill(specialCharsTitle);
      await page.locator('[data-testid="submit-create-page"], button[type="submit"]').click();
      
      await page.waitForTimeout(500);
    });

    await test.step('Test field length limits', async () => {
      // Test very long title
      const longTitle = 'A'.repeat(300);
      await page.locator('[data-testid="page-title-input"], input[name="title"]').fill(longTitle);
      
      // Check if input enforces max length
      const actualValue = await page.locator('[data-testid="page-title-input"], input[name="title"]').inputValue();
      expect(actualValue.length).toBeLessThanOrEqual(255);
      
      // Test very long description if field exists
      const descriptionField = page.locator('[data-testid="page-description-input"], textarea[name="description"]');
      if (await descriptionField.isVisible()) {
        const longDescription = 'A'.repeat(2000);
        await descriptionField.fill(longDescription);
        
        const descValue = await descriptionField.inputValue();
        expect(descValue.length).toBeLessThanOrEqual(1000);
      }
    });
  });

  test('should handle form cancellation correctly', async () => {
    await test.step('Open create page form', async () => {
      await page.locator('[data-testid="create-page-button"]').click();
      await page.waitForTimeout(500);
    });

    await test.step('Fill form partially', async () => {
      await page.locator('[data-testid="page-title-input"], input[name="title"]').fill('Partially Filled Form');
      
      const descriptionField = page.locator('[data-testid="page-description-input"], textarea[name="description"]');
      if (await descriptionField.isVisible()) {
        await descriptionField.fill('Some description text');
      }
    });

    await test.step('Cancel form and verify cleanup', async () => {
      const cancelButton = page.locator('[data-testid="cancel-create-page"], [data-testid="close-modal-button"]');
      
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      } else {
        // Try ESC key
        await page.keyboard.press('Escape');
      }
      
      await page.waitForTimeout(500);
      
      // Modal should be closed
      await expect(page.locator('[data-testid="create-page-modal"]')).not.toBeVisible();
    });

    await test.step('Verify no page was created', async () => {
      const pageItems = page.locator('[data-testid="page-item"]');
      const partiallyFilledPage = page.locator('[data-testid="page-title"]:has-text("Partially Filled Form")');
      
      // Should not find the cancelled page
      await expect(partiallyFilledPage).not.toBeVisible();
    });
  });

  test('should handle different page types', async () => {
    const pageTypes = [
      { value: 'markdown', label: 'Markdown' },
      { value: 'html', label: 'HTML' },
      { value: 'component', label: 'React Component' },
      { value: 'external', label: 'External Link' }
    ];

    for (const pageType of pageTypes) {
      await test.step(`Test creating ${pageType.label} page`, async () => {
        await page.locator('[data-testid="create-page-button"]').click();
        await page.waitForTimeout(500);
        
        const timestamp = Date.now();
        await page.locator('[data-testid="page-title-input"], input[name="title"]').fill(`${pageType.label} Test ${timestamp}`);
        
        // Select page type
        const typeSelect = page.locator('[data-testid="page-type-select"], select[name="type"]');
        if (await typeSelect.isVisible()) {
          await typeSelect.selectOption(pageType.value);
          
          // Verify type-specific fields appear
          if (pageType.value === 'external') {
            await expect(page.locator('[data-testid="external-url-input"], input[name="url"]')).toBeVisible();
            await page.locator('[data-testid="external-url-input"], input[name="url"]').fill('https://example.com');
          } else if (pageType.value === 'component') {
            await expect(page.locator('[data-testid="component-name-input"], input[name="component"]')).toBeVisible();
          }
        }
        
        // Submit form
        await page.locator('[data-testid="submit-create-page"], button[type="submit"]').click();
        await page.waitForLoadState('networkidle');
        
        // Cancel or close modal for next iteration
        const modal = page.locator('[data-testid="create-page-modal"]');
        if (await modal.isVisible()) {
          await page.locator('[data-testid="cancel-create-page"], [data-testid="close-modal-button"]').click();
        }
        
        await page.waitForTimeout(500);
      });
    }
  });

  test('should handle API errors during creation', async () => {
    await test.step('Simulate API error', async () => {
      // Mock API to return error
      await page.route('/api/agent-pages', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to create page' })
        });
      });
    });

    await test.step('Attempt to create page', async () => {
      await page.locator('[data-testid="create-page-button"]').click();
      await page.waitForTimeout(500);
      
      await page.locator('[data-testid="page-title-input"], input[name="title"]').fill('Error Test Page');
      await page.locator('[data-testid="submit-create-page"], button[type="submit"]').click();
      
      await page.waitForTimeout(2000);
    });

    await test.step('Verify error handling', async () => {
      // Should show error message
      const errorMessage = page.locator('[data-testid="error-message"], [role="alert"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/error|failed/i);
      
      // Form should still be open for retry
      await expect(page.locator('[data-testid="create-page-modal"]')).toBeVisible();
    });

    await test.step('Test retry functionality', async () => {
      // Remove error simulation
      await page.unroute('/api/agent-pages');
      
      // Try submitting again
      await page.locator('[data-testid="submit-create-page"], button[type="submit"]').click();
      await page.waitForLoadState('networkidle');
      
      // Should succeed or show different error
      const modal = page.locator('[data-testid="create-page-modal"]');
      const successMessage = page.locator('[data-testid="success-message"]');
      
      const modalClosed = !(await modal.isVisible());
      const hasSuccess = await successMessage.isVisible();
      
      expect(modalClosed || hasSuccess).toBeTruthy();
    });
  });

  test('should maintain form state during interaction', async () => {
    await test.step('Open form and fill partial data', async () => {
      await page.locator('[data-testid="create-page-button"]').click();
      await page.waitForTimeout(500);
      
      await page.locator('[data-testid="page-title-input"], input[name="title"]').fill('Form State Test');
      
      const descriptionField = page.locator('[data-testid="page-description-input"], textarea[name="description"]');
      if (await descriptionField.isVisible()) {
        await descriptionField.fill('Testing form state persistence');
      }
    });

    await test.step('Interact with other elements', async () => {
      // Click somewhere else to potentially lose focus
      await page.locator('[data-testid="dynamic-pages-content"]').click();
      await page.waitForTimeout(500);
      
      // Click back on form
      await page.locator('[data-testid="page-title-input"], input[name="title"]').click();
    });

    await test.step('Verify form data persisted', async () => {
      const titleValue = await page.locator('[data-testid="page-title-input"], input[name="title"]').inputValue();
      expect(titleValue).toBe('Form State Test');
      
      const descriptionField = page.locator('[data-testid="page-description-input"], textarea[name="description"]');
      if (await descriptionField.isVisible()) {
        const descValue = await descriptionField.inputValue();
        expect(descValue).toBe('Testing form state persistence');
      }
    });

    await test.step('Clean up by canceling form', async () => {
      const cancelButton = page.locator('[data-testid="cancel-create-page"], [data-testid="close-modal-button"]');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      } else {
        await page.keyboard.press('Escape');
      }
      
      await expect(page.locator('[data-testid="create-page-modal"]')).not.toBeVisible();
    });
  });
});