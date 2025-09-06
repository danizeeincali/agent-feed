# API Contracts for Web Preview System

## Overview

This document defines the complete API contract for the web preview system, including REST endpoints, WebSocket events, and internal service interfaces.

## Base API Configuration

```typescript
interface APIConfig {
  baseURL: string;
  version: string;
  timeout: number;
  retries: number;
  rateLimit: {
    requests: number;
    window: number; // milliseconds
  };
  authentication: {
    required: boolean;
    type: 'bearer' | 'api-key' | 'none';
  };
}

const defaultConfig: APIConfig = {
  baseURL: 'https://api.agentfeed.com',
  version: 'v1',
  timeout: 10000,
  retries: 3,
  rateLimit: {
    requests: 100,
    window: 60000, // 1 minute
  },
  authentication: {
    required: false,
    type: 'none',
  },
};
```

## 1. Link Preview API Endpoints

### 1.1 Generate Single Preview

```http
POST /api/v1/previews
Content-Type: application/json
Authorization: Bearer <token> (optional)

Request Body:
{
  "url": "https://example.com/article",
  "options": {
    "includeImages": true,
    "includeThumbnails": true,
    "thumbnailSizes": ["small", "medium", "large"],
    "maxImageSize": 1024,
    "timeout": 10000,
    "forceRefresh": false,
    "embedOptions": {
      "enableYouTube": true,
      "enableTwitter": false,
      "enableInstagram": false
    }
  }
}

Response (200 OK):
{
  "success": true,
  "data": {
    "url": "https://example.com/article",
    "title": "Sample Article Title",
    "description": "This is a sample article description that provides context...",
    "images": {
      "thumbnail": "https://cdn.agentfeed.com/thumbnails/abc123/small.webp",
      "small": "https://cdn.agentfeed.com/thumbnails/abc123/small.webp",
      "medium": "https://cdn.agentfeed.com/thumbnails/abc123/medium.webp",
      "large": "https://cdn.agentfeed.com/thumbnails/abc123/large.webp",
      "original": "https://example.com/image.jpg"
    },
    "metadata": {
      "type": "article",
      "siteName": "Example Website",
      "author": "John Doe",
      "publishedAt": "2024-01-15T10:30:00Z",
      "readingTime": 5,
      "wordCount": 1200,
      "tags": ["technology", "web-development"],
      "language": "en",
      "canonicalUrl": "https://example.com/article"
    },
    "openGraph": {
      "title": "Sample Article Title",
      "description": "Article description...",
      "image": "https://example.com/og-image.jpg",
      "type": "article",
      "url": "https://example.com/article",
      "siteName": "Example Website"
    },
    "twitterCard": {
      "card": "summary_large_image",
      "title": "Sample Article Title",
      "description": "Article description...",
      "image": "https://example.com/twitter-image.jpg",
      "site": "@example",
      "creator": "@johndoe"
    },
    "schemaOrg": {
      "type": "Article",
      "headline": "Sample Article Title",
      "author": {
        "type": "Person",
        "name": "John Doe"
      },
      "datePublished": "2024-01-15T10:30:00Z",
      "dateModified": "2024-01-15T14:20:00Z"
    },
    "cached": false,
    "generatedAt": "2024-01-15T15:45:30Z",
    "expiresAt": "2024-01-16T15:45:30Z",
    "processingTime": 1250
  },
  "meta": {
    "requestId": "req_abc123def456",
    "timestamp": "2024-01-15T15:45:30Z",
    "version": "1.0.0"
  }
}

Error Response (400 Bad Request):
{
  "success": false,
  "error": {
    "code": "INVALID_URL",
    "message": "The provided URL is not valid",
    "details": {
      "url": "invalid-url",
      "reason": "Missing protocol"
    }
  },
  "meta": {
    "requestId": "req_error123",
    "timestamp": "2024-01-15T15:45:30Z"
  }
}
```

### 1.2 Batch Preview Generation

