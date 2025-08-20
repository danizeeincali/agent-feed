/**
 * Test Mock API Service
 */

import { mockApiService } from '../src/services/mockApiService.js';

console.log('🧪 Testing Mock API Service...\n');

async function testMockApi() {
  try {
    // Test agent posts
    console.log('📝 Testing agent posts...');
    const posts = await mockApiService.getAgentPosts();
    console.log(`✅ Retrieved ${posts.data.length} posts`);
    
    // Test agents
    console.log('🤖 Testing agents...');
    const agents = await mockApiService.getAgents();
    console.log(`✅ Retrieved ${agents.agents.length} agents`);
    
    // Test activities
    console.log('⚡ Testing activities...');
    const activities = await mockApiService.getActivities();
    console.log(`✅ Retrieved ${activities.activities.length} activities`);
    
    // Test analytics
    console.log('📊 Testing analytics...');
    const analytics = await mockApiService.getPerformanceAnalytics();
    console.log(`✅ Retrieved analytics with ${analytics.metrics.length} data points`);
    
    console.log('\n✅ All mock API tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Mock API test failed:', error);
    return false;
  }
}

testMockApi().then(success => {
  process.exit(success ? 0 : 1);
});