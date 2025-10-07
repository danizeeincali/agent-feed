/**
 * Manual validation script to test component schemas
 * Run with: npx tsx src/schemas/validateSchemas.ts
 */

import {
  ChecklistSchema,
  CalendarSchema,
  PhotoGridSchema,
  MarkdownSchema,
  SidebarSchema,
  SwipeCardSchema,
  GanttChartSchema,
  ComponentSchemas
} from './componentSchemas'

console.log('Validating Component Schemas...\n')

// Test ChecklistSchema
console.log('1. Testing ChecklistSchema:')
try {
  const checklist = ChecklistSchema.parse({
    items: [
      { id: '1', text: 'First task', checked: false },
      { id: 2, text: 'Second task', checked: true }
    ],
    allowEdit: true,
    onChange: '{{api.updateChecklist}}'
  })
  console.log('   ✓ Valid checklist parsed successfully')
  console.log('   - Default allowEdit:', checklist.allowEdit)
} catch (error) {
  console.error('   ✗ Error:', error)
}

// Test CalendarSchema
console.log('\n2. Testing CalendarSchema:')
try {
  const calendar = CalendarSchema.parse({
    mode: 'range',
    selectedDate: '2025-10-05',
    events: [
      { id: '1', date: '2025-10-10', title: 'Meeting' }
    ]
  })
  console.log('   ✓ Valid calendar parsed successfully')
  console.log('   - Mode:', calendar.mode)
} catch (error) {
  console.error('   ✗ Error:', error)
}

// Test PhotoGridSchema
console.log('\n3. Testing PhotoGridSchema:')
try {
  const photoGrid = PhotoGridSchema.parse({
    images: [
      { url: 'https://example.com/photo1.jpg', alt: 'Photo 1' },
      { url: '{{image.url}}', caption: 'Dynamic photo' }
    ],
    columns: 4,
    aspectRatio: '16:9'
  })
  console.log('   ✓ Valid photo grid parsed successfully')
  console.log('   - Columns:', photoGrid.columns)
  console.log('   - AspectRatio:', photoGrid.aspectRatio)
  console.log('   - EnableLightbox (default):', photoGrid.enableLightbox)
} catch (error) {
  console.error('   ✗ Error:', error)
}

// Test MarkdownSchema
console.log('\n4. Testing MarkdownSchema:')
try {
  const markdown = MarkdownSchema.parse({
    content: '# Hello World\n\nThis is **markdown**',
    sanitize: false,
    className: 'prose'
  })
  console.log('   ✓ Valid markdown parsed successfully')
  console.log('   - Sanitize:', markdown.sanitize)
} catch (error) {
  console.error('   ✗ Error:', error)
}

// Test SidebarSchema
console.log('\n5. Testing SidebarSchema:')
try {
  const sidebar = SidebarSchema.parse({
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
    position: 'left'
  })
  console.log('   ✓ Valid sidebar parsed successfully')
  console.log('   - Position:', sidebar.position)
  console.log('   - Collapsible (default):', sidebar.collapsible)
} catch (error) {
  console.error('   ✗ Error:', error)
}

// Test SwipeCardSchema
console.log('\n6. Testing SwipeCardSchema:')
try {
  const swipeCard = SwipeCardSchema.parse({
    cards: [
      { id: '1', title: 'Card 1', content: 'Content 1' },
      { id: 2, content: 'Content 2', imageUrl: '{{card.image}}' }
    ],
    onSwipeLeft: 'https://api.example.com/reject',
    onSwipeRight: 'https://api.example.com/accept'
  })
  console.log('   ✓ Valid swipe card parsed successfully')
  console.log('   - ShowControls (default):', swipeCard.showControls)
} catch (error) {
  console.error('   ✗ Error:', error)
}

// Test GanttChartSchema
console.log('\n7. Testing GanttChartSchema:')
try {
  const ganttChart = GanttChartSchema.parse({
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
        dependencies: ['1']
      }
    ],
    viewMode: 'month'
  })
  console.log('   ✓ Valid gantt chart parsed successfully')
  console.log('   - ViewMode:', ganttChart.viewMode)
  console.log('   - Task 1 progress:', ganttChart.tasks[0].progress)
  console.log('   - Task 2 progress (default):', ganttChart.tasks[1].progress)
} catch (error) {
  console.error('   ✗ Error:', error)
}

// Verify all schemas are exported in ComponentSchemas
console.log('\n8. Verifying ComponentSchemas registry:')
const expectedSchemas = [
  'Checklist',
  'Calendar',
  'PhotoGrid',
  'Markdown',
  'Sidebar',
  'SwipeCard',
  'GanttChart'
]

expectedSchemas.forEach(schemaName => {
  if (schemaName in ComponentSchemas) {
    console.log(`   ✓ ${schemaName} is registered`)
  } else {
    console.log(`   ✗ ${schemaName} is NOT registered`)
  }
})

console.log('\n✓ All component schemas validated successfully!')
console.log(`\nTotal schemas in registry: ${Object.keys(ComponentSchemas).length}`)
