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

export function formatComponentName(type: string): string {
  return type.replace(/([A-Z])/g, ' $1').trim()
}

export function categorizeComponent(type: string): string {
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

export function getComponentDescription(type: string): string {
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

export function getComponentExamples(type: string): any[] {
  const examples: Record<string, any[]> = {
    header: [
      { title: "Dashboard", level: 1 },
      { title: "Settings", level: 2, subtitle: "Manage your preferences" },
      { title: "User Profile", level: 2, subtitle: "View and edit your information" }
    ],
    stat: [
      { label: "Active Users", value: 1234, change: 12.5, icon: "👥" },
      { label: "Revenue", value: "$50K", change: -3.2, icon: "💰" },
      { label: "Conversion Rate", value: "4.8%", icon: "📊" }
    ],
    todoList: [
      { showCompleted: false, sortBy: "priority" },
      { showCompleted: true, sortBy: "date", filterTags: ["urgent", "bug"] },
      { sortBy: "default" }
    ],
    dataTable: [
      { columns: ["Name", "Email", "Status"], sortable: true, filterable: true },
      { sortable: true },
      { columns: ["ID", "Title", "Date"], filterable: true }
    ],
    list: [
      { items: ["Item 1", "Item 2", "Item 3"], ordered: false },
      { items: ["First step", "Second step", "Third step"], ordered: true, icon: "✓" },
      { items: ["Feature A", "Feature B", "Feature C"], icon: "⭐" }
    ],
    form: [
      {
        fields: [
          { label: "Name", type: "text", placeholder: "Enter your name", required: true },
          { label: "Email", type: "email", placeholder: "you@example.com", required: true }
        ],
        submitLabel: "Submit"
      },
      {
        fields: [
          { label: "Username", type: "text", required: true },
          { label: "Password", type: "password", required: true },
          { label: "Remember me", type: "checkbox" }
        ],
        submitLabel: "Login"
      },
      {
        fields: [
          { label: "Message", type: "textarea", placeholder: "Type your message..." }
        ],
        submitLabel: "Send"
      }
    ],
    tabs: [
      {
        tabs: [
          { label: "Overview", content: "Overview content here" },
          { label: "Details", content: "Details content here" }
        ]
      },
      {
        tabs: [
          { label: "Profile", content: "User profile" },
          { label: "Settings", content: "Account settings" },
          { label: "Billing", content: "Billing information" }
        ]
      }
    ],
    timeline: [
      {
        events: [
          { id: 1, title: "Project Started", date: "2024-01-01", description: "Initial setup" },
          { id: 2, title: "First Release", date: "2024-02-15", description: "Version 1.0" }
        ],
        orientation: "vertical"
      },
      {
        events: [
          { id: 1, title: "Task Created", date: "2024-03-01", description: "New task assigned" },
          { id: 2, title: "Task Completed", date: "2024-03-05", description: "Task finished" }
        ]
      },
      { orientation: "horizontal" }
    ],
    Card: [
      { title: "Welcome", description: "Getting started guide" },
      { title: "Analytics Dashboard", description: "View your metrics" },
      { description: "Card without title" }
    ],
    Grid: [
      { cols: 3, gap: 4 },
      { cols: 2, gap: 6 },
      { cols: 4 }
    ],
    Badge: [
      { variant: "default", children: "Active" },
      { variant: "destructive", children: "Error" },
      { variant: "secondary", children: "Pending" }
    ],
    Metric: [
      { value: 1234, label: "Total Users" },
      { value: "$45,678", label: "Revenue", description: "Monthly recurring" },
      { value: "98.5%", label: "Uptime" }
    ],
    ProfileHeader: [
      { name: "John Doe", description: "Software Engineer", status: "Online" },
      { name: "Jane Smith", description: "Product Manager", avatar_color: "#3b82f6", specialization: "AI/ML" },
      { name: "Bob Wilson", status: "Away" }
    ],
    CapabilityList: [
      {
        title: "Core Features",
        capabilities: ["Real-time updates", "Advanced analytics", "Custom dashboards"]
      },
      {
        title: "Integrations",
        capabilities: ["API access", "Webhooks", "Third-party apps"]
      }
    ],
    Button: [
      { variant: "default", children: "Submit" },
      { variant: "destructive", children: "Delete" },
      { variant: "outline", children: "Cancel", className: "ml-2" }
    ]
  }

  return examples[type] || []
}

export function getRequiredProps(jsonSchema: any): string[] {
  return jsonSchema.required || []
}

export function getOptionalProps(jsonSchema: any): string[] {
  const allProps = Object.keys(jsonSchema.properties || {})
  const required = jsonSchema.required || []
  return allProps.filter(prop => !required.includes(prop))
}

export function getCategories(catalog: any[]): string[] {
  return [...new Set(catalog.map(c => c.category))]
}
