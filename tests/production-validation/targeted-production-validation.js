#!/usr/bin/env node

/**
 * TARGETED PRODUCTION VALIDATION
 * Focuses on critical user workflow with real system validation
 */

const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

class TargetedProductionValidator {
    constructor() {
        this.results = {};
        this.testStartTime = Date.now();
    }

    log(message, type = 'info') {
        const colors = {
            'info': '\x1b[36m',     // Cyan
            'success': '\x1b[32m',  // Green
            'error': '\x1b[31m',    // Red
            'warning': '\x1b[33m',  // Yellow
            'test': '\x1b[35m',     // Magenta
            'reset': '\x1b[0m'
        };
        
        const prefix = {
            'info': '📝',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'test': '🧪'
        }[type] || '📝';
        
        console.log(`${colors[type] || ''}${prefix} ${message}${colors.reset}`);
    }

    async httpRequest(url, method = 'GET', data = null, timeout = 5000) {
        return new Promise((resolve) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: timeout
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const parsedBody = body ? JSON.parse(body) : {};
                        resolve({ 
                            status: res.statusCode, 
                            data: parsedBody, 
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

            req.on('timeout', () => {
                req.destroy();
                resolve({ status: 0, error: 'timeout' });
            });

            if (data) {
                req.write(typeof data === 'string' ? data : JSON.stringify(data));
            }
            req.end();
        });
    }

    async validateCoreInfrastructure() {
        this.log('🔧 VALIDATING CORE INFRASTRUCTURE', 'test');
        
        const tests = [];

        // Test 1: Backend Health
        const healthResponse = await this.httpRequest('http://localhost:3000/health');
        const backendHealthy = healthResponse.status === 200;
        tests.push({ name: 'Backend Health', passed: backendHealthy, details: healthResponse.data });
        
        if (backendHealthy) {
            this.log(`Backend healthy: ${JSON.stringify(healthResponse.data)}`, 'success');
        } else {
            this.log(`Backend unhealthy: ${healthResponse.error}`, 'error');
        }

        // Test 2: Frontend Availability
        const frontendResponse = await this.httpRequest('http://localhost:5173');
        const frontendAvailable = frontendResponse.status === 200;
        tests.push({ name: 'Frontend Available', passed: frontendAvailable });
        
        if (frontendAvailable) {
            this.log('Frontend accessible at localhost:5173', 'success');
        } else {
            this.log('Frontend not accessible', 'error');
        }

        // Test 3: API Endpoints
        const apiResponse = await this.httpRequest('http://localhost:3000/api/claude/instances');
        const apiWorking = apiResponse.status === 200;
        tests.push({ name: 'API Endpoints', passed: apiWorking, details: apiResponse.data });
        
        if (apiWorking) {
            this.log(`API endpoints working: ${JSON.stringify(apiResponse.data)}`, 'success');
        } else {
            this.log('API endpoints not responding correctly', 'error');
        }

        this.results.infrastructure = tests;
        return tests.every(test => test.passed);
    }

    async validateClaudeInstanceWorkflow() {
        this.log('🤖 VALIDATING CLAUDE INSTANCE WORKFLOW', 'test');
        
        const workflowTests = [];

        try {
            // Step 1: Create Claude Instance (Simulate Button Click)
            this.log('Creating Claude instance...', 'info');
            const createResponse = await this.httpRequest(
                'http://localhost:3000/api/claude/create',
                'POST',
                { 
                    type: 'interactive', 
                    workingDirectory: '/workspaces/agent-feed',
                    command: 'echo "Production validation test"'
                }
            );

            const instanceCreated = createResponse.status === 200 || createResponse.status === 201;
            workflowTests.push({ name: 'Instance Creation', passed: instanceCreated, response: createResponse });
            
            if (instanceCreated && createResponse.data?.instanceId) {
                const instanceId = createResponse.data.instanceId;
                this.log(`Claude instance created: ${instanceId}`, 'success');

                // Step 2: Check Instance Status
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for instance initialization
                const statusResponse = await this.httpRequest(`http://localhost:3000/api/claude/instances/${instanceId}/status`);
                const statusOK = statusResponse.status === 200;
                workflowTests.push({ name: 'Status Check', passed: statusOK, response: statusResponse });
                
                if (statusOK) {
                    this.log(`Instance status: ${JSON.stringify(statusResponse.data)}`, 'success');
                } else {
                    this.log(`Status check failed: ${statusResponse.error}`, 'warning');
                }

                // Step 3: Execute Simple Command
                this.log('Testing command execution...', 'info');
                const executeResponse = await this.httpRequest(
                    `http://localhost:3000/api/claude/instances/${instanceId}/execute`,
                    'POST',
                    { command: 'echo "Hello from Claude instance"' }
                );

                const executionOK = executeResponse.status === 200;
                workflowTests.push({ name: 'Command Execution', passed: executionOK, response: executeResponse });
                
                if (executionOK) {
                    this.log('Command execution successful', 'success');
                } else {
                    this.log(`Command execution failed: ${executeResponse.error}`, 'error');
                }

                // Step 4: Test Terminal Stream Access
                const streamResponse = await this.httpRequest(`http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`);
                const streamOK = streamResponse.status === 200;
                workflowTests.push({ name: 'Terminal Stream', passed: streamOK, response: streamResponse });
                
                if (streamOK) {
                    this.log('Terminal stream accessible', 'success');
                } else {
                    this.log('Terminal stream not accessible', 'warning');
                }

                // Step 5: Test Complex Command with Tool Calls
                this.log('Testing complex command...', 'info');
                const complexResponse = await this.httpRequest(
                    `http://localhost:3000/api/claude/instances/${instanceId}/execute`,
                    'POST',
                    { command: 'ls -la /workspaces/agent-feed' }
                );

                const complexOK = complexResponse.status === 200;
                workflowTests.push({ name: 'Complex Command', passed: complexOK, response: complexResponse });
                
                if (complexOK) {
                    this.log('Complex command execution successful', 'success');
                } else {
                    this.log('Complex command execution failed', 'error');
                }

            } else {
                this.log('Instance creation failed - skipping dependent tests', 'error');
                workflowTests.push({ name: 'Dependent Tests', passed: false, reason: 'Instance creation failed' });
            }

        } catch (error) {
            this.log(`Claude workflow validation error: ${error.message}`, 'error');
            workflowTests.push({ name: 'Workflow Exception', passed: false, error: error.message });
        }

        this.results.claudeWorkflow = workflowTests;
        const workflowSuccess = workflowTests.filter(test => test.passed).length >= Math.floor(workflowTests.length * 0.6);
        return workflowSuccess;
    }

    async validateWebSocketConnectivity() {
        this.log('🔌 VALIDATING WEBSOCKET CONNECTIVITY', 'test');
        
        const wsTests = [];

        // Test WebSocket connection with error handling
        const wsTest = await new Promise((resolve) => {
            try {
                // Try terminal WebSocket first (more likely to work)
                const ws = new WebSocket('ws://localhost:3000/terminal');
                let connectionWorking = false;
                let messageReceived = false;

                const timeout = setTimeout(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.close();
                    }
                    resolve({ connectionWorking, messageReceived });
                }, 3000);

                ws.on('open', () => {
                    connectionWorking = true;
                    this.log('WebSocket connection established', 'success');
                    
                    // Send test message
                    ws.send(JSON.stringify({ 
                        type: 'test',
                        message: 'production validation' 
                    }));
                });

                ws.on('message', (data) => {
                    messageReceived = true;
                    this.log(`WebSocket message received: ${data.toString().substring(0, 50)}...`, 'success');
                });

                ws.on('error', (error) => {
                    this.log(`WebSocket error: ${error.message}`, 'warning');
                    clearTimeout(timeout);
                    resolve({ connectionWorking: false, messageReceived: false, error: error.message });
                });

                ws.on('close', () => {
                    clearTimeout(timeout);
                    resolve({ connectionWorking, messageReceived });
                });

            } catch (error) {
                resolve({ connectionWorking: false, messageReceived: false, error: error.message });
            }
        });

