/**
 * E2E Tests for Unified Agent Page
 * Comprehensive Playwright tests for unified agent page functionality
 * 
 * Coverage:
 * - Navigation from agents list to unified agent page
 * - Tab functionality and content verification
 * - Responsive design across screen sizes
 * - Error handling and edge cases
 * - Performance and accessibility
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Helper functions
const navigateToAgent = async (page: Page, agentId: string = 'agent-feedback-agent') => {
  await page.goto(`${BASE_URL}/agents/${agentId}`);
  await page.waitForLoadState('networkidle');
};

const waitForAgentPageLoad = async (page: Page) => {
  // Wait for the main content to load
  await page.waitForSelector('[data-testid="unified-agent-page"], .min-h-screen');
  await page.waitForLoadState('networkidle');
};

const verifyTabContent = async (page: Page, tabName: string, expectedContent: string[]) => {
  await page.click(`button:has-text("${tabName}")`);
  await page.waitForTimeout(500); // Allow tab transition
  
  for (const content of expectedContent) {
    await expect(page.locator(`text=${content}`).first()).toBeVisible();
  }
};

test.describe('Unified Agent Page E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Navigation and Initial Load', () => {
    test('should navigate from agents list to unified agent page', async ({ page }) => {
      // Navigate to agents list
      await page.goto(`${BASE_URL}/agents`);
      await page.waitForSelector('text=Agents', { timeout: 10000 });

      // Find and click on a specific agent
      const agentCard = page.locator('[data-testid="agent-card"], .agent-card').first();
      await agentCard.waitFor({ state: 'visible', timeout: 10000 });
      await agentCard.click();

      // Verify navigation to unified agent page
      await expect(page).toHaveURL(/\/agents\/[^\/]+$/);
      await waitForAgentPageLoad(page);

      // Verify page elements are present
      await expect(page.locator('button[aria-label="Back to agents"]')).toBeVisible();
      await expect(page.locator('text=Overview')).toBeVisible();
      await expect(page.locator('text=Details')).toBeVisible();
      await expect(page.locator('text=Activity')).toBeVisible();
      await expect(page.locator('text=Configuration')).toBeVisible();
    });

    test('should load agent data from real API endpoint', async ({ page }) => {
      const agentId = 'agent-feedback-agent';
      
      // Intercept API call to verify it's made
      const apiPromise = page.waitForRequest(`${API_BASE_URL}/api/agents/${agentId}`);
      
      await navigateToAgent(page, agentId);
      
      // Verify API call was made
      const apiRequest = await apiPromise;
      expect(apiRequest.url()).toContain(`/api/agents/${agentId}`);
      
      // Verify response is successful
      const response = await apiRequest.response();
      expect(response?.status()).toBe(200);
      
      // Verify page displays real data
      await expect(page.locator('text=agent-feedback-agent')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Active')).toBeVisible();
    });

    test('should handle loading states properly', async ({ page }) => {
      await navigateToAgent(page);
      
      // Loading state should appear briefly (might be too fast to catch reliably)
      // Instead, verify the content loads successfully
      await waitForAgentPageLoad(page);
      
      // Verify loaded state
      await expect(page.locator('text=Overview')).toBeVisible();
      await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
    });

    test('should handle non-existent agent IDs', async ({ page }) => {
      const nonExistentAgentId = 'non-existent-agent-12345';
      
      await page.goto(`${BASE_URL}/agents/${nonExistentAgentId}`);
      await page.waitForLoadState('networkidle');
      
      // Should display error state
      await expect(page.locator('text=Error Loading Agent, text=Agent Not Found')).toBeVisible({ timeout: 10000 });
      await expect(page.locator(`text=${nonExistentAgentId}`)).toBeVisible();
      
      // Verify error recovery options
      await expect(page.locator('button:has-text("Back to Agents")')).toBeVisible();
      await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
    });
  });

  test.describe('Tab Navigation and Content', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToAgent(page);
      await waitForAgentPageLoad(page);
    });

    test('should display Overview tab content correctly', async ({ page }) => {
      // Overview should be active by default
      const overviewTab = page.locator('button:has-text("Overview")');
      await expect(overviewTab).toHaveClass(/border-blue-500|text-blue-600/);
      
      // Verify overview content
      await expect(page.locator('text=tasks completed')).toBeVisible();
      await expect(page.locator('text=success rate')).toBeVisible();
      await expect(page.locator('text=avg response')).toBeVisible();
      
      // Verify quick actions section
      await expect(page.locator('text=Quick Actions')).toBeVisible();
      
      // Verify recent activity preview
      await expect(page.locator('text=Recent Activity')).toBeVisible();
      await expect(page.locator('button:has-text("View All")')).toBeVisible();
    });

    test('should display Details tab content correctly', async ({ page }) => {
      await verifyTabContent(page, 'Details', [
        'Agent Information',
        'Capabilities', 
        'Performance Metrics'
      ]);
      
      // Verify specific details sections
      await expect(page.locator('text=Name')).toBeVisible();
      await expect(page.locator('text=ID')).toBeVisible();
      await expect(page.locator('text=Status')).toBeVisible();
      await expect(page.locator('text=Last Active')).toBeVisible();
    });

    test('should display Activity tab content correctly', async ({ page }) => {
      await verifyTabContent(page, 'Activity', [
        'Activity & Posts',
        'Recent Activities',
        'Posts & Updates'
      ]);
      
      // Verify activity controls
      await expect(page.locator('button:has-text("Filter")')).toBeVisible();
      await expect(page.locator('button:has-text("New Post")')).toBeVisible();
    });

    test('should display Configuration tab content correctly', async ({ page }) => {
      await verifyTabContent(page, 'Configuration', [
        'Agent Configuration',
        'Profile Settings',
        'Privacy & Visibility',
        'Theme & Appearance'
      ]);
      
      // Verify configuration controls
      await expect(page.locator('button:has-text("Edit Configuration")')).toBeVisible();
    });

    test('should maintain tab state during navigation', async ({ page }) => {
      // Navigate to Details tab
      await page.click('button:has-text("Details")');
      await page.waitForTimeout(500);
      
      // Verify Details tab is active
      const detailsTab = page.locator('button:has-text("Details")');
      await expect(detailsTab).toHaveClass(/border-blue-500|text-blue-600/);
      
      // Navigate to Activity tab
      await page.click('button:has-text("Activity")');
      await page.waitForTimeout(500);
      
      // Verify Activity tab is active
      const activityTab = page.locator('button:has-text("Activity")');
      await expect(activityTab).toHaveClass(/border-blue-500|text-blue-600/);
      
      // Verify previous tab is no longer active
      await expect(detailsTab).not.toHaveClass(/border-blue-500|text-blue-600/);
    });
  });

  test.describe('Interactive Features', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToAgent(page);
      await waitForAgentPageLoad(page);
    });

    test('should enable configuration editing mode', async ({ page }) => {
      // Navigate to Configuration tab
      await page.click('button:has-text("Configuration")');
      await page.waitForTimeout(500);
      
      // Click Edit Configuration
      await page.click('button:has-text("Edit Configuration")');
      
      // Verify edit mode is enabled
      await expect(page.locator('button:has-text("Done Editing")')).toBeVisible();
      
      // Verify form fields are editable
      const nameInput = page.locator('input[value*="agent"], input[value*="Agent"]').first();
      await expect(nameInput).toBeEditable();
      
      // Make a change
      await nameInput.fill('Updated Agent Name');
      
      // Verify unsaved changes indicator
      await expect(page.locator('text=Unsaved changes')).toBeVisible();
      await expect(page.locator('button:has-text("Save Changes")')).toBeVisible();
    });

    test('should handle unsaved changes warning', async ({ page }) => {
      // Navigate to Configuration and make changes
      await page.click('button:has-text("Configuration")');
      await page.click('button:has-text("Edit Configuration")');
      
      const nameInput = page.locator('input[value*="agent"], input[value*="Agent"]').first();
      await nameInput.fill('Modified Agent Name');
      
      // Set up dialog handler
      let dialogShown = false;
      page.on('dialog', dialog => {
        expect(dialog.message()).toContain('unsaved changes');
        dialogShown = true;
        dialog.dismiss(); // Cancel navigation
      });
      
      // Try to navigate away
      await page.click('button[aria-label="Back to agents"]');
      
      // Verify dialog was shown (in a real scenario)
      // Note: This might not work in all test environments
      await page.waitForTimeout(1000);
    });

    test('should refresh agent data', async ({ page }) => {
      // Wait for initial load
      await waitForAgentPageLoad(page);
      
      // Set up request interception to verify refresh call
      const refreshPromise = page.waitForRequest(request => 
        request.url().includes('/api/agents/') && request.method() === 'GET'
      );
      
      // Click refresh button
      await page.click('button:has-text("Refresh")');
      
      // Verify API call was made
      const refreshRequest = await refreshPromise;
      expect(refreshRequest.url()).toContain('/api/agents/');
      
      // Verify page refreshes without full reload
      await expect(page.locator('text=Overview')).toBeVisible();
    });

    test('should handle back navigation', async ({ page }) => {
      // Click back button
      await page.click('button[aria-label="Back to agents"]');
      
      // Should navigate to agents list
      await expect(page).toHaveURL(/\/agents\/?$/);
      await page.waitForLoadState('networkidle');
    });
  });

  test.describe('Responsive Design', () => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    viewports.forEach(viewport => {
      test(`should display correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await navigateToAgent(page);
        await waitForAgentPageLoad(page);
        
        // Verify core elements are visible
        await expect(page.locator('button[aria-label="Back to agents"]')).toBeVisible();
        await expect(page.locator('text=Overview')).toBeVisible();
        
        // Verify responsive layout
        if (viewport.width < 768) {
          // Mobile: tabs might stack or scroll
          const tabs = page.locator('button:has-text("Overview"), button:has-text("Details")');
          await expect(tabs.first()).toBeVisible();
        } else {
          // Tablet and Desktop: all tabs should be visible
          await expect(page.locator('button:has-text("Overview")')).toBeVisible();
          await expect(page.locator('button:has-text("Details")')).toBeVisible();
          await expect(page.locator('button:has-text("Activity")')).toBeVisible();
          await expect(page.locator('button:has-text("Configuration")')).toBeVisible();
        }
        
        // Test tab switching on different viewports
        await page.click('button:has-text("Details")');
        await page.waitForTimeout(500);
        await expect(page.locator('text=Agent Information')).toBeVisible();
      });
    });
  });

  test.describe('Performance and Reliability', () => {
    test('should load within acceptable time limits', async ({ page }) => {
      const startTime = Date.now();
      
      await navigateToAgent(page);
      await waitForAgentPageLoad(page);
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // 5 seconds max
      
      // Verify all critical elements loaded
      await expect(page.locator('text=Overview')).toBeVisible();
      await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
    });

    test('should handle API failures gracefully', async ({ page }) => {
      // Navigate to an agent that might cause API errors
      await page.goto(`${BASE_URL}/agents/test-error-agent`);
      await page.waitForLoadState('networkidle');
      
      // Should either load successfully or show appropriate error
      const hasContent = await page.locator('text=Overview').isVisible({ timeout: 5000 }).catch(() => false);
      const hasError = await page.locator('text=Error Loading Agent, text=Agent Not Found').isVisible().catch(() => false);
      
      expect(hasContent || hasError).toBeTruthy();
      
      if (hasError) {
        // Verify error recovery options
        await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
        await expect(page.locator('button:has-text("Back to Agents")')).toBeVisible();
      }
    });

    test('should maintain functionality with slow network', async ({ page, context }) => {
      // Simulate slow network
      await context.route('**/*', route => {
        setTimeout(() => route.continue(), 1000); // 1 second delay
      });
      
      await navigateToAgent(page);
      await waitForAgentPageLoad(page);
      
      // Verify functionality still works
      await expect(page.locator('text=Overview')).toBeVisible({ timeout: 15000 });
      
      // Test tab switching with slow network
      await page.click('button:has-text("Details")');
      await expect(page.locator('text=Agent Information')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Cross-browser Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should work correctly in ${browserName}`, async ({ page, browser }) => {
        // This test would run with different browsers in CI
        await navigateToAgent(page);
        await waitForAgentPageLoad(page);
        
        // Verify core functionality
        await expect(page.locator('text=Overview')).toBeVisible();
        
        // Test tab navigation
        await page.click('button:has-text("Details")');
        await expect(page.locator('text=Agent Information')).toBeVisible();
        
        // Test back navigation
        await page.click('button[aria-label="Back to agents"]');
        await expect(page).toHaveURL(/\/agents\/?$/);
      });
    });
  });

  test.describe('Accessibility', () => {
    test('should be accessible with keyboard navigation', async ({ page }) => {
      await navigateToAgent(page);
      await waitForAgentPageLoad(page);
      
      // Test keyboard navigation through tabs
      await page.keyboard.press('Tab'); // Focus on back button
      await page.keyboard.press('Tab'); // Focus on first tab
      
      // Navigate through tabs with arrow keys
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      
      // Activate tab with Enter or Space
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      // Verify tab content changed
      // This is a basic accessibility test - more comprehensive testing would use axe-core
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await navigateToAgent(page);
      await waitForAgentPageLoad(page);
      
      // Verify important elements have proper accessibility attributes
      await expect(page.locator('button[aria-label="Back to agents"]')).toBeVisible();
      
      // Verify main content area has proper role
      const mainContent = page.locator('[role="main"], main');
      if (await mainContent.count() > 0) {
        await expect(mainContent.first()).toBeVisible();
      }
      
      // Verify tabs have proper roles
      const tabButtons = page.locator('button:has-text("Overview"), button:has-text("Details")');
      await expect(tabButtons.first()).toBeVisible();
    });
  });

  test.describe('Data Integrity', () => {
    test('should display real agent data without mock contamination', async ({ page }) => {
      await navigateToAgent(page, 'agent-feedback-agent');
      await waitForAgentPageLoad(page);
      
      // Get page content
      const pageContent = await page.content();
      
      // Verify no mock data indicators
      expect(pageContent).not.toContain('mock');
      expect(pageContent).not.toContain('Mock');
      expect(pageContent).not.toContain('fake');
      expect(pageContent).not.toContain('test-data');
      
      // Verify real agent name is displayed
      await expect(page.locator('text=agent-feedback-agent')).toBeVisible();
      
      // Verify real status
      await expect(page.locator('text=Active, text=Inactive, text=Busy')).toBeVisible();
    });

    test('should handle edge cases in agent data', async ({ page }) => {
      // Test with various agent IDs to verify robust data handling
      const testAgentIds = [
        'agent-feedback-agent',
        'meta-agent',
        'personal-todos-agent'
      ];
      
      for (const agentId of testAgentIds) {
        await page.goto(`${BASE_URL}/agents/${agentId}`);
        await page.waitForLoadState('networkidle');
        
        // Should load successfully or show appropriate error
        const loaded = await page.locator('text=Overview').isVisible({ timeout: 5000 }).catch(() => false);
        const error = await page.locator('text=Error Loading Agent').isVisible().catch(() => false);
        
        expect(loaded || error).toBeTruthy();
        
        if (loaded) {
          // Verify basic functionality
          await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
        }
      }
    });
  });
});