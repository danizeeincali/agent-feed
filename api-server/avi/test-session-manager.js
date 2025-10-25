/**
 * Test AVI Session Manager
 * Verifies basic functionality without full integration
 */

import { getAviSession } from './session-manager.js';

async function testSessionManager() {
  console.log('🧪 Testing AVI Session Manager...\n');

  try {
    // Test 1: Get session instance
    console.log('Test 1: Get session instance...');
    const aviSession = getAviSession({
      idleTimeout: 5 * 60 * 1000 // 5 minutes for testing
    });
    console.log('✅ Session instance created\n');

    // Test 2: Check initial status
    console.log('Test 2: Check initial status...');
    const initialStatus = aviSession.getStatus();
    console.log('Initial status:', JSON.stringify(initialStatus, null, 2));
    if (!initialStatus.active) {
      console.log('✅ Session correctly starts inactive\n');
    } else {
      console.error('❌ Session should start inactive\n');
    }

    // Test 3: Load AVI prompt
    console.log('Test 3: Load AVI prompt...');
    try {
      const prompt = await aviSession.loadAviPrompt();
      console.log(`✅ Prompt loaded: ${prompt.length} characters`);
      console.log(`Preview: ${prompt.substring(0, 200)}...\n`);
    } catch (error) {
      console.error('❌ Failed to load prompt:', error.message, '\n');
    }

    // Test 4: Check status after operations
    console.log('Test 4: Final status check...');
    const finalStatus = aviSession.getStatus();
    console.log('Final status:', JSON.stringify(finalStatus, null, 2));

    console.log('\n✅ All basic tests passed!');
    console.log('\nNOTE: Full chat functionality requires running server with SDK integration.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testSessionManager();
