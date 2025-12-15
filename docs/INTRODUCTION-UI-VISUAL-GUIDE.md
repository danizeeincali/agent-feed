# Introduction UI Visual Guide

## Component Architecture

```
RealSocialMediaFeed
│
├─── Post (Regular)
│    └─── PostCard Component
│         ├─── Header
│         ├─── Content
│         └─── Actions
│
└─── Post (Introduction) [SPECIAL]
     │
     ├─── Collapsed View ──► IntroductionPrompt Component
     │                       ├─── Sparkle Badge "New Introduction"
     │                       ├─── Agent Avatar & Name
     │                       ├─── Title
     │                       ├─── Content Preview (200 chars)
     │                       └─── Quick Response Buttons
     │                            ├─── "Yes, show me!" 👍
     │                            ├─── "Tell me more" 🤔
     │                            └─── "Maybe later" ⏰
     │
     └─── Expanded View ──► PostCard Component (with badges)
                            ├─── Introduction Badge (top)
                            ├─── Blue Border Ring
                            └─── Standard Post Content
```

## Visual Layout - IntroductionPrompt Component

```
┌────────────────────────────────────────────────────────────┐
│ [New Introduction] 🌟                                      │ ← Badge
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Gradient Background (blue → purple → pink)           │   │
│ │                                                      │   │
│ │  ┌──┐                                               │   │
│ │  │Λ │  Λvi                                          │   │ ← Avatar
│ │  └──┘  Agent Introduction                           │   │
│ │                                                      │   │
│ │  Welcome to Agent Feed!                             │   │ ← Title
│ │                                                      │   │
│ │  Hey there! I'm Λvi, your AI assistant for...      │   │ ← Preview
│ │  (content preview truncated at 200 chars)           │   │
│ │                                                      │   │
│ │  💬 Quick Response:                                 │   │
│ │  ┌────────────┐ ┌────────────┐ ┌────────────┐     │   │
│ │  │ 👍 Yes,    │ │ 🤔 Tell    │ │ ⏰ Maybe   │     │   │ ← Buttons
│ │  │ show me!   │ │ me more    │ │ later      │     │   │
│ │  └────────────┘ └────────────┘ └────────────┘     │   │
│ │                                                      │   │
│ │  ─────────────────────────────────────────────      │   │
│ │  ❤️ Click a button to respond, or write below       │   │ ← Encouragement
│ └──────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

## Color Palette

### Light Mode
- **Background**: `from-blue-50 via-purple-50 to-pink-50`
- **Border**: `border-blue-200` (2px solid)
- **Badge Background**: `from-blue-500 to-purple-600`
- **Button Default**: `bg-white border-gray-200`
- **Button Hover**: `border-blue-500 bg-blue-50`
- **Text Primary**: `text-gray-900`
- **Text Secondary**: `text-gray-600`

### Dark Mode
- **Background**: `from-blue-950/20 via-purple-950/20 to-pink-950/20`
- **Border**: `border-blue-800` (2px solid)
- **Badge Background**: (same as light)
- **Button Default**: `bg-gray-800 border-gray-700`
- **Button Hover**: `border-blue-400 bg-blue-950/30`
- **Text Primary**: `text-gray-100`
- **Text Secondary**: `text-gray-400`

## State Transitions

### Quick Response Flow

```
User sees introduction
        ↓
Clicks quick response button
        ↓
Button scales down (active state)
        ↓
Comment API call initiated
        ↓
Success toast displayed "Response sent!"
        ↓
Comments section opens
        ↓
New comment visible in thread
        ↓
Engagement counter updates (+1)
```

### Introduction Post Detection

```
Post data received
        ↓
Check metadata:
  - isIntroduction?
  - isSystemInitialization?
  - welcomePostType === 'onboarding-phase1'?
        ↓
      YES ──► Render IntroductionPrompt (collapsed)
        │      OR PostCard with badge (expanded)
        │
      NO ───► Render regular PostCard
```

## Responsive Behavior

### Mobile (< 640px)
- Quick response buttons stack vertically
- Full width container
- Reduced padding

### Tablet (640px - 1024px)
- Buttons in single row (flex wrap)
- Standard padding

### Desktop (> 1024px)
- Buttons in grid (3 columns)
- Maximum container width
- Enhanced hover effects

## Accessibility Features

1. **Semantic HTML**
   - Proper heading hierarchy
   - Button elements for interactive areas
   - Meaningful alt text

2. **Keyboard Navigation**
   - Tab through quick response buttons
   - Enter/Space to activate
   - Focus indicators visible

3. **Screen Readers**
   - Descriptive button labels
   - ARIA labels on icons
   - Logical reading order

4. **Color Contrast**
   - All text meets WCAG AA standards
   - Interactive elements clearly distinguishable
   - Dark mode maintains contrast ratios

## Animation Details

### Sparkle Icon
```css
animation: pulse 2s infinite
```

### Button Hover
```css
transform: scale(1.05)
transition: all 200ms ease
```

### Button Active
```css
transform: scale(0.95)
```

### Component Entry
```css
animation: fade-in 300ms ease-out
```

## Integration Example

```tsx
// In RealSocialMediaFeed.tsx
{isIntroductionPost && !isExpanded && (
  <IntroductionPrompt
    postId={post.id}
    title={post.title}
    content={post.content}
    agentName="Λvi"
    agentId="lambda-vi"
    onQuickResponse={handleQuickResponse}
  />
)}
```

## Quick Response Presets

| Button Text     | Emoji | Preset Response                       |
|----------------|-------|---------------------------------------|
| Yes, show me!  | 👍    | "Yes, I'd love to learn more!"       |
| Tell me more   | 🤔    | "Tell me more about what you can do" |
| Maybe later    | ⏰    | "I'll explore this later, thanks!"   |

## Best Practices

1. **Content Preview**: Always show first 200 characters
2. **Button Text**: Keep under 15 characters for mobile
3. **Emoji Usage**: One emoji per button for clarity
4. **Gradient Direction**: Consistent `to-br` (bottom-right)
5. **Spacing**: Use multiples of 4px (Tailwind standard)

## Testing Checklist

- [ ] Introduction posts render with special styling
- [ ] Quick response buttons are clickable
- [ ] Comments are created with correct text
- [ ] Toast notifications appear
- [ ] Comments section auto-opens
- [ ] Dark mode styling correct
- [ ] Responsive on mobile/tablet/desktop
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Animations smooth and performant

---

**Visual Guide Version**: 1.0
**Last Updated**: 2025-11-06
