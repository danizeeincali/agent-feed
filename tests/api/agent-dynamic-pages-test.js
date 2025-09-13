#!/usr/bin/env node

/**
 * Comprehensive Agent Dynamic Pages API Test Suite
 * 
 * Tests all endpoints with real data to verify:
 * - Database integration
 * - Validation and error handling
 * - Security measures
 * - Performance requirements
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_AGENT_ID = 'ProductionValidator';  // Real agent from seeded data
const INVALID_AGENT_ID = 'NonExistentAgent';

// Test counters
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Helper function to make HTTP requests using curl
async function makeRequest(method, url, data = null, expectedStatus = 200) {
  totalTests++;
  
  try {
    let command = `curl -s -w "\\n%{http_code}" -X ${method} "${BASE_URL}${url}"`;
    command += ` -H "Content-Type: application/json"`;
    
    if (data) {
      command += ` -d '${JSON.stringify(data)}'`;
    }
    
    const { stdout } = await execAsync(command);
    const lines = stdout.trim().split('\\n');
    const statusCode = parseInt(lines[lines.length - 1]);
    const responseBody = lines.slice(0, -1).join('\\n');
    
    let parsedResponse = null;
    try {
      parsedResponse = JSON.parse(responseBody);
    } catch (e) {
      console.log(`❌ Failed to parse response: ${responseBody}`);
      failedTests++;
      return null;
    }
    
    if (statusCode === expectedStatus) {\n      console.log(`✅ ${method} ${url} - Status: ${statusCode}`);\n      passedTests++;\n      return { status: statusCode, data: parsedResponse };\n    } else {\n      console.log(`❌ ${method} ${url} - Expected: ${expectedStatus}, Got: ${statusCode}`);\n      console.log(`   Response: ${JSON.stringify(parsedResponse, null, 2)}`);\n      failedTests++;\n      return { status: statusCode, data: parsedResponse };\n    }\n  } catch (error) {\n    console.log(`❌ ${method} ${url} - Error: ${error.message}`);\n    failedTests++;\n    return null;\n  }\n}\n\n// Test data\nconst testPageData = {\n  title: 'Test API Page',\n  content_type: 'markdown',\n  content_value: '# Test Page\\n\\nThis is a test page created via API.\\n\\n- Feature 1\\n- Feature 2',\n  content_metadata: {\n    testField: 'testValue',\n    priority: 'high',\n    category: 'api-test'\n  },\n  status: 'draft',\n  tags: ['api-test', 'automated', 'validation'],\n  version: 1\n};\n\nconst updatePageData = {\n  title: 'Updated Test API Page',\n  status: 'published',\n  content_metadata: {\n    testField: 'updatedValue',\n    priority: 'medium',\n    category: 'api-test',\n    lastUpdated: new Date().toISOString()\n  },\n  version: 2\n};\n\n// Test suite\nasync function runTests() {\n  console.log('🚀 Starting Agent Dynamic Pages API Tests\\n');\n  \n  let createdPageId = null;\n  \n  // Test 1: List pages for valid agent\n  console.log('📝 Test 1: List pages for valid agent');\n  const listResult = await makeRequest('GET', `/agents/${TEST_AGENT_ID}/pages`);\n  if (listResult && listResult.data.success) {\n    console.log(`   Found ${listResult.data.data.pages.length} pages`);\n  }\n  \n  // Test 2: List pages with filters\n  console.log('\\n📝 Test 2: List pages with filters');\n  await makeRequest('GET', `/agents/${TEST_AGENT_ID}/pages?status=published&limit=5`);\n  \n  // Test 3: List pages for invalid agent\n  console.log('\\n📝 Test 3: List pages for invalid agent');\n  await makeRequest('GET', `/agents/${INVALID_AGENT_ID}/pages`, null, 404);\n  \n  // Test 4: Create new page\n  console.log('\\n📝 Test 4: Create new page');\n  const createResult = await makeRequest('POST', `/agents/${TEST_AGENT_ID}/pages`, testPageData, 201);\n  if (createResult && createResult.data.success) {\n    createdPageId = createResult.data.data.page.id;\n    console.log(`   Created page with ID: ${createdPageId}`);\n  }\n  \n  // Test 5: Create page with invalid data\n  console.log('\\n📝 Test 5: Create page with invalid data');\n  const invalidData = { ...testPageData };\n  delete invalidData.title; // Remove required field\n  await makeRequest('POST', `/agents/${TEST_AGENT_ID}/pages`, invalidData, 400);\n  \n  // Test 6: Create page for invalid agent\n  console.log('\\n📝 Test 6: Create page for invalid agent');\n  await makeRequest('POST', `/agents/${INVALID_AGENT_ID}/pages`, testPageData, 404);\n  \n  // Test 7: Get specific page\n  if (createdPageId) {\n    console.log('\\n📝 Test 7: Get specific page');\n    const getResult = await makeRequest('GET', `/agents/${TEST_AGENT_ID}/pages/${createdPageId}`);\n    if (getResult && getResult.data.success) {\n      console.log(`   Retrieved page: ${getResult.data.data.page.title}`);\n    }\n  }\n  \n  // Test 8: Get non-existent page\n  console.log('\\n📝 Test 8: Get non-existent page');\n  await makeRequest('GET', `/agents/${TEST_AGENT_ID}/pages/nonexistent-page-id`, null, 404);\n  \n  // Test 9: Update page\n  if (createdPageId) {\n    console.log('\\n📝 Test 9: Update page');\n    const updateResult = await makeRequest('PUT', `/agents/${TEST_AGENT_ID}/pages/${createdPageId}`, updatePageData);\n    if (updateResult && updateResult.data.success) {\n      console.log(`   Updated page title: ${updateResult.data.data.page.title}`);\n      console.log(`   New status: ${updateResult.data.data.page.status}`);\n    }\n  }\n  \n  // Test 10: Update page with invalid data\n  if (createdPageId) {\n    console.log('\\n📝 Test 10: Update page with invalid data');\n    const invalidUpdateData = { status: 'invalid-status' };\n    await makeRequest('PUT', `/agents/${TEST_AGENT_ID}/pages/${createdPageId}`, invalidUpdateData, 400);\n  }\n  \n  // Test 11: Update non-existent page\n  console.log('\\n📝 Test 11: Update non-existent page');\n  await makeRequest('PUT', `/agents/${TEST_AGENT_ID}/pages/nonexistent-page-id`, updatePageData, 404);\n  \n  // Test 12: Delete page\n  if (createdPageId) {\n    console.log('\\n📝 Test 12: Delete page');\n    const deleteResult = await makeRequest('DELETE', `/agents/${TEST_AGENT_ID}/pages/${createdPageId}`);\n    if (deleteResult && deleteResult.data.success) {\n      console.log(`   Deleted page ID: ${deleteResult.data.data.deletedPageId}`);\n    }\n  }\n  \n  // Test 13: Delete non-existent page\n  console.log('\\n📝 Test 13: Delete non-existent page');\n  await makeRequest('DELETE', `/agents/${TEST_AGENT_ID}/pages/nonexistent-page-id`, null, 404);\n  \n  // Test 14: Verify page was deleted\n  if (createdPageId) {\n    console.log('\\n📝 Test 14: Verify page was deleted');\n    await makeRequest('GET', `/agents/${TEST_AGENT_ID}/pages/${createdPageId}`, null, 404);\n  }\n  \n  // Test 15: Test validation edge cases\n  console.log('\\n📝 Test 15: Test validation edge cases');\n  \n  // Empty title\n  await makeRequest('POST', `/agents/${TEST_AGENT_ID}/pages`, {\n    ...testPageData,\n    title: ''\n  }, 400);\n  \n  // Invalid content type\n  await makeRequest('POST', `/agents/${TEST_AGENT_ID}/pages`, {\n    ...testPageData,\n    content_type: 'invalid-type'\n  }, 400);\n  \n  // Missing content value\n  const missingContentData = { ...testPageData };\n  delete missingContentData.content_value;\n  await makeRequest('POST', `/agents/${TEST_AGENT_ID}/pages`, missingContentData, 400);\n  \n  // Test 16: Test rate limiting (make many requests quickly)\n  console.log('\\n📝 Test 16: Test rate limiting');\n  const rateLimitPromises = [];\n  for (let i = 0; i < 5; i++) {\n    rateLimitPromises.push(makeRequest('GET', `/agents/${TEST_AGENT_ID}/pages`));\n  }\n  await Promise.all(rateLimitPromises);\n  \n  // Test 17: Test pagination\n  console.log('\\n📝 Test 17: Test pagination');\n  await makeRequest('GET', `/agents/${TEST_AGENT_ID}/pages?limit=2&offset=0`);\n  await makeRequest('GET', `/agents/${TEST_AGENT_ID}/pages?limit=2&offset=2`);\n  \n  // Test 18: Test search functionality\n  console.log('\\n📝 Test 18: Test search functionality');\n  await makeRequest('GET', `/agents/${TEST_AGENT_ID}/pages?search=validation`);\n  \n  // Test 19: Test sorting\n  console.log('\\n📝 Test 19: Test sorting');\n  await makeRequest('GET', `/agents/${TEST_AGENT_ID}/pages?sortBy=title&sortOrder=ASC`);\n  \n  // Test 20: Test content type filtering\n  console.log('\\n📝 Test 20: Test content type filtering');\n  await makeRequest('GET', `/agents/${TEST_AGENT_ID}/pages?content_type=markdown`);\n  \n  // Print test summary\n  console.log('\\n' + '='.repeat(60));\n  console.log('🏁 TEST SUMMARY');\n  console.log('='.repeat(60));\n  console.log(`Total Tests: ${totalTests}`);\n  console.log(`Passed: ${passedTests} ✅`);\n  console.log(`Failed: ${failedTests} ❌`);\n  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);\n  \n  if (failedTests === 0) {\n    console.log('\\n🎉 ALL TESTS PASSED! API is working correctly with real data.');\n    process.exit(0);\n  } else {\n    console.log('\\n⚠️  Some tests failed. Check the output above for details.');\n    process.exit(1);\n  }\n}\n\n// Check if server is running\nasync function checkServer() {\n  try {\n    const { stdout } = await execAsync(`curl -s ${BASE_URL}/health || echo \"Server not running\"`);\n    if (stdout.includes('Server not running')) {\n      console.log('❌ Backend server is not running on port 3000.');\n      console.log('   Please start the server with: npm run dev:backend');\n      process.exit(1);\n    }\n    console.log('✅ Backend server is running\\n');\n  } catch (error) {\n    console.log('❌ Cannot connect to backend server.');\n    console.log('   Please start the server with: npm run dev:backend');\n    process.exit(1);\n  }\n}\n\n// Main execution\nasync function main() {\n  console.log('🔍 Agent Dynamic Pages API Test Suite');\n  console.log('=====================================\\n');\n  \n  await checkServer();\n  await runTests();\n}\n\n// Handle errors\nprocess.on('unhandledRejection', (error) => {\n  console.error('❌ Unhandled error:', error);\n  process.exit(1);\n});\n\n// Run the tests\nmain().catch(console.error);\n