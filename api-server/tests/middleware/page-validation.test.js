/**
 * TDD London School Tests: Page Validation Middleware
 *
 * Layer 1: Schema Validation Guard
 * Tests the contract-based validation of page components
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validatePageComponents,
  validateSidebar,
  extractComponents,
  validatePageMiddleware
} from '../../middleware/page-validation.js';
import {
  validateSidebarItems,
  applyValidationRules
} from '../../middleware/validation-rules.js';

describe('Page Validation Middleware - TDD London School', () => {
  describe('extractComponents', () => {
    it('should extract components from specification.components', () => {
      const pageData = {
        specification: {
          components: [
            { type: 'header', props: { title: 'Test' } },
            { type: 'stat', props: { label: 'Count', value: 42 } }
          ]
        }
      };

      const result = extractComponents(pageData);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('header');
      expect(result[1].type).toBe('stat');
    });

    it('should extract components from top-level components field', () => {
      const pageData = {
        components: [
          { type: 'Card', props: { title: 'Card 1' } }
        ]
      };

      const result = extractComponents(pageData);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('Card');
    });

    it('should extract components from content_value JSON string', () => {
      const pageData = {
        content_value: JSON.stringify({
          components: [
            { type: 'Button', props: { children: 'Click me' } }
          ]
        })
      };

      const result = extractComponents(pageData);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('Button');
    });

    it('should extract components from content_value object', () => {
      const pageData = {
        content_value: {
          components: [
            { type: 'Markdown', props: { content: '# Hello' } }
          ]
        }
      };

      const result = extractComponents(pageData);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('Markdown');
    });

    it('should extract components from layout field', () => {
      const pageData = {
        layout: [
          { type: 'Grid', props: { cols: 3 } }
        ]
      };

      const result = extractComponents(pageData);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('Grid');
    });

    it('should combine components from multiple sources', () => {
      const pageData = {
        components: [
          { type: 'header', props: { title: 'A' } }
        ],
        specification: {
          components: [
            { type: 'stat', props: { label: 'B', value: 1 } }
          ]
        }
      };

      const result = extractComponents(pageData);

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no components found', () => {
      const pageData = {
        title: 'Test Page',
        content_type: 'markdown'
      };

      const result = extractComponents(pageData);

      expect(result).toEqual([]);
    });

    it('should handle invalid JSON in content_value gracefully', () => {
      const pageData = {
        content_value: 'invalid json {{{}}}'
      };

      const result = extractComponents(pageData);

      expect(result).toEqual([]);
    });
  });

  describe('validatePageComponents', () => {
    it('should validate valid page components successfully', () => {
      const pageData = {
        components: [
          {
            type: 'header',
            props: { title: 'My Page', level: 1 }
          },
          {
            type: 'stat',
            props: { label: 'Users', value: 100 }
          }
        ]
      };

      const result = validatePageComponents(pageData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.componentCount).toBe(2);
    });

    it('should return error for unknown component type', () => {
      const pageData = {
        components: [
          { type: 'UnknownWidget', props: {} }
        ]
      };

      const result = validatePageComponents(pageData);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Unknown component type');
      expect(result.errors[0].type).toBe('UnknownWidget');
    });

    it('should return error for component missing type', () => {
      const pageData = {
        components: [
          { props: { title: 'Test' } }
        ]
      };

      const result = validatePageComponents(pageData);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('missing type');
    });

    it('should validate component props against schema', () => {
      const pageData = {
        components: [
          {
            type: 'header',
            props: { title: '' } // Empty title should fail
          }
        ]
      };

      const result = validatePageComponents(pageData);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Title is required');
    });

    it('should validate nested children components', () => {
      const pageData = {
        components: [
          {
            type: 'Card',
            props: { title: 'Parent' },
            children: [
              {
                type: 'header',
                props: { title: '' } // Invalid child
              }
            ]
          }
        ]
      };

      const result = validatePageComponents(pageData);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].path).toContain('children');
    });

    it('should return warning when no components found', () => {
      const pageData = {
        title: 'Empty Page'
      };

      const result = validatePageComponents(pageData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('No components found');
      expect(result.componentCount).toBe(0);
    });

    it('should validate form component fields', () => {
      const pageData = {
        components: [
          {
            type: 'form',
            props: {
              fields: [
                { label: 'Name', type: 'text', required: true },
                { label: 'Email', type: 'email' }
              ],
              submitLabel: 'Submit'
            }
          }
        ]
      };

      const result = validatePageComponents(pageData);

      expect(result.valid).toBe(true);
      expect(result.componentCount).toBe(1);
    });

    it('should fail validation for form with empty fields array', () => {
      const pageData = {
        components: [
          {
            type: 'form',
            props: { fields: [] }
          }
        ]
      };

      const result = validatePageComponents(pageData);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateSidebar', () => {
    it('should validate valid sidebar with href items', () => {
      const sidebarProps = {
        items: [
          { id: '1', label: 'Home', href: '/' },
          { id: '2', label: 'About', href: '/about' }
        ]
      };

      const result = validateSidebar(sidebarProps);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate sidebar with onClick items', () => {
      const sidebarProps = {
        items: [
          { id: '1', label: 'Action', onClick: 'handleClick' }
        ]
      };

      const result = validateSidebar(sidebarProps);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should validate sidebar with nested children', () => {
      const sidebarProps = {
        items: [
          {
            id: '1',
            label: 'Products',
            children: [
              { id: '1a', label: 'Product A', href: '/products/a' },
              { id: '1b', label: 'Product B', href: '/products/b' }
            ]
          }
        ]
      };

      const result = validateSidebar(sidebarProps);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should error for items with no navigation capability', () => {
      const sidebarProps = {
        items: [
          { id: '1', label: 'No Link' } // No href, onClick, or children
        ]
      };

      const result = validateSidebar(sidebarProps);

      expect(result.valid).toBe(false); // Should be an error
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('must have href, onClick, or children');
      expect(result.errors[0].code).toBe('NO_NAVIGATION');
      expect(result.errors[0].severity).toBe('error');
    });

    it('should error for invalid href format', () => {
      const sidebarProps = {
        items: [
          { id: '1', label: 'Invalid', href: 'not-a-valid-path' }
        ]
      };

      const result = validateSidebar(sidebarProps);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Invalid href format');
    });

    it('should accept template variables in href', () => {
      const sidebarProps = {
        items: [
          { id: '1', label: 'Dynamic', href: '{{user.profileUrl}}' }
        ]
      };

      const result = validateSidebar(sidebarProps);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid href formats', () => {
      const sidebarProps = {
        items: [
          { id: '1', label: 'Relative', href: '/path' },
          { id: '2', label: 'HTTP', href: 'http://example.com' },
          { id: '3', label: 'HTTPS', href: 'https://example.com' },
          { id: '4', label: 'Anchor', href: '#section' }
        ]
      };

      const result = validateSidebar(sidebarProps);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should recursively validate nested children navigation', () => {
      const sidebarProps = {
        items: [
          {
            id: '1',
            label: 'Parent',
            children: [
              { id: '1a', label: 'No Nav' } // Invalid child
            ]
          }
        ]
      };

      const result = validateSidebar(sidebarProps);

      expect(result.valid).toBe(false); // Errors should fail validation
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].path).toContain('children');
      expect(result.errors[0].code).toBe('NO_NAVIGATION');
    });

    it('should fail for missing required label', () => {
      const sidebarProps = {
        items: [
          { id: '1', href: '/' } // Missing label
        ]
      };

      const result = validateSidebar(sidebarProps);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail for empty items array', () => {
      const sidebarProps = {
        items: []
      };

      const result = validateSidebar(sidebarProps);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateSidebarItems', () => {
    it('should validate items array correctly', () => {
      const items = [
        { id: '1', label: 'Home', href: '/' }
      ];

      const result = validateSidebarItems(items);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error if items is not an array', () => {
      const items = { id: '1', label: 'Home' };

      const result = validateSidebarItems(items);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('must be an array');
    });

    it('should validate deeply nested children', () => {
      const items = [
        {
          id: '1',
          label: 'Level 1',
          children: [
            {
              id: '2',
              label: 'Level 2',
              children: [
                { id: '3', label: 'Level 3', href: '/deep' }
              ]
            }
          ]
        }
      ];

      const result = validateSidebarItems(items);

      expect(result.valid).toBe(true);
    });
  });

  describe('applyValidationRules', () => {
    it('should apply Sidebar validation rules', () => {
      const props = {
        items: [
          { id: '1', label: 'Test' } // No navigation
        ]
      };

      const result = applyValidationRules('Sidebar', props);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('NO_NAVIGATION');
    });

    it('should apply Form validation rules', () => {
      const props = {
        fields: []
      };

      const result = applyValidationRules('form', props);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('no fields');
    });

    it('should apply Calendar validation rules', () => {
      const props = {
        events: [
          { id: 1, date: 'invalid-date', title: 'Event' }
        ]
      };

      const result = applyValidationRules('Calendar', props);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should apply GanttChart validation rules', () => {
      const props = {
        tasks: [
          {
            id: 1,
            name: 'Task 1',
            startDate: '2025-01-15',
            endDate: '2025-01-10' // End before start
          }
        ]
      };

      const result = applyValidationRules('GanttChart', props);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('startDate after endDate');
    });

    it('should validate GanttChart dependencies', () => {
      const props = {
        tasks: [
          {
            id: 1,
            name: 'Task 1',
            startDate: '2025-01-10',
            endDate: '2025-01-15',
            dependencies: [999] // Non-existent task
          }
        ]
      };

      const result = applyValidationRules('GanttChart', props);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('not found');
    });

    it('should apply PhotoGrid validation rules', () => {
      const props = {
        images: [
          { url: 'http://example.com/image.jpg' } // Missing alt
        ]
      };

      const result = applyValidationRules('PhotoGrid', props);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('alt text');
    });

    it('should return valid for unknown component types', () => {
      const result = applyValidationRules('UnknownType', {});

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('validatePageMiddleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        body: {}
      };
      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      mockNext = vi.fn();
    });

    it('should call next() for valid page data', () => {
      mockReq.body = {
        components: [
          { type: 'header', props: { title: 'Valid Page' } }
        ]
      };

      validatePageMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockReq.validation).toBeDefined();
      expect(mockReq.validation.valid).toBe(true);
    });

    it('should attach validation errors to request for invalid page data', () => {
      mockReq.body = {
        components: [
          { type: 'UnknownType', props: {} }
        ]
      };

      validatePageMiddleware(mockReq, mockRes, mockNext);

      // Middleware should call next() even on validation errors
      // Route handler will process req.validationErrors for feedback loop
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();

      // Validation errors should be attached to request
      expect(mockReq.validationErrors).toBeDefined();
      expect(mockReq.validationErrors.length).toBeGreaterThan(0);
      expect(mockReq.validationErrors[0].rule).toBe('UNKNOWN_TYPE');
    });

    it('should attach validation results to request', () => {
      mockReq.body = {
        components: [
          { type: 'stat', props: { label: 'Count', value: 42 } }
        ]
      };

      validatePageMiddleware(mockReq, mockRes, mockNext);

      expect(mockReq.validation).toBeDefined();
      expect(mockReq.validation.componentCount).toBe(1);
      expect(mockReq.validation.valid).toBe(true);
    });

    it('should block pages with navigation errors', () => {
      mockReq.body = {
        components: [
          {
            type: 'Sidebar',
            props: {
              items: [
                { id: '1', label: 'No Nav' } // Error - no navigation capability
              ]
            }
          }
        ]
      };

      validatePageMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.validationErrors).toBeDefined();
      expect(mockReq.validationErrors.length).toBeGreaterThan(0);
    });

    it('should handle pages with no components', () => {
      mockReq.body = {
        title: 'Empty Page'
      };

      validatePageMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.validation.valid).toBe(true);
      expect(mockReq.validation.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Integration: Complex Page Validation', () => {
    it('should validate complex page with multiple component types', () => {
      const pageData = {
        components: [
          {
            type: 'header',
            props: { title: 'Dashboard', level: 1 }
          },
          {
            type: 'Grid',
            props: { cols: 3 },
            children: [
              { type: 'stat', props: { label: 'Users', value: 150 } },
              { type: 'stat', props: { label: 'Revenue', value: '$1M' } },
              { type: 'stat', props: { label: 'Growth', value: '25%', change: 5 } }
            ]
          },
          {
            type: 'Sidebar',
            props: {
              items: [
                { id: '1', label: 'Home', href: '/' },
                {
                  id: '2',
                  label: 'Products',
                  children: [
                    { id: '2a', label: 'All Products', href: '/products' },
                    { id: '2b', label: 'New Product', href: '/products/new' }
                  ]
                }
              ]
            }
          }
        ]
      };

      const result = validatePageComponents(pageData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.componentCount).toBe(3);
    });

    it('should catch multiple validation errors across components', () => {
      const pageData = {
        components: [
          { type: 'header', props: { title: '' } }, // Error: empty title
          { type: 'UnknownType', props: {} }, // Error: unknown type
          {
            type: 'form',
            props: { fields: [] } // Error: empty fields
          }
        ]
      };

      const result = validatePageComponents(pageData);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
    });
  });
});
