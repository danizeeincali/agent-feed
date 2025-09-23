/**
 * Claude Instance Management API and Frontend Validation Script
 * Tests the complete functionality without browser automation
 */

import fetch from 'node-fetch';
import fs from 'fs';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';

const EXPECTED_BUTTONS = [
  { name: 'prod/claude', command: 'cd prod && claude' },
  { name: 'skip-permissions', command: 'cd prod && claude --dangerously-skip-permissions' },
  { name: 'skip-permissions -c', command: 'cd prod && claude --dangerously-skip-permissions -c' },
  { name: 'skip-permissions --resume', command: 'cd prod && claude --dangerously-skip-permissions --resume' }
];

async function validateClaudeInstancesSystem() {
  console.log('🚀 Starting Claude Instance Management System Validation');
  
  const validationReport = {
    timestamp: new Date().toISOString(),
    testEnvironment: {
      frontendUrl: FRONTEND_URL,
      backendUrl: BACKEND_URL,
      nodeVersion: process.version
    },
    results: {
      frontendAccessible: false,
      backendHealthy: false,
      apiEndpointsWorking: false,
      instanceCreation: false,
      instanceManagement: false
    },
    details: {
      frontendResponse: null,
      backendHealth: null,
      apiTests: [],
      createdInstances: [],
      errors: []
    },
    performanceMetrics: {
      frontendResponseTime: 0,
      backendResponseTime: 0,
      apiResponseTimes: []
    }
  };

  try {
    console.log('📍 Test 1: Frontend Accessibility');
    const frontendStartTime = Date.now();
    try {
      const frontendResponse = await fetch(`${FRONTEND_URL}/claude-instances`, {
        timeout: 10000
      });
      validationReport.performanceMetrics.frontendResponseTime = Date.now() - frontendStartTime;
      validationReport.results.frontendAccessible = frontendResponse.ok;
      validationReport.details.frontendResponse = {
        status: frontendResponse.status,
        headers: Object.fromEntries(frontendResponse.headers.entries())
      };
      
      // Check if it's the React app (contains expected HTML)
      const html = await frontendResponse.text();
      const isReactApp = html.includes('id="root"') && html.includes('Claude');
      
      if (isReactApp) {
        console.log('✅ Frontend accessible and serving React app');
        validationReport.results.frontendAccessible = true;
      } else {
        console.log('⚠️ Frontend accessible but may not be the correct app');
      }
    } catch (error) {
      console.log(`❌ Frontend not accessible: ${error.message}`);
      validationReport.details.errors.push(`Frontend error: ${error.message}`);
    }

    console.log('🏥 Test 2: Backend Health Check');
    const backendStartTime = Date.now();
    try {
      const healthResponse = await fetch(`${BACKEND_URL}/health`, {
        timeout: 10000
      });
      validationReport.performanceMetrics.backendResponseTime = Date.now() - backendStartTime;
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        validationReport.results.backendHealthy = true;
        validationReport.details.backendHealth = healthData;
        console.log('✅ Backend is healthy');
        console.log(`   Status: ${healthData.status || 'unknown'}`);
        console.log(`   Uptime: ${healthData.uptime || 'unknown'}s`);
      } else {
        console.log(`❌ Backend health check failed: ${healthResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ Backend not accessible: ${error.message}`);
      validationReport.details.errors.push(`Backend error: ${error.message}`);
    }

    console.log('🔌 Test 3: API Endpoints Check');
    try {
      // Test GET /api/claude/instances
      const getInstancesResponse = await fetch(`${BACKEND_URL}/api/claude/instances`);
      const getInstancesResult = {
        endpoint: 'GET /api/claude/instances',
        status: getInstancesResponse.status,
        success: getInstancesResponse.ok
      };
      
      if (getInstancesResponse.ok) {
        const instancesData = await getInstancesResponse.json();
        getInstancesResult.data = instancesData;
        console.log(`✅ GET instances API working - found ${instancesData.instances?.length || 0} instances`);
      } else {
        console.log(`❌ GET instances API failed: ${getInstancesResponse.status}`);
      }
      
      validationReport.details.apiTests.push(getInstancesResult);
      validationReport.results.apiEndpointsWorking = getInstancesResponse.ok;
    } catch (error) {
      console.log(`❌ API endpoints test failed: ${error.message}`);
      validationReport.details.errors.push(`API error: ${error.message}`);
    }

    console.log('🏗️ Test 4: Instance Creation');
    let instanceCreationSuccessful = false;
    
    for (const [index, buttonConfig] of EXPECTED_BUTTONS.entries()) {
      try {
        console.log(`   Testing button ${index + 1}/4: ${buttonConfig.name}`);
        const apiStartTime = Date.now();
        
        // Convert command string to array format expected by API
        const commandArray = buttonConfig.command.includes('&&') 
          ? buttonConfig.command.split('&&').map(cmd => cmd.trim()).join(' ').split(' ')
          : buttonConfig.command.split(' ');
          
        const createResponse = await fetch(`${BACKEND_URL}/api/claude/instances`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `test-${buttonConfig.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
            description: `Test instance for ${buttonConfig.name}`,
            command: commandArray,
            config: {
              workingDirectory: '/workspaces/agent-feed/prod',
              testMode: true
            }
          })
        });
        
        const responseTime = Date.now() - apiStartTime;
        validationReport.performanceMetrics.apiResponseTimes.push({
          button: buttonConfig.name,
          responseTime
        });
        
        if (createResponse.ok) {
          const createData = await createResponse.json();
          instanceCreationSuccessful = true;
          
          if (createData.instanceId) {
            validationReport.details.createdInstances.push({
              id: createData.instanceId,
              button: buttonConfig.name,
              created: new Date().toISOString()
            });
            console.log(`   ✅ Instance created: ${createData.instanceId}`);
          }
        } else {
          const errorText = await createResponse.text();
          console.log(`   ❌ Instance creation failed for ${buttonConfig.name}: ${createResponse.status} - ${errorText}`);
        }
        
        // Brief pause between creations
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`   ❌ Instance creation error for ${buttonConfig.name}: ${error.message}`);
        validationReport.details.errors.push(`Instance creation error: ${error.message}`);
      }
    }
    
    validationReport.results.instanceCreation = instanceCreationSuccessful;

    console.log('🔧 Test 5: Instance Management');
    let managementSuccessful = false;
    
    // Test instance listing after creation
    try {
      const listResponse = await fetch(`${BACKEND_URL}/api/claude/instances`);
      if (listResponse.ok) {
        const listData = await listResponse.json();
        const currentInstances = listData.instances || [];
        console.log(`   ✅ Instance listing works - ${currentInstances.length} instances found`);
        managementSuccessful = true;
        
        // Test instance details if any exist
        for (const instance of currentInstances.slice(0, 2)) { // Test first 2 instances
          try {
            const detailResponse = await fetch(`${BACKEND_URL}/api/claude/instances/${instance.id}`);
            if (detailResponse.ok) {
              const detailData = await detailResponse.json();
              console.log(`   ✅ Instance details retrieved for ${instance.id.slice(0, 8)}`);
            }
          } catch (error) {
            console.log(`   ⚠️ Instance details failed for ${instance.id}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ Instance management test failed: ${error.message}`);
      validationReport.details.errors.push(`Instance management error: ${error.message}`);
    }
    
    validationReport.results.instanceManagement = managementSuccessful;

    // Clean up created instances
    console.log('🧹 Cleanup: Removing test instances');
    for (const instance of validationReport.details.createdInstances) {
      try {
        const deleteResponse = await fetch(`${BACKEND_URL}/api/claude/instances/${instance.id}`, {
          method: 'DELETE'
        });
        if (deleteResponse.ok) {
          console.log(`   ✅ Cleaned up instance ${instance.id.slice(0, 8)}`);
        } else {
          console.log(`   ⚠️ Could not clean up instance ${instance.id.slice(0, 8)}: ${deleteResponse.status}`);
        }
      } catch (error) {
        console.log(`   ⚠️ Cleanup error for ${instance.id}: ${error.message}`);
      }
    }

    // Summary
    console.log('\n📊 Validation Summary:');
    console.log(`Frontend Accessible: ${validationReport.results.frontendAccessible ? '✅' : '❌'}`);
    console.log(`Backend Healthy: ${validationReport.results.backendHealthy ? '✅' : '❌'}`);
    console.log(`API Endpoints Working: ${validationReport.results.apiEndpointsWorking ? '✅' : '❌'}`);
    console.log(`Instance Creation: ${validationReport.results.instanceCreation ? '✅' : '❌'}`);
    console.log(`Instance Management: ${validationReport.results.instanceManagement ? '✅' : '❌'}`);
    console.log(`Frontend Response Time: ${validationReport.performanceMetrics.frontendResponseTime}ms`);
    console.log(`Backend Response Time: ${validationReport.performanceMetrics.backendResponseTime}ms`);
    console.log(`Total Errors: ${validationReport.details.errors.length}`);
    console.log(`Instances Created: ${validationReport.details.createdInstances.length}`);

  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    validationReport.details.errors.push(`System validation error: ${error.message}`);
  }

  // Save report
  const reportPath = './claude-instance-api-validation-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(validationReport, null, 2));
  console.log(`📄 Validation report saved: ${reportPath}`);
  
  return validationReport;
}

// Run if called directly  
if (import.meta.url === `file://${process.argv[1]}`) {
  validateClaudeInstancesSystem()
    .then(report => {
      const passed = Object.values(report.results).every(result => result === true);
      console.log(`\n🎯 Overall System Status: ${passed ? 'FULLY OPERATIONAL ✅' : 'ISSUES DETECTED ❌'}`);
      
      // Calculate success rate
      const passedTests = Object.values(report.results).filter(result => result === true).length;
      const totalTests = Object.keys(report.results).length;
      const successRate = Math.round((passedTests / totalTests) * 100);
      console.log(`📈 Success Rate: ${passedTests}/${totalTests} (${successRate}%)`);
      
      process.exit(passed ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Validation script failed:', error);
      process.exit(1);
    });
}

export { validateClaudeInstancesSystem };