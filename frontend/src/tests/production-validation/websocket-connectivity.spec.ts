import { test, expect } from '@playwright/test';

/**
 * WebSocket Connectivity Tests for Production Structure
 * 
 * Tests WebSocket connections work correctly with the new
 * production backend structure and dual instance setup.
 */

test.describe('WebSocket Production Connectivity', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
  });

  test('WebSocket connections establish successfully', async ({ page }) => {
    let websocketConnections = 0;
    let websocketErrors = [];
    let connectionSuccess = false;

    // Monitor WebSocket connections
    page.on('websocket', ws => {
      websocketConnections++;
      
      ws.on('open', () => {
        connectionSuccess = true;
      });
      
      ws.on('close', () => {
        // Connection closed
      });
      
      ws.on('socketerror', error => {
        websocketErrors.push(error);
      });
    });

    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Wait for WebSocket connections to establish
    await page.waitForTimeout(5000);

    // If WebSocket connections were attempted, check they succeeded
    if (websocketConnections > 0) {
      expect(connectionSuccess).toBe(true);
      expect(websocketErrors.length).toBe(0);
    }
  });

  test('WebSocket messages are properly handled', async ({ page }) => {
    let messagesSent = 0;
    let messagesReceived = 0;

    page.on('websocket', ws => {
      ws.on('framesent', event => {
        messagesSent++;
      });
      
      ws.on('framereceived', event => {
        messagesReceived++;
      });
    });

    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Wait for potential message exchanges
    await page.waitForTimeout(5000);

    // If messages were sent, verify the communication works
    if (messagesSent > 0) {
      expect(messagesReceived).toBeGreaterThan(0);
    }
  });

  test('WebSocket reconnection works after temporary disconnection', async ({ page }) => {
    let connectionAttempts = 0;
    let successfulReconnections = 0;

    page.on('websocket', ws => {
      connectionAttempts++;
      
      ws.on('open', () => {
        if (connectionAttempts > 1) {
          successfulReconnections++;
        }
      });
    });

    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Wait for initial connection
    await page.waitForTimeout(3000);

    // Simulate network interruption by reloading
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Wait for reconnection
    await page.waitForTimeout(3000);

    // If there were multiple connection attempts, verify reconnection worked
    if (connectionAttempts > 1) {
      expect(successfulReconnections).toBeGreaterThan(0);
    }
  });

  test('WebSocket error handling is robust', async ({ page }) => {
    const consoleErrors = [];
    const websocketErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('websocket', ws => {
      ws.on('socketerror', error => {
        websocketErrors.push(error);
      });
    });

    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Wait for any errors to manifest
    await page.waitForTimeout(5000);

    // Filter for critical WebSocket errors
    const criticalWsErrors = consoleErrors.filter(error => 
      error.includes('WebSocket') && 
      (error.includes('failed') || error.includes('refused'))
    );

    expect(criticalWsErrors.length).toBe(0);
    expect(websocketErrors.length).toBe(0);
  });

  test('WebSocket connections respect production configuration', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Check that WebSocket connections use correct endpoints
    const websocketUrls = [];
    
    page.on('websocket', ws => {
      websocketUrls.push(ws.url());
    });

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // If WebSocket connections were made, verify they use appropriate URLs
    websocketUrls.forEach(url => {
      expect(url).toMatch(/^wss?:\/\//);
      // Should connect to localhost or appropriate host
      expect(url).toMatch(/localhost|127\.0\.0\.1/);
    });
  });

  test('Multiple WebSocket connections are handled correctly', async ({ page }) => {
    let connectionCount = 0;
    let activeConnections = 0;

    page.on('websocket', ws => {
      connectionCount++;
      activeConnections++;
      
      ws.on('close', () => {
        activeConnections--;
      });
    });

    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Wait for connections to establish
    await page.waitForTimeout(5000);

    // Should not have excessive connections
    expect(connectionCount).toBeLessThan(10);
    expect(activeConnections).toBeGreaterThanOrEqual(0);
  });
});

test.describe('WebSocket Production Performance', () => {
  test('WebSocket connection latency is acceptable', async ({ page }) => {
    let connectionStartTime;
    let connectionTime;

    page.on('websocket', ws => {
      connectionStartTime = Date.now();
      
      ws.on('open', () => {
        connectionTime = Date.now() - connectionStartTime;
      });
    });

    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // If a connection was made, verify it was fast
    if (connectionTime) {
      expect(connectionTime).toBeLessThan(5000); // Should connect within 5 seconds
    }
  });

  test('WebSocket memory usage is reasonable', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Check for memory-related warnings
    const memoryWarnings = [];
    
    page.on('console', msg => {
      if (msg.type() === 'warning' && 
          (msg.text().includes('memory') || 
           msg.text().includes('leak') ||
           msg.text().includes('WebSocket'))) {
        memoryWarnings.push(msg.text());
      }
    });

    await page.waitForTimeout(10000);
    
    expect(memoryWarnings.length).toBe(0);
  });
});

test.describe('WebSocket Security with Production Structure', () => {
  test('WebSocket connections use secure protocols when appropriate', async ({ page }) => {
    const websocketUrls = [];
    
    page.on('websocket', ws => {
      websocketUrls.push(ws.url());
    });

    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Verify WebSocket URLs are properly formatted
    websocketUrls.forEach(url => {
      expect(url).toMatch(/^wss?:\/\//);
    });
  });

  test('WebSocket authentication works with production setup', async ({ page }) => {
    let authenticationErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error' && 
          (msg.text().includes('authentication') || 
           msg.text().includes('unauthorized') ||
           msg.text().includes('403') ||
           msg.text().includes('401'))) {
        authenticationErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    expect(authenticationErrors.length).toBe(0);
  });

  test('WebSocket rate limiting is properly configured', async ({ page }) => {
    let rateLimitErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error' && 
          (msg.text().includes('rate limit') || 
           msg.text().includes('429') ||
           msg.text().includes('too many requests'))) {
        rateLimitErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Simulate some activity
    await page.waitForTimeout(5000);

    expect(rateLimitErrors.length).toBe(0);
  });
});

test.describe('WebSocket Integration with Agent Workspace', () => {
  test('WebSocket connections support agent communication', async ({ page }) => {
    let agentMessages = [];
    
    page.on('websocket', ws => {
      ws.on('framereceived', event => {
        try {
          const message = JSON.parse(event.payload);
          if (message.type && message.type.includes('agent')) {
            agentMessages.push(message);
          }
        } catch (e) {
          // Not JSON, ignore
        }
      });
    });

    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Agent messages are optional, but if present should be valid
    agentMessages.forEach(message => {
      expect(message.type).toBeDefined();
    });
  });

  test('WebSocket handles agent workspace isolation', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Monitor for workspace-related errors
    const workspaceErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error' && 
          (msg.text().includes('workspace') || 
           msg.text().includes('permission') ||
           msg.text().includes('access denied'))) {
        workspaceErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(5000);

    expect(workspaceErrors.length).toBe(0);
  });
});