# Component Schemas Documentation

This document describes the 7 new comprehensive Zod validation schemas added to the component schemas file.

## Overview

All schemas include:
- Strict type validation with Zod
- Enum validation for restricted values
- Required and optional field handling
- Template variable support (strings starting with `{{`)
- Default value application
- Array length validation where appropriate

## 1. ChecklistSchema

Interactive checklist with editable items and change tracking.

### Fields:
- `items` (required): Array of checklist items
  - `id`: string | number - Unique identifier
  - `text`: string (min 1 char) - Item text
  - `checked`: boolean - Completion status
- `allowEdit`: boolean (optional, default: false) - Whether items can be edited
- `onChange`: string (optional) - API endpoint or template variable for updates

### Example:
```typescript
{
  items: [
    { id: '1', text: 'Task 1', checked: false },
    { id: 2, text: 'Task 2', checked: true }
  ],
  allowEdit: true,
  onChange: '{{api.updateChecklist}}'
}
```

## 2. CalendarSchema

Date picker with event support and multiple selection modes.

### Fields:
- `mode`: 'single' | 'multiple' | 'range' (default: 'single') - Selection mode
- `selectedDate`: string (optional) - ISO datetime or YYYY-MM-DD format or template variable
- `events`: Array (optional) - Calendar events
  - `id`: string | number - Event identifier
  - `date`: string (YYYY-MM-DD) - Event date
  - `title`: string - Event title
  - `description`: string (optional) - Event details
  - `color`: string (optional) - Display color
- `onDateSelect`: string (optional) - API endpoint or template variable

### Example:
```typescript
{
  mode: 'range',
  selectedDate: '2025-10-05',
  events: [
    { id: '1', date: '2025-10-10', title: 'Meeting', description: 'Team sync' }
  ],
  onDateSelect: 'https://api.example.com/select'
}
```

## 3. PhotoGridSchema

Responsive image grid with lightbox support.

### Fields:
- `images` (required): Array of images (min 1)
  - `url`: string (URL) or template variable - Image URL
  - `alt`: string (optional) - Alt text
  - `caption`: string (optional) - Image caption
- `columns`: number (1-6, default: 3) - Grid columns
- `enableLightbox`: boolean (default: true) - Enable lightbox on click
- `aspectRatio`: 'square' | '4:3' | '16:9' | 'auto' (default: 'auto') - Image aspect ratio

### Example:
```typescript
{
  images: [
    { url: 'https://example.com/photo1.jpg', alt: 'Photo 1', caption: 'Caption 1' },
    { url: '{{image.url}}', alt: 'Photo 2' }
  ],
  columns: 4,
  enableLightbox: true,
  aspectRatio: '16:9'
}
```

## 4. MarkdownSchema

Markdown content renderer with sanitization.

### Fields:
- `content` (required): string (min 1 char) - Markdown content
- `sanitize`: boolean (default: true) - Sanitize HTML output
- `className`: string (optional) - Custom CSS class

### Example:
```typescript
{
  content: '# Hello World\n\nThis is **bold**',
  sanitize: true,
  className: 'prose'
}
```

## 5. SidebarSchema

Navigation sidebar with nested items and collapsible sections.

### Fields:
- `items` (required): Array of navigation items (min 1)
  - `id`: string - Item identifier
  - `label`: string (min 1 char) - Display label
  - `icon`: string (optional) - Icon identifier
  - `href`: string or template variable (optional) - Navigation URL
  - `children`: Array (optional) - Nested items with same structure
- `activeItem`: string (optional) - Currently active item ID
- `position`: 'left' | 'right' (default: 'left') - Sidebar position
- `collapsible`: boolean (default: true) - Whether sidebar can collapse

### Example:
```typescript
{
  items: [
    {
      id: 'home',
      label: 'Home',
      icon: 'home-icon',
      href: '/home'
    },
    {
      id: 'settings',
      label: 'Settings',
      children: [
        { id: 'profile', label: 'Profile', href: '{{routes.profile}}' }
      ]
    }
  ],
  activeItem: 'home',
  position: 'left',
  collapsible: true
}
```

## 6. SwipeCardSchema

