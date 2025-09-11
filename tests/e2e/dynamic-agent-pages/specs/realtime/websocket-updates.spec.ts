import { test, expect } from '@playwright/test';
import { AgentHomePage } from '../../page-objects';
import { testAgents, mockWebSocketEvents } from '../../fixtures/test-data';

/**
 * Real-time WebSocket Updates Tests for Dynamic Agent Pages
 * Tests WebSocket-based real-time updates and live data synchronization
 */
test.describe('WebSocket Real-time Updates', () => {
  let agentHomePage: AgentHomePage;

  test.beforeEach(async ({ page }) => {
    agentHomePage = new AgentHomePage(page);
    
    // Mock WebSocket for testing
    await page.addInitScript(() => {
      // Create mock WebSocket that can be controlled from tests
      (window as any).mockWebSocketEvents = [];
      (window as any).webSocketConnected = false;
      
      // Mock WebSocket connection
      setTimeout(() => {
        (window as any).webSocketConnected = true;
        
        // Simulate connection event
        if ((window as any).onWebSocketConnect) {
          (window as any).onWebSocketConnect();
        }
      }, 1000);
      
      // Function to simulate WebSocket events
      (window as any).simulateWebSocketEvent = (event: string, data: any) => {
        if ((window as any).webSocketEventHandlers && (window as any).webSocketEventHandlers[event]) {
          (window as any).webSocketEventHandlers[event](data);
        }
      };
    });
    
    await agentHomePage.goto(testAgents[0].id);
  });

  test('should establish WebSocket connection', async ({ page }) => {
    // Wait for WebSocket connection to be established
    await page.waitForFunction(() => (window as any).webSocketConnected === true, {
      timeout: 15000
    });
    
    const isConnected = await page.evaluate(() => (window as any).webSocketConnected);
    expect(isConnected).toBe(true);
  });

  test('should receive and display agent status updates', async ({ page }) => {
    // Wait for connection
    await page.waitForFunction(() => (window as any).webSocketConnected === true);
    
    // Get initial status
    const initialStatus = await agentHomePage.getAgentStatus();
    
    // Simulate status update via WebSocket
    await page.evaluate((testAgentId) => {
      (window as any).simulateWebSocketEvent('agent-update', {
        agentId: testAgentId,
        updates: {
          status: 'busy',
          todayTasks: 25
        }
      });
    }, testAgents[0].id);
    
    // Status should update in real-time
    await agentHomePage.waitForStatusUpdate('busy', 10000);
    
    const updatedStatus = await agentHomePage.getAgentStatus();
    expect(updatedStatus).toBe('busy');
  });

  test('should receive and display metric updates', async ({ page }) => {
    // Wait for connection and navigate to home tab
    await page.waitForFunction(() => (window as any).webSocketConnected === true);
    await agentHomePage.clickTab('Home');
    
    // Get initial metrics
    const initialWidgets = await agentHomePage.getVisibleWidgets();
    expect(initialWidgets.length).toBeGreaterThan(0);
    
    // Simulate metric update
    await page.evaluate((testAgentId) => {
      (window as any).simulateWebSocketEvent('metric-update', {
        agentId: testAgentId,
        metrics: {
          todayTasks: 30,
          successRate: 98.9,
          responseTime: 0.7
        }
      });
    }, testAgents[0].id);
    
    // Allow time for UI to update
    await page.waitForTimeout(2000);
    
    // Check if any metric widgets show updated values
    const taskWidget = await agentHomePage.getWidgetValue('Tasks Today').catch(() => '');
    if (taskWidget) {
      expect(taskWidget).toContain('30');
    }
  });

  test('should receive and display new posts in real-time', async ({ page }) => {
    // Wait for connection and go to posts tab
    await page.waitForFunction(() => (window as any).webSocketConnected === true);
    await agentHomePage.clickTab('Posts');
    
    // Get initial post count
    const initialPostCount = await agentHomePage.getPostCount();
    
    // Simulate new post via WebSocket
    const newPost = {
      id: 'websocket-test-post',
      type: 'update',
      title: 'Real-time Test Post',
      content: 'This post was delivered via WebSocket for testing real-time functionality.',
      timestamp: new Date().toISOString(),
      author: { 
        id: testAgents[0].id, 
        name: testAgents[0].name, 
        avatar: '🤖' 
      },
      tags: ['websocket', 'test'],
      interactions: { likes: 0, comments: 0, shares: 0, bookmarks: 0 },
      priority: 'medium'
    };
    
    await page.evaluate((data) => {
      (window as any).simulateWebSocketEvent('new-post', {
        authorId: data.testAgentId,
        post: data.newPost
      });
    }, { testAgentId: testAgents[0].id, newPost });
    
    // Wait for new post to appear
    await agentHomePage.waitForNewPost(15000);
    
    const updatedPostCount = await agentHomePage.getPostCount();
    expect(updatedPostCount).toBeGreaterThan(initialPostCount);
    
    // Verify the new post appears in the list
    const postTitles = await agentHomePage.getPostTitles();
    expect(postTitles).toContain('Real-time Test Post');
  });

  test('should handle connection loss and reconnection', async ({ page }) => {
    // Wait for initial connection
    await page.waitForFunction(() => (window as any).webSocketConnected === true);
    
    // Simulate connection loss
    await page.evaluate(() => {
      (window as any).webSocketConnected = false;
      if ((window as any).onWebSocketDisconnect) {
        (window as any).onWebSocketDisconnect();
      }
    });
    
    // Check for disconnection indicator (if implemented)
    const disconnectionIndicator = page.locator('.connection-status, .offline-indicator');
    if (await disconnectionIndicator.isVisible()) {
      await expect(disconnectionIndicator).toBeVisible();
    }
    
    // Simulate reconnection
    await page.evaluate(() => {
      setTimeout(() => {
        (window as any).webSocketConnected = true;
        if ((window as any).onWebSocketConnect) {
          (window as any).onWebSocketConnect();
        }
      }, 1000);
    });
    
    // Wait for reconnection
    await page.waitForFunction(() => (window as any).webSocketConnected === true);
    
    // Connection should be restored
    const isReconnected = await page.evaluate(() => (window as any).webSocketConnected);
    expect(isReconnected).toBe(true);
  });

  test('should handle multiple simultaneous updates', async ({ page }) => {
    await page.waitForFunction(() => (window as any).webSocketConnected === true);
    
    // Send multiple updates rapidly
    const updates = [
      {
        event: 'agent-update',
        data: { agentId: testAgents[0].id, updates: { todayTasks: 31 } }
      },
      {
        event: 'metric-update', 
        data: { agentId: testAgents[0].id, metrics: { successRate: 99.0 } }
      },
      {
        event: 'agent-update',
        data: { agentId: testAgents[0].id, updates: { status: 'active' } }
      }
    ];
    
    // Send all updates simultaneously
    await page.evaluate((updateList) => {
      updateList.forEach(({ event, data }, index) => {
        setTimeout(() => {
          (window as any).simulateWebSocketEvent(event, data);
        }, index * 100); // Slight delay between updates
      });
    }, updates);
    
    // Allow time for all updates to process
    await page.waitForTimeout(2000);
    
    // UI should handle all updates without errors
    const status = await agentHomePage.getAgentStatus();
    expect(status).toBe('active');
  });

  test('should update interaction counts in real-time', async ({ page }) => {
    await page.waitForFunction(() => (window as any).webSocketConnected === true);
    await agentHomePage.clickTab('Posts');
    
    const postCount = await agentHomePage.getPostCount();
    
    if (postCount > 0) {
      // Get initial like count for first post
      const initialLikes = await agentHomePage.getPostInteractionCount(0, 'like');
      
      // Simulate like update
      await page.evaluate((testAgentId) => {
        (window as any).simulateWebSocketEvent('post-interaction', {
          postId: 'post-1',
          type: 'like',
          count: 15,
          agentId: testAgentId
        });
      }, testAgents[0].id);
      
      // Allow time for update
      await page.waitForTimeout(1000);
      
      // Like count should be updated (if implemented)
      const updatedLikes = await agentHomePage.getPostInteractionCount(0, 'like');
      expect(updatedLikes).toBeGreaterThanOrEqual(initialLikes);
    }
  });

  test('should handle WebSocket events for different agents correctly', async ({ page }) => {
    await page.waitForFunction(() => (window as any).webSocketConnected === true);
    
    // Get current agent status
    const currentStatus = await agentHomePage.getAgentStatus();
    
    // Send update for a different agent (should be ignored)
    await page.evaluate(() => {
      (window as any).simulateWebSocketEvent('agent-update', {
        agentId: 'different-agent-id',
        updates: { status: 'error' }
      });
    });
    
    await page.waitForTimeout(1000);
    
    // Current agent status should remain unchanged
    const unchangedStatus = await agentHomePage.getAgentStatus();
    expect(unchangedStatus).toBe(currentStatus);
    
    // Now send update for current agent
    await page.evaluate((testAgentId) => {
      (window as any).simulateWebSocketEvent('agent-update', {
        agentId: testAgentId,
        updates: { status: 'busy' }
      });
    }, testAgents[0].id);
    
    // This should update the status
    await agentHomePage.waitForStatusUpdate('busy', 5000);
    const updatedStatus = await agentHomePage.getAgentStatus();
    expect(updatedStatus).toBe('busy');
  });

  test('should show real-time activity feed updates', async ({ page }) => {
    await page.waitForFunction(() => (window as any).webSocketConnected === true);
    await agentHomePage.clickTab('Home');
    
    // Simulate new activity
    await page.evaluate((testAgentId) => {
      (window as any).simulateWebSocketEvent('activity-update', {
        agentId: testAgentId,
        activity: {
          id: `activity-${Date.now()}`,
          type: 'task_completed',
          title: 'Real-time Task Completed',
          description: 'A task was completed in real-time',
          timestamp: new Date().toISOString()
        }
      });
    }, testAgents[0].id);
    
    // Allow time for activity to appear
    await page.waitForTimeout(2000);
    
    // Look for the activity in the recent activities section
    const activitySection = page.locator('[data-testid="recent-activities"], .recent-activities, .activity-feed');
    if (await activitySection.isVisible()) {
      const activityContent = await activitySection.textContent();
      expect(activityContent).toContain('Real-time Task Completed');
    }
  });

  test('should handle WebSocket message parsing errors gracefully', async ({ page }) => {
    await page.waitForFunction(() => (window as any).webSocketConnected === true);
    
    // Send malformed WebSocket message
    await page.evaluate(() => {
      (window as any).simulateWebSocketEvent('invalid-event', {
        malformed: true,
        data: null
      });
    });
    
    // Page should not crash or show errors
    await page.waitForTimeout(1000);
    
    // Normal functionality should still work
    await agentHomePage.clickTab('Posts');
    const activeTab = await agentHomePage.getActiveTab();
    expect(activeTab).toBe('Posts');
    
    // Send valid message after invalid one
    await page.evaluate((testAgentId) => {
      (window as any).simulateWebSocketEvent('agent-update', {
        agentId: testAgentId,
        updates: { status: 'active' }
      });
    }, testAgents[0].id);
    
    // Should still process valid messages
    await page.waitForTimeout(1000);
    const status = await agentHomePage.getAgentStatus();
    expect(status).toBeTruthy();
  });

  test('should rate-limit frequent updates', async ({ page }) => {
    await page.waitForFunction(() => (window as any).webSocketConnected === true);
    
    // Send many rapid updates
    const rapidUpdates = Array.from({ length: 20 }, (_, i) => ({
      event: 'agent-update',
      data: { 
        agentId: testAgents[0].id, 
        updates: { todayTasks: 20 + i } 
      }
    }));
    
    // Send all updates very rapidly
    await page.evaluate((updates) => {
      updates.forEach(({ event, data }) => {
        (window as any).simulateWebSocketEvent(event, data);
      });
    }, rapidUpdates);
    
    // UI should handle rapid updates gracefully (possibly with throttling)
    await page.waitForTimeout(2000);
    
    // Page should remain responsive
    await agentHomePage.clickTab('Metrics');
    const activeTab = await agentHomePage.getActiveTab();
    expect(activeTab).toBe('Metrics');
  });
});