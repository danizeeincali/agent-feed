# Metadata Extraction Best Practices Guide

## Production Deployment Best Practices

This guide provides comprehensive best practices for deploying metadata extraction systems in production environments, focusing on reliability, performance, security, and maintainability.

## 1. Architecture Design Principles

### Microservice Architecture
```javascript
// Recommended service separation
const services = {
  metadataExtractor: 'Core extraction logic',
  platformHandlers: 'Platform-specific processing',
  cacheManager: 'Multi-layer caching',
  rateLimiter: 'Request throttling',
  analytics: 'Usage tracking and monitoring'
};
```

### Layered Caching Strategy
```
┌─────────────────┐
│   Application   │
├─────────────────┤
│   Redis Cache   │ ← 1 hour TTL
├─────────────────┤
│ Database Cache  │ ← 24 hour TTL
├─────────────────┤
│   CDN Cache     │ ← Images only
└─────────────────┘
```

## 2. Performance Optimization

### Connection Pooling
```javascript
// HTTP Agent with connection pooling
import { Agent } from 'https';

const httpsAgent = new Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 15000,
  freeSocketTimeout: 30000
});

const fetchWithPool = (url, options = {}) => {
  return fetch(url, {
    ...options,
    agent: httpsAgent
  });
};
```

### Request Batching
```javascript
class BatchProcessor {
  constructor(batchSize = 10, delay = 1000) {
    this.queue = [];
    this.batchSize = batchSize;
    this.delay = delay;
    this.processing = false;
  }
  
  async add(url) {
    return new Promise((resolve, reject) => {
      this.queue.push({ url, resolve, reject });
      this.scheduleProcessing();
    });
  }
  
  scheduleProcessing() {
    if (!this.processing && this.queue.length > 0) {
      this.processing = true;
      setTimeout(() => this.processBatch(), this.delay);
    }
  }
  
  async processBatch() {
    const batch = this.queue.splice(0, this.batchSize);
    
    try {
      const results = await Promise.allSettled(
        batch.map(item => this.extractMetadata(item.url))
      );
      
      results.forEach((result, index) => {
        const { resolve, reject } = batch[index];
        if (result.status === 'fulfilled') {
          resolve(result.value);
        } else {
          reject(result.reason);
        }
      });
    } catch (error) {
      batch.forEach(({ reject }) => reject(error));
    }
    
    this.processing = false;
    if (this.queue.length > 0) {
      this.scheduleProcessing();
    }
  }
}
```

