import { test, expect, Page, BrowserContext } from '@playwright/test';
import type { MockedFunction } from 'playwright/test';

/**
 * TDD London School Test Suite: Claude Instance Duplication Bug
 * 
 * METHODOLOGY: Outside-In TDD with Mock-Driven Development
 * FOCUS: Testing object collaborations and behavior verification
 * 
 * BUG REPRODUCTION: Tests currently FAIL to demonstrate duplication issue
 * After fixing the code, these tests should PASS
 */

interface ClaudeInstanceContract {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  pid?: number;
  startTime?: Date;
}

interface WebSocketMockContract {
  send: MockedFunction<(data: string) => void>;
  close: MockedFunction<(code?: number, reason?: string) => void>;
  addEventListener: MockedFunction<(event: string, handler: Function) => void>;
  readyState: number;
  onopen?: Function;
  onmessage?: Function;
  onerror?: Function;
  onclose?: Function;
}

interface MessageDeduplicationContract {
  hasMessage: (messageId: string) => boolean;
  addMessage: (messageId: string) => void;
  clear: () => void;
  size: () => number;
}

interface ClaudeManagerContract {
  createInstance: MockedFunction<(command: string) => Promise<ClaudeInstanceContract>>;
  connectToTerminal: MockedFunction<(terminalId: string) => void>;
  sendInput: MockedFunction<(input: string) => void>;
  processOutput: MockedFunction<(data: any) => void>;
  deduplicationService: MessageDeduplicationContract;
}

