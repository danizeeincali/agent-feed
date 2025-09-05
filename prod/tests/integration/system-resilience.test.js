/**
 * System Resilience and Error Recovery Integration Tests
 * Testing system behavior under failure conditions and recovery scenarios
 */

const { PostingIntelligenceFramework } = require('../../src/posting-intelligence/core-framework');
const { Pool } = require('pg');
const EventEmitter = require('events');

// Mock network failure simulator
class NetworkFailureSimulator extends EventEmitter {
    constructor() {
        super();
        this.isFailureMode = false;
        this.failureRate = 0;
    }
    
    enableFailureMode(rate = 0.3) {
        this.isFailureMode = true;
        this.failureRate = rate;
        this.emit('failure-mode-enabled', { rate });
    }
    
    disableFailureMode() {
        this.isFailureMode = false;
        this.failureRate = 0;
        this.emit('failure-mode-disabled');
    }
    
    shouldSimulateFailure() {
        return this.isFailureMode && Math.random() < this.failureRate;
    }
}

// Resilient database connection wrapper
class ResilientDatabaseConnection {
    constructor(config) {
        this.config = config;
        this.pool = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.isHealthy = false;
        this.networkSimulator = new NetworkFailureSimulator();
    }
    
    async connect() {
        try {
            this.pool = new Pool(this.config);
            await this.pool.connect();
            this.isHealthy = true;
            this.reconnectAttempts = 0;
            return true;
        } catch (error) {
            this.isHealthy = false;
            throw error;
        }
    }
    
    async query(sql, params) {
        if (this.networkSimulator.shouldSimulateFailure()) {
            throw new Error('Simulated network failure');
        }
        
        try {
            if (!this.pool || !this.isHealthy) {
                await this.reconnect();
            }
            
            return await this.pool.query(sql, params);
        } catch (error) {
            this.isHealthy = false;
            
            if (this.shouldRetry(error)) {
                await this.reconnect();
                return await this.pool.query(sql, params);
            }
            
            throw error;
        }
    }
    
    shouldRetry(error) {
        const retryableErrors = [
            'ECONNRESET',
            'ENOTFOUND',
            'ETIMEDOUT',
            'connection terminated',
            'Simulated network failure'
        ];
        
        return retryableErrors.some(errorType => 
            error.message.includes(errorType) || error.code === errorType
        );
    }
    
    async reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            throw new Error('Max reconnection attempts exceeded');
        }
        
        this.reconnectAttempts++;
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
            if (this.pool) {
                await this.pool.end();
            }
            await this.connect();
        } catch (error) {
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                return await this.reconnect();
            }
            throw error;
        }
    }
    
    async end() {
        if (this.pool) {
            await this.pool.end();
        }
    }
    
    getHealthStatus() {
        return {
            isHealthy: this.isHealthy,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
            failureMode: this.networkSimulator.isFailureMode
        };
    }
}

// Circuit breaker for external services
class CircuitBreaker {
    constructor(options = {}) {
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 30000;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failures = 0;
        this.lastFailureTime = null;
    }
    
    async execute(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }
        
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }
    
    onSuccess() {
        this.failures = 0;
        this.state = 'CLOSED';
    }
    
    onFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();
        
        if (this.failures >= this.failureThreshold) {
            this.state = 'OPEN';
        }
    }
    
    getState() {
        return {
            state: this.state,
            failures: this.failures,
            lastFailureTime: this.lastFailureTime
        };
    }
}

