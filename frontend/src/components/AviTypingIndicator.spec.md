# Avi Typing Indicator - SPARC Specification

## 1. Introduction

### 1.1 Purpose
This specification defines the requirements, behavior, and implementation details for the Avi typing indicator animation component. The indicator provides visual feedback to users while waiting for Avi's response in the chat interface.

### 1.2 Scope
- Visual animation component with wave pattern
- ROYGBIV color cycling synchronized with animation frames
- Integration with EnhancedPostingInterface chat component
- Lifecycle management tied to message submission state
- Accessibility features for screen readers

### 1.3 Definitions
- **Frame**: A single state in the animation sequence (10 total frames)
- **Wave Pattern**: Character transformation sequence creating visual wave effect
- **ROYGBIV**: Rainbow color sequence (Red, Orange, Yellow, Green, Blue, Indigo, Violet)
- **Typing State**: Boolean state indicating Avi is processing a response

---

## 2. Functional Requirements

### 2.1 Animation Behavior

#### FR-2.1.1: Wave Pattern Animation
**Priority:** High
**Description:** Component shall display "Avi" text with wave transformation pattern

**Acceptance Criteria:**
- Characters transform in sequence: A↔Λ, v↔V, i↔!
- Animation creates visual wave effect from left to right
- Pattern loops continuously while visible
- No visual glitches or frame skips

**Animation Sequence:**
```
Frame 1:  A v i
Frame 2:  Λ v i
Frame 3:  Λ V i
Frame 4:  Λ V !
Frame 5:  Λ v !
Frame 6:  A v !
Frame 7:  A V !
Frame 8:  A V i
Frame 9:  A v i
Frame 10: Λ v i
[Loop to Frame 1]
```

#### FR-2.1.2: Color Cycling
**Priority:** High
**Description:** Text color shall cycle through ROYGBIV spectrum synchronized with animation frames

**Acceptance Criteria:**
- Colors cycle in order: Red → Orange → Yellow → Green → Blue → Indigo → Violet
- Color changes every frame (200ms)
- Color cycle loops independently of frame cycle
- Smooth color transitions with no flashing

**Color Specifications:**
```css
Red:     #FF0000
Orange:  #FF7F00
Yellow:  #FFFF00
Green:   #00FF00
Blue:    #0000FF
Indigo:  #4B0082
Violet:  #9400D3
```

#### FR-2.1.3: Animation Timing
**Priority:** High
**Description:** Animation shall run at medium speed (200ms per frame)

**Acceptance Criteria:**
- Frame duration: 200ms ± 10ms
- Complete cycle duration: 2000ms (10 frames × 200ms)
- Color cycle duration: 1400ms (7 colors × 200ms)
- Timing maintained under normal system load
- Uses `setInterval` or `requestAnimationFrame` for consistent timing

### 2.2 Visibility Control

#### FR-2.2.1: Show on Message Submit
**Priority:** High
**Description:** Indicator shall appear immediately when user submits message to Avi

**Acceptance Criteria:**
- Appears within 50ms of submit button click
- Visible before API request completes
- No flash of unstyled content (FOUC)
- First frame displays immediately

#### FR-2.2.2: Hide on Response Arrival
**Priority:** High
**Description:** Indicator shall disappear when Avi's response is received

**Acceptance Criteria:**
- Disappears within 100ms of response arrival
- Smooth fade-out transition (150ms)
- No lingering after response displayed
- Cleanup interval timers properly

#### FR-2.2.3: Multiple Message Handling
**Priority:** Medium
**Description:** Component shall handle rapid successive messages correctly

**Acceptance Criteria:**
- Reappears for each new message if previous response received
- Does not double-render if already visible
- State resets properly between messages
- No memory leaks from abandoned animations

### 2.3 Positioning

#### FR-2.3.1: Location Relative to Input
**Priority:** High
**Description:** Indicator shall be positioned bottom-left, directly above chat input box

**Acceptance Criteria:**
- Located 8px above chat input textarea
- Left-aligned with input text area start
- Does not overlap input border or text
- Maintains position during window resize
- Responsive positioning on mobile devices

#### FR-2.3.2: Z-Index Management
**Priority:** Medium
**Description:** Indicator shall display above background but not interfere with UI elements

**Acceptance Criteria:**
- Visible above chat background
- Below modal dialogs and dropdowns
- Does not block interaction with send button
- Proper stacking context maintained

---

## 3. Non-Functional Requirements

### 3.1 Performance

