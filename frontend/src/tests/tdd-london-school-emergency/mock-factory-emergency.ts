/**
 * TDD London School Emergency Mock Factory
 * 
 * Provides mocks for testing CommentForm vs PostCreator dropdown behavior
 * Following London School principles: Mock dependencies, test interactions
 */

import { vi } from 'vitest';
import React from 'react';

// Mock Types
export interface EmergencyMentionSuggestion {
  id: string;
  name: string;
  displayName: string;
  description: string;
  avatar?: string;
}

export interface EmergencyMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionSelect?: (mention: EmergencyMentionSuggestion) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  maxLength?: number;
  autoFocus?: boolean;
  mentionContext?: string;
}

// London School TDD - Collaboration Mock Factory
export class EmergencyMockFactory {
  // Working PostCreator-style Mock
  static createWorkingMentionInputMock() {
    const mockRef = {
      current: {
        focus: vi.fn(),
        blur: vi.fn(),
        insertMention: vi.fn(),
        getCurrentMentionQuery: vi.fn().mockReturnValue('@'),
        selectionStart: 0,
        selectionEnd: 0,
        setSelectionRange: vi.fn(),
        // Mock successful mention detection
        updateMentionState: vi.fn(),
        handleMentionSelect: vi.fn()
      }
    };

    const mockDropdownState = {
      isOpen: false,
      suggestions: [] as EmergencyMentionSuggestion[],
      selectedIndex: 0
    };

    const MockWorkingMentionInput = React.forwardRef<any, EmergencyMentionInputProps>(
      ({ value, onChange, onMentionSelect, mentionContext, ...props }, ref) => {
        React.useImperativeHandle(ref, () => mockRef.current);

        // Simulate successful @ detection
        React.useEffect(() => {
          if (value.includes('@') && !mockDropdownState.isOpen) {
            mockDropdownState.isOpen = true;
            mockDropdownState.suggestions = [
              {
                id: 'working-1',
                name: 'chief-of-staff-agent',
                displayName: 'Chief of Staff',
                description: 'Strategic coordination'
              },
              {
                id: 'working-2',
                name: 'personal-todos-agent',
                displayName: 'Personal Todos',
                description: 'Task management'
              }
            ];
            console.log('🚨 EMERGENCY DEBUG: Dropdown Open');
          }
        }, [value]);

        return React.createElement('div', {
          'data-testid': 'working-mention-input',
          'data-context': mentionContext,
          'data-dropdown-open': mockDropdownState.isOpen,
          className: 'relative'
        }, [
          // Textarea element
          React.createElement('textarea', {
            key: 'textarea',
            'data-testid': 'working-textarea',
            value,
            onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => {
              onChange(e.target.value);
              if (e.target.value.includes('@')) {
                console.log('🚨 EMERGENCY DEBUG: Dropdown Open');
              }
            },
            ...props
          }),
          // Successful dropdown rendering
          mockDropdownState.isOpen && React.createElement('div', {
            key: 'dropdown',
            'data-testid': 'working-dropdown',
            className: 'absolute z-[99999] bg-white border-2 border-blue-300 rounded shadow-xl',
            style: { 
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 99999,
              backgroundColor: 'white',
              border: '3px solid #007bff',
              display: 'block',
              visibility: 'visible'
            }
          }, [
            React.createElement('div', {
              key: 'debug',
              className: 'px-2 py-1 text-xs bg-yellow-50 text-yellow-800'
            }, '🚨 EMERGENCY DEBUG: Dropdown Open'),
            ...mockDropdownState.suggestions.map((suggestion, index) =>
              React.createElement('div', {
                key: suggestion.id,
                'data-testid': `working-suggestion-${index}`,
                className: 'px-4 py-3 hover:bg-blue-50 cursor-pointer',
                onClick: () => onMentionSelect?.(suggestion)
              }, `@${suggestion.name} - ${suggestion.displayName}`)
            )
          ])
        ]);
      }
    );

    return { MockWorkingMentionInput, mockRef, mockDropdownState };
  }

