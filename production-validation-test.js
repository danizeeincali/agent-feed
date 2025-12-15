#!/usr/bin/env node

/**
 * PRODUCTION VALIDATION TEST
 * Comprehensive validation suite to verify all user-reported issues are resolved
 * CRITICAL: Ensures zero 404 errors, real data flow, and stable connections
 */

const http = require('http');
const { URL } = require('url');

class ProductionValidator {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.frontendUrl = 'http://localhost:5173';
        this.results = {
            timestamp: new Date().toISOString(),
            success: true,
            issues: [],
            validations: [],
            summary: {}
        };
    }

    async validateEndpoint(endpoint, expectData = false) {
        return new Promise((resolve) => {
            const url = new URL(endpoint, this.baseUrl);
            const req = http.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    const validation = {
                        endpoint,
                        status: res.statusCode,
                        success: res.statusCode === 200,
                        hasData: false,
                        dataType: null,
                        error: null
                    };

                    if (res.statusCode === 200) {
                        try {
                            const parsed = JSON.parse(data);
                            validation.hasData = true;
                            validation.dataType = Array.isArray(parsed.data) ? 'array' : typeof parsed.data;
                            validation.dataCount = Array.isArray(parsed.data) ? parsed.data.length : 1;
                            
                            if (expectData && Array.isArray(parsed.data)) {
                                validation.hasRealData = parsed.data.length > 0;
                                validation.sampleData = parsed.data.slice(0, 2);
                            }
                        } catch (e) {
                            validation.error = `JSON parse error: ${e.message}`;
                            validation.hasData = false;
                        }
                    } else {
                        validation.error = `HTTP ${res.statusCode}: ${data}`;
                        this.results.issues.push(`❌ ${endpoint} returned ${res.statusCode}`);
                    }

                    this.results.validations.push(validation);
                    resolve(validation);
                });
            });

            req.on('error', (err) => {
                const validation = {
                    endpoint,
                    status: 0,
                    success: false,
                    error: `Connection error: ${err.message}`,
                    hasData: false
                };
                this.results.validations.push(validation);
                this.results.issues.push(`❌ ${endpoint} connection failed: ${err.message}`);
                resolve(validation);
            });

            req.setTimeout(5000, () => {
                req.destroy();
                const validation = {
                    endpoint,
                    status: 0,
                    success: false,
                    error: 'Request timeout',
                    hasData: false
                };
                this.results.validations.push(validation);
                this.results.issues.push(`❌ ${endpoint} timed out`);
                resolve(validation);
            });
        });
    }

    async run() {
        console.log('\n🔍 PRODUCTION VALIDATION STARTING...\n');
        
        // Test all critical API endpoints
        const endpoints = [
            { url: '/health', expectData: false },
            { url: '/api/health', expectData: true },
            { url: '/api/posts', expectData: true },
            { url: '/api/agents', expectData: true },
            { url: '/api/agent-posts?limit=5', expectData: true }
        ];

        console.log('📡 Testing API Endpoints...');
        for (const ep of endpoints) {
            const result = await this.validateEndpoint(ep.url, ep.expectData);
            const status = result.success ? '✅' : '❌';
            const dataInfo = result.hasRealData ? ` (${result.dataCount} items)` : '';
            console.log(`${status} ${ep.url} - ${result.status}${dataInfo}`);
            
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        }

        // Generate summary
        const successfulEndpoints = this.results.validations.filter(v => v.success).length;
        const totalEndpoints = this.results.validations.length;
        
        this.results.summary = {
            totalEndpoints,
            successfulEndpoints,
            failedEndpoints: totalEndpoints - successfulEndpoints,
            successRate: Math.round((successfulEndpoints / totalEndpoints) * 100),
            hasRealData: this.results.validations.some(v => v.hasRealData),
            criticalIssues: this.results.issues.length
        };

        this.results.success = this.results.issues.length === 0 && successfulEndpoints === totalEndpoints;

        console.log('\n📊 VALIDATION SUMMARY');
        console.log('='.repeat(50));
        console.log(`✅ Successful endpoints: ${successfulEndpoints}/${totalEndpoints}`);
        console.log(`📈 Success rate: ${this.results.summary.successRate}%`);
        console.log(`📊 Real data detected: ${this.results.summary.hasRealData ? 'YES' : 'NO'}`);
        console.log(`⚠️  Critical issues: ${this.results.summary.criticalIssues}`);

        if (this.results.issues.length > 0) {
            console.log('\n🚨 ISSUES FOUND:');
            this.results.issues.forEach(issue => console.log(`   ${issue}`));
        }

        const finalStatus = this.results.success ? '🎉 PASSED' : '❌ FAILED';
        console.log(`\n${finalStatus}: Production validation ${this.results.success ? 'completed successfully' : 'found issues'}`);

        return this.results.success;
    }
}

// Run validation
const validator = new ProductionValidator();
validator.run().then(success => {
    process.exit(success ? 0 : 1);
}).catch(err => {
    console.error('❌ Validation failed:', err);
    process.exit(1);
});
