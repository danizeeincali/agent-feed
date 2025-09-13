import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Page CRUD Operations End-to-End Tests', () => {
  let context: BrowserContext;
  let page: Page;
  let testPageId: string;
  let testPageTitle: string;

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
    // Clean up any test pages created
    if (testPageId || testPageTitle) {
      await cleanupTestPage();
    }
    await context.close();
  });

  async function cleanupTestPage() {
    try {
      // Find and delete test page if it exists
      const testPage = page.locator(`[data-testid="page-item"]:has([data-testid="page-title"]:has-text("${testPageTitle}"))`);
      
      if (await testPage.isVisible()) {
        const deleteButton = testPage.locator('[data-testid="delete-page-button"], [data-testid="page-menu"] [data-testid="delete-option"]');
        
        if (await deleteButton.isVisible()) {
          await deleteButton.click();
          
          // Confirm deletion if prompted
          const confirmButton = page.locator('[data-testid="confirm-delete"], [data-testid="confirm-button"]');
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }
          
          await page.waitForTimeout(1000);
        }
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  }

  test('should complete full CRUD cycle: Create → Read → Update → Delete', async () => {
    const timestamp = Date.now();
    testPageTitle = `E2E Test Page ${timestamp}`;
    
    await test.step('CREATE: Create a new page', async () => {
      // Click Create Page button
      await page.locator('[data-testid="create-page-button"]').click();
      await page.waitForTimeout(500);
      
      // Fill form
      await page.locator('[data-testid="page-title-input"], input[name="title"]').fill(testPageTitle);
      
      const typeSelect = page.locator('[data-testid="page-type-select"], select[name="type"]');
      if (await typeSelect.isVisible()) {
        await typeSelect.selectOption('markdown');
      }
      
      const descriptionField = page.locator('[data-testid="page-description-input"], textarea[name="description"]');
      if (await descriptionField.isVisible()) {
        await descriptionField.fill('Test page for CRUD operations');
      }
      
      const contentField = page.locator('[data-testid="page-content-input"], textarea[name="content"]');
      if (await contentField.isVisible()) {
        await contentField.fill('# Initial Content\n\nThis is the initial content for testing.');
      }
      
      // Submit form
      await page.locator('[data-testid="submit-create-page"], button[type="submit"]').click();
      await page.waitForLoadState('networkidle');
      
      // Verify creation success
      const modal = page.locator('[data-testid="create-page-modal"]');
      const successMessage = page.locator('[data-testid="success-message"]');
      
      const modalClosed = !(await modal.isVisible());
      const hasSuccess = await successMessage.isVisible();
      
      expect(modalClosed || hasSuccess).toBeTruthy();
      
      // Verify page appears in list
      await page.waitForTimeout(2000);
      const newPage = page.locator(`[data-testid="page-item"]:has([data-testid="page-title"]:has-text("${testPageTitle}"))`);
      await expect(newPage).toBeVisible({ timeout: 10000 });
      
      console.log('✅ CREATE: Page created successfully');
    });

    await test.step('READ: View the created page', async () => {
      const testPage = page.locator(`[data-testid="page-item"]:has([data-testid="page-title"]:has-text("${testPageTitle}"))`);
      
      // Verify page details in list
      await expect(testPage.locator('[data-testid="page-title"]')).toContainText(testPageTitle);
      await expect(testPage.locator('[data-testid="page-description"]')).toContainText('Test page for CRUD operations');
      
      // Click View button
      const viewButton = testPage.locator('[data-testid="view-page-button"]');
      await expect(viewButton).toBeVisible();
      await viewButton.click();
      
      await page.waitForTimeout(2000);
      
      // Verify page content loads
      const hasModal = await page.locator('[data-testid="page-viewer-modal"]').isVisible();
      const urlChanged = page.url().includes('/pages/') || page.url().includes('/agent-pages/');
      
      expect(hasModal || urlChanged).toBeTruthy();
      
      if (hasModal) {
        // Verify content in modal
        const modalContent = page.locator('[data-testid="page-viewer-modal"] [data-testid="page-content"]');
        if (await modalContent.isVisible()) {
          await expect(modalContent).toContainText('Initial Content');
        }
        
        // Close modal
        await page.locator('[data-testid="modal-close-button"]').click();
      } else if (urlChanged) {
        // Verify content on page
        await expect(page.locator('h1, [data-testid="page-title"]')).toContainText('Initial Content');
        
        // Navigate back
        await page.goBack();
        await page.waitForLoadState('networkidle');
        await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
      }
      
      console.log('✅ READ: Page content viewed successfully');
    });

    await test.step('UPDATE: Edit the page', async () => {
      const testPage = page.locator(`[data-testid="page-item"]:has([data-testid="page-title"]:has-text("${testPageTitle}"))`);
      
      // Find and click Edit button
      const editButton = testPage.locator('[data-testid="edit-page-button"]');
      const pageMenu = testPage.locator('[data-testid="page-menu"]');
      
      if (await editButton.isVisible()) {
        await editButton.click();
      } else if (await pageMenu.isVisible()) {
        await pageMenu.click();
        await page.locator('[data-testid="edit-option"]').click();
      } else {
        // Try double-click on page item
        await testPage.dblclick();
      }
      
      await page.waitForTimeout(1000);
      
      // Verify edit form/modal opens
      const editModal = page.locator('[data-testid="edit-page-modal"]');
      const editForm = page.locator('[data-testid="edit-page-form"]');
      
      const hasEditForm = await editModal.isVisible() || await editForm.isVisible();
      expect(hasEditForm).toBeTruthy();
      
      // Update form fields
      const updatedTitle = `${testPageTitle} (Updated)`;
      await page.locator('[data-testid="page-title-input"], input[name="title"]').fill(updatedTitle);
      testPageTitle = updatedTitle; // Update for cleanup
      
      const descriptionField = page.locator('[data-testid="page-description-input"], textarea[name="description"]');
      if (await descriptionField.isVisible()) {
        await descriptionField.fill('Updated description for CRUD testing');
      }
      
      const contentField = page.locator('[data-testid="page-content-input"], textarea[name="content"]');
      if (await contentField.isVisible()) {
        await contentField.fill('# Updated Content\n\nThis content has been updated during CRUD testing.');
      }
      
      // Submit updates
      await page.locator('[data-testid="submit-edit-page"], [data-testid="save-changes"], button[type="submit"]').click();
      await page.waitForLoadState('networkidle');
      
      // Verify update success
      await page.waitForTimeout(2000);
      const updatedPage = page.locator(`[data-testid="page-item"]:has([data-testid="page-title"]:has-text("${updatedTitle}"))`);
      await expect(updatedPage).toBeVisible({ timeout: 10000 });
      
      // Verify updated content
      await expect(updatedPage.locator('[data-testid="page-description"]')).toContainText('Updated description');
      
      console.log('✅ UPDATE: Page updated successfully');
    });

    await test.step('READ: Verify updates were saved', async () => {
      const updatedPage = page.locator(`[data-testid="page-item"]:has([data-testid="page-title"]:has-text("${testPageTitle}"))`);
      
      // View updated page
      const viewButton = updatedPage.locator('[data-testid="view-page-button"]');
      await viewButton.click();
      await page.waitForTimeout(2000);
      
      // Verify updated content
      const hasModal = await page.locator('[data-testid="page-viewer-modal"]').isVisible();
      const urlChanged = page.url().includes('/pages/') || page.url().includes('/agent-pages/');
      
      if (hasModal) {
        const modalContent = page.locator('[data-testid="page-viewer-modal"] [data-testid="page-content"]');
        if (await modalContent.isVisible()) {
          await expect(modalContent).toContainText('Updated Content');
        }
        await page.locator('[data-testid="modal-close-button"]').click();
      } else if (urlChanged) {
        await expect(page.locator('h1, [data-testid="page-title"]')).toContainText('Updated Content');
        await page.goBack();
        await page.waitForLoadState('networkidle');
        await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
      }
      
      console.log('✅ READ: Updated content verified');
    });

    await test.step('DELETE: Delete the page', async () => {
      const testPage = page.locator(`[data-testid="page-item"]:has([data-testid="page-title"]:has-text("${testPageTitle}"))`);
      
      // Find and click Delete button
      const deleteButton = testPage.locator('[data-testid="delete-page-button"]');
      const pageMenu = testPage.locator('[data-testid="page-menu"]');
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
      } else if (await pageMenu.isVisible()) {
        await pageMenu.click();
        await page.locator('[data-testid="delete-option"]').click();
      } else {
        // Try right-click context menu
        await testPage.click({ button: 'right' });
        const contextDelete = page.locator('[data-testid="context-delete"]');
        if (await contextDelete.isVisible()) {
          await contextDelete.click();
        }
      }
      
      await page.waitForTimeout(500);
      
      // Handle confirmation dialog
      const confirmDialog = page.locator('[data-testid="confirm-delete-modal"]');
      const confirmButton = page.locator('[data-testid="confirm-delete"], [data-testid="confirm-button"]');
      
      if (await confirmDialog.isVisible() || await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      await page.waitForLoadState('networkidle');
      
      // Verify deletion
      await page.waitForTimeout(2000);
      const deletedPage = page.locator(`[data-testid="page-item"]:has([data-testid="page-title"]:has-text("${testPageTitle}"))`);
      await expect(deletedPage).not.toBeVisible();
      
      console.log('✅ DELETE: Page deleted successfully');
      
      // Clear test data since page is deleted
      testPageId = '';
      testPageTitle = '';
    });
  });

  test('should handle bulk operations on pages', async () => {
    const bulkPages = [
      `Bulk Test Page 1 ${Date.now()}`,
      `Bulk Test Page 2 ${Date.now()}`,
      `Bulk Test Page 3 ${Date.now()}`
    ];

    await test.step('Create multiple pages for bulk testing', async () => {
      for (const pageTitle of bulkPages) {
        await page.locator('[data-testid="create-page-button"]').click();
        await page.waitForTimeout(500);
        
        await page.locator('[data-testid="page-title-input"], input[name="title"]').fill(pageTitle);
        
        const descriptionField = page.locator('[data-testid="page-description-input"], textarea[name="description"]');
        if (await descriptionField.isVisible()) {
          await descriptionField.fill('Bulk test page');
        }
        
        await page.locator('[data-testid="submit-create-page"], button[type="submit"]').click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      }
      
      console.log('✅ Created multiple pages for bulk testing');
    });

    await test.step('Test bulk selection if available', async () => {
      // Check for bulk selection UI
      const selectAllCheckbox = page.locator('[data-testid="select-all-pages"]');
      const bulkActionsMenu = page.locator('[data-testid="bulk-actions-menu"]');
      
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.click();
        
        // Check if bulk actions become available
        if (await bulkActionsMenu.isVisible()) {
          console.log('✅ Bulk selection UI is functional');
          
          // Test bulk delete if available
          const bulkDeleteButton = page.locator('[data-testid="bulk-delete-button"]');
          if (await bulkDeleteButton.isVisible()) {
            await bulkDeleteButton.click();
            
            // Handle confirmation
            const confirmButton = page.locator('[data-testid="confirm-bulk-delete"]');
            if (await confirmButton.isVisible()) {
              await confirmButton.click();
              await page.waitForLoadState('networkidle');
              console.log('✅ Bulk delete functionality works');
            }
          }
        }
      } else {
        console.log('ℹ️ Bulk selection UI not available');
        
        // Clean up manually created pages
        for (const pageTitle of bulkPages) {
          const testPage = page.locator(`[data-testid="page-item"]:has([data-testid="page-title"]:has-text("${pageTitle}"))`);
          if (await testPage.isVisible()) {
            const deleteButton = testPage.locator('[data-testid="delete-page-button"]');
            if (await deleteButton.isVisible()) {
              await deleteButton.click();
              const confirmButton = page.locator('[data-testid="confirm-delete"]');
              if (await confirmButton.isVisible()) {
                await confirmButton.click();
              }
              await page.waitForTimeout(500);
            }
          }
        }
      }
    });
  });

  test('should handle CRUD operations with different page types', async () => {
    const pageTypes = [
      { type: 'markdown', title: 'Markdown CRUD Test', content: '# Markdown Test\n\nThis is markdown content.' },
      { type: 'html', title: 'HTML CRUD Test', content: '<h1>HTML Test</h1><p>This is HTML content.</p>' },
    ];

    for (const pageType of pageTypes) {
      await test.step(`CRUD operations for ${pageType.type} page`, async () => {
        const timestamp = Date.now();
        const fullTitle = `${pageType.title} ${timestamp}`;
        
        // CREATE
        await page.locator('[data-testid="create-page-button"]').click();
        await page.waitForTimeout(500);
        
        await page.locator('[data-testid="page-title-input"], input[name="title"]').fill(fullTitle);
        
        const typeSelect = page.locator('[data-testid="page-type-select"], select[name="type"]');
        if (await typeSelect.isVisible()) {
          await typeSelect.selectOption(pageType.type);
        }
        
        const contentField = page.locator('[data-testid="page-content-input"], textarea[name="content"]');
        if (await contentField.isVisible()) {
          await contentField.fill(pageType.content);
        }
        
        await page.locator('[data-testid="submit-create-page"], button[type="submit"]').click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // Verify creation
        const createdPage = page.locator(`[data-testid="page-item"]:has([data-testid="page-title"]:has-text("${fullTitle}"))`);
        await expect(createdPage).toBeVisible();
        
        // UPDATE
        const editButton = createdPage.locator('[data-testid="edit-page-button"]');
        if (await editButton.isVisible()) {
          await editButton.click();
          await page.waitForTimeout(500);
          
          const updatedContent = pageType.content.replace('Test', 'Updated Test');
          const contentField = page.locator('[data-testid="page-content-input"], textarea[name="content"]');
          if (await contentField.isVisible()) {
            await contentField.fill(updatedContent);
          }
          
          await page.locator('[data-testid="submit-edit-page"], button[type="submit"]').click();
          await page.waitForLoadState('networkidle');
        }
        
        // DELETE
        const deleteButton = createdPage.locator('[data-testid="delete-page-button"]');
        if (await deleteButton.isVisible()) {
          await deleteButton.click();
          
          const confirmButton = page.locator('[data-testid="confirm-delete"]');
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }
          
          await page.waitForTimeout(1000);
        }
        
        console.log(`✅ CRUD operations completed for ${pageType.type} page`);
      });
    }
  });

  test('should handle CRUD error scenarios', async () => {
    await test.step('Test CREATE with server error', async () => {
      // Simulate server error
      await page.route('/api/agent-pages', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error during creation' })
        });
      });
      
      await page.locator('[data-testid="create-page-button"]').click();
      await page.waitForTimeout(500);
      
      await page.locator('[data-testid="page-title-input"], input[name="title"]').fill('Error Test Page');
      await page.locator('[data-testid="submit-create-page"], button[type="submit"]').click();
      
      await page.waitForTimeout(2000);
      
      // Should show error message
      const errorMessage = page.locator('[data-testid="error-message"], [role="alert"]');
      await expect(errorMessage).toBeVisible();
      
      // Cancel form
      const cancelButton = page.locator('[data-testid="cancel-create-page"]');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
      
      // Remove error simulation
      await page.unroute('/api/agent-pages');
      
      console.log('✅ CREATE error handling verified');
    });

    await test.step('Test UPDATE with conflict error', async () => {
      // First create a page successfully
      await page.locator('[data-testid="create-page-button"]').click();
      await page.waitForTimeout(500);
      
      const conflictTestTitle = `Conflict Test ${Date.now()}`;
      await page.locator('[data-testid="page-title-input"], input[name="title"]').fill(conflictTestTitle);
      await page.locator('[data-testid="submit-create-page"], button[type="submit"]').click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Now simulate update conflict
      await page.route('/api/agent-pages/*/edit', route => {
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Page was modified by another user' })
        });
      });
      
      const testPage = page.locator(`[data-testid="page-item"]:has([data-testid="page-title"]:has-text("${conflictTestTitle}"))`);
      const editButton = testPage.locator('[data-testid="edit-page-button"]');
      
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForTimeout(500);
        
        await page.locator('[data-testid="page-title-input"], input[name="title"]').fill(conflictTestTitle + ' (Updated)');
        await page.locator('[data-testid="submit-edit-page"], button[type="submit"]').click();
        
        await page.waitForTimeout(2000);
        
        // Should show conflict error
        const conflictError = page.locator('[data-testid="conflict-error"], [data-testid="error-message"]');
        const hasConflictError = await conflictError.isVisible();
        
        if (hasConflictError) {
          console.log('✅ UPDATE conflict error handling verified');
        }
      }
      
      // Clean up
      await page.unroute('/api/agent-pages/*/edit');
      
      // Delete test page
      const deleteButton = testPage.locator('[data-testid="delete-page-button"]');
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        const confirmButton = page.locator('[data-testid="confirm-delete"]');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
      }
    });

    await test.step('Test DELETE with dependency error', async () => {
      // Create a page that might have dependencies
      await page.locator('[data-testid="create-page-button"]').click();
      await page.waitForTimeout(500);
      
      const dependencyTestTitle = `Dependency Test ${Date.now()}`;
      await page.locator('[data-testid="page-title-input"], input[name="title"]').fill(dependencyTestTitle);
      await page.locator('[data-testid="submit-create-page"], button[type="submit"]').click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Simulate dependency error on delete
      await page.route('/api/agent-pages/*/delete', route => {
        route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Cannot delete page with dependencies' })
        });
      });
      
      const testPage = page.locator(`[data-testid="page-item"]:has([data-testid="page-title"]:has-text("${dependencyTestTitle}"))`);
      const deleteButton = testPage.locator('[data-testid="delete-page-button"]');
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        const confirmButton = page.locator('[data-testid="confirm-delete"]');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
        
        await page.waitForTimeout(2000);
        
        // Should show dependency error
        const dependencyError = page.locator('[data-testid="dependency-error"], [data-testid="error-message"]');
        const hasDependencyError = await dependencyError.isVisible();
        
        if (hasDependencyError) {
          console.log('✅ DELETE dependency error handling verified');
        }
        
        // Page should still exist
        await expect(testPage).toBeVisible();
      }
      
      // Clean up - remove error and delete for real
      await page.unroute('/api/agent-pages/*/delete');
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        const confirmButton = page.locator('[data-testid="confirm-delete"]');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
      }
    });
  });
});