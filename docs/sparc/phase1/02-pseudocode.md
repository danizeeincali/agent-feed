# SPARC Phase 1: Post Structure Enhancement - PSEUDOCODE

## Algorithm Design Overview

This document outlines the core algorithms for implementing Phase 1 post structure enhancements including expand/collapse functionality, character counting with limits, and post hierarchy rendering.

## 1. Expandable Post Detail Algorithm

### 1.1 Core Expand/Collapse Logic

```pseudocode
FUNCTION handlePostExpansion(postId: string, currentState: boolean):
    INPUT: postId (string), currentState (boolean)
    OUTPUT: void (updates component state)
    
    BEGIN
        // Validate input
        IF postId is empty OR null THEN
            THROW Error("Invalid post ID")
        END IF
        
        // Update expansion state
        SET expandedPosts[postId] = NOT currentState
        
        // Trigger animation
        IF currentState is false THEN
            // Expanding
            CALL animateExpand(postId)
            CALL trackAnalytics("post_expanded", postId)
        ELSE
            // Collapsing
            CALL animateCollapse(postId)
            CALL trackAnalytics("post_collapsed", postId)
        END IF
        
        // Update accessibility
        CALL updateAriaExpanded(postId, NOT currentState)
    END
```

### 1.2 Content Truncation Algorithm

```pseudocode
FUNCTION truncateContent(content: string, maxLength: number, suffix: string):
    INPUT: content (string), maxLength (number), suffix (string)
    OUTPUT: truncatedContent (string)
    
    BEGIN
        IF content.length <= maxLength THEN
            RETURN content
        END IF
        
        // Find last complete word before limit
        SET truncatePoint = maxLength
        SET lastSpace = -1
        
        FOR i = 0 to maxLength DO
            IF content[i] is space THEN
                SET lastSpace = i
            END IF
        END FOR
        
        // Truncate at word boundary if possible
        IF lastSpace > maxLength * 0.8 THEN
            SET truncatePoint = lastSpace
        END IF
        
        SET result = content.substring(0, truncatePoint) + suffix
        RETURN result
    END
```

### 1.3 Animation Controller

```pseudocode
FUNCTION animateExpand(postId: string):
    INPUT: postId (string)
    OUTPUT: void (triggers CSS animation)
    
    BEGIN
        SET element = getElementById("post-content-" + postId)
        
        // Get natural height
        SET naturalHeight = element.scrollHeight
        
        // Start from current height
        SET element.style.height = element.offsetHeight + "px"
        
        // Trigger reflow
        CALL element.offsetHeight
        
        // Animate to natural height
        SET element.style.transition = "height 200ms ease-out"
        SET element.style.height = naturalHeight + "px"
        
        // Clean up after animation
        AFTER 200ms DO
            SET element.style.height = "auto"
            SET element.style.transition = ""
        END AFTER
    END
```

## 2. Character Counting Algorithms

### 2.1 Real-time Character Counter

```pseudocode
FUNCTION countCharacters(text: string, includeEmojis: boolean):
    INPUT: text (string), includeEmojis (boolean)
    OUTPUT: characterCount (number)
    
    BEGIN
        IF text is null OR empty THEN
            RETURN 0
        END IF
        
        SET count = 0
        SET i = 0
        
        WHILE i < text.length DO
            SET codePoint = text.codePointAt(i)
            
            IF includeEmojis AND isEmoji(codePoint) THEN
                SET count = count + 2  // Count emojis as 2 chars
                SET i = i + getEmojiLength(codePoint)
            ELSE
                SET count = count + 1
                SET i = i + 1
            END IF
        END WHILE
        
        RETURN count
    END
```

### 2.2 Character Limit Validation

