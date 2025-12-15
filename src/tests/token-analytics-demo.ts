/**
 * Token Analytics Demo & Test
 * Demonstrates how to use the token analytics system with real data
 */

import { tokenAnalyticsDB } from '@/database/token-analytics-db';
import { tokenUsageTracker } from '@/utils/tokenUsageTracker';
import { logger } from '@/utils/logger';

// Sample Claude API response
const sampleClaudeResponse = {
  id: 'msg_01ABC123DEF456',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'Based on the data analysis, I found several key patterns in your token usage:\n\n1. **Peak Usage Hours**: Your token usage peaks between 2-4 PM EST\n2. **Cost Efficiency**: Claude 3.5 Sonnet provides the best cost-per-value ratio\n3. **Usage Patterns**: Tool usage accounts for 23% of total token consumption\n\nI recommend implementing caching for frequently requested analyses to reduce costs.'
    }
  ],
  model: 'claude-3-5-sonnet-20241022',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: {
    input_tokens: 245,
    output_tokens: 387,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0
  }
};

const sampleRequest = {
  model: 'claude-3-5-sonnet-20241022',
  messages: [
    {
      role: 'user',
      content: 'Analyze my token usage patterns from the last week and provide recommendations for cost optimization.'
    }
  ],
  max_tokens: 1000,
  tools: [
    {
      name: 'get_token_usage_data',
      description: 'Retrieve token usage data from the analytics database'
    }
  ]
};

/**
 * Demo function to populate database with sample data
 */
export async function populateSampleData() {
  try {
    console.log('🔄 Populating token analytics with sample data...');

    // Generate sample data for the last 7 days
    const now = new Date();
    const sampleData = [];

    for (let day = 6; day >= 0; day--) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);

      // Generate 10-20 random requests per day
      const requestsPerDay = Math.floor(Math.random() * 10) + 10;

      for (let i = 0; i < requestsPerDay; i++) {
        const timestamp = new Date(date);
        timestamp.setHours(Math.floor(Math.random() * 24));
        timestamp.setMinutes(Math.floor(Math.random() * 60));

        const providers = ['anthropic', 'claude-flow', 'mcp'] as const;
        const models = {
          anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
          'claude-flow': ['agent-orchestrator', 'research-agent', 'coder-agent'],
          mcp: ['tool-executor', 'file-manager', 'web-search']
        };
        const requestTypes = ['chat', 'completion', 'tool_use', 'agent_spawn'];
        const components = ['agent-feed', 'analytics', 'orchestration', 'search', 'chat'];

        const provider = providers[Math.floor(Math.random() * providers.length)];
        const model = models[provider][Math.floor(Math.random() * models[provider].length)];
        const requestType = requestTypes[Math.floor(Math.random() * requestTypes.length)];
        const component = components[Math.floor(Math.random() * components.length)];

        const inputTokens = Math.floor(Math.random() * 300) + 50; // 50-350 tokens
        const outputTokens = Math.floor(Math.random() * 500) + 100; // 100-600 tokens
        const processingTime = Math.floor(Math.random() * 2000) + 200; // 200-2200ms

        sampleData.push({
          session_id: `session-${day}-${Math.floor(i / 5)}`,
          user_id: 'demo-user',
          request_id: `req-${timestamp.getTime()}-${i}`,
          provider,
          model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          request_type: requestType,
          component,
          processing_time_ms: processingTime,
          first_token_latency_ms: Math.floor(processingTime * 0.1),
          tokens_per_second: Math.round((inputTokens + outputTokens) / (processingTime / 1000)),
          message_content: `Sample request for ${requestType} in ${component} component`,
          response_content: `Generated response for ${requestType} request with ${outputTokens} tokens`,
          tools_used: requestType === 'tool_use' ? JSON.stringify(['get_data', 'analyze']) : undefined,
          metadata: JSON.stringify({
            demo: true,
            day: day,
            request_index: i
          }),
          timestamp: timestamp.toISOString()
        });
      }
    }

    // Insert all sample data
    for (const data of sampleData) {
      tokenAnalyticsDB.insertTokenUsage(data as any);
    }

    console.log(`✅ Successfully populated ${sampleData.length} sample token usage records`);
    return sampleData.length;
  } catch (error) {
    console.error('❌ Failed to populate sample data:', error);
    throw error;
  }
}

/**
 * Demo function to test token tracking
 */
export async function demoTokenTracking() {
  try {
    console.log('🔄 Demonstrating token tracking...');

    // Track Claude API usage
    tokenUsageTracker.trackClaudeUsage(
      sampleClaudeResponse,
      sampleRequest,
      {
        component: 'token-analytics-demo',
        request_type: 'analysis',
        processing_time_ms: 1450
      }
    );

    // Track MCP tool usage
    tokenUsageTracker.trackMCPUsage(
      'get_token_usage_data',
      1240, // input size in characters
      3850, // output size in characters
      {
        component: 'analytics-dashboard',
        processing_time_ms: 320
      }
    );

    // Track Claude Flow agent usage
    tokenUsageTracker.trackClaudeFlowUsage(
      'research-agent',
      { input: 180, output: 420 },
      {
        component: 'agent-orchestration',
        processing_time_ms: 2100,
        task_id: 'task-analytics-research',
        swarm_id: 'swarm-demo-analytics'
      }
    );

    // Flush tracking queue
    await tokenUsageTracker.flush();

    console.log('✅ Token tracking demo completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Token tracking demo failed:', error);
    throw error;
  }
}

