/**
 * Video Player Integration - London School TDD Tests
 * 
 * Tests video player component integration using behavior-driven mocks.
 * Focuses on how the video player coordinates with its collaborators.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Dependencies (London School - Contracts defined through mocks)
interface VideoPlayerEngine {
  initialize(config: VideoConfig): Promise<void>;
  load(url: string): Promise<void>;
  play(): Promise<boolean>;
  pause(): Promise<void>;
  seekTo(time: number): Promise<void>;
  setVolume(level: number): void;
  getState(): PlayerState;
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
  destroy(): void;
}

interface PlayerControlsManager {
  showControls(): void;
  hideControls(): void;
  updateProgress(progress: ProgressInfo): void;
  setVolume(level: number): void;
  toggleFullscreen(): void;
  setPlaybackRate(rate: number): void;
}

interface VideoAnalytics {
  trackPlay(data: PlayEvent): void;
  trackPause(data: PauseEvent): void;
  trackSeek(data: SeekEvent): void;
  trackError(error: VideoError): void;
  trackQualityChange(quality: string): void;
}

interface VideoMetadataService {
  fetchMetadata(url: string): Promise<VideoMetadata>;
  validateVideo(url: string): Promise<boolean>;
  getEmbedURL(url: string): string;
  getThumbnail(url: string): Promise<string>;
}

// Type definitions
interface VideoConfig {
  container: HTMLElement;
  url: string;
  autoplay: boolean;
  controls: boolean;
  muted?: boolean;
}

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  error?: string;
}

interface ProgressInfo {
  currentTime: number;
  duration: number;
  buffered: number;
}

interface PlayEvent {
  videoId: string;
  timestamp: number;
  source: string;
}

interface PauseEvent {
  videoId: string;
  timestamp: number;
  duration: number;
}

interface SeekEvent {
  videoId: string;
  fromTime: number;
  toTime: number;
}

interface VideoError {
  code: string;
  message: string;
  videoId: string;
}

interface VideoMetadata {
  id: string;
  title: string;
  duration: number;
  thumbnail: string;
  description?: string;
}

// System Under Test
interface VideoPlayerProps {
  url: string;
  videoData?: VideoMetadata;
  autoplay?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onError?: (error: string) => void;
  // Injected dependencies (London School)
  playerEngine: VideoPlayerEngine;
  controlsManager: PlayerControlsManager;
  analytics: VideoAnalytics;
  metadataService: VideoMetadataService;
}

const VideoPlayerComponent: React.FC<VideoPlayerProps> = ({
  url,
  videoData,
  autoplay = false,
  onPlay,
  onPause,
  onError,
  playerEngine,
  controlsManager,
  analytics,
  metadataService
}) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [metadata, setMetadata] = React.useState<VideoMetadata | null>(videoData || null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    initializePlayer();
    return () => {
      playerEngine.destroy();
    };
  }, []);

  React.useEffect(() => {
    if (!metadata) {
      loadMetadata();
    }
  }, [url, metadata]);

  const initializePlayer = async () => {
    try {
      if (!containerRef.current) return;

      // Contract: Initialize player engine with configuration
      await playerEngine.initialize({
        container: containerRef.current,
        url,
        autoplay,
        controls: true
      });

      // Contract: Set up event listeners for player state changes
      playerEngine.on('play', handlePlayEvent);
      playerEngine.on('pause', handlePauseEvent);
      playerEngine.on('error', handleErrorEvent);
      playerEngine.on('progress', handleProgressEvent);

      setIsLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize player';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const loadMetadata = async () => {
    try {
      // Contract: Validate video availability
      const isValid = await metadataService.validateVideo(url);
      if (!isValid) {
        throw new Error('Video is not available');
      }

      // Contract: Fetch video metadata
      const videoMetadata = await metadataService.fetchMetadata(url);
      setMetadata(videoMetadata);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load video metadata';
      setError(errorMessage);
    }
  };

  const handlePlayEvent = () => {
    setIsPlaying(true);
    
    // Contract: Update controls when playing
    controlsManager.showControls();
    
    // Contract: Track play analytics
    if (metadata) {
      analytics.trackPlay({
        videoId: metadata.id,
        timestamp: Date.now(),
        source: 'preview'
      });
    }
    
    onPlay?.();
  };

  const handlePauseEvent = () => {
    setIsPlaying(false);
    
    // Contract: Track pause analytics
    if (metadata) {
      analytics.trackPause({
        videoId: metadata.id,
        timestamp: Date.now(),
        duration: playerEngine.getState().currentTime
      });
    }
    
    onPause?.();
  };

  const handleErrorEvent = (error: VideoError) => {
    setError(error.message);
    setIsLoading(false);
    
    // Contract: Track error analytics
    analytics.trackError(error);
    onError?.(error.message);
  };

  const handleProgressEvent = (progress: ProgressInfo) => {
    // Contract: Update controls with progress
    controlsManager.updateProgress(progress);
  };

  const handlePlayClick = async () => {
    try {
      if (isPlaying) {
        await playerEngine.pause();
      } else {
        await playerEngine.play();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Playback failed';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleSeek = async (time: number) => {
    try {
      const currentTime = playerEngine.getState().currentTime;
      await playerEngine.seekTo(time);
      
      // Contract: Track seek analytics
      if (metadata) {
        analytics.trackSeek({
          videoId: metadata.id,
          fromTime: currentTime,
          toTime: time
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Seek failed';
      setError(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div data-testid="video-loading" className="video-loading">
        <div className="spinner" />
        Loading video...
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="video-error" className="video-error">
        <p>Error: {error}</p>
        <a href={url} target="_blank" rel="noopener noreferrer">
          Watch on original site
        </a>
      </div>
    );
  }

  return (
    <div data-testid="video-container" className="video-container">
      {metadata && (
        <div data-testid="video-metadata" className="video-metadata">
          <h3>{metadata.title}</h3>
          {metadata.description && <p>{metadata.description}</p>}
        </div>
      )}
      
      <div data-testid="video-player" ref={containerRef} className="video-player" />
      
      <div data-testid="video-controls" className="video-controls">
        <button
          data-testid="play-button"
          onClick={handlePlayClick}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        
        <button
          data-testid="seek-forward-button"
          onClick={() => handleSeek(playerEngine.getState().currentTime + 10)}
          aria-label="Skip forward 10 seconds"
        >
          +10s
        </button>
        
        <button
          data-testid="fullscreen-button"
          onClick={() => controlsManager.toggleFullscreen()}
          aria-label="Toggle fullscreen"
        >
          Fullscreen
        </button>
      </div>
    </div>
  );
};

// Test Suite
describe('VideoPlayerComponent - London School TDD', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockPlayerEngine: VideoPlayerEngine;
  let mockControlsManager: PlayerControlsManager;
  let mockAnalytics: VideoAnalytics;
  let mockMetadataService: VideoMetadataService;

  const defaultProps = {
    url: 'https://youtube.com/watch?v=abc123',
    playerEngine: {} as VideoPlayerEngine,
    controlsManager: {} as PlayerControlsManager,
    analytics: {} as VideoAnalytics,
    metadataService: {} as VideoMetadataService
  };

  const sampleMetadata: VideoMetadata = {
    id: 'abc123',
    title: 'Test Video',
    duration: 300,
    thumbnail: 'https://img.youtube.com/vi/abc123/maxresdefault.jpg',
    description: 'A test video for unit testing'
  };

  beforeEach(() => {
    user = userEvent.setup();
    
    // Create comprehensive mocks
    mockPlayerEngine = {
      initialize: vi.fn().mockResolvedValue(undefined),
      load: vi.fn().mockResolvedValue(undefined),
      play: vi.fn().mockResolvedValue(true),
      pause: vi.fn().mockResolvedValue(undefined),
      seekTo: vi.fn().mockResolvedValue(undefined),
      setVolume: vi.fn(),
      getState: vi.fn().mockReturnValue({
        isPlaying: false,
        currentTime: 0,
        duration: 300,
        volume: 1
      }),
      on: vi.fn(),
      off: vi.fn(),
      destroy: vi.fn()
    };

    mockControlsManager = {
      showControls: vi.fn(),
      hideControls: vi.fn(),
      updateProgress: vi.fn(),
      setVolume: vi.fn(),
      toggleFullscreen: vi.fn(),
      setPlaybackRate: vi.fn()
    };

    mockAnalytics = {
      trackPlay: vi.fn(),
      trackPause: vi.fn(),
      trackSeek: vi.fn(),
      trackError: vi.fn(),
      trackQualityChange: vi.fn()
    };

    mockMetadataService = {
      fetchMetadata: vi.fn().mockResolvedValue(sampleMetadata),
      validateVideo: vi.fn().mockResolvedValue(true),
      getEmbedURL: vi.fn().mockReturnValue('https://youtube.com/embed/abc123'),
      getThumbnail: vi.fn().mockResolvedValue('https://img.youtube.com/vi/abc123/maxresdefault.jpg')
    };
  });

  describe('Player Initialization Workflow', () => {
    // Contract Test: Should initialize player engine with correct configuration
    it('should initialize player engine with proper configuration', async () => {
      render(
        <VideoPlayerComponent 
          {...defaultProps}
          playerEngine={mockPlayerEngine}
          controlsManager={mockControlsManager}
          analytics={mockAnalytics}
          metadataService={mockMetadataService}
        />
      );

      await waitFor(() => {
        expect(mockPlayerEngine.initialize).toHaveBeenCalledWith({
          container: expect.any(HTMLDivElement),
          url: defaultProps.url,
          autoplay: false,
          controls: true
        });
      });
    });

    // Contract Test: Should set up event listeners after initialization
    it('should register event listeners for player state changes', async () => {
      render(
        <VideoPlayerComponent 
          {...defaultProps}
          playerEngine={mockPlayerEngine}
          controlsManager={mockControlsManager}
          analytics={mockAnalytics}
          metadataService={mockMetadataService}
        />
      );

      await waitFor(() => {
        expect(mockPlayerEngine.on).toHaveBeenCalledWith('play', expect.any(Function));
        expect(mockPlayerEngine.on).toHaveBeenCalledWith('pause', expect.any(Function));
        expect(mockPlayerEngine.on).toHaveBeenCalledWith('error', expect.any(Function));
        expect(mockPlayerEngine.on).toHaveBeenCalledWith('progress', expect.any(Function));
      });
    });

    // Contract Test: Should validate video before loading metadata
    it('should validate video through metadata service before loading', async () => {
      render(
        <VideoPlayerComponent 
          {...defaultProps}
          playerEngine={mockPlayerEngine}
          controlsManager={mockControlsManager}
          analytics={mockAnalytics}
          metadataService={mockMetadataService}
        />
      );

      await waitFor(() => {
        expect(mockMetadataService.validateVideo).toHaveBeenCalledWith(defaultProps.url);
        expect(mockMetadataService.fetchMetadata).toHaveBeenCalledWith(defaultProps.url);
      });
    });

    // Contract Test: Should destroy player on unmount
    it('should coordinate cleanup on component unmount', () => {
      const { unmount } = render(
        <VideoPlayerComponent 
          {...defaultProps}
          playerEngine={mockPlayerEngine}
          controlsManager={mockControlsManager}
          analytics={mockAnalytics}
          metadataService={mockMetadataService}
        />
      );

      unmount();

      expect(mockPlayerEngine.destroy).toHaveBeenCalled();
    });
  });

  describe('Playback Control Workflow', () => {
    // Contract Test: Play action should coordinate across all services
    it('should coordinate play action with engine, controls, and analytics', async () => {
      // Setup: Mock successful play
      (mockPlayerEngine.getState as MockedFunction<any>).mockReturnValue({
        isPlaying: false,
        currentTime: 0,
        duration: 300,
        volume: 1
      });

      render(
        <VideoPlayerComponent 
          {...defaultProps}
          videoData={sampleMetadata}
          playerEngine={mockPlayerEngine}
          controlsManager={mockControlsManager}
          analytics={mockAnalytics}
          metadataService={mockMetadataService}
        />
      );

      // Wait for initialization
      await waitFor(() => {
        expect(screen.getByTestId('video-container')).toBeInTheDocument();
      });

      // Simulate play button click
      const playButton = screen.getByTestId('play-button');
      await user.click(playButton);

      // Verify coordination across services
      expect(mockPlayerEngine.play).toHaveBeenCalled();
    });

    // Behavior Test: Play event should trigger proper collaborator interactions
    it('should handle play event with proper service coordination', async () => {
      let playEventCallback: Function;
      
      (mockPlayerEngine.on as MockedFunction<any>).mockImplementation((event: string, callback: Function) => {
        if (event === 'play') {
          playEventCallback = callback;
        }
      });

      render(
        <VideoPlayerComponent 
          {...defaultProps}
          videoData={sampleMetadata}
          playerEngine={mockPlayerEngine}
          controlsManager={mockControlsManager}
          analytics={mockAnalytics}
          metadataService={mockMetadataService}
        />
      );

      // Wait for initialization
      await waitFor(() => {
        expect(mockPlayerEngine.on).toHaveBeenCalled();
      });

      // Simulate play event from player engine
      playEventCallback!();

      // Verify coordinated response
      expect(mockControlsManager.showControls).toHaveBeenCalled();
      expect(mockAnalytics.trackPlay).toHaveBeenCalledWith({
        videoId: sampleMetadata.id,
        timestamp: expect.any(Number),
        source: 'preview'
      });
    });

    // Contract Test: Pause should coordinate across services
    it('should coordinate pause action across all services', async () => {
      let pauseEventCallback: Function;
      
      (mockPlayerEngine.on as MockedFunction<any>).mockImplementation((event: string, callback: Function) => {
        if (event === 'pause') {
          pauseEventCallback = callback;
        }
      });

      (mockPlayerEngine.getState as MockedFunction<any>).mockReturnValue({
        isPlaying: true,
        currentTime: 150,
        duration: 300,
        volume: 1
      });

      render(
        <VideoPlayerComponent 
          {...defaultProps}
          videoData={sampleMetadata}
          playerEngine={mockPlayerEngine}
          controlsManager={mockControlsManager}
          analytics={mockAnalytics}
          metadataService={mockMetadataService}
        />
      );

      await waitFor(() => {
        expect(mockPlayerEngine.on).toHaveBeenCalled();
      });

      // Simulate pause event
      pauseEventCallback!();

      expect(mockAnalytics.trackPause).toHaveBeenCalledWith({
        videoId: sampleMetadata.id,
        timestamp: expect.any(Number),
        duration: 150
      });
    });

    // Contract Test: Seek should coordinate with analytics
    it('should coordinate seek action with analytics tracking', async () => {
      (mockPlayerEngine.getState as MockedFunction<any>).mockReturnValue({
        isPlaying: true,
        currentTime: 100,
        duration: 300,
        volume: 1
      });

      render(
        <VideoPlayerComponent 
          {...defaultProps}
          videoData={sampleMetadata}
          playerEngine={mockPlayerEngine}
          controlsManager={mockControlsManager}
          analytics={mockAnalytics}
          metadataService={mockMetadataService}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('seek-forward-button')).toBeInTheDocument();
      });

      const seekButton = screen.getByTestId('seek-forward-button');
      await user.click(seekButton);

      expect(mockPlayerEngine.seekTo).toHaveBeenCalledWith(110); // +10 seconds
      expect(mockAnalytics.trackSeek).toHaveBeenCalledWith({
        videoId: sampleMetadata.id,
        fromTime: 100,
        toTime: 110
      });
    });
  });

  describe('Error Handling Workflow', () => {
    // Contract Test: Should handle initialization errors
    it('should handle player engine initialization failure', async () => {
      const initError = new Error('Failed to initialize player');
      (mockPlayerEngine.initialize as MockedFunction<any>).mockRejectedValue(initError);

      const onErrorMock = vi.fn();
      
      render(
        <VideoPlayerComponent 
          {...defaultProps}
          onError={onErrorMock}
          playerEngine={mockPlayerEngine}
          controlsManager={mockControlsManager}
          analytics={mockAnalytics}
          metadataService={mockMetadataService}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('video-error')).toBeInTheDocument();
      });

      expect(onErrorMock).toHaveBeenCalledWith('Failed to initialize player');
      expect(screen.getByText('Error: Failed to initialize player')).toBeInTheDocument();
    });

    // Contract Test: Should handle video validation failure
    it('should handle video validation failure through metadata service', async () => {
      (mockMetadataService.validateVideo as MockedFunction<any>).mockResolvedValue(false);

      render(
        <VideoPlayerComponent 
          {...defaultProps}
          playerEngine={mockPlayerEngine}
          controlsManager={mockControlsManager}
          analytics={mockAnalytics}
          metadataService={mockMetadataService}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('video-error')).toBeInTheDocument();
      });

      expect(mockMetadataService.fetchMetadata).not.toHaveBeenCalled();
      expect(screen.getByText(/Video is not available/)).toBeInTheDocument();
    });

    // Behavior Test: Should track errors through analytics
    it('should track errors through analytics service', async () => {
      let errorEventCallback: Function;
      const videoError = {
        code: 'PLAYBACK_ERROR',
        message: 'Failed to load video',
        videoId: sampleMetadata.id
      };
      
      (mockPlayerEngine.on as MockedFunction<any>).mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          errorEventCallback = callback;
        }
      });

      render(
        <VideoPlayerComponent 
          {...defaultProps}
          videoData={sampleMetadata}
          playerEngine={mockPlayerEngine}
          controlsManager={mockControlsManager}
          analytics={mockAnalytics}
          metadataService={mockMetadataService}
        />
      );

      await waitFor(() => {
        expect(mockPlayerEngine.on).toHaveBeenCalled();
      });

      // Simulate error event
      errorEventCallback!(videoError);

      expect(mockAnalytics.trackError).toHaveBeenCalledWith(videoError);
      expect(screen.getByTestId('video-error')).toBeInTheDocument();
    });
  });

  describe('Progress and Controls Integration', () => {
    // Contract Test: Progress updates should be passed to controls manager
    it('should update controls manager with progress information', async () => {
      let progressEventCallback: Function;
      const progressData = {
        currentTime: 150,
        duration: 300,
        buffered: 120
      };
      
      (mockPlayerEngine.on as MockedFunction<any>).mockImplementation((event: string, callback: Function) => {
        if (event === 'progress') {
          progressEventCallback = callback;
        }
      });

      render(
        <VideoPlayerComponent 
          {...defaultProps}
          videoData={sampleMetadata}
          playerEngine={mockPlayerEngine}
          controlsManager={mockControlsManager}
          analytics={mockAnalytics}
          metadataService={mockMetadataService}
        />
      );

      await waitFor(() => {
        expect(mockPlayerEngine.on).toHaveBeenCalled();
      });

      // Simulate progress event
      progressEventCallback!(progressData);

      expect(mockControlsManager.updateProgress).toHaveBeenCalledWith(progressData);
    });

    // Contract Test: Fullscreen toggle should use controls manager
    it('should delegate fullscreen control to controls manager', async () => {
      render(
        <VideoPlayerComponent 
          {...defaultProps}
          playerEngine={mockPlayerEngine}
          controlsManager={mockControlsManager}
          analytics={mockAnalytics}
          metadataService={mockMetadataService}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('fullscreen-button')).toBeInTheDocument();
      });

      const fullscreenButton = screen.getByTestId('fullscreen-button');
      await user.click(fullscreenButton);

      expect(mockControlsManager.toggleFullscreen).toHaveBeenCalled();
    });
  });

  describe('Accessibility and User Interaction', () => {
    // Behavior Test: Should provide proper ARIA labels
    it('should provide accessible button labels', async () => {
      render(
        <VideoPlayerComponent 
          {...defaultProps}
          playerEngine={mockPlayerEngine}
          controlsManager={mockControlsManager}
          analytics={mockAnalytics}
          metadataService={mockMetadataService}
        />
      );

      await waitFor(() => {
        const playButton = screen.getByTestId('play-button');
        expect(playButton).toHaveAttribute('aria-label', 'Play video');

        const seekButton = screen.getByTestId('seek-forward-button');
        expect(seekButton).toHaveAttribute('aria-label', 'Skip forward 10 seconds');

        const fullscreenButton = screen.getByTestId('fullscreen-button');
        expect(fullscreenButton).toHaveAttribute('aria-label', 'Toggle fullscreen');
      });
    });

    // Behavior Test: Should update button label based on state
    it('should update play button label based on playing state', async () => {
      let playEventCallback: Function;
      
      (mockPlayerEngine.on as MockedFunction<any>).mockImplementation((event: string, callback: Function) => {
        if (event === 'play') {
          playEventCallback = callback;
        }
      });

      render(
        <VideoPlayerComponent 
          {...defaultProps}
          playerEngine={mockPlayerEngine}
          controlsManager={mockControlsManager}
          analytics={mockAnalytics}
          metadataService={mockMetadataService}
        />
      );

      await waitFor(() => {
        const playButton = screen.getByTestId('play-button');
        expect(playButton).toHaveAttribute('aria-label', 'Play video');
      });

      // Simulate play event
      playEventCallback!();

      await waitFor(() => {
        const playButton = screen.getByTestId('play-button');
        expect(playButton).toHaveAttribute('aria-label', 'Pause video');
      });
    });
  });
});