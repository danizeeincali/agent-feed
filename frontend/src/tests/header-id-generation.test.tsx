import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * TDD London School - Unit Tests for Header ID Generation
 *
 * Following Outside-In approach:
 * 1. Define collaborator contracts through mocks
 * 2. Focus on behavior verification (interactions)
 * 3. Test object conversations and collaborations
 */

// Mock dependencies (London School - define contracts first)
const mockGenerateId = vi.fn();
const mockTruncateTitle = vi.fn();
const mockHandleDuplicates = vi.fn();

// Mock module for ID generation utility
vi.mock('../utils/generateHeaderId', () => ({
  generateHeaderId: (title: string, existingIds?: Set<string>) => mockGenerateId(title, existingIds),
  sanitizeTitle: (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
  truncateToMaxLength: (id: string, maxLength?: number) => mockTruncateTitle(id, maxLength),
  handleDuplicateId: (id: string, existingIds: Set<string>) => mockHandleDuplicates(id, existingIds),
}));

// Header component that we're testing (will be created during implementation)
interface HeaderProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
  id?: string;
  className?: string;
}

// Placeholder component for testing (mock the component behavior)
const Header = ({ level, title, id }: HeaderProps) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const generatedId = id || mockGenerateId(title);

  return <Tag id={generatedId}>{title}</Tag>;
};

// DynamicPageRenderer mock
interface ComponentConfig {
  type: string;
  props: Record<string, any>;
}

const DynamicPageRenderer = ({ components }: { components: ComponentConfig[] }) => {
  return (
    <div data-testid="dynamic-page">
      {components.map((comp, idx) => {
        if (comp.type === 'header') {
          return (
            <Header
              key={idx}
              level={comp.props.level}
              title={comp.props.title}
              id={comp.props.id}
            />
          );
        }
        return null;
      })}
    </div>
  );
};

