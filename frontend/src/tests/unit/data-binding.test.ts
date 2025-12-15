import { describe, it, expect } from 'vitest';
import {
  extractBindings,
  resolvePath,
  resolveStringBindings,
  resolveValue,
  resolveComponentBindings,
  resolveDataBindings,
  isValidBinding,
  findUnresolvedBindings
} from '../../utils/dataBindingResolver';

/**
 * TDD Test Suite for Data Binding Resolver
 *
 * Tests the data binding system that resolves {{data.variable}} syntax
 * in component configurations with actual data values.
 */

describe('extractBindings', () => {
  it('should extract a single binding from a string', () => {
    const result = extractBindings('Hello {{data.name}}');
    expect(result).toEqual(['data.name']);
  });

  it('should extract multiple bindings from a string', () => {
    const result = extractBindings('{{data.user.name}} is {{data.user.age}} years old');
    expect(result).toEqual(['data.user.name', 'data.user.age']);
  });

  it('should return empty array for string without bindings', () => {
    const result = extractBindings('Hello world');
    expect(result).toEqual([]);
  });

  it('should trim whitespace from bindings', () => {
    const result = extractBindings('{{ data.name }} and {{  data.age  }}');
    expect(result).toEqual(['data.name', 'data.age']);
  });

  it('should handle array index bindings', () => {
    const result = extractBindings('{{data.tasks[0].title}}');
    expect(result).toEqual(['data.tasks[0].title']);
  });
});

describe('resolvePath', () => {
  const testData = {
    name: 'John',
    user: {
      name: 'Jane',
      email: 'jane@example.com',
      profile: {
        bio: 'Developer'
      }
    },
    tasks: [
      { id: 1, title: 'Task 1', completed: false },
      { id: 2, title: 'Task 2', completed: true }
    ],
    count: 0,
    isActive: false,
    nullValue: null
  };

  describe('Simple variable resolution', () => {
    it('should resolve simple path', () => {
      expect(resolvePath('data.name', testData)).toBe('John');
    });

    it('should resolve path without data prefix', () => {
      expect(resolvePath('name', testData)).toBe('John');
    });

    it('should return entire data object for "data" path', () => {
      expect(resolvePath('data', testData)).toBe(testData);
    });
  });

  describe('Nested path resolution', () => {
    it('should resolve nested object path', () => {
      expect(resolvePath('data.user.email', testData)).toBe('jane@example.com');
    });

    it('should resolve deeply nested path', () => {
      expect(resolvePath('data.user.profile.bio', testData)).toBe('Developer');
    });
  });

  describe('Array path resolution', () => {
    it('should resolve array element by index', () => {
      expect(resolvePath('data.tasks[0]', testData)).toEqual({
        id: 1,
        title: 'Task 1',
        completed: false
      });
    });

    it('should resolve array element property', () => {
      expect(resolvePath('data.tasks[0].title', testData)).toBe('Task 1');
    });

    it('should resolve second array element', () => {
      expect(resolvePath('data.tasks[1].completed', testData)).toBe(true);
    });

    it('should return undefined for out of bounds array index', () => {
      expect(resolvePath('data.tasks[10]', testData)).toBeUndefined();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should return undefined for missing variable', () => {
      expect(resolvePath('data.missing', testData)).toBeUndefined();
    });

    it('should return undefined for nested missing path', () => {
      expect(resolvePath('data.user.missing.value', testData)).toBeUndefined();
    });

    it('should handle null values in path', () => {
      expect(resolvePath('data.nullValue', testData)).toBeNull();
    });

    it('should return undefined for empty path', () => {
      expect(resolvePath('', testData)).toBeUndefined();
    });

    it('should handle zero values correctly', () => {
      expect(resolvePath('data.count', testData)).toBe(0);
    });

    it('should handle false values correctly', () => {
      expect(resolvePath('data.isActive', testData)).toBe(false);
    });
  });
});

describe('resolveStringBindings', () => {
  const testData = {
    name: 'John',
    age: 30,
    user: {
      email: 'john@example.com'
    }
  };

  describe('Single binding resolution', () => {
    it('should replace single binding with value', () => {
      const result = resolveStringBindings('Hello {{data.name}}', testData);
      expect(result).toBe('Hello John');
    });

    it('should replace binding at start of string', () => {
      const result = resolveStringBindings('{{data.name}} is here', testData);
      expect(result).toBe('John is here');
    });

    it('should replace binding at end of string', () => {
      const result = resolveStringBindings('Welcome {{data.name}}', testData);
      expect(result).toBe('Welcome John');
    });
  });

  describe('Multiple bindings in same string', () => {
    it('should replace multiple bindings', () => {
      const result = resolveStringBindings(
        '{{data.name}} is {{data.age}} years old',
        testData
      );
      expect(result).toBe('John is 30 years old');
    });

    it('should handle adjacent bindings', () => {
      const result = resolveStringBindings('{{data.name}}{{data.age}}', testData);
      expect(result).toBe('John30');
    });
  });

  describe('Missing variable handling', () => {
    it('should return empty string for missing variable by default', () => {
      const result = resolveStringBindings('Hello {{data.missing}}', testData);
      expect(result).toBe('Hello ');
    });

    it('should keep original binding when keepOriginalOnError is true', () => {
      const result = resolveStringBindings(
        'Hello {{data.missing}}',
        testData,
        { keepOriginalOnError: true }
      );
      expect(result).toBe('Hello {{data.missing}}');
    });
  });

  describe('Non-string values', () => {
    it('should convert numbers to strings', () => {
      const result = resolveStringBindings('Age: {{data.age}}', testData);
      expect(result).toBe('Age: 30');
    });

    it('should convert objects to JSON strings', () => {
      const result = resolveStringBindings('User: {{data.user}}', testData);
      expect(result).toBe('User: {"email":"john@example.com"}');
    });
  });
});

