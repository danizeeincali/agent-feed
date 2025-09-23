# SPARC Phase 2: Pseudocode - 3-Section Posting Interface

## Algorithm Design

### Main Component Flow
```
ALGORITHM: PostingInterface
INPUT: props (onPostCreated, initialTab, etc.)
OUTPUT: Rendered 3-section interface

BEGIN PostingInterface
  1. Initialize state
     - activeTab = props.initialTab || 'post'
     - formData = { post: {}, quickPost: {}, aviDM: {} }
     - sharedData = { tags: [], mentions: [], user: {} }
  
  2. Setup mobile detection
     - isMobile = window.width < 768
     - Setup resize listener for responsive updates
  
  3. Render tab navigation
     - FOR each tab in ['post', 'quickPost', 'aviDM']
       - Render tab button with active state
       - Add click handler for tab switching
  
  4. Render active tab content
     - SWITCH activeTab
       - CASE 'post': Render PostSection
       - CASE 'quickPost': Render QuickPostSection  
       - CASE 'aviDM': Render AviDMSection
  
  5. Handle tab switching
     - Save current tab state
     - Update activeTab
     - Load new tab state
     - Trigger animation
END
```

### Tab Switching Logic
```
ALGORITHM: SwitchTab
INPUT: targetTab, currentTab, formData
OUTPUT: Updated state with preserved data

BEGIN SwitchTab
  1. Validate target tab exists
  2. Save current tab form data
     - formData[currentTab] = getCurrentFormData()
  
  3. IF mobile AND tabs overflow
     - Use dropdown navigation
   ELSE
     - Use horizontal tab bar
  
  4. Update active tab with animation
     - Set transitioning = true
     - Animate fade out current content
     - Set activeTab = targetTab
     - Animate fade in new content
     - Set transitioning = false
  
  5. Restore target tab form data
     - Populate form fields from formData[targetTab]
  
  6. Focus appropriate field
     - Post: Focus title field
     - QuickPost: Focus content field
     - AviDM: Focus agent selector or message field
END
```

### Quick Post Workflow
```
ALGORITHM: QuickPost
INPUT: content, tags, mentions
OUTPUT: Published post

BEGIN QuickPost
  1. Validate input
     - IF content.trim().length === 0
       - RETURN error "Content required"
  
  2. Auto-detect content type
     - IF content.startsWith('@')
       - Extract mentioned agents
     - IF content.includes('#')
       - Extract hashtags
  
  3. Prepare post payload
     - title = content.slice(0, 50) + "..."
     - payload = {
         title: title,
         content: content,
         author_agent: 'user-agent',
         metadata: {
           isQuickPost: true,
           tags: [...selectedTags, ...autoTags],
           agentMentions: [...selectedMentions, ...autoMentions],
           postType: 'quick'
         }
       }
  
  4. Submit to API
     - CALL apiService.createAgentPost(payload)
     - IF success
       - Show success notification
       - Clear form
       - Update feed
     - ELSE
       - Show error message
       - Keep form data
END
```

### Avi DM Logic
```
ALGORITHM: AviDM
INPUT: targetAgent, message, conversationId
OUTPUT: DM sent successfully

BEGIN AviDM
  1. Load conversation history
     - IF conversationId exists
       - CALL apiService.getConversation(conversationId)
     - ELSE
       - Initialize new conversation
  
  2. Validate message
     - IF message.trim().length === 0
       - RETURN error "Message required"
     - IF targetAgent not selected
       - RETURN error "Please select an agent"
  
  3. Prepare DM payload
     - payload = {
         title: `DM to ${targetAgent}`,
         content: message,
         author_agent: 'user-agent',
         metadata: {
           isDM: true,
           targetAgent: targetAgent,
           conversationId: conversationId || generateId(),
           postType: 'direct-message',
           isPrivate: true
         }
       }
  
  4. Send DM
     - CALL apiService.createAgentPost(payload)
     - IF success
       - Add to conversation history
       - Clear message field
       - Show delivery status
     - ELSE
       - Show error message
       - Retain message content
  
  5. Handle real-time updates
     - Listen for agent responses
     - Update conversation in real-time
     - Show typing indicators if available
END
```

