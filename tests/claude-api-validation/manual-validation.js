#!/usr/bin/env node

/**
 * Manual Claude API Validation Script
 * Simple script to manually test Claude API connectivity and usage tracking
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '/workspaces/agent-feed/.env' });

class ManualClaudeValidator {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.anthropic = null;
    this.testResults = [];
    this.totalCost = 0;
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
  }

  async init() {
    console.log('🚀 Initializing Claude API Validator...\n');

    // Validate API key
    if (!this.apiKey) {
      throw new Error('❌ ANTHROPIC_API_KEY not found in environment variables');
    }

    if (!this.apiKey.startsWith('sk-ant-')) {
      throw new Error('❌ Invalid ANTHROPIC_API_KEY format. Expected sk-ant-* format.');
    }

    console.log('✅ API Key found:', this.apiKey.substring(0, 15) + '...');

    // Initialize Anthropic client
    this.anthropic = new Anthropic({
      apiKey: this.apiKey
    });

    console.log('✅ Anthropic client initialized\n');
  }

  async runTest(testName, testFunction) {
    console.log(`🧪 Running test: ${testName}`);
    console.log('─'.repeat(50));

    const startTime = Date.now();

    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;

      this.testResults.push({
        name: testName,
        success: true,
        duration: duration,
        result: result
      });

      console.log(`✅ Test passed (${duration}ms)\n`);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      this.testResults.push({
        name: testName,
        success: false,
        duration: duration,
        error: error.message
      });

      console.log(`❌ Test failed (${duration}ms): ${error.message}\n`);
      throw error;
    }
  }

  calculateCost(model, inputTokens, outputTokens) {
    const pricing = {
      'claude-3-haiku-20240307': {
        input: 0.00025 / 1000,   // $0.25 per 1K tokens
        output: 0.00125 / 1000   // $1.25 per 1K tokens
      },
      'claude-3-sonnet-20240229': {
        input: 0.003 / 1000,     // $3 per 1K tokens
        output: 0.015 / 1000     // $15 per 1K tokens
      }
    };

    const modelPricing = pricing[model];
    if (!modelPricing) return 0;

    return (inputTokens * modelPricing.input) + (outputTokens * modelPricing.output);
  }

  trackUsage(response) {
    this.totalInputTokens += response.usage.input_tokens;
    this.totalOutputTokens += response.usage.output_tokens;
    this.totalCost += this.calculateCost(
      response.model,
      response.usage.input_tokens,
      response.usage.output_tokens
    );
  }

  async testBasicConnectivity() {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: 'Hello! Please respond with "API_CONNECTION_SUCCESSFUL" to confirm connectivity.'
      }]
    });

    this.trackUsage(response);

    const responseText = response.content[0].text;
    console.log('📤 Response:', responseText);
    console.log('🔢 Input tokens:', response.usage.input_tokens);
    console.log('🔢 Output tokens:', response.usage.output_tokens);
    console.log('💰 Cost: $' + this.calculateCost(response.model, response.usage.input_tokens, response.usage.output_tokens).toFixed(6));

    if (!responseText.includes('API_CONNECTION_SUCCESSFUL')) {
      throw new Error('Response does not contain expected confirmation text');
    }

    return {
      success: true,
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      responsePreview: responseText.substring(0, 100)
    };
  }

  async testModelCapabilities() {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: 'Please demonstrate your capabilities by: 1) Solving 15 + 27, 2) Writing a haiku about technology, 3) Explaining what you are in one sentence'
      }]
    });

    this.trackUsage(response);

    const responseText = response.content[0].text;
    console.log('📤 Full response:', responseText);
    console.log('🔢 Tokens used:', response.usage.input_tokens + response.usage.output_tokens);

    // Basic validation that response contains expected elements
    const hasMath = /42|fifteen|twenty.seven/i.test(responseText);
    const hasHaiku = responseText.split('\n').length >= 3;
    const hasExplanation = /claude|ai|assistant|language model/i.test(responseText);

    console.log('✓ Contains math solution:', hasMath);
    console.log('✓ Contains haiku format:', hasHaiku);
    console.log('✓ Contains self-explanation:', hasExplanation);

    return {
      success: true,
      hasMath,
      hasHaiku,
      hasExplanation,
      fullResponse: responseText
    };
  }

  async testTokenAccuracy() {
    const testPrompts = [
      'Hi',
      'Hello, how are you today?',
      'Please write a detailed explanation of how neural networks work in machine learning, including backpropagation.'
    ];

    const results = [];

    for (const prompt of testPrompts) {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      this.trackUsage(response);

      const result = {
        promptLength: prompt.length,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        charsPerInputToken: prompt.length / response.usage.input_tokens,
        responseLength: response.content[0].text.length,
        charsPerOutputToken: response.content[0].text.length / response.usage.output_tokens
      };

      results.push(result);

      console.log(`📊 Prompt: "${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}"`);
      console.log(`   Length: ${result.promptLength} chars → ${result.inputTokens} tokens (${result.charsPerInputToken.toFixed(2)} chars/token)`);
      console.log(`   Response: ${result.responseLength} chars → ${result.outputTokens} tokens (${result.charsPerOutputToken.toFixed(2)} chars/token)`);
    }

    // Verify token scaling makes sense
    const shortPrompt = results[0];
    const longPrompt = results[2];

    if (longPrompt.inputTokens <= shortPrompt.inputTokens) {
      throw new Error('Token scaling seems incorrect - longer prompt should use more tokens');
    }

    return {
      success: true,
      results: results,
      scalingCorrect: longPrompt.inputTokens > shortPrompt.inputTokens
    };
  }

  async testResponseAuthenticity() {
    const uniqueId = Math.random().toString(36).substring(2, 15);

    const response = await this.anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: `Echo this unique identifier exactly: ${uniqueId}`
      }]
    });

    this.trackUsage(response);

    const responseText = response.content[0].text;
    console.log('🔑 Unique ID sent:', uniqueId);
    console.log('📤 Response received:', responseText);
    console.log('🆔 Message ID:', response.id);
    console.log('🤖 Model:', response.model);

    // Verify response authenticity markers
    if (!responseText.includes(uniqueId)) {
      throw new Error('Response does not contain unique identifier');
    }

    if (!response.id.startsWith('msg_')) {
      throw new Error('Response ID format is not from Anthropic API');
    }

    if (!response.model.includes('claude')) {
      throw new Error('Model name does not indicate Claude');
    }

    return {
      success: true,
      uniqueIdEchoed: responseText.includes(uniqueId),
      messageIdValid: response.id.startsWith('msg_'),
      modelValid: response.model.includes('claude')
    };
  }

  async testErrorHandling() {
    try {
      await this.anthropic.messages.create({
        model: 'invalid-model-name',
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: 'test'
        }]
      });

      throw new Error('Expected API error for invalid model, but request succeeded');

    } catch (error) {
      console.log('✅ Correctly caught API error:', error.message);

      if (!error.message.includes('model') && !error.message.includes('not found')) {
        throw new Error('Error message does not seem to be about invalid model');
      }

      return {
        success: true,
        errorCaught: true,
        errorMessage: error.message
      };
    }
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      apiKey: this.apiKey.substring(0, 15) + '...',
      testSummary: {
        totalTests: this.testResults.length,
        passed: this.testResults.filter(t => t.success).length,
        failed: this.testResults.filter(t => !t.success).length
      },
      usageSummary: {
        totalInputTokens: this.totalInputTokens,
        totalOutputTokens: this.totalOutputTokens,
        totalTokens: this.totalInputTokens + this.totalOutputTokens,
        estimatedTotalCost: this.totalCost
      },
      testDetails: this.testResults
    };

    // Save report to file
    const reportPath = path.join(__dirname, 'validation-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log('📄 Detailed report saved to:', reportPath);

    return report;
  }

  printSummary() {
    console.log('📋 CLAUDE API VALIDATION SUMMARY');
    console.log('═'.repeat(50));
    console.log(`✅ Tests Passed: ${this.testResults.filter(t => t.success).length}`);
    console.log(`❌ Tests Failed: ${this.testResults.filter(t => !t.success).length}`);
    console.log(`🔢 Total Input Tokens: ${this.totalInputTokens}`);
    console.log(`🔢 Total Output Tokens: ${this.totalOutputTokens}`);
    console.log(`💰 Estimated Total Cost: $${this.totalCost.toFixed(6)}`);
    console.log('═'.repeat(50));

    if (this.testResults.every(t => t.success)) {
      console.log('🎉 ALL TESTS PASSED - Claude API is working correctly!');
    } else {
      console.log('⚠️  Some tests failed - check the details above');
    }
  }

  async run() {
    try {
      await this.init();

      // Run all tests
      await this.runTest('Basic Connectivity', () => this.testBasicConnectivity());
      await this.runTest('Model Capabilities', () => this.testModelCapabilities());
      await this.runTest('Token Accuracy', () => this.testTokenAccuracy());
      await this.runTest('Response Authenticity', () => this.testResponseAuthenticity());
      await this.runTest('Error Handling', () => this.testErrorHandling());

      // Generate report and summary
      await this.generateReport();
      this.printSummary();

      return true;

    } catch (error) {
      console.log('\n❌ VALIDATION FAILED:', error.message);
      this.printSummary();
      return false;
    }
  }
}

// Run validation if script is called directly
if (require.main === module) {
  const validator = new ManualClaudeValidator();

  validator.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { ManualClaudeValidator };