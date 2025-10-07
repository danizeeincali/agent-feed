# PhotoGrid Component

A production-ready, responsive photo gallery component with lightbox functionality using react-photo-view.

## Features

- ✅ Responsive grid with configurable columns (1-6)
- ✅ Multiple aspect ratios: square, 16:9, 4:3, auto
- ✅ Lazy loading for images
- ✅ Thumbnail support with full-size on lightbox
- ✅ Mobile-responsive (1 column on mobile, more on desktop)
- ✅ Loading placeholders
- ✅ Error handling for broken images
- ✅ Accessibility with alt text
- ✅ Caption overlay on hover and in lightbox
- ✅ Zoom controls in lightbox
- ✅ Smooth animations and transitions

## Installation

```bash
npm install react-photo-view
```

## Import

```typescript
import PhotoGrid from './components/dynamic-page/PhotoGrid';
import type { PhotoGridProps, PhotoGridImage } from './components/dynamic-page/PhotoGrid';
```

## Props Interface

```typescript
interface PhotoGridImage {
  url: string;           // Full-size image URL
  alt?: string;          // Alt text for accessibility
  caption?: string;      // Caption shown on hover and in lightbox
  thumbnail?: string;    // Optional thumbnail URL (uses url if not provided)
}

interface PhotoGridProps {
  images: PhotoGridImage[];                           // Array of images
  columns?: number;                                   // 1-6 columns (default: 3)
  enableLightbox?: boolean;                          // Enable/disable lightbox (default: true)
  aspectRatio?: 'square' | '16:9' | '4:3' | 'auto'; // Image aspect ratio (default: 'auto')
  className?: string;                                // Additional CSS classes
}
```

## Usage Examples

### Basic Usage

```typescript
import PhotoGrid from './components/dynamic-page/PhotoGrid';

const MyGallery = () => {
  const images = [
    { url: 'https://picsum.photos/800/600?random=1', alt: 'Random image 1' },
    { url: 'https://picsum.photos/800/600?random=2', alt: 'Random image 2' },
    { url: 'https://picsum.photos/800/600?random=3', alt: 'Random image 3' },
  ];

  return <PhotoGrid images={images} />;
};
```

### With Captions

```typescript
const images = [
  {
    url: 'https://picsum.photos/800/600?random=1',
    alt: 'Beautiful landscape',
    caption: 'A stunning mountain view at sunset',
  },
  {
    url: 'https://picsum.photos/800/600?random=2',
    alt: 'City skyline',
    caption: 'Downtown cityscape at night',
  },
];

<PhotoGrid images={images} columns={2} />
```

### With Thumbnails

```typescript
const images = [
  {
    url: 'https://picsum.photos/1920/1080?random=1',
    thumbnail: 'https://picsum.photos/400/300?random=1',
    alt: 'High resolution image',
    caption: 'Click to view full size',
  },
  // ... more images
];

<PhotoGrid images={images} columns={3} />
```

### Square Aspect Ratio

```typescript
<PhotoGrid
  images={images}
  columns={4}
  aspectRatio="square"
/>
```

### 16:9 Aspect Ratio (Good for Videos/Cinematic)

```typescript
<PhotoGrid
  images={images}
  columns={3}
  aspectRatio="16:9"
/>
```

### Auto Aspect Ratio (Maintains Original)

```typescript
<PhotoGrid
  images={images}
  columns={2}
  aspectRatio="auto"
/>
```

### Without Lightbox

```typescript
<PhotoGrid
  images={images}
  enableLightbox={false}
  columns={4}
/>
```

### Custom Styling

```typescript
<PhotoGrid
  images={images}
  columns={3}
  className="my-custom-gallery p-4 bg-gray-50"
/>
```

## Dynamic Page Specification

When using PhotoGrid in a dynamic page, define it in your page specification:

### Example 1: Basic Gallery

