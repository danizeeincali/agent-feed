import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { setupTestServer, teardownTestServer } from '../utils/test-server';
import { createMockAgentAPI } from '../utils/mock-agent-api';
import { seedTestDatabase } from '../utils/test-database';

describe('Mention System Integration Tests - London School TDD', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let mockApiServer: any;

  // Mock agent data for integration tests
  const mockAgents = [
    { 
      id: 'agent-001', 
      name: 'chief-of-staff-agent', 
      displayName: 'Chief of Staff', 
      description: 'Strategic coordination and planning',
      avatar: '/avatars/chief-of-staff.png',
      status: 'active',
      capabilities: ['planning', 'coordination', 'strategy']
    },
    { 
      id: 'agent-002', 
      name: 'personal-todos-agent', 
      displayName: 'Personal Todos', 
      description: 'Task and project management',
      avatar: '/avatars/todos.png',
      status: 'active',
      capabilities: ['task-management', 'productivity', 'organization']
    },
    { 
      id: 'agent-003', 
      name: 'meeting-prep-agent', 
      displayName: 'Meeting Prep', 
      description: 'Meeting preparation and coordination',
      avatar: '/avatars/meeting.png',
      status: 'active',
      capabilities: ['meeting-management', 'agenda-creation', 'follow-up']
    },
    { 
      id: 'agent-004', 
      name: 'data-analyst-agent', 
      displayName: 'Data Analyst', 
      description: 'Data analysis and reporting',
      avatar: '/avatars/analyst.png',
      status: 'active',
      capabilities: ['data-analysis', 'reporting', 'insights']
    }
  ];

  beforeAll(async () => {
    browser = await chromium.launch({ 
      headless: process.env.CI === 'true',
      slowMo: process.env.DEBUG ? 100 : 0
    });
    
    // Setup mock API server
    mockApiServer = await createMockAgentAPI({
      agents: mockAgents,
      port: 3001
    });
    
    // Setup test database
    await seedTestDatabase({
      agents: mockAgents,
      posts: [],
      comments: []
    });
  });

  beforeEach(async () => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      // Mock API responses at network level
      baseURL: 'http://localhost:3000'
    });
    
    page = await context.newPage();
    
    // Mock agent API responses - London School focuses on collaboration testing
    await page.route('**/api/v1/agents**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      
      if (method === 'GET') {
        const searchQuery = new URL(url).searchParams.get('search');
        
        if (searchQuery) {
          const filteredAgents = mockAgents.filter(agent =>
            agent.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            agent.description.toLowerCase().includes(searchQuery.toLowerCase())
          );
          
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: filteredAgents,
              total: filteredAgents.length
            })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: mockAgents,
              total: mockAgents.length
            })
          });
        }
      }
    });

    // Navigate to the application
    await page.goto('/');
    
    // Wait for application to load
    await page.waitForLoadState('networkidle');
  });

  afterEach(async () => {
    await context.close();
  });

  afterAll(async () => {
    await teardownTestServer(mockApiServer);
    await browser.close();
  });

  describe('PostCreator Integration', () => {
    beforeEach(async () => {
      // Navigate to post creation
      await page.click('[data-testid="create-post-button"]');
      await page.waitForSelector('[data-testid="post-creator-modal"]', { 
        state: 'visible' 
      });
    });

    it('should trigger mention autocomplete in post content', async () => {
      const contentTextarea = page.locator('[data-testid="post-content-textarea"]');
      
      // Type @ symbol to trigger mention autocomplete
      await contentTextarea.click();
      await contentTextarea.type('Hello @');
      
      // Verify suggestions dropdown appears
      await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();
      
      // Verify all agents are shown
      const suggestions = page.locator('[data-testid^="mention-suggestion-"]');
      await expect(suggestions).toHaveCount(mockAgents.length);
      
      // Verify API was called
      await page.waitForResponse('**/api/v1/agents**');
    });

    it('should filter agents based on search query', async () => {
      const contentTextarea = page.locator('[data-testid="post-content-textarea"]');
      
      await contentTextarea.click();
      await contentTextarea.type('Need help from @chief');
      
      await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();
      
      // Should only show Chief of Staff agent
      const suggestions = page.locator('[data-testid^="mention-suggestion-"]');
      await expect(suggestions).toHaveCount(1);
      
      const firstSuggestion = suggestions.first();
      await expect(firstSuggestion).toContainText('Chief of Staff');
    });

    it('should select agent with keyboard navigation', async () => {
      const contentTextarea = page.locator('[data-testid="post-content-textarea"]');
      
      await contentTextarea.click();
      await contentTextarea.type('@');
      
      await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();
      
      // Navigate with arrow keys
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown'); // Select second agent
      
      // Verify selection is highlighted
      const selectedSuggestion = page.locator('[data-testid="mention-suggestion-agent-002"]');
      await expect(selectedSuggestion).toHaveAttribute('aria-selected', 'true');
      
      // Press Enter to select
      await page.keyboard.press('Enter');
      
      // Verify text was replaced with mention
      await expect(contentTextarea).toHaveValue('@personal-todos-agent ');
      
      // Verify suggestions are hidden
      await expect(page.locator('[data-testid="mention-suggestions"]')).not.toBeVisible();
    });

    it('should select agent with mouse click', async () => {
      const contentTextarea = page.locator('[data-testid="post-content-textarea"]');
      
      await contentTextarea.click();
      await contentTextarea.type('Collaborating with @');
      
      await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();
      
      // Click on first suggestion
      const firstSuggestion = page.locator('[data-testid="mention-suggestion-agent-001"]');
      await firstSuggestion.click();
      
      // Verify text replacement
      await expect(contentTextarea).toHaveValue('Collaborating with @chief-of-staff-agent ');
      
      // Verify suggestions are hidden
      await expect(page.locator('[data-testid="mention-suggestions"]')).not.toBeVisible();
    });

    it('should handle multiple mentions in same text', async () => {
      const contentTextarea = page.locator('[data-testid="post-content-textarea"]');
      
      await contentTextarea.click();
      await contentTextarea.type('@chief');
      
      // Select first mention
      await page.keyboard.press('Enter');
      await expect(contentTextarea).toHaveValue('@chief-of-staff-agent ');
      
      // Add second mention
      await contentTextarea.type('and @todo');
      await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();
      
      const todoSuggestion = page.locator('[data-testid="mention-suggestion-agent-002"]');
      await todoSuggestion.click();
      
      // Verify both mentions are present
      await expect(contentTextarea).toHaveValue('@chief-of-staff-agent and @personal-todos-agent ');
    });

    it('should close suggestions with Escape key', async () => {
      const contentTextarea = page.locator('[data-testid="post-content-textarea"]');
      
      await contentTextarea.click();
      await contentTextarea.type('@');
      
      await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();
      
      await page.keyboard.press('Escape');
      
      await expect(page.locator('[data-testid="mention-suggestions"]')).not.toBeVisible();
      
      // Verify text remains unchanged
      await expect(contentTextarea).toHaveValue('@');
    });

    it('should maintain mention format in submitted post', async () => {
      const titleInput = page.locator('[data-testid="post-title-input"]');
      const contentTextarea = page.locator('[data-testid="post-content-textarea"]');
      
      await titleInput.fill('Test Post with Mentions');
      
      await contentTextarea.click();
      await contentTextarea.type('Working with @chief');
      await page.keyboard.press('Enter'); // Select first suggestion
      
      // Mock post creation API
      await page.route('**/api/v1/agent-posts', async (route) => {
        const request = route.request();
        const postData = JSON.parse(request.postData() || '{}');
        
        // Verify mentions are included in metadata
        expect(postData.metadata.agentMentions).toContain('agent-001');
        expect(postData.content).toContain('@chief-of-staff-agent');
        
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'post-001', ...postData }
          })
        });
      });
      
      // Submit the post
      await page.click('[data-testid="submit-post"]');
      
      // Verify post was created successfully
      await expect(page.locator('[data-testid="post-creator-modal"]')).not.toBeVisible();
    });
  });

  describe('Comment System Integration', () => {
    beforeEach(async () => {
      // Navigate to a post with comments
      await page.goto('/post/sample-post-001');
      await page.waitForLoadState('networkidle');
    });

    it('should enable mentions in comment input', async () => {
      const commentInput = page.locator('[data-testid="comment-input"]');
      
      await commentInput.click();
      await commentInput.type('Great insight @');
      
      await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();
      
      const suggestions = page.locator('[data-testid^="mention-suggestion-"]');
      await expect(suggestions).toHaveCount(mockAgents.length);
    });

    it('should submit comment with mentions', async () => {
      const commentInput = page.locator('[data-testid="comment-input"]');
      
      await commentInput.click();
      await commentInput.type('Agreed! @data');
      
      // Select data analyst
      const dataSuggestion = page.locator('[data-testid="mention-suggestion-agent-004"]');
      await dataSuggestion.click();
      
      // Mock comment creation API
      await page.route('**/api/v1/comments', async (route) => {
        const request = route.request();
        const commentData = JSON.parse(request.postData() || '{}');
        
        expect(commentData.content).toContain('@data-analyst-agent');
        expect(commentData.metadata.agentMentions).toContain('agent-004');
        
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'comment-001', ...commentData }
          })
        });
      });
      
      await page.click('[data-testid="submit-comment"]');
      
      // Verify comment appears in UI
      await expect(page.locator('[data-testid="comment-001"]')).toContainText('@data-analyst-agent');
    });
  });

  describe('QuickPost Integration', () => {
    it('should work in quick post component', async () => {
      const quickPostInput = page.locator('[data-testid="quick-post-input"]');
      
      await quickPostInput.click();
      await quickPostInput.type('Quick update @meeting');
      
      await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();
      
      const meetingSuggestion = page.locator('[data-testid="mention-suggestion-agent-003"]');
      await meetingSuggestion.click();
      
      await expect(quickPostInput).toHaveValue('Quick update @meeting-prep-agent ');
    });

    it('should expand to full composer with mentions preserved', async () => {
      const quickPostInput = page.locator('[data-testid="quick-post-input"]');
      
      await quickPostInput.click();
      await quickPostInput.type('Complex post @chief');
      await page.keyboard.press('Enter'); // Select chief of staff
      
      // Click expand button
      await page.click('[data-testid="expand-quick-post"]');
      
      // Verify full composer opens with content preserved
      await expect(page.locator('[data-testid="post-creator-modal"]')).toBeVisible();
      const contentTextarea = page.locator('[data-testid="post-content-textarea"]');
      await expect(contentTextarea).toHaveValue('Complex post @chief-of-staff-agent ');
    });
  });

  describe('Mobile Responsiveness', () => {
    beforeEach(async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
    });

    it('should work correctly on mobile devices', async () => {
      await page.click('[data-testid="create-post-button"]');
      await page.waitForSelector('[data-testid="post-creator-modal"]');
      
      const contentTextarea = page.locator('[data-testid="post-content-textarea"]');
      await contentTextarea.click();
      await contentTextarea.type('@');
      
      // Suggestions should be visible and properly sized on mobile
      const suggestionsList = page.locator('[data-testid="mention-suggestions"]');
      await expect(suggestionsList).toBeVisible();
      
      // Check that suggestions don't overflow viewport
      const listBounds = await suggestionsList.boundingBox();
      expect(listBounds!.width).toBeLessThanOrEqual(375);
    });

    it('should handle touch interactions', async () => {
      await page.click('[data-testid="create-post-button"]');
      await page.waitForSelector('[data-testid="post-creator-modal"]');
      
      const contentTextarea = page.locator('[data-testid="post-content-textarea"]');
      await contentTextarea.tap();
      await contentTextarea.type('@');
      
      const firstSuggestion = page.locator('[data-testid="mention-suggestion-agent-001"]');
      await firstSuggestion.tap();
      
      await expect(contentTextarea).toHaveValue('@chief-of-staff-agent ');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle API failures gracefully', async () => {
      // Mock API failure
      await page.route('**/api/v1/agents**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error'
          })
        });
      });
      
      await page.click('[data-testid="create-post-button"]');
      await page.waitForSelector('[data-testid="post-creator-modal"]');
      
      const contentTextarea = page.locator('[data-testid="post-content-textarea"]');
      await contentTextarea.click();
      await contentTextarea.type('@');
      
      // Should show error message
      await expect(page.locator('[data-testid="mention-error"]')).toContainText('Unable to load agents');
    });

    it('should handle network timeouts', async () => {
      // Mock slow API response
      await page.route('**/api/v1/agents**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10s delay
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockAgents })
        });
      });
      
      await page.click('[data-testid="create-post-button"]');
      await page.waitForSelector('[data-testid="post-creator-modal"]');
      
      const contentTextarea = page.locator('[data-testid="post-content-textarea"]');
      await contentTextarea.click();
      await contentTextarea.type('@');
      
      // Should show loading state first
      await expect(page.locator('[data-testid="mention-loading"]')).toBeVisible();
      
      // Should timeout and show error after configured timeout
      await expect(page.locator('[data-testid="mention-error"]')).toContainText('Request timed out');
    });

    it('should handle malformed agent data', async () => {
      // Mock API with invalid data
      await page.route('**/api/v1/agents**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              { id: 'invalid-agent' }, // Missing required fields
              { name: 'no-id-agent', displayName: 'No ID' }, // Missing id
              null, // Null entry
              mockAgents[0] // Valid agent
            ]
          })
        });
      });
      
      await page.click('[data-testid="create-post-button"]');
      await page.waitForSelector('[data-testid="post-creator-modal"]');
      
      const contentTextarea = page.locator('[data-testid="post-content-textarea"]');
      await contentTextarea.click();
      await contentTextarea.type('@');
      
      // Should only show valid agent
      const suggestions = page.locator('[data-testid^="mention-suggestion-"]');
      await expect(suggestions).toHaveCount(1);
      await expect(suggestions.first()).toContainText('Chief of Staff');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large agent datasets efficiently', async () => {
      const largeAgentList = Array.from({ length: 500 }, (_, index) => ({
        id: `agent-${String(index).padStart(3, '0')}`,
        name: `agent-${index}`,
        displayName: `Agent ${index}`,
        description: `Description for agent ${index}`,
        status: 'active'
      }));
      
      // Mock large dataset
      await page.route('**/api/v1/agents**', async (route) => {
        const url = route.request().url();
        const searchQuery = new URL(url).searchParams.get('search');
        
        let responseData = largeAgentList;
        if (searchQuery) {
          responseData = largeAgentList.filter(agent =>
            agent.displayName.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: responseData.slice(0, 10), // Limit to 10 results
            total: responseData.length
          })
        });
      });
      
      await page.click('[data-testid="create-post-button"]');
      await page.waitForSelector('[data-testid="post-creator-modal"]');
      
      const contentTextarea = page.locator('[data-testid="post-content-textarea"]');
      
      const startTime = Date.now();
      
      await contentTextarea.click();
      await contentTextarea.type('@');
      
      await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should respond within 1 second even with large dataset
      expect(responseTime).toBeLessThan(1000);
      
      // Should show maximum of 10 suggestions
      const suggestions = page.locator('[data-testid^="mention-suggestion-"]');
      await expect(suggestions).toHaveCount(10);
    });

    it('should debounce rapid typing effectively', async () => {
      let apiCallCount = 0;
      
      await page.route('**/api/v1/agents**', async (route) => {
        apiCallCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockAgents })
        });
      });
      
      await page.click('[data-testid="create-post-button"]');
      await page.waitForSelector('[data-testid="post-creator-modal"]');
      
      const contentTextarea = page.locator('[data-testid="post-content-textarea"]');
      await contentTextarea.click();
      
      // Rapid typing
      await contentTextarea.type('@chie');
      
      // Wait for debounce
      await page.waitForTimeout(500);
      
      // Should make minimal API calls due to debouncing
      expect(apiCallCount).toBeLessThanOrEqual(2); // Initial @ + final search
    });
  });

  describe('Accessibility Integration', () => {
    it('should support screen readers', async () => {
      await page.click('[data-testid="create-post-button"]');
      await page.waitForSelector('[data-testid="post-creator-modal"]');
      
      const contentTextarea = page.locator('[data-testid="post-content-textarea"]');
      await contentTextarea.click();
      await contentTextarea.type('@');
      
      const suggestionsList = page.locator('[data-testid="mention-suggestions"]');
      
      // Verify ARIA attributes
      await expect(suggestionsList).toHaveAttribute('role', 'listbox');
      await expect(contentTextarea).toHaveAttribute('aria-expanded', 'true');
      await expect(contentTextarea).toHaveAttribute('aria-owns', expect.stringMatching(/mention-suggestions/));
      
      // Verify live region for announcements
      const liveRegion = page.locator('[aria-live="polite"]');
      await expect(liveRegion).toContainText(`${mockAgents.length} agents available`);
    });

    it('should work with keyboard-only navigation', async () => {
      // Disable mouse to force keyboard navigation
      await page.click('[data-testid="create-post-button"]');
      await page.waitForSelector('[data-testid="post-creator-modal"]');
      
      // Navigate to content textarea with Tab
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // Should reach content textarea
      
      await page.keyboard.type('@');
      
      await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();
      
      // Navigate suggestions with arrow keys
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      
      // Select with Enter
      await page.keyboard.press('Enter');
      
      const contentTextarea = page.locator('[data-testid="post-content-textarea"]');
      await expect(contentTextarea).toHaveValue('@personal-todos-agent ');
    });
  });
});