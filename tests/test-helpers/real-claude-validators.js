/**
 * Real Claude Process Validation Helpers
 * 
 * Utility functions for validating real Claude behavior vs mock responses
 * in E2E tests. Helps identify when frontend is showing mock data instead
 * of real Claude process output.
 */

const CLAUDE_CLI_PATH = '/home/codespace/nvm/current/bin/claude';
const REAL_CLAUDE_WORKING_DIR = '/workspaces/agent-feed/prod';
const BACKEND_URL = 'http://localhost:3000';

/**
 * Patterns that indicate MOCK/FAKE responses (should NEVER appear)
 */
const FORBIDDEN_MOCK_PATTERNS = [
  // Exact mock response strings
  /\[RESPONSE\]\s*Claude Code session started/,
  /Mock Claude response/,
  /Simulated.*output/,
  /TEST_OUTPUT/,
  /MOCK_DATA/,
  /Hardcoded.*response/,
  
  // Generic placeholder patterns
  /Working directory:\s*\/workspaces\/agent-feed\s*$/,  // Without real path resolution
  /Connected to instance undefined/,
  /Instance.*undefined/,
  /PID:\s*undefined/,
  /Status:\s*undefined/,
  
  // Development/debug patterns
  /console\.log/,
  /DEBUG:/,
  /PLACEHOLDER/
];

/**
 * Patterns that indicate REAL Claude is running
 */
const REAL_CLAUDE_INDICATORS = [
  // Real Claude CLI output patterns
  /Claude Code/,
  /Hello.*I'm Claude/,
  /How can I help.*you/,
  /I'm Claude.*AI assistant/,
  /Working.*directory.*\/workspaces\/agent-feed\/(prod|frontend|tests)/,
  
  // Real shell/system patterns
  /^\$\s/m,  // Shell prompt
  /^\w+@\w+:/m,  // User@hostname prompt
  /drwx|lrwx|-rwx/,  // File permissions from ls command
  /total \d+/,  // ls command output
  
  // Real process indicators
  /PID:\s*\d{4,}/,  // Real process ID (4+ digits)
  /claude-\d{13}-[a-z0-9]{9}/,  // Real instance ID format
  /Process spawned successfully/
];

/**
 * Real Claude Process Validators
 */
class RealClaudeValidators {
  
  /**
   * Validate that output contains NO mock/hardcoded responses
   * @param {string} output - Terminal output to validate
   * @throws {Error} If mock patterns are found
   */
  static validateNoMockResponses(output) {
    for (const pattern of FORBIDDEN_MOCK_PATTERNS) {
      if (pattern.test(output)) {
        const match = output.match(pattern);
        throw new Error(
          `🚨 MOCK RESPONSE DETECTED!\n` +
          `Pattern: ${pattern}\n` +
          `Match: "${match[0]}"\n` +
          `Context: ${output.substring(Math.max(0, match.index - 50), match.index + match[0].length + 50)}\n` +
          `Full output (first 500 chars): ${output.substring(0, 500)}`
        );
      }
    }
    console.log('✅ No mock responses detected in output');
  }
  
  /**
   * Validate that output contains real Claude indicators
   * @param {string} output - Terminal output to validate
   * @returns {boolean} True if real Claude indicators are present
   */
  static hasRealClaudeIndicators(output) {
    const matches = REAL_CLAUDE_INDICATORS.filter(pattern => pattern.test(output));
    
    if (matches.length === 0) {
      console.warn('⚠️ No real Claude indicators found in output');
      console.warn('Output sample:', output.substring(0, 200));
      return false;
    }
    
    console.log(`✅ Found ${matches.length} real Claude indicators`);
    return true;
  }
  
  /**
   * Validate instance ID format
   * @param {string} instanceId - Instance ID to validate
   * @throws {Error} If format is invalid
   */
  static validateInstanceIdFormat(instanceId) {
    if (!instanceId || instanceId === 'undefined' || instanceId.trim() === '') {
      throw new Error(`Invalid instance ID: "${instanceId}"`);
    }
    
    // Accept multiple real formats used by the backend:
    // Format 1: claude-{timestamp}-{random} (long format)
    // Format 2: claude-{number} (short format)
    const longFormat = /^claude-\d{13}-[a-z0-9]{9}$/;
    const shortFormat = /^claude-\d+$/;
    
    if (!longFormat.test(instanceId) && !shortFormat.test(instanceId)) {
      throw new Error(`Invalid instance ID format: "${instanceId}". Expected: claude-{timestamp}-{random} or claude-{number}`);
    }
    
    console.log(`✅ Valid instance ID format: ${instanceId}`);
  }
  