describe('resolveValue', () => {
  const testData = {
    name: 'John',
    count: 42,
    items: ['apple', 'banana'],
    user: {
      email: 'john@example.com'
    }
  };

  describe('String value resolution', () => {
    it('should resolve string with single binding', () => {
      const result = resolveValue('{{data.name}}', testData);
      expect(result).toBe('John');
    });

    it('should preserve original type for entire binding', () => {
      const result = resolveValue('{{data.count}}', testData);
      expect(result).toBe(42);
      expect(typeof result).toBe('number');
    });

    it('should return object for object binding', () => {
      const result = resolveValue('{{data.user}}', testData);
      expect(result).toEqual({ email: 'john@example.com' });
    });
  });

  describe('Array value resolution', () => {
    it('should resolve bindings in array elements', () => {
      const result = resolveValue(['{{data.name}}', '{{data.count}}'], testData);
      expect(result).toEqual(['John', 42]);
    });

    it('should recursively resolve nested arrays', () => {
      const result = resolveValue([['{{data.name}}']], testData);
      expect(result).toEqual([['John']]);
    });
  });

  describe('Object value resolution', () => {
    it('should resolve bindings in object properties', () => {
      const result = resolveValue(
        { title: '{{data.name}}', count: '{{data.count}}' },
        testData
      );
      expect(result).toEqual({ title: 'John', count: 42 });
    });

    it('should recursively resolve nested objects', () => {
      const result = resolveValue(
        { user: { name: '{{data.name}}' } },
        testData
      );
      expect(result).toEqual({ user: { name: 'John' } });
    });
  });

  describe('Primitive value passthrough', () => {
    it('should return primitives unchanged', () => {
      expect(resolveValue(42, testData)).toBe(42);
      expect(resolveValue(true, testData)).toBe(true);
      expect(resolveValue(null, testData)).toBe(null);
      expect(resolveValue(undefined, testData)).toBe(undefined);
    });

    it('should return strings without bindings unchanged', () => {
      expect(resolveValue('plain text', testData)).toBe('plain text');
    });
  });
});

describe('resolveComponentBindings', () => {
  const testData = {
    title: 'Dashboard',
    user: {
      name: 'John Doe'
    },
    stats: {
      count: 150
    }
  };

  it('should resolve config properties', () => {
    const component = {
      type: 'header',
      config: {
        title: '{{data.title}}',
        level: 1
      }
    };

    const result = resolveComponentBindings(component, testData);
    expect(result.config.title).toBe('Dashboard');
    expect(result.config.level).toBe(1);
  });

  it('should resolve props properties', () => {
    const component = {
      type: 'Card',
      props: {
        title: '{{data.title}}',
        description: 'Welcome {{data.user.name}}'
      }
    };

    const result = resolveComponentBindings(component, testData);
    expect(result.props.title).toBe('Dashboard');
    expect(result.props.description).toBe('Welcome John Doe');
  });

  it('should recursively resolve children', () => {
    const component = {
      type: 'Grid',
      config: {},
      children: [
        {
          type: 'header',
          config: { title: '{{data.title}}' }
        }
      ]
    };

    const result = resolveComponentBindings(component, testData);
    expect(result.children[0].config.title).toBe('Dashboard');
  });

  it('should handle components without config or props', () => {
    const component = {
      type: 'header'
    };

    const result = resolveComponentBindings(component, testData);
    expect(result.type).toBe('header');
  });
});

describe('resolveDataBindings', () => {
  const testData = {
    title: 'My Dashboard',
    stats: {
      users: 100,
      revenue: 50000
    },
    tasks: [
      { title: 'Task 1', status: 'completed' },
      { title: 'Task 2', status: 'pending' }
    ]
  };

  it('should resolve all components in layout', () => {
    const layout = [
      {
        type: 'header',
        config: { title: '{{data.title}}', level: 1 }
      },
      {
        type: 'stat',
        config: { label: 'Users', value: '{{data.stats.users}}' }
      }
    ];

    const result = resolveDataBindings(layout, testData);
    expect(result[0].config.title).toBe('My Dashboard');
    expect(result[1].config.value).toBe(100);
  });

  it('should handle nested components', () => {
    const layout = [
      {
        type: 'Grid',
        config: { cols: 2 },
        children: [
          {
            type: 'Card',
            config: { title: '{{data.title}}' }
          }
        ]
      }
    ];

    const result = resolveDataBindings(layout, testData);
    expect(result[0].children[0].config.title).toBe('My Dashboard');
  });

  it('should throw error for non-array layout', () => {
    expect(() => {
      resolveDataBindings({} as any, testData);
    }).toThrow('Layout must be an array of components');
  });

  it('should handle empty layout', () => {
    const result = resolveDataBindings([], testData);
    expect(result).toEqual([]);
  });
});

