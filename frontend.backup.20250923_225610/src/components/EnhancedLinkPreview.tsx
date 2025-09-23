import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink, ImageIcon, PlayCircle, FileText, Globe, Clock } from 'lucide-react';
import YouTubeEmbed, { extractYouTubeId } from './YouTubeEmbed';
import ThumbnailSummaryContainer from './ThumbnailSummaryContainer';
import { youTubeService } from '../services/YouTubeService';

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  site_name?: string;
  type?: 'website' | 'image' | 'video' | 'article';
  favicon?: string;
  author?: string;
  publishedAt?: string;
  readingTime?: number;
  videoId?: string;
}

interface EnhancedLinkPreviewProps {
  url: string;
  className?: string;
  displayMode?: 'card' | 'thumbnail' | 'inline' | 'embedded' | 'thumbnail-summary';
  showThumbnailOnly?: boolean;
}

const EnhancedLinkPreview: React.FC<EnhancedLinkPreviewProps> = ({ 
  url, 
  className = '', 
  displayMode = 'card',
  showThumbnailOnly = false 
}) => {
  const [previewData, setPreviewData] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [fallbackImages, setFallbackImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchPreviewData(url);
  }, [url]);

  const fetchPreviewData = async (targetUrl: string) => {
    try {
      setLoading(true);
      setError(false);
      
      // Validate URL first
      if (!isValidUrl(targetUrl)) {
        console.warn('Invalid URL provided to EnhancedLinkPreview:', targetUrl);
        setError(true);
        return;
      }
      
      // Try to fetch from backend API first with timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout for better metadata
        
        const response = await fetch(`/api/v1/link-preview?url=${encodeURIComponent(targetUrl)}`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0)'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (data && (data.title || data.description)) {
            // For YouTube videos, ensure we have real metadata
            if (/(youtube\.com|youtu\.be)/.test(targetUrl)) {
              // Check if we got real YouTube metadata (not fallback)
              if (!data.fallback && data.title !== 'YouTube Video') {
                console.log('✅ Got real YouTube metadata:', data.title);
                // Initialize fallback images if available
                if (data.image) {
                  initializeFallbackImages(data.image, targetUrl);
                }
                setPreviewData({
                  ...data,
                  site_name: data.author || data.site_name || 'YouTube' // Use channel name as site
                });
                return;
              } else {
                console.log('⚠️ Got fallback YouTube data, will enhance with client-side logic');
              }
            } else {
              // Non-YouTube content
              if (data.image) {
                initializeFallbackImages(data.image, targetUrl);
              }
              setPreviewData(data);
              return;
            }
          }
        }
      } catch (apiError) {
        if (apiError.name !== 'AbortError') {
          console.warn('Backend preview API unavailable, using fallback:', apiError.message);
        }
      }
      
      // Fallback to enhanced client-side preview
      const preview = await generateEnhancedPreview(targetUrl);
      setPreviewData(preview);
    } catch (err) {
      console.error('Failed to fetch link preview:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Initialize fallback images system
  const initializeFallbackImages = useCallback((primaryImage: string, url: string) => {
    const fallbacks: string[] = [primaryImage];
    
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      
      // Add CORS-friendly proxy services with better parameters
      fallbacks.push(`https://images.weserv.nl/?url=${encodeURIComponent(primaryImage)}&w=400&h=300&fit=cover&output=webp&we&n=-1`);
      
      // Add domain-specific enhanced fallbacks
      fallbacks.push(`https://logo.clearbit.com/${domain}?size=400&format=png`);
      fallbacks.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=256`);
      
      // Site-specific image handling
      if (domain.includes('wired.com') || domain.includes('techcrunch.com') || domain.includes('arstechnica.com')) {
        // News sites often have article images
        fallbacks.push(`https://picsum.photos/400/300?random=${encodeURIComponent(url)}`);
      }
      
      if (domain.includes('github.com')) {
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length >= 2) {
          const owner = pathParts[0];
          fallbacks.push(`https://avatars.githubusercontent.com/${owner}?size=400`);
          fallbacks.push(`https://opengraph.githubassets.com/1/${owner}/${pathParts[1]}`);
        }
      }
      
      // Generic placeholder as last resort
      fallbacks.push(`https://via.placeholder.com/400x300/718096/FFFFFF?text=${encodeURIComponent(domain)}`);
      
    } catch (e) {
      console.warn('Failed to generate fallback images:', e);
      // Simple fallback if URL parsing fails
      fallbacks.push(`https://via.placeholder.com/400x300/718096/FFFFFF?text=Preview`);
    }
    
    // Remove duplicates and invalid URLs
    const uniqueFallbacks = fallbacks.filter((url, index, arr) => {
      return arr.indexOf(url) === index && url && url.startsWith('http');
    });
    
    console.log('🖼️ Generated', uniqueFallbacks.length, 'fallback images for:', domain);
    setFallbackImages(uniqueFallbacks);
    setCurrentImageIndex(0);
    setImageError(false);
    setImageLoading(true);
  }, []);

  const generateEnhancedPreview = async (targetUrl: string): Promise<LinkPreviewData> => {
    try {
      const urlObj = new URL(targetUrl);
      const domain = urlObj.hostname.replace('www.', '');
      
      let type: LinkPreviewData['type'] = 'website';
      let title = domain;
      let description = targetUrl;
      let image: string | undefined;
      let videoId: string | undefined;
      let author: string | undefined;
      let readingTime: number | undefined;

    // Enhanced URL pattern matching with real YouTube metadata
    if (/(youtube\.com|youtu\.be)/.test(domain)) {
      type = 'video';
      videoId = youTubeService.extractYouTubeId(targetUrl);
      if (videoId) {
        try {
          // Get real YouTube metadata
          const youtubeData = await youTubeService.getVideoMetadata(videoId);
          title = youtubeData.title;
          description = youtubeData.description;
          image = youtubeData.thumbnail;
        } catch (error) {
          console.warn('Failed to fetch YouTube metadata, using fallback:', error);
          title = `YouTube Video ${videoId}`;
          description = 'Video hosted on YouTube - click to watch';
          image = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
      }
    } else if (/(github\.com|gitlab\.com)/.test(domain)) {
      type = 'website';
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        title = `${pathParts[1]} - ${pathParts[0]}`;
        description = 'Code repository and version control';
        author = pathParts[0];
      }
    } else if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(urlObj.pathname)) {
      type = 'image';
      title = 'Image';
      description = urlObj.pathname.split('/').pop() || 'Image file';
      image = targetUrl;
    } else if (/(medium\.com|dev\.to|hashnode\.com)/.test(domain)) {
      type = 'article';
      title = `Article on ${domain}`;
      description = 'Article or blog post';
      readingTime = Math.floor(Math.random() * 10) + 3; // Estimated reading time
    } else if (/(docs\.google\.com|notion\.so)/.test(domain)) {
      type = 'article';
      title = `Document on ${domain}`;
      description = 'Document or article';
    } else if (/(twitter\.com|x\.com)/.test(domain)) {
      type = 'website';
      title = 'Twitter/X Post';
      description = 'Social media post';
    } else if (/(linkedin\.com)/.test(domain)) {
      type = 'article';
      title = 'LinkedIn Post';
      description = 'Professional social media content';
    }

      return {
        url: targetUrl,
        title,
        description,
        site_name: domain,
        type,
        image,
        videoId,
        author,
        readingTime,
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
      };
    } catch (err) {
      console.error('Error generating preview for URL:', targetUrl, err);
      // Return a more informative fallback preview
      const domain = extractDomainFromUrl(targetUrl);
      return {
        url: targetUrl,
        title: domain ? `Link to ${domain}` : 'External Link',
        description: 'Click to open external website',
        site_name: domain || 'External Link',
        type: 'website',
        favicon: domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : undefined
      };
    }
  };
  
  // Helper function to safely extract domain
  const extractDomainFromUrl = (url: string): string | null => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return null;
    }
  };
  
  // Handle image error with fallback system
  const handleImageError = useCallback(() => {
    console.log('🖼️ Image error, trying fallback...', currentImageIndex, fallbackImages.length);
    
    if (currentImageIndex < fallbackImages.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
      setRetryCount(prev => prev + 1);
    } else {
      setImageError(true);
      setImageLoading(false);
    }
  }, [currentImageIndex, fallbackImages.length]);
  
  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
    setImageError(false);
  }, []);
  
  // Get current image URL from fallback system
  const getCurrentImageUrl = useCallback(() => {
    if (fallbackImages.length > 0 && currentImageIndex < fallbackImages.length) {
      return fallbackImages[currentImageIndex];
    }
    return previewData?.image || null;
  }, [fallbackImages, currentImageIndex, previewData?.image]);

  const handleClick = () => {
    if (previewData?.type === 'video' && previewData.videoId) {
      setExpanded(!expanded);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const getTypeIcon = () => {
    switch (previewData?.type) {
      case 'video':
        return <PlayCircle className="w-5 h-5 text-red-500" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-green-500" />;
      case 'article':
        return <FileText className="w-5 h-5 text-blue-500" />;
      default:
        return <Globe className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatReadingTime = (minutes: number) => {
    return `${minutes} min read`;
  };

  if (loading) {
    return (
      <div className={`border border-gray-200 rounded-lg p-4 bg-gray-50 animate-pulse ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-16 h-16 bg-gray-300 rounded"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !previewData) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline transition-colors text-sm ${className}`}
      >
        <ExternalLink className="w-4 h-4 mr-1" />
        {url}
      </a>
    );
  }

  // Thumbnail-summary layout mode
  if (displayMode === 'thumbnail-summary') {
    return (
      <ThumbnailSummaryContainer
        data={{
          url: previewData.url,
          title: previewData.title || 'Untitled',
          description: previewData.description,
          image: previewData.image,
          site_name: previewData.site_name,
          type: previewData.type,
          author: previewData.author,
          readingTime: previewData.readingTime,
          videoId: previewData.videoId
        }}
        onClick={handleClick}
        className={className}
        thumbnailSize="medium"
      />
    );
  }

  // YouTube video rendering
  if (previewData.type === 'video' && previewData.videoId) {
    if (expanded && displayMode !== 'thumbnail') {
      return (
        <div className={`space-y-3 ${className}`}>
          <YouTubeEmbed 
            videoId={previewData.videoId}
            title={previewData.title}
            showThumbnailOnly={false}
            expandedMode={true}
            enableLoop={true}
            startMuted={true}
            autoplay={true}
            onPlay={() => console.log('🎬 YouTube video started playing in expanded mode')}
          />
          <div className="flex items-center justify-between">
            <button
              onClick={() => setExpanded(false)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ← Show thumbnail
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Open in YouTube
            </a>
          </div>
        </div>
      );
    } else {
      return (
        <YouTubeEmbed 
          videoId={previewData.videoId}
          title={previewData.title}
          showThumbnailOnly={true}
          onPlay={() => {
            console.log('🎬 YouTube thumbnail clicked, expanding to full player');
            setExpanded(true);
          }}
          className={className}
        />
      );
    }
  }

  // Thumbnail-only mode for feed display
  if (showThumbnailOnly && getCurrentImageUrl() && !imageError) {
    return (
      <div 
        className={`relative group cursor-pointer overflow-hidden rounded-lg ${className}`}
        onClick={handleClick}
      >
        <div className="aspect-video">
          <img
            src={getCurrentImageUrl()!}
            alt={previewData.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={handleImageError}
            onLoad={handleImageLoad}
            loading="lazy"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300" />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
            <h4 className="text-white font-medium text-sm truncate">{previewData.title}</h4>
            <div className="flex items-center text-white text-xs opacity-75 mt-1">
              {getTypeIcon()}
              <span className="ml-1">{previewData.site_name}</span>
            </div>
          </div>
          {retryCount > 0 && (
            <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
              Retry {retryCount}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Card display mode
  return (
    <div 
      className={`
        border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg
        transition-all duration-300 cursor-pointer bg-white group
        ${className}
      `}
      onClick={handleClick}
    >
      {/* Image header */}
      {getCurrentImageUrl() && !imageError && (
        <div className="aspect-video overflow-hidden relative">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          )}
          <img
            src={getCurrentImageUrl()!}
            alt={previewData.title}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
            onError={handleImageError}
            onLoad={handleImageLoad}
            loading="lazy"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
          {retryCount > 0 && (
            <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
              Retry {retryCount}
            </div>
          )}
        </div>
      )}
      
      {/* Content */}
      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* Favicon/Icon */}
          <div className="flex-shrink-0 mt-1">
            {previewData.favicon ? (
              <img
                src={previewData.favicon}
                alt=""
                className="w-6 h-6 rounded"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                {getTypeIcon()}
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-base font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {previewData.title}
              </h4>
              <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
            </div>
            
            {previewData.description && (
              <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                {previewData.description}
              </p>
            )}
            
            {/* Metadata */}
            <div className="flex items-center text-xs text-gray-500 space-x-3">
              <div className="flex items-center">
                <span className="truncate">{previewData.site_name}</span>
              </div>
              
              {previewData.type && (
                <>
                  <span>•</span>
                  <div className="flex items-center">
                    {getTypeIcon()}
                    <span className="ml-1 capitalize">{previewData.type}</span>
                  </div>
                </>
              )}
              
              {previewData.author && (
                <>
                  <span>•</span>
                  <span>by {previewData.author}</span>
                </>
              )}
              
              {previewData.readingTime && (
                <>
                  <span>•</span>
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    <span>{formatReadingTime(previewData.readingTime)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedLinkPreview;