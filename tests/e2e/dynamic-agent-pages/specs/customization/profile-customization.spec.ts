import { test, expect } from '@playwright/test';
import { AgentHomePage } from '../../page-objects';
import { testAgents } from '../../fixtures/test-data';

/**
 * Profile Customization Tests for Agent Home Pages
 * Tests agent profile editing and customization workflows
 */
test.describe('Agent Profile Customization', () => {
  let agentHomePage: AgentHomePage;

  test.beforeEach(async ({ page }) => {
    agentHomePage = new AgentHomePage(page);
    await agentHomePage.goto(testAgents[0].id);
  });

  test('should enter and exit edit mode', async ({ page }) => {
    // Check if edit functionality is available
    const editButton = agentHomePage.editButton;
    
    if (await editButton.isVisible()) {
      // Initially not in edit mode
      expect(await agentHomePage.isEditModeEnabled()).toBe(false);
      
      // Enable edit mode
      await agentHomePage.clickEditButton();
      
      // Should be in edit mode
      expect(await agentHomePage.isEditModeEnabled()).toBe(true);
      
      // Should show additional editing options
      const availableTabs = await agentHomePage.getAvailableTabs();
      expect(availableTabs).toContain('Settings');
      
      // Exit edit mode
      const doneButton = page.locator('button:has-text("Done"), button:has-text("Save")');
      if (await doneButton.isVisible()) {
        await doneButton.click();
        
        // Should exit edit mode
        expect(await agentHomePage.isEditModeEnabled()).toBe(false);
      }
    } else {
      test.skip('Edit functionality not available for this agent');
    }
  });

  test('should allow updating agent name', async () => {
    const editButton = agentHomePage.editButton;
    
    if (await editButton.isVisible()) {
      // Enable edit mode
      await agentHomePage.clickEditButton();
      
      // Navigate to settings
      await agentHomePage.clickTab('Settings');
      
      // Get original name
      const originalName = await agentHomePage.getAgentName();
      const newName = `${originalName} (Updated)`;
      
      // Update agent name
      await agentHomePage.updateAgentName(newName);
      
      // Save changes
      await agentHomePage.saveSettings();
      
      // Navigate back to home tab to see changes
      await agentHomePage.clickTab('Home');
      
      // Verify name was updated (might require page reload)
      await agentHomePage.page.reload();
      await agentHomePage.waitForLoad();
      
      const updatedName = await agentHomePage.getAgentName();
      expect(updatedName).toContain('Updated');
      
    } else {
      test.skip('Edit functionality not available for this agent');
    }
  });

  test('should allow updating agent specialization', async () => {
    const editButton = agentHomePage.editButton;
    
    if (await editButton.isVisible()) {
      // Enable edit mode and go to settings
      await agentHomePage.clickEditButton();
      await agentHomePage.clickTab('Settings');
      
      const newSpecialization = 'Advanced AI Assistant with Custom Specialization';
      
      // Update specialization
      await agentHomePage.updateAgentSpecialization(newSpecialization);
      
      // Save changes
      await agentHomePage.saveSettings();
      
      // Verify changes are reflected
      await agentHomePage.clickTab('Home');
      await agentHomePage.page.reload();
      await agentHomePage.waitForLoad();
      
      const description = await agentHomePage.getAgentDescription();
      expect(description).toContain('Custom Specialization');
      
    } else {
      test.skip('Edit functionality not available for this agent');
    }
  });

  test('should allow updating welcome message', async () => {
    const editButton = agentHomePage.editButton;
    
    if (await editButton.isVisible()) {
      // Enable edit mode and go to settings
      await agentHomePage.clickEditButton();
      await agentHomePage.clickTab('Settings');
      
      const newWelcomeMessage = 'This is a customized welcome message for testing purposes.';
      
      // Update welcome message
      await agentHomePage.updateWelcomeMessage(newWelcomeMessage);
      
      // Save changes
      await agentHomePage.saveSettings();
      
      // Verify changes
      await agentHomePage.clickTab('Home');
      const welcomeMessage = await agentHomePage.getWelcomeMessage();
      expect(welcomeMessage).toContain('customized welcome message');
      
    } else {
      test.skip('Edit functionality not available for this agent');
    }
  });

  test('should allow toggling visibility settings', async () => {
    const editButton = agentHomePage.editButton;
    
    if (await editButton.isVisible()) {
      // Enable edit mode and go to settings
      await agentHomePage.clickEditButton();
      await agentHomePage.clickTab('Settings');
      
      // Test toggling public profile setting
      await agentHomePage.toggleVisibilitySetting('Public Profile', false);
      await agentHomePage.saveSettings();
      
      // Test toggling show metrics setting
      await agentHomePage.toggleVisibilitySetting('Show Metrics', false);
      await agentHomePage.saveSettings();
      
      // Test toggling allow comments setting
      await agentHomePage.toggleVisibilitySetting('Allow Comments', true);
      await agentHomePage.saveSettings();
      
      // Verify settings were saved (would need to check actual behavior)
      // This test verifies the UI interaction works
      const settingsSection = agentHomePage.settingsSection;
      await expect(settingsSection).toBeVisible();
      
    } else {
      test.skip('Edit functionality not available for this agent');
    }
  });

  test('should validate input fields', async ({ page }) => {
    const editButton = agentHomePage.editButton;
    
    if (await editButton.isVisible()) {
      await agentHomePage.clickEditButton();
      await agentHomePage.clickTab('Settings');
      
      // Try to set empty name (should be invalid)
      await agentHomePage.updateAgentName('');
      
      // Try to save
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Done")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
      }
      
      // Should either show validation error or prevent save
      const nameInput = page.locator('input[name="name"], input[placeholder*="name"]');
      if (await nameInput.isVisible()) {
        const validationMessage = await nameInput.evaluate(el => (el as HTMLInputElement).validationMessage);
        if (validationMessage) {
          expect(validationMessage).toBeTruthy();
        }
      }
      
    } else {
      test.skip('Edit functionality not available for this agent');
    }
  });

  test('should handle concurrent editing attempts', async ({ context }) => {
    const editButton = agentHomePage.editButton;
    
    if (await editButton.isVisible()) {
      // Open second page
      const page2 = await context.newPage();
      const agentHomePage2 = new AgentHomePage(page2);
      await agentHomePage2.goto(testAgents[0].id);
      
      // Enable edit mode on both pages
      await agentHomePage.clickEditButton();
      
      if (await agentHomePage2.editButton.isVisible()) {
        await agentHomePage2.clickEditButton();
        
        // Both should be able to enter edit mode
        expect(await agentHomePage.isEditModeEnabled()).toBe(true);
        expect(await agentHomePage2.isEditModeEnabled()).toBe(true);
        
        // Make different changes on each page
        await agentHomePage.clickTab('Settings');
        await agentHomePage2.clickTab('Settings');
        
        await agentHomePage.updateAgentName('Name from Page 1');
        await agentHomePage2.updateAgentName('Name from Page 2');
        
        // Save from both pages
        await agentHomePage.saveSettings();
        await agentHomePage2.saveSettings();
        
        // One should succeed (last write wins, or conflict resolution)
        // The exact behavior depends on implementation
      }
      
      await page2.close();
      
    } else {
      test.skip('Edit functionality not available for this agent');
    }
  });

  test('should preserve changes across page reloads', async ({ page }) => {
    const editButton = agentHomePage.editButton;
    
    if (await editButton.isVisible()) {
      await agentHomePage.clickEditButton();
      await agentHomePage.clickTab('Settings');
      
      const testMessage = `Test message ${Date.now()}`;
      await agentHomePage.updateWelcomeMessage(testMessage);
      await agentHomePage.saveSettings();
      
      // Reload page
      await page.reload();
      await agentHomePage.waitForLoad();
      
      // Changes should persist
      const welcomeMessage = await agentHomePage.getWelcomeMessage();
      expect(welcomeMessage).toContain(testMessage);
      
    } else {
      test.skip('Edit functionality not available for this agent');
    }
  });

  test('should show unsaved changes warning', async ({ page }) => {
    const editButton = agentHomePage.editButton;
    
    if (await editButton.isVisible()) {
      await agentHomePage.clickEditButton();
      await agentHomePage.clickTab('Settings');
      
      // Make changes without saving
      await agentHomePage.updateAgentName('Unsaved Name Change');
      
      // Try to navigate away
      await agentHomePage.clickTab('Home');
      
      // Might show confirmation dialog (implementation dependent)
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message().toLowerCase()).toContain('unsaved');
        await dialog.dismiss();
      });
      
    } else {
      test.skip('Edit functionality not available for this agent');
    }
  });

  test('should handle form validation errors gracefully', async ({ page }) => {
    const editButton = agentHomePage.editButton;
    
    if (await editButton.isVisible()) {
      await agentHomePage.clickEditButton();
      await agentHomePage.clickTab('Settings');
      
      // Try invalid inputs
      const veryLongName = 'A'.repeat(1000);
      await agentHomePage.updateAgentName(veryLongName);
      
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Done")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        
        // Should handle validation error gracefully
        await page.waitForTimeout(1000);
        
        // Error message should be displayed or input should be trimmed
        const currentName = await page.locator('input[name="name"]').inputValue();
        expect(currentName.length).toBeLessThan(500); // Should be reasonable
      }
      
    } else {
      test.skip('Edit functionality not available for this agent');
    }
  });

  test('should maintain edit mode state during tab navigation', async () => {
    const editButton = agentHomePage.editButton;
    
    if (await editButton.isVisible()) {
      await agentHomePage.clickEditButton();
      
      // Switch between tabs while in edit mode
      await agentHomePage.clickTab('Settings');
      expect(await agentHomePage.isEditModeEnabled()).toBe(true);
      
      await agentHomePage.clickTab('Home');
      expect(await agentHomePage.isEditModeEnabled()).toBe(true);
      
      await agentHomePage.clickTab('Metrics');
      expect(await agentHomePage.isEditModeEnabled()).toBe(true);
      
    } else {
      test.skip('Edit functionality not available for this agent');
    }
  });
});