#### NFR-3.1.1: Rendering Performance
**Category:** Performance
**Description:** Animation shall run smoothly without impacting UI responsiveness

**Measurement:**
- Animation frame rate: 60 FPS
- CPU usage: <5% on modern devices
- No dropped frames during 30-second continuous animation
- React DevTools Profiler: Component render time <2ms

**Validation:**
- Chrome DevTools Performance profiling
- Test on low-end mobile devices
- Monitor requestAnimationFrame timing

#### NFR-3.1.2: Memory Management
**Category:** Performance
**Description:** Component shall not leak memory during extended use

**Measurement:**
- Memory footprint: <1MB
- No memory growth after 100 message cycles
- Proper cleanup of intervals/timers on unmount

**Validation:**
- Chrome DevTools Memory Profiler
- Heap snapshot comparison before/after 100 messages
- React Developer Tools component inspection

### 3.2 Accessibility

#### NFR-3.2.1: Screen Reader Support
**Category:** Accessibility
**Description:** Screen readers shall announce typing state changes

**Requirements:**
- ARIA live region with `polite` priority
- Announces "Avi is typing" when indicator appears
- Announces "Avi has responded" when indicator disappears
- No repetitive announcements during animation loop

**Implementation:**
```tsx
<div role="status" aria-live="polite" aria-atomic="true">
  {isVisible && "Avi is typing"}
</div>
```

#### NFR-3.2.2: Reduced Motion Support
**Category:** Accessibility
**Description:** Shall respect user's reduced motion preference

**Requirements:**
- Detect `prefers-reduced-motion` CSS media query
- Show static "Avi typing..." text if motion disabled
- Maintain color but disable wave animation
- User can override via settings

**Implementation:**
```css
@media (prefers-reduced-motion: reduce) {
  .avi-typing-indicator {
    animation: none;
  }
}
```

#### NFR-3.2.3: Color Contrast
**Category:** Accessibility
**Description:** All color states shall meet WCAG AA contrast requirements

