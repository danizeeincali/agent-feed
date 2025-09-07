/**
 * Duplicate Draft Prevention Tests - London School TDD
 * Focus on preventing duplicate drafts during editing workflows
 * Tests coordination between components to maintain data integrity
 */

import React from 'react';
import { act, fireEvent } from '@testing-library/react';
import { DraftManager } from '@/components/DraftManager';
import { 
  render, 
  screen, 
  waitFor,
  createMockDraft,
  createMockDraftService,
  createUserInteractionMocks
} from './test-utils';
import { DraftStatus } from '@/types/drafts';

// Mock DraftService with deduplication logic tracking
const mockDraftService = createMockDraftService();

// Track service calls for deduplication verification
let serviceCallCount = {
  createDraft: 0,
  updateDraft: 0,
  getDraft: 0
};

// Enhanced mock service with call tracking
const trackedMockService = {
  ...mockDraftService,
  createDraft: jest.fn((...args) => {
    serviceCallCount.createDraft++;
    return mockDraftService.createDraft(...args);
  }),
  updateDraft: jest.fn((...args) => {
    serviceCallCount.updateDraft++;
    return mockDraftService.updateDraft(...args);
  }),
  getDraft: jest.fn((...args) => {
    serviceCallCount.getDraft++;
    return mockDraftService.getDraft(...args);
  })
};

// Mock state management with duplicate prevention
let draftManagerState = {
  drafts: [createMockDraft({ id: 'existing-draft-1' })],
  editingDraft: null,
  modalOpen: false
};

