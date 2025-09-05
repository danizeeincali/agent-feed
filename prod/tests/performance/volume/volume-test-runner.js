#!/usr/bin/env node

/**
 * Volume Testing Suite for Agent Feed Enhancement System
 * Tests system behavior with large data volumes
 */

import { performance } from 'perf_hooks';
import axios from 'axios';
import { createWriteStream } from 'fs';
import path from 'path';

class VolumeTestRunner {
    constructor() {
        this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
        this.testResults = [];
        this.reportPath = path.join(process.cwd(), 'reports', 'volume-test-results.json');
        this.csvPath = path.join(process.cwd(), 'reports', 'volume-test-results.csv');
    }

    async runAllVolumeTests() {
        console.log('🚀 Starting Volume Testing Suite...');
        
        try {
            // Test 1: Million Posts Processing
            await this.testMillionPostsProcessing();
            
            // Test 2: Large Batch Operations
            await this.testLargeBatchOperations();
            
            // Test 3: Heavy Search Operations
            await this.testHeavySearchOperations();
            
            // Test 4: Large File Operations
            await this.testLargeFileOperations();
            
            // Test 5: Memory Intensive Operations
            await this.testMemoryIntensiveOperations();
            
            // Generate comprehensive report
            await this.generateReport();
            
            console.log('✅ Volume testing completed successfully');
            
        } catch (error) {
            console.error('❌ Volume testing failed:', error.message);
            throw error;
        }
    }