```pseudocode
FUNCTION validateCharacterLimit(text: string, limit: number, fieldType: string):
    INPUT: text (string), limit (number), fieldType (string)
    OUTPUT: ValidationResult { isValid: boolean, count: number, status: string }
    
    BEGIN
        SET count = countCharacters(text, true)
        SET result = new ValidationResult()
        
        result.count = count
        result.isValid = count <= limit
        
        // Determine status for UI feedback
        IF count <= limit * 0.7 THEN
            result.status = "safe"      // Green
        ELSE IF count <= limit * 0.9 THEN
            result.status = "warning"   // Yellow
        ELSE IF count <= limit THEN
            result.status = "danger"    // Red
        ELSE
            result.status = "exceeded"  // Error
        END IF
        
        RETURN result
    END
```

### 2.3 Input Prevention Algorithm

```pseudocode
FUNCTION handleTextInput(event: InputEvent, currentText: string, limit: number):
    INPUT: event (InputEvent), currentText (string), limit (number)
    OUTPUT: boolean (allow/prevent input)
    
    BEGIN
        SET newText = currentText + event.data
        SET newCount = countCharacters(newText, true)
        
        IF newCount > limit THEN
            // Prevent input that would exceed limit
            CALL event.preventDefault()
            CALL showLimitExceededWarning()
            RETURN false
        END IF
        
        RETURN true
    END
```

## 3. Post Hierarchy Rendering Algorithm

### 3.1 Post Component Structure

```pseudocode
FUNCTION renderPostHierarchy(post: AgentPost, isExpanded: boolean):
    INPUT: post (AgentPost), isExpanded (boolean)
    OUTPUT: JSX.Element
    
    BEGIN
        SET hook = extractHook(post.content)
        SET mainContent = extractMainContent(post.content)
        
        // Render title section
        SET titleSection = renderTitle(post.title)
        
        // Render hook section (always visible)
        SET hookSection = renderHook(hook, post.id)
        
        // Render expandable content section
        SET contentSection = null
        IF isExpanded THEN
            SET contentSection = renderContent(mainContent, post.id)
        END IF
        
        // Render actions section (no sharing)
        SET actionsSection = renderActions(post.id, post.likes, post.comments)
        
        // Render metadata section
        SET metadataSection = renderMetadata(post.authorAgent, post.publishedAt, post.metadata)
        
        RETURN (
            titleSection +
            hookSection +
            contentSection +
            actionsSection +
            metadataSection
        )
    END
```

### 3.2 Content Extraction Algorithm

```pseudocode
FUNCTION extractHook(content: string):
    INPUT: content (string)
    OUTPUT: hook (string)
    
    BEGIN
        IF content.length <= 140 THEN
            RETURN content
        END IF
        
        // Find first 2-3 sentences or 140 chars, whichever is shorter
        SET sentences = splitIntoSentences(content)
        SET hook = ""
        SET i = 0
        
        WHILE i < min(3, sentences.length) AND hook.length < 140 DO
            SET testHook = hook + sentences[i]
            IF testHook.length <= 140 THEN
                SET hook = testHook
                SET i = i + 1
            ELSE
                BREAK
            END IF
        END WHILE
        
        IF hook.length == 0 THEN
            // Fallback to character truncation
            SET hook = content.substring(0, 137) + "..."
        END IF
        
        RETURN hook
    END
```

## 4. Sharing Functionality Removal Algorithm

### 4.1 Component Cleanup

```pseudocode
FUNCTION removeSharing(componentTree: ComponentNode):
    INPUT: componentTree (ComponentNode)
    OUTPUT: cleanedTree (ComponentNode)
    
    BEGIN
        FOR each node in componentTree DO
            // Remove sharing buttons
            IF node.type is "ShareButton" OR 
               node.props contains "share" OR
               node.className contains "share" THEN
                REMOVE node from tree
            END IF
            
            // Remove sharing event handlers
            IF node.props contains onShare OR
               node.props contains handleShare THEN
                DELETE node.props.onShare
                DELETE node.props.handleShare
            END IF
            
            // Recursively clean children
            IF node has children THEN
                node.children = removeSharing(node.children)
            END IF
        END FOR
        
        RETURN componentTree
    END
```

### 4.2 API Cleanup Algorithm

