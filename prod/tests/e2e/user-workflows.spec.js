/**
 * E2E Tests for User Workflows
 * Playwright - Cross-browser testing
 */

const { test, expect } = require('@playwright/test');
const { MockDataFactory } = require('../mocks/posting-intelligence-mocks');

test.describe('Posting Intelligence User Workflows', () => {
  let mockData;
  
  test.beforeEach(async ({ page }) => {
    mockData = {
      user: {
        email: 'test@example.com',
        name: 'Test User',
        id: 'user_123'
      },
      postData: {
        agentType: 'personal-todos',
        title: 'Complete E2E testing setup',
        priority: 'P1',
        description: 'Set up comprehensive end-to-end testing for the posting intelligence system'
      }
    };
    
    // Mock API responses
    await page.route('**/api/v1/posting-intelligence/**', async route => {
      const url = route.request().url();
      const method = route.request().method();
      
      if (url.includes('/generate') && method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              content: 'E2E Generated: Complete E2E testing setup with high priority focus on comprehensive coverage.',
              metadata: {
                qualityScore: 0.92,
                impactScore: 0.87,
                engagementPrediction: { score: 0.89 },
                generatedAt: new Date().toISOString()
              },
              analytics: {
                processingTime: 245,
                optimizationSteps: 4
              }
            }
          })
        });
      } else if (url.includes('/health')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              status: 'healthy',
              components: {
                postingIntelligence: 'healthy',
                qualityAssessment: 'healthy'
              }
            }
          })
        });
      }
    });
    
    // Navigate to application
    await page.goto('http://localhost:3000');
  });
  
  test.describe('Post Creation Workflow', () => {
    test('should create intelligent post through complete user journey', async ({ page }) => {
      // Step 1: Navigate to post creation
      await page.click('[data-testid="create-post-button"]');
      await expect(page.locator('[data-testid="post-creation-form"]')).toBeVisible();
      
      // Step 2: Select agent type
      await page.selectOption('[data-testid="agent-type-select"]', mockData.postData.agentType);
      
      // Step 3: Fill post details
      await page.fill('[data-testid="post-title-input"]', mockData.postData.title);
      await page.fill('[data-testid="post-description-textarea"]', mockData.postData.description);
      await page.selectOption('[data-testid="priority-select"]', mockData.postData.priority);
      
      // Step 4: Trigger intelligent generation
      await page.click('[data-testid="generate-intelligent-post"]');
      
      // Step 5: Wait for generation to complete
      await expect(page.locator('[data-testid="generation-spinner"]')).toBeVisible();
      await expect(page.locator('[data-testid="generation-spinner"]')).not.toBeVisible({ timeout: 10000 });
      
      // Step 6: Verify generated content
      const generatedContent = await page.textContent('[data-testid="generated-content"]');
      expect(generatedContent).toContain('E2E Generated');
      expect(generatedContent).toContain('Complete E2E testing setup');
      
      // Step 7: Verify metadata display
      await expect(page.locator('[data-testid="quality-score"]')).toContainText('0.92');
      await expect(page.locator('[data-testid="impact-score"]')).toContainText('0.87');
      
      // Step 8: Save the post
      await page.click('[data-testid="save-post-button"]');
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Post saved successfully');
    });
    
    test('should handle form validation errors gracefully', async ({ page }) => {
      // Navigate to post creation
      await page.click('[data-testid="create-post-button"]');
      
      // Try to generate without required fields
      await page.click('[data-testid="generate-intelligent-post"]');
      
      // Verify validation errors
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="validation-error"]')).toContainText('Title is required');
      
      // Fill title and try again
      await page.fill('[data-testid="post-title-input"]', mockData.postData.title);
      await page.click('[data-testid="generate-intelligent-post"]');
      
      // Should proceed without validation errors
      await expect(page.locator('[data-testid="validation-error"]')).not.toBeVisible();
    });
    
    test('should allow content editing after generation', async ({ page }) => {
      // Complete post generation
      await page.click('[data-testid="create-post-button"]');
      await page.fill('[data-testid="post-title-input"]', mockData.postData.title);
      await page.selectOption('[data-testid="agent-type-select"]', mockData.postData.agentType);
      await page.click('[data-testid="generate-intelligent-post"]');
      
      // Wait for generation
      await expect(page.locator('[data-testid="generation-spinner"]')).not.toBeVisible({ timeout: 10000 });
      
      // Edit generated content
      await page.click('[data-testid="edit-content-button"]');
      const contentEditor = page.locator('[data-testid="content-editor"]');
      await expect(contentEditor).toBeVisible();
      
      // Modify content
      await contentEditor.clear();
      await contentEditor.fill('Edited: ' + mockData.postData.title);
      
      // Save changes
      await page.click('[data-testid="save-content-changes"]');
      
      // Verify changes
      const updatedContent = await page.textContent('[data-testid="generated-content"]');
      expect(updatedContent).toContain('Edited: Complete E2E testing setup');
    });
  });
  
  test.describe('Batch Post Generation', () => {
    test('should create multiple posts in batch mode', async ({ page }) => {
      // Navigate to batch creation
      await page.click('[data-testid="batch-create-button"]');
      await expect(page.locator('[data-testid="batch-creation-form"]')).toBeVisible();
      
      // Add multiple post requests
      await page.click('[data-testid="add-batch-item"]');
      await page.fill('[data-testid="batch-item-0-title"]', 'Batch Task 1');
      await page.selectOption('[data-testid="batch-item-0-agent-type"]', 'personal-todos');
      
      await page.click('[data-testid="add-batch-item"]');
      await page.fill('[data-testid="batch-item-1-title"]', 'Batch Task 2');
      await page.selectOption('[data-testid="batch-item-1-agent-type"]', 'meeting-prep');
      
      // Generate batch
      await page.click('[data-testid="generate-batch-posts"]');
      
      // Wait for batch processing
      await expect(page.locator('[data-testid="batch-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="batch-complete"]')).toBeVisible({ timeout: 15000 });
      
      // Verify batch results
      const batchResults = page.locator('[data-testid="batch-result-item"]');
      await expect(batchResults).toHaveCount(2);
      
      // Check individual results
      await expect(batchResults.nth(0)).toContainText('Batch Task 1');
      await expect(batchResults.nth(1)).toContainText('Batch Task 2');
    });
  });
  
  test.describe('Quality Analysis Workflow', () => {
    test('should analyze content quality and show recommendations', async ({ page }) => {
      // Mock quality analysis response
      await page.route('**/api/v1/posting-intelligence/analyze/quality', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              overallScore: 0.78,
              breakdown: {
                clarity: 0.85,
                structure: 0.72,
                relevance: 0.80
              },
              improvements: [
                'Add more specific examples',
                'Improve call-to-action clarity'
              ]
            }
          })
        });
      });
      
      // Navigate to quality analysis
      await page.click('[data-testid="quality-analysis-tab"]');
      
      // Input content for analysis
      const testContent = 'This is sample content for quality analysis testing.';
      await page.fill('[data-testid="content-input-textarea"]', testContent);
      
      // Trigger analysis
      await page.click('[data-testid="analyze-quality-button"]');
      
      // Wait for analysis results
      await expect(page.locator('[data-testid="quality-results"]')).toBeVisible({ timeout: 5000 });
      
      // Verify quality scores
      await expect(page.locator('[data-testid="overall-score"]')).toContainText('0.78');
      await expect(page.locator('[data-testid="clarity-score"]')).toContainText('0.85');
      await expect(page.locator('[data-testid="structure-score"]')).toContainText('0.72');
      
      // Verify improvement recommendations
      const recommendations = page.locator('[data-testid="recommendation-item"]');
      await expect(recommendations).toHaveCount(2);
      await expect(recommendations.nth(0)).toContainText('Add more specific examples');
      await expect(recommendations.nth(1)).toContainText('Improve call-to-action clarity');
    });
  });
  
  test.describe('Analytics Dashboard', () => {
    test('should display system analytics and performance metrics', async ({ page }) => {
      // Mock analytics response
      await page.route('**/api/v1/posting-intelligence/analytics', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              totalPosts: 1247,
              averageQuality: 0.84,
              averageEngagement: 0.76,
              topPatterns: ['professional_tone', 'clear_structure', 'action_oriented'],
              performanceMetrics: {
                averageProcessingTime: 285,
                successRate: 0.987,
                throughputPerMinute: 95
              }
            }
          })
        });
      });
      
      // Navigate to analytics
      await page.click('[data-testid="analytics-tab"]');
      
      // Wait for analytics to load
      await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
      
      // Verify key metrics
      await expect(page.locator('[data-testid="total-posts-metric"]')).toContainText('1,247');
      await expect(page.locator('[data-testid="avg-quality-metric"]')).toContainText('84%');
      await expect(page.locator('[data-testid="avg-engagement-metric"]')).toContainText('76%');
      
      // Verify performance metrics
      await expect(page.locator('[data-testid="processing-time-metric"]')).toContainText('285ms');
      await expect(page.locator('[data-testid="success-rate-metric"]')).toContainText('98.7%');
      
      // Verify top patterns
      const patternItems = page.locator('[data-testid="pattern-item"]');
      await expect(patternItems).toHaveCount(3);
      await expect(patternItems.nth(0)).toContainText('professional_tone');
    });
  });
  
  test.describe('Error Handling and Edge Cases', () => {
    test('should handle API failures gracefully', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/v1/posting-intelligence/generate', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error'
          })
        });
      });
      
      // Try to create post
      await page.click('[data-testid="create-post-button"]');
      await page.fill('[data-testid="post-title-input"]', mockData.postData.title);
      await page.selectOption('[data-testid="agent-type-select"]', mockData.postData.agentType);
      await page.click('[data-testid="generate-intelligent-post"]');
      
      // Verify error handling
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to generate post');
      
      // Verify retry option
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });
    
    test('should handle slow API responses with loading states', async ({ page }) => {
      // Mock slow API response
      await page.route('**/api/v1/posting-intelligence/generate', async route => {
        // Delay response by 3 seconds
        await page.waitForTimeout(3000);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              content: 'Slow response content',
              metadata: { qualityScore: 0.8 }
            }
          })
        });
      });
      
      // Start post generation
      await page.click('[data-testid="create-post-button"]');
      await page.fill('[data-testid="post-title-input"]', mockData.postData.title);
      await page.click('[data-testid="generate-intelligent-post"]');
      
      // Verify loading state
      await expect(page.locator('[data-testid="generation-spinner"]')).toBeVisible();
      await expect(page.locator('[data-testid="loading-text"]')).toContainText('Generating intelligent post...');
      
      // Wait for completion
      await expect(page.locator('[data-testid="generation-spinner"]')).not.toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="generated-content"]')).toContainText('Slow response content');
    });
    
    test('should handle network connectivity issues', async ({ page }) => {
      // Simulate network failure
      await page.setOffline(true);
      
      // Try to create post
      await page.click('[data-testid="create-post-button"]');
      await page.fill('[data-testid="post-title-input"]', mockData.postData.title);
      await page.click('[data-testid="generate-intelligent-post"]');
      
      // Verify offline handling
      await expect(page.locator('[data-testid="offline-message"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="offline-message"]')).toContainText('No internet connection');
      
      // Restore connection
      await page.setOffline(false);
      
      // Verify connection restored
      await expect(page.locator('[data-testid="online-indicator"]')).toBeVisible({ timeout: 3000 });
    });
  });
  
  test.describe('Accessibility and Usability', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Navigate to post creation using keyboard
      await page.keyboard.press('Tab'); // Focus on create button
      await page.keyboard.press('Enter'); // Activate create button
      
      // Navigate through form fields
      await page.keyboard.press('Tab'); // Agent type select
      await page.keyboard.press('Tab'); // Title input
      await page.keyboard.type(mockData.postData.title);
      
      await page.keyboard.press('Tab'); // Description textarea
      await page.keyboard.type(mockData.postData.description);
      
      // Verify form is properly filled
      const titleValue = await page.inputValue('[data-testid="post-title-input"]');
      expect(titleValue).toBe(mockData.postData.title);
    });
    
    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.click('[data-testid="create-post-button"]');
      
      // Check ARIA labels
      const titleInput = page.locator('[data-testid="post-title-input"]');
      await expect(titleInput).toHaveAttribute('aria-label', /title/i);
      
      const agentTypeSelect = page.locator('[data-testid="agent-type-select"]');
      await expect(agentTypeSelect).toHaveAttribute('role', 'combobox');
      
      // Check form validation messages have proper ARIA
      await page.click('[data-testid="generate-intelligent-post"]');
      const errorMessage = page.locator('[data-testid="validation-error"]');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toHaveAttribute('role', 'alert');
      }
    });
    
    test('should work with screen reader announcements', async ({ page }) => {
      // This test would typically use axe-playwright or similar accessibility tools
      await page.click('[data-testid="create-post-button"]');
      
      // Check that dynamic content changes are announced
      await page.fill('[data-testid="post-title-input"]', mockData.postData.title);
      await page.click('[data-testid="generate-intelligent-post"]');
      
      // Wait for generation to complete
      await expect(page.locator('[data-testid="generation-spinner"]')).not.toBeVisible({ timeout: 10000 });
      
      // Check that the generated content area has proper labeling
      const generatedContent = page.locator('[data-testid="generated-content"]');
      await expect(generatedContent).toHaveAttribute('aria-live', 'polite');
    });
  });
  
  test.describe('Cross-browser Compatibility', () => {
    test('should work consistently across different viewports', async ({ page, browserName }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.click('[data-testid="mobile-menu-button"]');
      await page.click('[data-testid="create-post-mobile"]');
      
      // Verify mobile layout
      await expect(page.locator('[data-testid="mobile-form-container"]')).toBeVisible();
      
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Verify tablet layout adjustments
      await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
      
      // Test desktop viewport
      await page.setViewportSize({ width: 1440, height: 900 });
      
      // Verify desktop layout
      await expect(page.locator('[data-testid="desktop-layout"]')).toBeVisible();
    });
    
    test('should handle browser-specific features gracefully', async ({ page, browserName }) => {
      await page.click('[data-testid="create-post-button"]');
      
      // Test clipboard functionality (may vary by browser)
      if (browserName === 'chromium' || browserName === 'chrome') {
        // Test clipboard permissions in Chrome-based browsers
        await page.fill('[data-testid="post-title-input"]', mockData.postData.title);
        
        // Copy button should be available
        await expect(page.locator('[data-testid="copy-title-button"]')).toBeEnabled();
      }
      
      // Test file upload (if supported)
      const fileInput = page.locator('[data-testid="attachment-input"]');
      if (await fileInput.isVisible()) {
        // Browser should support file selection
        await expect(fileInput).toHaveAttribute('type', 'file');
      }
    });
  });
});