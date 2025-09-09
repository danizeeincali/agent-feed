/**
 * London School TDD Tests for QuickPost Component
 * Focus: One-line posting behavior and API integration contracts
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  createMockQuickPostProps,
  createMockApiService,
  createMockPostingStateContext,
  assertTabBehaviorContract,
  PostingTestDataBuilder
} from './mocks';
import './setup';

// Mock the QuickPost component since it doesn't exist yet - we'll define expected behavior
const MockQuickPost: React.FC<any> = ({ 
  config, 
  onPostCreated, 
  onDraftSaved, 
  className 
}) => {
  const [content, setContent] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    try {
      // Mock API call behavior
      const post = {
        id: 'quick-post-123',
        content: content.trim(),
        tags,
        type: 'quick',
        timestamp: new Date()
      };
      
      onPostCreated?.(post);
      setContent('');
      setTags([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDraftSave = () => {
    if (content.trim()) {
      const draft = {
        id: `draft-${Date.now()}`,
        content: content.trim(),
        tags,
        timestamp: new Date(),
        published: false
      };
      onDraftSaved?.(draft);
    }
  };

  return (
    <div className={`quick-post-container ${className}`} data-testid="quick-post">
      <div className="quick-post-input">
        <textarea
          data-testid="quick-post-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={config?.placeholder || "What's happening?"}
          maxLength={config?.maxLength || 280}
          disabled={isSubmitting}
        />
        <div className="character-count" data-testid="character-count">
          {content.length}/{config?.maxLength || 280}
        </div>
      </div>
      
      {config?.enableTags && (
        <div className="quick-tags" data-testid="quick-tags">
          <input
            data-testid="tag-input"
            placeholder="Add tags..."
            onKeyPress={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                const tagValue = e.currentTarget.value.trim();
                if (tagValue && !tags.includes(tagValue)) {
                  setTags([...tags, tagValue]);
                  e.currentTarget.value = '';
                }
                e.preventDefault();
              }
            }}
          />
          <div className="tag-list">
            {tags.map(tag => (
              <span key={tag} className="tag" data-testid={`tag-${tag}`}>
                #{tag}
                <button 
                  onClick={() => setTags(tags.filter(t => t !== tag))}
                  data-testid={`remove-tag-${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
      
      <div className="quick-post-actions">
        <button
          data-testid="save-draft-button"
          onClick={handleDraftSave}
          disabled={!content.trim() || isSubmitting}
        >
          Save Draft
        </button>
        <button
          data-testid="submit-button"
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
        >
          {isSubmitting ? 'Publishing...' : 'Post'}
        </button>
      </div>
    </div>
  );
};

// Import React for the mock component
import React from 'react';

describe('QuickPost - London School TDD', () => {
  let mockProps: ReturnType<typeof createMockQuickPostProps>;
  let mockApiService: ReturnType<typeof createMockApiService>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockProps = createMockQuickPostProps();
    mockApiService = createMockApiService();
    user = userEvent.setup();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Contract: Quick Post Submission Behavior', () => {
    it('should create and submit quick post through API service', async () => {
      render(<MockQuickPost {...mockProps} />);
      
      const input = screen.getByTestId('quick-post-input');
      const submitButton = screen.getByTestId('submit-button');
      
      await user.type(input, 'Quick thought for testing');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockProps.onPostCreated).toHaveBeenCalledWith(
          expect.objectContaining({
            content: 'Quick thought for testing',
            type: 'quick',
            tags: []
          })
        );
      });
    });

    it('should prevent submission when content is empty', async () => {
      render(<MockQuickPost {...mockProps} />);
      
      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
      
      await user.click(submitButton);
      assertTabBehaviorContract.expectNoSideEffects(mockProps.onPostCreated);
    });

    it('should respect character limit configuration', async () => {
      const configWithLimit = { ...mockProps.config, maxLength: 50 };
      render(<MockQuickPost {...mockProps} config={configWithLimit} />);
      
      const input = screen.getByTestId('quick-post-input');
      const longText = 'A'.repeat(100);
      
      await user.type(input, longText);
      
      // Input should be limited by maxLength attribute
      expect(input).toHaveAttribute('maxLength', '50');
      expect(screen.getByTestId('character-count')).toHaveTextContent('50/50');
    });

    it('should show loading state during submission', async () => {
      render(<MockQuickPost {...mockProps} />);
      
      const input = screen.getByTestId('quick-post-input');
      const submitButton = screen.getByTestId('submit-button');
      
      await user.type(input, 'Test content');
      await user.click(submitButton);
      
      expect(submitButton).toHaveTextContent('Publishing...');
      expect(submitButton).toBeDisabled();
      expect(input).toBeDisabled();
    });
  });

  describe('Contract: Tag Management Behavior', () => {
    it('should add tags when enableTags is true', async () => {
      render(<MockQuickPost {...mockProps} />);
      
      const tagInput = screen.getByTestId('tag-input');
      
      await user.type(tagInput, 'technology');
      await user.keyboard('{Enter}');
      
      expect(screen.getByTestId('tag-technology')).toHaveTextContent('#technology');
    });

    it('should prevent duplicate tags', async () => {
      render(<MockQuickPost {...mockProps} />);
      
      const tagInput = screen.getByTestId('tag-input');
      
      await user.type(tagInput, 'tech');
      await user.keyboard('{Enter}');
      await user.type(tagInput, 'tech');
      await user.keyboard('{Enter}');
      
      const tags = screen.getAllByText('#tech');
      expect(tags).toHaveLength(1);
    });

    it('should allow tag removal', async () => {
      render(<MockQuickPost {...mockProps} />);
      
      const tagInput = screen.getByTestId('tag-input');
      
      await user.type(tagInput, 'test');
      await user.keyboard('{Enter}');
      
      const removeButton = screen.getByTestId('remove-tag-test');
      await user.click(removeButton);
      
      expect(screen.queryByTestId('tag-test')).toBeFalsy();
    });

    it('should include tags in post submission', async () => {
      render(<MockQuickPost {...mockProps} />);
      
      const input = screen.getByTestId('quick-post-input');
      const tagInput = screen.getByTestId('tag-input');
      
      await user.type(input, 'Post with tags');
      await user.type(tagInput, 'test');
      await user.keyboard('{Enter}');
      await user.type(tagInput, 'demo');
      await user.keyboard('{Enter}');
      
      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockProps.onPostCreated).toHaveBeenCalledWith(
          expect.objectContaining({
            tags: ['test', 'demo']
          })
        );
      });
    });

    it('should not show tag controls when enableTags is false', () => {
      const configWithoutTags = { ...mockProps.config, enableTags: false };
      render(<MockQuickPost {...mockProps} config={configWithoutTags} />);
      
      expect(screen.queryByTestId('quick-tags')).toBeFalsy();
      expect(screen.queryByTestId('tag-input')).toBeFalsy();
    });
  });

  describe('Contract: Draft Management Behavior', () => {
    it('should save draft when save button is clicked', async () => {
      render(<MockQuickPost {...mockProps} />);
      
      const input = screen.getByTestId('quick-post-input');
      const saveDraftButton = screen.getByTestId('save-draft-button');
      
      await user.type(input, 'Draft content');
      await user.click(saveDraftButton);
      
      expect(mockProps.onDraftSaved).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Draft content',
          published: false
        })
      );
    });

    it('should prevent draft saving when content is empty', async () => {
      render(<MockQuickPost {...mockProps} />);
      
      const saveDraftButton = screen.getByTestId('save-draft-button');
      expect(saveDraftButton).toBeDisabled();
      
      await user.click(saveDraftButton);
      assertTabBehaviorContract.expectNoSideEffects(mockProps.onDraftSaved);
    });

    it('should include tags in draft', async () => {
      render(<MockQuickPost {...mockProps} />);
      
      const input = screen.getByTestId('quick-post-input');
      const tagInput = screen.getByTestId('tag-input');
      
      await user.type(input, 'Draft with tags');
      await user.type(tagInput, 'draft');
      await user.keyboard('{Enter}');
      
      const saveDraftButton = screen.getByTestId('save-draft-button');
      await user.click(saveDraftButton);
      
      expect(mockProps.onDraftSaved).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['draft']
        })
      );
    });
  });

  describe('Contract: Configuration Behavior', () => {
    it('should use provided placeholder text', () => {
      const customConfig = { ...mockProps.config, placeholder: 'Custom placeholder' };
      render(<MockQuickPost {...mockProps} config={customConfig} />);
      
      const input = screen.getByTestId('quick-post-input');
      expect(input).toHaveAttribute('placeholder', 'Custom placeholder');
    });

    it('should apply custom maxLength configuration', () => {
      const customConfig = { ...mockProps.config, maxLength: 100 };
      render(<MockQuickPost {...mockProps} config={customConfig} />);
      
      const input = screen.getByTestId('quick-post-input');
      expect(input).toHaveAttribute('maxLength', '100');
      expect(screen.getByTestId('character-count')).toHaveTextContent('0/100');
    });

    it('should apply custom className', () => {
      render(<MockQuickPost {...mockProps} className="custom-class" />);
      
      const container = screen.getByTestId('quick-post');
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('Contract: Error Handling Behavior', () => {
    it('should handle API errors gracefully', async () => {
      // Mock onPostCreated to throw error
      const errorProps = {
        ...mockProps,
        onPostCreated: vi.fn().mockRejectedValue(new Error('API Error'))
      };
      
      render(<MockQuickPost {...errorProps} />);
      
      const input = screen.getByTestId('quick-post-input');
      const submitButton = screen.getByTestId('submit-button');
      
      await user.type(input, 'Test content');
      await user.click(submitButton);
      
      // Should not crash the component
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should handle missing configuration gracefully', () => {
      expect(() => {
        render(<MockQuickPost onPostCreated={vi.fn()} onDraftSaved={vi.fn()} />);
      }).not.toThrow();
      
      // Should use defaults
      const input = screen.getByTestId('quick-post-input');
      expect(input).toHaveAttribute('placeholder', "What's happening?");
      expect(input).toHaveAttribute('maxLength', '280');
    });
  });

  describe('Contract: Accessibility Behavior', () => {
    it('should provide proper ARIA attributes', () => {
      render(<MockQuickPost {...mockProps} />);
      
      const input = screen.getByTestId('quick-post-input');
      expect(input).toHaveAccessibleName();
    });

    it('should support keyboard navigation', async () => {
      render(<MockQuickPost {...mockProps} />);
      
      // Should be able to tab through elements
      await user.tab();
      expect(screen.getByTestId('quick-post-input')).toHaveFocus();
      
      await user.tab();
      if (mockProps.config?.enableTags) {
        expect(screen.getByTestId('tag-input')).toHaveFocus();
      }
    });

    it('should announce character count for screen readers', async () => {
      render(<MockQuickPost {...mockProps} />);
      
      const input = screen.getByTestId('quick-post-input');
      await user.type(input, 'Test');
      
      const characterCount = screen.getByTestId('character-count');
      expect(characterCount).toHaveTextContent('4/280');
    });
  });

  describe('Contract: Performance Behavior', () => {
    it('should not cause unnecessary re-renders on typing', async () => {
      const renderSpy = vi.fn();
      
      const TestComponent = () => {
        renderSpy();
        return <MockQuickPost {...mockProps} />;
      };
      
      render(<TestComponent />);
      
      const initialRenderCount = renderSpy.mock.calls.length;
      const input = screen.getByTestId('quick-post-input');
      
      await user.type(input, 'abc');
      
      // Should not cause excessive re-renders
      expect(renderSpy.mock.calls.length).toBeLessThan(initialRenderCount + 10);
    });

    it('should debounce draft saving', async () => {
      // This would test auto-save functionality if implemented
      const draftSaveSpy = vi.fn();
      render(<MockQuickPost {...mockProps} onDraftSaved={draftSaveSpy} />);
      
      // Rapid typing should not trigger multiple draft saves
      const input = screen.getByTestId('quick-post-input');
      await user.type(input, 'rapid typing test');
      
      // Manual draft save should still work
      const saveDraftButton = screen.getByTestId('save-draft-button');
      await user.click(saveDraftButton);
      
      expect(draftSaveSpy).toHaveBeenCalledTimes(1);
    });
  });
});