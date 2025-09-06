import React, { useState, useEffect, useCallback } from 'react';
import { Play, ExternalLink, Volume2, VolumeX } from 'lucide-react';
import { useVideoPlayback } from '../contexts/VideoPlaybackContext';

interface YouTubeEmbedProps {
  videoId: string;
  autoplay?: boolean;
  showControls?: boolean;
  privacyMode?: boolean;
  thumbnail?: 'default' | 'medium' | 'high' | 'maxres';
  className?: string;
  showThumbnailOnly?: boolean;
  title?: string;
  onPlay?: () => void;
  enableLoop?: boolean;
  startMuted?: boolean;
  expandedMode?: boolean;
}

export const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};

export const getYouTubeThumbnail = (videoId: string, quality: string = 'medium'): string => {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault', 
    high: 'hqdefault',
    maxres: 'maxresdefault'
  };
  
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/${qualityMap[quality as keyof typeof qualityMap] || 'mqdefault'}.jpg`;
  
  // Add cache busting and CORS handling for better reliability
  return thumbnailUrl;
};

// Enhanced thumbnail fallback system
export const getYouTubeThumbnailWithFallback = (videoId: string, quality: string = 'medium'): string[] => {
  const qualities = ['maxresdefault', 'hqdefault', 'mqdefault', 'default'];
  const startIndex = qualities.indexOf(quality === 'maxres' ? 'maxresdefault' : quality === 'high' ? 'hqdefault' : quality === 'medium' ? 'mqdefault' : 'default');
  
  // Return array of fallback URLs starting from requested quality down to default
  return qualities.slice(startIndex >= 0 ? startIndex : 2).map(q => 
    `https://img.youtube.com/vi/${videoId}/${q}.jpg`
  );
};