```http
POST /api/v1/previews/batch
Content-Type: application/json

Request Body:
{
  "urls": [
    "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://github.com/user/repository",
    "https://example.com/article",
    "https://twitter.com/user/status/123456"
  ],
  "options": {
    "includeImages": true,
    "thumbnailSizes": ["small", "medium"],
    "concurrent": 4,
    "failFast": false,
    "timeout": 30000
  }
}

Response (200 OK):
{
  "success": true,
  "data": {
    "previews": [
      {
        "url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
        "success": true,
        "data": { /* preview data */ },
        "cached": false,
        "processingTime": 890
      },
      {
        "url": "https://github.com/user/repository", 
        "success": true,
        "data": { /* preview data */ },
        "cached": true,
        "processingTime": 45
      },
      {
        "url": "https://example.com/article",
        "success": true,
        "data": { /* preview data */ },
        "cached": false,
        "processingTime": 1340
      },
      {
        "url": "https://twitter.com/user/status/123456",
        "success": false,
        "error": {
          "code": "ACCESS_DENIED",
          "message": "Unable to access protected content"
        },
        "processingTime": 5000
      }
    ],
    "summary": {
      "total": 4,
      "successful": 3,
      "failed": 1,
      "cached": 1,
      "totalProcessingTime": 7275
    }
  },
  "meta": {
    "requestId": "req_batch789",
    "timestamp": "2024-01-15T15:45:30Z"
  }
}
```

### 1.3 Get Cached Preview

```http
GET /api/v1/previews/cache/{urlHash}
Parameters:
  - urlHash: SHA-256 hash of the URL
  - include: comma-separated list (metadata,images,openGraph,twitterCard,schemaOrg)

Response (200 OK):
{
  "success": true,
  "data": {
    /* Same structure as single preview response */
    "cached": true,
    "generatedAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-01-16T10:30:00Z",
    "lastAccessed": "2024-01-15T15:45:30Z",
    "hitCount": 42
  }
}

Response (404 Not Found):
{
  "success": false,
  "error": {
    "code": "CACHE_MISS",
    "message": "No cached preview found for this URL"
  }
}
```

### 1.4 Invalidate Cache

```http
DELETE /api/v1/previews/cache
Content-Type: application/json

Request Body:
{
  "urls": ["https://example.com/article"], // optional, if not provided clears all
  "pattern": "*.example.com", // optional glob pattern
  "olderThan": "2024-01-14T00:00:00Z" // optional timestamp
}

Response (200 OK):
{
  "success": true,
  "data": {
    "invalidated": 15,
    "errors": []
  }
}
```

## 2. YouTube Integration API

### 2.1 Get YouTube Video Metadata

```http
GET /api/v1/previews/youtube/{videoId}
Parameters:
  - videoId: YouTube video ID
  - includeThumbnails: boolean (default: true)
  - includeStats: boolean (default: false)

Response (200 OK):
{
  "success": true,
  "data": {
    "videoId": "dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up",
    "description": "The official video for 'Never Gonna Give You Up' by Rick Astley...",
    "thumbnails": {
      "default": "https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg",
      "medium": "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", 
      "high": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      "standard": "https://img.youtube.com/vi/dQw4w9WgXcQ/sddefault.jpg",
      "maxres": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
    },
    "duration": "PT3M33S",
    "publishedAt": "2009-10-25T06:57:33Z",
    "channelId": "UCuAXFkgsw1L7xaCfnd5JJOw",
    "channelTitle": "Rick Astley",
    "categoryId": "10",
    "tags": ["rick astley", "never gonna give you up", "rickroll"],
    "statistics": {
      "viewCount": "1400000000",
      "likeCount": "15000000",
      "commentCount": "3200000"
    },
    "embedOptions": {
      "allowFullscreen": true,
      "allowAutoplay": true,
      "privacyEnhanced": true,
      "embedUrl": "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
    },
    "liveBroadcastContent": "none",
    "cached": true,
    "expiresAt": "2024-01-16T10:30:00Z"
  }
}
```

### 2.2 Generate YouTube Embed Code

```http
POST /api/v1/previews/youtube/{videoId}/embed
Content-Type: application/json

Request Body:
{
  "width": 560,
  "height": 315,
  "responsive": true,
  "autoplay": false,
  "controls": true,
  "privacyMode": true,
  "startTime": 30,
  "endTime": 180,
  "quality": "hd720",
  "language": "en",
  "captionsLanguage": "en"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "embedCode": "<iframe width=\"560\" height=\"315\" src=\"https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=30&end=180\" frameborder=\"0\" allowfullscreen></iframe>",
    "embedUrl": "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=30&end=180",
    "thumbnailUrl": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    "responsive": {
      "aspectRatio": "16:9",
      "containerCSS": ".youtube-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; }",
      "iframeCSS": ".youtube-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }"
    }
  }
}
```

## 3. Image Processing API

### 3.1 Generate Thumbnails

