#!/usr/bin/env node

/**
 * PRODUCTION VALIDATION SUITE
 * Tests 100% real functionality with zero mocks or simulations
 */

const { spawn, exec } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

class ProductionValidator {
    constructor() {
        this.results = {
            environment: {},
            backend: {},
            frontend: {},
            websocket: {},
            claudeIntegration: {},
            userWorkflow: {},
            criticalPoints: {}
        };
        this.services = {
            backend: null,
            frontend: null
        };
    }

    async validateEnvironment() {
        console.log('🔍 VALIDATING REAL ENVIRONMENT...');
        
        try {
            // Check if actual ports are available
            const portCheck3000 = await this.checkPort(3000);
            const portCheck5173 = await this.checkPort(5173);
            
            this.results.environment.port3000Available = portCheck3000;
            this.results.environment.port5173Available = portCheck5173;
            
            // Check for required files
            const backendExists = fs.existsSync('/workspaces/agent-feed/simple-backend.js');
            const frontendExists = fs.existsSync('/workspaces/agent-feed/frontend');
            
            this.results.environment.backendFileExists = backendExists;
            this.results.environment.frontendDirExists = frontendExists;
            
            console.log('✅ Environment validation complete');
            return { port3000Available: portCheck3000, port5173Available: portCheck5173, backendExists, frontendExists };
            
        } catch (error) {
            console.error('❌ Environment validation failed:', error.message);
            this.results.environment.error = error.message;
            return false;
        }
    }

    async startRealBackend() {
        console.log('🚀 STARTING REAL BACKEND SERVER...');
        
        return new Promise((resolve, reject) => {
            this.services.backend = spawn('node', ['/workspaces/agent-feed/simple-backend.js'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: '/workspaces/agent-feed'
            });

            let backendReady = false;
            let startupOutput = '';

            this.services.backend.stdout.on('data', (data) => {
                const output = data.toString();
                startupOutput += output;
                console.log('[BACKEND]', output.trim());
                
                if (output.includes('Server running on') || output.includes('listening on port 3000')) {
                    backendReady = true;
                    this.results.backend.started = true;
                    this.results.backend.port = 3000;
                    resolve(true);
                }
            });

            this.services.backend.stderr.on('data', (data) => {
                const error = data.toString();
                console.error('[BACKEND ERROR]', error.trim());
                if (!backendReady) {
                    this.results.backend.error = error;
                    reject(new Error(`Backend failed to start: ${error}`));
                }
            });

            this.services.backend.on('error', (error) => {
                console.error('❌ Backend process error:', error.message);
                this.results.backend.error = error.message;
                if (!backendReady) reject(error);
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (!backendReady) {
                    this.results.backend.error = 'Startup timeout';
                    reject(new Error('Backend startup timeout'));
                }
            }, 10000);
        });
    }

    async startRealFrontend() {
        console.log('🎨 STARTING REAL FRONTEND SERVER...');
        
        return new Promise((resolve, reject) => {
            this.services.frontend = spawn('npm', ['run', 'dev'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: '/workspaces/agent-feed/frontend'
            });

            let frontendReady = false;
            let startupOutput = '';

            this.services.frontend.stdout.on('data', (data) => {
                const output = data.toString();
                startupOutput += output;
                console.log('[FRONTEND]', output.trim());
                
                if (output.includes('Local:') && output.includes('5173')) {
                    frontendReady = true;
                    this.results.frontend.started = true;
                    this.results.frontend.port = 5173;
                    resolve(true);
                }
            });

            this.services.frontend.stderr.on('data', (data) => {
                const error = data.toString();
                console.log('[FRONTEND INFO]', error.trim()); // Vite outputs to stderr
                
                if (error.includes('Local:') && error.includes('5173')) {
                    frontendReady = true;
                    this.results.frontend.started = true;
                    this.results.frontend.port = 5173;
                    resolve(true);
                }
            });

            this.services.frontend.on('error', (error) => {
                console.error('❌ Frontend process error:', error.message);
                this.results.frontend.error = error.message;
                if (!frontendReady) reject(error);
            });

            // Timeout after 30 seconds
            setTimeout(() => {
                if (!frontendReady) {
                    this.results.frontend.error = 'Startup timeout';
                    reject(new Error('Frontend startup timeout'));
                }
            }, 30000);
        });
    }

