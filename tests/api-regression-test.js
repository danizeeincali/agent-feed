/**
 * API-FOCUSED REGRESSION TEST SUITE
 * Settings Removal Validation - Backend API Testing
 *
 * Tests all backend functionality without browser automation
 * Validates API endpoints, backend services, and data integrity
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

class ApiRegressionTest {
    constructor() {
        this.baseUrl = 'http://localhost:3002';
        this.apiUrl = 'http://localhost:3002/api';
        this.testResults = [];
        this.failures = [];
        this.startTime = Date.now();
    }

    log(testName, status, details = '') {
        const result = {
            test: testName,
            status: status,
            details: details,
            timestamp: new Date().toISOString()
        };
        this.testResults.push(result);

        const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏳';
        console.log(`${icon} ${testName}: ${status} ${details}`);

        if (status === 'FAIL') {
            this.failures.push(`${testName}: ${details}`);
        }
    }

    async makeHttpRequest(url, method = 'GET', data = null, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'ApiRegressionTest/1.0',
                    'Accept': 'application/json, text/html, */*'
                },
                timeout: timeout
            };

            const req = http.request(url, options, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: responseData,
                        success: res.statusCode >= 200 && res.statusCode < 400
                    });
                });
            });

            req.on('error', (error) => {
                resolve({
                    status: 0,
                    headers: {},
                    data: '',
                    success: false,
                    error: error.message
                });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({
                    status: 0,
                    headers: {},
                    data: '',
                    success: false,
                    error: 'Request timeout'
                });
            });

            if (data && method !== 'GET') {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    async testBasicConnectivity() {
        console.log('1️⃣ Testing Basic Connectivity...');

        // Test if server responds
        const response = await this.makeHttpRequest(this.baseUrl + '/', 'GET');

        if (response.status === 0) {
            this.log('Server Connection', 'FAIL', `Cannot connect to server: ${response.error || 'Unknown error'}`);
            return false;
        } else if (response.status === 500) {
            this.log('Server Connection', 'FAIL', `Server returning 500 error - likely compilation issues`);
            return false;
        } else if (response.success) {
            this.log('Server Connection', 'PASS', `Server responding with ${response.status}`);
            return true;
        } else {
            this.log('Server Connection', 'WARN', `Server responding with ${response.status}`);
            return false;
        }
    }

    async testApiEndpoints() {
        console.log('\\n2️⃣ Testing API Endpoints...');

        const endpoints = [
            { path: '/api/health', name: 'Health Check', critical: true },
            { path: '/api/posts', name: 'Posts API', critical: true },
            { path: '/api/agents', name: 'Agents API', critical: true },
            { path: '/api/analytics', name: 'Analytics API', critical: false },
            { path: '/api/activity', name: 'Activity API', critical: false },
            { path: '/api/drafts', name: 'Drafts API', critical: false },
            { path: '/api/comments', name: 'Comments API', critical: false }
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await this.makeHttpRequest(this.apiUrl + endpoint.path);

                if (response.success) {
                    this.log(`API ${endpoint.name}`, 'PASS', `Status: ${response.status}`);
                } else if (response.status === 404) {
                    const severity = endpoint.critical ? 'FAIL' : 'WARN';
                    this.log(`API ${endpoint.name}`, severity, `Not found (404) - ${endpoint.critical ? 'Critical' : 'Optional'}`);
                } else if (response.status === 500) {
                    this.log(`API ${endpoint.name}`, 'FAIL', `Server error (500)`);
                } else {
                    this.log(`API ${endpoint.name}`, 'FAIL', `Status: ${response.status}, Error: ${response.error || 'Unknown'}`);
                }
            } catch (error) {
                this.log(`API ${endpoint.name}`, 'FAIL', `Request failed: ${error.message}`);
            }
        }
    }

    async testDataIntegrity() {
        console.log('\\n3️⃣ Testing Data Integrity...');

        // Test if database files exist
        const dbFiles = [
            '/workspaces/agent-feed/database.db',
            '/workspaces/agent-feed/agent-feed.db',
            '/workspaces/agent-feed/agent_database.db'
        ];

        let foundDb = false;
        for (const dbFile of dbFiles) {
            if (fs.existsSync(dbFile)) {
                this.log('Database Files', 'PASS', `Found database: ${path.basename(dbFile)}`);
                foundDb = true;
                break;
            }
        }

        if (!foundDb) {
            this.log('Database Files', 'FAIL', 'No database files found');
        }

        // Test basic data endpoints
        try {
            const postsResponse = await this.makeHttpRequest(this.apiUrl + '/posts');
            if (postsResponse.success) {
                try {
                    const postsData = JSON.parse(postsResponse.data);
                    this.log('Data Integrity', 'PASS', `Posts data valid - ${Array.isArray(postsData) ? postsData.length : 'object'} entries`);
                } catch (e) {
                    this.log('Data Integrity', 'WARN', 'Posts returned non-JSON data');
                }
            } else {
                this.log('Data Integrity', 'FAIL', 'Cannot retrieve posts data');
            }
        } catch (error) {
            this.log('Data Integrity', 'FAIL', `Data test failed: ${error.message}`);
        }
    }

    async testSettingsRemoval() {
        console.log('\\n4️⃣ Testing Settings Removal...');

        // Test that settings endpoints no longer exist
        const settingsEndpoints = [
            '/api/settings',
            '/api/user/settings',
            '/api/config/settings'
        ];

        for (const endpoint of settingsEndpoints) {
            const response = await this.makeHttpRequest(this.apiUrl + endpoint);

            if (response.status === 404) {
                this.log('Settings Removal', 'PASS', `${endpoint} properly removed (404)`);
            } else if (response.success) {
                this.log('Settings Removal', 'FAIL', `${endpoint} still exists and responds`);
            } else {
                this.log('Settings Removal', 'WARN', `${endpoint} status: ${response.status}`);
            }
        }

        // Check for settings references in key files
        const keyFiles = [
            '/workspaces/agent-feed/package.json',
            '/workspaces/agent-feed/frontend/package.json'
        ];

        for (const file of keyFiles) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                const settingsRefs = (content.match(/settings|Settings/g) || []).length;

                if (settingsRefs === 0) {
                    this.log('Settings Removal', 'PASS', `No settings references in ${path.basename(file)}`);
                } else {
                    this.log('Settings Removal', 'WARN', `${settingsRefs} settings references in ${path.basename(file)}`);
                }
            }
        }
    }

    async testErrorHandling() {
        console.log('\\n5️⃣ Testing Error Handling...');

        // Test 404 handling
        const response404 = await this.makeHttpRequest(this.baseUrl + '/nonexistent-page');
        if (response404.status === 404) {
            this.log('Error Handling', 'PASS', '404 errors handled properly');
        } else {
            this.log('Error Handling', 'WARN', `Unexpected status for 404 test: ${response404.status}`);
        }

        // Test malformed API requests
        const malformedResponse = await this.makeHttpRequest(this.apiUrl + '/posts', 'POST', 'invalid-json');
        if (malformedResponse.status >= 400 && malformedResponse.status < 500) {
            this.log('Error Handling', 'PASS', 'Malformed requests handled properly');
        } else {
            this.log('Error Handling', 'WARN', `Malformed request handling: ${malformedResponse.status}`);
        }
    }

    async testBackendServices() {
        console.log('\\n6️⃣ Testing Backend Services...');

        // Check if backend process is running
        try {
            const response = await this.makeHttpRequest('http://localhost:3001/api/health');
            if (response.success) {
                this.log('Backend Services', 'PASS', 'Secondary backend service running');
            } else {
                this.log('Backend Services', 'INFO', 'Secondary backend service not running (expected)');
            }
        } catch (error) {
            this.log('Backend Services', 'INFO', 'Secondary backend service not accessible');
        }

        // Test if essential files exist
        const essentialFiles = [
            '/workspaces/agent-feed/simple-backend.js',
            '/workspaces/agent-feed/backend/server.js',
            '/workspaces/agent-feed/backend/routes/index.js'
        ];

        for (const file of essentialFiles) {
            if (fs.existsSync(file)) {
                this.log('Backend Services', 'PASS', `Found: ${path.basename(file)}`);
            } else {
                this.log('Backend Services', 'INFO', `Not found: ${path.basename(file)}`);
            }
        }
    }

    async generateReport() {
        const endTime = Date.now();
        const duration = endTime - this.startTime;

        const summary = {
            testSuite: 'API Regression Test - Settings Removal',
            timestamp: new Date().toISOString(),
            duration: `${(duration / 1000).toFixed(2)}s`,
            totalTests: this.testResults.length,
            passed: this.testResults.filter(r => r.status === 'PASS').length,
            failed: this.testResults.filter(r => r.status === 'FAIL').length,
            warnings: this.testResults.filter(r => r.status === 'WARN').length,
            info: this.testResults.filter(r => r.status === 'INFO').length,
            failures: this.failures,
            results: this.testResults,

            recommendations: [
                'Fix server 500 errors - check compilation issues',
                'Verify all critical API endpoints are functional',
                'Complete removal of all Settings references',
                'Add proper error boundaries for frontend components',
                'Run TypeScript compilation to fix syntax errors',
                'Test individual routes manually once server is stable'
            ]
        };

        // Write detailed report
        const reportPath = '/workspaces/agent-feed/test-results/api-regression-report.json';
        await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.promises.writeFile(reportPath, JSON.stringify(summary, null, 2));

        // Console summary
        console.log('\\n' + '='.repeat(80));
        console.log('🎯 API REGRESSION TEST COMPLETE');
        console.log('='.repeat(80));
        console.log(`📊 Results: ${summary.passed}/${summary.totalTests} tests passed`);
        console.log(`⏱️  Duration: ${summary.duration}`);
        console.log(`❌ Failures: ${summary.failed}`);
        console.log(`⚠️  Warnings: ${summary.warnings}`);
        console.log(`ℹ️  Info: ${summary.info}`);

        if (summary.failures.length > 0) {
            console.log('\\n🚨 Critical Issues Found:');
            summary.failures.slice(0, 5).forEach(failure => console.log(`  - ${failure}`));
            if (summary.failures.length > 5) {
                console.log(`  ... and ${summary.failures.length - 5} more`);
            }
        }

        console.log(`\\n📄 Detailed report: ${reportPath}`);
        console.log('='.repeat(80));

        return summary;
    }

    async run() {
        console.log('🔥 API REGRESSION TEST SUITE - SETTINGS REMOVAL VALIDATION');
        console.log('📋 Testing Mode: API-focused, Real HTTP requests\\n');

        try {
            const serverRunning = await this.testBasicConnectivity();

            if (serverRunning) {
                await this.testApiEndpoints();
                await this.testDataIntegrity();
                await this.testErrorHandling();
            } else {
                console.log('⚠️  Server not running - skipping dependent tests');
            }

            await this.testSettingsRemoval();
            await this.testBackendServices();

            return await this.generateReport();

        } catch (error) {
            console.error('❌ API test suite failed:', error);
            this.log('Test Suite', 'FAIL', error.message);
            return await this.generateReport();
        }
    }
}

// Export for module use
module.exports = ApiRegressionTest;

// Run if called directly
if (require.main === module) {
    (async () => {
        const testSuite = new ApiRegressionTest();
        const results = await testSuite.run();
        process.exit(results.failed > 0 ? 1 : 0);
    })();
}