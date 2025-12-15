import { z } from 'zod';

// Helper for validating template variables (strings starting with {{)
const templateVariableOrString = (schema) =>
  z.union([
    z.string().regex(/^\{\{.+\}\}$/),
    schema
  ]);

// Test schemas
const schemas = {
  Checklist: z.object({
    items: z.array(z.object({
      id: z.union([z.string(), z.number()]),
      text: z.string().min(1, "Item text is required"),
      checked: z.boolean()
    })).min(1, "At least one item is required"),
    allowEdit: z.boolean().optional().default(false),
    onChange: templateVariableOrString(z.string().url()).optional()
  }),

  Calendar: z.object({
    mode: z.enum(['single', 'multiple', 'range']).default('single'),
    selectedDate: z.union([
      z.string().datetime(),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      templateVariableOrString(z.string())
    ]).optional(),
    events: z.array(z.object({
      id: z.union([z.string(), z.number()]),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      title: z.string(),
      description: z.string().optional(),
      color: z.string().optional()
    })).optional(),
    onDateSelect: templateVariableOrString(z.string().url()).optional()
  }),

  PhotoGrid: z.object({
    images: z.array(z.object({
      url: templateVariableOrString(z.string().url()),
      alt: z.string().optional(),
      caption: z.string().optional()
    })).min(1, "At least one image is required"),
    columns: z.number().min(1).max(6).optional().default(3),
    enableLightbox: z.boolean().optional().default(true),
    aspectRatio: z.enum(['square', '4:3', '16:9', 'auto']).optional().default('auto')
  }),

  Markdown: z.object({
    content: z.string().min(1, "Content is required"),
    sanitize: z.boolean().optional().default(true),
    className: z.string().optional()
  }),

  Sidebar: z.object({
    items: z.array(z.object({
      id: z.string(),
      label: z.string().min(1, "Label is required"),
      icon: z.string().optional(),
      href: templateVariableOrString(z.string()).optional(),
      children: z.array(z.lazy(() => z.object({
        id: z.string(),
        label: z.string(),
        icon: z.string().optional(),
        href: templateVariableOrString(z.string()).optional()
      }))).optional()
    })).min(1, "At least one item is required"),
    activeItem: z.string().optional(),
    position: z.enum(['left', 'right']).optional().default('left'),
    collapsible: z.boolean().optional().default(true)
  }),

  SwipeCard: z.object({
    cards: z.array(z.object({
      id: z.string(),
      image: templateVariableOrString(z.string().url()).optional(),
      title: z.string().min(1, "Title is required"),
      description: z.string().optional(),
      metadata: z.record(z.any()).optional()
    })).min(1, "At least one card is required"),
    onSwipeLeft: templateVariableOrString(z.string().url()).optional(),
    onSwipeRight: templateVariableOrString(z.string().url()).optional(),
    showControls: z.boolean().optional().default(true),
    className: z.string().optional()
  }),

  GanttChart: z.object({
    tasks: z.array(z.object({
      id: z.union([z.string(), z.number()]),
      name: z.string().min(1, "Task name is required"),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
      progress: z.number().min(0).max(100).optional().default(0),
      dependencies: z.array(z.union([z.string(), z.number()])).optional(),
      assignee: z.string().optional(),
      color: z.string().optional()
    })).min(1, "At least one task is required"),
    viewMode: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional().default('week')
  })
};

