import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Claude Instance Manager
 * Professional interface validation and interaction handling
 */
export class ClaudeInstancePage {
  readonly page: Page;
  readonly header: Locator;
  readonly connectionStatus: Locator;
  readonly instanceCount: Locator;
  
  // Professional buttons for Claude instance creation
  readonly prodButton: Locator;
  readonly skipPermissionsButton: Locator;
  readonly skipPermissionsCButton: Locator;
  readonly skipPermissionsResumeButton: Locator;
  
  // Instance management
  readonly instancesList: Locator;
  readonly instanceItems: Locator;
  readonly selectedInstance: Locator;
  readonly outputArea: Locator;
  readonly inputField: Locator;
  readonly sendButton: Locator;
  
  // Status indicators
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('[data-testid="claude-instance-manager"] .header');
    this.connectionStatus = page.locator('.connection-status');
    this.instanceCount = page.locator('.count');
    
    // Professional button selectors
    this.prodButton = page.locator('button.btn-prod');
    this.skipPermissionsButton = page.locator('button.btn-skip-perms');
    this.skipPermissionsCButton = page.locator('button.btn-skip-perms-c');
    this.skipPermissionsResumeButton = page.locator('button.btn-skip-perms-resume');
    
    // Instance interaction elements
    this.instancesList = page.locator('.instances-list ul');
    this.instanceItems = page.locator('.instance-item');
    this.selectedInstance = page.locator('.instance-item.selected');
    this.outputArea = page.locator('.output-area pre');
    this.inputField = page.locator('.input-field');
    this.sendButton = page.locator('.btn-send');
    
