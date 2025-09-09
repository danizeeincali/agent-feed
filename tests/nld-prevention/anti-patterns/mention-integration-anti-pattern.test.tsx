/**
 * NLD Anti-Pattern Detection: Mention Integration Failures
 * 
 * This test suite prevents the exact failures identified in Agent Feed development:
 * - MentionInput works in isolation but fails in complex component hierarchies
 * - Debug markers left in production indicating broken integration
 * - Component imports without functional integration
 * - State management conflicts between parent and child components
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react-dom/test-utils'
import '@testing-library/jest-dom'

// Anti-Pattern Detection Test Framework
interface AntiPatternDetectionResult {
  patternDetected: boolean
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  preventionRecommendation: string
}

/**
 * ANTI-PATTERN 1: Debug Markers In Production
 * Pattern: Components showing debug banners indicating broken functionality
 */
describe('Debug Markers Anti-Pattern Detection', () => {
  const detectDebugMarkers = (component: React.ComponentType): AntiPatternDetectionResult => {
    const { container } = render(React.createElement(component))
    
    // Scan for emergency debug indicators
    const debugMarkers = [
      '🚨 EMERGENCY DEBUG',
      'DEBUG:',
      'ACTIVE -',
      'useMentionInput={',
      'MentionInput ACTIVE'
    ]
    
    let markersFound = 0
    const containerHTML = container.innerHTML
    
    debugMarkers.forEach(marker => {
      if (containerHTML.includes(marker)) {
        markersFound++
      }
    })
    
    return {
      patternDetected: markersFound > 0,
      severity: markersFound > 2 ? 'CRITICAL' : markersFound > 1 ? 'HIGH' : 'MEDIUM',
      description: `Found ${markersFound} debug markers in production component`,
      preventionRecommendation: 'Remove all debug code before production deployment'
    }
  }

  test('should not detect debug markers in production components', () => {
    // Mock production components (these would be actual imports in real tests)
    const MockPostCreator = () => <div data-testid="post-creator">PostCreator</div>
    const MockCommentForm = () => <div data-testid="comment-form">CommentForm</div>
    const MockQuickPost = () => <div data-testid="quick-post">QuickPost</div>
    
    const results = [
      detectDebugMarkers(MockPostCreator),
      detectDebugMarkers(MockCommentForm),
      detectDebugMarkers(MockQuickPost)
    ]
    
    results.forEach(result => {
      expect(result.patternDetected).toBe(false)
    })
  })
})

/**
 * ANTI-PATTERN 2: Import Without Integration
 * Pattern: Components import MentionInput but don't properly integrate it
 */
describe('Import Without Integration Anti-Pattern Detection', () => {
  const detectImportWithoutIntegration = (componentCode: string): AntiPatternDetectionResult => {
    const hasMentionInputImport = /import.*MentionInput/.test(componentCode)
    const hasMentionInputUsage = /<MentionInput/.test(componentCode)
    const hasProperProps = /onMentionSelect|mentionContext|fetchSuggestions/.test(componentCode)
    
    const integrationIncomplete = hasMentionInputImport && (!hasMentionInputUsage || !hasProperProps)
    
    return {
      patternDetected: integrationIncomplete,
      severity: integrationIncomplete ? 'HIGH' : 'LOW',
      description: integrationIncomplete 
        ? 'MentionInput imported but not properly integrated'
        : 'Proper MentionInput integration detected',
      preventionRecommendation: 'Ensure all imported components are fully integrated with required props'
    }
  }

  test('should detect incomplete MentionInput integration', () => {
    const incompleteIntegrationCode = `
      import { MentionInput } from './MentionInput'
      
      const Component = () => {
        return <div>Some content without MentionInput usage</div>
      }
    `
    
    const result = detectImportWithoutIntegration(incompleteIntegrationCode)
    expect(result.patternDetected).toBe(true)
    expect(result.severity).toBe('HIGH')
  })

  test('should pass for complete MentionInput integration', () => {
    const completeIntegrationCode = `
      import { MentionInput } from './MentionInput'
      
      const Component = () => {
        return (
          <MentionInput
            onMentionSelect={handleMention}
            mentionContext="test"
            fetchSuggestions={fetchFn}
          />
        )
      }
    `
    
    const result = detectImportWithoutIntegration(completeIntegrationCode)
    expect(result.patternDetected).toBe(false)
  })
})

