import { describe, it, expect } from 'vitest'
import {
  HeaderSchema,
  StatSchema,
  TodoListSchema,
  DataTableSchema,
  ListSchema,
  FormSchema,
  TabsSchema,
  TimelineSchema,
  CardSchema,
  GridSchema,
  BadgeSchema,
  MetricSchema,
  ProfileHeaderSchema,
  CapabilityListSchema,
  ButtonSchema,
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

    it('should validate header with subtitle', () => {
      const validProps = {
        title: "My Title",
        level: 2,
        subtitle: "My Subtitle"
      }

      expect(() => HeaderSchema.parse(validProps)).not.toThrow()
    })

    it('should reject invalid level (too high)', () => {
      const invalidProps = {
        title: "My Title",
        level: 7  // Invalid: must be 1-6
      }

      expect(() => HeaderSchema.parse(invalidProps)).toThrow()
    })

    it('should reject invalid level (too low)', () => {
      const invalidProps = {
        title: "My Title",
        level: 0  // Invalid: must be 1-6
      }

      expect(() => HeaderSchema.parse(invalidProps)).toThrow()
    })

    it('should reject missing title', () => {
      const invalidProps = {
        level: 1
      }

      expect(() => HeaderSchema.parse(invalidProps)).toThrow()
    })

    it('should reject empty title', () => {
      const invalidProps = {
        title: "",
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

    it('should validate with all optional fields', () => {
      const validProps = {
        label: "Revenue",
        value: "$1,234",
        change: 5.5,
        icon: "💰",
        description: "Total revenue this month"
      }

      expect(() => StatSchema.parse(validProps)).not.toThrow()
    })

    it('should reject missing label', () => {
      const invalidProps = {
        value: 100
      }

      expect(() => StatSchema.parse(invalidProps)).toThrow()
    })

    it('should reject missing value', () => {
      const invalidProps = {
        label: "Count"
      }

      expect(() => StatSchema.parse(invalidProps)).toThrow()
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

    it('should accept all valid sortBy values', () => {
      expect(() => TodoListSchema.parse({ sortBy: 'priority' })).not.toThrow()
      expect(() => TodoListSchema.parse({ sortBy: 'date' })).not.toThrow()
      expect(() => TodoListSchema.parse({ sortBy: 'default' })).not.toThrow()
    })

    it('should reject invalid sortBy value', () => {
      const invalidProps = {
        sortBy: 'invalid'
      }

      expect(() => TodoListSchema.parse(invalidProps)).toThrow()
    })
  })

  describe('DataTableSchema', () => {
    it('should validate with all props', () => {
      const validProps = {
        columns: ['name', 'email', 'status'],
        sortable: true,
        filterable: true
      }

      expect(() => DataTableSchema.parse(validProps)).not.toThrow()
    })

    it('should validate with empty object', () => {
      expect(() => DataTableSchema.parse({})).not.toThrow()
    })

    it('should validate with empty columns array', () => {
      const validProps = {
        columns: []
      }

      expect(() => DataTableSchema.parse(validProps)).not.toThrow()
    })
  })

  describe('ListSchema', () => {
    it('should validate with items', () => {
      const validProps = {
        items: ['Item 1', 'Item 2', 'Item 3'],
        ordered: false
      }

      expect(() => ListSchema.parse(validProps)).not.toThrow()
    })

    it('should validate as ordered list', () => {
      const validProps = {
        items: ['First', 'Second', 'Third'],
        ordered: true,
        icon: '✓'
      }

      expect(() => ListSchema.parse(validProps)).not.toThrow()
    })

    it('should validate with empty object', () => {
      expect(() => ListSchema.parse({})).not.toThrow()
    })
  })

  describe('FormSchema', () => {
    it('should validate with fields', () => {
      const validProps = {
        fields: [
          { label: 'Name', type: 'text', required: true },
          { label: 'Email', type: 'email', placeholder: 'user@example.com' }
        ],
        submitLabel: 'Submit Form'
      }

      expect(() => FormSchema.parse(validProps)).not.toThrow()
    })

    it('should validate with minimal fields', () => {
      const validProps = {
        fields: [
          { label: 'Input', type: 'text' }
        ]
      }

      expect(() => FormSchema.parse(validProps)).not.toThrow()
    })

    it('should reject missing fields', () => {
      const invalidProps = {
        submitLabel: 'Submit'
      }

      expect(() => FormSchema.parse(invalidProps)).toThrow()
    })

    it('should reject field without label', () => {
      const invalidProps = {
        fields: [
          { type: 'text' }
        ]
      }

      expect(() => FormSchema.parse(invalidProps)).toThrow()
    })
  })

  describe('TabsSchema', () => {
    it('should validate with tabs', () => {
      const validProps = {
        tabs: [
          { label: 'Tab 1', content: 'Content 1' },
          { label: 'Tab 2', content: 'Content 2' }
        ]
      }

      expect(() => TabsSchema.parse(validProps)).not.toThrow()
    })

    it('should reject missing tabs', () => {
      const invalidProps = {}

      expect(() => TabsSchema.parse(invalidProps)).toThrow()
    })

    it('should reject tabs without label', () => {
      const invalidProps = {
        tabs: [
          { content: 'Content only' }
        ]
      }

      expect(() => TabsSchema.parse(invalidProps)).toThrow()
    })
  })

  describe('TimelineSchema', () => {
    it('should validate with events', () => {
      const validProps = {
        events: [
          { id: 1, title: 'Event 1', date: '2025-01-01', description: 'First event' },
          { id: 2, title: 'Event 2', date: '2025-01-02', description: 'Second event' }
        ],
        orientation: 'vertical' as const
      }

      expect(() => TimelineSchema.parse(validProps)).not.toThrow()
    })

    it('should validate with horizontal orientation', () => {
      const validProps = {
        orientation: 'horizontal' as const
      }

      expect(() => TimelineSchema.parse(validProps)).not.toThrow()
    })

    it('should validate with empty object', () => {
      expect(() => TimelineSchema.parse({})).not.toThrow()
    })

    it('should reject invalid orientation', () => {
      const invalidProps = {
        orientation: 'diagonal'
      }

      expect(() => TimelineSchema.parse(invalidProps)).toThrow()
    })
  })

  describe('CardSchema', () => {
    it('should validate with all props', () => {
      const validProps = {
        title: 'Card Title',
        description: 'Card description',
        className: 'custom-class'
      }

      expect(() => CardSchema.parse(validProps)).not.toThrow()
    })

    it('should validate with empty object', () => {
      expect(() => CardSchema.parse({})).not.toThrow()
    })

    it('should validate with partial props', () => {
      const validProps = {
        title: 'Just a title'
      }

      expect(() => CardSchema.parse(validProps)).not.toThrow()
    })
  })

  describe('GridSchema', () => {
    it('should validate with cols and gap', () => {
      const validProps = {
        cols: 3,
        gap: 4
      }

      expect(() => GridSchema.parse(validProps)).not.toThrow()
    })

    it('should validate with empty object', () => {
      expect(() => GridSchema.parse({})).not.toThrow()
    })

    it('should validate with just cols', () => {
      const validProps = {
        cols: 2
      }

      expect(() => GridSchema.parse(validProps)).not.toThrow()
    })
  })

  describe('BadgeSchema', () => {
    it('should validate with all variants', () => {
      expect(() => BadgeSchema.parse({ variant: 'default', children: 'Badge' })).not.toThrow()
      expect(() => BadgeSchema.parse({ variant: 'destructive', children: 'Badge' })).not.toThrow()
      expect(() => BadgeSchema.parse({ variant: 'secondary', children: 'Badge' })).not.toThrow()
      expect(() => BadgeSchema.parse({ variant: 'outline', children: 'Badge' })).not.toThrow()
    })

    it('should validate without variant', () => {
      const validProps = {
        children: 'Badge Text'
      }

      expect(() => BadgeSchema.parse(validProps)).not.toThrow()
    })

    it('should reject missing children', () => {
      const invalidProps = {
        variant: 'default'
      }

      expect(() => BadgeSchema.parse(invalidProps)).toThrow()
    })

    it('should reject invalid variant', () => {
      const invalidProps = {
        variant: 'invalid',
        children: 'Badge'
      }

      expect(() => BadgeSchema.parse(invalidProps)).toThrow()
    })
  })

  describe('MetricSchema', () => {
    it('should validate with number value', () => {
      const validProps = {
        value: 1234,
        label: 'Total Users'
      }

      expect(() => MetricSchema.parse(validProps)).not.toThrow()
    })

    it('should validate with string value', () => {
      const validProps = {
        value: '99.9%',
        label: 'Uptime'
      }

      expect(() => MetricSchema.parse(validProps)).not.toThrow()
    })

    it('should validate with description', () => {
      const validProps = {
        value: 1234,
        label: 'Active Users',
        description: 'Users active in last 30 days'
      }

      expect(() => MetricSchema.parse(validProps)).not.toThrow()
    })

    it('should reject missing value', () => {
      const invalidProps = {
        label: 'Count'
      }

      expect(() => MetricSchema.parse(invalidProps)).toThrow()
    })

    it('should reject missing label', () => {
      const invalidProps = {
        value: 100
      }

      expect(() => MetricSchema.parse(invalidProps)).toThrow()
    })
  })

  describe('ProfileHeaderSchema', () => {
    it('should validate with all props', () => {
      const validProps = {
        name: 'John Doe',
        description: 'Software Engineer',
        avatar_color: '#3B82F6',
        status: 'active',
        specialization: 'Frontend Development'
      }

      expect(() => ProfileHeaderSchema.parse(validProps)).not.toThrow()
    })

    it('should validate with minimal props', () => {
      const validProps = {
        name: 'Jane Smith'
      }

      expect(() => ProfileHeaderSchema.parse(validProps)).not.toThrow()
    })

    it('should reject missing name', () => {
      const invalidProps = {
        description: 'Engineer'
      }

      expect(() => ProfileHeaderSchema.parse(invalidProps)).toThrow()
    })
  })

  describe('CapabilityListSchema', () => {
    it('should validate with capabilities', () => {
      const validProps = {
        title: 'My Skills',
        capabilities: ['JavaScript', 'TypeScript', 'React']
      }

      expect(() => CapabilityListSchema.parse(validProps)).not.toThrow()
    })

    it('should reject missing title', () => {
      const invalidProps = {
        capabilities: ['Skill 1', 'Skill 2']
      }

      expect(() => CapabilityListSchema.parse(invalidProps)).toThrow()
    })

    it('should reject missing capabilities', () => {
      const invalidProps = {
        title: 'Skills'
      }

      expect(() => CapabilityListSchema.parse(invalidProps)).toThrow()
    })

    it('should validate with empty capabilities array', () => {
      const validProps = {
        title: 'Skills',
        capabilities: []
      }

      expect(() => CapabilityListSchema.parse(validProps)).not.toThrow()
    })
  })

  describe('ButtonSchema', () => {
    it('should validate with all variants', () => {
      expect(() => ButtonSchema.parse({ variant: 'default', children: 'Click Me' })).not.toThrow()
      expect(() => ButtonSchema.parse({ variant: 'destructive', children: 'Delete' })).not.toThrow()
      expect(() => ButtonSchema.parse({ variant: 'outline', children: 'Cancel' })).not.toThrow()
      expect(() => ButtonSchema.parse({ variant: 'secondary', children: 'Secondary' })).not.toThrow()
    })

    it('should validate without variant', () => {
      const validProps = {
        children: 'Button Text'
      }

      expect(() => ButtonSchema.parse(validProps)).not.toThrow()
    })

    it('should validate with className', () => {
      const validProps = {
        children: 'Styled Button',
        className: 'mt-4'
      }

      expect(() => ButtonSchema.parse(validProps)).not.toThrow()
    })

    it('should reject missing children', () => {
      const invalidProps = {
        variant: 'default'
      }

      expect(() => ButtonSchema.parse(invalidProps)).toThrow()
    })

    it('should reject invalid variant', () => {
      const invalidProps = {
        variant: 'invalid',
        children: 'Button'
      }

      expect(() => ButtonSchema.parse(invalidProps)).toThrow()
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

    it('should have exactly 15 schemas in registry', () => {
      const schemaCount = Object.keys(ComponentSchemas).length
      expect(schemaCount).toBe(15)
    })

    it('should export all individual schemas', () => {
      expect(HeaderSchema).toBeDefined()
      expect(StatSchema).toBeDefined()
      expect(TodoListSchema).toBeDefined()
      expect(DataTableSchema).toBeDefined()
      expect(ListSchema).toBeDefined()
      expect(FormSchema).toBeDefined()
      expect(TabsSchema).toBeDefined()
      expect(TimelineSchema).toBeDefined()
      expect(CardSchema).toBeDefined()
      expect(GridSchema).toBeDefined()
      expect(BadgeSchema).toBeDefined()
      expect(MetricSchema).toBeDefined()
      expect(ProfileHeaderSchema).toBeDefined()
      expect(CapabilityListSchema).toBeDefined()
      expect(ButtonSchema).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle edge case: header with level at boundaries', () => {
      expect(() => HeaderSchema.parse({ title: 'Test', level: 1 })).not.toThrow()
      expect(() => HeaderSchema.parse({ title: 'Test', level: 6 })).not.toThrow()
    })

    it('should handle edge case: negative change in stat', () => {
      const validProps = {
        label: 'Users',
        value: 100,
        change: -25.5
      }

      expect(() => StatSchema.parse(validProps)).not.toThrow()
    })

    it('should handle edge case: zero change in stat', () => {
      const validProps = {
        label: 'Users',
        value: 100,
        change: 0
      }

      expect(() => StatSchema.parse(validProps)).not.toThrow()
    })

    it('should handle edge case: empty string in list items', () => {
      const validProps = {
        items: ['', 'Item 2', '']
      }

      expect(() => ListSchema.parse(validProps)).not.toThrow()
    })
  })
})
