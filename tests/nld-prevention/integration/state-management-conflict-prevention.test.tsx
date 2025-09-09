/**
 * NLD State Management Conflict Prevention
 * 
 * Prevents the exact state management failures from Agent Feed:
 * - Parent components managing content state while MentionInput also manages state
 * - Event handler conflicts between parent onChange and MentionInput internal handlers
 * - State synchronization issues causing lost data
 * - Multiple sources of truth causing inconsistent behavior
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Mock MentionInput with internal state management
interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  onMentionSelect?: (mention: string) => void
  mentionContext?: string
  className?: string
  ref?: React.Ref<HTMLTextAreaElement>
}

const MentionInputWithInternalState = React.forwardRef<HTMLTextAreaElement, MentionInputProps>(({
  value: externalValue,
  onChange: externalOnChange,
  onMentionSelect,
  mentionContext = 'default',
  className
}, ref) => {
  // INTERNAL STATE - This can conflict with parent state
  const [internalValue, setInternalValue] = useState(externalValue)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [mentionStartPos, setMentionStartPos] = useState(-1)
  
  // Sync external value changes to internal state
  useEffect(() => {
    if (externalValue !== internalValue) {
      setInternalValue(externalValue)
    }
  }, [externalValue, internalValue])
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart
    
    // Update internal state first
    setInternalValue(newValue)
    setCursorPosition(cursorPos)
    
    // Check for @ mention trigger
    const textBeforeCursor = newValue.slice(0, cursorPos)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)
    
    if (mentionMatch) {
      setMentionStartPos(textBeforeCursor.lastIndexOf('@'))
      setShowDropdown(true)
    } else {
      setShowDropdown(false)
      setMentionStartPos(-1)
    }
    
    // Call external onChange - POTENTIAL CONFLICT POINT
    externalOnChange(newValue)
  }
  
  const handleMentionSelect = (mention: string) => {
    if (mentionStartPos === -1) return
    
    const beforeMention = internalValue.slice(0, mentionStartPos)
    const afterCursor = internalValue.slice(cursorPosition)
    const newValue = `${beforeMention}@${mention} ${afterCursor}`
    
    setInternalValue(newValue)
    setShowDropdown(false)
    setMentionStartPos(-1)
    setCursorPosition(beforeMention.length + mention.length + 2)
    
    onMentionSelect?.(mention)
    externalOnChange(newValue)
  }
  
  return (
    <div className="mention-input-container" data-testid={`mention-container-${mentionContext}`}>
      <textarea
        ref={ref}
        data-testid={`mention-input-${mentionContext}`}
        value={internalValue}
        onChange={handleChange}
        className={className}
        placeholder={`Type @ to mention (context: ${mentionContext})`}
      />
      
      {showDropdown && (
        <div 
          data-testid={`mention-dropdown-${mentionContext}`}
          className="absolute bg-white border shadow-lg z-50 mt-1"
        >
          <div 
            data-testid={`mention-option-john-${mentionContext}`}
            onClick={() => handleMentionSelect('john')}
            className="p-2 hover:bg-gray-100 cursor-pointer"
          >
            @john
          </div>
          <div 
            data-testid={`mention-option-jane-${mentionContext}`}
            onClick={() => handleMentionSelect('jane')}
            className="p-2 hover:bg-gray-100 cursor-pointer"
          >
            @jane
          </div>
        </div>
      )}
      
      <div data-testid={`state-debug-${mentionContext}`} className="text-xs text-gray-500 mt-1">
        Internal: "{internalValue}" | External: "{externalValue}" | Cursor: {cursorPosition}
      </div>
    </div>
  )
})

MentionInputWithInternalState.displayName = 'MentionInputWithInternalState'

/**
 * ANTI-PATTERN 1: Dual State Management
 * Parent and child both managing the same content state
 */