```json
{
  "type": "PhotoGrid",
  "props": {
    "images": [
      {
        "url": "https://picsum.photos/800/600?random=1",
        "alt": "Random image 1",
        "caption": "Beautiful scenery"
      },
      {
        "url": "https://picsum.photos/800/600?random=2",
        "alt": "Random image 2",
        "caption": "Amazing view"
      },
      {
        "url": "https://picsum.photos/800/600?random=3",
        "alt": "Random image 3",
        "caption": "Stunning landscape"
      }
    ],
    "columns": 3,
    "enableLightbox": true,
    "aspectRatio": "auto"
  }
}
```

### Example 2: Square Grid

```json
{
  "type": "PhotoGrid",
  "props": {
    "images": [
      {
        "url": "https://picsum.photos/800/800?random=1",
        "alt": "Square image 1"
      },
      {
        "url": "https://picsum.photos/800/800?random=2",
        "alt": "Square image 2"
      },
      {
        "url": "https://picsum.photos/800/800?random=3",
        "alt": "Square image 3"
      },
      {
        "url": "https://picsum.photos/800/800?random=4",
        "alt": "Square image 4"
      }
    ],
    "columns": 4,
    "aspectRatio": "square"
  }
}
```

### Example 3: With Template Variables

```json
{
  "type": "PhotoGrid",
  "props": {
    "images": "{{agent.gallery_images}}",
    "columns": 3,
    "enableLightbox": true,
    "aspectRatio": "16:9"
  }
}
```

Where `agent.gallery_images` would resolve to an array like:

```javascript
[
  { url: "...", alt: "...", caption: "..." },
  { url: "...", alt: "...", caption: "..." },
  // ...
]
```

## Responsive Behavior

The component automatically adjusts columns based on screen size:

- **1 column**: Always 1 column on all screens
- **2 columns**: 1 on mobile, 2 on tablet+
- **3 columns**: 1 on mobile, 2 on tablet, 3 on desktop
- **4 columns**: 1 on mobile, 2 on tablet, 4 on desktop
- **5 columns**: 1 on mobile, 2 on tablet, 3 on medium, 5 on large
- **6 columns**: 1 on mobile, 2 on tablet, 3 on medium, 6 on large

## Accessibility

- All images have proper `alt` attributes
- Loading states with ARIA labels
- Keyboard navigation in lightbox
- Focus management
- Screen reader friendly

## Performance

- **Lazy loading**: Images only load when needed
- **Thumbnails**: Optional separate thumbnails for faster initial load
- **Optimized rendering**: Only re-renders when necessary
- **Smooth transitions**: Hardware-accelerated CSS animations

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## Examples with Different Column Counts

### 1 Column (Mobile-friendly, Blog-style)

```typescript
<PhotoGrid images={images} columns={1} />
```

### 2 Columns (Side-by-side comparison)

```typescript
<PhotoGrid images={images} columns={2} aspectRatio="16:9" />
```

### 3 Columns (Standard gallery)

```typescript
<PhotoGrid images={images} columns={3} aspectRatio="auto" />
```

### 4 Columns (Dense grid)

```typescript
<PhotoGrid images={images} columns={4} aspectRatio="square" />
```

### 6 Columns (Thumbnail grid)

```typescript
<PhotoGrid images={images} columns={6} aspectRatio="square" />
```

## Error Handling

The component gracefully handles:

- **Failed image loads**: Shows error icon and message
- **Missing images**: Shows empty state
- **Invalid URLs**: Displays error state
- **Network issues**: Loading state with timeout

## Best Practices

1. **Always provide alt text** for accessibility
2. **Use thumbnails** for large galleries (10+ images)
3. **Choose appropriate aspect ratio** for your content
4. **Limit columns** on mobile (use responsive defaults)
5. **Optimize image sizes** before uploading
6. **Provide captions** for context

## File Location

```
/workspaces/agent-feed/frontend/src/components/dynamic-page/PhotoGrid.tsx
```

## Schema Validation

The component is validated using Zod schema in:

```
/workspaces/agent-feed/frontend/src/schemas/componentSchemas.ts
```

Schema ensures:
- At least one image is provided
- Columns are between 1-6
- Aspect ratio is valid enum value
- Image URLs are valid (or template variables)
