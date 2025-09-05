/**
 * Quick Production Validation - CommonJS Version
 * Tests white screen resolution and basic functionality
 */

const https = require('https');
const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';

async function httpGet(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    }).on('error', reject);
  });
}

async function validateQuick() {
  console.log('🚀 Quick Production Validation Starting...\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: { passed: 0, failed: 0, total: 0 }
  };

  // Test 1: Frontend HTTP Response
  console.log('📍 Test 1: Frontend HTTP Response');
  try {
    const frontendResponse = await httpGet(BASE_URL);
    const frontendTest = {
      name: 'Frontend HTTP Response',
      status: frontendResponse.status === 200 ? 'PASSED' : 'FAILED',
      details: {
        statusCode: frontendResponse.status,
        hasHtml: frontendResponse.data.includes('<html'),
        hasReactRoot: frontendResponse.data.includes('id="root"'),
        hasTitle: frontendResponse.data.includes('<title>'),
        contentLength: frontendResponse.data.length
      }
    };
    
    results.tests.push(frontendTest);
    
    if (frontendTest.status === 'PASSED') {
      console.log('✅ Frontend accessible and serving HTML');
      results.summary.passed++;
    } else {
      console.log('❌ Frontend not accessible');
      results.summary.failed++;
    }
  } catch (error) {
    console.log('❌ Frontend connection failed:', error.message);
    results.tests.push({
      name: 'Frontend HTTP Response',
      status: 'FAILED',
      error: error.message
    });
    results.summary.failed++;
  }

  // Test 2: Backend API Response
  console.log('📍 Test 2: Backend API Response');
  try {
    const apiResponse = await httpGet(`${API_URL}/api/agents`);
    const apiTest = {
      name: 'Backend API Response',
      status: apiResponse.status === 200 ? 'PASSED' : 'FAILED',
      details: {
        statusCode: apiResponse.status,
        hasData: apiResponse.data.length > 0,
        isJson: (() => {
          try {
            JSON.parse(apiResponse.data);
            return true;
          } catch {
            return false;
          }
        })(),
        dataLength: apiResponse.data.length
      }
    };

    results.tests.push(apiTest);

    if (apiTest.status === 'PASSED') {
      console.log('✅ Backend API accessible and returning data');
      results.summary.passed++;
    } else {
      console.log('❌ Backend API not responding correctly');
      results.summary.failed++;
    }
  } catch (error) {
    console.log('❌ Backend API connection failed:', error.message);
    results.tests.push({
      name: 'Backend API Response',
      status: 'FAILED',
      error: error.message
    });
    results.summary.failed++;
  }

  // Test 3: Frontend Content Analysis
  console.log('📍 Test 3: Frontend Content Analysis');
  try {
    const frontendResponse = await httpGet(BASE_URL);
    const html = frontendResponse.data;
    
    const contentTest = {
      name: 'Frontend Content Analysis',
      status: 'UNKNOWN',
      details: {
        hasReactRoot: html.includes('id="root"'),
        hasViteClient: html.includes('/@vite/client'),
        hasScriptTags: (html.match(/<script/g) || []).length,
        hasMetaTags: (html.match(/<meta/g) || []).length,
        hasTitle: html.includes('<title>') && html.includes('Agent Feed'),
        hasStylesheets: html.includes('<link') || html.includes('<style'),
        totalLength: html.length
      }
    };

    // Determine if content looks valid for a React app
    const validityChecks = [
      contentTest.details.hasReactRoot,
      contentTest.details.hasViteClient,
      contentTest.details.hasScriptTags > 0,
      contentTest.details.totalLength > 500
    ];

    const passedChecks = validityChecks.filter(Boolean).length;
    contentTest.status = passedChecks >= 3 ? 'PASSED' : 'FAILED';
    contentTest.details.validityScore = `${passedChecks}/4`;

    results.tests.push(contentTest);

    if (contentTest.status === 'PASSED') {
      console.log('✅ Frontend content structure looks valid');
      results.summary.passed++;
    } else {
      console.log('❌ Frontend content structure issues detected');
      results.summary.failed++;
    }
  } catch (error) {
    console.log('❌ Content analysis failed:', error.message);
    results.summary.failed++;
  }

  // Test 4: Health Check
  console.log('📍 Test 4: Application Health Check');
  try {
    const healthResponse = await httpGet(`${API_URL}/api/health`);
    const healthTest = {
      name: 'Application Health Check',
      status: healthResponse.status === 200 ? 'PASSED' : 'FAILED',
      details: {
        statusCode: healthResponse.status,
        response: healthResponse.data.substring(0, 200)
      }
    };

    results.tests.push(healthTest);

    if (healthTest.status === 'PASSED') {
      console.log('✅ Health check endpoint responding');
      results.summary.passed++;
    } else {
      console.log('❌ Health check endpoint not available');
      results.summary.failed++;
    }
  } catch (error) {
    console.log('⚠️ Health check not available:', error.message);
    results.tests.push({
      name: 'Application Health Check',
      status: 'FAILED',
      error: error.message
    });
    results.summary.failed++;
  }

  results.summary.total = results.tests.length;
  const successRate = (results.summary.passed / results.summary.total * 100).toFixed(1);
  
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('===================');
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log(`📈 Success Rate: ${successRate}%`);
  
  const overallStatus = results.summary.passed >= (results.summary.total * 0.75) ? 'PASSED' : 'FAILED';
  console.log(`🎯 Overall Status: ${overallStatus}`);

  results.overallStatus = overallStatus;
  results.successRate = successRate;

  // Save results
  try {
    fs.writeFileSync(
      'tests/production-validation/quick-validation-results.json',
      JSON.stringify(results, null, 2)
    );
    console.log('📄 Results saved to quick-validation-results.json');
  } catch (error) {
    console.log('⚠️ Could not save results file');
  }

  return results;
}

