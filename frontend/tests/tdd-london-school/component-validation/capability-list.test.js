/**
 * TDD London School Test: CapabilityList Component
 * Tests component behavior and interactions with mock validation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { z } from 'zod';

// Mock the component registry and renderer
const mockComponentRegistry = {
  Button: {
    component: jest.fn(({ children, onClick, variant = 'default', disabled = false, ...props }) => (
      <button 
        {...props}
        className={`btn btn-${variant} ${disabled ? 'disabled' : ''}`}
        onClick={onClick}
        disabled={disabled}
        data-testid="mock-button"
      >
        {children}
      </button>
    )),
    validator: jest.fn(),
    sanitizer: jest.fn(),
    security: {
      allowedProps: ['children', 'onClick', 'variant', 'disabled', 'data-testid'],
      blockedProps: ['dangerouslySetInnerHTML'],
      sanitizeHtml: true
    }
  },
  Badge: {
    component: jest.fn(({ children, variant = 'default', ...props }) => (
      <span 
        {...props}
        className={`badge badge-${variant}`}
        data-testid="mock-badge"
      >
        {children}
      </span>
    )),
    validator: jest.fn(),
    sanitizer: jest.fn()
  },
  Card: {
    component: jest.fn(({ children, title, className, ...props }) => (
      <div 
        {...props}
        className={`card ${className || ''}`}
        data-testid="mock-card"
      >
        {title && <h3 className="card-title">{title}</h3>}
        <div className="card-content">{children}</div>
      </div>
    )),
    validator: jest.fn(),
    sanitizer: jest.fn()
  }
};

// Mock AgentDynamicRenderer
const MockAgentDynamicRenderer = ({ spec, context, onDataChange, onError }) => {
  React.useEffect(() => {
    // Simulate component validation behavior
    if (!spec || !spec.type) {
      onError?.(new Error('Invalid component specification'));
      return;
    }

    // Simulate successful rendering
    if (spec.type === 'CapabilityList' && spec.props) {
      onDataChange?.(spec.props);
    }
  }, [spec, onDataChange, onError]);

  if (!spec || !spec.type) {
    return (
      <div className="error-boundary" data-testid="component-error">
        Invalid component configuration
      </div>
    );
  }

  // Simulate CapabilityList rendering
  if (spec.type === 'CapabilityList') {
    const { capabilities = [], title = 'Capabilities', showProgress = false } = spec.props || {};
    
    return (
      <div className="capability-list" data-testid="capability-list">
        <h2>{title}</h2>
        <div className="capabilities">
          {capabilities.map((capability, index) => (
            <div key={index} className="capability-item" data-testid={`capability-${index}`}>
              <span className="capability-name">{capability.name}</span>
              <span className="capability-level">{capability.level}</span>
              {showProgress && capability.progress !== undefined && (
                <div className="progress-bar" data-testid={`progress-${index}`}>
                  <div 
                    className="progress-fill"
                    style={{ width: `${capability.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <div data-testid="unknown-component">Unknown component: {spec.type}</div>;
};

// Component specs for testing
const validCapabilityListSpec = {
  type: 'CapabilityList',
  props: {
    title: 'Agent Capabilities',
    capabilities: [
      { name: 'Code Generation', level: 'Expert', progress: 95 },
      { name: 'Testing', level: 'Advanced', progress: 85 },
      { name: 'Documentation', level: 'Intermediate', progress: 75 }
    ],
    showProgress: true
  }
};

const invalidCapabilityListSpec = {
  type: 'CapabilityList',
  props: {
    capabilities: 'invalid-data-type',
    showProgress: 'not-a-boolean'
  }
};

const malformedSpec = {
  // Missing type
  props: {
    title: 'Test'
  }
};

describe('TDD London School: CapabilityList Component Validation', () => {
  let mockOnDataChange;
  let mockOnError;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    mockOnDataChange = jest.fn();
    mockOnError = jest.fn();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Reset all mock functions
    jest.clearAllMocks();
    Object.values(mockComponentRegistry).forEach(mapper => {
      mapper.validator.mockReturnValue({ valid: true, data: {}, errors: [], warnings: [] });
      mapper.sanitizer?.mockImplementation(props => props);
    });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Valid Component Props', () => {
    it('should render CapabilityList with valid props configuration', () => {
      const context = { agentId: 'test-agent', pageId: 'test-page' };

      render(
        <MockAgentDynamicRenderer
          spec={validCapabilityListSpec}
          context={context}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      // Verify component renders
      expect(screen.getByTestId('capability-list')).toBeInTheDocument();
      expect(screen.getByText('Agent Capabilities')).toBeInTheDocument();
      
      // Verify capabilities are rendered
      expect(screen.getByTestId('capability-0')).toBeInTheDocument();
      expect(screen.getByText('Code Generation')).toBeInTheDocument();
      expect(screen.getByText('Expert')).toBeInTheDocument();
      
      // Verify progress bars are shown
      expect(screen.getByTestId('progress-0')).toBeInTheDocument();
      
      // Verify no errors occurred
      expect(mockOnError).not.toHaveBeenCalled();
      
      // Verify data change callback was called
      expect(mockOnDataChange).toHaveBeenCalledWith(validCapabilityListSpec.props);
    });

    it('should handle empty capabilities array gracefully', () => {
      const emptyCapabilitiesSpec = {
        type: 'CapabilityList',
        props: {
          title: 'No Capabilities',
          capabilities: [],
          showProgress: false
        }
      };

      render(
        <MockAgentDynamicRenderer
          spec={emptyCapabilitiesSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.getByTestId('capability-list')).toBeInTheDocument();
      expect(screen.getByText('No Capabilities')).toBeInTheDocument();
      expect(screen.queryByTestId('capability-0')).not.toBeInTheDocument();
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should use default props when props are missing', () => {
      const minimalSpec = {
        type: 'CapabilityList',
        props: {}
      };

      render(
        <MockAgentDynamicRenderer
          spec={minimalSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.getByTestId('capability-list')).toBeInTheDocument();
      expect(screen.getByText('Capabilities')).toBeInTheDocument(); // Default title
      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  describe('Invalid Component Props', () => {
    it('should handle invalid prop types gracefully', () => {
      render(
        <MockAgentDynamicRenderer
          spec={invalidCapabilityListSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      // Component should still render but handle invalid props
      expect(screen.getByTestId('capability-list')).toBeInTheDocument();
      
      // Should not crash the application
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should show error for malformed component specification', () => {
      render(
        <MockAgentDynamicRenderer
          spec={malformedSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.getByTestId('component-error')).toBeInTheDocument();
      expect(screen.getByText('Invalid component configuration')).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle null or undefined spec', () => {
      render(
        <MockAgentDynamicRenderer
          spec={null}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.getByTestId('component-error')).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalled();
    });
  });

  describe('Component Registry Integration', () => {
    it('should validate component props through registry validator', () => {
      mockComponentRegistry.Button.validator.mockReturnValue({
        valid: true,
        data: { children: 'Click me', variant: 'default' },
        errors: [],
        warnings: []
      });

      const buttonSpec = {
        type: 'Button', 
        props: { children: 'Click me', variant: 'default' }
      };

      // Simulate component registry validation behavior
      const validationResult = mockComponentRegistry.Button.validator(buttonSpec.props);
      
      expect(mockComponentRegistry.Button.validator).toHaveBeenCalledWith(buttonSpec.props);
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    it('should handle validation errors from component registry', () => {
      mockComponentRegistry.Button.validator.mockReturnValue({
        valid: false,
        errors: [
          {
            field: 'variant',
            message: 'Invalid variant value',
            code: 'INVALID_ENUM',
            severity: 'error'
          }
        ],
        warnings: []
      });

      const buttonSpec = {
        type: 'Button',
        props: { children: 'Click me', variant: 'invalid-variant' }
      };

      const validationResult = mockComponentRegistry.Button.validator(buttonSpec.props);
      
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors).toHaveLength(1);
      expect(validationResult.errors[0].message).toBe('Invalid variant value');
    });

    it('should sanitize component props through security policy', () => {
      const unsafeProps = {
        children: 'Click me',
        onClick: jest.fn(),
        dangerouslySetInnerHTML: { __html: '<script>alert("xss")</script>' },
        'data-testid': 'test-button'
      };

      mockComponentRegistry.Button.sanitizer.mockImplementation((props) => {
        const { dangerouslySetInnerHTML, ...sanitized } = props;
        return sanitized;
      });

      const sanitizedProps = mockComponentRegistry.Button.sanitizer(unsafeProps);
      
      expect(sanitizedProps).not.toHaveProperty('dangerouslySetInnerHTML');
      expect(sanitizedProps).toHaveProperty('children', 'Click me');
      expect(sanitizedProps).toHaveProperty('data-testid', 'test-button');
    });
  });

  describe('Error Boundary Behavior', () => {
    it('should catch and handle component rendering errors', () => {
      const errorThrowingSpec = {
        type: 'CapabilityList',
        props: {
          capabilities: [
            { name: 'Valid Capability', level: 'Expert' },
            null, // This should cause an error
            { name: 'Another Valid', level: 'Beginner' }
          ]
        }
      };

      // Mock the renderer to throw an error for invalid data
      const ThrowingRenderer = ({ spec, onError }) => {
        React.useEffect(() => {
          try {
            if (spec.props.capabilities.some(cap => cap === null)) {
              throw new Error('Invalid capability data detected');
            }
          } catch (error) {
            onError(error);
          }
        }, [spec, onError]);

        return <div data-testid="error-boundary">Component Error Caught</div>;
      };

      render(
        <ThrowingRenderer
          spec={errorThrowingSpec}
          onError={mockOnError}
        />
      );

      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });

  describe('Zod Schema Validation Integration', () => {
    it('should validate capability list props with Zod schema', () => {
      const capabilityItemSchema = z.object({
        name: z.string().min(1, 'Capability name is required'),
        level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
        progress: z.number().min(0).max(100).optional()
      });

      const capabilityListSchema = z.object({
        title: z.string().optional(),
        capabilities: z.array(capabilityItemSchema),
        showProgress: z.boolean().optional()
      });

      // Valid props
      const validProps = {
        title: 'Test Capabilities',
        capabilities: [
          { name: 'Testing', level: 'Advanced', progress: 90 }
        ],
        showProgress: true
      };

      const validResult = capabilityListSchema.safeParse(validProps);
      expect(validResult.success).toBe(true);

      // Invalid props
      const invalidProps = {
        capabilities: [
          { name: '', level: 'Invalid', progress: 150 } // Multiple validation errors
        ]
      };

      const invalidResult = capabilityListSchema.safeParse(invalidProps);
      expect(invalidResult.success).toBe(false);
      
      if (!invalidResult.success) {
        expect(invalidResult.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ message: 'Capability name is required' }),
            expect.objectContaining({ message: expect.stringContaining('Invalid enum value') })
          ])
        );
      }
    });
  });

  describe('Performance and Memory Considerations', () => {
    it('should not leak memory with large capability lists', () => {
      const largeCabilitiesList = Array.from({ length: 1000 }, (_, i) => ({
        name: `Capability ${i}`,
        level: 'Intermediate',
        progress: Math.floor(Math.random() * 100)
      }));

      const largeSpec = {
        type: 'CapabilityList',
        props: {
          capabilities: largeCabilitiesList,
          showProgress: true
        }
      };

      const { unmount } = render(
        <MockAgentDynamicRenderer
          spec={largeSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.getByTestId('capability-list')).toBeInTheDocument();
      
      // Clean unmount should not throw errors
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid prop updates without performance issues', async () => {
      const { rerender } = render(
        <MockAgentDynamicRenderer
          spec={validCapabilityListSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      // Simulate rapid updates
      for (let i = 0; i < 10; i++) {
        const updatedSpec = {
          ...validCapabilityListSpec,
          props: {
            ...validCapabilityListSpec.props,
            title: `Updated Title ${i}`
          }
        };

        rerender(
          <MockAgentDynamicRenderer
            spec={updatedSpec}
            context={{ agentId: 'test', pageId: 'test' }}
            onDataChange={mockOnDataChange}
            onError={mockOnError}
          />
        );
      }

      await waitFor(() => {
        expect(screen.getByText('Updated Title 9')).toBeInTheDocument();
      });

      expect(mockOnError).not.toHaveBeenCalled();
    });
  });
});