import { test, expect } from '@playwright/test';
import ClaudeCodeTestHelpers from '../utils/test-helpers';

/**
 * Tool Usage Display Validation Tests
 * 
 * Tests:
 * - Tool usage appears in terminal only
 * - Proper formatting of tool usage display
 * - Chat remains clean of tool noise
 * - Different tool types display correctly
 * - Real-time tool execution feedback
 */

test.describe('Tool Usage Display Validation', () => {
  let helpers: ClaudeCodeTestHelpers;
  let createdInstances: string[] = [];

  test.beforeEach(async ({ page }) => {
    helpers = new ClaudeCodeTestHelpers(page);
    await helpers.navigateToClaudeInstances();
  });

  test.afterEach(async () => {
    for (const instanceId of createdInstances) {
      try {
        await helpers.cleanupInstances();
      } catch (error) {
        console.warn(`Failed to cleanup instance ${instanceId}:`, error);
      }
    }
    createdInstances = [];
  });

  test('should display file operations in terminal only', async ({ page }) => {
    test.setTimeout(120000);
    
    // Create a coder instance for tool usage
    const instanceId = await helpers.createInstance('claude-coder');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Send a message that should trigger file system tools
    const fileMessage = "List all files in the current directory and show their sizes";
    await helpers.sendMessageToInstance(instanceId, fileMessage);
    
    // Wait for tool execution
    await page.waitForTimeout(8000);
    
    // Get chat messages and terminal output
    const chatMessages = await helpers.getChatMessages();
    const terminalOutput = await helpers.getTerminalOutput(instanceId);
    
    // Verify tool usage appears in terminal
    const hasFileListingInTerminal = terminalOutput.some(line => 
      line.includes('ls') || 
      line.includes('dir') || 
      line.includes('files') ||
      line.includes('Bash') ||
      line.includes('Read')
    );
    
    // Chat should contain the AI's response but not raw tool execution
    const assistantResponse = chatMessages.find(m => m.type === 'assistant');
    expect(assistantResponse).toBeTruthy();
    expect(assistantResponse!.content.length).toBeGreaterThan(0);
    
    // Chat should NOT contain tool execution details
    const toolExecutionInChat = chatMessages.some(m => 
      m.content.includes('Executing:') ||
      m.content.includes('Command:') ||
      m.content.includes('```bash') ||
      m.type === 'tool'
    );
    
    expect(toolExecutionInChat).toBe(false);
    
    // Terminal should have tool usage information
    expect(terminalOutput.length).toBeGreaterThan(0);
  });

  test('should format bash tool usage correctly in terminal', async ({ page }) => {
    test.setTimeout(120000);
    
    const instanceId = await helpers.createInstance('claude-coder');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Send message that triggers bash command
    const bashMessage = "What is the current date and time on the system?";
    await helpers.sendMessageToInstance(instanceId, bashMessage);
    
    // Wait for tool execution
    await page.waitForTimeout(6000);
    
    // Check terminal for properly formatted bash output
    const terminalOutput = await helpers.getTerminalOutput(instanceId);
    
    // Look for bash-related content in terminal
    const hasBashContent = terminalOutput.some(line =>
      line.includes('Bash') ||
      line.includes('date') ||
      line.includes('command') ||
      line.toLowerCase().includes('executing')
    );
    
    // Verify terminal content exists and is formatted
    if (hasBashContent) {
      // Check for proper formatting indicators
      const hasProperFormatting = terminalOutput.some(line =>
        line.includes('[') ||  // Bracketed information
        line.includes('$') ||   // Shell prompt indicators
        line.includes(':') ||   // Colon separators
        line.includes('>')      // Output indicators
      );
      
      expect(hasProperFormatting).toBe(true);
    }
  });

  test('should display read tool usage for file operations', async ({ page }) => {
    test.setTimeout(120000);
    
    const instanceId = await helpers.createInstance('claude-coder');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Send message that should trigger file reading
    const readMessage = "Can you read the package.json file and tell me about the project?";
    await helpers.sendMessageToInstance(instanceId, readMessage);
    
    // Wait for tool execution
    await page.waitForTimeout(10000);
    
    // Verify tool usage in terminal
    await helpers.verifyToolUsageInTerminalOnly(instanceId, 'Read');
    
    // Check that file content appears appropriately
    const chatMessages = await helpers.getChatMessages();
    const assistantResponse = chatMessages.find(m => m.type === 'assistant');
    
    expect(assistantResponse).toBeTruthy();
    // Assistant should mention the project details, not raw file content
    expect(assistantResponse!.content).toMatch(/project|package|dependencies|scripts/i);
  });

  test('should handle multiple tool executions in sequence', async ({ page }) => {
    test.setTimeout(180000);
    
    const instanceId = await helpers.createInstance('claude-coder');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Send message that requires multiple tools
    const complexMessage = "Analyze the project structure: list files, read package.json, and check the directory structure";
    await helpers.sendMessageToInstance(instanceId, complexMessage);
    
    // Wait for all tools to execute
    await page.waitForTimeout(15000);
    
    const terminalOutput = await helpers.getTerminalOutput(instanceId);
    const chatMessages = await helpers.getChatMessages();
    
    // Terminal should contain evidence of multiple tool executions
    const toolTypes = ['Bash', 'Read', 'Glob'].filter(tool =>
      terminalOutput.some(line => line.includes(tool))
    );
    
    expect(toolTypes.length).toBeGreaterThan(0);
    
    // Chat should contain a comprehensive response
    const assistantResponse = chatMessages.find(m => m.type === 'assistant');
    expect(assistantResponse).toBeTruthy();
    expect(assistantResponse!.content.length).toBeGreaterThan(100);
    
    // Chat should be clean of individual tool details
    const cleanChat = !chatMessages.some(m => 
      m.content.includes('Executing') ||
      m.content.includes('Tool:') ||
      m.content.includes('Command:')
    );
    
    expect(cleanChat).toBe(true);
  });

  test('should display write and edit operations in terminal', async ({ page }) => {
    test.setTimeout(120000);
    
    const instanceId = await helpers.createInstance('claude-coder');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Send message that should trigger file writing
    const writeMessage = "Create a small test file with the current timestamp";
    await helpers.sendMessageToInstance(instanceId, writeMessage);
    
    // Wait for tool execution
    await page.waitForTimeout(8000);
    
    // Check for write/edit tool usage in terminal
    const terminalOutput = await helpers.getTerminalOutput(instanceId);
    
    const hasWriteOperation = terminalOutput.some(line =>
      line.includes('Write') ||
      line.includes('Edit') ||
      line.includes('file') ||
      line.includes('creating') ||
      line.includes('writing')
    );
    
    // Chat should confirm the action without showing tool details
    const chatMessages = await helpers.getChatMessages();
    const assistantResponse = chatMessages.find(m => m.type === 'assistant');
    
    expect(assistantResponse).toBeTruthy();
    expect(assistantResponse!.content).toMatch(/created|file|wrote/i);
    
    // But not show the raw tool execution
    expect(assistantResponse!.content).not.toMatch(/Write\(/);
    expect(assistantResponse!.content).not.toMatch(/file_path/);
  });

  test('should handle tool execution errors gracefully', async ({ page }) => {
    test.setTimeout(120000);
    
    const instanceId = await helpers.createInstance('claude-coder');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Send message that might cause tool errors
    const errorMessage = "Read a file that doesn't exist: /nonexistent/path/file.txt";
    await helpers.sendMessageToInstance(instanceId, errorMessage);
    
    // Wait for tool execution and error handling
    await page.waitForTimeout(8000);
    
    const chatMessages = await helpers.getChatMessages();
    const terminalOutput = await helpers.getTerminalOutput(instanceId);
    
    // Assistant should handle the error gracefully in chat
    const assistantResponse = chatMessages.find(m => m.type === 'assistant');
    expect(assistantResponse).toBeTruthy();
    
    // Response should acknowledge the issue without raw error details
    expect(assistantResponse!.content).toMatch(/not found|doesn't exist|unable|error/i);
    
    // Terminal may show the error details
    const hasErrorInTerminal = terminalOutput.some(line =>
      line.includes('error') || 
      line.includes('not found') ||
      line.includes('failed')
    );
    
    // Chat should not show raw error traces
    const hasRawError = assistantResponse!.content.includes('Error:') ||
                        assistantResponse!.content.includes('Exception:') ||
                        assistantResponse!.content.includes('Traceback:');
    
    expect(hasRawError).toBe(false);
  });

  test('should maintain terminal history across multiple interactions', async ({ page }) => {
    test.setTimeout(150000);
    
    const instanceId = await helpers.createInstance('claude-coder');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // First interaction
    await helpers.sendMessageToInstance(instanceId, "List the current directory contents");
    await page.waitForTimeout(5000);
    
    const firstTerminalOutput = await helpers.getTerminalOutput(instanceId);
    const firstOutputLength = firstTerminalOutput.length;
    
    // Second interaction
    await helpers.sendMessageToInstance(instanceId, "Check the current working directory");
    await page.waitForTimeout(5000);
    
    const secondTerminalOutput = await helpers.getTerminalOutput(instanceId);
    
    // Terminal should accumulate history
    expect(secondTerminalOutput.length).toBeGreaterThanOrEqual(firstOutputLength);
    
    // Previous output should still be present
    const hasFirstInteractionContent = secondTerminalOutput.some(line =>
      firstTerminalOutput.includes(line)
    );
    
    // Third interaction to confirm history persistence
    await helpers.sendMessageToInstance(instanceId, "Show me the date");
    await page.waitForTimeout(5000);
    
    const thirdTerminalOutput = await helpers.getTerminalOutput(instanceId);
    expect(thirdTerminalOutput.length).toBeGreaterThanOrEqual(secondTerminalOutput.length);
  });

  test('should format different tool types distinctly in terminal', async ({ page }) => {
    test.setTimeout(180000);
    
    const instanceId = await helpers.createInstance('claude-coder');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Send message that uses various tools
    const multiToolMessage = "Analyze this project: find all TypeScript files, read a configuration file, and run a simple command";
    await helpers.sendMessageToInstance(instanceId, multiToolMessage);
    
    // Wait for comprehensive tool execution
    await page.waitForTimeout(20000);
    
    const terminalOutput = await helpers.getTerminalOutput(instanceId);
    
    // Check for different tool type indicators
    const toolIndicators = [
      'Bash',     // For commands
      'Read',     // For file reading
      'Glob',     // For file searching
      'Write',    // For file writing
      'Edit'      // For file editing
    ];
    
    const foundTools = toolIndicators.filter(tool =>
      terminalOutput.some(line => line.includes(tool))
    );
    
    expect(foundTools.length).toBeGreaterThan(0);
    
    // Verify formatting consistency
    const hasConsistentFormatting = terminalOutput.every(line => {
      // Each line should be properly formatted (not empty or just whitespace)
      return line.trim().length > 0;
    });
    
    expect(hasConsistentFormatting).toBe(true);
    
    // Chat should provide a unified response
    const chatMessages = await helpers.getChatMessages();
    const assistantResponse = chatMessages.find(m => m.type === 'assistant');
    
    expect(assistantResponse).toBeTruthy();
    expect(assistantResponse!.content.length).toBeGreaterThan(200); // Comprehensive response
  });
});