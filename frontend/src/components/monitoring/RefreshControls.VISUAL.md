# RefreshControls Component - Visual Reference

## Component Preview

### Desktop Layout (Auto-refresh OFF)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  Auto-refresh: [○────] OFF    [⟳ Refresh]    Updated: 30s ago             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Desktop Layout (Auto-refresh ON)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  Auto-refresh: [──●──] ON    [10s ▼]    [⟳ Refresh]    Updated: 5s ago   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Desktop Layout (Refreshing)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  Auto-refresh: [──●──] ON    [10s ▼]    [↻ Refresh]    Updated: 0s ago   │
│                                                     (spinning animation)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (Stacked)
```
┌───────────────────────────────────┐
│                                   │
│  Auto-refresh: [──●──] ON        │
│                                   │
│  [10s ▼]                         │
│                                   │
│  [⟳ Refresh]                     │
│                                   │
│  Updated: 15s ago                │
│                                   │
└───────────────────────────────────┘
```

---

## Color Scheme

### Light Mode

**Auto-Refresh Toggle:**
- OFF: Gray background (`bg-gray-300`)
- ON: Green background (`bg-green-600`)
- Knob: White (`bg-white`)

**Refresh Button:**
- Background: Blue (`bg-blue-600`)
- Hover: Darker blue (`hover:bg-blue-700`)
- Text: White

**Text:**
- Labels: Dark gray (`text-gray-700`)
- Last updated: Medium gray (`text-gray-600`)
- ON indicator: Green (`text-green-600`)
- OFF indicator: Gray (`text-gray-500`)

### Dark Mode

**Auto-Refresh Toggle:**
- OFF: Dark gray background (`dark:bg-gray-600`)
- ON: Lighter green background (`dark:bg-green-500`)
- Knob: White (`bg-white`)

**Refresh Button:**
- Background: Lighter blue (`dark:bg-blue-500`)
- Hover: Darker blue (`dark:hover:bg-blue-600`)
- Text: White

**Text:**
- Labels: Light gray (`dark:text-gray-300`)
- Last updated: Medium gray (`dark:text-gray-400`)
- ON indicator: Light green (`dark:text-green-400`)
- OFF indicator: Gray (`dark:text-gray-400`)

---

## Component States

### 1. Default State (Auto-refresh OFF)
```
┌───────────────────────────────────────────────────────────────┐
│ Auto-refresh: [○────] OFF  [⟳ Refresh]  Updated: 2m ago     │
└───────────────────────────────────────────────────────────────┘
```
- Toggle switch on the left (OFF position)
- No interval selector visible
- Refresh button enabled
- Last updated shows relative time

### 2. Auto-refresh ON
```
┌────────────────────────────────────────────────────────────────────┐
│ Auto-refresh: [──●──] ON  [30s ▼]  [⟳ Refresh]  Updated: 10s ago │
└────────────────────────────────────────────────────────────────────┘
```
- Toggle switch to the right (ON position)
- Green indicator
- Interval selector visible
- Refresh button still enabled for manual refresh

### 3. Refreshing State
```
┌────────────────────────────────────────────────────────────────────┐
│ Auto-refresh: [──●──] ON  [10s ▼]  [↻ Refresh]  Updated: 0s ago  │
└────────────────────────────────────────────────────────────────────┘
```
- Refresh icon spinning
- Button disabled (slightly faded)
- Last updated shows "0s ago"
- Toggle still interactive

### 4. Never Updated
```
┌────────────────────────────────────────────────────────────┐
│ Auto-refresh: [○────] OFF  [⟳ Refresh]  Updated: Never   │
└────────────────────────────────────────────────────────────┘
```
- Shows "Never" when lastUpdated is null
- All controls still interactive

### 5. Without Interval Selector
```
┌─────────────────────────────────────────────────────────┐
│ Auto-refresh: [──●──] ON  [⟳ Refresh]  Updated: 5s ago │
└─────────────────────────────────────────────────────────┘
```
- Interval selector hidden when onIntervalChange not provided
- Toggle still functional

---

## Interval Selector Options

When expanded:

```
┌──────────┐
│   5s     │ ← Very fast refresh
├──────────┤
│  10s     │ ← Default/Recommended
├──────────┤
│  30s     │ ← Moderate
├──────────┤
│   1m     │ ← Slow
├──────────┤
│   5m     │ ← Very slow
└──────────┘
```

---

## Interactive Elements

### 1. Toggle Switch
```
OFF State:           ON State:
┌─────────┐         ┌─────────┐
│○────────│         │────────○│
└─────────┘         └─────────┘
Gray BG             Green BG
```
- Click anywhere to toggle
- Keyboard: Space or Enter
- Visual feedback on hover
- Animated transition

### 2. Interval Selector
```
Normal:              Focused:              Open:
┌──────┐            ┌──────┐              ┌──────┐
│ 10s ▼│            │ 10s ▼│              │ 10s ▼│
└──────┘            └──────┘              ├──────┤
                    Blue ring             │  5s  │
                                         │ 10s  │ ← Selected
                                         │ 30s  │
                                         │  1m  │
                                         │  5m  │
                                         └──────┘
```

