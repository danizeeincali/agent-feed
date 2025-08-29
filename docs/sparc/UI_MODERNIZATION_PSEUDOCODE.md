# SPARC UI Modernization - Pseudocode Phase

## P - Pseudocode Algorithms for UI Modernization

### 1. Chat Bubble Rendering Algorithm

```pseudocode
FUNCTION renderChatBubbles(messages, selectedInstanceId):
  groupedMessages = groupConsecutiveMessages(messages)
  chatBubbles = []
  
  FOR EACH messageGroup IN groupedMessages:
    bubbleType = determineBubbleType(messageGroup.sender)
    timestamp = formatTimestamp(messageGroup.lastMessage.time)
    
    bubble = CREATE_ELEMENT("div", {
      className: getBubbleClassName(bubbleType),
      alignment: getBubbleAlignment(bubbleType),
      animation: "slideIn 0.3s ease-out"
    })
    
    FOR EACH message IN messageGroup.messages:
      messageContent = processMessageContent(message.text)
      bubble.appendChild(CREATE_MESSAGE_CONTENT(messageContent))
    
    bubble.appendChild(CREATE_TIMESTAMP(timestamp))
    chatBubbles.append(bubble)
  
  RETURN chatBubbles

FUNCTION groupConsecutiveMessages(messages):
  groups = []
  currentGroup = null
  
  FOR EACH message IN messages:
    IF currentGroup IS null OR message.sender != currentGroup.sender:
      IF currentGroup IS NOT null:
        groups.append(currentGroup)
      currentGroup = {
        sender: message.sender,
        messages: [message],
        lastMessage: message
      }
    ELSE:
      currentGroup.messages.append(message)
      currentGroup.lastMessage = message
  
  IF currentGroup IS NOT null:
    groups.append(currentGroup)
  
  RETURN groups

FUNCTION determineBubbleType(sender):
  SWITCH sender:
    CASE "user": RETURN "user-bubble"
    CASE "claude": RETURN "claude-bubble"  
    CASE "system": RETURN "system-bubble"
    DEFAULT: RETURN "default-bubble"
```

### 2. Professional Button State Management

```pseudocode
FUNCTION initializeButtonSystem(buttons):
  buttonStates = new Map()
  
  FOR EACH button IN buttons:
    state = {
      current: "normal",
      disabled: button.disabled,
      loading: false,
      variant: button.variant || "primary"
    }
    buttonStates.set(button.id, state)
    attachButtonHandlers(button, state)
  
  RETURN buttonStates

FUNCTION attachButtonHandlers(button, state):
  button.addEventListener("mouseenter", () => {
    IF state.current == "normal" AND NOT state.disabled:
      transitionButtonState(button, state, "hover")
  })
  
  button.addEventListener("mouseleave", () => {
    IF state.current == "hover":
      transitionButtonState(button, state, "normal")
  })
  
  button.addEventListener("mousedown", () => {
    IF NOT state.disabled AND NOT state.loading:
      transitionButtonState(button, state, "active")
  })
  
  button.addEventListener("mouseup", () => {
    IF state.current == "active":
      targetState = button.matches(":hover") ? "hover" : "normal"
      transitionButtonState(button, state, targetState)
  })

FUNCTION transitionButtonState(button, state, newState):
  oldState = state.current
  state.current = newState
  
  // Apply CSS classes for state transition
  button.classList.remove(`btn-${oldState}`)
  button.classList.add(`btn-${newState}`)
  
  // Trigger animation
  IF hasAnimation(oldState, newState):
    animateButtonTransition(button, oldState, newState)

FUNCTION setButtonLoading(buttonId, loading):
  state = buttonStates.get(buttonId)
  button = getElementById(buttonId)
  
  state.loading = loading
  
  IF loading:
    button.classList.add("btn-loading")
    showLoadingSpinner(button)
    disableButtonInteraction(button)
  ELSE:
    button.classList.remove("btn-loading")
    hideLoadingSpinner(button)
    enableButtonInteraction(button)
```

### 3. Responsive Layout Adaptation

