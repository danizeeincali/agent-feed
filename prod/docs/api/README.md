# Distributed Posting Intelligence API Documentation

## Overview

The Distributed Posting Intelligence API is a comprehensive system for managing AI-powered content creation, multi-agent coordination, feed optimization, and content management across multiple social media platforms.

## 🚀 Key Features

- **AI-Powered Content Composition**: Generate and enhance content using advanced AI models
- **Multi-Agent Coordination**: Orchestrate complex tasks across specialized AI agents
- **Feed Intelligence**: Real-time analytics and optimization recommendations
- **Content Management**: Templates, quality rules, and engagement pattern analysis
- **Performance Monitoring**: System health checks and comprehensive metrics

## 📁 Documentation Structure

```
/prod/docs/api/
├── README.md                    # This file - overview and quick start
├── openapi.yaml                # Complete OpenAPI 3.0 specification
├── authentication.md           # Authentication and authorization guide
├── rate-limiting.md            # Rate limiting and throttling strategies
├── implementation-guide.md     # Comprehensive implementation guide
├── schemas/
│   ├── request-schemas.yaml    # Request schema definitions
│   └── response-schemas.yaml   # Response schema definitions
└── examples/
    └── postman-collection.json # Postman collection for testing
```

## 🔧 Quick Start

### 1. Authentication

Get your API key from the dashboard or create one programmatically:

```bash
# Create API key with JWT token
curl -X POST https://api.agentfeed.com/v1/auth/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Integration",
    "scopes": ["read:posts", "write:posts", "read:analytics"]
  }'
```

### 2. Basic Usage Examples

#### Compose Enhanced Content

```bash
curl -X POST https://api.agentfeed.com/v1/api/posts/compose \
  -H "X-API-Key: apk_live_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "content_type": "enhance",
    "platform": "twitter",
    "input_content": "We just launched our new product!",
    "parameters": {
      "tone": "professional",
      "hashtags": true,
      "include_cta": true
    }
  }'
```

#### Coordinate Multiple Agents

```bash
curl -X POST https://api.agentfeed.com/v1/api/agents/coordinate \
  -H "X-API-Key: apk_live_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Analyze competitor content and generate 5 optimized posts",
    "strategy": "parallel",
    "constraints": {
      "max_agents": 5,
      "timeout": 1800
    }
  }'
```

#### Get Feed Analytics

```bash
curl -X GET "https://api.agentfeed.com/v1/api/feed/analytics?time_range=7d&platform=twitter" \
  -H "X-API-Key: apk_live_your_key_here"
```

## 📊 Core API Endpoints

### Posting Intelligence
- `POST /api/posts/compose` - AI-powered content composition
- `GET /api/posts/templates` - Retrieve content templates
- `POST /api/posts/analyze-quality` - Analyze content quality

### Agent Coordination
- `GET /api/agents/capabilities` - Get available agent capabilities
- `POST /api/agents/coordinate` - Orchestrate multi-agent tasks
- `GET /api/agents/status` - Monitor agent status and performance

### Feed Intelligence
- `GET /api/feed/analytics` - Comprehensive feed analytics
- `POST /api/feed/optimize` - Get optimization recommendations
- `GET /api/feed/health` - Feed health monitoring

### Content Management
- `GET|POST|PUT|DELETE /api/content/templates` - Template management
- `GET|POST /api/content/quality-rules` - Quality rule management
- `GET /api/content/engagement-patterns` - Pattern analysis

### System Monitoring
- `GET /api/system/health` - System health status
- `GET /api/system/metrics` - Performance metrics

## 🔑 Authentication Methods

### API Key (Recommended)
```http
X-API-Key: apk_live_your_api_key_here
```

### Bearer Token (JWT)
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📈 Rate Limits

| Plan | Requests/Hour | Burst Limit | Agent Tasks |
|------|---------------|-------------|-------------|
| Free | 100 | 10/min | 1 concurrent |
| Basic | 1,000 | 50/min | 3 concurrent |
| Pro | 10,000 | 200/min | 10 concurrent |
| Enterprise | 100,000 | 1000/min | Unlimited |

Rate limit headers are included in all responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705467600
```

## 🌐 Base URLs

- **Production**: `https://api.agentfeed.com/v1`
- **Staging**: `https://staging-api.agentfeed.com/v1`
- **Development**: `http://localhost:3000/v1`

## 📝 Request/Response Format

All requests and responses use JSON format with UTF-8 encoding.

### Standard Request Headers
```http
Content-Type: application/json
X-API-Key: your_api_key
Accept: application/json
```

### Standard Response Structure
```json
{
  "data": { ... },
  "metadata": {
    "request_id": "req_123456789",
    "timestamp": "2024-01-15T14:30:00Z",
    "processing_time_ms": 150
  }
}
```

