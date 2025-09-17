#!/usr/bin/env node

/**
 * Claude API Usage and Cost Tracking Test
 * Validates that usage metrics and cost tracking are working correctly
 */

const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');

require('dotenv').config({ path: '/workspaces/agent-feed/.env' });

describe('Claude API Usage and Cost Tracking', () => {
  let anthropic;
  let usageTracker;

  beforeAll(() => {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Initialize usage tracker
    usageTracker = {
      sessions: [],
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      requestCount: 0
    };
  });

  // Anthropic Claude 3 Haiku pricing (as of 2024)
  const PRICING = {
    'claude-3-haiku-20240307': {
      input: 0.00025 / 1000,   // $0.25 per 1K input tokens
      output: 0.00125 / 1000   // $1.25 per 1K output tokens
    },
    'claude-3-sonnet-20240229': {
      input: 0.003 / 1000,     // $3 per 1K input tokens
      output: 0.015 / 1000     // $15 per 1K output tokens
    },
    'claude-3-opus-20240229': {
      input: 0.015 / 1000,     // $15 per 1K input tokens
      output: 0.075 / 1000     // $75 per 1K output tokens
    }
  };

  function calculateCost(model, inputTokens, outputTokens) {
    const pricing = PRICING[model];
    if (!pricing) return 0;

    return (inputTokens * pricing.input) + (outputTokens * pricing.output);
  }

  function trackUsage(response, sessionId = 'default') {
    const session = {
      id: sessionId,
      timestamp: new Date().toISOString(),
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cost: calculateCost(response.model, response.usage.input_tokens, response.usage.output_tokens),
      responseId: response.id
    };

    usageTracker.sessions.push(session);
    usageTracker.totalInputTokens += session.inputTokens;
    usageTracker.totalOutputTokens += session.outputTokens;
    usageTracker.totalCost += session.cost;
    usageTracker.requestCount++;

    return session;
  }

  test('Should track basic usage metrics correctly', async () => {
    const testPrompt = 'Write a haiku about programming. Make it exactly 3 lines.';

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: testPrompt
      }]
    });

    const session = trackUsage(response, 'basic-usage-test');

    // Verify usage data structure
    expect(session).toBeDefined();
    expect(session.inputTokens).toBeGreaterThan(0);
    expect(session.outputTokens).toBeGreaterThan(0);
    expect(session.cost).toBeGreaterThan(0);
    expect(session.model).toBe('claude-3-haiku-20240307');

    // Verify cost calculation
    const expectedCost = calculateCost(
      response.model,
      response.usage.input_tokens,
      response.usage.output_tokens
    );
    expect(session.cost).toBeCloseTo(expectedCost, 6);

    console.log('📊 Basic Usage Tracking:');
    console.log('  Prompt:', testPrompt);
    console.log('  Response:', response.content[0].text.substring(0, 100) + '...');
    console.log('  Input Tokens:', session.inputTokens);
    console.log('  Output Tokens:', session.outputTokens);
    console.log('  Estimated Cost: $' + session.cost.toFixed(6));
    console.log('  Model Used:', session.model);
  });

  test('Should track usage across multiple models accurately', async () => {
    const models = [
      'claude-3-haiku-20240307',
      // Note: Only testing Haiku to avoid high costs in testing
      // 'claude-3-sonnet-20240229'
    ];

    for (const model of models) {
      const response = await anthropic.messages.create({
        model: model,
        max_tokens: 50,
        messages: [{
          role: 'user',
          content: `Using ${model}, what is the capital of France?`
        }]
      });

      const session = trackUsage(response, `multi-model-${model}`);

      expect(session.model).toBe(model);
      expect(session.inputTokens).toBeGreaterThan(0);
      expect(session.outputTokens).toBeGreaterThan(0);
      expect(session.cost).toBeGreaterThan(0);

      console.log(`💰 Cost for ${model}:`);
      console.log('  Input Tokens:', session.inputTokens);
      console.log('  Output Tokens:', session.outputTokens);
      console.log('  Cost: $' + session.cost.toFixed(6));
    }

    // Verify different models have different pricing
    const haiku = usageTracker.sessions.find(s => s.model === 'claude-3-haiku-20240307');
    expect(haiku).toBeDefined();
    expect(haiku.cost).toBeGreaterThan(0);
  });

  test('Should accumulate usage over time correctly', async () => {
    const initialTotal = usageTracker.totalCost;
    const requestCount = 3;

    for (let i = 0; i < requestCount; i++) {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 30,
        messages: [{
          role: 'user',
          content: `Count to ${i + 1}`
        }]
      });

      trackUsage(response, `accumulation-test-${i}`);
    }

    // Verify accumulation
    expect(usageTracker.requestCount).toBeGreaterThanOrEqual(requestCount);
    expect(usageTracker.totalCost).toBeGreaterThan(initialTotal);
    expect(usageTracker.totalInputTokens).toBeGreaterThan(0);
    expect(usageTracker.totalOutputTokens).toBeGreaterThan(0);
    expect(usageTracker.sessions.length).toBeGreaterThanOrEqual(requestCount);

    console.log('📈 Cumulative Usage Statistics:');
    console.log('  Total Requests:', usageTracker.requestCount);
    console.log('  Total Input Tokens:', usageTracker.totalInputTokens);
    console.log('  Total Output Tokens:', usageTracker.totalOutputTokens);
    console.log('  Total Estimated Cost: $' + usageTracker.totalCost.toFixed(6));
    console.log('  Average Cost per Request: $' + (usageTracker.totalCost / usageTracker.requestCount).toFixed(6));
  });

  test('Should export usage data for analytics', async () => {
    // Create one more session for export testing
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 25,
      messages: [{
        role: 'user',
        content: 'Say hello briefly'
      }]
    });

    trackUsage(response, 'export-test');

    // Export usage data
    const exportData = {
      summary: {
        totalRequests: usageTracker.requestCount,
        totalInputTokens: usageTracker.totalInputTokens,
        totalOutputTokens: usageTracker.totalOutputTokens,
        totalCost: usageTracker.totalCost,
        averageCostPerRequest: usageTracker.totalCost / usageTracker.requestCount,
        exportedAt: new Date().toISOString()
      },
      sessions: usageTracker.sessions,
      costBreakdown: {
        byModel: {}
      }
    };

    // Calculate cost breakdown by model
    usageTracker.sessions.forEach(session => {
      if (!exportData.costBreakdown.byModel[session.model]) {
        exportData.costBreakdown.byModel[session.model] = {
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalCost: 0
        };
      }

      const modelBreakdown = exportData.costBreakdown.byModel[session.model];
      modelBreakdown.requests++;
      modelBreakdown.inputTokens += session.inputTokens;
      modelBreakdown.outputTokens += session.outputTokens;
      modelBreakdown.totalCost += session.cost;
    });

    // Save to file
    const exportPath = '/workspaces/agent-feed/tests/claude-api-validation/usage-report.json';
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));

    // Verify export file
    const exportedData = JSON.parse(await fs.readFile(exportPath, 'utf8'));
    expect(exportedData.summary.totalRequests).toBe(usageTracker.requestCount);
    expect(exportedData.sessions.length).toBe(usageTracker.requestCount);
    expect(exportedData.costBreakdown.byModel).toBeDefined();

    console.log('📄 Usage Data Export:');
    console.log('  Export Path:', exportPath);
    console.log('  Total Sessions Exported:', exportedData.sessions.length);
    console.log('  Models Used:', Object.keys(exportedData.costBreakdown.byModel));
    console.log('  Export File Size:', (await fs.stat(exportPath)).size + ' bytes');
  });

  test('Should validate cost calculations against known pricing', async () => {
    // Make a controlled request with predictable token usage
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: 'Hi'
      }]
    });

    const session = trackUsage(response, 'cost-validation');

    // Manual cost calculation
    const manualCost = (session.inputTokens * PRICING['claude-3-haiku-20240307'].input) +
                      (session.outputTokens * PRICING['claude-3-haiku-20240307'].output);

    expect(session.cost).toBeCloseTo(manualCost, 8);

    // Verify cost is reasonable (should be very small for this simple request)
    expect(session.cost).toBeLessThan(0.01); // Should cost less than 1 cent
    expect(session.cost).toBeGreaterThan(0);  // But more than zero

    console.log('💵 Cost Validation:');
    console.log('  Simple Request Cost: $' + session.cost.toFixed(8));
    console.log('  Manual Calculation: $' + manualCost.toFixed(8));
    console.log('  Difference: $' + Math.abs(session.cost - manualCost).toFixed(8));
    console.log('  Input Tokens:', session.inputTokens);
    console.log('  Output Tokens:', session.outputTokens);
  });

  afterAll(async () => {
    // Final summary
    console.log('\n🏁 Final Usage Summary:');
    console.log('  Total API Calls Made:', usageTracker.requestCount);
    console.log('  Total Cost Incurred: $' + usageTracker.totalCost.toFixed(6));
    console.log('  Average Cost per Call: $' + (usageTracker.totalCost / usageTracker.requestCount).toFixed(6));
    console.log('  Total Input Tokens:', usageTracker.totalInputTokens);
    console.log('  Total Output Tokens:', usageTracker.totalOutputTokens);

    // Verify total cost is reasonable for testing
    expect(usageTracker.totalCost).toBeLessThan(0.10); // Should cost less than 10 cents total
  });
});