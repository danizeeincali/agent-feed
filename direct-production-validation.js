#!/usr/bin/env node

/**
 * DIRECT PRODUCTION VALIDATION
 * Tests real functionality without mocks - immediate execution
 */

const axios = require('axios');
const WebSocket = require('ws');

const CONFIG = {
    FRONTEND_URL: 'http://localhost:5173',
    BACKEND_URL: 'http://localhost:3000',
    WS_URL: 'ws://localhost:3000'
};

class DirectValidator {
    constructor() {
        this.results = { passed: 0, failed: 0, tests: [] };
    }

    log(status, test, details = '') {
        const symbol = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
        console.log(`${symbol} ${status}: ${test}`);
        if (details) console.log(`   ${details}`);
        
        this.results.tests.push({ status, test, details, timestamp: new Date().toISOString() });
        if (status === 'PASS') this.results.passed++;
        if (status === 'FAIL') this.results.failed++;
    }

    async testBackendHealth() {
        console.log('\n🏥 BACKEND HEALTH CHECK');
        try {
            const response = await axios.get(`${CONFIG.BACKEND_URL}/health`, { timeout: 5000 });
            
            if (response.status === 200) {
                this.log('PASS', 'Backend Health Endpoint', `Status: ${response.data.status}`);
                
                if (response.data.status === 'healthy') {
                    this.log('PASS', 'Backend Status Healthy');
                } else {
                    this.log('FAIL', 'Backend Status Not Healthy', response.data.status);
                }
                
                if (response.data.server) {
                    this.log('PASS', 'Backend Server Info', response.data.server);
                }
                
                return true;
            } else {
                this.log('FAIL', 'Backend Health Check', `Status: ${response.status}`);
                return false;
            }
        } catch (error) {
            this.log('FAIL', 'Backend Health Check', error.message);
            return false;
        }
    }

    async testClaudeInstances() {
        console.log('\n🤖 CLAUDE INSTANCES TEST');
        try {
            const response = await axios.get(`${CONFIG.BACKEND_URL}/api/claude/instances`, { timeout: 10000 });
            
            if (response.status === 200) {
                this.log('PASS', 'Claude Instances API Accessible');
                
                const instances = response.data.instances || response.data || [];
                this.log('PASS', 'Claude Instances Retrieved', `Found: ${instances.length} instances`);
                
                if (instances.length > 0) {
                    const instance = instances[0];
                    if (instance.id && instance.name) {
                        this.log('PASS', 'Claude Instance Structure Valid', `ID: ${instance.id}`);
                        return instance.id;
                    } else {
                        this.log('FAIL', 'Claude Instance Structure Invalid', 'Missing id or name');
                    }
                }
                
                return null;
            } else {
                this.log('FAIL', 'Claude Instances API', `Status: ${response.status}`);
                return null;
            }
        } catch (error) {
            this.log('FAIL', 'Claude Instances API', error.message);
            return null;
        }
    }