describe('Dual State Management Anti-Pattern', () => {
  
  const DualStateComponent = () => {
    // PARENT STATE MANAGEMENT
    const [parentContent, setParentContent] = useState('')
    const [parentMentions, setParentMentions] = useState<string[]>([])
    const [charCount, setCharCount] = useState(0)
    
    // Parent tries to control child state - ANTI-PATTERN
    const handleParentChange = useCallback((value: string) => {
      setParentContent(value)
      setCharCount(value.length)
      
      // Parent extracts mentions separately
      const mentions = value.match(/@(\w+)/g) || []
      setParentMentions(mentions)
    }, [])
    
    const handleMentionSelect = useCallback((mention: string) => {
      // Parent tries to track mentions separately - CONFLICT POTENTIAL
      setParentMentions(prev => [...prev, `@${mention}`])
    }, [])
    
    return (
      <div data-testid="dual-state-component">
        <div className="parent-state-display">
          <div data-testid="parent-content">Parent Content: {parentContent}</div>
          <div data-testid="parent-mentions">Parent Mentions: {parentMentions.join(', ')}</div>
          <div data-testid="parent-char-count">Parent Char Count: {charCount}</div>
        </div>
        
        <div className="input-section">
          <MentionInputWithInternalState
            value={parentContent}
            onChange={handleParentChange}
            onMentionSelect={handleMentionSelect}
            mentionContext="dual-state"
            className="w-full p-2 border"
          />
        </div>
        
        <button 
          data-testid="reset-parent"
          onClick={() => {
            setParentContent('')
            setParentMentions([])
            setCharCount(0)
          }}
        >
          Reset Parent State
        </button>
      </div>
    )
  }
  
  test('should detect state synchronization conflicts', async () => {
    const user = userEvent.setup()
    
    render(<DualStateComponent />)
    
    const input = screen.getByTestId('mention-input-dual-state')
    
    // Type some content
    await user.type(input, 'Hello @')
    
    // Check state debug info
    const stateDebug = screen.getByTestId('state-debug-dual-state')
    expect(stateDebug).toBeInTheDocument()
    
    // Parent state should match
    expect(screen.getByTestId('parent-content')).toHaveTextContent('Hello @')
    expect(screen.getByTestId('parent-char-count')).toHaveTextContent('7')
    
    // Select a mention
    const dropdown = screen.getByTestId('mention-dropdown-dual-state')
    await user.click(screen.getByTestId('mention-option-john-dual-state'))
    
    // Both parent and child should have updated
    expect(screen.getByTestId('parent-content')).toHaveTextContent('Hello @john ')
    expect(screen.getByTestId('parent-mentions')).toHaveTextContent('@john')
    
    // Continue typing to test ongoing synchronization
    await user.type(input, 'how are you?')
    
    expect(screen.getByTestId('parent-content')).toHaveTextContent('Hello @john how are you?')
    expect(screen.getByTestId('parent-char-count')).toHaveTextContent('25')
  })
  
  test('should detect state desynchronization issues', async () => {
    const user = userEvent.setup()
    
    render(<DualStateComponent />)
    
    const input = screen.getByTestId('mention-input-dual-state')
    
    // Type mention
    await user.type(input, '@jane test')
    await user.click(screen.getByTestId('mention-option-jane-dual-state'))
    
    // Force state desynchronization by directly manipulating input
    await user.clear(input)
    await user.type(input, 'Direct input change')
    
    const stateDebug = screen.getByTestId('state-debug-dual-state')
    const debugText = stateDebug.textContent || ''
    
    // Parse internal vs external state from debug
    const internalMatch = debugText.match(/Internal: "([^"]*)"/)
    const externalMatch = debugText.match(/External: "([^"]*)"/)
    
    const internalState = internalMatch ? internalMatch[1] : ''
    const externalState = externalMatch ? externalMatch[1] : ''
    
    // States should be synchronized (no conflict)
    expect(internalState).toBe(externalState)
    
    // Parent state should also match
    expect(screen.getByTestId('parent-content')).toHaveTextContent('Direct input change')
  })
  
  test('should handle rapid state updates without conflicts', async () => {
    const user = userEvent.setup()
    
    render(<DualStateComponent />)
    
    const input = screen.getByTestId('mention-input-dual-state')
    
    // Rapid typing simulation to test state handling
    const rapidText = 'Fast typing @john @jane @bob'
    
    for (const char of rapidText) {
      await user.type(input, char)
      await new Promise(resolve => setTimeout(resolve, 10)) // Very fast typing
    }
    
    // Wait for all state updates to settle
    await waitFor(() => {
      expect(screen.getByTestId('parent-content')).toHaveTextContent(rapidText)
    }, { timeout: 5000 })
    
    expect(screen.getByTestId('parent-char-count')).toHaveTextContent(rapidText.length.toString())
  })
})

