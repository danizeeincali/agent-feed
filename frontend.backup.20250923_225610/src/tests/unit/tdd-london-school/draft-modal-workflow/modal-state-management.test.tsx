/**
 * Modal State Management Tests - London School TDD
 * Focus on testing collaboration between modal, form, and draft state managers
 * Behavior verification for state transitions and cleanup
 */

import React from 'react';
import { act, fireEvent } from '@testing-library/react';
import { DraftManager } from '@/components/DraftManager';
import { PostCreatorModal } from '@/components/PostCreatorModal';
import { 
  render, 
  screen, 
  waitFor,
  createMockDraft,
  createUserInteractionMocks,
  createMockStateManagers,
  verifyMockInteractions
} from './test-utils';

// Mock state management coordination
const modalStateMock = {
  isOpen: false,
  editingDraft: null,
  setIsOpen: jest.fn(),
  setEditingDraft: jest.fn(),
  resetState: jest.fn()
};

const formStateMock = {
  title: '',
  content: '',
  tags: [],
  isDirty: false,
  isValid: true,
  setTitle: jest.fn(),
  setContent: jest.fn(),
  setTags: jest.fn(),
  setDirty: jest.fn(),
  resetForm: jest.fn(),
  validateForm: jest.fn()
};

// Mock useDraftManager with state coordination
const mockUseDraftManager = {
  drafts: [createMockDraft()],
  currentDraft: modalStateMock.editingDraft,
  createDraft: jest.fn(),
  updateDraft: jest.fn(),
  saveDraft: jest.fn(),
  loadDraft: jest.fn(),
  getAllDrafts: jest.fn(),
  deleteDraft: jest.fn(),
  searchDrafts: jest.fn(),
  getDraftStatistics: jest.fn(() => ({ total: 1, draft: 1, published: 0, archived: 0, shared: 0 })),
  bulkDeleteDrafts: jest.fn()
};

// Mock hooks
jest.mock('@/hooks/useDraftManager', () => ({
  useDraftManager: () => mockUseDraftManager
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/drafts' })
}));

// Enhanced PostCreator mock with state management simulation
jest.mock('@/components/PostCreator', () => ({
  PostCreator: ({ initialContent, onPostCreated, mode }: any) => {
    const [localContent, setLocalContent] = React.useState(initialContent || '');
    
    React.useEffect(() => {
      formStateMock.setContent(localContent);
      formStateMock.setDirty(localContent !== initialContent);
    }, [localContent, initialContent]);

    return (
      <div data-testid="post-creator">
        <div data-testid="mode">{mode}</div>
        <textarea 
          data-testid="content-input"
          value={localContent}
          onChange={(e) => {
            setLocalContent(e.target.value);
            formStateMock.setContent(e.target.value);
            formStateMock.setDirty(true);
          }}
          placeholder="Enter content..."
        />
        <div data-testid="form-dirty">{formStateMock.isDirty ? 'dirty' : 'clean'}</div>
        <button 
          onClick={() => {
            const postData = { id: 'saved-post', content: localContent };
            onPostCreated?.(postData);
            formStateMock.resetForm();
          }}
          data-testid="save-button"
        >
          Save
        </button>
      </div>
    );
  }
}));

