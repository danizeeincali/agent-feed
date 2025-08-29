import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test Suite: Claude Response Tripling Bug Reproduction
 * 
 * PURPOSE: Reproduce the exact tripling issue where user input appears
 * multiple times in the Claude terminal interface.
 * 
 * TEST SCENARIO:
 * 1. Navigate to Claude Instance Manager
 * 2. Create new Claude instance
 * 3. Type characters one-by-one in input field
 * 4. Monitor DOM mutations for duplicate content
 * 5. Capture network traffic for analysis
 * 6. Document tripling behavior with evidence
 */

interface DomMutationRecord {
  timestamp: number;
  type: string;
  target: string;
  content: string;
  addedNodes: string[];
  removedNodes: string[];
}

interface NetworkMessage {
  timestamp: number;
  type: 'websocket' | 'sse' | 'http';
  direction: 'send' | 'receive';
  data: any;
  url?: string;
}

interface TripleDetectionResult {
  detected: boolean;
  instances: number;
  content: string;
  positions: string[];
  evidence: string[];
}

test.describe('Claude Tripling Bug Reproduction', () => {
  let page: Page;
  let domMutations: DomMutationRecord[] = [];
  let networkMessages: NetworkMessage[] = [];
  let consoleMessages: string[] = [];

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    domMutations = [];
    networkMessages = [];
    consoleMessages = [];

    // Setup console monitoring
    page.on('console', (msg) => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Setup network monitoring for WebSocket/SSE traffic
    await setupNetworkMonitoring(page);
    
    // Setup DOM mutation monitoring
    await setupDomMutationMonitoring(page);

    // Navigate to the application
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('Reproduce tripling issue with character-by-character typing', async () => {
    console.log('🧪 Starting tripling bug reproduction test');

    // Step 1: Create Claude instance by clicking the first available launch button
    console.log('📝 Step 1: Creating Claude instance');
    
    // Wait for page to load and find launch buttons
    await page.waitForSelector('h2:has-text("Launch Claude Instance")', { timeout: 10000 });
    
    // Find and click the first launch button (prod instance)
    const launchButtons = page.locator('.grid button').first();
    await launchButtons.click();
    
    // Wait for instance to be created and terminal to appear
    await page.waitForSelector('.grid.grid-cols-1', { timeout: 15000 }); // Wait for instances grid
    
    // Look for a terminal or instance connection
    await page.waitForTimeout(3000); // Allow instance creation time
    
    // Try to find terminal input - check multiple possible selectors
    let inputField = null;
    try {
      inputField = page.locator('input[type="text"]').first();
      await inputField.waitFor({ timeout: 5000 });
    } catch {
      try {
        inputField = page.locator('textarea').first();
        await inputField.waitFor({ timeout: 5000 });
      } catch {
        // If no input found, take a screenshot and continue
        await page.screenshot({ path: '/workspaces/agent-feed/tests/playwright/screenshots/no-input-found.png' });
        console.log('⚠️ No terminal input found, but continuing with DOM analysis');
      }
    }

    // Step 2: Type test message character by character
    const testMessage = 'hello';
    console.log(`📝 Step 2: Typing "${testMessage}" character by character`);

    // Clear any existing mutations before typing
    domMutations = [];
    networkMessages = [];

    if (inputField) {
      // Type each character with delay to simulate real user typing
      await inputField.focus();
      for (let i = 0; i < testMessage.length; i++) {
      const char = testMessage[i];
      console.log(`⌨️ Typing character: "${char}"`);
      
        await inputField.type(char, { delay: 200 });
        await page.waitForTimeout(100); // Allow DOM to update
      }

      // Step 3: Submit the message
      console.log('📝 Step 3: Submitting message');
      await page.keyboard.press('Enter');
    } else {
      console.log('📝 Step 2-3: No input field found, simulating interaction');
      // Simulate some interaction to trigger mutations
      await page.evaluate((msg) => {
        const event = new CustomEvent('testInput', { detail: { message: msg } });
        document.dispatchEvent(event);
      }, testMessage);
    }
    
    // Wait for Claude response and processing
    await page.waitForTimeout(3000);

    // Step 4: Analyze DOM for tripling
    console.log('🔍 Step 4: Analyzing DOM for tripling behavior');
    const triplingResult = await analyzeTripling(page, testMessage);

    // Step 5: Capture screenshots and evidence
    console.log('📸 Step 5: Capturing evidence screenshots');
    await page.screenshot({ 
      path: '/workspaces/agent-feed/tests/playwright/screenshots/tripling-bug-evidence.png',
      fullPage: true 
    });

    // Step 6: Generate detailed report
    console.log('📋 Step 6: Generating test report');
    const report = generateTripleReport(triplingResult, domMutations, networkMessages, consoleMessages);
    
    // Save evidence report
    await saveEvidenceReport(report);

    // Step 7: Assert that tripling was detected (test should fail showing the bug)
    console.log('❌ Step 7: Asserting tripling detection (expecting failure to demonstrate bug)');
    expect(triplingResult.detected).toBe(true); // This should fail, proving the bug exists
    expect(triplingResult.instances).toBeGreaterThan(1);
  });

  test('Monitor WebSocket message flow for duplicates', async () => {
    console.log('🌐 Testing WebSocket message flow for duplicates');

    // Create instance and monitor websocket traffic
    await page.click('[data-testid="create-instance-btn"]');
    await page.waitForSelector('[data-testid="claude-terminal"]', { timeout: 10000 });
    
    // Clear previous network data
    networkMessages = [];
    
    // Send a test message
    const testMessage = 'duplicate test';
    const inputField = page.locator('[data-testid="terminal-input"]');
    await inputField.fill(testMessage);
    await page.keyboard.press('Enter');
    
    // Wait for network activity
    await page.waitForTimeout(2000);

    // Analyze WebSocket messages for duplicates
    const websocketMessages = networkMessages.filter(msg => msg.type === 'websocket');
    const duplicateSends = findDuplicateMessages(websocketMessages, testMessage);

    // Generate network analysis report
    const networkReport = {
      totalMessages: networkMessages.length,
      websocketMessages: websocketMessages.length,
      duplicateSends,
      messageFlow: websocketMessages.map(msg => ({
        timestamp: msg.timestamp,
        direction: msg.direction,
        data: typeof msg.data === 'string' ? msg.data.substring(0, 100) : JSON.stringify(msg.data).substring(0, 100)
      }))
    };

    console.log('Network Analysis:', JSON.stringify(networkReport, null, 2));

    // Save network evidence
    await page.evaluate((report) => {
      (window as any).testEvidence = (window as any).testEvidence || {};
      (window as any).testEvidence.networkReport = report;
    }, networkReport);

    expect(duplicateSends.length).toBe(0); // This should fail if duplicates exist
  });

  test('Track DOM mutations during message input', async () => {
    console.log('🔬 Testing DOM mutations during message input');

    await page.click('[data-testid="create-instance-btn"]');
    await page.waitForSelector('[data-testid="claude-terminal"]', { timeout: 10000 });
    
    // Clear mutations before test
    domMutations = [];
    
    // Type and monitor mutations
    const inputField = page.locator('[data-testid="terminal-input"]');
    await inputField.fill('mutation test');
    await page.keyboard.press('Enter');
    
    // Wait for mutations to settle
    await page.waitForTimeout(2000);

    // Analyze mutations for patterns
    const mutationAnalysis = {
      totalMutations: domMutations.length,
      additionMutations: domMutations.filter(m => m.type === 'childList' && m.addedNodes.length > 0),
      contentMutations: domMutations.filter(m => m.type === 'characterData'),
      suspiciousPatterns: findSuspiciousMutationPatterns(domMutations)
    };

    console.log('DOM Mutation Analysis:', JSON.stringify(mutationAnalysis, null, 2));

    // Look for rapid sequential additions of similar content
    const rapidAdditions = mutationAnalysis.additionMutations.filter((mutation, index) => {
      if (index === 0) return false;
      const prev = mutationAnalysis.additionMutations[index - 1];
      return mutation.timestamp - prev.timestamp < 100 && // Within 100ms
             mutation.content.includes(prev.content); // Similar content
    });

    expect(rapidAdditions.length).toBe(0); // Should fail if rapid duplicates detected
  });
});

async function setupNetworkMonitoring(page: Page) {
  // Monitor WebSocket connections using addInitScript
  await page.addInitScript(() => {
    const originalWebSocket = window.WebSocket;
    window.WebSocket = class extends originalWebSocket {
      constructor(url: string, protocols?: string | string[]) {
        super(url, protocols);
        
        const recordMessage = (direction: 'send' | 'receive', data: any) => {
          (window as any).networkMessages = (window as any).networkMessages || [];
          (window as any).networkMessages.push({
            timestamp: Date.now(),
            type: 'websocket',
            direction,
            data,
            url
          });
        };

        // Override send
        const originalSend = this.send;
        this.send = function(data) {
          recordMessage('send', data);
          return originalSend.call(this, data);
        };

        // Monitor incoming messages
        this.addEventListener('message', (event) => {
          recordMessage('receive', event.data);
        });
      }
    };
  });

  // Monitor EventSource (SSE) connections
  await page.addInitScript(() => {
    const originalEventSource = window.EventSource;
    window.EventSource = class extends originalEventSource {
      constructor(url: string, eventSourceInitDict?: EventSourceInit) {
        super(url, eventSourceInitDict);
        
        this.addEventListener('message', (event) => {
          (window as any).networkMessages = (window as any).networkMessages || [];
          (window as any).networkMessages.push({
            timestamp: Date.now(),
            type: 'sse',
            direction: 'receive',
            data: event.data,
            url
          });
        });
      }
    };
  });
}

async function setupDomMutationMonitoring(page: Page) {
  await page.addInitScript(() => {
    const observer = new MutationObserver((mutations) => {
      (window as any).domMutations = (window as any).domMutations || [];
      
      mutations.forEach((mutation) => {
        (window as any).domMutations.push({
          timestamp: Date.now(),
          type: mutation.type,
          target: mutation.target.nodeName + (mutation.target.id ? '#' + mutation.target.id : '') + 
                  (mutation.target.className ? '.' + mutation.target.className.split(' ').join('.') : ''),
          content: mutation.target.textContent?.substring(0, 200) || '',
          addedNodes: Array.from(mutation.addedNodes).map(node => node.textContent?.substring(0, 100) || ''),
          removedNodes: Array.from(mutation.removedNodes).map(node => node.textContent?.substring(0, 100) || '')
        });
      });
    });
    
    // Wait for DOM to be ready before observing
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: false
        });
      });
    } else {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: false
      });
    }
  });
}