// Test cases
const testCases = [
  // 1. Valid Checklist
  {
    name: 'Valid Checklist',
    schema: 'Checklist',
    data: {
      items: [
        { id: 1, text: 'Task 1', checked: false },
        { id: 2, text: 'Task 2', checked: true }
      ],
      allowEdit: true
    },
    shouldPass: true
  },

  // 2. Invalid Checklist - empty items
  {
    name: 'Invalid Checklist - empty items',
    schema: 'Checklist',
    data: {
      items: []
    },
    shouldPass: false
  },

  // 3. Valid Calendar
  {
    name: 'Valid Calendar',
    schema: 'Calendar',
    data: {
      mode: 'single',
      selectedDate: '2025-10-05',
      events: [
        { id: 1, date: '2025-10-05', title: 'Meeting' }
      ]
    },
    shouldPass: true
  },

  // 4. Invalid Calendar - bad date format
  {
    name: 'Invalid Calendar - bad date format',
    schema: 'Calendar',
    data: {
      events: [
        { id: 1, date: '10/05/2025', title: 'Meeting' }
      ]
    },
    shouldPass: false
  },

  // 5. Valid PhotoGrid
  {
    name: 'Valid PhotoGrid',
    schema: 'PhotoGrid',
    data: {
      images: [
        { url: 'https://example.com/photo.jpg', alt: 'Photo' }
      ],
      columns: 3,
      aspectRatio: 'square'
    },
    shouldPass: true
  },

  // 6. Invalid PhotoGrid - invalid aspectRatio enum
  {
    name: 'Invalid PhotoGrid - invalid aspectRatio',
    schema: 'PhotoGrid',
    data: {
      images: [
        { url: 'https://example.com/photo.jpg' }
      ],
      aspectRatio: 'invalid'
    },
    shouldPass: false
  },

  // 7. Valid Markdown
  {
    name: 'Valid Markdown',
    schema: 'Markdown',
    data: {
      content: '# Hello World\nThis is markdown.',
      sanitize: true
    },
    shouldPass: true
  },

  // 8. Invalid Markdown - empty content
  {
    name: 'Invalid Markdown - empty content',
    schema: 'Markdown',
    data: {
      content: ''
    },
    shouldPass: false
  },

  // 9. Valid Sidebar
  {
    name: 'Valid Sidebar',
    schema: 'Sidebar',
    data: {
      items: [
        { id: '1', label: 'Home', icon: 'home', href: '/home' },
        {
          id: '2',
          label: 'Settings',
          children: [
            { id: '2-1', label: 'Profile' }
          ]
        }
      ],
      position: 'left',
      collapsible: true
    },
    shouldPass: true
  },

  // 10. Invalid Sidebar - invalid position enum
  {
    name: 'Invalid Sidebar - invalid position',
    schema: 'Sidebar',
    data: {
      items: [
        { id: '1', label: 'Home' }
      ],
      position: 'top'
    },
    shouldPass: false
  },

  // 11. Valid SwipeCard
  {
    name: 'Valid SwipeCard',
    schema: 'SwipeCard',
    data: {
      cards: [
        { id: '1', title: 'Card 1', description: 'Description' },
        { id: '2', title: 'Card 2', image: 'https://example.com/img.jpg' }
      ],
      showControls: true
    },
    shouldPass: true
  },

  // 12. Invalid SwipeCard - empty cards
  {
    name: 'Invalid SwipeCard - empty cards',
    schema: 'SwipeCard',
    data: {
      cards: []
    },
    shouldPass: false
  },

  // 13. Valid GanttChart
  {
    name: 'Valid GanttChart',
    schema: 'GanttChart',
    data: {
      tasks: [
        {
          id: 1,
          name: 'Task 1',
          startDate: '2025-10-01',
          endDate: '2025-10-15',
          progress: 50
        },
        {
          id: 2,
          name: 'Task 2',
          startDate: '2025-10-10',
          endDate: '2025-10-20',
          dependencies: [1]
        }
      ],
      viewMode: 'week'
    },
    shouldPass: true
  },

  // 14. Invalid GanttChart - invalid date format
  {
    name: 'Invalid GanttChart - invalid date format',
    schema: 'GanttChart',
    data: {
      tasks: [
        {
          id: 1,
          name: 'Task 1',
          startDate: '10/01/2025',
          endDate: '2025-10-15'
        }
      ]
    },
    shouldPass: false
  },

  // 15. Invalid GanttChart - invalid viewMode enum
  {
    name: 'Invalid GanttChart - invalid viewMode',
    schema: 'GanttChart',
    data: {
      tasks: [
        {
          id: 1,
          name: 'Task 1',
          startDate: '2025-10-01',
          endDate: '2025-10-15'
        }
      ],
      viewMode: 'hour'
    },
    shouldPass: false
  },

  // 16. Template variable test - valid
  {
    name: 'Template variable - valid URL',
    schema: 'SwipeCard',
    data: {
      cards: [
        { id: '1', title: 'Card 1', image: '{{imageUrl}}' }
      ],
      onSwipeLeft: '{{leftCallback}}'
    },
    shouldPass: true
  }
];

// Run tests
console.log('Running Component Schema Validation Tests...\n');
let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  try {
    const schema = schemas[test.schema];
    schema.parse(test.data);

    if (test.shouldPass) {
      console.log(`✓ Test ${index + 1}: ${test.name} - PASSED`);
      passed++;
    } else {
      console.log(`✗ Test ${index + 1}: ${test.name} - FAILED (expected to fail but passed)`);
      failed++;
    }
  } catch (error) {
    if (!test.shouldPass) {
      console.log(`✓ Test ${index + 1}: ${test.name} - PASSED (correctly failed)`);
      passed++;
    } else {
      console.log(`✗ Test ${index + 1}: ${test.name} - FAILED`);
      if (error instanceof z.ZodError) {
        console.log('  Errors:', error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '));
      }
      failed++;
    }
  }
});

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(50)}`);

if (failed === 0) {
  console.log('\n✓ All tests passed!');
  process.exit(0);
} else {
  console.log('\n✗ Some tests failed!');
  process.exit(1);
}
