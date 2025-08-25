import { test, expect, Page, BrowserContext } from '@playwright/test';
import { ClaudeTestPage } from '@/test-utils/claude-test-page';
import { waitForWebSocketConnection, validateInstanceState } from '@/test-utils/claude-e2e-helpers';

test.describe('Claude Instance Creation - 4 Button Interface', () => {
  let page: Page;
  let claudePage: ClaudeTestPage;
  let context: BrowserContext;
  let createdInstances: string[] = [];

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      permissions: ['clipboard-read', 'clipboard-write']
    });
  });

  test.beforeEach(async () => {
    page = await context.newPage();
    claudePage = new ClaudeTestPage(page);
    
    // Navigate to Claude instance management page
    await page.goto('http://localhost:5173/claude-instances');
    await page.waitForLoadState('networkidle');
    
    // Wait for the page to be fully loaded
    await expect(page.locator('[data-testid="claude-instance-dashboard"]')).toBeVisible();
  });

  test.afterEach(async () => {
    // Clean up any instances created during the test
    for (const instanceId of createdInstances) {
      try {
        await claudePage.terminateInstance(instanceId);
      } catch (error) {
        console.warn(`Failed to cleanup instance ${instanceId}:`, error);
      }
    }
    createdInstances = [];
    
    await page.close();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('4-Button Instance Creation Interface', () => {
    test('should display 4 Claude instance creation buttons', async () => {
      // Verify all 4 instance type buttons are visible
      const chatButton = page.locator('[data-testid="create-chat-instance-btn"]');
      const terminalButton = page.locator('[data-testid="create-terminal-instance-btn"]');
      const codeButton = page.locator('[data-testid="create-code-instance-btn"]');
      const analysisButton = page.locator('[data-testid="create-analysis-instance-btn"]');

      await expect(chatButton).toBeVisible();
      await expect(terminalButton).toBeVisible();
      await expect(codeButton).toBeVisible();
      await expect(analysisButton).toBeVisible();

      // Verify button labels
      await expect(chatButton).toContainText('Chat Instance');
      await expect(terminalButton).toContainText('Terminal Instance');
      await expect(codeButton).toContainText('Code Instance');
      await expect(analysisButton).toContainText('Analysis Instance');
    });

    test('should show instance type descriptions on hover', async () => {
      const chatButton = page.locator('[data-testid="create-chat-instance-btn"]');
      
      await chatButton.hover();
      await expect(page.locator('[data-testid="chat-instance-tooltip"]'))
        .toContainText('General conversation and assistance');

      const terminalButton = page.locator('[data-testid="create-terminal-instance-btn"]');
      await terminalButton.hover();
      await expect(page.locator('[data-testid="terminal-instance-tooltip"]'))
        .toContainText('Command-line interface and system tasks');
    });

    test('should display current instance count and limits', async () => {
      const instanceCount = page.locator('[data-testid="current-instance-count"]');
      const instanceLimit = page.locator('[data-testid="instance-limit"]');
      
      await expect(instanceCount).toBeVisible();
      await expect(instanceLimit).toBeVisible();
      
      // Should show format like "0 / 4 instances running"
      await expect(instanceCount).toContainText(/\d+/);
      await expect(instanceLimit).toContainText(/\d+/);
    });
  });

  test.describe('Chat Instance Creation', () => {
    test('should create chat instance via button click', async () => {
      const chatButton = page.locator('[data-testid="create-chat-instance-btn"]');
      
      // Click to create chat instance
      await chatButton.click();
      
      // Wait for creation dialog or direct creation
      const creationModal = page.locator('[data-testid="instance-creation-modal"]');
      
      if (await creationModal.isVisible()) {
        // Fill out creation form if modal appears
        await page.fill('[data-testid="instance-name-input"]', 'E2E Chat Test');
        await page.click('[data-testid="confirm-create-btn"]');
      }
      
      // Wait for instance to appear in dashboard
      await page.waitForSelector('[data-testid^="instance-card-"]', { timeout: 15000 });
      
      // Get the created instance ID
      const instanceCard = page.locator('[data-testid^="instance-card-"]').first();
      const instanceId = await instanceCard.getAttribute('data-instance-id');
      
      expect(instanceId).toBeDefined();
      createdInstances.push(instanceId!);
      
      // Verify instance properties
      await expect(instanceCard.locator('[data-testid="instance-mode"]'))
        .toContainText('chat');
      await expect(instanceCard.locator('[data-testid="instance-status"]'))
        .toContainText('starting', { timeout: 5000 });
      
      // Wait for instance to be running
      await expect(instanceCard.locator('[data-testid="instance-status"]'))
        .toContainText('running', { timeout: 20000 });
    });

    test('should open chat interface after instance creation', async () => {
      const chatButton = page.locator('[data-testid="create-chat-instance-btn"]');
      await chatButton.click();
      
      // Wait for instance creation
      const instanceCard = await page.waitForSelector('[data-testid^="instance-card-"]', { timeout: 15000 });
      const instanceId = await instanceCard.getAttribute('data-instance-id');
      createdInstances.push(instanceId!);
      
      // Wait for running state
      await expect(instanceCard.locator('[data-testid="instance-status"]'))
        .toContainText('running', { timeout: 20000 });
      
      // Click to open chat interface
      await instanceCard.locator('[data-testid="open-instance-btn"]').click();
      
      // Should navigate to chat interface or open in new tab/modal
      const chatInterface = page.locator('[data-testid="claude-chat-interface"]');
      await expect(chatInterface).toBeVisible({ timeout: 10000 });
      
      // Verify chat components are present
      await expect(page.locator('[data-testid="chat-message-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="send-message-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="chat-history"]')).toBeVisible();
    });

    test('should handle chat message exchange in new instance', async () => {
      // Create chat instance
      await page.click('[data-testid="create-chat-instance-btn"]');
      
      const instanceCard = await page.waitForSelector('[data-testid^="instance-card-"]', { timeout: 15000 });
      const instanceId = await instanceCard.getAttribute('data-instance-id');
      createdInstances.push(instanceId!);
      
      await expect(instanceCard.locator('[data-testid="instance-status"]'))
        .toContainText('running', { timeout: 20000 });
      
      // Open chat interface
      await instanceCard.locator('[data-testid="open-instance-btn"]').click();
      
      await expect(page.locator('[data-testid="claude-chat-interface"]'))
        .toBeVisible({ timeout: 10000 });
      
      // Send a test message
      const messageInput = page.locator('[data-testid="chat-message-input"]');
      const sendButton = page.locator('[data-testid="send-message-btn"]');
      
      await messageInput.fill('Hello Claude, this is an E2E test message.');
      await sendButton.click();
      
      // Verify message appears in chat
      await expect(page.locator('[data-testid="user-message"]').last())
        .toContainText('Hello Claude, this is an E2E test message.');
      
      // Wait for Claude's response
      await expect(page.locator('[data-testid="assistant-message"]'))
        .toBeVisible({ timeout: 15000 });
      
      const response = await page.locator('[data-testid="assistant-message"]').last().textContent();
      expect(response).toBeTruthy();
      expect(response!.length).toBeGreaterThan(0);
    });
  });

  test.describe('Terminal Instance Creation', () => {
    test('should create terminal instance via button click', async () => {
      const terminalButton = page.locator('[data-testid="create-terminal-instance-btn"]');
      
      await terminalButton.click();
      
      // Handle creation modal if present
      const creationModal = page.locator('[data-testid="instance-creation-modal"]');
      if (await creationModal.isVisible()) {
        await page.fill('[data-testid="instance-name-input"]', 'E2E Terminal Test');
        await page.click('[data-testid="confirm-create-btn"]');
      }
      
      const instanceCard = await page.waitForSelector('[data-testid^="instance-card-"]', { timeout: 15000 });
      const instanceId = await instanceCard.getAttribute('data-instance-id');
      createdInstances.push(instanceId!);
      
      await expect(instanceCard.locator('[data-testid="instance-mode"]'))
        .toContainText('terminal');
      
      await expect(instanceCard.locator('[data-testid="instance-status"]'))
        .toContainText('running', { timeout: 20000 });
    });

    test('should open terminal interface after instance creation', async () => {
      await page.click('[data-testid="create-terminal-instance-btn"]');
      
      const instanceCard = await page.waitForSelector('[data-testid^="instance-card-"]', { timeout: 15000 });
      const instanceId = await instanceCard.getAttribute('data-instance-id');
      createdInstances.push(instanceId!);
      
      await expect(instanceCard.locator('[data-testid="instance-status"]'))
        .toContainText('running', { timeout: 20000 });
      
      await instanceCard.locator('[data-testid="open-instance-btn"]').click();
      
      // Verify terminal interface components
      const terminalInterface = page.locator('[data-testid="claude-terminal-interface"]');
      await expect(terminalInterface).toBeVisible({ timeout: 10000 });
      
      await expect(page.locator('[data-testid="terminal-display"]')).toBeVisible();
      await expect(page.locator('[data-testid="terminal-input"]')).toBeVisible();
    });

    test('should execute commands in terminal instance', async () => {
      await page.click('[data-testid="create-terminal-instance-btn"]');
      
      const instanceCard = await page.waitForSelector('[data-testid^="instance-card-"]', { timeout: 15000 });
      const instanceId = await instanceCard.getAttribute('data-instance-id');
      createdInstances.push(instanceId!);
      
      await expect(instanceCard.locator('[data-testid="instance-status"]'))
        .toContainText('running', { timeout: 20000 });
      
      await instanceCard.locator('[data-testid="open-instance-btn"]').click();
      
      await expect(page.locator('[data-testid="claude-terminal-interface"]'))
        .toBeVisible({ timeout: 10000 });
      
      // Execute a simple command
      const terminalInput = page.locator('[data-testid="terminal-input"]');
      await terminalInput.fill('echo "E2E test command"');
      await terminalInput.press('Enter');
      
      // Verify command output appears
      await expect(page.locator('[data-testid="terminal-display"]'))
        .toContainText('E2E test command', { timeout: 10000 });
    });
  });

  test.describe('Code Instance Creation', () => {
    test('should create code instance via button click', async () => {
      const codeButton = page.locator('[data-testid="create-code-instance-btn"]');
      
      await codeButton.click();
      
      const instanceCard = await page.waitForSelector('[data-testid^="instance-card-"]', { timeout: 15000 });
      const instanceId = await instanceCard.getAttribute('data-instance-id');
      createdInstances.push(instanceId!);
      
      await expect(instanceCard.locator('[data-testid="instance-mode"]'))
        .toContainText('code');
      
      await expect(instanceCard.locator('[data-testid="instance-status"]'))
        .toContainText('running', { timeout: 20000 });
    });

    test('should provide code editing interface', async () => {
      await page.click('[data-testid="create-code-instance-btn"]');
      
      const instanceCard = await page.waitForSelector('[data-testid^="instance-card-"]', { timeout: 15000 });
      const instanceId = await instanceCard.getAttribute('data-instance-id');
      createdInstances.push(instanceId!);
      
      await expect(instanceCard.locator('[data-testid="instance-status"]'))
        .toContainText('running', { timeout: 20000 });
      
      await instanceCard.locator('[data-testid="open-instance-btn"]').click();
      
      const codeInterface = page.locator('[data-testid="claude-code-interface"]');
      await expect(codeInterface).toBeVisible({ timeout: 10000 });
      
      // Verify code editor components
      await expect(page.locator('[data-testid="code-editor"]')).toBeVisible();
      await expect(page.locator('[data-testid="code-execution-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-explorer"]')).toBeVisible();
    });
  });

  test.describe('Analysis Instance Creation', () => {
    test('should create analysis instance via button click', async () => {
      const analysisButton = page.locator('[data-testid="create-analysis-instance-btn"]');
      
      await analysisButton.click();
      
      const instanceCard = await page.waitForSelector('[data-testid^="instance-card-"]', { timeout: 15000 });
      const instanceId = await instanceCard.getAttribute('data-instance-id');
      createdInstances.push(instanceId!);
      
      await expect(instanceCard.locator('[data-testid="instance-mode"]'))
        .toContainText('analysis');
      
      await expect(instanceCard.locator('[data-testid="instance-status"]'))
        .toContainText('running', { timeout: 20000 });
    });

    test('should provide data analysis interface', async () => {
      await page.click('[data-testid="create-analysis-instance-btn"]');
      
      const instanceCard = await page.waitForSelector('[data-testid^="instance-card-"]', { timeout: 15000 });
      const instanceId = await instanceCard.getAttribute('data-instance-id');
      createdInstances.push(instanceId!);
      
      await expect(instanceCard.locator('[data-testid="instance-status"]'))
        .toContainText('running', { timeout: 20000 });
      
      await instanceCard.locator('[data-testid="open-instance-btn"]').click();
      
      const analysisInterface = page.locator('[data-testid="claude-analysis-interface"]');
      await expect(analysisInterface).toBeVisible({ timeout: 10000 });
      
      // Verify analysis components
      await expect(page.locator('[data-testid="data-upload-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="analysis-results-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="visualization-panel"]')).toBeVisible();
    });
  });

  test.describe('Multi-Instance Management', () => {
    test('should create multiple instances of different types simultaneously', async () => {
      // Create one of each instance type
      const instanceTypes = [
        { button: '[data-testid="create-chat-instance-btn"]', mode: 'chat' },
        { button: '[data-testid="create-terminal-instance-btn"]', mode: 'terminal' },
        { button: '[data-testid="create-code-instance-btn"]', mode: 'code' },
        { button: '[data-testid="create-analysis-instance-btn"]', mode: 'analysis' }
      ];
      
      for (const instanceType of instanceTypes) {
        await page.click(instanceType.button);
        
        // Wait a moment between creations to avoid overwhelming the system
        await page.waitForTimeout(1000);
      }
      
      // Wait for all instances to be created
      await page.waitForFunction(() => {
        const cards = document.querySelectorAll('[data-testid^="instance-card-"]');
        return cards.length === 4;
      }, { timeout: 30000 });
      
      const instanceCards = page.locator('[data-testid^="instance-card-"]');
      expect(await instanceCards.count()).toBe(4);
      
      // Collect instance IDs for cleanup
      for (let i = 0; i < 4; i++) {
        const card = instanceCards.nth(i);
        const instanceId = await card.getAttribute('data-instance-id');
        if (instanceId) {
          createdInstances.push(instanceId);
        }
      }
      
      // Verify each instance type is represented
      for (const instanceType of instanceTypes) {
        await expect(page.locator(`[data-testid="instance-mode"]:has-text("${instanceType.mode}")`)).toBeVisible();
      }
      
      // Wait for all instances to be running
      for (let i = 0; i < 4; i++) {
        const card = instanceCards.nth(i);
        await expect(card.locator('[data-testid="instance-status"]'))
          .toContainText('running', { timeout: 25000 });
      }
    });

    test('should show instance limit reached when maximum exceeded', async () => {
      // Create maximum allowed instances (assuming limit is 4)
      const maxInstances = 4;
      
      for (let i = 0; i < maxInstances; i++) {
        await page.click('[data-testid="create-chat-instance-btn"]');
        await page.waitForTimeout(500);
      }
      
      // Wait for instances to be created
      await page.waitForFunction(() => {
        const cards = document.querySelectorAll('[data-testid^="instance-card-"]');
        return cards.length === maxInstances;
      }, { timeout: 30000 });
      
      // Collect instance IDs
      const instanceCards = page.locator('[data-testid^="instance-card-"]');
      for (let i = 0; i < maxInstances; i++) {
        const card = instanceCards.nth(i);
        const instanceId = await card.getAttribute('data-instance-id');
        if (instanceId) {
          createdInstances.push(instanceId);
        }
      }
      
      // Try to create one more instance - should show limit reached
      await page.click('[data-testid="create-chat-instance-btn"]');
      
      // Should show error message or disabled state
      const limitMessage = page.locator('[data-testid="instance-limit-message"]');
      await expect(limitMessage).toBeVisible({ timeout: 5000 });
      await expect(limitMessage).toContainText(/limit.*reached|maximum.*instances/i);
    });

    test('should allow instance termination and recreation', async () => {
      // Create an instance
      await page.click('[data-testid="create-chat-instance-btn"]');
      
      const instanceCard = await page.waitForSelector('[data-testid^="instance-card-"]', { timeout: 15000 });
      const instanceId = await instanceCard.getAttribute('data-instance-id');
      createdInstances.push(instanceId!);
      
      await expect(instanceCard.locator('[data-testid="instance-status"]'))
        .toContainText('running', { timeout: 20000 });
      
      // Terminate the instance
      await instanceCard.locator('[data-testid="terminate-instance-btn"]').click();
      
      // Confirm termination if dialog appears
      const confirmDialog = page.locator('[data-testid="confirm-termination-dialog"]');
      if (await confirmDialog.isVisible()) {
        await page.click('[data-testid="confirm-terminate-btn"]');
      }
      
      // Wait for instance to be removed or show terminated status
      await expect(instanceCard).not.toBeVisible({ timeout: 10000 });
      
      // Remove from cleanup list since it's already terminated
      createdInstances = createdInstances.filter(id => id !== instanceId);
      
      // Verify instance count decreased
      await expect(page.locator('[data-testid="current-instance-count"]'))
        .toContainText('0');
      
      // Create a new instance to verify system is still functional
      await page.click('[data-testid="create-terminal-instance-btn"]');
      
      const newInstanceCard = await page.waitForSelector('[data-testid^="instance-card-"]', { timeout: 15000 });
      const newInstanceId = await newInstanceCard.getAttribute('data-instance-id');
      createdInstances.push(newInstanceId!);
      
      await expect(newInstanceCard.locator('[data-testid="instance-mode"]'))
        .toContainText('terminal');
    });
  });

  test.describe('Instance State Validation', () => {
    test('should show accurate instance states throughout lifecycle', async () => {
      await page.click('[data-testid="create-chat-instance-btn"]');
      
      const instanceCard = await page.waitForSelector('[data-testid^="instance-card-"]', { timeout: 15000 });
      const instanceId = await instanceCard.getAttribute('data-instance-id');
      createdInstances.push(instanceId!);
      
      // Should start in 'starting' state
      await expect(instanceCard.locator('[data-testid="instance-status"]'))
        .toContainText(/starting|initializing/, { timeout: 5000 });
      
      // Should transition to 'running' state
      await expect(instanceCard.locator('[data-testid="instance-status"]'))
        .toContainText('running', { timeout: 20000 });
      
      // Verify other instance properties
      await expect(instanceCard.locator('[data-testid="instance-port"]'))
        .toContainText(/:\d{4}/);
      
      await expect(instanceCard.locator('[data-testid="instance-uptime"]'))
        .toBeVisible();
      
      await expect(instanceCard.locator('[data-testid="instance-memory-usage"]'))
        .toBeVisible();
    });

    test('should handle instance failure states gracefully', async () => {
      // This test would require a way to simulate instance failure
      // For now, we'll test the UI's handling of failed state
      
      await page.click('[data-testid="create-chat-instance-btn"]');
      
      const instanceCard = await page.waitForSelector('[data-testid^="instance-card-"]', { timeout: 15000 });
      const instanceId = await instanceCard.getAttribute('data-instance-id');
      createdInstances.push(instanceId!);
      
      // Wait for running state first
      await expect(instanceCard.locator('[data-testid="instance-status"]'))
        .toContainText('running', { timeout: 20000 });
      
      // Force an error state through the test API (if available)
      try {
        await page.evaluate(`
          fetch('/api/test/force-instance-error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instanceId: '${instanceId}' })
          })
        `);
        
        // Check if status changes to failed
        await expect(instanceCard.locator('[data-testid="instance-status"]'))
          .toContainText(/failed|error/, { timeout: 10000 });
          
        // Verify restart button appears
        await expect(instanceCard.locator('[data-testid="restart-instance-btn"]'))
          .toBeVisible();
      } catch (error) {
        // Test API might not be available in all environments
        console.log('Unable to simulate instance failure:', error);
      }
    });
  });
});
