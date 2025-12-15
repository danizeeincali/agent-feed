# PhotoGrid Component - Complete Guide

A production-ready, responsive photo gallery component with lightbox functionality using react-photo-view.

## 📁 File Location

```
/workspaces/agent-feed/frontend/src/components/dynamic-page/PhotoGrid.tsx
```

## ✨ Features

- ✅ **Responsive Grid**: 1-6 columns with mobile-first design
- ✅ **Lightbox**: Full-screen image viewer with zoom controls
- ✅ **Lazy Loading**: Images load as they appear in viewport
- ✅ **Thumbnails**: Optional separate thumbnails for performance
- ✅ **Aspect Ratios**: Square, 16:9, 4:3, or auto
- ✅ **Loading States**: Animated placeholders while loading
- ✅ **Error Handling**: Graceful fallback for broken images
- ✅ **Captions**: Hover overlays and lightbox captions
- ✅ **Accessibility**: Alt text, ARIA labels, keyboard navigation
- ✅ **Mobile Optimized**: Touch-friendly, responsive breakpoints

## 🚀 Quick Start

### Installation

```bash
npm install react-photo-view
```

### Basic Usage

```typescript
import PhotoGrid from './components/dynamic-page/PhotoGrid';

const images = [
  {
    url: 'https://picsum.photos/800/600?random=1',
    alt: 'Beautiful landscape',
    caption: 'Mountain view at sunset',
  },
  {
    url: 'https://picsum.photos/800/600?random=2',
    alt: 'City skyline',
    caption: 'Downtown at night',
  },
];

<PhotoGrid images={images} columns={3} />
```

## 📝 Props Interface

```typescript
interface PhotoGridImage {
  url: string;           // Required: Full-size image URL
  alt?: string;          // Optional: Alt text for accessibility
  caption?: string;      // Optional: Caption shown on hover/lightbox
  thumbnail?: string;    // Optional: Thumbnail URL (uses url if not provided)
}

interface PhotoGridProps {
  images: PhotoGridImage[];                           // Required: Array of images
  columns?: number;                                   // Optional: 1-6 (default: 3)
  enableLightbox?: boolean;                          // Optional: Enable lightbox (default: true)
  aspectRatio?: 'square' | '16:9' | '4:3' | 'auto'; // Optional: Aspect ratio (default: 'auto')
  className?: string;                                // Optional: Additional CSS classes
}
```

## 💡 Usage Examples

### 1. Standard Gallery (3 columns)

```typescript
<PhotoGrid
  images={[
    { url: 'image1.jpg', alt: 'Image 1' },
    { url: 'image2.jpg', alt: 'Image 2' },
    { url: 'image3.jpg', alt: 'Image 3' },
  ]}
/>
```

### 2. Square Grid (Instagram-style)

```typescript
<PhotoGrid
  images={images}
  columns={4}
  aspectRatio="square"
/>
```

### 3. With Captions

```typescript
<PhotoGrid
  images={[
    {
      url: 'https://example.com/photo.jpg',
      alt: 'Sunset',
      caption: 'Beautiful sunset over the ocean',
    },
  ]}
  columns={2}
/>
```

### 4. Performance Optimized (with thumbnails)

```typescript
<PhotoGrid
  images={[
    {
      url: 'https://example.com/fullsize.jpg',
      thumbnail: 'https://example.com/thumb.jpg',
      alt: 'High-res photo',
    },
  ]}
  columns={3}
/>
```

### 5. Without Lightbox

```typescript
<PhotoGrid
  images={images}
  enableLightbox={false}
  columns={4}
/>
```

## 🎨 Aspect Ratio Options

### Square (1:1)
Perfect for Instagram-style galleries, profile photos, product images.

```typescript
<PhotoGrid aspectRatio="square" images={images} />
```

### 16:9 (Widescreen)
Ideal for videos, cinematic photos, landscape photography.

```typescript
<PhotoGrid aspectRatio="16:9" images={images} />
```

### 4:3 (Traditional)
Classic photo ratio, good for portraits and general photography.

```typescript
<PhotoGrid aspectRatio="4:3" images={images} />
```

### Auto (Original)
Maintains original image dimensions, best for mixed content.

```typescript
<PhotoGrid aspectRatio="auto" images={images} />
```

## 📱 Responsive Breakpoints

The component automatically adjusts columns based on screen size:

| Columns | Mobile | Tablet | Desktop | Large |
|---------|--------|--------|---------|-------|
| 1       | 1      | 1      | 1       | 1     |
| 2       | 1      | 2      | 2       | 2     |
| 3       | 1      | 2      | 3       | 3     |
| 4       | 1      | 2      | 4       | 4     |
| 5       | 1      | 2      | 3       | 5     |
| 6       | 1      | 2      | 3       | 6     |

## 🔧 Dynamic Page Integration

### JSON Specification

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
      }
    ],
    "columns": 3,
    "enableLightbox": true,
    "aspectRatio": "auto"
  }
}
```

### With Template Variables

```json
{
  "type": "PhotoGrid",
  "props": {
    "images": "{{agent.photos}}",
    "columns": 4,
    "aspectRatio": "square",
    "enableLightbox": true
  }
}
```

Where `{{agent.photos}}` resolves to:

```javascript
[
  { url: "photo1.jpg", alt: "Photo 1", caption: "Caption 1" },
  { url: "photo2.jpg", alt: "Photo 2", caption: "Caption 2" },
  // ...
]
```

## ♿ Accessibility Features

### Alt Text
Always provide descriptive alt text for screen readers.

```typescript
<PhotoGrid
  images={[
    { url: 'image.jpg', alt: 'Golden retriever playing in the park' },
  ]}
