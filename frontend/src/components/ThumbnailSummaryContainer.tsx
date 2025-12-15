import React, { useState, useCallback, useEffect } from 'react';
import { Play, ExternalLink, FileText, Globe, Clock, User } from 'lucide-react';

interface ThumbnailSummaryData {
  url: string;
  title: string;
  description?: string;
  image?: string;
  site_name?: string;
  type?: 'website' | 'image' | 'video' | 'article';
  author?: string;
  readingTime?: number;
  videoId?: string;
}

interface ThumbnailSummaryContainerProps {
  data: ThumbnailSummaryData;
  onClick: () => void;
  className?: string;
  thumbnailSize?: 'small' | 'medium' | 'large';
}

const ThumbnailSummaryContainer: React.FC<ThumbnailSummaryContainerProps> = ({
  data,
  onClick,
  className = '',
  thumbnailSize = 'medium'
}) => {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fallbackThumbnails, setFallbackThumbnails] = useState<string[]>([]);
  const [currentThumbnailIndex, setCurrentThumbnailIndex] = useState(0);

  const handleImageError = useCallback(() => {
    console.log('🖼️ Thumbnail error for:', data.title, 'trying fallback...');
    
    // Try next fallback thumbnail if available
    if (currentThumbnailIndex < fallbackThumbnails.length - 1) {
      setCurrentThumbnailIndex(prev => prev + 1);
    } else {
      setImageError(true);
      setIsLoading(false);
    }
  }, [currentThumbnailIndex, fallbackThumbnails.length, data.title]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onClick();
  }, [onClick]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }, [onClick]);

  // Thumbnail size classes
  const thumbnailSizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-20 h-20',
    large: 'w-24 h-24'
  };

  // Generate fallback thumbnail based on content type
  const getFallbackThumbnail = () => {
    const iconClasses = `w-8 h-8 ${
      data.type === 'video' ? 'text-red-500' : 
      data.type === 'article' ? 'text-blue-500' : 
      data.type === 'image' ? 'text-green-500' : 
      'text-gray-500'
    }`;

    switch (data.type) {
      case 'video':
        return <Play className={iconClasses} fill="currentColor" />;
      case 'article':
        return <FileText className={iconClasses} />;
      case 'image':
        return <ExternalLink className={iconClasses} />;
      default:
        return <Globe className={iconClasses} />;
    }
  };

  // Enhanced thumbnail URL generation with fallbacks
  const getThumbnailUrl = () => {
    // Use fallback thumbnails if available
    if (fallbackThumbnails.length > 0 && currentThumbnailIndex < fallbackThumbnails.length) {
      return fallbackThumbnails[currentThumbnailIndex];
    }
    
    if (data.image && !imageError) {
      return data.image;
    }
    
    if (data.type === 'video' && data.videoId) {
      return `https://img.youtube.com/vi/${data.videoId}/mqdefault.jpg`;
    }
    
    return null;
  };
  
  // Initialize fallback thumbnails
  useEffect(() => {
    const generateFallbacks = () => {
      const fallbacks: string[] = [];
      
      // Primary image
      if (data.image) {
        fallbacks.push(data.image);
      }
      
      // YouTube video thumbnails
      if (data.type === 'video' && data.videoId) {
        const qualities = ['maxresdefault', 'hqdefault', 'mqdefault', 'default'];
        qualities.forEach(quality => {
          fallbacks.push(`https://img.youtube.com/vi/${data.videoId}/${quality}.jpg`);
        });
      }
      
      // Add proxy/CORS-friendly versions for better reliability
      if (data.image) {
        try {
          fallbacks.push(`https://images.weserv.nl/?url=${encodeURIComponent(data.image)}&w=320&h=180&fit=cover&output=webp&we`);
        } catch (e) {
          console.warn('Failed to generate proxy URL:', e);
        }
      }
      
      // Site-specific fallbacks
      if (data.site_name) {
        const domain = data.site_name.toLowerCase().replace('www.', '');
        
        // High-quality logo services
        fallbacks.push(`https://logo.clearbit.com/${domain}?size=200`);
        fallbacks.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=256`);
        
        // Site-specific image patterns
        if (domain.includes('github')) {
          const pathParts = data.url.split('/').filter(Boolean);
          if (pathParts.length >= 4) {
            const owner = pathParts[pathParts.indexOf('github.com') + 1];
            fallbacks.push(`https://avatars.githubusercontent.com/${owner}?size=200`);
          }
        }
        
        if (domain.includes('wired.com') || domain.includes('medium.com') || domain.includes('dev.to')) {
          fallbacks.push(`https://picsum.photos/320/180?random=${Math.floor(Math.random() * 1000)}`);
        }
        
        // Generic placeholder
        fallbacks.push(`https://via.placeholder.com/320x180/4A5568/FFFFFF?text=${encodeURIComponent(domain)}`);
      }
      
      return fallbacks.filter((url, index, arr) => arr.indexOf(url) === index); // Remove duplicates
    };
    
    const fallbacks = generateFallbacks();
    setFallbackThumbnails(fallbacks);
    setCurrentThumbnailIndex(0);
    setImageError(false);
    setIsLoading(fallbacks.length > 0);
    
    console.log('🖼️ Generated fallback thumbnails for', data.title, ':', fallbacks.length, 'options');
  }, [data.image, data.videoId, data.site_name, data.type, data.url, data.title]);
  
  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Enhanced domain display
  const getDisplaySiteName = () => {
    if (!data.site_name) return 'Unknown site';
    
    // Clean up common domain issues
    const siteName = data.site_name.replace(/^www\./, '');
    return siteName || 'External link';
  };

  // Truncate text for summary display
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '...';
  };

  const thumbnailUrl = getThumbnailUrl();

  return (
    <div
      className={`
        flex flex-col sm:flex-row items-start space-y-3 sm:space-y-0 sm:space-x-4 
        p-3 sm:p-4 bg-white border border-gray-200 rounded-lg
        cursor-pointer transition-all duration-300 ease-in-out
        hover:shadow-md hover:border-gray-300 hover:bg-gray-50
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
        ${isHovered ? 'transform scale-[1.01]' : ''}
        ${className}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      role="article"
      aria-label={`Preview: ${data.title}`}
    >
      {/* Thumbnail Section */}
      <div className={`flex-shrink-0 ${thumbnailSizeClasses[thumbnailSize]} relative group`}>
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`Preview thumbnail for ${data.title}`}
            className={`
              w-full h-full object-cover rounded-lg
              transition-transform duration-300 ease-in-out
              ${isHovered ? 'scale-105' : ''}
            `}
            onError={handleImageError}
            onLoad={handleImageLoad}
            loading="lazy"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className={`
            w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg
            flex items-center justify-center transition-colors duration-300 relative
            ${isHovered ? 'from-gray-200 to-gray-300' : ''}
          `}>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            )}
            {getFallbackThumbnail()}
          </div>
        )}
        
        {/* Video Play Overlay */}
        {data.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`
              bg-black bg-opacity-60 rounded-full p-2
              transition-all duration-300 ease-in-out
              ${isHovered ? 'bg-opacity-80 scale-110' : ''}
            `}>
              <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
            </div>
          </div>
        )}
        
        {/* Type indicator badge */}
        <div className="absolute -bottom-1 -right-1">
          <div className={`
            w-6 h-6 rounded-full flex items-center justify-center text-xs
            transition-colors duration-300
            ${data.type === 'video' ? 'bg-red-500 text-white' :
              data.type === 'article' ? 'bg-blue-500 text-white' :
              data.type === 'image' ? 'bg-green-500 text-white' :
              'bg-gray-500 text-white'}
          `}>
            {data.type === 'video' ? '▶' :
             data.type === 'article' ? 'A' :
             data.type === 'image' ? '🖼' : '🌐'}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Title */}
        <h3 className={`
          font-semibold text-gray-900 leading-tight
          transition-colors duration-300
          ${isHovered ? 'text-blue-600' : ''}
          ${thumbnailSize === 'small' ? 'text-sm' : 
            thumbnailSize === 'medium' ? 'text-base' : 'text-lg'}
        `}>
          <span className="line-clamp-2">
            {truncateText(data.title, thumbnailSize === 'small' ? 60 : thumbnailSize === 'medium' ? 80 : 100)}
          </span>
        </h3>

        {/* Description/Summary */}
        {data.description && (
          <p className={`
            text-gray-600 leading-relaxed
            ${thumbnailSize === 'small' ? 'text-xs' : 'text-sm'}
          `}>
            <span className="line-clamp-2">
              {truncateText(data.description, thumbnailSize === 'small' ? 100 : thumbnailSize === 'medium' ? 120 : 150)}
            </span>
          </p>
        )}

        {/* Metadata Row */}
        <div className={`
          flex items-center space-x-3 text-gray-500
          ${thumbnailSize === 'small' ? 'text-xs' : 'text-sm'}
        `}>
          {/* Site Name */}
          <div className="flex items-center space-x-1">
            <Globe className="w-3 h-3" />
            <span className="truncate max-w-[100px]">{getDisplaySiteName()}</span>
          </div>

          {/* Author */}
          {data.author && (
            <>
              <span>•</span>
              <div className="flex items-center space-x-1">
                <User className="w-3 h-3" />
                <span className="truncate max-w-[100px]">{data.author}</span>
              </div>
            </>
          )}

          {/* Reading Time */}
          {data.readingTime && (
            <>
              <span>•</span>
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{data.readingTime} min</span>
              </div>
            </>
          )}

          {/* External Link Indicator */}
          <div className="flex-1 flex justify-end">
            <ExternalLink className={`
              w-4 h-4 transition-all duration-300
              ${isHovered ? 'text-blue-500 scale-110' : ''}
            `} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThumbnailSummaryContainer;