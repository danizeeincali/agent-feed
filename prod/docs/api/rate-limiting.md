# Rate Limiting and Throttling Strategy

## Overview

The Distributed Posting Intelligence API implements sophisticated rate limiting and throttling mechanisms to ensure fair usage, prevent abuse, and maintain system stability while supporting high-performance applications.

## Rate Limiting Architecture

### Multi-Layer Rate Limiting

1. **Global System Limits**: Protect against system-wide overload
2. **Per-API-Key Limits**: Enforce subscription plan quotas
3. **Per-Endpoint Limits**: Prevent resource-intensive operation abuse
4. **Per-IP Limits**: Mitigate DDoS and brute-force attempts
5. **Per-User Limits**: Ensure fair resource distribution

### Rate Limiting Algorithms

#### Token Bucket Algorithm
- **Use Case**: Burst traffic handling with sustained rate enforcement
- **Implementation**: Allows burst up to bucket capacity, refills at fixed rate
- **Endpoints**: General API endpoints, content composition

```
Bucket Capacity: 100 tokens
Refill Rate: 10 tokens/second
Max Burst: 100 requests
Sustained Rate: 10 requests/second
```

#### Sliding Window Log
- **Use Case**: Precise rate limiting for critical operations
- **Implementation**: Maintains request timestamps, enforces exact limits
- **Endpoints**: Agent coordination, system operations

#### Fixed Window Counter
- **Use Case**: Simple quota enforcement
- **Implementation**: Resets counter at fixed intervals
- **Endpoints**: Analytics queries, batch operations

## Rate Limit Tiers

### Free Tier
```yaml
requests_per_hour: 100
requests_per_minute: 10
concurrent_requests: 1
burst_capacity: 5
agent_tasks_concurrent: 1
daily_quota: 1000
```

### Basic Tier ($9/month)
```yaml
requests_per_hour: 1000
requests_per_minute: 50
concurrent_requests: 5
burst_capacity: 20
agent_tasks_concurrent: 3
daily_quota: 10000
webhook_calls: 100/hour
```

### Pro Tier ($49/month)
```yaml
requests_per_hour: 10000
requests_per_minute: 200
concurrent_requests: 20
burst_capacity: 100
agent_tasks_concurrent: 10
daily_quota: 100000
webhook_calls: 1000/hour
priority_queue: true
```

### Enterprise Tier (Custom)
```yaml
requests_per_hour: 100000
requests_per_minute: 2000
concurrent_requests: 100
burst_capacity: 500
agent_tasks_concurrent: unlimited
daily_quota: unlimited
webhook_calls: unlimited
priority_queue: true
dedicated_resources: true
```

## Endpoint-Specific Limits

### Posting Intelligence Endpoints

| Endpoint | Free | Basic | Pro | Enterprise |
|----------|------|-------|-----|------------|
| `/api/posts/compose` | 20/hour | 200/hour | 2000/hour | 20000/hour |
| `/api/posts/analyze-quality` | 50/hour | 500/hour | 5000/hour | 50000/hour |
| `/api/posts/templates` | 100/hour | 1000/hour | 10000/hour | Unlimited |

### Agent Coordination Endpoints

| Endpoint | Free | Basic | Pro | Enterprise |
|----------|------|-------|-----|------------|
| `/api/agents/coordinate` | 5/hour | 50/hour | 500/hour | 5000/hour |
| `/api/agents/status` | 60/hour | 600/hour | 6000/hour | 60000/hour |
| `/api/agents/capabilities` | 100/hour | 1000/hour | 10000/hour | Unlimited |

### Feed Intelligence Endpoints

| Endpoint | Free | Basic | Pro | Enterprise |
|----------|------|-------|-----|------------|
| `/api/feed/analytics` | 10/hour | 100/hour | 1000/hour | 10000/hour |
| `/api/feed/optimize` | 5/hour | 25/hour | 100/hour | 1000/hour |
| `/api/feed/health` | 20/hour | 200/hour | 2000/hour | 20000/hour |

