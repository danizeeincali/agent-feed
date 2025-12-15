/**
 * Component-specific validation rules
 *
 * This module provides additional validation logic beyond Zod schema validation,
 * including business rules and component-specific requirements.
 */

/**
 * Validate Sidebar component items for navigation capability
 *
 * Requirements:
 * - Each item must have at least one of: href, onClick, or children
 * - Items with href should have valid format
 * - Recursively validate nested children
 *
 * @param {Array} items - Sidebar items to validate
 * @param {string} path - Path for error reporting
 * @returns {{valid: boolean, errors: Array, warnings: Array}}
 */
export function validateSidebarItems(items, path = 'items') {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(items)) {
    errors.push({
      path,
      message: 'Sidebar items must be an array',
      code: 'INVALID_TYPE'
    });
    return { valid: false, errors, warnings };
  }

  items.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;

    // Check for navigation capability: href OR onClick OR children
    const hasHref = item.href !== undefined && item.href !== null && item.href !== '';
    const hasOnClick = item.onClick !== undefined && item.onClick !== null;
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;

    if (!hasHref && !hasOnClick && !hasChildren) {
      errors.push({
        path: itemPath,
        field: 'href|onClick|children',
        message: `Sidebar item "${item.label || 'unlabeled'}" must have href, onClick, or children for navigation`,
        code: 'NO_NAVIGATION',
        severity: 'error'
      });
    }

    // Validate href format if present
    if (hasHref) {
      const href = item.href;

      // Check if it's a template variable ({{...}})
      const isTemplateVar = /^\{\{.+\}\}$/.test(href);

      if (!isTemplateVar) {
        // Validate href format - should start with /, ./, ../, http://, https://, or #
        if (!/^(\/|\.\/|\.\.\/|https?:\/\/|#)/.test(href)) {
          errors.push({
            path: itemPath,
            field: 'href',
            message: `Invalid href format: "${href}". Must start with /, ./, ../, http://, https://, or #`,
            code: 'INVALID_HREF_FORMAT'
          });
        }
      }
    }

    // Recursively validate children
    if (hasChildren) {
      const childResult = validateSidebarItems(item.children, `${itemPath}.children`);
      errors.push(...childResult.errors);
      warnings.push(...childResult.warnings);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Additional component-specific validation rules
 * Map of component type to validation function
 */
export const componentValidationRules = {
  /**
   * Validate Sidebar component
   */
  Sidebar: (props, path = 'Sidebar') => {
    const result = validateSidebarItems(props.items || [], `${path}.items`);
    return result;
  },

  /**
   * Validate Form component
   */
  form: (props, path = 'form') => {
    const errors = [];
    const warnings = [];

    if (!props.fields || !Array.isArray(props.fields)) {
      errors.push({
        path: `${path}.fields`,
        message: 'Form must have fields array',
        code: 'MISSING_FIELDS'
      });
    } else if (props.fields.length === 0) {
      warnings.push({
        path: `${path}.fields`,
        message: 'Form has no fields defined',
        code: 'EMPTY_FIELDS'
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  /**
   * Validate Calendar component dates
   */
  Calendar: (props, path = 'Calendar') => {
    const errors = [];
    const warnings = [];

    // Validate event dates if present
    if (props.events && Array.isArray(props.events)) {
      props.events.forEach((event, index) => {
        if (event.date) {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(event.date)) {
            errors.push({
              path: `${path}.events[${index}].date`,
              message: `Invalid date format: "${event.date}". Expected YYYY-MM-DD`,
              code: 'INVALID_DATE_FORMAT'
            });
          }
        }
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  /**
   * Validate GanttChart task dates
   */
  GanttChart: (props, path = 'GanttChart') => {
    const errors = [];
    const warnings = [];

    if (props.tasks && Array.isArray(props.tasks)) {
      props.tasks.forEach((task, index) => {
        const taskPath = `${path}.tasks[${index}]`;

        // Validate date order: startDate should be before endDate
        if (task.startDate && task.endDate) {
          const start = new Date(task.startDate);
          const end = new Date(task.endDate);

          if (start > end) {
            errors.push({
              path: taskPath,
              message: `Task "${task.name || 'unnamed'}" has startDate after endDate`,
              code: 'INVALID_DATE_RANGE'
            });
          }
        }

        // Validate dependencies reference existing tasks
        if (task.dependencies && Array.isArray(task.dependencies)) {
          const taskIds = props.tasks.map(t => t.id);
          task.dependencies.forEach(depId => {
            if (!taskIds.includes(depId)) {
              warnings.push({
                path: `${taskPath}.dependencies`,
                message: `Dependency "${depId}" not found in task list`,
                code: 'MISSING_DEPENDENCY'
              });
            }
          });
        }
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  /**
   * Validate PhotoGrid images
   */
  PhotoGrid: (props, path = 'PhotoGrid') => {
    const errors = [];
    const warnings = [];

    if (!props.images || props.images.length === 0) {
      errors.push({
        path: `${path}.images`,
        message: 'PhotoGrid must have at least one image',
        code: 'NO_IMAGES'
      });
    } else {
      props.images.forEach((image, index) => {
        if (!image.alt) {
          warnings.push({
            path: `${path}.images[${index}].alt`,
            message: 'Image missing alt text (accessibility)',
            code: 'MISSING_ALT'
          });
        }
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }
};

/**
 * Extract all anchor links from sidebar items recursively
 *
 * @param {Array} items - Sidebar items array
 * @param {string} basePath - Base path for error reporting
 * @returns {Array} Array of {href, path, itemId} objects for anchor links
 */
function extractAnchorLinks(items, basePath = 'items') {
  const anchorLinks = [];

  if (!Array.isArray(items)) {
    return anchorLinks;
  }

  items.forEach((item, index) => {
    const itemPath = `${basePath}[${index}]`;

    // Skip items with onClick (they handle their own navigation)
    if (item.onClick) {
      // Recursively check children even if parent has onClick
      if (item.children && Array.isArray(item.children)) {
        const childLinks = extractAnchorLinks(item.children, `${itemPath}.children`);
        anchorLinks.push(...childLinks);
      }
      return;
    }

    if (item.href && typeof item.href === 'string') {
      let anchorPart = null;

      // Check if href is a pure anchor link (starts with #)
      if (item.href.startsWith('#')) {
        anchorPart = item.href;
      }
      // Check if href contains an anchor (path#anchor or url#anchor)
      else if (item.href.includes('#')) {
        // Skip external URLs (http://, https://)
        if (!item.href.startsWith('http://') && !item.href.startsWith('https://')) {
          // Extract anchor part from path#anchor
          const parts = item.href.split('#');
          if (parts.length === 2 && parts[1]) {
            anchorPart = '#' + parts[1];
          }
        }
      }

      // Add anchor link if found
      if (anchorPart) {
        anchorLinks.push({
          href: anchorPart,
          path: itemPath,
          itemId: item.id,
          label: item.label,
          originalHref: item.href
        });
      }
    }

    // Recursively check children
    if (item.children && Array.isArray(item.children)) {
      const childLinks = extractAnchorLinks(item.children, `${itemPath}.children`);
      anchorLinks.push(...childLinks);
    }
  });

  return anchorLinks;
}

/**
 * Extract all IDs from components recursively
 *
 * @param {Array} components - Array of component objects
 * @returns {Set} Set of all id values found in components
 */
function extractComponentIds(components) {
  const ids = new Set();

  if (!Array.isArray(components)) {
    return ids;
  }

  const extractFromComponent = (component) => {
    if (!component || typeof component !== 'object') {
      return;
    }

    // Check props.id
    if (component.props && component.props.id) {
      ids.add(component.props.id);
    }

    // Check for id in various possible locations in props
    if (component.props) {
      // Some components might have items with ids
      if (Array.isArray(component.props.items)) {
        component.props.items.forEach(item => {
          if (item && item.id) {
            ids.add(String(item.id));
          }
        });
      }

      // Check for events, tasks, cards, etc. with ids
      ['events', 'tasks', 'cards', 'images', 'tabs'].forEach(key => {
        if (Array.isArray(component.props[key])) {
          component.props[key].forEach(item => {
            if (item && item.id) {
              ids.add(String(item.id));
            }
          });
        }
      });
    }

    // Recursively check children
    if (Array.isArray(component.children)) {
      component.children.forEach(child => extractFromComponent(child));
    }
  };

  components.forEach(component => extractFromComponent(component));

  return ids;
}

/**
 * Validate that anchor link targets exist in page components
 *
 * This function:
 * 1. Extracts all anchor links from sidebar items (href starting with #)
 * 2. Extracts all IDs from components in the page
 * 3. For each anchor link, checks if the target ID exists
 * 4. Returns errors for missing targets
 *
 * @param {Array} components - All page components
 * @param {Array} sidebarItems - Sidebar items to check for anchor links
 * @returns {{valid: boolean, errors: Array, warnings: Array}}
 */
export function validateAnchorLinkTargets(components, sidebarItems) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(sidebarItems) || sidebarItems.length === 0) {
    // No sidebar items to validate
    return { valid: true, errors, warnings };
  }

  // Extract all anchor links from sidebar
  const anchorLinks = extractAnchorLinks(sidebarItems);

  if (anchorLinks.length === 0) {
    // No anchor links to validate
    return { valid: true, errors, warnings };
  }

  // Extract all IDs from page components
  const componentIds = extractComponentIds(components);

  // Validate each anchor link has a matching target
  anchorLinks.forEach(link => {
    // Remove # to get target ID
    const targetId = link.href.substring(1);

    // Validate bare hash or empty anchor
    if (!targetId || targetId.trim() === '') {
      errors.push({
        path: `components[0].props.${link.path}`,
        field: 'href',
        message: `Anchor link "${link.href}" has empty target ID (bare hash not allowed)`,
        code: 'MISSING_ANCHOR_TARGET',
        severity: 'error',
        suggestion: 'Provide a valid anchor ID or use a different href format'
      });
      return;
    }

    // Check if target ID exists in components
    if (!componentIds.has(targetId)) {
      errors.push({
        path: `components[0].props.${link.path}`,
        field: 'href',
        message: `Anchor link "${link.href}" (item: "${link.itemId || 'unknown'}") has no matching element with id="${targetId}" in page content`,
        code: 'MISSING_ANCHOR_TARGET',
        severity: 'error',
        suggestion: `Add id="${targetId}" to a component, use full route path, or add onClick handler`
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Apply component-specific validation rules
 *
 * @param {string} type - Component type
 * @param {Object} props - Component props
 * @param {string} path - Path for error reporting
 * @returns {{valid: boolean, errors: Array, warnings: Array}}
 */
export function applyValidationRules(type, props, path = type) {
  const validator = componentValidationRules[type];

  if (!validator) {
    // No specific rules for this component type
    return { valid: true, errors: [], warnings: [] };
  }

  return validator(props, path);
}
