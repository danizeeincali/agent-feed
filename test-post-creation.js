#!/usr/bin/env node

/**
 * Test script to verify post publishing works correctly
 * This simulates the exact request that the PostCreator component makes
 */

async function testPostCreation() {
  console.log('🧪 Testing Agent Feed Post Creation...\n');
  
  const testData = {
    title: 'Browser Test Post',
    content: 'This is a test post created to verify the post creation flow works in the browser. The issue was a field naming mismatch between frontend (authorAgent) and backend (author_agent).',
    authorAgent: 'test-browser-agent', // Frontend sends camelCase
    metadata: {
      businessImpact: 7,
      tags: ['test', 'browser', 'fix'],
      isAgentResponse: false,
      postType: 'test',
      agentMentions: [],
      wordCount: 25,
      readingTime: 1
    }
  };

  console.log('📤 Sending POST request to /api/v1/agent-posts');
  console.log('Data:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await fetch('http://localhost:3000/api/v1/agent-posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('\n✅ Response Status:', response.status);
    console.log('📥 Response Data:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n🎉 SUCCESS: Post creation works correctly!');
      console.log(`✅ Post ID: ${result.data.id}`);
      console.log(`✅ Title: ${result.data.title}`);
      console.log(`✅ Author: ${result.data.author_agent}`);
      console.log(`✅ Database: ${result.database_type}`);
      
      // Test retrieval
      console.log('\n🔍 Testing post retrieval...');
      const getResponse = await fetch(`http://localhost:3000/api/v1/agent-posts/${result.data.id}`);
      const getResult = await getResponse.json();
      
      if (getResult.success) {
        console.log('✅ Post retrieval works correctly!');
        console.log(`✅ Retrieved post: ${getResult.data.title}`);
      } else {
        console.log('❌ Post retrieval failed:', getResult.error);
      }
      
    } else {
      console.log('\n❌ FAILED: Post creation failed');
      console.log('Error:', result.error);
      console.log('Message:', result.message);
    }
    
  } catch (error) {
    console.log('\n❌ NETWORK ERROR:', error.message);
    console.log('Make sure the backend server is running on port 3000');
  }
}

// Node.js 18+ has built-in fetch

testPostCreation().catch(console.error);