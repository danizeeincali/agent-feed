# API Implementation Guide

## Getting Started

This guide provides step-by-step instructions for implementing the Distributed Posting Intelligence API in your applications.

## Quick Start

### 1. Authentication Setup

First, obtain your API credentials:

```bash
# Register and get API key
curl -X POST https://api.agentfeed.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@yourcompany.com",
    "password": "secure_password",
    "plan": "pro"
  }'

# Get API key
curl -X POST https://api.agentfeed.com/auth/api-keys \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Integration",
    "scopes": ["read:posts", "write:posts", "read:analytics"]
  }'
```

### 2. Basic Implementation

#### JavaScript/Node.js

```javascript
const axios = require('axios');

class AgentFeedAPI {
  constructor(apiKey) {
    this.client = axios.create({
      baseURL: 'https://api.agentfeed.com/v1',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['x-ratelimit-retry-after'];
          throw new RateLimitError(`Rate limited. Retry after ${retryAfter}s`, retryAfter);
        }
        throw error;
      }
    );
  }

  async composePost(request) {
    try {
      const response = await this.client.post('/api/posts/compose', request);
      return response.data;
    } catch (error) {
      console.error('Error composing post:', error.message);
      throw error;
    }
  }

  async analyzeQuality(content, platform) {
    const response = await this.client.post('/api/posts/analyze-quality', {
      content,
      platform,
      analysis_depth: 'comprehensive'
    });
    return response.data;
  }

  async getFeedAnalytics(timeRange = '24h') {
    const response = await this.client.get('/api/feed/analytics', {
      params: { time_range: timeRange }
    });
    return response.data;
  }

  async coordinateAgents(task, strategy = 'parallel') {
    const response = await this.client.post('/api/agents/coordinate', {
      task,
      strategy,
      constraints: { max_agents: 5, timeout: 1800 }
    });
    return response.data;
  }
}

class RateLimitError extends Error {
  constructor(message, retryAfter) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

// Usage example
async function main() {
  const api = new AgentFeedAPI('apk_live_your_api_key_here');

  try {
    // Compose enhanced content
    const composedPost = await api.composePost({
      content_type: 'enhance',
      platform: 'linkedin',
      input_content: 'We just launched our new AI product!',
      parameters: {
        tone: 'professional',
        target_audience: 'business',
        hashtags: true,
        include_cta: true
      }
    });

    console.log('Generated content:', composedPost.content);
    console.log('Quality score:', composedPost.quality_score);

    // Analyze quality
    const qualityAnalysis = await api.analyzeQuality(
      composedPost.content,
      'linkedin'
    );

    console.log('Quality analysis:', qualityAnalysis.overall_score);

    // Get analytics
    const analytics = await api.getFeedAnalytics('7d');
    console.log('Engagement rate:', analytics.metrics.engagement.engagement_rate);

  } catch (error) {
    if (error instanceof RateLimitError) {
      console.log(`Rate limited. Waiting ${error.retryAfter} seconds...`);
      setTimeout(() => main(), error.retryAfter * 1000);
    } else {
      console.error('API error:', error.message);
    }
  }
}

main();
```

#### Python

