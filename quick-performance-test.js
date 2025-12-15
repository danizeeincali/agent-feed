const http = require('http');
const { performance } = require('perf_hooks');

async function performanceTest() {
    console.log('🚀 AGENT FEED QUICK PERFORMANCE VALIDATION');
    console.log('==========================================');
    
    const results = {
        timestamp: new Date().toISOString(),
        tests: {}
    };
    
    // Test endpoints
    const endpoints = [
        { path: '/health', name: 'Health Check', target: 50 },
        { path: '/api/v1/agent-posts', name: 'API Posts', target: 200 },
        { path: '/api/v1/agent-posts?limit=10', name: 'Limited Posts', target: 150 }
    ];
    
    for (const endpoint of endpoints) {
        console.log(`\n🔍 Testing ${endpoint.name}...`);
        
        const measurements = [];
        
        for (let i = 0; i < 10; i++) {
            const start = performance.now();
            try {
                const response = await makeRequest(endpoint.path);
                const duration = performance.now() - start;
                
                measurements.push({
                    responseTime: duration,
                    success: response.statusCode >= 200 && response.statusCode < 400,
                    statusCode: response.statusCode
                });
            } catch (error) {
                measurements.push({
                    responseTime: 0,
                    success: false,
                    error: error.message
                });
            }
        }
        
        const successful = measurements.filter(m => m.success);
        const responseTimes = successful.map(m => m.responseTime);
        
        if (responseTimes.length > 0) {
            const avgTime = responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length;
            const maxTime = Math.max(...responseTimes);
            const minTime = Math.min(...responseTimes);
            
            results.tests[endpoint.name] = {
                averageResponseTime: avgTime,
                minResponseTime: minTime,
                maxResponseTime: maxTime,
                successRate: successful.length / measurements.length,
                target: endpoint.target,
                compliance: avgTime <= endpoint.target
            };
            
            const status = avgTime <= endpoint.target ? '✅ PASS' : '❌ FAIL';
            console.log(`  ${status} Avg: ${avgTime.toFixed(2)}ms (target: ${endpoint.target}ms)`);
            console.log(`  📊 Range: ${minTime.toFixed(2)}ms - ${maxTime.toFixed(2)}ms`);
            console.log(`  ✅ Success Rate: ${(successful.length / measurements.length * 100).toFixed(1)}%`);
        } else {
            results.tests[endpoint.name] = {
                error: 'All requests failed',
                successRate: 0,
                compliance: false
            };
            console.log(`  ❌ FAIL - All requests failed`);
        }
    }
    
    // Concurrent test
    console.log('\n⚡ Testing Concurrent Requests (10 simultaneous)...');
    const concurrentPromises = [];
    const startTime = performance.now();
    
    for (let i = 0; i < 10; i++) {
        concurrentPromises.push(makeRequest('/health'));
    }
    
    try {
        const concurrentResults = await Promise.all(concurrentPromises);
        const totalTime = performance.now() - startTime;
        
        const successfulConcurrent = concurrentResults.filter(r => r.statusCode >= 200 && r.statusCode < 400);
        const throughput = (successfulConcurrent.length / totalTime) * 1000;
        
        results.tests['Concurrent'] = {
            totalRequests: 10,
            successful: successfulConcurrent.length,
            successRate: successfulConcurrent.length / 10,
            throughput: throughput,
            totalTime: totalTime
        };
        
        const concurrentStatus = successfulConcurrent.length >= 9 ? '✅ PASS' : '❌ FAIL';
        console.log(`  ${concurrentStatus} ${successfulConcurrent.length}/10 successful`);
        console.log(`  🚀 Throughput: ${throughput.toFixed(2)} req/s`);
        
    } catch (error) {
        console.log(`  ❌ FAIL - Concurrent test failed: ${error.message}`);
        results.tests['Concurrent'] = { error: error.message, compliance: false };
    }
    
    // Generate summary
    console.log('\n📊 PERFORMANCE SUMMARY');
    console.log('======================');
    
    const allTests = Object.values(results.tests).filter(t => !t.error);
    const compliantTests = allTests.filter(t => t.compliance).length;
    const totalTests = Object.keys(results.tests).length;
    
    console.log(`🎯 Overall Compliance: ${compliantTests}/${allTests.length} tests passed`);
    
    if (allTests.length > 0) {
        const avgResponseTimes = allTests.filter(t => t.averageResponseTime).map(t => t.averageResponseTime);
        if (avgResponseTimes.length > 0) {
            const overallAvg = avgResponseTimes.reduce((sum, t) => sum + t, 0) / avgResponseTimes.length;
            console.log(`⚡ Average Response Time: ${overallAvg.toFixed(2)}ms`);
        }
        
        const avgSuccessRates = allTests.map(t => t.successRate || 0);
        const overallSuccessRate = avgSuccessRates.reduce((sum, r) => sum + r, 0) / avgSuccessRates.length;
        console.log(`✅ Average Success Rate: ${(overallSuccessRate * 100).toFixed(1)}%`);
    }
    
    // Performance targets validation
    console.log('\n🎯 PERFORMANCE TARGET VALIDATION:');
    console.log('• API response time target: <200ms');
    console.log('• Database query target: <100ms (simulated via API)');
    console.log('• Throughput target: >50 req/sec');
    console.log('• Success rate target: >95%');
    
    const apiTest = results.tests['API Posts'];
    if (apiTest && !apiTest.error) {
        console.log(`\n📋 API Performance: ${apiTest.compliance ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
        console.log(`   Response time: ${apiTest.averageResponseTime.toFixed(2)}ms (target: <200ms)`);
    }
    
    const concurrentTest = results.tests['Concurrent'];
    if (concurrentTest && !concurrentTest.error) {
        const throughputCompliant = concurrentTest.throughput >= 50;
        console.log(`\n🚀 Throughput: ${throughputCompliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
        console.log(`   Achieved: ${concurrentTest.throughput.toFixed(2)} req/s (target: >50 req/s)`);
        
        const reliabilityCompliant = concurrentTest.successRate >= 0.95;
        console.log(`\n✅ Reliability: ${reliabilityCompliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
        console.log(`   Success rate: ${(concurrentTest.successRate * 100).toFixed(1)}% (target: >95%)`);
    }
    
    console.log('\n💡 QUICK RECOMMENDATIONS:');
    
    if (apiTest && !apiTest.compliance) {
        console.log('• Implement response caching for API endpoints');
        console.log('• Optimize database queries and add indexes');
    }
    
    if (concurrentTest && concurrentTest.throughput < 50) {
        console.log('• Scale server infrastructure');
        console.log('• Implement connection pooling');
    }
    
    if (allTests.some(t => (t.successRate || 1) < 0.95)) {
        console.log('• Improve error handling and retry logic');
        console.log('• Add health checks and monitoring');
    }
    
    console.log('\n🎉 Performance validation completed!');
    console.log(`📊 Report generated at: ${results.timestamp}`);
    
    return results;
}

function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET',
            timeout: 5000
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    data: data
                });
            });
        });
        
        req.on('error', (error) => {
            resolve({
                statusCode: 0,
                error: error.message
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({
                statusCode: 0,
                error: 'Request timeout'
            });
        });
        
        req.end();
    });
}

if (require.main === module) {
    performanceTest().catch(console.error);
}