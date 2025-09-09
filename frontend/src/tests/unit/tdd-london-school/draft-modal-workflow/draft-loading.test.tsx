/**
 * Draft Loading Tests - London School TDD
 * Tests draft loading into PostCreator modal with mock-driven behavior verification
 */

import React from 'react';
import { act } from '@testing-library/react';
import { PostCreatorModal } from '@/components/PostCreatorModal';
import { 
  render, 
  screen, 
  waitFor,
  createMockDraft,
  createUserInteractionMocks,
  verifyMockInteractions,
  createTestScenarios
} from './test-utils-simple';

// Mock external dependencies using London School approach
const mockUseDraftManager = {
  createDraft: jest.fn(),
  updateDraft: jest.fn(),
  getDraft: jest.fn(),
  saveDraft: jest.fn(),
  loadDraft: jest.fn()
};

const mockUseNavigate = jest.fn();

// Mock the hooks
jest.mock('@/hooks/useDraftManager', () => ({
  useDraftManager: () => mockUseDraftManager
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockUseNavigate,
  useLocation: () => ({ pathname: '/drafts' })
}));

// Mock PostCreator component to focus on modal behavior
jest.mock('@/components/PostCreator', () => ({
  PostCreator: ({ initialContent, onPostCreated, mode }: any) => (
    <div data-testid="post-creator">
      <div data-testid="post-creator-mode">{mode}</div>
      <div data-testid="post-creator-content">{initialContent}</div>
      <button 
        onClick={() => onPostCreated?.({ id: 'new-post', content: initialContent })}
        data-testid="create-post-button"
      >
        Create Post
      </button>
    </div>
  )
}));