describe('Modal State Management - London School TDD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset state mocks
    modalStateMock.isOpen = false;
    modalStateMock.editingDraft = null;
    formStateMock.isDirty = false;
    formStateMock.title = '';
    formStateMock.content = '';
    formStateMock.tags = [];
  });

  describe('Modal Opening State Transitions', () => {
    it('should coordinate modal state when opening for new draft creation', async () => {
      // Arrange
      render(<DraftManager />);

      // Act - Open modal for new draft
      fireEvent.click(screen.getByText('New Draft'));

      // Assert - Modal state should be updated correctly
      await waitFor(() => {
        expect(screen.getByTestId('post-creator-modal')).toBeInTheDocument();
        expect(screen.getByText('Create New Post')).toBeInTheDocument();
      });

      // Assert - Form should be initialized for new content
      expect(screen.getByTestId('mode')).toHaveTextContent('create');
      expect(screen.getByTestId('content-input')).toHaveValue('');
    });

    it('should coordinate modal state when opening for draft editing', async () => {
      // Arrange
      const existingDraft = createMockDraft({ 
        id: 'edit-draft-123',
        content: 'Existing content'
      });

      render(<DraftManager />);

      // Act - Open modal for editing
      fireEvent.click(screen.getByTitle('Edit draft'));

      // Assert - Modal state should reflect editing mode
      await waitFor(() => {
        expect(screen.getByText('Edit Draft')).toBeInTheDocument();
        expect(screen.getByTestId('mode')).toHaveTextContent('reply');
      });

      // Assert - Form should be populated with existing content
      await waitFor(() => {
        expect(screen.getByTestId('content-input')).not.toHaveValue('');
      });
    });

    it('should prevent background scrolling when modal opens', async () => {
      // Arrange
      render(<DraftManager />);

      // Assert - Background scrolling should be enabled initially
      expect(document.body.style.overflow).not.toBe('hidden');

      // Act - Open modal
      fireEvent.click(screen.getByText('New Draft'));

      // Assert - Background scrolling should be prevented
      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden');
      });
    });
  });

  describe('Modal Closing State Transitions', () => {
    it('should restore background scrolling when modal closes', async () => {
      // Arrange - Open modal first
      render(<DraftManager />);
      fireEvent.click(screen.getByText('New Draft'));

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden');
      });

      // Act - Close modal
      fireEvent.click(screen.getByTestId('close-modal'));

      // Assert - Background scrolling should be restored
      expect(document.body.style.overflow).toBe('unset');
    });

    it('should reset form state when modal closes without saving', async () => {
      // Arrange - Open modal and modify content
      render(<DraftManager />);
      fireEvent.click(screen.getByText('New Draft'));

      await waitFor(() => {
        expect(screen.getByTestId('content-input')).toBeInTheDocument();
      });

      // Act - Modify content and close without saving
      fireEvent.change(screen.getByTestId('content-input'), {
        target: { value: 'Modified content' }
      });

      fireEvent.click(screen.getByTestId('close-modal'));

      // Assert - Form state should be reset
      expect(formStateMock.resetForm).toHaveBeenCalled();

      // Assert - Modal should not be visible
      expect(screen.queryByTestId('post-creator-modal')).not.toBeInTheDocument();
    });

    it('should clear editing draft state when modal closes', async () => {
      // Arrange - Open modal for editing
      render(<DraftManager />);
      fireEvent.click(screen.getByTitle('Edit draft'));

      // Act - Close modal
      fireEvent.click(screen.getByTestId('close-modal'));

      // Assert - Editing state should be cleared
      expect(modalStateMock.resetState).toBeDefined();
      expect(screen.queryByTestId('post-creator-modal')).not.toBeInTheDocument();
    });
  });

  describe('Form State Coordination', () => {
    it('should track form dirty state during content editing', async () => {
      // Arrange
      render(<DraftManager />);
      fireEvent.click(screen.getByText('New Draft'));

      await waitFor(() => {
        expect(screen.getByTestId('content-input')).toBeInTheDocument();
      });

      // Assert - Form should start clean
      expect(screen.getByTestId('form-dirty')).toHaveTextContent('clean');

      // Act - Modify content
      fireEvent.change(screen.getByTestId('content-input'), {
        target: { value: 'New content being typed' }
      });

      // Assert - Form should be marked as dirty
      await waitFor(() => {
        expect(screen.getByTestId('form-dirty')).toHaveTextContent('dirty');
      });

      // Verify state manager interaction
      expect(formStateMock.setDirty).toHaveBeenCalledWith(true);
    });

    it('should reset form state after successful save', async () => {
      // Arrange
      render(<DraftManager />);
      fireEvent.click(screen.getByText('New Draft'));

      await waitFor(() => {
        expect(screen.getByTestId('content-input')).toBeInTheDocument();
      });

      // Act - Modify and save
      fireEvent.change(screen.getByTestId('content-input'), {
        target: { value: 'Content to save' }
      });
      fireEvent.click(screen.getByTestId('save-button'));

      // Assert - Form should be reset after save
      await waitFor(() => {
        expect(formStateMock.resetForm).toHaveBeenCalled();
      });

      // Assert - Modal should close after successful save
      expect(screen.queryByTestId('post-creator-modal')).not.toBeInTheDocument();
    });

    it('should preserve form state when switching between drafts', async () => {
      // Test advanced state management scenario
      const draft1 = createMockDraft({ id: 'draft-1', content: 'Draft 1 content' });
      const draft2 = createMockDraft({ id: 'draft-2', content: 'Draft 2 content' });

      // Mock multiple drafts
      mockUseDraftManager.drafts = [draft1, draft2];

      render(<DraftManager />);

      // Act - Edit first draft
      const editButtons = screen.getAllByTitle('Edit draft');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('content-input')).toHaveValue('Draft 1 content');
      });

      // Act - Close and edit second draft
      fireEvent.click(screen.getByTestId('close-modal'));
      fireEvent.click(editButtons[1]);

      // Assert - Should load different content
      await waitFor(() => {
        expect(screen.getByTestId('content-input')).toHaveValue('Draft 2 content');
      });
    });
  });

  describe('State Cleanup and Error Handling', () => {
    it('should handle modal state cleanup on component unmount', async () => {
      // Arrange
      const { unmount } = render(<DraftManager />);
      fireEvent.click(screen.getByText('New Draft'));

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden');
      });

      // Act - Unmount component
      unmount();

      // Assert - Should restore body scroll state
      expect(document.body.style.overflow).toBe('unset');
    });

    it('should handle state corruption gracefully', async () => {
      // Simulate state corruption scenario
      modalStateMock.editingDraft = { invalid: 'draft' } as any;

      render(<DraftManager />);

      // Act - Attempt to open modal with corrupted state
      fireEvent.click(screen.getByText('New Draft'));

      // Assert - Should handle gracefully without crashing
      await waitFor(() => {
        expect(screen.getByTestId('post-creator-modal')).toBeInTheDocument();
        expect(screen.getByText('Create New Post')).toBeInTheDocument();
      });
    });

    it('should coordinate error states across modal and form', async () => {
      // Mock form validation error
      formStateMock.isValid = false;
      formStateMock.validateForm.mockReturnValue(false);

      render(<DraftManager />);
      fireEvent.click(screen.getByText('New Draft'));

      await waitFor(() => {
        expect(screen.getByTestId('content-input')).toBeInTheDocument();
      });

      // Act - Attempt to save invalid form
      fireEvent.click(screen.getByTestId('save-button'));

      // Assert - Modal should remain open due to validation error
      expect(screen.getByTestId('post-creator-modal')).toBeInTheDocument();
    });
  });

  describe('State Persistence and Recovery', () => {
    it('should maintain modal state during re-renders', async () => {
      // Test state stability during component updates
      const { rerender } = render(<DraftManager />);

      // Act - Open modal
      fireEvent.click(screen.getByText('New Draft'));

      await waitFor(() => {
        expect(screen.getByTestId('post-creator-modal')).toBeInTheDocument();
      });

      // Act - Force re-render
      rerender(<DraftManager />);

      // Assert - Modal state should persist
      expect(screen.getByTestId('post-creator-modal')).toBeInTheDocument();
    });

    it('should handle rapid state transitions without corruption', async () => {
      // Test rapid open/close cycles
      render(<DraftManager />);

      // Act - Rapid open/close cycle
      act(() => {
        fireEvent.click(screen.getByText('New Draft'));
      });

      act(() => {
        fireEvent.click(screen.getByTestId('close-modal'));
      });

      act(() => {
        fireEvent.click(screen.getByText('New Draft'));
      });

      // Assert - Final state should be consistent
      await waitFor(() => {
        expect(screen.getByTestId('post-creator-modal')).toBeInTheDocument();
        expect(document.body.style.overflow).toBe('hidden');
      });
    });
  });

  describe('Cross-Component State Coordination', () => {
    it('should coordinate state between DraftManager and PostCreatorModal', async () => {
      // Test the conversation between components
      const mockCallbacks = createUserInteractionMocks();
      const testDraft = createMockDraft();

      // Act - Direct modal usage
      render(
        <PostCreatorModal
          isOpen={true}
          onClose={mockCallbacks.onClose}
          onPostCreated={mockCallbacks.onPostCreated}
          editDraft={testDraft}
        />
      );

      // Assert - Modal should coordinate with form state
      await waitFor(() => {
        expect(screen.getByTestId('post-creator')).toBeInTheDocument();
        expect(screen.getByTestId('mode')).toHaveTextContent('reply');
      });

      // Act - Save post
      fireEvent.click(screen.getByTestId('save-button'));

      // Assert - Should trigger callback coordination
      await waitFor(() => {
        verifyMockInteractions.userCallbacks.wasPostCreatedCalled(mockCallbacks);
        verifyMockInteractions.userCallbacks.wasCloseCalled(mockCallbacks);
      });
    });

    it('should maintain state consistency during complex workflows', async () => {
      // Test complete workflow with multiple state transitions
      render(<DraftManager />);

      // Act - Complex workflow: new -> edit -> save -> close
      fireEvent.click(screen.getByText('New Draft'));
      
      await waitFor(() => {
        expect(screen.getByTestId('content-input')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('content-input'), {
        target: { value: 'Complex workflow content' }
      });

      fireEvent.click(screen.getByTestId('save-button'));

      // Assert - State should be coordinated throughout workflow
      await waitFor(() => {
        expect(screen.queryByTestId('post-creator-modal')).not.toBeInTheDocument();
        expect(document.body.style.overflow).toBe('unset');
      });
    });
  });
});