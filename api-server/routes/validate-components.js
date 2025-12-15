import express from 'express';
import { z } from 'zod';
import { applyValidationRules } from '../middleware/validation-rules.js';

const router = express.Router();

// Helper for validating template variables (strings starting with {{)
const templateVariableOrString = (schema) =>
  z.union([
    z.string().regex(/^\{\{.+\}\}$/),
    schema
  ]);

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
  }),

  // 1. Checklist - interactive checklist with editable items
  Checklist: z.object({
    items: z.array(z.object({
      id: z.union([z.string(), z.number()]),
      text: z.string().min(1, "Item text is required"),
      checked: z.boolean()
    })).min(1, "At least one item is required"),
    allowEdit: z.boolean().optional().default(false),
    onChange: templateVariableOrString(z.string().url()).optional()
  }),

  // 2. Calendar - date picker with events
  Calendar: z.object({
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
  }),

  // 3. PhotoGrid - responsive image grid with lightbox
  PhotoGrid: z.object({
    images: z.array(z.object({
      url: templateVariableOrString(z.string().url()),
      alt: z.string().optional(),
      caption: z.string().optional()
    })).min(1, "At least one image is required"),
    columns: z.number().min(1).max(6).optional().default(3),
    enableLightbox: z.boolean().optional().default(true),
    aspectRatio: z.enum(['square', '4:3', '16:9', 'auto']).optional().default('auto')
  }),

  // 4. Markdown - markdown renderer with sanitization
  Markdown: z.object({
    content: z.string().min(1, "Content is required"),
    sanitize: z.boolean().optional().default(true),
    className: z.string().optional()
  }),

  // 5. Sidebar - navigation sidebar with collapsible sections
  Sidebar: z.object({
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
  }),

  // 6. SwipeCard - swipeable cards with callbacks
  SwipeCard: z.object({
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
  }),

  // 7. GanttChart - project timeline visualization
  GanttChart: z.object({
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

    // Apply component-specific validation rules (e.g., Sidebar navigation)
    const rulesResult = applyValidationRules(type, props, path);
    if (rulesResult.errors.length > 0) {
      errors.push(...rulesResult.errors);
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