```http
POST /api/v1/images/thumbnails
Content-Type: application/json

Request Body:
{
  "url": "https://example.com/image.jpg",
  "sizes": [
    { "name": "small", "width": 150, "height": 150, "crop": "center" },
    { "name": "medium", "width": 300, "height": 200, "crop": "smart" },
    { "name": "large", "width": 600, "height": 400, "crop": "none" }
  ],
  "formats": ["webp", "jpeg"],
  "quality": 85,
  "optimize": true,
  "progressive": true
}

Response (200 OK):
{
  "success": true,
  "data": {
    "original": {
      "url": "https://example.com/image.jpg",
      "width": 1920,
      "height": 1080,
      "format": "jpeg",
      "size": 245000,
      "aspectRatio": 1.78
    },
    "thumbnails": {
      "small": {
        "webp": "https://cdn.agentfeed.com/thumbs/abc123/small.webp",
        "jpeg": "https://cdn.agentfeed.com/thumbs/abc123/small.jpg"
      },
      "medium": {
        "webp": "https://cdn.agentfeed.com/thumbs/abc123/medium.webp",
        "jpeg": "https://cdn.agentfeed.com/thumbs/abc123/medium.jpg"
      },
      "large": {
        "webp": "https://cdn.agentfeed.com/thumbs/abc123/large.webp",
        "jpeg": "https://cdn.agentfeed.com/thumbs/abc123/large.jpg"
      }
    },
    "responsive": {
      "srcSet": "https://cdn.agentfeed.com/thumbs/abc123/small.webp 150w, https://cdn.agentfeed.com/thumbs/abc123/medium.webp 300w, https://cdn.agentfeed.com/thumbs/abc123/large.webp 600w",
      "sizes": "(max-width: 300px) 150px, (max-width: 600px) 300px, 600px"
    },
    "processingTime": 2340,
    "cached": false,
    "expiresAt": "2024-01-22T15:45:30Z"
  }
}
```

### 3.2 Optimize Image

```http
POST /api/v1/images/optimize
Content-Type: application/json

Request Body:
{
  "url": "https://example.com/large-image.png",
  "targetFormat": "webp",
  "quality": 80,
  "maxWidth": 1200,
  "maxHeight": 800,
  "preserveAspectRatio": true,
  "removeMetadata": true,
  "progressive": true
}

Response (200 OK):
{
  "success": true,
  "data": {
    "optimizedUrl": "https://cdn.agentfeed.com/optimized/def456.webp",
    "originalSize": 1500000,
    "optimizedSize": 180000,
    "savings": 0.88,
    "width": 1200,
    "height": 675,
    "format": "webp",
    "quality": 80
  }
}
```

## 4. Cache Management API

### 4.1 Cache Statistics

```http
GET /api/v1/cache/stats
Parameters:
  - type: metadata|thumbnails|all (default: all)
  - timeframe: 1h|24h|7d|30d (default: 24h)

Response (200 OK):
{
  "success": true,
  "data": {
    "metadata": {
      "totalEntries": 15420,
      "totalSize": "245MB",
      "hitRate": 0.847,
      "missRate": 0.153,
      "expiredEntries": 234,
      "averageAge": "4.2 hours"
    },
    "thumbnails": {
      "totalEntries": 8921,
      "totalSize": "1.2GB", 
      "hitRate": 0.923,
      "missRate": 0.077,
      "expiredEntries": 45,
      "averageAge": "2.1 days"
    },
    "performance": {
      "averageResponseTime": 89,
      "p95ResponseTime": 234,
      "p99ResponseTime": 456,
      "errorRate": 0.012
    },
    "timeframe": "24h",
    "generatedAt": "2024-01-15T15:45:30Z"
  }
}
```

### 4.2 Cache Health Check

```http
GET /api/v1/cache/health

Response (200 OK):
{
  "success": true,
  "data": {
    "status": "healthy",
    "redis": {
      "connected": true,
      "memory": "128MB / 512MB",
      "keys": 15420,
      "avgTTL": "18.4 hours"
    },
    "fileSystem": {
      "available": true,
      "diskUsage": "1.2GB / 10GB", 
      "inodeUsage": "8921 / 100000"
    },
    "cdn": {
      "status": "operational",
      "hitRate": 0.94,
      "avgResponseTime": 45
    },
    "lastCleanup": "2024-01-15T06:00:00Z",
    "nextCleanup": "2024-01-16T06:00:00Z"
  }
}
```

## 5. WebSocket Events

### 5.1 Connection Events