### Memory Management
```javascript
class MemoryEfficientExtractor {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 10000;
    this.memoryThreshold = 500 * 1024 * 1024; // 500MB
  }
  
  checkMemoryUsage() {
    const usage = process.memoryUsage();
    if (usage.heapUsed > this.memoryThreshold) {
      console.warn(`⚠️ High memory usage: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
      this.clearCache();
      global.gc && global.gc(); // Force garbage collection if available
    }
  }
  
  clearCache() {
    const sizeBefore = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ Cleared ${sizeBefore} cache entries due to memory pressure`);
  }
  
  addToCache(key, value) {
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest 25% of entries
      const keysToRemove = Array.from(this.cache.keys()).slice(0, Math.floor(this.maxCacheSize * 0.25));
      keysToRemove.forEach(key => this.cache.delete(key));
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 0
    });
  }
}
```

## 3. Error Handling & Resilience

### Circuit Breaker Pattern
```javascript
class CircuitBreaker {
  constructor(threshold = 5, resetTimeout = 60000) {
    this.threshold = threshold;
    this.resetTimeout = resetTimeout;
    this.failureCount = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = 0;
  }
  
  async call(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      console.warn(`🚨 Circuit breaker opened after ${this.failureCount} failures`);
    }
  }
}
```

### Graceful Degradation
```javascript
class GracefulMetadataExtractor {
  constructor() {
    this.strategies = [
      { name: 'primary', handler: this.extractFullMetadata.bind(this) },
      { name: 'secondary', handler: this.extractBasicMetadata.bind(this) },
      { name: 'fallback', handler: this.generateMinimalMetadata.bind(this) }
    ];
  }
  
  async extract(url) {
    let lastError;
    
    for (const strategy of this.strategies) {
      try {
        console.log(`🔄 Trying ${strategy.name} strategy for: ${url}`);
        const result = await strategy.handler(url);
        
        if (this.isValidResult(result)) {
          result.strategy_used = strategy.name;
          return result;
        }
      } catch (error) {
        console.warn(`❌ ${strategy.name} strategy failed:`, error.message);
        lastError = error;
      }
    }
    
    throw new Error(`All extraction strategies failed. Last error: ${lastError?.message}`);
  }
  
  isValidResult(result) {
    return result && 
           result.title && 
           result.title.length > 0 && 
           result.title !== 'Unknown Website';
  }
  
  async extractFullMetadata(url) {
    // Full extraction with all features
    return this.enhancedLinkPreviewService.getLinkPreview(url);
  }
  
  async extractBasicMetadata(url) {
    // Basic HTML parsing only
    const response = await fetch(url, { timeout: 5000 });
    const html = await response.text();
    return this.parseBasicHTML(html, url);
  }
  
  async generateMinimalMetadata(url) {
    // Minimal fallback based on URL
    const domain = new URL(url).hostname;
    return {
      title: domain,
      description: `Content from ${domain}`,
      image: null,
      type: 'website',
      fallback: true
    };
  }
}
```

## 4. Security Best Practices

### Input Validation & Sanitization
```javascript
class SecureMetadataExtractor {
  constructor() {
    this.allowedProtocols = ['http:', 'https:'];
    this.blockedDomains = new Set([
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '[::]'
    ]);
    this.maxUrlLength = 2048;
    this.maxContentLength = 10 * 1024 * 1024; // 10MB
  }
  
  validateUrl(url) {
    // Length check
    if (url.length > this.maxUrlLength) {
      throw new Error('URL too long');
    }
    
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      throw new Error('Invalid URL format');
    }
    
    // Protocol check
    if (!this.allowedProtocols.includes(parsedUrl.protocol)) {
      throw new Error('Unsupported protocol');
    }
    
    // Domain check
    if (this.blockedDomains.has(parsedUrl.hostname)) {
      throw new Error('Blocked domain');
    }
    
    // Private IP range check
    if (this.isPrivateIP(parsedUrl.hostname)) {
      throw new Error('Private IP addresses not allowed');
    }
    
    return parsedUrl.href;
  }
  
  isPrivateIP(hostname) {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./, // Link-local
      /^fc00:/, // IPv6 private
      /^fe80:/ // IPv6 link-local
    ];
    
    return privateRanges.some(range => range.test(hostname));
  }
  
  sanitizeContent(content, maxLength = 1000) {
    if (!content || typeof content !== 'string') {
      return '';
    }
    
    return content
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, maxLength);
  }
  
  validateImageUrl(url) {
    if (!url) return null;
    
    try {
      const parsedUrl = new URL(url);
      
      // Only allow HTTP(S)
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return null;
      }
      
      // Check for common image extensions
      const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i;
      if (!imageExtensions.test(parsedUrl.pathname) && !url.includes('image')) {
        return null;
      }
      
      return parsedUrl.href;
    } catch {
      return null;
    }
  }
}
```

### Rate Limiting with IP-based Tracking
```javascript
class AdvancedRateLimit {
  constructor() {
    this.requests = new Map(); // IP -> request history
    this.globalRequests = [];
    this.limits = {
      perIP: { requests: 100, window: 60 * 60 * 1000 }, // 100/hour per IP
      global: { requests: 10000, window: 60 * 60 * 1000 } // 10k/hour globally
    };
  }
  
  async checkLimit(clientIP) {
    const now = Date.now();
    
    // Check global limit
    this.globalRequests = this.globalRequests.filter(
      time => now - time < this.limits.global.window
    );
    
    if (this.globalRequests.length >= this.limits.global.requests) {
      throw new Error('Global rate limit exceeded');
    }
    
    // Check per-IP limit
    if (!this.requests.has(clientIP)) {
      this.requests.set(clientIP, []);
    }
    
    const ipRequests = this.requests.get(clientIP);
    const recentRequests = ipRequests.filter(
      time => now - time < this.limits.perIP.window
    );
    
    if (recentRequests.length >= this.limits.perIP.requests) {
      throw new Error(`Rate limit exceeded for IP: ${clientIP}`);
    }
    
    // Record the request
    recentRequests.push(now);
    this.requests.set(clientIP, recentRequests);
    this.globalRequests.push(now);
  }
  
  getStats(clientIP) {
    const now = Date.now();
    const ipRequests = this.requests.get(clientIP) || [];
    const recentRequests = ipRequests.filter(
      time => now - time < this.limits.perIP.window
    );
    
    return {
      requests_made: recentRequests.length,
      requests_remaining: this.limits.perIP.requests - recentRequests.length,
      reset_time: Math.min(...recentRequests) + this.limits.perIP.window
    };
  }
}
```

## 5. Monitoring & Analytics

### Comprehensive Metrics Collection
```javascript
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        failure: 0,
        by_platform: {},
        by_status: {}
      },
      performance: {
        avg_response_time: 0,
        p95_response_time: 0,
        response_times: []
      },
      errors: {},
      cache: {
        hits: 0,
        misses: 0,
        hit_rate: 0
      }
    };
  }
  
  recordRequest(platform, success, responseTime, error = null) {
    this.metrics.requests.total++;
    
    if (success) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.failure++;
      if (error) {
        const errorKey = error.message || 'unknown_error';
        this.metrics.errors[errorKey] = (this.metrics.errors[errorKey] || 0) + 1;
      }
    }
    
    // Platform tracking
    if (!this.metrics.requests.by_platform[platform]) {
      this.metrics.requests.by_platform[platform] = { total: 0, success: 0, failure: 0 };
    }
    this.metrics.requests.by_platform[platform].total++;
    this.metrics.requests.by_platform[platform][success ? 'success' : 'failure']++;
    
    // Performance tracking
    this.recordPerformance(responseTime);
  }
  
  recordPerformance(responseTime) {
    this.metrics.performance.response_times.push(responseTime);
    
    // Keep only last 1000 response times
    if (this.metrics.performance.response_times.length > 1000) {
      this.metrics.performance.response_times = 
        this.metrics.performance.response_times.slice(-1000);
    }
    
    // Calculate metrics
    const times = this.metrics.performance.response_times;
    this.metrics.performance.avg_response_time = 
      times.reduce((a, b) => a + b, 0) / times.length;
    
    const sorted = [...times].sort((a, b) => a - b);
    this.metrics.performance.p95_response_time = 
      sorted[Math.floor(sorted.length * 0.95)];
  }
  
  recordCacheHit(isHit) {
    if (isHit) {
      this.metrics.cache.hits++;
    } else {
      this.metrics.cache.misses++;
    }
    
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hit_rate = (this.metrics.cache.hits / total) * 100;
  }
  
  generateReport() {
    const total = this.metrics.requests.total;
    const success_rate = (this.metrics.requests.success / total) * 100;
    
    return {
      summary: {
        total_requests: total,
        success_rate: success_rate.toFixed(2) + '%',
        avg_response_time: Math.round(this.metrics.performance.avg_response_time) + 'ms',
        cache_hit_rate: this.metrics.cache.hit_rate.toFixed(2) + '%'
      },
      platforms: Object.entries(this.metrics.requests.by_platform)
        .map(([platform, stats]) => ({
          platform,
          ...stats,
          success_rate: ((stats.success / stats.total) * 100).toFixed(2) + '%'
        })),
      top_errors: Object.entries(this.metrics.errors)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([error, count]) => ({ error, count }))
    };
  }
  
  // Health check endpoint data
  getHealthStatus() {
    const recent_errors = Object.values(this.metrics.errors)
      .reduce((a, b) => a + b, 0);
    
    const total = this.metrics.requests.total;
    const success_rate = total > 0 ? (this.metrics.requests.success / total) * 100 : 100;
    
    let status = 'healthy';
    if (success_rate < 95) status = 'degraded';
    if (success_rate < 80) status = 'unhealthy';
    if (recent_errors > 100) status = 'critical';
    
    return {
      status,
      success_rate: success_rate.toFixed(2),
      avg_response_time: Math.round(this.metrics.performance.avg_response_time),
      cache_hit_rate: this.metrics.cache.hit_rate.toFixed(2),
      recent_errors,
      uptime: process.uptime()
    };
  }
}
```

### Health Check Implementation
```javascript
// Express.js health check endpoint
app.get('/health', (req, res) => {
  const health = metricsCollector.getHealthStatus();
  
  res.status(health.status === 'healthy' ? 200 : 503).json({
    timestamp: new Date().toISOString(),
    service: 'metadata-extraction',
    version: process.env.npm_package_version,
    ...health
  });
});

// Detailed metrics endpoint
app.get('/metrics', (req, res) => {
  res.json(metricsCollector.generateReport());
});
```

## 6. Configuration Management

### Environment-based Configuration
```javascript
// config/metadata-extractor.js
const config = {
  development: {
    timeout: 30000,
    retries: 5,
    cache_ttl: 300, // 5 minutes
    rate_limit: {
      requests_per_minute: 120,
      burst_limit: 20
    },
    logging: {
      level: 'debug',
      include_requests: true
    }
  },
  
  production: {
    timeout: 15000,
    retries: 3,
    cache_ttl: 3600, // 1 hour
    rate_limit: {
      requests_per_minute: 60,
      burst_limit: 10
    },
    logging: {
      level: 'info',
      include_requests: false
    },
    security: {
      max_content_length: 5 * 1024 * 1024, // 5MB
      allowed_domains: ['*'],
      blocked_domains: ['localhost', '127.0.0.1'],
      user_agent: 'MetadataBot/1.0 (+https://yoursite.com/bot)'
    }
  },
  
  test: {
    timeout: 5000,
    retries: 1,
    cache_ttl: 0, // No caching in tests
    rate_limit: {
      requests_per_minute: 1000, // No rate limiting in tests
      burst_limit: 100
    }
  }
};

export default config[process.env.NODE_ENV || 'development'];
```

## 7. Deployment Best Practices

### Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership and switch to non-root user
RUN chown -R nodejs:nodejs /usr/src/app
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "src/server.js"]
```

### Kubernetes Deployment
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metadata-extractor
spec:
  replicas: 3
  selector:
    matchLabels:
      app: metadata-extractor
  template:
    metadata:
      labels:
        app: metadata-extractor
    spec:
      containers:
      - name: metadata-extractor
        image: metadata-extractor:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: metadata-secrets
              key: redis-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Load Balancer Configuration
```nginx
# nginx.conf
upstream metadata_backend {
    least_conn;
    server metadata-1:3000;
    server metadata-2:3000;
    server metadata-3:3000;
}

