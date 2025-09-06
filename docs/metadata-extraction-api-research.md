# Metadata Extraction API Research & Technical Documentation 2025

## Executive Summary

This comprehensive research analyzes production-ready APIs and methods for extracting real metadata from LinkedIn posts, Twitter/X posts, generic websites, and Flow Nexus specific structures. The analysis reveals significant changes in API accessibility and alternative approaches for 2025.

## Current Implementation Analysis

### Existing LinkPreviewService Architecture

The current implementation in `/src/services/LinkPreviewService.js` demonstrates:

- **YouTube Integration**: Full oEmbed API integration with fallback mechanisms
- **Generic Scraping**: HTML parsing using JSDOM for Open Graph and Twitter Cards
- **Caching Layer**: Database-backed caching with SQLite
- **Error Handling**: Comprehensive fallback strategies

**Key Components:**
- YouTubeMetadataService class with oEmbed API integration
- LinkPreviewService for generic website scraping
- Database caching layer via DatabaseService
- Support for video detection and metadata extraction

## 1. LinkedIn Posts Metadata Extraction

### Official API Status (2025)
- **LinkedIn oEmbed**: Discontinued for public use since 2015
- **LinkedIn API**: Requires LinkedIn Partnership approval (highly restrictive)
- **Public Access**: Limited to approved enterprise partners only

### Alternative Methods

#### Third-Party APIs (Recommended)
1. **Bright Data LinkedIn Scraper API**
   - Real-time data extraction
   - Handles proxies, CAPTCHAs automatically
   - Scalable for high-volume extraction
   - Pricing: Enterprise-level (contact for pricing)

2. **Apify LinkedIn Post Scraper**
   - Post data extraction with engagement metrics
   - Author profile data extraction
   - Search-based scraping with filters
   - Pricing: Pay-per-use, starting $49/month

3. **ScrapingDog LinkedIn API**
   - Real-time profile and post data
   - Company and individual profiles
   - No data storage (live scraping)
   - Pricing: $30/month for 10K requests

#### Hidden API Scraping
- Method: Intercept browser API requests during scroll actions
- Technology: Puppeteer/Playwright for browser automation
- Challenge: Frequent endpoint changes, anti-bot measures
- Legal: Against ToS but technically possible

### Implementation Considerations
```javascript
// Rate limiting for LinkedIn scraping
const LINKEDIN_RATE_LIMITS = {
  requests_per_minute: 10,
  requests_per_hour: 100,
  cooldown_period: 60000 // 1 minute
};

// User-Agent rotation for scraping
const USER_AGENTS = [
  'Mozilla/5.0 (compatible; AgentFeed LinkPreview/1.0)',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
];
```

### Legal Compliance
- Only scrape publicly available data
- Respect robots.txt and rate limits
- Consider GDPR/privacy implications
- Implement proper attribution

## 2. Twitter/X Posts oEmbed API

### Official API Status (2025)

#### oEmbed API Endpoint
- **URL**: `https://publish.twitter.com/oembed`
- **Authentication**: Not required for oEmbed
- **Fallback**: Uses X API v2 endpoints when needed

#### Authentication Methods
1. **OAuth 2.0 Bearer Token** (App-level)
   - 450 requests per 15-minute window
   - Application-based authentication

2. **OAuth 1.0a User Context** (User-level)
   - 900 requests per 15-minute window per user
   - User-based authentication via 3-legged OAuth

#### Rate Limits (2025)
- **Free Tier**: Eliminated in 2024
- **Basic Tier**: $100/month minimum
  - 500,000 tweets per month
  - Standard rate limits apply

- **Pro Tier**: $5,000/month
  - 2 million tweets per month
  - Higher rate limits

- **Enterprise**: Custom pricing
  - Unlimited usage
  - Dedicated support

### Implementation Strategy

