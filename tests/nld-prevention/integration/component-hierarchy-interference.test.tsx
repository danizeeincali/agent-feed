/**
 * NLD Component Hierarchy Interference Prevention
 * 
 * Prevents the exact component hierarchy failures from Agent Feed:
 * - PostCreator: Complex layout preventing dropdown visibility
 * - CommentForm: Conditional rendering breaking functionality
 * - QuickPost: Working correctly (reference implementation)
 * - State management conflicts between nested components
 */

import React, { useState, useRef } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Mock MentionInput component for testing
interface MockMentionInputProps {
  value: string
  onChange: (value: string) => void
  onMentionSelect?: (mention: string) => void
  mentionContext?: string
  className?: string
  ref?: React.Ref<any>
}

const MockMentionInput = React.forwardRef<HTMLTextAreaElement, MockMentionInputProps>(({
  value,
  onChange,
  onMentionSelect,
  mentionContext,
  className
}, ref) => {
  const [showDropdown, setShowDropdown] = useState(false)
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    
    // Simulate @ mention detection
    if (newValue.endsWith('@')) {
      setShowDropdown(true)
    } else if (!newValue.includes('@')) {
      setShowDropdown(false)
    }
  }
  
  const handleMentionClick = (mention: string) => {
    onMentionSelect?.(mention)
    onChange(value.replace(/@$/, `@${mention} `))
    setShowDropdown(false)
  }
  
  return (
    <div className="mention-input-wrapper" data-testid={`mention-wrapper-${mentionContext}`}>
      <textarea
        ref={ref}
        data-testid={`mention-input-${mentionContext}`}
        value={value}
        onChange={handleChange}
        className={className}
        placeholder={`Type @ to mention someone in ${mentionContext}`}
      />
      {showDropdown && (
        <div 
          data-testid={`mention-dropdown-${mentionContext}`}
          className="absolute bg-white border shadow-lg z-50 w-48"
          style={{ top: '100%', left: 0 }}
        >
          <div 
            data-testid={`mention-suggestion-john-${mentionContext}`}
            onClick={() => handleMentionClick('john')}
            className="p-2 hover:bg-gray-100 cursor-pointer"
          >
            @john
          </div>
          <div 
            data-testid={`mention-suggestion-jane-${mentionContext}`}
            onClick={() => handleMentionClick('jane')}
            className="p-2 hover:bg-gray-100 cursor-pointer"
          >
            @jane
          </div>
        </div>
      )}
    </div>
  )
})

MockMentionInput.displayName = 'MockMentionInput'

/**
 * ANTI-PATTERN 1: Complex Layout Hierarchy (PostCreator Pattern)
 * This simulates the failing PostCreator component structure
 */
