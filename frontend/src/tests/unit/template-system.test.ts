import { describe, it, expect } from 'vitest'
import { TemplateSchema, TemplateMetadataSchema } from '../../schemas/templateSchemas'
import {
  templates,
  getTemplate,
  listTemplates,
  getTemplatesByCategory,
  fillTemplateVariables
} from '../../templates/templateLibrary'

describe('Template System', () => {
  describe('Template Schema Validation', () => {
    it('should validate dashboard template successfully', () => {
      const result = TemplateSchema.safeParse(templates.dashboard)
      expect(result.success).toBe(true)
    })

    it('should validate todoManager template successfully', () => {
      const result = TemplateSchema.safeParse(templates.todoManager)
      expect(result.success).toBe(true)
    })

    it('should validate timeline template successfully', () => {
      const result = TemplateSchema.safeParse(templates.timeline)
      expect(result.success).toBe(true)
    })

    it('should validate formPage template successfully', () => {
      const result = TemplateSchema.safeParse(templates.formPage)
      expect(result.success).toBe(true)
    })

    it('should validate analytics template successfully', () => {
      const result = TemplateSchema.safeParse(templates.analytics)
      expect(result.success).toBe(true)
    })

    it('should fail validation for invalid template', () => {
      const invalidTemplate = {
        metadata: {
          id: 'test',
          // missing required fields
        }
      }
      const result = TemplateSchema.safeParse(invalidTemplate)
      expect(result.success).toBe(false)
    })
  })

  describe('Template Metadata Validation', () => {
    it('should have complete metadata for all templates', () => {
      Object.values(templates).forEach(template => {
        expect(template.metadata).toBeDefined()
        expect(template.metadata.id).toBeTruthy()
        expect(template.metadata.name).toBeTruthy()
        expect(template.metadata.description).toBeTruthy()
        expect(template.metadata.category).toBeTruthy()
        expect(template.metadata.tags).toBeInstanceOf(Array)
        expect(template.metadata.version).toBeTruthy()
        expect(template.metadata.createdAt).toBeTruthy()
        expect(template.metadata.updatedAt).toBeTruthy()
      })
    })

    it('should have valid category values', () => {
      const validCategories = ['dashboard', 'list', 'form', 'analytics', 'timeline']
      Object.values(templates).forEach(template => {
        expect(validCategories).toContain(template.metadata.category)
      })
    })
  })

  describe('Template Helper Functions', () => {
    it('should get template by id using getTemplate', () => {
      const dashboard = getTemplate('dashboard')
      expect(dashboard).toBeDefined()
      expect(dashboard?.metadata.id).toBe('dashboard-v1')
    })

    it('should return undefined for non-existent template', () => {
      const result = getTemplate('non-existent')
      expect(result).toBeUndefined()
    })

    it('should list all templates using listTemplates', () => {
      const allTemplates = listTemplates()
      expect(allTemplates).toBeInstanceOf(Array)
      expect(allTemplates.length).toBe(5)
    })

    it('should filter templates by category', () => {
      const dashboardTemplates = getTemplatesByCategory('dashboard')
      expect(dashboardTemplates.length).toBeGreaterThan(0)
      dashboardTemplates.forEach(template => {
        expect(template.metadata.category).toBe('dashboard')
      })
    })

    it('should return empty array for non-existent category', () => {
      const result = getTemplatesByCategory('non-existent')
      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBe(0)
    })
  })

  describe('Variable Replacement', () => {
    it('should replace simple string variables', () => {
      const template = templates.dashboard
      const variables = {
        title: 'My Custom Dashboard',
        subtitle: 'Custom Subtitle'
      }
      const filled = fillTemplateVariables(template, variables)

      const headerComponent = filled.layout.find(c => c.id === 'header')
      expect(headerComponent?.config.title).toBe('My Custom Dashboard')
      expect(headerComponent?.config.subtitle).toBe('Custom Subtitle')
    })

    it('should replace numeric variables', () => {
      const template = templates.dashboard
      const variables = {
        metric1_value: 1500,
        metric2_value: 2500,
        metric3_value: 350
      }
      const filled = fillTemplateVariables(template, variables)

      const metric1 = filled.layout.find(c => c.id === 'metric-1')
      // Variables are replaced as strings when using template syntax
      expect(metric1?.config.value).toBe('1500')
    })

    it('should preserve original values when variables not provided', () => {
      const template = templates.dashboard
      const filled = fillTemplateVariables(template, {})

      const headerComponent = filled.layout.find(c => c.id === 'header')
      expect(headerComponent?.config.title).toBe('{{title}}')
    })

    it('should replace variables in nested objects', () => {
      const template = templates.analytics
      const variables = {
        title: 'Sales Analytics',
        subtitle: 'Q4 2025 Performance',
        kpi1_label: 'Total Sales',
        kpi1_value: '$125,000',
        kpi1_icon: '💵'
      }
      const filled = fillTemplateVariables(template, variables)

      const headerComponent = filled.layout.find(c => c.id === 'header')
      expect(headerComponent?.config.title).toBe('Sales Analytics')
      expect(headerComponent?.config.subtitle).toBe('Q4 2025 Performance')

      const kpi1 = filled.layout.find(c => c.id === 'kpi-1')
      expect(kpi1?.config.label).toBe('Total Sales')
      expect(kpi1?.config.value).toBe('$125,000')
      expect(kpi1?.config.icon).toBe('💵')
    })

    it('should handle complex variables in form template', () => {
      const template = templates.formPage
      const variables = {
        title: 'Registration Form',
        subtitle: 'Sign up for our service',
        submitLabel: 'Register'
      }
      const filled = fillTemplateVariables(template, variables)

      const headerComponent = filled.layout.find(c => c.id === 'header')
      expect(headerComponent?.config.title).toBe('Registration Form')
      expect(headerComponent?.config.subtitle).toBe('Sign up for our service')

      const formComponent = filled.layout.find(c => c.id === 'form')
      expect(formComponent?.config.submitLabel).toBe('Register')
      // Fields variable is stored as-is in template (not a template variable)
      expect(formComponent?.config.fields).toBeDefined()
    })

    it('should handle missing variables gracefully', () => {
      const template = templates.todoManager
      const variables = {
        title: 'Project Tasks'
        // missing totalTasks and completedTasks
      }
      const filled = fillTemplateVariables(template, variables)

      const headerComponent = filled.layout.find(c => c.id === 'header')
      expect(headerComponent?.config.title).toBe('Project Tasks')

      const totalStat = filled.layout.find(c => c.id === 'stat-total')
      expect(totalStat?.config.value).toBe('{{totalTasks}}')
    })
  })

  describe('Template Structure', () => {
    it('should have layout array for all templates', () => {
      Object.values(templates).forEach(template => {
        expect(template.layout).toBeInstanceOf(Array)
        expect(template.layout.length).toBeGreaterThan(0)
      })
    })

    it('should have components array for all templates', () => {
      Object.values(templates).forEach(template => {
        expect(template.components).toBeInstanceOf(Array)
        expect(template.components.length).toBeGreaterThan(0)
      })
    })

    it('should have unique component IDs in each template', () => {
      Object.values(templates).forEach(template => {
        const ids = template.layout.map(c => c.id)
        const uniqueIds = new Set(ids)
        expect(ids.length).toBe(uniqueIds.size)
      })
    })

    it('should have valid component types', () => {
      Object.values(templates).forEach(template => {
        template.layout.forEach(component => {
          expect(component.id).toBeTruthy()
          expect(component.type).toBeTruthy()
          expect(component.config).toBeDefined()
        })
      })
    })
  })

  describe('Template Variables', () => {
    it('should have variables defined for all templates', () => {
      Object.values(templates).forEach(template => {
        expect(template.variables).toBeDefined()
      })
    })

    it('should have default values in variables', () => {
      const dashboard = templates.dashboard
      expect(dashboard.variables?.title).toBeTruthy()
      expect(dashboard.variables?.subtitle).toBeTruthy()
      expect(dashboard.variables?.metric1_label).toBeTruthy()
    })
  })

  describe('Specific Template Tests', () => {
    it('dashboard template should have 3 metrics', () => {
      const dashboard = templates.dashboard
      const metrics = dashboard.layout.filter(c => c.type === 'stat')
      expect(metrics.length).toBe(3)
    })

    it('analytics template should have 4 KPI stats', () => {
      const analytics = templates.analytics
      const kpis = analytics.layout.filter(c => c.type === 'stat')
      expect(kpis.length).toBe(4)
    })

    it('todoManager template should have 2 stats', () => {
      const todoManager = templates.todoManager
      const stats = todoManager.layout.filter(c => c.type === 'stat')
      expect(stats.length).toBe(2)
    })

    it('timeline template should have timeline component', () => {
      const timeline = templates.timeline
      const timelineComponent = timeline.layout.find(c => c.type === 'timeline')
      expect(timelineComponent).toBeDefined()
    })

    it('formPage template should have form component', () => {
      const formPage = templates.formPage
      const formComponent = formPage.layout.find(c => c.type === 'form')
      expect(formComponent).toBeDefined()
    })

    it('analytics template should have tabs component', () => {
      const analytics = templates.analytics
      const tabsComponent = analytics.layout.find(c => c.type === 'tabs')
      expect(tabsComponent).toBeDefined()
      expect(tabsComponent?.config.tabs).toBeInstanceOf(Array)
      expect(tabsComponent?.config.tabs.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty variables object', () => {
      const template = templates.dashboard
      const filled = fillTemplateVariables(template, {})
      expect(filled).toBeDefined()
      expect(filled.layout).toBeInstanceOf(Array)
    })

    it('should handle null config values', () => {
      const template = templates.timeline
      const variables = { title: null, subtitle: null }
      const filled = fillTemplateVariables(template, variables)
      expect(filled).toBeDefined()
    })

    it('should preserve non-string values in config', () => {
      const template = templates.dashboard
      const filled = fillTemplateVariables(template, {})
      const gridComponent = filled.layout.find(c => c.type === 'Grid')
      expect(gridComponent?.config.cols).toBe(3)
      expect(gridComponent?.config.gap).toBe(6)
    })

    it('should handle special characters in variables', () => {
      const template = templates.formPage
      const variables = {
        title: 'Contact Us! (We\'re here 24/7)',
        subtitle: 'Questions? Let\'s talk!'
      }
      const filled = fillTemplateVariables(template, variables)
      const headerComponent = filled.layout.find(c => c.id === 'header')
      expect(headerComponent?.config.title).toBe('Contact Us! (We\'re here 24/7)')
    })
  })
})