### 3. Refresh Button
```
Normal:              Hover:               Disabled:           Refreshing:
┌──────────┐        ┌──────────┐        ┌──────────┐        ┌──────────┐
│ ⟳ Refresh│        │ ⟳ Refresh│        │ ⟳ Refresh│        │ ↻ Refresh│
└──────────┘        └──────────┘        └──────────┘        └──────────┘
Blue BG             Darker Blue         Faded              Spinning icon
```

---

## Responsive Breakpoints

### Mobile (<640px)
```
┌─────────────────────────┐
│ Auto-refresh: [○──] OFF │  ← Full width
│                         │
│ [⟳ Refresh]            │  ← Full width button
│                         │
│ Updated: 30s ago       │  ← Full width text
└─────────────────────────┘
```
- Vertical stack
- Full width elements
- Larger touch targets

### Tablet (640px - 1024px)
```
┌───────────────────────────────────────────────┐
│ Auto-refresh: [○──] OFF  [⟳ Refresh]  30s ago│
└───────────────────────────────────────────────┘
```
- Horizontal layout
- Comfortable spacing

### Desktop (>1024px)
```
┌──────────────────────────────────────────────────────────────┐
│ Auto-refresh: [──●──] ON  [10s ▼]  [⟳ Refresh]  Updated: 5s ago │
└──────────────────────────────────────────────────────────────┘
```
- Full horizontal layout
- Optimal spacing
- All elements visible

---

## Accessibility Features

### Focus Indicators
```
Toggle (focused):
┌─────────────────┐
│ [──●──]        │
│  2px blue ring │
└─────────────────┘

Button (focused):
┌──────────────┐
│ ⟳ Refresh   │
│ 2px blue ring│
└──────────────┘

Select (focused):
┌─────────┐
│ 10s ▼  │
│ blue ring│
└─────────┘
```

### Screen Reader Announcements

**Toggle ON:**
> "Auto-refresh is on"

**Toggle OFF:**
> "Auto-refresh is off"

**Refreshing:**
> "Refreshing..."

**Button:**
> "Refresh data"

---

## Animation Details

### Toggle Switch
- **Duration:** 200ms
- **Easing:** Ease-in-out
- **Property:** Transform (translateX)

### Refresh Icon
- **Animation:** Spin
- **Duration:** 1s
- **Easing:** Linear
- **Repeat:** Infinite (while refreshing)

### Hover Effects
- **Duration:** 150ms
- **Easing:** Ease
- **Properties:** Background color, shadow

---

## Integration Example in Dashboard

```
┌───────────────────────────────────────────────────────────────────┐
│  System Dashboard                          [Controls →]          │
│  Real-time health metrics and alerts                             │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Auto-refresh: [──●──] ON  [10s ▼]  [⟳]  Updated: 5s ago │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Health Status                            │ │
│  │  ● All systems operational                                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌───────────┬───────────┬───────────┬───────────┐              │
│  │  CPU 45%  │  MEM 62%  │  DISK 78% │  NET 23%  │              │
│  └───────────┴───────────┴───────────┴───────────┘              │
└───────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
RefreshControls (wrapper div)
│
├── Toggle Container (div)
│   ├── Label ("Auto-refresh:")
│   ├── Toggle Button (button[role="switch"])
│   │   └── Knob (span)
│   └── State Label ("ON" / "OFF")
│
├── Interval Selector (conditional, div)
│   ├── Label (sr-only)
│   └── Select (select)
│       └── Options (option × 5)
│
├── Refresh Button (button)
│   ├── Icon (RefreshCw)
│   └── Text ("Refresh")
│
└── Last Updated (div)
    ├── Label ("Updated:")
    └── Time (time)
```

---

## CSS Classes Summary

### Layout Classes
- `flex flex-col sm:flex-row` - Responsive layout
- `items-center gap-3 sm:gap-4` - Spacing
- `inline-flex items-center gap-2` - Internal spacing

### Color Classes
- `bg-green-600 dark:bg-green-500` - Toggle ON
- `bg-gray-300 dark:bg-gray-600` - Toggle OFF
- `bg-blue-600 dark:bg-blue-500` - Button
- `text-gray-600 dark:text-gray-400` - Text

### Interactive Classes
- `focus:ring-2 focus:ring-offset-2` - Focus indicators
- `hover:bg-blue-700 dark:hover:bg-blue-600` - Hover states
- `disabled:opacity-50 disabled:cursor-not-allowed` - Disabled state

### Animation Classes
- `animate-spin` - Refresh icon rotation
- `transition-colors` - Color transitions
- `transition-transform` - Toggle knob movement

---

## Testing Visual States

To test all visual states:

1. **Default**: Render with `autoRefresh={false}`
2. **Auto-refresh ON**: Set `autoRefresh={true}`
3. **Refreshing**: Set `isRefreshing={true}`
4. **Never updated**: Set `lastUpdated={null}`
5. **Without interval**: Omit `onIntervalChange`
6. **Dark mode**: Add `dark` class to parent
7. **Mobile**: Resize viewport to <640px

---

## Browser Rendering

All modern browsers render consistently:
- Chrome/Edge: Perfect rendering
- Firefox: Perfect rendering
- Safari: Perfect rendering (including iOS)
- Mobile browsers: Touch-optimized

---

This visual reference helps developers and designers understand the component's appearance and behavior across different states and screen sizes.
