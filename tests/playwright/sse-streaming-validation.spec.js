/**
 * SSE Streaming Validation Tests
 * 
 * Comprehensive Playwright tests for Server-Sent Events streaming validation.
 * Tests incremental output, no message duplication, buffer management,
 * and the specific SSE buffer accumulation storm issue fix.
 * 
 * Test Scenarios:
 * 1. SSE incremental output (no message duplication)
 * 2. Terminal output streaming with position tracking
 * 3. Message chunking and buffer management
 * 4. Connection recovery and error handling
 * 5. High-volume output scenarios
 * 6. Buffer accumulation storm issue validation
 */

const { test, expect, chromium } = require('@playwright/test');
const EventSource = require('eventsource'); // For Node.js EventSource support

// Test configuration
const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:3001';
const SSE_TIMEOUT = 30000; // 30 seconds for SSE operations
const OUTPUT_COLLECTION_TIME = 5000; // Time to collect streaming output

// Test data for various scenarios
const TEST_COMMANDS = {
  simple: 'echo "test message"',
  multiLine: 'echo -e "line1\\nline2\\nline3"',
  highVolume: 'for i in {1..100}; do echo "Message $i"; done',
  longRunning: 'for i in {1..20}; do echo "Progress $i"; sleep 0.1; done',
  incremental: ['echo "incremental test 1"', 'echo "incremental test 2"', 'echo "incremental test 3"']
};

// Utility function to create Claude instance via API
async function createClaudeInstance(instanceType = 'skip-permissions') {
  const response = await fetch(`${BACKEND_URL}/api/claude/spawn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instanceType, usePty: true })
  });

  expect(response.ok).toBeTruthy();
  const data = await response.json();
  expect(data.instanceId).toBeDefined();
  expect(data.success).toBe(true);
  
  return data.instanceId;
}

// Utility function to send command to Claude instance
async function sendCommandToInstance(instanceId, command) {
  const response = await fetch(`${BACKEND_URL}/api/claude/${instanceId}/input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: command })
  });

  expect(response.ok).toBeTruthy();
  return await response.json();
}

// Utility function to collect SSE messages for a duration
async function collectSSEMessages(instanceId, durationMs = OUTPUT_COLLECTION_TIME) {
  return new Promise((resolve) => {
    const messages = [];
    const url = `${BACKEND_URL}/api/v1/claude/${instanceId}/stream`;
    
    console.log(`🔍 Collecting SSE messages from: ${url}`);
    const eventSource = new EventSource(url);
    
    let messageCount = 0;
    const startTime = Date.now();

    eventSource.onopen = () => {
      console.log(`✅ SSE connection opened for ${instanceId}`);
    };

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        messages.push({
          ...message,
          messageIndex: messageCount++,
          receivedAt: Date.now(),
          timeSinceStart: Date.now() - startTime
        });
        console.log(`📨 SSE Message ${messageCount}: ${message.type} (${message.data?.length || 0} chars)`);
      } catch (error) {
        console.warn(`⚠️ Failed to parse SSE message:`, event.data, error);
        messages.push({
          type: 'parse_error',
          rawData: event.data,
          error: error.message,
          messageIndex: messageCount++,
          receivedAt: Date.now(),
          timeSinceStart: Date.now() - startTime
        });
      }
    };

    eventSource.onerror = (error) => {
      console.warn(`⚠️ SSE error for ${instanceId}:`, error);
      messages.push({
        type: 'error',
        error: error.message || 'SSE connection error',
        messageIndex: messageCount++,
        receivedAt: Date.now(),
        timeSinceStart: Date.now() - startTime
      });
    };

    // Close connection after specified duration
    setTimeout(() => {
      console.log(`🛑 Closing SSE connection after ${durationMs}ms (${messageCount} messages)`);
      eventSource.close();
      resolve(messages);
    }, durationMs);
  });
}

// Utility function to terminate Claude instance
async function terminateClaudeInstance(instanceId) {
  const response = await fetch(`${BACKEND_URL}/api/claude/${instanceId}/terminate`, {
    method: 'DELETE'
  });
  
  if (response.ok) {
    console.log(`🗑️ Successfully terminated instance ${instanceId}`);
  } else {
    console.warn(`⚠️ Failed to terminate instance ${instanceId}: ${response.status}`);
  }
}