```pseudocode
FUNCTION initializeResponsiveSystem():
  breakpoints = {
    mobile: 640,
    tablet: 768,
    desktop: 1024,
    wide: 1280
  }
  
  currentBreakpoint = getCurrentBreakpoint(breakpoints)
  layoutConfig = getLayoutConfig(currentBreakpoint)
  
  applyResponsiveLayout(layoutConfig)
  
  window.addEventListener("resize", debounce(() => {
    newBreakpoint = getCurrentBreakpoint(breakpoints)
    IF newBreakpoint != currentBreakpoint:
      currentBreakpoint = newBreakpoint
      layoutConfig = getLayoutConfig(newBreakpoint)
      animateLayoutTransition(layoutConfig)
  }, 250))

FUNCTION getLayoutConfig(breakpoint):
  SWITCH breakpoint:
    CASE "mobile":
      RETURN {
        instancesGrid: "1fr",
        instancesList: "100%",
        chatArea: "100%",
        stackDirection: "column",
        buttonSize: "large",
        chatBubbleMaxWidth: "85%"
      }
    CASE "tablet":
      RETURN {
        instancesGrid: "300px 1fr",
        instancesList: "300px",
        chatArea: "1fr", 
        stackDirection: "row",
        buttonSize: "medium",
        chatBubbleMaxWidth: "75%"
      }
    CASE "desktop":
      RETURN {
        instancesGrid: "350px 1fr",
        instancesList: "350px",
        chatArea: "1fr",
        stackDirection: "row", 
        buttonSize: "medium",
        chatBubbleMaxWidth: "65%"
      }
    DEFAULT:
      RETURN getLayoutConfig("desktop")

FUNCTION animateLayoutTransition(layoutConfig):
  container = getElementById("claude-instance-manager")
  
  // Measure current positions
  currentPositions = measureElementPositions(container)
  
  // Apply new layout
  applyResponsiveLayout(layoutConfig)
  
  // Measure new positions  
  newPositions = measureElementPositions(container)
  
  // Animate from old to new positions
  FOR EACH element IN container.children:
    oldPos = currentPositions.get(element.id)
    newPos = newPositions.get(element.id) 
    
    IF oldPos != newPos:
      element.style.transform = `translate(${oldPos.x - newPos.x}px, ${oldPos.y - newPos.y}px)`
      
      // Animate to new position
      element.animate([
        { transform: element.style.transform },
        { transform: "translate(0, 0)" }
      ], {
        duration: 300,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)"
      })
```

### 4. Animation Choreography System

```pseudocode
FUNCTION createAnimationChoreographer():
  animationQueue = []
  isAnimating = false
  
  RETURN {
    choreograph: (animationSequence) => {
      animationQueue.push(animationSequence)
      IF NOT isAnimating:
        processAnimationQueue()
    }
  }

FUNCTION processAnimationQueue():
  IF animationQueue.length == 0:
    isAnimating = false
    RETURN
  
  isAnimating = true
  currentSequence = animationQueue.shift()
  
  executeAnimationSequence(currentSequence, () => {
    processAnimationQueue() // Process next animation
  })

FUNCTION executeAnimationSequence(sequence, onComplete):
  parallelAnimations = []
  
  FOR EACH step IN sequence.steps:
    IF step.timing == "parallel":
      parallelAnimations.push(step)
    ELSE:
      // Execute sequential step
      IF parallelAnimations.length > 0:
        executeParallelAnimations(parallelAnimations)
        parallelAnimations = []
      
      executeSequentialAnimation(step)
  
  // Execute remaining parallel animations
  IF parallelAnimations.length > 0:
    executeParallelAnimations(parallelAnimations, onComplete)
  ELSE:
    onComplete()

FUNCTION createChatMessageAnimation(message, bubbleType):
  RETURN {
    steps: [
      {
        timing: "sequential",
        element: message.bubble,
        animation: "slideInUp",
        duration: 300,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)"
      },
      {
        timing: "parallel", 
        element: message.content,
        animation: "fadeIn",
        duration: 200,
        delay: 100
      },
      {
        timing: "parallel",
        element: message.timestamp,
        animation: "fadeIn", 
        duration: 150,
        delay: 200
      }
    ]
  }
```

### 5. Message Processing and Display Logic