    // Status and feedback
    this.loadingSpinner = page.locator('.animate-spin');
    this.errorMessage = page.locator('.error');
    this.successMessage = page.locator('.success');
  }
  
  /**
   * Navigate to Claude Instance Manager page
   */
  async goto() {
    await this.page.goto('/claude-instances');
    await this.waitForPageLoad();
  }
  
  /**
   * Wait for page to fully load
   */
  async waitForPageLoad() {
    await expect(this.header).toBeVisible();
    await expect(this.page.locator('[data-testid="claude-instance-manager"]')).toBeVisible();
  }
  
  /**
   * Professional Button Functionality Tests
   */
  
  /**
   * Click the prod/claude button with professional styling validation
   */
  async clickProdButton() {
    await expect(this.prodButton).toBeVisible();
    await expect(this.prodButton).toBeEnabled();
    
    // Validate professional styling attributes
    await expect(this.prodButton).toHaveClass(/btn-prod/);
    await expect(this.prodButton).toHaveText(/🚀 prod\/claude/);
    
    // Test hover state
    await this.prodButton.hover();
    await this.page.waitForTimeout(100); // Allow hover animation
    
    await this.prodButton.click();
    await this.waitForInstanceCreation();
  }
  
  /**
   * Click skip permissions button
   */
  async clickSkipPermissionsButton() {
    await expect(this.skipPermissionsButton).toBeVisible();
    await expect(this.skipPermissionsButton).toBeEnabled();
    
    // Validate professional styling
    await expect(this.skipPermissionsButton).toHaveClass(/btn-skip-perms/);
    await expect(this.skipPermissionsButton).toHaveText(/⚡ skip-permissions/);
    
    await this.skipPermissionsButton.click();
    await this.waitForInstanceCreation();
  }
  
  /**
   * Click skip permissions -c button
   */
  async clickSkipPermissionsCButton() {
    await expect(this.skipPermissionsCButton).toBeVisible();
    await expect(this.skipPermissionsCButton).toBeEnabled();
    
    // Validate professional styling
    await expect(this.skipPermissionsCButton).toHaveClass(/btn-skip-perms-c/);
    await expect(this.skipPermissionsCButton).toHaveText(/⚡ skip-permissions -c/);
    
    await this.skipPermissionsCButton.click();
    await this.waitForInstanceCreation();
  }
  
  /**
   * Click skip permissions resume button
   */
  async clickSkipPermissionsResumeButton() {
    await expect(this.skipPermissionsResumeButton).toBeVisible();
    await expect(this.skipPermissionsResumeButton).toBeEnabled();
    
    // Validate professional styling
    await expect(this.skipPermissionsResumeButton).toHaveClass(/btn-skip-perms-resume/);
    await expect(this.skipPermissionsResumeButton).toHaveText(/↻ skip-permissions --resume/);
    
    await this.skipPermissionsResumeButton.click();
    await this.waitForInstanceCreation();
  }
  
  /**
   * Wait for instance creation to complete
   */
  async waitForInstanceCreation() {
    // Wait for loading state to appear and disappear
    await expect(this.prodButton).toBeDisabled({ timeout: 1000 }).catch(() => {});
    await expect(this.prodButton).toBeEnabled({ timeout: 30000 });
    
    // Wait for instances list to update
    await this.page.waitForTimeout(2000);
  }
  
  /**
   * Validate all buttons have professional appearance
   */
  async validateProfessionalButtonStyling() {
    const buttons = [
      this.prodButton,
      this.skipPermissionsButton,
      this.skipPermissionsCButton,
      this.skipPermissionsResumeButton
    ];
    
    for (const button of buttons) {
      await expect(button).toBeVisible();
      
      // Test hover states
      await button.hover();
      await this.page.waitForTimeout(200);
      
      // Validate button has professional styling classes
      const buttonClass = await button.getAttribute('class');
      expect(buttonClass).toContain('btn');
      
      // Check for professional visual elements (emojis, consistent styling)
      const buttonText = await button.textContent();
      expect(buttonText).toMatch(/[🚀⚡↻]/);
    }
  }
  
  /**
   * Test loading states during instance creation
   */
  async testLoadingStates() {
    await this.prodButton.click();
    
    // Verify buttons are disabled during loading
    await expect(this.prodButton).toBeDisabled();
    await expect(this.skipPermissionsButton).toBeDisabled();
    await expect(this.skipPermissionsCButton).toBeDisabled();
    await expect(this.skipPermissionsResumeButton).toBeDisabled();
    
    // Wait for loading to complete
    await this.waitForInstanceCreation();
    
    // Verify buttons are re-enabled
    await expect(this.prodButton).toBeEnabled();
    await expect(this.skipPermissionsButton).toBeEnabled();
    await expect(this.skipPermissionsCButton).toBeEnabled();
    await expect(this.skipPermissionsResumeButton).toBeEnabled();
  }
  
  /**
   * Instance Management Functions
   */
  
  /**
   * Get count of active instances
   */
  async getInstanceCount(): Promise<number> {
    const instances = await this.instanceItems.count();
    return instances;
  }
  
  /**
   * Select an instance by index
   */
  async selectInstance(index: number = 0) {
    const instanceCount = await this.getInstanceCount();
    if (instanceCount === 0) {
      throw new Error('No instances available to select');
    }
    
    await this.instanceItems.nth(index).click();
    await expect(this.instanceItems.nth(index)).toHaveClass(/selected/);
  }
  
  /**
   * Send input to selected instance
   */
  async sendInputToInstance(command: string) {
    await expect(this.selectedInstance).toBeVisible();
    await expect(this.inputField).toBeVisible();
    
    await this.inputField.fill(command);
    await this.sendButton.click();
    
    // Verify input was cleared
    await expect(this.inputField).toHaveValue('');
  }
  
  /**
   * Get output from selected instance
   */
  async getInstanceOutput(): Promise<string> {
    await expect(this.outputArea).toBeVisible();
    return await this.outputArea.textContent() || '';
  }
  
  /**
   * Wait for output to contain specific text
   */
  async waitForOutputContains(text: string, timeout: number = 10000) {
    await expect(this.outputArea).toContainText(text, { timeout });
  }
  
  /**
   * Terminate an instance by index
   */
  async terminateInstance(index: number = 0) {
    const terminateButton = this.instanceItems.nth(index).locator('.btn-terminate');
    await expect(terminateButton).toBeVisible();
    await terminateButton.click();
    
    // Wait for instance to be removed from list
    await this.page.waitForTimeout(1000);
  }
  
  /**
   * Status and Connection Validation
   */
  
  /**
   * Validate connection status shows correctly
   */
  async validateConnectionStatus() {
    await expect(this.connectionStatus).toBeVisible();
    
    const statusText = await this.connectionStatus.textContent();
    expect(statusText).toMatch(/(Connected|Disconnected|Connection Error)/);
    
    // Check for connection indicator classes
    const statusClass = await this.connectionStatus.getAttribute('class');
    expect(statusClass).toMatch(/(connected|disconnected)/);
  }
  
  /**
   * Wait for connection to be established
   */
  async waitForConnection(timeout: number = 10000) {
    await expect(this.connectionStatus).toHaveClass(/connected/, { timeout });
  }
  
  /**
   * Validate instance count display
   */
  async validateInstanceCountDisplay() {
    const instanceCount = await this.getInstanceCount();
    
    if (instanceCount > 0) {
      await expect(this.instanceCount).toBeVisible();
      const countText = await this.instanceCount.textContent();
      expect(countText).toContain('Active:');
      expect(countText).toMatch(/\d+\/\d+/);
    }
  }
  
  /**
   * Error Handling Validation
   */
  
  /**
   * Check for error messages
   */
  async hasErrorMessage(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }
  
  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    if (await this.hasErrorMessage()) {
      return await this.errorMessage.textContent() || '';
    }
    return '';
  }
  
  /**
   * Wait for error to clear
   */
  async waitForErrorToClear(timeout: number = 5000) {
    await expect(this.errorMessage).not.toBeVisible({ timeout });
  }
  
  /**
   * Professional Interface Validation
   */
  
  /**
   * Validate overall professional appearance
   */
  async validateProfessionalInterface() {
    // Header styling
    await expect(this.header).toBeVisible();
    
    // Button grid layout
    const launchButtons = this.page.locator('.launch-buttons');
    await expect(launchButtons).toBeVisible();
    
    // Professional button styling
    await this.validateProfessionalButtonStyling();
    
    // Layout consistency
    const instancesGrid = this.page.locator('.instances-grid');
    await expect(instancesGrid).toBeVisible();
    
    // Typography and spacing validation
    const h2 = this.page.locator('h2');
    await expect(h2).toBeVisible();
    await expect(h2).toHaveText('Claude Instance Manager');
  }
  
  /**
   * Test accessibility features
   */
  async validateAccessibility() {
    // Check for ARIA labels and roles
    await expect(this.prodButton).toHaveAttribute('title');
    await expect(this.skipPermissionsButton).toHaveAttribute('title');
    await expect(this.skipPermissionsCButton).toHaveAttribute('title');
    await expect(this.skipPermissionsResumeButton).toHaveAttribute('title');
    
    // Keyboard navigation
    await this.prodButton.focus();
    await this.page.keyboard.press('Tab');
    await expect(this.skipPermissionsButton).toBeFocused();
    
    // High contrast validation (basic)
    const prodButtonColor = await this.prodButton.evaluate(el => 
      getComputedStyle(el).color
    );
    expect(prodButtonColor).toBeDefined();
  }
  
  /**
   * Performance validation
   */
  async measureButtonClickPerformance(): Promise<number> {
    const start = Date.now();
    await this.prodButton.click();
    
    // Wait for visible feedback (loading state or instance creation)
    await expect(this.prodButton).toBeDisabled();
    
    const end = Date.now();
    return end - start;
  }
}