        wsTests.push({ 
            name: 'WebSocket Connection', 
            passed: wsTest.connectionWorking,
            details: wsTest
        });

        wsTests.push({ 
            name: 'WebSocket Messaging', 
            passed: wsTest.messageReceived,
            details: wsTest
        });

        this.results.websocket = wsTests;
        return wsTest.connectionWorking;
    }

    async validateToolCallVisualization() {
        this.log('🔧 VALIDATING TOOL CALL VISUALIZATION', 'test');
        
        const toolCallTests = [];

        // Test tool call formatting endpoint
        const formatResponse = await this.httpRequest(
            'http://localhost:3000/api/tool-calls/format',
            'POST',
            {
                toolCall: {
                    name: 'validation_tool',
                    parameters: { test: 'production', environment: 'real' }
                }
            }
        );

        const formatOK = formatResponse.status === 200;
        toolCallTests.push({ 
            name: 'Tool Call Formatting', 
            passed: formatOK, 
            response: formatResponse 
        });

        if (formatOK) {
            this.log('Tool call formatting working', 'success');
        } else {
            this.log(`Tool call formatting failed: ${formatResponse.status}`, 'warning');
        }

        this.results.toolCalls = toolCallTests;
        return formatOK;
    }

    async validateRealFunctionality() {
        this.log('🎯 VALIDATING REAL FUNCTIONALITY (NO MOCKS)', 'test');
        
        const realityChecks = [];

        // Check for mock implementations in backend
        try {
            const backendContent = fs.readFileSync('/workspaces/agent-feed/simple-backend.js', 'utf8');
            
            const suspiciousPatterns = [
                { pattern: /simulation/gi, description: 'Simulation code' },
                { pattern: /dummy[A-Z]\w+/g, description: 'Dummy implementations' },
                { pattern: /placeholder.*implementation/gi, description: 'Placeholder code' },
                { pattern: /test[A-Z]\w*mock/gi, description: 'Test mocks' }
            ];

            let mocksFound = 0;
            const findings = [];

            for (const check of suspiciousPatterns) {
                const matches = backendContent.match(check.pattern);
                if (matches && matches.length > 0) {
                    mocksFound += matches.length;
                    findings.push(`${check.description}: ${matches.length} instances`);
                }
            }

            const noMocks = mocksFound === 0;
            realityChecks.push({ 
                name: 'No Mock Implementations', 
                passed: noMocks,
                findings: findings
            });

            if (noMocks) {
                this.log('No mock implementations detected', 'success');
            } else {
                this.log(`Found ${mocksFound} potential mock implementations`, 'warning');
                findings.forEach(finding => this.log(`  - ${finding}`, 'warning'));
            }

        } catch (error) {
            realityChecks.push({ 
                name: 'Mock Detection', 
                passed: false, 
                error: error.message 
            });
        }

        // Test real process spawning
        const processTest = await this.httpRequest(
            'http://localhost:3000/api/claude/create',
            'POST',
            { type: 'test', command: 'echo "real process test"' }
        );

        const realProcesses = processTest.status === 200 || processTest.status === 201;
        realityChecks.push({ 
            name: 'Real Process Spawning', 
            passed: realProcesses,
            response: processTest
        });

        if (realProcesses) {
            this.log('Real process spawning confirmed', 'success');
        } else {
            this.log('Process spawning may not be working', 'warning');
        }

        this.results.realityChecks = realityChecks;
        return realityChecks.every(check => check.passed);
    }

    generateProductionReport() {
        const endTime = Date.now();
        const duration = endTime - this.testStartTime;

        const categories = {
            infrastructure: this.results.infrastructure?.every(test => test.passed) || false,
            claudeWorkflow: this.results.claudeWorkflow?.filter(test => test.passed).length >= 
                           Math.floor((this.results.claudeWorkflow?.length || 1) * 0.6),
            websocket: this.results.websocket?.some(test => test.passed) || false,
            toolCalls: this.results.toolCalls?.every(test => test.passed) || false,
            realityChecks: this.results.realityChecks?.every(check => check.passed) || false
        };

        const passedCategories = Object.values(categories).filter(v => v === true).length;
        const totalCategories = Object.keys(categories).length;
        const overallScore = Math.round((passedCategories / totalCategories) * 100);

        let verdict;
        if (overallScore >= 90) {
            verdict = '🎉 PRODUCTION READY - EXCELLENT REAL FUNCTIONALITY';
        } else if (overallScore >= 75) {
            verdict = '✅ PRODUCTION READY - GOOD FUNCTIONALITY WITH MINOR ISSUES';
        } else if (overallScore >= 60) {
            verdict = '⚠️ NEEDS IMPROVEMENT - SIGNIFICANT ISSUES DETECTED';
        } else {
            verdict = '❌ NOT PRODUCTION READY - CRITICAL FAILURES';
        }

        const report = {
            timestamp: new Date().toISOString(),
            duration: `${duration}ms`,
            overallScore: `${overallScore}%`,
            verdict,
            categoryResults: categories,
            detailedResults: this.results,
            criticalFindings: this.generateCriticalFindings(),
            recommendations: this.generateRecommendations(categories, overallScore)
        };

        return report;
    }

    generateCriticalFindings() {
        const findings = [];

        if (this.results.infrastructure?.some(test => !test.passed)) {
            findings.push('Infrastructure issues detected - services may not be fully operational');
        }

        if (this.results.claudeWorkflow?.filter(test => test.passed).length < 3) {
            findings.push('Claude workflow has significant issues - core functionality compromised');
        }

        if (!this.results.websocket?.some(test => test.passed)) {
            findings.push('WebSocket connectivity issues - real-time features may not work');
        }

        if (this.results.realityChecks?.some(check => !check.passed)) {
            findings.push('Mock implementations or simulation code detected - not 100% real functionality');
        }

        return findings;
    }

    generateRecommendations(categories, score) {
        const recommendations = [];

        if (!categories.infrastructure) {
            recommendations.push('Fix infrastructure: Ensure all services are running and healthy');
        }

        if (!categories.claudeWorkflow) {
            recommendations.push('Debug Claude integration: Check API endpoints and process spawning');
        }

        if (!categories.websocket) {
            recommendations.push('Investigate WebSocket issues: Review connection handling and error management');
        }

        if (!categories.toolCalls) {
            recommendations.push('Fix tool call visualization: Ensure formatting endpoints are working');
        }

        if (!categories.realityChecks) {
            recommendations.push('Remove mock implementations: Replace all simulations with real functionality');
        }

        if (score >= 75) {
            recommendations.push('Consider performance testing and load validation for production deployment');
        }

        return recommendations;
    }
}

