/**
 * Mock WebSocket Server for Testing Connection Stability
 * Simulates various server behaviors and failure conditions
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

class MockWebSocketServer extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            port: options.port || 8080,
            host: options.host || 'localhost',
            
            // Behavior configuration
            enableThirtySecondTimeout: options.enableThirtySecondTimeout !== false,
            thirtySecondTimeoutRate: options.thirtySecondTimeoutRate || 0.3, // 30% of connections
            
            enableRandomDrops: options.enableRandomDrops !== false,
            randomDropRate: options.randomDropRate || 0.1, // 10% random drops
            
            enableMemoryLeak: options.enableMemoryLeak || false,
            memoryLeakRate: options.memoryLeakRate || 1024, // bytes per connection
            
            enableSlowResponses: options.enableSlowResponses || false,
            slowResponseRate: options.slowResponseRate || 0.2, // 20% slow responses
            slowResponseDelay: options.slowResponseDelay || 5000, // 5 seconds
            
            enableApiSimulation: options.enableApiSimulation !== false,
            apiResponseDelay: options.apiResponseDelay || 1000, // 1 second
            
            maxConnections: options.maxConnections || 100,
            ...options
        };
        
        this.server = null;
        this.connections = new Map();
        this.isRunning = false;
        
        // Statistics
        this.stats = {
            totalConnections: 0,
            activeConnections: 0,
            thirtySecondDrops: 0,
            randomDrops: 0,
            normalCloses: 0,
            apiCallsProcessed: 0,
            messagesProcessed: 0,
            bytesProcessed: 0
        };
        
        // Simulated memory leak
        this.memoryWaste = [];
        
        // Connection timeouts
        this.thirtySecondTimeouts = new Map();
        this.randomDropTimeouts = new Map();
    }

    /**
     * Start the mock server
     */
    async start() {
        return new Promise((resolve, reject) => {
            try {
                this.server = new WebSocket.Server({
                    port: this.options.port,
                    host: this.options.host
                });
                
                this.server.on('listening', () => {
                    this.isRunning = true;
                    console.log(`🔌 Mock WebSocket Server started on ${this.options.host}:${this.options.port}`);
                    console.log(`   30s timeout: ${this.options.enableThirtySecondTimeout} (${this.options.thirtySecondTimeoutRate * 100}%)`);
                    console.log(`   Random drops: ${this.options.enableRandomDrops} (${this.options.randomDropRate * 100}%)`);
                    console.log(`   Memory leak: ${this.options.enableMemoryLeak}`);
                    console.log(`   Slow responses: ${this.options.enableSlowResponses}`);
                    
                    this.emit('server:started');
                    resolve();
                });
                
                this.server.on('connection', (ws, request) => {
                    this.handleConnection(ws, request);
                });
                
                this.server.on('error', (error) => {
                    console.error('Mock server error:', error);
                    this.emit('server:error', error);
                    reject(error);
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Handle new WebSocket connection
     */
    handleConnection(ws, request) {
        const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const connectionStart = Date.now();
        
        // Check connection limit
        if (this.connections.size >= this.options.maxConnections) {
            console.log(`🚫 Connection limit reached, rejecting ${connectionId}`);
            ws.close(1013, 'Server overloaded');
            return;
        }
        
        const connectionData = {
            id: connectionId,
            ws: ws,
            startTime: connectionStart,
            messagesReceived: 0,
            messagesSent: 0,
            bytesReceived: 0,
            bytesSent: 0,
            lastActivity: connectionStart,
            userAgent: request.headers['user-agent'],
            remoteAddress: request.socket.remoteAddress
        };
        
        this.connections.set(connectionId, connectionData);
        this.stats.totalConnections++;
        this.stats.activeConnections++;
        
        console.log(`✅ New connection: ${connectionId} (${this.stats.activeConnections} active)`);
        
        // Simulate memory leak if enabled
        if (this.options.enableMemoryLeak) {
            // Allocate memory that won't be freed
            const wastedMemory = Buffer.alloc(this.options.memoryLeakRate);
            wastedMemory.fill('x');
            this.memoryWaste.push(wastedMemory);
        }
        
        // Set up 30-second timeout if enabled
        if (this.options.enableThirtySecondTimeout && Math.random() < this.options.thirtySecondTimeoutRate) {
            const timeout = setTimeout(() => {
                if (connectionData.ws.readyState === WebSocket.OPEN) {
                    console.log(`⏰ 30-second timeout triggered for ${connectionId}`);
                    this.stats.thirtySecondDrops++;
                    connectionData.ws.close(1000, 'Thirty second timeout simulation');
                }
                this.thirtySecondTimeouts.delete(connectionId);
            }, 30000 + Math.random() * 5000); // 30-35 seconds
            
            this.thirtySecondTimeouts.set(connectionId, timeout);
        }
        
        // Set up random drop timeout if enabled
        if (this.options.enableRandomDrops && Math.random() < this.options.randomDropRate) {
            const dropTime = Math.random() * 120000 + 10000; // 10-130 seconds
            const timeout = setTimeout(() => {
                if (connectionData.ws.readyState === WebSocket.OPEN) {
                    console.log(`🎲 Random drop triggered for ${connectionId} after ${Math.round(dropTime/1000)}s`);
                    this.stats.randomDrops++;
                    connectionData.ws.close(1000, 'Random drop simulation');
                }
                this.randomDropTimeouts.delete(connectionId);
            }, dropTime);
            
            this.randomDropTimeouts.set(connectionId, timeout);
        }
        
        // Handle incoming messages
        ws.on('message', (data) => {
            this.handleMessage(connectionData, data);
        });
        
        // Handle ping frames
        ws.on('ping', (data) => {
            connectionData.lastActivity = Date.now();
            ws.pong(data);
        });
        
        // Handle pong frames
        ws.on('pong', (data) => {
            connectionData.lastActivity = Date.now();
        });
        
        // Handle connection close
        ws.on('close', (code, reason) => {
            this.handleConnectionClose(connectionData, code, reason);
        });
        
        // Handle connection error
        ws.on('error', (error) => {
            console.error(`❌ Connection error for ${connectionId}:`, error.message);
            this.handleConnectionClose(connectionData, 1006, error.message);
        });
        
        // Send welcome message
        this.sendMessage(connectionData, {
            type: 'welcome',
            connectionId: connectionId,
            timestamp: Date.now(),
            serverInfo: {
                thirtySecondTimeout: this.options.enableThirtySecondTimeout,
                randomDrops: this.options.enableRandomDrops,
                memoryLeak: this.options.enableMemoryLeak
            }
        });
        
        this.emit('connection:established', connectionData);
    }

    /**
     * Handle incoming message
     */
    async handleMessage(connectionData, data) {
        try {
            connectionData.messagesReceived++;
            connectionData.bytesReceived += data.length;
            connectionData.lastActivity = Date.now();
            this.stats.messagesProcessed++;
            this.stats.bytesProcessed += data.length;
            
            let message;
            try {
                message = JSON.parse(data.toString());
            } catch (error) {
                // Handle non-JSON messages
                message = { type: 'raw', data: data.toString() };
            }
            
            console.log(`📨 Message from ${connectionData.id}: ${message.type || 'raw'}`);
            
            // Simulate slow response if enabled
            const isSlowResponse = this.options.enableSlowResponses && 
                Math.random() < this.options.slowResponseRate;
            
            const responseDelay = isSlowResponse ? 
                this.options.slowResponseDelay : 
                this.options.apiResponseDelay;
            
            if (isSlowResponse) {
                console.log(`🐌 Slow response triggered for ${connectionData.id} (${responseDelay}ms delay)`);
            }
            
            // Process message after delay
            setTimeout(() => {
                this.processMessage(connectionData, message);
            }, Math.random() * responseDelay);
            
        } catch (error) {
            console.error(`Error handling message from ${connectionData.id}:`, error);
            this.sendMessage(connectionData, {
                type: 'error',
                message: 'Failed to process message',
                error: error.message,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Process different types of messages
     */
    processMessage(connectionData, message) {
        if (connectionData.ws.readyState !== WebSocket.OPEN) {
            return; // Connection closed while processing
        }
        
        switch (message.type) {
            case 'simple':
                this.handleSimpleMessage(connectionData, message);
                break;
                
            case 'complex':
                this.handleComplexMessage(connectionData, message);
                break;
                
            case 'claude_api':
                this.handleClaudeApiMessage(connectionData, message);
                break;
                
            case 'ping':
                this.handlePingMessage(connectionData, message);
                break;
                
            default:
                this.handleUnknownMessage(connectionData, message);
                break;
        }
    }

    /**
     * Handle simple message
     */
    handleSimpleMessage(connectionData, message) {
        this.sendMessage(connectionData, {
            type: 'simple_response',
            id: message.id,
            echo: message.data,
            timestamp: Date.now(),
            processingTime: Math.random() * 100
        });
    }

    /**
     * Handle complex message
     */
    handleComplexMessage(connectionData, message) {
        // Simulate processing time based on payload size
        const processingTime = Math.max(100, message.data?.length / 10 || 100);
        
        this.sendMessage(connectionData, {
            type: 'complex_response',
            id: message.id,
            result: {
                processed: true,
                dataLength: message.data?.length || 0,
                analysis: 'Complex data processed successfully'
            },
            timestamp: Date.now(),
            processingTime: processingTime
        });
    }

    /**
     * Handle Claude API simulation
     */
    handleClaudeApiMessage(connectionData, message) {
        this.stats.apiCallsProcessed++;
        
        // Simulate Claude API processing
        const simulatedResponse = {
            type: 'claude_api_response',
            id: message.id,
            response: {
                content: `Processed prompt: "${message.prompt?.substring(0, 50)}..."`,
                tokensUsed: Math.floor(Math.random() * 1000) + 100,
                model: 'claude-3-sonnet',
                usage: {
                    inputTokens: Math.floor(Math.random() * 500) + 50,
                    outputTokens: Math.floor(Math.random() * 300) + 30
                }
            },
            timestamp: Date.now(),
            processingTime: Math.random() * 2000 + 500 // 0.5-2.5 seconds
        };
        
        this.sendMessage(connectionData, simulatedResponse);
        
        // Occasionally trigger connection issues after Claude API calls
        if (Math.random() < 0.05) { // 5% chance
            setTimeout(() => {
                if (connectionData.ws.readyState === WebSocket.OPEN) {
                    console.log(`🤖 Claude API call triggered connection issue for ${connectionData.id}`);
                    connectionData.ws.close(1011, 'Server error after API call');
                }
            }, Math.random() * 3000 + 1000); // 1-4 seconds after response
        }
    }

    /**
     * Handle ping message
     */
    handlePingMessage(connectionData, message) {
        this.sendMessage(connectionData, {
            type: 'pong',
            id: message.id,
            timestamp: Date.now(),
            serverTime: Date.now(),
            connectionUptime: Date.now() - connectionData.startTime
        });
    }

    /**
     * Handle unknown message type
     */
    handleUnknownMessage(connectionData, message) {
        this.sendMessage(connectionData, {
            type: 'unknown_message_type',
            originalType: message.type,
            timestamp: Date.now(),
            message: 'Unknown message type received'
        });
    }

    /**
     * Send message to connection
     */
    sendMessage(connectionData, message) {
        if (connectionData.ws.readyState !== WebSocket.OPEN) {
            return false;
        }
        
        try {
            const messageStr = JSON.stringify(message);
            connectionData.ws.send(messageStr);
            connectionData.messagesSent++;
            connectionData.bytesSent += messageStr.length;
            return true;
        } catch (error) {
            console.error(`Failed to send message to ${connectionData.id}:`, error);
            return false;
        }
    }

    /**
     * Handle connection close
     */
    handleConnectionClose(connectionData, code, reason) {
        const connectionDuration = Date.now() - connectionData.startTime;
        
        console.log(`🔌 Connection ${connectionData.id} closed: code=${code}, reason="${reason}", duration=${Math.round(connectionDuration/1000)}s`);
        
        // Clean up timeouts
        const thirtySecondTimeout = this.thirtySecondTimeouts.get(connectionData.id);
        if (thirtySecondTimeout) {
            clearTimeout(thirtySecondTimeout);
            this.thirtySecondTimeouts.delete(connectionData.id);
        }
        
        const randomTimeout = this.randomDropTimeouts.get(connectionData.id);
        if (randomTimeout) {
            clearTimeout(randomTimeout);
            this.randomDropTimeouts.delete(connectionData.id);
        }
        
        // Update statistics
        this.stats.activeConnections--;
        if (code === 1000) {
            this.stats.normalCloses++;
        }
        
        // Remove from connections map
        this.connections.delete(connectionData.id);
        
        this.emit('connection:closed', {
            ...connectionData,
            closeCode: code,
            closeReason: reason?.toString(),
            duration: connectionDuration
        });
    }

    /**
     * Get server statistics
     */
    getStats() {
        return {
            ...this.stats,
            memoryWasteSize: this.memoryWaste.length * this.options.memoryLeakRate,
            activeTimeouts: {
                thirtySecond: this.thirtySecondTimeouts.size,
                randomDrop: this.randomDropTimeouts.size
            },
            connections: Array.from(this.connections.values()).map(conn => ({
                id: conn.id,
                duration: Date.now() - conn.startTime,
                messagesReceived: conn.messagesReceived,
                messagesSent: conn.messagesSent,
                bytesReceived: conn.bytesReceived,
                bytesSent: conn.bytesSent
            }))
        };
    }

    /**
     * Broadcast message to all connections
     */
    broadcast(message) {
        const messageStr = JSON.stringify(message);
        let sent = 0;
        
        for (const connectionData of this.connections.values()) {
            if (this.sendMessage(connectionData, message)) {
                sent++;
            }
        }
        
        return sent;
    }

    /**
     * Trigger emergency shutdown simulation
     */
    triggerEmergencyShutdown(reason = 'Emergency shutdown simulation') {
        console.log(`🚨 Triggering emergency shutdown: ${reason}`);
        
        for (const connectionData of this.connections.values()) {
            if (connectionData.ws.readyState === WebSocket.OPEN) {
                connectionData.ws.close(1011, reason);
            }
        }
        
        this.emit('emergency:shutdown', { reason });
    }

    /**
     * Simulate server overload
     */
    simulateServerOverload(duration = 30000) {
        console.log(`⚡ Simulating server overload for ${duration}ms`);
        
        const originalMaxConnections = this.options.maxConnections;
        this.options.maxConnections = Math.floor(this.connections.size / 2);
        
        // Close some random connections
        const connectionsArray = Array.from(this.connections.values());
        const connectionsToClose = connectionsArray.slice(0, Math.floor(connectionsArray.length / 3));
        
        for (const connectionData of connectionsToClose) {
            if (connectionData.ws.readyState === WebSocket.OPEN) {
                connectionData.ws.close(1013, 'Server overloaded');
            }
        }
        
        // Restore after duration
        setTimeout(() => {
            this.options.maxConnections = originalMaxConnections;
            console.log(`✅ Server overload simulation ended`);
        }, duration);
        
        this.emit('server:overload', { duration, connectionsDropped: connectionsToClose.length });
    }

    /**
     * Stop the server
     */
    async stop() {
        if (!this.isRunning) return;
        
        console.log('🛑 Stopping Mock WebSocket Server...');
        
        // Clear all timeouts
        for (const timeout of this.thirtySecondTimeouts.values()) {
            clearTimeout(timeout);
        }
        for (const timeout of this.randomDropTimeouts.values()) {
            clearTimeout(timeout);
        }
        
        this.thirtySecondTimeouts.clear();
        this.randomDropTimeouts.clear();
        
        // Close all connections
        for (const connectionData of this.connections.values()) {
            if (connectionData.ws.readyState === WebSocket.OPEN) {
                connectionData.ws.close(1001, 'Server shutting down');
            }
        }
        
        // Close server
        return new Promise((resolve) => {
            this.server.close(() => {
                this.isRunning = false;
                console.log('✅ Mock WebSocket Server stopped');
                this.emit('server:stopped');
                resolve();
            });
        });
    }
}

module.exports = MockWebSocketServer;