    async testMillionPostsProcessing() {
        console.log('📊 Test 1: Million Posts Processing');
        
        const testStart = performance.now();
        const batchSize = 1000;
        const totalPosts = 1000000;
        const batches = totalPosts / batchSize;
        
        let successfulPosts = 0;
        let failedPosts = 0;
        const batchTimes = [];
        
        for (let batch = 0; batch < batches; batch++) {
            const batchStart = performance.now();
            
            try {
                const posts = this.generatePostBatch(batchSize, batch);
                
                const response = await axios.post(`${this.baseUrl}/api/posts/batch`, {
                    posts: posts
                }, {
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.status === 201) {
                    successfulPosts += batchSize;
                } else {
                    failedPosts += batchSize;
                }
                
                const batchTime = performance.now() - batchStart;
                batchTimes.push(batchTime);
                
                // Progress reporting
                if (batch % 100 === 0) {
                    const progress = ((batch / batches) * 100).toFixed(2);
                    console.log(`  Progress: ${progress}% - Batch ${batch}/${batches}`);
                }
                
            } catch (error) {
                failedPosts += batchSize;
                console.warn(`  Batch ${batch} failed:`, error.message);
            }
            
            // Throttle to prevent overwhelming the system
            if (batch % 10 === 0) {
                await this.sleep(100);
            }
        }
        
        const testTime = performance.now() - testStart;
        const avgBatchTime = batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length;
        const throughput = (successfulPosts / (testTime / 1000)).toFixed(2);
        
        const testResult = {
            testName: 'Million Posts Processing',
            totalPosts: totalPosts,
            successfulPosts: successfulPosts,
            failedPosts: failedPosts,
            totalTime: testTime,
            averageBatchTime: avgBatchTime,
            throughput: `${throughput} posts/second`,
            memoryUsage: process.memoryUsage(),
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(testResult);
        console.log(`  ✅ Processed ${successfulPosts}/${totalPosts} posts in ${(testTime/1000).toFixed(2)}s`);
        console.log(`  📈 Throughput: ${throughput} posts/second`);
    }

    async testLargeBatchOperations() {
        console.log('📦 Test 2: Large Batch Operations');
        
        const batchSizes = [5000, 10000, 25000, 50000];
        const batchResults = [];
        
        for (const batchSize of batchSizes) {
            console.log(`  Testing batch size: ${batchSize}`);
            const batchStart = performance.now();
            
            try {
                const largeBatch = this.generatePostBatch(batchSize, 0);
                
                const response = await axios.post(`${this.baseUrl}/api/posts/batch`, {
                    posts: largeBatch
                }, {
                    timeout: 60000,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                });
                
                const batchTime = performance.now() - batchStart;
                const memUsage = process.memoryUsage();
                
                batchResults.push({
                    batchSize: batchSize,
                    processingTime: batchTime,
                    success: response.status === 201,
                    memoryUsage: memUsage.heapUsed,
                    throughput: (batchSize / (batchTime / 1000)).toFixed(2)
                });
                
                console.log(`    ✅ Batch ${batchSize}: ${(batchTime/1000).toFixed(2)}s`);
                
            } catch (error) {
                console.warn(`    ❌ Batch ${batchSize} failed:`, error.message);
                batchResults.push({
                    batchSize: batchSize,
                    processingTime: 0,
                    success: false,
                    error: error.message
                });
            }
            
            // Memory cleanup between batches
            if (global.gc) {
                global.gc();
            }
            await this.sleep(5000);
        }
        
        this.testResults.push({
            testName: 'Large Batch Operations',
            batchResults: batchResults,
            timestamp: new Date().toISOString()
        });
    }

    async testHeavySearchOperations() {
        console.log('🔍 Test 3: Heavy Search Operations');
        
        const searchQueries = [
            { query: 'performance', limit: 10000 },
            { query: 'agent', limit: 50000 },
            { query: 'test', limit: 100000 },
            { query: '*', limit: 250000 }
        ];
        
        const searchResults = [];
        
        for (const search of searchQueries) {
            console.log(`  Searching for '${search.query}' with limit ${search.limit}`);
            const searchStart = performance.now();
            
            try {
                const response = await axios.get(`${this.baseUrl}/api/posts/search`, {
                    params: {
                        query: search.query,
                        limit: search.limit,
                        includeContent: true
                    },
                    timeout: 120000
                });
                
                const searchTime = performance.now() - searchStart;
                const resultCount = response.data.results ? response.data.results.length : 0;
                
                searchResults.push({
                    query: search.query,
                    requestedLimit: search.limit,
                    actualResults: resultCount,
                    searchTime: searchTime,
                    resultsPerSecond: (resultCount / (searchTime / 1000)).toFixed(2),
                    success: true
                });
                
                console.log(`    ✅ Found ${resultCount} results in ${(searchTime/1000).toFixed(2)}s`);
                
            } catch (error) {
                console.warn(`    ❌ Search '${search.query}' failed:`, error.message);
                searchResults.push({
                    query: search.query,
                    requestedLimit: search.limit,
                    success: false,
                    error: error.message
                });
            }
        }
        
        this.testResults.push({
            testName: 'Heavy Search Operations',
            searchResults: searchResults,
            timestamp: new Date().toISOString()
        });
    }

    async testLargeFileOperations() {
        console.log('📁 Test 4: Large File Operations');
        
        const fileSizes = [
            { name: '1MB', size: 1024 * 1024 },
            { name: '5MB', size: 5 * 1024 * 1024 },
            { name: '10MB', size: 10 * 1024 * 1024 },
            { name: '25MB', size: 25 * 1024 * 1024 }
        ];
        
        const fileResults = [];
        
        for (const fileSize of fileSizes) {
            console.log(`  Testing ${fileSize.name} file processing`);
            const fileStart = performance.now();
            
            try {
                // Generate large content
                const largeContent = 'x'.repeat(fileSize.size);
                
                const response = await axios.post(`${this.baseUrl}/api/posts`, {
                    title: `Large File Test - ${fileSize.name}`,
                    content: largeContent,
                    author: 'volume-test-agent',
                    tags: ['volume', 'file-test', fileSize.name]
                }, {
                    timeout: 180000,
                    maxContentLength: fileSize.size * 2,
                    maxBodyLength: fileSize.size * 2
                });
                
                const fileTime = performance.now() - fileStart;
                const throughput = (fileSize.size / (fileTime / 1000) / 1024 / 1024).toFixed(2);
                
                fileResults.push({
                    fileName: fileSize.name,
                    fileSize: fileSize.size,
                    processingTime: fileTime,
                    throughputMBps: throughput,
                    success: response.status === 201
                });
                
                console.log(`    ✅ ${fileSize.name}: ${(fileTime/1000).toFixed(2)}s (${throughput} MB/s)`);
                
            } catch (error) {
                console.warn(`    ❌ ${fileSize.name} failed:`, error.message);
                fileResults.push({
                    fileName: fileSize.name,
                    fileSize: fileSize.size,
                    success: false,
                    error: error.message
                });
            }
        }
        
        this.testResults.push({
            testName: 'Large File Operations',
            fileResults: fileResults,
            timestamp: new Date().toISOString()
        });
    }

    async testMemoryIntensiveOperations() {
        console.log('🧠 Test 5: Memory Intensive Operations');
        
        const memoryTests = [
            { name: 'Large Array Processing', size: 100000 },
            { name: 'Deep Object Operations', depth: 1000 },
            { name: 'String Concatenation', iterations: 1000000 },
            { name: 'JSON Processing', objects: 50000 }
        ];
        
        const memoryResults = [];
        
        for (const test of memoryTests) {
            console.log(`  Running ${test.name}`);
            const memStart = process.memoryUsage();
            const testStart = performance.now();
            
            try {
                let result;
                
                switch (test.name) {
                    case 'Large Array Processing':
                        result = await this.testLargeArrayProcessing(test.size);
                        break;
                    case 'Deep Object Operations':
                        result = await this.testDeepObjectOperations(test.depth);
                        break;
                    case 'String Concatenation':
                        result = await this.testStringConcatenation(test.iterations);
                        break;
                    case 'JSON Processing':
                        result = await this.testJSONProcessing(test.objects);
                        break;
                }
                
                const testTime = performance.now() - testStart;
                const memEnd = process.memoryUsage();
                const memoryDelta = memEnd.heapUsed - memStart.heapUsed;
                
                memoryResults.push({
                    testName: test.name,
                    processingTime: testTime,
                    memoryDelta: memoryDelta,
                    peakMemory: memEnd.heapUsed,
                    success: true,
                    result: result
                });
                
                console.log(`    ✅ ${test.name}: ${(testTime/1000).toFixed(2)}s, Memory Δ: ${(memoryDelta/1024/1024).toFixed(2)}MB`);
                
            } catch (error) {
                console.warn(`    ❌ ${test.name} failed:`, error.message);
                memoryResults.push({
                    testName: test.name,
                    success: false,
                    error: error.message
                });
            }
            
            // Force garbage collection between tests
            if (global.gc) {
                global.gc();
            }
            await this.sleep(2000);
        }
        
        this.testResults.push({
            testName: 'Memory Intensive Operations',
            memoryResults: memoryResults,
            timestamp: new Date().toISOString()
        });
    }

    generatePostBatch(size, batchIndex) {
        const posts = [];
        for (let i = 0; i < size; i++) {
            posts.push({
                title: `Volume Test Post ${batchIndex}-${i}`,
                content: this.generateRandomContent(200),
                author: `volume-agent-${i % 100}`,
                tags: ['volume', 'test', `batch-${batchIndex}`, `post-${i}`],
                timestamp: new Date().toISOString(),
                metadata: {
                    batchIndex: batchIndex,
                    postIndex: i,
                    testRun: 'volume-test'
                }
            });
        }
        return posts;
    }

    generateRandomContent(minLength = 100) {
        const words = ['performance', 'test', 'volume', 'data', 'processing', 'agent', 'feed', 'system', 'benchmark', 'load'];
        let content = '';
        const targetLength = minLength + Math.floor(Math.random() * 300);
        
        while (content.length < targetLength) {
            const word = words[Math.floor(Math.random() * words.length)];
            content += word + ' ';
        }
        
        return content.trim();
    }

    async testLargeArrayProcessing(size) {
        const largeArray = new Array(size).fill(0).map((_, i) => ({ id: i, value: Math.random() * 1000 }));
        
        // Sorting operation
        const sorted = largeArray.sort((a, b) => b.value - a.value);
        
        // Filtering operation
        const filtered = sorted.filter(item => item.value > 500);
        
        // Mapping operation
        const mapped = filtered.map(item => ({ ...item, processed: true, timestamp: Date.now() }));
        
        return {
            originalSize: size,
            sortedSize: sorted.length,
            filteredSize: filtered.length,
            mappedSize: mapped.length
        };
    }

    async testDeepObjectOperations(depth) {
        let deepObject = { level: 0, data: 'test' };
        
        // Create deep nested object
        for (let i = 1; i < depth; i++) {
            deepObject = {
                level: i,
                parent: deepObject,
                data: `level-${i}-data`,
                metadata: {
                    created: Date.now(),
                    depth: i
                }
            };
        }
        
        // Traverse back to root
        let current = deepObject;
        let traversalCount = 0;
        while (current.parent) {
            current = current.parent;
            traversalCount++;
        }
        
        return {
            requestedDepth: depth,
            actualDepth: traversalCount + 1,
            rootLevel: current.level
        };
    }

    async testStringConcatenation(iterations) {
        let result = '';
        const testString = 'performance test string ';
        
        for (let i = 0; i < iterations; i++) {
            result += testString + i + ' ';
            
            // Prevent string from growing too large
            if (i % 10000 === 0 && result.length > 1000000) {
                result = result.substring(result.length - 500000);
            }
        }
        
        return {
            iterations: iterations,
            finalLength: result.length,
            avgCharPerIteration: result.length / iterations
        };
    }

    async testJSONProcessing(objectCount) {
        const largeObject = {
            metadata: {
                testRun: 'volume-test',
                timestamp: Date.now(),
                objectCount: objectCount
            },
            data: new Array(objectCount).fill(0).map((_, i) => ({
                id: i,
                name: `object-${i}`,
                properties: {
                    value: Math.random(),
                    type: 'test-object',
                    tags: [`tag-${i % 100}`, `category-${i % 10}`]
                },
                nested: {
                    level1: {
                        level2: {
                            level3: `deep-value-${i}`
                        }
                    }
                }
            }))
        };
        
        // JSON stringify
        const jsonString = JSON.stringify(largeObject);
        
        // JSON parse
        const parsedObject = JSON.parse(jsonString);
        
        return {
            objectCount: objectCount,
            jsonStringLength: jsonString.length,
            parsedDataLength: parsedObject.data.length,
            compressionRatio: (jsonString.length / JSON.stringify(largeObject).length) * 100
        };
    }

    async generateReport() {
        console.log('📊 Generating Volume Test Report...');
        
        const report = {
            testSuite: 'Volume Testing Suite',
            timestamp: new Date().toISOString(),
            duration: process.hrtime.bigint(),
            systemInfo: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime()
            },
            testResults: this.testResults,
            summary: this.generateSummary()
        };
        
        // Write JSON report
        await this.writeFile(this.reportPath, JSON.stringify(report, null, 2));
        
        // Write CSV report
        await this.generateCSVReport(report);
        
        console.log(`📄 Volume test report saved to: ${this.reportPath}`);
        console.log(`📊 CSV report saved to: ${this.csvPath}`);
    }

    generateSummary() {
        return {
            totalTests: this.testResults.length,
            passedTests: this.testResults.filter(test => 
                test.batchResults ? test.batchResults.some(batch => batch.success) :
                test.searchResults ? test.searchResults.some(search => search.success) :
                test.fileResults ? test.fileResults.some(file => file.success) :
                test.memoryResults ? test.memoryResults.some(mem => mem.success) :
                test.successfulPosts > 0
            ).length,
            recommendations: [
                'Monitor memory usage during large batch operations',
                'Implement pagination for large search results',
                'Consider streaming for large file operations',
                'Add circuit breakers for volume spikes'
            ]
        };
    }

    async generateCSVReport(report) {
        const csvContent = [
            'Test Name,Status,Duration (ms),Memory Usage (MB),Throughput,Notes',
            ...this.testResults.map(test => {
                const status = test.successfulPosts ? 'PASSED' : 'FAILED';
                const duration = test.totalTime || test.processingTime || 0;
                const memory = test.memoryUsage ? (test.memoryUsage.heapUsed / 1024 / 1024).toFixed(2) : 'N/A';
                const throughput = test.throughput || 'N/A';
                const notes = test.error || 'Completed successfully';
                
                return `"${test.testName}",${status},${duration.toFixed(2)},${memory},${throughput},"${notes}"`;
            })
        ].join('\n');
        
        await this.writeFile(this.csvPath, csvContent);
    }

    async writeFile(filePath, content) {
        return new Promise((resolve, reject) => {
            const stream = createWriteStream(filePath);
            stream.write(content);
            stream.end();
            stream.on('finish', resolve);
            stream.on('error', reject);
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run volume tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const runner = new VolumeTestRunner();
    
    runner.runAllVolumeTests()
        .then(() => {
            console.log('✅ All volume tests completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Volume tests failed:', error);
            process.exit(1);
        });
}

export default VolumeTestRunner;