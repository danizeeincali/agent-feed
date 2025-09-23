/**
 * Simplified Test Utilities for London School TDD Draft Modal Workflow
 * Phase 3 - Production-ready test utilities with mock coordination
 */

import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Draft, DraftStatus } from '@/types/drafts';

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

// Mock DraftService Factory
export const createMockDraftService = () => ({
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
});

// Mock user interactions factory
export const createUserInteractionMocks = () => ({
  onClose: vi.fn(),
  onPostCreated: vi.fn(),
  onEditDraft: vi.fn(),
  onCreatePost: vi.fn()
});

// Custom render function with routing
const Wrapper = ({ children }: { children: React.ReactNode }) => {
  return <MemoryRouter>{children}</MemoryRouter>;
};

export const render = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
  return rtlRender(ui, { wrapper: Wrapper, ...options });
};

// Verification helpers
export const verifyMockInteractions = {
  draftService: {
    wasCreateCalled: (mockService: any) => 
      expect(mockService.createDraft).toHaveBeenCalled(),
    wasUpdateCalled: (mockService: any) => 
      expect(mockService.updateDraft).toHaveBeenCalled(),
    wasNotCreateCalled: (mockService: any) => 
      expect(mockService.createDraft).not.toHaveBeenCalled()
  },
  userCallbacks: {
    wasCloseCalled: (callbacks: ReturnType<typeof createUserInteractionMocks>) =>
      expect(callbacks.onClose).toHaveBeenCalled(),
    wasPostCreatedCalled: (callbacks: ReturnType<typeof createUserInteractionMocks>) =>
      expect(callbacks.onPostCreated).toHaveBeenCalled()
  }
};

// Test scenarios
export const createTestScenarios = {
  newDraft: () => ({ editDraft: null, expectedBehavior: 'create' }),
  existingDraft: (draft = createMockDraft()) => ({ editDraft: draft, expectedBehavior: 'update' })
};

// Re-export everything from testing library
export * from '@testing-library/react';