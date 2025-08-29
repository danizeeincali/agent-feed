import { Page, Locator, expect } from '@playwright/test';
import { InstanceTestData, mockAPIResponses, apiEndpoints, testUtils } from '../fixtures/test-data';

/**
 * Page Object Model for Claude Instance Manager
 * Provides methods for interacting with the instance management UI
 */
export class InstanceManagerPage {
  private page: Page;
  
  // Main UI elements
  readonly instancesContainer: Locator;
  readonly createInstanceButton: Locator;
  readonly refreshButton: Locator;
  readonly loadingIndicator: Locator;
  readonly errorMessage: Locator;
  readonly emptyState: Locator;

  // Instance list elements
  readonly instanceCards: Locator;
  readonly instanceNames: Locator;
  readonly instanceStatuses: Locator;
  readonly instanceActions: Locator;

  // Create instance modal elements
  readonly createModal: Locator;
  readonly instanceNameInput: Locator;
  readonly instanceTypeSelect: Locator;
  readonly createConfirmButton: Locator;
  readonly createCancelButton: Locator;

  // Instance detail modal elements
  readonly detailModal: Locator;
  readonly detailInstanceName: Locator;
  readonly detailInstanceStatus: Locator;
  readonly detailInstancePid: Locator;
  readonly detailInstanceUptime: Locator;
  readonly terminalContainer: Locator;
  readonly terminalOutput: Locator;
  readonly terminalInput: Locator;
  readonly connectTerminalButton: Locator;
  readonly disconnectTerminalButton: Locator;

  // Action buttons
  readonly startButton: Locator;
  readonly stopButton: Locator;
  readonly restartButton: Locator;
  readonly deleteButton: Locator;
  readonly viewDetailsButton: Locator;

  // Status indicators
  readonly runningIndicator: Locator;
  readonly stoppedIndicator: Locator;
  readonly errorIndicator: Locator;
  readonly startingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Main UI elements
    this.instancesContainer = page.locator('[data-testid="instances-container"]');
    this.createInstanceButton = page.locator('[data-testid="create-instance-button"]');
    this.refreshButton = page.locator('[data-testid="refresh-instances-button"]');
    this.loadingIndicator = page.locator('[data-testid="loading-indicator"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.emptyState = page.locator('[data-testid="empty-state"]');

    // Instance list elements
    this.instanceCards = page.locator('[data-testid="instance-card"]');
    this.instanceNames = page.locator('[data-testid="instance-name"]');
    this.instanceStatuses = page.locator('[data-testid="instance-status"]');
    this.instanceActions = page.locator('[data-testid="instance-actions"]');

    // Create instance modal
    this.createModal = page.locator('[data-testid="create-instance-modal"]');
    this.instanceNameInput = page.locator('[data-testid="instance-name-input"]');
    this.instanceTypeSelect = page.locator('[data-testid="instance-type-select"]');
    this.createConfirmButton = page.locator('[data-testid="create-confirm-button"]');
    this.createCancelButton = page.locator('[data-testid="create-cancel-button"]');

    // Instance detail modal
    this.detailModal = page.locator('[data-testid="instance-detail-modal"]');
    this.detailInstanceName = page.locator('[data-testid="detail-instance-name"]');
    this.detailInstanceStatus = page.locator('[data-testid="detail-instance-status"]');
    this.detailInstancePid = page.locator('[data-testid="detail-instance-pid"]');
    this.detailInstanceUptime = page.locator('[data-testid="detail-instance-uptime"]');
    this.terminalContainer = page.locator('[data-testid="terminal-container"]');
    this.terminalOutput = page.locator('[data-testid="terminal-output"]');
    this.terminalInput = page.locator('[data-testid="terminal-input"]');
    this.connectTerminalButton = page.locator('[data-testid="connect-terminal-button"]');
    this.disconnectTerminalButton = page.locator('[data-testid="disconnect-terminal-button"]');

    // Action buttons (can be in different contexts)
    this.startButton = page.locator('[data-testid*="start-button"]');
    this.stopButton = page.locator('[data-testid*="stop-button"]');
    this.restartButton = page.locator('[data-testid*="restart-button"]');
    this.deleteButton = page.locator('[data-testid*="delete-button"]');
    this.viewDetailsButton = page.locator('[data-testid*="view-details-button"]');

    // Status indicators
    this.runningIndicator = page.locator('[data-status="running"]');
    this.stoppedIndicator = page.locator('[data-status="stopped"]');
    this.errorIndicator = page.locator('[data-status="error"]');
    this.startingIndicator = page.locator('[data-status="starting"]');
  }

