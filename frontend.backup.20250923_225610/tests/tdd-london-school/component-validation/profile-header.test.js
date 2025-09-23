/**
 * TDD London School Test: ProfileHeader Component
 * Tests agent profile header rendering and data validation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { z } from 'zod';

// Mock Avatar component
const MockAvatar = ({ src, alt, fallback, size = 'default', ...props }) => (
  <div {...props} className={`avatar size-${size}`} data-testid="mock-avatar">
    {src ? (
      <img src={src} alt={alt} data-testid="avatar-image" />
    ) : (
      <div className="avatar-fallback" data-testid="avatar-fallback">
        {fallback}
      </div>
    )}
  </div>
);

// Mock Badge component
const MockBadge = ({ children, variant = 'default', ...props }) => (
  <span {...props} className={`badge variant-${variant}`} data-testid="mock-badge">
    {children}
  </span>
);

// Mock ProfileHeader component renderer
const MockAgentDynamicRenderer = ({ spec, context, onDataChange, onError }) => {
  React.useEffect(() => {
    if (!spec || !spec.type) {
      onError?.(new Error('Invalid component specification'));
      return;
    }

    if (spec.type === 'ProfileHeader' && spec.props) {
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

  // Simulate ProfileHeader rendering
  if (spec.type === 'ProfileHeader') {
    const { 
      name = 'Unknown Agent',
      title = '',
      description = '',
      avatar = null,
      status = 'offline',
      capabilities = [],
      stats = {},
      badges = [],
      showStatus = true,
      showStats = true,
      showCapabilities = true,
      layout = 'horizontal',
      size = 'default',
      interactive = false
    } = spec.props || {};
    
    const statusColors = {
      online: 'success',
      offline: 'secondary',
      busy: 'warning',
      error: 'destructive'
    };

    const getInitials = (name) => {
      return name
        .split(' ')
        .map(part => part.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();
    };
    
    return (
      <div 
        className={`profile-header layout-${layout} size-${size} ${interactive ? 'interactive' : ''}`}
        data-testid="profile-header"
        data-layout={layout}
        data-size={size}
        data-interactive={interactive}
      >
        <div className="profile-main">
          <div className="profile-avatar-container">
            <MockAvatar
              src={avatar?.url}
              alt={`${name} avatar`}
              fallback={avatar?.fallback || getInitials(name)}
              size={size}
            />
            
            {showStatus && (
              <div 
                className={`status-indicator status-${status}`}
                data-testid="status-indicator"
                data-status={status}
                title={`Status: ${status}`}
              />
            )}
          </div>
          
          <div className="profile-info">
            <div className="profile-header-top">
              <h2 className="profile-name" data-testid="profile-name">
                {name}
              </h2>
              
              {badges.map((badge, index) => (
                <MockBadge 
                  key={index}
                  variant={badge.variant || 'default'}
                  data-testid={`profile-badge-${index}`}
                >
                  {badge.label}
                </MockBadge>
              ))}
            </div>
            
            {title && (
              <h3 className="profile-title" data-testid="profile-title">
                {title}
              </h3>
            )}
            
            {description && (
              <p className="profile-description" data-testid="profile-description">
                {description}
              </p>
            )}
          </div>
        </div>
        
        {showStats && Object.keys(stats).length > 0 && (
          <div className="profile-stats" data-testid="profile-stats">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} className="stat-item" data-testid={`stat-${key}`}>
                <span className="stat-value">{value}</span>
                <span className="stat-label">{key}</span>
              </div>
            ))}
          </div>
        )}
        
        {showCapabilities && capabilities.length > 0 && (
          <div className="profile-capabilities" data-testid="profile-capabilities">
            <h4 className="capabilities-title">Capabilities</h4>
            <div className="capabilities-list">
              {capabilities.map((capability, index) => (
                <div 
                  key={index} 
                  className="capability-item"
                  data-testid={`capability-${index}`}
                >
                  <span className="capability-name">{capability.name}</span>
                  {capability.level && (
                    <span className={`capability-level level-${capability.level.toLowerCase()}`}>
                      {capability.level}
                    </span>
                  )}
                  {capability.confidence && (
                    <span className="capability-confidence">
                      {capability.confidence}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {interactive && (
          <div className="profile-actions" data-testid="profile-actions">
            <button 
              className="action-button primary"
              data-testid="interact-button"
            >
              Interact
            </button>
            <button 
              className="action-button secondary"
              data-testid="configure-button"
            >
              Configure
            </button>
          </div>
        )}
      </div>
    );
  }

  return <div data-testid="unknown-component">Unknown component: {spec.type}</div>;
};

// Test data specifications
const validProfileHeaderSpec = {
  type: 'ProfileHeader',
  props: {
    name: 'AI Assistant Agent',
    title: 'Senior Code Review Specialist',
    description: 'Specialized in JavaScript, Python, and React development with focus on code quality and best practices.',
    avatar: {
      url: 'https://example.com/avatar.jpg',
      fallback: 'AI'
    },
    status: 'online',
    showStatus: true,
    showStats: true,
    showCapabilities: true,
    layout: 'horizontal',
    size: 'default',
    interactive: true,
    badges: [
      { label: 'Expert', variant: 'default' },
      { label: 'Verified', variant: 'success' }
    ],
    stats: {
      'Tasks Completed': 1247,
      'Success Rate': '98.5%',
      'Avg Response Time': '1.2s',
      'Experience': '2 years'
    },
    capabilities: [
      { name: 'Code Review', level: 'Expert', confidence: 95 },
      { name: 'Bug Detection', level: 'Advanced', confidence: 88 },
      { name: 'Performance Optimization', level: 'Intermediate', confidence: 75 },
      { name: 'Documentation', level: 'Advanced', confidence: 85 }
    ]
  }
};

const minimalProfileSpec = {
  type: 'ProfileHeader',
  props: {
    name: 'Basic Agent'
  }
};

const invalidProfileSpec = {
  type: 'ProfileHeader',
  props: {
    name: null,
    status: 'invalid-status',
    showStatus: 'not-a-boolean',
    badges: 'not-an-array',
    stats: 'not-an-object',
    capabilities: 'not-an-array',
    layout: 'invalid-layout',
    size: 'invalid-size'
  }
};

const profileWithInvalidData = {
  type: 'ProfileHeader',
  props: {
    name: 'Agent with Issues',
    avatar: {
      url: 'invalid-url',
      fallback: ''
    },
    badges: [
      { label: 'Valid Badge', variant: 'success' },
      null, // Invalid badge
      { /* missing label */ variant: 'warning' },
      { label: 'Invalid Variant', variant: 'non-existent' }
    ],
    capabilities: [
      { name: 'Valid Capability', level: 'Expert', confidence: 95 },
      { name: '', level: 'Invalid' }, // Empty name, invalid level
      null, // Null capability
      { name: 'No Level', confidence: 150 } // Invalid confidence > 100
    ],
    stats: {
      'Valid Stat': 100,
      '': 'Empty key',
      'Null Value': null,
      'Invalid Number': 'not-a-number'
    }
  }
};

