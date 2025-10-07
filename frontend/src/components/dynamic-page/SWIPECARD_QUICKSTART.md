# SwipeCard Quick Start Guide

## Installation
No installation needed - already integrated into the dynamic page system!

## Basic Usage

### Minimal Example
```json
{
  "type": "SwipeCard",
  "props": {
    "cards": [
      {
        "id": "1",
        "title": "Card Title"
      }
    ]
  }
}
```

### Full Example
```json
{
  "type": "SwipeCard",
  "props": {
    "cards": [
      {
        "id": "product-1",
        "title": "Premium Headphones",
        "description": "High-quality noise-canceling headphones",
        "image": "https://example.com/headphones.jpg",
        "metadata": {
          "price": "$299",
          "rating": "4.5"
        }
      }
    ],
    "onSwipeLeft": "/api/products/skip",
    "onSwipeRight": "/api/products/save",
    "showControls": true,
    "className": "max-w-lg mx-auto"
  }
}
```

## Props Reference

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `cards` | Array | Yes | - | Array of card objects |
| `onSwipeLeft` | string | No | - | API endpoint for left swipe |
| `onSwipeRight` | string | No | - | API endpoint for right swipe |
| `showControls` | boolean | No | `true` | Show Like/Nope buttons |
| `className` | string | No | - | Additional CSS classes |

## Card Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier |
| `title` | string | Yes | Card title |
| `description` | string | No | Card description |
| `image` | string | No | Image URL |
| `metadata` | object | No | Additional data (shown as badges) |

## User Interactions

### Swipe Gestures
- **Drag Left**: Reject/Skip (triggers `onSwipeLeft`)
- **Drag Right**: Accept/Like (triggers `onSwipeRight`)
- **Threshold**: 150px or 500px/s velocity

### Button Controls
- **Red X Button**: Same as swipe left
- **Green Heart Button**: Same as swipe right

### Keyboard Shortcuts
- **Left Arrow**: Swipe left
- **Right Arrow**: Swipe right
- **Enter**: Swipe right (like)

## API Integration

### Endpoint Configuration
```json
{
  "onSwipeLeft": "/api/cards/reject",
  "onSwipeRight": "/api/cards/approve"
}
```

### Template Variables
```json
{
  "onSwipeLeft": "/api/cards/{{id}}/reject",
  "onSwipeRight": "/api/users/{{id}}/connect"
}
```

Available variables:
- `{{id}}` - Card ID
- `{{title}}` - Card title
- `{{description}}` - Card description
- `{{metadata}}` - Metadata as JSON string

### Request Payload
```json
POST /api/endpoint
{
  "cardId": "product-1",
  "title": "Premium Headphones",
  "description": "High-quality...",
  "metadata": { "price": "$299" },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## Visual States

### Normal
- Cards stacked (up to 3 visible)
- Top card interactive
- Progress counter shown

### Dragging
- Card rotates (±15°)
- "LIKE" or "NOPE" overlay appears
- Opacity changes based on distance

### Loading
- Spinner overlay on card
- Buttons disabled
- Prevents multiple swipes

### Error
- Error message displayed
- Card remains in place
- User can retry

### Empty
- "No Cards Available" message
- Shown when cards array is empty

### Complete
- "All Done!" message
- Shown after all cards swiped

## Common Patterns

### Product Discovery
```json
{
  "type": "SwipeCard",
  "props": {
    "cards": [
      {
        "id": "prod-1",
        "title": "Product Name",
        "description": "Product description",
        "image": "/products/image.jpg",
        "metadata": {
          "price": "$99",
          "rating": "4.5",
          "stock": "In Stock"
        }
      }
    ],
    "onSwipeRight": "/api/wishlist/add"
  }
}
```

### Profile Matching
```json
{
  "type": "SwipeCard",
  "props": {
    "cards": [
      {
        "id": "user-123",
        "title": "John Doe",
        "description": "Software Engineer",
        "image": "/avatars/john.jpg",
        "metadata": {
          "age": "28",
          "location": "SF"
        }
      }
    ],
    "onSwipeLeft": "/api/connections/pass",
    "onSwipeRight": "/api/connections/match"
  }
}
```

### Content Curation
```json
{
  "type": "SwipeCard",
  "props": {
    "cards": [
      {
        "id": "article-1",
        "title": "Article Title",
        "description": "Article summary...",
        "image": "/articles/thumb.jpg",
        "metadata": {
          "author": "Jane Smith",
          "readTime": "5 min"
        }
      }
    ],
    "onSwipeLeft": "/api/articles/skip",
    "onSwipeRight": "/api/articles/save"
  }
}
```

## Styling

### Custom Classes
```json
{
  "type": "SwipeCard",
  "props": {
    "cards": [...],
    "className": "max-w-md mx-auto my-8"
  }
}
```

### Default Styling
- Card size: 500px height
- Max width: 400px (sm breakpoint)
- Border radius: 2xl (1rem)
- Shadow: 2xl
- Stack offset: 10px per card

## Troubleshooting

### Cards won't swipe
1. Check `cards` array is not empty
2. Verify framer-motion is installed
3. Check browser console for errors

### API calls not working
1. Verify endpoint URLs are correct
2. Check network tab in DevTools
3. Ensure proper CORS headers
4. Verify authentication if needed

### Images not loading
1. Check image URLs are accessible
2. Verify CORS for external images
3. Check image file formats (jpg, png, webp)
4. Use fallback images for errors

### Performance issues
1. Limit cards to 10-20 at a time
2. Optimize image sizes
3. Use lazy loading
4. Check for memory leaks

## Accessibility

- ✅ Full keyboard navigation
- ✅ ARIA labels on all controls
- ✅ Screen reader compatible
- ✅ Focus indicators
- ✅ Semantic HTML

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ iOS Safari
- ✅ Chrome Mobile

## File Locations

- **Component**: `src/components/dynamic-page/SwipeCard.tsx`
- **Schema**: `src/schemas/componentSchemas.ts`
- **Tests**: `src/tests/SwipeCard.test.tsx`
- **Docs**: `src/components/dynamic-page/SwipeCard.md`

## Need Help?

See the full documentation in `SwipeCard.md` for:
- Detailed API reference
- Advanced examples
- Performance optimization
- Security considerations
- Integration guides