  // Navigation methods
  async navigate() {
    await this.page.goto('/instances');
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    // Wait for the main container to be visible
    await expect(this.instancesContainer).toBeVisible();
    
    // Wait for loading to complete (either instances load or error appears)
    await this.page.waitForFunction(() => {
      const loading = document.querySelector('[data-testid="loading-indicator"]');
      return !loading || loading.getAttribute('style')?.includes('display: none');
    }, { timeout: 30000 });
  }

  // Instance listing methods
  async waitForInstancesToLoad() {
    // Wait for either instances to appear or empty state
    await this.page.waitForFunction(() => {
      const instances = document.querySelectorAll('[data-testid="instance-card"]');
      const emptyState = document.querySelector('[data-testid="empty-state"]');
      const errorMessage = document.querySelector('[data-testid="error-message"]');
      
      return instances.length > 0 || emptyState || errorMessage;
    }, { timeout: 30000 });
  }

  async getInstanceCount() {
    await this.waitForInstancesToLoad();
    return await this.instanceCards.count();
  }

  async getInstanceNames() {
    await this.waitForInstancesToLoad();
    return await this.instanceNames.allTextContents();
  }

  async getInstanceStatuses() {
    await this.waitForInstancesToLoad();
    return await this.instanceStatuses.allTextContents();
  }

  async findInstanceByName(name: string) {
    await this.waitForInstancesToLoad();
    return this.instanceCards.filter({ hasText: name }).first();
  }

  async getInstanceStatus(name: string) {
    const instanceCard = await this.findInstanceByName(name);
    const statusElement = instanceCard.locator('[data-testid="instance-status"]');
    return await statusElement.textContent();
  }

  // Instance creation methods
  async openCreateInstanceModal() {
    await this.createInstanceButton.click();
    await expect(this.createModal).toBeVisible();
  }

  async createInstance(name: string, type: string) {
    await this.openCreateInstanceModal();
    
    // Fill in instance details
    await this.instanceNameInput.fill(name);
    await this.instanceTypeSelect.selectOption({ value: type });
    
    // Submit creation
    await this.createConfirmButton.click();
    
    // Wait for modal to close
    await expect(this.createModal).toBeHidden();
    
    // Wait for instance to appear in list
    await this.waitForInstanceToAppear(name);
  }

  async waitForInstanceToAppear(name: string) {
    await expect(async () => {
      await this.refreshInstances();
      const instanceCard = await this.findInstanceByName(name);
      await expect(instanceCard).toBeVisible();
    }).toPass({ timeout: 30000, intervals: [1000] });
  }

  // Instance management methods
  async startInstance(name: string) {
    const instanceCard = await this.findInstanceByName(name);
    const startBtn = instanceCard.locator('[data-testid*="start-button"]');
    await startBtn.click();
    
    // Wait for status to change
    await this.waitForInstanceStatus(name, 'running');
  }

  async stopInstance(name: string) {
    const instanceCard = await this.findInstanceByName(name);
    const stopBtn = instanceCard.locator('[data-testid*="stop-button"]');
    await stopBtn.click();
    
    // Wait for status to change
    await this.waitForInstanceStatus(name, 'stopped');
  }

  async restartInstance(name: string) {
    const instanceCard = await this.findInstanceByName(name);
    const restartBtn = instanceCard.locator('[data-testid*="restart-button"]');
    await restartBtn.click();
    
    // Wait for status to change back to running
    await this.waitForInstanceStatus(name, 'running');
  }

  async deleteInstance(name: string) {
    const instanceCard = await this.findInstanceByName(name);
    const deleteBtn = instanceCard.locator('[data-testid*="delete-button"]');
    await deleteBtn.click();
    
    // Handle confirmation dialog if it appears
    const confirmDialog = this.page.locator('[data-testid="confirm-delete-dialog"]');
    if (await confirmDialog.isVisible()) {
      const confirmBtn = this.page.locator('[data-testid="confirm-delete-button"]');
      await confirmBtn.click();
    }
    
    // Wait for instance to disappear
    await this.waitForInstanceToDisappear(name);
  }

  async waitForInstanceStatus(name: string, expectedStatus: string) {
    await expect(async () => {
      const status = await this.getInstanceStatus(name);
      expect(status?.toLowerCase()).toBe(expectedStatus.toLowerCase());
    }).toPass({ timeout: 30000, intervals: [1000] });
  }