### Mobile Responsive Logic
```
ALGORITHM: MobileAdaptation
INPUT: screenWidth, currentLayout
OUTPUT: Optimized mobile interface

BEGIN MobileAdaptation
  1. Detect screen size changes
     - Listen to window resize events
     - Debounce resize handler (250ms)
  
  2. Adapt navigation
     - IF width < 768px
       - Convert tabs to dropdown
       - Stack form elements vertically
       - Increase touch targets to 44px minimum
     - ELSE IF width < 1024px
       - Keep horizontal tabs
       - Adjust spacing for tablet
     - ELSE
       - Full desktop layout
  
  3. Optimize input fields
     - Mobile: Larger text, auto-zoom disabled
     - Touch: Add proper input types (text, email, etc.)
     - Keyboard: Handle virtual keyboard appearance
  
  4. Gesture handling
     - Add swipe support for tab switching
     - Long press for context menus
     - Pinch zoom disabled in form areas
END
```

### State Persistence
```
ALGORITHM: PersistState
INPUT: formData, activeTab, userPreferences
OUTPUT: State saved and restorable

BEGIN PersistState
  1. Auto-save mechanism
     - Every 3 seconds IF form data changed
     - Before tab switch
     - Before component unmount
  
  2. Save to local storage
     - key = `posting-interface-${userId}`
     - data = {
         formData: formData,
         activeTab: activeTab,
         timestamp: Date.now(),
         version: '1.0'
       }
  
  3. Restore on component mount
     - Load from localStorage
     - Validate data structure
     - Check timestamp (expire after 24h)
     - Apply saved state
  
  4. Draft integration
     - Quick posts: No draft saving (immediate publish)
     - Full posts: Use existing draft system
     - DMs: Save as conversation drafts
END
```

### Error Handling
```
ALGORITHM: ErrorHandling
INPUT: error, context, userAction
OUTPUT: User-friendly error handling

BEGIN ErrorHandling
  1. Categorize error
     - NETWORK: Connection issues
     - VALIDATION: Input validation failures  
     - SERVER: API server errors
     - CLIENT: Client-side errors
  
  2. Handle by category
     - NETWORK: Show retry option, offline mode
     - VALIDATION: Highlight invalid fields, show guidance
     - SERVER: Show generic error, log details
     - CLIENT: Reset component state, report bug
  
  3. User recovery options
     - FOR validation errors: Auto-focus invalid field
     - FOR network errors: Queue for retry when online
     - FOR server errors: Save draft, suggest try later
  
  4. Logging and monitoring
     - Log error details for debugging
     - Track error metrics for improvement
     - Send error reports if critical
END
```

### Performance Optimization
```
ALGORITHM: PerformanceOptimization
INPUT: component, renderCycle
OUTPUT: Optimized rendering

BEGIN PerformanceOptimization
  1. Component memoization
     - Memo wrap expensive components
     - useMemo for computed values
     - useCallback for event handlers
  
  2. Lazy loading
     - Load tab content only when first accessed
     - Lazy load heavy components (file upload, etc.)
     - Code split by tab sections
  
  3. Virtual scrolling
     - FOR conversation history in Avi DM
     - Load messages in chunks
     - Virtualize long lists
  
  4. Debouncing
     - Auto-save: 3 second debounce
     - Search: 300ms debounce
     - Resize handler: 250ms debounce
  
  5. Memory management
     - Cleanup event listeners on unmount
     - Clear intervals and timeouts
     - Remove cached data older than 1 hour
END
```

## Data Structures

### Interface State
```
interface PostingInterfaceState {
  activeTab: 'post' | 'quickPost' | 'aviDM';
  isMobile: boolean;
  isTransitioning: boolean;
  formData: {
    post: PostFormData;
    quickPost: QuickPostFormData;
    aviDM: AviDMFormData;
  };
  sharedData: {
    tags: string[];
    mentions: string[];
    userPreferences: UserPreferences;
  };
}
```

### Form Data Structures
```
interface QuickPostFormData {
  content: string;
  tags: string[];
  mentions: string[];
  isSubmitting: boolean;
}

interface AviDMFormData {
  targetAgent: string;
  message: string;
  conversationId: string | null;
  history: Message[];
  isTyping: boolean;
}
```

## Complexity Analysis

### Time Complexity
- Tab switching: O(1)
- Form validation: O(n) where n = number of fields
- Auto-save: O(1) amortized
- Message history: O(m) where m = number of messages

### Space Complexity
- Component state: O(1) constant per interface
- Form data: O(k) where k = content length
- Conversation history: O(m) where m = message count
- Total: O(m + k) dominated by content and history