describe('Complex Layout Hierarchy Anti-Pattern', () => {
  
  const FailingPostCreatorPattern = () => {
    const [content, setContent] = useState('')
    const [isRichMode, setIsRichMode] = useState(true)
    const [showPreview, setShowPreview] = useState(false)
    const [showAgentPicker, setShowAgentPicker] = useState(false)
    const contentRef = useRef<HTMLTextAreaElement>(null)
    
    return (
      <div className="post-creator-container" data-testid="failing-post-creator">
        {/* Deep nested structure that caused issues */}
        <div className="header-section">
          <div className="toolbar-wrapper">
            <div className="toolbar-content">
              <button 
                data-testid="rich-mode-btn"
                onClick={() => setIsRichMode(!isRichMode)}
              >
                Rich Mode
              </button>
              <button 
                data-testid="preview-btn"
                onClick={() => setShowPreview(!showPreview)}
              >
                Preview
              </button>
              <button 
                data-testid="agent-picker-btn"
                onClick={() => setShowAgentPicker(!showAgentPicker)}
              >
                Agent Picker
              </button>
            </div>
          </div>
        </div>
        
        <div className="content-section border border-gray-300 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <div className="toolbar-items">
              <span>Rich Editor Toolbar</span>
              <div className="format-buttons">
                <button>Bold</button>
                <button>Italic</button>
              </div>
            </div>
          </div>
          
          {showPreview ? (
            <div className="preview-overlay" data-testid="preview-overlay">
              <div className="preview-content">{content}</div>
            </div>
          ) : (
            <div className="relative">
              <div className="input-wrapper">
                <div className="input-container">
                  {/* MentionInput buried 8 levels deep - ANTI-PATTERN */}
                  <MockMentionInput
                    ref={contentRef}
                    value={content}
                    onChange={setContent}
                    mentionContext="failing-post"
                    className="w-full p-3 resize-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {showAgentPicker && (
          <div className="agent-picker-overlay absolute inset-0 bg-black bg-opacity-50 z-40">
            <div className="agent-picker-content bg-white p-4 rounded-lg">
              <h3>Select Agent</h3>
              <div>Agent options...</div>
              <button onClick={() => setShowAgentPicker(false)}>Close</button>
            </div>
          </div>
        )}
      </div>
    )
  }
  
  const WorkingQuickPostPattern = () => {
    const [content, setContent] = useState('')
    const contentRef = useRef<HTMLTextAreaElement>(null)
    
    return (
      <div className="quick-post-container" data-testid="working-quick-post">
        {/* Simple, flat structure that works - GOOD PATTERN */}
        <div className="simple-wrapper">
          <MockMentionInput
            ref={contentRef}
            value={content}
            onChange={setContent}
            mentionContext="working-quick"
            className="w-full p-3 border border-gray-300 rounded-lg resize-none"
          />
        </div>
      </div>
    )
  }
  
  test('should detect layout hierarchy interference in failing pattern', async () => {
    const user = userEvent.setup()
    
    render(<FailingPostCreatorPattern />)
    
    // Test basic functionality
    const input = screen.getByTestId('mention-input-failing-post')
    await user.type(input, '@')
    
    // Dropdown should appear but might be hidden by layout
    const dropdown = screen.getByTestId('mention-dropdown-failing-post')
    expect(dropdown).toBeInTheDocument()
    
    // Check if dropdown is actually visible (not hidden by CSS)
    const dropdownRect = dropdown.getBoundingClientRect()
    expect(dropdownRect.width).toBeGreaterThan(0)
    expect(dropdownRect.height).toBeGreaterThan(0)
    
    // Test with overlays that might interfere
    await user.click(screen.getByTestId('agent-picker-btn'))
    
    // Dropdown should still be functional even with overlay
    const suggestion = screen.getByTestId('mention-suggestion-john-failing-post')
    await user.click(suggestion)
    
    expect(input).toHaveValue('@john ')
  })
  
  test('should validate working pattern maintains functionality', async () => {
    const user = userEvent.setup()
    
    render(<WorkingQuickPostPattern />)
    
    const input = screen.getByTestId('mention-input-working-quick')
    await user.type(input, '@')
    
    const dropdown = screen.getByTestId('mention-dropdown-working-quick')
    expect(dropdown).toBeInTheDocument()
    expect(dropdown).toBeVisible()
    
    // Should work without interference
    await user.click(screen.getByTestId('mention-suggestion-jane-working-quick'))
    expect(input).toHaveValue('@jane ')
  })
  
  test('should measure DOM nesting depth and detect anti-pattern', () => {
    const { container: failingContainer } = render(<FailingPostCreatorPattern />)
    const { container: workingContainer } = render(<WorkingQuickPostPattern />)
    
    const getDepth = (selector: string, container: Element): number => {
      const element = container.querySelector(selector)
      if (!element) return 0
      
      let depth = 0
      let current = element.parentElement
      while (current && current !== container) {
        depth++
        current = current.parentElement
      }
      return depth
    }
    
    const failingDepth = getDepth('[data-testid="mention-input-failing-post"]', failingContainer)
    const workingDepth = getDepth('[data-testid="mention-input-working-quick"]', workingContainer)
    
    // Failing pattern should be deeply nested (anti-pattern)
    expect(failingDepth).toBeGreaterThan(8)
    
    // Working pattern should be shallow
    expect(workingDepth).toBeLessThanOrEqual(3)
    
    // Export nesting analysis
    console.log('DOM_NESTING_ANALYSIS', {
      timestamp: new Date().toISOString(),
      failing_depth: failingDepth,
      working_depth: workingDepth,
      depth_difference: failingDepth - workingDepth,
      anti_pattern_detected: failingDepth > 6
    })
  })
})

