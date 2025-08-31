#!/usr/bin/env node

/**
 * Backend Port Verification and Connection Test
 * Verifies correct backend port and establishes proper connection
 */

const net = require('net');
const http = require('http');
const WebSocket = require('ws');

class BackendPortVerifier {
    constructor() {
        this.potentialPorts = [3000, 3001, 8080, 5173];
        this.results = {};
    }

    async checkPort(port) {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve({ port, available: false, error: 'timeout' });
            }, 2000);

            const socket = net.createConnection(port, 'localhost');
            
            socket.on('connect', () => {
                clearTimeout(timeout);
                socket.end();
                resolve({ port, available: true, type: 'tcp' });
            });
            
            socket.on('error', (error) => {
                clearTimeout(timeout);
                resolve({ port, available: false, error: error.code });
            });
        });
    }

    async checkHttpEndpoint(port) {
        return new Promise((resolve) => {
            const req = http.request({
                hostname: 'localhost',
                port: port,
                path: '/',
                method: 'GET',
                timeout: 2000
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        port,
                        httpResponse: true,
                        statusCode: res.statusCode,
                        headers: res.headers,
                        bodyPreview: data.substring(0, 200)
                    });
                });
            });

            req.on('error', (error) => {
                resolve({
                    port,
                    httpResponse: false,
                    error: error.message
                });
            });

            req.end();
        });
    }

    async checkWebSocketEndpoint(port) {
        return new Promise((resolve) => {
            const ws = new WebSocket(`ws://localhost:${port}`);
            const timeout = setTimeout(() => {
                ws.terminate();
                resolve({
                    port,
                    webSocketSupport: false,
                    error: 'connection timeout'
                });
            }, 3000);

            ws.on('open', () => {
                clearTimeout(timeout);
                ws.close();
                resolve({
                    port,
                    webSocketSupport: true,
                    readyState: ws.readyState
                });
            });

            ws.on('error', (error) => {
                clearTimeout(timeout);
                resolve({
                    port,
                    webSocketSupport: false,
                    error: error.message
                });
            });
        });
    }

    async checkClaudeAPI(port) {
        return new Promise((resolve) => {
            const req = http.request({
                hostname: 'localhost',
                port: port,
                path: '/api/claude/instances',
                method: 'GET',
                timeout: 3000
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({
                            port,
                            claudeAPI: true,
                            statusCode: res.statusCode,
                            instances: parsed
                        });
                    } catch (e) {
                        resolve({
                            port,
                            claudeAPI: true,
                            statusCode: res.statusCode,
                            rawResponse: data.substring(0, 200)
                        });
                    }
                });
            });

            req.on('error', (error) => {
                resolve({
                    port,
                    claudeAPI: false,
                    error: error.message
                });
            });

            req.end();
        });
    }

    async runFullVerification() {
        console.log('🔍 Starting comprehensive backend port verification...\n');

        for (const port of this.potentialPorts) {
            console.log(`📡 Checking port ${port}...`);
            
            const portCheck = await this.checkPort(port);
            const httpCheck = await this.checkHttpEndpoint(port);
            const wsCheck = await this.checkWebSocketEndpoint(port);
            const claudeCheck = await this.checkClaudeAPI(port);

            this.results[port] = {
                portCheck,
                httpCheck,
                wsCheck,
                claudeCheck,
                summary: this.generatePortSummary(portCheck, httpCheck, wsCheck, claudeCheck)
            };

            console.log(`  ${this.results[port].summary}\n`);
        }

        return this.generateFinalReport();
    }

    generatePortSummary(portCheck, httpCheck, wsCheck, claudeCheck) {
        const indicators = [];
        
        if (portCheck.available) indicators.push('✅ TCP');
        else indicators.push('❌ TCP');
        
        if (httpCheck.httpResponse) indicators.push('✅ HTTP');
        else indicators.push('❌ HTTP');
        
        if (wsCheck.webSocketSupport) indicators.push('✅ WebSocket');
        else indicators.push('❌ WebSocket');
        
        if (claudeCheck.claudeAPI) indicators.push('✅ Claude API');
        else indicators.push('❌ Claude API');
        
        return indicators.join(' | ');
    }

    generateFinalReport() {
        const report = {
            timestamp: new Date().toISOString(),
            results: this.results,
            recommendations: [],
            correctBackendPort: null
        };

        // Find the correct backend port
        for (const [port, result] of Object.entries(this.results)) {
            if (result.wsCheck.webSocketSupport && result.claudeCheck.claudeAPI) {
                report.correctBackendPort = parseInt(port);
                report.recommendations.push(`✅ Use port ${port} for Claude WebSocket connections`);
                break;
            }
        }

        if (!report.correctBackendPort) {
            // Find partial matches
            for (const [port, result] of Object.entries(this.results)) {
                if (result.wsCheck.webSocketSupport) {
                    report.recommendations.push(`⚠️ Port ${port} has WebSocket support but no Claude API`);
                }
                if (result.claudeCheck.claudeAPI) {
                    report.recommendations.push(`⚠️ Port ${port} has Claude API but no WebSocket support`);
                }
            }
            
            if (report.recommendations.length === 0) {
                report.recommendations.push('❌ No suitable backend port found');
                report.recommendations.push('🔧 Check if backend service is running');
            }
        }

        return report;
    }

    async testCorrectConnection() {
        const verification = await this.runFullVerification();
        
        if (verification.correctBackendPort) {
            console.log(`🎯 Testing connection to correct port: ${verification.correctBackendPort}`);
            
            return new Promise((resolve) => {
                const ws = new WebSocket(`ws://localhost:${verification.correctBackendPort}`);
                
                ws.on('open', () => {
                    console.log('✅ WebSocket connection successful');
                    
                    // Send test message
                    const testMessage = JSON.stringify({
                        type: 'message',
                        instanceName: 'claude-3874 (prod/claude)',
                        message: 'hello test'
                    });
                    
                    console.log('📤 Sending test message...');
                    ws.send(testMessage);
                    
                    setTimeout(() => {
                        ws.close();
                        resolve({ success: true, port: verification.correctBackendPort });
                    }, 5000);
                });

                ws.on('message', (data) => {
                    console.log(`📬 Received response: ${data.toString().substring(0, 200)}...`);
                });

                ws.on('error', (error) => {
                    console.log(`❌ Connection test failed: ${error.message}`);
                    resolve({ success: false, error: error.message });
                });
            });
        } else {
            console.log('❌ No suitable backend port found for testing');
            return { success: false, error: 'No suitable port found' };
        }
    }
}

// Run verification if called directly
if (require.main === module) {
    const verifier = new BackendPortVerifier();
    
    verifier.testCorrectConnection().then(result => {
        console.log('\n📊 Connection Test Result:', result);
        
        if (result.success) {
            console.log(`\n✅ Backend is accessible on port ${result.port}`);
            console.log('You can now run the main WebSocket tests.');
        } else {
            console.log('\n❌ Backend connection failed');
            console.log('Check backend service status and port configuration.');
        }
        
        process.exit(result.success ? 0 : 1);
    }).catch(error => {
        console.error('💥 Verification failed:', error);
        process.exit(1);
    });
}

module.exports = BackendPortVerifier;