/**
 * ANTI-PATTERN 2: Event Handler Conflicts
 * Multiple event handlers competing for the same events
 */
describe('Event Handler Conflict Anti-Pattern', () => {
  
  const ConflictingEventHandlers = () => {
    const [content, setContent] = useState('')
    const [eventLog, setEventLog] = useState<string[]>([])
    const [conflicts, setConflicts] = useState(0)
    
    const logEvent = (source: string, value: string) => {
      setEventLog(prev => [...prev.slice(-9), `${source}: ${value.slice(0, 20)}...`])
    }
    
    // MULTIPLE CONFLICTING HANDLERS
    const handleParentChange = useCallback((value: string) => {
      logEvent('PARENT', value)
      setContent(value)
      
      // Parent tries to do its own mention processing - CONFLICT
      if (value.includes('@')) {
        setConflicts(prev => prev + 1)
      }
    }, [])
    
    const handleWrapperChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      logEvent('WRAPPER', e.target.value)
      // Wrapper also tries to handle changes - DOUBLE HANDLING
      setContent(e.target.value)
    }, [])
    
    const handleDirectChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      logEvent('DIRECT', e.target.value)
      // Another direct handler - TRIPLE HANDLING
      setContent(e.target.value.toUpperCase()) // Different transformation - CONFLICT
    }, [])
    
    return (
      <div data-testid="conflicting-handlers">
        <div className="event-log">
          <div data-testid="conflict-count">Conflicts: {conflicts}</div>
          <div data-testid="event-log">
            {eventLog.map((event, idx) => (
              <div key={idx} className="text-xs">{event}</div>
            ))}
          </div>
        </div>
        
        <div className="wrapper-section" onChange={handleWrapperChange}>
          <MentionInputWithInternalState
            value={content}
            onChange={handleParentChange}
            mentionContext="conflicting"
            className="w-full p-2 border"
          />
        </div>
        
        <div className="direct-handler-section">
          <textarea
            data-testid="direct-handler-input"
            onChange={handleDirectChange}
            className="w-full p-2 border mt-2"
            placeholder="Direct handler (transforms to uppercase)"
          />
        </div>
        
        <div data-testid="final-content">Final Content: {content}</div>
      </div>
    )
  }
  
  test('should detect event handler conflicts', async () => {
    const user = userEvent.setup()
    
    render(<ConflictingEventHandlers />)
    
    const mentionInput = screen.getByTestId('mention-input-conflicting')
    const directInput = screen.getByTestId('direct-handler-input')
    
    // Type in mention input
    await user.type(mentionInput, 'test @mention')
    
    // Check for conflicts
    const conflictCount = screen.getByTestId('conflict-count')
    expect(conflictCount.textContent).toContain('Conflicts:')
    
    // Type in direct handler input (should transform to uppercase)
    await user.type(directInput, 'direct input')
    
    const finalContent = screen.getByTestId('final-content')
    expect(finalContent).toHaveTextContent('DIRECT INPUT') // Should be uppercase
    
    // Event log should show multiple handlers firing
    const eventLog = screen.getByTestId('event-log')
    expect(eventLog.textContent).toContain('PARENT:')
    expect(eventLog.textContent).toContain('WRAPPER:')
    expect(eventLog.textContent).toContain('DIRECT:')
  })
})

/**
 * ANTI-PATTERN 3: State Update Cascades
 * State updates triggering more state updates causing performance issues
 */
