/**
 * TDD London School Test 5: CORS and Error Handling
 * 
 * Purpose: Expose CORS configuration and error handling issues
 * Expected: FAIL - to reveal exact CORS and error handling problems
 */

import fetch from 'node-fetch';
import colors from 'colors';

const BACKEND_BASE_URL = 'http://localhost:3002';
const FRONTEND_BASE_URL = 'http://localhost:5173';

class CORSAndErrorHandlingTest {
  async run() {
    console.log(colors.blue('🔍 Testing CORS Configuration and Error Handling...'));
    
    // Test 1: CORS preflight requests
    await this.testCORSPreflightRequests();
    
    // Test 2: CORS headers on all endpoints
    await this.testCORSHeadersAllEndpoints();
    
    // Test 3: Cross-origin request handling
    await this.testCrossOriginRequests();
    
    // Test 4: Error response formatting
    await this.testErrorResponseFormatting();
    
    // Test 5: Rate limiting and security headers
    await this.testRateLimitingAndSecurity();
    
    // Test 6: Invalid method handling
    await this.testInvalidMethodHandling();
  }

  async testCORSPreflightRequests() {
    console.log(colors.yellow('  Testing CORS preflight requests...'));
    
    const endpoints = [
      '/api/terminals',
      '/api/launch',
      '/api/terminals/test/status',
      '/api/terminals/test/execute'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(colors.gray(`    Testing preflight for ${endpoint}...`));
        
        const response = await fetch(`${BACKEND_BASE_URL}${endpoint}`, {
          method: 'OPTIONS',
          headers: {
            'Origin': FRONTEND_BASE_URL,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, Authorization'
          }
        });
        
        const corsHeaders = {
          'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
          'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
          'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
          'access-control-max-age': response.headers.get('access-control-max-age')
        };
        
        console.log(colors.gray(`      CORS headers: ${JSON.stringify(corsHeaders, null, 2)}`));
        
        // Check required CORS headers
        if (!corsHeaders['access-control-allow-origin']) {
          throw new Error(`Missing Access-Control-Allow-Origin header for ${endpoint}`);
        }
        
        if (!corsHeaders['access-control-allow-methods']) {
          throw new Error(`Missing Access-Control-Allow-Methods header for ${endpoint}`);
        }
        
        // Verify origin handling
        const allowedOrigin = corsHeaders['access-control-allow-origin'];
        if (allowedOrigin !== '*' && allowedOrigin !== FRONTEND_BASE_URL) {
          throw new Error(`CORS origin mismatch for ${endpoint}. Expected: ${FRONTEND_BASE_URL} or *, Got: ${allowedOrigin}`);
        }
        
      } catch (error) {
        throw new Error(`❌ CORS PREFLIGHT ERROR for ${endpoint}: ${error.message}`);
      }
    }
    