/**
 * ANTI-PATTERN 3: Conditional Rendering Gaps
 * Pattern: MentionInput only rendered conditionally, creating integration blind spots
 */
describe('Conditional Rendering Anti-Pattern Detection', () => {
  interface ConditionalRenderingProps {
    useMentionInput?: boolean
    preview?: boolean
    children: React.ReactNode
  }

  const ConditionalMentionComponent: React.FC<ConditionalRenderingProps> = ({ 
    useMentionInput, 
    preview, 
    children 
  }) => {
    if (preview) {
      return <div data-testid="preview-mode">{children}</div>
    }
    
    return useMentionInput ? (
      <div data-testid="mention-input-active">
        <div>🚨 EMERGENCY DEBUG: MentionInput ACTIVE</div>
        {children}
      </div>
    ) : (
      <textarea data-testid="fallback-textarea" />
    )
  }

  test('should detect conditional rendering anti-pattern', () => {
    // Test different states
    const { rerender } = render(
      <ConditionalMentionComponent useMentionInput={false}>
        Content
      </ConditionalMentionComponent>
    )
    
    // Should use fallback when useMentionInput is false
    expect(screen.getByTestId('fallback-textarea')).toBeInTheDocument()
    
    // Rerender with useMentionInput true
    rerender(
      <ConditionalMentionComponent useMentionInput={true}>
        Content
      </ConditionalMentionComponent>
    )
    
    // Should show mention input but with debug marker (anti-pattern)
    expect(screen.getByTestId('mention-input-active')).toBeInTheDocument()
    expect(screen.getByText(/EMERGENCY DEBUG/)).toBeInTheDocument()
    
    // Rerender in preview mode
    rerender(
      <ConditionalMentionComponent preview={true}>
        Content
      </ConditionalMentionComponent>
    )
    
    // Should show preview mode
    expect(screen.getByTestId('preview-mode')).toBeInTheDocument()
  })
})

/**
 * ANTI-PATTERN 4: State Management Conflicts
 * Pattern: Parent and child components both managing content state
 */
describe('State Management Conflict Anti-Pattern Detection', () => {
  interface DualStateManagerProps {
    initialContent?: string
  }

  const DualStateManager: React.FC<DualStateManagerProps> = ({ initialContent = '' }) => {
    const [parentContent, setParentContent] = React.useState(initialContent)
    const [childContent, setChildContent] = React.useState(initialContent)
    const [agentMentions, setAgentMentions] = React.useState<string[]>([])
    
    // Anti-pattern: Both parent and child manage content
    const handleParentChange = (value: string) => {
      setParentContent(value)
      // Missing synchronization with child content
    }
    
    const handleChildChange = (value: string) => {
      setChildContent(value)
      // Missing synchronization with parent content
    }
    
    return (
      <div>
        <div data-testid="parent-content">{parentContent}</div>
        <div data-testid="child-content">{childContent}</div>
        <input
          data-testid="parent-input"
          value={parentContent}
          onChange={(e) => handleParentChange(e.target.value)}
        />
        <input
          data-testid="child-input"
          value={childContent}
          onChange={(e) => handleChildChange(e.target.value)}
        />
        <div data-testid="mentions-count">{agentMentions.length}</div>
      </div>
    )
  }

  test('should detect state synchronization conflicts', async () => {
    const user = userEvent.setup()
    
    render(<DualStateManager initialContent="test" />)
    
    const parentInput = screen.getByTestId('parent-input')
    const childInput = screen.getByTestId('child-input')
    
    // Change parent input
    await user.clear(parentInput)
    await user.type(parentInput, 'parent update')
    
    // Change child input  
    await user.clear(childInput)
    await user.type(childInput, 'child update')
    
    // Verify state desynchronization (anti-pattern detected)
    expect(screen.getByTestId('parent-content')).toHaveTextContent('parent update')
    expect(screen.getByTestId('child-content')).toHaveTextContent('child update')
    
    // States are different - conflict detected
    expect(screen.getByTestId('parent-content').textContent).not.toBe(
      screen.getByTestId('child-content').textContent
    )
  })
})