describe('State Update Cascade Anti-Pattern', () => {
  
  const CascadingStateComponent = () => {
    const [content, setContent] = useState('')
    const [wordCount, setWordCount] = useState(0)
    const [charCount, setCharCount] = useState(0)
    const [mentionCount, setMentionCount] = useState(0)
    const [updateCount, setUpdateCount] = useState(0)
    
    // CASCADING EFFECTS - Each state update triggers more updates
    useEffect(() => {
      setUpdateCount(prev => prev + 1)
    }, [content])
    
    useEffect(() => {
      const words = content.trim().split(/\s+/).filter(word => word.length > 0)
      setWordCount(words.length)
    }, [content])
    
    useEffect(() => {
      setCharCount(content.length)
    }, [content])
    
    useEffect(() => {
      const mentions = content.match(/@\w+/g) || []
      setMentionCount(mentions.length)
    }, [content])
    
    // Even more cascading effects
    useEffect(() => {
      if (wordCount > 10) {
        setUpdateCount(prev => prev + 1) // Additional cascade
      }
    }, [wordCount])
    
    useEffect(() => {
      if (mentionCount > 2) {
        setUpdateCount(prev => prev + 1) // More cascading
      }
    }, [mentionCount])
    
    const handleContentChange = useCallback((value: string) => {
      setContent(value)
      // Direct updates also cause cascades
      setUpdateCount(prev => prev + 1)
    }, [])
    
    return (
      <div data-testid="cascading-state">
        <div className="stats">
          <div data-testid="word-count">Words: {wordCount}</div>
          <div data-testid="char-count">Chars: {charCount}</div>
          <div data-testid="mention-count">Mentions: {mentionCount}</div>
          <div data-testid="update-count">Updates: {updateCount}</div>
        </div>
        
        <MentionInputWithInternalState
          value={content}
          onChange={handleContentChange}
          mentionContext="cascading"
          className="w-full p-2 border"
        />
        
        <div data-testid="content-display">{content}</div>
      </div>
    )
  }
  
  test('should detect excessive state update cascades', async () => {
    const user = userEvent.setup()
    
    render(<CascadingStateComponent />)
    
    const input = screen.getByTestId('mention-input-cascading')
    
    // Start with baseline update count
    const initialUpdates = parseInt(screen.getByTestId('update-count').textContent?.split(': ')[1] || '0')
    
    // Type a short text
    await user.type(input, 'Hello @john')
    
    // Wait for all effects to settle
    await waitFor(() => {
      expect(screen.getByTestId('word-count')).toHaveTextContent('Words: 2')
    })
    
    const finalUpdates = parseInt(screen.getByTestId('update-count').textContent?.split(': ')[1] || '0')
    const updateDelta = finalUpdates - initialUpdates
    
    // Should not have excessive updates (each character causes multiple cascades)
    // 11 characters typed, but should not cause 50+ updates
    expect(updateDelta).toBeLessThan(50)
    
    // Validate final state
    expect(screen.getByTestId('word-count')).toHaveTextContent('Words: 2')
    expect(screen.getByTestId('char-count')).toHaveTextContent('Chars: 11')
    expect(screen.getByTestId('mention-count')).toHaveTextContent('Mentions: 1')
    
    console.log('STATE_CASCADE_ANALYSIS', {
      timestamp: new Date().toISOString(),
      input_length: 11,
      update_count: updateDelta,
      cascade_ratio: updateDelta / 11,
      threshold_exceeded: updateDelta > 25
    })
  })
})

/**
 * ANTI-PATTERN 4: Memory Leak from State Subscriptions
 * Components not properly cleaning up state subscriptions
 */