  // Broken CommentForm-style Mock
  static createBrokenMentionInputMock() {
    const mockRef = {
      current: {
        focus: vi.fn(),
        blur: vi.fn(),
        insertMention: vi.fn(),
        getCurrentMentionQuery: vi.fn().mockReturnValue(null), // CRITICAL: Returns null
        selectionStart: 0,
        selectionEnd: 0,
        setSelectionRange: vi.fn(),
        // Mock failed mention detection
        updateMentionState: vi.fn().mockImplementation(() => {
          console.error('Failed to update mention state in comment context');
        }),
        handleMentionSelect: vi.fn().mockImplementation(() => {
          throw new Error('Mention selection failed in comment context');
        })
      }
    };

    const mockDropdownState = {
      isOpen: false, // Never opens
      suggestions: [] as EmergencyMentionSuggestion[],
      selectedIndex: 0
    };

    const MockBrokenMentionInput = React.forwardRef<any, EmergencyMentionInputProps>(
      ({ value, onChange, onMentionSelect, mentionContext, ...props }, ref) => {
        React.useImperativeHandle(ref, () => mockRef.current);

        // Simulate FAILED @ detection
        React.useEffect(() => {
          if (value.includes('@')) {
            // CRITICAL BUG: Complex layout interference prevents dropdown
            console.error('🚨 EMERGENCY: @ detected but dropdown blocked by layout');
            // No dropdown opening logic - this is the bug!
          }
        }, [value]);

        return React.createElement('div', {
          'data-testid': 'broken-mention-input',
          'data-context': mentionContext,
          'data-dropdown-open': false, // Always false
          className: 'relative'
        }, [
          // Complex wrapper that interferes with dropdown
          React.createElement('div', {
            key: 'complex-wrapper',
            className: 'form-wrapper',
            style: { position: 'relative', zIndex: 1 }
          }, [
            // Formatting toolbar overlay
            React.createElement('div', {
              key: 'toolbar',
              'data-testid': 'formatting-toolbar',
              className: 'toolbar-overlay',
              style: { 
                position: 'relative', 
                zIndex: 10, 
                backgroundColor: 'rgba(255,255,255,0.9)' 
              }
            }, 'Formatting Toolbar'),
            
            // Input wrapper with conflicting positioning
            React.createElement('div', {
              key: 'input-wrapper',
              className: 'input-wrapper',
              style: { position: 'relative' }
            }, [
              // Textarea
              React.createElement('textarea', {
                key: 'textarea',
                'data-testid': 'broken-textarea',
                value,
                onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  onChange(e.target.value);
                  // NO debug output - this is the bug!
                  if (e.target.value.includes('@')) {
                    // Silent failure - dropdown should appear but doesn't
                  }
                },
                ...props
              }),
              
              // Character counter overlay that blocks dropdown
              React.createElement('div', {
                key: 'counter',
                'data-testid': 'character-counter',
                className: 'character-counter',
                style: { 
                  position: 'absolute', 
                  bottom: '2px', 
                  right: '2px', 
                  zIndex: 5,
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }
              }, `${value.length}/2000`)
            ])
          ])
          // NO DROPDOWN RENDERED - this is the critical bug!
        ]);
      }
    );