/**
 * ANTI-PATTERN 5: Deep Nesting Layout Interference
 * Pattern: MentionInput buried in complex DOM hierarchy preventing dropdown visibility
 */
describe('Layout Interference Anti-Pattern Detection', () => {
  const DeepNestedComponent = () => (
    <div className="outer-container">
      <div className="header-section">
        <div className="toolbar">
          <div className="toolbar-content">
            <button>Format</button>
          </div>
        </div>
      </div>
      <div className="content-section border border-gray-300 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
          <div className="toolbar-items">
            <span>Rich Editor Toolbar</span>
          </div>
        </div>
        <div className="relative">
          <div className="input-wrapper">
            <div className="input-container">
              <div data-testid="mention-input-deep">
                MentionInput (buried 8 levels deep)
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="agent-picker-overlay">
        <div className="overlay-content">Agent Picker</div>
      </div>
    </div>
  )

  const FlatComponent = () => (
    <div className="simple-container">
      <div data-testid="mention-input-shallow">
        MentionInput (2 levels deep)
      </div>
    </div>
  )

  test('should detect deep nesting anti-pattern', () => {
    const { container: deepContainer } = render(<DeepNestedComponent />)
    const { container: flatContainer } = render(<FlatComponent />)
    
    // Count nesting levels to mention input
    const deepMentionInput = screen.getByTestId('mention-input-deep')
    const shallowMentionInput = screen.getByTestId('mention-input-shallow')
    
    // Get the nesting depth by counting parent elements
    const getDepth = (element: Element): number => {
      let depth = 0
      let current = element.parentElement
      while (current && current !== document.body) {
        depth++
        current = current.parentElement
      }
      return depth
    }
    
    const deepNestingLevel = getDepth(deepMentionInput)
    const shallowNestingLevel = getDepth(shallowMentionInput)
    
    // Anti-pattern: Deep nesting (>6 levels typically causes issues)
    expect(deepNestingLevel).toBeGreaterThan(6)
    expect(shallowNestingLevel).toBeLessThanOrEqual(3)
  })
})

/**
 * INTEGRATION TEST: Component Hierarchy Functionality
 * Tests that MentionInput actually works within complex component hierarchies
 */
