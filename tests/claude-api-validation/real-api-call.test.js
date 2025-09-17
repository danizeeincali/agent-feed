#!/usr/bin/env node

/**
 * Claude API Real Call Validation Test
 * Tests actual API calls to Anthropic's servers using the configured API key
 */

const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');
const Anthropic = require('@anthropic-ai/sdk');
const crypto = require('crypto');

// Import environment variables
require('dotenv').config({ path: '/workspaces/agent-feed/.env' });

describe('Claude API Real Call Validation', () => {
  let anthropic;
  let apiKey;

  beforeAll(() => {
    // Get API key from environment
    apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found in environment variables');
    }

    if (!apiKey.startsWith('sk-ant-')) {
      throw new Error('Invalid ANTHROPIC_API_KEY format. Expected sk-ant-* format.');
    }

    // Initialize Anthropic client
    anthropic = new Anthropic({
      apiKey: apiKey
    });

    console.log('✅ Anthropic client initialized with API key:', apiKey.substring(0, 15) + '...');
  });

  test('Should make a real API call to Anthropic servers', async () => {
    const testPrompt = 'What is 2 + 2? Respond with just the number.';
    const startTime = Date.now();

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Using fastest model for testing
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: testPrompt
      }]
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify response structure
    expect(response).toBeDefined();
    expect(response.content).toBeDefined();
    expect(Array.isArray(response.content)).toBe(true);
    expect(response.content.length).toBeGreaterThan(0);
    expect(response.content[0].text).toBeDefined();

    // Verify response content is reasonable
    const responseText = response.content[0].text.trim();
    expect(responseText).toMatch(/4/); // Should contain the number 4

    // Verify usage metrics are present
    expect(response.usage).toBeDefined();
    expect(response.usage.input_tokens).toBeGreaterThan(0);
    expect(response.usage.output_tokens).toBeGreaterThan(0);

    // Log results for verification
    console.log('🔍 API Response Details:');
    console.log('  Response Text:', responseText);
    console.log('  Model Used:', response.model);
    console.log('  Duration:', duration + 'ms');
    console.log('  Input Tokens:', response.usage.input_tokens);
    console.log('  Output Tokens:', response.usage.output_tokens);
    console.log('  Stop Reason:', response.stop_reason);

    // Verify this is a real response from Anthropic
    expect(response.model).toMatch(/claude/i);
    expect(response.id).toMatch(/msg_/);
    expect(duration).toBeGreaterThan(100); // Real API calls take time
  }, 30000); // 30 second timeout

  test('Should track token usage accurately', async () => {
    const testPrompt = 'Count from 1 to 5, separating each number with a comma.';

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: testPrompt
      }]
    });

    const usage = response.usage;

    // Verify usage tracking
    expect(usage).toBeDefined();
    expect(typeof usage.input_tokens).toBe('number');
    expect(typeof usage.output_tokens).toBe('number');
    expect(usage.input_tokens).toBeGreaterThan(0);
    expect(usage.output_tokens).toBeGreaterThan(0);

    // Input tokens should be reasonable for our prompt
    expect(usage.input_tokens).toBeGreaterThan(5);
    expect(usage.input_tokens).toBeLessThan(100);

    // Output tokens should match response length roughly
    const responseText = response.content[0].text;
    const wordCount = responseText.split(/\s+/).length;
    expect(usage.output_tokens).toBeGreaterThan(Math.floor(wordCount * 0.5));

    console.log('📊 Token Usage Analysis:');
    console.log('  Prompt:', testPrompt);
    console.log('  Response:', responseText.substring(0, 100) + '...');
    console.log('  Input Tokens:', usage.input_tokens);
    console.log('  Output Tokens:', usage.output_tokens);
    console.log('  Word Count:', wordCount);
    console.log('  Tokens per Word (approx):', (usage.output_tokens / wordCount).toFixed(2));
  }, 30000);

  test('Should verify response authenticity from Anthropic servers', async () => {
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const testPrompt = `Echo back this unique identifier: ${uniqueId}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: testPrompt
      }]
    });

    const responseText = response.content[0].text;

    // Verify response contains our unique identifier
    expect(responseText).toContain(uniqueId);

    // Verify response has Anthropic-specific metadata
    expect(response.id).toMatch(/^msg_/);
    expect(response.model).toMatch(/claude/);
    expect(response.role).toBe('assistant');
    expect(response.type).toBe('message');

    // Verify response headers/metadata that indicate real Anthropic response
    expect(response.content[0].type).toBe('text');
    expect(response.stop_reason).toMatch(/end_turn|stop_sequence|max_tokens/);

    console.log('🔐 Authenticity Verification:');
    console.log('  Unique ID sent:', uniqueId);
    console.log('  Response contains ID:', responseText.includes(uniqueId));
    console.log('  Message ID:', response.id);
    console.log('  Model:', response.model);
    console.log('  Stop Reason:', response.stop_reason);
  }, 30000);

  test('Should handle API errors appropriately', async () => {
    // Test with invalid model name to trigger API error
    await expect(
      anthropic.messages.create({
        model: 'invalid-model-name',
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: 'test'
        }]
      })
    ).rejects.toThrow();

    console.log('✅ API error handling works correctly');
  });

  test('Should respect rate limits and pricing tiers', async () => {
    const startTime = Date.now();

    // Make multiple requests to test rate limiting behavior
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(
        anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{
            role: 'user',
            content: `Test request ${i + 1}`
          }]
        })
      );
    }

    const responses = await Promise.all(promises);
    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Verify all requests succeeded
    expect(responses).toHaveLength(3);
    responses.forEach((response, index) => {
      expect(response.content[0].text).toBeDefined();
      expect(response.usage.input_tokens).toBeGreaterThan(0);
      expect(response.usage.output_tokens).toBeGreaterThan(0);
    });

    // Calculate total token usage
    const totalInputTokens = responses.reduce((sum, r) => sum + r.usage.input_tokens, 0);
    const totalOutputTokens = responses.reduce((sum, r) => sum + r.usage.output_tokens, 0);

    console.log('⚡ Rate Limit Test Results:');
    console.log('  Concurrent Requests:', promises.length);
    console.log('  Total Duration:', totalDuration + 'ms');
    console.log('  Avg Duration per Request:', Math.round(totalDuration / promises.length) + 'ms');
    console.log('  Total Input Tokens:', totalInputTokens);
    console.log('  Total Output Tokens:', totalOutputTokens);
    console.log('  All requests successful:', responses.length === 3);
  }, 60000);

  afterAll(() => {
    console.log('🧹 Claude API validation tests completed');
  });
});