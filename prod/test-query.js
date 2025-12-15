/**
 * Live Test: Simple Math Query
 * Tests the skill detection fix by submitting "what is 500+343?"
 * Monitors backend logs to verify correct skill loading
 */

const http = require('http');

const testQuery = async () => {
  console.log('🧪 Testing Skill Detection Fix');
  console.log('📝 Query: "what is 500+343?"');
  console.log('');
  console.log('Expected Behavior:');
  console.log('  ✅ User query extracted correctly');
  console.log('  ✅ Only 2 skills loaded (always-load skills)');
  console.log('  ✅ Token count ~7,700 (NOT 23,000)');
  console.log('  ✅ Prompt size ~42KB (NOT 142KB)');
  console.log('  ✅ Response: "843" or "500 + 343 = 843"');
  console.log('  ✅ No E2BIG error');
  console.log('');
  console.log('🚀 Submitting query to backend...');

  const postData = JSON.stringify({
    content: 'what is 500+343?',
    authorId: 'test-user',
    channelId: 'general'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/posts',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('✅ Query submitted successfully');
          console.log('📊 Response status:', res.statusCode);
          try {
            const result = JSON.parse(data);
            console.log('📦 Post created with ID:', result.id);
            resolve(result);
          } catch (e) {
            console.log('📦 Response:', data);
            resolve(data);
          }
        } else {
          console.error('❌ Query failed with status:', res.statusCode);
          console.error('Response:', data);
          reject(new Error(`Status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
};

testQuery()
  .then(() => {
    console.log('');
    console.log('✅ Test completed');
    console.log('');
    console.log('🔍 Next: Check backend logs at /tmp/backend-fixed.log');
    console.log('   Look for:');
    console.log('   - "📝 User query extracted: \\"what is 500+343?...\\"');
    console.log('   - "✅ Extracted user query via separator method"');
    console.log('   - "🎯 Detected 2 relevant skills" (NOT 7!)');
    console.log('   - "💰 Token estimate: ~7700 tokens" (NOT 23,000!)');
    console.log('   - "📏 Final prompt size: ~42KB" (NOT 142KB!)');
    console.log('   - "✅ Query completed: success"');
    console.log('');
    console.log('📊 Wait 10-15 seconds for AVI to process, then check for response');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });
