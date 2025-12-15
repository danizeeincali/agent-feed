import { describe, it, expect } from 'vitest'
import {
  ChecklistSchema,
  CalendarSchema,
  PhotoGridSchema,
  MarkdownSchema,
  SidebarSchema,
  SwipeCardSchema,
  GanttChartSchema
} from '../schemas/componentSchemas'

describe('ChecklistSchema', () => {
  it('should validate a valid checklist', () => {
    const validData = {
      items: [
        { id: '1', text: 'Task 1', checked: false },
        { id: 2, text: 'Task 2', checked: true }
      ],
      allowEdit: true,
      onChange: 'https://api.example.com/update'
    }
    expect(() => ChecklistSchema.parse(validData)).not.toThrow()
  })

  it('should validate template variables in onChange', () => {
    const validData = {
      items: [{ id: '1', text: 'Task 1', checked: false }],
      onChange: '{{api.updateEndpoint}}'
    }
    expect(() => ChecklistSchema.parse(validData)).not.toThrow()
  })

  it('should apply default values', () => {
    const data = {
      items: [{ id: '1', text: 'Task 1', checked: false }]
    }
    const result = ChecklistSchema.parse(data)
    expect(result.allowEdit).toBe(false)
  })

  it('should require at least one item', () => {
    const invalidData = {
      items: []
    }
    expect(() => ChecklistSchema.parse(invalidData)).toThrow()
  })

  it('should require item text to be non-empty', () => {
    const invalidData = {
      items: [{ id: '1', text: '', checked: false }]
    }
    expect(() => ChecklistSchema.parse(invalidData)).toThrow()
  })

  it('should accept string or number IDs', () => {
    const validData = {
      items: [
        { id: 'string-id', text: 'Task 1', checked: false },
        { id: 123, text: 'Task 2', checked: true }
      ]
    }
    expect(() => ChecklistSchema.parse(validData)).not.toThrow()
  })
})

describe('CalendarSchema', () => {
  it('should validate a valid calendar with single mode', () => {
    const validData = {
      mode: 'single' as const,
      selectedDate: '2025-10-05',
      events: [
        {
          id: '1',
          date: '2025-10-10',
          title: 'Meeting',
          description: 'Team sync',
          color: '#ff0000'
        }
      ],
      onDateSelect: 'https://api.example.com/select'
    }
    expect(() => CalendarSchema.parse(validData)).not.toThrow()
  })

  it('should validate all mode enums', () => {
    const modes = ['single', 'multiple', 'range'] as const
    modes.forEach(mode => {
      const data = { mode }
      expect(() => CalendarSchema.parse(data)).not.toThrow()
    })
  })

  it('should reject invalid mode', () => {
    const invalidData = {
      mode: 'invalid'
    }
    expect(() => CalendarSchema.parse(invalidData)).toThrow()
  })

  it('should validate datetime format', () => {
    const validData = {
      selectedDate: '2025-10-05T14:30:00Z'
    }
    expect(() => CalendarSchema.parse(validData)).not.toThrow()
  })

  it('should validate YYYY-MM-DD format', () => {
    const validData = {
      selectedDate: '2025-10-05'
    }
    expect(() => CalendarSchema.parse(validData)).not.toThrow()
  })

  it('should validate template variables in selectedDate', () => {
    const validData = {
      selectedDate: '{{user.selectedDate}}'
    }
    expect(() => CalendarSchema.parse(validData)).not.toThrow()
  })

  it('should apply default mode', () => {
    const result = CalendarSchema.parse({})
    expect(result.mode).toBe('single')
  })

  it('should require proper date format in events', () => {
    const invalidData = {
      events: [{ id: '1', date: 'invalid-date', title: 'Event' }]
    }
    expect(() => CalendarSchema.parse(invalidData)).toThrow()
  })
})

