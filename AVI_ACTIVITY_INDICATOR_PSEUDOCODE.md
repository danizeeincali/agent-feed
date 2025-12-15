# Avi Activity Indicator - Pseudocode Design

## Component 1: AviTypingIndicator (Enhanced)

```typescript
COMPONENT AviTypingIndicator
  PROPS:
    isVisible: boolean
    inline: boolean (default: false)
    activityText?: string (NEW - optional activity description)
    className?: string

  STATE:
    frameIndex: number (0-9 for wave animation)
    colorIndex: number (0-6 for ROYGBIV)

  CONSTANTS:
    MAX_ACTIVITY_LENGTH = 80
    ACTIVITY_COLOR = '#D1D5DB'
    ACTIVITY_FONT_SIZE = '0.85rem'
    ACTIVITY_FONT_WEIGHT = 400

  FUNCTION truncateActivity(text: string) -> string:
    IF length(text) <= MAX_ACTIVITY_LENGTH:
      RETURN text
    ELSE:
      RETURN substring(text, 0, MAX_ACTIVITY_LENGTH - 3) + '...'

  RENDER:
    IF NOT isVisible:
      RETURN null

    currentFrame = ANIMATION_FRAMES[frameIndex]
    currentColor = inline ? '#6B7280' : ROYGBIV_COLORS[colorIndex]

    IF inline:
      RETURN (
        <span className="avi-wave-text-inline">
          {/* Animated Avi text */}
          <span style={{ color: currentColor, fontWeight: 600 }}>
            {currentFrame}
          </span>

          {/* Activity description (if provided) */}
          {activityText && (
            <span style={{
              color: ACTIVITY_COLOR,
              fontWeight: ACTIVITY_FONT_WEIGHT,
              fontSize: ACTIVITY_FONT_SIZE,
              marginLeft: '0.5rem'
            }}>
              - {truncateActivity(activityText)}
            </span>
          )}
        </span>
      )
    ELSE:
      RETURN absolute mode (unchanged)
END COMPONENT
```

## Component 2: useActivityStream Hook (NEW)

```typescript
HOOK useActivityStream
  PROPS:
    enabled: boolean (whether to subscribe to SSE)
    userId: string (default: 'avi-chat')

  STATE:
    currentActivity: string | null
    connectionStatus: 'disconnected' | 'connected' | 'error'

  CONSTANTS:
    SSE_URL = '/api/streaming-ticker/stream'
    HIGH_PRIORITY_TOOLS = ['Task', 'Bash', 'Read', 'Write', 'Edit', 'Agent']

  FUNCTION isHighPriority(message) -> boolean:
    IF message.data.priority === 'high':
      RETURN true
    IF message.data.tool IN HIGH_PRIORITY_TOOLS:
      RETURN true
    IF message.data.message STARTS_WITH 'Phase':
      RETURN true
    RETURN false

  FUNCTION formatActivity(data) -> string:
    IF data.tool AND data.action:
      RETURN `${data.tool}(${data.action})`
    ELSE IF data.message:
      RETURN data.message
    ELSE:
      RETURN ''

  EFFECT (when enabled changes):
    IF NOT enabled:
      CLEANUP and RETURN

    // Connect to SSE endpoint
    eventSource = NEW EventSource(SSE_URL + '?userId=' + userId)

    eventSource.onopen:
      SET connectionStatus = 'connected'

    eventSource.onmessage(event):
      message = PARSE(event.data)

      // Filter for high-priority activities only
      IF isHighPriority(message):
        activity = formatActivity(message.data)
        IF activity IS NOT EMPTY:
          SET currentActivity = activity

    eventSource.onerror:
      SET connectionStatus = 'error'
      // Auto-reconnect handled by browser

    CLEANUP:
      eventSource.close()

  RETURN { currentActivity, connectionStatus }
END HOOK
```

## Component 3: EnhancedPostingInterface (Modified)

```typescript
COMPONENT EnhancedPostingInterface
  STATE:
    chatHistory: Message[]
    isSubmitting: boolean
    message: string
    currentActivity: string | null (NEW)

  // NEW: Subscribe to activity stream
  { currentActivity, connectionStatus } = useActivityStream(isSubmitting)

  FUNCTION handleAviMessage(message: string):
    userMessage = CREATE_USER_MESSAGE(message)

    // Create typing indicator with activity text
    typingIndicator = {
      id: 'typing-indicator',
      content: (
        <AviTypingIndicator
          isVisible={true}
          inline={true}
          activityText={currentActivity || undefined}  // NEW
        />
      ),
      sender: 'typing',
      timestamp: NOW()
    }

    // Add user message and typing indicator to chat
    ADD_TO_CHAT_HISTORY(userMessage, typingIndicator)
    SET isSubmitting = true

    TRY:
      aviResponse = AWAIT callAviClaudeCode(message)

      // Remove typing indicator, add response
      REMOVE_FROM_CHAT_HISTORY(typingIndicator)
      ADD_TO_CHAT_HISTORY(aviResponse)
    CATCH error:
      SHOW_ERROR_MESSAGE(error)
    FINALLY:
      SET isSubmitting = false
      SET currentActivity = null  // Clear activity
END COMPONENT
```

