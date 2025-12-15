/**
 * Page Validation Middleware
 *
 * Layer 1: Schema Validation Guard
 * Validates page components against Zod schemas before database operations
 */

import { z } from 'zod';
import { applyValidationRules, validateAnchorLinkTargets } from './validation-rules.js';

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
    })).min(1, "At least one field is required"),
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

  Checklist: z.object({
    items: z.array(z.object({
      id: z.union([z.string(), z.number()]),
      text: z.string().min(1, "Item text is required"),
      checked: z.boolean()
    })).min(1, "At least one item is required"),
    allowEdit: z.boolean().optional().default(false),
    onChange: templateVariableOrString(z.string().url()).optional()
  }),

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

  Markdown: z.object({
    content: z.string().min(1, "Content is required"),
    sanitize: z.boolean().optional().default(true),
    className: z.string().optional()
  }),

  Sidebar: z.object({
    items: z.array(z.object({
      id: z.string(),
      label: z.string().min(1, "Label is required"),
      icon: z.string().optional(),
      href: templateVariableOrString(z.string()).optional(),
      onClick: z.string().optional(),
      children: z.array(z.lazy(() => z.object({
        id: z.string(),
        label: z.string(),
        icon: z.string().optional(),
        href: templateVariableOrString(z.string()).optional(),
        onClick: z.string().optional()
      }))).optional()
    })).min(1, "At least one item is required"),
    activeItem: z.string().optional(),
    position: z.enum(['left', 'right']).optional().default('left'),
    collapsible: z.boolean().optional().default(true)
  }),

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
 * Extract components from page data
 *
 * Handles multiple possible structures:
 * - specification.components
 * - components
 * - layout (if it contains component definitions)
 * - content_value (parsed JSON)
 * - sidebar (top-level sidebar property - converted to Sidebar component for validation)
 *
 * @param {Object} pageData - Page data object
 * @returns {Array} Array of components
 */
export function extractComponents(pageData) {
  const components = [];

  // Check specification.components
  if (pageData.specification?.components) {
    if (Array.isArray(pageData.specification.components)) {
      components.push(...pageData.specification.components);
    }
  }

  // Check top-level components
  if (pageData.components) {
    if (Array.isArray(pageData.components)) {
      components.push(...pageData.components);
    }
  }

  // Check content_value (JSON string)
  if (pageData.content_value) {
    try {
      const parsed = typeof pageData.content_value === 'string'
        ? JSON.parse(pageData.content_value)
        : pageData.content_value;

      if (parsed.components && Array.isArray(parsed.components)) {
        components.push(...parsed.components);
      }

      if (parsed.specification?.components && Array.isArray(parsed.specification.components)) {
        components.push(...parsed.specification.components);
      }

      // CRITICAL FIX: Check for top-level sidebar property
      // Convert sidebar to Sidebar component for validation
      if (parsed.sidebar) {
        const sidebarComponent = convertSidebarToComponent(parsed.sidebar);
        if (sidebarComponent) {
          components.push(sidebarComponent);
        }
      }
    } catch (error) {
      // If parsing fails, skip content_value
      console.warn('Failed to parse content_value:', error.message);
    }
  }

  // Check layout (legacy format)
  if (pageData.layout) {
    if (Array.isArray(pageData.layout)) {
      components.push(...pageData.layout);
    }
  }

  // Check top-level sidebar property
  if (pageData.sidebar) {
    const sidebarComponent = convertSidebarToComponent(pageData.sidebar);
    if (sidebarComponent) {
      components.push(sidebarComponent);
    }
  }

  return components;
}

/**
 * Convert sidebar property to Sidebar component for validation
 * Handles both flat sidebar structure and nested sections
 *
 * @param {Object} sidebar - Sidebar property object
 * @returns {Object|null} Sidebar component or null if invalid
 */
function convertSidebarToComponent(sidebar) {
  if (!sidebar || typeof sidebar !== 'object') {
    return null;
  }

  // Handle sidebar with sections (flatten to items for validation)
  if (sidebar.sections && Array.isArray(sidebar.sections)) {
    const allItems = [];

    sidebar.sections.forEach(section => {
      if (section.items && Array.isArray(section.items)) {
        // Add all items from this section
        allItems.push(...section.items);
      }
    });

    return {
      type: 'Sidebar',
      props: {
        items: allItems,
        position: sidebar.position,
        collapsible: sidebar.collapsible,
        activeItem: sidebar.activeItem
      }
    };
  }

  // Handle flat sidebar structure with items directly
  if (sidebar.items && Array.isArray(sidebar.items)) {
    return {
      type: 'Sidebar',
      props: sidebar
    };
  }

  return null;
}

/**
 * Validate a single component against its schema
 *
 * @param {Object} component - Component to validate
 * @param {string} path - Path for error reporting
 * @returns {{valid: boolean, errors: Array, warnings: Array}}
 */
