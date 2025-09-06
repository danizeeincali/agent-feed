# Enhanced Link Preview System - SPARC Pseudocode Phase

## 1. CORE ALGORITHM DESIGN

### 1.1 Main Link Preview Orchestrator

```pseudocode
FUNCTION getLinkPreview(url: string) -> PreviewResult
    BEGIN
        // Phase 1: URL Validation & Normalization
        normalizedUrl = validateAndNormalizeUrl(url)
        IF normalizedUrl IS NULL THEN
            RETURN createErrorPreview("Invalid URL format")
        END IF
        
        // Phase 2: Platform Detection
        platform = detectPlatform(normalizedUrl)
        
        // Phase 3: Cache Strategy Selection
        cacheStrategy = selectCacheStrategy(platform)
        cachedResult = checkCache(normalizedUrl, cacheStrategy)
        
        IF cachedResult EXISTS AND NOT isStale(cachedResult) THEN
            recordCacheHit(platform)
            RETURN cachedResult
        END IF
        
        // Phase 4: Handler Selection & Execution
        handler = selectHandler(platform)
        
        TRY
            freshResult = executeHandlerWithRetry(handler, normalizedUrl)
            cacheResult(normalizedUrl, freshResult, cacheStrategy)
            recordCacheMiss(platform)
            RETURN freshResult
        CATCH HandlerException e
            IF cachedResult EXISTS THEN
                recordStaleHit(platform)
                RETURN markAsStale(cachedResult)
            ELSE
                RETURN createFallbackPreview(normalizedUrl, e)
            END IF
        END TRY
    END
```

### 1.2 Platform Detection Algorithm

```pseudocode
FUNCTION detectPlatform(url: string) -> Platform
    BEGIN
        domain = extractDomain(url)
        
        // Priority-based platform matching
        MATCH domain WITH
            CASE matches("linkedin.com", "www.linkedin.com")
                RETURN Platform.LINKEDIN
            CASE matches("twitter.com", "www.twitter.com", "mobile.twitter.com")
                RETURN Platform.TWITTER
            CASE matches("x.com", "www.x.com", "mobile.x.com")  
                RETURN Platform.X
            CASE matches("youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com")
                RETURN Platform.YOUTUBE
            CASE matches("instagram.com", "www.instagram.com")
                RETURN Platform.INSTAGRAM
            CASE matches("facebook.com", "www.facebook.com", "m.facebook.com")
                RETURN Platform.FACEBOOK
            DEFAULT
                RETURN Platform.GENERIC
        END MATCH
    END
```

## 2. PLATFORM-SPECIFIC HANDLER ALGORITHMS

### 2.1 LinkedIn Handler Algorithm

```pseudocode
FUNCTION LinkedInHandler.extract(url: string) -> PreviewResult
    BEGIN
        contentType = detectLinkedInContentType(url)
        
        SWITCH contentType
            CASE POST:
                RETURN extractLinkedInPost(url)
            CASE PROFILE:
                RETURN extractLinkedInProfile(url)
            CASE COMPANY:
                RETURN extractLinkedInCompany(url)
            CASE ARTICLE:
                RETURN extractLinkedInArticle(url)
            DEFAULT:
                RETURN fallbackToGenericScraping(url)
        END SWITCH
    END

FUNCTION extractLinkedInPost(url: string) -> PreviewResult
    BEGIN
        // Strategy 1: Try oEmbed API
        TRY
            oembedData = fetchLinkedInOEmbed(url)
            IF oembedData.success THEN
                RETURN parseLinkedInOEmbedData(oembedData)
            END IF
        CATCH APIException
            logWarning("LinkedIn oEmbed failed, trying scraping")
        END TRY
        
        // Strategy 2: Enhanced web scraping
        TRY
            htmlContent = fetchWithUserAgent(url, LINKEDIN_USER_AGENT)
            structuredData = extractStructuredData(htmlContent)
            
            preview = CreatePreviewResult()
            preview.title = extractLinkedInTitle(htmlContent, structuredData)
            preview.description = extractLinkedInDescription(htmlContent)
            preview.author = extractLinkedInAuthor(htmlContent)
            preview.engagement = extractLinkedInEngagement(htmlContent)
            preview.publishDate = extractLinkedInDate(htmlContent)
            
            RETURN preview
        CATCH ScrapingException e
            RETURN createFallbackPreview(url, e)
        END TRY
    END
```

### 2.2 Twitter/X Unified Handler Algorithm