    return { MockBrokenMentionInput, mockRef, mockDropdownState };
  }

  // API Service Mock for Comment Creation
  static createApiServiceMock() {
    return {
      createComment: vi.fn().mockImplementation(async (postId: string, content: string, options?: any) => {
        // Mock successful API response
        return {
          id: `comment-${Date.now()}`,
          postId,
          content,
          author: options?.author || 'test-user',
          mentionedUsers: options?.mentionedUsers || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }),
      
      // Mock other API methods that might be called
      getPosts: vi.fn().mockResolvedValue([]),
      updateComment: vi.fn().mockResolvedValue({}),
      deleteComment: vi.fn().mockResolvedValue({})
    };
  }

  // Mention Service Mock
  static createMentionServiceMock() {
    const defaultSuggestions: EmergencyMentionSuggestion[] = [
      {
        id: 'mock-1',
        name: 'chief-of-staff-agent',
        displayName: 'Chief of Staff',
        description: 'Strategic coordination and planning'
      },
      {
        id: 'mock-2',
        name: 'personal-todos-agent',
        displayName: 'Personal Todos',
        description: 'Task and project management'
      },
      {
        id: 'mock-3',
        name: 'meeting-prep-agent',
        displayName: 'Meeting Prep',
        description: 'Meeting preparation and coordination'
      }
    ];

    return {
      searchMentions: vi.fn().mockImplementation(async (query: string) => {
        // Simulate search behavior
        if (!query || query.trim() === '') {
          return defaultSuggestions;
        }
        
        return defaultSuggestions.filter(suggestion =>
          suggestion.name.toLowerCase().includes(query.toLowerCase()) ||
          suggestion.displayName.toLowerCase().includes(query.toLowerCase())
        );
      }),
      
      getQuickMentions: vi.fn().mockImplementation((context?: string) => {
        // Return context-specific suggestions
        if (context === 'post') {
          return defaultSuggestions;
        } else if (context === 'comment') {
          // Simulate fewer suggestions for comments (potential bug)
          return defaultSuggestions.slice(0, 1);
        }
        return defaultSuggestions;
      }),
      
      getAllAgents: vi.fn().mockReturnValue(defaultSuggestions),
      
      extractMentions: vi.fn().mockImplementation((text: string) => {
        const mentionRegex = /@([a-zA-Z0-9-_]+)/g;
        const matches = [...text.matchAll(mentionRegex)];
        return matches.map(match => match[1]);
      })
    };
  }

  // Swarm Coordination Mock
  static createSwarmCoordinatorMock() {
    const swarmState = {
      activeComponents: new Set<string>(),
      mentionEvents: [] as Array<{
        component: string;
        event: string;
        data: any;
        timestamp: number;
      }>(),
      dropdownStates: new Map<string, boolean>()
    };

    return {
      registerComponent: vi.fn((componentName: string) => {
        swarmState.activeComponents.add(componentName);
        swarmState.dropdownStates.set(componentName, false);
      }),
      
      unregisterComponent: vi.fn((componentName: string) => {
        swarmState.activeComponents.delete(componentName);
        swarmState.dropdownStates.delete(componentName);
      }),
      
      notifyMentionEvent: vi.fn((component: string, event: string, data: any) => {
        swarmState.mentionEvents.push({
          component,
          event,
          data,
          timestamp: Date.now()
        });
      }),
      
      setDropdownState: vi.fn((component: string, isOpen: boolean) => {
        swarmState.dropdownStates.set(component, isOpen);
      }),
      
      getDropdownState: vi.fn((component: string) => {
        return swarmState.dropdownStates.get(component) || false;
      }),
      
      // Expose internal state for testing
      _getState: () => swarmState
    };
  }

  // Contract Verification Helpers
  static createContractVerifiers() {
    return {
      verifyDropdownVisibility: (container: HTMLElement, shouldBeVisible: boolean) => {
        const dropdown = container.querySelector('[data-testid*="dropdown"]');
        if (shouldBeVisible) {
          expect(dropdown).toBeTruthy();
          if (dropdown) {
            expect(dropdown).toBeVisible();
            // Verify z-index
            const computedStyle = window.getComputedStyle(dropdown);
            expect(parseInt(computedStyle.zIndex || '0')).toBeGreaterThan(1000);
          }
        } else {
          expect(dropdown).toBeFalsy();
        }
      },

      verifyDebugOutput: (container: HTMLElement, shouldHaveDebug: boolean) => {
        const debugText = '🚨 EMERGENCY DEBUG: Dropdown Open';
        if (shouldHaveDebug) {
          expect(container).toHaveTextContent(debugText);
        } else {
          expect(container).not.toHaveTextContent(debugText);
        }
      },

      verifyMentionInputProps: (mockRef: any, expectedProps: Record<string, any>) => {
        Object.entries(expectedProps).forEach(([key, value]) => {
          if (key in mockRef.current) {
            expect(mockRef.current[key]).toEqual(value);
          }
        });
      },

      verifyLayoutComplexity: (container: HTMLElement, maxDepth: number) => {
        const countNestedDivs = (element: HTMLElement): number => {
          const children = element.children;
          let maxChildDepth = 0;
          
          for (let i = 0; i < children.length; i++) {
            const child = children[i] as HTMLElement;
            if (child.tagName === 'DIV') {
              maxChildDepth = Math.max(maxChildDepth, 1 + countNestedDivs(child));
            }
          }
          
          return maxChildDepth;
        };

        const actualDepth = countNestedDivs(container);
        expect(actualDepth).toBeLessThanOrEqual(maxDepth);
      },

      verifyZIndexHierarchy: (elements: HTMLElement[]) => {
        const zIndices = elements.map(el => {
          const style = window.getComputedStyle(el);
          return parseInt(style.zIndex || '0');
        });

        // Check that dropdown has highest z-index
        const dropdownIndex = Math.max(...zIndices);
        expect(dropdownIndex).toBeGreaterThan(1000);
        
        // Check for conflicts
        const duplicates = zIndices.filter((item, index) => zIndices.indexOf(item) !== index);
        expect(duplicates.length).toBe(0); // No z-index conflicts
      }
    };
  }
}

// Export utility functions
export const EmergencyTestUtils = {
  // Simulate user typing @ character
  simulateAtInput: async (textarea: HTMLTextAreaElement, user: any) => {
    await user.type(textarea, '@');
    // Wait for any async effects
    await new Promise(resolve => setTimeout(resolve, 100));
  },

  // Simulate mention selection
  simulateMentionSelect: async (dropdownItem: HTMLElement, user: any) => {
    await user.click(dropdownItem);
    await new Promise(resolve => setTimeout(resolve, 50));
  },

  // Wait for dropdown animation/rendering
  waitForDropdown: async (timeout = 1000) => {
    return new Promise(resolve => setTimeout(resolve, timeout));
  },

  // Create test scenarios for different contexts
  createTestScenarios: () => [
    {
      name: 'PostCreator (Working)',
      context: 'post',
      shouldWork: true,
      expectedDebug: true,
      expectedDropdown: true
    },
    {
      name: 'CommentForm (Broken)', 
      context: 'comment',
      shouldWork: false,
      expectedDebug: false,
      expectedDropdown: false
    },
    {
      name: 'QuickPost (Working)',
      context: 'quick-post',
      shouldWork: true, 
      expectedDebug: true,
      expectedDropdown: true
    },
    {
      name: 'Reply Form (Broken)',
      context: 'reply',
      shouldWork: false,
      expectedDebug: false,
      expectedDropdown: false
    }
  ]
};

export default EmergencyMockFactory;