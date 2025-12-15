/**
 * Test Utilities for London School TDD Draft Modal Workflow
 * Phase 3 - Production-ready test utilities with mock coordination
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Draft, DraftStatus } from '@/types/drafts';
import { DraftService } from '@/services/DraftService';

// Mock Draft Factory for consistent test data
export const createMockDraft = (overrides: Partial<Draft> = {}): Draft => ({
  id: 'draft-123',
  userId: 'user-456',
  title: 'Test Draft Title',
  content: 'Test draft content with some text',
  tags: ['tag1', 'tag2'],
  status: DraftStatus.DRAFT,
  createdAt: new Date('2023-01-01T10:00:00Z'),
  updatedAt: new Date('2023-01-01T12:00:00Z'),
  wordCount: 6,
  ...overrides
});

// Mock DraftService Factory with London School approach
export const createMockDraftService = () => {
  const mockService = {
    createDraft: vi.fn(),
    updateDraft: vi.fn(),
    getDraft: vi.fn(),
    getDrafts: vi.fn(),
    deleteDraft: vi.fn(),
    autoSave: vi.fn(),
    publishDraft: vi.fn(),
    getStats: vi.fn(),
    getDraftVersions: vi.fn(),
    getConfig: vi.fn(),
    updateConfig: vi.fn()
  };

  // Set up default mock implementations
  mockService.createDraft.mockResolvedValue(createMockDraft());
  mockService.updateDraft.mockResolvedValue(createMockDraft());
  mockService.getDraft.mockResolvedValue(createMockDraft());
  mockService.getDrafts.mockResolvedValue([createMockDraft()]);
  mockService.deleteDraft.mockResolvedValue(void 0);
  mockService.autoSave.mockResolvedValue(void 0);
  mockService.publishDraft.mockResolvedValue(void 0);

  return mockService;
};

// Custom render function with routing context
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>{children}</MemoryRouter>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

// Mock navigation hook
export const createMockNavigate = () => vi.fn();

// Mock user interactions factory
export const createUserInteractionMocks = () => ({
  onClose: vi.fn(),
  onPostCreated: vi.fn(),
  onEditDraft: vi.fn(),
  onCreatePost: vi.fn()
});

// Contract definitions for London School TDD
export interface DraftModalContracts {
  PostCreatorModal: {
    props: {
      isOpen: boolean;
      onClose: () => void;
      onPostCreated?: (post: any) => void;
      editDraft?: Draft | null;
    };
    interactions: {
      shouldCallOnClose: boolean;
      shouldCallOnPostCreated: boolean;
      shouldInitializeWithDraft: boolean;
    };
  };
  DraftManager: {
    interactions: {
      shouldLoadDraft: boolean;
      shouldUpdateDraft: boolean;
      shouldCreateDraft: boolean;
      shouldPreventDuplicates: boolean;
    };
  };
}

// Test scenario builders for consistent test cases
export const createTestScenarios = {
  newDraft: () => ({
    editDraft: null,
    expectedBehavior: 'create',
    description: 'creating new draft'
  }),
  
  existingDraft: (draft: Draft = createMockDraft()) => ({
    editDraft: draft,
    expectedBehavior: 'update',
    description: 'editing existing draft'
  }),

  modalStates: {
    opening: { isOpen: true, description: 'opening modal' },
    closing: { isOpen: false, description: 'closing modal' }
  }
};

// Mock state managers for component collaboration testing
export const createMockStateManagers = () => ({
  modalState: {
    isOpen: false,
    editingDraft: null,
    setIsOpen: vi.fn(),
    setEditingDraft: vi.fn()
  },
  formState: {
    title: '',
    content: '',
    tags: [],
    setTitle: vi.fn(),
    setContent: vi.fn(),
    setTags: vi.fn(),
    resetForm: vi.fn()
  }
});

// Interaction verification helpers
export const verifyMockInteractions = {
  draftService: {
    wasCreateCalled: (mockService: any) => 
      expect(mockService.createDraft).toHaveBeenCalled(),
    
    wasUpdateCalled: (mockService: any) => 
      expect(mockService.updateDraft).toHaveBeenCalled(),
    
    wasNotCreateCalled: (mockService: any) => 
      expect(mockService.createDraft).not.toHaveBeenCalled(),
    
    wasUpdateCalledWith: (mockService: any, expectedData: any) =>
      expect(mockService.updateDraft).toHaveBeenCalledWith(
        expect.objectContaining(expectedData)
      )
  },
  
  userCallbacks: {
    wasCloseCalled: (mockCallbacks: ReturnType<typeof createUserInteractionMocks>) =>
      expect(mockCallbacks.onClose).toHaveBeenCalled(),
    
    wasPostCreatedCalled: (mockCallbacks: ReturnType<typeof createUserInteractionMocks>, post?: any) =>
      post ? expect(mockCallbacks.onPostCreated).toHaveBeenCalledWith(post) 
           : expect(mockCallbacks.onPostCreated).toHaveBeenCalled()
  },

  stateManagers: {
    wasModalStateUpdated: (mockStateManagers: ReturnType<typeof createMockStateManagers>) => {
      expect(mockStateManagers.modalState.setIsOpen).toHaveBeenCalled();
    },
    
    wasFormReset: (mockStateManagers: ReturnType<typeof createMockStateManagers>) => {
      expect(mockStateManagers.formState.resetForm).toHaveBeenCalled();
    }
  }
};

// Mock coordination helpers for swarm testing
export const createSwarmCoordination = () => ({
  mockCoordinator: {
    notifyTestStart: vi.fn(),
    shareResults: vi.fn(),
    reportInteractions: vi.fn()
  },
  
  contractMonitor: {
    verifyInteractions: vi.fn(),
    reportToSwarm: vi.fn()
  }
});

export { customRender as render };
export * from '@testing-library/react';