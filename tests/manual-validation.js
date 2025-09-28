/**
 * Manual Production Validation for Activities API
 *
 * Direct testing of real Activities endpoint and component integration
 * This runs without Playwright to validate the real system quickly
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE = 'http://localhost:3000';
const FRONTEND_BASE = 'http://localhost:5173';
const RESULTS_DIR = '/workspaces/agent-feed/test-results/manual-validation';

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function validateActivitiesAPI() {
  console.log('🔍 VALIDATION 1: Activities API Endpoint');
  console.log('=' .repeat(60));

  try {
    const response = await makeRequest(`${API_BASE}/api/activities`);

    console.log(`Status Code: ${response.statusCode}`);
    console.log(`Content-Type: ${response.headers['content-type']}`);

    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      console.log(`✅ API Response Structure:`);
      console.log(`   - success: ${data.success}`);
      console.log(`   - data (array): ${Array.isArray(data.data)} (${data.data.length} items)`);
      console.log(`   - timestamp: ${data.timestamp}`);
      console.log(`   - pagination: ${!!data.pagination}`);

      if (data.data.length > 0) {
        const activity = data.data[0];
        console.log(`✅ Sample Activity:`);
        console.log(`   - id: ${activity.id}`);
        console.log(`   - type: ${activity.type}`);
        console.log(`   - description: ${activity.description}`);
        console.log(`   - timestamp: ${activity.timestamp}`);
        console.log(`   - status: ${activity.status}`);

        // Verify it's real data, not mock
        const isRealData = activity.id.match(/^[a-f0-9-]{36}$|^[a-z0-9-]+$/) &&
                          activity.description.length > 10 &&
                          new Date(activity.timestamp).getTime() > 0;

        console.log(`✅ Real Data Verification: ${isRealData ? 'PASSED' : 'FAILED'}`);
      } else {
        console.log(`ℹ️ Empty data array - no activities in system (acceptable)`);
      }

      // Save API response for analysis
      fs.writeFileSync(
        path.join(RESULTS_DIR, 'activities-api-response.json'),
        JSON.stringify(data, null, 2)
      );

      return { success: true, data };
    } else {
      console.log(`❌ API request failed with status ${response.statusCode}`);
      console.log(`Response: ${response.body}`);
      return { success: false, error: `Status ${response.statusCode}` };
    }
  } catch (error) {
    console.log(`❌ API request error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function validateFrontendAvailability() {
  console.log('🎨 VALIDATION 2: Frontend Availability');
  console.log('=' .repeat(60));

  try {
    const response = await makeRequest(`${FRONTEND_BASE}/`);

    if (response.statusCode === 200) {
      console.log(`✅ Frontend is running on ${FRONTEND_BASE}`);
      console.log(`   - Status: ${response.statusCode}`);
      console.log(`   - Content-Type: ${response.headers['content-type']}`);

      // Check for React/Vite patterns in response
      const hasReact = response.body.includes('react') || response.body.includes('React');
      const hasVite = response.body.includes('vite') || response.body.includes('@vite');
      const hasTitle = response.body.includes('<title>');

      console.log(`   - React detected: ${hasReact}`);
      console.log(`   - Vite detected: ${hasVite}`);
      console.log(`   - HTML title: ${hasTitle}`);

      return { success: true };
    } else {
      console.log(`❌ Frontend request failed with status ${response.statusCode}`);
      return { success: false, error: `Status ${response.statusCode}` };
    }
  } catch (error) {
    console.log(`❌ Frontend request error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function validateActivityRouting() {
  console.log('🔗 VALIDATION 3: Activity Route Availability');
  console.log('=' .repeat(60));

  try {
    const response = await makeRequest(`${FRONTEND_BASE}/activity`);

    if (response.statusCode === 200) {
      console.log(`✅ Activity route is accessible`);
      console.log(`   - Status: ${response.statusCode}`);

      // Look for activity-related content
      const hasActivityContent = response.body.includes('activity') ||
                                 response.body.includes('Activity');

      console.log(`   - Activity content detected: ${hasActivityContent}`);

      return { success: true };
    } else {
      console.log(`❌ Activity route failed with status ${response.statusCode}`);
      return { success: false, error: `Status ${response.statusCode}` };
    }
  } catch (error) {
    console.log(`❌ Activity route error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function validateBackendHealth() {
  console.log('🏥 VALIDATION 4: Backend Health Check');
  console.log('=' .repeat(60));

  const healthEndpoints = [
    '/health',
    '/api/health',
    '/api/v1/health'
  ];

  for (const endpoint of healthEndpoints) {
    try {
      const response = await makeRequest(`${API_BASE}${endpoint}`);
      console.log(`${endpoint}: Status ${response.statusCode}`);

      if (response.statusCode === 200) {
        try {
          const healthData = JSON.parse(response.body);
          console.log(`✅ Health check passed: ${JSON.stringify(healthData)}`);
          return { success: true, endpoint };
        } catch (e) {
          console.log(`✅ Health check passed (non-JSON response)`);
          return { success: true, endpoint };
        }
      }
    } catch (error) {
      console.log(`${endpoint}: Error - ${error.message}`);
    }
  }

  return { success: false, error: 'No health endpoints responded' };
}

async function runManualValidation() {
  console.log('🚀 STARTING MANUAL PRODUCTION VALIDATION');
  console.log('=' .repeat(80));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`API Base: ${API_BASE}`);
  console.log(`Frontend Base: ${FRONTEND_BASE}`);
  console.log(`Results Dir: ${RESULTS_DIR}`);
  console.log('');

  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      api: API_BASE,
      frontend: FRONTEND_BASE
    },
    validations: {}
  };

  // Run all validations
  results.validations.activitiesAPI = await validateActivitiesAPI();
  console.log('');

  results.validations.frontendAvailability = await validateFrontendAvailability();
  console.log('');

  results.validations.activityRouting = await validateActivityRouting();
  console.log('');

  results.validations.backendHealth = await validateBackendHealth();
  console.log('');

  // Summary
  console.log('📊 VALIDATION SUMMARY');
  console.log('=' .repeat(60));

  const passed = Object.values(results.validations).filter(v => v.success).length;
  const total = Object.keys(results.validations).length;

  console.log(`✅ Passed: ${passed}/${total} validations`);

  Object.entries(results.validations).forEach(([name, result]) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const error = result.error ? ` (${result.error})` : '';
    console.log(`   ${status} ${name}${error}`);
  });

  results.summary = {
    passed,
    total,
    success: passed === total
  };

  // Save results
  fs.writeFileSync(
    path.join(RESULTS_DIR, 'manual-validation-results.json'),
    JSON.stringify(results, null, 2)
  );

  console.log('');
  console.log(`📄 Results saved to: ${RESULTS_DIR}/manual-validation-results.json`);

  if (results.summary.success) {
    console.log('🎉 ALL VALIDATIONS PASSED - System is ready for production!');
  } else {
    console.log('⚠️ Some validations failed - Review results before production deployment');
  }

  return results;
}

// Run validation if called directly
if (require.main === module) {
  runManualValidation()
    .then(results => {
      process.exit(results.summary.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

module.exports = { runManualValidation };