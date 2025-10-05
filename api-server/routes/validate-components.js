import express from 'express';
import { z } from 'zod';

const router = express.Router();

// Component schema registry - mirrors frontend schemas
const ComponentSchemas = {
  header: z.object({
    title: z.string().min(1, "Title is required"),
    level: z.number().min(1).max(6).optional().default(1),
    subtitle: z.string().optional()
  }),

  stat: z.object({
    label: z.string().min(1, "Label is required"),
    value: z.union([z.string(), z.number()]),
    change: z.number().optional(),
    icon: z.string().optional(),
    description: z.string().optional()
  }),

  todoList: z.object({
    showCompleted: z.boolean().optional().default(false),
    sortBy: z.enum(['priority', 'date', 'default']).optional(),
    filterTags: z.array(z.string()).optional()
  }),

  dataTable: z.object({
    columns: z.array(z.string()).optional(),
    sortable: z.boolean().optional(),
    filterable: z.boolean().optional()
  }),

  list: z.object({
    items: z.array(z.string()).optional(),
    ordered: z.boolean().optional(),
    icon: z.string().optional()
  }),

  form: z.object({
    fields: z.array(z.object({
      label: z.string(),
      type: z.string(),
      placeholder: z.string().optional(),
      required: z.boolean().optional()
    })),
    submitLabel: z.string().optional()
  }),

  tabs: z.object({
    tabs: z.array(z.object({
      label: z.string(),
      content: z.string()
    }))
  }),

  timeline: z.object({
    events: z.array(z.object({
      id: z.number(),
      title: z.string(),
      date: z.string(),
      description: z.string()
    })).optional(),
    orientation: z.enum(['vertical', 'horizontal']).optional()
  }),

  Card: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    className: z.string().optional()
  }),

  Grid: z.object({
    cols: z.number().optional(),
    gap: z.number().optional()
  }),

  Badge: z.object({
    variant: z.enum(['default', 'destructive', 'secondary', 'outline']).optional(),
    children: z.string()
  }),

  Metric: z.object({
    value: z.union([z.string(), z.number()]),
    label: z.string(),
    description: z.string().optional()
  }),

  ProfileHeader: z.object({
    name: z.string(),
    description: z.string().optional(),
    avatar_color: z.string().optional(),
    status: z.string().optional(),
    specialization: z.string().optional()
  }),

  CapabilityList: z.object({
    title: z.string(),
    capabilities: z.array(z.string())
  }),

  Button: z.object({
    variant: z.enum(['default', 'destructive', 'outline', 'secondary']).optional(),
    children: z.string(),
    className: z.string().optional()
  })
};

/**
 * POST /api/validate-components
 *
 * Validates component configurations against their schemas
 *
 * Request body:
 *   {
 *     components: ComponentConfig[]
 *   }
 *
 * Response:
 *   {
 *     valid: boolean,
 *     errors: ValidationError[],
 *     componentCount: number,
 *     timestamp: string
 *   }
 */
router.post('/', (req, res) => {
  const { components } = req.body;
  const errors = [];

  // Validate input
  if (components === undefined) {
    return res.status(400).json({
      valid: false,
      error: 'components must be an array'
    });
  }

  if (!Array.isArray(components)) {
    return res.status(400).json({
      valid: false,
      error: 'components must be an array'
    });
  }

  /**
   * Recursively validate a component and its children
   * @param {Object} component - Component to validate
   * @param {string} path - Path to component for error reporting
   */
  function validateComponent(component, path = 'root') {
    const { type, props = {}, children = [] } = component;
    const schema = ComponentSchemas[type];

    // Check if component type is known
    if (!schema) {
      errors.push({
        path,
        type,
        message: `Unknown component type: ${type}`
      });
      return;
    }

    // Validate component props against schema
    try {
      schema.parse(props);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push({
          path,
          type,
          issues: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          }))
        });
      }
    }

    // Recursively validate children
    if (Array.isArray(children)) {
      children.forEach((child, index) => {
        validateComponent(child, `${path}.children[${index}]`);
      });
    }
  }

  // Validate each component
  components.forEach((component, index) => {
    validateComponent(component, `components[${index}]`);
  });

  // Return validation results
  res.json({
    valid: errors.length === 0,
    errors,
    componentCount: components.length,
    timestamp: new Date().toISOString()
  });
});

export default router;