**Requirements:**
- Minimum contrast ratio 4.5:1 against background
- Yellow (#FFFF00) may need adjustment for light backgrounds
- Test with WCAG color contrast analyzer
- Provide high-contrast mode option

### 3.3 Browser Compatibility

#### NFR-3.3.1: Cross-Browser Support
**Category:** Compatibility
**Description:** Component shall work consistently across major browsers

**Supported Browsers:**
- Chrome 90+ ✓
- Firefox 88+ ✓
- Safari 14+ ✓
- Edge 90+ ✓
- Mobile Safari (iOS 14+) ✓
- Chrome Mobile (Android 10+) ✓

**Validation:**
- Visual regression testing
- Automated Playwright tests across browsers
- Manual testing on physical devices

#### NFR-3.3.2: Graceful Degradation
**Category:** Compatibility
**Description:** Fallback behavior for unsupported browsers

**Requirements:**
- Falls back to static "Typing..." text if CSS animations unsupported
- Lambda (Λ) character renders or falls back to "A"
- Color support gracefully degrades to single color

### 3.4 Maintainability

#### NFR-3.4.1: Code Quality
**Category:** Maintainability
**Description:** Component code shall be clean, typed, and documented

**Requirements:**
- TypeScript with strict mode enabled
- 100% type coverage (no `any` types)
- JSDoc comments for all public interfaces
- ESLint compliance (0 warnings/errors)
- Prettier formatted

#### NFR-3.4.2: Test Coverage
**Category:** Maintainability
**Description:** Comprehensive test suite with high coverage

**Requirements:**
- Unit test coverage: >90%
- Integration test coverage: >80%
- E2E test: Critical user flows
- Visual regression tests for animation frames

---

## 4. Technical Specifications

### 4.1 Component Architecture

#### 4.1.1 Component Structure

**File:** `/workspaces/agent-feed/frontend/src/components/AviTypingIndicator.tsx`

**Component Type:** Functional component with hooks

**Dependencies:**
```json
{
  "react": "^18.x",
  "react-dom": "^18.x"
}
```

**Exports:**
```typescript
export interface AviTypingIndicatorProps {
  isVisible: boolean;
  onAnimationComplete?: () => void;
}

export const AviTypingIndicator: React.FC<AviTypingIndicatorProps>;
```

#### 4.1.2 Props Interface

```typescript
interface AviTypingIndicatorProps {
  /**
   * Controls visibility of the typing indicator
   * @default false
   */
  isVisible: boolean;

  /**
   * Optional callback fired when indicator is hidden
   * Used for cleanup or state management
   */
  onAnimationComplete?: () => void;

  /**
   * Optional custom class name for styling
   */
  className?: string;

  /**
   * Animation speed override (for testing)
   * @default 200
   */
  frameDelay?: number;
}
```

#### 4.1.3 State Management

```typescript
interface AnimationState {
  frameIndex: number;      // 0-9 (10 frames)
  colorIndex: number;      // 0-6 (7 colors)
  isAnimating: boolean;    // Internal animation state
}

// Hooks used:
// - useState: Manage frame and color indices
// - useEffect: Handle animation lifecycle
// - useRef: Store interval ID for cleanup
// - useMemo: Compute current frame text
// - useCallback: Memoize event handlers
```

### 4.2 Animation Logic

#### 4.2.1 Frame Generation

```typescript
/**
 * Frame configuration array
 * Each frame defines character states for positions 0, 1, 2
 */
const FRAMES: Array<[string, string, string]> = [
  ['A', 'v', 'i'],  // Frame 0
  ['Λ', 'v', 'i'],  // Frame 1
  ['Λ', 'V', 'i'],  // Frame 2
  ['Λ', 'V', '!'],  // Frame 3
  ['Λ', 'v', '!'],  // Frame 4
  ['A', 'v', '!'],  // Frame 5
  ['A', 'V', '!'],  // Frame 6
  ['A', 'V', 'i'],  // Frame 7
  ['A', 'v', 'i'],  // Frame 8
  ['Λ', 'v', 'i'],  // Frame 9
];

/**
 * ROYGBIV color cycle
 */
const COLORS: string[] = [
  '#FF0000', // Red
  '#FF7F00', // Orange
  '#FFFF00', // Yellow
  '#00FF00', // Green
  '#0000FF', // Blue
  '#4B0082', // Indigo
  '#9400D3', // Violet
];

/**
 * Get current frame text and color
 */
function getCurrentFrame(frameIndex: number, colorIndex: number): {
  text: string;
  color: string;
} {
  const frame = FRAMES[frameIndex % FRAMES.length];
  const color = COLORS[colorIndex % COLORS.length];
  return {
    text: frame.join(''),
    color,
  };
}
```

#### 4.2.2 Animation Loop

```typescript
/**
 * Animation loop using setInterval
 * Updates frame and color indices every 200ms
 */
useEffect(() => {
  if (!isVisible) return;

  let frameCount = 0;
  const intervalId = setInterval(() => {
    setFrameIndex((prev) => (prev + 1) % FRAMES.length);
    setColorIndex((prev) => (prev + 1) % COLORS.length);
    frameCount++;
  }, frameDelay);

  return () => {
    clearInterval(intervalId);
  };
}, [isVisible, frameDelay]);
```

#### 4.2.3 Lifecycle Management

```typescript
/**
 * Component lifecycle hooks
 */

// Mount: Initialize animation
useEffect(() => {
  if (isVisible) {
    setFrameIndex(0);
    setColorIndex(0);
  }
}, [isVisible]);

// Unmount: Cleanup
useEffect(() => {
  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    onAnimationComplete?.();
  };
}, [onAnimationComplete]);

// Visibility change: Handle show/hide
useEffect(() => {
  if (!isVisible && wasVisible) {
    // Fade out transition before unmount
    setTimeout(() => {
      onAnimationComplete?.();
    }, 150); // Match CSS transition duration
  }
}, [isVisible, wasVisible, onAnimationComplete]);
```

### 4.3 Styling Specifications

#### 4.3.1 CSS Module Structure

**File:** `/workspaces/agent-feed/frontend/src/components/AviTypingIndicator.module.css`

```css
/**
 * Container positioning
 */
.container {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  pointer-events: none;
  user-select: none;
  z-index: 10;
}

/**
 * Indicator text styling
 */
.indicator {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 2px;
  transition: opacity 150ms ease-in-out;
  opacity: 1;
}

/**
 * Hidden state
 */
.indicator.hidden {
  opacity: 0;
}

/**
 * Reduced motion support
 */
@media (prefers-reduced-motion: reduce) {
  .indicator {
    animation: none;
  }

  .indicator::before {
    content: 'Avi typing...';
    color: #666;
  }
}

/**
 * Screen reader only text
 */
.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

#### 4.3.2 Responsive Design

```css
/**
 * Mobile adjustments
 */
@media (max-width: 768px) {
  .container {
    bottom: calc(100% + 4px);
  }

  .indicator {
    font-size: 14px;
    letter-spacing: 1.5px;
  }
}

/**
 * Tablet adjustments
 */
@media (min-width: 769px) and (max-width: 1024px) {
  .indicator {
    font-size: 15px;
  }
}
```

### 4.4 Integration Specifications

#### 4.4.1 EnhancedPostingInterface Integration

**File:** `/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx`

**Integration Points:**

```typescript
// 1. Import component
import { AviTypingIndicator } from './AviTypingIndicator';

// 2. Add state tracking (if not exists)
const [isAviTyping, setIsAviTyping] = useState(false);

// 3. Update state on message submit
const handleSubmit = async (message: string) => {
  setIsAviTyping(true);
  try {
    await sendMessageToAvi(message);
    // Response received
  } finally {
    setIsAviTyping(false);
  }
};

// 4. Render component in JSX
<div className="chat-input-container">
  <AviTypingIndicator
    isVisible={isAviTyping}
    onAnimationComplete={() => {
      console.log('Animation hidden');
    }}
  />
  <textarea {...inputProps} />
  <button onClick={handleSubmit}>Send</button>
</div>
```

#### 4.4.2 State Synchronization

```typescript
/**
 * Sync typing state with message queue
 */
useEffect(() => {
  if (chatHistory.length > 0) {
    const lastMessage = chatHistory[chatHistory.length - 1];
    // Show typing if last message is from user and no response yet
    const shouldShowTyping =
      lastMessage.author === 'user' &&
      !lastMessage.response;
    setIsAviTyping(shouldShowTyping);
  }
}, [chatHistory]);
```

#### 4.4.3 Error Handling

```typescript
/**
 * Handle API errors and hide typing indicator
 */
const handleSubmit = async (message: string) => {
  setIsAviTyping(true);
  try {
    const response = await sendMessageToAvi(message);
    if (!response.ok) {
      throw new Error('API request failed');
    }
  } catch (error) {
    console.error('Message send failed:', error);
    // Hide typing indicator on error
    setIsAviTyping(false);
    // Show error message to user
    showErrorNotification('Failed to send message');
  } finally {
    // Ensure typing indicator is hidden
    setTimeout(() => setIsAviTyping(false), 200);
  }
};
```

---

## 5. Data Model

### 5.1 Component Props Data

```typescript
interface AviTypingIndicatorProps {
  isVisible: boolean;
  onAnimationComplete?: () => void;
  className?: string;
  frameDelay?: number;
}
```

### 5.2 Internal State Data

```typescript
interface InternalState {
  frameIndex: number;      // Current frame (0-9)
  colorIndex: number;      // Current color (0-6)
  intervalId: number | null; // Interval reference
}
```

### 5.3 Configuration Constants

```typescript
interface AnimationConfig {
  frames: Array<[string, string, string]>;
  colors: string[];
  frameDelay: number;
  fadeOutDuration: number;
}

const DEFAULT_CONFIG: AnimationConfig = {
  frames: [...], // 10 frames
  colors: [...], // 7 ROYGBIV colors
  frameDelay: 200, // milliseconds
  fadeOutDuration: 150, // milliseconds
};
```

---

## 6. Acceptance Criteria & Test Scenarios

### 6.1 Animation Tests

#### Test 6.1.1: Wave Pattern Loop
**Given:** Component is visible
**When:** Animation runs for 5 complete cycles
**Then:**
- ✓ All 10 frames display in correct sequence
- ✓ Animation loops smoothly without pause
- ✓ No frame skips or duplicates
- ✓ Characters transform correctly (A↔Λ, v↔V, i↔!)

**Test Implementation:**
```typescript
test('wave pattern loops correctly', async () => {
  const { container } = render(<AviTypingIndicator isVisible={true} />);
  const indicator = container.querySelector('.indicator');

  const frames = [];
  for (let i = 0; i < 50; i++) {
    await wait(200);
    frames.push(indicator.textContent);
  }

  // Verify frame sequence repeats
  expect(frames[0]).toBe('Avi');
  expect(frames[10]).toBe('Avi');
  expect(frames[20]).toBe('Avi');
});
```

#### Test 6.1.2: Color Cycling
**Given:** Component is visible
**When:** Animation runs through all 7 colors
**Then:**
- ✓ Colors cycle in ROYGBIV order
- ✓ Each color displayed for exactly 200ms
- ✓ Color cycle completes in 1400ms
- ✓ Colors loop back to red after violet

**Test Implementation:**
```typescript
test('ROYGBIV color cycle', async () => {
  const { container } = render(<AviTypingIndicator isVisible={true} />);
  const indicator = container.querySelector('.indicator');

  const expectedColors = [
    '#FF0000', '#FF7F00', '#FFFF00', '#00FF00',
    '#0000FF', '#4B0082', '#9400D3'
  ];

  for (let i = 0; i < 14; i++) {
    await wait(200);
    const color = window.getComputedStyle(indicator).color;
    const expectedColor = expectedColors[i % 7];
    expect(rgbToHex(color)).toBe(expectedColor);
  }
});
```

#### Test 6.1.3: Timing Accuracy
**Given:** Component is visible
**When:** 10 frames complete
**Then:**
- ✓ Total duration is 2000ms ± 50ms
- ✓ Each frame duration is 200ms ± 10ms
- ✓ No drift over multiple cycles

**Test Implementation:**
```typescript
test('animation timing accuracy', async () => {
  const startTime = performance.now();
  render(<AviTypingIndicator isVisible={true} />);

  await waitForFrames(10); // Wait for 10 frames

  const elapsed = performance.now() - startTime;
  expect(elapsed).toBeGreaterThan(1950);
  expect(elapsed).toBeLessThan(2050);
});
```

### 6.2 Visibility Tests

#### Test 6.2.1: Show on Message Submit
**Given:** User is on chat interface
**When:** User clicks "Send" button
**Then:**
- ✓ Typing indicator appears within 50ms
- ✓ First frame displays immediately
- ✓ Animation starts before API call completes

**Test Implementation:**
```typescript
test('appears on message submit', async () => {
  const { getByRole, queryByTestId } = render(<ChatInterface />);
  const sendButton = getByRole('button', { name: /send/i });

  expect(queryByTestId('avi-typing')).toBeNull();

  fireEvent.click(sendButton);

  await waitFor(() => {
    expect(queryByTestId('avi-typing')).toBeInTheDocument();
  }, { timeout: 50 });
});
```

#### Test 6.2.2: Hide on Response Arrival
**Given:** Typing indicator is visible
**When:** Avi's response arrives
**Then:**
- ✓ Indicator begins fade-out within 100ms
- ✓ Fade-out completes in 150ms
- ✓ Component unmounts after fade
- ✓ onAnimationComplete callback fires

**Test Implementation:**
```typescript
test('hides on response arrival', async () => {
  const onComplete = jest.fn();
  const { rerender } = render(
    <AviTypingIndicator isVisible={true} onAnimationComplete={onComplete} />
  );

  rerender(<AviTypingIndicator isVisible={false} onAnimationComplete={onComplete} />);

  await waitFor(() => {
    expect(onComplete).toHaveBeenCalled();
  }, { timeout: 200 });
});
```

#### Test 6.2.3: Multiple Messages
**Given:** User sends 3 messages in succession
**When:** Each message is sent before previous response
**Then:**
- ✓ Indicator shows for first message
- ✓ Indicator hides when first response arrives
- ✓ Indicator re-shows for second message
- ✓ No memory leaks or duplicate animations

**Test Implementation:**
```typescript
test('handles multiple messages', async () => {
  const { getByRole, queryByTestId } = render(<ChatInterface />);
  const sendButton = getByRole('button', { name: /send/i });

  // Message 1
  fireEvent.click(sendButton);
  expect(queryByTestId('avi-typing')).toBeInTheDocument();

  await waitForResponse();
  expect(queryByTestId('avi-typing')).toBeNull();

  // Message 2
  fireEvent.click(sendButton);
  expect(queryByTestId('avi-typing')).toBeInTheDocument();

  await waitForResponse();
  expect(queryByTestId('avi-typing')).toBeNull();
});
```

### 6.3 Performance Tests

#### Test 6.3.1: CPU Usage
**Given:** Component animates for 30 seconds
**When:** CPU profiling is measured
**Then:**
- ✓ CPU usage stays below 5%
- ✓ No memory leaks detected
- ✓ Frame rate maintains 60 FPS

**Test Implementation:**
```javascript
// Manual test with Chrome DevTools
// 1. Open DevTools Performance tab
// 2. Start recording
// 3. Let animation run for 30s
// 4. Stop recording
// 5. Verify CPU usage in flame chart
```

#### Test 6.3.2: Memory Stability
**Given:** Component mounts and unmounts 100 times
**When:** Memory is measured before and after
**Then:**
- ✓ Heap size increases by <10MB
- ✓ No detached DOM nodes
- ✓ All intervals cleared properly

**Test Implementation:**
```typescript
test('no memory leaks', async () => {
  const { rerender, unmount } = render(<AviTypingIndicator isVisible={true} />);

  for (let i = 0; i < 100; i++) {
    rerender(<AviTypingIndicator isVisible={true} />);
    unmount();
  }

  // Check for interval leaks
  expect(getActiveIntervals()).toBe(0);
});
```

### 6.4 Accessibility Tests

#### Test 6.4.1: Screen Reader Announcement
**Given:** Screen reader is active
**When:** Typing indicator appears
**Then:**
- ✓ Announces "Avi is typing"
- ✓ Announces "Avi has responded" on hide
- ✓ No repetitive announcements during loop

**Test Implementation:**
```typescript
test('screen reader announces typing state', () => {
  const { container } = render(<AviTypingIndicator isVisible={true} />);
  const liveRegion = container.querySelector('[role="status"]');

  expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  expect(liveRegion).toHaveTextContent('Avi is typing');
});
```

#### Test 6.4.2: Reduced Motion
**Given:** User has `prefers-reduced-motion: reduce`
**When:** Component renders
**Then:**
- ✓ Shows static "Avi typing..." text
- ✓ No wave animation plays
- ✓ Color remains constant

**Test Implementation:**
```typescript
test('respects reduced motion preference', () => {
  // Mock matchMedia
  window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
  }));

  const { container } = render(<AviTypingIndicator isVisible={true} />);
  const indicator = container.querySelector('.indicator');

  expect(indicator).toHaveStyle({ animation: 'none' });
  expect(indicator.textContent).toBe('Avi typing...');
});
```

#### Test 6.4.3: Color Contrast
**Given:** Component displays each color
**When:** Contrast is measured against background
**Then:**
- ✓ All colors meet WCAG AA (4.5:1)
- ✓ Yellow adjusted if needed for contrast
- ✓ High contrast mode available

**Test Implementation:**
```typescript
test('color contrast meets WCAG AA', () => {
  const colors = [
    '#FF0000', '#FF7F00', '#FFFF00', '#00FF00',
    '#0000FF', '#4B0082', '#9400D3'
  ];
  const background = '#FFFFFF';

  colors.forEach(color => {
    const contrast = getContrastRatio(color, background);
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });
});
```

### 6.5 Browser Compatibility Tests

#### Test 6.5.1: Cross-Browser Animation
**Given:** Component runs in Chrome, Firefox, Safari
**When:** Visual regression test captures screenshots
**Then:**
- ✓ Animation looks identical across browsers
- ✓ Lambda character (Λ) renders correctly
- ✓ Colors match exactly

**Test Implementation:**
```typescript
test('cross-browser visual regression', async () => {
  const browsers = ['chromium', 'firefox', 'webkit'];

  for (const browserType of browsers) {
    const browser = await playwright[browserType].launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:3000');

    const screenshot = await page.screenshot();
    expect(screenshot).toMatchImageSnapshot({
      customSnapshotIdentifier: `typing-indicator-${browserType}`
    });

    await browser.close();
  }
});
```

### 6.6 Edge Case Tests

#### Test 6.6.1: Fast Response (5 seconds)
**Given:** API responds in 5 seconds
**When:** Typing indicator shows briefly
**Then:**
- ✓ Shows for full 5 seconds
- ✓ Completes 2.5 cycles
- ✓ Fades out smoothly

#### Test 6.6.2: Slow Response (30 seconds)
**Given:** API responds in 30 seconds
**When:** Typing indicator loops multiple times
**Then:**
- ✓ Loops smoothly for 15 cycles
- ✓ No performance degradation
- ✓ Remains in sync

#### Test 6.6.3: Network Error
**Given:** API request fails
**When:** Error is caught
**Then:**
- ✓ Typing indicator hides immediately
- ✓ Error message shows
- ✓ Component cleans up properly

#### Test 6.6.4: Component Unmount During Animation
**Given:** Component is animating
**When:** Parent component unmounts
**Then:**
- ✓ Interval is cleared
- ✓ No console errors
- ✓ onAnimationComplete callback fires

---

## 7. Implementation Checklist

### Phase 1: Component Setup
- [ ] Create `AviTypingIndicator.tsx` file
- [ ] Define TypeScript interfaces and types
- [ ] Create `AviTypingIndicator.module.css` file
- [ ] Set up frame and color constants
- [ ] Initialize component structure with props

### Phase 2: Animation Logic
- [ ] Implement frame generation logic
- [ ] Implement color cycling logic
- [ ] Set up `useEffect` for animation loop
- [ ] Add interval cleanup on unmount
- [ ] Test frame sequencing manually

### Phase 3: Visibility Control
- [ ] Implement show/hide transitions
- [ ] Add fade-out CSS animation
- [ ] Handle `isVisible` prop changes
- [ ] Implement `onAnimationComplete` callback
- [ ] Test visibility edge cases

### Phase 4: Styling
- [ ] Position component relative to input
- [ ] Add monospace font styling
- [ ] Implement responsive breakpoints
- [ ] Add reduced motion media query
- [ ] Test on mobile devices

### Phase 5: Accessibility
- [ ] Add ARIA live region
- [ ] Implement screen reader announcements
- [ ] Add sr-only helper text
- [ ] Test with NVDA/JAWS/VoiceOver
- [ ] Verify keyboard navigation

### Phase 6: Integration
- [ ] Import into EnhancedPostingInterface
- [ ] Wire up `isVisible` state
- [ ] Add to chat input container
- [ ] Test with real API calls
- [ ] Handle error cases

### Phase 7: Testing
- [ ] Write unit tests (>90% coverage)
- [ ] Write integration tests
- [ ] Write E2E Playwright tests
- [ ] Visual regression tests
- [ ] Performance profiling

### Phase 8: Documentation
- [ ] Add JSDoc comments
- [ ] Create usage examples
- [ ] Document props and behavior
- [ ] Add troubleshooting guide
- [ ] Update component library

---

## 8. Success Criteria Summary

### Must Have (P0)
✓ Animation loops smoothly at 200ms per frame
✓ ROYGBIV colors cycle correctly
✓ Appears on message submit
✓ Disappears on response arrival
✓ No frame skips or glitches
✓ Positioned correctly above input
✓ Screen reader accessible

### Should Have (P1)
✓ <5% CPU usage
✓ Works on Chrome, Firefox, Safari
✓ Responsive on mobile
✓ Reduced motion support
✓ Memory leak free
✓ Error handling

### Nice to Have (P2)
✓ Customizable speed (frameDelay prop)
✓ High contrast mode
✓ Animation pause on visibility change
✓ Configurable colors

---

## 9. Dependencies

### 9.1 External Dependencies
- React 18.x
- TypeScript 5.x
- CSS Modules support

### 9.2 Internal Dependencies
- `/frontend/src/components/EnhancedPostingInterface.tsx`
- Chat state management hooks
- Message submission handlers

### 9.3 Development Dependencies
- Jest (testing)
- React Testing Library
- Playwright (E2E)
- ESLint + Prettier

---

## 10. Constraints

### 10.1 Technical Constraints
- Must work with existing React 18 setup
- Cannot use external animation libraries
- Must use CSS Modules for styling
- Lambda (Λ) must render on all target browsers

### 10.2 Performance Constraints
- Maximum 5% CPU usage during animation
- Maximum 1MB memory footprint
- No dropped frames on 60Hz displays
- Must work on mobile devices (iOS/Android)

### 10.3 Design Constraints
- Must match existing chat UI design system
- Colors must be ROYGBIV (non-negotiable)
- Position must be bottom-left above input
- Cannot block user interaction

---

## 11. Risks and Mitigations

### Risk 11.1: Lambda Character Not Rendering
**Likelihood:** Medium
**Impact:** Medium
**Mitigation:**
- Test on all target browsers early
- Provide fallback character mapping
- Use web-safe font stack with Lambda support
- Consider Unicode alternatives: Λ (U+039B)

### Risk 11.2: Animation Performance Issues
**Likelihood:** Low
**Impact:** High
**Mitigation:**
- Profile early with Chrome DevTools
- Use `requestAnimationFrame` if `setInterval` has issues
- Implement frame skipping for low-end devices
- Test on actual mobile hardware

### Risk 11.3: Timing Drift Over Long Periods
**Likelihood:** Medium
**Impact:** Low
**Mitigation:**
- Use high-precision timestamps
- Recalculate next frame time each iteration
- Consider `requestAnimationFrame` for better sync
- Reset timing on visibility changes

### Risk 11.4: Integration Breaking Changes
**Likelihood:** Low
**Impact:** High
**Mitigation:**
- Comprehensive integration tests
- Version lock dependencies
- Document integration contract clearly
- Provide migration guide if API changes

---

## 12. Acceptance Sign-Off

### Stakeholder Approval
- [ ] Product Owner: Feature meets requirements
- [ ] UX Designer: Animation matches design spec
- [ ] Frontend Lead: Code quality approved
- [ ] QA Engineer: All tests passing
- [ ] Accessibility Specialist: WCAG AA compliance verified

### Pre-Deployment Checklist
- [ ] All unit tests passing (>90% coverage)
- [ ] All integration tests passing
- [ ] E2E tests passing on all browsers
- [ ] Performance benchmarks met
- [ ] Accessibility audit complete
- [ ] Documentation complete
- [ ] Code review approved
- [ ] Security review (if applicable)

---

## 13. Appendix

### A. Color Reference Chart

| Color   | Hex Code | RGB            | Usage              |
|---------|----------|----------------|--------------------|
| Red     | #FF0000  | 255, 0, 0      | Frame 0, 7         |
| Orange  | #FF7F00  | 255, 127, 0    | Frame 1, 8         |
| Yellow  | #FFFF00  | 255, 255, 0    | Frame 2, 9         |
| Green   | #00FF00  | 0, 255, 0      | Frame 3            |
| Blue    | #0000FF  | 0, 0, 255      | Frame 4            |
| Indigo  | #4B0082  | 75, 0, 130     | Frame 5            |
| Violet  | #9400D3  | 148, 0, 211    | Frame 6            |

### B. Frame-Color Mapping

| Frame | Characters | Color Index | Color   | Time (ms) |
|-------|------------|-------------|---------|-----------|
| 0     | A v i      | 0           | Red     | 0         |
| 1     | Λ v i      | 1           | Orange  | 200       |
| 2     | Λ V i      | 2           | Yellow  | 400       |
| 3     | Λ V !      | 3           | Green   | 600       |
| 4     | Λ v !      | 4           | Blue    | 800       |
| 5     | A v !      | 5           | Indigo  | 1000      |
| 6     | A V !      | 6           | Violet  | 1200      |
| 7     | A V i      | 0           | Red     | 1400      |
| 8     | A v i      | 1           | Orange  | 1600      |
| 9     | Λ v i      | 2           | Yellow  | 1800      |
| 0     | A v i      | 3           | Green   | 2000      |

### C. Browser Support Matrix

| Browser         | Version | Animation | Lambda | Colors | Notes                    |
|-----------------|---------|-----------|--------|--------|--------------------------|
| Chrome          | 90+     | ✓         | ✓      | ✓      | Full support             |
| Firefox         | 88+     | ✓         | ✓      | ✓      | Full support             |
| Safari          | 14+     | ✓         | ✓      | ✓      | Requires -webkit prefix  |
| Edge            | 90+     | ✓         | ✓      | ✓      | Full support             |
| Chrome Mobile   | 90+     | ✓         | ✓      | ✓      | Test on real device      |
| Safari iOS      | 14+     | ✓         | ✓      | ✓      | Test on real device      |
| Samsung Internet| 14+     | ✓         | ?      | ✓      | Lambda needs testing     |

### D. Performance Benchmarks

| Metric                  | Target    | Measured | Status |
|-------------------------|-----------|----------|--------|
| Frame Rate              | 60 FPS    | TBD      | ⏳     |
| CPU Usage               | <5%       | TBD      | ⏳     |
| Memory Footprint        | <1MB      | TBD      | ⏳     |
| Component Render Time   | <2ms      | TBD      | ⏳     |
| Animation Start Latency | <50ms     | TBD      | ⏳     |
| Fade Out Duration       | 150ms     | TBD      | ⏳     |

### E. Related Documentation
- SPARC Methodology: [Link to SPARC docs]
- React Hooks API: https://react.dev/reference/react
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- CSS Animations: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations
- Playwright Testing: https://playwright.dev/

---

## Document Control

**Version:** 1.0.0
**Created:** 2025-10-01
**Author:** SPARC Specification Agent
**Status:** Draft → Ready for Review
**Next Review:** Before implementation begins

**Revision History:**
| Version | Date       | Author | Changes           |
|---------|------------|--------|-------------------|
| 1.0.0   | 2025-10-01 | SPARC  | Initial creation  |

---

**END OF SPECIFICATION**
