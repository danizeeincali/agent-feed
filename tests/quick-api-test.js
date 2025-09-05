// Quick API test to check like endpoints
const https = require('http');

function testEndpoint(path, method = 'GET') {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      console.log(`${method} ${path} -> Status: ${res.statusCode}`);
      resolve(res.statusCode);
    });

    req.on('error', (e) => {
      console.log(`${method} ${path} -> Error: ${e.message}`);
      resolve(0);
    });

    if (method === 'POST') {
      req.write('{"user_id":"test"}');
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('Testing like API endpoints...');
  
  // Test like endpoints - these should return 404 or 405
  await testEndpoint('/api/v1/agent-posts/test/like', 'POST');
  await testEndpoint('/api/v1/agent-posts/test/like', 'DELETE');
  await testEndpoint('/api/v1/agent-posts/test/likes', 'GET');
  
  // Test working endpoints
  await testEndpoint('/api/v1/agent-posts?limit=1', 'GET');
  await testEndpoint('/api/health', 'GET');
  
  console.log('API test complete.');
}

runTests();