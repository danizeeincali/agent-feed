import express from 'express';
import validateComponentsRouter from './routes/validate-components.js';

// Create test Express app
const app = express();
app.use(express.json());
app.use('/api/validate-components', validateComponentsRouter);

// Helper to make request to endpoint
async function testEndpoint(components) {
  return new Promise((resolve, reject) => {
    const req = {
      body: { components },
      headers: { 'content-type': 'application/json' }
    };
    const res = {
      status: (code) => ({
        json: (data) => resolve({ status: code, ...data })
      }),
      json: (data) => resolve({ status: 200, ...data })
    };

    // Simulate Express middleware
    const handler = validateComponentsRouter.stack.find(layer => layer.route?.path === '/').route.stack[0].handle;
    handler(req, res);
  });
}

// Test cases
const tests = [
  {
    name: 'Valid components - all 7 new schemas',
    components: [
      {
        type: 'Checklist',
        props: {
          items: [
            { id: 1, text: 'Task 1', checked: false },
            { id: 2, text: 'Task 2', checked: true }
          ]
        }
      },
      {
        type: 'Calendar',
        props: {
          mode: 'range',
          events: [
            { id: 1, date: '2025-10-05', title: 'Meeting' }
          ]
        }
      },
      {
        type: 'PhotoGrid',
        props: {
          images: [
            { url: 'https://example.com/1.jpg', alt: 'Photo 1' },
            { url: 'https://example.com/2.jpg', alt: 'Photo 2' }
          ],
          columns: 2,
          aspectRatio: '16:9'
        }
      },
      {
        type: 'Markdown',
        props: {
          content: '# Hello\nThis is markdown'
        }
      },
      {
        type: 'Sidebar',
        props: {
          items: [
            { id: '1', label: 'Home' },
            { id: '2', label: 'About' }
          ],
          position: 'left'
        }
      },
      {
        type: 'SwipeCard',
        props: {
          cards: [
            { id: '1', title: 'Card 1' },
            { id: '2', title: 'Card 2' }
          ]
        }
      },
      {
        type: 'GanttChart',
        props: {
          tasks: [
            {
              id: 1,
              name: 'Task 1',
              startDate: '2025-10-01',
              endDate: '2025-10-15',
              progress: 50
            }
          ],
          viewMode: 'month'
        }
      }
    ],
    expectedValid: true
  },

  {
    name: 'Invalid Checklist - missing required field',
    components: [
      {
        type: 'Checklist',
        props: {
          items: [
            { id: 1, text: '', checked: false } // empty text
          ]
        }
      }
    ],
    expectedValid: false
  },

  {
    name: 'Invalid Calendar - wrong enum value',
    components: [
      {
        type: 'Calendar',
        props: {
          mode: 'invalid-mode' // should be single, multiple, or range
        }
      }
    ],
    expectedValid: false
  },

  {
    name: 'Invalid PhotoGrid - wrong aspectRatio enum',
    components: [
      {
        type: 'PhotoGrid',
        props: {
          images: [
            { url: 'https://example.com/1.jpg' }
          ],
          aspectRatio: '21:9' // should be square, 4:3, 16:9, or auto
        }
      }
    ],
    expectedValid: false
  },

  {
    name: 'Invalid Sidebar - wrong position enum',
    components: [
      {
        type: 'Sidebar',
        props: {
          items: [
            { id: '1', label: 'Home' }
          ],
          position: 'top' // should be left or right
        }
      }
    ],
    expectedValid: false
  },

  {
    name: 'Invalid GanttChart - wrong viewMode enum',
    components: [
      {
        type: 'GanttChart',
        props: {
          tasks: [
            {
              id: 1,
              name: 'Task 1',
              startDate: '2025-10-01',
              endDate: '2025-10-15'
            }
          ],
          viewMode: 'hour' // should be day, week, month, quarter, or year
        }
      }
    ],
    expectedValid: false
  },

  {
    name: 'Invalid GanttChart - bad date format',
    components: [
      {
        type: 'GanttChart',
        props: {
          tasks: [
            {
              id: 1,
              name: 'Task 1',
              startDate: '10/01/2025', // wrong format
              endDate: '2025-10-15'
            }
          ]
        }
      }
    ],
    expectedValid: false
  },

  {
    name: 'Template variables - should work',
    components: [
      {
        type: 'SwipeCard',
        props: {
          cards: [
            { id: '1', title: 'Card', image: '{{imageUrl}}' }
          ],
          onSwipeLeft: '{{leftCallback}}'
        }
      }
    ],
    expectedValid: true
  },

  {
    name: 'Unknown component type',
    components: [
      {
        type: 'UnknownComponent',
        props: {}
      }
    ],
    expectedValid: false
  }
];

// Run tests
console.log('Testing API Endpoint Validation...\n');
let passed = 0;
let failed = 0;

for (const test of tests) {
  try {
    const result = await testEndpoint(test.components);

    if (result.valid === test.expectedValid) {
      console.log(`✓ ${test.name}`);
      passed++;
    } else {
      console.log(`✗ ${test.name}`);
      console.log(`  Expected valid=${test.expectedValid}, got valid=${result.valid}`);
      if (result.errors?.length > 0) {
        console.log('  Errors:', JSON.stringify(result.errors, null, 2));
      }
      failed++;
    }
  } catch (error) {
    console.log(`✗ ${test.name} - Error: ${error.message}`);
    failed++;
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(50)}`);

if (failed === 0) {
  console.log('\n✓ All endpoint tests passed!');
  process.exit(0);
} else {
  console.log('\n✗ Some endpoint tests failed!');
  process.exit(1);
}