describe('PhotoGridSchema', () => {
  it('should validate a valid photo grid', () => {
    const validData = {
      images: [
        { url: 'https://example.com/image1.jpg', alt: 'Image 1', caption: 'Caption 1' },
        { url: 'https://example.com/image2.jpg', alt: 'Image 2' }
      ],
      columns: 3,
      enableLightbox: true,
      aspectRatio: '16:9' as const
    }
    expect(() => PhotoGridSchema.parse(validData)).not.toThrow()
  })

  it('should validate template variables in image URLs', () => {
    const validData = {
      images: [{ url: '{{image.url}}' }]
    }
    expect(() => PhotoGridSchema.parse(validData)).not.toThrow()
  })

  it('should validate all aspectRatio enums', () => {
    const ratios = ['square', '4:3', '16:9', 'auto'] as const
    ratios.forEach(aspectRatio => {
      const data = {
        images: [{ url: 'https://example.com/img.jpg' }],
        aspectRatio
      }
      expect(() => PhotoGridSchema.parse(data)).not.toThrow()
    })
  })

  it('should apply default values', () => {
    const data = {
      images: [{ url: 'https://example.com/img.jpg' }]
    }
    const result = PhotoGridSchema.parse(data)
    expect(result.columns).toBe(3)
    expect(result.enableLightbox).toBe(true)
    expect(result.aspectRatio).toBe('auto')
  })

  it('should validate columns range 1-6', () => {
    expect(() => PhotoGridSchema.parse({
      images: [{ url: 'https://example.com/img.jpg' }],
      columns: 0
    })).toThrow()

    expect(() => PhotoGridSchema.parse({
      images: [{ url: 'https://example.com/img.jpg' }],
      columns: 7
    })).toThrow()

    expect(() => PhotoGridSchema.parse({
      images: [{ url: 'https://example.com/img.jpg' }],
      columns: 6
    })).not.toThrow()
  })

  it('should require at least one image', () => {
    const invalidData = {
      images: []
    }
    expect(() => PhotoGridSchema.parse(invalidData)).toThrow()
  })
})

describe('MarkdownSchema', () => {
  it('should validate a valid markdown schema', () => {
    const validData = {
      content: '# Hello World\n\nThis is **bold**',
      sanitize: true,
      className: 'custom-markdown'
    }
    expect(() => MarkdownSchema.parse(validData)).not.toThrow()
  })

  it('should apply default sanitize value', () => {
    const data = {
      content: '# Test'
    }
    const result = MarkdownSchema.parse(data)
    expect(result.sanitize).toBe(true)
  })

  it('should require non-empty content', () => {
    const invalidData = {
      content: ''
    }
    expect(() => MarkdownSchema.parse(invalidData)).toThrow()
  })

  it('should allow sanitize to be disabled', () => {
    const data = {
      content: '# Test',
      sanitize: false
    }
    expect(() => MarkdownSchema.parse(data)).not.toThrow()
  })
})

describe('SidebarSchema', () => {
  it('should validate a valid sidebar', () => {
    const validData = {
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
          icon: 'settings-icon',
          href: '/settings',
          children: [
            { id: 'profile', label: 'Profile', href: '/settings/profile' }
          ]
        }
      ],
      activeItem: 'home',
      position: 'left' as const,
      collapsible: true
    }
    expect(() => SidebarSchema.parse(validData)).not.toThrow()
  })

  it('should validate template variables in hrefs', () => {
    const validData = {
      items: [
        { id: 'home', label: 'Home', href: '{{routes.home}}' }
      ]
    }
    expect(() => SidebarSchema.parse(validData)).not.toThrow()
  })

  it('should validate position enums', () => {
    const positions = ['left', 'right'] as const
    positions.forEach(position => {
      const data = {
        items: [{ id: '1', label: 'Item' }],
        position
      }
      expect(() => SidebarSchema.parse(data)).not.toThrow()
    })
  })

  it('should apply default values', () => {
    const data = {
      items: [{ id: '1', label: 'Item' }]
    }
    const result = SidebarSchema.parse(data)
    expect(result.position).toBe('left')
    expect(result.collapsible).toBe(true)
  })

  it('should require at least one item', () => {
    const invalidData = {
      items: []
    }
    expect(() => SidebarSchema.parse(invalidData)).toThrow()
  })

  it('should require non-empty label', () => {
    const invalidData = {
      items: [{ id: '1', label: '' }]
    }
    expect(() => SidebarSchema.parse(invalidData)).toThrow()
  })

  it('should validate nested children items', () => {
    const validData = {
      items: [
        {
          id: 'parent',
          label: 'Parent',
          children: [
            { id: 'child1', label: 'Child 1', icon: 'icon', href: '/child1' },
            { id: 'child2', label: 'Child 2' }
          ]
        }
      ]
    }
    expect(() => SidebarSchema.parse(validData)).not.toThrow()
  })
})

