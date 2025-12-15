/**
 * Example Agent Page Specifications for personal-todos-agent
 * These demonstrate how agents can create interactive UI using JSON specifications
 */

import { AgentPageSpec } from '../services/AgentComponentRegistry';

// Example 1: Simple Todo List Page
export const todoListPageSpec: AgentPageSpec = {
  id: 'todo-list-v1',
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
          props: { cols: 4, gap: 2 },
          children: [
            {
              type: 'Input',
              id: 'todo-input',
              props: {
                placeholder: 'Enter task title...',
                type: 'text'
              },
              events: {
                onChange: 'handleTodoInputChange'
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
                  { value: 'P4', label: 'P4 Normal' },
                  { value: 'P5', label: 'P5 Low' },
                ]
              },
              events: {
                onValueChange: 'handlePriorityChange'
              }
            },
            {
              type: 'Button',
              props: {
                children: 'Add Task',
                variant: 'default'
              },
              events: {
                onClick: 'addTodo'
              }
            }
          ]
        }
      ]
    },
    
    // Todo Statistics
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
                children: '{{userData.todos.length || 0}}',
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
                children: '{{userData.todos.filter(t => t.completed).length || 0}}',
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
                children: '{{userData.todos.filter(t => !t.completed).length || 0}}',
                variant: 'outline'
              }
            }
          ]
        }
      ]
    },

    // Progress Bar
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
            value: '{{(userData.todos.filter(t => t.completed).length / Math.max(userData.todos.length, 1)) * 100}}'
          }
        }
      ]
    }
  ],
  
  events: {
    handleTodoInputChange: (e: any) => {
      // Store the input value temporarily
      console.log('Todo input changed:', e.target.value);
    },
    
    handlePriorityChange: (priority: string) => {
      console.log('Priority changed:', priority);
    },
    
    addTodo: () => {
      console.log('Add todo clicked');
      // This would be handled by the event system
    }
  }
};

// Example 2: Dashboard Page with Multiple Widgets
export const dashboardPageSpec: AgentPageSpec = {
  id: 'dashboard-v1',
  version: 1,
  title: 'Personal Dashboard',
  layout: 'grid',
  components: [
    // Quick Stats Row
    {
      type: 'Grid',
      props: { cols: 4, gap: 4 },
      children: [
        {
          type: 'Card',
          props: {
            title: 'Total Tasks',
            className: 'text-center'
          },
          children: [
            {
              type: 'Badge',
              props: {
                children: '{{userData.stats.totalTasks || 0}}',
                variant: 'secondary'
              }
            }
          ]
        },
        {
          type: 'Card',
          props: {
            title: 'Completed Today',
            className: 'text-center'
          },
          children: [
            {
              type: 'Badge',
              props: {
                children: '{{userData.stats.completedToday || 0}}',
                variant: 'default'
              }
            }
          ]
        },
        {
          type: 'Card',
          props: {
            title: 'High Priority',
            className: 'text-center'
          },
          children: [
            {
              type: 'Badge',
              props: {
                children: '{{userData.stats.highPriority || 0}}',
                variant: 'destructive'
              }
            }
          ]
        },
        {
          type: 'Card',
          props: {
            title: 'This Week',
            className: 'text-center'
          },
          children: [
            {
              type: 'Badge',
              props: {
                children: '{{userData.stats.thisWeek || 0}}',
                variant: 'outline'
              }
            }
          ]
        }
      ]
    },

    // Quick Actions
    {
      type: 'Card',
      props: {
        title: 'Quick Actions',
        description: 'Common tasks'
      },
      children: [
        {
          type: 'Grid',
          props: { cols: 2, gap: 2 },
          children: [
            {
              type: 'Button',
              props: {
                children: 'Add High Priority Task',
                variant: 'destructive',
                size: 'sm'
              },
              events: {
                onClick: 'addHighPriorityTask'
              }
            },
            {
              type: 'Button',
              props: {
                children: 'Review P0 Tasks',
                variant: 'outline',
                size: 'sm'
              },
              events: {
                onClick: 'reviewCriticalTasks'
              }
            },
            {
              type: 'Button',
              props: {
                children: 'Weekly Planning',
                variant: 'secondary',
                size: 'sm'
              },
              events: {
                onClick: 'openWeeklyPlanning'
              }
            },
            {
              type: 'Button',
              props: {
                children: 'Export Data',
                variant: 'ghost',
                size: 'sm'
              },
              events: {
                onClick: 'exportData'
              }
            }
          ]
        }
      ]
    }
  ],

  events: {
    addHighPriorityTask: () => console.log('Add high priority task'),
    reviewCriticalTasks: () => console.log('Review critical tasks'),
    openWeeklyPlanning: () => console.log('Open weekly planning'),
    exportData: () => console.log('Export data')
  }
};

// Example 3: Settings/Configuration Page
export const settingsPageSpec: AgentPageSpec = {
  id: 'settings-v1',
  version: 1,
  title: 'Task Settings',
  layout: 'single',
  components: [
    {
      type: 'Card',
      props: {
        title: 'Preferences',
        description: 'Customize your task management'
      },
      children: [
        {
          type: 'Grid',
          props: { cols: 1, gap: 4 },
          children: [
            // Default Priority Setting
            {
              type: 'Container',
              children: [
                {
                  type: 'Badge',
                  props: {
                    children: 'Default Priority',
                    variant: 'outline'
                  }
                },
                {
                  type: 'Select',
                  props: {
                    value: '{{userData.settings.defaultPriority || "P3"}}',
                    options: [
                      { value: 'P0', label: 'P0 Critical' },
                      { value: 'P1', label: 'P1 High' },
                      { value: 'P2', label: 'P2 Important' },
                      { value: 'P3', label: 'P3 Medium' },
                      { value: 'P4', label: 'P4 Normal' },
                    ]
                  },
                  events: {
                    onValueChange: 'updateDefaultPriority'
                  }
                }
              ]
            },
            
            // Auto-save Setting
            {
              type: 'Container',
              children: [
                {
                  type: 'Badge',
                  props: {
                    children: 'Auto-save Changes',
                    variant: 'outline'
                  }
                },
                {
                  type: 'Checkbox',
                  props: {
                    checked: '{{userData.settings.autoSave !== false}}'
                  },
                  events: {
                    onCheckedChange: 'toggleAutoSave'
                  }
                }
              ]
            },

            // Save Button
            {
              type: 'Button',
              props: {
                children: 'Save Settings',
                variant: 'default'
              },
              events: {
                onClick: 'saveSettings'
              }
            }
          ]
        }
      ]
    }
  ],

  events: {
    updateDefaultPriority: (priority: string) => {
      console.log('Update default priority:', priority);
    },
    toggleAutoSave: (enabled: boolean) => {
      console.log('Toggle auto-save:', enabled);
    },
    saveSettings: () => {
      console.log('Save settings');
    }
  }
};

// Export all specs for easy access
export const examplePageSpecs = {
  todoList: todoListPageSpec,
  dashboard: dashboardPageSpec,
  settings: settingsPageSpec
};