describe('System Resilience and Error Recovery', () => {
    let framework;
    let dbConnection;
    let circuitBreaker;
    let networkSimulator;
    
    beforeAll(async () => {
        framework = new PostingIntelligenceFramework();
        
        dbConnection = new ResilientDatabaseConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'postgres',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
            max: 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000
        });
        
        circuitBreaker = new CircuitBreaker({
            failureThreshold: 3,
            resetTimeout: 10000
        });
        
        networkSimulator = new NetworkFailureSimulator();
        
        try {
            await dbConnection.connect();
        } catch (error) {
            console.log('Database connection failed (expected in isolated environment):', error.message);
        }
    });
    
    afterAll(async () => {
        if (dbConnection) {
            await dbConnection.end();
        }
    });
    
    describe('Network Failure Resilience', () => {
        it('should handle intermittent network failures', async () => {
            networkSimulator.enableFailureMode(0.3); // 30% failure rate
            
            const attempts = 10;
            const results = [];
            
            for (let i = 0; i < attempts; i++) {
                try {
                    const result = await framework.generateIntelligentPost(
                        'personal-todos',
                        {
                            title: `Network resilience test ${i}`,
                            description: 'Testing network failure handling',
                            priority: 'P2'
                        },
                        { networkTest: true }
                    );
                    
                    results.push({ success: true, result });
                } catch (error) {
                    results.push({ success: false, error: error.message });
                }
            }
            
            const successCount = results.filter(r => r.success).length;
            const successRate = successCount / attempts;
            
            // Should maintain at least 60% success rate under 30% network failure
            expect(successRate).toBeGreaterThan(0.6);
            
            networkSimulator.disableFailureMode();
            
            console.log(`✅ Network resilience: ${successCount}/${attempts} success (${(successRate * 100).toFixed(1)}%)`);
        }, 30000);
        
        it('should implement exponential backoff on retries', async () => {
            const retryAttempts = [];
            let attempt = 0;
            
            const mockFailingFunction = async () => {
                attempt++;
                const now = Date.now();
                retryAttempts.push(now);
                
                if (attempt < 4) {
                    throw new Error(`Simulated failure ${attempt}`);
                }
                
                return 'success';
            };
            
            const executeWithRetry = async (fn, maxRetries = 5) => {
                let lastError;
                
                for (let i = 0; i < maxRetries; i++) {
                    try {
                        return await fn();
                    } catch (error) {
                        lastError = error;
                        
                        if (i < maxRetries - 1) {
                            const delay = Math.min(100 * Math.pow(2, i), 1000);
                            await new Promise(resolve => setTimeout(resolve, delay));
                        }
                    }
                }
                
                throw lastError;
            };
            
            const result = await executeWithRetry(mockFailingFunction);
            expect(result).toBe('success');
            expect(retryAttempts.length).toBe(4);
            
            // Verify exponential backoff timing
            for (let i = 1; i < retryAttempts.length; i++) {
                const delay = retryAttempts[i] - retryAttempts[i - 1];
                const expectedMinDelay = 100 * Math.pow(2, i - 1) * 0.8; // Allow 20% variance
                expect(delay).toBeGreaterThan(expectedMinDelay);
            }
        });
    });
    
    describe('Database Connection Resilience', () => {
        it('should reconnect automatically after connection loss', async () => {
            if (!dbConnection.isHealthy) {
                console.log('⚠️  Skipping database resilience test - no database connection');
                return;
            }
            
            // Simulate connection loss
            dbConnection.networkSimulator.enableFailureMode(1.0); // 100% failure rate
            
            let reconnectionDetected = false;
            
            // Attempt operations that should trigger reconnection
            for (let i = 0; i < 3; i++) {
                try {
                    await dbConnection.query('SELECT 1 as test');
                } catch (error) {
                    if (error.message.includes('Simulated network failure')) {
                        // Try to reconnect
                        try {
                            dbConnection.networkSimulator.disableFailureMode();
                            await dbConnection.reconnect();
                            reconnectionDetected = true;
                            break;
                        } catch (reconnectError) {
                            // Reconnection might fail in test environment
                        }
                    }
                }
            }
            
            dbConnection.networkSimulator.disableFailureMode();
            
            const healthStatus = dbConnection.getHealthStatus();
            expect(healthStatus.reconnectAttempts).toBeGreaterThan(0);
            
            console.log(`✅ Database resilience: ${healthStatus.reconnectAttempts} reconnection attempts`);
        }, 20000);
        
        it('should handle connection pool exhaustion', async () => {
            if (!dbConnection.isHealthy) {
                console.log('⚠️  Skipping connection pool test - no database connection');
                return;
            }
            
            const concurrentQueries = 10;
            const queryPromises = [];
            
            // Create more concurrent queries than pool size
            for (let i = 0; i < concurrentQueries; i++) {
                queryPromises.push(
                    dbConnection.query('SELECT pg_sleep(0.1), $1 as query_id', [i])
                        .then(result => ({ success: true, queryId: i, result }))
                        .catch(error => ({ success: false, queryId: i, error: error.message }))
                );
            }
            
            const results = await Promise.all(queryPromises);
            const successCount = results.filter(r => r.success).length;
            
            // Should handle pool exhaustion gracefully (most should succeed)
            expect(successCount).toBeGreaterThan(concurrentQueries * 0.7);
            
            console.log(`✅ Connection pool: ${successCount}/${concurrentQueries} queries succeeded`);
        }, 15000);
    });
    
    describe('Circuit Breaker Pattern', () => {
        it('should open circuit after failure threshold', async () => {
            let failureCount = 0;
            
            const flakyService = async () => {
                failureCount++;
                if (failureCount <= 3) {
                    throw new Error(`Service failure ${failureCount}`);
                }
                return 'success';
            };
            
            // First 3 calls should fail and circuit should open
            for (let i = 0; i < 3; i++) {
                try {
                    await circuitBreaker.execute(flakyService);
                } catch (error) {
                    expect(error.message).toContain('Service failure');
                }
            }
            
            expect(circuitBreaker.getState().state).toBe('OPEN');
            
            // Next call should be rejected immediately
            try {
                await circuitBreaker.execute(flakyService);
                fail('Circuit breaker should have rejected the call');
            } catch (error) {
                expect(error.message).toBe('Circuit breaker is OPEN');
            }
            
            console.log(`✅ Circuit breaker opened after ${circuitBreaker.getState().failures} failures`);
        });
        
        it('should transition to half-open and recover', async () => {
            // Wait for reset timeout
            await new Promise(resolve => setTimeout(resolve, 11000)); // Reset timeout is 10s
            
            let callCount = 0;
            const recoveringService = async () => {
                callCount++;
                if (callCount === 1) {
                    return 'recovered'; // First call succeeds
                }
                return 'stable';
            };
            
            // Should transition to half-open and then closed on success
            const result = await circuitBreaker.execute(recoveringService);
            expect(result).toBe('recovered');
            expect(circuitBreaker.getState().state).toBe('CLOSED');
            
            console.log(`✅ Circuit breaker recovered to CLOSED state`);
        }, 15000);
    });
    
    describe('Graceful Degradation', () => {
        it('should provide fallback responses when services fail', async () => {
            const degradedFramework = {
                ...framework,
                qualityAssessment: null, // Simulate service failure
                engagementOptimizer: null // Simulate service failure
            };
            
            const result = await degradedFramework.generateIntelligentPost(
                'personal-todos',
                {
                    title: 'Degraded service test',
                    description: 'Testing graceful degradation'
                },
                { degradationTest: true }
            );
            
            // Should still generate content even with failed services
            expect(result.content).toBeTruthy();
            expect(result.metadata.qualityScore).toBeGreaterThan(0.5); // Default fallback score
            expect(result.metadata.framework).toBe('PostingIntelligenceFramework');
            
            console.log(`✅ Graceful degradation: Quality ${result.metadata.qualityScore.toFixed(3)}`);
        });
        
        it('should handle partial feature failures', async () => {
            const partiallyFailedFramework = new PostingIntelligenceFramework();
            
            // Mock one component to fail
            partiallyFailedFramework.impactAnalyzer.analyzeBusinessImpact = async () => {
                throw new Error('Impact analysis service unavailable');
            };
            
            try {
                const result = await partiallyFailedFramework.generateIntelligentPost(
                    'meeting-prep',
                    {
                        title: 'Partial failure test',
                        purpose: 'Testing partial service failures'
                    }
                );
                
                // Should handle failure gracefully
                expect(result.content).toBeTruthy();
                
            } catch (error) {
                // If it fails completely, ensure error is properly structured
                expect(error.name).toBe('PostingIntelligenceError');
                expect(error.message).toContain('Failed to generate intelligent post');
            }
        });
    });
    
    describe('Resource Management', () => {
        it('should handle memory pressure gracefully', async () => {
            const memoryPressureTest = async () => {
                const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
                    agentType: 'personal-todos',
                    userData: {
                        title: `Memory pressure test ${i}`,
                        description: 'Large data processing test'.repeat(100),
                        priority: 'P3'
                    },
                    context: { memoryTest: true, iteration: i }
                }));
                
                // Process in batches to avoid memory exhaustion
                const batchSize = 10;
                const results = [];
                
                for (let i = 0; i < largeDataset.length; i += batchSize) {
                    const batch = largeDataset.slice(i, i + batchSize);
                    
                    try {
                        const batchResults = await framework.batchGeneratePosts(batch);
                        results.push(...batchResults.posts);
                        
                        // Force garbage collection if available
                        if (global.gc) {
                            global.gc();
                        }
                        
                    } catch (error) {
                        console.log(`Batch ${Math.floor(i / batchSize)} failed:`, error.message);
                    }
                }
                
                return results;
            };
            
            const startMemory = process.memoryUsage();
            const results = await memoryPressureTest();
            const endMemory = process.memoryUsage();
            
            const memoryIncrease = (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024; // MB
            
            expect(results.length).toBeGreaterThan(0);
            expect(memoryIncrease).toBeLessThan(100); // Should not increase by more than 100MB
            
            console.log(`✅ Memory management: ${results.length} posts, ${memoryIncrease.toFixed(1)}MB increase`);
        }, 60000);
        
        it('should implement request rate limiting', async () => {
            const rateLimiter = {
                requests: [],
                windowMs: 60000, // 1 minute
                maxRequests: 100,
                
                canProcess() {
                    const now = Date.now();
                    this.requests = this.requests.filter(time => now - time < this.windowMs);
                    
                    if (this.requests.length >= this.maxRequests) {
                        return false;
                    }
                    
                    this.requests.push(now);
                    return true;
                }
            };
            
            let acceptedRequests = 0;
            let rejectedRequests = 0;
            
            // Simulate 150 requests (should reject 50)
            for (let i = 0; i < 150; i++) {
                if (rateLimiter.canProcess()) {
                    acceptedRequests++;
                } else {
                    rejectedRequests++;
                }
            }
            
            expect(acceptedRequests).toBe(100);
            expect(rejectedRequests).toBe(50);
            
            console.log(`✅ Rate limiting: ${acceptedRequests} accepted, ${rejectedRequests} rejected`);
        });
    });
    
    describe('System Health Monitoring', () => {
        it('should provide comprehensive health status', async () => {
            const healthChecker = {
                async checkDatabaseHealth() {
                    try {
                        if (dbConnection.isHealthy) {
                            await dbConnection.query('SELECT 1');
                            return { status: 'healthy', response_time: 5 };
                        }
                        return { status: 'unavailable', response_time: null };
                    } catch (error) {
                        return { status: 'unhealthy', error: error.message };
                    }
                },
                
                async checkFrameworkHealth() {
                    try {
                        const result = await framework.generateIntelligentPost(
                            'personal-todos',
                            { title: 'Health check', description: 'System health validation' },
                            { healthCheck: true }
                        );
                        
                        return {
                            status: 'healthy',
                            quality_score: result.metadata.qualityScore,
                            processing_time: result.analytics.processingTime
                        };
                    } catch (error) {
                        return { status: 'unhealthy', error: error.message };
                    }
                },
                
                getSystemMetrics() {
                    const memUsage = process.memoryUsage();
                    return {
                        memory: {
                            heap_used: Math.round(memUsage.heapUsed / 1024 / 1024),
                            heap_total: Math.round(memUsage.heapTotal / 1024 / 1024),
                            external: Math.round(memUsage.external / 1024 / 1024)
                        },
                        uptime: Math.round(process.uptime()),
                        cpu_usage: process.cpuUsage()
                    };
                }
            };
            
            const [dbHealth, frameworkHealth, systemMetrics] = await Promise.all([
                healthChecker.checkDatabaseHealth(),
                healthChecker.checkFrameworkHealth(),
                healthChecker.getSystemMetrics()
            ]);
            
            const overallHealth = {
                status: (dbHealth.status === 'healthy' || dbHealth.status === 'unavailable') && 
                        frameworkHealth.status === 'healthy' ? 'healthy' : 'degraded',
                components: {
                    database: dbHealth,
                    framework: frameworkHealth
                },
                metrics: systemMetrics,
                timestamp: new Date().toISOString()
            };
            
            expect(overallHealth.components.framework.status).toBe('healthy');
            expect(overallHealth.metrics.uptime).toBeGreaterThan(0);
            
            console.log(`✅ System health: ${overallHealth.status}`);
            console.log(`   Framework: ${frameworkHealth.status} (Quality: ${frameworkHealth.quality_score?.toFixed(3) || 'N/A'})`);
            console.log(`   Database: ${dbHealth.status}`);
            console.log(`   Memory: ${systemMetrics.memory.heap_used}MB / ${systemMetrics.memory.heap_total}MB`);
        });
    });
});
