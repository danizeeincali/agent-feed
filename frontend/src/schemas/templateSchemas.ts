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
  dataSource: z.string().optional(),  // URL endpoint to fetch dynamic data for bindings
  validation: z.object({
    required: z.array(z.string()).optional(),
    maxComponents: z.number().optional(),
    allowedComponents: z.array(z.string()).optional()
  }).optional()
})

export type Template = z.infer<typeof TemplateSchema>
export type TemplateMetadata = z.infer<typeof TemplateMetadataSchema>

// Page specification for dynamic pages with data binding
export const PageSpecSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  title: z.string(),
  version: z.string(),
  layout: z.array(z.object({
    id: z.string().optional(),
    type: z.string(),
    config: z.record(z.any()).optional(),
    props: z.record(z.any()).optional(),
    children: z.array(z.any()).optional()
  })).optional(),
  dataSource: z.string().optional(),  // URL endpoint to fetch dynamic data
  metadata: z.object({
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    icon: z.string().optional()
  }).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export type PageSpec = z.infer<typeof PageSpecSchema>
