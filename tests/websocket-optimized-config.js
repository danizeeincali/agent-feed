/**
 * Optimized WebSocket Configuration for 100% Test Pass Rate
 * Based on bottleneck analysis and performance testing
 */

// Optimized Socket.IO client configuration
const OPTIMIZED_WEBSOCKET_CONFIG = {
    // Connection settings
    timeout: 20000,           // Increased from default 5s to 20s
    connectTimeout: 20000,    // Connection establishment timeout
    forceNew: true,          // Force new connection instead of reusing
    upgrade: true,           // Allow transport upgrade from polling to websocket
    
    // Transport configuration
    transports: ['polling', 'websocket'],  // Start with polling, upgrade to websocket
    
    // Reconnection settings
    reconnection: true,       // Enable automatic reconnection
    reconnectionAttempts: 5,  // Number of reconnection attempts
    reconnectionDelay: 1000,  // Initial delay between reconnections (1s)
    reconnectionDelayMax: 5000, // Maximum delay between reconnections (5s)
    randomizationFactor: 0.5, // Randomization factor for reconnection delay
    
    // Connection behavior
    autoConnect: false,       // Manual connection control for better error handling
    forceBase64: false,       // Allow binary data
    
    // Performance optimizations
    perMessageDeflate: false, // Disable compression for better performance
    httpCompression: false,   // Disable HTTP compression
    
    // Security settings
    withCredentials: false,   // No credentials needed for local testing
    
    // Development settings
    rejectUnauthorized: false // For self-signed certificates in dev
};

// Hub-specific configuration
const HUB_CONFIG = {
    url: 'http://localhost:3002',
    maxRetries: 3,
    retryDelay: 1000,
    healthCheckInterval: 30000,
    pingInterval: 25000,
    pongTimeout: 5000
};

// Performance monitoring configuration
const PERFORMANCE_CONFIG = {
    thresholds: {
        connectionTime: 100,     // ms
        messageLatency: 50,      // ms
        successRate: 0.95,       // 95%
        throughput: 1000,        // msg/sec
        concurrentConnections: 20 // minimum concurrent connections
    },
    
    monitoring: {
        enabled: true,
        logLevel: 'info',        // 'debug', 'info', 'warn', 'error'
        metricsCollection: true,
        performanceMarks: true
    }
};

// Error handling configuration
const ERROR_HANDLING_CONFIG = {
    maxConnectionRetries: 3,
    backoffStrategy: 'exponential', // 'linear', 'exponential'
    maxBackoffDelay: 30000,        // 30 seconds
    
    errorCategories: {
        connection: ['ECONNREFUSED', 'TIMEOUT', 'NETWORK_ERROR'],
        authentication: ['AUTH_FAILED', 'UNAUTHORIZED'],
        protocol: ['PARSE_ERROR', 'INVALID_MESSAGE'],
        server: ['SERVER_ERROR', 'SERVICE_UNAVAILABLE']
    },
    
    retryableErrors: ['ECONNREFUSED', 'TIMEOUT', 'NETWORK_ERROR', 'SERVER_ERROR'],
    
    fallbackBehavior: {
        usePollingOnly: false,    // Fallback to polling if websocket fails
        degradedMode: false,      // Reduce functionality if needed
        offlineMode: false        // Queue messages when offline
    }
};

// Test-specific configurations
const TEST_CONFIGS = {
    // Basic connection test
    basic: {
        ...OPTIMIZED_WEBSOCKET_CONFIG,
        timeout: 10000,
        reconnectionAttempts: 1
    },
    
    // Load testing configuration
    loadTest: {
        ...OPTIMIZED_WEBSOCKET_CONFIG,
        timeout: 30000,
        reconnectionAttempts: 0,  // No reconnection during load test
        forceNew: true
    },
    
    // Stress testing configuration
    stressTest: {
        ...OPTIMIZED_WEBSOCKET_CONFIG,
        timeout: 60000,
        reconnectionAttempts: 10,
        reconnectionDelay: 500,
        maxConnections: 100
    },
    
    // Development testing
    development: {
        ...OPTIMIZED_WEBSOCKET_CONFIG,
        timeout: 15000,
        transports: ['websocket'], // Direct websocket for dev
        forceNew: false            // Allow connection reuse in dev
    },
    
    // Production testing
    production: {
        ...OPTIMIZED_WEBSOCKET_CONFIG,
        timeout: 20000,
        reconnectionAttempts: 5,
        withCredentials: true,     // Enable credentials for production
        rejectUnauthorized: true   // Strict SSL in production
    }
};

// Utility functions for configuration management
class WebSocketConfigManager {
    static getConfig(environment = 'default') {
        const baseConfig = OPTIMIZED_WEBSOCKET_CONFIG;
        
        switch (environment) {
            case 'basic':
            case 'load':
            case 'stress':
            case 'development':
            case 'production':
                return { ...baseConfig, ...TEST_CONFIGS[environment] };
            default:
                return baseConfig;
        }
    }
    
    static createConnectionWithConfig(url, environment = 'default') {
        const { io } = require('socket.io-client');
        const config = this.getConfig(environment);
        
        console.log(`Creating WebSocket connection with ${environment} config:`, {
            url,
            timeout: config.timeout,
            transports: config.transports,
            reconnectionAttempts: config.reconnectionAttempts
        });
        
        return io(url, config);
    }
    
    static async connectWithRetry(url, environment = 'default', maxRetries = 3) {
        const config = this.getConfig(environment);
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const socket = this.createConnectionWithConfig(url, environment);
                
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        socket.disconnect();
                        reject(new Error(`Connection timeout after ${config.timeout}ms on attempt ${attempt}`));
                    }, config.timeout);
                    
                    socket.on('connect', () => {
                        clearTimeout(timeout);
                        console.log(`✅ Connected on attempt ${attempt}`);
                        resolve();
                    });
                    
                    socket.on('connect_error', (error) => {
                        clearTimeout(timeout);
                        console.log(`❌ Connection error on attempt ${attempt}:`, error.message);
                        reject(error);
                    });
                    
                    if (!socket.connected) {
                        socket.connect();
                    }
                });
                
                return socket;
            } catch (error) {
                console.log(`Attempt ${attempt}/${maxRetries} failed:`, error.message);
                
                if (attempt === maxRetries) {
                    throw new Error(`Failed to connect after ${maxRetries} attempts: ${error.message}`);
                }
                
                // Exponential backoff
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), ERROR_HANDLING_CONFIG.maxBackoffDelay);
                console.log(`Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    static validateConnection(socket) {
        if (!socket || !socket.connected) {
            throw new Error('Invalid or disconnected socket');
        }
        
        return {
            id: socket.id,
            connected: socket.connected,
            transport: socket.io.engine?.transport?.name || 'unknown'
        };
    }
}

module.exports = {
    OPTIMIZED_WEBSOCKET_CONFIG,
    HUB_CONFIG,
    PERFORMANCE_CONFIG,
    ERROR_HANDLING_CONFIG,
    TEST_CONFIGS,
    WebSocketConfigManager
};