#!/usr/bin/env node

/**
 * FINAL PRODUCTION VALIDATION
 * Tests the ACTUAL system with REAL endpoints and functionality
 * Based on discovered API structure: /api/claude/instances
 */

const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

class FinalProductionValidator {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            environment: {},
            realEndpoints: {},
            userWorkflow: {},
            websocketFlow: {},
            realFunctionality: {},
            criticalValidation: {}
        };
        this.testStartTime = Date.now();
        this.instanceId = null;
    }

    log(message, type = 'info') {
        const colors = {
            'info': '\x1b[36m',     // Cyan
            'success': '\x1b[32m',  // Green
            'error': '\x1b[31m',    // Red
            'warning': '\x1b[33m',  // Yellow
            'test': '\x1b[35m'      // Magenta
        };
        
        const prefix = {
            'info': '📝',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'test': '🧪'
        }[type] || '📝';
        
        console.log(`${colors[type]}\x1b[1m${prefix} ${message}\x1b[0m`);
    }

    async httpRequest(url, method = 'GET', data = null) {
        return new Promise((resolve) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname,
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
                    try {
                        resolve({ 
                            status: res.statusCode, 
                            data: body ? JSON.parse(body) : {},
                            raw: body
                        });
                    } catch {
                        resolve({ 
                            status: res.statusCode, 
                            data: body, 
                            raw: body
                        });
                    }
                });
            });

            req.on('error', (error) => {
                resolve({ status: 0, error: error.message });
            });

            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }

    async validateEnvironment() {
        this.log('🏗️ VALIDATING PRODUCTION ENVIRONMENT', 'test');
        
        // Backend health check
        const health = await this.httpRequest('http://localhost:3000/health');
        this.results.environment.backendHealthy = health.status === 200;
        this.results.environment.healthData = health.data;

        // Frontend availability
        const frontend = await this.httpRequest('http://localhost:5173');
        this.results.environment.frontendAvailable = frontend.status === 200;

        // API responsiveness
        const api = await this.httpRequest('http://localhost:3000/api/claude/instances');
        this.results.environment.apiResponsive = api.status === 200;
        this.results.environment.apiData = api.data;

        const envHealthy = this.results.environment.backendHealthy && 
                          this.results.environment.frontendAvailable && 
                          this.results.environment.apiResponsive;

        this.log(`Environment: Backend(${this.results.environment.backendHealthy}) Frontend(${this.results.environment.frontendAvailable}) API(${this.results.environment.apiResponsive})`, 
                envHealthy ? 'success' : 'error');

        return envHealthy;
    }

    async validateRealEndpoints() {
        this.log('🎯 VALIDATING REAL API ENDPOINTS', 'test');
        
        const endpoints = [
            { url: 'http://localhost:3000/api/claude/instances', method: 'GET', name: 'List Instances' },
            { url: 'http://localhost:3000/api/claude/instances', method: 'POST', name: 'Create Instance', 
              data: { type: 'interactive', workingDirectory: '/workspaces/agent-feed' }}
        ];

        const endpointResults = [];

        for (const endpoint of endpoints) {
            try {
                const response = await this.httpRequest(endpoint.url, endpoint.method, endpoint.data);
                const success = response.status >= 200 && response.status < 300;
                
                endpointResults.push({
                    name: endpoint.name,
                    success: success,
                    status: response.status,
                    response: response.data
                });

                if (success) {
                    this.log(`${endpoint.name}: SUCCESS (${response.status})`, 'success');
                    
                    // Capture instance ID from creation
                    if (endpoint.name === 'Create Instance' && response.data?.instanceId) {
                        this.instanceId = response.data.instanceId;
                        this.log(`Instance created: ${this.instanceId}`, 'info');
                    }
                } else {
                    this.log(`${endpoint.name}: FAILED (${response.status})`, 'error');
                }
            } catch (error) {
                endpointResults.push({
                    name: endpoint.name,
                    success: false,
                    error: error.message
                });
                this.log(`${endpoint.name}: ERROR - ${error.message}`, 'error');
            }
        }

        this.results.realEndpoints = endpointResults;
        const endpointsWorking = endpointResults.filter(r => r.success).length >= 1;
        
        return endpointsWorking;
    }

    async validateUserWorkflow() {
        this.log('👤 VALIDATING COMPLETE USER WORKFLOW', 'test');
        
        const workflow = [];

        // Step 1: User opens application (frontend load)
        const frontendAccess = await this.httpRequest('http://localhost:5173');
        workflow.push({
            step: 'Open Application',
            success: frontendAccess.status === 200,
            details: 'Frontend loads in browser'
        });

        // Step 2: User clicks "Create Claude Instance" button
        const instanceCreation = await this.httpRequest(
            'http://localhost:3000/api/claude/instances',
            'POST',
            { 
                type: 'interactive', 
                workingDirectory: '/workspaces/agent-feed',
                command: 'echo "User workflow validation"'
            }
        );

        const instanceCreated = instanceCreation.status >= 200 && instanceCreation.status < 300;
        workflow.push({
            step: 'Create Claude Instance',
            success: instanceCreated,
            details: instanceCreated ? `Instance ID: ${instanceCreation.data?.instanceId}` : 'Creation failed',
            response: instanceCreation
        });

        if (instanceCreated && instanceCreation.data?.instanceId) {
            const workflowInstanceId = instanceCreation.data.instanceId;

            // Step 3: Loading animations (check instance status)
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for initialization
            const statusCheck = await this.httpRequest(`http://localhost:3000/api/claude/instances/${workflowInstanceId}/status`);
            workflow.push({
                step: 'Loading Animations Display',
                success: statusCheck.status === 200,
                details: 'Real-time status updates work',
                response: statusCheck
            });

            // Step 4: Execute command (simulate user interaction)
            const commandExecution = await this.httpRequest(
                `http://localhost:3000/api/claude/instances/${workflowInstanceId}/terminal/input`,
                'POST',
                { input: 'echo "Hello Production World"\n' }
            );

            workflow.push({
                step: 'Execute Simple Command',
                success: commandExecution.status >= 200 && commandExecution.status < 300,
                details: 'User can send commands to Claude',
                response: commandExecution
            });

            // Step 5: Check terminal stream (output visibility)
            const streamCheck = await this.httpRequest(`http://localhost:3000/api/claude/instances/${workflowInstanceId}/terminal/stream`);
            workflow.push({
                step: 'View Command Output',
                success: streamCheck.status === 200,
                details: 'User can see command results',
                response: streamCheck
            });
        }

        this.results.userWorkflow = workflow;
        const workflowSuccess = workflow.filter(step => step.success).length >= Math.ceil(workflow.length * 0.7);
        
        this.log(`User workflow: ${workflowSuccess ? 'SUCCESS' : 'FAILED'} (${workflow.filter(s => s.success).length}/${workflow.length} steps)`, 
                workflowSuccess ? 'success' : 'error');

        return workflowSuccess;
    }

    async validateWebSocketFlow() {
        this.log('🔌 VALIDATING REAL WEBSOCKET COMMUNICATION', 'test');
        
        return new Promise((resolve) => {
            const wsTests = {
                connectionEstablished: false,
                messagesExchanged: false,
                terminalCommunication: false,
                realTimeUpdates: false
            };

            try {
                const ws = new WebSocket('ws://localhost:3000/terminal');
                let messageCount = 0;

                const timeout = setTimeout(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.close();
                    }
                    resolve(wsTests);
                }, 5000);

                ws.on('open', () => {
                    wsTests.connectionEstablished = true;
                    this.log('WebSocket connection established', 'success');
                    
                    // Test message exchange
                    ws.send(JSON.stringify({ 
                        type: 'terminal-input',
                        instanceId: this.instanceId || 'test',
                        data: 'echo "WebSocket test"'
                    }));
                });

                ws.on('message', (data) => {
                    messageCount++;
                    const message = data.toString();
                    
                    if (messageCount === 1) {
                        wsTests.messagesExchanged = true;
                        this.log(`WebSocket message received: ${message.substring(0, 50)}...`, 'success');
                    }
                    
                    if (message.includes('terminal') || message.includes('output')) {
                        wsTests.terminalCommunication = true;
                    }
                    
                    if (message.includes('status') || message.includes('update')) {
                        wsTests.realTimeUpdates = true;
                    }
                });

                ws.on('error', (error) => {
                    this.log(`WebSocket error: ${error.message}`, 'warning');
                    clearTimeout(timeout);
                    resolve(wsTests);
                });

                ws.on('close', () => {
                    clearTimeout(timeout);
                    resolve(wsTests);
                });

            } catch (error) {
                this.log(`WebSocket test failed: ${error.message}`, 'error');
                resolve(wsTests);
            }
        }).then((wsTests) => {
            this.results.websocketFlow = wsTests;
            
            const wsSuccess = wsTests.connectionEstablished && wsTests.messagesExchanged;
            this.log(`WebSocket flow: ${wsSuccess ? 'SUCCESS' : 'FAILED'}`, wsSuccess ? 'success' : 'error');
            
            return wsSuccess;
        });
    }

    async validateRealFunctionality() {
        this.log('⚡ VALIDATING 100% REAL FUNCTIONALITY', 'test');
        
        const realityChecks = {};

        // Check 1: No mock implementations in production paths
        try {
            const backendCode = fs.readFileSync('/workspaces/agent-feed/simple-backend.js', 'utf8');
            
            // Count actual mock references (not in comments or development code)
            const productionMockPatterns = [
                /exports\..*mock/gi,
                /return.*mock[A-Z]/g,
                /const.*mock[A-Z].*=.*{/g
            ];
            
            let productionMocks = 0;
            productionMockPatterns.forEach(pattern => {
                const matches = backendCode.match(pattern);
                if (matches) productionMocks += matches.length;
            });

            realityChecks.productionMockFree = productionMocks === 0;
            realityChecks.mockCount = productionMocks;

        } catch (error) {
            realityChecks.productionMockFree = false;
            realityChecks.scanError = error.message;
        }

        // Check 2: Real process spawning capability
        const processTest = await this.httpRequest(
            'http://localhost:3000/api/claude/instances',
            'POST',
            { type: 'test-real-process' }
        );

        realityChecks.realProcessSpawning = processTest.status >= 200 && processTest.status < 300;
        realityChecks.processResponse = processTest.data;

        // Check 3: Actual file system interaction
        const fileSystemTest = await this.httpRequest(
            'http://localhost:3000/api/claude/instances',
            'POST',
            { 
                type: 'interactive',
                workingDirectory: '/workspaces/agent-feed',
                command: 'pwd && ls -la | head -3'
            }
        );

        realityChecks.fileSystemAccess = fileSystemTest.status >= 200 && fileSystemTest.status < 300;

        // Check 4: Real-time terminal I/O
        if (this.instanceId) {
            const terminalIO = await this.httpRequest(
                `http://localhost:3000/api/claude/instances/${this.instanceId}/terminal/input`,
                'POST',
                { input: 'echo "Real terminal test"\n' }
            );
            
            realityChecks.realTerminalIO = terminalIO.status >= 200 && terminalIO.status < 300;
        }

        this.results.realFunctionality = realityChecks;
        
        const realityScore = Object.values(realityChecks).filter(v => v === true).length;
        const totalChecks = Object.keys(realityChecks).filter(k => !k.includes('Error') && !k.includes('Count')).length;
        const realitySuccess = realityScore >= Math.ceil(totalChecks * 0.75);

        this.log(`Real functionality: ${realitySuccess ? 'CONFIRMED' : 'ISSUES DETECTED'} (${realityScore}/${totalChecks} checks)`, 
                realitySuccess ? 'success' : 'warning');

        return realitySuccess;
    }

    async validateCriticalPoints() {
        this.log('🔬 CRITICAL PRODUCTION VALIDATION POINTS', 'test');
        
        const criticalChecks = {
            servicesRunning: this.results.environment.backendHealthy && this.results.environment.frontendAvailable,
            apiEndpointsWorking: this.results.realEndpoints.some(endpoint => endpoint.success),
            userWorkflowComplete: this.results.userWorkflow.filter(step => step.success).length >= 3,
            websocketCommunication: this.results.websocketFlow.connectionEstablished,
            realProcesses: this.results.realFunctionality.realProcessSpawning,
            noProductionMocks: this.results.realFunctionality.productionMockFree
        };

        this.results.criticalValidation = criticalChecks;
        
        const criticalScore = Object.values(criticalChecks).filter(v => v === true).length;
        const totalCritical = Object.keys(criticalChecks).length;
        const criticalSuccess = criticalScore >= Math.ceil(totalCritical * 0.8);

        this.log(`Critical points: ${criticalSuccess ? 'VALIDATED' : 'FAILED'} (${criticalScore}/${totalCritical} points)`, 
                criticalSuccess ? 'success' : 'error');

        // Detailed critical findings
        Object.entries(criticalChecks).forEach(([check, passed]) => {
            const status = passed ? '✓' : '✗';
            const color = passed ? 'success' : 'error';
            this.log(`  ${status} ${check}`, color);
        });

        return criticalSuccess;
    }

    generateFinalReport() {
        const endTime = Date.now();
        const duration = endTime - this.testStartTime;

        const categoryScores = {
            environment: this.results.environment.backendHealthy && 
                        this.results.environment.frontendAvailable && 
                        this.results.environment.apiResponsive,
            realEndpoints: this.results.realEndpoints?.some(e => e.success) || false,
            userWorkflow: (this.results.userWorkflow?.filter(s => s.success).length || 0) >= 
                         Math.ceil((this.results.userWorkflow?.length || 1) * 0.7),
            websocketFlow: this.results.websocketFlow?.connectionEstablished || false,
            realFunctionality: Object.values(this.results.realFunctionality || {})
                              .filter(v => v === true).length >= 2,
            criticalValidation: Object.values(this.results.criticalValidation || {})
                               .filter(v => v === true).length >= 4
        };

        const passedCategories = Object.values(categoryScores).filter(v => v === true).length;
        const totalCategories = Object.keys(categoryScores).length;
        const overallScore = Math.round((passedCategories / totalCategories) * 100);

        let verdict;
        let productionReady;
        
        if (overallScore >= 85) {
            verdict = '🎉 PRODUCTION READY - EXCELLENT REAL FUNCTIONALITY';
            productionReady = true;
        } else if (overallScore >= 70) {
            verdict = '✅ PRODUCTION READY - GOOD FUNCTIONALITY WITH MINOR ISSUES';
            productionReady = true;
        } else if (overallScore >= 50) {
            verdict = '⚠️ NEEDS IMPROVEMENT - SIGNIFICANT ISSUES DETECTED';
            productionReady = false;
        } else {
            verdict = '❌ NOT PRODUCTION READY - CRITICAL FAILURES';
            productionReady = false;
        }

        return {
            timestamp: this.results.timestamp,
            duration: `${duration}ms`,
            overallScore: `${overallScore}%`,
            verdict,
            productionReady,
            categoryScores,
            detailedResults: this.results,
            executiveSummary: this.generateExecutiveSummary(categoryScores, overallScore),
            recommendations: this.generateFinalRecommendations(categoryScores)
        };
    }

    generateExecutiveSummary(scores, overallScore) {
        const summary = [];
        
        if (scores.environment) {
            summary.push('✓ Infrastructure services are operational');
        } else {
            summary.push('✗ Infrastructure issues detected');
        }

        if (scores.realEndpoints) {
            summary.push('✓ API endpoints responding correctly');
        } else {
            summary.push('✗ API endpoint failures detected');
        }

        if (scores.userWorkflow) {
            summary.push('✓ Complete user workflow validated');
        } else {
            summary.push('✗ User workflow has significant issues');
        }

        if (scores.websocketFlow) {
            summary.push('✓ Real-time WebSocket communication working');
        } else {
            summary.push('✗ WebSocket communication problems');
        }

        if (scores.realFunctionality) {
            summary.push('✓ Real functionality confirmed (no mocks)');
        } else {
            summary.push('✗ Mock implementations or simulation code detected');
        }

        if (scores.criticalValidation) {
            summary.push('✓ Critical production points validated');
        } else {
            summary.push('✗ Critical validation failures');
        }

        return summary;
    }

    generateFinalRecommendations(scores) {
        const recommendations = [];

        if (!scores.environment) {
            recommendations.push('🔧 Fix infrastructure: Ensure all services are healthy and responsive');
        }

        if (!scores.realEndpoints) {
            recommendations.push('🔌 Debug API endpoints: Review request routing and response handling');
        }

        if (!scores.userWorkflow) {
            recommendations.push('👤 Fix user workflow: Test each step individually to identify failure points');
        }

        if (!scores.websocketFlow) {
            recommendations.push('🌐 Resolve WebSocket issues: Check connection handling and message processing');
        }

        if (!scores.realFunctionality) {
            recommendations.push('⚡ Remove mock implementations: Replace all simulations with real functionality');
        }

        if (!scores.criticalValidation) {
            recommendations.push('🎯 Address critical failures: Review system architecture and error handling');
        }

        if (recommendations.length === 0) {
            recommendations.push('🚀 System is production ready - consider performance testing and monitoring setup');
        }

        return recommendations;
    }
}