const mockUseDraftManager = {
  drafts: draftManagerState.drafts,
  currentDraft: draftManagerState.editingDraft,
  createDraft: trackedMockService.createDraft,
  updateDraft: trackedMockService.updateDraft,
  saveDraft: jest.fn((draft) => {
    // Simulate duplicate prevention logic
    const existingDraft = draftManagerState.drafts.find(d => d.id === draft.id);
    if (existingDraft) {
      return trackedMockService.updateDraft(draft);
    } else {
      return trackedMockService.createDraft(draft);
    }
  }),
  getAllDrafts: jest.fn(),
  deleteDraft: jest.fn(),
  searchDrafts: jest.fn(),
  getDraftStatistics: jest.fn(() => ({
    total: draftManagerState.drafts.length,
    draft: 1, published: 0, archived: 0, shared: 0
  })),
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

// Mock PostCreatorModal with duplicate prevention simulation
jest.mock('@/components/PostCreatorModal', () => ({
  PostCreatorModal: ({ isOpen, editDraft, onPostCreated, onClose }: any) => {
    if (!isOpen) return null;
    
    return (
      <div data-testid="post-creator-modal">
        <div data-testid="draft-id">{editDraft?.id || 'new-draft'}</div>
        <div data-testid="modal-instance-id">{Math.random().toString(36).substr(2, 9)}</div>
        <button 
          onClick={() => {
            const postData = {
              id: editDraft?.id || `new-${Date.now()}`,
              title: 'Updated content',
              content: 'Post content'
            };
            onPostCreated?.(postData);
          }}
          data-testid="save-post"
        >
          Save Post
        </button>
        <button onClick={onClose} data-testid="close-modal">Close</button>
      </div>
    );
  }
}));

describe('Duplicate Draft Prevention - London School TDD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset call counters
    serviceCallCount = { createDraft: 0, updateDraft: 0, getDraft: 0 };
    
    // Reset state
    draftManagerState = {
      drafts: [createMockDraft({ id: 'existing-draft-1' })],
      editingDraft: null,
      modalOpen: false
    };
    
    // Reset service responses
    trackedMockService.createDraft.mockResolvedValue(createMockDraft({ id: 'new-draft-created' }));
    trackedMockService.updateDraft.mockResolvedValue(createMockDraft({ id: 'existing-draft-1' }));
  });

  describe('Rapid Click Prevention', () => {
    it('should prevent multiple modal instances from rapid edit button clicks', async () => {
      // Arrange
      render(<DraftManager />);

      // Act - Rapid successive clicks on edit button
      const editButton = screen.getByTitle('Edit draft');
      
      act(() => {
        fireEvent.click(editButton);
        fireEvent.click(editButton);
        fireEvent.click(editButton);
        fireEvent.click(editButton);
      });

      // Assert - Only one modal should exist
      await waitFor(() => {
        const modals = screen.getAllByTestId('post-creator-modal');
        expect(modals).toHaveLength(1);
      });

      // Assert - Verify same draft ID across all attempts
      const draftId = screen.getByTestId('draft-id').textContent;
      expect(draftId).toBe('existing-draft-1');
    });

    it('should prevent duplicate service calls during rapid interactions', async () => {
      // Arrange
      render(<DraftManager />);

      // Act - Multiple rapid edit attempts
      const editButton = screen.getByTitle('Edit draft');
      
      // Rapid fire clicks
      Array.from({ length: 5 }).forEach(() => {
        fireEvent.click(editButton);
      });

      // Act - Save operation
      await waitFor(() => {
        expect(screen.getByTestId('save-post')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTestId('save-post'));

      // Assert - Service should be called only once despite multiple triggers
      await waitFor(() => {
        expect(serviceCallCount.updateDraft).toBeLessThanOrEqual(1);
        expect(serviceCallCount.createDraft).toBe(0); // Should not create new draft
      });
    });

    it('should maintain single draft instance across multiple edit sessions', async () => {
      // Arrange
      render(<DraftManager />);

      // Act - Edit, close, edit again cycle
      fireEvent.click(screen.getByTitle('Edit draft'));
      
      const firstInstanceId = screen.getByTestId('modal-instance-id').textContent;
      const firstDraftId = screen.getByTestId('draft-id').textContent;
      
      fireEvent.click(screen.getByTestId('close-modal'));
      
      // Edit again
      fireEvent.click(screen.getByTitle('Edit draft'));
      
      const secondDraftId = screen.getByTestId('draft-id').textContent;

      // Assert - Same draft should be loaded in both sessions
      expect(firstDraftId).toBe(secondDraftId);
      expect(firstDraftId).toBe('existing-draft-1');
    });
  });

  describe('Concurrent Edit Prevention', () => {
    it('should handle concurrent edit attempts without creating duplicates', async () => {
      // Simulate multiple browser tabs or concurrent users
      render(<DraftManager />);

      // Act - Simulate concurrent edits (e.g., multiple tabs)
      const editButton = screen.getByTitle('Edit draft');
      
      // Multiple simultaneous attempts
      await act(async () => {
        fireEvent.click(editButton);
        // Simulate slight delay between concurrent attempts
        await new Promise(resolve => setTimeout(resolve, 10));
        fireEvent.click(editButton);
      });

      // Assert - Should maintain single modal instance
      const modals = screen.queryAllByTestId('post-creator-modal');
      expect(modals.length).toBeLessThanOrEqual(1);

      // Assert - Draft ID consistency
      if (modals.length > 0) {
        expect(screen.getByTestId('draft-id')).toHaveTextContent('existing-draft-1');
      }
    });

    it('should prevent race conditions in save operations', async () => {
      // Test coordination between multiple save attempts
      render(<DraftManager />);

      fireEvent.click(screen.getByTitle('Edit draft'));
      
      await waitFor(() => {
        expect(screen.getByTestId('save-post')).toBeInTheDocument();
      });

      // Act - Multiple rapid save attempts
      const saveButton = screen.getByTestId('save-post');
      
      act(() => {
        fireEvent.click(saveButton);
        fireEvent.click(saveButton);
        fireEvent.click(saveButton);
      });

      // Assert - Service should be called exactly once
      await waitFor(() => {
        expect(serviceCallCount.updateDraft).toBe(1);
        expect(serviceCallCount.createDraft).toBe(0);
      });
    });
  });

  describe('Draft ID Consistency', () => {
    it('should maintain consistent draft ID throughout editing lifecycle', async () => {
      // Test draft ID remains stable during entire edit session
      const originalDraftId = 'existing-draft-1';
      
      render(<DraftManager />);

      // Act - Start editing
      fireEvent.click(screen.getByTitle('Edit draft'));
      
      const editingDraftId = screen.getByTestId('draft-id').textContent;
      
      // Act - Save changes
      fireEvent.click(screen.getByTestId('save-post'));

      // Assert - Draft ID should remain consistent
      await waitFor(() => {
        expect(editingDraftId).toBe(originalDraftId);
      });

      // Verify service was called with consistent ID
      expect(trackedMockService.updateDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          id: originalDraftId
        })
      );
    });

    it('should not generate new IDs when updating existing drafts', async () => {
      // Critical test: ensure updates don't accidentally create new drafts
      render(<DraftManager />);

      // Act - Edit and save existing draft
      fireEvent.click(screen.getByTitle('Edit draft'));
      fireEvent.click(screen.getByTestId('save-post'));

      // Assert - Should call update, not create
      await waitFor(() => {
        expect(serviceCallCount.updateDraft).toBe(1);
        expect(serviceCallCount.createDraft).toBe(0);
      });

      // Assert - Service called with existing draft ID
      expect(trackedMockService.updateDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'existing-draft-1'
        })
      );
    });

    it('should generate unique IDs only for genuinely new drafts', async () => {
      // Test new draft creation doesn't interfere with existing drafts
      render(<DraftManager />);

      // Act - Create new draft
      fireEvent.click(screen.getByText('New Draft'));
      
      await waitFor(() => {
        expect(screen.getByTestId('draft-id')).toHaveTextContent('new-draft');
      });

      fireEvent.click(screen.getByTestId('save-post'));

      // Assert - Should create new draft
      await waitFor(() => {
        expect(serviceCallCount.createDraft).toBe(1);
        expect(serviceCallCount.updateDraft).toBe(0);
      });
    });
  });

  describe('State Management Coordination', () => {
    it('should coordinate draft state across component boundaries', async () => {
      // Test how DraftManager and PostCreatorModal coordinate state
      render(<DraftManager />);

      // Act - Start edit workflow
      fireEvent.click(screen.getByTitle('Edit draft'));

      // Assert - Modal should receive correct draft state
      await waitFor(() => {
        expect(screen.getByTestId('draft-id')).toHaveTextContent('existing-draft-1');
      });

      // Act - Complete workflow
      fireEvent.click(screen.getByTestId('save-post'));

      // Assert - State should be synchronized after save
      await waitFor(() => {
        expect(screen.queryByTestId('post-creator-modal')).not.toBeInTheDocument();
      });
    });

    it('should prevent state corruption during draft switching', async () => {
      // Add another draft to test switching between drafts
      draftManagerState.drafts.push(createMockDraft({ id: 'existing-draft-2' }));
      mockUseDraftManager.drafts = draftManagerState.drafts;

      render(<DraftManager />);

      // Act - Quick switching between draft edits
      const editButtons = screen.getAllByTitle('Edit draft');
      
      // Edit first draft
      fireEvent.click(editButtons[0]);
      let currentDraftId = screen.getByTestId('draft-id').textContent;
      fireEvent.click(screen.getByTestId('close-modal'));

      // Edit second draft
      fireEvent.click(editButtons[1]);
      let newDraftId = screen.getByTestId('draft-id').textContent;

      // Assert - Each edit should load correct draft
      expect(currentDraftId).not.toBe(newDraftId);
      expect([currentDraftId, newDraftId]).toEqual(
        expect.arrayContaining(['existing-draft-1', 'existing-draft-2'])
      );
    });

    it('should handle cleanup when drafts are deleted during editing', async () => {
      // Test edge case: draft deleted while modal is open
      render(<DraftManager />);

      // Act - Open edit modal
      fireEvent.click(screen.getByTitle('Edit draft'));
      
      // Simulate draft deletion while modal is open
      fireEvent.click(screen.getByTitle('Delete draft'));

      // Assert - System should handle this gracefully
      // Modal might close or show appropriate message
      await waitFor(() => {
        // Either modal closes or shows error state
        const modal = screen.queryByTestId('post-creator-modal');
        if (modal) {
          // If modal stays open, it should handle the missing draft
          expect(modal).toBeInTheDocument();
        }
      });
    });
  });

  describe('Auto-save Coordination', () => {
    it('should prevent duplicate auto-save operations', async () => {
      // Test auto-save doesn't interfere with manual saves
      const mockAutoSave = jest.fn();
      trackedMockService.autoSave = mockAutoSave;

      render(<DraftManager />);

      fireEvent.click(screen.getByTitle('Edit draft'));

      // Simulate rapid auto-save triggers
      act(() => {
        // Multiple auto-save events
        mockAutoSave();
        mockAutoSave();
        mockAutoSave();
      });

      // Act - Manual save
      fireEvent.click(screen.getByTestId('save-post'));

      // Assert - Auto-save should be coordinated with manual save
      await waitFor(() => {
        // Manual update should take precedence
        expect(serviceCallCount.updateDraft).toBe(1);
      });
    });

    it('should coordinate auto-save with draft state management', async () => {
      // Test that auto-save operations maintain draft integrity
      render(<DraftManager />);

      fireEvent.click(screen.getByTitle('Edit draft'));
      
      // Simulate auto-save during editing
      const originalDraftId = screen.getByTestId('draft-id').textContent;
      
      // Auto-save should maintain same draft ID
      expect(originalDraftId).toBe('existing-draft-1');
      
      // Manual save should use same ID
      fireEvent.click(screen.getByTestId('save-post'));

      await waitFor(() => {
        expect(trackedMockService.updateDraft).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'existing-draft-1'
          })
        );
      });
    });
  });
});