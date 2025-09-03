/**
 * TDD London School: Simple SSE Debug Script
 * 
 * This script tests the exact SSE contract failure point using only built-in modules
 */

import fetch from 'node-fetch';
import http from 'http';

const BACKEND_URL = 'http://localhost:3000';

async function debugSSEFlow() {
  console.log('🧪 TDD London School: Simple SSE Debug');
  console.log('='.repeat(50));
  
  try {
    // Step 1: Check if backend is running
    console.log('\n📋 CONTRACT 1: Backend Availability');
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    console.log('✅ Backend health status:', healthResponse.status);
    
    // Step 2: Get available instances
    console.log('\n📋 CONTRACT 2: Instance Management');
    const instancesResponse = await fetch(`${BACKEND_URL}/api/claude/instances`);
    const instancesData = await instancesResponse.json();
    const instances = instancesData.instances || [];
    console.log('📊 Available instances:', instances.length);
    console.log('📊 Instances data structure verified');
    
    if (instances.length === 0) {
      console.log('⚠️  Creating test instance...');
      const createResponse = await fetch(`${BACKEND_URL}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'claude --dangerously-skip-permissions',
          name: 'Debug Instance',
          type: 'skip-permissions'
        })
      });
      
      if (createResponse.ok) {
        console.log('✅ Instance created');
        // Get updated instances list
        const updatedResponse = await fetch(`${BACKEND_URL}/api/claude/instances`);
        const updatedData = await updatedResponse.json();
        const updatedInstances = updatedData.instances || [];
        instances.push(...updatedInstances);
      }
    }
    
    if (instances.length === 0) {
      console.log('❌ No instances available for testing');
      return;
    }
    
    const testInstance = instances[0];
    console.log('📍 Using instance:', testInstance.id);
    
    // Step 3: Test SSE endpoint headers
    console.log('\n📋 CONTRACT 3: SSE Endpoint Headers');
    const sseUrl = `${BACKEND_URL}/api/claude/instances/${testInstance.id}/terminal/stream`;
    console.log('🔗 SSE URL:', sseUrl);
    
    const sseResponse = await fetch(sseUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log('📊 SSE Response Status:', sseResponse.status);
    console.log('📊 Content-Type:', sseResponse.headers.get('content-type'));
    console.log('📊 Cache-Control:', sseResponse.headers.get('cache-control'));
    
    if (sseResponse.status === 200) {
      console.log('✅ SSE endpoint accepts connections');
    } else {
      console.log('❌ SSE endpoint failed');
      return;
    }
    
    // Step 4: Test message flow with manual stream reading
    console.log('\n📋 CONTRACT 4: Message Flow Testing');
    console.log('⏰ Listening for SSE messages for 15 seconds...');
    
    let messagesReceived = 0;
    let claudeResponseFound = false;
    
    // Set up timeout
    const timeout = setTimeout(() => {
      console.log('\n📋 TIMEOUT REACHED');
      console.log('📊 Total messages received:', messagesReceived);
      
      if (messagesReceived === 0) {
        console.log('❌ CRITICAL FAILURE: No SSE messages received');
        console.log('🔍 This indicates:');
        console.log('   1. SSE connections not registered in backend activeSSEConnections');
        console.log('   2. broadcastToConnections not sending to registered connections');
        console.log('   3. Backend process not generating events');
      } else {
        console.log('✅ SSE messages received, but checking for Claude responses...');
        if (!claudeResponseFound) {
          console.log('⚠️  No Claude AI responses detected in SSE stream');
          console.log('🔍 This suggests:');
          console.log('   1. Claude AI responses not triggering broadcastToConnections');
          console.log('   2. Response detection logic missing terminal_output messages');
        }
      }
      
      process.exit(0);
    }, 15000);
    
    // Create new SSE connection for testing
    const testResponse = await fetch(sseUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (testResponse.body) {
      const decoder = new TextDecoder();
      const reader = testResponse.body.getReader();
      
      // Monitor stream
      const monitorStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            
            if (chunk.trim()) {
              messagesReceived++;
              console.log(`📨 SSE Message #${messagesReceived}:`, JSON.stringify(chunk.substring(0, 100)));
              
              // Look for data messages
              if (chunk.includes('data: ')) {
                try {
                  const lines = chunk.split('\n');
                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      const messageData = JSON.parse(line.substring(6));
                      
                      console.log('📋 Parsed:', {
                        type: messageData.type,
                        hasData: !!messageData.data,
                        instanceId: messageData.instanceId,
                        isReal: messageData.isReal
                      });
                      
                      if (messageData.type === 'terminal_output') {
                        console.log('🎯 TERMINAL_OUTPUT FOUND!');
                        
                        if (messageData.data && messageData.data.length > 10 && !messageData.data.includes('echo')) {
                          console.log('🎉 CLAUDE AI RESPONSE DETECTED!');
                          console.log('   Content preview:', messageData.data.substring(0, 50) + '...');
                          claudeResponseFound = true;
                        }
                      }
                    }
                  }
                } catch (parseError) {
                  console.log('⚠️  Parse error:', parseError.message);
                }
              }
            }
          }
        } catch (error) {
          console.log('❌ Stream error:', error.message);
        }
      };
      
      // Start monitoring
      monitorStream();
      
      // Send test commands
      setTimeout(async () => {
        console.log('📤 Sending echo command...');
        try {
          await fetch(`${BACKEND_URL}/api/claude/instances/${testInstance.id}/terminal/input`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: 'echo "DEBUG_MESSAGE"',
              instanceId: testInstance.id
            })
          });
        } catch (error) {
          console.log('❌ Echo command failed:', error.message);
        }
      }, 2000);
      
      setTimeout(async () => {
        console.log('📤 Sending Claude AI query...');
        try {
          await fetch(`${BACKEND_URL}/api/claude/instances/${testInstance.id}/terminal/input`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: 'Hello Claude! Please respond with a simple greeting. This is a debug test to verify SSE message flow.',
              instanceId: testInstance.id
            })
          });
        } catch (error) {
          console.log('❌ Claude command failed:', error.message);
        }
      }, 5000);
    }
    
  } catch (error) {
    console.log('❌ Debug script failed:', error.message);
    process.exit(1);
  }
}

// Run the debug
debugSSEFlow();