```python
import asyncio
import aiohttp
from typing import Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class PostComposeRequest:
    content_type: str
    platform: str
    input_content: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    optimization_level: str = 'standard'

class AgentFeedAPI:
    def __init__(self, api_key: str, base_url: str = "https://api.agentfeed.com/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        timeout = aiohttp.ClientTimeout(total=30)
        connector = aiohttp.TCPConnector(limit=10)
        
        self.session = aiohttp.ClientSession(
            base_url=self.base_url,
            headers={'X-API-Key': self.api_key},
            timeout=timeout,
            connector=connector
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make HTTP request with error handling."""
        try:
            async with self.session.request(method, endpoint, **kwargs) as response:
                if response.status == 429:
                    retry_after = int(response.headers.get('X-RateLimit-Retry-After', 60))
                    raise RateLimitError(f"Rate limited. Retry after {retry_after}s", retry_after)
                
                response.raise_for_status()
                return await response.json()
        
        except aiohttp.ClientError as e:
            raise APIError(f"Request failed: {str(e)}")

    async def compose_post(self, request: PostComposeRequest) -> Dict[str, Any]:
        """Compose intelligent post content."""
        payload = {
            'content_type': request.content_type,
            'platform': request.platform,
            'optimization_level': request.optimization_level
        }
        
        if request.input_content:
            payload['input_content'] = request.input_content
        if request.parameters:
            payload['parameters'] = request.parameters

        return await self._request('POST', '/api/posts/compose', json=payload)

    async def analyze_quality(self, content: str, platform: str, 
                            analysis_depth: str = 'standard') -> Dict[str, Any]:
        """Analyze content quality."""
        payload = {
            'content': content,
            'platform': platform,
            'analysis_depth': analysis_depth,
            'include_suggestions': True
        }
        
        return await self._request('POST', '/api/posts/analyze-quality', json=payload)

    async def get_feed_analytics(self, time_range: str = '24h') -> Dict[str, Any]:
        """Get feed analytics."""
        params = {'time_range': time_range}
        return await self._request('GET', '/api/feed/analytics', params=params)

    async def coordinate_agents(self, task: str, strategy: str = 'parallel',
                              max_agents: int = 5) -> Dict[str, Any]:
        """Coordinate multi-agent tasks."""
        payload = {
            'task': task,
            'strategy': strategy,
            'constraints': {
                'max_agents': max_agents,
                'timeout': 1800
            }
        }
        
        return await self._request('POST', '/api/agents/coordinate', json=payload)

    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """Get task coordination status."""
        return await self._request('GET', f'/api/agents/status', params={'task_id': task_id})

class APIError(Exception):
    """General API error."""
    pass

class RateLimitError(APIError):
    """Rate limit exceeded error."""
    def __init__(self, message: str, retry_after: int):
        super().__init__(message)
        self.retry_after = retry_after

# Usage example
async def main():
    async with AgentFeedAPI('apk_live_your_api_key_here') as api:
        try:
            # Compose enhanced content
            request = PostComposeRequest(
                content_type='enhance',
                platform='twitter',
                input_content='Just launched our new AI product!',
                parameters={
                    'tone': 'professional',
                    'target_audience': 'tech',
                    'hashtags': True,
                    'include_cta': True,
                    'max_length': 280
                }
            )

            result = await api.compose_post(request)
            print(f"Generated: {result['content']}")
            print(f"Quality: {result['quality_score']}")

            # Analyze the generated content
            quality = await api.analyze_quality(result['content'], 'twitter')
            print(f"Analysis score: {quality['overall_score']}")

            # Coordinate agents for comprehensive analysis
            task_response = await api.coordinate_agents(
                "Analyze competitor content and generate 3 optimized posts",
                strategy='parallel'
            )
            
            task_id = task_response['task_id']
            print(f"Task started: {task_id}")

            # Monitor task progress
            while True:
                status = await api.get_task_status(task_id)
                print(f"Progress: {status['progress']['overall_progress']:.1%}")
                
                if status['status'] in ['completed', 'failed']:
                    break
                
                await asyncio.sleep(5)  # Check every 5 seconds

        except RateLimitError as e:
            print(f"Rate limited: {e.message}")
            await asyncio.sleep(e.retry_after)
        except APIError as e:
            print(f"API error: {e}")

# Run the example
asyncio.run(main())
```

### 3. Advanced Implementation Patterns

#### Batch Processing