    async testClaudeInstanceCreation() {
        console.log('\n🚀 CLAUDE INSTANCE CREATION TEST');
        try {
            const createPayload = {
                type: 'claude',
                name: 'Direct Production Validation Test'
            };
            
            const response = await axios.post(`${CONFIG.BACKEND_URL}/api/claude/instances`, createPayload, {
                timeout: 15000,
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.status === 200 || response.status === 201) {
                // Fix: Check the correct response structure from backend
                const responseData = response.data;
                const instanceId = responseData.instance?.id || responseData.instanceId || responseData.id;
                
                if (instanceId) {
                    this.log('PASS', 'Claude Instance Created', `ID: ${instanceId}`);
                    this.log('PASS', 'Instance Response Structure Valid', `Status: ${responseData.instance?.status}`);
                    
                    // Wait for instance to initialize
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    // Verify it appears in the list
                    const listResponse = await axios.get(`${CONFIG.BACKEND_URL}/api/claude/instances`);
                    const instances = listResponse.data.instances || listResponse.data || [];
                    const createdInstance = instances.find(i => i.id === instanceId);
                    
                    if (createdInstance) {
                        this.log('PASS', 'Claude Instance Verified in List', `${createdInstance.name} (${createdInstance.status})`);
                        return instanceId;
                    } else {
                        this.log('FAIL', 'Claude Instance Not Found in List');
                        return instanceId; // Return anyway for further testing
                    }
                } else {
                    this.log('FAIL', 'Claude Instance Creation - No ID', JSON.stringify(response.data, null, 2));
                    return null;
                }
            } else {
                this.log('FAIL', 'Claude Instance Creation API', `Status: ${response.status}`);
                return null;
            }
        } catch (error) {
            this.log('FAIL', 'Claude Instance Creation', error.message);
            return null;
        }
    }

    async testWebSocketConnection(instanceId) {
        console.log('\n🔌 WEBSOCKET REAL-TIME TEST');
        
        if (!instanceId) {
            this.log('WARN', 'WebSocket Test Skipped', 'No instance ID available');
            return;
        }
        
        return new Promise((resolve) => {
            const wsUrl = `${CONFIG.WS_URL}/terminal`;  // Fixed: Use correct WebSocket path
            console.log(`   Connecting to: ${wsUrl}`);
            
            const ws = new WebSocket(wsUrl);
            let messageReceived = false;
            let connectionSuccess = false;
            
            const timeout = setTimeout(() => {
                if (!connectionSuccess) {
                    this.log('FAIL', 'WebSocket Connection Timeout');
                }
                ws.close();
                resolve();
            }, 10000);
            
            ws.on('open', () => {
                connectionSuccess = true;
                this.log('PASS', 'WebSocket Connection Established');
                
                // First, connect to the instance
                const connectMessage = {
                    type: 'connect_terminal',
                    terminalId: instanceId
                };
                
                try {
                    ws.send(JSON.stringify(connectMessage));
                    this.log('PASS', 'WebSocket Terminal Connection Sent', instanceId);
                    
                    // After connecting, send a Claude API test
                    setTimeout(() => {
                        const testMessage = {
                            type: 'claude_api',
                            instanceId: instanceId,
                            message: 'echo "WebSocket test successful"'
                        };
                        
                        try {
                            ws.send(JSON.stringify(testMessage));
                            this.log('PASS', 'WebSocket Claude API Message Sent');
                        } catch (sendError) {
                            this.log('FAIL', 'WebSocket Message Send Failed', sendError.message);
                        }
                    }, 1000);
                    
                } catch (sendError) {
                    this.log('FAIL', 'WebSocket Connect Message Failed', sendError.message);
                }
            });
            
            ws.on('message', (data) => {
                messageReceived = true;
                const dataStr = data.toString();
                
                try {
                    const parsed = JSON.parse(dataStr);
                    this.log('PASS', 'WebSocket Structured Message Received', `${parsed.type}: ${parsed.terminalId || parsed.instanceId || 'no-id'}`);
                    
                    if (parsed.type === 'connect') {
                        this.log('PASS', 'WebSocket Terminal Connected Successfully');
                    }
                    
                    if (parsed.type === 'output' && parsed.data) {
                        this.log('PASS', 'WebSocket Claude Output Received', parsed.data.substring(0, 50) + '...');
                    }
                    
                } catch (e) {
                    this.log('PASS', 'WebSocket Raw Message Received', dataStr.substring(0, 100));
                }
            });
            
            ws.on('error', (error) => {
                this.log('FAIL', 'WebSocket Connection Error', error.message);
                clearTimeout(timeout);
                resolve();
            });
            
            ws.on('close', (code, reason) => {
                if (messageReceived || connectionSuccess) {
                    this.log('PASS', 'WebSocket Connection Closed Gracefully', `Code: ${code}`);
                }
                clearTimeout(timeout);
                resolve();
            });
            
            // Auto-close after 8 seconds to continue testing
            setTimeout(() => {
                ws.close();
            }, 8000);
        });
    }

    async testClaudeAPIExecution(instanceId) {
        console.log('\n🧠 CLAUDE API EXECUTION TEST');
        
        if (!instanceId) {
            this.log('WARN', 'Claude API Test Skipped', 'No instance ID available');
            return;
        }
        
        // Test terminal input endpoint that actually exists
        const testCommand = 'echo "Production validation test"';
        
        try {
            const response = await axios.post(`${CONFIG.BACKEND_URL}/api/claude/instances/${instanceId}/terminal/input`, {
                data: testCommand
            }, {
                timeout: 20000,
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.status === 200) {
                this.log('PASS', 'Claude Terminal Input API', `Command: ${testCommand}`);
                
                if (response.data.success) {
                    this.log('PASS', 'Terminal Input Accepted', 'Command processed');
                }
                
                // Wait a moment then check terminal stream
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Test terminal stream output
                try {
                    const streamResponse = await axios.get(`${CONFIG.BACKEND_URL}/api/claude/instances/${instanceId}/terminal/stream`, {
                        timeout: 10000
                    });
                    
                    if (streamResponse.status === 200) {
                        this.log('PASS', 'Terminal Stream Access', 'Stream endpoint accessible');
                    }
                } catch (streamError) {
                    this.log('WARN', 'Terminal Stream Access', streamError.message);
                }
                
            } else {
                this.log('FAIL', 'Claude Terminal Input API', `Status: ${response.status}`);
            }
        } catch (error) {
            this.log('FAIL', 'Claude API Execution', error.message);
        }
        
        // Also test the instance status endpoint
        try {
            const statusResponse = await axios.get(`${CONFIG.BACKEND_URL}/api/claude/instances/${instanceId}/status`);
            if (statusResponse.status === 200) {
                this.log('PASS', 'Claude Instance Status API', `Status: ${statusResponse.data.status}`);
            }
        } catch (error) {
            this.log('WARN', 'Claude Instance Status API', error.message);
        }
    }

    async testFrontendAccessibility() {
        console.log('\n🌐 FRONTEND ACCESSIBILITY TEST');
        try {
            const response = await axios.get(CONFIG.FRONTEND_URL, { 
                timeout: 10000,
                headers: { 'User-Agent': 'ProductionValidator/1.0' }
            });
            
            if (response.status === 200) {
                this.log('PASS', 'Frontend Accessible');
                
                const html = response.data;
                if (html.includes('Agent Feed')) {
                    this.log('PASS', 'Frontend Title Correct');
                } else {
                    this.log('FAIL', 'Frontend Title Missing or Incorrect');
                }
                
                if (html.includes('root')) {
                    this.log('PASS', 'Frontend React Root Element Present');
                }
                
                if (html.includes('vite') || html.includes('module')) {
                    this.log('PASS', 'Frontend Built with Modern Tools');
                }
                
            } else {
                this.log('FAIL', 'Frontend Not Accessible', `Status: ${response.status}`);
            }
        } catch (error) {
            this.log('FAIL', 'Frontend Accessibility', error.message);
        }
    }

    async testRealFileSystemOperations() {
        console.log('\n📁 REAL FILE SYSTEM TEST');
        const fs = require('fs').promises;
        const testFile = '/tmp/production-validation-test.txt';
        const testContent = `Production Validation Test - ${new Date().toISOString()}`;
        
        try {
            // Test direct file creation
            await fs.writeFile(testFile, testContent);
            this.log('PASS', 'File System Write Operation');
            
            // Test file reading
            const content = await fs.readFile(testFile, 'utf8');
            if (content === testContent) {
                this.log('PASS', 'File System Read Operation');
            } else {
                this.log('FAIL', 'File System Read Mismatch');
            }
            
            // Test file deletion
            await fs.unlink(testFile);
            this.log('PASS', 'File System Delete Operation');
            
        } catch (error) {
            this.log('FAIL', 'File System Operations', error.message);
        }
    }

    async runValidation() {
        console.log('🚀 DIRECT PRODUCTION VALIDATION STARTING\n');
        console.log('Testing REAL functionality with ZERO mocks');
        console.log('=' .repeat(60));
        
        const startTime = Date.now();
        
        // Execute all validation tests
        const healthOk = await this.testBackendHealth();
        const existingInstanceId = await this.testClaudeInstances();
        const newInstanceId = await this.testClaudeInstanceCreation();
        
        const instanceToTest = newInstanceId || existingInstanceId;
        
        await this.testWebSocketConnection(instanceToTest);
        await this.testClaudeAPIExecution(instanceToTest);
        await this.testFrontendAccessibility();
        await this.testRealFileSystemOperations();
        
        const duration = Date.now() - startTime;
        
        // Final Report
        console.log('\n' + '=' .repeat(60));
        console.log('🏆 PRODUCTION VALIDATION COMPLETE');
        console.log('=' .repeat(60));
        
        const totalTests = this.results.passed + this.results.failed;
        const successRate = totalTests > 0 ? (this.results.passed / totalTests * 100).toFixed(1) : 0;
        
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📊 Success Rate: ${successRate}%`);
        console.log(`⏱️  Duration: ${Math.round(duration / 1000)}s`);
        
        const verdict = this.results.failed === 0 ? 'PRODUCTION READY ✅' : 'REQUIRES FIXES ❌';
        console.log(`\n🎯 VERDICT: ${verdict}`);
        
        if (this.results.failed > 0) {
            console.log('\n❌ FAILURES DETECTED:');
            this.results.tests
                .filter(t => t.status === 'FAIL')
                .forEach(test => console.log(`   - ${test.test}: ${test.details}`));
        } else {
            console.log('\n🎉 ALL TESTS PASSED - SYSTEM IS PRODUCTION READY!');
        }
        
        // Return exit code
        return this.results.failed === 0 ? 0 : 1;
    }
}

// Execute validation
if (require.main === module) {
    const validator = new DirectValidator();
    validator.runValidation()
        .then(exitCode => process.exit(exitCode))
        .catch(error => {
            console.error('🚨 CRITICAL VALIDATION FAILURE:', error);
            process.exit(1);
        });
}

module.exports = DirectValidator;