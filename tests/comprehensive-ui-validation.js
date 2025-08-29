#!/usr/bin/env node

/**
 * Comprehensive UI/UX Pre-Validation Script
 * This script tests the backend endpoints that the frontend depends on
 * Manual browser testing is still required for complete validation
 */

const http = require('http');
const https = require('https');

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';

async function makeRequest(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname + parsedUrl.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: body
                });
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

async function testEndpoint(name, url, expectedStatus = 200) {
    try {
        console.log(`🧪 Testing ${name}...`);
        const response = await makeRequest(url);
        
        if (response.statusCode === expectedStatus) {
            console.log(`✅ ${name}: SUCCESS (${response.statusCode})`);
            return true;
        } else {
            console.log(`❌ ${name}: FAILED (${response.statusCode}, expected ${expectedStatus})`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${name}: ERROR - ${error.message}`);
        return false;
    }
}

async function testClaudeInstanceCreation() {
    console.log(`🧪 Testing Claude instance creation...`);
    try {
        const response = await makeRequest(`${BACKEND_URL}/api/claude/instances`, 'POST', {
            type: 'dev',
            name: 'test-instance'
        });
        
        if (response.statusCode === 200 || response.statusCode === 201) {
            console.log(`✅ Claude instance creation: SUCCESS`);
            const instanceData = JSON.parse(response.body);
            return instanceData.id;
        } else {
            console.log(`❌ Claude instance creation: FAILED (${response.statusCode})`);
            console.log(`Response: ${response.body}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Claude instance creation: ERROR - ${error.message}`);
        return null;
    }
}

async function runComprehensiveValidation() {
    console.log('🎯 COMPREHENSIVE UI/UX PRE-VALIDATION STARTING...\n');
    
    const tests = [
        // Frontend tests
        ['Frontend Root', `${FRONTEND_URL}/`],
        ['Claude Instances Page', `${FRONTEND_URL}/claude-instances`],
        
        // Backend health tests  
        ['Backend Health', `${BACKEND_URL}/health`],
        
        // API endpoint tests (some may 404 but should respond)
        ['Claude Instances List', `${BACKEND_URL}/api/claude/instances`, 200],
        ['v1 Claude Instances', `${BACKEND_URL}/api/v1/claude/instances`, 404], // Expected 404
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    // Run endpoint tests
    for (const [name, url, expectedStatus] of tests) {
        const passed = await testEndpoint(name, url, expectedStatus || 200);
        if (passed) passedTests++;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Test Claude instance creation
    console.log('\n🚀 Testing Claude Instance Workflow...');
    const instanceId = await testClaudeInstanceCreation();
    if (instanceId) {
        passedTests++;
        totalTests++;
    } else {
        totalTests++;
    }
    
    // Summary
    console.log('\n📊 PRE-VALIDATION SUMMARY:');
    console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests} tests`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 ALL PRE-VALIDATION TESTS PASSED!');
        console.log('\n🌐 READY FOR MANUAL BROWSER TESTING:');
        console.log(`📍 Navigate to: ${FRONTEND_URL}/claude-instances`);
        console.log('\n📋 MANUAL TESTING CHECKLIST:');
        console.log('1. ✅ Open browser developer console (F12)');
        console.log('2. ✅ Navigate to the URL above');
        console.log('3. ✅ Verify NO JavaScript errors in console');
        console.log('4. ✅ Test all 4 instance creation buttons');
        console.log('5. ✅ Verify instances appear and connect');
        console.log('6. ✅ Test terminal input/output functionality');
        console.log('7. ✅ Test switching between multiple instances');
        console.log('8. ✅ Verify SSE connections in Network tab');
        console.log('9. ✅ Test UI responsiveness and UX flow');
        console.log('10. ✅ Screenshot any issues found');
        
        return true;
    } else {
        console.log('\n⚠️  SOME PRE-VALIDATION TESTS FAILED');
        console.log('Manual browser testing should still proceed to identify UI-specific issues');
        return false;
    }
}

// Run validation
runComprehensiveValidation()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('❌ Validation failed with error:', error);
        process.exit(1);
    });