```typescript
// Client -> Server: Connection with options
interface ConnectEvent {
  type: 'connect';
  data: {
    userId?: string;
    subscriptions: string[]; // ['previews', 'cache', 'youtube']
    options: {
      enableRealTimeUpdates: boolean;
      enableProgressUpdates: boolean;
    };
  };
}

// Server -> Client: Connection acknowledged
interface ConnectedEvent {
  type: 'connected';
  data: {
    connectionId: string;
    supportedEvents: string[];
    serverTime: string;
  };
}
```

### 5.2 Preview Generation Events

```typescript
// Server -> Client: Preview generation started
interface PreviewStartEvent {
  type: 'preview:start';
  data: {
    requestId: string;
    url: string;
    timestamp: string;
  };
}

// Server -> Client: Preview generation progress
interface PreviewProgressEvent {
  type: 'preview:progress';
  data: {
    requestId: string;
    url: string;
    stage: 'fetching' | 'parsing' | 'processing' | 'caching';
    progress: number; // 0-100
    message: string;
  };
}

// Server -> Client: Preview generation completed
interface PreviewCompleteEvent {
  type: 'preview:complete';
  data: {
    requestId: string;
    url: string;
    success: boolean;
    preview?: LinkPreview;
    error?: PreviewError;
    processingTime: number;
  };
}

// Server -> Client: Cache invalidation notification
interface CacheInvalidateEvent {
  type: 'cache:invalidate';
  data: {
    urls: string[];
    reason: 'expired' | 'manual' | 'error' | 'update';
    timestamp: string;
  };
}
```

### 5.3 Real-time Updates

```typescript
// Server -> Client: Content updated at source
interface ContentUpdateEvent {
  type: 'content:update';
  data: {
    url: string;
    changes: {
      title?: boolean;
      description?: boolean;
      image?: boolean;
      metadata?: boolean;
    };
    newPreview: LinkPreview;
    timestamp: string;
  };
}

// Server -> Client: System status changes
interface SystemStatusEvent {
  type: 'system:status';
  data: {
    service: 'preview' | 'cache' | 'youtube' | 'images';
    status: 'healthy' | 'degraded' | 'down';
    message: string;
    affectedFeatures?: string[];
    estimatedRecovery?: string;
  };
}
```

## 6. Error Codes and Types

### 6.1 Standard Error Structure

```typescript
interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    retryable?: boolean;
    retryAfter?: number; // seconds
  };
  meta: {
    requestId: string;
    timestamp: string;
    version?: string;
  };
}
```

### 6.2 Error Code Categories

#### URL Validation Errors (1xxx)
```typescript
const URL_ERRORS = {
  INVALID_URL: {
    code: '1001',
    message: 'The provided URL is not valid',
    retryable: false
  },
  BLOCKED_DOMAIN: {
    code: '1002', 
    message: 'This domain is blocked',
    retryable: false
  },
  MALFORMED_URL: {
    code: '1003',
    message: 'URL format is incorrect',
    retryable: false
  },
  URL_TOO_LONG: {
    code: '1004',
    message: 'URL exceeds maximum length',
    retryable: false
  }
};
```

#### Network Errors (2xxx)
```typescript
const NETWORK_ERRORS = {
  TIMEOUT: {
    code: '2001',
    message: 'Request timeout',
    retryable: true,
    retryAfter: 5
  },
  CONNECTION_FAILED: {
    code: '2002',
    message: 'Unable to connect to target server',
    retryable: true,
    retryAfter: 10
  },
  DNS_RESOLUTION_FAILED: {
    code: '2003',
    message: 'Unable to resolve domain name',
    retryable: true,
    retryAfter: 30
  },
  SSL_ERROR: {
    code: '2004',
    message: 'SSL certificate validation failed',
    retryable: false
  }
};
```

#### Content Processing Errors (3xxx)
```typescript
const PROCESSING_ERRORS = {
  PARSING_FAILED: {
    code: '3001',
    message: 'Unable to parse page content',
    retryable: false
  },
  NO_CONTENT: {
    code: '3002',
    message: 'No extractable content found',
    retryable: false
  },
  CONTENT_TOO_LARGE: {
    code: '3003',
    message: 'Content size exceeds limit',
    retryable: false
  },
  INVALID_CONTENT_TYPE: {
    code: '3004',
    message: 'Unsupported content type',
    retryable: false
  }
};
```

