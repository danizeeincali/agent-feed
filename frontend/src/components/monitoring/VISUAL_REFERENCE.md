# Visual Reference - MetricCard & SystemMetricsGrid

## MetricCard Layout

```
┌─────────────────────────────────────────┐
│  CPU Usage                    [🔹]      │ ← Title + Icon
│                                          │
│  45.5 %                                  │ ← Large Value + Unit
│                                          │
│  ████████░░░░░░░░░░░░                    │ ← Progress Bar
│  45.5                              100   │ ← Min/Max Labels
│                                          │
│  ✓ Normal operation                     │ ← Status Message
└─────────────────────────────────────────┘
```

### Color States

**Normal (Green)**
```
┌─────────────────────────────────────────┐
│  CPU Usage                    [🔹]      │
│  45.5 %                                  │ ← Green text
│  ████████░░░░░░░░░░░░ (green bar)        │
│  ✓ Normal operation (green)             │
└─────────────────────────────────────────┘
```

**Warning (Yellow)**
```
┌─────────────────────────────────────────┐
│  CPU Usage                    [🔹]      │
│  75.0 %                                  │ ← Yellow text
│  ███████████████░░░░░ (yellow bar)       │
│  ⚡ Warning threshold reached (yellow)   │
└─────────────────────────────────────────┘
```

**Critical (Red)**
```
┌─────────────────────────────────────────┐
│  CPU Usage                    [🔹]      │
│  95.0 %                                  │ ← Red text
│  ███████████████████░ (red bar)          │
│  ⚠ Critical threshold exceeded (red)    │
└─────────────────────────────────────────┘
```

### Loading State
```
┌─────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓░░░░░░░░░░░░                    │ ← Skeleton
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░              │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░              │
└─────────────────────────────────────────┘
```

## SystemMetricsGrid Layout

### Desktop (3 columns)
```
┌──────────────────┬──────────────────┬──────────────────┐
│  CPU Usage       │  Memory Usage    │  Active Workers  │
│  [🔹]            │  [💾]            │  [👥]            │
│  45.5 %          │  62.8 %          │  12.0 workers    │
│  ████████░░░     │  ████████████░   │                  │
│  ✓ Normal        │  ✓ Normal        │                  │
├──────────────────┼──────────────────┼──────────────────┤
│  Queue Length    │  Request Rate    │  Error Rate      │
│  [📋]            │  [📊]            │  [⚠️]            │
│  8.0 items       │  45.2 req/s      │  0.5 %           │
│                  │                  │  █░░░░░░░░░      │
│                  │                  │  ✓ Normal        │
└──────────────────┴──────────────────┴──────────────────┘
                Last updated: 2024-10-12 10:30:00
```

### Tablet (2 columns)
```
┌──────────────────────────┬──────────────────────────┐
│  CPU Usage               │  Memory Usage            │
│  [🔹]                    │  [💾]                    │
│  45.5 %                  │  62.8 %                  │
│  ████████░░░             │  ████████████░           │
├──────────────────────────┼──────────────────────────┤
│  Active Workers          │  Queue Length            │
│  [👥]                    │  [📋]                    │
│  12.0 workers            │  8.0 items               │
├──────────────────────────┼──────────────────────────┤
│  Request Rate            │  Error Rate              │
│  [📊]                    │  [⚠️]                    │
│  45.2 req/s              │  0.5 %                   │
└──────────────────────────┴──────────────────────────┘
```

### Mobile (1 column)
```
┌───────────────────────────────────────────────┐
│  CPU Usage                          [🔹]     │
│  45.5 %                                       │
│  ████████░░░░░░░░░░░░                        │
├───────────────────────────────────────────────┤
│  Memory Usage                       [💾]     │
│  62.8 %                                       │
│  ████████████░░░░░░░                         │
├───────────────────────────────────────────────┤
│  Active Workers                     [👥]     │
│  12.0 workers                                 │
├───────────────────────────────────────────────┤
│  Queue Length                       [📋]     │
│  8.0 items                                    │
├───────────────────────────────────────────────┤
│  Request Rate                       [📊]     │
│  45.2 req/s                                   │
├───────────────────────────────────────────────┤
│  Error Rate                         [⚠️]     │
│  0.5 %                                        │
│  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░            │
└───────────────────────────────────────────────┘
```

