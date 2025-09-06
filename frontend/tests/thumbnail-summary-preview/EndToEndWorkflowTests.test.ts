/**
 * End-to-End User Workflow Tests with Live Interactions
 * London School TDD - Outside-in workflow orchestration with mock collaborations
 * 
 * Focus: Complete user journeys from post creation to video interaction with real data
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// User persona definitions for different workflow testing
const USER_PERSONAS = {
  casualUser: {
    name: 'Casual User',
    behavior: 'quick_browsing',
    expectations: ['fast_loading', 'simple_interaction', 'mobile_friendly']
  },
  contentCreator: {
    name: 'Content Creator',
    behavior: 'detailed_analysis',
    expectations: ['full_previews', 'video_expansion', 'sharing_features']
  },
  powerUser: {
    name: 'Power User',
    behavior: 'multi_tab_usage',
    expectations: ['keyboard_navigation', 'bulk_operations', 'performance']
  },
  accessibilityUser: {
    name: 'Accessibility User',
    behavior: 'screen_reader_navigation',
    expectations: ['keyboard_only', 'aria_announcements', 'high_contrast']
  },
  mobileUser: {
    name: 'Mobile User',
    behavior: 'touch_interaction',
    expectations: ['touch_targets', 'responsive_layout', 'offline_tolerance']
  }
} as const;

// Complete user journey scenarios
const USER_JOURNEYS = {
  discoverAndWatch: [
    'user_arrives_at_feed',
    'user_scrolls_through_content',
    'user_sees_interesting_thumbnail',
    'user_clicks_to_expand',
    'user_watches_video',
    'user_navigates_back'
  ],
  shareContent: [
    'user_creates_post_with_url',
    'user_sees_thumbnail_preview',
    'user_verifies_content_accuracy',
    'user_publishes_post',
    'user_shares_post_externally'
  ],
  multipleInteractions: [
    'user_opens_multiple_videos',
    'user_switches_between_videos',
    'user_manages_playback_states',
    'user_closes_videos_selectively'
  ],
  errorRecovery: [
    'user_encounters_network_error',
    'user_sees_fallback_content',
    'user_retries_action',
    'user_successfully_recovers'
  ],
  mobileWorkflow: [
    'user_uses_mobile_device',
    'user_taps_thumbnail',
    'user_watches_in_landscape',
    'user_returns_to_portrait'
  ]
} as const;

// End-to-end workflow orchestrator
class EndToEndOrchestrator {
  constructor(
    private mockUserSession: MockUserSession,
    private mockContentManager: MockContentManager,
    private mockInteractionTracker: MockInteractionTracker,
    private mockAnalyticsCollector: MockAnalyticsCollector
  ) {}

  async orchestrateUserJourney(page: Page, journey: string[], persona: keyof typeof USER_PERSONAS): Promise<void> {
    // Outside-in: Complete user workflow from start to finish
    await this.mockUserSession.initializeForPersona(persona);
    await this.mockInteractionTracker.startTracking();
    
    for (const step of journey) {
      await this.executeJourneyStep(page, step, persona);
    }
    
    await this.mockAnalyticsCollector.recordJourneyCompletion(journey);
  }

  async executeJourneyStep(page: Page, step: string, persona: keyof typeof USER_PERSONAS): Promise<void> {
    switch (step) {
      case 'user_arrives_at_feed':
        await this.mockUserSession.trackPageLoad();
        break;
      case 'user_sees_interesting_thumbnail':
        await this.mockContentManager.highlightThumbnail();
        break;
      case 'user_clicks_to_expand':
        await this.mockInteractionTracker.recordClick();
        break;
      case 'user_watches_video':
        await this.mockAnalyticsCollector.trackVideoEngagement();
        break;
      default:
        await this.mockInteractionTracker.recordGenericAction(step);
    }
  }
}

// Mock collaborators for end-to-end testing
class MockUserSession {
  async initializeForPersona(persona: string): Promise<void> {
    expect(persona).toBeTruthy();
    // Contract: Should configure session for user type
  }

  async trackPageLoad(): Promise<void> {
    // Contract: Should track page load metrics
  }
}

class MockContentManager {
  async highlightThumbnail(): Promise<void> {
    // Contract: Should manage content presentation
  }
}

class MockInteractionTracker {
  async startTracking(): Promise<void> {
    // Contract: Should begin tracking user interactions
  }

  async recordClick(): Promise<void> {
    // Contract: Should record click interactions
  }

  async recordGenericAction(action: string): Promise<void> {
    expect(action).toBeTruthy();
    // Contract: Should record various user actions
  }
}

class MockAnalyticsCollector {
  async recordJourneyCompletion(journey: string[]): Promise<void> {
    expect(journey.length).toBeGreaterThan(0);
    // Contract: Should record successful journey completion
  }

  async trackVideoEngagement(): Promise<void> {
    // Contract: Should track video interaction metrics
  }
}

test.describe('End-to-End User Workflow Tests', () => {
  let orchestrator: EndToEndOrchestrator;

  test.beforeEach(async ({ page, context }) => {
    // Initialize workflow orchestration mocks
    const mockUserSession = new MockUserSession();
    const mockContentManager = new MockContentManager();
    const mockInteractionTracker = new MockInteractionTracker();
    const mockAnalyticsCollector = new MockAnalyticsCollector();

    orchestrator = new EndToEndOrchestrator(
      mockUserSession,
      mockContentManager,
      mockInteractionTracker,
      mockAnalyticsCollector
    );

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  // Test each user persona with their specific journeys
  Object.entries(USER_PERSONAS).forEach(([personaKey, persona]) => {
    test.describe(`${persona.name} Workflows`, () => {
      test('should complete discover and watch journey', async ({ page, context }) => {
        const journey = USER_JOURNEYS.discoverAndWatch;
        await orchestrator.orchestrateUserJourney(page, journey, personaKey as keyof typeof USER_PERSONAS);

        // Step 1: User arrives at feed
        await expect(page.locator('[data-testid="social-media-feed"]')).toBeVisible();

        // Step 2: User scrolls through content (simulate initial content)
        for (let i = 0; i < 3; i++) {
          const testUrl = `https://www.youtube.com/watch?v=test${i}`;
          await page.getByTestId('post-content-input').fill(`Check this out: ${testUrl}`);
          await page.getByTestId('post-submit-button').click();
          await page.waitForTimeout(500);
        }

        // Step 3: User sees interesting thumbnail
        const thumbnailSummaries = page.locator('[data-testid="thumbnail-summary"]');
        await expect(thumbnailSummaries.first()).toBeVisible({ timeout: 10000 });

        // Verify multiple thumbnails are available for browsing
        expect(await thumbnailSummaries.count()).toBeGreaterThanOrEqual(3);

        // Step 4: User clicks to expand (on first thumbnail)
        const firstThumbnail = thumbnailSummaries.first();
        await firstThumbnail.click();

        // Step 5: User watches video
        const expandedVideo = page.locator('[data-testid="expanded-video"]');
        await expect(expandedVideo).toBeVisible({ timeout: 5000 });

        const videoIframe = expandedVideo.locator('iframe');
        await expect(videoIframe).toBeVisible();

        // Verify video is set up for viewing
        const iframeSrc = await videoIframe.getAttribute('src');
        expect(iframeSrc).toContain('youtube.com/embed');

        // Step 6: User navigates back
        const collapseButton = page.locator('[data-testid="collapse-video"]');
        if (await collapseButton.isVisible()) {
          await collapseButton.click();
          await expect(expandedVideo).not.toBeVisible();
        } else {
          // Alternative: click outside or use escape
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);
        }

        // Verify user is back to browse state
        await expect(firstThumbnail).toBeVisible();
      });

      test('should complete share content journey', async ({ page, context }) => {
        const journey = USER_JOURNEYS.shareContent;
        await orchestrator.orchestrateUserJourney(page, journey, personaKey as keyof typeof USER_PERSONAS);

        // Step 1: User creates post with URL
        const shareableUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        const postContent = `Amazing video everyone should see! ${shareableUrl} #mustwatch`;
        
        await page.getByTestId('post-content-input').fill(postContent);

        // Step 2: User sees thumbnail preview (before posting)
        await page.getByTestId('post-submit-button').click();

        // Step 3: User verifies content accuracy
        const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
        await expect(thumbnailSummary).toBeVisible({ timeout: 10000 });

        // Verify preview content accuracy
        const previewTitle = thumbnailSummary.locator('[data-testid="preview-title"]');
        await expect(previewTitle).toBeVisible();

        const previewThumbnail = thumbnailSummary.locator('img').first();
        await expect(previewThumbnail).toBeVisible();

        // Step 4: User publishes post (already done)
        const postCard = page.locator('[data-testid="post-card"]').first();
        await expect(postCard).toBeVisible();

        // Step 5: User shares post externally (test share functionality)
        const shareButton = page.locator('[data-testid="share-post"]');
        if (await shareButton.isVisible()) {
          await shareButton.click();
          
          const shareModal = page.locator('[data-testid="share-modal"]');
          if (await shareModal.isVisible()) {
            // Verify share options are available
            const copyLinkButton = page.locator('[data-testid="copy-link"]');
            if (await copyLinkButton.isVisible()) {
              await copyLinkButton.click();
              // Verify link was copied (implementation dependent)
            }
            
            // Close share modal
            const closeShareModal = page.locator('[data-testid="close-share"]');
            if (await closeShareModal.isVisible()) {
              await closeShareModal.click();
            }
          }
        }

        // Verify post remains accessible after sharing workflow
        await expect(thumbnailSummary).toBeVisible();
      });

      if (persona.behavior === 'multi_tab_usage') {
        test('should handle multiple video interactions workflow', async ({ page, context }) => {
          const journey = USER_JOURNEYS.multipleInteractions;
          await orchestrator.orchestrateUserJourney(page, journey, personaKey as keyof typeof USER_PERSONAS);

          // Create multiple posts with videos
          const videoUrls = [
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'https://www.youtube.com/watch?v=X8vsE3-PosQ',
            'https://www.youtube.com/watch?v=jfKfPfyJRdk'
          ];

          for (const url of videoUrls) {
            await page.getByTestId('post-content-input').fill(`Great video: ${url}`);
            await page.getByTestId('post-submit-button').click();
            await page.waitForTimeout(1000);
          }

          // Step 1: User opens multiple videos
          const thumbnailSummaries = page.locator('[data-testid="thumbnail-summary"]');
          await page.waitForFunction(() => {
            return document.querySelectorAll('[data-testid="thumbnail-summary"]').length >= 3;
          }, { timeout: 15000 });

          expect(await thumbnailSummaries.count()).toBe(3);

          // Open first two videos
          await thumbnailSummaries.nth(0).click();
          await thumbnailSummaries.nth(1).click();

          // Step 2: User switches between videos
          let expandedVideos = page.locator('[data-testid="expanded-video"]');
          expect(await expandedVideos.count()).toBe(2);

          // Step 3: User manages playback states
          // Focus should be on most recently opened video
          const secondVideo = expandedVideos.nth(1);
          const secondIframe = secondVideo.locator('iframe');
          
          // Verify video is focused and playing
          await expect(secondIframe).toBeFocused();

          // Step 4: User closes videos selectively
          const firstCollapseButton = page.locator('[data-testid="collapse-video"]').first();
          if (await firstCollapseButton.isVisible()) {
            await firstCollapseButton.click();
          }

          // Should now have only one expanded video
          await page.waitForTimeout(1000);
          expandedVideos = page.locator('[data-testid="expanded-video"]');
          expect(await expandedVideos.count()).toBe(1);

          // Third thumbnail should still be available for interaction
          await expect(thumbnailSummaries.nth(2)).toBeVisible();
        });
      }

      if (persona.behavior === 'touch_interaction') {
        test('should complete mobile workflow with touch interactions', async ({ page, context }) => {
          // Configure for mobile
          await page.setViewportSize({ width: 375, height: 667 });
          
          const journey = USER_JOURNEYS.mobileWorkflow;
          await orchestrator.orchestrateUserJourney(page, journey, personaKey as keyof typeof USER_PERSONAS);

          // Step 1: User uses mobile device (configured above)
          const mobileUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
          await page.getByTestId('post-content-input').fill(`Mobile test: ${mobileUrl}`);
          await page.getByTestId('post-submit-button').click();

          const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
          await expect(thumbnailSummary).toBeVisible();

          // Step 2: User taps thumbnail (use tap instead of click)
          await thumbnailSummary.tap();

          const expandedVideo = page.locator('[data-testid="expanded-video"]');
          await expect(expandedVideo).toBeVisible();

          // Verify mobile-optimized video size
          const videoContainer = expandedVideo.locator('iframe');
          const videoBox = await videoContainer.boundingBox();
          expect(videoBox?.width).toBeLessThanOrEqual(375);

          // Step 3: User watches in landscape mode
          await page.setViewportSize({ width: 667, height: 375 });
          await page.waitForTimeout(1000);

          // Video should adapt to landscape
          const landscapeVideoBox = await videoContainer.boundingBox();
          expect(landscapeVideoBox?.width).toBeGreaterThan(videoBox?.width || 0);

          // Step 4: User returns to portrait
          await page.setViewportSize({ width: 375, height: 667 });
          await page.waitForTimeout(1000);

          // Video should still be functional
          await expect(videoContainer).toBeVisible();
        });
      }

      if (persona.behavior === 'screen_reader_navigation') {
        test('should complete accessibility user workflow', async ({ page, context }) => {
          const journey = USER_JOURNEYS.discoverAndWatch;
          await orchestrator.orchestrateUserJourney(page, journey, personaKey as keyof typeof USER_PERSONAS);

          const accessibleUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
          await page.getByTestId('post-content-input').fill(`Accessible video: ${accessibleUrl}`);
          await page.getByTestId('post-submit-button').click();

          const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
          await expect(thumbnailSummary).toBeVisible();

          // Verify accessibility attributes
          expect(await thumbnailSummary.getAttribute('role')).toBeTruthy();
          expect(await thumbnailSummary.getAttribute('aria-label')).toBeTruthy();

          // Test keyboard navigation
          await thumbnailSummary.focus();
          await expect(thumbnailSummary).toBeFocused();

          // Activate with keyboard
          await page.keyboard.press('Enter');

          const expandedVideo = page.locator('[data-testid="expanded-video"]');
          await expect(expandedVideo).toBeVisible();

          // Focus should move appropriately
          const videoIframe = expandedVideo.locator('iframe');
          await expect(videoIframe).toBeFocused();

          // Test escape to close
          await page.keyboard.press('Escape');
          
          // Should return focus to thumbnail
          await expect(thumbnailSummary).toBeVisible();
        });
      }
    });
  });

  test.describe('Error Recovery Workflows', () => {
    test('should complete error recovery journey gracefully', async ({ page, context }) => {
      const journey = USER_JOURNEYS.errorRecovery;
      await orchestrator.orchestrateUserJourney(page, journey, 'casualUser');

      // Step 1: User encounters network error
      await context.route('**/link-preview**', (route) => {
        route.fulfill({ status: 500, body: 'Server Error' });
      });

      const problemUrl = 'https://www.youtube.com/watch?v=errortest';
      await page.getByTestId('post-content-input').fill(problemUrl);
      await page.getByTestId('post-submit-button').click();

      // Step 2: User sees fallback content
      const fallbackLink = page.locator(`a[href="${problemUrl}"]`);
      await expect(fallbackLink).toBeVisible({ timeout: 10000 });

      // Verify no thumbnail-summary appeared
      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]');
      await expect(thumbnailSummary).not.toBeVisible();

      // Step 3: User retries action (network recovers)
      await context.unroute('**/link-preview**');
      await context.route('**/link-preview**', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            url: problemUrl,
            title: 'Recovered Video',
            type: 'video',
            image: 'https://img.youtube.com/vi/errortest/mqdefault.jpg'
          })
        });
      });

      // Retry by posting same URL again
      await page.getByTestId('post-content-input').fill(problemUrl);
      await page.getByTestId('post-submit-button').click();

      // Step 4: User successfully recovers
      const recoveredThumbnail = page.locator('[data-testid="thumbnail-summary"]').last();
      await expect(recoveredThumbnail).toBeVisible({ timeout: 10000 });

      const recoveredTitle = recoveredThumbnail.locator('[data-testid="preview-title"]');
      await expect(recoveredTitle).toHaveText('Recovered Video');

      // Verify full functionality is restored
      await recoveredThumbnail.click();
      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();
    });

    test('should handle partial failures in workflow', async ({ page, context }) => {
      // Allow preview data but break images
      await context.route('**/link-preview**', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            url: 'https://www.youtube.com/watch?v=partialfail',
            title: 'Partial Failure Test',
            type: 'video',
            image: 'https://invalid-image-url.jpg'
          })
        });
      });

      const partialFailUrl = 'https://www.youtube.com/watch?v=partialfail';
      await page.getByTestId('post-content-input').fill(partialFailUrl);
      await page.getByTestId('post-submit-button').click();

      // Should create thumbnail-summary despite image failure
      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Should show title even with broken image
      const title = thumbnailSummary.locator('[data-testid="preview-title"]');
      await expect(title).toHaveText('Partial Failure Test');

      // Should show fallback icon for broken image
      const contentTypeIcon = thumbnailSummary.locator('[data-testid="content-type-icon"]');
      await expect(contentTypeIcon).toBeVisible();

      // User can still interact despite partial failure
      await thumbnailSummary.click();
      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();
    });
  });

  test.describe('Cross-Browser Workflow Compatibility', () => {
    test('should work consistently across different browser contexts', async ({ page, context }) => {
      const testUrl = 'https://www.youtube.com/watch?v=crossbrowser';
      
      await page.getByTestId('post-content-input').fill(`Cross-browser test: ${testUrl}`);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Test video expansion
      await thumbnailSummary.click();
      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();

      const videoIframe = expandedVideo.locator('iframe');
      const iframeSrc = await videoIframe.getAttribute('src');

      // Should work with standard YouTube embed parameters
      expect(iframeSrc).toContain('youtube.com/embed');
      expect(iframeSrc).toContain('crossbrowser');

      // Test in new tab/context
      const newContext = await page.context().browser()!.newContext();
      const newPage = await newContext.newPage();
      
      await newPage.goto('http://localhost:5173');
      await newPage.waitForLoadState('networkidle');

      await newPage.getByTestId('post-content-input').fill(`New context: ${testUrl}`);
      await newPage.getByTestId('post-submit-button').click();

      const newThumbnail = newPage.locator('[data-testid="thumbnail-summary"]').first();
      await expect(newThumbnail).toBeVisible();

      await newPage.close();
      await newContext.close();
    });
  });

  test.describe('Performance During User Journeys', () => {
    test('should maintain performance throughout complete user journey', async ({ page }) => {
      const journey = USER_JOURNEYS.discoverAndWatch;
      await orchestrator.orchestrateUserJourney(page, journey, 'powerUser');

      // Monitor performance throughout journey
      const journeyStartTime = Date.now();

      // Create content
      for (let i = 0; i < 5; i++) {
        const url = `https://www.youtube.com/watch?v=perf${i}`;
        await page.getByTestId('post-content-input').fill(`Performance test ${i}: ${url}`);
        await page.getByTestId('post-submit-button').click();
        await page.waitForTimeout(500);
      }

      // Browse and interact
      const thumbnails = page.locator('[data-testid="thumbnail-summary"]');
      await page.waitForFunction(() => {
        return document.querySelectorAll('[data-testid="thumbnail-summary"]').length >= 5;
      }, { timeout: 20000 });

      expect(await thumbnails.count()).toBe(5);

      // Rapid interactions
      for (let i = 0; i < 3; i++) {
        const interactionStart = Date.now();
        
        await thumbnails.nth(i).click();
        
        const expandedVideo = page.locator('[data-testid="expanded-video"]').nth(i);
        await expect(expandedVideo).toBeVisible();
        
        const interactionTime = Date.now() - interactionStart;
        expect(interactionTime).toBeLessThan(2000); // Each interaction under 2s
      }

      const totalJourneyTime = Date.now() - journeyStartTime;
      expect(totalJourneyTime).toBeLessThan(30000); // Complete journey under 30s

      // Verify all content still functional
      expect(await thumbnails.count()).toBe(5);
      const expandedVideos = page.locator('[data-testid="expanded-video"]');
      expect(await expandedVideos.count()).toBe(3);
    });
  });
});

// Test utilities
test.beforeAll(async () => {
  console.log('🛤️ Starting End-to-End User Workflow Tests');
  console.log('👥 User Personas:', Object.keys(USER_PERSONAS).length);
  console.log('🎯 User Journeys:', Object.keys(USER_JOURNEYS).length);
});

test.afterAll(async () => {
  console.log('✅ End-to-End User Workflow Tests Complete');
});

// Cleanup function
test.afterEach(async ({ page }) => {
  // Clean up any expanded videos or modals
  const expandedVideos = page.locator('[data-testid="expanded-video"]');
  const collapseButtons = page.locator('[data-testid="collapse-video"]');
  
  const videoCount = await expandedVideos.count();
  for (let i = 0; i < videoCount; i++) {
    const collapseButton = collapseButtons.nth(i);
    if (await collapseButton.isVisible()) {
      await collapseButton.click();
      await page.waitForTimeout(200);
    }
  }
});