  async waitForInstanceToDisappear(name: string) {
    await expect(async () => {
      const instanceCard = this.page.locator(`[data-testid="instance-card"]:has-text("${name}")`);
      await expect(instanceCard).toHaveCount(0);
    }).toPass({ timeout: 30000, intervals: [1000] });
  }

  // Terminal methods
  async openInstanceTerminal(name: string) {
    const instanceCard = await this.findInstanceByName(name);
    const detailsBtn = instanceCard.locator('[data-testid*="view-details-button"]');
    await detailsBtn.click();
    
    await expect(this.detailModal).toBeVisible();
  }

  async connectToTerminal() {
    await this.connectTerminalButton.click();
    
    // Wait for connection indicator
    await expect(this.disconnectTerminalButton).toBeVisible();
  }

  async disconnectFromTerminal() {
    if (await this.disconnectTerminalButton.isVisible()) {
      await this.disconnectTerminalButton.click();
      await expect(this.connectTerminalButton).toBeVisible();
    }
  }

  async sendTerminalCommand(command: string) {
    await this.terminalInput.fill(command);
    await this.terminalInput.press('Enter');
  }

  async getTerminalOutput() {
    return await this.terminalOutput.textContent();
  }

  async waitForTerminalOutput(expectedOutput: string, timeout: number = 10000) {
    await expect(async () => {
      const output = await this.getTerminalOutput();
      expect(output).toContain(expectedOutput);
    }).toPass({ timeout, intervals: [500] });
  }

  // Utility methods
  async refreshInstances() {
    await this.refreshButton.click();
    await this.waitForInstancesToLoad();
  }

  async isErrorDisplayed() {
    return await this.errorMessage.isVisible();
  }

  async getErrorMessage() {
    if (await this.isErrorDisplayed()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  async isEmptyStateDisplayed() {
    return await this.emptyState.isVisible();
  }

  async isLoadingDisplayed() {
    return await this.loadingIndicator.isVisible();
  }

  // Mock API interaction methods
  async mockInstancesAPI(response: any) {
    await this.page.route(apiEndpoints.instances.list, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  async mockInstanceCreationAPI(response: any) {
    await this.page.route(apiEndpoints.instances.create, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  async mockNetworkError() {
    await this.page.route(apiEndpoints.instances.list, async route => {
      await route.abort('failed');
    });
  }

  async mockServerError() {
    await this.page.route(apiEndpoints.instances.list, async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify(mockAPIResponses.error('Server error'))
      });
    });
  }

  // SSE testing methods
  async mockSSEConnection(instanceId: string, messages: any[] = []) {
    // Mock the SSE endpoint
    await this.page.route(apiEndpoints.terminal.stream(instanceId), async route => {
      // Return a Server-Sent Events stream
      const headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      };

      // Create mock SSE stream
      let body = '';
      for (const message of messages) {
        body += `data: ${JSON.stringify(message)}\n\n`;
      }

      await route.fulfill({
        status: 200,
        headers,
        body
      });
    });
  }

  // Performance testing methods
  async measurePageLoadTime() {
    const startTime = Date.now();
    await this.navigate();
    const endTime = Date.now();
    return endTime - startTime;
  }

  async measureInstanceCreationTime(name: string, type: string) {
    const startTime = Date.now();
    await this.createInstance(name, type);
    const endTime = Date.now();
    return endTime - startTime;
  }

  async measureSSEConnectionTime(instanceId: string) {
    const startTime = Date.now();
    await this.connectToTerminal();
    // Wait for first message
    await this.page.waitForFunction(() => {
      const output = document.querySelector('[data-testid="terminal-output"]');
      return output && output.textContent && output.textContent.length > 0;
    }, { timeout: 30000 });
    const endTime = Date.now();
    return endTime - startTime;
  }

  // Cleanup methods
  async cleanupInstances() {
    const instanceNames = await this.getInstanceNames();
    
    for (const name of instanceNames) {
      if (name.startsWith('Test ') || name.includes('test-')) {
        try {
          await this.deleteInstance(name);
        } catch (error) {
          console.log(`Failed to cleanup instance ${name}:`, error);
        }
      }
    }
  }

  async closeAllModals() {
    // Close create modal if open
    if (await this.createModal.isVisible()) {
      await this.createCancelButton.click();
    }

    // Close detail modal if open
    if (await this.detailModal.isVisible()) {
      await this.page.keyboard.press('Escape');
    }
  }
}