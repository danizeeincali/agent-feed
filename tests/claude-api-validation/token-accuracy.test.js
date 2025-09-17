#!/usr/bin/env node

/**
 * Claude API Token Consumption Accuracy Test
 * Validates that token counting and consumption measurements are accurate
 */

const { describe, test, expect, beforeAll } = require('@jest/globals');
const Anthropic = require('@anthropic-ai/sdk');

require('dotenv').config({ path: '/workspaces/agent-feed/.env' });

describe('Claude API Token Consumption Accuracy', () => {
  let anthropic;

  beforeAll(() => {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  });

  // Rough token estimation function (very approximate)
  function estimateTokens(text) {
    // Rough estimate: 1 token ≈ 4 characters for English text
    // This is very approximate and varies by model
    return Math.ceil(text.length / 4);
  }

  test('Should count tokens accurately for simple text', async () => {
    const simplePrompt = 'Hello world';
    const estimatedInputTokens = estimateTokens(simplePrompt);

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: simplePrompt
      }]
    });

    const actualInputTokens = response.usage.input_tokens;
    const actualOutputTokens = response.usage.output_tokens;

    // Verify token counts are reasonable
    expect(actualInputTokens).toBeGreaterThan(0);
    expect(actualOutputTokens).toBeGreaterThan(0);

    // Input tokens should be in reasonable range of our estimate
    expect(actualInputTokens).toBeGreaterThan(estimatedInputTokens * 0.5);
    expect(actualInputTokens).toBeLessThan(estimatedInputTokens * 3);

    console.log('🔤 Simple Text Token Analysis:');
    console.log('  Prompt:', simplePrompt);
    console.log('  Prompt Length:', simplePrompt.length, 'chars');
    console.log('  Estimated Tokens:', estimatedInputTokens);
    console.log('  Actual Input Tokens:', actualInputTokens);
    console.log('  Actual Output Tokens:', actualOutputTokens);
    console.log('  Chars per Token (input):', (simplePrompt.length / actualInputTokens).toFixed(2));
  });

  test('Should scale token counts with input length', async () => {
    const prompts = [
      'Hi',
      'Hello there, how are you doing today?',
      'Hello there, how are you doing today? I hope everything is going well for you and that you are having a wonderful time. Please tell me about your capabilities and what you can help me with.'
    ];

    const results = [];

    for (const prompt of prompts) {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 50,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      results.push({
        prompt: prompt,
        promptLength: prompt.length,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        charsPerToken: prompt.length / response.usage.input_tokens
      });
    }

    // Verify token counts scale with input length
    expect(results[0].inputTokens).toBeLessThan(results[1].inputTokens);
    expect(results[1].inputTokens).toBeLessThan(results[2].inputTokens);

    console.log('📏 Token Scaling Analysis:');
    results.forEach((result, index) => {
      console.log(`  Prompt ${index + 1}:`);
      console.log('    Length:', result.promptLength, 'chars');
      console.log('    Input Tokens:', result.inputTokens);
      console.log('    Chars/Token:', result.charsPerToken.toFixed(2));
      console.log('    Preview:', result.prompt.substring(0, 50) + '...');
    });

    // Token efficiency should be relatively consistent
    const avgCharsPerToken = results.reduce((sum, r) => sum + r.charsPerToken, 0) / results.length;
    results.forEach(result => {
      expect(result.charsPerToken).toBeGreaterThan(avgCharsPerToken * 0.5);
      expect(result.charsPerToken).toBeLessThan(avgCharsPerToken * 2);
    });
  });

  test('Should handle special characters and unicode correctly', async () => {
    const specialPrompts = [
      'English text',
      'Émojis: 😀🎉🚀💻',
      'Unicode: αβγδε ζηθικ',
      'Mixed: Hello 世界 🌍 αβγ',
      'Code: function() { return "hello"; }'
    ];

    const results = [];

    for (const prompt of specialPrompts) {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 30,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      results.push({
        type: prompt.includes('😀') ? 'emoji' :
              prompt.includes('αβγ') ? 'unicode' :
              prompt.includes('function') ? 'code' :
              prompt.includes('世界') ? 'mixed' : 'english',
        prompt: prompt,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        bytes: Buffer.from(prompt, 'utf8').length
      });
    }

    console.log('🌍 Special Characters Token Analysis:');
    results.forEach(result => {
      console.log(`  ${result.type.toUpperCase()}:`);
      console.log('    Text:', result.prompt);
      console.log('    Bytes:', result.bytes);
      console.log('    Input Tokens:', result.inputTokens);
      console.log('    Bytes/Token:', (result.bytes / result.inputTokens).toFixed(2));

      // Verify reasonable token counts
      expect(result.inputTokens).toBeGreaterThan(0);
      expect(result.outputTokens).toBeGreaterThan(0);
    });

    // Different character types may have different token efficiencies
    const englishResult = results.find(r => r.type === 'english');
    const emojiResult = results.find(r => r.type === 'emoji');

    if (englishResult && emojiResult) {
      console.log('  Efficiency Comparison:');
      console.log('    English bytes/token:', (englishResult.bytes / englishResult.inputTokens).toFixed(2));
      console.log('    Emoji bytes/token:', (emojiResult.bytes / emojiResult.inputTokens).toFixed(2));
    }
  });

  test('Should count output tokens accurately', async () => {
    // Request specific length outputs to test output token counting
    const lengthRequests = [
      { request: 'Say "hi"', expectedShort: true },
      { request: 'Write a short sentence about programming', expectedShort: false },
      { request: 'Count from 1 to 10, each number on a new line', expectedShort: false }
    ];

    const results = [];

    for (const lengthRequest of lengthRequests) {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: lengthRequest.request
        }]
      });

      const outputText = response.content[0].text;
      const outputLength = outputText.length;
      const outputTokens = response.usage.output_tokens;

      results.push({
        request: lengthRequest.request,
        output: outputText,
        outputLength: outputLength,
        outputTokens: outputTokens,
        charsPerToken: outputLength / outputTokens,
        expectedShort: lengthRequest.expectedShort
      });
    }

    console.log('📤 Output Token Analysis:');
    results.forEach((result, index) => {
      console.log(`  Request ${index + 1}: "${result.request}"`);
      console.log('    Output:', result.output.substring(0, 50) + '...');
      console.log('    Output Length:', result.outputLength, 'chars');
      console.log('    Output Tokens:', result.outputTokens);
      console.log('    Chars/Token:', result.charsPerToken.toFixed(2));

      // Verify token counts make sense
      expect(result.outputTokens).toBeGreaterThan(0);
      expect(result.charsPerToken).toBeGreaterThan(1); // Should be at least 1 char per token
      expect(result.charsPerToken).toBeLessThan(10);   // Should be less than 10 chars per token
    });

    // Verify longer requests generally produce more tokens
    const shortResults = results.filter(r => r.expectedShort);
    const longResults = results.filter(r => !r.expectedShort);

    if (shortResults.length > 0 && longResults.length > 0) {
      const avgShortTokens = shortResults.reduce((sum, r) => sum + r.outputTokens, 0) / shortResults.length;
      const avgLongTokens = longResults.reduce((sum, r) => sum + r.outputTokens, 0) / longResults.length;

      expect(avgLongTokens).toBeGreaterThan(avgShortTokens);
      console.log('  Average short response tokens:', avgShortTokens.toFixed(1));
      console.log('  Average long response tokens:', avgLongTokens.toFixed(1));
    }
  });

  test('Should track total tokens correctly', async () => {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 75,
      messages: [{
        role: 'user',
        content: 'Explain what a token is in AI language models in one paragraph'
      }]
    });

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;

    // Verify total calculation if provided
    const totalTokens = inputTokens + outputTokens;

    console.log('🧮 Total Token Calculation:');
    console.log('  Input Tokens:', inputTokens);
    console.log('  Output Tokens:', outputTokens);
    console.log('  Calculated Total:', totalTokens);

    if (response.usage.total_tokens) {
      console.log('  API Reported Total:', response.usage.total_tokens);
      expect(response.usage.total_tokens).toBe(totalTokens);
    }

    // Verify reasonable proportions
    expect(inputTokens).toBeGreaterThan(0);
    expect(outputTokens).toBeGreaterThan(0);
    expect(outputTokens).toBeGreaterThan(inputTokens); // Output should be longer for this request

    // Verify token counts are consistent with response content
    const responseText = response.content[0].text;
    const responseWords = responseText.split(/\s+/).length;

    console.log('  Response words:', responseWords);
    console.log('  Tokens per word (approx):', (outputTokens / responseWords).toFixed(2));

    // Rough sanity check: tokens should be close to word count
    expect(outputTokens).toBeGreaterThan(responseWords * 0.5);
    expect(outputTokens).toBeLessThan(responseWords * 3);
  });

  test('Should handle max_tokens limit correctly', async () => {
    const maxTokensLimit = 25;

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: maxTokensLimit,
      messages: [{
        role: 'user',
        content: 'Write a very long story about a magical adventure with many characters and detailed descriptions'
      }]
    });

    const outputTokens = response.usage.output_tokens;

    // Output should not exceed max_tokens limit
    expect(outputTokens).toBeLessThanOrEqual(maxTokensLimit);

    // Should use most of the available tokens for this request
    expect(outputTokens).toBeGreaterThan(maxTokensLimit * 0.7);

    console.log('🚧 Max Tokens Limit Test:');
    console.log('  Max Tokens Set:', maxTokensLimit);
    console.log('  Actual Output Tokens:', outputTokens);
    console.log('  Stop Reason:', response.stop_reason);
    console.log('  Response Preview:', response.content[0].text.substring(0, 100) + '...');

    // Should stop due to max_tokens if it hit the limit
    if (outputTokens === maxTokensLimit) {
      expect(response.stop_reason).toBe('max_tokens');
    }
  });

  afterAll(() => {
    console.log('🎯 Token accuracy testing completed');
    console.log('Note: Token counting is model-specific and may vary between models');
  });
});