const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({
  videoId,
  autoplay = false,
  showControls = true,
  privacyMode = true,
  thumbnail = 'medium',
  className = '',
  showThumbnailOnly = false,
  title = 'YouTube Video',
  onPlay,
  enableLoop = false,
  startMuted = false,
  expandedMode = false
}) => {
  const { currentlyPlayingVideo, setCurrentlyPlayingVideo } = useVideoPlayback();
  const [isPlaying, setIsPlaying] = useState(expandedMode && autoplay);
  const [isMuted, setIsMuted] = useState(startMuted || expandedMode);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>([]);
  const [currentThumbnailIndex, setCurrentThumbnailIndex] = useState(0);
  const [userInteracted, setUserInteracted] = useState(expandedMode); // Initialize as true for expanded mode
  const [embedUrl, setEmbedUrl] = useState<string>('');

  // Check if this video should be playing based on global context
  const isThisVideoPlaying = currentlyPlayingVideo === videoId;

  // Sync local playing state with global context
  useEffect(() => {
    if (currentlyPlayingVideo && currentlyPlayingVideo !== videoId) {
      // Another video is playing, stop this one
      setIsPlaying(false);
    }
  }, [currentlyPlayingVideo, videoId]);

  const domain = privacyMode ? 'youtube-nocookie.com' : 'youtube.com';
  const thumbnailUrl = thumbnailUrls[currentThumbnailIndex] || getYouTubeThumbnail(videoId, thumbnail);
  
  // Initialize fallback thumbnails
  useEffect(() => {
    const fallbackUrls = getYouTubeThumbnailWithFallback(videoId, thumbnail);
    setThumbnailUrls(fallbackUrls);
    setCurrentThumbnailIndex(0);
    setThumbnailError(false);
  }, [videoId, thumbnail]);
  
  // Build embed URL with proper autoplay logic
  const buildEmbedUrl = useCallback((shouldAutoplay: boolean = false) => {
    const embedParams = new URLSearchParams({
      autoplay: shouldAutoplay ? '1' : '0',
      controls: showControls ? '1' : '0',
      mute: (shouldAutoplay || isMuted || expandedMode) ? '1' : '0', // Always mute for autoplay
      loop: (enableLoop || expandedMode) ? '1' : '0',
      playlist: (enableLoop || expandedMode) ? videoId : '',
      rel: '0',
      modestbranding: '1',
      playsinline: '1',
      disablekb: '0',
      fs: '1',
      // Enhanced 2025 parameters for better compatibility
      enablejsapi: '1',
      origin: typeof window !== 'undefined' ? window.location.origin : '',
      // Improved autoplay handling
      start: '0',
      iv_load_policy: '3',
      cc_load_policy: '0',
      // Better embed quality
      quality: 'hd720'
    });
    
    return `https://www.${domain}/embed/${videoId}?${embedParams.toString()}`;
  }, [videoId, showControls, isMuted, enableLoop, expandedMode, domain]);
  
  // Update embed URL when relevant state changes
  useEffect(() => {
    const shouldAutoplay = (autoplay || expandedMode) && (userInteracted || isPlaying || expandedMode);
    const newUrl = buildEmbedUrl(shouldAutoplay);
    setEmbedUrl(newUrl);
  }, [buildEmbedUrl, autoplay, expandedMode, userInteracted, isPlaying]);

  const handlePlay = useCallback(() => {
    setCurrentlyPlayingVideo(videoId); // Set this as the currently playing video
    setIsPlaying(true);
    onPlay?.();
  }, [onPlay, videoId, setCurrentlyPlayingVideo]);

  // Auto-start video in expanded mode with proper user interaction
  useEffect(() => {
    if (expandedMode) {
      setIsPlaying(true);
      setIsMuted(true);
      setUserInteracted(true); // Mark as user interacted for expanded mode
      // Force update embed URL for autoplay
      setTimeout(() => {
        const autoplayUrl = buildEmbedUrl(true);
        setEmbedUrl(autoplayUrl);
        setPlayerReady(false);
        setTimeout(() => setPlayerReady(true), 50);
      }, 100);
    }
  }, [expandedMode, buildEmbedUrl]);

  const handleThumbnailError = () => {
    // Try next fallback thumbnail before giving up
    if (currentThumbnailIndex < thumbnailUrls.length - 1) {
      setCurrentThumbnailIndex(prev => prev + 1);
    } else {
      setThumbnailError(true);
    }
  };
  
  // Enhanced play handler with user interaction tracking
  const handlePlayWithInteraction = useCallback(() => {
    setCurrentlyPlayingVideo(videoId); // Set this as the currently playing video
    setUserInteracted(true);
    setIsPlaying(true);
    onPlay?.();
    
    // In expanded mode, enable autoplay immediately for smooth UX
    if (expandedMode && autoplay) {
      // Immediately update URL for autoplay after user interaction
      setTimeout(() => {
        const autoplayUrl = buildEmbedUrl(true);
        setEmbedUrl(autoplayUrl);
        setPlayerReady(false);
        setTimeout(() => setPlayerReady(true), 50);
      }, 50);
    } else {
      // Standard behavior for thumbnail mode
      setTimeout(() => {
        const autoplayUrl = buildEmbedUrl(true);
        setEmbedUrl(autoplayUrl);
        setPlayerReady(false);
        setTimeout(() => setPlayerReady(true), 50);
      }, 50);
    }
  }, [onPlay, buildEmbedUrl, expandedMode, autoplay, videoId, setCurrentlyPlayingVideo]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  const openInYouTube = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank', 'noopener,noreferrer');
  };

  if ((showThumbnailOnly || !isPlaying) && !expandedMode) {
    return (
      <div 
        className={`relative group cursor-pointer overflow-hidden rounded-lg ${className}`}
        onClick={handlePlayWithInteraction}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handlePlayWithInteraction();
          }
        }}
      >
        <div className="relative aspect-video">
          {!thumbnailError ? (
            <img
              src={thumbnailUrl}
              alt={title}
              className={`w-full h-full object-cover transition-transform duration-300 ${
                isHovered ? 'scale-105' : ''
              }`}
              onError={handleThumbnailError}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
              <Play className="w-16 h-16 text-white" />
            </div>
          )}
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300" />
          
          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`
              bg-red-600 rounded-full p-3 shadow-lg transform transition-all duration-300
              ${isHovered ? 'scale-110 bg-red-700' : ''}
              group-hover:shadow-xl
            `}>
              <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
            </div>
          </div>
          
          {/* Controls overlay */}
          <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={toggleMute}
              className="bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-2 rounded-full transition-all"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={openInYouTube}
              className="bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-2 rounded-full transition-all"
              title="Open in YouTube"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
          
          {/* YouTube branding */}
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
              YouTube
            </div>
          </div>
        </div>
        
        {/* Title bar */}
        <div className="bg-gray-900 text-white p-3">
          <h4 className="font-medium truncate text-sm">{title}</h4>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-300">YouTube Video</span>
            <Play className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative aspect-video rounded-lg overflow-hidden group ${className}`}>
      {embedUrl && (
        <iframe
          key={embedUrl} // Force re-render when URL changes
          src={embedUrl}
          title={title}
          className={`w-full h-full ${expandedMode ? 'pointer-events-auto' : ''}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox allow-forms"
          onLoad={() => {
            console.log('🎥 YouTube iframe loaded:', { autoplay: embedUrl.includes('autoplay=1'), muted: embedUrl.includes('mute=1') });
            setPlayerReady(true);
          }}
          onError={(e) => {
            console.error('YouTube iframe failed to load:', e);
            setThumbnailError(true);
          }}
        />
      )}
      
      {/* Expanded mode overlay controls */}
      {expandedMode && (
        <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={toggleMute}
            className="bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-2 rounded-full transition-all"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={openInYouTube}
            className="bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-2 rounded-full transition-all"
            title="Open in YouTube"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      )}
      
    </div>
  );
};

export default YouTubeEmbed;