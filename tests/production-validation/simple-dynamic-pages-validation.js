#!/usr/bin/env node

/**
 * Simple Dynamic Pages Production Validation
 * Tests core functionality without complex browser automation
 */

const fetch = require('node-fetch').default || require('node-fetch');

const BACKEND_URL = 'http://127.0.0.1:3000';
const FRONTEND_URL = 'http://127.0.0.1:5173';
const AGENT_ID = 'personal-todos-agent';

class SimpleValidator {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${level}] ${message}`);
    }

    async test(name, testFn) {
        try {
            this.log(`🔍 Testing: ${name}`);
            const startTime = Date.now();
            const result = await testFn();
            const duration = Date.now() - startTime;
            
            this.results.push({
                name,
                status: 'PASS',
                duration,
                result
            });
            
            this.log(`✅ ${name}: PASS (${duration}ms)`);
            return result;
        } catch (error) {
            this.results.push({
                name,
                status: 'FAIL',
                error: error.message
            });
            
            this.log(`❌ ${name}: FAIL - ${error.message}`);
            throw error;
        }
    }

    async validateApiEndpoints() {
        this.log('🔍 Validating API Endpoints');
        
        // Test 1: Dynamic Pages API
        await this.test('GET /api/agents/personal-todos-agent/pages', async () => {
            const response = await fetch(`${BACKEND_URL}/api/agents/${AGENT_ID}/pages`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`);
            }
            
            if (!data.success) {
                throw new Error(`API Error: ${data.error || 'API returned success=false'}`);
            }
            
            const pages = data.data?.pages || [];
            this.log(`  📄 Found ${pages.length} dynamic pages`);
            
            if (pages.length > 0) {
                this.log(`  📋 Sample page: "${pages[0].title}"`);
                this.log(`  🔧 Page type: ${pages[0].page_type}`);
                this.log(`  📝 Content type: ${pages[0].content_type}`);
            }
            
            return { pageCount: pages.length, samplePage: pages[0] };
        });

        // Test 2: Agent List API
        await this.test('GET /api/agents', async () => {
            const response = await fetch(`${BACKEND_URL}/api/agents`);
            const data = await response.json();
            
            if (!response.ok || !data.success) {
                throw new Error(`Failed to get agents: ${data.error || 'API error'}`);
            }
            
            const targetAgent = data.agents.find(a => a.id === AGENT_ID);
            if (!targetAgent) {
                throw new Error(`Agent ${AGENT_ID} not found in agents list`);
            }
            
            this.log(`  👤 Target agent found: ${targetAgent.display_name || targetAgent.name}`);
            this.log(`  📊 Total agents: ${data.agents.length}`);
            
            return { agentCount: data.agents.length, targetAgent };
        });

        // Test 3: Health Check
        await this.test('GET /health', async () => {
            const response = await fetch(`${BACKEND_URL}/health`);
            const data = await response.json();
            
            if (!response.ok || data.status !== 'healthy') {
                throw new Error(`Health check failed: ${data.message || 'Unknown issue'}`);
            }
            
            this.log(`  💚 Server status: ${data.status}`);
            this.log(`  🔧 Services: ${Object.keys(data.services || {}).join(', ')}`);
            
            return data;
        });
    }

    async validateRealDataStructure() {
        this.log('📊 Validating Real Data Structure');
        
        await this.test('Dynamic Pages Data Structure', async () => {
            const response = await fetch(`${BACKEND_URL}/api/agents/${AGENT_ID}/pages`);
            const data = await response.json();
            
            if (!data.success || !data.data?.pages) {
                throw new Error('No pages data returned');
            }
            
            const pages = data.data.pages;
            if (pages.length === 0) {
                throw new Error('No dynamic pages found for validation');
            }
            
            const samplePage = pages[0];
            
            // Required fields validation
            const requiredFields = ['id', 'agent_id', 'title', 'page_type', 'content_type', 'content_value', 'status'];
            const missingFields = requiredFields.filter(field => !(field in samplePage));
            
            if (missingFields.length > 0) {
                throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
            }
            
            // Content validation
            if (samplePage.content_type === 'json') {
                try {
                    const contentObj = JSON.parse(samplePage.content_value);
                    this.log(`  📋 JSON content parsed successfully`);
                    this.log(`  🧩 Components: ${contentObj.components?.length || 0}`);
                } catch (e) {
                    throw new Error(`Invalid JSON content: ${e.message}`);
                }
            }
            
            // No mock data indicators
            const contentStr = JSON.stringify(samplePage).toLowerCase();
            const mockIndicators = ['mock', 'fake', 'test data', 'placeholder', 'lorem ipsum'];
            const foundMockIndicators = mockIndicators.filter(indicator => contentStr.includes(indicator));
            
            if (foundMockIndicators.length > 0) {
                this.log(`  ⚠️ Possible mock data indicators: ${foundMockIndicators.join(', ')}`);
            } else {
                this.log(`  ✅ No mock data indicators found - using real data`);
            }
            
            return {
                pageCount: pages.length,
                hasRequiredFields: missingFields.length === 0,
                contentType: samplePage.content_type,
                noMockData: foundMockIndicators.length === 0
            };
        });
    }

    async validateErrorHandling() {
        this.log('⚠️ Validating Error Handling');
        
        await this.test('Invalid Agent ID', async () => {
            const response = await fetch(`${BACKEND_URL}/api/agents/nonexistent-agent/pages`);
            
            // Should return 404 or proper error response
            if (response.status === 404) {
                this.log(`  ✅ Correctly returns 404 for invalid agent`);
                return { errorHandling: 'correct' };
            }
            
            const data = await response.json();
            if (!data.success && data.error) {
                this.log(`  ✅ Returns proper error: ${data.error}`);
                return { errorHandling: 'correct' };
            }
            
            throw new Error(`Expected error response, got: ${response.status}`);
        });
    }

    async validatePerformance() {
        this.log('⚡ Validating Performance');
        
        await this.test('API Response Time', async () => {
            const iterations = 3;
            const times = [];
            
            for (let i = 0; i < iterations; i++) {
                const start = Date.now();
                const response = await fetch(`${BACKEND_URL}/api/agents/${AGENT_ID}/pages`);
                const duration = Date.now() - start;
                times.push(duration);
                
                if (!response.ok) {
                    throw new Error(`Request ${i+1} failed: ${response.status}`);
                }
            }
            
            const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
            const maxTime = Math.max(...times);
            
            this.log(`  📊 Average response time: ${avgTime.toFixed(1)}ms`);
            this.log(`  📊 Max response time: ${maxTime}ms`);
            
            if (avgTime > 2000) {
                throw new Error(`Average response time too slow: ${avgTime.toFixed(1)}ms > 2000ms`);
            }
            
            return { avgTime, maxTime, times };
        });
    }

    async validateFrontendConnectivity() {
        this.log('🌐 Validating Frontend Connectivity');
        
        await this.test('Frontend Server Accessible', async () => {
            const response = await fetch(`${FRONTEND_URL}/`);
            
            if (!response.ok) {
                throw new Error(`Frontend not accessible: ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('text/html')) {
                throw new Error(`Expected HTML response, got: ${contentType}`);
            }
            
            this.log(`  ✅ Frontend server responding`);
            this.log(`  📄 Content-Type: ${contentType}`);
            
            return { accessible: true, contentType };
        });
    }

    generateReport() {
        const totalDuration = Date.now() - this.startTime;
        const passedTests = this.results.filter(r => r.status === 'PASS').length;
        const failedTests = this.results.filter(r => r.status === 'FAIL').length;
        const totalTests = this.results.length;
        
        const report = {
            timestamp: new Date().toISOString(),
            duration: `${(totalDuration / 1000).toFixed(2)}s`,
            summary: {
                total: totalTests,
                passed: passedTests,
                failed: failedTests,
                success_rate: `${((passedTests / totalTests) * 100).toFixed(1)}%`
            },
            overall_status: failedTests === 0 ? 'PASS' : 'FAIL',
            tests: this.results
        };
        
        this.log('');
        this.log('📊 === VALIDATION REPORT ===');
        this.log(`⏱️ Duration: ${report.duration}`);
        this.log(`✅ Passed: ${passedTests}/${totalTests}`);
        this.log(`❌ Failed: ${failedTests}/${totalTests}`);
        this.log(`📈 Success Rate: ${report.summary.success_rate}`);
        this.log(`🎯 Overall Status: ${report.overall_status}`);
        
        return report;
    }

    async run() {
        try {
            this.log('🚀 Starting Simple Dynamic Pages Validation');
            this.log(`📍 Backend: ${BACKEND_URL}`);
            this.log(`📍 Frontend: ${FRONTEND_URL}`);
            this.log(`👤 Agent: ${AGENT_ID}`);
            this.log('');
            
            await this.validateApiEndpoints();
            await this.validateRealDataStructure();
            await this.validateErrorHandling();
            await this.validatePerformance();
            await this.validateFrontendConnectivity();
            
            const report = this.generateReport();
            
            if (report.overall_status === 'FAIL') {
                this.log('💥 Validation FAILED - see errors above');
                process.exit(1);
            } else {
                this.log('🎉 Validation PASSED - all tests successful!');
            }
            
            return report;
            
        } catch (error) {
            this.log(`💥 Validation crashed: ${error.message}`, 'ERROR');
            process.exit(1);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const validator = new SimpleValidator();
    validator.run();
}

module.exports = SimpleValidator;