  /**
   * Wait for real Claude output with timeout
   * @param {Object} page - Playwright page object
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<string>} Real Claude output
   */
  static async waitForRealClaudeOutput(page, timeout = 30000) {
    console.log(`⏳ Waiting for real Claude output (timeout: ${timeout}ms)...`);
    
    const startTime = Date.now();
    let lastOutput = '';
    
    while (Date.now() - startTime < timeout) {
      try {
        const output = await page.$eval('.output-area pre', el => el.textContent || '');
        
        // Skip empty or unchanged output
        if (output === lastOutput || output.trim().length < 10) {
          await page.waitForTimeout(1000);
          continue;
        }
        
        lastOutput = output;
        
        // Validate against mock patterns
        this.validateNoMockResponses(output);
        
        // Check for real Claude indicators
        if (this.hasRealClaudeIndicators(output)) {
          console.log(`✅ Real Claude output detected after ${Date.now() - startTime}ms`);
          return output;
        }
        
        console.log(`⏳ Waiting for more substantial output... (current: ${output.length} chars)`);
        await page.waitForTimeout(1000);
        
      } catch (error) {
        if (error.message.includes('MOCK RESPONSE DETECTED')) {
          throw error;
        }
        console.warn('⚠️ Error reading output:', error.message);
        await page.waitForTimeout(1000);
      }
    }
    
    throw new Error(`Timeout waiting for real Claude output after ${timeout}ms. Last output: ${lastOutput.substring(0, 200)}`);
  }
  
  /**
   * Verify working directory is real (not hardcoded)
   * @param {Object} page - Playwright page object
   * @param {string} instanceId - Instance ID
   * @returns {Promise<string>} Actual working directory
   */
  static async verifyRealWorkingDirectory(page, instanceId) {
    console.log('📁 Verifying real working directory...');
    
    // Send pwd command to verify actual working directory
    await page.fill('.input-field', 'pwd');
    await page.press('.input-field', 'Enter');
    await page.waitForTimeout(3000);
    
    const output = await page.$eval('.output-area pre', el => el.textContent);
    
    // Look for actual directory path in output
    const dirMatch = output.match(/\/workspaces\/agent-feed[\/\w]*\b/);
    
    if (!dirMatch) {
      throw new Error(
        `No working directory found in terminal output!\n` +
        `Terminal output: ${output}`
      );
    }
    
    const actualWorkingDir = dirMatch[0];
    console.log(`📁 Terminal shows working directory: ${actualWorkingDir}`);
    
    // Ensure it's not just the root hardcoded path
    if (actualWorkingDir === '/workspaces/agent-feed') {
      throw new Error(
        `Generic hardcoded working directory detected!\n` +
        `Found: ${actualWorkingDir}\n` +
        `Expected specific subdirectory like /workspaces/agent-feed/prod`
      );
    }
    
    console.log(`✅ Real working directory verified: ${actualWorkingDir}`);
    return actualWorkingDir;
  }
  
  /**
   * Test interactive command with real response validation
   * @param {Object} page - Playwright page object
   * @param {string} command - Command to send
   * @param {RegExp} expectedPattern - Pattern to match in response
   * @param {number} timeout - Response timeout
   * @returns {Promise<string>} Command output
   */
  static async testInteractiveCommand(page, command, expectedPattern, timeout = 15000) {
    console.log(`⌨️ Testing interactive command: "${command}"`);
    
    // Get baseline output length
    const baselineOutput = await page.$eval('.output-area pre', el => el.textContent || '');
    const baselineLength = baselineOutput.length;
    
    // Send command
    await page.fill('.input-field', command);
    await page.press('.input-field', 'Enter');
    
    // Wait for response
    const startTime = Date.now();
    let newOutput = baselineOutput;
    
    while (Date.now() - startTime < timeout) {
      await page.waitForTimeout(1000);
      
      newOutput = await page.$eval('.output-area pre', el => el.textContent || '');
      
      // Check if we have new content
      if (newOutput.length > baselineLength + 10) {
        const responseText = newOutput.substring(baselineLength);
        
        // Validate against mocks
        this.validateNoMockResponses(responseText);
        
        // Check expected pattern
        if (expectedPattern.test(responseText)) {
          console.log(`✅ Command "${command}" produced expected real response`);
          return responseText;
        }
      }
    }
    
    throw new Error(
      `Command "${command}" did not produce expected response within ${timeout}ms.\n` +
      `Expected pattern: ${expectedPattern}\n` +
      `Actual output: ${newOutput.substring(baselineLength)}`
    );
  }
  