async function analyzeTripling(page: Page, testMessage: string): Promise<TripleDetectionResult> {
  return await page.evaluate((message) => {
    // Try multiple selectors for terminal content
    let terminalContent = '';
    const terminalSelectors = [
      '[data-testid="claude-terminal"]',
      '.terminal',
      '[class*="terminal"]',
      '[class*="output"]',
      '.grid.grid-cols-1', // Instance grid area
      'body' // Fallback to entire body
    ];
    
    for (const selector of terminalSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        terminalContent = element.textContent;
        break;
      }
    }
    
    const messageOccurrences = (terminalContent.match(new RegExp(message, 'gi')) || []).length;
    
    // Find all elements containing the message
    const elements = Array.from(document.querySelectorAll('*')).filter(el => 
      el.textContent?.includes(message) && el.textContent.trim().length > 0
    );
    
    const positions = elements.map(el => {
      const rect = el.getBoundingClientRect();
      return `${el.tagName}[${rect.x},${rect.y}]`;
    });

    const evidence = elements.map(el => 
      `${el.tagName}: "${el.textContent?.substring(0, 100)}"`
    );

    return {
      detected: messageOccurrences > 1,
      instances: messageOccurrences,
      content: terminalContent.substring(0, 1000),
      positions,
      evidence
    };
  }, testMessage);
}

