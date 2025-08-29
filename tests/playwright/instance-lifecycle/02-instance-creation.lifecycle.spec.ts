import { test, expect } from '@playwright/test';
import { InstanceManagerPage } from './page-objects/InstanceManagerPage';
import { mockAPIResponses, validInstanceConfigs, apiEndpoints, performanceThresholds, testUtils } from './fixtures/test-data';

/**
 * Test Suite: Instance Creation and Endpoint Validation
 * 
 * Validates that:
 * 1. Instance creation works with corrected endpoints
 * 2. All Claude instance types can be created successfully
 * 3. Form validation works correctly
 * 4. Creation process provides appropriate feedback
 * 5. Error handling during creation works properly
 */
test.describe('Instance Creation and Endpoint Validation', () => {
  let instancePage: InstanceManagerPage;

  test.beforeEach(async ({ page }) => {
    instancePage = new InstanceManagerPage(page);
    
    // Mock initial instances list
    await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
    await instancePage.navigate();
  });

  test.afterEach(async ({ page }) => {
    await instancePage.cleanupInstances();
    await page.unrouteAll();
  });

  test.describe('Successful Instance Creation', () => {
    test('should create Claude 3.5 Sonnet instance successfully', async ({ page }) => {
      const config = validInstanceConfigs.sonnet;
      
      // Mock creation API
      await instancePage.mockInstanceCreationAPI(mockAPIResponses.instanceCreated(config));
      
      // Create instance
      await instancePage.createInstance(config.name, config.type);
      
      // Verify instance appears in list
      const instanceCard = await instancePage.findInstanceByName(config.name);
      await expect(instanceCard).toBeVisible();
      
      // Verify correct type is displayed
      const typeElement = instanceCard.locator('[data-testid="instance-type"]');
      await expect(typeElement).toHaveText(new RegExp(config.type, 'i'));
      
      // Verify initial status
      const status = await instancePage.getInstanceStatus(config.name);
      expect(status?.toLowerCase()).toMatch(/starting|running/);
    });

    test('should create Claude 3 Opus instance successfully', async ({ page }) => {
      const config = validInstanceConfigs.opus;
      
      await instancePage.mockInstanceCreationAPI(mockAPIResponses.instanceCreated(config));
      await instancePage.createInstance(config.name, config.type);
      
      const instanceCard = await instancePage.findInstanceByName(config.name);
      await expect(instanceCard).toBeVisible();
    });

    test('should create Claude 3 Haiku instance successfully', async ({ page }) => {
      const config = validInstanceConfigs.haiku;
      
      await instancePage.mockInstanceCreationAPI(mockAPIResponses.instanceCreated(config));
      await instancePage.createInstance(config.name, config.type);
      
      const instanceCard = await instancePage.findInstanceByName(config.name);
      await expect(instanceCard).toBeVisible();
    });

    test('should create Claude Instant instance successfully', async ({ page }) => {
      const config = validInstanceConfigs.instant;
      
      await instancePage.mockInstanceCreationAPI(mockAPIResponses.instanceCreated(config));
      await instancePage.createInstance(config.name, config.type);
      
      const instanceCard = await instancePage.findInstanceByName(config.name);
      await expect(instanceCard).toBeVisible();
    });

    test('should complete creation within performance threshold', async ({ page }) => {
      const config = validInstanceConfigs.sonnet;
      
      await instancePage.mockInstanceCreationAPI(mockAPIResponses.instanceCreated(config));
      
      const creationTime = await instancePage.measureInstanceCreationTime(config.name, config.type);
      
      expect(creationTime).toBeLessThan(performanceThresholds.instanceCreation);
      console.log(`Instance creation time: ${creationTime}ms`);
    });
  });

  test.describe('Form Validation', () => {
    test('should validate required instance name', async ({ page }) => {
      await instancePage.openCreateInstanceModal();
      
      // Try to create without name
      await instancePage.instanceTypeSelect.selectOption({ value: 'claude-3-5-sonnet' });
      await instancePage.createConfirmButton.click();
      
      // Should show validation error
      const validationError = page.locator('[data-testid="name-validation-error"]');
      await expect(validationError).toBeVisible();
      
      // Modal should remain open
      await expect(instancePage.createModal).toBeVisible();
    });

    test('should validate instance name length', async ({ page }) => {
      await instancePage.openCreateInstanceModal();
      
      // Try name that's too short
      await instancePage.instanceNameInput.fill('a');
      await instancePage.instanceTypeSelect.selectOption({ value: 'claude-3-5-sonnet' });
      await instancePage.createConfirmButton.click();
      
      const validationError = page.locator('[data-testid="name-validation-error"]');
      await expect(validationError).toBeVisible();
      
      // Try name that's too long
      await instancePage.instanceNameInput.fill('a'.repeat(256));
      await instancePage.createConfirmButton.click();
      
      await expect(validationError).toBeVisible();
    });

    test('should validate instance name uniqueness', async ({ page }) => {
      // Mock API to return conflict error
      await page.route(apiEndpoints.instances.create, async route => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Instance name already exists'
          })
        });
      });
      
      await instancePage.openCreateInstanceModal();
      
      await instancePage.instanceNameInput.fill('Duplicate Name');
      await instancePage.instanceTypeSelect.selectOption({ value: 'claude-3-5-sonnet' });
      await instancePage.createConfirmButton.click();
      
      // Should show conflict error
      const errorMessage = page.locator('[data-testid="creation-error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toHaveText(/already exists|duplicate/i);
    });

    test('should validate instance type selection', async ({ page }) => {
      await instancePage.openCreateInstanceModal();
      
      // Try to create without selecting type
      await instancePage.instanceNameInput.fill('Test Instance');
      await instancePage.createConfirmButton.click();
      
      const validationError = page.locator('[data-testid="type-validation-error"]');
      await expect(validationError).toBeVisible();
    });

    test('should allow form reset and retry after validation error', async ({ page }) => {
      await instancePage.openCreateInstanceModal();
      
      // Trigger validation error
      await instancePage.createConfirmButton.click();
      
      const validationError = page.locator('[data-testid="name-validation-error"]');
      await expect(validationError).toBeVisible();
      
      // Fill form correctly
      const config = validInstanceConfigs.sonnet;
      await instancePage.mockInstanceCreationAPI(mockAPIResponses.instanceCreated(config));
      
      await instancePage.instanceNameInput.fill(config.name);
      await instancePage.instanceTypeSelect.selectOption({ value: config.type });
      await instancePage.createConfirmButton.click();
      
      // Should succeed
      await expect(instancePage.createModal).toBeHidden();
      await instancePage.waitForInstanceToAppear(config.name);
    });
  });

  test.describe('Creation Process Feedback', () => {
    test('should show loading state during creation', async ({ page }) => {
      const config = validInstanceConfigs.sonnet;
      
      // Mock slow creation API
      await page.route(apiEndpoints.instances.create, async route => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAPIResponses.instanceCreated(config))
        });
      });
      
      await instancePage.openCreateInstanceModal();
      
      await instancePage.instanceNameInput.fill(config.name);
      await instancePage.instanceTypeSelect.selectOption({ value: config.type });
      
      // Click create and check loading state
      await instancePage.createConfirmButton.click();
      
      // Button should show loading state
      const loadingIndicator = page.locator('[data-testid="creation-loading"]');
      await expect(loadingIndicator).toBeVisible();
      
      // Button should be disabled during creation
      await expect(instancePage.createConfirmButton).toBeDisabled();
      
      // Wait for creation to complete
      await instancePage.waitForInstanceToAppear(config.name);
    });

    test('should show progress indicators for instance startup', async ({ page }) => {
      const config = validInstanceConfigs.sonnet;
      
      // Mock creation with starting status
      const createdResponse = mockAPIResponses.instanceCreated(config);
      createdResponse.data.status = 'starting';
      
      await instancePage.mockInstanceCreationAPI(createdResponse);
      await instancePage.createInstance(config.name, config.type);
      
      // Should show starting status
      const status = await instancePage.getInstanceStatus(config.name);
      expect(status?.toLowerCase()).toBe('starting');
      
      // Mock status update to running
      await page.route(apiEndpoints.instances.get(createdResponse.data.id), async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { ...createdResponse.data, status: 'running' }
          })
        });
      });
      
      // Refresh to get updated status
      await instancePage.refreshInstances();
      
      // Should now show running
      await instancePage.waitForInstanceStatus(config.name, 'running');
    });

    test('should provide creation success notification', async ({ page }) => {
      const config = validInstanceConfigs.sonnet;
      
      await instancePage.mockInstanceCreationAPI(mockAPIResponses.instanceCreated(config));
      await instancePage.createInstance(config.name, config.type);
      
      // Should show success notification
      const successNotification = page.locator('[data-testid="creation-success-notification"]');
      await expect(successNotification).toBeVisible();
      
      // Notification should contain instance name
      await expect(successNotification).toHaveText(new RegExp(config.name));
    });
  });

  test.describe('Error Handling During Creation', () => {
    test('should handle network errors during creation', async ({ page }) => {
      await instancePage.openCreateInstanceModal();
      
      // Mock network failure
      await page.route(apiEndpoints.instances.create, async route => {
        await route.abort('failed');
      });
      
      const config = validInstanceConfigs.sonnet;
      await instancePage.instanceNameInput.fill(config.name);
      await instancePage.instanceTypeSelect.selectOption({ value: config.type });
      await instancePage.createConfirmButton.click();
      
      // Should show network error
      const errorMessage = page.locator('[data-testid="creation-error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toHaveText(/network error|connection failed/i);
      
      // Modal should remain open for retry
      await expect(instancePage.createModal).toBeVisible();
    });

    test('should handle server errors during creation', async ({ page }) => {
      await instancePage.openCreateInstanceModal();
      
      // Mock server error
      await page.route(apiEndpoints.instances.create, async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error'
          })
        });
      });
      
      const config = validInstanceConfigs.sonnet;
      await instancePage.instanceNameInput.fill(config.name);
      await instancePage.instanceTypeSelect.selectOption({ value: config.type });
      await instancePage.createConfirmButton.click();
      
      const errorMessage = page.locator('[data-testid="creation-error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toHaveText(/server error|internal error/i);
    });

    test('should handle resource exhaustion errors', async ({ page }) => {
      await instancePage.openCreateInstanceModal();
      
      // Mock resource exhaustion
      await page.route(apiEndpoints.instances.create, async route => {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Resource limit exceeded',
            message: 'Maximum number of instances reached'
          })
        });
      });
      
      const config = validInstanceConfigs.sonnet;
      await instancePage.instanceNameInput.fill(config.name);
      await instancePage.instanceTypeSelect.selectOption({ value: config.type });
      await instancePage.createConfirmButton.click();
      
      const errorMessage = page.locator('[data-testid="creation-error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toHaveText(/limit exceeded|resource/i);
    });

    test('should allow retry after creation error', async ({ page }) => {
      const config = validInstanceConfigs.sonnet;
      
      await instancePage.openCreateInstanceModal();
      
      // First attempt fails
      await page.route(apiEndpoints.instances.create, async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Temporary server error'
          })
        });
      });
      
      await instancePage.instanceNameInput.fill(config.name);
      await instancePage.instanceTypeSelect.selectOption({ value: config.type });
      await instancePage.createConfirmButton.click();
      
      // Verify error
      const errorMessage = page.locator('[data-testid="creation-error-message"]');
      await expect(errorMessage).toBeVisible();
      
      // Mock successful retry
      await instancePage.mockInstanceCreationAPI(mockAPIResponses.instanceCreated(config));
      
      // Clear error and retry
      const retryButton = page.locator('[data-testid="retry-creation-button"]');
      if (await retryButton.isVisible()) {
        await retryButton.click();
      } else {
        await instancePage.createConfirmButton.click();
      }
      
      // Should succeed on retry
      await expect(instancePage.createModal).toBeHidden();
      await instancePage.waitForInstanceToAppear(config.name);
    });
  });

  test.describe('Endpoint Correction Validation', () => {
    test('should use correct endpoint for instance creation', async ({ page }) => {
      const config = validInstanceConfigs.sonnet;
      
      // Monitor API calls
      const apiCalls: string[] = [];
      await page.route('**', (route) => {
        apiCalls.push(route.request().url());
        route.continue();
      });
      
      await instancePage.mockInstanceCreationAPI(mockAPIResponses.instanceCreated(config));
      await instancePage.createInstance(config.name, config.type);
      
      // Verify correct endpoint was called
      const creationCalls = apiCalls.filter(url => 
        url.includes('/api/v1/claude/instances') && 
        !url.includes('/api/claude/instances') // Old incorrect endpoint
      );
      
      expect(creationCalls.length).toBeGreaterThan(0);
    });

    test('should handle endpoint transition gracefully', async ({ page }) => {
      const config = validInstanceConfigs.sonnet;
      
      // Mock old endpoint returning 404
      await page.route('**/api/claude/instances', async route => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Endpoint not found' })
        });
      });
      
      // Mock new correct endpoint
      await instancePage.mockInstanceCreationAPI(mockAPIResponses.instanceCreated(config));
      
      // Creation should still work with correct endpoint
      await instancePage.createInstance(config.name, config.type);
      
      const instanceCard = await instancePage.findInstanceByName(config.name);
      await expect(instanceCard).toBeVisible();
    });

    test('should validate API response structure', async ({ page }) => {
      const config = validInstanceConfigs.sonnet;
      
      // Mock API response with missing required fields
      await page.route(apiEndpoints.instances.create, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            // Missing success field and data structure
            id: 'test-id',
            name: config.name
          })
        });
      });
      
      await instancePage.openCreateInstanceModal();
      await instancePage.instanceNameInput.fill(config.name);
      await instancePage.instanceTypeSelect.selectOption({ value: config.type });
      await instancePage.createConfirmButton.click();
      
      // Should handle malformed response gracefully
      const errorMessage = page.locator('[data-testid="creation-error-message"]');
      await expect(errorMessage).toBeVisible();
    });
  });

  test.describe('Multiple Instance Creation', () => {
    test('should create multiple instances sequentially', async ({ page }) => {
      const instances = [
        { config: validInstanceConfigs.sonnet, name: 'Test Sonnet' },
        { config: validInstanceConfigs.haiku, name: 'Test Haiku' },
        { config: validInstanceConfigs.instant, name: 'Test Instant' }
      ];
      
      for (const { config, name } of instances) {
        await instancePage.mockInstanceCreationAPI(mockAPIResponses.instanceCreated({
          ...config,
          name
        }));
        
        await instancePage.createInstance(name, config.type);
        
        // Verify each instance is created
        const instanceCard = await instancePage.findInstanceByName(name);
        await expect(instanceCard).toBeVisible();
      }
      
      // Verify all instances are present
      const totalInstances = await instancePage.getInstanceCount();
      expect(totalInstances).toBe(6); // 3 original + 3 new
    });

    test('should handle creation failures without affecting other instances', async ({ page }) => {
      const successConfig = validInstanceConfigs.sonnet;
      const failConfig = validInstanceConfigs.opus;
      
      // First creation succeeds
      await instancePage.mockInstanceCreationAPI(mockAPIResponses.instanceCreated({
        ...successConfig,
        name: 'Success Instance'
      }));
      
      await instancePage.createInstance('Success Instance', successConfig.type);
      
      // Second creation fails
      await page.route(apiEndpoints.instances.create, async route => {
        if (route.request().postDataJSON()?.name === 'Failed Instance') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: 'Creation failed' })
          });
        } else {
          route.continue();
        }
      });
      
      await instancePage.openCreateInstanceModal();
      await instancePage.instanceNameInput.fill('Failed Instance');
      await instancePage.instanceTypeSelect.selectOption({ value: failConfig.type });
      await instancePage.createConfirmButton.click();
      
      // Should show error for failed creation
      const errorMessage = page.locator('[data-testid="creation-error-message"]');
      await expect(errorMessage).toBeVisible();
      
      // But successful instance should still exist
      const successCard = await instancePage.findInstanceByName('Success Instance');
      await expect(successCard).toBeVisible();
    });
  });
});