```javascript
class BatchProcessor {
  constructor(api, batchSize = 10) {
    this.api = api;
    this.batchSize = batchSize;
    this.queue = [];
    this.processing = false;
  }

  async addToBatch(operation) {
    return new Promise((resolve, reject) => {
      this.queue.push({ operation, resolve, reject });
      this.processBatch();
    });
  }

  async processBatch() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      
      try {
        const promises = batch.map(async ({ operation, resolve, reject }) => {
          try {
            const result = await operation();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });

        await Promise.allSettled(promises);
        
        // Rate limit protection
        if (this.queue.length > 0) {
          await this.delay(1000); // 1 second between batches
        }
        
      } catch (error) {
        batch.forEach(({ reject }) => reject(error));
      }
    }
    
    this.processing = false;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const batchProcessor = new BatchProcessor(api);

// Process multiple posts
const posts = [
  { content: "Post 1", platform: "twitter" },
  { content: "Post 2", platform: "linkedin" },
  // ... more posts
];

const results = await Promise.all(
  posts.map(post => 
    batchProcessor.addToBatch(() => 
      api.analyzeQuality(post.content, post.platform)
    )
  )
);
```

#### Retry Logic with Exponential Backoff

```python
import asyncio
import random
from typing import Callable, Any

class RetryHandler:
    def __init__(self, max_retries: int = 3, base_delay: float = 1.0, max_delay: float = 60.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay

    async def execute_with_retry(self, operation: Callable, *args, **kwargs) -> Any:
        last_exception = None
        
        for attempt in range(self.max_retries + 1):
            try:
                return await operation(*args, **kwargs)
            
            except RateLimitError as e:
                if attempt == self.max_retries:
                    raise e
                await asyncio.sleep(e.retry_after)
                
            except Exception as e:
                last_exception = e
                if attempt == self.max_retries:
                    raise e
                
                # Exponential backoff with jitter
                delay = min(
                    self.base_delay * (2 ** attempt) + random.uniform(0, 1),
                    self.max_delay
                )
                await asyncio.sleep(delay)
        
        raise last_exception

# Usage
retry_handler = RetryHandler(max_retries=3)

async def reliable_compose_post(api, request):
    return await retry_handler.execute_with_retry(
        api.compose_post, 
        request
    )
```

#### Webhook Integration

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();

// Middleware to verify webhook signatures
function verifyWebhookSignature(req, res, next) {
  const signature = req.headers['x-agentfeed-signature'];
  const payload = JSON.stringify(req.body);
  
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload, 'utf8')
    .digest('hex');
  
  if (`sha256=${expectedSignature}` !== signature) {
    return res.status(401).send('Invalid signature');
  }
  
  next();
}

app.use(express.json());

// Webhook endpoint for task completion
app.post('/webhooks/task-completion', verifyWebhookSignature, (req, res) => {
  const { event_type, task_id, status, results } = req.body;
  
  console.log(`Task ${task_id} completed with status: ${status}`);
  
  if (status === 'completed') {
    // Process successful results
    processTaskResults(task_id, results);
  } else if (status === 'failed') {
    // Handle failure
    handleTaskFailure(task_id, results.error);
  }
  
  res.status(200).send('OK');
});

async function processTaskResults(taskId, results) {
  // Store results, trigger notifications, etc.
  console.log('Processing results for task:', taskId);
  console.log('Generated content:', results.generated_content);
  
  // Example: Save to database
  await database.saveTaskResults(taskId, results);
  
  // Example: Notify users
  await notificationService.notifyTaskCompletion(taskId);
}

async function handleTaskFailure(taskId, error) {
  console.error('Task failed:', taskId, error);
  
  // Example: Retry logic
  if (error.code === 'TEMPORARY_FAILURE') {
    await retryTask(taskId);
  }
}

app.listen(3000, () => {
  console.log('Webhook server listening on port 3000');
});
```

## Common Integration Patterns

### 1. Content Pipeline Automation

```javascript
class ContentPipeline {
  constructor(api) {
    this.api = api;
  }

  async processContentBatch(contentItems) {
    const results = [];
    
    for (const item of contentItems) {
      try {
        // Step 1: Enhance content
        const enhanced = await this.api.composePost({
          content_type: 'enhance',
          platform: item.platform,
          input_content: item.content,
          parameters: item.parameters
        });

        // Step 2: Quality check
        const quality = await this.api.analyzeQuality(
          enhanced.content,
          item.platform
        );

        // Step 3: Only proceed if quality is sufficient
        if (quality.overall_score >= 0.8) {
          results.push({
            original: item.content,
            enhanced: enhanced.content,
            quality_score: quality.overall_score,
            status: 'approved'
          });
        } else {
          // Step 4: Try optimization if quality is low
          const optimized = await this.optimizeContent(enhanced.content, quality);
          results.push({
            original: item.content,
            enhanced: optimized.content,
            quality_score: optimized.quality_score,
            status: 'optimized'
          });
        }

      } catch (error) {
        results.push({
          original: item.content,
          error: error.message,
          status: 'failed'
        });
      }
    }
    
    return results;
  }

