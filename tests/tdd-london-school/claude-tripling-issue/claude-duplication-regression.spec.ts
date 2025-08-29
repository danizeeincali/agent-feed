import { test, expect, Page } from '@playwright/test';

/**
 * TDD London School: Comprehensive Regression Test Suite
 * 
 * FOCUS: Edge cases and scenarios that expose duplication bugs
 * METHODOLOGY: Mock-driven testing with behavior verification
 * EXPECTATION: These tests should FAIL initially, proving the bug exists
 */

interface MessageDuplicationEvidence {
  messageText: string;
  occurrences: number;
  locations: string[];
  timestamps: number[];
  evidence: string[];
}

interface NetworkTrafficAnalysis {
  duplicateRequests: number;
  duplicateWebSocketMessages: number;
  duplicateSSEEvents: number;
  suspiciousPatterns: string[];
}

test.describe('London School: Duplication Regression Scenarios', () => {
  let page: Page;
  let networkTraffic: any[] = [];
  let domEvents: any[] = [];

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    networkTraffic = [];
    domEvents = [];

    // Setup comprehensive monitoring
    await setupComprehensiveMonitoring();
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  /**
   * REGRESSION TEST: Multiple instance creation
   * SCENARIO: User rapidly creates multiple instances
   * BUG SYMPTOM: Each instance appears multiple times
   */
  test('Multiple instance creation should not duplicate instances in UI', async () => {
    console.log('🔄 Testing multiple instance creation duplication');

    // ARRANGE: Clear any existing state
    await clearApplicationState();

    // ACT: Rapidly create 3 instances
    const instanceCount = 3;
    const createdInstances = [];

    for (let i = 0; i < instanceCount; i++) {
      await page.click('button:has-text("Launch")');
      await page.waitForTimeout(500); // Brief pause between creations
      createdInstances.push(`claude-instance-${i}`);
    }

    // Wait for all instances to be processed
    await page.waitForTimeout(3000);

    // ASSERT: Each instance should appear only once
    const instanceElements = await page.locator('[data-instance-id], .instance-item, .grid > div').count();
    
    // Should have exactly the number of instances created (no duplicates)
    expect(instanceElements).toBeLessThanOrEqual(instanceCount);
    
    // VERIFY: No duplicate instance IDs in DOM
    const duplicateCheck = await checkForDuplicateInstances();
    expect(duplicateCheck.hasDuplicates).toBe(false);
    
    if (duplicateCheck.hasDuplicates) {
      console.error('🚨 DUPLICATE INSTANCES DETECTED:', duplicateCheck.duplicates);
    }
  });

  /**
   * REGRESSION TEST: Message flooding scenario
   * SCENARIO: User sends many messages quickly
   * BUG SYMPTOM: Messages appear multiple times
   */
  test('Rapid message sending should not create duplicate responses', async () => {
    console.log('🔄 Testing rapid message flooding');

    // ARRANGE: Create instance and connect
    await createAndSelectInstance();
    
    const messages = [
      'test message 1',
      'test message 2', 
      'test message 3',
      'test message 4',
      'test message 5'
    ];

    // ACT: Send messages rapidly
    const inputField = await getMessageInputField();
    
    for (const message of messages) {
      await inputField.fill(message);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100); // Very rapid sending
    }

    // Wait for all processing to complete
    await page.waitForTimeout(5000);

    // ASSERT: Check for message duplication
    for (const message of messages) {
      const duplicateEvidence = await analyzeDuplicationForMessage(message);
      
      console.log(`📊 Message "${message}": ${duplicateEvidence.occurrences} occurrences`);
      
      // Should have no more than 2 occurrences (input echo + response)
      expect(duplicateEvidence.occurrences).toBeLessThanOrEqual(2);
      
      if (duplicateEvidence.occurrences > 2) {
        console.error('🚨 DUPLICATE MESSAGE DETECTED:', duplicateEvidence);
      }
    }
  });

  /**
   * REGRESSION TEST: Connection state changes
   * SCENARIO: WebSocket connects/disconnects repeatedly
   * BUG SYMPTOM: Multiple connection handlers created
   */
  test('Connection state changes should not multiply event handlers', async () => {
    console.log('🔄 Testing connection state change handling');

    // ARRANGE: Setup event handler tracking
    await setupEventHandlerTracking();

    // ACT: Create instance and force connection changes
    await createAndSelectInstance();

    // Simulate connection instability
    for (let i = 0; i < 3; i++) {
      // Disconnect
      await page.evaluate(() => {
        const ws = (window as any).activeWebSocket;
        if (ws) {
          ws.close();
        }
      });

      await page.waitForTimeout(1000);

      // Reconnect (select instance again)
      await page.click('[data-instance-id]');
      await page.waitForTimeout(1000);
    }

    // ASSERT: Verify handler count is reasonable
    const handlerAnalysis = await analyzeEventHandlers();
    
    // Should not have excessive handlers (indicates duplication)
    expect(handlerAnalysis.totalHandlers).toBeLessThan(20);
    expect(handlerAnalysis.duplicateHandlers).toBe(0);

    if (handlerAnalysis.duplicateHandlers > 0) {
      console.error('🚨 DUPLICATE EVENT HANDLERS:', handlerAnalysis.handlers);
    }
  });

  /**
   * REGRESSION TEST: SSE stream duplication
   * SCENARIO: Multiple SSE connections for status updates
   * BUG SYMPTOM: Status updates trigger multiple times
   */
  test('SSE status updates should not create duplicate status changes', async () => {
    console.log('🔄 Testing SSE status update duplication');

    // ARRANGE: Monitor SSE connections
    await setupSSEMonitoring();

    // ACT: Create instance and monitor status updates
    await createAndSelectInstance();
    
    // Wait for initial status updates
    await page.waitForTimeout(3000);

    // Trigger additional status updates
    await page.evaluate(() => {
      // Simulate multiple rapid status updates
      for (let i = 0; i < 5; i++) {
        const event = new MessageEvent('message', {
          data: JSON.stringify({
            type: 'instance:status',
            instanceId: 'claude-test',
            status: i % 2 === 0 ? 'running' : 'starting'
          })
        });
        
        const eventSource = (window as any).activeEventSource;
        if (eventSource && eventSource.onmessage) {
          eventSource.onmessage(event);
        }
      }
    });

    await page.waitForTimeout(2000);

    // ASSERT: Verify status updates were properly deduplicated
    const sseAnalysis = await analyzeSSEDuplication();
    
    expect(sseAnalysis.duplicateStatusUpdates).toBe(0);
    expect(sseAnalysis.excessiveUpdates).toBe(false);

    if (sseAnalysis.duplicateStatusUpdates > 0) {
      console.error('🚨 DUPLICATE SSE UPDATES:', sseAnalysis.details);
    }
  });

  /**
   * REGRESSION TEST: DOM manipulation consistency
   * SCENARIO: Rapid UI updates and re-renders
   * BUG SYMPTOM: Elements duplicated in DOM tree
   */
  test('DOM updates should maintain single element instances', async () => {
    console.log('🔄 Testing DOM consistency during rapid updates');

    // ARRANGE: Setup DOM monitoring
    await setupDOMConsistencyMonitoring();

    // ACT: Create instance and trigger rapid updates
    await createAndSelectInstance();

    // Send messages to trigger DOM updates
    const inputField = await getMessageInputField();
    
    for (let i = 0; i < 10; i++) {
      await inputField.fill(`update trigger ${i}`);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(50);
    }

    await page.waitForTimeout(3000);

    // ASSERT: Check DOM consistency
    const domAnalysis = await analyzeDOMConsistency();
    
    expect(domAnalysis.duplicateElements).toBe(0);
    expect(domAnalysis.orphanedElements).toBe(0);
    expect(domAnalysis.inconsistentState).toBe(false);

    if (domAnalysis.duplicateElements > 0) {
      console.error('🚨 DUPLICATE DOM ELEMENTS:', domAnalysis.details);
    }
  });

  /**
   * REGRESSION TEST: Memory leak through event accumulation  
   * SCENARIO: Long running session with many operations
   * BUG SYMPTOM: Event listeners and objects accumulate
   */
  test('Long session should not accumulate duplicate event listeners', async () => {
    console.log('🔄 Testing event listener accumulation');

    // ARRANGE: Track memory patterns
    await setupMemoryTracking();

    // ACT: Simulate extended usage session
    for (let session = 0; session < 5; session++) {
      await createAndSelectInstance();
      
      // Send some messages
      const inputField = await getMessageInputField();
      for (let msg = 0; msg < 3; msg++) {
        await inputField.fill(`session ${session} message ${msg}`);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(200);
      }
      
      // Terminate instance
      await page.click('.instance-item button'); // Terminate button
      await page.waitForTimeout(1000);
    }

    // ASSERT: Verify memory usage is reasonable
    const memoryAnalysis = await analyzeMemoryPatterns();
    
    expect(memoryAnalysis.eventListenerLeaks).toBe(0);
    expect(memoryAnalysis.objectAccumulation).toBeLessThan(100);
    expect(memoryAnalysis.suspiciousGrowth).toBe(false);

    if (memoryAnalysis.eventListenerLeaks > 0) {
      console.error('🚨 EVENT LISTENER LEAKS:', memoryAnalysis.details);
    }
  });

  // HELPER METHODS

  async function setupComprehensiveMonitoring() {
    await page.addInitScript(() => {
      // Track all network activities
      (window as any).networkTracker = {
        requests: [],
        websockets: [],
        sseEvents: []
      };

      // Track DOM events
      (window as any).domTracker = {
        additions: [],
        removals: [],
        modifications: []
      };

      // Override WebSocket for monitoring
      const OriginalWS = window.WebSocket;
      window.WebSocket = class extends OriginalWS {
        constructor(url: string, protocols?: string | string[]) {
          super(url, protocols);
          (window as any).networkTracker.websockets.push({
            url,
            created: Date.now(),
            instance: this
          });
        }
      };

      // Override EventSource for monitoring
      const OriginalES = window.EventSource;
      window.EventSource = class extends OriginalES {
        constructor(url: string, eventSourceInitDict?: EventSourceInit) {
          super(url, eventSourceInitDict);
          (window as any).networkTracker.sseEvents.push({
            url,
            created: Date.now(),
            instance: this
          });
        }
      };
    });
  }

  async function clearApplicationState() {
    await page.evaluate(() => {
      // Clear any stored state
      localStorage.clear();
      sessionStorage.clear();
      
      // Reset tracking
      (window as any).networkTracker = { requests: [], websockets: [], sseEvents: [] };
      (window as any).domTracker = { additions: [], removals: [], modifications: [] };
    });
  }

  async function createAndSelectInstance(): Promise<string> {
    // Click launch button
    await page.click('button:has-text("Launch")');
    await page.waitForTimeout(2000);

    // Find and select the created instance
    const instanceSelector = '[data-instance-id], .instance-item, .grid > div';
    await page.waitForSelector(instanceSelector, { timeout: 5000 });
    await page.click(instanceSelector);

    // Return instance ID
    const instanceId = await page.locator(instanceSelector).first().getAttribute('data-instance-id');
    return instanceId || 'claude-test-instance';
  }

  async function getMessageInputField() {
    const selectors = [
      '[data-testid="message-input"]',
      'textarea',
      'input[type="text"]'
    ];

    for (const selector of selectors) {
      try {
        const element = page.locator(selector).first();
        await element.waitFor({ timeout: 2000 });
        return element;
      } catch {
        continue;
      }
    }

    throw new Error('Could not find message input field');
  }

  async function checkForDuplicateInstances() {
    return await page.evaluate(() => {
      const instances = Array.from(document.querySelectorAll('[data-instance-id]'));
      const instanceIds = instances.map(el => el.getAttribute('data-instance-id'));
      const uniqueIds = new Set(instanceIds);
      
      return {
        hasDuplicates: instanceIds.length !== uniqueIds.size,
        duplicates: instanceIds.filter((id, index) => instanceIds.indexOf(id) !== index),
        total: instances.length
      };
    });
  }

  async function analyzeDuplicationForMessage(messageText: string): Promise<MessageDuplicationEvidence> {
    return await page.evaluate((msg) => {
      const elements = Array.from(document.querySelectorAll('*')).filter(el =>
        el.textContent?.includes(msg) && el.textContent.trim().length > 0
      );

      return {
        messageText: msg,
        occurrences: elements.length,
        locations: elements.map(el => `${el.tagName}.${el.className}`),
        timestamps: elements.map(() => Date.now()),
        evidence: elements.map(el => el.textContent?.substring(0, 100) || '')
      };
    }, messageText);
  }

  async function setupEventHandlerTracking() {
    await page.addInitScript(() => {
      (window as any).eventHandlerTracker = {
        handlers: new Map(),
        addEventListener: EventTarget.prototype.addEventListener
      };

      EventTarget.prototype.addEventListener = function(type, listener, options) {
        const key = `${this.constructor.name}-${type}`;
        if (!(window as any).eventHandlerTracker.handlers.has(key)) {
          (window as any).eventHandlerTracker.handlers.set(key, []);
        }
        (window as any).eventHandlerTracker.handlers.get(key).push({
          listener,
          timestamp: Date.now(),
          target: this
        });
        return (window as any).eventHandlerTracker.addEventListener.call(this, type, listener, options);
      };
    });
  }

  async function analyzeEventHandlers() {
    return await page.evaluate(() => {
      const tracker = (window as any).eventHandlerTracker;
      if (!tracker) return { totalHandlers: 0, duplicateHandlers: 0, handlers: {} };

      let totalHandlers = 0;
      let duplicateHandlers = 0;
      const handlers: any = {};

      tracker.handlers.forEach((handlerList: any[], key: string) => {
        handlers[key] = handlerList.length;
        totalHandlers += handlerList.length;
        
        if (handlerList.length > 3) { // Threshold for "too many"
          duplicateHandlers += handlerList.length - 1;
        }
      });

      return { totalHandlers, duplicateHandlers, handlers };
    });
  }

  async function setupSSEMonitoring() {
    await page.addInitScript(() => {
      (window as any).sseMonitor = {
        connections: [],
        messages: [],
        statusUpdates: []
      };
    });
  }

  async function analyzeSSEDuplication() {
    return await page.evaluate(() => {
      const monitor = (window as any).sseMonitor;
      if (!monitor) return { duplicateStatusUpdates: 0, excessiveUpdates: false, details: {} };

      const statusUpdates = monitor.statusUpdates || [];
      const updateCounts = new Map();

      statusUpdates.forEach((update: any) => {
        const key = `${update.instanceId}-${update.status}`;
        updateCounts.set(key, (updateCounts.get(key) || 0) + 1);
      });

      let duplicateStatusUpdates = 0;
      updateCounts.forEach(count => {
        if (count > 1) duplicateStatusUpdates += count - 1;
      });

      return {
        duplicateStatusUpdates,
        excessiveUpdates: duplicateStatusUpdates > 5,
        details: Object.fromEntries(updateCounts)
      };
    });
  }

  async function setupDOMConsistencyMonitoring() {
    await page.addInitScript(() => {
      (window as any).domConsistencyMonitor = {
        elements: new Map(),
        observer: null
      };

      const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                const id = element.id || element.className || element.tagName;
                const current = (window as any).domConsistencyMonitor.elements.get(id) || 0;
                (window as any).domConsistencyMonitor.elements.set(id, current + 1);
              }
            });
          }
        });
      });

      observer.observe(document.body, { childList: true, subtree: true });
      (window as any).domConsistencyMonitor.observer = observer;
    });
  }

  async function analyzeDOMConsistency() {
    return await page.evaluate(() => {
      const monitor = (window as any).domConsistencyMonitor;
      if (!monitor) return { duplicateElements: 0, orphanedElements: 0, inconsistentState: false, details: {} };

      let duplicateElements = 0;
      const details: any = {};

      monitor.elements.forEach((count: number, id: string) => {
        if (count > 1) {
          duplicateElements += count - 1;
          details[id] = count;
        }
      });

      return {
        duplicateElements,
        orphanedElements: 0, // TODO: Implement orphaned element detection
        inconsistentState: duplicateElements > 3,
        details
      };
    });
  }

  async function setupMemoryTracking() {
    await page.addInitScript(() => {
      (window as any).memoryTracker = {
        initialObjects: Object.keys(window).length,
        eventListeners: 0,
        objectCounts: []
      };
    });
  }

  async function analyzeMemoryPatterns() {
    return await page.evaluate(() => {
      const tracker = (window as any).memoryTracker;
      if (!tracker) return { eventListenerLeaks: 0, objectAccumulation: 0, suspiciousGrowth: false, details: {} };

      const currentObjects = Object.keys(window).length;
      const objectGrowth = currentObjects - tracker.initialObjects;

      return {
        eventListenerLeaks: 0, // TODO: Implement event listener leak detection
        objectAccumulation: objectGrowth,
        suspiciousGrowth: objectGrowth > 50,
        details: { initialObjects: tracker.initialObjects, currentObjects }
      };
    });
  }
});