## Rate Limit Headers

### Standard Headers
All API responses include comprehensive rate limit information:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705467600
X-RateLimit-Window: 3600
X-RateLimit-Type: sliding-window
X-RateLimit-Burst-Capacity: 100
X-RateLimit-Burst-Remaining: 99
X-RateLimit-Retry-After: 3600
```

### Advanced Headers
For premium tiers and complex scenarios:

```http
X-RateLimit-Quota-Daily: 100000
X-RateLimit-Quota-Daily-Remaining: 95000
X-RateLimit-Priority: high
X-RateLimit-Cost: 1
X-RateLimit-Endpoint-Limit: 500
X-RateLimit-Endpoint-Remaining: 498
X-RateLimit-Global-Limit: 10000
X-RateLimit-Global-Remaining: 8500
```

## Throttling Strategies

### Adaptive Throttling

```python
class AdaptiveThrottling:
    def __init__(self):
        self.system_load_threshold = 0.8
        self.response_time_threshold = 1000  # ms
        self.error_rate_threshold = 0.05
    
    def get_throttle_factor(self):
        system_load = get_current_system_load()
        avg_response_time = get_average_response_time()
        error_rate = get_current_error_rate()
        
        throttle_factor = 1.0
        
        if system_load > self.system_load_threshold:
            throttle_factor *= (system_load - self.system_load_threshold) * 2
            
        if avg_response_time > self.response_time_threshold:
            throttle_factor *= (avg_response_time / self.response_time_threshold)
            
        if error_rate > self.error_rate_threshold:
            throttle_factor *= (error_rate / self.error_rate_threshold) * 3
        
        return min(throttle_factor, 10.0)  # Cap at 10x throttling
```

### Priority-Based Throttling

```yaml
priority_levels:
  critical:
    multiplier: 1.0
    queue_position: 1
    examples: [system_health, agent_status]
  
  high:
    multiplier: 1.2
    queue_position: 2
    examples: [post_compose, feed_optimize]
  
  normal:
    multiplier: 1.5
    queue_position: 3
    examples: [analytics, templates]
  
  low:
    multiplier: 2.0
    queue_position: 4
    examples: [bulk_operations, historical_data]
```

### Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.nextAttempt = Date.now();
  }

  async execute(operation) {
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
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }
}
```

## Intelligent Queueing

### Queue Management System

```yaml
queue_configuration:
  priority_queue:
    levels: 4
    max_size_per_level: 1000
    processing_strategy: weighted_round_robin
  
  overflow_handling:
    strategy: drop_lowest_priority
    notification: webhook
    metrics: enabled
  
  processing_weights:
    critical: 50%
    high: 30%
    normal: 15%
    low: 5%
```

### Queue Metrics and Monitoring

```json
{
  "queue_status": {
    "total_queued": 1250,
    "by_priority": {
      "critical": 5,
      "high": 45,
      "normal": 200,
      "low": 1000
    },
    "average_wait_time": {
      "critical": 0.1,
      "high": 2.5,
      "normal": 15.0,
      "low": 120.0
    },
    "processing_rate": 50.5,
    "dropped_requests_last_hour": 12
  }
}
```

## Cost-Based Rate Limiting

### Operation Costs

```yaml
operation_costs:
  # Posting Intelligence
  compose_basic: 1
  compose_advanced: 3
  quality_analysis: 2
  template_generation: 2
  
  # Agent Coordination
  agent_spawn: 5
  task_coordination: 10
  parallel_execution: 15
  
  # Feed Intelligence  
  analytics_basic: 1
  analytics_comprehensive: 5
  feed_optimization: 8
  pattern_analysis: 12
  
  # Content Management
  template_crud: 1
  quality_rule_creation: 3
  engagement_pattern_analysis: 10
```

### Credit System