server {
    listen 80;
    server_name metadata-api.example.com;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    location /api/metadata {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://metadata_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 15s;
        proxy_read_timeout 15s;
        
        # Caching
        proxy_cache metadata_cache;
        proxy_cache_valid 200 1h;
        proxy_cache_valid 404 5m;
        
        add_header X-Cache-Status $upstream_cache_status;
    }
    
    location /health {
        proxy_pass http://metadata_backend;
        access_log off;
    }
}
```

## 8. Testing Strategy

### Integration Test Framework
```javascript
// tests/integration/metadata-extraction.test.js
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { enhancedLinkPreviewService } from '../../src/services/EnhancedLinkPreviewService.js';

describe('Metadata Extraction Integration Tests', () => {
  const testUrls = [
    {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      expectedType: 'video',
      expectedProvider: 'youtube',
      requiredFields: ['title', 'description', 'image', 'author']
    },
    {
      url: 'https://twitter.com/elonmusk/status/1234567890',
      expectedType: 'social',
      expectedProvider: 'twitter',
      requiredFields: ['title', 'description', 'site_name']
    },
    {
      url: 'https://github.com/microsoft/vscode',
      expectedType: 'website',
      expectedProvider: 'generic',
      requiredFields: ['title', 'description', 'image']
    }
  ];
  
  beforeAll(async () => {
    // Setup test environment
    await enhancedLinkPreviewService.initialize();
  });
  
  afterAll(async () => {
    // Cleanup
    await enhancedLinkPreviewService.cleanup();
  });
  
  testUrls.forEach(({ url, expectedType, expectedProvider, requiredFields }) => {
    test(`should extract metadata from ${url}`, async () => {
      const result = await enhancedLinkPreviewService.getLinkPreview(url);
      
      expect(result).toBeDefined();
      expect(result.type).toBe(expectedType);
      expect(result.provider).toBe(expectedProvider);
      
      requiredFields.forEach(field => {
        expect(result[field]).toBeDefined();
        expect(result[field]).not.toBe('');
      });
      
      // Validate URLs if present
      if (result.image) {
        expect(result.image).toMatch(/^https?:\/\//);
      }
      
      // Check response time
      expect(result).toHaveProperty('response_time');
      expect(result.response_time).toBeLessThan(30000); // 30 seconds max
    }, 60000); // 60 second timeout
  });
  
  test('should handle rate limiting gracefully', async () => {
    // Make rapid requests
    const promises = Array(20).fill().map(() => 
      enhancedLinkPreviewService.getLinkPreview('https://example.com')
    );
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    // Should complete most requests despite rate limiting
    expect(successful).toBeGreaterThan(15);
  });
  
  test('should respect cache behavior', async () => {
    const url = 'https://httpbin.org/json';
    
    // First request
    const start1 = Date.now();
    const result1 = await enhancedLinkPreviewService.getLinkPreview(url);
    const time1 = Date.now() - start1;
    
    // Second request (should use cache)
    const start2 = Date.now();
    const result2 = await enhancedLinkPreviewService.getLinkPreview(url);
    const time2 = Date.now() - start2;
    
    // Cache should make second request faster
    expect(time2).toBeLessThan(time1);
    expect(result1.title).toBe(result2.title);
  });
});
```

### Performance Testing
```javascript
// tests/performance/load-test.js
import { performance } from 'perf_hooks';
import { enhancedLinkPreviewService } from '../../src/services/EnhancedLinkPreviewService.js';

async function loadTest(concurrency = 10, duration = 60000) {
  const testUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://github.com/microsoft/vscode',
    'https://stackoverflow.com/questions/1',
    'https://www.wikipedia.org/wiki/JavaScript'
  ];
  
  const results = {
    requests: 0,
    successful: 0,
    failed: 0,
    responseTimes: [],
    errors: {}
  };
  
  const startTime = performance.now();
  const endTime = startTime + duration;
  
  const workers = Array(concurrency).fill().map(async () => {
    while (performance.now() < endTime) {
      const url = testUrls[Math.floor(Math.random() * testUrls.length)];
      const requestStart = performance.now();
      
      try {
        await enhancedLinkPreviewService.getLinkPreview(url);
        results.successful++;
        results.responseTimes.push(performance.now() - requestStart);
      } catch (error) {
        results.failed++;
        const errorKey = error.message || 'Unknown error';
        results.errors[errorKey] = (results.errors[errorKey] || 0) + 1;
      }
      
      results.requests++;
    }
  });
  
  await Promise.all(workers);
  
  // Calculate metrics
  const totalTime = performance.now() - startTime;
  results.requestsPerSecond = (results.requests / totalTime) * 1000;
  results.successRate = (results.successful / results.requests) * 100;
  
  if (results.responseTimes.length > 0) {
    results.avgResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
    results.responseTimes.sort((a, b) => a - b);
    results.p95ResponseTime = results.responseTimes[Math.floor(results.responseTimes.length * 0.95)];
    results.p99ResponseTime = results.responseTimes[Math.floor(results.responseTimes.length * 0.99)];
  }
  
  return results;
}

// Run load test
(async () => {
  console.log('🚀 Starting load test...');
  const results = await loadTest(10, 60000);
  console.log('📊 Load test results:', JSON.stringify(results, null, 2));
})();
```

This comprehensive best practices guide provides everything needed to deploy a production-ready metadata extraction system with proper performance, security, monitoring, and reliability measures in place.