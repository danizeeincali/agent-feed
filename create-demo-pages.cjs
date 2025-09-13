/**
 * Create demo agent pages for testing the Agent Dynamic Pages system
 */

const fs = require('fs').promises;
const path = require('path');

// Demo page specifications
const demoPages = [
  {
    agentId: 'personal-todos-agent',
    pageId: 'todo-list-v2',
    title: 'Interactive Todo List',
    specification: {
      id: 'todo-list-v2',
      version: 1,
      title: 'My Todo List',
      layout: 'single',
      components: [
        // Add Todo Form
        {
          type: 'Card',
          props: {
            title: 'Add New Task',
            description: 'Create a new todo item'
          },
          children: [
            {
              type: 'Grid',
              props: { cols: 3, gap: 2 },
              children: [
                {
                  type: 'Input',
                  id: 'todo-input',
                  props: {
                    placeholder: 'Enter task title...',
                    type: 'text'
                  }
                },
                {
                  type: 'Select',
                  id: 'priority-select',
                  props: {
                    placeholder: 'Priority',
                    options: [
                      { value: 'P0', label: 'P0 Critical' },
                      { value: 'P1', label: 'P1 High' },
                      { value: 'P2', label: 'P2 Important' },
                      { value: 'P3', label: 'P3 Medium' },
                      { value: 'P4', label: 'P4 Normal' }
                    ]
                  }
                },
                {
                  type: 'Button',
                  props: {
                    children: 'Add Task',
                    variant: 'default'
                  }
                }
              ]
            }
          ]
        },
        
        // Stats Cards
        {
          type: 'Grid',
          props: { cols: 3, gap: 4 },
          children: [
            {
              type: 'Card',
              props: {
                title: 'Total Tasks',
                description: 'All todos'
              },
              children: [
                {
                  type: 'Badge',
                  props: {
                    children: '{{userData.todos?.length || 0}}',
                    variant: 'secondary'
                  }
                }
              ]
            },
            {
              type: 'Card',
              props: {
                title: 'Completed',
                description: 'Done tasks'
              },
              children: [
                {
                  type: 'Badge',
                  props: {
                    children: '{{userData.todos?.filter(t => t.completed).length || 0}}',
                    variant: 'default'
                  }
                }
              ]
            },
            {
              type: 'Card',
              props: {
                title: 'Pending',
                description: 'Active tasks'
              },
              children: [
                {
                  type: 'Badge',
                  props: {
                    children: '{{userData.todos?.filter(t => !t.completed).length || 0}}',
                    variant: 'outline'
                  }
                }
              ]
            }
          ]
        },

        // Progress
        {
          type: 'Card',
          props: {
            title: 'Progress',
            description: 'Task completion rate'
          },
          children: [
            {
              type: 'Progress',
              props: {
                value: 42
              }
            }
          ]
        }
      ]
    }
  },

  {
    agentId: 'personal-todos-agent',
    pageId: 'simple-demo',
    title: 'Simple Demo Page',
    specification: {
      id: 'simple-demo',
      version: 1,
      title: 'Simple Demo Page',
      layout: 'single',
      components: [
        {
          type: 'Card',
          props: {
            title: 'Welcome to Agent Dynamic Pages!',
            description: 'This page was created by an AI agent using JSON specifications.'
          },
          children: [
            {
              type: 'Container',
              children: [
                {
                  type: 'Badge',
                  props: {
                    children: 'AI Generated',
                    variant: 'secondary'
                  }
                }
              ]
            }
          ]
        },
        {
          type: 'Grid',
          props: { cols: 2, gap: 4 },
          children: [
            {
              type: 'Button',
              props: {
                children: 'Primary Action',
                variant: 'default'
              }
            },
            {
              type: 'Button',
              props: {
                children: 'Secondary Action',
                variant: 'outline'
              }
            }
          ]
        },
        {
          type: 'Card',
          props: {
            title: 'User Input Example',
            description: 'Agents can create interactive forms'
          },
          children: [
            {
              type: 'Input',
              props: {
                placeholder: 'Type something...',
                type: 'text'
              }
            },
            {
              type: 'Textarea',
              props: {
                placeholder: 'Enter your feedback...',
                rows: 3
              }
            },
            {
              type: 'Checkbox',
              props: {
                checked: false
              }
            }
          ]
        }
      ]
    }
  }
];

async function createDemoPages() {
  console.log('🎯 Creating demo agent pages...');

  // Ensure data directories exist
  const pagesDir = path.join(process.cwd(), 'data', 'agent-pages');
  const userDataDir = path.join(process.cwd(), 'data', 'user-data');
  
  await fs.mkdir(pagesDir, { recursive: true });
  await fs.mkdir(userDataDir, { recursive: true });

  // Create each demo page
  for (const page of demoPages) {
    try {
      const pageData = {
        id: page.pageId,
        agent_id: page.agentId,
        title: page.title,
        specification: JSON.stringify(page.specification),
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const filePath = path.join(pagesDir, `${page.agentId}-${page.pageId}.json`);
      await fs.writeFile(filePath, JSON.stringify(pageData, null, 2));

      console.log(`✅ Created demo page: ${page.title} (${page.pageId})`);

      // Create some sample user data for the todo list
      if (page.pageId === 'todo-list-v2') {
        const sampleUserData = {
          agentId: page.agentId,
          pageId: page.pageId,
          userId: 'default',
          data: {
            todos: [
              {
                id: '1',
                title: 'Learn about Agent Dynamic Pages',
                priority: 'P1',
                completed: true,
                createdAt: new Date().toISOString()
              },
              {
                id: '2',
                title: 'Create my first agent page',
                priority: 'P2',
                completed: false,
                createdAt: new Date().toISOString()
              },
              {
                id: '3',
                title: 'Test user data persistence',
                priority: 'P3',
                completed: false,
                createdAt: new Date().toISOString()
              }
            ],
            settings: {
              defaultPriority: 'P3',
              autoSave: true
            }
          },
          updated: new Date().toISOString()
        };

        const userDataPath = path.join(userDataDir, `${page.agentId}-${page.pageId}-default.json`);
        await fs.writeFile(userDataPath, JSON.stringify(sampleUserData, null, 2));
        
        console.log(`✅ Created sample user data for todo list`);
      }
    } catch (error) {
      console.error(`❌ Error creating demo page ${page.pageId}:`, error);
    }
  }

  console.log('🎉 Demo pages created successfully!');
  console.log('');
  console.log('🌐 You can now test these pages:');
  console.log(`   • http://localhost:5173/agents/personal-todos-agent/pages/todo-list-v2`);
  console.log(`   • http://localhost:5173/agents/personal-todos-agent/pages/simple-demo`);
}

// Run if called directly
if (require.main === module) {
  createDemoPages().catch(console.error);
}

module.exports = { createDemoPages, demoPages };