/>
```

### Keyboard Navigation
- **Tab**: Navigate between images
- **Enter/Space**: Open lightbox
- **Arrow Keys**: Navigate in lightbox
- **Escape**: Close lightbox
- **+/-**: Zoom in/out (in lightbox)

### ARIA Labels
- Images have proper roles
- Loading states announced
- Error states announced
- Focus management in lightbox

## 🎭 States & Behaviors

### Loading State
Shows animated spinner while images load.

### Error State
Displays error icon and message if image fails to load.

### Empty State
Shows "No Images" message when images array is empty.

### Hover State
Caption appears as overlay on image hover (if caption provided).

### Lightbox State
Full-screen view with:
- Zoom controls (+/-)
- Caption overlay (if provided)
- Navigate between images
- Smooth transitions

## ⚡ Performance Optimizations

1. **Lazy Loading**: Images load only when visible
2. **Thumbnails**: Use smaller images for grid, full-size for lightbox
3. **Memoization**: Callbacks memoized to prevent re-renders
4. **State Management**: Efficient tracking of loaded/failed images
5. **CSS Transitions**: Hardware-accelerated animations

## 🧪 Testing

### Demo Component

```bash
# Run the demo
import PhotoGridDemo from './components/dynamic-page/PhotoGridDemo';

<PhotoGridDemo />
```

The demo includes:
- Interactive controls for columns, aspect ratio, lightbox
- Live preview with sample images
- Feature showcase
- Usage instructions

### Manual Testing Checklist

- [ ] Images load correctly
- [ ] Lightbox opens on click
- [ ] Zoom controls work
- [ ] Captions appear on hover
- [ ] Responsive on mobile/tablet/desktop
- [ ] Keyboard navigation works
- [ ] Error handling for broken images
- [ ] Empty state displays correctly
- [ ] Loading states show properly
- [ ] Accessibility features work

## 🐛 Error Handling

### Broken Images
Shows error icon and "Failed to load image" message.

### Empty Images Array
Displays "No Images" empty state.

### Invalid URLs
Gracefully handles with error state.

### Network Issues
Shows loading state, then error if timeout.

## 🎨 Styling & Customization

### Custom Classes

```typescript
<PhotoGrid
  images={images}
  className="shadow-lg rounded-xl p-4 bg-gray-50"
/>
```

### Tailwind Integration
Uses Tailwind CSS for all styling:
- Responsive utilities
- Hover effects
- Transitions
- Grid layouts

## 📊 Best Practices

### Image Optimization
1. **Compress images** before uploading (WebP, JPEG)
2. **Use thumbnails** for large galleries
3. **Provide appropriate sizes** (800x600 is good default)
4. **Lazy load** enabled by default

### Accessibility
1. **Always provide alt text**
2. **Use descriptive captions**
3. **Test with keyboard navigation**
4. **Verify screen reader compatibility**

### Performance
1. **Limit gallery size** (50-100 images max per page)
2. **Use CDN** for image hosting
3. **Optimize image sizes** (no larger than needed)
4. **Enable thumbnails** for 10+ images

### UX
1. **Choose appropriate aspect ratio** for content
2. **Limit columns** on mobile (1-2)
3. **Provide captions** for context
4. **Enable lightbox** for better viewing

## 🔍 Troubleshooting

### Images not loading
- Check image URLs are valid and accessible
- Verify CORS headers if loading from different domain
- Check browser console for errors

### Lightbox not working
- Ensure `enableLightbox={true}` (default)
- Check for JavaScript errors in console
- Verify react-photo-view is installed

### Layout issues
- Verify columns prop is between 1-6
- Check for CSS conflicts
- Ensure Tailwind CSS is configured

### Performance issues
- Use thumbnails for large galleries
- Reduce image file sizes
- Limit number of images per page
- Enable lazy loading (default)

## 📚 Related Files

- **Component**: `/workspaces/agent-feed/frontend/src/components/dynamic-page/PhotoGrid.tsx`
- **Demo**: `/workspaces/agent-feed/frontend/src/components/dynamic-page/PhotoGridDemo.tsx`
- **Examples**: `/workspaces/agent-feed/frontend/src/components/dynamic-page/PhotoGrid.example.md`
- **Schema**: `/workspaces/agent-feed/frontend/src/schemas/componentSchemas.ts`
- **Renderer**: `/workspaces/agent-feed/frontend/src/components/DynamicPageRenderer.tsx`

## 📦 Dependencies

```json
{
  "react-photo-view": "^1.2.7",
  "react": "18.2.0",
  "lucide-react": "^0.364.0",
  "tailwindcss": "^3.4.1"
}
```

## 🌐 Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- iOS Safari 13+
- Chrome Mobile (latest)

## 📄 License

Part of the agent-feed project.

## 👥 Support

For issues or questions:
1. Check this documentation
2. Review PhotoGrid.example.md
3. Test with PhotoGridDemo.tsx
4. Check componentSchemas.ts for validation rules