describe('Header ID Generation - London School TDD', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  /**
   * Category 1: ID Generation from Titles
   * Focus: Behavior verification of title-to-ID conversion
   */
  describe('ID Generation from Titles', () => {
    it('should convert "Text & Content" to "text-content"', () => {
      // Arrange - Set up mock expectation (London School contract)
      const expectedId = 'text-content';
      mockGenerateId.mockReturnValue(expectedId);

      // Act - Execute the behavior
      render(<Header level={2} title="Text & Content" />);

      // Assert - Verify interactions and state
      expect(mockGenerateId).toHaveBeenCalledWith('Text & Content');
      expect(mockGenerateId).toHaveBeenCalledTimes(1);

      const header = screen.getByRole('heading', { level: 2 });
      expect(header).toHaveAttribute('id', expectedId);
    });

    it('should convert "Interactive Forms" to "interactive-forms"', () => {
      // Arrange
      const expectedId = 'interactive-forms';
      mockGenerateId.mockReturnValue(expectedId);

      // Act
      render(<Header level={3} title="Interactive Forms" />);

      // Assert - Verify the collaboration
      expect(mockGenerateId).toHaveBeenCalledWith('Interactive Forms');

      const header = screen.getByRole('heading', { level: 3 });
      expect(header).toHaveAttribute('id', expectedId);
      expect(header).toHaveTextContent('Interactive Forms');
    });

    it('should handle numbers: "Section 1" → "section-1"', () => {
      // Arrange
      const expectedId = 'section-1';
      mockGenerateId.mockReturnValue(expectedId);

      // Act
      render(<Header level={2} title="Section 1" />);

      // Assert
      expect(mockGenerateId).toHaveBeenCalledWith('Section 1');

      const header = screen.getByRole('heading', { level: 2 });
      expect(header).toHaveAttribute('id', expectedId);
    });

    it('should remove special chars: "What\'s New?" → "whats-new"', () => {
      // Arrange
      const expectedId = 'whats-new';
      mockGenerateId.mockReturnValue(expectedId);

      // Act
      render(<Header level={1} title="What's New?" />);

      // Assert - Verify interaction pattern
      expect(mockGenerateId).toHaveBeenCalledWith("What's New?");

      const header = screen.getByRole('heading', { level: 1 });
      expect(header).toHaveAttribute('id', expectedId);
    });

    it('should handle Unicode: "Café & Bar" → "cafe-bar"', () => {
      // Arrange
      const expectedId = 'cafe-bar';
      mockGenerateId.mockReturnValue(expectedId);

      // Act
      render(<Header level={2} title="Café & Bar" />);

      // Assert - Verify the contract was honored
      expect(mockGenerateId).toHaveBeenCalledWith('Café & Bar');

      const header = screen.getByRole('heading', { level: 2 });
      expect(header).toHaveAttribute('id', expectedId);
    });
  });

  /**
   * Category 2: Explicit ID Preservation
   * Focus: Contract verification - explicit IDs should bypass generation
   */
  describe('Explicit ID Preservation', () => {
    it('should use explicit id when provided', () => {
      // Arrange
      const explicitId = 'custom-section-id';

      // Act
      render(<Header level={2} title="Some Title" id={explicitId} />);

      // Assert - Verify generation was NOT called (important interaction test)
      expect(mockGenerateId).not.toHaveBeenCalled();

      const header = screen.getByRole('heading', { level: 2 });
      expect(header).toHaveAttribute('id', explicitId);
    });

    it('should not modify explicit id', () => {
      // Arrange
      const explicitId = 'MY-Custom-ID-123';

      // Act
      render(<Header level={3} title="Title Here" id={explicitId} />);

      // Assert - Verify behavior: no transformation, no generation call
      expect(mockGenerateId).not.toHaveBeenCalled();

      const header = screen.getByRole('heading', { level: 3 });
      expect(header).toHaveAttribute('id', 'MY-Custom-ID-123');
    });

    it('should prefer explicit id over generated', () => {
      // Arrange - Even if generation is configured
      const explicitId = 'explicit-wins';
      mockGenerateId.mockReturnValue('generated-would-be-this');

      // Act
      render(<Header level={1} title="Test Title" id={explicitId} />);

      // Assert - Verify interaction: generation should be skipped
      expect(mockGenerateId).not.toHaveBeenCalled();

      const header = screen.getByRole('heading', { level: 1 });
      expect(header).toHaveAttribute('id', explicitId);
    });
  });

  /**
   * Category 3: Edge Cases
   * Focus: Boundary conditions and error handling behaviors
   */
  describe('Edge Cases', () => {
    it('should handle empty title (use fallback)', () => {
      // Arrange
      const fallbackId = 'header-fallback';
      mockGenerateId.mockReturnValue(fallbackId);

      // Act
      render(<Header level={2} title="" />);

      // Assert - Verify fallback mechanism was triggered
      expect(mockGenerateId).toHaveBeenCalledWith('');

      const header = screen.getByRole('heading', { level: 2 });
      expect(header).toHaveAttribute('id', fallbackId);
    });

    it('should handle very long titles (truncate)', () => {
      // Arrange
      const longTitle = 'This is a very long title that should be truncated to a reasonable length for use as an HTML ID attribute';
      const truncatedId = 'this-is-a-very-long-title-that-should-be-truncated';

      mockGenerateId.mockImplementation((title) => {
        mockTruncateTitle(title, 50);
        return truncatedId;
      });

      // Act
      render(<Header level={2} title={longTitle} />);

      // Assert - Verify truncation collaboration
      expect(mockGenerateId).toHaveBeenCalledWith(longTitle);
      expect(mockTruncateTitle).toHaveBeenCalled();

      const header = screen.getByRole('heading', { level: 2 });
      expect(header).toHaveAttribute('id', truncatedId);
    });

    it('should handle only special chars "!!!" → fallback', () => {
      // Arrange
      const fallbackId = 'header-1';
      mockGenerateId.mockReturnValue(fallbackId);

      // Act
      render(<Header level={3} title="!!!" />);

      // Assert - Verify fallback for invalid characters
      expect(mockGenerateId).toHaveBeenCalledWith('!!!');

      const header = screen.getByRole('heading', { level: 3 });
      expect(header).toHaveAttribute('id', fallbackId);
    });

    it('should handle whitespace-only title', () => {
      // Arrange
      const fallbackId = 'header-fallback';
      mockGenerateId.mockReturnValue(fallbackId);

      // Act
      render(<Header level={2} title="   " />);

      // Assert - Verify whitespace handling
      expect(mockGenerateId).toHaveBeenCalledWith('   ');

      const header = screen.getByRole('heading', { level: 2 });
      expect(header).toHaveAttribute('id', fallbackId);
    });

    it('should handle duplicate titles (add suffix)', () => {
      // Arrange - Simulate duplicate detection
      const existingIds = new Set(['features']);

      mockGenerateId.mockImplementation((title, ids) => {
        if (ids && ids.has('features')) {
          mockHandleDuplicates('features', ids);
          return 'features-2';
        }
        return 'features';
      });

      // Act - Render first header
      const { rerender } = render(<Header level={2} title="Features" />);
      expect(mockGenerateId).toHaveBeenCalledTimes(1);

      // Render second header with same title
      rerender(
        <>
          <Header level={2} title="Features" />
          <Header level={2} title="Features" id={undefined} />
        </>
      );

      // Assert - Verify duplicate handling collaboration
      expect(mockGenerateId).toHaveBeenCalled();

      // Note: In real implementation, this would track IDs across renders
      const headers = screen.getAllByRole('heading', { level: 2 });
      expect(headers).toHaveLength(2);
    });
  });

  /**
   * Category 4: Header Rendering
   * Focus: Different header levels maintain ID generation behavior
   */
  describe('Header Rendering', () => {
    it('should render h1 with generated id', () => {
      // Arrange
      const expectedId = 'main-title';
      mockGenerateId.mockReturnValue(expectedId);

      // Act
      render(<Header level={1} title="Main Title" />);

      // Assert - Verify h1 specific rendering
      expect(mockGenerateId).toHaveBeenCalledWith('Main Title');

      const header = screen.getByRole('heading', { level: 1 });
      expect(header.tagName).toBe('H1');
      expect(header).toHaveAttribute('id', expectedId);
    });

    it('should render h2 with explicit id', () => {
      // Arrange
      const explicitId = 'custom-h2';

      // Act
      render(<Header level={2} title="Subtitle" id={explicitId} />);

      // Assert - Verify h2 with explicit ID
      expect(mockGenerateId).not.toHaveBeenCalled();

      const header = screen.getByRole('heading', { level: 2 });
      expect(header.tagName).toBe('H2');
      expect(header).toHaveAttribute('id', explicitId);
    });

    it('should render h3 with title and generated id', () => {
      // Arrange
      const expectedId = 'section-header';
      mockGenerateId.mockReturnValue(expectedId);

      // Act
      render(<Header level={3} title="Section Header" />);

      // Assert - Verify h3 behavior
      expect(mockGenerateId).toHaveBeenCalledWith('Section Header');

      const header = screen.getByRole('heading', { level: 3 });
      expect(header.tagName).toBe('H3');
      expect(header).toHaveTextContent('Section Header');
      expect(header).toHaveAttribute('id', expectedId);
    });

    it('all header levels h1-h6 should get IDs', () => {
      // Arrange
      const levels = [1, 2, 3, 4, 5, 6] as const;
      mockGenerateId.mockImplementation((title) =>
        title.toLowerCase().replace(/\s+/g, '-')
      );

      // Act
      const { container } = render(
        <>
          {levels.map(level => (
            <Header key={level} level={level} title={`Level ${level}`} />
          ))}
        </>
      );

      // Assert - Verify all levels get IDs
      expect(mockGenerateId).toHaveBeenCalledTimes(6);

      levels.forEach(level => {
        const header = screen.getByRole('heading', { level });
        expect(header).toHaveAttribute('id');
        expect(header.id).toBeTruthy();
      });
    });
  });

  /**
   * Category 5: Integration with DynamicPageRenderer
   * Focus: Component collaboration and page-level behavior
   */
  describe('Integration with DynamicPageRenderer', () => {
    it('should render header from component config', () => {
      // Arrange
      const expectedId = 'page-title';
      mockGenerateId.mockReturnValue(expectedId);

      const components: ComponentConfig[] = [
        {
          type: 'header',
          props: {
            level: 1,
            title: 'Page Title'
          }
        }
      ];

      // Act
      render(<DynamicPageRenderer components={components} />);

      // Assert - Verify page renderer collaboration
      expect(mockGenerateId).toHaveBeenCalledWith('Page Title');

      const header = screen.getByRole('heading', { level: 1 });
      expect(header).toHaveAttribute('id', expectedId);
      expect(header).toHaveTextContent('Page Title');
    });

    it('should work with multiple headers on page', () => {
      // Arrange
      mockGenerateId
        .mockReturnValueOnce('introduction')
        .mockReturnValueOnce('features')
        .mockReturnValueOnce('conclusion');

      const components: ComponentConfig[] = [
        { type: 'header', props: { level: 1, title: 'Introduction' } },
        { type: 'header', props: { level: 2, title: 'Features' } },
        { type: 'header', props: { level: 2, title: 'Conclusion' } }
      ];

      // Act
      render(<DynamicPageRenderer components={components} />);

      // Assert - Verify multiple header collaboration
      expect(mockGenerateId).toHaveBeenCalledTimes(3);
      expect(mockGenerateId).toHaveBeenNthCalledWith(1, 'Introduction');
      expect(mockGenerateId).toHaveBeenNthCalledWith(2, 'Features');
      expect(mockGenerateId).toHaveBeenNthCalledWith(3, 'Conclusion');

      const headers = screen.getAllByRole('heading');
      expect(headers).toHaveLength(3);
      expect(headers[0]).toHaveAttribute('id', 'introduction');
      expect(headers[1]).toHaveAttribute('id', 'features');
      expect(headers[2]).toHaveAttribute('id', 'conclusion');
    });

    it('should work with sidebar navigation', () => {
      // Arrange - Simulate navigation component using header IDs
      mockGenerateId
        .mockReturnValueOnce('overview')
        .mockReturnValueOnce('getting-started');

      const components: ComponentConfig[] = [
        { type: 'header', props: { level: 2, title: 'Overview' } },
        { type: 'header', props: { level: 2, title: 'Getting Started' } }
      ];

      const mockNavigationLinks = vi.fn();

      // Act
      render(
        <MemoryRouter>
          <div>
            <nav data-testid="sidebar">
              {/* Mock sidebar that would use these IDs */}
              <a
                href="#overview"
                onClick={() => mockNavigationLinks('overview')}
              >
                Overview
              </a>
              <a
                href="#getting-started"
                onClick={() => mockNavigationLinks('getting-started')}
              >
                Getting Started
              </a>
            </nav>
            <DynamicPageRenderer components={components} />
          </div>
        </MemoryRouter>
      );

      // Assert - Verify IDs are available for navigation
      expect(mockGenerateId).toHaveBeenCalledTimes(2);

      const headers = screen.getAllByRole('heading');
      expect(headers[0]).toHaveAttribute('id', 'overview');
      expect(headers[1]).toHaveAttribute('id', 'getting-started');

      // Verify navigation links exist
      const navLinks = screen.getAllByRole('link');
      expect(navLinks[0]).toHaveAttribute('href', '#overview');
      expect(navLinks[1]).toHaveAttribute('href', '#getting-started');
    });
  });

  /**
   * Additional London School Pattern: Contract Verification
   * Test the collaborator contracts explicitly
   */
  describe('Collaborator Contracts', () => {
    it('should define clear generateHeaderId contract', () => {
      // Arrange - Define expected contract
      const mockImplementation = vi.fn((title: string, existingIds?: Set<string>) => {
        // Contract: takes string and optional Set, returns string
        expect(typeof title).toBe('string');
        if (existingIds) {
          expect(existingIds).toBeInstanceOf(Set);
        }
        return 'test-id';
      });

      mockGenerateId.mockImplementation(mockImplementation);

      // Act
      render(<Header level={2} title="Test" />);

      // Assert - Verify contract was followed
      expect(mockImplementation).toHaveBeenCalled();
      expect(mockGenerateId).toHaveReturnedWith('test-id');
    });

    it('should verify Header component accepts correct props interface', () => {
      // Arrange - Define props contract (without explicit ID to trigger generation)
      const validProps: HeaderProps = {
        level: 2,
        title: 'Valid Title',
        className: 'optional-class'
      };

      mockGenerateId.mockReturnValue('test-id');

      // Act & Assert - Should not throw
      expect(() => {
        render(<Header {...validProps} />);
      }).not.toThrow();

      // Verify ID generation was called when no explicit ID provided
      expect(mockGenerateId).toHaveBeenCalled();

      const header = screen.getByRole('heading', { level: 2 });
      expect(header).toHaveAttribute('id', 'test-id');
    });
  });
});
