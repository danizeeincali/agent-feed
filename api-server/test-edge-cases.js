import { z } from 'zod';

// Helper for validating template variables
const templateVariableOrString = (schema) =>
  z.union([
    z.string().regex(/^\{\{.+\}\}$/),
    schema
  ]);

// Test edge cases
console.log('Testing Edge Cases...\n');

// Test 1: GanttChart with dependencies
console.log('1. GanttChart with dependencies:');
const GanttChartSchema = z.object({
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
});

try {
  GanttChartSchema.parse({
    tasks: [
      { id: 1, name: 'Task 1', startDate: '2025-10-01', endDate: '2025-10-05' },
      { id: 2, name: 'Task 2', startDate: '2025-10-06', endDate: '2025-10-10', dependencies: [1, 'task-3'] }
    ]
  });
  console.log('   ✓ Mixed string/number dependencies work\n');
} catch (e) {
  console.log('   ✗ Failed:', e.message, '\n');
}

// Test 2: Sidebar with nested children
console.log('2. Sidebar with nested children:');
const SidebarSchema = z.object({
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
});

try {
  SidebarSchema.parse({
    items: [
      {
        id: '1',
        label: 'Parent',
        children: [
          { id: '1-1', label: 'Child 1', href: '{{dynamicUrl}}' },
          { id: '1-2', label: 'Child 2', href: '/static' }
        ]
      }
    ]
  });
  console.log('   ✓ Nested children with template variables work\n');
} catch (e) {
  console.log('   ✗ Failed:', e.message, '\n');
}

// Test 3: Calendar with multiple date formats
console.log('3. Calendar with multiple date formats:');
const CalendarSchema = z.object({
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
});

try {
  CalendarSchema.parse({
    selectedDate: '2025-10-05',
    events: [
      { id: 1, date: '2025-10-05', title: 'Event 1' }
    ]
  });
  console.log('   ✓ YYYY-MM-DD date format works');
} catch (e) {
  console.log('   ✗ Failed:', e.message);
}

try {
  CalendarSchema.parse({
    selectedDate: '2025-10-05T14:30:00Z'
  });
  console.log('   ✓ ISO datetime format works');
} catch (e) {
  console.log('   ✗ Failed:', e.message);
}

try {
  CalendarSchema.parse({
    selectedDate: '{{dateVariable}}'
  });
  console.log('   ✓ Template variable format works\n');
} catch (e) {
  console.log('   ✗ Failed:', e.message, '\n');
}

// Test 4: PhotoGrid column bounds
console.log('4. PhotoGrid column validation:');
const PhotoGridSchema = z.object({
  images: z.array(z.object({
    url: templateVariableOrString(z.string().url()),
    alt: z.string().optional(),
    caption: z.string().optional()
  })).min(1, "At least one image is required"),
  columns: z.number().min(1).max(6).optional().default(3),
  enableLightbox: z.boolean().optional().default(true),
  aspectRatio: z.enum(['square', '4:3', '16:9', 'auto']).optional().default('auto')
});

try {
  PhotoGridSchema.parse({
    images: [{ url: 'https://example.com/img.jpg' }],
    columns: 1
  });
  console.log('   ✓ Min columns (1) works');
} catch (e) {
  console.log('   ✗ Failed:', e.message);
}

try {
  PhotoGridSchema.parse({
    images: [{ url: 'https://example.com/img.jpg' }],
    columns: 6
  });
  console.log('   ✓ Max columns (6) works');
} catch (e) {
  console.log('   ✗ Failed:', e.message);
}

try {
  PhotoGridSchema.parse({
    images: [{ url: 'https://example.com/img.jpg' }],
    columns: 7
  });
  console.log('   ✗ Should have failed for columns > 6');
} catch (e) {
  console.log('   ✓ Correctly rejects columns > 6\n');
}

// Test 5: SwipeCard metadata
console.log('5. SwipeCard with arbitrary metadata:');
const SwipeCardSchema = z.object({
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
});

try {
  SwipeCardSchema.parse({
    cards: [
      {
        id: '1',
        title: 'Card',
        metadata: {
          customField: 'value',
          nested: { data: 123 },
          array: [1, 2, 3]
        }
      }
    ]
  });
  console.log('   ✓ Arbitrary metadata structure works\n');
} catch (e) {
  console.log('   ✗ Failed:', e.message, '\n');
}

// Test 6: Checklist with mixed ID types
console.log('6. Checklist with mixed ID types:');
const ChecklistSchema = z.object({
  items: z.array(z.object({
    id: z.union([z.string(), z.number()]),
    text: z.string().min(1, "Item text is required"),
    checked: z.boolean()
  })).min(1, "At least one item is required"),
  allowEdit: z.boolean().optional().default(false),
  onChange: templateVariableOrString(z.string().url()).optional()
});

try {
  ChecklistSchema.parse({
    items: [
      { id: 1, text: 'Numeric ID', checked: false },
      { id: 'string-id', text: 'String ID', checked: true },
      { id: 42, text: 'Another numeric', checked: false }
    ]
  });
  console.log('   ✓ Mixed string/number IDs work\n');
} catch (e) {
  console.log('   ✗ Failed:', e.message, '\n');
}

// Test 7: Progress validation in GanttChart
console.log('7. GanttChart progress bounds:');

try {
  GanttChartSchema.parse({
    tasks: [
      { id: 1, name: 'Task', startDate: '2025-10-01', endDate: '2025-10-05', progress: 0 }
    ]
  });
  console.log('   ✓ Min progress (0) works');
} catch (e) {
  console.log('   ✗ Failed:', e.message);
}

try {
  GanttChartSchema.parse({
    tasks: [
      { id: 1, name: 'Task', startDate: '2025-10-01', endDate: '2025-10-05', progress: 100 }
    ]
  });
  console.log('   ✓ Max progress (100) works');
} catch (e) {
  console.log('   ✗ Failed:', e.message);
}

try {
  GanttChartSchema.parse({
    tasks: [
      { id: 1, name: 'Task', startDate: '2025-10-01', endDate: '2025-10-05', progress: 101 }
    ]
  });
  console.log('   ✗ Should have failed for progress > 100');
} catch (e) {
  console.log('   ✓ Correctly rejects progress > 100\n');
}

console.log('${"=".repeat(50)}');
console.log('All edge case tests completed!');
console.log('${"=".repeat(50)}');
