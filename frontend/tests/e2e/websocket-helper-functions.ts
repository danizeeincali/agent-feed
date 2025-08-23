import { Page } from '@playwright/test';

/**
 * WebSocket E2E Testing Helper Functions
 * 
 * These utilities help validate WebSocket connections and states
 * in browser automation tests.
 */

export interface ConnectionDebugInfo {
  statusElements: Array<{
    element: string;
    className: string;
    textContent: string | null;
    dataset: string;
  }>;
  webSocketInstances: number | string;
  socketIO: { connected: boolean } | string;
  url: string;
  userAgent: string;
  timestamp: number;
}

export interface WebSocketValidationOptions {
  timeout?: number;
  checkInterval?: number;
  requireSocketIO?: boolean;
  requireNativeWebSocket?: boolean;
}

/**
 * Wait for WebSocket connection to establish with comprehensive checking
 */
export async function waitForWebSocketConnection(
  page: Page, 
  options: WebSocketValidationOptions = {}
): Promise<boolean> {
  const {
    timeout = 30000,
    checkInterval = 500,
    requireSocketIO = false,
    requireNativeWebSocket = false
  } = options;

  return await page.evaluate((opts) => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkConnection = () => {
        let hasConnection = false;
        let connectionTypes: string[] = [];
        
        // Check for connection status indicators in DOM
        const statusElements = document.querySelectorAll(
          '[data-testid="connection-status"], .connection-status, .live-activity-status'
        );
        
        for (const element of statusElements) {
          if (element.textContent?.toLowerCase().includes('connected')) {
            console.log('✅ DOM connection status shows connected');
            hasConnection = true;
            connectionTypes.push('DOM-status');
          }
        }
        
        // Check for native WebSocket instances
        if ((window as any).webSocketInstances) {
          const activeConnections = (window as any).webSocketInstances.filter(
            (ws: WebSocket) => ws.readyState === WebSocket.OPEN
          );
          if (activeConnections.length > 0) {
            console.log(`✅ Found ${activeConnections.length} active WebSocket connections`);
            hasConnection = true;
            connectionTypes.push('native-websocket');
          }
        }
        
        // Check for Socket.IO connections
        if ((window as any).io && (window as any).socket) {
          const socket = (window as any).socket;
          if (socket.connected) {
            console.log('✅ Socket.IO connection active');
            hasConnection = true;
            connectionTypes.push('socket-io');
          }
        }
        
        // Check global WebSocket connections (fallback)
        if (!hasConnection) {
          const globalWSCheck = Array.from(document.querySelectorAll('*'))
            .some(el => el.textContent?.includes('Connected') && 
                       !el.textContent?.includes('Disconnected'));
          
          if (globalWSCheck) {
            console.log('✅ Found connection indicator in page content');
            hasConnection = true;
            connectionTypes.push('global-content');
          }
        }
        
        // Apply requirements
        if (opts.requireSocketIO && !connectionTypes.includes('socket-io')) {
          hasConnection = false;
        }
        
        if (opts.requireNativeWebSocket && !connectionTypes.includes('native-websocket')) {
          hasConnection = false;
        }
        
        if (hasConnection) {
          console.log(`✅ WebSocket connection validated via: ${connectionTypes.join(', ')}`);
          resolve(true);
          return;
        }
        
        // Timeout check
        if (Date.now() - startTime > opts.timeout) {
          console.log(`❌ WebSocket connection check timeout after ${opts.timeout}ms`);
          console.log('Available connection types checked:', connectionTypes);
          resolve(false);
          return;
        }
        
        setTimeout(checkConnection, opts.checkInterval);
      };
      
      checkConnection();
    });
  }, options);
}

/**
 * Capture comprehensive debug information about WebSocket state
 */
export async function captureWebSocketDebugInfo(
  page: Page, 
  testName: string
): Promise<ConnectionDebugInfo> {
  console.log(`🔍 Capturing WebSocket debug info for: ${testName}`);
  
  // Take screenshot
  await page.screenshot({ 
    path: `tests/screenshots/${testName}-debug.png`, 
    fullPage: true 
  });
  
  // Get detailed connection status
  const debugInfo = await page.evaluate(() => {
    const statusElements = document.querySelectorAll(
      '[data-testid="connection-status"], .connection-status, .live-activity-status, *[class*="connection"], *[class*="status"]'
    );
    
    const statuses = Array.from(statusElements).map(el => ({
      element: el.tagName,
      className: el.className,
      textContent: el.textContent,
      dataset: el.getAttribute('data-testid') || 'no-testid'
    }));
    
    return {
      statusElements: statuses,
      webSocketInstances: (window as any).webSocketInstances ? 
        (window as any).webSocketInstances.length : 'Not found',
      socketIO: (window as any).socket ? 
        { connected: (window as any).socket.connected } : 'Not found',
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    };
  });
  
  console.log(`Debug Info for ${testName}:`, JSON.stringify(debugInfo, null, 2));
  return debugInfo;
}

