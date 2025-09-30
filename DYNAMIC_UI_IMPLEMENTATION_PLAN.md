# Dynamic UI System - Complete Implementation Plan
**Version:** 1.0.0
**Date:** September 30, 2025
**Status:** Ready for Implementation
**Estimated Timeline:** 4 weeks

---

## 📋 Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Architecture Overview](#architecture-overview)
4. [Phase 1: Zod Validation](#phase-1-zod-validation)
5. [Phase 2: Template System](#phase-2-template-system)
6. [Phase 3: Component Catalog API](#phase-3-component-catalog-api)
7. [Phase 4: Documentation & Polish](#phase-4-documentation--polish)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Plan](#deployment-plan)
10. [Success Metrics](#success-metrics)
11. [Reference Documents](#reference-documents)

---

## Executive Summary

### The Problem
- Agents can build dynamic UIs via JSON, but no validation exists
- No templates guide agents to working patterns
- One-shot reliability is low (~60%)
- Agents must guess component structures

### The Solution
Implement a three-layer approach:
1. **Validation Layer** (Zod) - Catch errors before render
2. **Template Layer** - Pre-validated layouts for common use cases
3. **Discovery Layer** - API for agents to find components

### Expected Outcomes
- One-shot reliability: 60% → 95%
- Agent self-correction via error messages
- 80% coverage with 5 templates
- Component discovery API for flexibility

### Timeline
- **Phase 1:** 1 week (Validation)
- **Phase 2:** 2 weeks (Templates)
- **Phase 3:** 1 week (Catalog API)
- **Phase 4:** 1 week (Documentation)
- **Total:** 5 weeks

---

## Current State Analysis

### What We Have ✅
```
✅ Server-Driven UI (SDUI) architecture
✅ 15 component types implemented
✅ JSON-based layout API
✅ Component registry with renderComponent()
✅ Demo data for components
✅ 19 unit tests (100% passing)
```

### What We're Missing ❌
```
❌ Runtime validation (props can be wrong)
❌ Error feedback to agents
❌ Templates for common layouts
❌ Component discovery API
❌ Schema documentation for agents
❌ Usage examples in machine-readable format
```

### Current Architecture
```
Agent → JSON Layout → API → Frontend → renderComponent() → UI
         (no validation)              (may crash)
```

### Target Architecture
```
Agent → JSON Layout → Validation → Templates → renderComponent() → UI
                         ↓                          ↓
                    Error Feedback            Validated Props
```

---

## Architecture Overview

### Three-Layer System

**Layer 1: Validation**
```typescript
// Zod schemas validate all component props
const schemas = {
  header: z.object({...}),
  stat: z.object({...}),
  // ... all 15 components
}

// Validate before rendering
const result = schema.safeParse(props)
if (!result.success) {
  return <ValidationError errors={result.error} />
}
```

**Layer 2: Templates**
```typescript
// Pre-validated layouts
const templates = {
  dashboard: {
    schema: DashboardSchema,
    layout: [...],
    example: {...}
  }
}
```

**Layer 3: Discovery**
```typescript
// Component catalog API
GET /api/components/catalog
{
  "components": [
    { "type": "stat", "schema": {...}, "examples": [...] }
  ]
}
```

---

## Phase 1: Zod Validation

### Duration: 1 Week
**Goal:** Validate all component props at runtime

### Tasks

#### 1.1 Install Dependencies
```bash
cd /workspaces/agent-feed/frontend
npm install zod
```

#### 1.2 Create Schema Registry
**File:** `/frontend/src/schemas/componentSchemas.ts`

```typescript
import { z } from 'zod'

// Base schema for all components
export const BaseComponentSchema = z.object({
  type: z.string(),
  props: z.record(z.any()),
  children: z.array(z.lazy(() => BaseComponentSchema)).optional()
})

// Individual component schemas
export const HeaderSchema = z.object({
  title: z.string().min(1, "Title is required"),
  level: z.number().min(1).max(6),
  subtitle: z.string().optional()
})

export const StatSchema = z.object({
  label: z.string().min(1, "Label is required"),
  value: z.union([z.string(), z.number()]),
  change: z.number().optional(),
  icon: z.string().optional(),
  description: z.string().optional()
})

export const TodoListSchema = z.object({
  showCompleted: z.boolean().optional().default(false),
  sortBy: z.enum(['priority', 'date', 'default']).optional(),
  filterTags: z.array(z.string()).optional()
})

export const DataTableSchema = z.object({
  columns: z.array(z.string()).optional(),
  sortable: z.boolean().optional(),
  filterable: z.boolean().optional()
})

export const ListSchema = z.object({
  items: z.array(z.string()).optional(),
  ordered: z.boolean().optional(),
  icon: z.string().optional()
})

export const FormSchema = z.object({
  fields: z.array(z.object({
    label: z.string(),
    type: z.string(),
    placeholder: z.string().optional(),
    required: z.boolean().optional()
  })),
  submitLabel: z.string().optional()
})

export const TabsSchema = z.object({
  tabs: z.array(z.object({
    label: z.string(),
    content: z.string()
  }))
})

export const TimelineSchema = z.object({
  events: z.array(z.object({
    id: z.number(),
    title: z.string(),
    date: z.string(),
    description: z.string()
  })).optional(),
  orientation: z.enum(['vertical', 'horizontal']).optional()
})

export const CardSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  className: z.string().optional()
})

export const GridSchema = z.object({
  cols: z.number().optional(),
  gap: z.number().optional()
})

export const BadgeSchema = z.object({
  variant: z.enum(['default', 'destructive', 'secondary', 'outline']).optional(),
  children: z.string()
})

export const MetricSchema = z.object({
  value: z.union([z.string(), z.number()]),
  label: z.string(),
  description: z.string().optional()
})

export const ProfileHeaderSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  avatar_color: z.string().optional(),
  status: z.string().optional(),
  specialization: z.string().optional()
})

export const CapabilityListSchema = z.object({
  title: z.string(),
  capabilities: z.array(z.string())
})

export const ButtonSchema = z.object({
  variant: z.enum(['default', 'destructive', 'outline', 'secondary']).optional(),
  children: z.string(),
  className: z.string().optional()
})

// Component schema registry
export const ComponentSchemas = {
  header: HeaderSchema,
  stat: StatSchema,
  todoList: TodoListSchema,
  dataTable: DataTableSchema,
  list: ListSchema,
  form: FormSchema,
  tabs: TabsSchema,
  timeline: TimelineSchema,
  Card: CardSchema,
  Grid: GridSchema,
  Badge: BadgeSchema,
  Metric: MetricSchema,
  ProfileHeader: ProfileHeaderSchema,
  CapabilityList: CapabilityListSchema,
  Button: ButtonSchema
}

// Type inference
export type ComponentType = keyof typeof ComponentSchemas
```

#### 1.3 Update DynamicPageRenderer with Validation
**File:** `/frontend/src/components/DynamicPageRenderer.tsx`

Add validation to `renderComponent()`:

```typescript
import { ComponentSchemas } from '../schemas/componentSchemas'
import { ZodError } from 'zod'

const renderComponent = (config: ComponentConfig): React.ReactNode => {
  const { type, props = {}, children = [] } = config;

  // Validate component props
  const schema = ComponentSchemas[type as keyof typeof ComponentSchemas]

  if (schema) {
    try {
      // Validate props with Zod
      const validatedProps = schema.parse(props)

      // Continue with existing switch statement using validatedProps
      switch (type) {
        case 'header':
          return <HeaderComponent {...validatedProps} />
        // ... rest of switch
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Component Validation Error</h3>
                <p className="text-sm text-red-700 mt-1">Type: {type}</p>
                <ul className="mt-2 space-y-1">
                  {error.errors.map((err, idx) => (
                    <li key={idx} className="text-sm text-red-600">
                      <code className="bg-red-100 px-1 rounded">{err.path.join('.')}</code>: {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )
      }
    }
  }

  // Fallback for unknown types or unvalidated components
  return <UnknownComponent type={type} />
}
```

#### 1.4 Create Validation Error Component
**File:** `/frontend/src/components/ValidationError.tsx`

```typescript
import React from 'react'
import { AlertCircle } from 'lucide-react'
import { ZodError } from 'zod'

interface ValidationErrorProps {
  componentType: string
  errors: ZodError
}

export const ValidationError: React.FC<ValidationErrorProps> = ({
  componentType,
  errors
}) => {
  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 my-4">
      <div className="flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-900">
            Component Validation Error
          </h3>
          <p className="text-sm text-red-700 mt-1">
            Component type: <code className="bg-red-100 px-2 py-0.5 rounded font-mono">{componentType}</code>
          </p>

          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-red-900">Issues found:</p>
            <ul className="space-y-2">
              {errors.errors.map((error, idx) => (
                <li key={idx} className="text-sm bg-white rounded p-3 border border-red-200">
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-red-600">
                      {error.path.join('.') || 'root'}
                    </span>
                    <span className="text-gray-600">→</span>
                    <span className="text-red-700">{error.message}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-xs text-blue-900">
              <strong>💡 Tip:</strong> Check the component schema documentation at
              <code className="ml-1 bg-blue-100 px-1 rounded">/api/components/catalog</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

#### 1.5 Add Validation Tests
**File:** `/frontend/src/tests/unit/component-validation.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import {
  HeaderSchema,
  StatSchema,
  TodoListSchema,
  ComponentSchemas
} from '../../schemas/componentSchemas'

describe('Component Schema Validation', () => {
  describe('HeaderSchema', () => {
    it('should validate valid header props', () => {
      const validProps = {
        title: "My Title",
        level: 1
      }

      expect(() => HeaderSchema.parse(validProps)).not.toThrow()
    })

    it('should reject invalid level', () => {
      const invalidProps = {
        title: "My Title",
        level: 7  // Invalid: must be 1-6
      }

      expect(() => HeaderSchema.parse(invalidProps)).toThrow()
    })

    it('should reject missing title', () => {
      const invalidProps = {
        level: 1
      }

      expect(() => HeaderSchema.parse(invalidProps)).toThrow()
    })
  })

  describe('StatSchema', () => {
    it('should validate valid stat props', () => {
      const validProps = {
        label: "Active Users",
        value: 1234,
        change: 12.5
      }

      expect(() => StatSchema.parse(validProps)).not.toThrow()
    })

    it('should accept string or number value', () => {
      const withNumber = { label: "Count", value: 100 }
      const withString = { label: "Status", value: "Active" }

      expect(() => StatSchema.parse(withNumber)).not.toThrow()
      expect(() => StatSchema.parse(withString)).not.toThrow()
    })
  })

  describe('TodoListSchema', () => {
    it('should validate with all props', () => {
      const validProps = {
        showCompleted: true,
        sortBy: 'priority' as const,
        filterTags: ['urgent', 'today']
      }

      expect(() => TodoListSchema.parse(validProps)).not.toThrow()
    })

    it('should apply defaults for optional props', () => {
      const result = TodoListSchema.parse({})

      expect(result.showCompleted).toBe(false)
    })
  })

  describe('All Component Schemas', () => {
    it('should have schemas for all 15 components', () => {
      const expectedComponents = [
        'header', 'stat', 'todoList', 'dataTable', 'list',
        'form', 'tabs', 'timeline', 'Card', 'Grid',
        'Badge', 'Metric', 'ProfileHeader', 'CapabilityList', 'Button'
      ]

      expectedComponents.forEach(componentType => {
        expect(ComponentSchemas).toHaveProperty(componentType)
      })
    })
  })
})
```

### Deliverables for Phase 1
- ✅ Zod installed and configured
- ✅ Schema registry with all 15 component schemas
- ✅ Validation integrated into renderComponent()
- ✅ ValidationError component for user feedback
- ✅ 15+ unit tests for schema validation
- ✅ Error messages display in UI

### Success Criteria
- All component props validated at runtime
- Clear error messages when validation fails
- Zero unhandled validation errors
- Tests pass with 100% coverage

---

## Phase 2: Template System

### Duration: 2 Weeks
**Goal:** Create pre-validated templates for common use cases

### Tasks

#### 2.1 Create Template Schema
**File:** `/frontend/src/schemas/templateSchemas.ts`

```typescript
import { z } from 'zod'

// Template metadata
export const TemplateMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(['dashboard', 'list', 'form', 'analytics', 'timeline']),
  tags: z.array(z.string()),
  version: z.string(),
  author: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

// Template data structure
export const TemplateSchema = z.object({
  metadata: TemplateMetadataSchema,
  layout: z.array(z.object({
    id: z.string(),
    type: z.string(),
    config: z.record(z.any())
  })),
  components: z.array(z.string()),
  variables: z.record(z.any()).optional(),  // Replaceable values
  validation: z.object({
    required: z.array(z.string()).optional(),
    maxComponents: z.number().optional(),
    allowedComponents: z.array(z.string()).optional()
  }).optional()
})

export type Template = z.infer<typeof TemplateSchema>
```

#### 2.2 Build Template Library
**File:** `/frontend/src/templates/templateLibrary.ts`

```typescript
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
```

#### 2.3 Create Template API Endpoint
**File:** `/api-server/routes/templates.js`

```javascript
// Add to existing server.js
app.get('/api/templates', (req, res) => {
  const { category, tags } = req.query

  let filteredTemplates = Object.values(templates)

  if (category) {
    filteredTemplates = filteredTemplates.filter(t =>
      t.metadata.category === category
    )
  }

  if (tags) {
    const tagArray = tags.split(',')
    filteredTemplates = filteredTemplates.filter(t =>
      tagArray.some(tag => t.metadata.tags.includes(tag))
    )
  }

  res.json({
    success: true,
    templates: filteredTemplates.map(t => t.metadata),
    total: filteredTemplates.length
  })
})

app.get('/api/templates/:templateId', (req, res) => {
  const { templateId } = req.params
  const template = templates[templateId]

  if (!template) {
    return res.status(404).json({
      success: false,
      error: 'Template not found'
    })
  }

  res.json({
    success: true,
    template
  })
})

app.post('/api/templates/:templateId/instantiate', (req, res) => {
  const { templateId } = req.params
  const { variables } = req.body

  const template = templates[templateId]

  if (!template) {
    return res.status(404).json({
      success: false,
      error: 'Template not found'
    })
  }

  const filledTemplate = fillTemplateVariables(template, variables || {})

  res.json({
    success: true,
    page: filledTemplate
  })
})
```

### Deliverables for Phase 2
- ✅ Template schema with Zod validation
- ✅ 5 production-ready templates (dashboard, todo, timeline, form, analytics)
- ✅ Template variable replacement system
- ✅ Template API endpoints (GET /api/templates, POST /api/templates/:id/instantiate)
- ✅ Template documentation with examples

### Success Criteria
- All 5 templates render without errors
- Variable replacement works correctly
- API endpoints functional
- Templates cover 80% of common use cases

---

## Phase 3: Component Catalog API

### Duration: 1 Week
**Goal:** Create API for agents to discover components

### Tasks

#### 3.1 Generate JSON Schema from Zod
**File:** `/frontend/src/utils/schemaConverter.ts`

```typescript
import { zodToJsonSchema } from 'zod-to-json-schema'
import { ComponentSchemas } from '../schemas/componentSchemas'

export function generateComponentCatalog() {
  const catalog = Object.entries(ComponentSchemas).map(([type, schema]) => {
    const jsonSchema = zodToJsonSchema(schema, type)

    return {
      type,
      name: formatComponentName(type),
      category: categorizeComponent(type),
      description: getComponentDescription(type),
      schema: jsonSchema,
      examples: getComponentExamples(type),
      required: getRequiredProps(jsonSchema),
      optional: getOptionalProps(jsonSchema)
    }
  })

  return {
    version: '1.0.0',
    totalComponents: catalog.length,
    components: catalog,
    categories: getCategories(catalog)
  }
}

function formatComponentName(type: string): string {
  return type.replace(/([A-Z])/g, ' $1').trim()
}

function categorizeComponent(type: string): string {
  const categories: Record<string, string> = {
    header: 'Typography',
    stat: 'Data Display',
    Metric: 'Data Display',
    todoList: 'Interactive',
    dataTable: 'Data Display',
    list: 'Layout',
    form: 'Interactive',
    tabs: 'Layout',
    timeline: 'Data Display',
    Card: 'Layout',
    Grid: 'Layout',
    Badge: 'Data Display',
    ProfileHeader: 'Data Display',
    CapabilityList: 'Data Display',
    Button: 'Interactive'
  }

  return categories[type] || 'Other'
}

function getComponentDescription(type: string): string {
  const descriptions: Record<string, string> = {
    header: 'Display page or section titles with configurable heading levels (h1-h6)',
    stat: 'Show key metrics with optional trend indicators and icons',
    todoList: 'Interactive task list with checkboxes, priority badges, and filtering',
    dataTable: 'Sortable and filterable data table with demo rows',
    list: 'Ordered or unordered list with optional icons',
    form: 'Input form with multiple field types and validation',
    tabs: 'Tabbed interface for organizing content',
    timeline: 'Chronological event timeline with dates and descriptions',
    Card: 'Container component with optional title and description',
    Grid: 'Responsive grid layout for organizing components',
    Badge: 'Status badge with multiple variants',
    Metric: 'Simple metric display with label and value',
    ProfileHeader: 'User profile header with avatar and details',
    CapabilityList: 'List of capabilities with bullet points',
    Button: 'Clickable button with multiple variants'
  }

  return descriptions[type] || 'Component description not available'
}

function getComponentExamples(type: string): any[] {
  // Return 2-3 examples for each component
  const examples: Record<string, any[]> = {
    header: [
      { title: "Dashboard", level: 1 },
      { title: "Settings", level: 2, subtitle: "Manage your preferences" }
    ],
    stat: [
      { label: "Active Users", value: 1234, change: 12.5, icon: "👥" },
      { label: "Revenue", value: "$50K", change: -3.2, icon: "💰" }
    ],
    // ... examples for all components
  }

  return examples[type] || []
}

function getRequiredProps(jsonSchema: any): string[] {
  return jsonSchema.required || []
}

function getOptionalProps(jsonSchema: any): string[] {
  const allProps = Object.keys(jsonSchema.properties || {})
  const required = jsonSchema.required || []
  return allProps.filter(prop => !required.includes(prop))
}

function getCategories(catalog: any[]): string[] {
  return [...new Set(catalog.map(c => c.category))]
}
```

#### 3.2 Create Catalog API Endpoint
**File:** `/api-server/routes/catalog.js`

```javascript
// Install: npm install zod-to-json-schema

import { generateComponentCatalog } from '../utils/schemaConverter.js'

app.get('/api/components/catalog', (req, res) => {
  const { category, search } = req.query

  let catalog = generateComponentCatalog()

  if (category) {
    catalog.components = catalog.components.filter(c =>
      c.category === category
    )
  }

  if (search) {
    const searchLower = search.toLowerCase()
    catalog.components = catalog.components.filter(c =>
      c.name.toLowerCase().includes(searchLower) ||
      c.description.toLowerCase().includes(searchLower) ||
      c.type.toLowerCase().includes(searchLower)
    )
  }

  res.json({
    success: true,
    ...catalog
  })
})

app.get('/api/components/catalog/:componentType', (req, res) => {
  const { componentType } = req.params
  const catalog = generateComponentCatalog()

  const component = catalog.components.find(c => c.type === componentType)

  if (!component) {
    return res.status(404).json({
      success: false,
      error: 'Component not found'
    })
  }

  res.json({
    success: true,
    component
  })
})

app.get('/api/components/categories', (req, res) => {
  const catalog = generateComponentCatalog()

  const categoriesWithCounts = catalog.categories.map(category => ({
    name: category,
    count: catalog.components.filter(c => c.category === category).length
  }))

  res.json({
    success: true,
    categories: categoriesWithCounts
  })
})
```

### Deliverables for Phase 3
- ✅ Component catalog generator (Zod → JSON Schema)
- ✅ Catalog API endpoints (GET /api/components/catalog)
- ✅ Component search and filtering
- ✅ Category organization
- ✅ Example usage for each component

### Success Criteria
- API returns complete component catalog
- JSON Schema accurately represents Zod schemas
- Examples are valid and render correctly
- Search and filtering work properly

---

## Phase 4: Documentation & Polish

### Duration: 1 Week
**Goal:** Complete documentation and Storybook integration

### Tasks

#### 4.1 Set Up Storybook
```bash
cd /workspaces/agent-feed/frontend
npx storybook@latest init
```

#### 4.2 Create Component Stories
**File:** `/frontend/src/components/DynamicComponents.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react'
import { ComponentRenderer } from './ComponentRenderer'

const meta: Meta<typeof ComponentRenderer> = {
  title: 'Dynamic Components',
  component: ComponentRenderer,
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof ComponentRenderer>

export const Header: Story = {
  args: {
    type: 'header',
    config: {
      title: 'Dashboard Overview',
      level: 1,
      subtitle: 'Welcome back to your dashboard'
    }
  }
}

export const Stat: Story = {
  args: {
    type: 'stat',
    config: {
      label: 'Active Users',
      value: 1234,
      change: 12.5,
      icon: '👥'
    }
  }
}

// ... stories for all 15 components
```

#### 4.3 Update Component Library Documentation
**File:** `/COMPONENT_LIBRARY_DOCUMENTATION.md` (Update)

Add sections:
- Validation requirements (from Zod schemas)
- Template usage examples
- Component catalog API reference
- Error handling guide
- Best practices for agents

#### 4.4 Create Agent Integration Guide
**File:** `/AGENT_INTEGRATION_GUIDE.md`

```markdown
# Agent Integration Guide - Dynamic UI System

## Quick Start

### 1. Discover Available Components
\`\`\`bash
GET /api/components/catalog
\`\`\`

### 2. Choose a Template (Recommended)
\`\`\`bash
GET /api/templates
GET /api/templates/dashboard
\`\`\`

### 3. Instantiate Template with Your Data
\`\`\`bash
POST /api/templates/dashboard/instantiate
{
  "variables": {
    "title": "My Dashboard",
    "metric1_label": "Users",
    "metric1_value": 1234
  }
}
\`\`\`

### 4. Create Dynamic Page
\`\`\`bash
POST /api/agent-pages/agents/{agentId}/pages
{
  "id": "my-dashboard",
  "title": "My Dashboard",
  "layout": [...],  // From template
  "components": [...],
  "metadata": {...}
}
\`\`\`

## Validation

All component props are validated. If validation fails:

\`\`\`json
{
  "success": false,
  "errors": [
    {
      "component": "stat",
      "field": "value",
      "error": "Expected string or number, received undefined"
    }
  ]
}
\`\`\`

Fix the errors and retry.

## Component Reference

See full component catalog: GET /api/components/catalog
\`\`\`
```

### Deliverables for Phase 4
- ✅ Storybook configured with 15 component stories
- ✅ Updated component library documentation
- ✅ Agent integration guide
- ✅ API reference documentation
- ✅ Troubleshooting guide

### Success Criteria
- Storybook runs and displays all components
- Documentation is complete and accurate
- Integration guide enables self-service
- API reference matches implementation

---

## Testing Strategy

### Unit Tests
```bash
# Phase 1: Validation
npm run test src/tests/unit/component-validation.test.ts

# Expected: 15+ tests passing
```

### Integration Tests
```bash
# Phase 2: Templates
npm run test src/tests/unit/template-system.test.ts

# Expected: 10+ tests passing
```

### E2E Tests
```bash
# Phase 3: Component Catalog
npm run test:e2e tests/e2e/component-catalog.spec.ts

# Expected: 5+ tests passing
```

### Manual Testing Checklist
- [ ] All 15 components render without errors
- [ ] Validation errors display correctly
- [ ] All 5 templates instantiate successfully
- [ ] Component catalog API returns valid data
- [ ] Storybook displays all components
- [ ] Documentation is accurate and complete

---

## Deployment Plan

### Week 1: Phase 1 (Validation)
- Deploy validation to staging
- Run automated tests
- Manual testing with sample agents
- Fix any bugs
- Deploy to production

### Week 3: Phase 2 (Templates)
- Deploy templates to staging
- Test all 5 templates
- Get agent feedback
- Iterate on templates
- Deploy to production

### Week 4: Phase 3 (Catalog API)
- Deploy catalog API to staging
- Verify API responses
- Test with agents
- Deploy to production

### Week 5: Phase 4 (Documentation)
- Publish Storybook
- Update documentation
- Create video tutorials (optional)
- Announce to agents

---

## Success Metrics

### Quantitative Metrics
- **One-shot Success Rate:** 60% → 95% (Target)
- **Validation Error Rate:** < 5% of page renders
- **Template Usage:** 80% of pages use templates
- **Component Discovery:** 100% of agents can find components via API

### Qualitative Metrics
- Agent feedback on ease of use
- Number of support requests (should decrease)
- Time to create working page (should decrease)
- Agent satisfaction score

### Monitoring
```javascript
// Track these metrics
{
  "validation_errors": count,
  "template_usage": percentage,
  "api_catalog_requests": count,
  "successful_renders": percentage,
  "average_time_to_first_render": seconds
}
```

---

## Reference Documents

### Technical Specifications
1. `/DYNAMIC_COMPONENT_SYSTEM_SPEC.md` - System architecture
2. `/DYNAMIC_UI_RESEARCH_REPORT.md` - Industry research
3. `/COMPONENT_LIBRARY_DOCUMENTATION.md` - Component reference

### Current Implementation
4. `/DYNAMIC_COMPONENT_SYSTEM_VALIDATION_REPORT.md` - Current status
5. `/frontend/src/components/DynamicPageRenderer.tsx` - Main renderer
6. `/frontend/src/schemas/componentSchemas.ts` - Validation schemas

### API Documentation
7. OpenAPI spec (to be created)
8. Postman collection (to be created)

---

## Risk Management

### Risk 1: Zod Bundle Size
- **Mitigation:** Code split, lazy load schemas
- **Fallback:** Use JSON Schema validation library

### Risk 2: Template Complexity
- **Mitigation:** Start with 5 simple templates
- **Fallback:** Provide template builder tool

### Risk 3: Agent Adoption
- **Mitigation:** Excellent documentation + examples
- **Fallback:** White-glove onboarding for first agents

### Risk 4: Breaking Changes
- **Mitigation:** Semantic versioning, deprecation notices
- **Fallback:** Maintain v1 and v2 APIs in parallel

---

## Next Steps

### Immediate (When Ready)
1. Review this implementation plan
2. Approve budget/timeline
3. Create GitHub issues for each phase
4. Assign developers

### Week 1
1. Install Zod
2. Create schema registry
3. Implement validation
4. Write tests

### Week 2-3
1. Build template library
2. Create template API
3. Test with agents
4. Iterate

### Week 4
1. Build component catalog
2. Create API endpoints
3. Generate documentation
4. Test integration

### Week 5
1. Set up Storybook
2. Finish documentation
3. Deploy to production
4. Announce to agents

---

**Plan Status:** ✅ Ready for Implementation
**Total Estimated Time:** 5 weeks
**Total Estimated Effort:** 1 developer @ 40 hours/week
**Dependencies:** Zod (npm package), zod-to-json-schema (npm package)

**Last Updated:** September 30, 2025
**Version:** 1.0.0