```pseudocode
FUNCTION TwitterXHandler.extract(url: string) -> PreviewResult
    BEGIN
        // Normalize Twitter/X URLs to canonical format
        canonicalUrl = normalizeTwitterUrl(url)
        tweetId = extractTweetId(canonicalUrl)
        
        IF tweetId IS NULL THEN
            RETURN createErrorPreview("Invalid Twitter/X URL format")
        END IF
        
        // Strategy 1: Twitter API v2
        IF hasTwitterAPIAccess() AND NOT exceededRateLimit() THEN
            TRY
                tweetData = fetchTweetFromAPI(tweetId)
                RETURN parseTwitterAPIResponse(tweetData)
            CATCH TwitterAPIException e
                logWarning("Twitter API failed: " + e.message)
            END TRY
        END IF
        
        // Strategy 2: oEmbed API
        TRY
            oembedData = fetchTwitterOEmbed(canonicalUrl)
            IF oembedData.success THEN
                RETURN parseTwitterOEmbedData(oembedData)
            END IF
        CATCH OEmbedException e
            logWarning("Twitter oEmbed failed: " + e.message)
        END TRY
        
        // Strategy 3: Syndication endpoint (fallback)
        TRY
            syndicationData = fetchTwitterSyndication(tweetId)
            RETURN parseTwitterSyndicationData(syndicationData)
        CATCH SyndicationException e
            RETURN createBasicTwitterFallback(canonicalUrl, tweetId)
        END TRY
    END

FUNCTION normalizeTwitterUrl(url: string) -> string
    BEGIN
        // Convert x.com URLs to twitter.com for API compatibility
        normalizedUrl = url.replace("x.com", "twitter.com")
        normalizedUrl = normalizedUrl.replace("mobile.twitter.com", "twitter.com")
        
        // Ensure proper format: https://twitter.com/user/status/id
        IF matches(normalizedUrl, TWITTER_URL_PATTERN) THEN
            RETURN normalizedUrl
        ELSE
            RETURN attemptUrlReconstruction(url)
        END IF
    END
```

### 2.3 Generic Handler Algorithm

```pseudocode
FUNCTION GenericHandler.extract(url: string) -> PreviewResult
    BEGIN
        startTime = getCurrentTime()
        
        // Phase 1: Fetch with optimized headers
        TRY
            response = fetchWithOptimizedHeaders(url)
            contentType = response.headers.get("content-type")
            
            // Handle non-HTML content types
            IF NOT isHTMLContent(contentType) THEN
                RETURN handleNonHTMLContent(url, contentType, response)
            END IF
            
            htmlContent = response.body
        CATCH NetworkException e
            RETURN createNetworkErrorPreview(url, e)
        END TRY
        
        // Phase 2: Multi-strategy metadata extraction
        extractors = [
            OpenGraphExtractor,
            TwitterCardsExtractor, 
            SchemaOrgExtractor,
            BasicHTMLExtractor
        ]
        
        combinedMetadata = EmptyMetadata()
        
        FOR extractor IN extractors DO
            TRY
                metadata = extractor.extract(htmlContent, url)
                combinedMetadata = mergeMetadata(combinedMetadata, metadata)
            CATCH ExtractionException e
                logWarning("Extractor failed: " + extractor.name + " - " + e.message)
            END TRY
        END FOR
        
        // Phase 3: Content enhancement
        enhancedPreview = enhanceGenericPreview(combinedMetadata, url)
        enhancedPreview.performance.fetchTime = getCurrentTime() - startTime
        
        RETURN enhancedPreview
    END

FUNCTION enhanceGenericPreview(metadata: Metadata, url: string) -> PreviewResult
    BEGIN
        preview = CreatePreviewResult()
        
        // Title optimization with fallbacks
        preview.title = selectBestTitle([
            metadata.openGraph.title,
            metadata.twitterCards.title,
            metadata.schemaOrg.headline,
            metadata.basicHTML.title,
            extractDomainName(url)
        ])
        
        // Description optimization
        preview.description = selectBestDescription([
            metadata.openGraph.description,
            metadata.twitterCards.description,
            metadata.schemaOrg.description,
            metadata.basicHTML.metaDescription,
            extractFirstParagraph(metadata.basicHTML.content)
        ])
        
        // Image optimization with CDN integration
        rawImageUrl = selectBestImage(metadata)
        IF rawImageUrl EXISTS THEN
            preview.image = optimizeImageForPreview(rawImageUrl, url)
        END IF
        
        // Content type detection
        preview.metadata.contentType = detectContentType(metadata, url)
        
        // Additional enhancements
        preview.metadata.favicon = extractFavicon(metadata, url)
        preview.metadata.brandColor = extractBrandColor(metadata)
        preview.metadata.publishDate = extractPublishDate(metadata)
        
        RETURN preview
    END
```

## 3. ERROR HANDLING & RETRY LOGIC

### 3.1 Retry Strategy Algorithm

