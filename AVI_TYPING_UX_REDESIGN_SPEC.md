# Avi Typing Animation UX Redesign - SPARC Specification

## 1. Introduction

### 1.1 Purpose
This specification defines the redesign of the Avi typing animation to integrate it seamlessly into the chat message flow, replacing the current floating indicator with a contextual, message-based approach.

### 1.2 Scope
- Redesign typing indicator positioning and integration
- Simplify visual design (remove ROYGBIV colors)
- Implement message-based rendering approach
- Update state management for typing indicator lifecycle
- Ensure accessibility and performance standards

### 1.3 Definitions
- **Typing Indicator**: Animated visual feedback showing Avi is processing a response
- **Chat History**: Array of message objects displayed in the chat interface
- **Temporary Message**: Ephemeral message object representing typing state
- **Wave Animation**: Sequential letter animation pattern (A→Λ, v→V, i→!)

## 2. Functional Requirements

### 2.1 Visual Design

#### FR-2.1.1: Single Color Scheme
**Priority**: High
**Description**: The typing animation shall use a single, consistent color throughout the animation cycle.

**Acceptance Criteria**:
- [ ] All animated letters use the same color
- [ ] No color cycling or rainbow effects
- [ ] Color is either gray (#6B7280) or Avi brand blue (#3B82F6)
- [ ] Color matches existing Avi message design language

**Implementation Notes**:
```typescript
// Recommended color options
const TYPING_INDICATOR_COLOR = '#6B7280'; // Neutral gray
// OR
const TYPING_INDICATOR_COLOR = '#3B82F6'; // Avi brand blue
```

#### FR-2.1.2: Simplified Text Display
**Priority**: High
**Description**: The typing indicator shall display only animated letters "Avi" without additional text.

**Acceptance Criteria**:
- [ ] No "is typing..." text displayed
- [ ] Only the letters "A", "v", "i" are shown
- [ ] Wave animation pattern is preserved
- [ ] Letters are properly spaced and readable

**Before**: "Avi is typing..."
**After**: "Avi" (with wave animation)

#### FR-2.1.3: Reduced Visual Prominence
**Priority**: Medium
**Description**: The typing indicator shall have minimal visual effects to blend with chat messages.

**Acceptance Criteria**:
- [ ] No text shadow effects
- [ ] No glow effects
- [ ] No box-shadow on container
- [ ] Font size reduced to 0.9rem (from 1.1rem)
- [ ] Opacity and animation remain smooth

**Visual Specifications**:
```css
.avi-typing-indicator {
  font-size: 0.9rem;
  text-shadow: none;
  color: #6B7280;
  /* Remove all glow/shadow effects */
}
```

### 2.2 Layout and Positioning

#### FR-2.2.1: Chat History Integration
**Priority**: High
**Description**: The typing indicator shall render as a message within the chat history, not as a floating element.

**Acceptance Criteria**:
- [ ] Indicator appears in the chat message list
- [ ] Uses the same message bubble component as Avi responses
- [ ] Positioned at the bottom of chat history
- [ ] Scrolls with other messages
- [ ] Not positioned absolutely or fixed

**Integration Approach**:
```typescript
interface TypingIndicatorMessage {
  id: string;
  content: JSX.Element; // <AviTypingIndicator />
  sender: 'avi';
  timestamp: Date;
  isTyping: true;
}
```

#### FR-2.2.2: Message Flow Behavior
**Priority**: High
**Description**: The typing indicator shall push existing messages upward naturally, behaving like a real message.

**Acceptance Criteria**:
- [ ] Existing messages shift up when indicator appears
- [ ] Transition is smooth and natural
- [ ] Chat auto-scrolls to show indicator
- [ ] Layout reflows properly on indicator removal
- [ ] No content jumping or jarring transitions

**Test Scenarios**:
1. Add indicator to empty chat → appears at bottom
2. Add indicator with 5 messages → messages shift up smoothly
3. Add indicator with scrolled-up view → auto-scroll to bottom
4. Remove indicator → messages shift down smoothly

#### FR-2.2.3: Message Bubble Styling
**Priority**: Medium
**Description**: The typing indicator shall use consistent styling with Avi message bubbles.

**Acceptance Criteria**:
- [ ] White background (#FFFFFF)
- [ ] Left-aligned positioning
- [ ] Consistent border radius
- [ ] Consistent padding (smaller for compact indicator)
- [ ] Avi avatar icon displayed
- [ ] Consistent spacing between messages

**Styling Template**:
```css
.typing-indicator-message {
  background: #FFFFFF;
  border-radius: 0.75rem;
  padding: 0.5rem 0.75rem; /* Slightly smaller than text messages */
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
```

### 2.3 State Management

#### FR-2.3.1: Lifecycle Management
**Priority**: High
**Description**: The typing indicator shall be added to chatHistory when submission begins and removed when response arrives.

**Acceptance Criteria**:
- [ ] Indicator added when `isSubmitting` becomes `true`
- [ ] Indicator removed when Avi response is received
- [ ] Indicator removed on error state
- [ ] Indicator removed after 90-second timeout
- [ ] Only one typing indicator exists at a time

**State Flow**:
```
User submits message
  ↓
isSubmitting = true
  ↓
Add typing indicator to chatHistory
  ↓
[Wait for response OR timeout]
  ↓
Receive response OR error OR timeout
  ↓
Remove typing indicator from chatHistory
  ↓
Add actual response message (if successful)
```

#### FR-2.3.2: Multiple Message Handling
**Priority**: Medium
**Description**: The system shall handle rapid successive message submissions gracefully.

**Acceptance Criteria**:
- [ ] Sending new message while indicator is active removes old indicator
- [ ] New indicator replaces old indicator (no duplicates)
- [ ] No race conditions between indicator add/remove
- [ ] Chat history maintains correct order
- [ ] Previous message response is still added if it arrives late

**Edge Case Handling**:
```typescript
// Pseudocode for rapid submissions
function handleNewSubmission() {
  // Remove any existing typing indicators
  removeTypingIndicators();

  // Add new typing indicator
  addTypingIndicator();

  // Submit message
  submitToAvi();
}
```

#### FR-2.3.3: Error Recovery
**Priority**: High
**Description**: The typing indicator shall be removed and user notified if response fails or times out.

**Acceptance Criteria**:
- [ ] Indicator removed on network error
- [ ] Indicator removed on API error response
- [ ] Indicator removed after 90-second timeout
- [ ] Error message displayed to user
- [ ] User can retry submission
- [ ] Chat remains in usable state

**Timeout Implementation**:
```typescript
const TYPING_TIMEOUT_MS = 90000; // 90 seconds

// Set timeout when indicator is added
const timeoutId = setTimeout(() => {
  removeTypingIndicator();
  showErrorMessage("Avi is taking longer than expected. Please try again.");
}, TYPING_TIMEOUT_MS);

// Clear timeout when response arrives
clearTimeout(timeoutId);
```

### 2.4 Animation Behavior

#### FR-2.4.1: Wave Pattern Preservation
**Priority**: Medium
**Description**: The wave animation pattern shall be maintained with single-color implementation.

**Acceptance Criteria**:
- [ ] Letter sequence: A → Λ → A (repeating)
- [ ] Letter sequence: v → V → v (repeating)
- [ ] Letter sequence: i → ! → i (repeating)
- [ ] Letters animate in wave pattern (sequential timing)
- [ ] Animation timing: 200ms per cycle
- [ ] Smooth transitions between states

**Animation Sequence**:
```
Frame 1: A v i
Frame 2: Λ v i
Frame 3: Λ V i
Frame 4: Λ V !
Frame 5: A V !
Frame 6: A v !
Frame 7: A v i
```

#### FR-2.4.2: Performance
**Priority**: Medium
**Description**: The animation shall perform smoothly without impacting chat performance.

**Acceptance Criteria**:
- [ ] Animation runs at 60fps
- [ ] No frame drops during animation
- [ ] CPU usage remains low (<5% increase)
- [ ] Animation pauses when tab is not visible
- [ ] No memory leaks on long animation duration
- [ ] Works smoothly with 100+ messages in chat

### 2.5 Scroll Behavior

#### FR-2.5.1: Auto-Scroll on Appearance
**Priority**: High
**Description**: When the typing indicator appears, the chat shall auto-scroll to display it.

**Acceptance Criteria**:
- [ ] Chat scrolls to bottom when indicator is added
- [ ] Smooth scroll animation (300ms duration)
- [ ] Scroll behavior respects user's scroll position preferences
- [ ] If user is scrolled up >200px, show "New message" indicator instead of forcing scroll
- [ ] Scroll completes before indicator animation starts

#### FR-2.5.2: Scroll State Preservation
**Priority**: Medium
**Description**: User scroll position shall be respected during indicator lifecycle.

**Acceptance Criteria**:
- [ ] If user scrolls up while indicator is visible, position is maintained
- [ ] Indicator removal doesn't cause unwanted scroll
- [ ] Adding actual response message triggers auto-scroll
- [ ] Scroll behavior is consistent across browsers

**User Scenarios**:
- User at bottom → Indicator appears → Stay at bottom (auto-scroll)
- User scrolled up 100px → Indicator appears → Show notification badge
- User at bottom → Response arrives → Stay at bottom (replace indicator)

## 3. Non-Functional Requirements

### 3.1 Performance

#### NFR-3.1.1: Render Performance
**Category**: Performance
**Description**: The typing indicator shall render and animate without degrading chat performance.

**Measurement**:
- [ ] Time to add indicator to DOM: <16ms (1 frame)
- [ ] Animation frame rate: 60fps sustained
- [ ] Memory footprint: <500KB
- [ ] No forced reflows/repaints on other messages

**Validation**:
```javascript
// Performance test
const start = performance.now();
addTypingIndicator();
const renderTime = performance.now() - start;
expect(renderTime).toBeLessThan(16);
```

#### NFR-3.1.2: State Update Performance
**Category**: Performance
**Description**: Adding/removing the typing indicator shall not cause expensive re-renders.

**Measurement**:
- [ ] React re-renders: Only affected components update
- [ ] State update time: <10ms
- [ ] No full chat history re-render
- [ ] Virtual scrolling (if applicable) remains performant

### 3.2 Accessibility

#### NFR-3.2.1: Screen Reader Support
**Category**: Accessibility
**Description**: The typing indicator shall be accessible to screen reader users.

**Requirements**:
- [ ] ARIA live region announces "Avi is thinking"
- [ ] Indicator has role="status"
- [ ] Animation is announced only once (not continuously)
- [ ] Response arrival is announced: "Avi responded"

**Implementation**:
```tsx
<div
  role="status"
  aria-live="polite"
  aria-label="Avi is thinking"
>
  <AviTypingIndicator />
</div>
```

#### NFR-3.2.2: Reduced Motion Support
**Category**: Accessibility
**Description**: The typing indicator shall respect user's reduced motion preferences.

**Requirements**:
- [ ] Detect `prefers-reduced-motion: reduce`
- [ ] Show static "Avi" text instead of animation
- [ ] Maintain visibility and positioning
- [ ] Smooth fade-in/out (if motion allowed)

**CSS Implementation**:
```css
@media (prefers-reduced-motion: reduce) {
  .avi-typing-indicator {
    animation: none;
  }
}
```

#### NFR-3.2.3: Keyboard Navigation
**Category**: Accessibility
**Description**: The typing indicator shall not interfere with keyboard navigation.

**Requirements**:
- [ ] Indicator is not focusable
- [ ] Focus remains on input field when indicator appears
- [ ] Focus management works correctly when indicator is removed
- [ ] Tab order is not affected

### 3.3 Browser Compatibility

#### NFR-3.3.1: Cross-Browser Support
**Category**: Compatibility
**Description**: The typing indicator shall work consistently across modern browsers.

**Supported Browsers**:
- [ ] Chrome/Edge 90+
- [ ] Firefox 88+
- [ ] Safari 14+
- [ ] Mobile Safari (iOS 14+)
- [ ] Chrome Mobile (Android 90+)

**Testing Matrix**:
| Browser | Version | Animation | Positioning | Scroll |
|---------|---------|-----------|-------------|--------|
| Chrome  | 90+     | Pass      | Pass        | Pass   |
| Firefox | 88+     | Pass      | Pass        | Pass   |
| Safari  | 14+     | Pass      | Pass        | Pass   |

### 3.4 Responsiveness

#### NFR-3.4.1: Mobile Responsiveness
**Category**: Design
**Description**: The typing indicator shall display correctly on mobile devices.

**Requirements**:
- [ ] Scales appropriately on small screens
- [ ] Touch scrolling works smoothly
- [ ] Indicator doesn't overflow viewport
- [ ] Animation performance on mobile (60fps)
- [ ] Works on iOS and Android

**Breakpoints**:
- Desktop: 1024px+
- Tablet: 768px - 1023px
- Mobile: < 768px

## 4. Technical Specifications

### 4.1 Component Architecture

```typescript
// Type definitions
interface Message {
  id: string;
  content: string | JSX.Element;
  sender: 'user' | 'avi';
  timestamp: Date;
  isTyping?: boolean;
  metadata?: Record<string, any>;
}

interface ChatState {
  chatHistory: Message[];
  isSubmitting: boolean;
  typingTimeoutId: NodeJS.Timeout | null;
}

// Component structure
<ChatContainer>
  <ChatHistory>
    {chatHistory.map(message => (
      message.isTyping ? (
        <AviTypingMessage key={message.id}>
          <AviAvatar />
          <MessageBubble>
            <AviTypingIndicator color="#6B7280" />
          </MessageBubble>
        </AviTypingMessage>
      ) : (
        <RegularMessage key={message.id}>
          {/* Standard message rendering */}
        </RegularMessage>
      )
    ))}
  </ChatHistory>
  <ChatInput />
</ChatContainer>
```

### 4.2 State Management Flow

```typescript
// Adding typing indicator
function addTypingIndicator() {
  const typingMessage: Message = {
    id: `typing-${Date.now()}`,
    content: <AviTypingIndicator />,
    sender: 'avi',
    timestamp: new Date(),
    isTyping: true,
  };

  setChatHistory(prev => [...prev, typingMessage]);
  scrollToBottom();

  // Set timeout
  const timeoutId = setTimeout(() => {
    removeTypingIndicator();
    showError("Request timed out");
  }, 90000);

  setTypingTimeoutId(timeoutId);
}

// Removing typing indicator
function removeTypingIndicator() {
  if (typingTimeoutId) {
    clearTimeout(typingTimeoutId);
    setTypingTimeoutId(null);
  }

  setChatHistory(prev => prev.filter(msg => !msg.isTyping));
}

// Handling response
function handleAviResponse(response: string) {
  removeTypingIndicator();

  const responseMessage: Message = {
    id: `avi-${Date.now()}`,
    content: response,
    sender: 'avi',
    timestamp: new Date(),
  };

  setChatHistory(prev => [...prev, responseMessage]);
  scrollToBottom();
}
```

### 4.3 Animation Implementation

```typescript
// AviTypingIndicator.tsx
import { useState, useEffect } from 'react';

interface Props {
  color?: string;
}

const ANIMATION_FRAMES = [
  ['A', 'v', 'i'],
  ['Λ', 'v', 'i'],
  ['Λ', 'V', 'i'],
  ['Λ', 'V', '!'],
  ['A', 'V', '!'],
  ['A', 'v', '!'],
  ['A', 'v', 'i'],
];

export function AviTypingIndicator({ color = '#6B7280' }: Props) {
  const [frameIndex, setFrameIndex] = useState(0);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReducedMotion) return;

    const interval = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % ANIMATION_FRAMES.length);
    }, 200);

    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  const letters = ANIMATION_FRAMES[frameIndex];

  return (
    <div className="avi-typing-indicator" style={{ color }}>
      {letters.map((letter, idx) => (
        <span key={idx} className="typing-letter">
          {letter}
        </span>
      ))}
    </div>
  );
}
```

### 4.4 Styling Specifications

```css
/* Typing indicator message bubble */
.typing-indicator-message {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  max-width: 80%;
}

.typing-indicator-message .message-bubble {
  background: #FFFFFF;
  border-radius: 0.75rem;
  padding: 0.5rem 0.75rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  min-width: 60px;
}

/* Typing animation */
.avi-typing-indicator {
  display: inline-flex;
  gap: 0.1rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: #6B7280;
}

.typing-letter {
  display: inline-block;
  transition: transform 0.2s ease;
}

/* Reduced motion fallback */
@media (prefers-reduced-motion: reduce) {
  .avi-typing-indicator {
    animation: none;
  }

  .typing-letter {
    transition: none;
  }
}
```

### 4.5 Auto-Scroll Implementation

```typescript
function scrollToBottom(smooth = true) {
  const chatContainer = chatContainerRef.current;
  if (!chatContainer) return;

  chatContainer.scrollTo({
    top: chatContainer.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto',
  });
}

// Check if user is near bottom
function isNearBottom(threshold = 200) {
  const chatContainer = chatContainerRef.current;
  if (!chatContainer) return true;

  const { scrollTop, scrollHeight, clientHeight } = chatContainer;
  return scrollHeight - scrollTop - clientHeight < threshold;
}

// Conditional auto-scroll
function handleTypingIndicatorAdded() {
  if (isNearBottom()) {
    scrollToBottom();
  } else {
    // Show "new message" badge instead
    setShowNewMessageBadge(true);
  }
}
```

## 5. Acceptance Criteria

### 5.1 Visual Acceptance

- [ ] Typing indicator uses single color (#6B7280 or #3B82F6)
- [ ] Only "Avi" letters are displayed (no "is typing..." text)
- [ ] Animation size is 0.9rem
- [ ] No text shadow, glow, or box-shadow effects
- [ ] Indicator appears in white message bubble
- [ ] Avi avatar is displayed next to bubble
- [ ] Wave animation pattern is smooth and clear

### 5.2 Functional Acceptance

- [ ] Indicator appears in chat history when message is submitted
- [ ] Indicator pushes existing messages upward
- [ ] Chat auto-scrolls to show indicator
- [ ] Indicator is removed when response arrives
- [ ] Indicator is removed on error
- [ ] Indicator times out after 90 seconds
- [ ] Only one indicator exists at a time
- [ ] Rapid submissions don't create duplicate indicators

### 5.3 Integration Acceptance

- [ ] Works with existing chat functionality
- [ ] Doesn't break message rendering
- [ ] Maintains correct message order
- [ ] Scroll behavior is natural
- [ ] No visual glitches during transitions
- [ ] Performance remains acceptable (60fps)

### 5.4 Accessibility Acceptance

- [ ] Screen readers announce "Avi is thinking"
- [ ] Reduced motion preference is respected
- [ ] Keyboard navigation is unaffected
- [ ] Focus management works correctly
- [ ] ARIA attributes are correct

## 6. Edge Cases and Error Handling

### 6.1 Edge Cases

| Scenario | Expected Behavior | Validation |
|----------|-------------------|------------|
| Empty chat history | Indicator appears as first message | Visual + Unit test |
| 100+ messages in chat | Indicator appears, no performance degradation | Performance test |
| User scrolled to top | Show notification badge, don't force scroll | Integration test |
| Multiple rapid submissions | Old indicator removed, new one added | Unit test |
| Response arrives instantly (<100ms) | Indicator removed immediately, no flash | Timing test |
| User switches tabs | Animation pauses to save resources | Browser API test |
| Mobile viewport (320px) | Indicator scales appropriately | Responsive test |
| Slow network (3G) | Indicator remains until response or timeout | Network throttle test |

### 6.2 Error Scenarios

| Error Type | Indicator Behavior | User Feedback | Recovery |
|------------|-------------------|---------------|----------|
| Network error | Remove indicator | "Network error. Try again." | Retry button |
| API 500 error | Remove indicator | "Avi encountered an error." | Retry button |
| API 429 (rate limit) | Remove indicator | "Too many requests. Wait a moment." | Disable input 30s |
| 90s timeout | Remove indicator | "Request timed out. Try again." | Retry button |
| WebSocket disconnect | Remove indicator | "Connection lost. Reconnecting..." | Auto-reconnect |

### 6.3 Timeout Handling

```typescript
const TYPING_TIMEOUT_MS = 90000;
const RETRY_COOLDOWN_MS = 30000;

function handleTimeout() {
  removeTypingIndicator();

  // Show user-friendly error
  addSystemMessage({
    type: 'error',
    content: 'Avi is taking longer than expected. Please try again.',
    actions: [
      { label: 'Retry', onClick: retryLastMessage },
      { label: 'Cancel', onClick: clearError },
    ],
  });

  // Enable retry after cooldown
  setTimeout(() => {
    setCanRetry(true);
  }, RETRY_COOLDOWN_MS);
}
```

## 7. Testing Strategy

### 7.1 Unit Tests

```typescript
describe('AviTypingIndicator', () => {
  it('renders with single color', () => {
    render(<AviTypingIndicator color="#6B7280" />);
    const letters = screen.getAllByRole('presentation');
    letters.forEach(letter => {
      expect(letter).toHaveStyle({ color: '#6B7280' });
    });
  });

  it('cycles through animation frames', async () => {
    render(<AviTypingIndicator />);
    const indicator = screen.getByTestId('typing-indicator');

    expect(indicator).toHaveTextContent('Avi');

    await waitFor(() => {
      expect(indicator).toHaveTextContent('Λvi');
    }, { timeout: 250 });
  });

  it('respects reduced motion preference', () => {
    matchMedia.mockReturnValue({ matches: true });
    render(<AviTypingIndicator />);

    const indicator = screen.getByTestId('typing-indicator');
    expect(indicator).toHaveStyle({ animation: 'none' });
  });
});

describe('Typing Indicator Lifecycle', () => {
  it('adds indicator to chat history on submission', () => {
    const { result } = renderHook(() => useChatState());

    act(() => {
      result.current.submitMessage('Hello');
    });

    const typingMessage = result.current.chatHistory.find(m => m.isTyping);
    expect(typingMessage).toBeDefined();
    expect(typingMessage?.sender).toBe('avi');
  });

  it('removes indicator when response arrives', async () => {
    const { result } = renderHook(() => useChatState());

    act(() => {
      result.current.submitMessage('Hello');
    });

    expect(result.current.chatHistory.some(m => m.isTyping)).toBe(true);

    act(() => {
      result.current.handleResponse('Hi there!');
    });

    expect(result.current.chatHistory.some(m => m.isTyping)).toBe(false);
  });

  it('removes indicator after 90s timeout', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useChatState());

    act(() => {
      result.current.submitMessage('Hello');
    });

    expect(result.current.chatHistory.some(m => m.isTyping)).toBe(true);

    act(() => {
      jest.advanceTimersByTime(90000);
    });

    expect(result.current.chatHistory.some(m => m.isTyping)).toBe(false);
    jest.useRealTimers();
  });
});
```

### 7.2 Integration Tests

```typescript
describe('Typing Indicator Integration', () => {
  it('appears in chat history when message is submitted', async () => {
    render(<ChatInterface />);

    const input = screen.getByPlaceholderText('Ask Avi...');
    const submitButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const typingIndicator = screen.getByLabelText('Avi is thinking');
      expect(typingIndicator).toBeInTheDocument();
    });
  });

  it('pushes existing messages upward', async () => {
    const { container } = render(<ChatInterface initialMessages={mockMessages} />);

    const firstMessage = screen.getByText(mockMessages[0].content);
    const initialPosition = firstMessage.getBoundingClientRect().top;

    // Submit new message to trigger typing indicator
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      const newPosition = firstMessage.getBoundingClientRect().top;
      expect(newPosition).toBeLessThan(initialPosition);
    });
  });

  it('auto-scrolls chat to show indicator', async () => {
    const { container } = render(<ChatInterface />);
    const chatContainer = container.querySelector('.chat-history');

    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      expect(scrollTop + clientHeight).toBeCloseTo(scrollHeight, 0);
    });
  });
});
```

### 7.3 E2E Tests

```typescript
describe('Typing Indicator E2E', () => {
  it('complete user flow with typing indicator', async () => {
    await page.goto('http://localhost:3000');

    // Submit message
    await page.fill('[placeholder="Ask Avi..."]', 'What is SPARC?');
    await page.click('button:has-text("Send")');

    // Verify typing indicator appears
    await expect(page.locator('[aria-label="Avi is thinking"]')).toBeVisible();

    // Verify it's in chat history
    const chatHistory = page.locator('.chat-history');
    await expect(chatHistory.locator('.typing-indicator-message')).toBeVisible();

    // Wait for response
    await expect(page.locator('[aria-label="Avi is thinking"]')).toBeHidden({ timeout: 10000 });

    // Verify response appears
    await expect(page.locator('.avi-message').last()).toContainText('SPARC');
  });

  it('handles timeout gracefully', async () => {
    // Mock slow API
    await page.route('**/api/chat', route => {
      setTimeout(() => route.continue(), 95000);
    });

    await page.goto('http://localhost:3000');
    await page.fill('[placeholder="Ask Avi..."]', 'Test');
    await page.click('button:has-text("Send")');

    // Wait for timeout (90s)
    await page.waitForTimeout(91000);

    // Verify error message
    await expect(page.locator('.error-message')).toContainText('taking longer than expected');

    // Verify indicator is removed
    await expect(page.locator('[aria-label="Avi is thinking"]')).toBeHidden();
  });
});
```

### 7.4 Accessibility Tests

```typescript
describe('Typing Indicator Accessibility', () => {
  it('announces to screen readers', async () => {
    render(<ChatInterface />);

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');

    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(liveRegion).toHaveTextContent('Avi is thinking');
    });
  });

  it('passes axe accessibility tests', async () => {
    const { container } = render(<ChatInterface />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### 7.5 Performance Tests

```typescript
describe('Typing Indicator Performance', () => {
  it('renders within performance budget', async () => {
    const startTime = performance.now();

    const { result } = renderHook(() => useChatState());
    act(() => {
      result.current.submitMessage('Test');
    });

    const renderTime = performance.now() - startTime;
    expect(renderTime).toBeLessThan(16); // 60fps = 16ms per frame
  });

  it('maintains 60fps animation', async () => {
    const { container } = render(<AviTypingIndicator />);

    const fps = await measureFPS(container, 1000);
    expect(fps).toBeGreaterThanOrEqual(58); // Allow 2fps variance
  });

  it('handles 100+ messages without degradation', async () => {
    const manyMessages = Array(100).fill(null).map((_, i) => ({
      id: `msg-${i}`,
      content: `Message ${i}`,
      sender: i % 2 === 0 ? 'user' : 'avi',
      timestamp: new Date(),
    }));

    const startTime = performance.now();
    render(<ChatInterface initialMessages={manyMessages} />);

    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    const renderTime = performance.now() - startTime;
    expect(renderTime).toBeLessThan(100);
  });
});
```

## 8. Implementation Checklist

### 8.1 Component Updates

- [ ] Create `AviTypingIndicator.tsx` component
- [ ] Update typing indicator to single color
- [ ] Remove "is typing..." text
- [ ] Reduce font size to 0.9rem
- [ ] Remove all glow/shadow effects
- [ ] Preserve wave animation pattern

### 8.2 State Management

- [ ] Add `isTyping` field to Message interface
- [ ] Update `submitMessage` to add typing indicator to chatHistory
- [ ] Update response handler to remove typing indicator
- [ ] Implement 90-second timeout
- [ ] Handle rapid submission edge case
- [ ] Add error recovery logic

### 8.3 Layout Changes

- [ ] Remove absolute/fixed positioning from typing indicator
- [ ] Integrate indicator into chat history rendering
- [ ] Apply Avi message bubble styling
- [ ] Ensure proper spacing and alignment
- [ ] Test message flow behavior

### 8.4 Scroll Behavior

- [ ] Implement auto-scroll on indicator appearance
- [ ] Add smooth scroll animation
- [ ] Detect user scroll position
- [ ] Show notification badge when user is scrolled up
- [ ] Test scroll behavior across browsers

### 8.5 Accessibility

- [ ] Add ARIA live region
- [ ] Implement screen reader announcements
- [ ] Add reduced motion support
- [ ] Ensure keyboard navigation works
- [ ] Run accessibility audit

### 8.6 Testing

- [ ] Write unit tests for typing indicator component
- [ ] Write unit tests for lifecycle management
- [ ] Write integration tests for chat flow
- [ ] Write E2E tests for user scenarios
- [ ] Write performance tests
- [ ] Write accessibility tests

### 8.7 Documentation

- [ ] Update component documentation
- [ ] Add code comments
- [ ] Document state management flow
- [ ] Create troubleshooting guide
- [ ] Update user-facing documentation

## 9. Success Metrics

### 9.1 User Experience Metrics

- **Visual Integration**: 95% of users in testing report indicator feels "natural" and "integrated"
- **Clarity**: 100% of users understand that Avi is processing their message
- **Smoothness**: No reported visual glitches or jarring transitions
- **Response Time Perception**: Users perceive wait time as acceptable

### 9.2 Technical Metrics

- **Performance**: 60fps animation, <16ms render time
- **Accessibility**: 100% WCAG 2.1 AA compliance
- **Browser Support**: Works in 99% of target browsers
- **Error Rate**: <0.1% of typing indicators result in orphaned state

### 9.3 Success Criteria Summary

The implementation is considered successful when:

1. Visual design matches specifications (single color, minimal effects)
2. Indicator appears seamlessly in chat history
3. Messages flow naturally when indicator appears/disappears
4. All edge cases are handled gracefully
5. Performance meets targets (60fps, <16ms render)
6. Accessibility tests pass (WCAG 2.1 AA)
7. All automated tests pass (unit, integration, E2E)
8. User testing validates improved UX

## 10. Rollout Plan

### 10.1 Development Phases

**Phase 1: Core Implementation (Week 1)**
- Implement typing indicator component with single color
- Update state management for chat history integration
- Basic positioning and styling

**Phase 2: Animation & Polish (Week 1-2)**
- Implement wave animation with single color
- Add smooth transitions
- Implement auto-scroll behavior
- Handle edge cases

**Phase 3: Accessibility & Testing (Week 2)**
- Add ARIA attributes and screen reader support
- Implement reduced motion support
- Write comprehensive test suite
- Performance optimization

**Phase 4: QA & Refinement (Week 2-3)**
- Cross-browser testing
- Mobile device testing
- User acceptance testing
- Bug fixes and refinements

### 10.2 Testing Gates

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Accessibility audit passes
- [ ] Performance benchmarks met
- [ ] Cross-browser testing complete
- [ ] User acceptance testing complete

### 10.3 Deployment Strategy

1. **Feature Flag**: Deploy behind feature flag for gradual rollout
2. **Internal Testing**: Enable for internal users first
3. **Beta Testing**: Roll out to 10% of users
4. **Monitoring**: Monitor error rates, performance metrics
5. **Full Rollout**: Enable for 100% of users
6. **Cleanup**: Remove old typing indicator code

## 11. Maintenance & Monitoring

### 11.1 Monitoring

- **Error Tracking**: Monitor timeout rates, orphaned indicators
- **Performance**: Track render times, animation FPS
- **User Feedback**: Collect UX feedback through surveys
- **Analytics**: Track typing indicator appearance/removal patterns

### 11.2 Maintenance

- **Regular Reviews**: Quarterly review of error rates and performance
- **User Feedback**: Monthly review of user feedback
- **Browser Updates**: Test with new browser releases
- **Dependency Updates**: Keep animation libraries up to date

---

## Appendix

### A. Color Specifications

```
Primary Option (Neutral):
- Hex: #6B7280
- RGB: rgb(107, 114, 128)
- Name: Gray-500

Secondary Option (Brand):
- Hex: #3B82F6
- RGB: rgb(59, 130, 246)
- Name: Blue-500
```

### B. Animation Timing

```
Wave Cycle Duration: 1400ms (7 frames × 200ms)
Frame Duration: 200ms
Smooth Scroll Duration: 300ms
Fade Transition: 150ms
```

### C. Breakpoints

```
Mobile: 0-767px
Tablet: 768px-1023px
Desktop: 1024px+
```

### D. Z-Index Hierarchy

```
Chat Input: 10
Typing Indicator: (auto - part of flow)
Messages: (auto - part of flow)
Overlay: 100
```

---

**Document Version**: 1.0
**Created**: 2025-10-01
**Status**: Draft
**Owner**: SPARC Specification Agent
**Reviewers**: Development Team, UX Team, Accessibility Team
