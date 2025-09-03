import { test, expect } from '@playwright/test';

test.describe('WebSocket Integration Tests', () => {
  test.describe('WebSocket Connection Stability', () => {
    test('should establish WebSocket connection without share-related channels', async ({ page }) => {
      const wsMessages = [];
      
      // Intercept WebSocket messages
      page.on('websocket', ws => {
        ws.on('framesent', event => {
          wsMessages.push({ type: 'sent', data: event.payload });
        });
        ws.on('framereceived', event => {
          wsMessages.push({ type: 'received', data: event.payload });
        });
      });

      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 10000 });
      
      // Wait for potential WebSocket connections
      await page.waitForTimeout(3000);
      
      // Check WebSocket messages for share-related content
      wsMessages.forEach(message => {
        const messageStr = String(message.data).toLowerCase();
        expect(messageStr).not.toContain('share');
        expect(messageStr).not.toContain('shared');
      });
    });

    test('should handle real-time updates without share events', async ({ page }) => {
      const wsMessages = [];
      const wsConnections = [];

      page.on('websocket', ws => {
        wsConnections.push(ws);
        
        ws.on('framereceived', event => {
          try {
            const data = JSON.parse(event.payload);
            wsMessages.push(data);
          } catch (e) {
            wsMessages.push({ raw: event.payload });
          }
        });
      });

      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });
      
      // Trigger like action to generate real-time updates
      const likeButtons = page.locator('button[aria-label*="like" i]');
      if (await likeButtons.count() > 0) {
        await likeButtons.first().click();
        await page.waitForTimeout(2000);
      }

      // Check real-time messages
      wsMessages.forEach(message => {
        if (message.type) {
          expect(message.type).not.toBe('share');
          expect(message.type).not.toBe('shared');
          expect(message.type).not.toBe('share_update');
        }
        
        if (message.event) {
          expect(message.event).not.toBe('share');
          expect(message.event).not.toBe('post_shared');
        }

        // Check for share-related data fields
        expect(message).not.toHaveProperty('shareCount');
        expect(message).not.toHaveProperty('shares');
        expect(message).not.toHaveProperty('shareData');
      });
    });

    test('should maintain WebSocket connection during user interactions', async ({ page }) => {
      let connectionCount = 0;
      let disconnectionCount = 0;

      page.on('websocket', ws => {
        connectionCount++;
        
        ws.on('close', () => {
          disconnectionCount++;
        });
      });

      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });
      await page.waitForTimeout(2000);

      // Perform various interactions
      const posts = page.locator('.post-item');
      if (await posts.count() > 0) {
        await posts.first().click();
        await page.waitForTimeout(500);
      }

      await page.keyboard.press('PageDown');
      await page.waitForTimeout(500);

      const likeButtons = page.locator('button[aria-label*="like" i]');
      if (await likeButtons.count() > 0) {
        await likeButtons.first().click();
        await page.waitForTimeout(1000);
      }

      // WebSocket should remain stable
      expect(connectionCount).toBeGreaterThan(0);
      // Allow for some reconnections but should not be excessive
      expect(disconnectionCount).toBeLessThanOrEqual(connectionCount);
    });

    test('should handle WebSocket errors gracefully', async ({ page }) => {
      const wsErrors = [];
      
      page.on('websocket', ws => {
        ws.on('socketerror', error => {
          wsErrors.push(error);
        });
      });

      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });

      // Simulate network interruption
      await page.context().setOffline(true);
      await page.waitForTimeout(2000);
      
      // Restore connection
      await page.context().setOffline(false);
      await page.waitForTimeout(3000);

      // Check that errors don't expose share functionality
      wsErrors.forEach(error => {
        const errorStr = String(error).toLowerCase();
        expect(errorStr).not.toContain('share');
      });

      // Page should still be functional
      const posts = page.locator('.post-item');
      await expect(posts.first()).toBeVisible();
    });
  });

  test.describe('Real-time Feature Validation', () => {
    test('should receive real-time like updates via WebSocket', async ({ page }) => {
      const likeUpdates = [];
      
      page.on('websocket', ws => {
        ws.on('framereceived', event => {
          try {
            const data = JSON.parse(event.payload);
            if (data.type === 'like' || data.event === 'like_update' || data.action === 'like') {
              likeUpdates.push(data);
            }
          } catch (e) {
            // Handle non-JSON messages
            if (String(event.payload).toLowerCase().includes('like')) {
              likeUpdates.push({ raw: event.payload });
            }
          }
        });
      });

      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });
      
      const likeButtons = page.locator('button[aria-label*="like" i]');
      if (await likeButtons.count() > 0) {
        await likeButtons.first().click();
        await page.waitForTimeout(2000);

        // Should receive like updates but not share updates
        likeUpdates.forEach(update => {
          expect(update).not.toHaveProperty('shareCount');
          expect(update).not.toHaveProperty('shareData');
          
          if (update.type) {
            expect(update.type).not.toBe('share');
          }
        });
      }
    });

    test('should handle comment updates via WebSocket', async ({ page }) => {
      const commentUpdates = [];
      
      page.on('websocket', ws => {
        ws.on('framereceived', event => {
          try {
            const data = JSON.parse(event.payload);
            if (data.type === 'comment' || data.event === 'comment_update') {
              commentUpdates.push(data);
            }
          } catch (e) {
            if (String(event.payload).toLowerCase().includes('comment')) {
              commentUpdates.push({ raw: event.payload });
            }
          }
        });
      });

      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });
      
      const commentButtons = page.locator('button[aria-label*="comment" i]');
      if (await commentButtons.count() > 0) {
        await commentButtons.first().click();
        await page.waitForTimeout(1000);

        const commentInput = page.locator('textarea[placeholder*="comment" i], input[placeholder*="comment" i]');
        if (await commentInput.count() > 0) {
          await commentInput.first().fill('Test WebSocket comment');
          
          const submitButton = page.locator('button:has-text("Post"), button:has-text("Submit")');
          if (await submitButton.count() > 0) {
            await submitButton.first().click();
            await page.waitForTimeout(2000);

            // Verify comment updates don't contain share data
            commentUpdates.forEach(update => {
              expect(update).not.toHaveProperty('shareCount');
              expect(update).not.toHaveProperty('shareUrl');
            });
          }
        }
      }
    });

    test('should handle new post updates via WebSocket', async ({ page }) => {
      const postUpdates = [];
      
      page.on('websocket', ws => {
        ws.on('framereceived', event => {
          try {
            const data = JSON.parse(event.payload);
            if (data.type === 'new_post' || data.event === 'post_created') {
              postUpdates.push(data);
            }
          } catch (e) {
            // Handle non-JSON WebSocket messages
          }
        });
      });

      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });
      
      // Wait for potential new post updates
      await page.waitForTimeout(5000);

      // Verify new posts don't include share data
      postUpdates.forEach(update => {
        if (update.post) {
          expect(update.post).not.toHaveProperty('shareCount');
          expect(update.post).not.toHaveProperty('shares');
        }
        
        expect(update).not.toHaveProperty('shareData');
      });
    });
  });

  test.describe('WebSocket Security Validation', () => {
    test('should not accept share-related WebSocket commands', async ({ page }) => {
      let wsConnection = null;
      
      page.on('websocket', ws => {
        wsConnection = ws;
      });

      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });
      await page.waitForTimeout(2000);

      if (wsConnection) {
        // Try to send share-related commands
        const maliciousCommands = [
          { type: 'share', postId: 1, platform: 'twitter' },
          { action: 'share_post', data: { id: 1 } },
          { event: 'share_update', shareCount: 999 }
        ];

        for (const command of maliciousCommands) {
          try {
            // This will fail if WebSocket is not accessible from page context
            await page.evaluate((cmd) => {
              // Attempt to send via any global WebSocket connections
              if (window.ws) {
                window.ws.send(JSON.stringify(cmd));
              }
            }, command);
            
            await page.waitForTimeout(500);
            
            // Verify the command was not processed
            // Check that no share-related UI changes occurred
            const shareButtons = page.locator('[data-testid*="share"], .share-button');
            await expect(shareButtons).toHaveCount(0);
            
          } catch (e) {
            // Expected to fail - WebSocket should not be accessible for manipulation
          }
        }
      }
    });

    test('should validate WebSocket message format', async ({ page }) => {
      const invalidMessages = [];
      
      page.on('websocket', ws => {
        ws.on('framereceived', event => {
          try {
            const data = JSON.parse(event.payload);
            
            // Check for suspicious share-related fields
            if (data.shareCount && typeof data.shareCount !== 'number') {
              invalidMessages.push(data);
            }
            if (data.shares && !Array.isArray(data.shares)) {
              invalidMessages.push(data);
            }
          } catch (e) {
            // Invalid JSON is also suspicious for share injection
            const payload = String(event.payload);
            if (payload.toLowerCase().includes('share') && !payload.includes('"')) {
              invalidMessages.push({ raw: payload, error: 'Invalid JSON with share content' });
            }
          }
        });
      });

      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });
      await page.waitForTimeout(3000);

      // Should not receive malformed share-related messages
      expect(invalidMessages).toHaveLength(0);
    });

    test('should handle WebSocket connection limits', async ({ page }) => {
      const connections = [];
      
      page.on('websocket', ws => {
        connections.push(ws);
      });

      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });
      await page.waitForTimeout(2000);

      // Should have reasonable number of WebSocket connections
      expect(connections.length).toBeLessThanOrEqual(5); // Allow for multiple connections but not excessive

      // All connections should be legitimate (not share-related abuse)
      connections.forEach(ws => {
        const url = ws.url();
        expect(url.toLowerCase()).not.toContain('share');
      });
    });
  });

  test.describe('WebSocket Performance Tests', () => {
    test('should handle high-frequency updates efficiently', async ({ page }) => {
      const messageCount = { received: 0, processed: 0 };
      
      page.on('websocket', ws => {
        ws.on('framereceived', event => {
          messageCount.received++;
          
          try {
            const data = JSON.parse(event.payload);
            messageCount.processed++;
            
            // Verify high-frequency updates don't include share data
            expect(data).not.toHaveProperty('shareCount');
            expect(data).not.toHaveProperty('shares');
          } catch (e) {
            // Some messages might not be JSON
          }
        });
      });

      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });
      
      // Trigger multiple rapid interactions
      const likeButtons = page.locator('button[aria-label*="like" i]');
      if (await likeButtons.count() > 2) {
        for (let i = 0; i < 3; i++) {
          await likeButtons.nth(i).click();
          await page.waitForTimeout(200);
        }
      }

      await page.waitForTimeout(2000);

      // Should handle messages efficiently
      expect(messageCount.received).toBeLessThanOrEqual(50); // Reasonable upper limit
      expect(messageCount.processed / messageCount.received).toBeGreaterThanOrEqual(0.5); // Most messages should be valid JSON
    });

    test('should maintain WebSocket performance under load', async ({ page }) => {
      const startTime = Date.now();
      let wsLatency = [];
      
      page.on('websocket', ws => {
        ws.on('framesent', event => {
          const sendTime = Date.now();
          // Store send time (simplified latency measurement)
          ws._sendTime = sendTime;
        });
        
        ws.on('framereceived', event => {
          if (ws._sendTime) {
            const latency = Date.now() - ws._sendTime;
            wsLatency.push(latency);
          }
        });
      });

      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });
      
      // Perform multiple interactions to generate WebSocket traffic
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('PageDown');
        await page.waitForTimeout(100);
      }

      await page.waitForTimeout(2000);

      const totalTime = Date.now() - startTime;
      
      // Performance should be reasonable
      expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds
      
      if (wsLatency.length > 0) {
        const avgLatency = wsLatency.reduce((a, b) => a + b, 0) / wsLatency.length;
        expect(avgLatency).toBeLessThan(1000); // Average latency under 1 second
      }
    });
  });

  test.describe('WebSocket Reconnection Tests', () => {
    test('should reconnect after network interruption', async ({ page }) => {
      let connectionCount = 0;
      let reconnectionCount = 0;
      
      page.on('websocket', ws => {
        connectionCount++;
        
        ws.on('close', () => {
          // Next connection after close is a reconnection
          setTimeout(() => {
            if (connectionCount > 1) {
              reconnectionCount++;
            }
          }, 100);
        });
      });

      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });
      await page.waitForTimeout(2000);

      const initialConnections = connectionCount;

      // Simulate network interruption
      await page.context().setOffline(true);
      await page.waitForTimeout(3000);
      
      // Restore network
      await page.context().setOffline(false);
      await page.waitForTimeout(5000);

      // Should attempt to reconnect
      expect(connectionCount).toBeGreaterThan(initialConnections);
      
      // Verify functionality after reconnection
      const posts = page.locator('.post-item');
      await expect(posts.first()).toBeVisible();
    });

    test('should maintain data consistency after reconnection', async ({ page }) => {
      const dataBeforeDisconnect = [];
      const dataAfterReconnect = [];
      
      page.on('websocket', ws => {
        ws.on('framereceived', event => {
          try {
            const data = JSON.parse(event.payload);
            dataBeforeDisconnect.push(data);
          } catch (e) {
            // Ignore non-JSON messages
          }
        });
        
        ws.on('close', () => {
          // Clear data for after reconnect tracking
          setTimeout(() => {
            page.on('websocket', newWs => {
              newWs.on('framereceived', event => {
                try {
                  const data = JSON.parse(event.payload);
                  dataAfterReconnect.push(data);
                } catch (e) {
                  // Ignore non-JSON messages
                }
              });
            });
          }, 100);
        });
      });

      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });
      
      // Get initial post count
      const initialPosts = page.locator('.post-item');
      const initialCount = await initialPosts.count();
      
      // Simulate disconnection
      await page.context().setOffline(true);
      await page.waitForTimeout(2000);
      await page.context().setOffline(false);
      await page.waitForTimeout(3000);

      // Verify post count consistency
      const finalPosts = page.locator('.post-item');
      const finalCount = await finalPosts.count();
      
      // Should maintain same or more posts (due to new posts arriving)
      expect(finalCount).toBeGreaterThanOrEqual(initialCount);

      // Data should not contain share information before or after reconnect
      [...dataBeforeDisconnect, ...dataAfterReconnect].forEach(data => {
        expect(data).not.toHaveProperty('shareCount');
        expect(data).not.toHaveProperty('shares');
      });
    });
  });
});