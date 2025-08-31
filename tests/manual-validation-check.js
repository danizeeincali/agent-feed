/**
 * Manual Production Validation Check
 * Quick verification script for production systems
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';

async function validateProduction() {
  console.log('🔍 Starting Manual Production Validation...\n');
  
  const results = {
    backend: { status: '❌', details: {} },
    frontend: { status: '❌', details: {} },
    claudeInstances: { status: '❌', details: {} },
    workflow: { status: '❌', details: {} }
  };

  try {
    // 1. Backend Health Check
    console.log('1️⃣ Checking Backend Health...');
    try {
      const healthResponse = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      if (healthResponse.status === 200) {
        results.backend.status = '✅';
        results.backend.details = {
          status: healthResponse.data.status,
          server: healthResponse.data.server,
          timestamp: healthResponse.data.timestamp
        };
        console.log(`   ✅ Backend is healthy: ${healthResponse.data.status}`);
      }
    } catch (error) {
      results.backend.details.error = error.message;
      console.log(`   ❌ Backend health check failed: ${error.message}`);
    }

    // 2. Frontend Availability
    console.log('\n2️⃣ Checking Frontend Availability...');
    try {
      const frontendResponse = await axios.get(FRONTEND_URL, { timeout: 5000 });
      if (frontendResponse.status === 200) {
        results.frontend.status = '✅';
        results.frontend.details = {
          status: frontendResponse.status,
          contentLength: frontendResponse.data?.length || 0
        };
        console.log(`   ✅ Frontend is serving content (${results.frontend.details.contentLength} bytes)`);
      }
    } catch (error) {
      results.frontend.details.error = error.message;
      console.log(`   ❌ Frontend check failed: ${error.message}`);
    }

    // 3. Claude Instances API
    console.log('\n3️⃣ Checking Claude Instances API...');
    try {
      const instancesResponse = await axios.get(`${BACKEND_URL}/api/claude/instances`, { timeout: 5000 });
      if (instancesResponse.status === 200 && instancesResponse.data.success) {
        results.claudeInstances.status = '✅';
        results.claudeInstances.details = {
          count: instancesResponse.data.instances.length,
          instances: instancesResponse.data.instances.map(i => ({
            id: i.id,
            name: i.name,
            status: i.status
          }))
        };
        console.log(`   ✅ Found ${instancesResponse.data.instances.length} Claude instances`);
        instancesResponse.data.instances.forEach(instance => {
          console.log(`      - ${instance.id}: ${instance.name} (${instance.status})`);
        });
      }
    } catch (error) {
      results.claudeInstances.details.error = error.message;
      console.log(`   ❌ Claude instances API failed: ${error.message}`);
    }

    // 4. Full Workflow Test
    console.log('\n4️⃣ Testing Complete Workflow...');
    let testInstanceId = null;
    
    try {
      // Create instance
      console.log('   📤 Creating test instance...');
      const createResponse = await axios.post(`${BACKEND_URL}/api/claude/instances`, {
        name: 'Manual Validation Test',
        instanceType: 'prod'
      });
      
      if (createResponse.status === 201 && createResponse.data.success) {
        testInstanceId = createResponse.data.instance.id;
        console.log(`   ✅ Created instance: ${testInstanceId}`);
        
        // Wait for instance to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Send test command
        console.log('   📤 Sending test command...');
        const commandResponse = await axios.post(
          `${BACKEND_URL}/api/claude/instances/${testInstanceId}/terminal/input`,
          { input: 'echo "Manual validation test successful"' }
        );
        
        if (commandResponse.status === 200 && commandResponse.data.success) {
          console.log(`   ✅ Command sent successfully`);
          
          // Check instance status
          const statusResponse = await axios.get(`${BACKEND_URL}/api/claude/instances/${testInstanceId}/status`);
          if (statusResponse.status === 200) {
            console.log(`   ✅ Instance status confirmed (PID: ${statusResponse.data.status.pid})`);
            
            results.workflow.status = '✅';
            results.workflow.details = {
              instanceCreated: true,
              commandSent: true,
              statusConfirmed: true,
              testInstanceId: testInstanceId
            };
          }
        }
      }
    } catch (error) {
      results.workflow.details.error = error.message;
      console.log(`   ❌ Workflow test failed: ${error.message}`);
    } finally {
      // Cleanup test instance
      if (testInstanceId) {
        try {
          await axios.delete(`${BACKEND_URL}/api/claude/instances/${testInstanceId}`);
          console.log(`   🗑️ Cleaned up test instance: ${testInstanceId}`);
        } catch (error) {
          console.log(`   ⚠️ Failed to cleanup test instance: ${error.message}`);
        }
      }
    }

    // 5. Generate Report
    console.log('\n' + '='.repeat(60));
    console.log('📊 PRODUCTION VALIDATION RESULTS');
    console.log('='.repeat(60));
    console.log(`Backend Health:     ${results.backend.status}`);
    console.log(`Frontend Serving:   ${results.frontend.status}`);
    console.log(`Claude Instances:   ${results.claudeInstances.status}`);
    console.log(`Complete Workflow:  ${results.workflow.status}`);
    console.log('='.repeat(60));
    
    const allPassing = Object.values(results).every(r => r.status === '✅');
    
    if (allPassing) {
      console.log('🎉 ALL VALIDATION CHECKS PASSED!');
      console.log('✅ Production system is fully functional');
      console.log('✅ Real Claude processes are working');
      console.log('✅ Frontend-backend integration complete');
      console.log('✅ End-to-end workflow validated');
    } else {
      console.log('⚠️ Some validation checks failed');
      console.log('📋 Check details above for specific issues');
    }
    
    // Return validation results
    return {
      success: allPassing,
      results: results,
      summary: {
        backend: results.backend.status === '✅',
        frontend: results.frontend.status === '✅',
        claudeInstances: results.claudeInstances.status === '✅',
        workflow: results.workflow.status === '✅'
      }
    };

  } catch (error) {
    console.error('❌ Validation process failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Export for programmatic use
module.exports = { validateProduction };

// Run if called directly
if (require.main === module) {
  validateProduction()
    .then(result => {
      console.log(`\n🔍 Final Result: ${result.success ? 'PASSED' : 'FAILED'}`);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation error:', error);
      process.exit(1);
    });
}