/**
 * Test WebSocket message sending/receiving
 */
export async function testWebSocketMessaging(
  page: Page,
  testMessage: string = 'E2E test message'
): Promise<{sent: boolean, received: boolean, messages: string[]}> {
  console.log('📡 Testing WebSocket messaging capabilities');
  
  const messagesReceived: string[] = [];
  
  // Monitor WebSocket messages
  page.on('websocket', ws => {
    ws.on('framereceived', event => {
      messagesReceived.push(event.payload);
    });
  });
  
  // Try to send a message
  const messageSent = await page.evaluate((message) => {
    // Try Socket.IO first
    if ((window as any).socket && (window as any).socket.connected) {
      (window as any).socket.emit('test-message', { text: message });
      return true;
    }
    
    // Try native WebSocket
    if ((window as any).webSocketInstances) {
      const activeWS = (window as any).webSocketInstances.find(
        (ws: WebSocket) => ws.readyState === WebSocket.OPEN
      );
      
      if (activeWS) {
        activeWS.send(JSON.stringify({ type: 'test-message', text: message }));
        return true;
      }
    }
    
    return false;
  }, testMessage);
  
  // Wait for response
  await page.waitForTimeout(3000);
  
  const messageReceived = messagesReceived.some(msg => 
    msg.includes(testMessage) || msg.includes('test-message')
  );
  
  return {
    sent: messageSent,
    received: messageReceived,
    messages: messagesReceived
  };
}

/**
 * Force disconnect WebSocket connections for resilience testing
 */
export async function forceDisconnectWebSocket(page: Page): Promise<void> {
  console.log('🔌 Forcing WebSocket disconnection for resilience test');
  
  await page.evaluate(() => {
    // Close all native WebSocket connections
    if ((window as any).webSocketInstances) {
      (window as any).webSocketInstances.forEach((ws: WebSocket) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'E2E test forced disconnection');
        }
      });
    }
    
    // Disconnect Socket.IO
    if ((window as any).socket) {
      (window as any).socket.disconnect();
    }
    
    // Clear connection-related storage
    localStorage.removeItem('websocket-connection-state');
    sessionStorage.removeItem('socket-connection');
  });
}

/**
 * Check for loading/spinner states
 */
export async function checkForPersistentLoaders(
  page: Page,
  timeout: number = 10000
): Promise<Array<{selector: string, text: string | null, className: string | null}>> {
  const loadingSelectors = [
    '.loading',
    '.spinner',
    '.loading-spinner',
    '[data-testid="loading"]',
    '[data-testid="spinner"]',
    'text="Loading..."',
    'text="Connecting..."',
    'text="Launching..."',
    '.animate-spin',
    '*[class*="loading"]',
    '*[class*="spinner"]'
  ];
  
  // Wait for the specified timeout
  await page.waitForTimeout(timeout);
  
  const persistentLoaders = [];
  
  for (const selector of loadingSelectors) {
    try {
      const elements = page.locator(selector);
      const count = await elements.count();
      
      for (let i = 0; i < count; i++) {
        const element = elements.nth(i);
        if (await element.isVisible()) {
          persistentLoaders.push({
            selector,
            text: await element.textContent(),
            className: await element.getAttribute('class')
          });
        }
      }
    } catch (e) {
      // Continue checking other selectors
    }
  }
  
  return persistentLoaders;
}

/**
 * Validate connection status text
 */
export async function validateConnectionStatusText(page: Page): Promise<{
  statusText: string;
  isConnected: boolean;
  isDisconnected: boolean;
  element: string | null;
}> {
  const connectionStatusSelectors = [
    '[data-testid="connection-status"]',
    '.connection-status',
    '.live-activity-status',
    'text="Live Activity Connection Status"',
    '*:has-text("Connection Status")',
    '*:has-text("Connected")',
    '*:has-text("Disconnected")'
  ];
  
  for (const selector of connectionStatusSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 5000 })) {
        const statusText = await element.textContent() || '';
        
        return {
          statusText,
          isConnected: statusText.toLowerCase().includes('connected') && 
                      !statusText.toLowerCase().includes('disconnected'),
          isDisconnected: statusText.toLowerCase().includes('disconnected'),
          element: selector
        };
      }
    } catch (e) {
      continue;
    }
  }
  
  // Fallback: check entire page content
  const pageText = await page.textContent('body') || '';
  const isConnected = pageText.includes('Connected') && !pageText.includes('Disconnected');
  const isDisconnected = pageText.includes('Disconnected');
  
  return {
    statusText: isConnected ? 'Connected (page content)' : 
               isDisconnected ? 'Disconnected (page content)' : 'Unknown',
    isConnected,
    isDisconnected,
    element: null
  };
}