/**
 * Anthropic SDK Manager - Secure wrapper for Claude Code SDK
 * SECURITY: Implements API key protection for Docker/VPS deployment
 */

import { ApiKeySanitizer } from '../security/ApiKeySanitizer.js';

class AnthropicSDKManager {
  constructor() {
    this.apiKeySanitizer = new ApiKeySanitizer();
    this.streamingClient = null;
    this.headlessClient = null;
    this.initialized = false;

    // Protect environment on startup
    this.apiKeySanitizer.protectEnvironment();

    this.init();
  }

  async init() {
    try {
      // Security check: Ensure API key is available but not exposed
      const apiKey = this.apiKeySanitizer.getApiKey();
      if (!apiKey || !apiKey.startsWith('sk-ant-')) {
        throw new Error('Invalid or missing ANTHROPIC_API_KEY. Please configure in environment.');
      }

      // For now, use basic Anthropic SDK (will upgrade when claude-code package is available)
      const { default: Anthropic } = await import('@anthropic-ai/sdk');

      // Initialize basic client for now
      this.anthropicClient = new Anthropic({
        apiKey: apiKey
      });

      // Mock streaming and headless clients for development
      this.streamingClient = { query: this.mockStreamingQuery.bind(this) };
      this.headlessClient = { execute: this.mockHeadlessExecute.bind(this) };

      this.initialized = true;
      console.log('✅ Anthropic SDK Manager initialized securely');

    } catch (error) {
      console.error('❌ Failed to initialize Anthropic SDK:', error.message);
      throw error;
    }
  }

  /**
   * Mock streaming query for development (will be replaced with real SDK)
   */
  async mockStreamingQuery(generateMessages) {
    const messages = [];
    for await (const msg of generateMessages) {
      messages.push(msg);
    }

    // Use basic Anthropic API for now with specified model
    const response = await this.anthropicClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: messages.map(m => m.message)
    });

    return [{
      type: 'assistant',
      content: response.content[0].text
    }];
  }

  /**
   * Mock headless execute for development (will be replaced with real SDK)
   */
  async mockHeadlessExecute(options) {
    const response = await this.anthropicClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: options.prompt }]
    });

    return {
      output: JSON.stringify({
        response: response.content[0].text,
        timestamp: new Date().toISOString(),
        mode: 'headless_mock'
      })
    };
  }

  /**
   * Secure streaming chat for Avi DM interface
   */
  async createStreamingChat(userInput, options = {}) {
    if (!this.initialized) await this.init();

    try {
      // Security: Sanitize user input
      const sanitizedInput = this.apiKeySanitizer.sanitizeInput(userInput);

      // Direct Anthropic API call (real, not mock) with specified model
      const response = await this.anthropicClient.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: sanitizedInput
        }]
      });

      // Security: Sanitize response
      const sanitizedContent = this.apiKeySanitizer.sanitizeResponse(response.content[0].text);

      return [{
        type: 'assistant',
        content: sanitizedContent,
        timestamp: new Date().toISOString(),
        model: 'claude-sonnet-4-20250514',
        real: true
      }];

    } catch (error) {
      console.error('Streaming chat error:', error);
      throw new Error('Chat processing failed. Please try again.');
    }
  }

  /**
   * Secure headless execution for background tasks
   */
  async executeHeadlessTask(prompt, options = {}) {
    if (!this.initialized) await this.init();

    try {
      // Security: Sanitize prompt
      const sanitizedPrompt = this.apiKeySanitizer.sanitizeInput(prompt);

      const result = await this.headlessClient.execute({
        prompt: sanitizedPrompt,
        mode: "headless",
        outputFormat: "json",
        allowedTools: options.allowedTools || ["Read", "Write"],
        workingDirectory: options.workingDirectory || "/workspaces/agent-feed/prod",
        timeout: options.timeout || 300000
      });

      // Security: Sanitize output
      const sanitizedOutput = this.apiKeySanitizer.sanitizeResponse(result.output);

      return {
        ...result,
        output: sanitizedOutput
      };

    } catch (error) {
      console.error('Headless task error:', error);
      throw new Error('Background task failed. Please check configuration.');
    }
  }

  /**
   * Health check for SDK connectivity
   */
  async healthCheck() {
    try {
      if (!this.initialized) await this.init();

      // Simple test query
      const testResult = await this.executeHeadlessTask(
        "Return 'SDK_HEALTHY' if you can respond",
        { timeout: 10000 }
      );

      return testResult.output.includes('SDK_HEALTHY');

    } catch (error) {
      console.error('SDK health check failed:', error);
      return false;
    }
  }

  /**
   * Get SDK status without exposing credentials
   */
  getStatus() {
    return {
      initialized: this.initialized,
      streamingAvailable: !!this.streamingClient,
      headlessAvailable: !!this.headlessClient,
      apiKeyConfigured: !!this.apiKeySanitizer.getApiKey(),
      securityEnabled: true
    };
  }
}

// Singleton instance
let sdkManagerInstance = null;

function getSDKManager() {
  if (!sdkManagerInstance) {
    sdkManagerInstance = new AnthropicSDKManager();
  }
  return sdkManagerInstance;
}

export { AnthropicSDKManager, getSDKManager };