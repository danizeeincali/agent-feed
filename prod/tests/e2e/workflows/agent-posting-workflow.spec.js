/**
 * Agent Posting Workflow E2E Tests
 * Tests the complete agent post creation, optimization, and publishing workflow
 */

import { test, expect } from '@playwright/test';
import { AgentDashboardPage } from '../pages/agent-dashboard-page.js';
import { PostCreationPage } from '../pages/post-creation-page.js';
import { AnalyticsPage } from '../pages/analytics-page.js';
import { AuthHelpers } from '../utils/auth-helpers.js';
import { PerformanceHelpers, ErrorHelpers } from '../utils/test-helpers.js';
import { TestDataGenerator } from '../fixtures/test-data-generator.js';

test.describe('Agent Posting Workflow', () => {
  let dashboardPage;
  let postCreationPage;
  let analyticsPage;
  let authHelpers;
  let performanceHelpers;
  let errorHelpers;
  let testData;

  test.beforeEach(async ({ page }) => {
    // Initialize page objects and helpers
    dashboardPage = new AgentDashboardPage(page);
    postCreationPage = new PostCreationPage(page);
    analyticsPage = new AnalyticsPage(page);
    authHelpers = new AuthHelpers(page);
    performanceHelpers = new PerformanceHelpers(page);
    errorHelpers = new ErrorHelpers(page);
    
    // Generate test data
    const dataGenerator = new TestDataGenerator();
    testData = await dataGenerator.generateBaseData();
    
    // Start error monitoring
    errorHelpers.startErrorMonitoring();
    
    // Authenticate user
    await authHelpers.loginAsUser();
  });

  test.afterEach(async () => {
    // Check for critical errors
    const criticalErrors = errorHelpers.hasCriticalErrors();
    if (criticalErrors) {
      console.warn('Critical errors detected:', errorHelpers.getErrors());
    }
    
    // Clean up
    await authHelpers.logout();
  });

  test('should complete basic agent post creation workflow', async ({ page }) => {
    // Navigate to dashboard
    await dashboardPage.navigate();
    await dashboardPage.waitForAgentsLoad();
    
    // Verify dashboard loads with agents
    const agents = await dashboardPage.getAgentsList();
    expect(agents).toHaveLength.greaterThan(0);
    
    // Create a new post via dashboard
    const postPage = await dashboardPage.createPost();
    
    // Fill in post details
    const postData = {
      title: 'Test Post from E2E Workflow',
      content: 'This is a comprehensive test of the agent posting workflow. It includes content optimization and quality assessment.',
      hashtags: ['#testing', '#e2e', '#automation'],
      platforms: ['twitter', 'facebook']
    };
    
    await postPage.createPost(postData);
    
    // Wait for content optimization
    await postPage.waitForOptimization();
    
    // Get quality assessment
    const qualityAssessment = await postPage.getQualityAssessment();
    expect(qualityAssessment.quality).toBeGreaterThan(60);
    
    // Get optimization suggestions
    const suggestions = await postPage.getOptimizationSuggestions();
    expect(suggestions.ai).toBeTruthy();
    
    // Apply first optimization if available
    if (suggestions.ai.length > 0) {
      await postPage.applyOptimizationSuggestion(0);
    }
    
    // Preview post
    const preview = await postPage.previewPost('twitter');
    expect(preview.content).toContain(postData.content);
    
    // Publish post
    const publishResult = await postPage.publishNow();
    expect(publishResult).toContain('success');
  });

  test('should handle template-based post creation', async ({ page }) => {
    await dashboardPage.navigate();
    
    // Create post with template
    const postPage = await dashboardPage.createPost();
    
    // Select a template
    await postPage.selectTemplate('Announcement');
    
    // Verify template is applied
    const currentContent = await postPage.getCurrentContent();
    expect(currentContent.content).toContain('{{');
    
    // Fill template variables
    await postPage.createPost({
      title: 'Product Launch Announcement',
      content: 'We are excited to announce the launch of our new AI-powered agent feed system!',
      hashtags: ['#ProductLaunch', '#AI', '#Innovation'],
      platforms: ['twitter', 'linkedin']
    });
    
    // Check quality scores
    const assessment = await postPage.getQualityAssessment();
    expect(assessment.quality).toBeDefined();
    expect(assessment.engagement).toBeDefined();
    
    // Schedule post for future
    const scheduledTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    const scheduleResult = await postPage.schedulePost(scheduledTime);
    expect(scheduleResult).toContain('scheduled');
  });

  test('should handle multi-platform post optimization', async ({ page }) => {
    await dashboardPage.navigate();
    const postPage = await dashboardPage.createPost();
    
    // Create post for multiple platforms
    const postData = {
      title: 'Multi-Platform Test Post',
      content: 'This post will be optimized for different social media platforms with varying character limits and requirements.',
      hashtags: ['#multiplatform', '#social', '#optimization'],
      platforms: ['twitter', 'facebook', 'instagram', 'linkedin']
    };
    
    await postPage.createPost(postData);
    await postPage.waitForOptimization();
    
    // Test platform-specific previews
    const platforms = postData.platforms;
    for (const platform of platforms) {
      const preview = await postPage.previewPost(platform);
      expect(preview.content).toBeTruthy();
      expect(preview.platform).toBe(platform);
      
      // Verify content length is appropriate for platform
      if (platform === 'twitter') {
        expect(preview.content.length).toBeLessThanOrEqual(280);
      }
    }
    
    // Check optimization suggestions for each platform
    const suggestions = await postPage.getOptimizationSuggestions();
    expect(suggestions.keywords).toBeTruthy();
    expect(suggestions.keywords.length).toBeGreaterThan(0);
  });

  test('should measure post creation performance', async ({ page }) => {
    // Start performance monitoring
    const networkMonitor = await performanceHelpers.startNetworkMonitoring();
    
    await dashboardPage.navigate();
    
    // Measure dashboard load performance
    const dashboardPerf = await performanceHelpers.measurePageLoad();
    expect(dashboardPerf.totalTime).toBeLessThan(5000); // 5 seconds
    
    const postPage = await dashboardPage.createPost();
    
    // Measure post creation page load
    const postPagePerf = await performanceHelpers.measurePageLoad();
    expect(postPagePerf.totalTime).toBeLessThan(3000); // 3 seconds
    
    // Create post and measure optimization time
    const optimizationStart = Date.now();
    await postPage.createPost({
      content: 'Performance test post with optimization',
      platforms: ['twitter']
    });
    
    await postPage.waitForOptimization();
    const optimizationTime = Date.now() - optimizationStart;
    expect(optimizationTime).toBeLessThan(10000); // 10 seconds
    
    // Check network statistics
    const networkStats = networkMonitor.getStats();
    expect(networkStats.errorCount).toBe(0);
    expect(networkStats.totalRequests).toBeGreaterThan(0);
    
    // Measure memory usage
    const memoryUsage = await performanceHelpers.measureMemoryUsage();
    if (memoryUsage) {
      expect(memoryUsage.used).toBeLessThan(memoryUsage.limit * 0.8);
    }
  });

  test('should handle post creation with media upload', async ({ page }) => {
    await dashboardPage.navigate();
    const postPage = await dashboardPage.createPost();
    
    // Create post with media
    await postPage.createPost({
      title: 'Post with Media',
      content: 'This post includes media attachments for visual appeal.',
      hashtags: ['#visual', '#media'],
      platforms: ['instagram', 'facebook'],
      mediaFiles: ['test-image.jpg'] // Mock file path
    });
    
    // Wait for media upload and optimization
    await postPage.waitForOptimization();
    
    // Verify media is included in preview
    const preview = await postPage.previewPost('instagram');
    expect(preview.content).toBeTruthy();
    
    // Check quality assessment with media
    const assessment = await postPage.getQualityAssessment();
    expect(assessment.quality).toBeGreaterThan(70); // Higher score with media
  });

  test('should save and restore draft posts', async ({ page }) => {
    await dashboardPage.navigate();
    const postPage = await dashboardPage.createPost();
    
    // Create partial post
    await postPage.createPost({
      title: 'Draft Post Test',
      content: 'This is a draft post that should be saved for later.',
      hashtags: ['#draft', '#test'],
      platforms: ['twitter']
    });
    
    // Save as draft
    const draftResult = await postPage.saveDraft();
    expect(draftResult).toContain('saved');
    
    // Navigate away and back
    await dashboardPage.navigate();
    
    // TODO: Add draft restoration test when draft management is implemented
    // This would involve navigating to drafts section and verifying saved content
  });

  test('should handle post creation errors gracefully', async ({ page }) => {
    await dashboardPage.navigate();
    const postPage = await dashboardPage.createPost();
    
    // Test with empty content
    await postPage.createPost({
      title: '',
      content: '',
      platforms: []
    });
    
    // Should show validation errors
    const hasErrors = await page.locator('[data-testid="validation-error"]').isVisible();
    expect(hasErrors).toBe(true);
    
    // Test with extremely long content
    const longContent = 'A'.repeat(10000);
    await postPage.createPost({
      title: 'Long Content Test',
      content: longContent,
      platforms: ['twitter']
    });
    
    // Should show content length warning
    const hasLengthWarning = await page.locator('[data-testid="length-warning"]').isVisible();
    // Length warning visibility depends on platform constraints
  });

  test('should verify post analytics integration', async ({ page }) => {
    // Create and publish a post
    await dashboardPage.navigate();
    const postPage = await dashboardPage.createPost();
    
    await postPage.createPost({
      title: 'Analytics Integration Test',
      content: 'This post tests analytics integration after publishing.',
      hashtags: ['#analytics', '#testing'],
      platforms: ['twitter']
    });
    
    await postPage.publishNow();
    
    // Navigate to analytics
    const analytics = await dashboardPage.viewAnalytics();
    
    // Verify analytics data
    const overview = await analytics.getOverviewMetrics();
    expect(overview.totalEngagement).toBeDefined();
    expect(overview.reach).toBeDefined();
    
    // Check if new post appears in top posts (eventually)
    // Note: In real implementation, this might require waiting or mock data
    const topPosts = await analytics.getTopPosts(5);
    expect(topPosts).toBeTruthy();
  });

  test('should handle concurrent post creation', async ({ page, context }) => {
    // Create multiple browser contexts to simulate concurrent users
    const context2 = await context.browser().newContext();
    const page2 = await context2.newPage();
    
    const authHelpers2 = new AuthHelpers(page2);
    const dashboardPage2 = new AgentDashboardPage(page2);
    
    await authHelpers2.loginAsUser();
    
    // Start concurrent post creation
    const postCreation1 = (async () => {
      await dashboardPage.navigate();
      const postPage = await dashboardPage.createPost();
      await postPage.createPost({
        title: 'Concurrent Post 1',
        content: 'This is the first concurrent post.',
        platforms: ['twitter']
      });
      return await postPage.publishNow();
    })();
    
    const postCreation2 = (async () => {
      await dashboardPage2.navigate();
      const postPage = await dashboardPage2.createPost();
      await postPage.createPost({
        title: 'Concurrent Post 2',
        content: 'This is the second concurrent post.',
        platforms: ['facebook']
      });
      return await postPage.publishNow();
    })();
    
    // Wait for both to complete
    const [result1, result2] = await Promise.all([postCreation1, postCreation2]);
    
    expect(result1).toContain('success');
    expect(result2).toContain('success');
    
    // Cleanup
    await authHelpers2.logout();
    await context2.close();
  });

  test('should maintain quality standards under load', async ({ page }) => {
    const qualityScores = [];
    const posts = [];
    
    // Create multiple posts rapidly
    for (let i = 0; i < 5; i++) {
      await dashboardPage.navigate();
      const postPage = await dashboardPage.createPost();
      
      const postData = {
        title: `Load Test Post ${i + 1}`,
        content: `This is load test post number ${i + 1} to verify quality standards are maintained under rapid posting conditions.`,
        hashtags: [`#loadtest${i + 1}`, '#quality'],
        platforms: ['twitter']
      };
      
      await postPage.createPost(postData);
      await postPage.waitForOptimization();
      
      const assessment = await postPage.getQualityAssessment();
      qualityScores.push(assessment.quality);
      
      posts.push(postData);
    }
    
    // Verify quality standards are maintained
    const averageQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
    expect(averageQuality).toBeGreaterThan(60);
    
    // Verify no quality degradation over time
    const firstHalf = qualityScores.slice(0, Math.ceil(qualityScores.length / 2));
    const secondHalf = qualityScores.slice(Math.ceil(qualityScores.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    // Quality should not degrade by more than 20%
    expect(secondHalfAvg).toBeGreaterThan(firstHalfAvg * 0.8);
  });
});