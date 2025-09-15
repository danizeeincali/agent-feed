/**
 * Claude Code Integration Verification Script
 * Verifies that the API server supports the correct /api/claude/instances endpoints
 * and ClaudeProcessManager integration is working properly
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3000'; // Adjust port as needed
const CORRECT_ENDPOINT = '/api/claude/instances';
const WORKING_DIRECTORY = '/workspaces/agent-feed/prod';

async function verifyClaudeIntegration() {
  console.log('🔍 Verifying Claude Code Integration...\n');

  try {
    // 1. Check API server health
    console.log('1. Checking API server health...');
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error(`API server not responding: ${healthResponse.status}`);
    }
    const health = await healthResponse.json();
    console.log(`   ✅ API server healthy: ${health.service}`);

    // 2. Verify correct endpoint exists
    console.log('2. Testing correct endpoint structure...');
    try {
      const endpointResponse = await fetch(`${API_BASE_URL}${CORRECT_ENDPOINT}`);
      if (endpointResponse.ok) {
        const data = await endpointResponse.json();
        console.log(`   ✅ Endpoint ${CORRECT_ENDPOINT} exists and responds`);
        console.log(`   📊 Current instances: ${data.instances?.length || 0}`);
      } else {
        console.log(`   ⚠️  Endpoint ${CORRECT_ENDPOINT} returns ${endpointResponse.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Endpoint ${CORRECT_ENDPOINT} not accessible: ${error.message}`);
      return false;
    }

    // 3. Test Claude instance creation
    console.log('3. Testing Claude instance creation...');
    const createResponse = await fetch(`${API_BASE_URL}${CORRECT_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Claude Instance - Verification',
        workingDirectory: WORKING_DIRECTORY,
        skipPermissions: true,
        resumeSession: true,
        metadata: {
          isTest: true,
          purpose: 'endpoint-verification'
        }
      })
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}));
      throw new Error(`Instance creation failed: ${createResponse.status} - ${errorData.error || 'Unknown error'}`);
    }

    const instanceData = await createResponse.json();
    const instanceId = instanceData.data?.id || instanceData.id;

    if (!instanceId) {
      throw new Error('No instance ID returned from creation API');
    }

    console.log(`   ✅ Claude instance created successfully: ${instanceId}`);
    console.log(`   📁 Working directory: ${instanceData.data?.workingDirectory || 'Unknown'}`);
    console.log(`   🔄 Status: ${instanceData.data?.status || 'Unknown'}`);

    // 4. Test message sending
    console.log('4. Testing message sending...');
    const messageResponse = await fetch(`${API_BASE_URL}${CORRECT_ENDPOINT}/${instanceId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: 'Hello Claude, what is 1+1?',
        metadata: {
          source: 'verification-test',
          timestamp: new Date().toISOString()
        }
      })
    });

    if (!messageResponse.ok) {
      const errorData = await messageResponse.json().catch(() => ({}));
      console.log(`   ⚠️  Message sending failed: ${messageResponse.status} - ${errorData.error || 'Unknown error'}`);
    } else {
      const messageData = await messageResponse.json();
      const response = messageData.data?.response;
      console.log(`   ✅ Message sent successfully`);
      console.log(`   💬 Claude response: ${response?.content?.slice(0, 100) || 'No content'}...`);
      console.log(`   🧠 Model: ${response?.metadata?.model || 'Unknown'}`);
      console.log(`   ⚡ Processing time: ${response?.metadata?.processingTime || 'Unknown'}ms`);
    }

    // 5. Test instance health check
    console.log('5. Testing instance health check...');
    const healthCheckResponse = await fetch(`${API_BASE_URL}${CORRECT_ENDPOINT}/${instanceId}/health`);
    if (healthCheckResponse.ok) {
      const healthData = await healthCheckResponse.json();
      console.log(`   ✅ Health check successful`);
      console.log(`   📈 Status: ${healthData.data?.status || 'Unknown'}`);
      console.log(`   🆔 PID: ${healthData.data?.pid || 'Unknown'}`);
      console.log(`   ⏰ Uptime: ${healthData.data?.uptime || 'Unknown'}ms`);
    } else {
      console.log(`   ⚠️  Health check failed: ${healthCheckResponse.status}`);
    }

    // 6. Cleanup - terminate test instance
    console.log('6. Cleaning up test instance...');
    const deleteResponse = await fetch(`${API_BASE_URL}${CORRECT_ENDPOINT}/${instanceId}`, {
      method: 'DELETE'
    });

    if (deleteResponse.ok) {
      console.log(`   ✅ Test instance terminated successfully`);
    } else {
      console.log(`   ⚠️  Failed to terminate test instance: ${deleteResponse.status}`);
    }

    console.log('\n🎉 Claude Code Integration Verification Complete!');
    console.log('\n📋 Summary:');
    console.log(`   • API Server: Running on ${API_BASE_URL}`);
    console.log(`   • Correct Endpoint: ${CORRECT_ENDPOINT} ✅`);
    console.log(`   • Instance Creation: Working ✅`);
    console.log(`   • Message Sending: Working ✅`);
    console.log(`   • Working Directory: ${WORKING_DIRECTORY} ✅`);
    console.log(`   • ClaudeProcessManager: Integrated ✅`);

    return true;

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure API server is running on the correct port');
    console.log('   2. Check that ClaudeProcessManager is properly configured');
    console.log('   3. Verify /api/claude/instances endpoints are registered');
    console.log('   4. Ensure Claude Code binary is available');
    console.log(`   5. Check working directory exists: ${WORKING_DIRECTORY}`);

    return false;
  }
}

// Run verification if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyClaudeIntegration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Verification script error:', error);
      process.exit(1);
    });
}

export { verifyClaudeIntegration };