  async optimizeContent(content, qualityAnalysis) {
    // Apply suggestions from quality analysis
    const suggestions = qualityAnalysis.improvement_suggestions;
    let optimizedContent = content;

    for (const suggestion of suggestions) {
      if (suggestion.priority === 'high') {
        optimizedContent = await this.applySuggestion(optimizedContent, suggestion);
      }
    }

    return await this.api.composePost({
      content_type: 'enhance',
      platform: qualityAnalysis.platform,
      input_content: optimizedContent,
      optimization_level: 'advanced'
    });
  }
}
```

### 2. Real-time Analytics Dashboard

```python
import asyncio
from datetime import datetime, timedelta

class AnalyticsDashboard:
    def __init__(self, api):
        self.api = api
        self.running = False
        
    async def start_monitoring(self, interval_seconds=300):  # 5 minutes
        """Start real-time monitoring."""
        self.running = True
        
        while self.running:
            try:
                # Fetch latest analytics
                analytics = await self.api.get_feed_analytics('1h')
                system_health = await self.api.get_system_health()
                
                # Update dashboard
                await self.update_dashboard(analytics, system_health)
                
                # Check for alerts
                await self.check_alerts(analytics)
                
                await asyncio.sleep(interval_seconds)
                
            except Exception as e:
                print(f"Dashboard update error: {e}")
                await asyncio.sleep(60)  # Wait before retry
    
    async def update_dashboard(self, analytics, health):
        """Update dashboard with latest data."""
        dashboard_data = {
            'timestamp': datetime.now().isoformat(),
            'engagement_rate': analytics['metrics']['engagement']['engagement_rate'],
            'total_reach': analytics['metrics']['reach']['total_reach'],
            'system_health': health['status'],
            'active_agents': len([c for c in health['components'].values() 
                                if c['status'] == 'up']),
            'error_rate': analytics['metrics'].get('error_rate', 0)
        }
        
        # Send to frontend via WebSocket, save to database, etc.
        await self.broadcast_dashboard_update(dashboard_data)
    
    async def check_alerts(self, analytics):
        """Check for conditions requiring alerts."""
        engagement_rate = analytics['metrics']['engagement']['engagement_rate']
        
        if engagement_rate < 0.05:  # Below 5% engagement
            await self.send_alert(
                'LOW_ENGAGEMENT',
                f'Engagement rate dropped to {engagement_rate:.1%}',
                'warning'
            )
        
        error_rate = analytics['metrics'].get('error_rate', 0)
        if error_rate > 0.05:  # Above 5% errors
            await self.send_alert(
                'HIGH_ERROR_RATE',
                f'Error rate increased to {error_rate:.1%}',
                'critical'
            )
    
    async def send_alert(self, alert_type, message, severity):
        """Send alert to monitoring system."""
        alert = {
            'type': alert_type,
            'message': message,
            'severity': severity,
            'timestamp': datetime.now().isoformat()
        }
        
        print(f"ALERT: {alert}")
        # Send to Slack, email, PagerDuty, etc.
```

### 3. Multi-Platform Content Distribution

```javascript
class MultiPlatformDistributor {
  constructor(api) {
    this.api = api;
    this.platformConfigs = {
      twitter: { maxLength: 280, hashtagLimit: 2 },
      linkedin: { maxLength: 3000, hashtagLimit: 5 },
      instagram: { maxLength: 2200, hashtagLimit: 30 },
      facebook: { maxLength: 63206, hashtagLimit: 10 }
    };
  }

