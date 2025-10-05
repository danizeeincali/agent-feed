// Template API Routes
// This module provides endpoints for template management and instantiation

// Import template library - using dynamic import for ES modules
const getTemplateLibrary = async () => {
  // For now, we'll re-define the templates here until proper module system is set up
  // In production, this would import from the frontend template library
  const templates = {
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

  return templates
}

// Helper function for variable replacement
function replaceVariables(obj, variables) {
  if (typeof obj === 'string') {
    return obj.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match
    })
  }

  if (Array.isArray(obj)) {
    return obj.map(item => replaceVariables(item, variables))
  }

  if (typeof obj === 'object' && obj !== null) {
    const result = {}
    for (const key in obj) {
      result[key] = replaceVariables(obj[key], variables)
    }
    return result
  }

  return obj
}

// Helper function to fill template with variables
function fillTemplateVariables(template, variables) {
  const filledLayout = template.layout.map(component => ({
    ...component,
    config: replaceVariables(component.config, variables)
  }))

  return {
    ...template,
    layout: filledLayout
  }
}

// Route handlers
const routes = (app) => {
  // GET /api/templates - List all templates
  app.get('/api/templates', async (req, res) => {
    try {
      const { category, tags } = req.query
      const templates = await getTemplateLibrary()

      let filteredTemplates = Object.values(templates)

      // Filter by category if provided
      if (category) {
        filteredTemplates = filteredTemplates.filter(t =>
          t.metadata.category === category
        )
      }

      // Filter by tags if provided
      if (tags) {
        const tagArray = tags.split(',').map(tag => tag.trim())
        filteredTemplates = filteredTemplates.filter(t =>
          tagArray.some(tag => t.metadata.tags.includes(tag))
        )
      }

      res.json({
        success: true,
        templates: filteredTemplates.map(t => t.metadata),
        total: filteredTemplates.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve templates',
        message: error.message
      })
    }
  })

  // GET /api/templates/:templateId - Get specific template
  app.get('/api/templates/:templateId', async (req, res) => {
    try {
      const { templateId } = req.params
      const templates = await getTemplateLibrary()
      const template = templates[templateId]

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
          message: `No template found with id: ${templateId}`
        })
      }

      res.json({
        success: true,
        template
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve template',
        message: error.message
      })
    }
  })

  // POST /api/templates/:templateId/instantiate - Fill template with variables
  app.post('/api/templates/:templateId/instantiate', async (req, res) => {
    try {
      const { templateId } = req.params
      const { variables } = req.body
      const templates = await getTemplateLibrary()
      const template = templates[templateId]

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
          message: `No template found with id: ${templateId}`
        })
      }

      const filledTemplate = fillTemplateVariables(template, variables || {})

      res.json({
        success: true,
        page: filledTemplate
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to instantiate template',
        message: error.message
      })
    }
  })
}

module.exports = routes
