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
  level: z.number().min(1).max(6).optional().default(1),
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
