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
  subtitle: z.string().optional(),
  id: z.string().optional(),
  className: z.string().optional()
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
  })).min(1, "At least one field is required"),
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

// Helper for validating template variables (strings starting with {{)
const templateVariableOrString = (schema: z.ZodString) =>
  z.union([
    z.string().regex(/^\{\{.+\}\}$/),
    schema
  ])

// 1. ChecklistSchema - interactive checklist with editable items
export const ChecklistSchema = z.object({
  items: z.array(z.object({
    id: z.union([z.string(), z.number()]),
    text: z.string().min(1, "Item text is required"),
    checked: z.boolean()
  })).min(1, "At least one item is required"),
  allowEdit: z.boolean().optional().default(false),
  onChange: templateVariableOrString(z.string().url()).optional()
})

// 2. CalendarSchema - date picker with events
export const CalendarSchema = z.object({
  mode: z.enum(['single', 'multiple', 'range']).default('single'),
  selectedDate: z.union([
    z.string().datetime(),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    templateVariableOrString(z.string())
  ]).optional(),
  events: z.array(z.object({
    id: z.union([z.string(), z.number()]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    title: z.string(),
    description: z.string().optional(),
    color: z.string().optional()
  })).optional(),
  onDateSelect: templateVariableOrString(z.string().url()).optional()
})

// 3. PhotoGridSchema - responsive image grid with lightbox
export const PhotoGridSchema = z.object({
  images: z.array(z.object({
    url: templateVariableOrString(z.string().url()),
    alt: z.string().optional(),
    caption: z.string().optional()
  })).min(1, "At least one image is required"),
  columns: z.number().min(1).max(6).optional().default(3),
  enableLightbox: z.boolean().optional().default(true),
  aspectRatio: z.enum(['square', '4:3', '16:9', 'auto']).optional().default('auto')
})

// 4. MarkdownSchema - markdown renderer with sanitization
export const MarkdownSchema = z.object({
  content: z.string().min(1, "Content is required"),
  sanitize: z.boolean().optional().default(true),
  className: z.string().optional()
})

// 5. SidebarSchema - navigation sidebar with collapsible sections
export const SidebarSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    label: z.string().min(1, "Label is required"),
    icon: z.string().optional(),
    href: templateVariableOrString(z.string()).optional(),
    children: z.array(z.lazy(() => z.object({
      id: z.string(),
      label: z.string(),
      icon: z.string().optional(),
      href: templateVariableOrString(z.string()).optional()
    }))).optional()
  })).min(1, "At least one item is required"),
  activeItem: z.string().optional(),
  position: z.enum(['left', 'right']).optional().default('left'),
  collapsible: z.boolean().optional().default(true)
})

// 6. SwipeCardSchema - swipeable cards with callbacks
export const SwipeCardSchema = z.object({
  cards: z.array(z.object({
    id: z.string(),
    image: templateVariableOrString(z.string().url()).optional(),
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    metadata: z.record(z.any()).optional()
  })).min(1, "At least one card is required"),
  onSwipeLeft: templateVariableOrString(z.string().url()).optional(),
  onSwipeRight: templateVariableOrString(z.string().url()).optional(),
  showControls: z.boolean().optional().default(true),
  className: z.string().optional()
})

// 7. GanttChartSchema - project timeline visualization
export const GanttChartSchema = z.object({
  tasks: z.array(z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string().min(1, "Task name is required"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
    progress: z.number().min(0).max(100).optional().default(0),
    dependencies: z.array(z.union([z.string(), z.number()])).optional(),
    assignee: z.string().optional(),
    color: z.string().optional()
  })).min(1, "At least one task is required"),
  viewMode: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional().default('week')
})

// 8. LineChartSchema - line chart for time series data
export const LineChartSchema = z.object({
  data: z.array(z.object({
    timestamp: z.string(),
    value: z.number(),
    label: z.string().optional(),
    metadata: z.record(z.any()).optional()
  })).min(1, "At least one data point is required"),
  config: z.object({
    type: z.literal('line').optional(),
    title: z.string().min(1, "Title is required"),
    xAxis: z.string().optional().default('Time'),
    yAxis: z.string().optional().default('Value'),
    colors: z.array(z.string()).min(1).optional().default(['#3B82F6']),
    showGrid: z.boolean().optional().default(true),
    showLegend: z.boolean().optional().default(false)
  }),
  height: z.number().min(100).max(1000).optional().default(300),
  showTrend: z.boolean().optional().default(false),
  gradient: z.boolean().optional().default(false),
  className: z.string().optional()
})

// 9. BarChartSchema - bar chart for categorical data comparison
export const BarChartSchema = z.object({
  data: z.array(z.object({
    timestamp: z.string(),
    value: z.number(),
    label: z.string().optional(),
    metadata: z.record(z.any()).optional()
  })).min(1, "At least one data point is required"),
  config: z.object({
    type: z.literal('bar').optional(),
    title: z.string().min(1, "Title is required"),
    xAxis: z.string().optional().default('Category'),
    yAxis: z.string().optional().default('Value'),
    colors: z.array(z.string()).min(1).optional().default(['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']),
    showGrid: z.boolean().optional().default(true),
    showLegend: z.boolean().optional().default(true)
  }),
  height: z.number().min(100).max(1000).optional().default(300),
  showValues: z.boolean().optional().default(false),
  horizontal: z.boolean().optional().default(false),
  className: z.string().optional()
})

// 10. PieChartSchema - pie/donut chart for proportional data
export const PieChartSchema = z.object({
  data: z.array(z.object({
    timestamp: z.string(),
    value: z.number().min(0, "Value must be non-negative"),
    label: z.string().optional(),
    metadata: z.record(z.any()).optional()
  })).min(1, "At least one data point is required"),
  config: z.object({
    type: z.literal('pie').optional(),
    title: z.string().min(1, "Title is required"),
    xAxis: z.string().optional().default(''),
    yAxis: z.string().optional().default(''),
    colors: z.array(z.string()).min(1).optional().default(['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']),
    showGrid: z.boolean().optional().default(false),
    showLegend: z.boolean().optional().default(true)
  }),
  height: z.number().min(100).max(1000).optional().default(300),
  donut: z.boolean().optional().default(false),
  showTotal: z.boolean().optional().default(false),
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
  Button: ButtonSchema,
  Checklist: ChecklistSchema,
  Calendar: CalendarSchema,
  PhotoGrid: PhotoGridSchema,
  Markdown: MarkdownSchema,
  Sidebar: SidebarSchema,
  SwipeCard: SwipeCardSchema,
  GanttChart: GanttChartSchema,
  LineChart: LineChartSchema,
  BarChart: BarChartSchema,
  PieChart: PieChartSchema
}

// Type inference
export type ComponentType = keyof typeof ComponentSchemas