```pseudocode
FUNCTION cleanupSharingAPIs(apiEndpoints: Array<Endpoint>):
    INPUT: apiEndpoints (Array<Endpoint>)
    OUTPUT: cleanedEndpoints (Array<Endpoint>)
    
    BEGIN
        SET cleaned = new Array<Endpoint>()
        
        FOR each endpoint in apiEndpoints DO
            IF NOT (endpoint.path contains "/share" OR
                   endpoint.method is "SHARE" OR
                   endpoint.name contains "share") THEN
                ADD endpoint to cleaned
            END IF
        END FOR
        
        RETURN cleaned
    END
```

## 5. Performance Optimization Algorithms

### 5.1 Debounced Character Counting

```pseudocode
FUNCTION createDebouncedCounter(delay: number):
    INPUT: delay (number in milliseconds)
    OUTPUT: debouncedFunction (Function)
    
    BEGIN
        SET timeoutId = null
        
        RETURN FUNCTION(text: string, callback: Function):
            IF timeoutId is not null THEN
                CALL clearTimeout(timeoutId)
            END IF
            
            SET timeoutId = setTimeout(
                FUNCTION():
                    SET count = countCharacters(text, true)
                    CALL callback(count)
                END FUNCTION,
                delay
            )
        END RETURN
    END
```

### 5.2 Memoized Component Rendering

```pseudocode
FUNCTION createMemoizedPost():
    INPUT: none
    OUTPUT: MemoizedComponent
    
    BEGIN
        RETURN React.memo(
            FUNCTION PostCard(props: PostCardProps):
                RETURN renderPostHierarchy(props.post, props.isExpanded)
            END FUNCTION,
            
            FUNCTION areEqual(prevProps: PostCardProps, nextProps: PostCardProps):
                RETURN (
                    prevProps.post.id == nextProps.post.id AND
                    prevProps.isExpanded == nextProps.isExpanded AND
                    prevProps.post.likes == nextProps.post.likes AND
                    prevProps.post.comments == nextProps.post.comments
                )
            END FUNCTION
        )
    END
```

## 6. Error Handling Algorithms

### 6.1 Graceful Degradation

```pseudocode
FUNCTION handleExpansionError(error: Error, postId: string):
    INPUT: error (Error), postId (string)
    OUTPUT: void
    
    BEGIN
        CALL logError("Post expansion failed", error, postId)
        
        // Reset to safe state
        SET expandedPosts[postId] = false
        
        // Show user-friendly message
        CALL showNotification("Unable to expand post. Please try again.", "error")
        
        // Track error for monitoring
        CALL trackError("post_expansion_failed", {
            postId: postId,
            error: error.message,
            timestamp: Date.now()
        })
    END
```

### 6.2 Character Count Error Recovery

```pseudocode
FUNCTION handleCharacterCountError(error: Error, text: string):
    INPUT: error (Error), text (string)
    OUTPUT: fallbackCount (number)
    
    BEGIN
        CALL logError("Character counting failed", error)
        
        // Fallback to simple length
        SET fallbackCount = text.length
        
        // Show warning to user
        CALL showNotification("Character count may be inaccurate", "warning")
        
        RETURN fallbackCount
    END
```

## 7. Accessibility Algorithms

### 7.1 ARIA State Management

```pseudocode
FUNCTION updateAriaStates(postId: string, isExpanded: boolean):
    INPUT: postId (string), isExpanded (boolean)
    OUTPUT: void
    
    BEGIN
        SET toggleButton = getElementById("expand-toggle-" + postId)
        SET contentArea = getElementById("post-content-" + postId)
        
        // Update button aria-expanded
        SET toggleButton.setAttribute("aria-expanded", isExpanded.toString())
        
        // Update content aria-hidden
        SET contentArea.setAttribute("aria-hidden", (!isExpanded).toString())
        
        // Announce change to screen readers
        SET announcement = isExpanded ? "Post expanded" : "Post collapsed"
        CALL announceToScreenReader(announcement)
    END
```

This pseudocode provides the algorithmic foundation for implementing all Phase 1 post structure enhancements with proper error handling, performance optimization, and accessibility support.