  async distributeContent(baseContent, platforms, options = {}) {
    const results = {};
    
    // Get platform-optimized versions in parallel
    const platformPromises = platforms.map(async (platform) => {
      try {
        const config = this.platformConfigs[platform];
        
        const optimizedContent = await this.api.composePost({
          content_type: 'enhance',
          platform: platform,
          input_content: baseContent,
          parameters: {
            max_length: config.maxLength,
            hashtags: true,
            tone: options.tone || 'professional',
            target_audience: options.audience || 'general'
          }
        });

        // Quality check
        const quality = await this.api.analyzeQuality(
          optimizedContent.content,
          platform
        );

        results[platform] = {
          content: optimizedContent.content,
          quality_score: quality.overall_score,
          metadata: optimizedContent.metadata,
          status: quality.overall_score >= 0.7 ? 'ready' : 'needs_review'
        };

      } catch (error) {
        results[platform] = {
          error: error.message,
          status: 'failed'
        };
      }
    });

    await Promise.allSettled(platformPromises);
    
    return results;
  }

  async scheduleDistribution(content, platforms, scheduleOptions) {
    const optimizedContent = await this.distributeContent(content, platforms);
    
    // Calculate optimal posting times for each platform
    const schedulePromises = Object.entries(optimizedContent).map(
      async ([platform, contentData]) => {
        if (contentData.status !== 'ready') return null;

        const analytics = await this.api.getFeedAnalytics('7d');
        const optimalTime = this.calculateOptimalTime(platform, analytics);

        return {
          platform,
          content: contentData.content,
          scheduled_time: optimalTime,
          quality_score: contentData.quality_score
        };
      }
    );

    const schedules = (await Promise.allSettled(schedulePromises))
      .filter(result => result.status === 'fulfilled' && result.value)
      .map(result => result.value);

    return schedules;
  }

  calculateOptimalTime(platform, analytics) {
    // Find best posting time based on historical data
    const bestTimes = analytics.metrics.performance.best_posting_times
      .filter(time => time.platform === platform)
      .sort((a, b) => b.engagement_multiplier - a.engagement_multiplier);

    if (bestTimes.length === 0) {
      // Default to common optimal times
      const defaults = {
        twitter: { day: 'tuesday', hour: 9 },
        linkedin: { day: 'wednesday', hour: 14 },
        instagram: { day: 'wednesday', hour: 11 },
        facebook: { day: 'thursday', hour: 15 }
      };
      return this.calculateNextOccurrence(defaults[platform]);
    }

    return this.calculateNextOccurrence(bestTimes[0]);
  }

  calculateNextOccurrence({ day, hour }) {
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = dayNames.indexOf(day.toLowerCase());
    
    const nextDate = new Date(now);
    nextDate.setHours(hour, 0, 0, 0);
    
    const daysUntilTarget = (targetDay + 7 - now.getDay()) % 7;
    if (daysUntilTarget === 0 && now.getHours() >= hour) {
      nextDate.setDate(nextDate.getDate() + 7);
    } else {
      nextDate.setDate(nextDate.getDate() + daysUntilTarget);
    }
    
    return nextDate.toISOString();
  }
}
```

## Error Handling Best Practices

### 1. Comprehensive Error Handling

```javascript
class APIErrorHandler {
  static async handleApiCall(operation, context = {}) {
    const maxRetries = context.maxRetries || 3;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        return await operation();
      } catch (error) {
        attempt++;
        
        const errorInfo = {
          type: error.constructor.name,
          message: error.message,
          attempt,
          maxRetries,
          timestamp: new Date().toISOString(),
          context
        };

        if (error.response) {
          errorInfo.status = error.response.status;
          errorInfo.statusText = error.response.statusText;
          errorInfo.headers = error.response.headers;
        }

        // Log error for monitoring
        console.error('API Error:', errorInfo);

        // Handle specific error types
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['x-ratelimit-retry-after'] || '60');
          if (attempt <= maxRetries) {
            console.log(`Rate limited. Waiting ${retryAfter}s before retry ${attempt}/${maxRetries}`);
            await this.delay(retryAfter * 1000);
            continue;
          }
        }

        if (error.response?.status >= 500 && attempt <= maxRetries) {
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
          console.log(`Server error. Retrying in ${backoffDelay}ms (${attempt}/${maxRetries})`);
          await this.delay(backoffDelay);
          continue;
        }

        if (error.response?.status === 401) {
          throw new AuthenticationError('Authentication failed. Check API key.', errorInfo);
        }

        if (error.response?.status === 403) {
          throw new AuthorizationError('Insufficient permissions.', errorInfo);
        }

        if (error.response?.status === 400) {
          throw new ValidationError('Invalid request parameters.', errorInfo);
        }

        // If we've exhausted retries or hit non-retryable error
        throw new APIError('API request failed.', errorInfo);
      }
    }
  }

  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Custom error classes
