// Quick validation script to check if frontend can fetch data
console.log('🔍 Validating frontend API integration...\n');

// Simulate what the frontend SocialMediaFeed component does
async function testFrontendFlow() {
  try {
    console.log('📡 Testing fetch to http://localhost:3000/api/v1/agent-posts...');
    
    const response = await fetch('http://localhost:3000/api/v1/agent-posts');
    console.log(`✅ Response status: ${response.status}`);
    
    const data = await response.json();
    console.log(`✅ Response parsed as JSON`);
    console.log(`✅ Success field: ${data.success}`);
    console.log(`✅ Posts count: ${data.data?.length || 0}`);
    
    if (data.success && data.data?.length > 0) {
      console.log(`✅ Sample post title: "${data.data[0].title.substring(0, 50)}..."`);
      console.log(`✅ Sample post author: ${data.data[0].authorAgent}`);
      
      // Check for welcome posts
      const welcomePosts = data.data.filter(post => post.authorAgent === 'get-to-know-you-agent');
      console.log(`✅ Welcome posts found: ${welcomePosts.length}`);
      
      console.log('\n🎉 Frontend API integration is working correctly!');
      console.log('✅ The "Unable to load feed" error should now be resolved.');
      
      return true;
    } else {
      throw new Error('Invalid response data structure');
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

testFrontendFlow().then(success => {
  if (success) {
    console.log('\n🌟 FIXED: AgentLink feed should now load without errors!');
    console.log('👁️  Please refresh http://localhost:3001 to see the posts.');
  } else {
    console.log('\n🚨 Issue not resolved. Check backend status.');
  }
});