#### oEmbed API (Recommended for Posts)
```javascript
const TWITTER_OEMBED_ENDPOINT = 'https://publish.twitter.com/oembed';

async function getTwitterOEmbed(tweetUrl) {
  const url = `${TWITTER_OEMBED_ENDPOINT}?url=${encodeURIComponent(tweetUrl)}&omit_script=true&dnt=true`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AgentFeed LinkPreview/1.0',
      'Accept': 'application/json'
    }
  });
  
  if (response.ok) {
    return await response.json();
  }
  throw new Error(`Twitter oEmbed failed: ${response.status}`);
}
```

#### X API v2 (For Enhanced Metadata)
```javascript
// Requires API key and authentication
const TWITTER_API_V2_ENDPOINT = 'https://api.twitter.com/2/tweets';

async function getEnhancedTwitterData(tweetId, bearerToken) {
  const url = `${TWITTER_API_V2_ENDPOINT}/${tweetId}?tweet.fields=public_metrics,created_at,author_id&user.fields=name,username,profile_image_url`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'User-Agent': 'AgentFeed LinkPreview/1.0'
    }
  });
  
  if (response.ok) {
    return await response.json();
  }
  throw new Error(`Twitter API v2 failed: ${response.status}`);
}
```

### Rate Limit Management
```javascript
class TwitterRateLimit {
  constructor() {
    this.requests = [];
    this.window = 15 * 60 * 1000; // 15 minutes
    this.limit = 450; // Basic tier limit
  }
  
  async checkLimit() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.window);
    
    if (this.requests.length >= this.limit) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.window - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}
```

## 3. Generic Website Metadata Extraction

### Standard Metadata Formats

#### Open Graph Protocol
```html
<meta property="og:title" content="Page Title">
<meta property="og:description" content="Page description">
<meta property="og:image" content="https://example.com/image.jpg">
<meta property="og:url" content="https://example.com/page">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Site Name">
```

#### Twitter Cards
```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Page Title">
<meta name="twitter:description" content="Page description">
<meta name="twitter:image" content="https://example.com/image.jpg">
<meta name="twitter:creator" content="@username">
```

#### Schema.org Structured Data
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Article Title",
  "description": "Article description",
  "image": "https://example.com/image.jpg",
  "author": {
    "@type": "Person",
    "name": "Author Name"
  }
}
</script>
```

### Production-Ready Libraries

#### JavaScript/Node.js
1. **Metascraper**
   - Unified metadata extraction
   - Supports all major formats
   - Plugin architecture
   ```bash
   npm install metascraper metascraper-author metascraper-date metascraper-description metascraper-image metascraper-logo metascraper-clearbit metascraper-publisher metascraper-title metascraper-url
   ```

2. **metadata-scraper**
   - Simple URL-based extraction
   - Multiple fallback strategies
   - TypeScript support
   ```bash
   npm install metadata-scraper
   ```

3. **Puppeteer**
   - Full browser automation
   - JavaScript-rendered content
   - Dynamic metadata extraction
   ```bash
   npm install puppeteer
   ```

#### Python Alternatives
1. **Scrapy** - Production-grade scraping framework
2. **BeautifulSoup** - HTML parsing library
3. **Playwright** - Browser automation library

### Implementation Examples

#### Using Metascraper
```javascript
import metascraper from 'metascraper';
import metascraperAuthor from 'metascraper-author';
import metascraperDate from 'metascraper-date';
import metascraperDescription from 'metascraper-description';
import metascraperImage from 'metascraper-image';
import metascraperTitle from 'metascraper-title';

const scraper = metascraper([
  metascraperAuthor(),
  metascraperDate(),
  metascraperDescription(),
  metascraperImage(),
  metascraperTitle()
]);

async function extractMetadata(url, html) {
  const metadata = await scraper({ url, html });
  return {
    title: metadata.title,
    description: metadata.description,
    image: metadata.image,
    author: metadata.author,
    date: metadata.date
  };
}
```

#### Enhanced HTML Parser
```javascript
import { JSDOM } from 'jsdom';