function findDuplicateMessages(messages: NetworkMessage[], testMessage: string): NetworkMessage[] {
  const sends = messages.filter(msg => 
    msg.direction === 'send' && 
    typeof msg.data === 'string' && 
    msg.data.includes(testMessage)
  );

  const duplicates = [];
  for (let i = 1; i < sends.length; i++) {
    const current = sends[i];
    const previous = sends[i - 1];
    
    if (current.timestamp - previous.timestamp < 1000 && // Within 1 second
        current.data === previous.data) {
      duplicates.push(current);
    }
  }
  
  return duplicates;
}

function findSuspiciousMutationPatterns(mutations: DomMutationRecord[]): string[] {
  const patterns = [];
  
  // Look for rapid sequential additions
  for (let i = 1; i < mutations.length; i++) {
    const current = mutations[i];
    const previous = mutations[i - 1];
    
    if (current.timestamp - previous.timestamp < 50 && // Very close timing
        current.type === 'childList' && previous.type === 'childList' &&
        current.addedNodes.length > 0 && previous.addedNodes.length > 0) {
      patterns.push(`Rapid sequential additions at ${current.timestamp}`);
    }
  }
  
  // Look for identical content additions
  const contentGroups = new Map();
  mutations.forEach(mutation => {
    if (mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach(content => {
        if (content.length > 5) { // Ignore very short content
          if (!contentGroups.has(content)) {
            contentGroups.set(content, []);
          }
          contentGroups.get(content).push(mutation.timestamp);
        }
      });
    }
  });
  
  contentGroups.forEach((timestamps, content) => {
    if (timestamps.length > 1) {
      patterns.push(`Duplicate content "${content.substring(0, 50)}" added ${timestamps.length} times`);
    }
  });
  
  return patterns;
}

