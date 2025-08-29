#!/usr/bin/env node

/**
 * SSE Incremental Output Fix Validation
 * 
 * This script validates that the SSE buffer accumulation storm has been fixed
 * by testing the incremental output streaming with position tracking.
 */

const EventSource = require('eventsource');
const fetch = require('node-fetch');
const colors = require('colors');

const API_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';

// Test results tracking
let testsPassed = 0;
let testsFailed = 0;
const messageHistory = [];
let duplicateCount = 0;

console.log('🚀 SSE Incremental Output Fix Validation'.cyan.bold);
console.log('='.repeat(60).gray);

async function validateSSEFix() {
  try {
    // Step 1: Create a Claude instance
    console.log('\n1️⃣ Creating Claude instance...'.yellow);
    
    const createResponse = await fetch(`${API_URL}/api/claude/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: ['claude', '--dangerously-skip-permissions'],
        instanceType: 'skip-permissions',
        usePty: true
      })
    });
    
    const { instanceId } = await createResponse.json();
    console.log(`✅ Instance created: ${instanceId}`.green);
    
    // Step 2: Connect to SSE stream
    console.log('\n2️⃣ Connecting to SSE stream...'.yellow);
    
    const sseUrl = `${API_URL}/api/claude/instances/${instanceId}/stream`;
    const eventSource = new EventSource(sseUrl);
    
    let messagesReceived = 0;
    let lastPosition = 0;
    let outputBuffer = '';
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        messagesReceived++;
        
        // Check for terminal output
        if (data.type === 'terminal_output' || data.type === 'output') {
          const output = data.output || data.data || '';
          
          // Validate incremental output
          if (data.isIncremental) {
            console.log(`📤 Incremental output received:`.dim, {
              position: data.position,
              length: output.length,
              totalLength: data.totalLength
            });
            
            // Check position tracking
            if (data.position !== undefined && data.position === lastPosition) {
              console.log(`✅ Position tracking correct: ${data.position}`.green);
              testsPassed++;
            } else if (data.position !== undefined) {
              console.log(`⚠️ Position mismatch: expected ${lastPosition}, got ${data.position}`.yellow);
            }
            
            lastPosition = data.position + output.length;
            outputBuffer += output;
          }
          
          // Check for duplicates
          const hash = Buffer.from(output).toString('base64').substring(0, 20);
          if (messageHistory.includes(hash) && output.length > 10) {
            duplicateCount++;
            console.log(`❌ DUPLICATE DETECTED: ${output.substring(0, 50)}...`.red);
            testsFailed++;
          } else {
            messageHistory.push(hash);
          }
        }
        
        // Check status
        if (data.type === 'instance:status' && data.status === 'running') {
          console.log(`✅ Instance ${instanceId} is running`.green);
          
          // Step 3: Send test input after instance is ready
          setTimeout(() => sendTestInput(instanceId), 1000);
        }
      } catch (error) {
        console.error('❌ Error processing SSE message:'.red, error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('❌ SSE connection error:'.red, error);
      eventSource.close();
      printResults();
    };
    
    // Timeout after 10 seconds
    setTimeout(() => {
      console.log('\n⏰ Test timeout reached, analyzing results...'.yellow);
      eventSource.close();
      printResults();
      process.exit(duplicateCount > 0 ? 1 : 0);
    }, 10000);
    
  } catch (error) {
    console.error('❌ Test failed:'.red, error);
    process.exit(1);
  }
}

async function sendTestInput(instanceId) {
  console.log('\n3️⃣ Sending test input "hello"...'.yellow);
  
  try {
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response = await fetch(`${API_URL}/api/claude/instances/${instanceId}/terminal/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'hello' })
      });
      
      if (response.ok) {
        console.log(`✅ Input ${i + 1} sent successfully`.green);
      }
    }
  } catch (error) {
    console.error('❌ Failed to send input:'.red, error);
  }
}

function printResults() {
  console.log('\n' + '='.repeat(60).gray);
  console.log('📊 TEST RESULTS'.cyan.bold);
  console.log('='.repeat(60).gray);
  
  console.log(`✅ Tests Passed: ${testsPassed}`.green);
  console.log(`❌ Tests Failed: ${testsFailed}`.red);
  console.log(`📨 Messages Received: ${messageHistory.length}`);
  console.log(`🔁 Duplicates Detected: ${duplicateCount}`);
  
  if (duplicateCount === 0) {
    console.log('\n🎉 SUCCESS: No message duplication detected!'.green.bold);
    console.log('The SSE incremental output fix is working correctly!'.green);
  } else {
    console.log(`\n⚠️ WARNING: ${duplicateCount} duplicate messages detected`.red.bold);
    console.log('The SSE buffer accumulation issue may still be present.'.red);
  }
  
  console.log('='.repeat(60).gray);
}

// Run the validation
validateSSEFix().catch(console.error);