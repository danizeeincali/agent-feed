# Calendar Component

A production-ready, accessible, and feature-rich calendar component built with `react-day-picker` for dynamic agent pages.

## Features

- **Multiple Selection Modes**: Single date, multiple dates, or date range selection
- **Event Display**: Visual indicators and detailed event information
- **API Integration**: Automatic API callbacks when dates are selected
- **Template Variables**: Full support for dynamic data binding
- **Accessibility**: WCAG 2.1 AA compliant with ARIA labels and keyboard navigation
- **Mobile Optimized**: Touch-friendly with responsive design
- **Theme Integration**: Tailwind CSS styling matching the app theme

## Installation

The component is ready to use. The required dependency `react-day-picker` is already installed:

```bash
npm install react-day-picker date-fns
```

## Usage

### Basic Example

```tsx
import { Calendar } from '@/components/dynamic-page';

function MyPage() {
  return (
    <Calendar
      mode="single"
      selectedDate="2025-10-15"
    />
  );
}
```

### With Events

```tsx
<Calendar
  mode="single"
  events={[
    {
      date: '2025-10-15',
      title: 'Team Meeting',
      description: 'Weekly sync'
    },
    {
      date: '2025-10-20',
      title: 'Product Launch'
    }
  ]}
/>
```

### With API Integration

```tsx
<Calendar
  mode="range"
  onDateSelect="/api/calendar/select"
  events={calendarEvents}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `'single' \| 'multiple' \| 'range'` | `'single'` | Date selection mode |
| `selectedDate` | `string` | `undefined` | Initial selected date (ISO format: YYYY-MM-DD) |
| `events` | `Event[]` | `[]` | Array of events to display |
| `onDateSelect` | `string` | `undefined` | API endpoint to call on selection |
| `className` | `string` | `''` | Additional CSS classes |

### Event Object Structure

```typescript
interface Event {
  date: string;        // ISO format: YYYY-MM-DD
  title: string;       // Event title
  description?: string; // Optional description
}
```

## Selection Modes

### Single Date

Allows selecting one date at a time:

```tsx
<Calendar mode="single" />
```

**API Payload Example:**
```json
{
  "mode": "single",
  "selectedDate": "2025-10-15"
}
```

### Multiple Dates

Allows selecting multiple individual dates:

```tsx
<Calendar mode="multiple" />
```

**API Payload Example:**
```json
{
  "mode": "multiple",
  "selectedDates": ["2025-10-10", "2025-10-15", "2025-10-20"]
}
```

### Date Range

Allows selecting a continuous range of dates:

```tsx
<Calendar mode="range" />
```

**API Payload Example:**
```json
{
  "mode": "range",
  "from": "2025-10-10",
  "to": "2025-10-20"
}
```

## API Integration

When `onDateSelect` is provided, the component will automatically make a POST request to the specified endpoint with the selection data.

### Request Format

```typescript
// Headers
{
  'Content-Type': 'application/json'
}

// Body varies by mode (see examples above)
```

### Error Handling

The component displays error messages if the API call fails:

```tsx
<Calendar
  mode="single"
  onDateSelect="/api/calendar/select"
  // Error will be displayed in the UI if API fails
/>
```

## Template Variable Support

For dynamic pages, use template variables to populate the calendar:

### Configuration Example

```json
{
  "component": "Calendar",
  "props": {
    "mode": "{{calendar_mode}}",
    "selectedDate": "{{selected_date}}",
    "events": "{{calendar_events}}",
    "onDateSelect": "{{api_endpoint}}"
  }
}
```

### Template Data Example

```json
{
  "calendar_mode": "range",
  "selected_date": "2025-10-05",
  "api_endpoint": "/api/agents/agent-123/calendar/select",
  "calendar_events": [
    {
      "date": "2025-10-15",
      "title": "Milestone Deadline",
      "description": "Q4 deliverable due"
    }
  ]
}
```

## Accessibility

### Keyboard Navigation

- **Tab**: Navigate between interactive elements
- **Arrow Keys**: Navigate between dates
- **Enter/Space**: Select a date
- **Escape**: Close any open popovers

### Screen Reader Support

- ARIA labels for all interactive elements
- Event counts announced for dates with events
- Selection state changes announced
- Loading and error states announced

### Visual Accessibility

- High contrast mode support
- Focus visible indicators (2px outline)
- Minimum touch target size: 40x40px
- Clear visual feedback for all states

## Mobile Optimization

### Touch Support

- Larger tap targets on mobile (2.5rem)
- Touch-friendly spacing
- Smooth touch animations
- Optimized for thumb navigation

### Responsive Design

- Adapts to screen size
- Stacks on small screens
- Maintains usability across devices
- Optimized layout for portrait/landscape

## Styling

The component uses Tailwind CSS classes matching the app theme:

### Primary Colors
- `primary-50` to `primary-900` for selected states
- `gray-50` to `gray-900` for neutral elements

### Custom Styling

Add custom classes via the `className` prop:

```tsx
<Calendar
  mode="single"
  className="shadow-xl rounded-xl"
/>
```

### Override Styles

Use CSS to override specific elements:

```css
.calendar-container .rdp-day_selected {
  background-color: your-color;
}
```

## Performance

### Optimizations

- **Memoized event lookup**: Fast O(1) event retrieval
- **Efficient re-renders**: Only updates when props change
- **Lazy date parsing**: Validates dates on-demand
- **Debounced API calls**: Prevents excessive requests

### Best Practices

1. Keep event arrays reasonably sized (<1000 events)
2. Use ISO date format for consistency
3. Provide unique event titles for better UX
4. Handle API errors gracefully

## Testing

Run the component tests:

```bash
npm test Calendar.test.tsx
```

### Test Coverage

- Rendering in all modes
- Event display and indicators
- Date selection handling
- API integration
- Error states
- Accessibility features
- Mobile responsiveness
- Edge cases

## Examples

See `Calendar.example.tsx` for comprehensive examples including:

- All selection modes
- Event display
- API integration
- Template variable usage
- Accessibility features
- Mobile optimization

## Browser Support

- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Dependencies

- `react-day-picker`: ^9.11.0 - Calendar functionality
- `date-fns`: ^3.6.0 - Date manipulation
- `lucide-react`: ^0.364.0 - Icons
- `tailwindcss`: ^3.4.1 - Styling

## Troubleshooting

### Events not displaying

Ensure dates are in ISO format (YYYY-MM-DD):

```tsx
// ✅ Correct
{ date: '2025-10-15', title: 'Event' }

// ❌ Incorrect
{ date: '10/15/2025', title: 'Event' }
```

### API calls not firing

Check that `onDateSelect` is a valid URL:

```tsx
// ✅ Correct
onDateSelect="/api/calendar/select"

// ❌ Incorrect (relative path without leading /)
onDateSelect="api/calendar/select"
```

### Styling conflicts

Ensure Tailwind CSS is configured and the component imports the day-picker styles:

```tsx
import 'react-day-picker/dist/style.css';
```

## License

Part of the agent-feed project. See main project license.