function validateComponent(component, path = 'root') {
  const errors = [];
  const warnings = [];

  if (!component || typeof component !== 'object') {
    errors.push({
      path,
      message: 'Component must be an object',
      code: 'INVALID_TYPE'
    });
    return { valid: false, errors, warnings };
  }

  const { type, props = {}, children = [] } = component;

  // Check component type
  if (!type) {
    errors.push({
      path,
      message: 'Component missing type field',
      code: 'MISSING_TYPE'
    });
    return { valid: false, errors, warnings };
  }

  // Get schema for component type
  const schema = ComponentSchemas[type];

  if (!schema) {
    errors.push({
      path,
      type,
      message: `Unknown component type: ${type}`,
      code: 'UNKNOWN_TYPE'
    });
    return { valid: false, errors, warnings };
  }

  // Validate props against Zod schema
  try {
    schema.parse(props);
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.issues.forEach(issue => {
        errors.push({
          path: `${path}.props.${issue.path.join('.')}`,
          type,
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        });
      });
    }
  }

  // Apply component-specific validation rules
  const rulesResult = applyValidationRules(type, props, path);
  errors.push(...rulesResult.errors);
  warnings.push(...rulesResult.warnings);

  // Recursively validate children
  if (Array.isArray(children) && children.length > 0) {
    children.forEach((child, index) => {
      const childResult = validateComponent(child, `${path}.children[${index}]`);
      errors.push(...childResult.errors);
      warnings.push(...childResult.warnings);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate all page components
 *
 * Main validation function that:
 * 1. Extracts components from page data
 * 2. Validates each component against Zod schemas
 * 3. Applies component-specific validation rules (e.g., Sidebar navigation)
 * 4. Returns validation results with errors and warnings
 *
 * @param {Object} pageData - Page data to validate
 * @returns {{valid: boolean, errors: Array, warnings: Array, componentCount: number}}
 */
export function validatePageComponents(pageData) {
  const errors = [];
  const warnings = [];

  // Extract components from various possible locations
  const components = extractComponents(pageData);

  if (components.length === 0) {
    // No components to validate - this is OK, not an error
    return {
      valid: true,
      errors: [],
      warnings: [{
        message: 'No components found to validate',
        code: 'NO_COMPONENTS'
      }],
      componentCount: 0
    };
  }

  // Validate each component
  components.forEach((component, index) => {
    const result = validateComponent(component, `components[${index}]`);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  });

  // Additional validation: Check anchor link targets
  // Find all Sidebar components and validate their anchor links
  components.forEach((component, index) => {
    if (component.type === 'Sidebar' && component.props && component.props.items) {
      const anchorValidation = validateAnchorLinkTargets(components, component.props.items);
      errors.push(...anchorValidation.errors);
      warnings.push(...anchorValidation.warnings);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    componentCount: components.length
  };
}

/**
 * Express middleware for validating page components
 *
 * Usage:
 *   router.post('/pages', validatePageMiddleware, (req, res) => {...})
 *
 * Behavior:
 * - Validates components in req.body
 * - Attaches errors to req.validationErrors (for feedback loop integration)
 * - Logs warnings but allows request to proceed
 * - Attaches validation results to req.validation
 * - Does NOT block request - lets route handler decide what to do
 */
export function validatePageMiddleware(req, res, next) {
  const validationResult = validatePageComponents(req.body);

  // Attach validation results to request for downstream use
  req.validation = validationResult;

  // Log warnings if present
  if (validationResult.warnings.length > 0) {
    console.warn(`⚠️  Page validation warnings (${validationResult.warnings.length}):`,
      validationResult.warnings);
  }

  // If validation failed, attach errors for feedback loop
  if (!validationResult.valid) {
    console.error(`❌ Page validation failed with ${validationResult.errors.length} errors:`,
      validationResult.errors);

    // Attach validation errors to request
    // Route handler will use these for feedback loop
    req.validationErrors = validationResult.errors.map(error => ({
      type: error.code || 'validation_error',
      message: error.message,
      details: {
        path: error.path,
        field: error.field,
        componentType: error.type
      },
      component: {
        type: error.type
      },
      rule: error.code,
      stack: new Error().stack
    }));

    // Continue to next middleware/handler
    // Handler will record in feedback loop and return appropriate response
    return next();
  }

  // Validation passed - proceed to next middleware
  console.log(`✅ Page validation passed (${validationResult.componentCount} components validated)`);
  next();
}

/**
 * Validate Sidebar component specifically
 *
 * Exported for direct use and testing
 *
 * @param {Object} sidebarProps - Sidebar component props
 * @returns {{valid: boolean, errors: Array, warnings: Array}}
 */
export function validateSidebar(sidebarProps) {
  const errors = [];
  const warnings = [];

  // Validate against Zod schema first
  try {
    ComponentSchemas.Sidebar.parse(sidebarProps);
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.issues.forEach(issue => {
        errors.push({
          path: `Sidebar.${issue.path.join('.')}`,
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        });
      });
    }
  }

  // Apply sidebar-specific validation rules
  const rulesResult = applyValidationRules('Sidebar', sidebarProps, 'Sidebar');
  errors.push(...rulesResult.errors);
  warnings.push(...rulesResult.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
