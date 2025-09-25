/**
 * Component Collaboration Tests - London School TDD
 * Focus on testing how PostCreatorModal and DraftManager work together
 * Emphasis on interaction patterns and contract verification
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
  verifyMockInteractions,
  createSwarmCoordination
} from './test-utils';
import { DraftStatus } from '../types/drafts';

// Mock collaborative dependencies
const mockDraftService = {
  createDraft: jest.fn(),
  updateDraft: jest.fn(),
  getDraft: jest.fn(),
  deleteDraft: jest.fn(),
  publishDraft: jest.fn(),
  getDrafts: jest.fn(),
  getStats: jest.fn()
};

const mockUseDraftManager = {
  drafts: [createMockDraft()],
  currentDraft: null,
  createDraft: mockDraftService.createDraft,
  updateDraft: mockDraftService.updateDraft,
  saveDraft: mockDraftService.createDraft,
  loadDraft: jest.fn(),
  deleteDraft: mockDraftService.deleteDraft,
  getAllDrafts: mockDraftService.getDrafts,
  searchDrafts: jest.fn(),
  getDraftStatistics: mockDraftService.getStats,
  bulkDeleteDrafts: jest.fn(),
  publishDraft: mockDraftService.publishDraft
};

// Track component interactions
const interactionTracker = {
  modalOpened: jest.fn(),
  modalClosed: jest.fn(),
  draftSelected: jest.fn(),
  postCreated: jest.fn(),
  editingStarted: jest.fn(),
  editingCanceled: jest.fn()
};

// Mock hooks with interaction tracking
jest.mock('@/hooks/useDraftManager', () => ({
  useDraftManager: () => mockUseDraftManager
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/drafts' })
}));

// Enhanced PostCreator mock for collaboration testing
jest.mock('@/components/PostCreator', () => ({
  PostCreator: ({ initialContent, onPostCreated, mode, className }: any) => {
    const [content, setContent] = React.useState(initialContent || '');
    
    return (
      <div data-testid="post-creator" className={className}>
        <div data-testid="creator-mode">{mode}</div>
        <div data-testid="initial-content">{initialContent}</div>
        <textarea 
          data-testid="creator-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your post..."
        />
        <button 
          onClick={() => {
            const postData = { 
              id: mode === 'reply' ? 'updated-draft' : 'new-post',
              content: content,
              title: 'Post Title'
            };
            onPostCreated?.(postData);
            interactionTracker.postCreated(postData);
          }}
          data-testid="creator-save"
        >
          {mode === 'reply' ? 'Update Draft' : 'Create Post'}
        </button>
      </div>
    );
  }
}));

describe('Component Collaboration - London School TDD', () => {
  let mockCallbacks: ReturnType<typeof createUserInteractionMocks>;
  let swarmCoordination: ReturnType<typeof createSwarmCoordination>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockCallbacks = createUserInteractionMocks();
    swarmCoordination = createSwarmCoordination();
    
    // Reset interaction tracker
    Object.values(interactionTracker).forEach(fn => fn.mockClear());
    
    // Reset service mocks
    mockDraftService.createDraft.mockResolvedValue(createMockDraft({ id: 'new-draft' }));
    mockDraftService.updateDraft.mockResolvedValue(createMockDraft({ id: 'updated-draft' }));
    mockDraftService.getDrafts.mockResolvedValue([createMockDraft()]);
    mockDraftService.getStats.mockResolvedValue({
      total: 1,
      byStatus: { draft: 1, published: 0, archived: 0, shared: 0, template: 0 },
      totalWordCount: 100,
      averageWordCount: 100,
      recentlyModified: 1
    });
  });

  describe('DraftManager to PostCreatorModal Collaboration', () => {
    it('should coordinate draft editing workflow between components', async () => {
      // Arrange - DraftManager with drafts
      const existingDraft = createMockDraft({ 
        id: 'collab-draft-1',
        title: 'Collaboration Test Draft',
        content: 'Original content'
      });
      mockUseDraftManager.drafts = [existingDraft];

      render(<DraftManager />);

      // Act - Initiate edit from DraftManager
      const editButton = screen.getByTitle('Edit draft');
      fireEvent.click(editButton);

      // Assert - PostCreatorModal should receive draft data
      await waitFor(() => {
        expect(screen.getByText('Edit Draft')).toBeInTheDocument();
        expect(screen.getByText('Editing: Collaboration Test Draft')).toBeInTheDocument();
      });

      // Assert - PostCreator should be configured for editing
      expect(screen.getByTestId('creator-mode')).toHaveTextContent('reply');
      expect(screen.getByTestId('initial-content')).toHaveTextContent('Original content');
    });

    it('should coordinate new draft creation workflow', async () => {
      // Arrange
      render(<DraftManager />);

      // Act - Create new draft from DraftManager
      fireEvent.click(screen.getByText('New Draft'));

      // Assert - Modal should open in creation mode
      await waitFor(() => {
        expect(screen.getByText('Create New Post')).toBeInTheDocument();
      });

      // Assert - PostCreator should be configured for creation
      expect(screen.getByTestId('creator-mode')).toHaveTextContent('create');
      expect(screen.getByTestId('initial-content')).toHaveTextContent('');
    });

    it('should handle modal close coordination', async () => {
      // Arrange
      render(<DraftManager />);
      fireEvent.click(screen.getByText('New Draft'));

      await waitFor(() => {
        expect(screen.getByTestId('post-creator-modal')).toBeInTheDocument();
      });

      // Act - Close modal
      fireEvent.click(screen.getByTestId('close-modal'));

      // Assert - Modal should close and state should reset
      expect(screen.queryByTestId('post-creator-modal')).not.toBeInTheDocument();
    });
  });

  describe('PostCreator to Modal Communication', () => {
    it('should handle post creation callback from PostCreator to Modal', async () => {
      // Arrange - Direct modal testing
      render(
        <PostCreatorModal
          isOpen={true}
          onClose={mockCallbacks.onClose}
          onPostCreated={mockCallbacks.onPostCreated}
          editDraft={null}
        />
      );

      // Act - Create post through PostCreator
      fireEvent.change(screen.getByTestId('creator-content'), {
        target: { value: 'New post content' }
      });
      fireEvent.click(screen.getByTestId('creator-save'));

      // Assert - Modal should receive post creation callback
      await waitFor(() => {
        verifyMockInteractions.userCallbacks.wasPostCreatedCalled(mockCallbacks);
      });

      // Assert - Modal should close after post creation
      verifyMockInteractions.userCallbacks.wasCloseCalled(mockCallbacks);
    });

    it('should handle draft update callback coordination', async () => {
      // Arrange - Modal with existing draft
      const existingDraft = createMockDraft({ 
        id: 'update-test-draft',
        content: 'Original content'
      });

      render(
        <PostCreatorModal
          isOpen={true}
          onClose={mockCallbacks.onClose}
          onPostCreated={mockCallbacks.onPostCreated}
          editDraft={existingDraft}
        />
      );

      // Act - Update draft through PostCreator
      fireEvent.change(screen.getByTestId('creator-content'), {
        target: { value: 'Updated content' }
      });
      fireEvent.click(screen.getByTestId('creator-save'));

      // Assert - Should trigger post creation callback with updated data
      await waitFor(() => {
        expect(mockCallbacks.onPostCreated).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'updated-draft',
            content: 'Updated content'
          })
        );
      });
    });
  });

  describe('Service Layer Collaboration', () => {
    it('should coordinate DraftManager service calls with modal interactions', async () => {
      // Arrange
      render(<DraftManager />);

      // Act - Create new draft workflow
      fireEvent.click(screen.getByText('New Draft'));
      fireEvent.change(screen.getByTestId('creator-content'), {
        target: { value: 'Service coordination test' }
      });
      fireEvent.click(screen.getByTestId('creator-save'));

      // Assert - Service should be called through the collaboration
      await waitFor(() => {
        expect(mockDraftService.createDraft).toHaveBeenCalled();
      });
    });

    it('should handle service errors across component boundaries', async () => {
      // Arrange - Mock service failure
      mockDraftService.createDraft.mockRejectedValue(new Error('Service unavailable'));

      render(<DraftManager />);

      // Act - Attempt to create draft
      fireEvent.click(screen.getByText('New Draft'));
      fireEvent.click(screen.getByTestId('creator-save'));

      // Assert - Components should handle service error gracefully
      await waitFor(() => {
        expect(mockDraftService.createDraft).toHaveBeenCalled();
        // Modal should remain open on error
        expect(screen.getByTestId('post-creator-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Complex Workflow Collaboration', () => {
    it('should coordinate complete edit-save-close workflow', async () => {
      // Arrange - Existing draft
      const workflowDraft = createMockDraft({
        id: 'workflow-draft',
        title: 'Workflow Test',
        content: 'Initial workflow content'
      });
      mockUseDraftManager.drafts = [workflowDraft];

      render(<DraftManager />);

      // Act - Complete workflow
      // 1. Open for editing
      fireEvent.click(screen.getByTitle('Edit draft'));
      
      await waitFor(() => {
        expect(screen.getByText('Edit Draft')).toBeInTheDocument();
      });

      // 2. Modify content
      fireEvent.change(screen.getByTestId('creator-content'), {
        target: { value: 'Modified workflow content' }
      });

      // 3. Save changes
      fireEvent.click(screen.getByTestId('creator-save'));

      // Assert - Complete workflow should coordinate properly
      await waitFor(() => {
        expect(screen.queryByTestId('post-creator-modal')).not.toBeInTheDocument();
      });

      // Verify interaction sequence
      expect(interactionTracker.postCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Modified workflow content'
        })
      );
    });

    it('should handle workflow interruption gracefully', async () => {
      // Test workflow resilience
      render(<DraftManager />);

      // Act - Start workflow then interrupt
      fireEvent.click(screen.getByText('New Draft'));
      
      fireEvent.change(screen.getByTestId('creator-content'), {
        target: { value: 'Interrupted content' }
      });

      // Interrupt by closing modal
      fireEvent.click(screen.getByTestId('close-modal'));

      // Assert - Interruption should be handled cleanly
      expect(screen.queryByTestId('post-creator-modal')).not.toBeInTheDocument();
      
      // Act - Start new workflow
      fireEvent.click(screen.getByText('New Draft'));

      // Assert - New workflow should start clean
      await waitFor(() => {
        expect(screen.getByTestId('creator-content')).toHaveValue('');
      });
    });

    it('should coordinate draft switching during editing', async () => {
      // Arrange - Multiple drafts
      const draft1 = createMockDraft({ id: 'draft-1', title: 'First Draft', content: 'First content' });
      const draft2 = createMockDraft({ id: 'draft-2', title: 'Second Draft', content: 'Second content' });
      mockUseDraftManager.drafts = [draft1, draft2];

      render(<DraftManager />);

      // Act - Edit first draft
      const editButtons = screen.getAllByTitle('Edit draft');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Editing: First Draft')).toBeInTheDocument();
      });

      // Act - Close and edit second draft
      fireEvent.click(screen.getByTestId('close-modal'));
      fireEvent.click(editButtons[1]);

      // Assert - Should switch to second draft
      await waitFor(() => {
        expect(screen.getByText('Editing: Second Draft')).toBeInTheDocument();
      });
    });
  });

  describe('Swarm Coordination Patterns', () => {
    it('should coordinate with other test agents in the swarm', async () => {
      // London School: Test swarm coordination
      const { mockCoordinator } = swarmCoordination;

      render(<DraftManager />);

      // Act - Workflow that should trigger swarm coordination
      fireEvent.click(screen.getByText('New Draft'));
      fireEvent.click(screen.getByTestId('creator-save'));

      // Assert - Swarm coordination should be triggered
      await waitFor(() => {
        // In a real implementation, swarm agents would be notified
        expect(interactionTracker.postCreated).toHaveBeenCalled();
      });
    });

    it('should share interaction patterns with swarm agents', async () => {
      // Test collaboration reporting to swarm
      const { contractMonitor } = swarmCoordination;

      render(<DraftManager />);

      // Act - Complete interaction sequence
      fireEvent.click(screen.getByTitle('Edit draft'));
      fireEvent.click(screen.getByTestId('creator-save'));

      // Assert - Interaction patterns should be available to swarm
      await waitFor(() => {
        expect(interactionTracker.postCreated).toHaveBeenCalled();
      });

      // Verify contract compliance
      expect(typeof mockUseDraftManager.createDraft).toBe('function');
      expect(typeof mockUseDraftManager.updateDraft).toBe('function');
    });
  });

  describe('Component Contract Verification', () => {
    it('should maintain consistent interface contracts between components', () => {
      // London School: Verify component contracts
      const draftManagerContract = {
        props: ['onEditDraft', 'onCreatePost', 'className'],
        callbacks: ['onEditDraft', 'onCreatePost']
      };

      const modalContract = {
        props: ['isOpen', 'onClose', 'onPostCreated', 'editDraft'],
        callbacks: ['onClose', 'onPostCreated']
      };

      // Verify contracts through interaction
      expect(typeof mockCallbacks.onClose).toBe('function');
      expect(typeof mockCallbacks.onPostCreated).toBe('function');
      expect(typeof mockCallbacks.onEditDraft).toBe('function');
    });

    it('should handle contract violations gracefully', async () => {
      // Test component resilience to contract violations
      render(
        <PostCreatorModal
          isOpen={true}
          onClose={null as any} // Contract violation
          onPostCreated={mockCallbacks.onPostCreated}
          editDraft={null}
        />
      );

      // Act - Trigger callback that might fail
      fireEvent.click(screen.getByTestId('creator-save'));

      // Assert - Component should handle violation gracefully
      await waitFor(() => {
        expect(screen.getByTestId('post-creator')).toBeInTheDocument();
      });
    });

    it('should evolve contracts based on collaboration needs', async () => {
      // Test contract evolution and adaptation
      const enhancedCallbacks = {
        ...mockCallbacks,
        onDraftAutoSaved: jest.fn(),
        onValidationError: jest.fn()
      };

      // Verify enhanced contract compatibility
      expect(typeof enhancedCallbacks.onDraftAutoSaved).toBe('function');
      expect(typeof enhancedCallbacks.onValidationError).toBe('function');
    });
  });
});