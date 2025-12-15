#!/usr/bin/env node

/**
 * Demo: Official @anthropic-ai/claude-code SDK Integration
 *
 * This script demonstrates the new ClaudeCodeSDKManager implementation
 * using the official Claude Code SDK with full tool access.
 */

import { getClaudeCodeSDKManager } from './src/services/ClaudeCodeSDKManager.js';

async function demo() {
  console.log('🎯 Claude Code SDK Manager Demo\n');

  // Initialize the manager
  const manager = getClaudeCodeSDKManager();

  console.log('\n📊 Manager Status:');
  console.log(JSON.stringify(manager.getStatus(), null, 2));

  console.log('\n🔍 Running health check...');
  const isHealthy = await manager.healthCheck();
  console.log(`Health Status: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);

  console.log('\n💬 Testing simple query...');
  try {
    const result = await manager.queryClaudeCode(
      'List the files in the current directory using the Bash tool'
    );

    if (result.success) {
      console.log('✅ Query succeeded!');
      console.log(`📝 Received ${result.messages.length} messages`);

      // Extract and display content from the last assistant message
      const lastMessage = result.messages[result.messages.length - 1];
      if (lastMessage && lastMessage.type === 'assistant') {
        const content = manager.extractContent(lastMessage);
        console.log('\n📄 Response Content:');
        console.log(content.substring(0, 500) + (content.length > 500 ? '...' : ''));
      }
    } else {
      console.log(`❌ Query failed: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ Demo error:', error.message);
  }

  console.log('\n🏁 Demo completed!');
}

// Run the demo
demo().catch(console.error);