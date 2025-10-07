import React, { useState } from 'react';
import PhotoGrid from './PhotoGrid';
import type { PhotoGridImage } from './PhotoGrid';

/**
 * PhotoGrid Demo Component
 *
 * Demonstrates all features and configurations of the PhotoGrid component.
 * This can be used for testing and showcasing the component.
 */
const PhotoGridDemo: React.FC = () => {
  const [columns, setColumns] = useState(3);
  const [aspectRatio, setAspectRatio] = useState<'square' | '16:9' | '4:3' | 'auto'>('auto');
  const [enableLightbox, setEnableLightbox] = useState(true);

  // Sample images using Lorem Picsum
  const sampleImages: PhotoGridImage[] = [
    {
      url: 'https://picsum.photos/800/600?random=1',
      thumbnail: 'https://picsum.photos/400/300?random=1',
      alt: 'Random landscape 1',
      caption: 'Beautiful mountain landscape with clear blue sky',
    },
    {
      url: 'https://picsum.photos/800/600?random=2',
      thumbnail: 'https://picsum.photos/400/300?random=2',
      alt: 'Random landscape 2',
      caption: 'Serene lake view at sunset',
    },
    {
      url: 'https://picsum.photos/800/600?random=3',
      thumbnail: 'https://picsum.photos/400/300?random=3',
      alt: 'Random landscape 3',
      caption: 'Dense forest with sunlight filtering through',
    },
    {
      url: 'https://picsum.photos/800/600?random=4',
      thumbnail: 'https://picsum.photos/400/300?random=4',
      alt: 'Random landscape 4',
      caption: 'Urban cityscape at twilight',
    },
    {
      url: 'https://picsum.photos/800/600?random=5',
      thumbnail: 'https://picsum.photos/400/300?random=5',
      alt: 'Random landscape 5',
      caption: 'Coastal view with waves crashing',
    },
    {
      url: 'https://picsum.photos/800/600?random=6',
      thumbnail: 'https://picsum.photos/400/300?random=6',
      alt: 'Random landscape 6',
      caption: 'Desert dunes at golden hour',
    },
    {
      url: 'https://picsum.photos/800/600?random=7',
      thumbnail: 'https://picsum.photos/400/300?random=7',
      alt: 'Random landscape 7',
      caption: 'Snow-capped mountain peaks',
    },
    {
      url: 'https://picsum.photos/800/600?random=8',
      thumbnail: 'https://picsum.photos/400/300?random=8',
      alt: 'Random landscape 8',
      caption: 'Tropical beach with palm trees',
    },
    {
      url: 'https://picsum.photos/800/600?random=9',
      thumbnail: 'https://picsum.photos/400/300?random=9',
      alt: 'Random landscape 9',
      caption: 'Rolling hills with wildflowers',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">PhotoGrid Component Demo</h1>
        <p className="text-gray-600">
          A responsive photo gallery with lightbox functionality, lazy loading, and error handling.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Columns Control */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Columns: {columns}
            </label>
            <input
              type="range"
              min="1"
              max="6"
              value={columns}
              onChange={(e) => setColumns(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1</span>
              <span>6</span>
            </div>
          </div>

          {/* Aspect Ratio Control */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aspect Ratio
            </label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="auto">Auto</option>
              <option value="square">Square (1:1)</option>
              <option value="16:9">16:9</option>
              <option value="4:3">4:3</option>
            </select>
          </div>

          {/* Lightbox Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lightbox
            </label>
            <button
              onClick={() => setEnableLightbox(!enableLightbox)}
              className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
                enableLightbox
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {enableLightbox ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>

        {/* Current Config Display */}
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <p className="text-sm font-mono text-gray-700">
            <span className="text-blue-600">{'<PhotoGrid '}</span>
            <span className="text-purple-600">columns</span>={'{' + columns + '}'}{' '}
            <span className="text-purple-600">aspectRatio</span>="{aspectRatio}"{' '}
            <span className="text-purple-600">enableLightbox</span>={'{' + enableLightbox + '}'}{' '}
            <span className="text-blue-600">{'/>'}</span>
          </p>
        </div>
      </div>

      {/* Photo Grid */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Gallery</h2>
        <PhotoGrid
          images={sampleImages}
          columns={columns}
          aspectRatio={aspectRatio}
          enableLightbox={enableLightbox}
        />
      </div>

      {/* Features List */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              ✓
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Responsive Grid</h3>
              <p className="text-sm text-gray-600">Adapts to mobile, tablet, and desktop screens</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              ✓
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Lightbox</h3>
              <p className="text-sm text-gray-600">Click images to view full-size with zoom controls</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              ✓
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Lazy Loading</h3>
              <p className="text-sm text-gray-600">Images load as you scroll for better performance</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              ✓
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Error Handling</h3>
              <p className="text-sm text-gray-600">Gracefully handles broken images</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              ✓
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Captions</h3>
              <p className="text-sm text-gray-600">Hover to see captions, visible in lightbox</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              ✓
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Thumbnails</h3>
              <p className="text-sm text-gray-600">Optional separate thumbnails for faster loading</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              ✓
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Accessibility</h3>
              <p className="text-sm text-gray-600">Alt text, ARIA labels, keyboard navigation</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              ✓
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Multiple Aspect Ratios</h3>
              <p className="text-sm text-gray-600">Square, 16:9, 4:3, or auto</p>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-3">Try It Out</h2>
        <ul className="space-y-2 text-blue-800">
          <li className="flex items-start gap-2">
            <span className="mt-1">•</span>
            <span>Use the controls above to adjust columns, aspect ratio, and lightbox</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1">•</span>
            <span>Click any image to open the lightbox view</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1">•</span>
            <span>Hover over images to see captions</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1">•</span>
            <span>In lightbox: use zoom buttons, arrow keys to navigate, ESC to close</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default PhotoGridDemo;