class APIError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'APIError';
    this.details = details;
  }
}

class AuthenticationError extends APIError {
  constructor(message, details) {
    super(message, details);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends APIError {
  constructor(message, details) {
    super(message, details);
    this.name = 'AuthorizationError';
  }
}

class ValidationError extends APIError {
  constructor(message, details) {
    super(message, details);
    this.name = 'ValidationError';
  }
}

// Usage
try {
  const result = await APIErrorHandler.handleApiCall(
    () => api.composePost(request),
    { maxRetries: 3, operation: 'compose_post' }
  );
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Refresh tokens or redirect to login
  } else if (error instanceof ValidationError) {
    // Show user-friendly validation errors
  } else {
    // General error handling
  }
}
```

## Testing Your Integration

### Unit Tests

```javascript
const { describe, it, expect, jest } = require('@jest/globals');
const AgentFeedAPI = require('./AgentFeedAPI');

describe('AgentFeedAPI', () => {
  let api;
  let mockAxios;

  beforeEach(() => {
    mockAxios = {
      post: jest.fn(),
      get: jest.fn()
    };
    api = new AgentFeedAPI('test_key');
    api.client = mockAxios;
  });

  describe('composePost', () => {
    it('should compose post successfully', async () => {
      const mockResponse = {
        data: {
          content: 'Enhanced content',
          quality_score: 0.9,
          metadata: { character_count: 50 }
        }
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await api.composePost({
        content_type: 'enhance',
        platform: 'twitter',
        input_content: 'Test content'
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        '/api/posts/compose',
        expect.objectContaining({
          content_type: 'enhance',
          platform: 'twitter',
          input_content: 'Test content'
        })
      );

      expect(result.content).toBe('Enhanced content');
      expect(result.quality_score).toBe(0.9);
    });

    it('should handle rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.response = {
        status: 429,
        headers: { 'x-ratelimit-retry-after': '30' }
      };

      mockAxios.post.mockRejectedValue(rateLimitError);

      await expect(api.composePost({
        content_type: 'enhance',
        platform: 'twitter',
        input_content: 'Test'
      })).rejects.toThrow('Rate limited');
    });
  });
});
```

### Integration Tests

```python
import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from your_module import AgentFeedAPI, PostComposeRequest

@pytest.mark.asyncio
class TestAgentFeedAPIIntegration:
    
    @pytest.fixture
    async def api(self):
        async with AgentFeedAPI('test_api_key') as client:
            yield client
    
    async def test_full_content_workflow(self, api):
        """Test complete content creation and analysis workflow."""
        
        # Mock API responses
        with patch.object(api, '_request') as mock_request:
            # Mock compose response
            mock_request.side_effect = [
                {
                    'content': 'Enhanced test content with AI optimization',
                    'quality_score': 0.85,
                    'metadata': {'character_count': 45}
                },
                {
                    'overall_score': 0.87,
                    'analysis_results': {
                        'engagement_potential': {'score': 0.9},
                        'readability_score': {'flesch_reading_ease': 75}
                    }
                }
            ]
            
            # Step 1: Compose content
            compose_request = PostComposeRequest(
                content_type='enhance',
                platform='twitter',
                input_content='Test content',
                parameters={'tone': 'professional'}
            )
            
