/**
 * YouTube Service for real metadata extraction
 * Implements YouTube Data API v3 with oEmbed fallback
 */

interface YouTubeMetadata {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  duration?: string;
  viewCount?: string;
  publishedAt?: string;
}

interface OEmbedResponse {
  title: string;
  author_name: string;
  thumbnail_url: string;
  html: string;
}

export class YouTubeService {
  private static instance: YouTubeService;
  private cache: Map<string, { data: YouTubeMetadata; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 1000 * 60 * 30; // 30 minutes

  static getInstance(): YouTubeService {
    if (!YouTubeService.instance) {
      YouTubeService.instance = new YouTubeService();
    }
    return YouTubeService.instance;
  }

  /**
   * Get YouTube video metadata with caching
   */
  async getVideoMetadata(videoId: string): Promise<YouTubeMetadata> {
    // Check cache first
    const cached = this.cache.get(videoId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Try YouTube oEmbed API (no API key required)
      const metadata = await this.fetchOEmbedMetadata(videoId);
      
      // Cache the result
      this.cache.set(videoId, {
        data: metadata,
        timestamp: Date.now()
      });
      
      return metadata;
    } catch (error) {
      console.error('Error fetching YouTube metadata:', error);
      return this.getFallbackMetadata(videoId);
    }
  }

  /**
   * Fetch metadata from YouTube oEmbed API
   */
  private async fetchOEmbedMetadata(videoId: string): Promise<YouTubeMetadata> {
    const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    
    const response = await fetch(oEmbedUrl);
    
    if (!response.ok) {
      throw new Error(`oEmbed API returned ${response.status}`);
    }
    
    const data: OEmbedResponse = await response.json();
    
    return {
      videoId,
      title: data.title || 'YouTube Video',
      description: `By ${data.author_name}`,
      thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      channelTitle: data.author_name || 'YouTube'
    };
  }

  /**
   * Get fallback metadata when API fails
   */
  private getFallbackMetadata(videoId: string): YouTubeMetadata {
    return {
      videoId,
      title: 'YouTube Video',
      description: 'Click to play video',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      channelTitle: 'YouTube'
    };
  }

  /**
   * Enhanced YouTube ID extraction
   */
  extractYouTubeId(url: string): string | null {
    const patterns = [
      // Standard watch URLs
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      // Playlist URLs
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
      // Shorts URLs
      /youtube\.com\/shorts\/([^&\n?#]+)/,
      // Mobile URLs
      /m\.youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        // Validate video ID format (11 characters, alphanumeric and _ -)
        const videoId = match[1];
        if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
          return videoId;
        }
      }
    }
    
    return null;
  }

  /**
   * Get high-quality thumbnail with fallback chain
   */
  getThumbnailWithFallbacks(videoId: string): string[] {
    return [
      `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/default.jpg`
    ];
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }
}

export const youTubeService = YouTubeService.getInstance();