class EnhancedMetadataParser {
  constructor() {
    this.selectors = {
      title: [
        'meta[property="og:title"]',
        'meta[name="twitter:title"]',
        'title',
        'h1'
      ],
      description: [
        'meta[property="og:description"]',
        'meta[name="twitter:description"]',
        'meta[name="description"]',
        'p'
      ],
      image: [
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        'img[src]'
      ]
    };
  }
  
  extractMetadata(html, baseUrl) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    const metadata = {};
    
    for (const [key, selectors] of Object.entries(this.selectors)) {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          metadata[key] = this.getElementContent(element, key);
          if (metadata[key]) break;
        }
      }
    }
    
    return this.cleanMetadata(metadata, baseUrl);
  }
  
  getElementContent(element, type) {
    if (element.hasAttribute('content')) {
      return element.getAttribute('content');
    }
    if (element.hasAttribute('src') && type === 'image') {
      return element.getAttribute('src');
    }
    return element.textContent?.trim();
  }
  
  cleanMetadata(metadata, baseUrl) {
    // Resolve relative URLs
    if (metadata.image && !metadata.image.startsWith('http')) {
      metadata.image = new URL(metadata.image, baseUrl).href;
    }
    
    // Truncate long text
    if (metadata.title && metadata.title.length > 200) {
      metadata.title = metadata.title.substring(0, 200) + '...';
    }
    
    if (metadata.description && metadata.description.length > 500) {
      metadata.description = metadata.description.substring(0, 500) + '...';
    }
    
    return metadata;
  }
}
```

## 4. Flow Nexus Site Structure Analysis

### Research Findings
Flow Nexus appears to reference multiple technology contexts:

1. **Flow Blockchain**: NFT metadata structures with MetadataViews
2. **Cisco Nexus Dashboard**: Network flow analysis APIs
3. **Salesforce Flow**: Workflow metadata APIs
4. **Metaflow**: Data pipeline metadata systems

### Generic Flow Platform Metadata Structure
Based on common flow-based platforms, typical metadata structure includes:

```javascript
const flowMetadataSchema = {
  id: 'string',
  title: 'string',
  description: 'string',
  author: {
    name: 'string',
    id: 'string',
    profile_image: 'string'
  },
  created_at: 'timestamp',
  updated_at: 'timestamp',
  tags: ['string'],
  category: 'string',
  visibility: 'public|private|unlisted',
  metadata: {
    version: 'string',
    schema_version: 'string',
    additional_properties: 'object'
  }
};
```

### Implementation for Generic Flow Sites
```javascript
class FlowSiteParser extends EnhancedMetadataParser {
  constructor() {
    super();
    this.flowSelectors = {
      ...this.selectors,
      author: [
        'meta[name="author"]',
        '.author',
        '.creator',
        '[data-author]'
      ],
      tags: [
        'meta[name="keywords"]',
        '.tags',
        '.categories',
        '[data-tags]'
      ],
      date: [
        'meta[name="date"]',
        'time[datetime]',
        '.date',
        '[data-date]'
      ]
    };
  }
  
  async extractFlowMetadata(url) {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AgentFeed LinkPreview/1.0',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    return this.parseFlowContent(html, url);
  }
  
  parseFlowContent(html, baseUrl) {
    const metadata = this.extractMetadata(html, baseUrl);
    
    // Add flow-specific parsing
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Look for JSON-LD data
    const jsonLD = document.querySelector('script[type="application/ld+json"]');
    if (jsonLD) {
      try {
        const structured = JSON.parse(jsonLD.textContent);
        metadata.structured_data = structured;
      } catch (e) {
        console.warn('Failed to parse JSON-LD data:', e);
      }
    }
    
    return metadata;
  }
}
```

## Best Practices & Recommendations

### 1. Multi-Platform Strategy
- Implement platform-specific handlers for LinkedIn, Twitter, and generic sites
- Use fallback strategies when primary methods fail
- Cache metadata to reduce API calls and improve performance

### 2. Rate Limiting & Throttling
```javascript
class MetadataRateLimit {
  constructor(requestsPerMinute = 60) {
    this.requests = [];
    this.limit = requestsPerMinute;
    this.window = 60 * 1000; // 1 minute
  }
  