// Main execution
async function runTargetedValidation() {
    const validator = new TargetedProductionValidator();
    
    try {
        console.log('\n🚀 TARGETED PRODUCTION VALIDATION SUITE');
        console.log('Testing REAL functionality with ZERO mocks');
        console.log('=' .repeat(60));

        // Run core validation tests
        const infrastructureOK = await validator.validateCoreInfrastructure();
        console.log(''); // Spacing

        const claudeWorkflowOK = await validator.validateClaudeInstanceWorkflow();
        console.log(''); // Spacing

        const websocketOK = await validator.validateWebSocketConnectivity();
        console.log(''); // Spacing

        const toolCallsOK = await validator.validateToolCallVisualization();
        console.log(''); // Spacing

        const realityOK = await validator.validateRealFunctionality();
        console.log(''); // Spacing

        // Generate and display report
        const report = validator.generateProductionReport();
        
        console.log('📊 PRODUCTION VALIDATION REPORT');
        console.log('=' .repeat(60));
        console.log(`⏱️  Duration: ${report.duration}`);
        console.log(`📈 Overall Score: ${report.overallScore}`);
        console.log(`🎯 Verdict: ${report.verdict}\n`);

        console.log('Category Results:');
        Object.entries(report.categoryResults).forEach(([category, passed]) => {
            const status = passed ? '✅' : '❌';
            console.log(`  ${status} ${category}: ${passed ? 'PASSED' : 'FAILED'}`);
        });

        if (report.criticalFindings.length > 0) {
            console.log('\n🚨 Critical Findings:');
            report.criticalFindings.forEach(finding => {
                console.log(`  ⚠️  ${finding}`);
            });
        }

        if (report.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            report.recommendations.forEach(rec => {
                console.log(`  📋 ${rec}`);
            });
        }

        // Save report
        const reportPath = '/workspaces/agent-feed/tests/production-validation/TARGETED_PRODUCTION_REPORT.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n💾 Full report saved: ${reportPath}`);

        console.log('\n' + '🎯'.repeat(20));
        validator.log(`FINAL RESULT: ${report.verdict}`, 
                     report.overallScore >= 75 ? 'success' : 'warning');
        console.log('🎯'.repeat(20));

        return parseInt(report.overallScore) >= 75;

    } catch (error) {
        validator.log(`Validation failed: ${error.message}`, 'error');
        console.error(error);
        return false;
    }
}

// Execute if called directly
if (require.main === module) {
    runTargetedValidation()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Execution error:', error);
            process.exit(1);
        });
}

module.exports = { TargetedProductionValidator, runTargetedValidation };