```pseudocode
FUNCTION executeHandlerWithRetry(handler: Handler, url: string) -> PreviewResult
    BEGIN
        maxRetries = getMaxRetries(handler.platform)
        baseDelay = getBaseDelay(handler.platform)
        
        FOR attempt = 1 TO maxRetries DO
            TRY
                RETURN handler.extract(url)
            CATCH RetryableException e
                IF attempt = maxRetries THEN
                    THROW e
                END IF
                
                delay = calculateBackoffDelay(baseDelay, attempt)
                logRetry(handler.platform, url, attempt, delay)
                sleep(delay)
            CATCH NonRetryableException e
                THROW e
            END TRY
        END FOR
    END

FUNCTION calculateBackoffDelay(baseDelay: number, attempt: number) -> number
    BEGIN
        // Exponential backoff with jitter
        exponentialDelay = baseDelay * (2 ^ (attempt - 1))
        jitter = random(0, exponentialDelay * 0.1)
        RETURN min(exponentialDelay + jitter, MAX_BACKOFF_DELAY)
    END
```

### 3.2 Rate Limiting Algorithm

```pseudocode
FUNCTION RateLimiter.checkAndAcquire(platform: Platform, operation: string) -> boolean
    BEGIN
        rateLimitKey = platform + ":" + operation
        currentWindow = getCurrentTimeWindow()
        
        LOCK rateLimitKey DO
            currentCount = getRequestCount(rateLimitKey, currentWindow)
            limit = getRateLimit(platform, operation)
            
            IF currentCount >= limit THEN
                nextResetTime = getNextResetTime(currentWindow)
                THROW RateLimitException("Rate limit exceeded", nextResetTime)
            END IF
            
            incrementRequestCount(rateLimitKey, currentWindow)
            RETURN true
        END LOCK
    END
```

## 4. CACHING STRATEGIES

### 4.1 Intelligent Cache TTL Algorithm

```pseudocode
FUNCTION selectCacheStrategy(platform: Platform) -> CacheStrategy
    BEGIN
        SWITCH platform
            CASE LINKEDIN:
                // Professional content changes less frequently
                RETURN CacheStrategy(ttl: 4_HOURS, refreshThreshold: 0.8)
            CASE TWITTER, X:
                // Social content changes rapidly
                RETURN CacheStrategy(ttl: 30_MINUTES, refreshThreshold: 0.9)
            CASE YOUTUBE:
                // Video metadata is relatively stable
                RETURN CacheStrategy(ttl: 2_HOURS, refreshThreshold: 0.7)
            CASE GENERIC:
                // Variable based on content type
                RETURN adaptiveGenericCacheStrategy()
            DEFAULT:
                RETURN CacheStrategy(ttl: 1_HOUR, refreshThreshold: 0.8)
        END SWITCH
    END

FUNCTION adaptiveGenericCacheStrategy() -> CacheStrategy
    BEGIN
        // Analyze URL patterns for adaptive caching
        IF isNewsWebsite(url) THEN
            RETURN CacheStrategy(ttl: 15_MINUTES, refreshThreshold: 0.95)
        ELSE IF isBlogPost(url) THEN
            RETURN CacheStrategy(ttl: 2_HOURS, refreshThreshold: 0.5)
        ELSE IF isEcommerce(url) THEN
            RETURN CacheStrategy(ttl: 30_MINUTES, refreshThreshold: 0.8)
        ELSE
            RETURN CacheStrategy(ttl: 1_HOUR, refreshThreshold: 0.8)
        END IF
    END
```

## 5. PERFORMANCE OPTIMIZATION ALGORITHMS

### 5.1 Concurrent Processing Algorithm

```pseudocode
FUNCTION processMultiplePreviews(urls: string[]) -> PreviewResult[]
    BEGIN
        maxConcurrency = getMaxConcurrency()
        semaphore = CreateSemaphore(maxConcurrency)
        results = CreateArray(urls.length)
        
        PARALLEL FOR i, url IN urls DO
            semaphore.acquire()
            TRY
                results[i] = getLinkPreview(url)
            FINALLY
                semaphore.release()
            END TRY
        END PARALLEL FOR
        
        RETURN results
    END
```

### 5.2 Resource Management Algorithm

```pseudocode
FUNCTION manageResourceUsage() -> void
    BEGIN
        // Monitor memory usage
        currentMemoryUsage = getMemoryUsage()
        IF currentMemoryUsage > MEMORY_THRESHOLD THEN
            triggerCacheEviction()
            runGarbageCollection()
        END IF
        
        // Monitor connection pool
        activeConnections = getActiveConnections()
        IF activeConnections > CONNECTION_THRESHOLD THEN
            recycleIdleConnections()
        END IF
        
        // Monitor rate limit buckets
        cleanupExpiredRateLimitCounters()
    END
```