#### Rate Limiting Errors (4xxx)
```typescript
const RATE_LIMIT_ERRORS = {
  RATE_LIMITED: {
    code: '4001',
    message: 'Rate limit exceeded',
    retryable: true,
    retryAfter: 60
  },
  QUOTA_EXCEEDED: {
    code: '4002',
    message: 'Daily quota exceeded',
    retryable: true,
    retryAfter: 86400
  }
};
```

#### Cache Errors (5xxx)
```typescript
const CACHE_ERRORS = {
  CACHE_UNAVAILABLE: {
    code: '5001',
    message: 'Cache service unavailable',
    retryable: true,
    retryAfter: 30
  },
  CACHE_CORRUPTION: {
    code: '5002',
    message: 'Cached data is corrupted',
    retryable: false
  }
};
```

## 7. SDK Integration

### 7.1 JavaScript SDK

```typescript
import { PreviewClient } from '@agentfeed/preview-sdk';

const client = new PreviewClient({
  apiKey: 'your-api-key',
  baseURL: 'https://api.agentfeed.com',
  version: 'v1',
  timeout: 10000,
  retries: 3,
});

// Generate single preview
const preview = await client.generatePreview('https://example.com');

// Generate batch previews
const previews = await client.generateBatch([
  'https://example.com',
  'https://youtube.com/watch?v=123'
]);

// WebSocket connection
client.connect();
client.on('preview:complete', (data) => {
  console.log('Preview ready:', data);
});

// YouTube specific methods
const youTubeData = await client.youtube.getMetadata('dQw4w9WgXcQ');
const embedCode = await client.youtube.generateEmbed('dQw4w9WgXcQ', {
  width: 560,
  height: 315,
  responsive: true
});

// Image processing
const thumbnails = await client.images.generateThumbnails('https://example.com/image.jpg', {
  sizes: ['small', 'medium', 'large'],
  formats: ['webp', 'jpeg']
});
```

### 7.2 React Hooks SDK

```typescript
import { usePreview, useYouTube, useThumbnails } from '@agentfeed/react-preview-hooks';

function MyComponent() {
  // Basic preview hook
  const { preview, loading, error } = usePreview('https://example.com');
  
  // Batch preview hook
  const { previews, loading: batchLoading } = useBatchPreview([
    'https://example.com',
    'https://github.com/user/repo'
  ]);
  
  // YouTube specific hook
  const { metadata, embedCode } = useYouTube('dQw4w9WgXcQ', {
    autoGenerateEmbed: true,
    embedOptions: { responsive: true }
  });
  
  // Real-time updates
  usePreviewUpdates('https://example.com', (updatedPreview) => {
    console.log('Content updated:', updatedPreview);
  });
  
  return (
    <div>
      {loading ? <Skeleton /> : <PreviewCard preview={preview} />}
    </div>
  );
}
```

## 8. Rate Limiting and Quotas

### 8.1 Rate Limiting Rules

```typescript
interface RateLimitConfig {
  // Per-endpoint limits
  endpoints: {
    '/api/v1/previews': {
      requests: 100,
      window: 60000, // 1 minute
      burst: 10
    },
    '/api/v1/previews/batch': {
      requests: 20,
      window: 60000,
      burst: 5
    },
    '/api/v1/images/thumbnails': {
      requests: 200,
      window: 60000,
      burst: 20
    }
  };
  
  // Per-user quotas
  daily: {
    free: 1000,
    pro: 10000,
    enterprise: 100000
  };
  
  // IP-based limits
  ipLimits: {
    requests: 1000,
    window: 3600000, // 1 hour
    concurrent: 50
  };
}
```

### 8.2 Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1642262400
X-RateLimit-Window: 60
X-Quota-Limit: 10000
X-Quota-Remaining: 8540
X-Quota-Reset: 1642291200
```

## 9. Monitoring and Analytics

### 9.1 Metrics Endpoint

```http
GET /api/v1/metrics
Authorization: Bearer <admin-token>

Response (200 OK):
{
  "success": true,
  "data": {
    "requests": {
      "total": 1250000,
      "success": 1180000,
      "errors": 70000,
      "rate": 125.5
    },
    "performance": {
      "avgResponseTime": 234,
      "p50": 189,
      "p95": 567,
      "p99": 1234
    },
    "cache": {
      "hitRate": 0.847,
      "size": "2.4GB",
      "entries": 45000
    },
    "errors": {
      "network": 0.023,
      "parsing": 0.014,
      "timeout": 0.019,
      "rateLimit": 0.002
    }
  }
}
```

This comprehensive API contract provides all the necessary endpoints, data structures, error handling, and integration patterns for implementing the web preview system with robust functionality and excellent developer experience.