/**
 * Demo function to test analytics queries
 */
export async function demoAnalyticsQueries() {
  try {
    console.log('🔄 Demonstrating analytics queries...');

    // Test hourly usage
    const hourlyUsage = tokenAnalyticsDB.getHourlyUsage24h();
    console.log(`📊 Hourly usage records: ${hourlyUsage.length}`);

    // Test daily usage
    const dailyUsage = tokenAnalyticsDB.getDailyUsage30d();
    console.log(`📊 Daily usage records: ${dailyUsage.length}`);

    // Test recent messages
    const recentMessages = tokenAnalyticsDB.getRecentMessages(10);
    console.log(`📊 Recent messages: ${recentMessages.length}`);

    // Test usage summary
    const summary = tokenAnalyticsDB.getUsageSummary();
    console.log('📊 Usage summary:', summary);

    // Test usage by provider
    const byProvider = tokenAnalyticsDB.getUsageByProvider();
    console.log('📊 Usage by provider:', byProvider);

    // Test usage by model
    const byModel = tokenAnalyticsDB.getUsageByModel();
    console.log('📊 Usage by model:', byModel);

    // Test cost breakdown
    const costBreakdown = tokenAnalyticsDB.getCostBreakdown(7);
    console.log(`📊 Cost breakdown (7 days): ${costBreakdown.length} records`);

    console.log('✅ Analytics queries demo completed successfully');
    return {
      hourlyUsage: hourlyUsage.length,
      dailyUsage: dailyUsage.length,
      recentMessages: recentMessages.length,
      summary,
      byProvider: byProvider.length,
      byModel: byModel.length,
      costBreakdown: costBreakdown.length
    };
  } catch (error) {
    console.error('❌ Analytics queries demo failed:', error);
    throw error;
  }
}

/**
 * Demo function to test WebSocket broadcasting
 */
export async function demoWebSocketBroadcasting() {
  try {
    console.log('🔄 Demonstrating WebSocket broadcasting...');

    // Import WebSocket functions
    const { broadcastTokenUsageUpdate, broadcastHourlySummary, broadcastCostAlert } =
      await import('@/api/websockets/token-analytics');

    // Create sample token usage for broadcasting
    const sampleUsage = {
      id: Date.now(),
      session_id: 'demo-session',
      user_id: 'demo-user',
      request_id: `demo-${Date.now()}`,
      provider: 'anthropic' as const,
      model: 'claude-3-5-sonnet-20241022',
      input_tokens: 150,
      output_tokens: 300,
      cost_input: 45, // cents
      cost_output: 180, // cents
      request_type: 'demo',
      component: 'websocket-demo',
      processing_time_ms: 1200,
      timestamp: new Date().toISOString()
    };

    // Broadcast token usage update
    broadcastTokenUsageUpdate(sampleUsage as any);

    // Broadcast hourly summary
    broadcastHourlySummary({
      hour: new Date().toISOString(),
      total_tokens: 12500,
      total_cost: 875, // cents
      request_count: 25,
      avg_processing_time: 1350
    });

    // Broadcast cost alert
    broadcastCostAlert({
      type: 'daily_limit',
      message: 'Daily token cost approaching limit',
      threshold: 1000, // cents ($10)
      current: 875, // cents ($8.75)
      severity: 'warning'
    });

    console.log('✅ WebSocket broadcasting demo completed successfully');
    return true;
  } catch (error) {
    console.error('❌ WebSocket broadcasting demo failed:', error);
    throw error;
  }
}

/**
 * Complete demo and test suite
 */
export async function runTokenAnalyticsDemo() {
  try {
    console.log('🚀 Starting comprehensive token analytics demo...');

    // Initialize database
    await tokenAnalyticsDB.initialize();
    console.log('✅ Database initialized');

    // Populate sample data
    const recordsCreated = await populateSampleData();
    console.log(`✅ Created ${recordsCreated} sample records`);

    // Test token tracking
    await demoTokenTracking();
    console.log('✅ Token tracking tested');

    // Test analytics queries
    const queryResults = await demoAnalyticsQueries();
    console.log('✅ Analytics queries tested');

    // Test WebSocket broadcasting
    await demoWebSocketBroadcasting();
    console.log('✅ WebSocket broadcasting tested');

    // Test tracker status
    const trackerStatus = tokenUsageTracker.getStatus();
    console.log('📊 Tracker status:', trackerStatus);

    console.log('🎉 Token analytics demo completed successfully!');
    console.log('\n📈 Frontend Access:');
    console.log('   • Visit http://localhost:3000/analytics');
    console.log('   • Click on "Claude SDK Analytics" tab');
    console.log('   • View real-time token usage charts and data');

    return {
      recordsCreated,
      queryResults,
      trackerStatus,
      success: true
    };
  } catch (error) {
    console.error('❌ Token analytics demo failed:', error);
    return {
      error: error.message,
      success: false
    };
  }
}

// Export for use in other modules
export {
  tokenAnalyticsDB,
  tokenUsageTracker
};

// If run directly, execute the demo
if (require.main === module) {
  runTokenAnalyticsDemo()
    .then(result => {
      console.log('Demo result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Demo error:', error);
      process.exit(1);
    });
}