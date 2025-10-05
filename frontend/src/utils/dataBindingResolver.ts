/**
 * Data Binding Resolver Utility
 * Resolves {{data.variable}} syntax in component configurations with actual data values
 */

export interface ResolveOptions {
  /**
   * If true, returns the original binding string when variable is not found
   * If false, returns undefined for missing variables
   */
  keepOriginalOnError?: boolean;
}

/**
 * Extracts all binding expressions from a string
 * @param str - String potentially containing {{data.variable}} bindings
 * @returns Array of binding expressions found
 */
export function extractBindings(str: string): string[] {
  const bindingPattern = /\{\{([^}]+)\}\}/g;
  const matches: string[] = [];
  let match;

  while ((match = bindingPattern.exec(str)) !== null) {
    matches.push(match[1].trim());
  }

  return matches;
}

/**
 * Resolves a path like "data.user.name" or "data.tasks[0].title" from a data object
 * @param path - Dot-separated path with optional array indices
 * @param data - Data object to resolve from
 * @returns Resolved value or undefined if not found
 */
export function resolvePath(path: string, data: any): any {
  if (!path || typeof path !== 'string') {
    return undefined;
  }

  // Handle 'data' path returning entire object
  if (path.trim() === 'data') {
    return data;
  }

  // Remove 'data.' prefix if present
  const cleanPath = path.startsWith('data.') ? path.substring(5) : path;

  if (!cleanPath) {
    return data;
  }

  // Split path and handle array indices
  // e.g., "user.tasks[0].title" -> ["user", "tasks", "0", "title"]
  const parts = cleanPath.split(/\.|\[|\]/).filter(Boolean);

  let current = data;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Handle array index
    if (/^\d+$/.test(part)) {
      const index = parseInt(part, 10);
      if (Array.isArray(current) && index >= 0 && index < current.length) {
        current = current[index];
      } else {
        return undefined;
      }
    } else {
      // Handle object property
      current = current[part];
    }
  }

  return current;
}

/**
 * Resolves a single binding expression in a string
 * @param str - String with potential {{data.variable}} bindings
 * @param data - Data object to resolve from
 * @param options - Resolution options
 * @returns String with bindings resolved
 */
export function resolveStringBindings(
  str: string,
  data: any,
  options: ResolveOptions = {}
): string {
  const { keepOriginalOnError = false } = options;

  if (typeof str !== 'string') {
    return str;
  }

  return str.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
    const trimmedExpr = expression.trim();
    const value = resolvePath(trimmedExpr, data);

    if (value === undefined || value === null) {
      return keepOriginalOnError ? match : '';
    }

    // Convert value to string for embedding
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  });
}

/**
 * Recursively resolves all data bindings in a value (string, object, or array)
 * @param value - Value to resolve bindings in
 * @param data - Data object to resolve from
 * @param options - Resolution options
 * @returns Value with all bindings resolved
 */
export function resolveValue(
  value: any,
  data: any,
  options: ResolveOptions = {}
): any {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }

  // Handle strings with bindings
  if (typeof value === 'string') {
    // Check if the entire string is a single binding expression
    const singleBindingMatch = value.match(/^\{\{([^}]+)\}\}$/);
    if (singleBindingMatch) {
      // Return the actual value type (not stringified)
      const resolvedValue = resolvePath(singleBindingMatch[1].trim(), data);
      return resolvedValue !== undefined ? resolvedValue : (options.keepOriginalOnError ? value : undefined);
    }

    // Handle strings with multiple or partial bindings
    return resolveStringBindings(value, data, options);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => resolveValue(item, data, options));
  }

  // Handle objects
  if (typeof value === 'object') {
    const resolved: any = {};
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        resolved[key] = resolveValue(value[key], data, options);
      }
    }
    return resolved;
  }

  // Return primitives as-is
  return value;
}

/**
 * Resolves all data bindings in a component configuration
 * @param component - Component configuration object
 * @param data - Data object to resolve from
 * @param options - Resolution options
 * @returns Component with resolved bindings
 */
export function resolveComponentBindings(
  component: any,
  data: any,
  options: ResolveOptions = {}
): any {
  if (!component || typeof component !== 'object') {
    return component;
  }

  const resolved = { ...component };

  // Resolve type (shouldn't have bindings, but just in case)
  if (resolved.type) {
    resolved.type = resolveValue(resolved.type, data, options);
  }

  // Resolve config/props
  if (resolved.config) {
    resolved.config = resolveValue(resolved.config, data, options);
  }

  if (resolved.props) {
    resolved.props = resolveValue(resolved.props, data, options);
  }

  // Recursively resolve children
  if (resolved.children && Array.isArray(resolved.children)) {
    resolved.children = resolved.children.map((child: any) =>
      resolveComponentBindings(child, data, options)
    );
  }

  return resolved;
}

/**
 * Resolves all data bindings in a page layout
 * @param layout - Array of component configurations
 * @param data - Data object to resolve from
 * @param options - Resolution options
 * @returns Layout with all bindings resolved
 */
export function resolveDataBindings(
  layout: any[],
  data: any,
  options: ResolveOptions = {}
): any[] {
  if (!Array.isArray(layout)) {
    throw new Error('Layout must be an array of components');
  }

  return layout.map(component => resolveComponentBindings(component, data, options));
}

/**
 * Validates if a binding expression is syntactically valid
 * @param binding - Binding expression (without {{}})
 * @returns True if valid, false otherwise
 */
export function isValidBinding(binding: string): boolean {
  if (!binding || typeof binding !== 'string') {
    return false;
  }

  // Check for valid path syntax
  // Valid: data.user.name, data.tasks[0], data.items[0].title
  // Invalid: data., data[], data[abc], data..name
  const validPattern = /^data(\.[a-zA-Z_$][a-zA-Z0-9_$]*|\[\d+\])+$/;
  return validPattern.test(binding.trim());
}

/**
 * Finds all unresolved bindings in a layout after resolution
 * @param layout - Resolved layout
 * @returns Array of unresolved binding expressions
 */
export function findUnresolvedBindings(layout: any[]): string[] {
  const unresolved = new Set<string>();

  function traverse(value: any) {
    if (typeof value === 'string') {
      const bindings = extractBindings(value);
      bindings.forEach(binding => unresolved.add(binding));
    } else if (Array.isArray(value)) {
      value.forEach(traverse);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(traverse);
    }
  }

  layout.forEach(traverse);
  return Array.from(unresolved);
}
