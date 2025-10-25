# TicketStatusBadge Component

A React component for displaying ticket status on posts with visual indicators, icons, and accessibility features.

## Features

- **Status Types**: pending, processing, completed, failed
- **Visual Indicators**: Color-coded backgrounds and borders
- **Icons**: Lucide React icons (NO emojis)
  - Clock (pending)
  - Loader2 with spin animation (processing)
  - CheckCircle (completed)
  - XCircle (failed)
- **Agent Display**: Shows agent name(s) with smart formatting
- **Multiple Agents**: Displays "+N more" for additional agents
- **Ticket Count**: Shows badge when count > 1
- **Responsive**: Flexible sizing and layout
- **Accessible**: Full ARIA support and semantic HTML

## Installation

The component uses Lucide React icons which are already installed in the project:

```bash
npm install lucide-react  # Already installed
```

## Usage

### Basic Example

```jsx
import { TicketStatusBadge } from './components/TicketStatusBadge';

<TicketStatusBadge
  status="processing"
  agents={["link-logger-agent"]}
  count={1}
/>
```

### All Status Types

```jsx
// Pending
<TicketStatusBadge
  status="pending"
  agents={["link-logger-agent"]}
  count={1}
/>
// Renders: [Clock Icon] Waiting for link logger

// Processing
<TicketStatusBadge
  status="processing"
  agents={["link-logger-agent"]}
  count={1}
/>
// Renders: [Spinning Loader Icon] link logger analyzing...

// Completed
<TicketStatusBadge
  status="completed"
  agents={["analyzer-agent"]}
  count={1}
/>
// Renders: [Check Icon] Analyzed by analyzer

// Failed
<TicketStatusBadge
  status="failed"
  agents={["link-logger-agent"]}
  count={1}
/>
// Renders: [X Icon] Analysis failed - link logger
```

### Multiple Agents

```jsx
<TicketStatusBadge
  status="processing"
  agents={[
    "link-logger-agent",
    "analyzer-agent",
    "moderator-agent"
  ]}
  count={1}
/>
// Renders: [Spinner] link logger +2 more analyzing...
```

### Multiple Tickets

```jsx
<TicketStatusBadge
  status="pending"
  agents={["link-logger-agent"]}
  count={3}
/>
// Renders: [Clock] Waiting for link logger [3]
```

### TicketStatusList Component

For displaying multiple statuses grouped together:

```jsx
import { TicketStatusList } from './components/TicketStatusBadge';

<TicketStatusList
  tickets={[
    { status: 'processing', agent: 'link-logger-agent' },
    { status: 'completed', agent: 'analyzer-agent' },
    { status: 'pending', agent: 'moderator-agent' }
  ]}
/>
```

### In PostCard Context

```jsx
import { TicketStatusBadge } from './components/TicketStatusBadge';

<div className="post-card">
  <h3>Post Title</h3>
  <p>Post content...</p>

  <div className="post-footer">
    <TicketStatusBadge
      status="processing"
      agents={["link-logger-agent"]}
      count={1}
    />
  </div>
</div>
```

## Props

### TicketStatusBadge

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `status` | `string` | Yes | - | Status type: 'pending' \| 'processing' \| 'completed' \| 'failed' |
| `agents` | `string[]` | No | `[]` | Array of agent IDs |
| `count` | `number` | No | `1` | Total number of tickets |
| `className` | `string` | No | - | Additional CSS classes |

### TicketStatusList

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `tickets` | `Array<{status: string, agent: string}>` | Yes | - | Array of ticket objects |
| `className` | `string` | No | - | Additional CSS classes |

## Status Configuration

```javascript
const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    label: 'Waiting for'
  },
  processing: {
    icon: Loader2,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    label: 'analyzing...',
    animate: true
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-600 bg-green-50 border-green-200',
    label: 'Analyzed by'
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600 bg-red-50 border-red-200',
    label: 'Analysis failed'
  }
};
```

## Color Scheme

- **Pending**: Amber/Yellow (`text-amber-600`, `bg-amber-50`, `border-amber-200`)
- **Processing**: Blue (`text-blue-600`, `bg-blue-50`, `border-blue-200`)
- **Completed**: Green (`text-green-600`, `bg-green-50`, `border-green-200`)
- **Failed**: Red (`text-red-600`, `bg-red-50`, `border-red-200`)

## Agent Name Formatting

Agent names are automatically formatted for better readability:

- Removes `-agent` suffix: `link-logger-agent` → `link logger`
- Replaces hyphens with spaces: `my-custom-agent` → `my custom`
- Preserves simple names: `analyzer` → `analyzer`

## Accessibility Features

### ARIA Attributes

```jsx
<div
  role="status"
  aria-label="Ticket processing: link-logger-agent"
  aria-live="polite"
>
  <Icon aria-hidden="true" />
  <span>link logger analyzing...</span>
</div>
```

- **`role="status"`**: Proper semantic role for status indicators
- **`aria-live="polite"`**: Screen reader announcements on updates
- **`aria-label`**: Descriptive labels with status and agent names
- **`aria-hidden="true"` on icons**: Icons are decorative only
- **Color + Icon + Text**: Status conveyed through multiple channels

### Keyboard Navigation

The component is fully accessible via keyboard navigation when used with interactive parent elements.

## Animation

The `processing` status includes a spinning animation on the Loader2 icon:

```css
.animate-spin {
  animation: spin 1s linear infinite;
}
```

## Responsive Design

The component uses flexible sizing and proper text wrapping:

- Inline-flex layout for compact display
- Gap spacing for consistent element separation
- Text truncation prevention with proper wrapping
- Responsive padding and sizing

## Examples

### Example 1: Single Pending Ticket
```jsx
<TicketStatusBadge
  status="pending"
  agents={["link-logger-agent"]}
  count={1}
/>
```
**Renders**: 🕐 Waiting for **link logger**

### Example 2: Processing with Multiple Agents
```jsx
<TicketStatusBadge
  status="processing"
  agents={["link-logger-agent", "analyzer-agent", "moderator-agent"]}
  count={1}
/>
```
**Renders**: ⟳ **link logger** +2 more analyzing...

### Example 3: Completed Analysis
```jsx
<TicketStatusBadge
  status="completed"
  agents={["analyzer-agent"]}
  count={1}
/>
```
**Renders**: ✓ Analyzed by **analyzer**

### Example 4: Failed with Count
```jsx
<TicketStatusBadge
  status="failed"
  agents={["link-logger-agent"]}
  count={2}
/>
```
**Renders**: ✗ Analysis failed - **link logger** [2]

### Example 5: Multiple Status Groups
```jsx
<TicketStatusList
  tickets={[
    { status: 'processing', agent: 'link-logger-agent' },
    { status: 'processing', agent: 'analyzer-agent' },
    { status: 'completed', agent: 'moderator-agent' }
  ]}
/>
```
**Renders**:
- ⟳ **link logger** +1 more analyzing...
- ✓ Analyzed by **moderator**

## Testing

Run the test suite:

```bash
npm test TicketStatusBadge.test.jsx
```

View visual examples:

```jsx
import { TicketStatusBadgeExamples } from './components/__tests__/TicketStatusBadge.examples';

<TicketStatusBadgeExamples />
```

## Integration with PostCard

```jsx
import { PostCard } from './components/PostCard';
import { TicketStatusBadge } from './components/TicketStatusBadge';

// In PostCard component
<div className="post-footer">
  {post.tickets && post.tickets.length > 0 && (
    <div className="ticket-status-container">
      <TicketStatusBadge
        status={post.tickets[0].status}
        agents={post.tickets.map(t => t.agent)}
        count={post.tickets.length}
      />
    </div>
  )}
</div>
```

## Styling Customization

Add custom styles via the `className` prop:

```jsx
<TicketStatusBadge
  status="processing"
  agents={["link-logger-agent"]}
  count={1}
  className="my-4 shadow-sm hover:shadow-md"
/>
```

## Error Handling

Invalid status values are handled gracefully:

```jsx
<TicketStatusBadge
  status="invalid-status"
  agents={["agent"]}
  count={1}
/>
// Returns null and logs warning: "Invalid ticket status: invalid-status"
```

## Performance Considerations

- Lightweight component with minimal re-renders
- Icons imported from lucide-react (tree-shakeable)
- No external dependencies beyond lucide-react
- Efficient agent name formatting with memoization potential

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Full accessibility support in all browsers
- CSS animations supported in all modern browsers

## Future Enhancements

Potential future additions:
- Custom icon support
- Tooltip on hover with full agent list
- Click handlers for interactive status
- Custom color schemes
- Dark mode support
- Internationalization (i18n)

## License

Part of the Agent Feed project.

## Support

For issues or questions, please refer to the main project documentation.