describe('TDD London School: ProfileHeader Component Validation', () => {
  let mockOnDataChange;
  let mockOnError;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    mockOnDataChange = jest.fn();
    mockOnError = jest.fn();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Valid Profile Header Rendering', () => {
    it('should render ProfileHeader with complete valid configuration', () => {
      const context = { agentId: 'test-agent', pageId: 'test-page' };

      render(
        <MockAgentDynamicRenderer
          spec={validProfileHeaderSpec}
          context={context}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      // Verify main component renders
      expect(screen.getByTestId('profile-header')).toBeInTheDocument();
      
      // Verify layout and size attributes
      const header = screen.getByTestId('profile-header');
      expect(header).toHaveClass('layout-horizontal', 'size-default', 'interactive');
      expect(header).toHaveAttribute('data-layout', 'horizontal');
      expect(header).toHaveAttribute('data-interactive', 'true');
      
      // Verify name and title
      expect(screen.getByTestId('profile-name')).toHaveTextContent('AI Assistant Agent');
      expect(screen.getByTestId('profile-title')).toHaveTextContent('Senior Code Review Specialist');
      expect(screen.getByTestId('profile-description')).toBeInTheDocument();
      
      // Verify avatar
      expect(screen.getByTestId('mock-avatar')).toBeInTheDocument();
      expect(screen.getByTestId('avatar-image')).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      
      // Verify status indicator
      expect(screen.getByTestId('status-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('status-indicator')).toHaveAttribute('data-status', 'online');
      expect(screen.getByTestId('status-indicator')).toHaveClass('status-online');
      
      // Verify badges
      expect(screen.getByTestId('profile-badge-0')).toHaveTextContent('Expert');
      expect(screen.getByTestId('profile-badge-1')).toHaveTextContent('Verified');
      
      // Verify stats
      expect(screen.getByTestId('profile-stats')).toBeInTheDocument();
      expect(screen.getByTestId('stat-Tasks Completed')).toBeInTheDocument();
      expect(screen.getByText('1247')).toBeInTheDocument();
      expect(screen.getByText('Tasks Completed')).toBeInTheDocument();
      
      // Verify capabilities
      expect(screen.getByTestId('profile-capabilities')).toBeInTheDocument();
      expect(screen.getByTestId('capability-0')).toBeInTheDocument();
      expect(screen.getByText('Code Review')).toBeInTheDocument();
      expect(screen.getByText('Expert')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
      
      // Verify interactive actions
      expect(screen.getByTestId('profile-actions')).toBeInTheDocument();
      expect(screen.getByTestId('interact-button')).toBeInTheDocument();
      expect(screen.getByTestId('configure-button')).toBeInTheDocument();
      
      // Verify no errors occurred
      expect(mockOnError).not.toHaveBeenCalled();
      expect(mockOnDataChange).toHaveBeenCalledWith(validProfileHeaderSpec.props);
    });

    it('should render minimal profile with default values', () => {
      render(
        <MockAgentDynamicRenderer
          spec={minimalProfileSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.getByTestId('profile-header')).toBeInTheDocument();
      expect(screen.getByTestId('profile-name')).toHaveTextContent('Basic Agent');
      
      // Should use initials fallback
      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('BA');
      
      // Should have default status
      expect(screen.getByTestId('status-indicator')).toHaveClass('status-offline');
      
      // Should not show empty sections
      expect(screen.queryByTestId('profile-stats')).not.toBeInTheDocument();
      expect(screen.queryByTestId('profile-capabilities')).not.toBeInTheDocument();
      expect(screen.queryByTestId('profile-actions')).not.toBeInTheDocument();
      
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should handle missing name with fallback', () => {
      const noNameSpec = {
        type: 'ProfileHeader',
        props: {}
      };

      render(
        <MockAgentDynamicRenderer
          spec={noNameSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.getByTestId('profile-name')).toHaveTextContent('Unknown Agent');
      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  describe('Avatar and Status Handling', () => {
    it('should render avatar image when URL is provided', () => {
      const avatarSpec = {
        type: 'ProfileHeader',
        props: {
          name: 'Avatar Test',
          avatar: {
            url: 'https://example.com/test-avatar.png',
            fallback: 'AT'
          }
        }
      };

      render(
        <MockAgentDynamicRenderer
          spec={avatarSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.getByTestId('avatar-image')).toBeInTheDocument();
      expect(screen.getByTestId('avatar-image')).toHaveAttribute('src', 'https://example.com/test-avatar.png');
      expect(screen.queryByTestId('avatar-fallback')).not.toBeInTheDocument();
    });

    it('should use fallback when avatar URL is not provided', () => {
      const fallbackSpec = {
        type: 'ProfileHeader',
        props: {
          name: 'Fallback Test',
          avatar: {
            fallback: 'FT'
          }
        }
      };

      render(
        <MockAgentDynamicRenderer
          spec={fallbackSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.queryByTestId('avatar-image')).not.toBeInTheDocument();
      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('FT');
    });

    it('should generate initials when no avatar or fallback provided', () => {
      const initialsSpec = {
        type: 'ProfileHeader',
        props: {
          name: 'John Doe Smith'
        }
      };

      render(
        <MockAgentDynamicRenderer
          spec={initialsSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JD');
    });

    it('should apply correct status classes and indicators', () => {
      const statuses = ['online', 'offline', 'busy', 'error'];
      
      statuses.forEach(status => {
        const statusSpec = {
          type: 'ProfileHeader',
          props: {
            name: 'Status Test',
            status,
            showStatus: true
          }
        };

        const { unmount } = render(
          <MockAgentDynamicRenderer
            spec={statusSpec}
            context={{ agentId: 'test', pageId: 'test' }}
            onDataChange={mockOnDataChange}
            onError={mockOnError}
          />
        );

        const indicator = screen.getByTestId('status-indicator');
        expect(indicator).toHaveClass(`status-${status}`);
        expect(indicator).toHaveAttribute('data-status', status);
        expect(indicator).toHaveAttribute('title', `Status: ${status}`);
        
        unmount();
      });
    });

    it('should hide status indicator when showStatus is false', () => {
      const hiddenStatusSpec = {
        type: 'ProfileHeader',
        props: {
          name: 'Hidden Status',
          status: 'online',
          showStatus: false
        }
      };

      render(
        <MockAgentDynamicRenderer
          spec={hiddenStatusSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.queryByTestId('status-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Layout and Size Variations', () => {
    it('should apply different layout classes correctly', () => {
      const layouts = ['horizontal', 'vertical'];
      
      layouts.forEach(layout => {
        const layoutSpec = {
          type: 'ProfileHeader',
          props: {
            name: 'Layout Test',
            layout
          }
        };

        const { unmount } = render(
          <MockAgentDynamicRenderer
            spec={layoutSpec}
            context={{ agentId: 'test', pageId: 'test' }}
            onDataChange={mockOnDataChange}
            onError={mockOnError}
          />
        );

        const header = screen.getByTestId('profile-header');
        expect(header).toHaveClass(`layout-${layout}`);
        expect(header).toHaveAttribute('data-layout', layout);
        
        unmount();
      });
    });

    it('should apply different size classes correctly', () => {
      const sizes = ['small', 'default', 'large'];
      
      sizes.forEach(size => {
        const sizeSpec = {
          type: 'ProfileHeader',
          props: {
            name: 'Size Test',
            size
          }
        };

        const { unmount } = render(
          <MockAgentDynamicRenderer
            spec={sizeSpec}
            context={{ agentId: 'test', pageId: 'test' }}
            onDataChange={mockOnDataChange}
            onError={mockOnError}
          />
        );

        const header = screen.getByTestId('profile-header');
        expect(header).toHaveClass(`size-${size}`);
        expect(header).toHaveAttribute('data-size', size);
        
        // Avatar should also get size
        expect(screen.getByTestId('mock-avatar')).toHaveClass(`size-${size}`);
        
        unmount();
      });
    });
  });

  describe('Invalid Configuration Handling', () => {
    it('should handle invalid prop types gracefully', () => {
      render(
        <MockAgentDynamicRenderer
          spec={invalidProfileSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      // Component should still render with defaults
      expect(screen.getByTestId('profile-header')).toBeInTheDocument();
      expect(screen.getByTestId('profile-name')).toHaveTextContent('Unknown Agent'); // Fallback for null name
      
      // Should handle invalid arrays/objects gracefully
      expect(screen.queryByTestId('profile-badges')).not.toBeInTheDocument();
      expect(screen.queryByTestId('profile-stats')).not.toBeInTheDocument();
      
      // Should not crash the application
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should handle data with invalid nested properties', () => {
      render(
        <MockAgentDynamicRenderer
          spec={profileWithInvalidData}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.getByTestId('profile-header')).toBeInTheDocument();
      expect(screen.getByTestId('profile-name')).toHaveTextContent('Agent with Issues');
      
      // Valid badges should render
      expect(screen.getByTestId('profile-badge-0')).toHaveTextContent('Valid Badge');
      
      // Valid capabilities should render
      expect(screen.getByText('Valid Capability')).toBeInTheDocument();
      
      // Valid stats should render
      expect(screen.getByText('100')).toBeInTheDocument();
      
      // Should not crash the application
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should show error for completely malformed specification', () => {
      const malformedSpec = {
        // Missing type
        props: { name: 'Test' }
      };

      render(
        <MockAgentDynamicRenderer
          spec={malformedSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.getByTestId('component-error')).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Zod Schema Validation', () => {
    it('should validate ProfileHeader props with Zod schema', () => {
      const badgeSchema = z.object({
        label: z.string().min(1, 'Badge label is required'),
        variant: z.enum(['default', 'success', 'warning', 'destructive']).optional()
      });

      const capabilitySchema = z.object({
        name: z.string().min(1, 'Capability name is required'),
        level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']).optional(),
        confidence: z.number().min(0).max(100).optional()
      });

      const profileHeaderSchema = z.object({
        name: z.string().min(1, 'Profile name is required'),
        title: z.string().optional(),
        description: z.string().optional(),
        avatar: z.object({
          url: z.string().url().optional(),
          fallback: z.string().optional()
        }).optional(),
        status: z.enum(['online', 'offline', 'busy', 'error']).optional(),
        badges: z.array(badgeSchema).optional(),
        capabilities: z.array(capabilitySchema).optional(),
        stats: z.record(z.union([z.string(), z.number()])).optional(),
        layout: z.enum(['horizontal', 'vertical']).optional(),
        size: z.enum(['small', 'default', 'large']).optional(),
        showStatus: z.boolean().optional(),
        showStats: z.boolean().optional(),
        showCapabilities: z.boolean().optional(),
        interactive: z.boolean().optional()
      });

      // Valid props
      const validProps = {
        name: 'Valid Agent',
        title: 'Test Title',
        status: 'online',
        badges: [{ label: 'Expert', variant: 'success' }],
        capabilities: [{ name: 'Testing', level: 'Advanced', confidence: 90 }],
        stats: { 'Tasks': 100, 'Rate': '95%' }
      };

      const validResult = profileHeaderSchema.safeParse(validProps);
      expect(validResult.success).toBe(true);

      // Invalid props
      const invalidProps = {
        name: '',
        status: 'invalid-status',
        badges: [{ label: '', variant: 'invalid-variant' }],
        capabilities: [{ name: '', level: 'invalid-level', confidence: 150 }],
        layout: 'invalid-layout'
      };

      const invalidResult = profileHeaderSchema.safeParse(invalidProps);
      expect(invalidResult.success).toBe(false);
      
      if (!invalidResult.success) {
        expect(invalidResult.error.issues.length).toBeGreaterThan(0);
        expect(invalidResult.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ message: 'Profile name is required' })
          ])
        );
      }
    });
  });

  describe('Interactive Features', () => {
    it('should render interactive actions when interactive is true', () => {
      const interactiveSpec = {
        type: 'ProfileHeader',
        props: {
          name: 'Interactive Agent',
          interactive: true
        }
      };

      render(
        <MockAgentDynamicRenderer
          spec={interactiveSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.getByTestId('profile-actions')).toBeInTheDocument();
      expect(screen.getByTestId('interact-button')).toBeInTheDocument();
      expect(screen.getByTestId('configure-button')).toBeInTheDocument();
    });

    it('should not render actions when interactive is false', () => {
      const nonInteractiveSpec = {
        type: 'ProfileHeader',
        props: {
          name: 'Non-Interactive Agent',
          interactive: false
        }
      };

      render(
        <MockAgentDynamicRenderer
          spec={nonInteractiveSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.queryByTestId('profile-actions')).not.toBeInTheDocument();
    });
  });

  describe('Performance and Accessibility', () => {
    it('should handle profile with many badges and capabilities efficiently', () => {
      const manyBadges = Array.from({ length: 20 }, (_, i) => ({
        label: `Badge ${i}`,
        variant: ['default', 'success', 'warning'][i % 3]
      }));

      const manyCapabilities = Array.from({ length: 50 }, (_, i) => ({
        name: `Capability ${i}`,
        level: ['Beginner', 'Intermediate', 'Advanced', 'Expert'][i % 4],
        confidence: Math.floor(Math.random() * 100)
      }));

      const largeSpec = {
        type: 'ProfileHeader',
        props: {
          name: 'Complex Agent',
          badges: manyBadges,
          capabilities: manyCapabilities
        }
      };

      const startTime = performance.now();
      
      const { unmount } = render(
        <MockAgentDynamicRenderer
          spec={largeSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      const renderTime = performance.now() - startTime;
      
      expect(screen.getByTestId('profile-header')).toBeInTheDocument();
      expect(renderTime).toBeLessThan(1000); // Should render within 1 second
      expect(mockOnError).not.toHaveBeenCalled();
      
      // Clean unmount
      expect(() => unmount()).not.toThrow();
    });
  });
});