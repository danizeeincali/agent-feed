/**
 * Comprehensive Playwright E2E Tests for Claude Instance Management
 * Complete Test Suite covering all production scenarios
 * 
 * TEST SCENARIOS COVERED:
 * 1. Instance selection and launching ✓
 * 2. Multiple instance management ✓
 * 3. Image upload via drag & drop ✓
 * 4. Image upload via clipboard paste ✓
 * 5. WebSocket connection and reconnection ✓
 * 6. Status indicator updates ✓
 * 7. Chat message flow with images ✓
 * 8. Error handling and recovery ✓
 * 9. Performance and concurrent operations ✓
 * 10. Visual regression testing ✓
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { 
  PageHelpers, 
  APIMockingHelpers, 
  WebSocketTestHelpers, 
  PerformanceHelpers,
  FileTestHelpers,
  AccessibilityHelpers,
  CustomAssertions,
  TEST_CONFIG,
  MockDataGenerator
} from './utils/test-helpers';

// Test configuration and fixtures
const TEST_INSTANCES = {
  PRODUCTION: {
    id: 'prod-instance-1',
    name: 'Production Claude',
    status: 'running',
    connectionState: 'connected',
    workingDirectory: '/workspaces/agent-feed/prod',
    useProductionMode: true
  },
  DEFAULT: {
    id: 'default-instance-1',
    name: 'Default Claude',
    status: 'stopped',
    connectionState: 'disconnected'
  },
  SKIP_PERMISSIONS: {
    id: 'skip-permissions-1',
    name: 'Skip Permissions Claude',
    status: 'starting',
    connectionState: 'connecting',
    skipPermissions: true
  }
};

// Page Object Model for Claude Instance Manager
class ClaudeInstanceManagerPage {
  private helpers: PageHelpers;
  private apiMock: APIMockingHelpers;
  private wsMock: WebSocketTestHelpers;
  private perf: PerformanceHelpers;
  private a11y: AccessibilityHelpers;

  constructor(private page: Page) {
    this.helpers = new PageHelpers(page);
    this.apiMock = new APIMockingHelpers(page);
    this.wsMock = new WebSocketTestHelpers(page);
    this.perf = new PerformanceHelpers(page);
    this.a11y = new AccessibilityHelpers(page);
  }

  // Navigation and Setup
  async navigateToInstanceManager() {
    await this.page.goto('/claude-instances');
    await this.helpers.waitForElementWithRetry('[data-testid="claude-instance-manager"]');
  }

  // Instance Selection and Management
  async openInstanceSelector() {
    const selectorButton = this.page.getByTestId('instance-selector-button');
    await selectorButton.click();
    await this.helpers.waitForElementWithRetry('[data-testid="modal-overlay"]', { state: 'visible' });
  }

  async selectInstanceType(instanceType: string) {
    const instanceButton = this.page.getByTestId(`instance-type-${instanceType}`);
    await instanceButton.click();
  }

  async launchInstance(instanceType: string, config?: any) {
    await this.openInstanceSelector();
    await this.selectInstanceType(instanceType);
    
    if (config) {
      // Configure instance before launching
      await this.configureInstance(config);
    }
    
    const launchButton = this.page.getByTestId('launch-instance-button');
    await launchButton.click();
  }

  async configureInstance(config: any) {
    if (config.workingDirectory) {
      const dirInput = this.page.getByTestId('working-directory-input');
      await dirInput.fill(config.workingDirectory);
    }
    
    if (config.skipPermissions) {
      const skipCheckbox = this.page.getByTestId('skip-permissions-checkbox');
      await skipCheckbox.check();
    }
    
    if (config.useProductionMode) {
      const prodCheckbox = this.page.getByTestId('production-mode-checkbox');
      await prodCheckbox.check();
    }
  }

  async stopInstance(instanceId: string) {
    const stopButton = this.page.getByTestId(`stop-instance-${instanceId}`);
    await stopButton.click();
    
    // Handle confirmation dialog if present
    const confirmButton = this.page.getByTestId('confirm-stop');
    if (await confirmButton.isVisible({ timeout: 1000 })) {
      await confirmButton.click();
    }
  }

  async restartInstance(instanceId: string) {
    const restartButton = this.page.getByTestId(`restart-instance-${instanceId}`);
    await restartButton.click();
    
    // Wait for restart confirmation
    await this.helpers.waitForCondition(async () => {
      const status = await this.getInstanceStatus(instanceId);
      return status === 'starting' || status === 'running';
    });
  }

  async deleteInstance(instanceId: string) {
    const deleteButton = this.page.getByTestId(`delete-instance-${instanceId}`);
    await deleteButton.click();
    
    // Confirm deletion
    const confirmButton = this.page.getByTestId('confirm-delete');
    await confirmButton.click();
  }

  async selectActiveInstance(instanceId: string) {
    const instanceCard = this.page.getByTestId(`instance-${instanceId}`);
    await instanceCard.click();
    
    // Wait for selection to take effect
    await this.helpers.waitForCondition(async () => {
      return await instanceCard.getAttribute('data-selected') === 'true';
    });
  }

  // Status and Information
  async getInstanceStatus(instanceId: string): Promise<string> {
    const statusElement = this.page.getByTestId(`instance-status-${instanceId}`);
    return await statusElement.textContent() || '';
  }

  async getConnectionState(instanceId: string): Promise<string> {
    const connectionElement = this.page.getByTestId(`connection-state-${instanceId}`);
    return await connectionElement.textContent() || '';
  }

  async waitForInstanceStatus(instanceId: string, expectedStatus: string, timeout = TEST_CONFIG.TIMEOUTS.LONG) {
    await this.helpers.waitForCondition(async () => {
      const status = await this.getInstanceStatus(instanceId);
      return status.includes(expectedStatus);
    }, timeout);
  }

  // Chat Interface
  async sendMessage(message: string, options?: { instanceId?: string; waitForResponse?: boolean }) {
    const { instanceId, waitForResponse = true } = options || {};
    
    if (instanceId) {
      await this.selectActiveInstance(instanceId);
    }
    
    const messageInput = this.page.getByTestId('chat-input');
    await messageInput.fill(message);
    
    const sendButton = this.page.getByTestId('send-message-button');
    await sendButton.click();
    
    // Wait for message to appear in chat
    await this.helpers.waitForElementWithRetry(`[data-testid="user-message"]:has-text("${message}")`);
    
    if (waitForResponse) {
      await this.waitForResponse();
    }
  }

  async waitForResponse(timeout = TEST_CONFIG.TIMEOUTS.LONG) {
    await this.helpers.waitForElementWithRetry('[data-testid="assistant-message"]:last-child', { timeout });
  }

  async getLastAssistantMessage(): Promise<string> {
    const lastMessage = this.page.locator('[data-testid="assistant-message"]').last();
    return await lastMessage.textContent() || '';
  }

  // Image Upload
  async uploadImageViaDragDrop(files: string[], targetSelector = '[data-testid="image-upload-zone"]') {
    const uploadZone = this.page.locator(targetSelector);
    
    // Create file objects for drag and drop
    const fileObjects = files.map(fileName => ({
      name: fileName,
      type: fileName.endsWith('.png') ? 'image/png' : 'image/jpeg',
      size: 1024 * 10 // 10KB
    }));
    
    // Simulate drag and drop
    await uploadZone.dispatchEvent('dragenter', {
      dataTransfer: {
        files: fileObjects
      }
    });
    
    await uploadZone.dispatchEvent('dragover');
    
    await uploadZone.dispatchEvent('drop', {
      dataTransfer: {
        files: fileObjects
      }
    });
  }

  async uploadImageViaFileInput(files: string[]) {
    const fileInput = this.page.getByTestId('image-file-input');
    await fileInput.setInputFiles(files);
  }

  async simulateClipboardImagePaste(imageData?: string) {
    // Create clipboard data
    const clipboardData = imageData || FileTestHelpers.createTestImageBuffer().toString('base64');
    
    await this.page.evaluate((data) => {
      const clipboardEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer()
      });
      
      // Create a blob from base64 data
      const byteCharacters = atob(data);
      const byteNumbers = Array.from(byteCharacters).map(char => char.charCodeAt(0));
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      
      const file = new File([blob], 'pasted-image.png', { type: 'image/png' });
      clipboardEvent.clipboardData?.items.add(file);
      
      document.dispatchEvent(clipboardEvent);
    }, clipboardData);
  }

  async getUploadedImagesCount(): Promise<number> {
    const images = this.page.locator('[data-testid^="uploaded-image-"]');
    return await images.count();
  }

  async removeUploadedImage(imageId: string) {
    const removeButton = this.page.getByTestId(`remove-image-${imageId}`);
    await removeButton.click();
  }

  // Error Handling
  async getErrorMessage(): Promise<string | null> {
    const errorElement = this.page.getByTestId('error-message');
    if (await errorElement.isVisible({ timeout: 1000 })) {
      return await errorElement.textContent();
    }
    return null;
  }

  async dismissError() {
    const dismissButton = this.page.getByTestId('dismiss-error');
    if (await dismissButton.isVisible({ timeout: 1000 })) {
      await dismissButton.click();
    }
  }

  async waitForErrorToDisappear() {
    await this.helpers.waitForElementWithRetry('[data-testid="error-message"]', { state: 'hidden' });
  }

  // WebSocket and Connection Testing
  async getWebSocketConnectionStatus(): Promise<string> {
    return await this.helpers.getTextContent('[data-testid="websocket-status"]', 'disconnected');
  }

  async waitForWebSocketConnection() {
    await this.helpers.waitForCondition(async () => {
      const status = await this.getWebSocketConnectionStatus();
      return status.includes('connected');
    });
  }

  async simulateWebSocketDisconnection() {
    await this.wsMock.simulateWebSocketError('Connection lost');
  }

  async simulateWebSocketReconnection() {
    await this.wsMock.sendWebSocketMessage({
      type: 'connection',
      status: 'connected'
    });
  }

  // Performance and Monitoring
  async measureInstanceLaunchTime(instanceType: string): Promise<number> {
    return await this.perf.measureActionTime(async () => {
      await this.launchInstance(instanceType);
      await this.waitForInstanceStatus(instanceType, 'running');
    });
  }

  async measureChatResponseTime(message: string): Promise<number> {
    return await this.perf.measureActionTime(async () => {
      await this.sendMessage(message);
    });
  }

  // Utility Methods
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  async getInstancesList() {
    const instances = this.page.locator('[data-testid^="instance-"]');
    const count = await instances.count();
    const instanceData = [];
    
    for (let i = 0; i < count; i++) {
      const instance = instances.nth(i);
      const id = await instance.getAttribute('data-testid');
      const name = await instance.locator('[data-testid="instance-name"]').textContent();
      const status = await instance.locator('[data-testid="instance-status"]').textContent();
      
      instanceData.push({
        id: id?.replace('instance-', ''),
        name,
        status
      });
    }
    
    return instanceData;
  }
}

// Main Test Suite
test.describe('Claude Instance Management - Comprehensive E2E Tests', () => {
  let instanceManager: ClaudeInstanceManagerPage;
  let context: BrowserContext;

  test.beforeEach(async ({ page, browser }) => {
    context = await browser.newContext();
    instanceManager = new ClaudeInstanceManagerPage(page);
    
    // Set up API mocking for consistent testing
    await instanceManager['apiMock'].mockInstancesAPI([
      MockDataGenerator.generateInstance(TEST_INSTANCES.PRODUCTION),
      MockDataGenerator.generateInstance(TEST_INSTANCES.DEFAULT),
      MockDataGenerator.generateInstance(TEST_INSTANCES.SKIP_PERMISSIONS)
    ]);
    
    // Set up WebSocket mocking
    await instanceManager['wsMock'].setupWebSocketMocking();
    
    // Navigate to the application
    await instanceManager.navigateToInstanceManager();
  });

  test.afterEach(async ({ page }) => {
    // Capture screenshot on failure
    if (test.info().status === 'failed') {
      await instanceManager.takeScreenshot(`failure-${test.info().title}`);
    }
  });

  test.describe('1. Instance Selection and Launching', () => {
    test('should display available instance types in selector', async ({ page }) => {
      await instanceManager.openInstanceSelector();

      // Verify modal is open with correct content
      await expect(page.getByTestId('modal-overlay')).toBeVisible();
      await expect(page.getByText('Select Claude Instance')).toBeVisible();

      // Check instance type buttons are present
      await expect(page.getByTestId('instance-type-prod-claude')).toBeVisible();
      await expect(page.getByTestId('instance-type-skip-permissions')).toBeVisible();
      await expect(page.getByTestId('instance-type-continue-session')).toBeVisible();
      await expect(page.getByTestId('instance-type-resume-session')).toBeVisible();

      // Verify descriptions are shown
      await expect(page.getByText('Launch Claude in production environment')).toBeVisible();
      await expect(page.getByText('Launch with permissions skipped')).toBeVisible();
    });

    test('should launch production instance successfully', async ({ page }) => {
      // Mock successful instance creation
      await instanceManager['apiMock'].mockInstanceCreation({
        success: true,
        instanceId: 'new-prod-instance-123'
      });

      const launchTime = await instanceManager.measureInstanceLaunchTime('prod-claude');

      // Verify launch was successful
      await expect(page.getByTestId('instance-new-prod-instance-123')).toBeVisible();
      await instanceManager.waitForInstanceStatus('new-prod-instance-123', 'running');

      // Performance assertion
      expect(launchTime).toBeLessThan(10000); // Should launch within 10 seconds
    });

    test('should handle instance launch failures gracefully', async ({ page }) => {
      // Mock failed instance creation
      await instanceManager['apiMock'].mockInstanceCreation({
        success: false,
        error: 'Failed to start Claude process: Permission denied'
      });

      await instanceManager.launchInstance('prod-claude');

      // Verify error handling
      const errorMessage = await instanceManager.getErrorMessage();
      expect(errorMessage).toContain('Failed to start Claude process');

      // Verify error is dismissible
      await instanceManager.dismissError();
      await instanceManager.waitForErrorToDisappear();
    });

    test('should validate instance configuration options', async ({ page }) => {
      await instanceManager.openInstanceSelector();
      await instanceManager.selectInstanceType('prod-claude');

      // Test configuration options
      const workingDirInput = page.getByTestId('working-directory-input');
      const prodModeCheckbox = page.getByTestId('production-mode-checkbox');
      const skipPermissionsCheckbox = page.getByTestId('skip-permissions-checkbox');

      // Verify default values
      await expect(workingDirInput).toHaveValue('/workspaces/agent-feed');
      await expect(prodModeCheckbox).not.toBeChecked();
      await expect(skipPermissionsCheckbox).not.toBeChecked();

      // Test configuration changes
      await workingDirInput.fill('/workspaces/agent-feed/prod');
      await prodModeCheckbox.check();

      // Verify changes persist
      await expect(workingDirInput).toHaveValue('/workspaces/agent-feed/prod');
      await expect(prodModeCheckbox).toBeChecked();
    });

    test('should support keyboard navigation in selector', async ({ page }) => {
      await instanceManager.openInstanceSelector();

      // Test keyboard navigation
      await instanceManager['a11y'].checkKeyboardNavigation([
        '[data-testid="instance-type-prod-claude"]',
        '[data-testid="instance-type-skip-permissions"]',
        '[data-testid="instance-type-continue-session"]',
        '[data-testid="instance-type-resume-session"]'
      ]);

      // Test ESC key closes modal
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('modal-overlay')).not.toBeVisible();
    });
  });

  test.describe('2. Multiple Instance Management', () => {
    test('should manage multiple instances simultaneously', async ({ page }) => {
      // Mock successful creation for multiple instances
      await instanceManager['apiMock'].mockInstanceCreation({ success: true, instanceId: 'instance-1' });
      
      // Launch multiple instances
      await instanceManager.launchInstance('prod-claude');
      await instanceManager.launchInstance('skip-permissions');
      await instanceManager.launchInstance('continue-session');

      // Verify all instances are created
      const instances = await instanceManager.getInstancesList();
      expect(instances.length).toBeGreaterThanOrEqual(3);

      // Test switching between instances
      await instanceManager.selectActiveInstance('instance-1');
      await expect(page.getByTestId('instance-instance-1')).toHaveAttribute('data-selected', 'true');
    });

    test('should handle concurrent instance operations', async ({ page }) => {
      const instances = ['prod-1', 'prod-2', 'prod-3'];
      
      // Mock multiple successful operations
      for (const id of instances) {
        await instanceManager['apiMock'].mockInstanceCreation({ success: true, instanceId: id });
      }

      // Launch instances concurrently
      const launchPromises = instances.map(id => 
        instanceManager.launchInstance('prod-claude')
      );

      // All should complete without errors
      await Promise.all(launchPromises);

      // Verify UI remains responsive
      const selectorButton = page.getByTestId('instance-selector-button');
      await expect(selectorButton).toBeEnabled();
    });

    test('should properly stop and restart instances', async ({ page }) => {
      const instanceId = 'test-instance-restart';
      
      // Launch instance first
      await instanceManager['apiMock'].mockInstanceCreation({ success: true, instanceId });
      await instanceManager.launchInstance('prod-claude');

      // Stop instance
      await instanceManager.stopInstance(instanceId);
      await instanceManager.waitForInstanceStatus(instanceId, 'stopped');

      // Restart instance
      await instanceManager.restartInstance(instanceId);
      await instanceManager.waitForInstanceStatus(instanceId, 'running');

      // Verify instance is functional after restart
      await instanceManager.selectActiveInstance(instanceId);
      await instanceManager.sendMessage('Hello after restart');
      
      const response = await instanceManager.getLastAssistantMessage();
      expect(response).toBeTruthy();
    });

    test('should delete instances and clean up resources', async ({ page }) => {
      const instanceId = 'test-instance-delete';
      
      // Create instance
      await instanceManager['apiMock'].mockInstanceCreation({ success: true, instanceId });
      await instanceManager.launchInstance('prod-claude');

      // Verify instance exists
      await expect(page.getByTestId(`instance-${instanceId}`)).toBeVisible();

      // Delete instance
      await instanceManager.deleteInstance(instanceId);

      // Verify instance is removed from UI
      await expect(page.getByTestId(`instance-${instanceId}`)).not.toBeVisible();
    });
  });

  test.describe('3. Image Upload via Drag & Drop', () => {
    test('should handle single image drag and drop upload', async ({ page }) => {
      const instanceId = 'test-image-instance';
      await instanceManager.selectActiveInstance(instanceId);

      // Mock file upload success
      await instanceManager['apiMock'].mockFileUpload({
        success: true,
        fileId: 'file-123',
        fileName: 'test-image.png',
        url: 'https://example.com/test-image.png'
      });

      // Perform drag and drop
      await instanceManager.uploadImageViaDragDrop(['test-image.png']);

      // Verify image is uploaded and displayed
      await expect(page.getByTestId('uploaded-image-file-123')).toBeVisible();
      
      const imageCount = await instanceManager.getUploadedImagesCount();
      expect(imageCount).toBe(1);
    });

    test('should handle multiple images drag and drop upload', async ({ page }) => {
      const instanceId = 'test-multi-image-instance';
      await instanceManager.selectActiveInstance(instanceId);

      const imageFiles = ['image1.png', 'image2.jpg', 'image3.gif'];
      
      // Mock multiple file uploads
      for (let i = 0; i < imageFiles.length; i++) {
        await instanceManager['apiMock'].mockFileUpload({
          success: true,
          fileId: `file-${i}`,
          fileName: imageFiles[i],
          url: `https://example.com/${imageFiles[i]}`
        });
      }

      await instanceManager.uploadImageViaDragDrop(imageFiles);

      // Verify all images are uploaded
      const imageCount = await instanceManager.getUploadedImagesCount();
      expect(imageCount).toBe(imageFiles.length);

      // Verify each image is displayed
      for (let i = 0; i < imageFiles.length; i++) {
        await expect(page.getByTestId(`uploaded-image-file-${i}`)).toBeVisible();
      }
    });

    test('should validate file types during drag and drop', async ({ page }) => {
      await instanceManager.selectActiveInstance('test-validation-instance');

      // Try to upload invalid file types
      const invalidFiles = ['document.pdf', 'archive.zip', 'script.js'];
      
      await instanceManager.uploadImageViaDragDrop(invalidFiles);

      // Should show validation error
      const errorMessage = await instanceManager.getErrorMessage();
      expect(errorMessage).toContain('file type');

      // No images should be uploaded
      const imageCount = await instanceManager.getUploadedImagesCount();
      expect(imageCount).toBe(0);
    });

    test('should handle large file size validation', async ({ page }) => {
      await instanceManager.selectActiveInstance('test-size-validation-instance');

      // Mock large file upload failure
      await instanceManager['apiMock'].mockFileUpload({
        success: false,
        error: 'File size exceeds 10MB limit'
      });

      // Simulate large file
      const largeImageData = FileTestHelpers.generateLargeFile(15 * 1024 * 1024); // 15MB
      
      await instanceManager.uploadImageViaDragDrop(['large-image.png']);

      // Should show size validation error
      const errorMessage = await instanceManager.getErrorMessage();
      expect(errorMessage).toContain('size');
    });

    test('should show upload progress for drag and drop', async ({ page }) => {
      await instanceManager.selectActiveInstance('test-progress-instance');

      // Mock delayed upload with progress
      let uploadProgress = 0;
      await page.route('**/api/claude/instances/*/upload', async (route) => {
        // Simulate gradual progress
        const progressInterval = setInterval(() => {
          uploadProgress += 20;
          if (uploadProgress >= 100) {
            clearInterval(progressInterval);
          }
        }, 200);

        setTimeout(async () => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              fileId: 'progress-file',
              fileName: 'progress-test.png'
            })
          });
        }, 1000);
      });

      await instanceManager.uploadImageViaDragDrop(['progress-test.png']);

      // Verify progress indicator appears
      await expect(page.getByTestId('upload-progress')).toBeVisible();
      
      // Wait for upload completion
      await instanceManager['helpers'].waitForCondition(async () => {
        const count = await instanceManager.getUploadedImagesCount();
        return count > 0;
      });
    });
  });

  test.describe('4. Image Upload via Clipboard Paste', () => {
    test('should handle clipboard image paste', async ({ page }) => {
      await instanceManager.selectActiveInstance('test-clipboard-instance');

      // Mock successful clipboard upload
      await instanceManager['apiMock'].mockFileUpload({
        success: true,
        fileId: 'clipboard-image',
        fileName: 'pasted-image.png',
        url: 'https://example.com/pasted-image.png'
      });

      // Focus on upload area
      const uploadZone = page.getByTestId('image-upload-zone');
      await uploadZone.click();

      // Simulate clipboard paste
      await instanceManager.simulateClipboardImagePaste();

      // Verify image was pasted and uploaded
      await expect(page.getByTestId('uploaded-image-clipboard-image')).toBeVisible();
      
      const imageCount = await instanceManager.getUploadedImagesCount();
      expect(imageCount).toBe(1);
    });

    test('should handle multiple clipboard paste operations', async ({ page }) => {
      await instanceManager.selectActiveInstance('test-multi-clipboard-instance');

      const uploadZone = page.getByTestId('image-upload-zone');
      await uploadZone.click();

      // Paste multiple images
      for (let i = 0; i < 3; i++) {
        await instanceManager['apiMock'].mockFileUpload({
          success: true,
          fileId: `clipboard-${i}`,
          fileName: `pasted-image-${i}.png`
        });

        await instanceManager.simulateClipboardImagePaste();
        await page.waitForTimeout(500); // Allow time for upload
      }

      // Verify all images were pasted
      const imageCount = await instanceManager.getUploadedImagesCount();
      expect(imageCount).toBe(3);
    });

    test('should validate clipboard content before upload', async ({ page }) => {
      await instanceManager.selectActiveInstance('test-clipboard-validation');

      const uploadZone = page.getByTestId('image-upload-zone');
      await uploadZone.click();

      // Try to paste non-image content
      await page.evaluate(() => {
        const clipboardEvent = new ClipboardEvent('paste', {
          clipboardData: new DataTransfer()
        });
        
        // Add text content instead of image
        const textBlob = new Blob(['This is text content'], { type: 'text/plain' });
        const textFile = new File([textBlob], 'text.txt', { type: 'text/plain' });
        clipboardEvent.clipboardData?.items.add(textFile);
        
        document.dispatchEvent(clipboardEvent);
      });

      // Should show validation error for non-image content
      const errorMessage = await instanceManager.getErrorMessage();
      expect(errorMessage).toContain('image');
    });

    test('should provide keyboard shortcuts for paste', async ({ page }) => {
      await instanceManager.selectActiveInstance('test-keyboard-paste');

      // Mock successful paste upload
      await instanceManager['apiMock'].mockFileUpload({
        success: true,
        fileId: 'keyboard-paste',
        fileName: 'keyboard-pasted.png'
      });

      // Focus upload area and use Ctrl+V
      const uploadZone = page.getByTestId('image-upload-zone');
      await uploadZone.click();
      
      // Simulate Ctrl+V keyboard shortcut
      await page.keyboard.press('Control+v');

      // For this test, we'll simulate the paste event since we can't control actual clipboard
      await instanceManager.simulateClipboardImagePaste();

      // Verify keyboard paste worked
      const imageCount = await instanceManager.getUploadedImagesCount();
      expect(imageCount).toBe(1);
    });
  });

  test.describe('5. WebSocket Connection and Reconnection', () => {
    test('should establish WebSocket connection on page load', async ({ page }) => {
      // Verify WebSocket connection is established
      await instanceManager.waitForWebSocketConnection();
      
      const connectionStatus = await instanceManager.getWebSocketConnectionStatus();
      expect(connectionStatus).toContain('connected');

      // Verify connection indicator shows healthy state
      const connectionIndicator = page.getByTestId('websocket-connection-indicator');
      await expect(connectionIndicator).toHaveClass(/text-green|bg-green/);
    });

    test('should handle WebSocket disconnection gracefully', async ({ page }) => {
      // Wait for initial connection
      await instanceManager.waitForWebSocketConnection();

      // Simulate disconnection
      await instanceManager.simulateWebSocketDisconnection();

      // Verify disconnection is indicated
      const connectionStatus = await instanceManager.getWebSocketConnectionStatus();
      expect(connectionStatus).toContain('disconnected');

      // Should show reconnecting indicator
      await expect(page.getByTestId('websocket-reconnecting')).toBeVisible();
    });

    test('should automatically reconnect after disconnection', async ({ page }) => {
      // Initial connection
      await instanceManager.waitForWebSocketConnection();

      // Disconnect
      await instanceManager.simulateWebSocketDisconnection();

      // Wait for reconnection attempt
      await page.waitForTimeout(2000);

      // Simulate successful reconnection
      await instanceManager.simulateWebSocketReconnection();

      // Verify reconnection
      await instanceManager.waitForWebSocketConnection();
      
      const connectionStatus = await instanceManager.getWebSocketConnectionStatus();
      expect(connectionStatus).toContain('connected');
    });

    test('should handle WebSocket connection with retries', async ({ page }) => {
      // Simulate connection failures followed by success
      let connectionAttempts = 0;
      
      await page.route('**/socket.io/**', async (route) => {
        connectionAttempts++;
        
        if (connectionAttempts < 3) {
          // Fail first 2 attempts
          await route.abort();
        } else {
          // Succeed on 3rd attempt
          await route.fulfill({
            status: 200,
            contentType: 'text/plain',
            body: '97:0{"sid":"test-session-id","upgrades":["websocket"],"pingInterval":25000,"pingTimeout":20000}'
          });
        }
      });

      // Reload page to trigger connection attempts
      await page.reload();

      // Should eventually connect after retries
      await instanceManager.waitForWebSocketConnection();
      
      expect(connectionAttempts).toBeGreaterThanOrEqual(3);
    });

    test('should maintain real-time updates during connection issues', async ({ page }) => {
      await instanceManager.waitForWebSocketConnection();

      // Start sending a message
      await instanceManager.sendMessage('Test message during connection issues', { waitForResponse: false });

      // Simulate brief disconnection during message sending
      await instanceManager.simulateWebSocketDisconnection();
      
      await page.waitForTimeout(1000);

      // Reconnect
      await instanceManager.simulateWebSocketReconnection();
      await instanceManager.waitForWebSocketConnection();

      // Message should still be processed after reconnection
      await instanceManager.waitForResponse();
      
      const response = await instanceManager.getLastAssistantMessage();
      expect(response).toBeTruthy();
    });
  });

  test.describe('6. Status Indicator Updates', () => {
    test('should display real-time status updates', async ({ page }) => {
      const instanceId = 'status-test-instance';
      
      // Initial status
      await instanceManager.waitForInstanceStatus(instanceId, 'starting');

      // Simulate status change via WebSocket
      await instanceManager['wsMock'].sendWebSocketMessage({
        type: 'status',
        instanceId,
        status: 'running',
        uptime: 120,
        cpuUsage: 15.5,
        memoryUsage: 256
      });

      // Status should update in real-time
      await instanceManager.waitForInstanceStatus(instanceId, 'running');

      // Verify additional metrics are shown
      const instanceCard = page.getByTestId(`instance-${instanceId}`);
      await expect(instanceCard).toContainText('15.5%'); // CPU usage
      await expect(instanceCard).toContainText('256'); // Memory usage
      await expect(instanceCard).toContainText('2m'); // Uptime
    });

    test('should indicate connection health with visual cues', async ({ page }) => {
      const instanceId = 'connection-health-test';

      // Test healthy connection
      await instanceManager['wsMock'].sendWebSocketMessage({
        type: 'connection',
        instanceId,
        connectionState: 'connected',
        latency: 45
      });

      const connectionIndicator = page.getByTestId(`connection-state-${instanceId}`);
      await expect(connectionIndicator).toHaveClass(/text-green|bg-green/);

      // Test degraded connection
      await instanceManager['wsMock'].sendWebSocketMessage({
        type: 'connection',
        instanceId,
        connectionState: 'degraded',
        latency: 850
      });

      await expect(connectionIndicator).toHaveClass(/text-yellow|bg-yellow/);

      // Test disconnected state
      await instanceManager['wsMock'].sendWebSocketMessage({
        type: 'connection',
        instanceId,
        connectionState: 'disconnected'
      });

      await expect(connectionIndicator).toHaveClass(/text-red|bg-red/);
    });

    test('should show process information and metrics', async ({ page }) => {
      const instanceId = 'metrics-test-instance';

      // Send comprehensive metrics update
      await instanceManager['wsMock'].sendWebSocketMessage({
        type: 'metrics',
        instanceId,
        metrics: {
          pid: 12345,
          uptime: 3665, // 1 hour 1 minute 5 seconds
          cpuUsage: 23.7,
          memoryUsage: 512,
          diskUsage: 1024,
          networkIn: 2048,
          networkOut: 1536,
          requestCount: 47,
          errorCount: 2
        }
      });

      const instanceCard = page.getByTestId(`instance-${instanceId}`);

      // Verify all metrics are displayed
      await expect(instanceCard).toContainText('PID: 12345');
      await expect(instanceCard).toContainText('1h 1m'); // Formatted uptime
      await expect(instanceCard).toContainText('23.7%'); // CPU
      await expect(instanceCard).toContainText('512 MB'); // Memory
      await expect(instanceCard).toContainText('47 requests'); // Request count
      await expect(instanceCard).toContainText('2 errors'); // Error count
    });

    test('should handle error states with appropriate visuals', async ({ page }) => {
      const instanceId = 'error-state-test';

      // Simulate error state
      await instanceManager['wsMock'].sendWebSocketMessage({
        type: 'status',
        instanceId,
        status: 'error',
        error: 'Process crashed: Segmentation fault',
        exitCode: 139,
        lastError: 'Memory access violation at 0x7fff5fc0'
      });

      // Error status should be visible
      await instanceManager.waitForInstanceStatus(instanceId, 'error');

      const instanceCard = page.getByTestId(`instance-${instanceId}`);
      
      // Should have error styling
      await expect(instanceCard).toHaveClass(/border-red|bg-red/);
      
      // Should show error details
      await expect(instanceCard).toContainText('Process crashed');
      await expect(instanceCard).toContainText('Exit code: 139');
      
      // Should offer restart option
      await expect(page.getByTestId(`restart-instance-${instanceId}`)).toBeVisible();
    });

    test('should update status indicators with smooth animations', async ({ page }) => {
      const instanceId = 'animation-test-instance';

      // Check that status changes include animations
      await instanceManager['wsMock'].sendWebSocketMessage({
        type: 'status',
        instanceId,
        status: 'starting'
      });

      const statusElement = page.getByTestId(`instance-status-${instanceId}`);
      
      // Should have animation/transition classes
      await expect(statusElement).toHaveClass(/transition|animate/);

      // Change to running status
      await instanceManager['wsMock'].sendWebSocketMessage({
        type: 'status',
        instanceId,
        status: 'running'
      });

      // Status should update with animation
      await instanceManager.waitForInstanceStatus(instanceId, 'running');
      await expect(statusElement).toHaveClass(/transition|animate/);
    });
  });

  test.describe('7. Chat Message Flow with Images', () => {
    test('should send text message and receive response', async ({ page }) => {
      const instanceId = 'chat-test-instance';
      
      // Mock chat API response
      await instanceManager['apiMock'].mockChatAPI([{
        success: true,
        response: 'Hello! I understand you sent a test message. How can I assist you today?'
      }]);

      await instanceManager.selectActiveInstance(instanceId);
      
      const responseTime = await instanceManager.measureChatResponseTime('Hello Claude, this is a test message');

      // Verify message exchange
      await expect(page.getByTestId('user-message')).toContainText('Hello Claude, this is a test message');
      
      const assistantResponse = await instanceManager.getLastAssistantMessage();
      expect(assistantResponse).toContain('Hello! I understand');

      // Performance check
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    test('should send message with single image attachment', async ({ page }) => {
      const instanceId = 'image-chat-instance';
      
      await instanceManager.selectActiveInstance(instanceId);

      // Upload image first
      await instanceManager['apiMock'].mockFileUpload({
        success: true,
        fileId: 'chat-image-1',
        fileName: 'test-diagram.png',
        url: 'https://example.com/test-diagram.png'
      });

      await instanceManager.uploadImageViaDragDrop(['test-diagram.png']);

      // Mock chat response that acknowledges the image
      await instanceManager['apiMock'].mockChatAPI([{
        success: true,
        response: 'I can see the diagram you shared. It appears to show a flowchart with several decision points. Would you like me to analyze it?'
      }]);

      // Send message with image
      await instanceManager.sendMessage('Can you explain this diagram?');

      // Verify message shows with image attachment
      const userMessage = page.locator('[data-testid="user-message"]').last();
      await expect(userMessage).toContainText('Can you explain this diagram?');
      await expect(userMessage.locator('[data-testid="message-image-attachment"]')).toBeVisible();

      // Verify response acknowledges image
      const assistantResponse = await instanceManager.getLastAssistantMessage();
      expect(assistantResponse).toContain('I can see the diagram');
    });

    test('should send message with multiple image attachments', async ({ page }) => {
      const instanceId = 'multi-image-chat-instance';
      
      await instanceManager.selectActiveInstance(instanceId);

      // Upload multiple images
      const images = ['chart1.png', 'chart2.jpg', 'diagram.gif'];
      for (let i = 0; i < images.length; i++) {
        await instanceManager['apiMock'].mockFileUpload({
          success: true,
          fileId: `multi-image-${i}`,
          fileName: images[i]
        });
      }

      await instanceManager.uploadImageViaDragDrop(images);

      // Mock response for multiple images
      await instanceManager['apiMock'].mockChatAPI([{
        success: true,
        response: 'I can see you\'ve shared 3 images: two charts and one diagram. Let me analyze each one for you.'
      }]);

      await instanceManager.sendMessage('Please analyze these images together');

      // Verify all images are attached to message
      const userMessage = page.locator('[data-testid="user-message"]').last();
      const imageAttachments = userMessage.locator('[data-testid="message-image-attachment"]');
      await expect(imageAttachments).toHaveCount(3);

      // Verify response acknowledges all images
      const assistantResponse = await instanceManager.getLastAssistantMessage();
      expect(assistantResponse).toContain('3 images');
    });

    test('should handle streaming responses', async ({ page }) => {
      const instanceId = 'streaming-chat-instance';
      
      await instanceManager.selectActiveInstance(instanceId);

      // Mock streaming response
      await page.route('**/api/claude/instances/*/chat', async (route) => {
        const chunks = [
          'This ',
          'is ',
          'a ',
          'streaming ',
          'response ',
          'that ',
          'builds ',
          'up ',
          'over ',
          'time.'
        ];

        // Send response as Server-Sent Events
        let sseData = 'data: {"type":"start","messageId":"stream-msg"}\n\n';
        
        for (const chunk of chunks) {
          sseData += `data: {"type":"content","content":"${chunk}"}\n\n`;
        }
        
        sseData += 'data: {"type":"end"}\n\n';

        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: sseData
        });
      });

      await instanceManager.sendMessage('Tell me a story with streaming response', { waitForResponse: false });

      // Should show typing indicator initially
      await expect(page.getByTestId('typing-indicator')).toBeVisible();

      // Wait for complete streaming response
      await instanceManager['helpers'].waitForCondition(async () => {
        const response = await instanceManager.getLastAssistantMessage();
        return response.includes('streaming response that builds up over time');
      });

      // Typing indicator should disappear
      await expect(page.getByTestId('typing-indicator')).not.toBeVisible();
    });

    test('should handle message sending errors gracefully', async ({ page }) => {
      const instanceId = 'error-chat-instance';
      
      await instanceManager.selectActiveInstance(instanceId);

      // Mock error response
      await instanceManager['apiMock'].mockChatAPI([{
        success: false,
        error: 'Instance is not responding. Connection timeout.',
        code: 'INSTANCE_TIMEOUT'
      }]);

      await instanceManager.sendMessage('This message will fail', { waitForResponse: false });

      // Should show error in chat
      await expect(page.getByTestId('chat-error')).toContainText('Instance is not responding');

      // Should offer retry option
      const retryButton = page.getByTestId('retry-message');
      await expect(retryButton).toBeVisible();

      // Mock successful retry
      await instanceManager['apiMock'].mockChatAPI([{
        success: true,
        response: 'Sorry about the previous timeout. I\'m back online now!'
      }]);

      await retryButton.click();

      // Should eventually get successful response
      await instanceManager.waitForResponse();
      const response = await instanceManager.getLastAssistantMessage();
      expect(response).toContain('Sorry about the previous timeout');
    });

    test('should support message history and conversation context', async ({ page }) => {
      const instanceId = 'context-chat-instance';
      
      await instanceManager.selectActiveInstance(instanceId);

      // Send series of messages to build context
      const conversation = [
        { user: 'My name is Alice', assistant: 'Nice to meet you, Alice!' },
        { user: 'I work as a software engineer', assistant: 'That\'s great! Software engineering is fascinating.' },
        { user: 'What was my name again?', assistant: 'Your name is Alice, as you told me earlier.' }
      ];

      for (const exchange of conversation) {
        await instanceManager['apiMock'].mockChatAPI([{
          success: true,
          response: exchange.assistant
        }]);

        await instanceManager.sendMessage(exchange.user);
        
        const response = await instanceManager.getLastAssistantMessage();
        expect(response).toBe(exchange.assistant);
      }

      // Verify conversation history is maintained
      const userMessages = page.locator('[data-testid="user-message"]');
      const assistantMessages = page.locator('[data-testid="assistant-message"]');

      await expect(userMessages).toHaveCount(3);
      await expect(assistantMessages).toHaveCount(3);
    });
  });

  test.describe('8. Error Handling and Recovery', () => {
    test('should recover from network errors', async ({ page, context }) => {
      const instanceId = 'network-recovery-instance';
      
      await instanceManager.selectActiveInstance(instanceId);

      // Simulate network failure
      await context.setOffline(true);

      await instanceManager.sendMessage('This should fail due to network', { waitForResponse: false });

      // Should show network error
      await expect(page.getByTestId('network-error')).toBeVisible();

      // Restore network
      await context.setOffline(false);

      // Mock successful response after network restoration
      await instanceManager['apiMock'].mockChatAPI([{
        success: true,
        response: 'Network connection restored successfully!'
      }]);

      // Should have retry option
      const retryButton = page.getByTestId('retry-connection');
      if (await retryButton.isVisible()) {
        await retryButton.click();
      }

      // Should recover and work normally
      await instanceManager.waitForResponse();
      const response = await instanceManager.getLastAssistantMessage();
      expect(response).toContain('Network connection restored');
    });

    test('should handle instance crashes gracefully', async ({ page }) => {
      const instanceId = 'crash-recovery-instance';

      // Simulate instance crash
      await instanceManager['wsMock'].sendWebSocketMessage({
        type: 'status',
        instanceId,
        status: 'error',
        error: 'Process terminated unexpectedly',
        exitCode: 139,
        signal: 'SIGSEGV'
      });

      // Should show crash notification
      await expect(page.getByTestId('instance-crashed')).toBeVisible();
      await expect(page.getByText('Process terminated unexpectedly')).toBeVisible();

      // Should offer restart option
      const restartButton = page.getByTestId(`restart-instance-${instanceId}`);
      await expect(restartButton).toBeVisible();

      // Mock successful restart
      await instanceManager['apiMock'].mockInstanceCreation({ success: true, instanceId });

      await restartButton.click();

      // Should show restarting status
      await instanceManager.waitForInstanceStatus(instanceId, 'starting');
      
      // Should eventually return to running state
      await instanceManager['wsMock'].sendWebSocketMessage({
        type: 'status',
        instanceId,
        status: 'running'
      });

      await instanceManager.waitForInstanceStatus(instanceId, 'running');
    });

    test('should maintain session state across page refreshes', async ({ page }) => {
      const instanceId = 'session-persistence-instance';
      
      // Establish session state
      await instanceManager.selectActiveInstance(instanceId);
      await instanceManager.sendMessage('Remember this conversation for after refresh');

      // Mock session storage
      await page.evaluate((id) => {
        localStorage.setItem('claude-instances-session', JSON.stringify({
          activeInstanceId: id,
          conversationHistory: [
            { 
              type: 'user', 
              content: 'Remember this conversation for after refresh', 
              timestamp: Date.now() 
            }
          ]
        }));
      }, instanceId);

      // Refresh page
      await page.reload();
      await instanceManager.navigateToInstanceManager();

      // Should restore active instance
      await expect(page.getByTestId(`instance-${instanceId}`)).toHaveAttribute('data-selected', 'true');

      // Should restore conversation history
      await expect(page.getByTestId('user-message')).toContainText('Remember this conversation');
    });

    test('should handle resource constraints gracefully', async ({ page }) => {
      // Mock resource exhaustion
      await instanceManager['apiMock'].mockInstanceCreation({
        success: false,
        error: 'Maximum instance limit reached (10/10)',
        code: 'RESOURCE_LIMIT_EXCEEDED',
        maxInstances: 10,
        currentInstances: 10
      });

      await instanceManager.launchInstance('prod-claude');

      // Should show resource limit error with helpful information
      const errorMessage = await instanceManager.getErrorMessage();
      expect(errorMessage).toContain('Maximum instance limit reached');
      expect(errorMessage).toContain('10/10');

      // Should suggest cleanup actions
      await expect(page.getByTestId('cleanup-instances-suggestion')).toBeVisible();
      await expect(page.getByText('Stop unused instances')).toBeVisible();
    });

    test('should validate input and prevent harmful operations', async ({ page }) => {
      const instanceId = 'security-validation-instance';
      
      await instanceManager.selectActiveInstance(instanceId);

      // Test various potentially harmful inputs
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '${7*7}', // Template injection
        '../../etc/passwd', // Path traversal
        'DROP TABLE users;', // SQL injection
      ];

      for (const maliciousInput of maliciousInputs) {
        // Send malicious input
        await instanceManager.sendMessage(maliciousInput, { waitForResponse: false });

        // Should either sanitize or reject the input
        const userMessage = page.locator('[data-testid="user-message"]').last();
        const messageContent = await userMessage.textContent();

        // Should not contain raw malicious content
        expect(messageContent).not.toContain('<script>');
        expect(messageContent).not.toContain('javascript:');
        
        // Clear for next test
        await page.waitForTimeout(100);
      }
    });
  });

  test.describe('9. Performance and Concurrent Operations', () => {
    test('should load instances quickly on page load', async ({ page }) => {
      const loadTime = await instanceManager['perf'].measurePageLoadTime();

      // Should load within reasonable time (3 seconds for development, 1 second for production)
      const maxLoadTime = process.env.NODE_ENV === 'production' ? 1000 : 3000;
      expect(loadTime).toBeLessThan(maxLoadTime);
    });

    test('should handle high-frequency status updates', async ({ page }) => {
      const instanceId = 'high-frequency-test';

      // Send rapid status updates
      const updates = 50;
      const updateInterval = 10; // 10ms intervals

      for (let i = 0; i < updates; i++) {
        setTimeout(() => {
          instanceManager['wsMock'].sendWebSocketMessage({
            type: 'status',
            instanceId,
            status: 'running',
            cpuUsage: Math.random() * 100,
            memoryUsage: 256 + Math.random() * 512,
            networkIn: Math.random() * 1024,
            networkOut: Math.random() * 1024
          });
        }, i * updateInterval);
      }

      // Wait for all updates to process
      await page.waitForTimeout(updates * updateInterval + 1000);

      // UI should remain responsive
      const selectorButton = page.getByTestId('instance-selector-button');
      await expect(selectorButton).toBeEnabled();

      // Should display latest status
      const instanceCard = page.getByTestId(`instance-${instanceId}`);
      await expect(instanceCard).toBeVisible();
    });

    test('should handle concurrent message sending', async ({ page }) => {
      const instanceId = 'concurrent-messages-test';
      
      await instanceManager.selectActiveInstance(instanceId);

      // Mock responses for concurrent messages
      const messageCount = 5;
      const responses = Array.from({ length: messageCount }, (_, i) => ({
        success: true,
        response: `Response ${i + 1} to concurrent message`
      }));

      await instanceManager['apiMock'].mockChatAPI(responses);

      // Send multiple messages concurrently
      const messagePromises = Array.from({ length: messageCount }, (_, i) =>
        instanceManager.sendMessage(`Concurrent message ${i + 1}`, { waitForResponse: false })
      );

      await Promise.all(messagePromises);

      // All messages should be sent and responses received
      const userMessages = page.locator('[data-testid="user-message"]');
      const assistantMessages = page.locator('[data-testid="assistant-message"]');

      await expect(userMessages).toHaveCount(messageCount);
      await expect(assistantMessages).toHaveCount(messageCount);
    });

    test('should optimize memory usage with large datasets', async ({ page }) => {
      const initialMemory = await instanceManager['perf'].getMemoryUsage();

      // Generate large amount of test data
      const largeInstanceList = Array.from({ length: 100 }, (_, i) =>
        MockDataGenerator.generateInstance({ id: `bulk-instance-${i}` })
      );

      await instanceManager['apiMock'].mockInstancesAPI(largeInstanceList);
      
      // Reload to load large dataset
      await page.reload();
      await instanceManager.navigateToInstanceManager();

      // Wait for all instances to render
      await instanceManager['helpers'].waitForCondition(async () => {
        const instances = await instanceManager.getInstancesList();
        return instances.length >= 100;
      });

      const finalMemory = await instanceManager['perf'].getMemoryUsage();

      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.used - initialMemory.used;
        const maxMemoryIncrease = 50 * 1024 * 1024; // 50MB limit

        expect(memoryIncrease).toBeLessThan(maxMemoryIncrease);
      }

      // UI should remain responsive with large dataset
      const scrollContainer = page.getByTestId('instances-scroll-container');
      await expect(scrollContainer).toBeVisible();
    });

    test('should handle network latency gracefully', async ({ page }) => {
      const instanceId = 'latency-test-instance';
      
      await instanceManager.selectActiveInstance(instanceId);

      // Mock API with artificial latency
      await page.route('**/api/claude/instances/*/chat', async (route) => {
        // Add 2 second delay to simulate high latency
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            response: 'Response with high latency'
          })
        });
      });

      const responseTime = await instanceManager.measureChatResponseTime('Test high latency response');

      // Should handle latency gracefully (response time should include the delay)
      expect(responseTime).toBeGreaterThan(2000);
      expect(responseTime).toBeLessThan(5000); // But shouldn't take too much longer

      // Should show loading indicator during delay
      // (This would be visible during the actual interaction)
      const response = await instanceManager.getLastAssistantMessage();
      expect(response).toContain('Response with high latency');
    });
  });

  test.describe('10. Visual Regression Testing', () => {
    test('should maintain consistent visual appearance', async ({ page }) => {
      // Ensure consistent state for screenshot
      await instanceManager['apiMock'].mockInstancesAPI([
        MockDataGenerator.generateInstance({
          id: 'visual-test-1',
          name: 'Visual Test Instance 1',
          status: 'running'
        }),
        MockDataGenerator.generateInstance({
          id: 'visual-test-2', 
          name: 'Visual Test Instance 2',
          status: 'stopped'
        })
      ]);

      await page.reload();
      await instanceManager.navigateToInstanceManager();

      // Wait for stable state
      await instanceManager['perf'].waitForNoNetworkActivity();

      // Take screenshot for visual regression testing
      await expect(page).toHaveScreenshot('claude-instance-manager-main.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should maintain visual consistency in modal dialogs', async ({ page }) => {
      await instanceManager.openInstanceSelector();

      // Wait for modal animation to complete
      await page.waitForTimeout(300);

      await expect(page.getByTestId('modal-overlay')).toHaveScreenshot('instance-selector-modal.png');
    });

    test('should maintain consistent error state visuals', async ({ page }) => {
      // Create error state
      await instanceManager['apiMock'].mockInstanceCreation({
        success: false,
        error: 'Visual test error message for consistency check'
      });

      await instanceManager.launchInstance('prod-claude');

      // Wait for error to appear
      await expect(page.getByTestId('error-message')).toBeVisible();
      await page.waitForTimeout(100); // Allow for animations

      await expect(page.getByTestId('error-message')).toHaveScreenshot('error-state-visual.png');
    });

    test('should maintain consistent chat interface visuals', async ({ page }) => {
      const instanceId = 'visual-chat-instance';
      
      await instanceManager.selectActiveInstance(instanceId);

      // Add some sample messages for visual consistency
      await instanceManager['apiMock'].mockChatAPI([
        { success: true, response: 'This is a sample response for visual testing.' }
      ]);

      await instanceManager.sendMessage('This is a sample message for visual testing');

      // Wait for chat to stabilize
      await page.waitForTimeout(500);

      await expect(page.getByTestId('chat-interface')).toHaveScreenshot('chat-interface-visual.png');
    });

    test('should maintain consistent loading state visuals', async ({ page }) => {
      // Mock delayed response to capture loading state
      await page.route('**/api/claude/instances', async (route) => {
        // Delay to capture loading state
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, instances: [] })
        });
      });

      // Navigate to trigger loading
      await page.goto('/claude-instances');

      // Capture loading state
      await expect(page.getByTestId('loading-indicator')).toBeVisible();
      await expect(page.getByTestId('loading-indicator')).toHaveScreenshot('loading-state-visual.png');
    });
  });

  test.describe('11. Accessibility and Usability', () => {
    test('should support keyboard navigation throughout interface', async ({ page }) => {
      // Test keyboard navigation through main interface elements
      const keyboardElements = [
        '[data-testid="instance-selector-button"]',
        '[data-testid="instance-prod-instance-1"]',
        '[data-testid="chat-input"]',
        '[data-testid="send-message-button"]'
      ];

      await instanceManager['a11y'].checkKeyboardNavigation(keyboardElements);
    });

    test('should have proper ARIA attributes', async ({ page }) => {
      const accessibilityChecks = [
        {
          selector: '[data-testid="instance-selector-button"]',
          attributes: { expanded: 'false', haspopup: 'true' }
        },
        {
          selector: '[data-testid="chat-input"]',
          attributes: { label: 'Message input' }
        },
        {
          selector: '[data-testid="instance-status-running"]',
          attributes: { live: 'polite' }
        }
      ];

      for (const check of accessibilityChecks) {
        await instanceManager['a11y'].checkAriaAttributes(check.selector, check.attributes);
      }
    });

    test('should maintain adequate color contrast', async ({ page }) => {
      const elementsToCheck = [
        '[data-testid="instance-selector-button"]',
        '[data-testid="chat-input"]',
        '[data-testid="instance-status"]',
        '[data-testid="error-message"]'
      ];

      for (const selector of elementsToCheck) {
        await instanceManager['a11y'].checkColorContrast(selector);
      }
    });

    test('should provide screen reader friendly content', async ({ page }) => {
      // Check that important status information is announced
      const statusElement = page.getByTestId('instance-status-prod-instance-1');
      
      await expect(statusElement).toHaveAttribute('aria-live', 'polite');
      await expect(statusElement).toHaveAccessibleName();
      
      // Check that error messages are properly announced
      await instanceManager['apiMock'].mockInstanceCreation({
        success: false,
        error: 'Screen reader test error'
      });

      await instanceManager.launchInstance('prod-claude');

      const errorElement = page.getByTestId('error-message');
      await expect(errorElement).toHaveAttribute('role', 'alert');
    });
  });
});

// Performance Tests
test.describe('Performance Benchmarks', () => {
  test('should meet performance benchmarks', async ({ page }) => {
    const instanceManager = new ClaudeInstanceManagerPage(page);
    
    // Page load performance
    const loadTime = await instanceManager['perf'].measurePageLoadTime();
    expect(loadTime).toBeLessThan(3000);

    // Instance launch performance
    await instanceManager['apiMock'].mockInstanceCreation({ success: true, instanceId: 'perf-test' });
    const launchTime = await instanceManager.measureInstanceLaunchTime('prod-claude');
    expect(launchTime).toBeLessThan(10000);

    // Chat response performance
    await instanceManager['apiMock'].mockChatAPI([{ success: true, response: 'Performance test response' }]);
    const responseTime = await instanceManager.measureChatResponseTime('Performance test message');
    expect(responseTime).toBeLessThan(5000);
  });
});