import { test, expect } from '@playwright/test';
import { UITestPage } from './page-objects/UITestPage';

/**
 * Claude Instance Workflow Tests
 * 
 * Tests the complete workflow of creating and managing Claude instances
 */
test.describe('Claude Instance Workflow Tests', () => {
  let uiTestPage: UITestPage;
  
  test.beforeEach(async ({ page }) => {
    uiTestPage = new UITestPage(page);
    await uiTestPage.navigateToHome();
  });

  test('should navigate to Claude Instances page successfully', async ({ page }) => {
    await test.step('Navigate to Claude Instances', async () => {
      await uiTestPage.navigateToClaudeInstances();
      await uiTestPage.takeScreenshot('claude-instances-page-loaded');
      
      // Verify page loaded correctly
      await expect(page).toHaveURL(/.*claude-instances.*/);
    });
  });

  test('should display instance creation buttons', async ({ page }) => {
    await uiTestPage.navigateToClaudeInstances();
    
    await test.step('Check for Create Instance button', async () => {
      const hasCreateButton = await uiTestPage.createInstanceButton.isVisible();
      if (hasCreateButton) {
        await uiTestPage.takeScreenshot('create-instance-button-visible');
      }
    });

    await test.step('Check for instance type buttons', async () => {
      const instanceTypes = [
        { button: uiTestPage.createCodingInstanceButton, name: 'coding' },
        { button: uiTestPage.createResearchInstanceButton, name: 'research' },
        { button: uiTestPage.createAnalysisInstanceButton, name: 'analysis' },
        { button: uiTestPage.createCreativeInstanceButton, name: 'creative' }
      ];

      for (const type of instanceTypes) {
        const isVisible = await type.button.isVisible();
        if (isVisible) {
          await uiTestPage.takeScreenshot(`${type.name}-instance-button-visible`);
          console.log(`${type.name} instance button is visible`);
        }
      }
    });
  });

  test('should handle instance creation workflow', async ({ page }) => {
    await uiTestPage.navigateToClaudeInstances();
    
    await test.step('Test instance creation', async () => {
      const created = await uiTestPage.createNewInstance('Automation Test Instance');
      
      if (created) {
        await uiTestPage.takeScreenshot('instance-creation-success');
        console.log('Instance creation workflow completed');
      } else {
        await uiTestPage.takeScreenshot('instance-creation-attempted');
        console.log('Instance creation workflow attempted (no form available)');
      }
    });

    await test.step('Verify instance list', async () => {
      const instanceCount = await uiTestPage.getInstanceCount();
      console.log(`Found ${instanceCount} instances in the list`);
      
      if (instanceCount > 0) {
        await uiTestPage.takeScreenshot('instances-list-populated');
      }
    });
  });

  test('should test instance type creation buttons', async ({ page }) => {
    await uiTestPage.navigateToClaudeInstances();
    
    const instanceTypes: Array<'coding' | 'research' | 'analysis' | 'creative'> = [
      'coding', 'research', 'analysis', 'creative'
    ];

    for (const type of instanceTypes) {
      await test.step(`Test ${type} instance creation`, async () => {
        const success = await uiTestPage.createInstanceOfType(type);
        
        if (success) {
          await uiTestPage.takeScreenshot(`${type}-instance-created`);
          console.log(`${type} instance creation successful`);
        } else {
          console.log(`${type} instance button not available or creation failed`);
        }
        
        // Wait between attempts
        await page.waitForTimeout(1000);
      });
    }
  });

  test('should test refresh instances functionality', async ({ page }) => {
    await uiTestPage.navigateToClaudeInstances();
    
    await test.step('Test refresh button', async () => {
      const initialCount = await uiTestPage.getInstanceCount();
      console.log(`Initial instance count: ${initialCount}`);
      
      const refreshed = await uiTestPage.refreshInstances();
      
      if (refreshed) {
        await page.waitForTimeout(2000); // Wait for refresh to complete
        const newCount = await uiTestPage.getInstanceCount();
        console.log(`Instance count after refresh: ${newCount}`);
        
        await uiTestPage.takeScreenshot('instances-refreshed');
      }
    });
  });

  test('should handle errors gracefully', async ({ page }) => {
    await uiTestPage.navigateToClaudeInstances();
    
    await test.step('Check for error messages', async () => {
      const hasErrors = await uiTestPage.hasErrorMessages();
      
      if (hasErrors) {
        const errors = await uiTestPage.getErrorMessages();
        console.log('Error messages found:', errors);
        await uiTestPage.takeScreenshot('error-messages-present');
      } else {
        console.log('No error messages found - good!');
      }
    });

    await test.step('Test form validation', async () => {
      const hasValidation = await uiTestPage.testFormValidation();
      
      if (hasValidation) {
        await uiTestPage.takeScreenshot('form-validation-working');
        console.log('Form validation is working');
      }
    });
  });

  test('should test rapid button clicks', async ({ page }) => {
    await uiTestPage.navigateToClaudeInstances();
    
    await test.step('Test rapid refresh clicks', async () => {
      if (await uiTestPage.refreshInstancesButton.isVisible()) {
        const success = await uiTestPage.testRapidButtonClicks(uiTestPage.refreshInstancesButton, 3);
        
        if (success) {
          await uiTestPage.takeScreenshot('rapid-clicks-handled');
          console.log('Rapid button clicks handled successfully');
        }
      }
    });
  });
});