describe('SwipeCardSchema', () => {
  it('should validate a valid swipe card', () => {
    const validData = {
      cards: [
        {
          id: '1',
          title: 'Card 1',
          description: 'Content 1',
          image: 'https://example.com/image.jpg',
          metadata: { likes: 10 }
        },
        {
          id: '2',
          title: 'Card 2',
          description: 'Content 2'
        }
      ],
      onSwipeLeft: 'https://api.example.com/swipe-left',
      onSwipeRight: 'https://api.example.com/swipe-right',
      showControls: false
    }
    expect(() => SwipeCardSchema.parse(validData)).not.toThrow()
  })

  it('should validate template variables in URLs', () => {
    const validData = {
      cards: [
        {
          id: '1',
          title: 'Card Title',
          description: 'Content',
          image: '{{card.imageUrl}}'
        }
      ],
      onSwipeLeft: '{{api.swipeLeft}}',
      onSwipeRight: '{{api.swipeRight}}'
    }
    expect(() => SwipeCardSchema.parse(validData)).not.toThrow()
  })

  it('should apply default showControls', () => {
    const data = {
      cards: [{ id: '1', title: 'Card Title', description: 'Content' }]
    }
    const result = SwipeCardSchema.parse(data)
    expect(result.showControls).toBe(true)
  })

  it('should accept string IDs', () => {
    const validData = {
      cards: [
        { id: 'string-id', title: 'Card 1', description: 'Content 1' },
        { id: 'another-id', title: 'Card 2', description: 'Content 2' }
      ]
    }
    expect(() => SwipeCardSchema.parse(validData)).not.toThrow()
  })

  it('should require at least one card', () => {
    const invalidData = {
      cards: []
    }
    expect(() => SwipeCardSchema.parse(invalidData)).toThrow()
  })
})

describe('GanttChartSchema', () => {
  it('should validate a valid gantt chart', () => {
    const validData = {
      tasks: [
        {
          id: '1',
          name: 'Task 1',
          startDate: '2025-10-01',
          endDate: '2025-10-10',
          progress: 50,
          dependencies: ['2'],
          assignee: 'John Doe',
          color: '#ff0000'
        },
        {
          id: 2,
          name: 'Task 2',
          startDate: '2025-10-05',
          endDate: '2025-10-15'
        }
      ],
      viewMode: 'week' as const
    }
    expect(() => GanttChartSchema.parse(validData)).not.toThrow()
  })

  it('should validate all viewMode enums', () => {
    const viewModes = ['day', 'week', 'month', 'quarter', 'year'] as const
    viewModes.forEach(viewMode => {
      const data = {
        tasks: [
          {
            id: '1',
            name: 'Task',
            startDate: '2025-10-01',
            endDate: '2025-10-10'
          }
        ],
        viewMode
      }
      expect(() => GanttChartSchema.parse(data)).not.toThrow()
    })
  })

  it('should apply default values', () => {
    const data = {
      tasks: [
        {
          id: '1',
          name: 'Task',
          startDate: '2025-10-01',
          endDate: '2025-10-10'
        }
      ]
    }
    const result = GanttChartSchema.parse(data)
    expect(result.viewMode).toBe('week')
    expect(result.tasks[0].progress).toBe(0)
  })

  it('should require valid date format', () => {
    const invalidData = {
      tasks: [
        {
          id: '1',
          name: 'Task',
          startDate: 'invalid-date',
          endDate: '2025-10-10'
        }
      ]
    }
    expect(() => GanttChartSchema.parse(invalidData)).toThrow()
  })

  it('should validate progress range 0-100', () => {
    expect(() => GanttChartSchema.parse({
      tasks: [{
        id: '1',
        name: 'Task',
        startDate: '2025-10-01',
        endDate: '2025-10-10',
        progress: -1
      }]
    })).toThrow()

    expect(() => GanttChartSchema.parse({
      tasks: [{
        id: '1',
        name: 'Task',
        startDate: '2025-10-01',
        endDate: '2025-10-10',
        progress: 101
      }]
    })).toThrow()

    expect(() => GanttChartSchema.parse({
      tasks: [{
        id: '1',
        name: 'Task',
        startDate: '2025-10-01',
        endDate: '2025-10-10',
        progress: 100
      }]
    })).not.toThrow()
  })

  it('should require at least one task', () => {
    const invalidData = {
      tasks: []
    }
    expect(() => GanttChartSchema.parse(invalidData)).toThrow()
  })

  it('should require non-empty task name', () => {
    const invalidData = {
      tasks: [{
        id: '1',
        name: '',
        startDate: '2025-10-01',
        endDate: '2025-10-10'
      }]
    }
    expect(() => GanttChartSchema.parse(invalidData)).toThrow()
  })

  it('should accept string or number IDs in dependencies', () => {
    const validData = {
      tasks: [{
        id: '1',
        name: 'Task',
        startDate: '2025-10-01',
        endDate: '2025-10-10',
        dependencies: ['task-1', 2, 'task-3']
      }]
    }
    expect(() => GanttChartSchema.parse(validData)).not.toThrow()
  })
})