## Empty State
```
┌───────────────────────────────────────────────┐
│                                               │
│                    [⚠️]                       │
│          (large warning icon)                 │
│                                               │
│         No metrics data available             │
│   System metrics will appear here once        │
│              available                         │
│                                               │
└───────────────────────────────────────────────┘
```

## Loading State
```
┌──────────────────┬──────────────────┬──────────────────┐
│  ▓▓▓▓▓░░░░░░    │  ▓▓▓▓▓░░░░░░    │  ▓▓▓▓▓░░░░░░    │
│  ▓▓▓▓▓▓▓▓▓▓▓    │  ▓▓▓▓▓▓▓▓▓▓▓    │  ▓▓▓▓▓▓▓▓▓▓▓    │
│  ▓▓▓▓▓▓▓▓░░░    │  ▓▓▓▓▓▓▓▓░░░    │  ▓▓▓▓▓▓▓▓░░░    │
├──────────────────┼──────────────────┼──────────────────┤
│  ▓▓▓▓▓░░░░░░    │  ▓▓▓▓▓░░░░░░    │  ▓▓▓▓▓░░░░░░    │
│  ▓▓▓▓▓▓▓▓▓▓▓    │  ▓▓▓▓▓▓▓▓▓▓▓    │  ▓▓▓▓▓▓▓▓▓▓▓    │
│  ▓▓▓▓▓▓▓▓░░░    │  ▓▓▓▓▓▓▓▓░░░    │  ▓▓▓▓▓▓▓▓░░░    │
└──────────────────┴──────────────────┴──────────────────┘
```

## Icon Legend

- 🔹 (Cpu) - Blue - CPU Usage
- 💾 (HardDrive) - Green - Memory Usage  
- 👥 (Users) - Purple - Active Workers
- 📋 (List) - Orange - Queue Length
- 📊 (Activity) - Blue - Request Rate
- ⚠️ (AlertTriangle) - Red - Error Rate

## Color Schemes

### Light Mode
```
Background: White (#FFFFFF)
Border: Gray-200 (#E5E7EB)
Text: Gray-900 (#111827)
Icon Background: Color-50 (e.g., Blue-50)
Icon: Color-500 (e.g., Blue-500)
```

### Dark Mode
```
Background: Gray-800 (#1F2937)
Border: Gray-700 (#374151)
Text: Gray-100 (#F3F4F6)
Icon Background: Color-900/20 (e.g., Blue-900/20)
Icon: Color-400 (e.g., Blue-400)
```

## Threshold Colors

### Progress Bar
- **Green**: value < warning (0-69% for CPU)
- **Yellow**: warning <= value < critical (70-89% for CPU)
- **Red**: value >= critical (90-100% for CPU)

### Status Text
- **Green**: "✓ Normal operation"
- **Yellow**: "⚡ Warning threshold reached"
- **Red**: "⚠ Critical threshold exceeded"

## Animations

### Progress Bar
- Smooth width transition: 500ms ease-out
- Animates when value changes

### Loading Skeleton
- Pulse animation: 2s infinite
- Shimmer effect

### Hover Effect
- Card shadow transition: 200ms
- Subtle lift effect

## Spacing

- Card padding: 1.5rem (24px)
- Grid gap: 1rem (16px)
- Element margins: 0.75rem - 1rem (12-16px)
- Border radius: 0.5rem (8px)

## Typography

- **Title**: text-sm (14px), font-medium
- **Value**: text-3xl (30px), font-bold
- **Unit**: text-sm (14px)
- **Status**: text-xs (12px), font-medium
- **Timestamp**: text-xs (12px)

## Responsive Breakpoints

- **Mobile**: < 768px - 1 column
- **Tablet**: 768px - 1024px - 2 columns  
- **Desktop**: > 1024px - 3 columns

## Accessibility

- Proper heading hierarchy (h3 for titles)
- Sufficient color contrast (WCAG AA compliant)
- Keyboard navigation support
- Screen reader friendly labels
- Focus indicators on interactive elements

---

This visual reference provides a clear understanding of how the components look and behave in different states and screen sizes.