describe('State Subscription Memory Leak Anti-Pattern', () => {
  
  const LeakyStateComponent = () => {
    const [content, setContent] = useState('')
    const [subscribers, setSubscribers] = useState<Array<{id: string, active: boolean}>>([])
    
    useEffect(() => {
      // Simulate state subscription that might leak
      const subscriptionId = `sub-${Date.now()}-${Math.random()}`
      
      const cleanup = () => {
        setSubscribers(prev => prev.map(sub => 
          sub.id === subscriptionId ? { ...sub, active: false } : sub
        ))
      }
      
      setSubscribers(prev => [...prev, { id: subscriptionId, active: true }])
      
      // Set up interval that might not be cleaned up properly
      const interval = setInterval(() => {
        // Update some state periodically
      }, 100)
      
      // ANTI-PATTERN: Potentially missing cleanup
      return () => {
        clearInterval(interval)
        cleanup()
      }
    }, [content]) // Re-run on every content change - LEAK POTENTIAL
    
    return (
      <div data-testid="leaky-component">
        <div data-testid="active-subscriptions">
          Active Subscriptions: {subscribers.filter(sub => sub.active).length}
        </div>
        <div data-testid="total-subscriptions">
          Total Subscriptions: {subscribers.length}
        </div>
        
        <MentionInputWithInternalState
          value={content}
          onChange={setContent}
          mentionContext="leaky"
          className="w-full p-2 border"
        />
      </div>
    )
  }
  
  test('should detect potential memory leaks from state subscriptions', async () => {
    const user = userEvent.setup()
    
    render(<LeakyStateComponent />)
    
    const input = screen.getByTestId('mention-input-leaky')
    
    // Initial state
    expect(screen.getByTestId('active-subscriptions')).toHaveTextContent('Active Subscriptions: 1')
    expect(screen.getByTestId('total-subscriptions')).toHaveTextContent('Total Subscriptions: 1')
    
    // Type content to trigger new subscriptions
    await user.type(input, 'test')
    
    await waitFor(() => {
      const totalSubs = parseInt(screen.getByTestId('total-subscriptions').textContent?.split(': ')[1] || '0')
      const activeSubs = parseInt(screen.getByTestId('active-subscriptions').textContent?.split(': ')[1] || '0')
      
      // Should properly clean up old subscriptions
      expect(activeSubs).toBeLessThanOrEqual(5) // Reasonable number of active subscriptions
      
      // Total subscriptions grow but active should be managed
      const leakRatio = totalSubs / activeSubs
      expect(leakRatio).toBeLessThan(3) // Leak detected if ratio > 3
      
      console.log('MEMORY_LEAK_ANALYSIS', {
        timestamp: new Date().toISOString(),
        total_subscriptions: totalSubs,
        active_subscriptions: activeSubs,
        leak_ratio: leakRatio,
        potential_leak: leakRatio > 2
      })
    })
  })
})

/**
 * INTEGRATION TEST: Complete State Management Validation
 */
describe('Complete State Management Integration', () => {
  
  test('should handle complex state interactions without conflicts', async () => {
    const user = userEvent.setup()
    
    const ComplexStateManager = () => {
      const [post, setPost] = useState('')
      const [comment, setComment] = useState('')
      const [mentions, setMentions] = useState<string[]>([])
      const [globalWordCount, setGlobalWordCount] = useState(0)
      
      const handlePostChange = useCallback((value: string) => {
        setPost(value)
        updateGlobalStats(value, comment)
      }, [comment])
      
      const handleCommentChange = useCallback((value: string) => {
        setComment(value)
        updateGlobalStats(post, value)
      }, [post])
      
      const updateGlobalStats = useCallback((postText: string, commentText: string) => {
        const allText = `${postText} ${commentText}`
        const words = allText.trim().split(/\s+/).filter(w => w.length > 0)
        setGlobalWordCount(words.length)
        
        const allMentions = allText.match(/@\w+/g) || []
        setMentions([...new Set(allMentions)]) // Unique mentions
      }, [])
      
      const handleMentionSelect = useCallback((mention: string) => {
        setMentions(prev => [...new Set([...prev, `@${mention}`])])
      }, [])
      
      return (
        <div data-testid="complex-state-manager">
          <div className="stats">
            <div data-testid="global-word-count">Global Words: {globalWordCount}</div>
            <div data-testid="unique-mentions">Unique Mentions: {mentions.length}</div>
            <div data-testid="mention-list">{mentions.join(', ')}</div>
          </div>
          
          <div className="post-section">
            <h3>Post</h3>
            <MentionInputWithInternalState
              value={post}
              onChange={handlePostChange}
              onMentionSelect={handleMentionSelect}
              mentionContext="complex-post"
              className="w-full p-2 border mb-2"
            />
          </div>
          
          <div className="comment-section">
            <h3>Comment</h3>
            <MentionInputWithInternalState
              value={comment}
              onChange={handleCommentChange}
              onMentionSelect={handleMentionSelect}
              mentionContext="complex-comment"
              className="w-full p-2 border"
            />
          </div>
          
          <div data-testid="content-summary">
            <div>Post: {post}</div>
            <div>Comment: {comment}</div>
          </div>
        </div>
      )
    }
    
    render(<ComplexStateManager />)
    
    // Test complex interaction flow
    const postInput = screen.getByTestId('mention-input-complex-post')
    const commentInput = screen.getByTestId('mention-input-complex-comment')
    
    // Add content to post
    await user.type(postInput, 'Hello @')
    await user.click(screen.getByTestId('mention-option-john-complex-post'))
    
    expect(screen.getByTestId('unique-mentions')).toHaveTextContent('Unique Mentions: 1')
    expect(screen.getByTestId('mention-list')).toHaveTextContent('@john')
    
    // Add content to comment
    await user.type(commentInput, 'Great post @')
    await user.click(screen.getByTestId('mention-option-jane-complex-comment'))
    
    expect(screen.getByTestId('unique-mentions')).toHaveTextContent('Unique Mentions: 2')
    expect(screen.getByTestId('mention-list')).toHaveTextContent('@john, @jane')
    
    // Add duplicate mention
    await user.type(postInput, ' @')
    await user.click(screen.getByTestId('mention-option-john-complex-post'))
    
    // Should still be 2 unique mentions
    expect(screen.getByTestId('unique-mentions')).toHaveTextContent('Unique Mentions: 2')
    
    // Global word count should include both inputs
    const globalWords = parseInt(screen.getByTestId('global-word-count').textContent?.split(': ')[1] || '0')
    expect(globalWords).toBeGreaterThan(5)
  })
})