## Component 4: RealSocialMediaFeed (Modified)

```typescript
COMPONENT RealSocialMediaFeed
  RENDER:
    // LEFT COLUMN: Feed
    <FeedColumn>
      <PostCreator />
      <PostList posts={posts} />
    </FeedColumn>

    // RIGHT COLUMN: Sidebar
    <SidebarColumn>
      {/* REMOVED: Live Tool Execution widget */}
      {/* <StreamingTickerWidget /> */}

      {/* Keep other sidebar widgets if any */}
    </SidebarColumn>
END COMPONENT
```

## Data Flow Pseudocode

```
USER ACTION: Send message to Avi
  ↓
EnhancedPostingInterface.handleAviMessage()
  ↓
1. Create typing indicator with currentActivity
2. Enable activity stream (isSubmitting = true)
  ↓
useActivityStream hook activates
  ↓
SSE Connection established to /api/streaming-ticker/stream
  ↓
LOOP while processing:
  SSE message received
    ↓
  IF high-priority:
    Format activity text
      ↓
    Update currentActivity state
      ↓
    AviTypingIndicator re-renders with new activityText
      ↓
    Display: "Avi - {activity}"
  ↓
Response received
  ↓
Remove typing indicator
Close SSE connection
Display Avi response
```

## Edge Cases

```typescript
CASE: Activity text too long
  INPUT: "Phase 5 & 6: Launch 3 Concurrent Validation Agents with E2E Testing & Screenshots and Full Regression Suite"
  OUTPUT: "Phase 5 & 6: Launch 3 Concurrent Validation Agents with E2E Testing &..."

CASE: No activity text
  INPUT: activityText = null
  OUTPUT: "Avi" (just animation, no separator or activity)

CASE: Empty activity text
  INPUT: activityText = ""
  OUTPUT: "Avi" (treat as null)

CASE: SSE connection drops
  ACTION: Browser auto-reconnects, display continues
  FALLBACK: If reconnect fails, show "Avi" without activity

CASE: Multiple rapid activities
  ACTION: Instant update (no animation), latest activity wins
  EXAMPLE:
    t=0ms: "Avi - Reading files"
    t=50ms: "Avi - Bash(git status)"
    t=100ms: "Avi - Task(E2E validation)"

CASE: Low-priority message received
  ACTION: Ignore, keep displaying previous high-priority activity
```

## Testing Pseudocode

```typescript
TEST SUITE: AviTypingIndicator with activityText

  TEST: Should display activity text with correct styling
    RENDER <AviTypingIndicator activityText="Test activity" inline />
    EXPECT text content contains "- Test activity"
    EXPECT activity text color = '#D1D5DB'
    EXPECT activity text font-weight = 400

  TEST: Should truncate long activity text at 80 chars
    RENDER <AviTypingIndicator activityText={longText} inline />
    EXPECT activity text length <= 80
    EXPECT activity text ends with '...'

  TEST: Should not display separator when no activity
    RENDER <AviTypingIndicator activityText={null} inline />
    EXPECT text does NOT contain " - "

TEST SUITE: useActivityStream hook

  TEST: Should connect to SSE when enabled
    RENDER useActivityStream(enabled=true)
    EXPECT eventSource created with correct URL

  TEST: Should filter high-priority activities only
    EMIT SSE message {priority: 'low'}
    EXPECT currentActivity = null
    EMIT SSE message {priority: 'high'}
    EXPECT currentActivity != null

  TEST: Should format activity text correctly
    EMIT SSE message {tool: 'Bash', action: 'git status'}
    EXPECT currentActivity = 'Bash(git status)'

TEST SUITE: Integration (E2E with Playwright)

  TEST: Should display activity inline with typing indicator
    NAVIGATE to /feed
    CLICK "Avi" tab
    TYPE message "test"
    CLICK send
    EXPECT typing indicator visible
    EXPECT activity text visible
    SCREENSHOT: "avi-with-activity.png"
```
