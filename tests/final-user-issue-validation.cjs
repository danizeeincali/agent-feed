#!/usr/bin/env node

/**
 * FINAL COMPREHENSIVE VALIDATION SCRIPT
 * Testing User-Reported Issues: Disconnected Errors, 404s, API Connection Failed
 */

const { chromium } = require('playwright');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ComprehensiveValidator {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            userIssues: {
                disconnected: false,
                http404: false,
                apiConnectionFailed: false
            },
            routes: {},
            api: {},
            connections: {},
            mockData: [],
            errors: [],
            summary: {}
        };
        this.browser = null;
        this.page = null;
    }

    async initialize() {
        console.log('🚀 Initializing Comprehensive Validation...');
        this.browser = await chromium.launch({ headless: true });
        this.page = await this.browser.newPage();
        
        // Capture console logs and errors
        this.page.on('console', msg => {
            console.log(`BROWSER LOG [${msg.type()}]:`, msg.text());
            if (msg.type() === 'error') {
                this.results.errors.push({
                    type: 'console_error',
                    message: msg.text(),
                    timestamp: new Date().toISOString()
                });
            }
        });

        this.page.on('requestfailed', request => {
            console.log(`REQUEST FAILED: ${request.url()} - ${request.failure().errorText}`);
            this.results.errors.push({
                type: 'request_failed',
                url: request.url(),
                error: request.failure().errorText,
                timestamp: new Date().toISOString()
            });
        });
    }

    async validateServers() {
        console.log('\n🔍 Step 1: Server Connectivity Validation');
        
        try {
            // Test Backend
            const backendResponse = await axios.get('http://localhost:3000/api/agents', { timeout: 5000 });
            this.results.api.backend = {
                status: 'connected',
                statusCode: backendResponse.status,
                dataType: Array.isArray(backendResponse.data) ? 'array' : typeof backendResponse.data,
                recordCount: Array.isArray(backendResponse.data) ? backendResponse.data.length : 0,
                isMock: this.detectMockData(backendResponse.data)
            };
            console.log(`✅ Backend API: ${backendResponse.status} - ${this.results.api.backend.recordCount} agents`);
            
        } catch (error) {
            this.results.api.backend = {
                status: 'failed',
                error: error.message,
                code: error.code
            };
            this.results.userIssues.apiConnectionFailed = true;
            console.log(`❌ Backend API Failed: ${error.message}`);
        }

        try {
            // Test Frontend
            const frontendResponse = await axios.get('http://localhost:5173', { timeout: 5000 });
            this.results.api.frontend = {
                status: 'connected',
                statusCode: frontendResponse.status,
                containsVite: frontendResponse.data.includes('vite'),
                containsReact: frontendResponse.data.includes('react')
            };
            console.log(`✅ Frontend Server: ${frontendResponse.status}`);
            
        } catch (error) {
            this.results.api.frontend = {
                status: 'failed',
                error: error.message
            };
            console.log(`❌ Frontend Server Failed: ${error.message}`);
        }
    }

    async validateRoutes() {
        console.log('\n🛣️ Step 2: Route Navigation Validation');
        
        // Test Home Route
        await this.testRoute('/', 'home');
        
        // Test Agents Route  
        await this.testRoute('/agents', 'agents');
    }

    async testRoute(route, routeName) {
        try {
            console.log(`Testing route: ${route}`);
            
            const response = await this.page.goto(`http://localhost:5173${route}`, {
                waitUntil: 'networkidle',
                timeout: 10000
            });
            
            const title = await this.page.title();
            const url = this.page.url();
            const hasContent = await this.page.locator('body').count() > 0;
            
            // Check for specific error indicators
            const hasDisconnectedError = await this.page.locator('text=Disconnected').count() > 0;
            const has404Error = await this.page.locator('text=404').count() > 0 || 
                               await this.page.locator('text=Not Found').count() > 0;
            const hasApiError = await this.page.locator('text=API connection failed').count() > 0;
            
            if (hasDisconnectedError) this.results.userIssues.disconnected = true;
            if (has404Error) this.results.userIssues.http404 = true;
            if (hasApiError) this.results.userIssues.apiConnectionFailed = true;
            
            this.results.routes[routeName] = {
                status: response?.status() || 'unknown',
                accessible: response?.ok() || false,
                title,
                finalUrl: url,
                hasContent,
                errors: {
                    disconnected: hasDisconnectedError,
                    http404: has404Error,
                    apiConnectionFailed: hasApiError
                }
            };
            
            console.log(`${response?.ok() ? '✅' : '❌'} Route ${route}: ${response?.status()} - ${title}`);
            
            // Wait for potential API calls
            await this.page.waitForTimeout(2000);
            
        } catch (error) {
            this.results.routes[routeName] = {
                status: 'failed',
                error: error.message,
                accessible: false
            };
            console.log(`❌ Route ${route} failed: ${error.message}`);
        }
    }

    async validateAPIEndpoints() {
        console.log('\n🔌 Step 3: API Endpoints Validation');
        
        const endpoints = [
            '/api/agents',
            '/api/posts',
            '/api/health'
        ];
        
        for (const endpoint of endpoints) {
            await this.testAPIEndpoint(endpoint);
        }
    }

    async testAPIEndpoint(endpoint) {
        try {
            const response = await axios.get(`http://localhost:3000${endpoint}`, { timeout: 5000 });
            
            this.results.api[endpoint] = {
                status: 'success',
                statusCode: response.status,
                dataType: typeof response.data,
                hasData: Boolean(response.data),
                isMock: this.detectMockData(response.data)
            };
            
            console.log(`✅ API ${endpoint}: ${response.status}`);
            
        } catch (error) {
            this.results.api[endpoint] = {
                status: 'failed',
                statusCode: error.response?.status || 'no_response',
                error: error.message
            };
            
            if (error.response?.status === 404) {
                this.results.userIssues.http404 = true;
            }
            
            console.log(`❌ API ${endpoint}: ${error.response?.status || 'FAILED'} - ${error.message}`);
        }
    }

    async validateConnections() {
        console.log('\n🌐 Step 4: Real-time Connections Validation');
        
        // Navigate to agents page and monitor network
        try {
            await this.page.goto('http://localhost:5173/agents');
            
            // Monitor network requests
            const requests = [];
            this.page.on('request', request => {
                requests.push({
                    url: request.url(),
                    method: request.method(),
                    timestamp: Date.now()
                });
            });
            
            // Wait for potential SSE/WebSocket connections
            await this.page.waitForTimeout(5000);
            
            // Check for WebSocket connections
            const wsConnections = await this.page.evaluate(() => {
                return window.WebSocket ? 'websocket_available' : 'no_websocket';
            });
            
            this.results.connections = {
                websocketSupport: wsConnections,
                networkRequests: requests.filter(r => r.url.includes('localhost')),
                totalRequests: requests.length
            };
            
            console.log(`✅ Connection monitoring: ${requests.length} requests captured`);
            
        } catch (error) {
            this.results.connections = {
                status: 'failed',
                error: error.message
            };
            console.log(`❌ Connection validation failed: ${error.message}`);
        }
    }

    async validateAgentsPage() {
        console.log('\n👥 Step 5: Agents Page Specific Validation');
        
        try {
            await this.page.goto('http://localhost:5173/agents');
            await this.page.waitForSelector('body', { timeout: 5000 });
            
            // Check for agent-specific content
            const agentElements = await this.page.locator('[data-testid*="agent"], [class*="agent"], .agent-card, .agent-item').count();
            const hasAgentsList = await this.page.locator('text=Agent').count() > 0;
            const hasLoadingState = await this.page.locator('text=Loading').count() > 0;
            const hasErrorState = await this.page.locator('text=Error').count() > 0;
            
            // Check for specific error messages user reported
            const errorMessages = await this.page.evaluate(() => {
                return Array.from(document.querySelectorAll('*')).map(el => el.textContent).join(' ');
            });
            
            const hasDisconnected = errorMessages.includes('Disconnected');
            const has404 = errorMessages.includes('404') || errorMessages.includes('Not Found');
            const hasAPIFailed = errorMessages.includes('API connection failed');
            
            this.results.routes.agentsSpecific = {
                agentElements,
                hasAgentsList,
                hasLoadingState,
                hasErrorState,
                userReportedErrors: {
                    disconnected: hasDisconnected,
                    http404: has404,
                    apiConnectionFailed: hasAPIFailed
                }
            };
            
            console.log(`✅ Agents page analysis: ${agentElements} agent elements found`);
            
        } catch (error) {
            this.results.routes.agentsSpecific = {
                status: 'failed',
                error: error.message
            };
            console.log(`❌ Agents page validation failed: ${error.message}`);
        }
    }

    detectMockData(data) {
        if (!data) return false;
        
        const dataStr = JSON.stringify(data).toLowerCase();
        const mockIndicators = ['mock', 'test', 'sample', 'dummy', 'fake', 'placeholder'];
        
        return mockIndicators.some(indicator => dataStr.includes(indicator));
    }

    async generateReport() {
        console.log('\n📊 Step 6: Generating Validation Report');
        
        // Calculate summary
        this.results.summary = {
            userIssuesFound: Object.values(this.results.userIssues).some(issue => issue === true),
            routesAccessible: Object.values(this.results.routes).every(route => route.accessible !== false),
            apiEndpointsWorking: Object.values(this.results.api).every(api => api.status !== 'failed'),
            totalErrors: this.results.errors.length,
            recommendation: 'NEEDS_INVESTIGATION'
        };
        
        // Set overall status
        if (this.results.summary.userIssuesFound) {
            this.results.summary.status = 'USER_ISSUES_CONFIRMED';
        } else if (!this.results.summary.routesAccessible || !this.results.summary.apiEndpointsWorking) {
            this.results.summary.status = 'SYSTEM_ISSUES_FOUND';
        } else {
            this.results.summary.status = 'ALL_SYSTEMS_OPERATIONAL';
        }
        
        const reportPath = '/workspaces/agent-feed/tests/final-user-issue-validation-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        
        console.log(`\n📋 Full validation report saved: ${reportPath}`);
        return reportPath;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async run() {
        try {
            await this.initialize();
            await this.validateServers();
            await this.validateRoutes();
            await this.validateAPIEndpoints();
            await this.validateConnections();
            await this.validateAgentsPage();
            const reportPath = await this.generateReport();
            
            console.log('\n🎯 VALIDATION SUMMARY:');
            console.log(`Status: ${this.results.summary.status}`);
            console.log(`User Issues Found: ${this.results.summary.userIssuesFound}`);
            console.log(`Routes Accessible: ${this.results.summary.routesAccessible}`);
            console.log(`APIs Working: ${this.results.summary.apiEndpointsWorking}`);
            console.log(`Total Errors: ${this.results.summary.totalErrors}`);
            
            return this.results;
            
        } catch (error) {
            console.error('❌ Validation failed:', error);
            this.results.summary = {
                status: 'VALIDATION_FAILED',
                error: error.message
            };
        } finally {
            await this.cleanup();
        }
    }
}

// Execute validation
if (require.main === module) {
    const validator = new ComprehensiveValidator();
    validator.run().then(results => {
        process.exit(results.summary.userIssuesFound ? 1 : 0);
    }).catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = ComprehensiveValidator;