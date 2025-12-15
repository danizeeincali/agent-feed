import React, { useState, useCallback } from 'react';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import { ImageOff, Loader2 } from 'lucide-react';
import 'react-photo-view/dist/react-photo-view.css';

export interface PhotoGridImage {
  url: string;
  alt?: string;
  caption?: string;
  thumbnail?: string;
}

export interface PhotoGridProps {
  images: PhotoGridImage[];
  columns?: number;
  enableLightbox?: boolean;
  aspectRatio?: 'square' | '16:9' | '4:3' | 'auto';
  className?: string;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({
  images = [],
  columns = 3,
  enableLightbox = true,
  aspectRatio = 'auto',
  className = '',
}) => {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  // Ensure columns is between 1-6
  const gridColumns = Math.min(6, Math.max(1, columns));

  // Calculate aspect ratio padding
  const getAspectRatioPadding = () => {
    switch (aspectRatio) {
      case 'square':
        return '100%'; // 1:1
      case '16:9':
        return '56.25%'; // 9/16 * 100
      case '4:3':
        return '75%'; // 3/4 * 100
      case 'auto':
      default:
        return '0';
    }
  };

  // Get grid template columns based on column count
  const getGridTemplateColumns = () => {
    return {
      gridTemplateColumns: `repeat(auto-fill, minmax(${100 / gridColumns}%, 1fr))`,
    };
  };

  // Get responsive grid classes
  const getGridClasses = () => {
    const colClasses: Record<number, string> = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
      6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
    };
    return colClasses[gridColumns] || colClasses[3];
  };

  const handleImageLoad = useCallback((index: number) => {
    setLoadedImages(prev => new Set(prev).add(index));
  }, []);

  const handleImageError = useCallback((index: number) => {
    setFailedImages(prev => new Set(prev).add(index));
  }, []);

  // If no images, show empty state
  if (!images || images.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-8 ${className}`}>
        <div className="text-center py-8">
          <ImageOff className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Images</h3>
          <p className="text-gray-500">No images to display</p>
        </div>
      </div>
    );
  }

  const ImageWrapper: React.FC<{
    image: PhotoGridImage;
    index: number;
    children: React.ReactElement
  }> = ({ image, index, children }) => {
    if (!enableLightbox) {
      return <>{children}</>;
    }

    const overlay = image.caption ? (
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4 text-center">
        <p className="text-sm font-medium">{image.caption}</p>
      </div>
    ) : undefined;

    return (
      <PhotoView src={image.url} overlay={overlay}>
        {children}
      </PhotoView>
    );
  };

  const renderImage = (image: PhotoGridImage, index: number) => {
    const isLoaded = loadedImages.has(index);
    const hasFailed = failedImages.has(index);
    const imageUrl = image.thumbnail || image.url;
    const padding = getAspectRatioPadding();

    return (
      <div
        key={index}
        className={`relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 ${
          enableLightbox ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
        }`}
        style={aspectRatio !== 'auto' ? { paddingBottom: padding } : {}}
      >
        {/* Loading placeholder */}
        {!isLoaded && !hasFailed && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={aspectRatio === 'auto' ? { minHeight: '200px' } : {}}
          >
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 dark:text-gray-400" />
          </div>
        )}

        {/* Error state */}
        {hasFailed && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800"
            style={aspectRatio === 'auto' ? { minHeight: '200px' } : {}}
          >
            <ImageOff className="w-12 h-12 text-gray-400 dark:text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Failed to load image</p>
          </div>
        )}

        {/* Actual image */}
        {!hasFailed && (
          <img
            src={imageUrl}
            alt={image.alt || `Image ${index + 1}`}
            loading="lazy"
            className={`${
              aspectRatio !== 'auto'
                ? 'absolute inset-0 w-full h-full object-cover'
                : 'w-full h-auto'
            } ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
            onLoad={() => handleImageLoad(index)}
            onError={() => handleImageError(index)}
          />
        )}

        {/* Caption overlay on hover */}
        {image.caption && isLoaded && !hasFailed && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 hover:opacity-100 transition-opacity">
            <p className="text-white text-sm font-medium truncate">
              {image.caption}
            </p>
          </div>
        )}
      </div>
    );
  };

  const gridContent = (
    <div className={`grid ${getGridClasses()} gap-4 ${className}`}>
      {images.map((image, index) => (
        <ImageWrapper key={index} image={image} index={index}>
          {renderImage(image, index)}
        </ImageWrapper>
      ))}
    </div>
  );

  // Wrap with PhotoProvider if lightbox is enabled
  if (enableLightbox) {
    return (
      <PhotoProvider
        maskOpacity={0.8}
        speed={() => 300}
        easing={(type) =>
          type === 2
            ? 'cubic-bezier(0.36, 0, 0.66, -0.56)'
            : 'cubic-bezier(0.34, 1.56, 0.64, 1)'
        }
        toolbarRender={({ onScale, scale }) => (
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded text-white transition-colors"
              onClick={() => onScale(scale + 0.5)}
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded text-white transition-colors"
              onClick={() => onScale(scale - 0.5)}
              aria-label="Zoom out"
            >
              -
            </button>
          </div>
        )}
      >
        {gridContent}
      </PhotoProvider>
    );
  }

  return gridContent;
};

export default PhotoGrid;
