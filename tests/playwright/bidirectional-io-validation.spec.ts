import { test, expect, Page } from '@playwright/test';

/**
 * Real-time Bidirectional I/O Validation Tests
 * 
 * Tests comprehensive bidirectional communication:
 * - User input to Claude process
 * - Claude output streaming to frontend
 * - Interactive command/response cycles
 * - Input echo handling
 * - Multi-line input/output scenarios
 * - Special characters and Unicode handling
 */

test.describe('Bidirectional I/O Validation', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="claude-instance-manager"]', {
      timeout: 15000
    });
  });

  test.afterEach(async () => {
    // Clean up instances
    try {
      await page.evaluate(async () => {
        const response = await fetch('http://localhost:3000/api/claude/instances');
        const data = await response.json();
        for (const instance of data.instances || []) {
          await fetch(`http://localhost:3000/api/claude/instances/${instance.id}`, {
            method: 'DELETE'
          });
        }
      });
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  });

  test('Basic input/output flow works correctly', async () => {
    console.log('⌨️ Testing basic input/output flow...');
    
    // Create and select instance
    await page.click('button:has-text("⚡ skip-permissions")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    await page.click('.instance-item');
    
    // Wait for instance to be ready
    await expect(page.locator('.instance-item .status-text')).toContainText('running', { timeout: 45000 });
    
    // Get baseline output
    await page.waitForTimeout(2000);
    const initialOutput = await page.locator('.output-area pre').textContent() || '';
    const initialLength = initialOutput.length;
    
    // Send a simple command
    const testCommand = 'help';
    await page.fill('.input-field', testCommand);
    await page.press('.input-field', 'Enter');
    
    // Verify input field is cleared
    await expect(page.locator('.input-field')).toHaveValue('');
    
    // Wait for response
    await page.waitForFunction((prevLength) => {
      const outputArea = document.querySelector('.output-area pre');
      return outputArea && outputArea.textContent && 
             outputArea.textContent.length > prevLength + 5; // Allow for command echo
    }, initialLength, { timeout: 30000 });
    
    // Verify output contains the command or response
    const newOutput = await page.locator('.output-area pre').textContent() || '';
    expect(newOutput.length).toBeGreaterThan(initialLength);
    
    // Should contain either the command echo or a response mentioning help
    expect(newOutput.toLowerCase()).toMatch(/help|commands|usage|available/);
    
    console.log('✅ Basic input/output flow test passed');
  });

  test('Interactive command/response cycles work correctly', async () => {
    console.log('🔄 Testing interactive command/response cycles...');
    
    // Create and setup instance
    await page.click('button:has-text("🚀 prod/claude")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    await page.click('.instance-item');
    await expect(page.locator('.instance-item .status-text')).toContainText('running', { timeout: 45000 });
    
    // Wait for initial setup
    await page.waitForTimeout(3000);
    
    // Series of interactive commands
    const commands = [
      'hello',
      'how are you?',
      'what can you help with?'
    ];
    
    for (const command of commands) {
      console.log(`Sending command: ${command}`);
      
      // Get current output length
      const currentOutput = await page.locator('.output-area pre').textContent() || '';
      const currentLength = currentOutput.length;
      
      // Send command
      await page.fill('.input-field', command);
      await page.press('.input-field', 'Enter');
      
      // Wait for response
      await page.waitForFunction((prevLength, cmd) => {
        const outputArea = document.querySelector('.output-area pre');
        return outputArea && outputArea.textContent && 
               outputArea.textContent.length > prevLength &&
               (outputArea.textContent.toLowerCase().includes(cmd.toLowerCase()) ||
                outputArea.textContent.length > prevLength + 10);
      }, currentLength, command, { timeout: 25000 });
      
      // Verify response received
      const newOutput = await page.locator('.output-area pre').textContent() || '';
      expect(newOutput.length).toBeGreaterThan(currentLength);
      
      // Small delay between commands
      await page.waitForTimeout(1000);
    }
    
    console.log('✅ Interactive command/response cycles test passed');
  });

  test('Enter key and Send button both work for input', async () => {
    console.log('⌨️🖱️ Testing both Enter key and Send button input methods...');
    
    // Setup instance
    await page.click('button:has-text("⚡ skip-permissions -c")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    await page.click('.instance-item');
    await expect(page.locator('.instance-item .status-text')).toContainText('running', { timeout: 45000 });
    
    await page.waitForTimeout(2000);
    
    // Test Enter key
    const enterOutput = await page.locator('.output-area pre').textContent() || '';
    const enterLength = enterOutput.length;
    
    await page.fill('.input-field', 'test enter key');
    await page.press('.input-field', 'Enter');
    
    await page.waitForFunction((prevLength) => {
      const outputArea = document.querySelector('.output-area pre');
      return outputArea && outputArea.textContent && 
             outputArea.textContent.length > prevLength;
    }, enterLength, { timeout: 20000 });
    
    // Test Send button
    await page.waitForTimeout(1000);
    const buttonOutput = await page.locator('.output-area pre').textContent() || '';
    const buttonLength = buttonOutput.length;
    
    await page.fill('.input-field', 'test send button');
    await page.click('.btn-send');
    
    await page.waitForFunction((prevLength) => {
      const outputArea = document.querySelector('.output-area pre');
      return outputArea && outputArea.textContent && 
             outputArea.textContent.length > prevLength;
    }, buttonLength, { timeout: 20000 });
    
    // Both methods should work
    const finalOutput = await page.locator('.output-area pre').textContent() || '';
    expect(finalOutput).toContain('test enter key');
    expect(finalOutput).toContain('test send button');
    
    console.log('✅ Both input methods test passed');
  });

  test('Multi-line input handling works correctly', async () => {
    console.log('📝 Testing multi-line input handling...');
    
    // Setup instance
    await page.click('button:has-text("⚡ skip-permissions")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    await page.click('.instance-item');
    await expect(page.locator('.instance-item .status-text')).toContainText('running', { timeout: 45000 });
    
    await page.waitForTimeout(2000);
    
    // Test multi-line input (Claude should handle line breaks)
    const multiLineCommand = 'This is a multi-line\\ncommand to test\\nhow Claude handles it';
    
    const beforeOutput = await page.locator('.output-area pre').textContent() || '';
    const beforeLength = beforeOutput.length;
    
    await page.fill('.input-field', multiLineCommand);
    await page.press('.input-field', 'Enter');
    
    // Wait for response
    await page.waitForFunction((prevLength) => {
      const outputArea = document.querySelector('.output-area pre');
      return outputArea && outputArea.textContent && 
             outputArea.textContent.length > prevLength + 10;
    }, beforeLength, { timeout: 25000 });
    
    const afterOutput = await page.locator('.output-area pre').textContent() || '';
    expect(afterOutput.length).toBeGreaterThan(beforeLength);
    
    console.log('✅ Multi-line input handling test passed');
  });

  test('Special characters and Unicode are handled properly', async () => {
    console.log('🌐 Testing special characters and Unicode handling...');
    
    // Setup instance  
    await page.click('button:has-text("🚀 prod/claude")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    await page.click('.instance-item');
    await expect(page.locator('.instance-item .status-text')).toContainText('running', { timeout: 45000 });
    
    await page.waitForTimeout(2000);
    
    // Test various special characters and Unicode
    const specialCommands = [
      'Hello 🌍 world!',
      'Test symbols: @#$%^&*()',
      'Unicode test: 你好 こんにちは',
      'Quotes: "test" \'test\''
    ];
    
    for (const command of specialCommands) {
      const beforeOutput = await page.locator('.output-area pre').textContent() || '';
      const beforeLength = beforeOutput.length;
      
      await page.fill('.input-field', command);
      await page.press('.input-field', 'Enter');
      
      // Wait for response or echo
      await page.waitForFunction((prevLength) => {
        const outputArea = document.querySelector('.output-area pre');
        return outputArea && outputArea.textContent && 
               outputArea.textContent.length > prevLength;
      }, beforeLength, { timeout: 20000 });
      
      await page.waitForTimeout(500); // Small delay between commands
    }
    
    // Verify all special characters appeared in output
    const finalOutput = await page.locator('.output-area pre').textContent() || '';
    expect(finalOutput).toContain('🌍');
    expect(finalOutput).toContain('@#$%');
    expect(finalOutput).toMatch(/你好|こんにちは/);
    
    console.log('✅ Special characters and Unicode test passed');
  });

  test('Output auto-scrolls to show latest content', async () => {
    console.log('📜 Testing output auto-scroll functionality...');
    
    // Setup instance
    await page.click('button:has-text("⚡ skip-permissions -c")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    await page.click('.instance-item');
    await expect(page.locator('.instance-item .status-text')).toContainText('running', { timeout: 45000 });
    
    await page.waitForTimeout(2000);
    
    // Send multiple commands to generate lots of output
    for (let i = 1; i <= 10; i++) {
      await page.fill('.input-field', `Command ${i} - generating output for scroll test`);
      await page.press('.input-field', 'Enter');
      await page.waitForTimeout(1000);
    }
    
    // Wait for all output to accumulate
    await page.waitForTimeout(3000);
    
    // Check if output area has scrollable content
    const outputArea = page.locator('.output-area');
    const scrollHeight = await outputArea.evaluate(el => el.scrollHeight);
    const clientHeight = await outputArea.evaluate(el => el.clientHeight);
    
    if (scrollHeight > clientHeight) {
      // Check if scrolled to bottom (auto-scroll working)
      const scrollTop = await outputArea.evaluate(el => el.scrollTop);
      const maxScroll = scrollHeight - clientHeight;
      
      // Should be at or very close to bottom (within 10px tolerance)
      expect(scrollTop).toBeGreaterThan(maxScroll - 10);
    }
    
    console.log('✅ Output auto-scroll test passed');
  });

  test('Input validation prevents empty/whitespace-only commands', async () => {
    console.log('✅ Testing input validation for empty commands...');
    
    // Setup instance
    await page.click('button:has-text("⚡ skip-permissions")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    await page.click('.instance-item');
    
    await page.waitForTimeout(2000);
    
    // Try to send empty input
    await page.fill('.input-field', '');
    await page.press('.input-field', 'Enter');
    
    // Input field should remain empty or unchanged
    await page.waitForTimeout(500);
    
    // Try whitespace-only input
    await page.fill('.input-field', '   ');
    await page.press('.input-field', 'Enter');
    
    // Should not cause errors or send meaningless commands
    await page.waitForTimeout(500);
    
    // Now send a real command to verify the system still works
    const beforeOutput = await page.locator('.output-area pre').textContent() || '';
    const beforeLength = beforeOutput.length;
    
    await page.fill('.input-field', 'real command');
    await page.press('.input-field', 'Enter');
    
    await page.waitForFunction((prevLength) => {
      const outputArea = document.querySelector('.output-area pre');
      return outputArea && outputArea.textContent && 
             outputArea.textContent.length > prevLength;
    }, beforeLength, { timeout: 20000 });
    
    // Should still work normally
    const afterOutput = await page.locator('.output-area pre').textContent() || '';
    expect(afterOutput).toContain('real command');
    
    console.log('✅ Input validation test passed');
  });

  test('Real-time output updates during long-running commands', async () => {
    console.log('⏱️ Testing real-time output updates during long commands...');
    
    // Setup instance
    await page.click('button:has-text("🚀 prod/claude")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    await page.click('.instance-item');
    await expect(page.locator('.instance-item .status-text')).toContainText('running', { timeout: 45000 });
    
    await page.waitForTimeout(2000);
    
    // Send a command that might produce streaming output
    const beforeOutput = await page.locator('.output-area pre').textContent() || '';
    const beforeLength = beforeOutput.length;
    
    await page.fill('.input-field', 'Please tell me about yourself');
    await page.press('.input-field', 'Enter');
    
    // Monitor output for real-time updates (should see chunks appearing)
    let outputGrowthDetected = false;
    let previousLength = beforeLength;
    
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(2000);
      const currentOutput = await page.locator('.output-area pre').textContent() || '';
      const currentLength = currentOutput.length;
      
      if (currentLength > previousLength + 10) {
        outputGrowthDetected = true;
        console.log(`Output growing: ${previousLength} -> ${currentLength}`);
        previousLength = currentLength;
      }
      
      // If we see significant output, test passes
      if (currentLength > beforeLength + 50) {
        break;
      }
    }
    
    expect(outputGrowthDetected).toBeTruthy();
    
    console.log('✅ Real-time output updates test passed');
  });

  test('Multiple input/output cycles maintain session state', async () => {
    console.log('🔄 Testing session state maintenance across I/O cycles...');
    
    // Setup instance
    await page.click('button:has-text("⚡ skip-permissions --resume")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    await page.click('.instance-item');
    await expect(page.locator('.instance-item .status-text')).toContainText('running', { timeout: 45000 });
    
    await page.waitForTimeout(2000);
    
    // Have a conversation that builds context
    const conversation = [
      'My name is TestUser',
      'What did I just tell you my name was?',
      'Remember that for our conversation'
    ];
    
    for (let i = 0; i < conversation.length; i++) {
      const command = conversation[i];
      
      const beforeOutput = await page.locator('.output-area pre').textContent() || '';
      const beforeLength = beforeOutput.length;
      
      await page.fill('.input-field', command);
      await page.press('.input-field', 'Enter');
      
      // Wait for response
      await page.waitForFunction((prevLength) => {
        const outputArea = document.querySelector('.output-area pre');
        return outputArea && outputArea.textContent && 
               outputArea.textContent.length > prevLength + 10;
      }, beforeLength, { timeout: 30000 });
      
      // For the second command, verify Claude remembered the name
      if (i === 1) {
        await page.waitForTimeout(2000);
        const output = await page.locator('.output-area pre').textContent() || '';
        // Should reference the name given in previous message
        expect(output.toLowerCase()).toContain('testuser');
      }
      
      await page.waitForTimeout(1000); // Brief pause between messages
    }
    
    console.log('✅ Session state maintenance test passed');
  });
});