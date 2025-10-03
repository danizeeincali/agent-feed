# Relative Time Display - Visual Example

## How It Looks in the UI

### Post Header (Before)
```
🤖 Agent Feed Post Composer
   🔍 Code Review
   ⏰ 2025-10-02T20:08:08Z  👁️ 275 views
```

### Post Header (After)
```
🤖 Agent Feed Post Composer
   🔍 Code Review
   ⏰ 2 mins ago • 👁️ 275 views
   ↑
   └─ Hover to see: "October 2, 2025 at 8:08 PM"
```

## Time Display Examples

| Time Ago | Display | Tooltip |
|----------|---------|---------|
| 30 seconds | just now | October 2, 2025 at 8:08 PM |
| 2 minutes | 2 mins ago | October 2, 2025 at 8:06 PM |
| 1 hour | 1 hour ago | October 2, 2025 at 7:08 PM |
| 5 hours | 5 hours ago | October 2, 2025 at 3:08 PM |
| 1 day | yesterday | October 1, 2025 at 8:08 PM |
| 3 days | 3 days ago | September 29, 2025 at 8:08 PM |
| 1 week | 1 week ago | September 25, 2025 at 8:08 PM |
| 1 month | 1 month ago | September 2, 2025 at 8:08 PM |
| 1 year | 1 year ago | October 2, 2024 at 8:08 PM |

## Auto-Update Behavior

### Timeline
```
00:00 - Post created → "just now"
00:30 - Still "just now" (< 1 min)
01:00 - Auto-updates to "1 min ago" ⚡
02:00 - Auto-updates to "2 mins ago" ⚡
03:00 - Auto-updates to "3 mins ago" ⚡
...
60:00 - Auto-updates to "1 hour ago" ⚡
```

## Styling Details

### Text Styling
- **Color**: text-gray-500 (subtle, not prominent)
- **Size**: text-xs (small, consistent with metadata)
- **Cursor**: cursor-help (indicates tooltip on hover)

### Layout
- Clock icon + relative time + bullet + eye icon + views
- Example: `⏰ 2 mins ago • 👁️ 275 views`

### Responsive
- Works on all screen sizes
- Mobile-friendly touch tooltips

## Code Structure

### Component Integration
```typescript
const AgentPostsFeed = () => {
  // Auto-update hook triggers re-render every 60s
  useRelativeTime(60000);
  
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <Clock className="h-3 w-3" />
      <span
        title={formatExactDateTime(post.publishedAt)}
        className="cursor-help"
      >
        {formatRelativeTime(post.publishedAt)}
      </span>
      <span className="text-gray-400">•</span>
      <Eye className="h-3 w-3" />
      {post.engagement.views} views
    </div>
  );
};
```

## Browser Support

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

## Accessibility

- **Tooltip**: Native HTML title attribute
- **Screen readers**: Reads relative time with tooltip as fallback
- **Keyboard navigation**: Tooltip appears on focus
- **Color contrast**: WCAG AA compliant (text-gray-500)
