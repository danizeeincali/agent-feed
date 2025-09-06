/**
 * Preview Result Model
 * Defines the standard structure for link preview data
 */

import { Platform, ContentType } from '../handlers/BaseHandler.js';

/**
 * Creates a new PreviewResult with default values
 * @param {Object} data - Initial data for the preview
 * @returns {PreviewResult} - Standardized preview result
 */
export function createPreviewResult(data = {}) {
  return {
    // Core preview data
    title: data.title || '',
    description: data.description || '',
    image: validateImageData(data.image),
    video: data.video || null,
    url: data.url || '',
    
    // Platform and content information
    platform: data.platform || Platform.GENERIC,
    contentType: data.contentType || ContentType.WEBSITE,
    
    // Author information
    author: validateAuthorData(data.author),
    
    // Additional metadata
    metadata: validateMetadata(data.metadata),
    
    // Caching information
    caching: {
      ttl: data.caching?.ttl || 3600,
      lastUpdated: data.caching?.lastUpdated || new Date().toISOString(),
      stale: data.caching?.stale || false
    },
    
    // Performance metrics
    performance: {
      fetchTime: data.performance?.fetchTime || 0,
      cacheHit: data.performance?.cacheHit || false,
      fallbackUsed: data.performance?.fallbackUsed || false
    },
    
    // Error information
    error: data.error || null,
    fallbackUsed: data.fallbackUsed || false
  };
}

/**
 * Validates and normalizes image data
 * @param {string|Object} image - Image URL or image object
 * @returns {Object|null} - Normalized image object or null
 */
function validateImageData(image) {
  if (!image) return null;
  
  if (typeof image === 'string') {
    return {
      url: image,
      width: null,
      height: null,
      alt: null
    };
  }
  
  if (typeof image === 'object') {
    return {
      url: image.url || null,
      width: image.width || null,
      height: image.height || null,
      alt: image.alt || null
    };
  }
  
  return null;
}

/**
 * Validates and normalizes author data
 * @param {Object} author - Author information
 * @returns {Object|null} - Normalized author object or null
 */
function validateAuthorData(author) {
  if (!author || typeof author !== 'object') return null;
  
  return {
    name: author.name || null,
    username: author.username || null,
    profileUrl: author.profileUrl || null,
    avatar: author.avatar || null,
    verified: Boolean(author.verified),
    title: author.title || null,
    company: author.company || null
  };
}

/**
 * Validates and normalizes metadata
 * @param {Object} metadata - Additional metadata
 * @returns {Object} - Normalized metadata object
 */
function validateMetadata(metadata = {}) {
  return {
    publishDate: metadata.publishDate || null,
    engagement: validateEngagementData(metadata.engagement),
    tags: Array.isArray(metadata.tags) ? metadata.tags : [],
    favicon: metadata.favicon || null,
    brandColor: metadata.brandColor || null,
    language: metadata.language || null,
    ...metadata // Allow additional platform-specific metadata
  };
}

/**
 * Validates and normalizes engagement data
 * @param {Object} engagement - Engagement metrics
 * @returns {Object|null} - Normalized engagement object or null
 */
function validateEngagementData(engagement) {
  if (!engagement || typeof engagement !== 'object') return null;
  
  return {
    likes: parseInt(engagement.likes) || 0,
    shares: parseInt(engagement.shares) || 0,
    comments: parseInt(engagement.comments) || 0,
    views: parseInt(engagement.views) || 0,
    reactions: parseInt(engagement.reactions) || 0
  };
}

/**
 * LinkedIn-specific preview result
 * @param {Object} data - LinkedIn-specific data
 * @returns {PreviewResult} - LinkedIn preview result
 */
export function createLinkedInPreviewResult(data = {}) {
  const result = createPreviewResult({
    ...data,
    platform: Platform.LINKEDIN,
    contentType: data.contentType || ContentType.SOCIAL
  });
  
  // LinkedIn-specific metadata
  if (data.metadata) {
    result.metadata = {
      ...result.metadata,
      postType: data.metadata.postType, // 'post', 'article', 'video'
      companyPage: data.metadata.companyPage || false,
      industry: data.metadata.industry || null,
      jobTitle: data.metadata.jobTitle || null,
      connections: data.metadata.connections || null
    };
  }
  
  return result;
}

/**
 * Twitter/X-specific preview result
 * @param {Object} data - Twitter/X-specific data
 * @returns {PreviewResult} - Twitter/X preview result
 */
export function createTwitterPreviewResult(data = {}) {
  const result = createPreviewResult({
    ...data,
    platform: data.platform || Platform.TWITTER,
    contentType: data.contentType || ContentType.SOCIAL
  });
  
  // Twitter-specific metadata
  if (data.metadata) {
    result.metadata = {
      ...result.metadata,
      tweetId: data.metadata.tweetId || null,
      isRetweet: data.metadata.isRetweet || false,
      isReply: data.metadata.isReply || false,
      isQuoteTweet: data.metadata.isQuoteTweet || false,
      threadPosition: data.metadata.threadPosition || null,
      mediaAttachments: data.metadata.mediaAttachments || [],
      hashtags: data.metadata.hashtags || [],
      mentions: data.metadata.mentions || []
    };
  }
  
  return result;
}