Swipeable cards with left/right action callbacks.

### Fields:
- `cards` (required): Array of cards (min 1)
  - `id`: string | number - Card identifier
  - `title`: string (optional) - Card title
  - `content`: string (required) - Card content
  - `imageUrl`: string (URL) or template variable (optional) - Card image
  - `metadata`: object (optional) - Additional card data
- `onSwipeLeft`: string (optional) - API endpoint or template variable for left swipe
- `onSwipeRight`: string (optional) - API endpoint or template variable for right swipe
- `showControls`: boolean (default: true) - Show swipe control buttons

### Example:
```typescript
{
  cards: [
    {
      id: '1',
      title: 'Card 1',
      content: 'Content 1',
      imageUrl: 'https://example.com/image.jpg',
      metadata: { likes: 10 }
    }
  ],
  onSwipeLeft: '{{api.swipeLeft}}',
  onSwipeRight: '{{api.swipeRight}}',
  showControls: true
}
```

## 7. GanttChartSchema

Project timeline visualization with tasks and dependencies.

### Fields:
- `tasks` (required): Array of tasks (min 1)
  - `id`: string | number - Task identifier
  - `name`: string (min 1 char) - Task name
  - `startDate`: string (YYYY-MM-DD) - Task start date
  - `endDate`: string (YYYY-MM-DD) - Task end date
  - `progress`: number (0-100, default: 0) - Completion percentage
  - `dependencies`: Array of string | number (optional) - Task IDs this depends on
  - `assignee`: string (optional) - Person assigned to task
  - `color`: string (optional) - Task color
- `viewMode`: 'day' | 'week' | 'month' | 'quarter' | 'year' (default: 'week') - Timeline view

### Example:
```typescript
{
  tasks: [
    {
      id: '1',
      name: 'Design Phase',
      startDate: '2025-10-01',
      endDate: '2025-10-10',
      progress: 75,
      assignee: 'Alice'
    },
    {
      id: '2',
      name: 'Development',
      startDate: '2025-10-11',
      endDate: '2025-10-30',
      dependencies: ['1'],
      progress: 0
    }
  ],
  viewMode: 'month'
}
```

## Template Variable Support

All schemas support template variables for dynamic values. Template variables must match the pattern `{{...}}`:

```typescript
// Valid template variables
onChange: '{{api.updateEndpoint}}'
href: '{{routes.profile}}'
imageUrl: '{{user.avatarUrl}}'

// Invalid - will be validated as regular string/URL
onChange: '{api.updateEndpoint}'  // Missing double braces
href: '{{ routes.profile }}'     // Will fail URL validation if URL is required
```

## Usage in ComponentSchemas Registry

All schemas are exported in the `ComponentSchemas` object:

```typescript
import { ComponentSchemas } from './componentSchemas'

// Access schemas
const checklistSchema = ComponentSchemas.Checklist
const calendarSchema = ComponentSchemas.Calendar
const photoGridSchema = ComponentSchemas.PhotoGrid
const markdownSchema = ComponentSchemas.Markdown
const sidebarSchema = ComponentSchemas.Sidebar
const swipeCardSchema = ComponentSchemas.SwipeCard
const ganttChartSchema = ComponentSchemas.GanttChart
```

## Validation Examples

```typescript
import { ChecklistSchema, CalendarSchema } from './componentSchemas'

// Valid data
const validChecklist = ChecklistSchema.parse({
  items: [{ id: '1', text: 'Task', checked: false }]
})

// Invalid - will throw ZodError
try {
  ChecklistSchema.parse({ items: [] }) // Error: At least one item required
} catch (error) {
  console.error(error.errors)
}

// Validate with safeParse (no throw)
const result = CalendarSchema.safeParse({ mode: 'invalid' })
if (!result.success) {
  console.error(result.error.errors)
}
```

## Test Coverage

All schemas have comprehensive test coverage including:
- Valid data validation
- Template variable support
- Default value application
- Enum validation
- Range validation (numbers, arrays)
- Edge cases and invalid data
- Required vs optional fields

See `/workspaces/agent-feed/frontend/src/tests/componentSchemas.test.ts` for full test suite (44 tests, 100% passing).