```pseudocode
FUNCTION processIncomingMessage(messageData, instanceId):
  // Validate message data
  IF NOT isValidMessage(messageData):
    logError("Invalid message data received", messageData)
    RETURN null
  
  // Create message object
  message = {
    id: generateMessageId(),
    instanceId: instanceId,
    sender: determineSender(messageData),
    content: sanitizeMessageContent(messageData.content),
    timestamp: new Date(),
    type: messageData.type || "text"
  }
  
  // Add to message history
  addToMessageHistory(instanceId, message)
  
  // Process for display
  displayMessage = processMessageForDisplay(message)
  
  // Trigger display animation
  animationSequence = createChatMessageAnimation(displayMessage, message.sender)
  animationChoreographer.choreograph(animationSequence)
  
  // Auto-scroll to new message
  scheduleAutoScroll(displayMessage.bubble)
  
  RETURN displayMessage

FUNCTION processMessageForDisplay(message):
  // Process content for rich formatting
  processedContent = processRichContent(message.content)
  
  // Create bubble element
  bubble = createElement("div", {
    className: `chat-bubble chat-bubble-${message.sender}`,
    "data-message-id": message.id,
    "data-timestamp": message.timestamp.toISOString()
  })
  
  // Add content container
  contentContainer = createElement("div", {
    className: "message-content"
  })
  contentContainer.innerHTML = processedContent
  
  // Add timestamp
  timestamp = createElement("div", {
    className: "message-timestamp",
    textContent: formatTimestamp(message.timestamp)
  })
  
  bubble.appendChild(contentContainer)
  bubble.appendChild(timestamp)
  
  RETURN {
    bubble: bubble,
    content: contentContainer,
    timestamp: timestamp,
    message: message
  }

FUNCTION scheduleAutoScroll(element):
  // Use RAF for smooth scrolling
  requestAnimationFrame(() => {
    chatContainer = element.closest(".chat-container")
    IF chatContainer:
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: "smooth"
      })
  })
```

### 6. Performance Optimization Algorithms

```pseudocode
FUNCTION initializeVirtualization(chatContainer, messageHistory):
  viewport = {
    height: chatContainer.clientHeight,
    scrollTop: 0,
    itemHeight: estimateAverageMessageHeight(),
    bufferSize: 10 // Extra items to render outside viewport
  }
  
  chatContainer.addEventListener("scroll", debounce(() => {
    viewport.scrollTop = chatContainer.scrollTop
    updateVisibleMessages(messageHistory, viewport)
  }, 16)) // ~60fps
  
  RETURN viewport

FUNCTION updateVisibleMessages(messageHistory, viewport):
  startIndex = Math.max(0, 
    Math.floor(viewport.scrollTop / viewport.itemHeight) - viewport.bufferSize
  )
  
  endIndex = Math.min(messageHistory.length - 1,
    Math.ceil((viewport.scrollTop + viewport.height) / viewport.itemHeight) + viewport.bufferSize
  )
  
  // Update visible range
  visibleMessages = messageHistory.slice(startIndex, endIndex + 1)
  
  // Update DOM efficiently
  updateMessageDOM(visibleMessages, startIndex)

FUNCTION debounce(func, delay):
  let timeoutId
  RETURN function(...args):
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), delay)

FUNCTION throttle(func, limit):
  let inThrottle
  RETURN function(...args):
    IF NOT inThrottle:
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
```

### 7. State Management Integration

```pseudocode
FUNCTION createUIStateManager(initialState):
  state = { ...initialState }
  subscribers = new Set()
  
  RETURN {
    getState: () => ({ ...state }),
    
    setState: (updater) => {
      newState = typeof updater === "function" ? updater(state) : updater
      IF hasStateChanged(state, newState):
        state = { ...state, ...newState }
        notifySubscribers(state)
    },
    
    subscribe: (callback) => {
      subscribers.add(callback)
      RETURN () => subscribers.delete(callback) // Unsubscribe function
    }
  }

FUNCTION integrateUIStateWithExisting(uiStateManager, existingSetters):
  // Wrap existing state setters to trigger UI updates
  wrappedSetters = {}
  
  FOR EACH [key, setter] IN Object.entries(existingSetters):
    wrappedSetters[key] = (value) => {
      setter(value) // Call original setter
      
      // Update UI state
      uiStateManager.setState((prevState) => ({
        ...prevState,
        [key]: value,
        lastUpdated: new Date().toISOString()
      }))
    }
  
  RETURN wrappedSetters

// Integration with existing ClaudeInstanceManager state
FUNCTION initializeIntegratedState(existingState):
  uiState = {
    chatMode: "enhanced",
    animationsEnabled: true,
    currentTheme: "claudable",
    messageHistory: new Map(),
    visibleMessages: [],
    scrollPosition: 0
  }
  
  return createUIStateManager({
    ...existingState,
    ui: uiState
  })
```

This pseudocode defines the core algorithms needed for transforming the Claude Instance Manager into a modern, chat-style interface while preserving all existing functionality. The next phase will architect these algorithms into a cohesive system design.