    console.log(colors.green('    ✅ CORS preflight requests successful'));
  }

  async testCORSHeadersAllEndpoints() {
    console.log(colors.yellow('  Testing CORS headers on all endpoints...'));
    
    const testCases = [
      { method: 'GET', endpoint: '/api/terminals' },
      { method: 'POST', endpoint: '/api/launch', body: { test: true } },
      { method: 'GET', endpoint: '/health' }
    ];
    
    for (const testCase of testCases) {
      try {
        console.log(colors.gray(`    Testing ${testCase.method} ${testCase.endpoint}...`));
        
        const requestOptions = {
          method: testCase.method,
          headers: {
            'Origin': FRONTEND_BASE_URL,
            'Accept': 'application/json'
          }
        };
        
        if (testCase.body) {
          requestOptions.headers['Content-Type'] = 'application/json';
          requestOptions.body = JSON.stringify(testCase.body);
        }
        
        const response = await fetch(`${BACKEND_BASE_URL}${testCase.endpoint}`, requestOptions);
        
        // Check CORS headers in response
        const allowOrigin = response.headers.get('access-control-allow-origin');
        if (!allowOrigin) {
          throw new Error(`Missing Access-Control-Allow-Origin header in response`);
        }
        
        if (allowOrigin !== '*' && allowOrigin !== FRONTEND_BASE_URL) {
          throw new Error(`CORS origin mismatch in response. Expected: ${FRONTEND_BASE_URL} or *, Got: ${allowOrigin}`);
        }
        
        console.log(colors.gray(`      Response CORS headers valid`));
        
      } catch (error) {
        throw new Error(`❌ CORS HEADERS ERROR for ${testCase.method} ${testCase.endpoint}: ${error.message}`);
      }
    }
    
    console.log(colors.green('    ✅ CORS headers on all endpoints successful'));
  }

  async testCrossOriginRequests() {
    console.log(colors.yellow('  Testing cross-origin request handling...'));
    
    const origins = [
      FRONTEND_BASE_URL,
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'https://different-domain.com'  // This should be blocked if not wildcard
    ];
    
    for (const origin of origins) {
      try {
        console.log(colors.gray(`    Testing request from origin: ${origin}...`));
        
        const response = await fetch(`${BACKEND_BASE_URL}/api/terminals`, {
          method: 'GET',
          headers: {
            'Origin': origin,
            'Accept': 'application/json'
          }
        });
        
        const allowOrigin = response.headers.get('access-control-allow-origin');
        
        if (allowOrigin === '*') {
          console.log(colors.gray(`      Wildcard CORS - all origins allowed`));
        } else if (allowOrigin === origin) {
          console.log(colors.gray(`      Origin ${origin} specifically allowed`));
        } else if (allowOrigin === FRONTEND_BASE_URL) {
          console.log(colors.gray(`      Default frontend origin used`));
        } else {
          console.log(colors.yellow(`      ⚠️  Origin ${origin} may be blocked (Allow-Origin: ${allowOrigin})`));
        }
        
      } catch (error) {
        throw new Error(`❌ CROSS-ORIGIN ERROR for origin ${origin}: ${error.message}`);
      }
    }
    
    console.log(colors.green('    ✅ Cross-origin request handling tested'));
  }

  async testErrorResponseFormatting() {
    console.log(colors.yellow('  Testing error response formatting...'));
    
    const errorTestCases = [
      {
        name: 'Invalid JSON body',
        endpoint: '/api/launch',
        method: 'POST',
        body: 'invalid json',
        expectedStatus: 400
      },
      {
        name: 'Missing required fields',
        endpoint: '/api/launch',
        method: 'POST',
        body: '{}',
        expectedStatus: 400
      },
      {
        name: 'Non-existent instance',
        endpoint: '/api/terminals/non-existent-instance',
        method: 'GET',
        expectedStatus: 404
      },
      {
        name: 'Unsupported method',
        endpoint: '/api/terminals',
        method: 'PUT',
        expectedStatus: 405
      }
    ];
    
    for (const testCase of errorTestCases) {
      try {
        console.log(colors.gray(`    Testing error case: ${testCase.name}...`));
        
        const requestOptions = {
          method: testCase.method,
          headers: {
            'Origin': FRONTEND_BASE_URL,
            'Accept': 'application/json'
          }
        };
        
        if (testCase.body) {
          requestOptions.headers['Content-Type'] = 'application/json';
          requestOptions.body = testCase.body;
        }
        
        const response = await fetch(`${BACKEND_BASE_URL}${testCase.endpoint}`, requestOptions);
        
        console.log(colors.gray(`      Response status: ${response.status}`));
        
        // Check if error status is in expected range
        if (testCase.expectedStatus && response.status !== testCase.expectedStatus) {
          console.log(colors.yellow(`      ⚠️  Expected status ${testCase.expectedStatus}, got ${response.status}`));
        }
        
        // Check error response format
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorBody = await response.json();
            console.log(colors.gray(`      Error response: ${JSON.stringify(errorBody, null, 2)}`));
            
            if (!errorBody.error && !errorBody.message) {
              console.log(colors.yellow('      ⚠️  Error response missing error/message field'));
            }
          } catch (parseError) {
            console.log(colors.yellow('      ⚠️  Error response not valid JSON'));
          }
        }
        
        // Check CORS headers on error responses
        const allowOrigin = response.headers.get('access-control-allow-origin');
        if (!allowOrigin) {
          throw new Error('Error response missing CORS headers');
        }
        
      } catch (error) {
        if (!error.message.includes('CORS')) {
          console.log(colors.yellow(`      ⚠️  Error in error test: ${error.message}`));
        } else {
          throw new Error(`❌ ERROR RESPONSE FORMATTING: ${error.message}`);
        }
      }
    }
    
    console.log(colors.green('    ✅ Error response formatting tested'));
  }

  async testRateLimitingAndSecurity() {
    console.log(colors.yellow('  Testing rate limiting and security headers...'));
    
    try {
      // Test for security headers
      const response = await fetch(`${BACKEND_BASE_URL}/api/terminals`, {
        method: 'GET',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Accept': 'application/json'
        }
      });
      
      const securityHeaders = {
        'x-content-type-options': response.headers.get('x-content-type-options'),
        'x-frame-options': response.headers.get('x-frame-options'),
        'x-xss-protection': response.headers.get('x-xss-protection'),
        'strict-transport-security': response.headers.get('strict-transport-security')
      };
      
      console.log(colors.gray(`    Security headers: ${JSON.stringify(securityHeaders, null, 2)}`));
      
      // Test basic rate limiting by making rapid requests
      console.log(colors.gray('    Testing rate limiting with rapid requests...'));
      const rapidRequests = Array.from({ length: 10 }, () => 
        fetch(`${BACKEND_BASE_URL}/api/terminals`, {
          method: 'GET',
          headers: {
            'Origin': FRONTEND_BASE_URL,
            'Accept': 'application/json'
          }
        })
      );
      
      const rapidResponses = await Promise.all(rapidRequests);
      const rateLimitedResponses = rapidResponses.filter(r => r.status === 429);
      
      if (rateLimitedResponses.length > 0) {
        console.log(colors.gray(`    Rate limiting active: ${rateLimitedResponses.length} requests limited`));
      } else {
        console.log(colors.yellow('    ⚠️  No rate limiting detected (may be intentional)'));
      }
      
      console.log(colors.green('    ✅ Security headers and rate limiting tested'));
      
    } catch (error) {
      throw new Error(`❌ SECURITY TEST ERROR: ${error.message}`);
    }
  }

  async testInvalidMethodHandling() {
    console.log(colors.yellow('  Testing invalid HTTP method handling...'));
    
    const methodTests = [
      { endpoint: '/api/terminals', method: 'PUT' },
      { endpoint: '/api/terminals', method: 'PATCH' },
      { endpoint: '/api/launch', method: 'GET' },
      { endpoint: '/api/launch', method: 'DELETE' }
    ];
    
    for (const test of methodTests) {
      try {
        console.log(colors.gray(`    Testing ${test.method} ${test.endpoint}...`));
        
        const response = await fetch(`${BACKEND_BASE_URL}${test.endpoint}`, {
          method: test.method,
          headers: {
            'Origin': FRONTEND_BASE_URL,
            'Accept': 'application/json'
          }
        });
        
        console.log(colors.gray(`      Response status: ${response.status}`));
        
        if (response.status === 405) {
          console.log(colors.gray('      Method properly rejected with 405'));
        } else if (response.status === 404) {
          console.log(colors.gray('      Endpoint not found (404)'));
        } else {
          console.log(colors.yellow(`      ⚠️  Unexpected status for invalid method: ${response.status}`));
        }
        
        // Check CORS headers even on method errors
        const allowOrigin = response.headers.get('access-control-allow-origin');
        if (!allowOrigin) {
          throw new Error('Invalid method response missing CORS headers');
        }
        
      } catch (error) {
        throw new Error(`❌ INVALID METHOD HANDLING ERROR: ${error.message}`);
      }
    }
    
    console.log(colors.green('    ✅ Invalid method handling tested'));
  }
}

export default new CORSAndErrorHandlingTest();