#!/usr/bin/env node
const http = require('http');
const { URL } = require('url');

async function testEndpoint(baseUrl, endpoint) {
    return new Promise((resolve) => {
        const url = new URL(endpoint, baseUrl);
        const req = http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({
                        endpoint,
                        status: res.statusCode,
                        success: res.statusCode === 200,
                        hasData: !!parsed.data,
                        dataCount: Array.isArray(parsed.data) ? parsed.data.length : 1
                    });
                } catch (e) {
                    resolve({
                        endpoint,
                        status: res.statusCode,
                        success: res.statusCode === 200,
                        error: e.message
                    });
                }
            });
        });
        req.on('error', (err) => resolve({ endpoint, status: 0, success: false, error: err.message }));
        req.setTimeout(3000, () => {
            req.destroy();
            resolve({ endpoint, status: 0, success: false, error: 'timeout' });
        });
    });
}

async function runValidation() {
    const baseUrl = 'http://localhost:3000';
    const endpoints = ['/health', '/api/health', '/api/posts', '/api/agents', '/api/agent-posts?limit=5'];
    
    console.log('🔍 PRODUCTION VALIDATION TEST\n');
    
    const results = [];
    for (const endpoint of endpoints) {
        const result = await testEndpoint(baseUrl, endpoint);
        results.push(result);
        
        const status = result.success ? '✅' : '❌';
        const info = result.hasData ? ` (${result.dataCount} items)` : '';
        console.log(`${status} ${endpoint} - ${result.status}${info}`);
        if (result.error) console.log(`   Error: ${result.error}`);
    }
    
    const successful = results.filter(r => r.success).length;
    const total = results.length;
    const hasRealData = results.some(r => r.hasData && r.dataCount > 0);
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`Success: ${successful}/${total} (${Math.round(successful/total*100)}%)`);
    console.log(`Real data: ${hasRealData ? 'YES' : 'NO'}`);
    console.log(`Status: ${successful === total && hasRealData ? '🎉 PASSED' : '❌ ISSUES FOUND'}`);
    
    return successful === total && hasRealData;
}

runValidation().then(success => process.exit(success ? 0 : 1));