describe('isValidBinding', () => {
  describe('Valid bindings', () => {
    it('should accept simple data path', () => {
      expect(isValidBinding('data.name')).toBe(true);
    });

    it('should accept nested path', () => {
      expect(isValidBinding('data.user.profile.name')).toBe(true);
    });

    it('should accept array index', () => {
      expect(isValidBinding('data.items[0]')).toBe(true);
    });

    it('should accept complex path with arrays', () => {
      expect(isValidBinding('data.users[0].tasks[1].title')).toBe(true);
    });

    it('should accept paths with underscores', () => {
      expect(isValidBinding('data.user_name')).toBe(true);
    });

    it('should accept paths with dollar signs', () => {
      expect(isValidBinding('data.$special')).toBe(true);
    });
  });

  describe('Invalid bindings', () => {
    it('should reject paths not starting with data', () => {
      expect(isValidBinding('user.name')).toBe(false);
    });

    it('should reject empty path after data', () => {
      expect(isValidBinding('data.')).toBe(false);
    });

    it('should reject empty brackets', () => {
      expect(isValidBinding('data.items[]')).toBe(false);
    });

    it('should reject non-numeric array indices', () => {
      expect(isValidBinding('data.items[abc]')).toBe(false);
    });

    it('should reject double dots', () => {
      expect(isValidBinding('data..name')).toBe(false);
    });

    it('should reject null or undefined', () => {
      expect(isValidBinding(null as any)).toBe(false);
      expect(isValidBinding(undefined as any)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidBinding('')).toBe(false);
    });
  });
});

describe('findUnresolvedBindings', () => {
  it('should find unresolved bindings in layout', () => {
    const layout = [
      {
        type: 'header',
        config: { title: '{{data.missing}}', level: 1 }
      },
      {
        type: 'text',
        config: { content: 'Hello {{data.user.name}}' }
      }
    ];

    const result = findUnresolvedBindings(layout);
    expect(result).toContain('data.missing');
    expect(result).toContain('data.user.name');
  });

  it('should find bindings in nested structures', () => {
    const layout = [
      {
        type: 'Grid',
        config: {},
        children: [
          {
            type: 'Card',
            props: { title: '{{data.nested.value}}' }
          }
        ]
      }
    ];

    const result = findUnresolvedBindings(layout);
    expect(result).toContain('data.nested.value');
  });

  it('should return empty array when no bindings exist', () => {
    const layout = [
      {
        type: 'header',
        config: { title: 'Static Title', level: 1 }
      }
    ];

    const result = findUnresolvedBindings(layout);
    expect(result).toEqual([]);
  });

  it('should not include duplicate bindings', () => {
    const layout = [
      {
        type: 'header',
        config: { title: '{{data.name}}', subtitle: '{{data.name}}' }
      }
    ];

    const result = findUnresolvedBindings(layout);
    expect(result).toEqual(['data.name']);
  });
});

describe('Integration: Complete binding workflow', () => {
  it('should handle complex real-world scenario', () => {
    const pageData = {
      dashboard: {
        title: 'Analytics Dashboard',
        subtitle: 'Q4 2025 Report'
      },
      metrics: {
        revenue: 125000,
        users: 2500,
        growth: 15.5
      },
      topTasks: [
        { id: 1, title: 'Complete quarterly report', priority: 'high' },
        { id: 2, title: 'Review budget proposals', priority: 'medium' }
      ]
    };

    const layout = [
      {
        type: 'header',
        config: {
          title: '{{data.dashboard.title}}',
          subtitle: '{{data.dashboard.subtitle}}'
        }
      },
      {
        type: 'Grid',
        config: { cols: 3 },
        children: [
          {
            type: 'stat',
            config: {
              label: 'Revenue',
              value: '{{data.metrics.revenue}}',
              change: '{{data.metrics.growth}}'
            }
          },
          {
            type: 'stat',
            config: {
              label: 'Users',
              value: '{{data.metrics.users}}'
            }
          }
        ]
      },
      {
        type: 'todoList',
        config: {
          title: 'Top Priority',
          items: '{{data.topTasks}}'
        }
      }
    ];

    const resolved = resolveDataBindings(layout, pageData);

    // Verify header
    expect(resolved[0].config.title).toBe('Analytics Dashboard');
    expect(resolved[0].config.subtitle).toBe('Q4 2025 Report');

    // Verify stats
    expect(resolved[1].children[0].config.value).toBe(125000);
    expect(resolved[1].children[0].config.change).toBe(15.5);
    expect(resolved[1].children[1].config.value).toBe(2500);

    // Verify todo list
    expect(resolved[2].config.items).toEqual(pageData.topTasks);
  });
});