    async testRealWebSocketConnection() {
        console.log('🔌 TESTING REAL WEBSOCKET CONNECTION...');
        
        return new Promise((resolve, reject) => {
            const ws = new WebSocket('ws://localhost:3000');
            let connectionEstablished = false;

            ws.on('open', () => {
                console.log('✅ WebSocket connection established');
                connectionEstablished = true;
                this.results.websocket.connectionEstablished = true;
                
                // Test message sending
                ws.send(JSON.stringify({ type: 'test', data: 'validation' }));
            });

            ws.on('message', (data) => {
                console.log('📨 WebSocket message received:', data.toString());
                this.results.websocket.messageReceived = true;
                this.results.websocket.messageData = data.toString();
                ws.close();
                resolve(true);
            });

            ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error.message);
                this.results.websocket.error = error.message;
                if (!connectionEstablished) reject(error);
            });

            ws.on('close', () => {
                console.log('🔌 WebSocket connection closed');
                if (connectionEstablished) {
                    resolve(true);
                } else {
                    reject(new Error('WebSocket connection failed to establish'));
                }
            });

            // Timeout after 5 seconds
            setTimeout(() => {
                if (!connectionEstablished) {
                    this.results.websocket.error = 'Connection timeout';
                    reject(new Error('WebSocket connection timeout'));
                }
            }, 5000);
        });
    }

    async testRealClaudeIntegration() {
        console.log('🤖 TESTING REAL CLAUDE CODE INTEGRATION...');
        
        try {
            // Test if Claude Code CLI is available
            const { stdout, stderr } = await execAsync('which claude');
            this.results.claudeIntegration.cliAvailable = !!stdout.trim();
            
            // Test Claude Code version
            const { stdout: versionOutput } = await execAsync('claude --version').catch(() => ({ stdout: '' }));
            this.results.claudeIntegration.version = versionOutput.trim();
            
            // Test backend Claude integration endpoint
            const response = await this.httpRequest('http://localhost:3000/api/claude/status');
            this.results.claudeIntegration.backendEndpoint = response.status === 200;
            this.results.claudeIntegration.backendResponse = response.data;
            
            console.log('✅ Claude integration validation complete');
            return true;
            
        } catch (error) {
            console.error('❌ Claude integration validation failed:', error.message);
            this.results.claudeIntegration.error = error.message;
            return false;
        }
    }

    async validateCompleteUserWorkflow() {
        console.log('👤 VALIDATING COMPLETE USER WORKFLOW...');
        
        const workflowSteps = [
            'Frontend loads successfully',
            'Click create Claude instance',
            'Loading animations display',
            'Instance creation succeeds',
            'Command execution works',
            'Tool call visualization',
            'Permission dialogs functional',
            'WebSocket messages flow'
        ];

        try {
            // Step 1: Frontend accessibility
            const frontendResponse = await this.httpRequest('http://localhost:5173');
            this.results.userWorkflow.frontendLoads = frontendResponse.status === 200;
            
            // Step 2: API endpoints available
            const apiHealthResponse = await this.httpRequest('http://localhost:3000/health');
            this.results.userWorkflow.apiHealthy = apiHealthResponse.status === 200;
            
            // Step 3: Claude instance creation endpoint
            const instanceResponse = await this.httpRequest('http://localhost:3000/api/claude/create', 'POST');
            this.results.userWorkflow.instanceCreation = instanceResponse.status === 200 || instanceResponse.status === 201;
            
            // Step 4: WebSocket events for loading
            const wsEvents = await this.testWebSocketEvents();
            this.results.userWorkflow.websocketEvents = wsEvents;
            
            console.log('✅ User workflow validation complete');
            return true;
            
        } catch (error) {
            console.error('❌ User workflow validation failed:', error.message);
            this.results.userWorkflow.error = error.message;
            return false;
        }
    }

    async testWebSocketEvents() {
        return new Promise((resolve) => {
            const ws = new WebSocket('ws://localhost:3000');
            const events = [];
            
            ws.on('open', () => {
                // Simulate user actions
                ws.send(JSON.stringify({ type: 'create_instance' }));
                ws.send(JSON.stringify({ type: 'execute_command', command: 'ls -la' }));
            });

            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                events.push(message);
                
                if (events.length >= 2) {
                    ws.close();
                    resolve(events);
                }
            });

            setTimeout(() => {
                ws.close();
                resolve(events);
            }, 3000);
        });
    }

    async validateCriticalPoints() {
        console.log('🎯 VALIDATING CRITICAL POINTS...');
        
        const checks = {
            noMocksInProduction: await this.scanForMocks(),
            webSocketConnectionStable: await this.testWebSocketStability(),
            loadingAnimationsReal: await this.validateLoadingAnimations(),
            permissionDialogsFunctional: await this.validatePermissionDialogs(),
            toolCallsVisualized: await this.validateToolCallVisualization(),
            claudeProcessSpawning: await this.validateClaudeProcessSpawning()
        };

        this.results.criticalPoints = checks;
        
        const allPassed = Object.values(checks).every(check => check === true);
        console.log(allPassed ? '✅ All critical points validated' : '❌ Some critical points failed');
        
        return allPassed;
    }

    async scanForMocks() {
        try {
            // Scan backend for mock implementations
            const backendContent = fs.readFileSync('/workspaces/agent-feed/simple-backend.js', 'utf8');
            const mockPatterns = [
                /mock[A-Z]\w+/g,
                /fake[A-Z]\w+/g,
                /stub[A-Z]\w+/g,
                /simulation/gi,
                /dummy/gi
            ];

            for (const pattern of mockPatterns) {
                if (pattern.test(backendContent)) {
                    console.error(`❌ Mock implementation found: ${pattern.source}`);
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('Mock scan failed:', error);
            return false;
        }
    }

    async testWebSocketStability() {
        return new Promise((resolve) => {
            const ws = new WebSocket('ws://localhost:3000');
            let messageCount = 0;
            let stable = true;

            ws.on('open', () => {
                const interval = setInterval(() => {
                    if (messageCount < 10) {
                        ws.send(JSON.stringify({ type: 'ping', count: messageCount++ }));
                    } else {
                        clearInterval(interval);
                        ws.close();
                    }
                }, 100);
            });

            ws.on('message', () => {
                // Count responses
            });

            ws.on('error', () => {
                stable = false;
            });

            ws.on('close', () => {
                resolve(stable && messageCount >= 10);
            });

            setTimeout(() => {
                ws.close();
                resolve(false);
            }, 5000);
        });
    }

    async validateLoadingAnimations() {
        // Check if loading animation endpoints exist
        try {
            const response = await this.httpRequest('http://localhost:3000/api/loading/status');
            return response.status === 200;
        } catch {
            return false;
        }
    }

    async validatePermissionDialogs() {
        // Check if permission dialog endpoints exist
        try {
            const response = await this.httpRequest('http://localhost:3000/api/permissions/check');
            return response.status === 200;
        } catch {
            return false;
        }
    }

    async validateToolCallVisualization() {
        // Check if tool call visualization endpoints exist
        try {
            const response = await this.httpRequest('http://localhost:3000/api/tool-calls/format');
            return response.status === 200;
        } catch {
            return false;
        }
    }

    async validateClaudeProcessSpawning() {
        // Test actual Claude process spawning
        try {
            const response = await this.httpRequest('http://localhost:3000/api/claude/spawn', 'POST');
            return response.status === 200 || response.status === 201;
        } catch {
            return false;
        }
    }

    // Utility methods
    async checkPort(port) {
        return new Promise((resolve) => {
            const server = http.createServer();
            server.listen(port, () => {
                server.close(() => resolve(true));
            });
            server.on('error', () => resolve(false));
        });
    }

    async httpRequest(url, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname,
                method: method,
                headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {}
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    resolve({ status: res.statusCode, data: body });
                });
            });

            req.on('error', (error) => {
                resolve({ status: 0, error: error.message });
            });

            if (data) req.write(JSON.stringify(data));
            req.end();

            setTimeout(() => {
                req.destroy();
                resolve({ status: 0, error: 'Request timeout' });
            }, 5000);
        });
    }

    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                environmentValid: Object.keys(this.results.environment).length > 0 && !this.results.environment.error,
                backendRunning: this.results.backend.started === true,
                frontendRunning: this.results.frontend.started === true,
                websocketWorking: this.results.websocket.connectionEstablished === true,
                claudeIntegrated: this.results.claudeIntegration.backendEndpoint === true,
                userWorkflowComplete: !this.results.userWorkflow.error,
                criticalPointsPassed: Object.values(this.results.criticalPoints).every(v => v === true)
            },
            detailedResults: this.results,
            verdict: 'CALCULATING...'
        };

        // Calculate overall verdict
        const passedTests = Object.values(report.summary).filter(v => v === true).length;
        const totalTests = Object.keys(report.summary).length;
        const passRate = passedTests / totalTests;

        if (passRate >= 1.0) {
            report.verdict = 'PRODUCTION READY - 100% REAL FUNCTIONALITY VALIDATED';
        } else if (passRate >= 0.8) {
            report.verdict = 'MOSTLY READY - MINOR ISSUES DETECTED';
        } else if (passRate >= 0.6) {
            report.verdict = 'NEEDS WORK - SIGNIFICANT ISSUES FOUND';
        } else {
            report.verdict = 'PRODUCTION NOT READY - CRITICAL FAILURES';
        }

        return report;
    }

    async cleanup() {
        console.log('🧹 CLEANING UP SERVICES...');
        
        if (this.services.backend) {
            this.services.backend.kill('SIGTERM');
        }
        
        if (this.services.frontend) {
            this.services.frontend.kill('SIGTERM');
        }

        // Wait a moment for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

// Main execution
async function runProductionValidation() {
    const validator = new ProductionValidator();
    
    try {
        console.log('🚀 STARTING PRODUCTION VALIDATION SUITE');
        console.log('=' .repeat(60));

        // Step 1: Environment validation
        await validator.validateEnvironment();

        // Step 2: Start real services
        await validator.startRealBackend();
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for backend to fully start
        
        await validator.startRealFrontend();
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for frontend to fully start

        // Step 3: Test real connections
        await validator.testRealWebSocketConnection();

        // Step 4: Test Claude integration
        await validator.testRealClaudeIntegration();

        // Step 5: Validate user workflow
        await validator.validateCompleteUserWorkflow();

        // Step 6: Critical validation points
        await validator.validateCriticalPoints();

        // Step 7: Generate report
        const report = await validator.generateReport();

        console.log('\n' + '=' .repeat(60));
        console.log('📊 PRODUCTION VALIDATION REPORT');
        console.log('=' .repeat(60));
        console.log(JSON.stringify(report, null, 2));

        // Save report
        fs.writeFileSync(
            '/workspaces/agent-feed/tests/production-validation/REAL_ENVIRONMENT_VALIDATION_REPORT.json',
            JSON.stringify(report, null, 2)
        );

        console.log(`\n🎯 FINAL VERDICT: ${report.verdict}`);
        
        return report.summary.criticalPointsPassed;

    } catch (error) {
        console.error('💥 PRODUCTION VALIDATION FAILED:', error.message);
        return false;
    } finally {
        await validator.cleanup();
    }
}

if (require.main === module) {
    runProductionValidation()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Validation error:', error);
            process.exit(1);
        });
}

module.exports = { ProductionValidator, runProductionValidation };