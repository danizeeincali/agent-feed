import React, { createContext, useContext, useState, ReactNode } from 'react';

interface VideoPlaybackContextType {
  currentlyPlayingVideo: string | null;
  setCurrentlyPlayingVideo: (videoId: string | null) => void;
  stopAllVideos: () => void;
}

const VideoPlaybackContext = createContext<VideoPlaybackContextType | undefined>(undefined);

export function VideoPlaybackProvider({ children }: { children: ReactNode }) {
  const [currentlyPlayingVideo, setCurrentlyPlayingVideo] = useState<string | null>(null);

  const stopAllVideos = () => {
    setCurrentlyPlayingVideo(null);
  };

  return (
    <VideoPlaybackContext.Provider 
      value={{ 
        currentlyPlayingVideo, 
        setCurrentlyPlayingVideo, 
        stopAllVideos 
      }}
    >
      {children}
    </VideoPlaybackContext.Provider>
  );
}

export function useVideoPlayback() {
  const context = useContext(VideoPlaybackContext);
  if (context === undefined) {
    throw new Error('useVideoPlayback must be used within a VideoPlaybackProvider');
  }
  return context;
}