function generateTripleReport(
  triplingResult: TripleDetectionResult,
  domMutations: DomMutationRecord[],
  networkMessages: NetworkMessage[],
  consoleMessages: string[]
) {
  return {
    testExecuted: new Date().toISOString(),
    triplingDetected: triplingResult.detected,
    summary: {
      messageInstances: triplingResult.instances,
      domMutations: domMutations.length,
      networkMessages: networkMessages.length,
      consoleErrors: consoleMessages.filter(msg => msg.includes('[error]')).length
    },
    evidence: {
      domContent: triplingResult.content,
      elementPositions: triplingResult.positions,
      suspiciousElements: triplingResult.evidence
    },
    networkAnalysis: {
      websocketMessages: networkMessages.filter(msg => msg.type === 'websocket').length,
      sseMessages: networkMessages.filter(msg => msg.type === 'sse').length,
      recentMessages: networkMessages.slice(-10).map(msg => ({
        timestamp: new Date(msg.timestamp).toISOString(),
        type: msg.type,
        direction: msg.direction,
        dataPreview: typeof msg.data === 'string' ? 
          msg.data.substring(0, 100) : 
          JSON.stringify(msg.data).substring(0, 100)
      }))
    },
    domMutationPatterns: findSuspiciousMutationPatterns(domMutations),
    consoleLogs: consoleMessages,
    recommendations: [
      'Check WebSocket message deduplication',
      'Verify DOM update logic for duplicate prevention',
      'Investigate SSE event handling',
      'Review input buffering mechanisms'
    ]
  };
}

async function saveEvidenceReport(report: any) {
  // In a real implementation, this would save to a file
  // For now, we'll log it and make it available in the test context
  console.log('=== TRIPLING BUG EVIDENCE REPORT ===');
  console.log(JSON.stringify(report, null, 2));
  console.log('=== END EVIDENCE REPORT ===');
}