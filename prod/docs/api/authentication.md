# Authentication and Authorization

## Overview

The Distributed Posting Intelligence API supports multiple authentication methods to accommodate different use cases and security requirements.

## Authentication Methods

### 1. Bearer Token Authentication (JWT)

**Primary authentication method for user-facing applications.**

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Token Structure
```json
{
  "sub": "user_12345",
  "iss": "api.agentfeed.com",
  "aud": "agentfeed-api",
  "exp": 1705467600,
  "iat": 1705381200,
  "scope": "read:posts write:posts read:analytics",
  "role": "premium_user",
  "plan": "pro"
}
```

#### Obtaining JWT Tokens
```http
POST /auth/token
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "scope": "read:posts write:posts read:analytics"
}
```

#### Token Refresh
```http
POST /auth/refresh
Content-Type: application/json
Authorization: Bearer <refresh_token>

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. API Key Authentication

**Recommended for service-to-service communication and server-side integrations.**

```http
X-API-Key: apk_live_1234567890abcdef
```

#### API Key Types
- **Live Keys**: `apk_live_*` - Production environment
- **Test Keys**: `apk_test_*` - Development and testing
- **Restricted Keys**: `apk_rest_*` - Limited scope and permissions

#### Creating API Keys
```http
POST /auth/api-keys
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Production Integration",
  "scopes": ["read:posts", "write:posts", "read:analytics"],
  "restrictions": {
    "ip_whitelist": ["192.168.1.100", "10.0.0.0/8"],
    "rate_limit": 1000,
    "expires_at": "2024-12-31T23:59:59Z"
  }
}
```

## Authorization Scopes

### Available Scopes

| Scope | Description |
|-------|-------------|
| `read:posts` | Read post content, templates, and metadata |
| `write:posts` | Create, update, and delete posts and templates |
| `read:analytics` | Access feed analytics and performance metrics |
| `write:analytics` | Modify analytics settings and configurations |
| `read:agents` | View agent capabilities and status |
| `write:agents` | Coordinate agents and manage tasks |
| `read:system` | Access system health and metrics |
| `write:system` | Modify system configurations |
| `admin` | Full administrative access |

### Scope Combinations
- **Content Manager**: `read:posts write:posts read:analytics`
- **Analytics Viewer**: `read:posts read:analytics read:system`
- **Agent Coordinator**: `read:posts write:posts read:agents write:agents`
- **System Administrator**: `admin`

## Rate Limiting

### Rate Limit Headers

All API responses include rate limiting headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705467600
X-RateLimit-Window: 3600
```

### Rate Limit Tiers

| Plan | Requests/Hour | Burst Limit | Agent Coordination |
|------|---------------|-------------|-------------------|
| Free | 100 | 10/min | 1 concurrent task |
| Basic | 1,000 | 50/min | 3 concurrent tasks |
| Pro | 10,000 | 200/min | 10 concurrent tasks |
| Enterprise | 100,000 | 1000/min | Unlimited |

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "API rate limit exceeded. Try again in 60 seconds.",
    "details": [
      {
        "retry_after": 60,
        "limit": 1000,
        "window": 3600
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "req_123456789"
}
```

## Security Best Practices

### Token Security
- Store tokens securely (encrypted at rest)
- Use HTTPS for all API communications
- Implement token rotation policies
- Set appropriate token expiration times

### API Key Security
- Rotate API keys regularly (quarterly recommended)
- Use restricted keys with minimal required scopes
- Implement IP whitelisting for production keys
- Monitor API key usage patterns

### Request Security
- Validate all input parameters
- Use request signing for sensitive operations
- Implement request replay protection
- Log all authentication attempts

## Error Responses

### Authentication Errors

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication token required"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "req_123456789"
}
```

### Authorization Errors

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions for this operation",
    "details": [
      {
        "required_scope": "write:posts",
        "current_scopes": ["read:posts", "read:analytics"]
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "req_123456789"
}
```

## Integration Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

// JWT Authentication
const api = axios.create({
  baseURL: 'https://api.agentfeed.com/v1',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

// API Key Authentication
const apiWithKey = axios.create({
  baseURL: 'https://api.agentfeed.com/v1',
  headers: {
    'X-API-Key': 'apk_live_1234567890abcdef',
    'Content-Type': 'application/json'
  }
});

// Request with error handling
try {
  const response = await api.post('/api/posts/compose', {
    content_type: 'enhance',
    platform: 'twitter',
    input_content: 'Hello world!'
  });
  console.log(response.data);
} catch (error) {
  if (error.response?.status === 401) {
    // Refresh token or re-authenticate
  } else if (error.response?.status === 429) {
    // Handle rate limiting
    const retryAfter = error.response.headers['x-ratelimit-reset'];
  }
}
```

### Python
```python
import requests
import time
from datetime import datetime

class AgentFeedAPI:
    def __init__(self, token=None, api_key=None):
        self.base_url = "https://api.agentfeed.com/v1"
        self.session = requests.Session()
        
        if token:
            self.session.headers.update({
                'Authorization': f'Bearer {token}'
            })
        elif api_key:
            self.session.headers.update({
                'X-API-Key': api_key
            })
        
        self.session.headers.update({
            'Content-Type': 'application/json'
        })
    
    def compose_post(self, content_type, platform, input_content, **kwargs):
        payload = {
            'content_type': content_type,
            'platform': platform,
            'input_content': input_content,
            **kwargs
        }
        
        response = self.session.post(
            f"{self.base_url}/api/posts/compose",
            json=payload
        )
        
        if response.status_code == 429:
            retry_after = int(response.headers.get('X-RateLimit-Reset', 60))
            raise RateLimitError(f"Rate limit exceeded. Retry after {retry_after} seconds")
        
        response.raise_for_status()
        return response.json()
    
    def handle_rate_limit(self, func, *args, **kwargs):
        max_retries = 3
        for attempt in range(max_retries):
            try:
                return func(*args, **kwargs)
            except RateLimitError as e:
                if attempt == max_retries - 1:
                    raise
                time.sleep(e.retry_after)

class RateLimitError(Exception):
    def __init__(self, message, retry_after=60):
        super().__init__(message)
        self.retry_after = retry_after
```

### cURL Examples

```bash
# JWT Authentication
curl -X POST https://api.agentfeed.com/v1/api/posts/compose \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "content_type": "enhance",
    "platform": "twitter",
    "input_content": "Exciting product launch!"
  }'

# API Key Authentication
curl -X GET https://api.agentfeed.com/v1/api/feed/analytics \
  -H "X-API-Key: apk_live_1234567890abcdef" \
  -H "Content-Type: application/json"

# With rate limit handling
curl -X POST https://api.agentfeed.com/v1/api/agents/coordinate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Analyze competitor content strategy",
    "strategy": "parallel"
  }' \
  --retry 3 \
  --retry-delay 10 \
  --retry-max-time 300
```

## Webhook Authentication

For webhook endpoints, verify signatures using HMAC-SHA256:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  const expectedSignature = `sha256=${computedSignature}`;
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Express.js webhook handler
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const signature = req.headers['x-agentfeed-signature'];
  const payload = req.body.toString();
  
  if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook payload
  const event = JSON.parse(payload);
  console.log('Received webhook:', event.type);
  
  res.status(200).send('OK');
});
```

This comprehensive authentication system ensures secure access to the Distributed Posting Intelligence API while supporting various integration patterns and use cases.