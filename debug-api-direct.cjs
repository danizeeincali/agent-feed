const https = require('https');
const http = require('http');
const fs = require('fs');

// Direct API testing without browser
const testAPI = async () => {
  console.log('🔍 STARTING DIRECT API DEBUG');
  console.log('🎯 TARGET: API endpoint analysis without browser');
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: {}
  };
  
  // Test API endpoints directly
  const endpoints = [
    'http://127.0.0.1:3001/api/posts',
    'http://127.0.0.1:3001/api/agents',
    'http://127.0.0.1:3001/api/agents/personal-todos-agent',
    'http://127.0.0.1:3001/api/agents/personal-todos-agent/pages',
    'http://127.0.0.1:3001/api/agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723'
  ];
  
  for (const url of endpoints) {
    console.log(`\n🔍 Testing: ${url}`);
    
    try {
      const data = await makeRequest(url);
      const test = {
        url,
        status: 'success',
        statusCode: data.statusCode,
        dataLength: data.body.length,
        data: data.body.substring(0, 500) // First 500 chars
      };
      
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(data.body);
        test.isJson = true;
        test.jsonKeys = Object.keys(parsed);
        test.dataPreview = parsed;
      } catch (e) {
        test.isJson = false;
        test.dataPreview = data.body;
      }
      
      results.tests.push(test);
      console.log(`✅ Status: ${data.statusCode}`);
      console.log(`✅ Length: ${data.body.length} chars`);
      console.log(`✅ JSON: ${test.isJson}`);
      if (test.isJson) {
        console.log(`✅ Keys: ${test.jsonKeys.join(', ')}`);
      }
      
    } catch (error) {
      const test = {
        url,
        status: 'error',
        error: error.message,
        timestamp: Date.now()
      };
      results.tests.push(test);
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  // Test the specific page endpoint that's failing
  console.log('\n🔍 DEEP DIVE: Specific page endpoint');
  const pageUrl = 'http://127.0.0.1:3001/api/agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723';
  
  try {
    const pageData = await makeRequest(pageUrl);
    console.log('🔍 Page endpoint response:');
    console.log('Status:', pageData.statusCode);
    console.log('Headers:', JSON.stringify(pageData.headers, null, 2));
    console.log('Body:', pageData.body);
    
    results.pageEndpointDetail = {
      statusCode: pageData.statusCode,
      headers: pageData.headers,
      body: pageData.body,
      parsedBody: null
    };
    
    try {
      results.pageEndpointDetail.parsedBody = JSON.parse(pageData.body);
    } catch (e) {
      console.log('❌ Could not parse as JSON');
    }
    
  } catch (error) {
    console.log('❌ Page endpoint error:', error.message);
    results.pageEndpointDetail = { error: error.message };
  }
  
  // Generate summary
  results.summary = {
    totalTests: results.tests.length,
    successful: results.tests.filter(t => t.status === 'success').length,
    failed: results.tests.filter(t => t.status === 'error').length,
    apiWorking: results.tests.some(t => t.status === 'success' && t.url.includes('/api/')),
    pageEndpointWorking: results.pageEndpointDetail && !results.pageEndpointDetail.error
  };
  
  console.log('\n📊 SUMMARY:');
  console.log(`Total tests: ${results.summary.totalTests}`);
  console.log(`Successful: ${results.summary.successful}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`API working: ${results.summary.apiWorking}`);
  console.log(`Page endpoint working: ${results.summary.pageEndpointWorking}`);
  
  // Save results
  fs.writeFileSync('/workspaces/agent-feed/debug-api-results.json', JSON.stringify(results, null, 2));
  console.log('\n🔍 Results saved to debug-api-results.json');
  
  return results;
};

// Helper function to make HTTP requests
const makeRequest = (url) => {
  return new Promise((resolve, reject) => {
    const module = url.startsWith('https:') ? https : http;
    
    const req = module.get(url, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.abort();
      reject(new Error('Request timeout'));
    });
  });
};

// Run the test
testAPI().catch(error => {
  console.error('❌ API TEST ERROR:', error);
  process.exit(1);
});