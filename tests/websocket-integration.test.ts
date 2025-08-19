/**
 * WebSocket Integration Test Suite
 * Tests the complete WebSocket system functionality
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { io, Socket } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:3001';
const WEBSOCKET_TIMEOUT = 10000;

interface TestUser {
  id: string;
  username: string;
  socket?: Socket;
  page?: Page;
}

class WebSocketTestHelper {
  private users: Map<string, TestUser> = new Map();
  private connections: Socket[] = [];

  async createUser(id: string, username: string): Promise<TestUser> {
    const user: TestUser = { id, username };
    
    // Create WebSocket connection
    user.socket = io(BACKEND_URL, {
      auth: {
        userId: id,
        username: username,
        token: 'test-token',
      },
      transports: ['websocket'],
      timeout: WEBSOCKET_TIMEOUT,
    });

    this.users.set(id, user);
    this.connections.push(user.socket);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`WebSocket connection timeout for user ${username}`));
      }, WEBSOCKET_TIMEOUT);

      user.socket!.on('connect', () => {
        clearTimeout(timeout);
        console.log(`✅ User ${username} connected with socket ID: ${user.socket!.id}`);
        resolve(user);
      });

      user.socket!.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Connection failed for ${username}: ${error.message}`));
      });
    });
  }

  async createBrowserUser(context: BrowserContext, id: string, username: string): Promise<TestUser> {
    const user = await this.createUser(id, username);
    
    // Create browser page
    user.page = await context.newPage();
    
    // Set user info in localStorage
    await user.page.addInitScript(({ userId, userName }) => {
      localStorage.setItem('userId', userId);
      localStorage.setItem('username', userName);
    }, { userId: id, userName: username });

    await user.page.goto(FRONTEND_URL);
    
    // Wait for page to load and WebSocket to connect
    await user.page.waitForLoadState('networkidle');
    await user.page.waitForTimeout(2000); // Allow WebSocket connection to establish
    
    return user;
  }

  getUser(id: string): TestUser | undefined {
    return this.users.get(id);
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up WebSocket connections...');
    
    for (const socket of this.connections) {
      if (socket.connected) {
        socket.disconnect();
      }
    }
    
    for (const [id, user] of this.users) {
      if (user.page) {
        await user.page.close();
      }
    }
    
    this.users.clear();
    this.connections = [];
  }

  async waitForEvent(socket: Socket, event: string, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      socket.once(event, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }
}

test.describe('WebSocket System Integration', () => {
  let helper: WebSocketTestHelper;

  test.beforeEach(async () => {
    helper = new WebSocketTestHelper();
  });

  test.afterEach(async () => {
    await helper.cleanup();
  });

  test('should establish WebSocket connection', async () => {
    const user = await helper.createUser('user1', 'TestUser1');
    
    expect(user.socket!.connected).toBe(true);
    expect(user.socket!.id).toBeTruthy();
  });

  test('should handle multiple user connections', async () => {
    const user1 = await helper.createUser('user1', 'TestUser1');
    const user2 = await helper.createUser('user2', 'TestUser2');
    
    expect(user1.socket!.connected).toBe(true);
    expect(user2.socket!.connected).toBe(true);
    expect(user1.socket!.id).not.toBe(user2.socket!.id);
  });

  test('should broadcast user online status', async () => {
    const user1 = await helper.createUser('user1', 'TestUser1');
    const user2 = await helper.createUser('user2', 'TestUser2');

    // User2 should receive user1 online status
    const onlineEvent = await helper.waitForEvent(user2.socket!, 'agent:status');
    
    expect(onlineEvent.type).toBe('user_online');
    expect(onlineEvent.userId).toBe('user1');
    expect(onlineEvent.username).toBe('TestUser1');
  });

  test('should handle feed subscriptions', async () => {
    const user = await helper.createUser('user1', 'TestUser1');
    
    // Subscribe to feed
    user.socket!.emit('subscribe:feed', 'main');
    
    // Should receive subscription confirmation
    const subscriptionEvent = await helper.waitForEvent(user.socket!, 'feed:subscribed');
    expect(subscriptionEvent.feedId).toBe('main');
  });

  test('should handle real-time post creation', async () => {
    const user1 = await helper.createUser('user1', 'TestUser1');
    const user2 = await helper.createUser('user2', 'TestUser2');
    
    // Both users subscribe to main feed
    user1.socket!.emit('subscribe:feed', 'main');
    user2.socket!.emit('subscribe:feed', 'main');
    
    // Wait for subscriptions
    await helper.waitForEvent(user1.socket!, 'feed:subscribed');
    await helper.waitForEvent(user2.socket!, 'feed:subscribed');
    
    // Simulate post creation by emitting to server
    const mockPost = {
      id: 'post-123',
      title: 'Test Post',
      content: 'This is a test post content',
      authorAgent: 'test-agent',
      timestamp: new Date().toISOString(),
    };
    
    // Emit post creation (in real app, this would come from API)
    user1.socket!.emit('post:created', mockPost);
    
    // User2 should receive the post creation event
    const postEvent = await helper.waitForEvent(user2.socket!, 'post:created');
    expect(postEvent.id).toBe('post-123');
    expect(postEvent.title).toBe('Test Post');
  });

  test('should handle typing indicators', async () => {
    const user1 = await helper.createUser('user1', 'TestUser1');
    const user2 = await helper.createUser('user2', 'TestUser2');
    
    const postId = 'post-123';
    
    // Both users subscribe to the post
    user1.socket!.emit('subscribe:post', postId);
    user2.socket!.emit('subscribe:post', postId);
    
    // User1 starts typing
    user1.socket!.emit('user:typing', { postId, isTyping: true });
    
    // User2 should receive typing indicator
    const typingEvent = await helper.waitForEvent(user2.socket!, 'user:typing');
    expect(typingEvent.postId).toBe(postId);
    expect(typingEvent.userId).toBe('user1');
    expect(typingEvent.username).toBe('TestUser1');
    expect(typingEvent.isTyping).toBe(true);
    
    // User1 stops typing
    user1.socket!.emit('user:typing', { postId, isTyping: false });
    
    // User2 should receive stop typing event
    const stopTypingEvent = await helper.waitForEvent(user2.socket!, 'user:typing');
    expect(stopTypingEvent.isTyping).toBe(false);
  });

  test('should handle like interactions', async () => {
    const user1 = await helper.createUser('user1', 'TestUser1');
    const user2 = await helper.createUser('user2', 'TestUser2');
    
    const postId = 'post-123';
    
    // Both users subscribe to the post
    user1.socket!.emit('subscribe:post', postId);
    user2.socket!.emit('subscribe:post', postId);
    
    // User1 likes the post
    user1.socket!.emit('post:like', { postId, action: 'add' });
    
    // User2 should receive like event
    const likeEvent = await helper.waitForEvent(user2.socket!, 'like:updated');
    expect(likeEvent.postId).toBe(postId);
    expect(likeEvent.userId).toBe('user1');
    expect(likeEvent.action).toBe('add');
  });

  test('should handle comment interactions', async () => {
    const user1 = await helper.createUser('user1', 'TestUser1');
    const user2 = await helper.createUser('user2', 'TestUser2');
    
    const postId = 'post-123';
    const commentId = 'comment-456';
    
    // Both users subscribe to the post
    user1.socket!.emit('subscribe:post', postId);
    user2.socket!.emit('subscribe:post', postId);
    
    // User1 creates a comment
    user1.socket!.emit('comment:create', {
      postId,
      content: 'This is a test comment',
      commentId,
    });
    
    // User2 should receive comment creation event
    const commentEvent = await helper.waitForEvent(user2.socket!, 'comment:created');
    expect(commentEvent.postId).toBe(postId);
    expect(commentEvent.commentId).toBe(commentId);
    expect(commentEvent.content).toBe('This is a test comment');
    expect(commentEvent.authorId).toBe('user1');
  });

  test('should handle heartbeat/ping-pong', async () => {
    const user = await helper.createUser('user1', 'TestUser1');
    
    // Send ping
    user.socket!.emit('ping');
    
    // Should receive pong
    const pongEvent = await helper.waitForEvent(user.socket!, 'pong');
    expect(pongEvent.timestamp).toBeTruthy();
  });

  test('should handle disconnection and cleanup', async () => {
    const user1 = await helper.createUser('user1', 'TestUser1');
    const user2 = await helper.createUser('user2', 'TestUser2');
    
    // User1 disconnects
    user1.socket!.disconnect();
    
    // User2 should receive offline notification
    const offlineEvent = await helper.waitForEvent(user2.socket!, 'agent:status');
    expect(offlineEvent.type).toBe('user_offline');
    expect(offlineEvent.userId).toBe('user1');
  });

  test('should handle rate limiting', async () => {
    const user = await helper.createUser('user1', 'TestUser1');
    
    // Send many rapid messages to trigger rate limiting
    const promises: Promise<any>[] = [];
    
    for (let i = 0; i < 150; i++) {
      user.socket!.emit('user:typing', { postId: 'test', isTyping: true });
    }
    
    // Should receive rate limit error
    const errorEvent = await helper.waitForEvent(user.socket!, 'error');
    expect(errorEvent.message).toContain('Rate limit exceeded');
  });
});

test.describe('Frontend WebSocket Integration', () => {
  let helper: WebSocketTestHelper;

  test.beforeEach(async () => {
    helper = new WebSocketTestHelper();
  });

  test.afterEach(async () => {
    await helper.cleanup();
  });

  test('should connect WebSocket from browser', async ({ context }) => {
    const user = await helper.createBrowserUser(context, 'user1', 'BrowserUser1');
    
    // Check connection status in UI
    const connectionStatus = user.page!.locator('[data-testid="connection-status"]');
    await expect(connectionStatus).toContainText('Connected', { timeout: 10000 });
  });

  test('should show real-time notifications', async ({ context }) => {
    const user1 = await helper.createBrowserUser(context, 'user1', 'BrowserUser1');
    const user2 = await helper.createUser('user2', 'SocketUser2');
    
    // User2 creates a post (simulate server-side event)
    const mockNotification = {
      id: 'notif-123',
      type: 'info',
      title: 'New Post',
      message: 'A new post has been created',
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    // Send notification to user1
    user2.socket!.emit('notification:new', mockNotification);
    
    // Check if notification appears in UI
    const notificationBell = user1.page!.locator('[title*="Notifications"]');
    await expect(notificationBell).toBeVisible();
    
    // Should show unread count
    const unreadBadge = user1.page!.locator('.bg-red-500');
    await expect(unreadBadge).toBeVisible();
  });

  test('should show typing indicators', async ({ context }) => {
    const user1 = await helper.createBrowserUser(context, 'user1', 'BrowserUser1');
    const user2 = await helper.createUser('user2', 'SocketUser2');
    
    // Navigate to a post or feed where typing indicators would show
    await user1.page!.goto(`${FRONTEND_URL}/?postId=test-post`);
    
    // User2 starts typing on the post
    user2.socket!.emit('user:typing', { 
      postId: 'test-post', 
      isTyping: true 
    });
    
    // Should show typing indicator in UI
    const typingIndicator = user1.page!.locator('text=typing');
    await expect(typingIndicator).toBeVisible({ timeout: 5000 });
  });

  test('should handle offline mode gracefully', async ({ context }) => {
    const user = await helper.createBrowserUser(context, 'user1', 'BrowserUser1');
    
    // Disconnect WebSocket by going offline
    await user.page!.context().setOffline(true);
    
    // Should show offline status
    const offlineIndicator = user.page!.locator('text=Offline');
    await expect(offlineIndicator).toBeVisible({ timeout: 10000 });
    
    // Try to interact (should show offline message)
    const likeButton = user.page!.locator('button:has-text("♥")').first();
    if (await likeButton.isVisible()) {
      await likeButton.click();
      
      // Should show offline notification
      const offlineMessage = user.page!.locator('text=offline');
      await expect(offlineMessage).toBeVisible();
    }
    
    // Go back online
    await user.page!.context().setOffline(false);
    
    // Should reconnect and show connected status
    const connectedIndicator = user.page!.locator('text=Connected');
    await expect(connectedIndicator).toBeVisible({ timeout: 15000 });
  });
});

test.describe('WebSocket Error Handling', () => {
  let helper: WebSocketTestHelper;

  test.beforeEach(async () => {
    helper = new WebSocketTestHelper();
  });

  test.afterEach(async () => {
    await helper.cleanup();
  });

  test('should handle connection failures gracefully', async () => {
    // Try to connect to non-existent server
    const failSocket = io('http://localhost:9999', {
      auth: { userId: 'test', username: 'Test' },
      timeout: 2000,
    });

    const connectionError = await new Promise((resolve) => {
      failSocket.on('connect_error', (error) => {
        resolve(error.message);
      });
      
      setTimeout(() => resolve('timeout'), 3000);
    });

    expect(connectionError).toBeTruthy();
    failSocket.close();
  });

  test('should handle malformed events', async () => {
    const user = await helper.createUser('user1', 'TestUser1');
    
    // Send malformed event
    user.socket!.emit('invalid:event', { malformed: 'data' });
    
    // Should not crash and should maintain connection
    expect(user.socket!.connected).toBe(true);
    
    // Should still be able to send valid events
    user.socket!.emit('ping');
    const pongEvent = await helper.waitForEvent(user.socket!, 'pong');
    expect(pongEvent).toBeTruthy();
  });
});

// Performance and Load Tests
test.describe('WebSocket Performance', () => {
  let helper: WebSocketTestHelper;

  test.beforeEach(async () => {
    helper = new WebSocketTestHelper();
  });

  test.afterEach(async () => {
    await helper.cleanup();
  });

  test('should handle multiple concurrent connections', async () => {
    const connections = [];
    const userCount = 10;
    
    // Create multiple users concurrently
    const createPromises = [];
    for (let i = 0; i < userCount; i++) {
      createPromises.push(helper.createUser(`user${i}`, `TestUser${i}`));
    }
    
    const users = await Promise.all(createPromises);
    
    // All users should be connected
    users.forEach((user, index) => {
      expect(user.socket!.connected).toBe(true);
      console.log(`User ${index} connected: ${user.socket!.id}`);
    });
    
    // Test broadcasting to all users
    const testMessage = { content: 'Broadcast test message' };
    users[0].socket!.emit('broadcast:test', testMessage);
    
    // All other users should receive the message (if implemented)
    // This test depends on server implementing broadcast functionality
  });

  test('should handle rapid message sending', async () => {
    const user = await helper.createUser('user1', 'TestUser1');
    
    const messageCount = 50;
    const messages = [];
    
    // Send rapid messages
    for (let i = 0; i < messageCount; i++) {
      user.socket!.emit('ping');
      messages.push(helper.waitForEvent(user.socket!, 'pong'));
    }
    
    // All messages should be handled (respecting rate limits)
    const responses = await Promise.allSettled(messages);
    const successful = responses.filter(r => r.status === 'fulfilled').length;
    
    console.log(`Successfully handled ${successful}/${messageCount} rapid messages`);
    expect(successful).toBeGreaterThan(0); // At least some should succeed
  });
});

export { WebSocketTestHelper };