### Error Response Structure
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "platform",
        "message": "Platform is required"
      }
    ]
  },
  "timestamp": "2024-01-15T14:30:00Z",
  "request_id": "req_123456789"
}
```

## 🔗 SDKs and Libraries

### Official SDKs
- **JavaScript/Node.js**: `npm install @agentfeed/api-client`
- **Python**: `pip install agentfeed-api`
- **PHP**: `composer require agentfeed/api-client`
- **Go**: `go get github.com/agentfeed/go-client`

### Community SDKs
- **Ruby**: `gem install agentfeed-ruby`
- **Java**: Available via Maven Central
- **C#**: Available via NuGet

## 📖 Usage Examples by Platform

### JavaScript/Node.js
```javascript
const { AgentFeedAPI } = require('@agentfeed/api-client');

const api = new AgentFeedAPI('apk_live_your_key');

const result = await api.posts.compose({
  content_type: 'enhance',
  platform: 'twitter',
  input_content: 'Hello world!'
});

console.log(result.content);
```

### Python
```python
from agentfeed import AgentFeedAPI

api = AgentFeedAPI('apk_live_your_key')

result = api.posts.compose(
    content_type='enhance',
    platform='twitter',
    input_content='Hello world!'
)

print(result.content)
```

### PHP
```php
<?php
use AgentFeed\Client;

$client = new Client('apk_live_your_key');

$result = $client->posts()->compose([
    'content_type' => 'enhance',
    'platform' => 'twitter',
    'input_content' => 'Hello world!'
]);

echo $result['content'];
?>
```

## 🔍 Testing Your Integration

### Using Postman
1. Import the [Postman collection](examples/postman-collection.json)
2. Set your API key in the collection variables
3. Run the requests to test your integration

### Using cURL
See the [Implementation Guide](implementation-guide.md) for comprehensive cURL examples.

### Webhook Testing
```javascript
// Express.js webhook handler
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-agentfeed-signature'];
  
  if (verifySignature(req.body, signature)) {
    handleWebhookEvent(req.body);
    res.status(200).send('OK');
  } else {
    res.status(401).send('Invalid signature');
  }
});
```

## 📊 Monitoring and Observability

### Health Check Endpoint
```bash
curl -X GET https://api.agentfeed.com/v1/api/system/health \
  -H "X-API-Key: your_api_key"
```

### Metrics Endpoint
```bash
curl -X GET "https://api.agentfeed.com/v1/api/system/metrics?time_range=1h" \
  -H "X-API-Key: your_api_key"
```

### Custom Monitoring
- Set up alerts for rate limit violations
- Monitor response times and error rates
- Track agent coordination performance
- Monitor content quality scores

## 🚨 Error Handling

### Common Error Codes
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `429` - Rate Limited (quota exceeded)
- `500` - Internal Server Error

### Best Practices
1. **Implement retry logic** with exponential backoff
2. **Handle rate limits** by respecting retry-after headers
3. **Log errors** with request IDs for debugging
4. **Validate inputs** before making API calls
5. **Monitor error rates** and set up alerts

## 🔐 Security Best Practices

1. **Secure API Keys**
   - Store securely (environment variables, key management systems)
   - Rotate regularly (quarterly recommended)
   - Use restricted keys with minimal scopes
   - Implement IP whitelisting

2. **Request Security**
   - Always use HTTPS
   - Validate webhook signatures
   - Implement request replay protection
   - Use proper CORS headers

3. **Data Privacy**
   - Don't log sensitive data
   - Implement data retention policies
   - Use encryption for stored data
   - Follow GDPR/CCPA compliance

## 📚 Additional Resources

- **[OpenAPI Specification](openapi.yaml)** - Complete API specification
- **[Authentication Guide](authentication.md)** - Detailed authentication setup
- **[Rate Limiting Guide](rate-limiting.md)** - Understanding rate limits
- **[Implementation Guide](implementation-guide.md)** - Comprehensive examples
- **[GitHub Repository](https://github.com/ruvnet/agent-feed)** - Source code and examples
- **[Developer Portal](https://developers.agentfeed.com)** - Interactive documentation
- **[Community Forum](https://community.agentfeed.com)** - Developer discussions
- **[Status Page](https://status.agentfeed.com)** - Service status and incidents

## 🆘 Support

### Developer Support
- **Email**: api-support@agentfeed.com
- **Documentation**: https://docs.agentfeed.com
- **Discord**: https://discord.gg/agentfeed
- **GitHub Issues**: https://github.com/ruvnet/agent-feed/issues

### SLA and Uptime
- **Uptime**: 99.9% SLA
- **Response Time**: P95 < 500ms
- **Support Response**: 
  - Critical: < 1 hour
  - High: < 4 hours
  - Medium: < 24 hours

## 📄 License

This API documentation is licensed under MIT License. See the [LICENSE](https://github.com/ruvnet/agent-feed/blob/main/LICENSE) file for details.

---

**Version**: 1.0.0  
**Last Updated**: January 2024  
**API Version**: v1

For the most up-to-date documentation, visit: https://docs.agentfeed.com