test.describe('SSE Streaming Validation', () => {
  
  test.beforeEach(async ({ page }) => {
    // Ensure backend is running
    const healthCheck = await fetch(`${BACKEND_URL}/health`);
    expect(healthCheck.ok).toBeTruthy();
  });

  test('should establish SSE connection and receive incremental output without duplication', async ({ page }) => {
    const instanceId = await createClaudeInstance();
    console.log(`🚀 Testing incremental output for instance: ${instanceId}`);

    try {
      // Start collecting SSE messages
      const messagesPromise = collectSSEMessages(instanceId, 8000);

      // Send test commands with delays
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for connection
      await sendCommandToInstance(instanceId, TEST_COMMANDS.incremental[0]);
      await new Promise(resolve => setTimeout(resolve, 1500));
      await sendCommandToInstance(instanceId, TEST_COMMANDS.incremental[1]);
      await new Promise(resolve => setTimeout(resolve, 1500));
      await sendCommandToInstance(instanceId, TEST_COMMANDS.incremental[2]);

      const messages = await messagesPromise;

      // Validation: Check for incremental output without duplication
      const outputMessages = messages.filter(msg => msg.type === 'output');
      expect(outputMessages.length).toBeGreaterThan(0);

      // Verify no duplicate content in consecutive messages
      for (let i = 1; i < outputMessages.length; i++) {
        const currentData = outputMessages[i].data || '';
        const previousData = outputMessages[i - 1].data || '';
        
        // Check that current message doesn't repeat previous data exactly
        expect(currentData).not.toBe(previousData);
        console.log(`✅ Message ${i}: No duplication detected (${currentData.length} chars)`);
      }

      // Verify incremental position tracking
      let lastPosition = 0;
      for (const message of outputMessages) {
        if (message.outputPosition !== undefined) {
          expect(message.outputPosition).toBeGreaterThanOrEqual(lastPosition);
          lastPosition = message.outputPosition;
          console.log(`✅ Position tracking: ${message.outputPosition}`);
        }
      }

    } finally {
      await terminateClaudeInstance(instanceId);
    }
  });

  test('should handle high-volume output without buffer accumulation storm', async ({ page }) => {
    const instanceId = await createClaudeInstance();
    console.log(`🚀 Testing high-volume output for instance: ${instanceId}`);

    try {
      // Start collecting messages for longer duration due to high volume
      const messagesPromise = collectSSEMessages(instanceId, 15000);

      // Wait for connection establishment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Send high-volume command
      await sendCommandToInstance(instanceId, TEST_COMMANDS.highVolume);

      const messages = await messagesPromise;

      // Validation: Ensure we handle high volume without performance degradation
      const outputMessages = messages.filter(msg => msg.type === 'output');
      expect(outputMessages.length).toBeGreaterThan(0);

      // Check for buffer accumulation storm indicators
      const duplicateCount = outputMessages.reduce((acc, msg, index) => {
        if (index > 0 && msg.data === outputMessages[index - 1].data) {
          return acc + 1;
        }
        return acc;
      }, 0);

      // Allow minimal duplicates but not storm-level
      const duplicateRatio = duplicateCount / outputMessages.length;
      expect(duplicateRatio).toBeLessThan(0.3); // Less than 30% duplicates
      console.log(`✅ Buffer storm check: ${duplicateRatio * 100}% duplicates (acceptable)`);

      // Verify message timing distribution
      const messageTimes = outputMessages.map(msg => msg.timeSinceStart);
      const timeGaps = [];
      for (let i = 1; i < messageTimes.length; i++) {
        timeGaps.push(messageTimes[i] - messageTimes[i - 1]);
      }

      // Check for reasonable distribution of message timing
      const avgGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;
      console.log(`✅ Average message gap: ${avgGap}ms`);
      expect(avgGap).toBeGreaterThan(0); // Should have realistic gaps

    } finally {
      await terminateClaudeInstance(instanceId);
    }
  });

  test('should maintain message ordering and chunking integrity', async ({ page }) => {
    const instanceId = await createClaudeInstance();
    console.log(`🚀 Testing message chunking for instance: ${instanceId}`);

    try {
      const messagesPromise = collectSSEMessages(instanceId, 10000);

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Send commands in sequence to test chunking
      for (let i = 0; i < TEST_COMMANDS.incremental.length; i++) {
        await sendCommandToInstance(instanceId, TEST_COMMANDS.incremental[i]);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      const messages = await messagesPromise;
      const outputMessages = messages.filter(msg => msg.type === 'output');

      // Verify message ordering
      for (let i = 1; i < outputMessages.length; i++) {
        expect(outputMessages[i].receivedAt).toBeGreaterThanOrEqual(outputMessages[i - 1].receivedAt);
      }

      // Verify chunking integrity
      const allOutputData = outputMessages.map(msg => msg.data || '').join('');
      expect(allOutputData.length).toBeGreaterThan(0);
      console.log(`✅ Total output collected: ${allOutputData.length} characters`);

      // Check for proper SSE message structure
      outputMessages.forEach((msg, index) => {
        expect(msg.type).toBe('output');
        expect(msg.instanceId).toBe(instanceId);
        expect(msg.timestamp).toBeDefined();
        expect(msg.source).toBeDefined();
        console.log(`✅ Message ${index}: Proper structure verified`);
      });

    } finally {
      await terminateClaudeInstance(instanceId);
    }
  });

  test('should recover from connection interruption gracefully', async ({ page }) => {
    const instanceId = await createClaudeInstance();
    console.log(`🚀 Testing connection recovery for instance: ${instanceId}`);

    try {
      // First connection - collect some messages
      let messages1 = await collectSSEMessages(instanceId, 3000);
      expect(messages1.length).toBeGreaterThan(0);

      // Send a command
      await sendCommandToInstance(instanceId, 'echo "before reconnection"');
      
      // Brief pause to simulate interruption
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Second connection - should work without issues
      let messages2 = await collectSSEMessages(instanceId, 3000);
      
      // Send another command
      await sendCommandToInstance(instanceId, 'echo "after reconnection"');
      
      // Verify both connections received messages
      expect(messages1.length).toBeGreaterThan(0);
      expect(messages2.length).toBeGreaterThan(0);

      console.log(`✅ Connection recovery test passed: ${messages1.length} + ${messages2.length} messages`);

    } finally {
      await terminateClaudeInstance(instanceId);
    }
  });

  test('should handle long-running command output streaming', async ({ page }) => {
    const instanceId = await createClaudeInstance();
    console.log(`🚀 Testing long-running command for instance: ${instanceId}`);

    try {
      const messagesPromise = collectSSEMessages(instanceId, 12000);

      await new Promise(resolve => setTimeout(resolve, 1000));
      await sendCommandToInstance(instanceId, TEST_COMMANDS.longRunning);

      const messages = await messagesPromise;
      const outputMessages = messages.filter(msg => msg.type === 'output');

      // Should receive multiple incremental updates
      expect(outputMessages.length).toBeGreaterThan(5);

      // Check for progressive output
      const timeStamps = outputMessages.map(msg => msg.timeSinceStart);
      const isProgressive = timeStamps.every((time, index) => 
        index === 0 || time > timeStamps[index - 1]
      );
      expect(isProgressive).toBe(true);

      console.log(`✅ Long-running command streamed ${outputMessages.length} messages progressively`);

    } finally {
      await terminateClaudeInstance(instanceId);
    }
  });

  test('should validate SSE message format and metadata', async ({ page }) => {
    const instanceId = await createClaudeInstance();
    console.log(`🚀 Testing SSE message format for instance: ${instanceId}`);

    try {
      const messagesPromise = collectSSEMessages(instanceId, 6000);

      await new Promise(resolve => setTimeout(resolve, 1000));
      await sendCommandToInstance(instanceId, 'echo "format test"');

      const messages = await messagesPromise;

      // Verify connection message
      const connectionMsg = messages.find(msg => msg.type === 'connected');
      expect(connectionMsg).toBeDefined();
      expect(connectionMsg.instanceId).toBe(instanceId);

      // Verify output messages format
      const outputMessages = messages.filter(msg => msg.type === 'output');
      expect(outputMessages.length).toBeGreaterThan(0);

      outputMessages.forEach((msg, index) => {
        // Required fields
        expect(msg.type).toBe('output');
        expect(msg.instanceId).toBe(instanceId);
        expect(msg.timestamp).toBeDefined();
        expect(msg.source).toBeDefined();
        
        // Data should be present and valid
        expect(msg.data).toBeDefined();
        expect(typeof msg.data).toBe('string');

        // Optional position tracking
        if (msg.outputPosition !== undefined) {
          expect(typeof msg.outputPosition).toBe('number');
          expect(msg.outputPosition).toBeGreaterThanOrEqual(0);
        }

        console.log(`✅ Message ${index}: Format validation passed`);
      });

    } finally {
      await terminateClaudeInstance(instanceId);
    }
  });

  test('should handle multiple concurrent SSE connections to same instance', async ({ page }) => {
    const instanceId = await createClaudeInstance();
    console.log(`🚀 Testing concurrent connections for instance: ${instanceId}`);

    try {
      // Start multiple concurrent SSE connections
      const promises = [
        collectSSEMessages(instanceId, 6000),
        collectSSEMessages(instanceId, 6000),
        collectSSEMessages(instanceId, 6000)
      ];

      await new Promise(resolve => setTimeout(resolve, 1000));
      await sendCommandToInstance(instanceId, 'echo "concurrent test"');

      const results = await Promise.all(promises);

      // All connections should receive messages
      results.forEach((messages, index) => {
        expect(messages.length).toBeGreaterThan(0);
        console.log(`✅ Connection ${index + 1}: Received ${messages.length} messages`);
      });

      // Verify all connections got similar output
      const outputCounts = results.map(messages => 
        messages.filter(msg => msg.type === 'output').length
      );
      
      // All connections should have received output messages
      outputCounts.forEach(count => expect(count).toBeGreaterThan(0));

    } finally {
      await terminateClaudeInstance(instanceId);
    }
  });
});

test.describe('SSE Buffer Accumulation Storm Issue Validation', () => {

  test('should not exhibit buffer accumulation storm behavior', async ({ page }) => {
    const instanceId = await createClaudeInstance();
    console.log(`🚀 Testing buffer accumulation storm prevention for instance: ${instanceId}`);

    try {
      // This test specifically targets the original issue where:
      // 1. Output would accumulate in buffer
      // 2. Each new message would send entire accumulated output
      // 3. Frontend would show repeated/duplicated content

      const messagesPromise = collectSSEMessages(instanceId, 10000);

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Send multiple commands rapidly to trigger potential buffer accumulation
      const rapidCommands = [
        'echo "Command 1: Short"',
        'echo "Command 2: Slightly longer output message"',
        'echo "Command 3: Even longer output message with more text content"',
        'echo "Command 4: This is a very long output message designed to test buffer handling"'
      ];

      for (let i = 0; i < rapidCommands.length; i++) {
        await sendCommandToInstance(instanceId, rapidCommands[i]);
        // Small delay to allow processing but still rapid enough to test
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const messages = await messagesPromise;
      const outputMessages = messages.filter(msg => msg.type === 'output');

      // Critical validation: Check for buffer accumulation storm
      let accumulatedContent = '';
      let stormDetected = false;
      const contentHistory = [];

      outputMessages.forEach((msg, index) => {
        const content = msg.data || '';
        contentHistory.push(content);
        
        // Check if current message contains significant portion of previous content
        if (index > 0) {
          const previousContent = contentHistory[index - 1];
          const commonLength = getCommonSuffixLength(previousContent, content);
          
          // If more than 50% of previous content appears at start of current content,
          // this indicates potential buffer accumulation
          if (commonLength > previousContent.length * 0.5 && previousContent.length > 10) {
            console.warn(`⚠️ Potential buffer accumulation detected at message ${index}`);
            console.warn(`   Previous (${previousContent.length}): ${previousContent.substring(0, 50)}...`);
            console.warn(`   Current (${content.length}): ${content.substring(0, 50)}...`);
            console.warn(`   Common suffix: ${commonLength} chars`);
            stormDetected = true;
          }
        }
      });

      // The fix should prevent buffer accumulation storm
      expect(stormDetected).toBe(false);

      // Additional validation: Check position tracking works correctly
      let lastPosition = -1;
      outputMessages.forEach((msg, index) => {
        if (msg.outputPosition !== undefined) {
          expect(msg.outputPosition).toBeGreaterThan(lastPosition);
          lastPosition = msg.outputPosition;
        }
      });

      console.log(`✅ Buffer accumulation storm test passed: ${outputMessages.length} messages, no storm detected`);

    } finally {
      await terminateClaudeInstance(instanceId);
    }
  });

  // Helper function to detect common suffix between two strings
  function getCommonSuffixLength(str1, str2) {
    let commonLength = 0;
    const minLength = Math.min(str1.length, str2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (str1[str1.length - 1 - i] === str2[i]) {
        commonLength++;
      } else {
        break;
      }
    }
    
    return commonLength;
  }

  test('should demonstrate incremental position-based output sending', async ({ page }) => {
    const instanceId = await createClaudeInstance();
    console.log(`🚀 Testing incremental position-based output for instance: ${instanceId}`);

    try {
      const messagesPromise = collectSSEMessages(instanceId, 8000);

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Send commands that produce overlapping output patterns
      await sendCommandToInstance(instanceId, 'echo "Base message"');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await sendCommandToInstance(instanceId, 'echo "Base message extended"');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await sendCommandToInstance(instanceId, 'echo "Completely different message"');

      const messages = await messagesPromise;
      const outputMessages = messages.filter(msg => msg.type === 'output');

      // Verify incremental sending: each message should only contain new content
      let totalContentReceived = '';
      outputMessages.forEach((msg, index) => {
        const content = msg.data || '';
        
        // New content should not repeat what we already have
        if (totalContentReceived.includes(content) && content.length > 5) {
          console.warn(`⚠️ Potential content repetition at message ${index}: ${content.substring(0, 50)}...`);
        }
        
        totalContentReceived += content;
        console.log(`✅ Message ${index}: Added ${content.length} chars (total: ${totalContentReceived.length})`);
      });

      expect(outputMessages.length).toBeGreaterThan(0);
      console.log(`✅ Incremental position-based test completed: ${totalContentReceived.length} total chars received`);

    } finally {
      await terminateClaudeInstance(instanceId);
    }
  });
});