```json
{
  "user_credits": {
    "daily_allocation": 1000,
    "current_balance": 750,
    "usage_today": 250,
    "tier": "pro",
    "rollover_credits": 100,
    "expires_at": "2024-02-01T00:00:00Z"
  },
  "cost_breakdown": {
    "compose_operations": 150,
    "agent_coordination": 75,
    "analytics_queries": 20,
    "other": 5
  }
}
```

## Geographic Rate Limiting

### Regional Limits

```yaml
regional_multipliers:
  us_east: 1.0      # Primary region
  us_west: 1.0      # Primary region
  eu_west: 1.2      # Cross-atlantic latency
  ap_southeast: 1.5 # Higher latency
  other: 2.0        # Best effort
```

### CDN Integration

```javascript
// CloudFlare Workers rate limiting
class GeographicRateLimit {
  constructor(region) {
    this.region = region;
    this.multiplier = this.getRegionalMultiplier(region);
  }
  
  getRegionalMultiplier(region) {
    const multipliers = {
      'US': 1.0,
      'EU': 1.2,
      'AS': 1.5,
      'OC': 1.8,
      'AF': 2.0,
      'SA': 2.0
    };
    return multipliers[region] || 2.0;
  }
  
  adjustLimits(baseLimits) {
    return {
      requests_per_hour: Math.floor(baseLimits.requests_per_hour / this.multiplier),
      requests_per_minute: Math.floor(baseLimits.requests_per_minute / this.multiplier),
      burst_capacity: Math.floor(baseLimits.burst_capacity / this.multiplier)
    };
  }
}
```

## Error Responses and Handling

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "API rate limit exceeded",
    "details": [
      {
        "limit_type": "requests_per_hour",
        "limit": 1000,
        "used": 1000,
        "reset_at": "2024-01-15T15:00:00Z",
        "retry_after": 300
      }
    ]
  },
  "rate_limit_info": {
    "current_tier": "basic",
    "upgrade_url": "https://agentfeed.com/upgrade",
    "estimated_wait": "5 minutes",
    "alternative_endpoints": [
      "/api/posts/templates",
      "/api/feed/health"
    ]
  },
  "timestamp": "2024-01-15T14:55:00Z",
  "request_id": "req_123456789"
}
```

### Quota Exceeded Response

```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Daily quota exceeded",
    "details": [
      {
        "quota_type": "daily_requests",
        "limit": 10000,
        "used": 10000,
        "reset_at": "2024-01-16T00:00:00Z"
      }
    ]
  },
  "upgrade_options": {
    "next_tier": "pro",
    "benefits": [
      "100,000 daily requests",
      "Priority processing",
      "Advanced analytics"
    ],
    "upgrade_url": "https://agentfeed.com/upgrade"
  },
  "timestamp": "2024-01-15T22:30:00Z",
  "request_id": "req_987654321"
}
```

## Client Implementation Examples

### JavaScript SDK with Rate Limiting

```javascript
class AgentFeedClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseURL = options.baseURL || 'https://api.agentfeed.com/v1';
    this.rateLimitBuffer = options.rateLimitBuffer || 0.1; // 10% safety buffer
    this.queue = [];
    this.processing = false;
  }

  async makeRequest(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      this.queue.push({ endpoint, options, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const { endpoint, options, resolve, reject } = this.queue.shift();
      
      try {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
          ...options,
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
            ...options.headers
          }
        });

        const rateLimitRemaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '999');
        const rateLimitReset = parseInt(response.headers.get('X-RateLimit-Reset') || '0');
        
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('X-RateLimit-Retry-After') || '60');
          await this.delay(retryAfter * 1000);
          this.queue.unshift({ endpoint, options, resolve, reject }); // Retry
          continue;
        }
        
        if (!response.ok) {
          reject(new Error(`HTTP ${response.status}: ${response.statusText}`));
          continue;
        }
        
        const data = await response.json();
        resolve(data);
        
        // Smart delay based on remaining rate limit
        if (rateLimitRemaining < 10) {
          const delayMs = Math.max(1000, (rateLimitReset - Date.now()) / rateLimitRemaining);
          await this.delay(delayMs * (1 + this.rateLimitBuffer));
        }
        
      } catch (error) {
        reject(error);
      }
    }
    
    this.processing = false;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage example