  async throttle() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.window);
    
    if (this.requests.length >= this.limit) {
      const waitTime = this.window - (now - this.requests[0]);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}
```

### 3. Error Handling & Fallbacks
```javascript
class MetadataExtractor {
  async extract(url) {
    const strategies = [
      () => this.extractOEmbed(url),
      () => this.extractOpenGraph(url),
      () => this.extractTwitterCards(url),
      () => this.extractBasicHTML(url)
    ];
    
    for (const strategy of strategies) {
      try {
        const result = await strategy();
        if (this.isValidMetadata(result)) {
          return result;
        }
      } catch (error) {
        console.warn('Strategy failed:', error.message);
      }
    }
    
    return this.generateFallbackMetadata(url);
  }
  
  isValidMetadata(metadata) {
    return metadata && 
           metadata.title && 
           metadata.title.length > 0 &&
           metadata.title !== 'Unknown Website';
  }
  
  generateFallbackMetadata(url) {
    const domain = new URL(url).hostname;
    return {
      title: domain,
      description: 'Content from ' + domain,
      image: null,
      type: 'website',
      fallback: true
    };
  }
}
```

### 4. Security & Privacy
- Validate and sanitize all extracted content
- Respect robots.txt and rate limits
- Implement proper user-agent identification
- Handle HTTPS/SSL properly
- Avoid extracting sensitive information

### 5. Performance Optimization
- Implement caching layers (memory, database, CDN)
- Use connection pooling for HTTP requests
- Implement request queuing for rate limiting
- Consider using CDN for image caching
- Optimize HTML parsing with streaming

### 6. Monitoring & Analytics
```javascript
class MetadataAnalytics {
  constructor() {
    this.stats = {
      requests: 0,
      successes: 0,
      failures: 0,
      fallbacks: 0,
      platforms: {}
    };
  }
  
  recordRequest(platform, success, fallback = false) {
    this.stats.requests++;
    
    if (success) {
      this.stats.successes++;
    } else {
      this.stats.failures++;
    }
    
    if (fallback) {
      this.stats.fallbacks++;
    }
    
    this.stats.platforms[platform] = (this.stats.platforms[platform] || 0) + 1;
  }
  
  getMetrics() {
    return {
      ...this.stats,
      success_rate: (this.stats.successes / this.stats.requests) * 100,
      fallback_rate: (this.stats.fallbacks / this.stats.requests) * 100
    };
  }
}
```

## Implementation Roadmap

### Phase 1: Enhanced Generic Extraction
1. Upgrade existing LinkPreviewService with Metascraper
2. Implement better fallback strategies
3. Add structured data parsing (JSON-LD)
4. Improve caching mechanisms

### Phase 2: Platform-Specific Handlers
1. Implement LinkedIn scraping via third-party APIs
2. Enhanced Twitter oEmbed integration
3. Platform-specific rate limiting
4. Error handling improvements

### Phase 3: Advanced Features
1. Real-time metadata updates
2. Batch processing capabilities
3. Analytics and monitoring
4. CDN integration for images

### Phase 4: Production Optimization
1. Load balancing for scraping requests
2. Advanced caching strategies
3. Performance monitoring
4. Security hardening

## Conclusion

The metadata extraction landscape in 2025 requires a multi-layered approach combining official APIs where available, third-party services for restricted platforms, and robust scraping techniques for general websites. Success depends on implementing proper rate limiting, caching, error handling, and fallback strategies while maintaining compliance with platform terms of service and legal requirements.