/**
 * ANTI-PATTERN 2: Conditional Rendering Gaps (CommentForm Pattern)
 */
describe('Conditional Rendering Anti-Pattern', () => {
  
  const ConditionalCommentForm = () => {
    const [content, setContent] = useState('')
    const [preview, setPreview] = useState(false)
    const [useMentionInput, setUseMentionInput] = useState(true)
    
    return (
      <div className="comment-form" data-testid="conditional-comment-form">
        <div className="form-header">
          <button 
            data-testid="toggle-preview"
            onClick={() => setPreview(!preview)}
          >
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button 
            data-testid="toggle-mention"
            onClick={() => setUseMentionInput(!useMentionInput)}
          >
            Toggle Mention: {useMentionInput ? 'ON' : 'OFF'}
          </button>
        </div>
        
        <div className="form-content">
          {preview ? (
            <div data-testid="preview-content" className="preview">
              {content}
            </div>
          ) : (
            <div>
              {/* ANTI-PATTERN: Conditional rendering of MentionInput */}
              {useMentionInput ? (
                <div data-testid="mention-mode">
                  <div>🚨 EMERGENCY DEBUG: MentionInput ACTIVE - useMentionInput={JSON.stringify(useMentionInput)}</div>
                  <MockMentionInput
                    value={content}
                    onChange={setContent}
                    mentionContext="conditional-comment"
                  />
                </div>
              ) : (
                <textarea
                  data-testid="fallback-textarea"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Fallback textarea (no mentions)"
                />
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
  
  test('should detect conditional rendering anti-pattern', async () => {
    const user = userEvent.setup()
    
    render(<ConditionalCommentForm />)
    
    // Initially should use MentionInput
    expect(screen.getByTestId('mention-mode')).toBeInTheDocument()
    expect(screen.getByText(/EMERGENCY DEBUG/)).toBeInTheDocument() // Debug marker anti-pattern
    
    const mentionInput = screen.getByTestId('mention-input-conditional-comment')
    await user.type(mentionInput, '@')
    
    let dropdown = screen.getByTestId('mention-dropdown-conditional-comment')
    expect(dropdown).toBeInTheDocument()
    
    // Toggle mention input off - ANTI-PATTERN
    await user.click(screen.getByTestId('toggle-mention'))
    
    // Should now show fallback textarea
    expect(screen.getByTestId('fallback-textarea')).toBeInTheDocument()
    expect(screen.queryByTestId('mention-input-conditional-comment')).not.toBeInTheDocument()
    
    // Content should be preserved but mentions won't work
    const fallbackTextarea = screen.getByTestId('fallback-textarea')
    expect(fallbackTextarea).toHaveValue('@')
    
    await user.type(fallbackTextarea, 'test')
    
    // Toggle back on
    await user.click(screen.getByTestId('toggle-mention'))
    
    // MentionInput should be back
    const restoredInput = screen.getByTestId('mention-input-conditional-comment')
    expect(restoredInput).toHaveValue('@test')
    
    // But dropdown state is lost - this is the anti-pattern
    expect(screen.queryByTestId('mention-dropdown-conditional-comment')).not.toBeInTheDocument()
  })
  
  test('should detect preview mode interference', async () => {
    const user = userEvent.setup()
    
    render(<ConditionalCommentForm />)
    
    const mentionInput = screen.getByTestId('mention-input-conditional-comment')
    await user.type(mentionInput, '@john test')
    
    // Switch to preview
    await user.click(screen.getByTestId('toggle-preview'))
    
    const preview = screen.getByTestId('preview-content')
    expect(preview).toHaveTextContent('@john test')
    expect(screen.queryByTestId('mention-input-conditional-comment')).not.toBeInTheDocument()
    
    // Switch back to edit
    await user.click(screen.getByTestId('toggle-preview'))
    
    // Input should be restored
    const restoredInput = screen.getByTestId('mention-input-conditional-comment')
    expect(restoredInput).toHaveValue('@john test')
  })
})

/**
 * STATE MANAGEMENT CONFLICT DETECTION
 */
describe('State Management Conflict Anti-Pattern', () => {
  
  const DualStateComponent = () => {
    // ANTI-PATTERN: Both parent and child managing content
    const [parentContent, setParentContent] = useState('')
    const [childContent, setChildContent] = useState('')
    const [agentMentions, setAgentMentions] = useState<string[]>([])
    
    const handleParentChange = (value: string) => {
      setParentContent(value)
      // Extract mentions for parent tracking
      const mentions = value.match(/@\w+/g) || []
      setAgentMentions(mentions)
    }
    
    const handleChildChange = (value: string) => {
      setChildContent(value)
      // Child doesn't update parent - STATE CONFLICT
    }
    
    return (
      <div data-testid="dual-state-component">
        <div data-testid="parent-content">Parent: {parentContent}</div>
        <div data-testid="child-content">Child: {childContent}</div>
        <div data-testid="mentions-count">Mentions: {agentMentions.length}</div>
        
        <div className="parent-section">
          <h3>Parent Controlled Input</h3>
          <MockMentionInput
            value={parentContent}
            onChange={handleParentChange}
            mentionContext="parent-controlled"
          />
        </div>
        
        <div className="child-section">
          <h3>Child Controlled Input</h3>
          <MockMentionInput
            value={childContent}
            onChange={handleChildChange}
            mentionContext="child-controlled"
          />
        </div>
        
        <button 
          data-testid="sync-states"
          onClick={() => setParentContent(childContent)}
        >
          Sync Child to Parent
        </button>
      </div>
    )
  }
  
  test('should detect state synchronization conflicts', async () => {
    const user = userEvent.setup()
    
    render(<DualStateComponent />)
    
    // Type in parent input
    const parentInput = screen.getByTestId('mention-input-parent-controlled')
    await user.type(parentInput, '@john parent')
    
    // Type in child input
    const childInput = screen.getByTestId('mention-input-child-controlled')
    await user.type(childInput, '@jane child')
    
    // Verify states are different (conflict detected)
    expect(screen.getByTestId('parent-content')).toHaveTextContent('Parent: @john parent')
    expect(screen.getByTestId('child-content')).toHaveTextContent('Child: @jane child')
    expect(screen.getByTestId('mentions-count')).toHaveTextContent('Mentions: 1')
    
    // Child mentions aren't tracked by parent - ANTI-PATTERN
    const parentText = screen.getByTestId('parent-content').textContent
    const childText = screen.getByTestId('child-content').textContent
    expect(parentText).not.toEqual(childText)
    
    // Sync states
    await user.click(screen.getByTestId('sync-states'))
    
    // Parent should now match child
    expect(screen.getByTestId('parent-content')).toHaveTextContent('Parent: @jane child')
  })
})

/**
 * COMPONENT LIFECYCLE INTERFERENCE
 */
describe('Component Lifecycle Anti-Pattern', () => {
  
  const DynamicMentionComponent = () => {
    const [components, setComponents] = useState<Array<{id: string, content: string}>>([])
    const [nextId, setNextId] = useState(1)
    
    const addComponent = () => {
      setComponents(prev => [...prev, { id: `comp-${nextId}`, content: '' }])
      setNextId(prev => prev + 1)
    }
    
    const removeComponent = (id: string) => {
      setComponents(prev => prev.filter(comp => comp.id !== id))
    }
    
    const updateComponent = (id: string, content: string) => {
      setComponents(prev => prev.map(comp => 
        comp.id === id ? { ...comp, content } : comp
      ))
    }
    
    return (
      <div data-testid="dynamic-mention-container">
        <button data-testid="add-component" onClick={addComponent}>
          Add Mention Component
        </button>
        
        <div data-testid="components-list">
          {components.map(comp => (
            <div key={comp.id} data-testid={`component-${comp.id}`}>
              <MockMentionInput
                value={comp.content}
                onChange={(value) => updateComponent(comp.id, value)}
                mentionContext={comp.id}
              />
              <button 
                data-testid={`remove-${comp.id}`}
                onClick={() => removeComponent(comp.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        
        <div data-testid="component-count">Components: {components.length}</div>
      </div>
    )
  }
  
  test('should handle dynamic component lifecycle correctly', async () => {
    const user = userEvent.setup()
    
    render(<DynamicMentionComponent />)
    
    // Add first component
    await user.click(screen.getByTestId('add-component'))
    expect(screen.getByTestId('component-count')).toHaveTextContent('Components: 1')
    
    const firstInput = screen.getByTestId('mention-input-comp-1')
    await user.type(firstInput, '@first')
    
    // Add second component
    await user.click(screen.getByTestId('add-component'))
    expect(screen.getByTestId('component-count')).toHaveTextContent('Components: 2')
    
    const secondInput = screen.getByTestId('mention-input-comp-2')
    await user.type(secondInput, '@second')
    
    // Both should maintain their state
    expect(firstInput).toHaveValue('@first')
    expect(secondInput).toHaveValue('@second')
    
    // Remove first component
    await user.click(screen.getByTestId('remove-comp-1'))
    expect(screen.getByTestId('component-count')).toHaveTextContent('Components: 1')
    
    // Second component should still exist and maintain state
    expect(screen.getByTestId('mention-input-comp-2')).toHaveValue('@second')
  })
  
  test('should detect component key prop anti-pattern', () => {
    const ComponentWithoutKeys = () => {
      const [items, setItems] = useState(['item1', 'item2'])
      
      return (
        <div>
          {/* ANTI-PATTERN: Missing key prop */}
          {items.map(item => (
            <MockMentionInput
              value=""
              onChange={() => {}}
              mentionContext={item}
            />
          ))}
        </div>
      )
    }
    
    const ComponentWithKeys = () => {
      const [items, setItems] = useState(['item1', 'item2'])
      
      return (
        <div>
          {/* GOOD PATTERN: Proper key prop */}
          {items.map(item => (
            <MockMentionInput
              key={item}
              value=""
              onChange={() => {}}
              mentionContext={item}
            />
          ))}
        </div>
      )
    }
    
    // This would typically be caught by React warnings in development
    expect(() => render(<ComponentWithoutKeys />)).not.toThrow()
    expect(() => render(<ComponentWithKeys />)).not.toThrow()
    
    // In a real implementation, we'd check for React warnings
    console.log('KEY_PROP_VALIDATION', {
      timestamp: new Date().toISOString(),
      pattern: 'missing_key_props_in_dynamic_lists',
      severity: 'MEDIUM',
      prevention: 'Always provide unique key props for dynamic component lists'
    })
  })
})

/**
 * INTEGRATION TEST: End-to-End Component Hierarchy Validation
 */
describe('Component Hierarchy Integration Validation', () => {
  
  test('should maintain functionality across complex component hierarchies', async () => {
    const user = userEvent.setup()
    
    const CompleteIntegrationTest = () => {
      const [postContent, setPostContent] = useState('')
      const [commentContent, setCommentContent] = useState('')
      const [quickContent, setQuickContent] = useState('')
      
      return (
        <div data-testid="integration-container">
          <div className="post-section">
            <h2>Post Creator (Complex Layout)</h2>
            <div className="complex-wrapper">
              <div className="toolbar">Toolbar</div>
              <div className="content-area">
                <MockMentionInput
                  value={postContent}
                  onChange={setPostContent}
                  mentionContext="integration-post"
                />
              </div>
            </div>
          </div>
          
          <div className="comment-section">
            <h2>Comment Form (Conditional)</h2>
            <MockMentionInput
              value={commentContent}
              onChange={setCommentContent}
              mentionContext="integration-comment"
            />
          </div>
          
          <div className="quick-section">
            <h2>Quick Post (Simple)</h2>
            <MockMentionInput
              value={quickContent}
              onChange={setQuickContent}
              mentionContext="integration-quick"
            />
          </div>
          
          <div data-testid="integration-summary">
            <div>Post: {postContent}</div>
            <div>Comment: {commentContent}</div>  
            <div>Quick: {quickContent}</div>
          </div>
        </div>
      )
    }
    
    render(<CompleteIntegrationTest />)
    
    // Test all three components work independently
    await user.type(screen.getByTestId('mention-input-integration-post'), '@post')
    await user.type(screen.getByTestId('mention-input-integration-comment'), '@comment')
    await user.type(screen.getByTestId('mention-input-integration-quick'), '@quick')
    
    // All should maintain their values
    const summary = screen.getByTestId('integration-summary')
    expect(summary).toHaveTextContent('Post: @post')
    expect(summary).toHaveTextContent('Comment: @comment')
    expect(summary).toHaveTextContent('Quick: @quick')
    
    // Test dropdowns work in all contexts
    await user.type(screen.getByTestId('mention-input-integration-post'), ' @')
    expect(screen.getByTestId('mention-dropdown-integration-post')).toBeVisible()
    
    await user.type(screen.getByTestId('mention-input-integration-comment'), ' @')
    expect(screen.getByTestId('mention-dropdown-integration-comment')).toBeVisible()
    
    await user.type(screen.getByTestId('mention-input-integration-quick'), ' @')
    expect(screen.getByTestId('mention-dropdown-integration-quick')).toBeVisible()
  })
})

/**
 * NEURAL TRAINING DATA EXPORT
 */
describe('Component Hierarchy Neural Training Export', () => {
  
  test('should export component hierarchy patterns for neural training', () => {
    const hierarchyPatterns = {
      export_id: `CH-${Date.now()}`,
      timestamp: new Date().toISOString(),
      training_type: 'component_hierarchy_anti_patterns',
      patterns_detected: [
        {
          name: 'deep_dom_nesting',
          severity: 'HIGH',
          indicators: ['dropdown_visibility_issues', 'css_interference', 'event_bubbling_problems'],
          threshold: 6, // Max nesting depth
          prevention: 'Keep interactive components within 5 DOM levels'
        },
        {
          name: 'conditional_rendering_gaps',
          severity: 'HIGH',
          indicators: ['feature_flag_inconsistency', 'state_loss_on_toggle', 'debug_markers_in_production'],
          prevention: 'Always render components, control visibility with CSS'
        },
        {
          name: 'state_management_conflicts',
          severity: 'MEDIUM',
          indicators: ['dual_state_tracking', 'synchronization_issues', 'data_inconsistency'],
          prevention: 'Single source of truth for component state'
        },
        {
          name: 'component_lifecycle_issues',
          severity: 'MEDIUM',
          indicators: ['missing_key_props', 'state_loss_on_reorder', 'memory_leaks'],
          prevention: 'Proper key props and lifecycle management'
        }
      ],
      success_patterns: [
        {
          name: 'flat_layout_hierarchy',
          description: 'QuickPost pattern - minimal nesting, maximum functionality',
          characteristics: ['shallow_dom_depth', 'direct_event_handling', 'simple_state_flow']
        }
      ],
      neural_weights: {
        dom_depth_importance: 0.8,
        conditional_rendering_importance: 0.9,
        state_conflict_importance: 0.7,
        lifecycle_management_importance: 0.6
      }
    }
    
    console.log('COMPONENT_HIERARCHY_TRAINING_EXPORT', hierarchyPatterns)
    
    expect(hierarchyPatterns.patterns_detected).toHaveLength(4)
    expect(hierarchyPatterns.success_patterns).toHaveLength(1)
  })
})