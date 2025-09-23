/**
 * TDD London School Integration Test: Component Props Validation
 * Tests component registry validation and security policies in real scenarios
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { z } from 'zod';

// Mock component registry with real-world validation scenarios
const mockComponentRegistry = {
  validateComponentSpec: jest.fn(),
  getSecurityPolicy: jest.fn(),
  hasComponent: jest.fn(),
  sanitizeProps: jest.fn()
};

// Mock security sanitizer
const mockSecuritySanitizer = {
  sanitizeProps: jest.fn(),
  validateUrl: jest.fn(),
  sanitizeString: jest.fn(),
  sanitizeObject: jest.fn()
};

// Component validation wrapper
const ComponentValidationWrapper = ({ spec, onValidationResult, onSecurityViolation }) => {
  const [validationResult, setValidationResult] = React.useState(null);
  const [sanitizedProps, setSanitizedProps] = React.useState(null);
  const [securityViolations, setSecurityViolations] = React.useState([]);

  React.useEffect(() => {
    if (!spec) return;

    // Validate component specification
    const validation = mockComponentRegistry.validateComponentSpec(spec.type, spec.props);
    setValidationResult(validation);

    if (validation.valid) {
      // Get security policy and sanitize props
      const securityPolicy = mockComponentRegistry.getSecurityPolicy(spec.type);
      if (securityPolicy) {
        const sanitized = mockSecuritySanitizer.sanitizeProps(spec.props, securityPolicy.allowedProps);
        setSanitizedProps(sanitized);

        // Check for security violations
        const violations = [];
        if (securityPolicy.blockedProps) {
          securityPolicy.blockedProps.forEach(blockedProp => {
            if (spec.props && spec.props.hasOwnProperty(blockedProp)) {
              violations.push({
                type: 'blocked_prop',
                prop: blockedProp,
                message: `Property '${blockedProp}' is blocked by security policy`
              });
            }
          });
        }

        setSecurityViolations(violations);
        if (violations.length > 0) {
          onSecurityViolation?.(violations);
        }
      }
    }

    onValidationResult?.(validation);
  }, [spec, onValidationResult, onSecurityViolation]);

  return (
    <div data-testid="validation-wrapper">
      <div data-testid="component-type">{spec?.type || 'No Type'}</div>
      
      {validationResult && (
        <div data-testid="validation-result">
          <div data-testid="validation-status">
            {validationResult.valid ? 'Valid' : 'Invalid'}
          </div>
          
          {validationResult.errors && validationResult.errors.length > 0 && (
            <div data-testid="validation-errors">
              {validationResult.errors.map((error, index) => (
                <div key={index} data-testid={`validation-error-${index}`}>
                  {error.field}: {error.message}
                </div>
              ))}
            </div>
          )}
          
          {validationResult.warnings && validationResult.warnings.length > 0 && (
            <div data-testid="validation-warnings">
              {validationResult.warnings.map((warning, index) => (
                <div key={index} data-testid={`validation-warning-${index}`}>
                  {warning.field}: {warning.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {sanitizedProps && (
        <div data-testid="sanitized-props">
          <pre>{JSON.stringify(sanitizedProps, null, 2)}</pre>
        </div>
      )}
      
      {securityViolations.length > 0 && (
        <div data-testid="security-violations">
          {securityViolations.map((violation, index) => (
            <div key={index} data-testid={`security-violation-${index}`}>
              {violation.type}: {violation.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Test scenarios for different component types
const validComponentSpecs = {
  CapabilityList: {
    type: 'CapabilityList',
    props: {
      title: 'Valid Capabilities',
      capabilities: [
        { name: 'Code Generation', level: 'Expert', progress: 95 },
        { name: 'Testing', level: 'Advanced', progress: 85 }
      ],
      showProgress: true
    }
  },
  PerformanceMetrics: {
    type: 'PerformanceMetrics',
    props: {
      title: 'Performance Dashboard',
      metrics: [
        { name: 'CPU Usage', value: 45, unit: '%', type: 'progress' },
        { name: 'Memory Usage', value: 1.2, unit: 'GB', type: 'gauge' }
      ],
      showTrends: true,
      layout: 'grid'
    }
  },
  Timeline: {
    type: 'Timeline',
    props: {
      title: 'Activity Timeline',
      events: [
        {
          title: 'Task Completed',
          description: 'Code review task finished',
          timestamp: '2025-01-15T10:00:00Z',
          type: 'success',
          status: 'completed'
        }
      ],
      orientation: 'vertical',
      showDates: true,
      showIcons: true
    }
  },
  ProfileHeader: {
    type: 'ProfileHeader',
    props: {
      name: 'AI Assistant',
      title: 'Code Review Specialist',
      description: 'Specialized in JavaScript and Python development',
      status: 'online',
      avatar: { url: 'https://example.com/avatar.jpg', fallback: 'AI' },
      badges: [{ label: 'Expert', variant: 'success' }],
      stats: { 'Tasks Completed': 1247, 'Success Rate': '98.5%' },
      capabilities: [{ name: 'Code Review', level: 'Expert', confidence: 95 }],
      interactive: true
    }
  },
  ActivityFeed: {
    type: 'ActivityFeed',
    props: {
      title: 'Recent Activities',
      activities: [
        {
          title: 'Code Review Completed',
          description: 'Successfully reviewed authentication module',
          type: 'task_completed',
          timestamp: '2025-01-15T14:00:00Z',
          actor: { id: 'agent-1', name: 'AI Assistant', avatar: 'https://example.com/avatar.jpg' },
          metadata: { duration: '30 minutes', filesReviewed: 12 }
        }
      ],
      showFilters: true,
      showSearch: true,
      showTimestamps: true,
      maxItems: 50
    }
  }
};

const invalidComponentSpecs = {
  CapabilityList: {
    type: 'CapabilityList',
    props: {
      title: '', // Empty title
      capabilities: 'not-an-array', // Invalid type
      showProgress: 'not-a-boolean' // Invalid type
    }
  },
  PerformanceMetrics: {
    type: 'PerformanceMetrics',
    props: {
      metrics: [
        { name: '', value: 'not-a-number', type: 'invalid-type' } // Multiple invalid fields
      ],
      showTrends: 'not-a-boolean',
      layout: 'invalid-layout'
    }
  },
  Timeline: {
    type: 'Timeline',
    props: {
      events: [
        { title: '', timestamp: 'invalid-date', type: 'invalid-type' } // Invalid event
      ],
      orientation: 'invalid-orientation',
      showDates: 'not-a-boolean'
    }
  },
  ProfileHeader: {
    type: 'ProfileHeader',
    props: {
      name: '', // Empty name
      status: 'invalid-status',
      badges: 'not-an-array',
      stats: 'not-an-object',
      capabilities: [{ name: '', level: 'invalid-level', confidence: 150 }] // Invalid capability
    }
  },
  ActivityFeed: {
    type: 'ActivityFeed',
    props: {
      activities: [
        { title: '', type: '', timestamp: 'invalid-date' } // Invalid activity
      ],
      showFilters: 'not-a-boolean',
      maxItems: -1 // Negative number
    }
  }
};

const maliciousComponentSpecs = {
  XSSAttempt: {
    type: 'CapabilityList',
    props: {
      title: '<script>alert("XSS")</script>Capabilities',
      capabilities: [
        { 
          name: '<img src="x" onerror="alert(\'XSS\')">', 
          level: 'Expert',
          description: 'javascript:alert("XSS")'
        }
      ],
      dangerouslySetInnerHTML: { __html: '<script>alert("XSS")</script>' }
    }
  },
  ProtoPollutuon: {
    type: 'ProfileHeader',
    props: {
      name: 'Test User',
      '__proto__': { isAdmin: true },
      'constructor': { prototype: { isAdmin: true } }
    }
  },
  URLInjection: {
    type: 'ActivityFeed',
    props: {
      title: 'Activity Feed',
      activities: [
        {
          title: 'Test Activity',
          actor: {
            avatar: 'javascript:alert("XSS")',
            profileUrl: 'data:text/html,<script>alert("XSS")</script>'
          }
        }
      ]
    }
  }
};

describe('TDD London School Integration: Component Props Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock behaviors
    mockComponentRegistry.hasComponent.mockReturnValue(true);
    mockComponentRegistry.getSecurityPolicy.mockReturnValue({
      allowedProps: ['title', 'capabilities', 'showProgress', 'metrics', 'events', 'activities'],
      blockedProps: ['dangerouslySetInnerHTML', 'onClick', 'onLoad', '__proto__', 'constructor'],
      sanitizeHtml: true,
      validateUrls: true,
      allowExternalContent: false
    });
    
    mockSecuritySanitizer.sanitizeProps.mockImplementation((props, allowedProps) => {
      const sanitized = {};
      Object.keys(props || {}).forEach(key => {
        if (allowedProps.includes(key) && !key.startsWith('__') && key !== 'constructor') {
          sanitized[key] = props[key];
        }
      });
      return sanitized;
    });
    
    mockSecuritySanitizer.validateUrl.mockImplementation(url => {
      if (typeof url !== 'string') return false;
      return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:');
    });
  });

  describe('Valid Component Specifications', () => {
    Object.entries(validComponentSpecs).forEach(([componentType, spec]) => {
      it(`should validate ${componentType} with correct props`, () => {
        mockComponentRegistry.validateComponentSpec.mockReturnValue({
          valid: true,
          data: spec.props,
          errors: [],
          warnings: []
        });

        const onValidationResult = jest.fn();
        
        render(
          <ComponentValidationWrapper
            spec={spec}
            onValidationResult={onValidationResult}
          />
        );

        expect(screen.getByTestId('component-type')).toHaveTextContent(componentType);
        expect(screen.getByTestId('validation-status')).toHaveTextContent('Valid');
        expect(screen.queryByTestId('validation-errors')).not.toBeInTheDocument();
        
        expect(onValidationResult).toHaveBeenCalledWith(
          expect.objectContaining({ valid: true })
        );
      });
    });

    it('should handle components with optional props correctly', () => {
      const minimalSpec = {
        type: 'CapabilityList',
        props: {
          capabilities: []
        }
      };

      mockComponentRegistry.validateComponentSpec.mockReturnValue({
        valid: true,
        data: minimalSpec.props,
        errors: [],
        warnings: [
          { field: 'title', message: 'Title not provided, using default' }
        ]
      });

      render(
        <ComponentValidationWrapper spec={minimalSpec} />
      );

      expect(screen.getByTestId('validation-status')).toHaveTextContent('Valid');
      expect(screen.getByTestId('validation-warnings')).toBeInTheDocument();
      expect(screen.getByTestId('validation-warning-0')).toHaveTextContent('Title not provided, using default');
    });

    it('should sanitize props correctly for valid components', () => {
      const spec = validComponentSpecs.CapabilityList;
      
      mockComponentRegistry.validateComponentSpec.mockReturnValue({
        valid: true,
        data: spec.props,
        errors: [],
        warnings: []
      });

      render(
        <ComponentValidationWrapper spec={spec} />
      );

      expect(screen.getByTestId('sanitized-props')).toBeInTheDocument();
      expect(mockSecuritySanitizer.sanitizeProps).toHaveBeenCalledWith(
        spec.props,
        expect.arrayContaining(['title', 'capabilities', 'showProgress'])
      );
    });
  });

  describe('Invalid Component Specifications', () => {
    Object.entries(invalidComponentSpecs).forEach(([componentType, spec]) => {
      it(`should reject ${componentType} with invalid props`, () => {
        const mockErrors = [
          { field: 'title', message: 'Title is required', code: 'REQUIRED', severity: 'error' },
          { field: 'capabilities', message: 'Must be an array', code: 'INVALID_TYPE', severity: 'error' }
        ];

        mockComponentRegistry.validateComponentSpec.mockReturnValue({
          valid: false,
          errors: mockErrors,
          warnings: []
        });

        const onValidationResult = jest.fn();
        
        render(
          <ComponentValidationWrapper
            spec={spec}
            onValidationResult={onValidationResult}
          />
        );

        expect(screen.getByTestId('validation-status')).toHaveTextContent('Invalid');
        expect(screen.getByTestId('validation-errors')).toBeInTheDocument();
        expect(screen.getByTestId('validation-error-0')).toHaveTextContent('title: Title is required');
        
        expect(onValidationResult).toHaveBeenCalledWith(
          expect.objectContaining({ valid: false })
        );
      });
    });

    it('should handle unknown component types', () => {
      const unknownSpec = {
        type: 'UnknownComponent',
        props: { title: 'Test' }
      };

      mockComponentRegistry.hasComponent.mockReturnValue(false);
      mockComponentRegistry.validateComponentSpec.mockReturnValue({
        valid: false,
        errors: [{ message: 'Unknown component type: UnknownComponent', code: 'UNKNOWN_COMPONENT', severity: 'error' }],
        warnings: []
      });

      render(
        <ComponentValidationWrapper spec={unknownSpec} />
      );

      expect(screen.getByTestId('validation-status')).toHaveTextContent('Invalid');
      expect(screen.getByTestId('validation-error-0')).toHaveTextContent('Unknown component type: UnknownComponent');
    });

    it('should handle null or undefined specifications', () => {
      mockComponentRegistry.validateComponentSpec.mockReturnValue({
        valid: false,
        errors: [{ message: 'Component specification is required', code: 'MISSING_SPEC', severity: 'error' }],
        warnings: []
      });

      render(
        <ComponentValidationWrapper spec={null} />
      );

      expect(screen.getByTestId('component-type')).toHaveTextContent('No Type');
      expect(screen.getByTestId('validation-status')).toHaveTextContent('Invalid');
    });
  });

  describe('Security Policy Enforcement', () => {
    it('should block dangerous props according to security policy', () => {
      const maliciousSpec = maliciousComponentSpecs.XSSAttempt;
      
      mockComponentRegistry.validateComponentSpec.mockReturnValue({
        valid: true,
        data: maliciousSpec.props,
        errors: [],
        warnings: []
      });

      const onSecurityViolation = jest.fn();
      
      render(
        <ComponentValidationWrapper
          spec={maliciousSpec}
          onSecurityViolation={onSecurityViolation}
        />
      );

      expect(screen.getByTestId('security-violations')).toBeInTheDocument();
      expect(screen.getByTestId('security-violation-0')).toHaveTextContent(
        "blocked_prop: Property 'dangerouslySetInnerHTML' is blocked by security policy"
      );
      
      expect(onSecurityViolation).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'blocked_prop',
          prop: 'dangerouslySetInnerHTML'
        })
      ]);
    });

    it('should sanitize HTML content in props', () => {
      const spec = {
        type: 'CapabilityList',
        props: {
          title: '<script>alert("XSS")</script>Safe Title',
          capabilities: [
            { name: '<img src="x" onerror="alert()">', level: 'Expert' }
          ]
        }
      };

      mockComponentRegistry.validateComponentSpec.mockReturnValue({
        valid: true,
        data: spec.props,
        errors: [],
        warnings: []
      });

      // Mock string sanitization
      mockSecuritySanitizer.sanitizeString = jest.fn()
        .mockReturnValue('Safe Title')
        .mockReturnValueOnce('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;Safe Title');

      render(
        <ComponentValidationWrapper spec={spec} />
      );

      expect(mockSecuritySanitizer.sanitizeProps).toHaveBeenCalled();
    });

    it('should validate URLs in component props', () => {
      const spec = {
        type: 'ProfileHeader',
        props: {
          name: 'Test User',
          avatar: {
            url: 'javascript:alert("XSS")'
          },
          profileUrl: 'https://example.com/profile'
        }
      };

      mockComponentRegistry.validateComponentSpec.mockReturnValue({
        valid: true,
        data: spec.props,
        errors: [],
        warnings: []
      });

      mockSecuritySanitizer.validateUrl.mockImplementation(url => {
        if (url === 'javascript:alert("XSS")') return false;
        if (url === 'https://example.com/profile') return true;
        return false;
      });

      render(
        <ComponentValidationWrapper spec={spec} />
      );

      expect(mockSecuritySanitizer.validateUrl).toHaveBeenCalledWith('javascript:alert("XSS")');
      expect(mockSecuritySanitizer.validateUrl).toHaveBeenCalledWith('https://example.com/profile');
    });

    it('should prevent prototype pollution attempts', () => {
      const maliciousSpec = maliciousComponentSpecs.ProtoPollutuon;
      
      mockComponentRegistry.validateComponentSpec.mockReturnValue({
        valid: true,
        data: maliciousSpec.props,
        errors: [],
        warnings: []
      });

      const onSecurityViolation = jest.fn();
      
      render(
        <ComponentValidationWrapper
          spec={maliciousSpec}
          onSecurityViolation={onSecurityViolation}
        />
      );

      // Should sanitize out dangerous prototype properties
      expect(mockSecuritySanitizer.sanitizeProps).toHaveBeenCalledWith(
        maliciousSpec.props,
        expect.any(Array)
      );
      
      // Sanitized props should not contain prototype pollution
      const sanitizedPropsText = screen.getByTestId('sanitized-props').textContent;
      expect(sanitizedPropsText).not.toContain('__proto__');
      expect(sanitizedPropsText).not.toContain('constructor');
    });
  });

  describe('Zod Schema Integration', () => {
    it('should integrate with Zod schemas for complex validation', () => {
      const capabilitySchema = z.object({
        name: z.string().min(1, 'Capability name is required'),
        level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
        progress: z.number().min(0).max(100).optional()
      });

      const capabilityListSchema = z.object({
        title: z.string().optional(),
        capabilities: z.array(capabilitySchema),
        showProgress: z.boolean().optional()
      });

      const validProps = {
        title: 'Test Capabilities',
        capabilities: [
          { name: 'Testing', level: 'Advanced', progress: 90 }
        ],
        showProgress: true
      };

      const invalidProps = {
        capabilities: [
          { name: '', level: 'Invalid', progress: 150 }
        ]
      };

      // Test valid props
      const validResult = capabilityListSchema.safeParse(validProps);
      expect(validResult.success).toBe(true);

      // Test invalid props
      const invalidResult = capabilityListSchema.safeParse(invalidProps);
      expect(invalidResult.success).toBe(false);
      
      if (!invalidResult.success) {
        const errors = invalidResult.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
          severity: 'error'
        }));

        mockComponentRegistry.validateComponentSpec.mockReturnValue({
          valid: false,
          errors,
          warnings: []
        });

        render(
          <ComponentValidationWrapper 
            spec={{ type: 'CapabilityList', props: invalidProps }} 
          />
        );

        expect(screen.getByTestId('validation-status')).toHaveTextContent('Invalid');
        expect(screen.getByTestId('validation-errors')).toBeInTheDocument();
      }
    });

    it('should handle nested validation errors correctly', () => {
      const nestedValidationErrors = [
        { field: 'capabilities[0].name', message: 'Capability name is required', code: 'REQUIRED', severity: 'error' },
        { field: 'capabilities[0].level', message: 'Invalid enum value', code: 'INVALID_ENUM', severity: 'error' },
        { field: 'capabilities[1].progress', message: 'Progress must be between 0 and 100', code: 'OUT_OF_RANGE', severity: 'error' }
      ];

      mockComponentRegistry.validateComponentSpec.mockReturnValue({
        valid: false,
        errors: nestedValidationErrors,
        warnings: []
      });

      const spec = {
        type: 'CapabilityList',
        props: {
          capabilities: [
            { name: '', level: 'Invalid' },
            { name: 'Valid', level: 'Expert', progress: 150 }
          ]
        }
      };

      render(
        <ComponentValidationWrapper spec={spec} />
      );

      expect(screen.getByTestId('validation-errors')).toBeInTheDocument();
      expect(screen.getByTestId('validation-error-0')).toHaveTextContent('capabilities[0].name: Capability name is required');
      expect(screen.getByTestId('validation-error-1')).toHaveTextContent('capabilities[0].level: Invalid enum value');
      expect(screen.getByTestId('validation-error-2')).toHaveTextContent('capabilities[1].progress: Progress must be between 0 and 100');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle validation of deeply nested component props', () => {
      const deeplyNestedSpec = {
        type: 'ActivityFeed',
        props: {
          activities: Array.from({ length: 100 }, (_, i) => ({
            title: `Activity ${i}`,
            metadata: {
              deeply: {
                nested: {
                  data: `value-${i}`,
                  moreNesting: {
                    level4: `level4-${i}`,
                    level5: {
                      data: Array.from({ length: 10 }, (_, j) => `item-${j}`)
                    }
                  }
                }
              }
            }
          }))
        }
      };

      mockComponentRegistry.validateComponentSpec.mockReturnValue({
        valid: true,
        data: deeplyNestedSpec.props,
        errors: [],
        warnings: []
      });

      const startTime = performance.now();
      
      render(
        <ComponentValidationWrapper spec={deeplyNestedSpec} />
      );

      const validationTime = performance.now() - startTime;

      expect(screen.getByTestId('validation-status')).toHaveTextContent('Valid');
      expect(validationTime).toBeLessThan(100); // Should validate within 100ms
    });

    it('should handle concurrent validation requests', async () => {
      const specs = Object.values(validComponentSpecs);
      
      mockComponentRegistry.validateComponentSpec.mockReturnValue({
        valid: true,
        data: {},
        errors: [],
        warnings: []
      });

      // Render multiple validation wrappers simultaneously
      const { container } = render(
        <div>
          {specs.map((spec, index) => (
            <ComponentValidationWrapper key={index} spec={spec} />
          ))}
        </div>
      );

      // All should validate successfully
      const validationStatuses = container.querySelectorAll('[data-testid="validation-status"]');
      expect(validationStatuses).toHaveLength(specs.length);
      
      validationStatuses.forEach(status => {
        expect(status).toHaveTextContent('Valid');
      });
    });

    it('should handle malformed props gracefully', () => {
      const malformedSpecs = [
        { type: 'CapabilityList', props: null },
        { type: 'PerformanceMetrics', props: undefined },
        { type: 'Timeline', props: 'invalid-props-type' },
        { type: 'ProfileHeader', props: { circularRef: {} } }
      ];

      // Create circular reference
      malformedSpecs[3].props.circularRef.self = malformedSpecs[3].props.circularRef;

      malformedSpecs.forEach((spec, index) => {
        mockComponentRegistry.validateComponentSpec.mockReturnValue({
          valid: false,
          errors: [{ message: 'Invalid props format', code: 'INVALID_FORMAT', severity: 'error' }],
          warnings: []
        });

        expect(() => {
          render(
            <ComponentValidationWrapper key={index} spec={spec} />
          );
        }).not.toThrow();
      });
    });
  });
});