const client = new AgentFeedClient('apk_live_123...', {
  rateLimitBuffer: 0.2 // 20% safety buffer
});

try {
  const result = await client.makeRequest('/api/posts/compose', {
    method: 'POST',
    body: JSON.stringify({
      content_type: 'enhance',
      platform: 'twitter',
      input_content: 'Hello world!'
    })
  });
  
  console.log('Post composed:', result.content);
} catch (error) {
  console.error('API error:', error.message);
}
```

### Python SDK with Exponential Backoff

```python
import asyncio
import aiohttp
import time
from typing import Optional, Dict, Any

class AgentFeedClient:
    def __init__(self, api_key: str, base_url: str = "https://api.agentfeed.com/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers={'X-API-Key': self.api_key},
            connector=aiohttp.TCPConnector(limit=10, limit_per_host=5)
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def request_with_backoff(
        self, 
        method: str, 
        endpoint: str, 
        max_retries: int = 3,
        **kwargs
    ) -> Dict[Any, Any]:
        
        for attempt in range(max_retries + 1):
            try:
                async with self.session.request(
                    method, 
                    f"{self.base_url}{endpoint}",
                    **kwargs
                ) as response:
                    
                    # Check rate limiting
                    if response.status == 429:
                        retry_after = int(response.headers.get('X-RateLimit-Retry-After', 60))
                        if attempt < max_retries:
                            await asyncio.sleep(retry_after)
                            continue
                        else:
                            raise RateLimitError("Max retries exceeded due to rate limiting")
                    
                    response.raise_for_status()
                    
                    # Implement proactive rate limit management
                    remaining = int(response.headers.get('X-RateLimit-Remaining', 999))
                    if remaining < 5:  # Proactive slowdown
                        reset_time = int(response.headers.get('X-RateLimit-Reset', 0))
                        current_time = int(time.time())
                        if reset_time > current_time:
                            delay = (reset_time - current_time) / remaining
                            await asyncio.sleep(min(delay, 60))  # Cap at 60 seconds
                    
                    return await response.json()
                    
            except aiohttp.ClientError as e:
                if attempt < max_retries:
                    # Exponential backoff
                    delay = (2 ** attempt) + (0.1 * attempt)
                    await asyncio.sleep(delay)
                else:
                    raise e
        
        raise Exception("Max retries exceeded")

# Usage example
async def example_usage():
    async with AgentFeedClient('apk_live_123...') as client:
        try:
            result = await client.request_with_backoff(
                'POST',
                '/api/posts/compose',
                json={
                    'content_type': 'enhance',
                    'platform': 'twitter',
                    'input_content': 'Hello world!'
                }
            )
            print(f"Generated content: {result['content']}")
            
        except RateLimitError as e:
            print(f"Rate limit exceeded: {e}")
        except Exception as e:
            print(f"API error: {e}")

# Run the example
asyncio.run(example_usage())
```

## Monitoring and Alerting

### Metrics Collection

```yaml
rate_limit_metrics:
  - name: requests_per_second
    type: gauge
    labels: [endpoint, tier, region]
  
  - name: rate_limit_violations
    type: counter
    labels: [endpoint, tier, violation_type]
  
  - name: queue_depth
    type: gauge
    labels: [priority_level]
  
  - name: processing_latency
    type: histogram
    labels: [endpoint, tier]
    buckets: [10, 50, 100, 500, 1000, 5000]

alert_rules:
  - alert: HighRateLimitViolations
    expr: rate(rate_limit_violations[5m]) > 10
    severity: warning
    description: "High rate of rate limit violations detected"
  
  - alert: QueueDepthHigh
    expr: queue_depth > 500
    severity: critical
    description: "Request queue depth is critically high"
```

This comprehensive rate limiting and throttling strategy ensures the API remains performant, fair, and resilient under various load conditions while providing clear feedback to clients for optimal integration patterns.