/**
 * YouTube-specific preview result
 * @param {Object} data - YouTube-specific data
 * @returns {PreviewResult} - YouTube preview result
 */
export function createYouTubePreviewResult(data = {}) {
  const result = createPreviewResult({
    ...data,
    platform: Platform.YOUTUBE,
    contentType: ContentType.VIDEO
  });
  
  // YouTube-specific metadata
  if (data.metadata) {
    result.metadata = {
      ...result.metadata,
      videoId: data.metadata.videoId || null,
      channelId: data.metadata.channelId || null,
      duration: data.metadata.duration || null,
      category: data.metadata.category || null,
      publishedAt: data.metadata.publishedAt || null,
      channelUrl: data.metadata.channelUrl || null,
      subscriberCount: data.metadata.subscriberCount || null,
      isLive: data.metadata.isLive || false,
      isPremiere: data.metadata.isPremiere || false
    };
  }
  
  return result;
}

/**
 * Generic website preview result
 * @param {Object} data - Generic website data
 * @returns {PreviewResult} - Generic preview result
 */
export function createGenericPreviewResult(data = {}) {
  const result = createPreviewResult({
    ...data,
    platform: Platform.GENERIC,
    contentType: data.contentType || ContentType.WEBSITE
  });
  
  // Generic metadata
  if (data.metadata) {
    result.metadata = {
      ...result.metadata,
      siteName: data.metadata.siteName || null,
      articleSection: data.metadata.articleSection || null,
      wordCount: data.metadata.wordCount || null,
      readingTime: data.metadata.readingTime || null,
      author: data.metadata.author || null,
      publisher: data.metadata.publisher || null,
      copyright: data.metadata.copyright || null
    };
  }
  
  return result;
}

/**
 * Error preview result for failed extractions
 * @param {string} url - Original URL
 * @param {Error} error - Error that occurred
 * @param {string} platform - Platform identifier
 * @returns {PreviewResult} - Error preview result
 */
export function createErrorPreviewResult(url, error, platform = Platform.GENERIC) {
  const domain = extractDomainFromUrl(url);
  
  return createPreviewResult({
    title: domain || 'Unknown Website',
    description: 'Unable to fetch preview',
    url: url,
    platform: platform,
    contentType: ContentType.WEBSITE,
    error: error.message,
    fallbackUsed: true,
    caching: {
      ttl: 300, // Cache errors for only 5 minutes
      lastUpdated: new Date().toISOString(),
      stale: false
    },
    performance: {
      fetchTime: 0,
      cacheHit: false,
      fallbackUsed: true
    }
  });
}

/**
 * Utility function to extract domain from URL
 * @param {string} url - URL to extract domain from
 * @returns {string} - Domain name or 'Unknown Website'
 */
function extractDomainFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return 'Unknown Website';
  }
}

/**
 * Validates a complete preview result
 * @param {PreviewResult} result - Result to validate
 * @returns {boolean} - Whether the result is valid
 */
export function validatePreviewResult(result) {
  if (!result || typeof result !== 'object') return false;
  
  // Required fields
  if (!result.title || typeof result.title !== 'string') return false;
  if (!result.platform || !Object.values(Platform).includes(result.platform)) return false;
  if (!result.contentType || !Object.values(ContentType).includes(result.contentType)) return false;
  
  // URL validation
  if (result.url) {
    try {
      new URL(result.url);
    } catch {
      return false;
    }
  }
  
  // Image URL validation
  if (result.image && result.image.url) {
    try {
      new URL(result.image.url);
    } catch {
      return false;
    }
  }
  
  // Video URL validation
  if (result.video) {
    try {
      new URL(result.video);
    } catch {
      return false;
    }
  }
  
  return true;
}

/**
 * Serializes a preview result for storage or transmission
 * @param {PreviewResult} result - Result to serialize
 * @returns {string} - JSON string representation
 */
export function serializePreviewResult(result) {
  return JSON.stringify(result, null, 0);
}

/**
 * Deserializes a preview result from storage
 * @param {string} json - JSON string to deserialize
 * @returns {PreviewResult|null} - Deserialized result or null if invalid
 */
export function deserializePreviewResult(json) {
  try {
    const result = JSON.parse(json);
    return validatePreviewResult(result) ? result : null;
  } catch {
    return null;
  }
}

export default {
  createPreviewResult,
  createLinkedInPreviewResult,
  createTwitterPreviewResult,
  createYouTubePreviewResult,
  createGenericPreviewResult,
  createErrorPreviewResult,
  validatePreviewResult,
  serializePreviewResult,
  deserializePreviewResult
};