  /**
   * Validate process lifecycle (spawn, run, terminate)
   * @param {string} instanceId - Instance ID to validate
   * @returns {Promise<Object>} Process lifecycle info
   */
  static async validateProcessLifecycle(instanceId) {
    console.log(`🔄 Validating process lifecycle for: ${instanceId}`);
    
    // Get process info from backend - using the instances list endpoint
    const response = await fetch(`${BACKEND_URL}/api/claude/instances`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`Failed to get instances info: ${JSON.stringify(data)}`);
    }
    
    const process = data.instances.find(instance => instance.id === instanceId);
    
    if (!process) {
      throw new Error(`Instance ${instanceId} not found in backend`);
    }
    
    // Validate required fields (adjust based on actual API response)
    const requiredFields = ['id', 'pid', 'status', 'startTime', 'command'];
    for (const field of requiredFields) {
      if (!process[field]) {
        throw new Error(`Missing required process field: ${field}`);
      }
    }
    
    // Validate data types and values
    if (typeof process.pid !== 'number' || process.pid <= 0) {
      throw new Error(`Invalid PID: ${process.pid}`);
    }
    
    if (!['starting', 'running', 'completed', 'failed'].includes(process.status)) {
      throw new Error(`Invalid status: ${process.status}`);
    }
    
    if (new Date(process.startTime).getTime() > Date.now()) {
      throw new Error(`Invalid start time: ${process.startTime}`);
    }
    
    console.log(`✅ Process lifecycle validated:`, {
      id: process.id,
      pid: process.pid,
      status: process.status,
      uptime: Date.now() - new Date(process.startTime).getTime(),
      command: process.command
    });
    
    return process;
  }
  
  /**
   * Comprehensive real Claude validation
   * @param {Object} page - Playwright page object
   * @param {string} instanceId - Instance ID
   * @returns {Promise<Object>} Validation results
   */
  static async comprehensiveValidation(page, instanceId) {
    console.log(`🔍 Running comprehensive real Claude validation for: ${instanceId}`);
    
    const results = {
      instanceIdValid: false,
      processLifecycleValid: false,
      workingDirectoryReal: false,
      outputReal: false,
      interactionWorking: false,
      noMockResponses: false
    };
    
    try {
      // 1. Validate instance ID format
      this.validateInstanceIdFormat(instanceId);
      results.instanceIdValid = true;
      
      // 2. Validate process lifecycle
      await this.validateProcessLifecycle(instanceId);
      results.processLifecycleValid = true;
      
      // 3. Get and validate real output
      const output = await this.waitForRealClaudeOutput(page, 20000);
      results.outputReal = true;
      results.noMockResponses = true;
      
      // 4. Verify working directory
      await this.verifyRealWorkingDirectory(page, instanceId);
      results.workingDirectoryReal = true;
      
      // 5. Test interaction
      await this.testInteractiveCommand(page, 'echo "validation-test"', /validation-test/);
      results.interactionWorking = true;
      
      console.log('✅ Comprehensive validation PASSED');
      return results;
      
    } catch (error) {
      console.error('❌ Comprehensive validation FAILED:', error.message);
      throw error;
    }
  }
}

module.exports = {
  RealClaudeValidators,
  FORBIDDEN_MOCK_PATTERNS,
  REAL_CLAUDE_INDICATORS,
  CLAUDE_CLI_PATH,
  REAL_CLAUDE_WORKING_DIR,
  BACKEND_URL
};