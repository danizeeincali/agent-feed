# Full-Width Avi Activity Indicator - SPARC Specification

## Objective
Extend the text box containing the Avi typing animation and streaming ticker message to take up the full width of the chat box.

## Problem Statement
**Current State**: The Avi typing indicator appears as a small inline element with limited width, making long activity messages truncate unnecessarily.

**Desired State**: The Avi activity indicator should span the full width of the chat container, allowing maximum space for activity messages before truncation at 80 characters.

## Requirements

### Functional Requirements
1. **Full-width container** - Indicator spans entire chat box width
2. **Maintain animation** - Avi wave animation continues working
3. **Activity text visibility** - Gray activity text has maximum space
4. **Responsive** - Works on all screen sizes
5. **No layout breaks** - Other messages unaffected

### Visual Requirements
```
BEFORE (current):
┌─────────────────────────────────────────────┐
│                                             │
│  [Avi animation] - Read(package.json)       │  ← Small, left-aligned
│                                             │
└─────────────────────────────────────────────┘

AFTER (desired):
┌─────────────────────────────────────────────┐
│                                             │
│ [Avi animation] - Read(package.json)        │  ← Full width
│                                             │
└─────────────────────────────────────────────┘
```

### Technical Constraints
- **No breaking changes** to existing message rendering
- **Preserve SSE integration** - Activity updates continue working
- **Maintain truncation** - 80 character limit still enforced
- **CSS-only changes preferred** - Minimize component logic changes

## Component Analysis

### Current Implementation
**File**: `/workspaces/agent-feed/frontend/src/components/AviTypingIndicator.tsx`

**Relevant Code** (lines 89-104):
```typescript
if (inline) {
  return (
    <span className={`avi-wave-text-inline ${className}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            ...style
          }}>
      <span style={{ color: currentColor, fontWeight: 600, ... }}>
        {currentFrame}
      </span>
      {activityText && activityText.trim() && (
        <span style={{ color: '#D1D5DB', ... }}>
          - {truncateActivity(activityText)}
        </span>
      )}
    </span>
  );
}
```

**Issue**: `display: 'inline-flex'` prevents full-width expansion.

### Integration Points

#### 1. EnhancedPostingInterface.tsx
**Location**: `/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx`

**Current Usage** (lines 268-276):
```typescript
const typingIndicator = {
  id: 'typing-indicator',
  content: (
    <AviTypingIndicator
      isVisible={true}
      inline={true}
      activityText={currentActivity || undefined}
    />
  ),
  sender: 'typing' as const,
  timestamp: new Date(),
};
```

#### 2. RealSocialMediaFeed.tsx
**Location**: `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx`

**Message Rendering** - Need to check how typing indicator is displayed in message list.

## Proposed Solution

### Option A: Change Display to Block (Recommended)
**Change**: `display: 'inline-flex'` → `display: 'flex'`

**Pros**:
- Simple CSS-only change
- Full-width automatically
- No component structure changes

**Cons**:
- May affect message flow if used in other contexts

### Option B: Add Full-Width Container Class
**Change**: Add `.avi-indicator-full-width` class with `width: 100%`

**Pros**:
- More explicit
- Easier to override if needed

**Cons**:
- Requires CSS file changes

### Option C: Conditional Display Based on Context
**Change**: Accept `fullWidth` prop, render as block when true

**Pros**:
- Maximum flexibility
- Backwards compatible

**Cons**:
- More complex
- Requires prop threading

## Selected Approach: Option A + Validation

**Implementation**:
1. Change `display: 'inline-flex'` to `display: 'flex'`
2. Add `width: '100%'` to ensure full expansion
3. Verify no layout breaks in message list
4. Test on mobile/tablet/desktop

## Success Criteria
✅ Indicator spans full chat width
✅ Animation continues working
✅ Activity text has maximum space
✅ Other messages render correctly
✅ Responsive on all screen sizes
✅ All tests passing
✅ E2E validation with before/after screenshots
✅ No console errors

## Test Plan

### Unit Tests
1. Component renders with `display: flex`
2. Component has `width: 100%`
3. Activity text still truncates at 80 chars
4. Animation frames cycle correctly

### Integration Tests
1. Typing indicator appears in message list
2. Full width is applied in chat context
3. SSE activity updates display correctly
4. Message list scrolling works

### E2E Tests (Playwright with Screenshots)
**Test Flow**:
1. Open Avi DM tab
2. **Screenshot 1**: Before - Current narrow indicator
3. Apply changes
4. Send message to trigger typing indicator
5. **Screenshot 2**: After - Full-width indicator
6. Compare screenshots (visual regression)
7. Verify activity text visible
8. Test on mobile viewport (375px)
9. **Screenshot 3**: Mobile full-width
10. Verify no layout overflow

## Rollback Plan
If layout breaks:
1. Revert `display` change
2. Fall back to `inline-flex` with `max-width: 100%`
3. All functionality preserved

## Non-Functional Requirements
- **Performance**: No additional rendering cost
- **Accessibility**: Screen reader text unaffected
- **Browser Support**: Works in all modern browsers
- **Mobile**: Full-width on small screens

## Implementation Checklist
- [ ] Locate AviTypingIndicator inline rendering code
- [ ] Change `display: 'inline-flex'` to `display: 'flex'`
- [ ] Add `width: '100%'` style
- [ ] Run component tests
- [ ] Run integration tests
- [ ] Run E2E tests with screenshots
- [ ] Visual comparison before/after
- [ ] Mobile testing
- [ ] Verify no console errors
- [ ] Confirm with user
