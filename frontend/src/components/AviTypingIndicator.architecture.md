# Avi Typing Indicator - Component Architecture

**Version:** 1.0.0
**Date:** 2025-10-01
**SPARC Phase:** Architecture

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Structure](#component-structure)
3. [Animation Engine](#animation-engine)
4. [Integration Architecture](#integration-architecture)
5. [Styling Strategy](#styling-strategy)
6. [Accessibility](#accessibility)
7. [Performance Considerations](#performance-considerations)
8. [Browser Compatibility](#browser-compatibility)

---

## System Overview

The Avi Typing Indicator is a visually engaging animation component that provides user feedback during API processing. It features a 10-frame wave animation with ROYGBIV color cycling, appearing above the chat input during message submission.

### Core Requirements

- **Animation:** 10 frames cycling through "A→Λ", "v→V", "i→!"
- **Colors:** ROYGBIV rainbow (7 colors)
- **Timing:** 200ms per frame (5 FPS)
- **Position:** Bottom left, above chat input
- **Trigger:** Appears on message submission, disappears on API response
- **Duration:** Variable (depends on API response time)

---

## Component Structure

### Component Hierarchy

```
EnhancedPostingInterface (Parent)
├── MessageInput
├── SubmitButton
└── AviTypingIndicator (New Component)
    ├── AnimationContainer
    │   ├── CharacterFrame[0] → "A"
    │   ├── CharacterFrame[1] → "v"
    │   └── CharacterFrame[2] → "i"
    └── SROnlyStatus (Screen Reader)
```

### Component Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ EnhancedPostingInterface                                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Message Input Area                                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ AviTypingIndicator                                   │  │
│  │                                                       │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │ Animation Engine                              │  │  │
│  │  │  • Frame State: 0-9                          │  │  │
│  │  │  • Color Index: 0-6                          │  │  │
│  │  │  • Timer: setInterval(200ms)                 │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │ Visual Output                                 │  │  │
│  │  │    [A] [v] [i]                               │  │  │
│  │  │   color: ROYGBIV[index]                      │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │ ARIA Live Region                              │  │  │
│  │  │  "Avi is typing..."                          │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  [Submit Button]                                            │
└─────────────────────────────────────────────────────────────┘

State Flow:
isSubmitting: false ─────[Submit]────▶ true ─────[Response]────▶ false
                                        │                          │
AviTypingIndicator:                     │                          │
hidden ──────────────────────────────▶ visible ──────────────────▶ hidden
                                        │                          │
Animation Loop:                    START (frame=0)              STOP & CLEANUP
```

### State Management Strategy

**Approach:** `useState` + `useEffect`

**Rationale:**
- Simple state requirements (frame index, color index)
- Predictable state transitions
- Easy cleanup on unmount
- `useReducer` would be overkill for this use case

#### State Schema

```typescript
interface AviTypingIndicatorState {
  // Derived from parent prop
  isVisible: boolean;

  // Internal animation state
  currentFrame: number;      // 0-9 (10 frames)
  colorIndex: number;         // 0-6 (7 colors)

  // Accessibility
  prefersReducedMotion: boolean;
}
```

### Component Interface

```typescript
interface AviTypingIndicatorProps {
  /**
   * Controls visibility of the typing indicator
   * Synchronized with parent's isSubmitting state
   */
  isVisible: boolean;

  /**
   * Optional: Override default frame duration (200ms)
   */
  frameDuration?: number;

  /**
   * Optional: Custom color palette (defaults to ROYGBIV)
   */
  colors?: string[];

  /**
   * Optional: Custom CSS class for positioning override
   */
  className?: string;

  /**
   * Optional: Accessibility label
   */
  ariaLabel?: string;
}
```

### Component Implementation Pattern

```typescript
const AviTypingIndicator: React.FC<AviTypingIndicatorProps> = ({
  isVisible,
  frameDuration = 200,
  colors = ROYGBIV,
  className = '',
  ariaLabel = 'Avi is typing...'
}) => {
  // State hooks
  const [currentFrame, setCurrentFrame] = useState(0);
  const [colorIndex, setColorIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Refs for cleanup
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Effects
  useEffect(() => {
    // Detect reduced motion preference
  }, []);

  useEffect(() => {
    // Animation loop
    // Cleanup on unmount
  }, [isVisible, frameDuration]);

  // Render logic
};
```

---

## Animation Engine

### Frame Sequencing Logic

#### Character Transformation Mapping

```typescript
const FRAME_SEQUENCE = [
  // Frame 0-9: Progressive wave transformation
  { chars: ['A', 'v', 'i'], wave: 0 },  // Frame 0: Start
  { chars: ['A', 'v', 'I'], wave: 1 },  // Frame 1: i→I
  { chars: ['A', 'v', '!'], wave: 2 },  // Frame 2: I→!
  { chars: ['A', 'V', '!'], wave: 3 },  // Frame 3: v→V
  { chars: ['A', 'V', 'i'], wave: 4 },  // Frame 4: !→i
  { chars: ['Λ', 'V', 'i'], wave: 5 },  // Frame 5: A→Λ
  { chars: ['Λ', 'v', 'i'], wave: 6 },  // Frame 6: V→v
  { chars: ['A', 'v', 'i'], wave: 7 },  // Frame 7: Λ→A, reset
  { chars: ['A', 'v', 'I'], wave: 8 },  // Frame 8: i→I again
  { chars: ['A', 'v', '!'], wave: 9 },  // Frame 9: I→! again
];

// Alternative: Simple cycling pattern
const getCharacterAtFrame = (charIndex: 0 | 1 | 2, frame: number): string => {
  const cycles = [
    ['A', 'A', 'A', 'A', 'A', 'Λ', 'Λ', 'A', 'A', 'A'], // 'A' char
    ['v', 'v', 'v', 'V', 'V', 'V', 'v', 'v', 'v', 'v'], // 'v' char
    ['i', 'I', '!', '!', 'i', 'i', 'i', 'i', 'I', '!'], // 'i' char
  ];

  return cycles[charIndex][frame % 10];
};
```

### Color Cycling Algorithm

#### ROYGBIV Distribution

**Challenge:** Map 7 colors across 10 frames smoothly

**Approach:** Linear interpolation with floor division

```typescript
const ROYGBIV = [
  '#FF0000', // Red
  '#FF7F00', // Orange
  '#FFFF00', // Yellow
  '#00FF00', // Green
  '#0000FF', // Blue
  '#4B0082', // Indigo
  '#9400D3', // Violet
];

/**
 * Distributes 7 colors across 10 frames
 * Frame 0-1: Red
 * Frame 2: Orange
 * Frame 3-4: Yellow
 * Frame 5: Green
 * Frame 6-7: Blue
 * Frame 8: Indigo
 * Frame 9: Violet
 */
const getColorAtFrame = (frame: number): string => {
  // Map 10 frames to 7 colors with smooth distribution
  const colorIndex = Math.floor((frame * 7) / 10);
  return ROYGBIV[colorIndex];
};

// Alternative: Cycle through all colors regardless of frame count
const getColorCycling = (frame: number): string => {
  return ROYGBIV[frame % 7];
};
```

#### Color Strategy Comparison

| Strategy | Frame→Color Mapping | Pros | Cons |
|----------|-------------------|------|------|
| **Linear Distribution** | Even spread across frames | Smooth progression | Some colors appear twice |
| **Modulo Cycling** | frame % 7 | All colors equal time | 3 frames repeat colors |
| **Offset Cycling** | (frame + offset) % 7 | Each char different color | More complex |

**Recommended:** Linear Distribution for visual smoothness

### Timing Mechanism

#### setInterval vs requestAnimationFrame

| Aspect | setInterval | requestAnimationFrame |
|--------|------------|----------------------|
| **Precision** | ~200ms (can drift) | ~16.67ms (60 FPS) |
| **CPU Usage** | Fixed interval | Pauses when tab inactive |
| **Use Case** | Slow animations (>100ms) | Smooth animations (<60ms) |
| **Cleanup** | clearInterval() | cancelAnimationFrame() |

**Decision:** `setInterval` for 200ms frames

**Rationale:**
- 200ms per frame = 5 FPS (well below RAF threshold)
- Simpler implementation
- No need for frame time calculations
- Acceptable drift for this use case

#### Animation Loop Implementation

```typescript
useEffect(() => {
  if (!isVisible) {
    // Reset state when hidden
    setCurrentFrame(0);
    setColorIndex(0);
    return;
  }

  // Start animation loop
  const timer = setInterval(() => {
    setCurrentFrame(prev => {
      const nextFrame = (prev + 1) % 10;

      // Update color index synchronized with frame
      setColorIndex(Math.floor((nextFrame * 7) / 10));

      return nextFrame;
    });
  }, frameDuration);

  // Cleanup on unmount or visibility change
  return () => {
    clearInterval(timer);
  };
}, [isVisible, frameDuration]);
```

### Performance Optimization

```typescript
// Memoize color calculations
const currentColor = useMemo(
  () => getColorAtFrame(currentFrame),
  [currentFrame]
);

// Memoize character array
const currentChars = useMemo(
  () => FRAME_SEQUENCE[currentFrame].chars,
  [currentFrame]
);

// Prevent unnecessary re-renders
const AnimatedChar = memo(({ char, color }: CharProps) => (
  <span style={{ color }}>{char}</span>
));
```

---

## Integration Architecture

### Parent-Child Communication

```
EnhancedPostingInterface (Parent)
         │
         │ Props: { isVisible: isSubmitting }
         ▼
  AviTypingIndicator (Child)
         │
         │ Internal State: { frame, color }
         ▼
    Animation Loop
```

### State Synchronization

#### Parent Component Changes

```typescript
// In EnhancedPostingInterface.tsx
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSendMessage = async () => {
  setIsSubmitting(true); // ← Triggers AviTypingIndicator

  try {
    const response = await apiService.sendMessage(message);
    // Handle response
  } catch (error) {
    // Handle error
  } finally {
    setIsSubmitting(false); // ← Hides AviTypingIndicator
  }
};

// Render
<AviTypingIndicator isVisible={isSubmitting} />
```

### Event Flow Diagram

```
User Action                Parent State              Child Behavior
────────────────────────────────────────────────────────────────────

[Click Send] ───────────▶ isSubmitting = true ───▶ Mount & Fade In
                                                    Start Animation
                                                    Frame 0 → 1 → 2...

                          (API Call in progress)    Continue Loop
                                                    Color Cycling

[API Response] ─────────▶ isSubmitting = false ──▶ Stop Animation
                                                    Fade Out
                                                    Reset to Frame 0

[API Error] ────────────▶ isSubmitting = false ──▶ Stop Animation
                          (in finally block)       Cleanup Timer
```

### Error Handling

```typescript
useEffect(() => {
  if (!isVisible) {
    // Defensive cleanup: always stop animation when hidden
    if (animationTimerRef.current) {
      clearInterval(animationTimerRef.current);
      animationTimerRef.current = null;
    }

    // Reset state
    setCurrentFrame(0);
    setColorIndex(0);
  }
}, [isVisible]);

// Component unmount cleanup
useEffect(() => {
  return () => {
    if (animationTimerRef.current) {
      clearInterval(animationTimerRef.current);
    }
  };
}, []);
```

### Integration Points

1. **Props Interface:**
   - Single prop: `isVisible` (boolean)
   - Controlled by parent's `isSubmitting` state

2. **No Callbacks:**
   - Pure presentational component
   - No events propagated to parent
   - One-way data flow

3. **Positioning Context:**
   - Positioned relative to parent container
   - Uses absolute positioning within EnhancedPostingInterface

4. **Z-Index Layering:**
   - Must appear above input field
   - Below modals/dropdowns
   - Suggested: `z-index: 10`

---

## Styling Strategy

### Technology Choice: Tailwind CSS

**Rationale:**
- Consistent with project's existing styling approach
- Utility-first for rapid iteration
- Easy responsive design
- Minimal CSS bundle size

**Alternative Considered:** CSS-in-JS (styled-components)
- Rejected due to runtime overhead
- Dynamic colors can be handled with inline styles

### Component Styling Architecture

```typescript
const AviTypingIndicator: React.FC<Props> = ({ isVisible, className }) => {
  return (
    <div
      className={cn(
        // Base styles
        "fixed bottom-20 left-6",
        "flex items-center gap-1",
        "px-4 py-2 rounded-lg",
        "bg-gray-900/80 backdrop-blur-sm",
        "shadow-lg",

        // Animation styles
        "transition-opacity duration-300",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none",

        // Accessibility
        "focus:outline-none focus:ring-2 focus:ring-blue-500",

        // Custom overrides
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="Avi is typing"
    >
      {currentChars.map((char, idx) => (
        <span
          key={idx}
          className="text-2xl font-bold transition-colors duration-200"
          style={{ color: currentColor }}
        >
          {char}
        </span>
      ))}
    </div>
  );
};
```

### Positioning Strategy

#### Coordinate System

```
┌─────────────────────────────────────────────────────────┐
│ EnhancedPostingInterface (relative)                     │
│                                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │ Message Textarea                                │   │
│  │ (User types here)                               │   │
│  └────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────┐                   [Submit]        │
│  │ [A] [v] [i]     │                                    │
│  │ AviTypingIndicator                                   │
│  │ (absolute: bottom-20, left-6)                        │
│  └─────────────────┘                                    │
└─────────────────────────────────────────────────────────┘
```

#### Positioning Options

| Method | CSS | Pros | Cons |
|--------|-----|------|------|
| **Absolute** | `position: absolute; bottom: 5rem; left: 1.5rem;` | Precise control | Requires parent relative |
| **Fixed** | `position: fixed; bottom: 5rem; left: 1.5rem;` | Viewport-based | Ignores scrolling |
| **Flexbox** | Parent uses flexbox with order | Responsive | Complex parent changes |

**Recommended:** `fixed` positioning

**Rationale:**
- Always visible above input (even if page scrolls)
- No impact on parent layout
- Consistent positioning across viewports

### Animation Transitions

```css
/* Fade in/out on visibility change */
.avi-typing-indicator {
  transition: opacity 300ms ease-in-out;
}

/* Character color transitions */
.avi-char {
  transition: color 200ms ease-in-out;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .avi-typing-indicator {
    transition: none;
  }

  .avi-char {
    transition: none;
  }
}
```

### Responsive Design

```typescript
className={cn(
  // Mobile (< 640px)
  "bottom-16 left-4 text-xl gap-0.5 px-3 py-1.5",

  // Tablet (≥ 640px)
  "sm:bottom-20 sm:left-6 sm:text-2xl sm:gap-1 sm:px-4 sm:py-2",

  // Desktop (≥ 1024px)
  "lg:bottom-24 lg:left-8 lg:text-3xl lg:gap-2 lg:px-5 lg:py-3",
)}
```

---

## Accessibility

### ARIA Live Region

```typescript
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  aria-label={ariaLabel}
>
  {/* Visual animation */}
  <div aria-hidden="true">
    {currentChars.map(char => <span>{char}</span>)}
  </div>

  {/* Screen reader text */}
  <span className="sr-only">
    {isVisible ? 'Avi is typing a response' : ''}
  </span>
</div>
```

### Screen Reader Announcement Strategy

**Problem:** Animation updates every 200ms → excessive announcements

**Solution:** Single announcement on visibility change

```typescript
useEffect(() => {
  if (isVisible) {
    // Announce once when animation starts
    announceToScreenReader('Avi is typing a response');
  } else {
    // Announce when response received
    announceToScreenReader('Avi has finished typing');
  }
}, [isVisible]);

const announceToScreenReader = (message: string) => {
  const liveRegion = document.getElementById('sr-live-region');
  if (liveRegion) {
    liveRegion.textContent = message;
  }
};
```

### Reduced Motion Support

```typescript
useEffect(() => {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  setPrefersReducedMotion(mediaQuery.matches);

  const handler = (e: MediaQueryListEvent) => {
    setPrefersReducedMotion(e.matches);
  };

  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}, []);

// Render static indicator if reduced motion preferred
if (prefersReducedMotion) {
  return (
    <div className="avi-typing-static">
      <span>Avi is typing...</span>
    </div>
  );
}
```

### Keyboard Navigation

**Impact:** Minimal (component is non-interactive)

**Considerations:**
- Should not trap focus
- Should not interfere with input field focus
- Use `pointer-events: none` when hidden
- Optionally focusable for screen reader discovery

```typescript
<div
  tabIndex={isVisible ? 0 : -1}
  className={cn(
    isVisible ? '' : 'pointer-events-none'
  )}
>
```

### Color Contrast

**WCAG AAA Compliance:**
- Background: `rgba(17, 24, 39, 0.8)` (gray-900/80)
- Text colors (ROYGBIV): May fail contrast ratio

**Solution:** Add text shadow for readability

```css
.avi-char {
  text-shadow:
    0 0 2px rgba(0, 0, 0, 0.8),
    0 0 4px rgba(0, 0, 0, 0.6);
}
```

---

## Performance Considerations

### Minimize Re-renders

#### Problem: Parent re-renders trigger child re-renders

**Solution 1:** React.memo with prop comparison

```typescript
export const AviTypingIndicator = memo(
  ({ isVisible, frameDuration, colors }: Props) => {
    // Component implementation
  },
  (prevProps, nextProps) => {
    // Only re-render if isVisible changes
    return prevProps.isVisible === nextProps.isVisible &&
           prevProps.frameDuration === nextProps.frameDuration;
  }
);
```

**Solution 2:** Move to separate context (overkill for this case)

### Efficient Color Calculation

```typescript
// Precompute color mapping at module level (outside component)
const FRAME_TO_COLOR_MAP = Array.from({ length: 10 }, (_, frame) =>
  ROYGBIV[Math.floor((frame * 7) / 10)]
);

// In component: O(1) lookup instead of calculation
const currentColor = FRAME_TO_COLOR_MAP[currentFrame];
```

### Memory Leak Prevention

```typescript
useEffect(() => {
  const timer = setInterval(() => {
    setCurrentFrame(prev => (prev + 1) % 10);
  }, frameDuration);

  // CRITICAL: Always cleanup timers
  return () => {
    clearInterval(timer);
  };
}, [isVisible, frameDuration]);

// Additional safety: cleanup on unmount
useEffect(() => {
  return () => {
    if (animationTimerRef.current) {
      clearInterval(animationTimerRef.current);
      animationTimerRef.current = null;
    }
  };
}, []);
```

### Browser Paint Optimization

#### Use CSS Transforms for Hardware Acceleration

```css
/* Instead of changing left/top */
.avi-typing-indicator {
  transform: translateX(0) translateY(0);
  will-change: opacity;
}

/* Trigger GPU acceleration */
.avi-char {
  transform: translateZ(0);
  backface-visibility: hidden;
}
```

#### Avoid Layout Thrashing

```typescript
// BAD: Reading and writing DOM in loop
chars.forEach((char, idx) => {
  const width = element.offsetWidth; // Read (causes reflow)
  element.style.left = `${width * idx}px`; // Write
});

// GOOD: Batch reads, then batch writes
const widths = chars.map((_, idx) => element.offsetWidth);
chars.forEach((char, idx) => {
  element.style.left = `${widths[idx]}px`;
});
```

#### RequestIdleCallback for Non-Critical Updates

```typescript
// For future enhancements (e.g., analytics tracking)
useEffect(() => {
  if (isVisible) {
    requestIdleCallback(() => {
      // Track animation start in analytics
      analytics.track('avi_typing_started');
    });
  }
}, [isVisible]);
```

### Performance Optimization Checklist

- [ ] Component wrapped in `React.memo`
- [ ] Color calculations memoized with `useMemo`
- [ ] Timer cleanup in `useEffect` return
- [ ] Ref used for timer ID (avoid state updates)
- [ ] CSS transitions use `transform` and `opacity` only
- [ ] `will-change` applied judiciously
- [ ] Event listeners cleaned up on unmount
- [ ] No inline object/array creation in render
- [ ] Reduced motion preference detected once
- [ ] Frame sequence precomputed at module level

---

## Browser Compatibility

### Feature Support Matrix

| Feature | Chrome | Firefox | Safari | Edge | Notes |
|---------|--------|---------|--------|------|-------|
| **CSS Transitions** | ✅ 26+ | ✅ 16+ | ✅ 9+ | ✅ 12+ | Full support |
| **backdrop-filter** | ✅ 76+ | ✅ 103+ | ✅ 9+ | ✅ 79+ | May need prefix |
| **prefers-reduced-motion** | ✅ 74+ | ✅ 63+ | ✅ 10.1+ | ✅ 79+ | Full support |
| **ARIA live regions** | ✅ All | ✅ All | ✅ All | ✅ All | Full support |
| **CSS Grid/Flexbox** | ✅ 57+ | ✅ 52+ | ✅ 10.1+ | ✅ 16+ | Full support |
| **setInterval** | ✅ All | ✅ All | ✅ All | ✅ All | Full support |

### Polyfills Required

**None** - All features are baseline supported

### Known Issues

1. **Safari backdrop-filter blur:**
   - May have performance issues on older devices
   - Fallback: Solid background color

2. **Firefox color rendering:**
   - Some color values may render slightly differently
   - Test ROYGBIV colors specifically

3. **Mobile Safari fixed positioning:**
   - May shift when keyboard opens
   - Consider `position: absolute` on mobile

### Browser Testing Strategy

```typescript
// Detect browser and apply fixes
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isFirefox = /firefox/i.test(navigator.userAgent);

const backdropClass = isSafari
  ? 'bg-gray-900/90' // Solid background for older Safari
  : 'bg-gray-900/80 backdrop-blur-sm';
```

### Minimum Supported Versions

- **Chrome/Edge:** Version 90+ (2021)
- **Firefox:** Version 88+ (2021)
- **Safari:** Version 14+ (2020)
- **Mobile Safari/Chrome:** iOS 14+, Android 10+

### Graceful Degradation

```typescript
const AviTypingIndicator = ({ isVisible }: Props) => {
  const [supportsBackdrop, setSupportsBackdrop] = useState(true);

  useEffect(() => {
    // Feature detection
    const test = CSS.supports('backdrop-filter', 'blur(10px)');
    setSupportsBackdrop(test);
  }, []);

  return (
    <div
      className={cn(
        supportsBackdrop
          ? 'bg-gray-900/80 backdrop-blur-sm'
          : 'bg-gray-900'
      )}
    >
      {/* Content */}
    </div>
  );
};
```

---

## Implementation Phases

### Phase 1: Core Component (MVP)
- Basic component structure
- Simple character cycling (no wave effect yet)
- Single color (no ROYGBIV yet)
- Visibility toggle based on `isVisible` prop
- Basic positioning (fixed, bottom-left)

**Acceptance Criteria:**
- Appears when `isVisible={true}`
- Disappears when `isVisible={false}`
- Shows "Avi" characters
- Positioned correctly above input

### Phase 2: Animation Engine
- Implement 10-frame sequence
- Add wave transformation logic (A→Λ, v→V, i→!)
- Integrate ROYGBIV color cycling
- Add fade in/out transitions
- Performance optimizations (memoization)

**Acceptance Criteria:**
- Characters transform in wave pattern
- Colors cycle through ROYGBIV
- Smooth transitions
- No memory leaks

### Phase 3: Accessibility & Polish
- ARIA live regions
- Screen reader announcements
- Reduced motion support
- Responsive design
- Browser compatibility testing

**Acceptance Criteria:**
- WCAG AA compliant
- Screen reader tested
- Works on mobile devices
- Cross-browser validated

### Phase 4: Integration
- Integrate with EnhancedPostingInterface
- Connect to API submission flow
- Error handling
- E2E testing

**Acceptance Criteria:**
- Shows during API calls
- Hides on response/error
- Works with existing UI flow
- All tests passing

---

## Testing Strategy

### Unit Tests

```typescript
describe('AviTypingIndicator', () => {
  it('should be hidden when isVisible is false', () => {
    render(<AviTypingIndicator isVisible={false} />);
    expect(screen.queryByRole('status')).toHaveClass('opacity-0');
  });

  it('should be visible when isVisible is true', () => {
    render(<AviTypingIndicator isVisible={true} />);
    expect(screen.getByRole('status')).toHaveClass('opacity-100');
  });

  it('should cycle through frames', async () => {
    render(<AviTypingIndicator isVisible={true} frameDuration={100} />);

    // Wait for animation cycle
    await waitFor(() => {
      // Assert frame change
    }, { timeout: 2000 });
  });

  it('should cleanup timer on unmount', () => {
    const { unmount } = render(<AviTypingIndicator isVisible={true} />);
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
```

### Integration Tests

```typescript
describe('AviTypingIndicator Integration', () => {
  it('should show during message submission', async () => {
    render(<EnhancedPostingInterface />);

    const input = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /send/i });

    await userEvent.type(input, 'Test message');
    await userEvent.click(submitButton);

    expect(screen.getByLabelText('Avi is typing')).toBeVisible();
  });

  it('should hide after API response', async () => {
    render(<EnhancedPostingInterface />);

    // Trigger submission
    await submitMessage();

    // Wait for API response
    await waitFor(() => {
      expect(screen.queryByLabelText('Avi is typing')).not.toBeVisible();
    });
  });
});
```

### Accessibility Tests

```typescript
describe('AviTypingIndicator Accessibility', () => {
  it('should have proper ARIA attributes', () => {
    render(<AviTypingIndicator isVisible={true} />);

    const indicator = screen.getByRole('status');
    expect(indicator).toHaveAttribute('aria-live', 'polite');
    expect(indicator).toHaveAttribute('aria-atomic', 'true');
  });

  it('should respect reduced motion preference', () => {
    matchMedia.mockImplementation(() => ({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
    }));

    render(<AviTypingIndicator isVisible={true} />);

    // Assert static version shown
  });
});
```

### Visual Regression Tests

```typescript
describe('AviTypingIndicator Visual', () => {
  it('should match snapshot for each frame', async () => {
    const { container } = render(
      <AviTypingIndicator isVisible={true} frameDuration={100} />
    );

    for (let frame = 0; frame < 10; frame++) {
      await waitFor(() => {
        expect(container).toMatchSnapshot(`frame-${frame}`);
      });
    }
  });
});
```

---

## File Structure

```
frontend/src/components/
├── AviTypingIndicator/
│   ├── index.tsx                    # Main component
│   ├── AviTypingIndicator.types.ts  # TypeScript interfaces
│   ├── AviTypingIndicator.utils.ts  # Frame/color logic
│   ├── AviTypingIndicator.test.tsx  # Unit tests
│   └── AviTypingIndicator.stories.tsx # Storybook stories
│
└── EnhancedPostingInterface.tsx     # Parent component
```

---

## Dependencies

### Required Packages

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "vitest": "^1.0.0"
  }
}
```

**No additional dependencies required** - Pure React implementation

---

## Security Considerations

### XSS Prevention

```typescript
// SAFE: React automatically escapes content
<span>{char}</span>

// UNSAFE: Avoid dangerouslySetInnerHTML
<span dangerouslySetInnerHTML={{ __html: char }} />
```

### Content Security Policy

No external resources loaded - CSP friendly

### Timing Attacks

Animation timing not sensitive - no security implications

---

## Future Enhancements

1. **Configurable Animation Speeds:**
   - Slow (300ms), Medium (200ms), Fast (100ms)
   - User preference storage

2. **Custom Themes:**
   - Alternative color palettes
   - Dark/light mode support

3. **Sound Effects:**
   - Optional typing sound
   - Accessibility considerations

4. **Analytics Integration:**
   - Track animation display frequency
   - Measure API response times

5. **Multiple Indicators:**
   - Different animations for different agents
   - Avatar integration

---

## Conclusion

This architecture provides a robust, performant, and accessible typing indicator component. The design prioritizes:

1. **Simplicity:** Clean React patterns, minimal dependencies
2. **Performance:** Optimized rendering, efficient animations
3. **Accessibility:** WCAG compliant, screen reader support
4. **Maintainability:** Well-structured, testable code
5. **Scalability:** Easy to extend with new features

The component integrates seamlessly with the existing EnhancedPostingInterface while remaining independent and reusable.

---

**Next Phase:** Proceed to Implementation (SPARC Pseudocode phase)

**Document Version:** 1.0.0
**Last Updated:** 2025-10-01
**Author:** SPARC Architecture Agent