            composition_result = await api.compose_post(compose_request)
            
            assert composition_result['content'] is not None
            assert composition_result['quality_score'] >= 0.8
            
            # Step 2: Analyze quality
            quality_result = await api.analyze_quality(
                composition_result['content'],
                'twitter'
            )
            
            assert quality_result['overall_score'] >= 0.8
            assert 'analysis_results' in quality_result
            
            # Verify API calls
            assert mock_request.call_count == 2

    async def test_error_recovery(self, api):
        """Test error handling and recovery."""
        
        with patch.object(api, '_request') as mock_request:
            # First call fails with rate limit
            # Second call succeeds
            mock_request.side_effect = [
                RateLimitError("Rate limited", 1),
                {'content': 'Success after retry'}
            ]
            
            with pytest.raises(RateLimitError):
                await api.compose_post(PostComposeRequest(
                    content_type='enhance',
                    platform='twitter',
                    input_content='Test'
                ))

@pytest.mark.integration
class TestRealAPIIntegration:
    """Integration tests that hit the real API (requires valid API key)."""
    
    @pytest.fixture(scope="session")
    def api_key(self):
        import os
        api_key = os.getenv('AGENTFEED_TEST_API_KEY')
        if not api_key:
            pytest.skip("No test API key provided")
        return api_key
    
    @pytest.mark.asyncio
    async def test_real_api_compose(self, api_key):
        """Test against real API endpoint."""
        
        async with AgentFeedAPI(api_key) as api:
            result = await api.compose_post(PostComposeRequest(
                content_type='enhance',
                platform='twitter',
                input_content='Testing API integration',
                parameters={'tone': 'casual'}
            ))
            
            assert 'content' in result
            assert 'quality_score' in result
            assert result['quality_score'] > 0
```

## Performance Optimization

### 1. Connection Pooling

```python
import aiohttp
from aiohttp import ClientSession, TCPConnector

class OptimizedAgentFeedAPI:
    _session = None
    
    @classmethod
    async def get_session(cls):
        if cls._session is None or cls._session.closed:
            connector = TCPConnector(
                limit=100,              # Total connection pool size
                limit_per_host=20,      # Per-host connection limit
                ttl_dns_cache=300,      # DNS cache TTL
                use_dns_cache=True,
                keepalive_timeout=30,   # Keep connections alive
                enable_cleanup_closed=True
            )
            
            cls._session = ClientSession(
                connector=connector,
                timeout=aiohttp.ClientTimeout(
                    total=30,          # Total timeout
                    connect=5,         # Connection timeout
                    sock_read=10       # Socket read timeout
                )
            )
        
        return cls._session
    
    @classmethod
    async def cleanup(cls):
        if cls._session and not cls._session.closed:
            await cls._session.close()
```

### 2. Response Caching

```javascript
class CachedAgentFeedAPI extends AgentFeedAPI {
  constructor(apiKey, cacheOptions = {}) {
    super(apiKey);
    this.cache = new Map();
    this.cacheTTL = cacheOptions.ttl || 300000; // 5 minutes default
    this.maxCacheSize = cacheOptions.maxSize || 1000;
  }

  async getCached(key, operation) {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    const result = await operation();
    
    // Implement LRU eviction
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  }

  async getFeedAnalytics(timeRange = '24h', useCache = true) {
    if (!useCache) {
      return super.getFeedAnalytics(timeRange);
    }

    const cacheKey = `analytics:${timeRange}`;
    return this.getCached(cacheKey, () => super.getFeedAnalytics(timeRange));
  }

  async getPostTemplates(filters = {}, useCache = true) {
    if (!useCache) {
      return super.getPostTemplates(filters);
    }

    const cacheKey = `templates:${JSON.stringify(filters)}`;
    return this.getCached(cacheKey, () => super.getPostTemplates(filters));
  }
}
```

This comprehensive implementation guide provides practical examples and patterns for integrating with the Distributed Posting Intelligence API, covering authentication, error handling, performance optimization, and testing strategies.