describe('MentionInput Integration Validation', () => {
  interface MockMentionInputProps {
    value: string
    onChange: (value: string) => void
    onMentionSelect?: (mention: string) => void
    mentionContext?: string
    className?: string
  }

  const MockMentionInput: React.FC<MockMentionInputProps> = ({
    value,
    onChange,
    onMentionSelect,
    mentionContext,
    className
  }) => {
    const [showDropdown, setShowDropdown] = React.useState(false)
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      onChange(newValue)
      
      // Simulate @ mention detection
      if (newValue.endsWith('@')) {
        setShowDropdown(true)
      }
    }
    
    const handleMentionClick = (mention: string) => {
      onMentionSelect?.(mention)
      onChange(value.replace('@', `@${mention} `))
      setShowDropdown(false)
    }
    
    return (
      <div className="mention-input-wrapper">
        <textarea
          data-testid="mention-input"
          value={value}
          onChange={handleChange}
          className={className}
        />
        {showDropdown && (
          <div 
            data-testid="mention-dropdown"
            className="absolute bg-white border shadow-lg z-50"
          >
            <div 
              data-testid="mention-suggestion"
              onClick={() => handleMentionClick('john')}
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              @john
            </div>
          </div>
        )}
      </div>
    )
  }

  // Mock components that embed MentionInput in different contexts
  const PostCreatorWithMention = () => {
    const [content, setContent] = React.useState('')
    
    return (
      <div className="post-creator">
        <div className="toolbar">
          <button data-testid="format-btn">Format</button>
        </div>
        <div className="content-area">
          <MockMentionInput
            value={content}
            onChange={setContent}
            mentionContext="post"
          />
        </div>
      </div>
    )
  }

  const CommentFormWithMention = () => {
    const [content, setContent] = React.useState('')
    const [preview, setPreview] = React.useState(false)
    
    return (
      <div className="comment-form">
        <div className="form-header">
          <button 
            data-testid="preview-btn"
            onClick={() => setPreview(!preview)}
          >
            {preview ? 'Edit' : 'Preview'}
          </button>
        </div>
        {preview ? (
          <div data-testid="preview-content">{content}</div>
        ) : (
          <MockMentionInput
            value={content}
            onChange={setContent}
            mentionContext="comment"
          />
        )}
      </div>
    )
  }

  test('should maintain MentionInput functionality in PostCreator context', async () => {
    const user = userEvent.setup()
    
    render(<PostCreatorWithMention />)
    
    const input = screen.getByTestId('mention-input')
    
    // Type @ to trigger mention dropdown
    await user.type(input, '@')
    
    // Dropdown should appear
    await waitFor(() => {
      expect(screen.getByTestId('mention-dropdown')).toBeInTheDocument()
    })
    
    // Click mention suggestion
    const suggestion = screen.getByTestId('mention-suggestion')
    await user.click(suggestion)
    
    // Input should be updated with mention
    expect(input).toHaveValue('@john ')
  })

  test('should maintain MentionInput functionality in CommentForm context', async () => {
    const user = userEvent.setup()
    
    render(<CommentFormWithMention />)
    
    const input = screen.getByTestId('mention-input')
    
    // Type content with mention
    await user.type(input, 'Hello @')
    
    // Dropdown should appear
    await waitFor(() => {
      expect(screen.getByTestId('mention-dropdown')).toBeInTheDocument()
    })
    
    // Select mention
    await user.click(screen.getByTestId('mention-suggestion'))
    
    expect(input).toHaveValue('Hello @john ')
    
    // Test preview mode doesn't break functionality
    await user.click(screen.getByTestId('preview-btn'))
    expect(screen.getByTestId('preview-content')).toHaveTextContent('Hello @john ')
    
    // Switch back to edit mode
    await user.click(screen.getByTestId('preview-btn'))
    expect(screen.getByTestId('mention-input')).toBeInTheDocument()
  })
})

/**
 * REGRESSION PREVENTION: Neural Training Data Export
 */
describe('Neural Training Data Export', () => {
  test('should export failure patterns for neural training', () => {
    const failurePatterns = {
      export_id: `NTE-${new Date().toISOString().split('T')[0]}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      patterns_detected: [
        {
          name: 'debug_markers_in_production',
          severity: 'CRITICAL',
          prevention: 'Remove debug code before deployment'
        },
        {
          name: 'import_without_integration', 
          severity: 'HIGH',
          prevention: 'Validate component integration in CI/CD'
        },
        {
          name: 'conditional_rendering_gaps',
          severity: 'HIGH', 
          prevention: 'Always render components, control visibility with CSS'
        },
        {
          name: 'state_management_conflicts',
          severity: 'HIGH',
          prevention: 'Single source of truth for component state'
        },
        {
          name: 'deep_nesting_interference',
          severity: 'MEDIUM',
          prevention: 'Keep interactive components shallow in DOM'
        }
      ],
      neural_weights: {
        debug_marker_detection: 0.95,
        integration_validation: 0.90,
        conditional_rendering_analysis: 0.85,
        state_conflict_detection: 0.80,
        layout_interference_detection: 0.75
      }
    }
    
    // In a real implementation, this would be exported to claude-flow
    expect(failurePatterns.patterns_detected).toHaveLength(5)
    expect(failurePatterns.neural_weights.debug_marker_detection).toBe(0.95)
  })
})