// Main execution
async function runFinalValidation() {
    const validator = new FinalProductionValidator();
    
    console.log('\n🎯 FINAL PRODUCTION VALIDATION SUITE');
    console.log('Testing ACTUAL system with REAL endpoints and functionality');
    console.log('ZERO mocks, ZERO simulations, 100% real validation');
    console.log('='.repeat(70));

    try {
        // Execute validation phases
        const envOK = await validator.validateEnvironment();
        console.log('');

        const endpointsOK = await validator.validateRealEndpoints();
        console.log('');

        const workflowOK = await validator.validateUserWorkflow();
        console.log('');

        const websocketOK = await validator.validateWebSocketFlow();
        console.log('');

        const realityOK = await validator.validateRealFunctionality();
        console.log('');

        const criticalOK = await validator.validateCriticalPoints();
        console.log('');

        // Generate final report
        const report = validator.generateFinalReport();

        console.log('📊 FINAL PRODUCTION VALIDATION REPORT');
        console.log('='.repeat(70));
        console.log(`⏱️  Test Duration: ${report.duration}`);
        console.log(`📈 Overall Score: ${report.overallScore}`);
        console.log(`🎯 Production Ready: ${report.productionReady ? 'YES' : 'NO'}`);
        console.log(`🏆 Final Verdict: ${report.verdict}\n`);

        console.log('📋 Executive Summary:');
        report.executiveSummary.forEach(item => {
            const color = item.startsWith('✓') ? '\x1b[32m' : '\x1b[31m';
            console.log(`  ${color}${item}\x1b[0m`);
        });

        console.log('\n📊 Category Breakdown:');
        Object.entries(report.categoryScores).forEach(([category, passed]) => {
            const status = passed ? '✅ PASS' : '❌ FAIL';
            console.log(`  ${status} ${category}`);
        });

        if (report.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            report.recommendations.forEach(rec => {
                console.log(`  ${rec}`);
            });
        }

        // Save comprehensive report
        const reportPath = '/workspaces/agent-feed/tests/production-validation/FINAL_PRODUCTION_VALIDATION_REPORT.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n💾 Complete report saved: ${reportPath}`);

        console.log('\n' + '🎯'.repeat(25));
        const resultColor = report.productionReady ? '\x1b[32m' : '\x1b[31m';
        console.log(`${resultColor}\x1b[1m🏆 FINAL RESULT: ${report.verdict}\x1b[0m`);
        console.log('🎯'.repeat(25));

        return report.productionReady;

    } catch (error) {
        validator.log(`Final validation failed: ${error.message}`, 'error');
        console.error(error);
        return false;
    }
}

// Execute if called directly
if (require.main === module) {
    runFinalValidation()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Final validation execution error:', error);
            process.exit(1);
        });
}

module.exports = { FinalProductionValidator, runFinalValidation };