/**
 * NEURAL TRAINING DATA EXPORT FOR STATE MANAGEMENT
 */
describe('State Management Neural Training Export', () => {
  
  test('should export state management anti-patterns for training', () => {
    const stateManagementPatterns = {
      export_id: `SM-${Date.now()}`,
      timestamp: new Date().toISOString(),
      training_type: 'state_management_conflict_prevention',
      patterns: [
        {
          name: 'dual_state_management',
          severity: 'HIGH',
          indicators: [
            'parent_child_state_conflicts',
            'synchronization_issues',
            'data_inconsistency',
            'lost_user_input'
          ],
          prevention: 'Single source of truth - either parent OR child manages state, not both',
          detection_rules: [
            'Multiple useState calls for same logical data',
            'useEffect for state synchronization',
            'Conflicting onChange handlers'
          ]
        },
        {
          name: 'event_handler_conflicts',
          severity: 'MEDIUM',
          indicators: [
            'multiple_handlers_same_event',
            'double_processing',
            'unexpected_behavior',
            'performance_degradation'
          ],
          prevention: 'Clear event delegation hierarchy',
          detection_rules: [
            'Multiple onChange props on same element',
            'Event bubbling interference',
            'Handler execution order issues'
          ]
        },
        {
          name: 'state_update_cascades',
          severity: 'HIGH',
          indicators: [
            'excessive_rerenders',
            'performance_issues',
            'ui_freezing',
            'infinite_update_loops'
          ],
          prevention: 'Batch state updates and minimize effect dependencies',
          detection_rules: [
            'useEffect with many dependencies',
            'State updates in useEffect',
            'High rerender count per interaction'
          ]
        },
        {
          name: 'memory_leaks_subscriptions',
          severity: 'CRITICAL',
          indicators: [
            'growing_memory_usage',
            'performance_degradation_over_time',
            'uncleaned_subscriptions',
            'zombie_components'
          ],
          prevention: 'Proper cleanup in useEffect return functions',
          detection_rules: [
            'Missing cleanup functions',
            'Subscriptions in effect dependencies',
            'Growing subscriber counts'
          ]
        }
      ],
      prevention_strategies: [
        {
          pattern: 'dual_state_management',
          solution: 'Use single controlled component pattern',
          implementation: 'Parent owns state, child receives props'
        },
        {
          pattern: 'event_handler_conflicts',
          solution: 'Clear event delegation hierarchy',
          implementation: 'One handler per event type per component tree'
        },
        {
          pattern: 'state_update_cascades',
          solution: 'State update batching',
          implementation: 'Use useCallback and useMemo to prevent unnecessary effects'
        },
        {
          pattern: 'memory_leaks_subscriptions',
          solution: 'Proper cleanup patterns',
          implementation: 'Always return cleanup function from useEffect'
        }
      ],
      neural_weights: {
        dual_state_importance: 0.95,
        event_conflict_importance: 0.7,
        cascade_importance: 0.85,
        memory_leak_importance: 0.9
      }
    }
    
    console.log('STATE_MANAGEMENT_TRAINING_EXPORT', stateManagementPatterns)
    
    expect(stateManagementPatterns.patterns).toHaveLength(4)
    expect(stateManagementPatterns.prevention_strategies).toHaveLength(4)
  })
})