describe('Draft Loading into PostCreator Modal - London School TDD', () => {
  let mockCallbacks: ReturnType<typeof createUserInteractionMocks>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockCallbacks = createUserInteractionMocks();
  });

  describe('Opening modal with existing draft', () => {
    it('should populate form with draft data when modal opens with existing draft', async () => {
      // Arrange - Create mock draft with specific content structure
      const mockDraft = createMockDraft({
        id: 'draft-123',
        title: 'Existing Draft Title',
        content: 'Line 1\n\nLine 2\n\nLine 3 content here',
        tags: ['existing', 'draft']
      });
      
      const scenario = createTestScenarios.existingDraft(mockDraft);

      // Act - Render modal with existing draft
      render(
        <PostCreatorModal
          isOpen={true}
          onClose={mockCallbacks.onClose}
          onPostCreated={mockCallbacks.onPostCreated}
          editDraft={scenario.editDraft}
        />
      );

      // Assert - Verify modal header shows edit mode
      await waitFor(() => {
        expect(screen.getByText('Edit Draft')).toBeInTheDocument();
        expect(screen.getByText('Editing: Existing Draft Title')).toBeInTheDocument();
      });

      // Assert - Verify PostCreator receives draft content
      await waitFor(() => {
        expect(screen.getByTestId('post-creator-content')).toHaveTextContent('Line 3 content here');
        expect(screen.getByTestId('post-creator-mode')).toHaveTextContent('reply');
      });
    });

    it('should initialize PostCreator with combined draft content', async () => {
      // Arrange - Draft with complex content structure
      const mockDraft = createMockDraft({
        content: 'Title content\n\nHook content\n\nMain body content with multiple paragraphs'
      });

      // Act
      render(
        <PostCreatorModal
          isOpen={true}
          onClose={mockCallbacks.onClose}
          editDraft={mockDraft}
        />
      );

      // Assert - Verify content parsing and initialization
      await waitFor(() => {
        const postCreatorContent = screen.getByTestId('post-creator-content');
        expect(postCreatorContent).toHaveTextContent('Main body content with multiple paragraphs');
      });
    });

    it('should force re-render of PostCreator when draft changes', async () => {
      // Arrange - Initial draft
      const initialDraft = createMockDraft({ id: 'draft-1', title: 'Draft 1' });
      const { rerender } = render(
        <PostCreatorModal
          isOpen={true}
          onClose={mockCallbacks.onClose}
          editDraft={initialDraft}
        />
      );

      // Act - Change draft
      const newDraft = createMockDraft({ id: 'draft-2', title: 'Draft 2' });
      rerender(
        <PostCreatorModal
          isOpen={true}
          onClose={mockCallbacks.onClose}
          editDraft={newDraft}
        />
      );

      // Assert - Verify modal title updates
      await waitFor(() => {
        expect(screen.getByText('Editing: Draft 2')).toBeInTheDocument();
      });
    });
  });

  describe('Opening modal without draft (new post)', () => {
    it('should show create mode when no draft is provided', async () => {
      // Arrange
      const scenario = createTestScenarios.newDraft();

      // Act
      render(
        <PostCreatorModal
          isOpen={true}
          onClose={mockCallbacks.onClose}
          editDraft={scenario.editDraft}
        />
      );

      // Assert - Verify create mode UI
      await waitFor(() => {
        expect(screen.getByText('Create New Post')).toBeInTheDocument();
        expect(screen.queryByText('Editing:')).not.toBeInTheDocument();
      });

      // Assert - Verify PostCreator is in create mode
      await waitFor(() => {
        expect(screen.getByTestId('post-creator-mode')).toHaveTextContent('create');
      });
    });

    it('should initialize PostCreator with empty content for new posts', async () => {
      // Act
      render(
        <PostCreatorModal
          isOpen={true}
          onClose={mockCallbacks.onClose}
          editDraft={null}
        />
      );

      // Assert
      await waitFor(() => {
        const postCreatorContent = screen.getByTestId('post-creator-content');
        expect(postCreatorContent).toBeEmptyDOMElement();
      });
    });
  });

  describe('Modal lifecycle behavior', () => {
    it('should prevent background scrolling when modal opens', async () => {
      // Act
      render(
        <PostCreatorModal
          isOpen={true}
          onClose={mockCallbacks.onClose}
        />
      );

      // Assert - Check document body overflow style
      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden');
      });
    });

    it('should restore background scrolling when modal closes', async () => {
      // Arrange - Open modal first
      const { rerender } = render(
        <PostCreatorModal
          isOpen={true}
          onClose={mockCallbacks.onClose}
        />
      );

      // Act - Close modal
      rerender(
        <PostCreatorModal
          isOpen={false}
          onClose={mockCallbacks.onClose}
        />
      );

      // Assert - Check document body overflow is restored
      expect(document.body.style.overflow).toBe('unset');
    });

    it('should handle escape key to close modal', async () => {
      // Arrange
      render(
        <PostCreatorModal
          isOpen={true}
          onClose={mockCallbacks.onClose}
        />
      );

      // Act - Simulate escape key press
      act(() => {
        const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(escapeEvent);
      });

      // Assert - Verify close callback was called
      await waitFor(() => {
        verifyMockInteractions.userCallbacks.wasCloseCalled(mockCallbacks);
      });
    });
  });

  describe('Error handling and loading states', () => {
    it('should show loading state during draft initialization', async () => {
      // Arrange - Draft that takes time to initialize
      const mockDraft = createMockDraft();

      // Act
      render(
        <PostCreatorModal
          isOpen={true}
          onClose={mockCallbacks.onClose}
          editDraft={mockDraft}
        />
      );

      // Assert - Verify loading indicator appears initially
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });

    it('should handle draft with missing title gracefully', async () => {
      // Arrange - Draft without title
      const mockDraft = createMockDraft({
        title: '',
        content: 'Draft content without title'
      });

      // Act
      render(
        <PostCreatorModal
          isOpen={true}
          onClose={mockCallbacks.onClose}
          editDraft={mockDraft}
        />
      );

      // Assert - Should show default text for missing title
      await waitFor(() => {
        expect(screen.getByText('Editing: Untitled Draft')).toBeInTheDocument();
      });
    });

    it('should handle draft with malformed content structure', async () => {
      // Arrange - Draft with single line content
      const mockDraft = createMockDraft({
        content: 'Single line content'
      });

      // Act
      render(
        <PostCreatorModal
          isOpen={true}
          onClose={mockCallbacks.onClose}
          editDraft={mockDraft}
        />
      );

      // Assert - Should handle content gracefully
      await waitFor(() => {
        expect(screen.getByTestId('post-creator-content')).toHaveTextContent('Single line content');
      });
    });
  });
});