test.describe('London School: Claude Instance Duplication Bug', () => {
  let page: Page;
  let context: BrowserContext;
  let mockWebSocket: WebSocketMockContract;
  let mockClaudeManager: ClaudeManagerContract;
  let mockDeduplicationService: MessageDeduplicationContract;
  let messageLog: Array<{ timestamp: number, type: string, data: any }>;

  test.beforeEach(async ({ page: testPage, context: testContext }) => {
    page = testPage;
    context = testContext;
    messageLog = [];

    // LONDON SCHOOL: Setup mocks before implementation details
    await setupMocksAndContracts();
    await setupBehaviorMonitoring();
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    // LONDON SCHOOL: Verify all mock interactions
    await verifyMockContracts();
  });

  /**
   * OUTSIDE-IN TEST: User creates instance and sends message
   * EXPECTATION: Single response, no duplication
   * CURRENT: SHOULD FAIL due to duplication bug
   */
  test('Should handle single message workflow without duplication', async () => {
    console.log('🧪 London School: Testing outside-in user workflow');

    // ARRANGE: Setup mock expectations (London School contracts)
    const expectedInstanceId = 'claude-test-001';
    const testMessage = 'hello world';
    
    // Define expected behavior contracts
    mockClaudeManager.createInstance.mockResolvedValue({
      id: expectedInstanceId,
      name: `Claude ${expectedInstanceId}`,
      status: 'running',
      pid: 12345,
      startTime: new Date()
    });

    mockDeduplicationService.hasMessage = jest.fn().mockReturnValue(false);
    mockDeduplicationService.addMessage = jest.fn();

    // ACT: Perform user workflow
    await performUserWorkflow(testMessage);

    // ASSERT: Verify collaborations (London School behavior verification)
    expect(mockClaudeManager.createInstance).toHaveBeenCalledOnce();
    expect(mockClaudeManager.connectToTerminal).toHaveBeenCalledWith(expectedInstanceId);
    expect(mockClaudeManager.sendInput).toHaveBeenCalledWith(testMessage + '\n');
    
    // CRITICAL: Verify message deduplication worked
    expect(mockDeduplicationService.addMessage).toHaveBeenCalledOnce();
    expect(mockClaudeManager.processOutput).toHaveBeenCalledTimes(1);
    
    // VERIFY: Only one message rendered in DOM
    const messageElements = await page.locator(`text="${testMessage}"`).count();
    expect(messageElements).toBe(1); // This should FAIL currently due to duplication
  });

  /**
   * MOCK-DRIVEN TEST: WebSocket message handling contract
   * FOCUS: Object interactions and message flow
   */
  test('Should coordinate WebSocket messages without duplication', async () => {
    console.log('🧪 London School: Testing WebSocket coordination contract');

    // ARRANGE: Setup WebSocket mock contract
    const instanceId = 'claude-ws-test';
    const messages = [
      { type: 'connect', terminalId: instanceId },
      { type: 'output', data: 'response 1', terminalId: instanceId, timestamp: Date.now() },
      { type: 'output', data: 'response 1', terminalId: instanceId, timestamp: Date.now() + 1 } // Duplicate
    ];

    // Define mock expectations
    mockWebSocket.send = jest.fn();
    mockDeduplicationService.hasMessage = jest.fn()
      .mockReturnValueOnce(false)  // First message: new
      .mockReturnValueOnce(true);  // Second message: duplicate

    // ACT: Simulate WebSocket message flow
    await simulateWebSocketFlow(instanceId, messages);

    // ASSERT: Verify deduplication contract
    expect(mockDeduplicationService.hasMessage).toHaveBeenCalledTimes(2);
    expect(mockDeduplicationService.addMessage).toHaveBeenCalledOnce(); // Only for first message
    
    // VERIFY: Only unique messages processed
    const uniqueProcessingCalls = mockClaudeManager.processOutput.mock.calls.filter(
      call => !call[0].isDuplicate
    );
    expect(uniqueProcessingCalls).toHaveLength(1); // Should FAIL if duplicates processed
  });

  /**
   * BEHAVIOR TEST: Message input component collaboration
   * LONDON SCHOOL: Focus on how components work together
   */
  test('Should coordinate message input without creating duplicates', async () => {
    console.log('🧪 London School: Testing message input collaboration');

    // ARRANGE: Setup component collaboration mocks
    const testInput = 'test command';
    const mockMessageHandler = jest.fn();
    const mockValidationService = jest.fn().mockReturnValue(true);

    // Create instance first
    await page.click('button:has-text("Launch")');
    await page.waitForSelector('[data-testid="message-input"]', { timeout: 5000 });

    // Define collaboration expectations
    await page.evaluate(() => {
      (window as any).mockCollaborationTracker = {
        inputEvents: [],
        sendEvents: [],
        processEvents: []
      };
    });

    // ACT: Type and send message
    const inputField = page.locator('[data-testid="message-input"], textarea, input[type="text"]').first();
    await inputField.fill(testInput);
    await page.keyboard.press('Enter');

    await page.waitForTimeout(1000); // Allow processing

    // ASSERT: Verify collaboration sequence
    const collaborationLog = await page.evaluate(() => (window as any).mockCollaborationTracker);
    
    // VERIFY: Single send event (no duplication in input handling)
    expect(collaborationLog.sendEvents.length).toBe(1); // Should FAIL if duplicated
    
    // VERIFY: Message appears only once in UI
    const messageCount = await page.locator(`text="${testInput}"`).count();
    expect(messageCount).toBeLessThanOrEqual(1); // Should FAIL if duplicated
  });

  /**
   * CONTRACT TEST: Instance lifecycle management
   * LONDON SCHOOL: Test object responsibilities
   */
  test('Should manage instance lifecycle without state duplication', async () => {
    console.log('🧪 London School: Testing instance lifecycle contracts');

    // ARRANGE: Setup lifecycle contract mocks
    const instanceData = {
      id: 'claude-lifecycle-test',
      name: 'Test Instance',
      status: 'starting' as const
    };

    mockClaudeManager.createInstance.mockResolvedValue({
      ...instanceData,
      status: 'running',
      pid: 54321,
      startTime: new Date()
    });

    // Setup state tracking mock
    const stateTracker = jest.fn();
    
    // ACT: Create and manage instance
    await page.click('button:has-text("Launch")');
    await page.waitForTimeout(2000);

    // Select instance from list
    await page.click(`[data-instance-id="${instanceData.id}"]`);
    
    // ASSERT: Verify instance appears only once in UI
    const instanceElements = await page.locator(`[data-instance-id="${instanceData.id}"]`).count();
    expect(instanceElements).toBe(1); // Should FAIL if duplicated

    // VERIFY: State management calls
    expect(mockClaudeManager.createInstance).toHaveBeenCalledOnce();
    expect(mockClaudeManager.connectToTerminal).toHaveBeenCalledWith(instanceData.id);
  });

  /**
   * INTERACTION TEST: Multiple rapid user actions
   * LONDON SCHOOL: Test system behavior under pressure
   */
  test('Should handle rapid user interactions without duplicating responses', async () => {
    console.log('🧪 London School: Testing rapid interaction handling');

    // ARRANGE: Setup rapid interaction scenario
    const messages = ['msg1', 'msg2', 'msg3'];
    const expectedResponses = messages.length;

    // Create instance
    await page.click('button:has-text("Launch")');
    await page.waitForTimeout(1000);

    const inputField = page.locator('[data-testid="message-input"], textarea, input[type="text"]').first();

    // ACT: Send messages rapidly
    for (const msg of messages) {
      await inputField.fill(msg);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100); // Minimal delay
    }

    await page.waitForTimeout(2000); // Allow all processing

    // ASSERT: Verify correct number of responses
    const totalMessages = await page.locator('[data-testid="chat-message"], .message, .terminal-line').count();
    
    // Should have exactly the number of messages sent (no duplicates)
    expect(totalMessages).toBeLessThanOrEqual(expectedResponses * 2); // Input + response
    
    // VERIFY: Each message appears only once
    for (const msg of messages) {
      const msgCount = await page.locator(`text="${msg}"`).count();
      expect(msgCount).toBeLessThanOrEqual(2); // Should FAIL if >2 (duplicated)
    }
  });

  // HELPER METHODS (London School: Focus on behavior setup)

  async function setupMocksAndContracts() {
    // Setup WebSocket mock contract
    mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      readyState: WebSocket.OPEN
    };

    // Setup deduplication service mock
    mockDeduplicationService = {
      hasMessage: jest.fn(),
      addMessage: jest.fn(),
      clear: jest.fn(),
      size: jest.fn().mockReturnValue(0)
    };

    // Setup Claude manager mock contract
    mockClaudeManager = {
      createInstance: jest.fn(),
      connectToTerminal: jest.fn(),
      sendInput: jest.fn(),
      processOutput: jest.fn(),
      deduplicationService: mockDeduplicationService
    };

    // Inject mocks into browser context
    await page.addInitScript(() => {
      // Mock WebSocket constructor
      (window as any).OriginalWebSocket = window.WebSocket;
      window.WebSocket = class MockWebSocket extends EventTarget {
        url: string;
        readyState: number = WebSocket.CONNECTING;
        
        constructor(url: string) {
          super();
          this.url = url;
          
          // Record WebSocket creation
          (window as any).websocketCreations = (window as any).websocketCreations || [];
          (window as any).websocketCreations.push({ url, timestamp: Date.now() });
          
          setTimeout(() => {
            this.readyState = WebSocket.OPEN;
            this.dispatchEvent(new Event('open'));
          }, 100);
        }
        
        send(data: string) {
          (window as any).websocketMessages = (window as any).websocketMessages || [];
          (window as any).websocketMessages.push({
            direction: 'send',
            data: JSON.parse(data),
            timestamp: Date.now()
          });
        }
        
        close() {
          this.readyState = WebSocket.CLOSED;
          this.dispatchEvent(new Event('close'));
        }
      };

      // Mock message deduplication
      (window as any).messageDeduplication = {
        processedMessages: new Set(),
        isProcessed: (messageId: string) => (window as any).messageDeduplication.processedMessages.has(messageId),
        markProcessed: (messageId: string) => (window as any).messageDeduplication.processedMessages.add(messageId)
      };
    });
  }

  async function setupBehaviorMonitoring() {
    // Monitor DOM mutations for duplication detection
    await page.addInitScript(() => {
      const observer = new MutationObserver((mutations) => {
        (window as any).domMutations = (window as any).domMutations || [];
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(node => {
              if (node.textContent && node.textContent.trim()) {
                (window as any).domMutations.push({
                  type: 'addition',
                  content: node.textContent.substring(0, 100),
                  timestamp: Date.now(),
                  target: mutation.target.nodeName
                });
              }
            });
          }
        });
      });
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        });
      } else {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    });
  }

  async function performUserWorkflow(message: string) {
    // Step 1: Create Claude instance
    await page.click('button:has-text("Launch")');
    await page.waitForSelector('.grid', { timeout: 10000 });

    // Step 2: Wait for instance to appear and select it
    await page.waitForTimeout(2000);
    
    // Try to find and click instance
    const instanceSelector = '[data-instance-id]';
    const instanceCount = await page.locator(instanceSelector).count();
    
    if (instanceCount > 0) {
      await page.click(instanceSelector);
    }

    // Step 3: Send message
    const inputSelectors = [
      '[data-testid="message-input"]',
      'textarea',
      'input[type="text"]'
    ];

    for (const selector of inputSelectors) {
      try {
        const input = page.locator(selector).first();
        await input.waitFor({ timeout: 2000 });
        await input.fill(message);
        await page.keyboard.press('Enter');
        break;
      } catch {
        continue;
      }
    }

    // Wait for processing
    await page.waitForTimeout(3000);
  }

  async function simulateWebSocketFlow(instanceId: string, messages: any[]) {
    await page.evaluate((params) => {
      const { instanceId, messages } = params;
      
      // Simulate WebSocket message reception
      messages.forEach((msg, index) => {
        setTimeout(() => {
          const event = new MessageEvent('message', {
            data: JSON.stringify(msg)
          });
          
          // Trigger message handler
          if ((window as any).websocketHandlers) {
            (window as any).websocketHandlers.forEach((handler: Function) => {
              handler(event);
            });
          }
        }, index * 100);
      });
    }, { instanceId, messages });

    // Wait for all messages to be processed
    await page.waitForTimeout(messages.length * 100 + 1000);
  }

  async function verifyMockContracts() {
    // Verify WebSocket usage patterns
    const websocketData = await page.evaluate(() => ({
      creations: (window as any).websocketCreations || [],
      messages: (window as any).websocketMessages || [],
      mutations: (window as any).domMutations || []
    }));

    console.log('📊 Mock Contract Verification:');
    console.log('- WebSocket creations:', websocketData.creations.length);
    console.log('- Messages sent:', websocketData.messages.length);
    console.log('- DOM mutations:', websocketData.mutations.length);

    // Log evidence for debugging
    messageLog.push({
      timestamp: Date.now(),
      type: 'contract-verification',
      data: websocketData
    });
  }
});

/**
 * TDD LONDON SCHOOL CONTRACTS
 * 
 * These interfaces define the expected collaborations between objects.
 * Tests verify behavior, not implementation details.
 */

declare global {
  interface Window {
    websocketCreations: Array<{ url: string, timestamp: number }>;
    websocketMessages: Array<{ direction: string, data: any, timestamp: number }>;
    domMutations: Array<{ type: string, content: string, timestamp: number, target: string }>;
    messageDeduplication: {
      processedMessages: Set<string>;
      isProcessed: (id: string) => boolean;
      markProcessed: (id: string) => void;
    };
    websocketHandlers: Function[];
    mockCollaborationTracker: {
      inputEvents: any[];
      sendEvents: any[];
      processEvents: any[];
    };
  }
}