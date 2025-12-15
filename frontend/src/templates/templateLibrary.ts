import { Template } from '../schemas/templateSchemas'

export const templates: Record<string, Template> = {
  // Template 1: Dashboard
  dashboard: {
    metadata: {
      id: 'dashboard-v1',
      name: 'Dashboard',
      description: 'Professional dashboard with metrics and data table',
      category: 'dashboard',
      tags: ['metrics', 'analytics', 'overview'],
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    layout: [
      {
        id: 'header',
        type: 'header',
        config: {
          title: '{{title}}',
          level: 1,
          subtitle: '{{subtitle}}'
        }
      },
      {
        id: 'metrics',
        type: 'Grid',
        config: {
          cols: 3,
          gap: 6
        }
      },
      {
        id: 'metric-1',
        type: 'stat',
        config: {
          label: '{{metric1_label}}',
          value: '{{metric1_value}}',
          change: '{{metric1_change}}',
          icon: '{{metric1_icon}}'
        }
      },
      {
        id: 'metric-2',
        type: 'stat',
        config: {
          label: '{{metric2_label}}',
          value: '{{metric2_value}}',
          change: '{{metric2_change}}',
          icon: '{{metric2_icon}}'
        }
      },
      {
        id: 'metric-3',
        type: 'stat',
        config: {
          label: '{{metric3_label}}',
          value: '{{metric3_value}}',
          change: '{{metric3_change}}',
          icon: '{{metric3_icon}}'
        }
      },
      {
        id: 'data-table',
        type: 'dataTable',
        config: {
          sortable: true,
          filterable: true
        }
      }
    ],
    components: ['header', 'Grid', 'stat', 'dataTable'],
    variables: {
      title: 'Dashboard',
      subtitle: 'Overview of key metrics',
      metric1_label: 'Total Users',
      metric1_value: 0,
      metric1_change: 0,
      metric1_icon: '👥',
      metric2_label: 'Revenue',
      metric2_value: 0,
      metric2_change: 0,
      metric2_icon: '💰',
      metric3_label: 'Active Sessions',
      metric3_value: 0,
      metric3_change: 0,
      metric3_icon: '📊'
    }
  },

  // Template 2: Todo List Manager
  todoManager: {
    metadata: {
      id: 'todo-manager-v1',
      name: 'Todo List Manager',
      description: 'Task management interface with todo list',
      category: 'list',
      tags: ['tasks', 'productivity', 'todos'],
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    layout: [
      {
        id: 'header',
        type: 'header',
        config: {
          title: '{{title}}',
          level: 1
        }
      },
      {
        id: 'stats',
        type: 'Grid',
        config: {
          cols: 2,
          gap: 4
        }
      },
      {
        id: 'stat-total',
        type: 'stat',
        config: {
          label: 'Total Tasks',
          value: '{{totalTasks}}',
          icon: '📝'
        }
      },
      {
        id: 'stat-completed',
        type: 'stat',
        config: {
          label: 'Completed',
          value: '{{completedTasks}}',
          icon: '✅'
        }
      },
      {
        id: 'todo-list',
        type: 'todoList',
        config: {
          showCompleted: false,
          sortBy: 'priority'
        }
      }
    ],
    components: ['header', 'Grid', 'stat', 'todoList'],
    variables: {
      title: 'My Tasks',
      totalTasks: 0,
      completedTasks: 0
    }
  },

  // Template 3: Timeline View
  timeline: {
    metadata: {
      id: 'timeline-v1',
      name: 'Timeline',
      description: 'Chronological event timeline',
      category: 'timeline',
      tags: ['events', 'history', 'chronology'],
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    layout: [
      {
        id: 'header',
        type: 'header',
        config: {
          title: '{{title}}',
          level: 1,
          subtitle: '{{subtitle}}'
        }
      },
      {
        id: 'timeline',
        type: 'timeline',
        config: {
          orientation: 'vertical'
        }
      }
    ],
    components: ['header', 'timeline'],
    variables: {
      title: 'Project Timeline',
      subtitle: 'Key milestones and events'
    }
  },

  // Template 4: Form Page
  formPage: {
    metadata: {
      id: 'form-page-v1',
      name: 'Form Page',
      description: 'Data collection form with validation',
      category: 'form',
      tags: ['form', 'input', 'data-collection'],
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    layout: [
      {
        id: 'header',
        type: 'header',
        config: {
          title: '{{title}}',
          level: 1,
          subtitle: '{{subtitle}}'
        }
      },
      {
        id: 'form',
        type: 'form',
        config: {
          fields: '{{fields}}',
          submitLabel: '{{submitLabel}}'
        }
      }
    ],
    components: ['header', 'form'],
    variables: {
      title: 'Contact Form',
      subtitle: 'Get in touch with us',
      fields: [
        { label: 'Name', type: 'text', required: true },
        { label: 'Email', type: 'email', required: true },
        { label: 'Message', type: 'textarea', required: true }
      ],
      submitLabel: 'Submit'
    }
  },

  // Template 5: Analytics Dashboard
  analytics: {
    metadata: {
      id: 'analytics-v1',
      name: 'Analytics Dashboard',
      description: 'Comprehensive analytics view with multiple metrics',
      category: 'analytics',
      tags: ['analytics', 'metrics', 'kpi', 'dashboard'],
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    layout: [
      {
        id: 'header',
        type: 'header',
        config: {
          title: '{{title}}',
          level: 1,
          subtitle: '{{subtitle}}'
        }
      },
      {
        id: 'kpi-grid',
        type: 'Grid',
        config: {
          cols: 4,
          gap: 4
        }
      },
      {
        id: 'kpi-1',
        type: 'stat',
        config: {
          label: '{{kpi1_label}}',
          value: '{{kpi1_value}}',
          change: '{{kpi1_change}}',
          icon: '{{kpi1_icon}}'
        }
      },
      {
        id: 'kpi-2',
        type: 'stat',
        config: {
          label: '{{kpi2_label}}',
          value: '{{kpi2_value}}',
          change: '{{kpi2_change}}',
          icon: '{{kpi2_icon}}'
        }
      },
      {
        id: 'kpi-3',
        type: 'stat',
        config: {
          label: '{{kpi3_label}}',
          value: '{{kpi3_value}}',
          change: '{{kpi3_change}}',
          icon: '{{kpi3_icon}}'
        }
      },
      {
        id: 'kpi-4',
        type: 'stat',
        config: {
          label: '{{kpi4_label}}',
          value: '{{kpi4_value}}',
          change: '{{kpi4_change}}',
          icon: '{{kpi4_icon}}'
        }
      },
      {
        id: 'tabs',
        type: 'tabs',
        config: {
          tabs: [
            { label: 'Overview', content: 'overview' },
            { label: 'Detailed', content: 'detailed' }
          ]
        }
      },
      {
        id: 'data-table',
        type: 'dataTable',
        config: {
          sortable: true,
          filterable: true
        }
      }
    ],
    components: ['header', 'Grid', 'stat', 'tabs', 'dataTable'],
    variables: {
      title: 'Analytics Dashboard',
      subtitle: 'Real-time performance metrics',
      kpi1_label: 'Total Revenue',
      kpi1_value: '$0',
      kpi1_change: 0,
      kpi1_icon: '💰',
      kpi2_label: 'Active Users',
      kpi2_value: 0,
      kpi2_change: 0,
      kpi2_icon: '👥',
      kpi3_label: 'Conversion Rate',
      kpi3_value: '0%',
      kpi3_change: 0,
      kpi3_icon: '📈',
      kpi4_label: 'Avg Session',
      kpi4_value: '0m',
      kpi4_change: 0,
      kpi4_icon: '⏱️'
    }
  }
}

// Template helper functions
export function getTemplate(templateId: string): Template | undefined {
  return templates[templateId]
}

export function listTemplates(): Template[] {
  return Object.values(templates)
}

export function getTemplatesByCategory(category: string): Template[] {
  return Object.values(templates).filter(t => t.metadata.category === category)
}

// Variable replacement function
export function fillTemplateVariables(
  template: Template,
  variables: Record<string, any>
): Template {
  const filledLayout = template.layout.map(component => ({
    ...component,
    config: replaceVariables(component.config, variables)
  }))

  return {
    ...template,
    layout: filledLayout
  }
}

function replaceVariables(obj: any, variables: Record<string, any>): any {
  if (typeof obj === 'string') {
    return obj.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match
    })
  }

  if (Array.isArray(obj)) {
    return obj.map(item => replaceVariables(item, variables))
  }

  if (typeof obj === 'object' && obj !== null) {
    const result: any = {}
    for (const key in obj) {
      result[key] = replaceVariables(obj[key], variables)
    }
    return result
  }

  return obj
}
