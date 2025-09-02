#!/usr/bin/env node

/**
 * TDD Test Suite for Claude API Timeout Fix
 * RED-GREEN-REFACTOR methodology
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Import the components we'll build
const { ClaudeAPIManager } = require('../../src/services/claude-api-manager');
const { RobustProcessManager } = require('../../src/services/robust-process-manager');
const { AdaptiveCommunicationStrategy } = require('../../src/strategies/adaptive-communication');

describe('Claude API Timeout Fix - TDD Suite', () => {
  
  let apiManager;
  let processManager;
  let communicationStrategy;
  
  beforeEach(() => {
    // Reset state for each test
    apiManager = new ClaudeAPIManager({
      timeout: 60000, // 60 seconds instead of 15
      debug: true
    });
    
    processManager = new RobustProcessManager({
      maxRetries: 3,
      retryDelay: 1000
    });
    
    communicationStrategy = new AdaptiveCommunicationStrategy();
  });
  
  afterEach(async () => {
    // Cleanup after each test
    if (apiManager) {
      await apiManager.cleanup();
    }
    if (processManager) {
      await processManager.cleanup();
    }
  });
  
  describe('RED Phase - Reproduce the timeout issue', () => {
    
    test('should reproduce 15-second timeout with current stdin approach', async () => {
      // This test reproduces the original failing behavior
      const timeoutPromise = new Promise((resolve, reject) => {
        const claudeProcess = spawn('claude', [
          '--print',
          '--output-format', 'json', 
          '--dangerously-skip-permissions'
        ], {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: '/workspaces/agent-feed'
        });
        
        let completed = false;
        let output = '';
        
        // The problematic stdin approach that causes hanging
        claudeProcess.stdin.write('What is 2+2?\n');
        claudeProcess.stdin.end();
        
        claudeProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        claudeProcess.on('close', (code) => {
          completed = true;
          resolve({ success: code === 0, output, duration: Date.now() - startTime });
        });
        
        const startTime = Date.now();
        
        // Simulate the current 15-second timeout
        setTimeout(() => {
          if (!completed) {
            claudeProcess.kill('SIGKILL');
            reject(new Error('Process timed out after 15 seconds (reproducing original issue)'));
          }
        }, 15000);
      });
      
      // This should timeout and fail (reproducing the issue)
      await expect(timeoutPromise).rejects.toThrow('Process timed out after 15 seconds');
    }, 20000);
  });
  
  describe('GREEN Phase - Fix with argument-based approach', () => {
    
    test('should NOT timeout using argument-based communication', async () => {
      const prompt = 'What is 2+2?';
      
      const result = await apiManager.sendPrompt(prompt, {
        method: 'argument',
        timeout: 60000
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toContain('4');
      expect(result.duration_ms).toBeLessThan(30000);
      expect(result.method_used).toBe('argument');
    }, 65000);
    
    test('should handle long prompts with file-based communication', async () => {
      const longPrompt = 'Explain quantum computing. '.repeat(100); // ~2500 characters
      
      const result = await apiManager.sendPrompt(longPrompt, {
        method: 'file',
        timeout: 60000
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toBeTruthy();
      expect(result.method_used).toBe('file');
    }, 65000);
    
    test('should retry with fallback methods on failure', async () => {
      const prompt = 'What is the capital of France?';
      
      // Force failure of first method to test fallback
      const result = await communicationStrategy.executeWithFallback(prompt, {
        forceFail: ['argument'], // Simulate argument method failure
        timeout: 60000
      });
      
      expect(result.success).toBe(true);
      expect(result.method_used).not.toBe('argument'); // Should use fallback
      expect(result.retry_count).toBeGreaterThan(0);
    }, 70000);
  });
  
  describe('Process Management and Cleanup', () => {
    
    test('should clean up processes properly on timeout', async () => {
      const initialProcessCount = (await processManager.getActiveProcessCount());
      
      // Start a process that will timeout
      const processPromise = processManager.executeWithTimeout('sleep 5', [], 2000);
      
      await expect(processPromise).rejects.toThrow('timeout');
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalProcessCount = await processManager.getActiveProcessCount();
      expect(finalProcessCount).toBe(initialProcessCount);
    }, 10000);
    
    test('should handle concurrent requests without interference', async () => {
      const prompts = [
        'What is 1+1?',
        'What is 2+2?', 
        'What is 3+3?'
      ];
      
      const promises = prompts.map(prompt => 
        apiManager.sendPrompt(prompt, { timeout: 60000 })
      );
      
      const results = await Promise.all(promises);
      
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.result).toContain(String((index + 1) * 2)); // 2, 4, 6
      });
    }, 70000);
  });
  
  describe('WebSocket Integration', () => {
    
    test('should maintain WebSocket connection during API calls', async () => {
      // This test would normally require WebSocket server setup
      // For now, we'll test the API manager behavior
      
      let connectionLost = false;
      const mockWebSocket = {
        send: jest.fn(),
        close: jest.fn(() => { connectionLost = true; })
      };
      
      const prompt = 'Test prompt for WebSocket integration';
      const result = await apiManager.sendPrompt(prompt, { 
        timeout: 60000,
        onProgress: (data) => {
          mockWebSocket.send(JSON.stringify({ type: 'progress', data }));
        }
      });
      
      expect(result.success).toBe(true);
      expect(connectionLost).toBe(false);
      expect(mockWebSocket.send).toHaveBeenCalled();
    }, 65000);
  });
  
  describe('Error Handling', () => {
    
    test('should provide structured error messages', async () => {
      const invalidPrompt = null; // This should cause an error
      
      const result = await apiManager.sendPrompt(invalidPrompt, { timeout: 30000 });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error).toMatch(/invalid prompt/i);
    });
    
    test('should handle Claude CLI not available', async () => {
      // Mock missing Claude CLI
      const originalPATH = process.env.PATH;
      process.env.PATH = '/nonexistent';
      
      const result = await apiManager.sendPrompt('test', { timeout: 10000 });
      
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/claude.*not.*found/i);
      
      // Restore PATH
      process.env.PATH = originalPATH;
    });
  });
});

// Helper function to run tests
if (require.main === module) {
  console.log('🧪 Running TDD Test Suite for Claude API Timeout Fix...');
  
  // Simple test runner (normally would use Jest)
  const runTests = async () => {
    try {
      console.log('⚠️ This is a TDD test specification.');
      console.log('Run with Jest: npm test -- claude-api-timeout-fix.test.js');
      console.log('Tests will initially FAIL (RED phase) until implementation is complete.');
    } catch (error) {
      console.error('❌ Test execution failed:', error);
    }
  };
  
  runTests();
}