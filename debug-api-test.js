#!/usr/bin/env node

// Simple Node.js script to test the API endpoints

import http from 'http';

function makeRequest(port, path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: port,
            path: path,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ 
                        status: res.statusCode, 
                        data: parsed,
                        length: parsed.data?.length || 0
                    });
                } catch (e) {
                    resolve({ 
                        status: res.statusCode, 
                        data: data,
                        error: e.message 
                    });
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(5000);
        req.end();
    });
}

async function testEndpoints() {
    console.log('Testing API endpoints...\n');
    
    // Test backend directly
    console.log('1. Testing backend directly (port 3000):');
    try {
        const backendResult = await makeRequest(3000, '/api/v1/agent-posts');
        console.log(`   Status: ${backendResult.status}`);
        console.log(`   Posts: ${backendResult.length}`);
        console.log(`   Success: ${backendResult.data?.success || false}`);
    } catch (error) {
        console.log(`   Error: ${error.message}`);
    }
    
    console.log('');
    
    // Test frontend proxy
    console.log('2. Testing frontend proxy (port 5173):');
    try {
        const proxyResult = await makeRequest(5173, '/api/v1/agent-posts');
        console.log(`   Status: ${proxyResult.status}`);
        console.log(`   Posts: ${proxyResult.length}`);
        console.log(`   Success: ${proxyResult.data?.success || false}`);
        
        if (proxyResult.data?.data?.length > 0) {
            console.log(`   First post: "${proxyResult.data.data[0].title}"`);
        }
    } catch (error) {
        console.log(`   Error: ${error.message}`);
    }
    
    console.log('');
    console.log('Test completed!');
}

testEndpoints();