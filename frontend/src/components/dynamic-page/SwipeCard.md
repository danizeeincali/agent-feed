# SwipeCard Component

Production-ready Tinder-style swipeable card component with gesture detection, API callbacks, and accessibility features.

## Features

- **Swipe Gestures**: Full drag-based swipe interactions using framer-motion
- **Threshold Detection**: Configurable swipe threshold (150px default)
- **API Integration**: POST callbacks on swipe left/right
- **Visual Feedback**: Real-time rotation, opacity, and overlay indicators during drag
- **Card Stack**: Displays up to 3 cards in a stack with depth effect
- **Button Controls**: Optional Like/Nope buttons for non-swipe interaction
- **Keyboard Support**: Arrow keys and Enter for accessibility
- **Mobile Optimized**: Touch-friendly with proper gesture handling
- **Loading States**: Visual feedback during API calls
- **Error Handling**: Graceful error display and recovery
- **Empty States**: Informative messages when no cards available

## Props

```typescript
interface SwipeCardProps {
  cards: Array<{
    id: string;
    image?: string;
    title: string;
    description?: string;
    metadata?: any;
  }>;
  onSwipeLeft?: string;  // API endpoint for left swipe
  onSwipeRight?: string; // API endpoint for right swipe
  showControls?: boolean; // Show Like/Nope buttons (default: true)
  className?: string;
}
```

## Usage

### Basic Example

```json
{
  "type": "SwipeCard",
  "props": {
    "cards": [
      {
        "id": "1",
        "title": "Product A",
        "description": "This is an amazing product",
        "image": "https://example.com/image1.jpg"
      },
      {
        "id": "2",
        "title": "Product B",
        "description": "Another great product",
        "image": "https://example.com/image2.jpg"
      }
    ],
    "onSwipeLeft": "/api/products/dislike",
    "onSwipeRight": "/api/products/like",
    "showControls": true
  }
}
```

### With Metadata

```json
{
  "type": "SwipeCard",
  "props": {
    "cards": [
      {
        "id": "user-123",
        "title": "John Doe",
        "description": "Software Engineer at TechCorp",
        "image": "https://example.com/john.jpg",
        "metadata": {
          "age": "28",
          "location": "San Francisco",
          "skills": ["React", "Node.js"]
        }
      }
    ],
    "onSwipeLeft": "/api/connections/pass",
    "onSwipeRight": "/api/connections/connect"
  }
}
```

### Template Variables in Endpoints

```json
{
  "type": "SwipeCard",
  "props": {
    "cards": [
      {
        "id": "{{userId}}",
        "title": "{{userName}}",
        "description": "{{userBio}}"
      }
    ],
    "onSwipeLeft": "/api/users/{{id}}/dislike",
    "onSwipeRight": "/api/users/{{id}}/like"
  }
}
```

## API Payload

When a card is swiped, the component sends a POST request with the following payload:

```json
{
  "cardId": "1",
  "title": "Product A",
  "description": "This is an amazing product",
  "metadata": {},
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## Interaction Methods

### 1. Swipe Gesture (Primary)
- Drag card left or right
- Visual rotation and opacity feedback
- Threshold: 150px or 500px/s velocity
- Animated exit on successful swipe

### 2. Button Controls
- Red X button: Triggers left swipe
- Green Heart button: Triggers right swipe
- Disabled during API calls

### 3. Keyboard Navigation
- **Left Arrow**: Swipe left (Nope)
- **Right Arrow**: Swipe right (Like)
- **Enter**: Swipe right (Like)

## Visual States

### During Drag
- **Rotation**: ±15 degrees based on drag distance
- **Opacity**: Fades out as card moves further
- **Overlays**: "LIKE" (green) or "NOPE" (red) indicators
- **Card Stack**: Background cards scale and offset

### Loading State
- Spinning loader overlay on active card
- Buttons disabled
- Prevents multiple simultaneous swipes

### Error State
- Error message displayed below controls
- Card remains in place for retry
- User can attempt swipe again

### Empty States
- **No Cards**: Initial empty state with icon
- **All Done**: Completion state after all cards swiped

## Styling

The component uses Tailwind CSS classes and can be customized via the `className` prop:

```json
{
  "type": "SwipeCard",
  "props": {
    "cards": [...],
    "className": "max-w-lg mx-auto my-8"
  }
}
```

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **ARIA Labels**: Proper labels for screen readers
- **Focus Management**: Focusable card container
- **Role Attributes**: Semantic HTML roles
- **Alt Text**: Image alt attributes

## Performance

- **Lazy Loading**: Images load on demand
- **Motion Optimization**: Hardware-accelerated transforms
- **Debounced API Calls**: Prevents duplicate requests
- **Efficient Rendering**: Only visible cards in DOM

## Browser Support

- Modern browsers with CSS Grid and Flexbox
- Touch events for mobile devices
- Pointer events for desktop
- Framer Motion animations

## Technical Details

### Dependencies
- `framer-motion`: Gesture detection and animations
- `lucide-react`: Icons (Heart, X, Loader)
- React 18+

### Constants
- `SWIPE_THRESHOLD`: 150px
- `ROTATION_RANGE`: 15 degrees
- `CARD_STACK_VISIBLE`: 3 cards
- `STACK_OFFSET_Y`: 10px per card
- `STACK_SCALE_FACTOR`: 0.95 per card

### Motion Values
- `x`: Horizontal drag position
- `rotate`: Card rotation transform
- `opacity`: Card opacity during drag

## Common Use Cases

1. **Dating Apps**: Swipe profiles
2. **E-commerce**: Product discovery
3. **Content Curation**: Article/video selection
4. **Recruitment**: Candidate review
5. **Recommendations**: Personalized suggestions

## Example: Product Discovery

```json
{
  "type": "SwipeCard",
  "props": {
    "cards": [
      {
        "id": "prod-001",
        "title": "Wireless Headphones",
        "description": "Premium noise-canceling headphones with 30-hour battery",
        "image": "/products/headphones.jpg",
        "metadata": {
          "price": "$299",
          "rating": "4.5",
          "category": "Electronics"
        }
      },
      {
        "id": "prod-002",
        "title": "Smart Watch",
        "description": "Fitness tracking with heart rate monitor",
        "image": "/products/watch.jpg",
        "metadata": {
          "price": "$199",
          "rating": "4.2",
          "category": "Wearables"
        }
      }
    ],
    "onSwipeLeft": "/api/products/skip",
    "onSwipeRight": "/api/products/save",
    "showControls": true
  }
}
```

## Troubleshooting

### Cards Not Swiping
- Check that `cards` array is populated
- Verify framer-motion is installed
- Ensure no CSS conflicts with drag events

### API Calls Failing
- Verify endpoint URLs are correct
- Check CORS settings
- Inspect network tab for errors
- Ensure proper authentication headers

### Images Not Loading
- Verify image URLs are accessible
- Check CORS for external images
- Use fallback/placeholder images

### Performance Issues
- Limit cards array size (load more as needed)
- Optimize image sizes
- Check for memory leaks in callbacks