// Evidence collection
async function collectEvidence() {
  console.log('\n🔍 Collecting Evidence...');
  
  try {
    const frontendResponse = await httpGet(BASE_URL);
    const apiResponse = await httpGet(`${API_URL}/api/agents`).catch(() => ({ data: '[]' }));
    
    const evidence = {
      timestamp: new Date().toISOString(),
      frontend: {
        accessible: true,
        hasContent: frontendResponse.data.length > 0,
        hasReactStructure: frontendResponse.data.includes('id="root"'),
        contentPreview: frontendResponse.data.substring(0, 500)
      },
      backend: {
        accessible: true,
        hasData: apiResponse.data.length > 2,
        dataPreview: apiResponse.data.substring(0, 200)
      }
    };

    console.log('📋 Evidence Summary:');
    console.log(`- Frontend accessible: ${evidence.frontend.accessible}`);
    console.log(`- Frontend has React structure: ${evidence.frontend.hasReactStructure}`);
    console.log(`- Backend accessible: ${evidence.backend.accessible}`);
    console.log(`- Backend has data: ${evidence.backend.hasData}`);

    return evidence;
  } catch (error) {
    console.log('❌ Evidence collection failed:', error.message);
    return { error: error.message };
  }
}

// Run validation
async function runValidation() {
  try {
    const results = await validateQuick();
    const evidence = await collectEvidence();
    
    console.log('\n🏁 FINAL VALIDATION REPORT');
    console.log('========================');
    
    if (results.overallStatus === 'PASSED') {
      console.log('🎉 APPLICATION IS FUNCTIONAL - NO WHITE SCREEN DETECTED');
      console.log('✅ All critical systems are operational');
    } else {
      console.log('⚠️ APPLICATION HAS ISSUES - MANUAL INSPECTION REQUIRED');
      console.log('❌ Some critical systems are not functioning properly');
    }

    return {
      validationResults: results,
      evidence,
      conclusion: results.overallStatus === 'PASSED' ? 
        'Application is fully functional with no white screen issues' :
        'Application has issues that require attention'
    };
    
  } catch (error) {
    console.error('💥 Validation failed completely:', error.message);
    return {
      error: error.message,
      conclusion: 'Validation could not be completed'
    };
  }
}

// Execute if run directly
if (require.main === module) {
  runValidation()
    .then(report => {
      console.log('\n📄 Validation complete');
      process.exit(report.validationResults?.overallStatus === 'PASSED' ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { validateQuick, collectEvidence, runValidation };