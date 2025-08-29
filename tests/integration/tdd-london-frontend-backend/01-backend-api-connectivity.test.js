/**
 * TDD London School Test 1: Backend API Connectivity
 * 
 * Purpose: Expose network connectivity issues between frontend and backend
 * Expected: FAIL - to reveal exact network problems
 */

import fetch from 'node-fetch';
import colors from 'colors';

const BACKEND_BASE_URL = 'http://localhost:3002';
const FRONTEND_BASE_URL = 'http://localhost:5173';

class BackendAPIConnectivityTest {
  async run() {
    console.log(colors.blue('🔍 Testing Backend API Connectivity...'));
    
    // Test 1: Can we reach the backend server at all?
    await this.testBackendServerReachability();
    
    // Test 2: Does /api/terminals endpoint exist?
    await this.testTerminalsEndpoint();
    
    // Test 3: Does /api/launch endpoint exist?
    await this.testLaunchEndpoint();
    
    // Test 4: Are CORS headers properly configured?
    await this.testCORSConfiguration();
    
    // Test 5: Can frontend make requests to backend?
    await this.testFrontendToBackendRequest();
  }

  async testBackendServerReachability() {
    console.log(colors.yellow('  Testing backend server reachability...'));
    
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (!response.ok) {
        throw new Error(`Backend health check failed with status: ${response.status}`);
      }
      
      console.log(colors.green('    ✅ Backend server is reachable'));
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`❌ NETWORK ERROR: Backend server at ${BACKEND_BASE_URL} is not running or not accessible`);
      }
      throw new Error(`❌ NETWORK ERROR: Cannot reach backend server: ${error.message}`);
    }
  }

  async testTerminalsEndpoint() {
    console.log(colors.yellow('  Testing /api/terminals endpoint...'));
    
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/terminals`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      if (!response.ok) {
        throw new Error(`/api/terminals endpoint returned status: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(colors.green('    ✅ /api/terminals endpoint is accessible'));
      console.log(colors.gray(`    Response: ${JSON.stringify(data, null, 2)}`));
    } catch (error) {
      throw new Error(`❌ API ERROR: /api/terminals endpoint failed: ${error.message}`);
    }
  }

  async testLaunchEndpoint() {
    console.log(colors.yellow('  Testing /api/launch endpoint...'));
    
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/launch`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test: true,
          command: 'echo "TDD London School Test"'
        }),
        timeout: 5000
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`/api/launch endpoint returned status: ${response.status} ${response.statusText}. Body: ${errorText}`);
      }
      
      const data = await response.json();
      console.log(colors.green('    ✅ /api/launch endpoint is accessible'));
      console.log(colors.gray(`    Response: ${JSON.stringify(data, null, 2)}`));
    } catch (error) {
      throw new Error(`❌ API ERROR: /api/launch endpoint failed: ${error.message}`);
    }
  }

  async testCORSConfiguration() {
    console.log(colors.yellow('  Testing CORS configuration...'));
    
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/terminals`, {
        method: 'OPTIONS',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
        },
        timeout: 5000
      });
      
      const corsHeaders = {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
        'access-control-allow-headers': response.headers.get('access-control-allow-headers')
      };
      
      console.log(colors.gray(`    CORS Headers: ${JSON.stringify(corsHeaders, null, 2)}`));
      
      if (!corsHeaders['access-control-allow-origin']) {
        throw new Error('CORS Access-Control-Allow-Origin header is missing');
      }
      
      if (corsHeaders['access-control-allow-origin'] !== '*' && 
          corsHeaders['access-control-allow-origin'] !== FRONTEND_BASE_URL) {
        throw new Error(`CORS origin mismatch. Expected: ${FRONTEND_BASE_URL}, Got: ${corsHeaders['access-control-allow-origin']}`);
      }
      
      console.log(colors.green('    ✅ CORS configuration appears correct'));
    } catch (error) {
      throw new Error(`❌ CORS ERROR: ${error.message}`);
    }
  }

  async testFrontendToBackendRequest() {
    console.log(colors.yellow('  Testing frontend-to-backend request simulation...'));
    
    try {
      // Simulate a request that would come from the frontend
      const response = await fetch(`${BACKEND_BASE_URL}/api/terminals`, {
        method: 'GET',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Referer': FRONTEND_BASE_URL,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (TDD London School Test)'
        },
        timeout: 5000
      });
      
      if (!response.ok) {
        throw new Error(`Frontend simulation request failed: ${response.status} ${response.statusText}`);
      }
      
      // Check that response includes proper CORS headers
      const allowOrigin = response.headers.get('access-control-allow-origin');
      if (!allowOrigin) {
        throw new Error('Response missing Access-Control-Allow-Origin header');
      }
      
      console.log(colors.green('    ✅ Frontend-to-backend simulation successful'));
    } catch (error) {
      throw new Error(`❌ FRONTEND-BACKEND COMMUNICATION ERROR: ${error.message}`);
    }
  }
}

export default new BackendAPIConnectivityTest();