/**
 * London School TDD Tests for State Management
 * Focus: PostingStateContext behavior and cross-section data contracts
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { PostingStateProvider, usePostingState } from '../../../src/contexts/PostingStateContext';
import { 
  createMockPostingStateContext,
  createMockQuickPostHistoryItem,
  createMockAviMessage,
  PostingTestDataBuilder,
  assertTabBehaviorContract
} from './mocks';
import type { PostingMode, SharedPostingState } from '../../../src/types/posting-interface';
import './setup';

// Mock component to test state management
const MockStateConsumer: React.FC<{
  onStateChange?: (state: SharedPostingState) => void;
  testAction?: string;
}> = ({ onStateChange, testAction }) => {
  const { state, actions } = usePostingState();
  
  React.useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  const handleTestAction = () => {
    switch (testAction) {
      case 'switchToQuick':
        actions.switchTab('quick');
        break;
      case 'updateDraft':
        actions.updateSharedDraft({ content: 'Updated content' });
        break;
      case 'addQuickPost':
        actions.addQuickPostToHistory(createMockQuickPostHistoryItem());
        break;
      case 'addAviMessage':
        actions.addAviMessage(createMockAviMessage());
        break;
      case 'clearConversation':
        actions.clearConversation();
        break;
      case 'updateCrossSection':
        actions.updateCrossSectionData({ lastUsedTags: ['new-tag'] });
        break;
    }
  };

  return (
    <div data-testid="state-consumer">
      <div data-testid="active-tab">{state.activeTab}</div>
      <div data-testid="draft-content">{state.sharedDraft.content}</div>
      <div data-testid="draft-tags">{state.sharedDraft.tags.join(',')}</div>
      <div data-testid="quick-history-count">{state.quickPostHistory.length}</div>
      <div data-testid="avi-messages-count">{state.aviConversation.length}</div>
      <div data-testid="cross-section-tags">{state.crossSectionData.lastUsedTags.join(',')}</div>
      
      <button data-testid="test-action" onClick={handleTestAction}>
        {testAction}
      </button>
    </div>
  );
};

// Mock multiple consumers to test state sharing
const MockMultipleConsumers: React.FC = () => {
  const [consumerStates, setConsumerStates] = React.useState<SharedPostingState[]>([]);

  const updateConsumerState = (index: number) => (state: SharedPostingState) => {
    setConsumerStates(prev => {
      const newStates = [...prev];
      newStates[index] = state;
      return newStates;
    });
  };

  return (
    <div data-testid="multiple-consumers">
      <MockStateConsumer onStateChange={updateConsumerState(0)} />
      <MockStateConsumer onStateChange={updateConsumerState(1)} />
      <div data-testid="state-sync-status">
        {consumerStates.length >= 2 && 
         consumerStates[0]?.activeTab === consumerStates[1]?.activeTab ? 'synced' : 'unsynced'}
      </div>
    </div>
  );
};

describe('State Management - London School TDD', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Contract: Context Provider Behavior', () => {
    it('should provide initial state to consumers', () => {
      render(
        <PostingStateProvider>
          <MockStateConsumer />
        </PostingStateProvider>
      );
      
      expect(screen.getByTestId('active-tab')).toHaveTextContent('post');
      expect(screen.getByTestId('draft-content')).toHaveTextContent('');
      expect(screen.getByTestId('quick-history-count')).toHaveTextContent('0');
    });

    it('should throw error when used outside provider', () => {
      // Mock console.error to prevent test output pollution
      const originalError = console.error;
      console.error = vi.fn();
      
      expect(() => {
        render(<MockStateConsumer />);
      }).toThrow('usePostingState must be used within a PostingStateProvider');
      
      console.error = originalError;
    });

    it('should persist state changes to localStorage', async () => {
      const mockSetItem = vi.fn();
      Object.defineProperty(window, 'localStorage', {
        value: { ...localStorage, setItem: mockSetItem }
      });

      render(
        <PostingStateProvider>
          <MockStateConsumer testAction="switchToQuick" />
        </PostingStateProvider>
      );
      
      const actionButton = screen.getByTestId('test-action');
      await user.click(actionButton);
      
      // Should eventually persist to localStorage (debounced)
      await waitFor(() => {
        expect(mockSetItem).toHaveBeenCalledWith(
          'enhanced-posting-interface-state',
          expect.stringContaining('"activeTab":"quick"')
        );
      }, { timeout: 2000 });
    });

    it('should load persisted state on mount', () => {
      const mockGetItem = vi.fn().mockReturnValue(
        JSON.stringify({
          activeTab: 'avi',
          sharedDraft: { content: 'Persisted content', tags: ['persisted'], mentions: [], title: 'Persisted' },
          quickPostHistory: [],
          aviConversation: [],
          crossSectionData: { lastUsedTags: ['persisted-tag'], frequentMentions: [], recentTopics: [] }
        })
      );
      
      Object.defineProperty(window, 'localStorage', {
        value: { ...localStorage, getItem: mockGetItem }
      });

      render(
        <PostingStateProvider>
          <MockStateConsumer />
        </PostingStateProvider>
      );
      
      expect(screen.getByTestId('active-tab')).toHaveTextContent('avi');
      expect(screen.getByTestId('draft-content')).toHaveTextContent('Persisted content');
      expect(screen.getByTestId('cross-section-tags')).toHaveTextContent('persisted-tag');
    });
  });

  describe('Contract: Tab Switching Behavior', () => {
    it('should switch tabs through action', async () => {
      render(
        <PostingStateProvider>
          <MockStateConsumer testAction="switchToQuick" />
        </PostingStateProvider>
      );
      
      expect(screen.getByTestId('active-tab')).toHaveTextContent('post');
      
      const actionButton = screen.getByTestId('test-action');
      await user.click(actionButton);
      
      expect(screen.getByTestId('active-tab')).toHaveTextContent('quick');
    });

    it('should maintain tab state across multiple consumers', async () => {
      render(
        <PostingStateProvider>
          <MockMultipleConsumers />
        </PostingStateProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('state-sync-status')).toHaveTextContent('synced');
      });
    });

    it('should validate tab switching contract', async () => {
      const onStateChange = vi.fn();
      
      render(
        <PostingStateProvider>
          <MockStateConsumer onStateChange={onStateChange} testAction="switchToQuick" />
        </PostingStateProvider>
      );
      
      const actionButton = screen.getByTestId('test-action');
      await user.click(actionButton);
      
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          activeTab: 'quick'
        })
      );
    });
  });

  describe('Contract: Shared Draft Management', () => {
    it('should update shared draft content', async () => {
      render(
        <PostingStateProvider>
          <MockStateConsumer testAction="updateDraft" />
        </PostingStateProvider>
      );
      
      expect(screen.getByTestId('draft-content')).toHaveTextContent('');
      
      const actionButton = screen.getByTestId('test-action');
      await user.click(actionButton);
      
      expect(screen.getByTestId('draft-content')).toHaveTextContent('Updated content');
    });

    it('should merge draft updates without overwriting existing data', () => {
      const TestComponent = () => {
        const { state, actions } = usePostingState();
        
        const updateTitle = () => actions.updateSharedDraft({ title: 'New Title' });
        const updateContent = () => actions.updateSharedDraft({ content: 'New Content' });
        
        return (
          <div>
            <div data-testid="draft-title">{state.sharedDraft.title}</div>
            <div data-testid="draft-content">{state.sharedDraft.content}</div>
            <button data-testid="update-title" onClick={updateTitle}>Update Title</button>
            <button data-testid="update-content" onClick={updateContent}>Update Content</button>
          </div>
        );
      };

      render(
        <PostingStateProvider>
          <TestComponent />
        </PostingStateProvider>
      );
      
      const titleButton = screen.getByTestId('update-title');
      const contentButton = screen.getByTestId('update-content');
      
      act(() => {
        titleButton.click();
        contentButton.click();
      });
      
      expect(screen.getByTestId('draft-title')).toHaveTextContent('New Title');
      expect(screen.getByTestId('draft-content')).toHaveTextContent('New Content');
    });

    it('should preserve draft state across tab switches', async () => {
      const TestComponent = () => {
        const { state, actions } = usePostingState();
        
        return (
          <div>
            <div data-testid="active-tab">{state.activeTab}</div>
            <div data-testid="draft-content">{state.sharedDraft.content}</div>
            <button data-testid="update-draft" onClick={() => actions.updateSharedDraft({ content: 'Draft content' })}>
              Update Draft
            </button>
            <button data-testid="switch-tab" onClick={() => actions.switchTab('quick')}>
              Switch Tab
            </button>
          </div>
        );
      };

      render(
        <PostingStateProvider>
          <TestComponent />
        </PostingStateProvider>
      );
      
      const updateButton = screen.getByTestId('update-draft');
      const switchButton = screen.getByTestId('switch-tab');
      
      await user.click(updateButton);
      expect(screen.getByTestId('draft-content')).toHaveTextContent('Draft content');
      
      await user.click(switchButton);
      expect(screen.getByTestId('active-tab')).toHaveTextContent('quick');
      expect(screen.getByTestId('draft-content')).toHaveTextContent('Draft content');
    });
  });

  describe('Contract: Quick Post History Management', () => {
    it('should add items to quick post history', async () => {
      render(
        <PostingStateProvider>
          <MockStateConsumer testAction="addQuickPost" />
        </PostingStateProvider>
      );
      
      expect(screen.getByTestId('quick-history-count')).toHaveTextContent('0');
      
      const actionButton = screen.getByTestId('test-action');
      await user.click(actionButton);
      
      expect(screen.getByTestId('quick-history-count')).toHaveTextContent('1');
    });

    it('should limit quick post history to performance boundaries', async () => {
      const TestComponent = () => {
        const { state, actions } = usePostingState();
        
        const addMultipleQuickPosts = () => {
          for (let i = 0; i < 25; i++) {
            actions.addQuickPostToHistory(createMockQuickPostHistoryItem({
              id: `quick-${i}`,
              content: `Quick post ${i}`
            }));
          }
        };
        
        return (
          <div>
            <div data-testid="quick-history-count">{state.quickPostHistory.length}</div>
            <button data-testid="add-multiple" onClick={addMultipleQuickPosts}>
              Add Multiple
            </button>
          </div>
        );
      };

      render(
        <PostingStateProvider>
          <TestComponent />
        </PostingStateProvider>
      );
      
      const addButton = screen.getByTestId('add-multiple');
      await user.click(addButton);
      
      // Should be limited to 20 items
      expect(screen.getByTestId('quick-history-count')).toHaveTextContent('20');
    });

    it('should update cross-section data when adding quick posts', async () => {
      const TestComponent = () => {
        const { state, actions } = usePostingState();
        
        const addTaggedQuickPost = () => {
          actions.addQuickPostToHistory(createMockQuickPostHistoryItem({
            tags: ['quick-tag', 'test-tag']
          }));
        };
        
        return (
          <div>
            <div data-testid="cross-section-tags">{state.crossSectionData.lastUsedTags.join(',')}</div>
            <button data-testid="add-tagged-post" onClick={addTaggedQuickPost}>
              Add Tagged Post
            </button>
          </div>
        );
      };

      render(
        <PostingStateProvider>
          <TestComponent />
        </PostingStateProvider>
      );
      
      const addButton = screen.getByTestId('add-tagged-post');
      await user.click(addButton);
      
      expect(screen.getByTestId('cross-section-tags')).toHaveTextContent('quick-tag,test-tag');
    });
  });

  describe('Contract: Avi Conversation Management', () => {
    it('should add messages to conversation', async () => {
      render(
        <PostingStateProvider>
          <MockStateConsumer testAction="addAviMessage" />
        </PostingStateProvider>
      );
      
      expect(screen.getByTestId('avi-messages-count')).toHaveTextContent('0');
      
      const actionButton = screen.getByTestId('test-action');
      await user.click(actionButton);
      
      expect(screen.getByTestId('avi-messages-count')).toHaveTextContent('1');
    });

    it('should clear conversation', async () => {
      const TestComponent = () => {
        const { state, actions } = usePostingState();
        
        React.useEffect(() => {
          // Add a message first
          actions.addAviMessage(createMockAviMessage());
        }, [actions]);
        
        return (
          <div>
            <div data-testid="avi-messages-count">{state.aviConversation.length}</div>
            <button data-testid="clear-conversation" onClick={actions.clearConversation}>
              Clear
            </button>
          </div>
        );
      };

      render(
        <PostingStateProvider>
          <TestComponent />
        </PostingStateProvider>
      );
      
      // Should have initial message
      await waitFor(() => {
        expect(screen.getByTestId('avi-messages-count')).toHaveTextContent('1');
      });
      
      const clearButton = screen.getByTestId('clear-conversation');
      await user.click(clearButton);
      
      expect(screen.getByTestId('avi-messages-count')).toHaveTextContent('0');
    });

    it('should limit conversation history for performance', async () => {
      const TestComponent = () => {
        const { state, actions } = usePostingState();
        
        const addManyMessages = () => {
          for (let i = 0; i < 150; i++) {
            actions.addAviMessage(createMockAviMessage({
              id: `msg-${i}`,
              content: `Message ${i}`
            }));
          }
        };
        
        return (
          <div>
            <div data-testid="avi-messages-count">{state.aviConversation.length}</div>
            <button data-testid="add-many-messages" onClick={addManyMessages}>
              Add Many Messages
            </button>
          </div>
        );
      };

      render(
        <PostingStateProvider>
          <TestComponent />
        </PostingStateProvider>
      );
      
      const addButton = screen.getByTestId('add-many-messages');
      await user.click(addButton);
      
      // Should be limited to 100 messages
      expect(screen.getByTestId('avi-messages-count')).toHaveTextContent('100');
    });
  });

  describe('Contract: Cross-Section Data Management', () => {
    it('should update cross-section data', async () => {
      render(
        <PostingStateProvider>
          <MockStateConsumer testAction="updateCrossSection" />
        </PostingStateProvider>
      );
      
      expect(screen.getByTestId('cross-section-tags')).toHaveTextContent('');
      
      const actionButton = screen.getByTestId('test-action');
      await user.click(actionButton);
      
      expect(screen.getByTestId('cross-section-tags')).toHaveTextContent('new-tag');
    });

    it('should aggregate data from multiple sources', async () => {
      const TestComponent = () => {
        const { state, actions } = usePostingState();
        
        const simulateMultiSourceData = () => {
          // Simulate quick post adding tags
          actions.addQuickPostToHistory(createMockQuickPostHistoryItem({
            tags: ['quick-tag']
          }));
          
          // Simulate manual cross-section update
          actions.updateCrossSectionData({
            frequentMentions: ['@agent1', '@agent2']
          });
        };
        
        return (
          <div>
            <div data-testid="cross-section-tags">{state.crossSectionData.lastUsedTags.join(',')}</div>
            <div data-testid="cross-section-mentions">{state.crossSectionData.frequentMentions.join(',')}</div>
            <button data-testid="simulate-data" onClick={simulateMultiSourceData}>
              Simulate Data
            </button>
          </div>
        );
      };

      render(
        <PostingStateProvider>
          <TestComponent />
        </PostingStateProvider>
      );
      
      const simulateButton = screen.getByTestId('simulate-data');
      await user.click(simulateButton);
      
      expect(screen.getByTestId('cross-section-tags')).toHaveTextContent('quick-tag');
      expect(screen.getByTestId('cross-section-mentions')).toHaveTextContent('@agent1,@agent2');
    });
  });

  describe('Contract: Performance and Memory Management', () => {
    it('should handle rapid state updates without performance degradation', async () => {
      const TestComponent = () => {
        const { actions } = usePostingState();
        
        const rapidUpdates = () => {
          for (let i = 0; i < 50; i++) {
            actions.updateSharedDraft({ content: `Content ${i}` });
          }
        };
        
        return (
          <button data-testid="rapid-updates" onClick={rapidUpdates}>
            Rapid Updates
          </button>
        );
      };

      const start = performance.now();
      
      render(
        <PostingStateProvider>
          <TestComponent />
          <MockStateConsumer />
        </PostingStateProvider>
      );
      
      const rapidButton = screen.getByTestId('rapid-updates');
      await user.click(rapidButton);
      
      const end = performance.now();
      expect(end - start).toBeLessThan(1000); // Should handle updates efficiently
      
      // Final state should be the last update
      expect(screen.getByTestId('draft-content')).toHaveTextContent('Content 49');
    });

    it('should persist limited state to avoid localStorage bloat', async () => {
      const mockSetItem = vi.fn();
      Object.defineProperty(window, 'localStorage', {
        value: { ...localStorage, setItem: mockSetItem }
      });

      const TestComponent = () => {
        const { actions } = usePostingState();
        
        React.useEffect(() => {
          // Add many items
          for (let i = 0; i < 50; i++) {
            actions.addQuickPostToHistory(createMockQuickPostHistoryItem({ id: `quick-${i}` }));
            actions.addAviMessage(createMockAviMessage({ id: `msg-${i}` }));
          }
        }, [actions]);
        
        return <div>Loading...</div>;
      };

      render(
        <PostingStateProvider>
          <TestComponent />
        </PostingStateProvider>
      );
      
      await waitFor(() => {
        expect(mockSetItem).toHaveBeenCalled();
      }, { timeout: 2000 });
      
      const lastCall = mockSetItem.mock.calls[mockSetItem.mock.calls.length - 1];
      const persistedData = JSON.parse(lastCall[1]);
      
      // Should limit persisted data
      expect(persistedData.quickPostHistory.length).toBeLessThanOrEqual(10);
      expect(persistedData.aviConversation.length).toBeLessThanOrEqual(20);
    });
  });

  describe('Contract: Error Resilience', () => {
    it('should handle localStorage failures gracefully', () => {
      const mockGetItem = vi.fn().mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      Object.defineProperty(window, 'localStorage', {
        value: { ...localStorage, getItem: mockGetItem }
      });

      expect(() => {
        render(
          <PostingStateProvider>
            <MockStateConsumer />
          </PostingStateProvider>
        );
      }).not.toThrow();
      
      // Should still provide default state
      expect(screen.getByTestId('active-tab')).toHaveTextContent('post');
    });

    it('should handle malformed persisted data', () => {
      const mockGetItem = vi.fn().mockReturnValue('invalid json{');
      
      Object.defineProperty(window, 'localStorage', {
        value: { ...localStorage, getItem: mockGetItem }
      });

      expect(() => {
        render(
          <PostingStateProvider>
            <MockStateConsumer />
          </PostingStateProvider>
        );
      }).not.toThrow();
      
      expect(screen.getByTestId('active-tab')).toHaveTextContent('post');
    });

    it('should recover from corrupted state', async () => {
      const TestComponent = () => {
        const { state, actions } = usePostingState();
        
        const corruptState = () => {
          // This would normally be prevented by TypeScript, but testing edge cases
          try {
            actions.updateSharedDraft(null as any);
          } catch (error) {
            // Should handle gracefully
          }
        };
        
        return (
          <div>
            <div data-testid="draft-content">{state.sharedDraft?.content || 'safe-fallback'}</div>
            <button data-testid="corrupt-state" onClick={corruptState}>
              Corrupt State
            </button>
          </div>
        );
      };

      render(
        <PostingStateProvider>
          <TestComponent />
        </PostingStateProvider>
      );
      
      const corruptButton = screen.getByTestId('corrupt-state');
      await user.click(corruptButton);
      
      // Should maintain safe state
      expect(screen.getByTestId('draft-content')).toHaveTextContent('safe-fallback');
    });
  });
});